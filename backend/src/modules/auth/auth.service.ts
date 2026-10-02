import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../../config/database';
import { env } from '../../config/env';
import { logger } from '../../config/logger';
import { logAudit } from '../../utils/audit';
import { createNotification } from '../../utils/notification';
import { AuditAction, EntityType } from '../../types/constants';
import {
  RegisterInput,
  LoginInput,
  ChangePasswordInput,
  UpdateProfileInput,
} from './auth.schema';
import { AuthPayload } from '../../types/express.d';

// ─────────────────────────────────────────────
// REGISTER
// ─────────────────────────────────────────────

export async function registerOwner(
  input: RegisterInput,
  ip?: string,
  userAgent?: string
) {
  // Check duplicate email
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw { code: 'DUPLICATE_EMAIL', message: 'Email sudah terdaftar.', status: 409 };
  }

  // Hash password
  const passwordHash = await bcrypt.hash(input.password, env.BCRYPT_SALT_ROUNDS);

  // Find default plan (trial)
  const defaultPlan = await prisma.subscriptionPlan.findFirst({
    where: { isDefault: true, isActive: true },
  });

  if (!defaultPlan) {
    logger.error('No default subscription plan found. Please seed the database.');
    throw { code: 'NO_DEFAULT_PLAN', message: 'Konfigurasi sistem bermasalah. Hubungi administrator.', status: 500 };
  }

  // Create user + subscription in transaction
  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email: input.email,
        passwordHash,
        name: input.name,
        phone: input.phone,
        role: 'owner',
        status: 'active',
      },
    });

    const now = new Date();
    const endsAt = new Date(now);
    endsAt.setDate(endsAt.getDate() + defaultPlan.durationDays);

    const subscription = await tx.subscription.create({
      data: {
        ownerId: user.id,
        planId: defaultPlan.id,
        status: 'trial',
        startsAt: now,
        endsAt,
      },
    });

    return { user, subscription };
  });

  // Welcome notification
  await createNotification({
    userId: result.user.id,
    type: 'system_announcement',
    title: 'Selamat datang di KostKita! 🎉',
    message: `Halo ${result.user.name}! Akun Anda telah aktif dengan paket Trial selama ${defaultPlan.durationDays} hari. Mulai kelola kost Anda sekarang.`,
  });

  // Audit log
  await logAudit({
    actorId: result.user.id,
    actorRole: 'owner',
    action: AuditAction.REGISTER,
    entityType: EntityType.USER,
    entityId: result.user.id,
    newValue: { email: result.user.email, name: result.user.name },
    ipAddress: ip,
    userAgent,
  });

  const token = generateToken(result.user);

  return {
    token,
    user: sanitizeUser(result.user),
    subscription: result.subscription,
  };
}

// ─────────────────────────────────────────────
// LOGIN
// ─────────────────────────────────────────────

export async function loginUser(
  input: LoginInput,
  ip?: string,
  userAgent?: string
) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });

  if (!user) {
    throw { code: 'INVALID_CREDENTIALS', message: 'Email atau password tidak valid.', status: 401 };
  }

  const passwordValid = await bcrypt.compare(input.password, user.passwordHash);
  if (!passwordValid) {
    throw { code: 'INVALID_CREDENTIALS', message: 'Email atau password tidak valid.', status: 401 };
  }

  if (user.status === 'suspended') {
    throw { code: 'OWNER_SUSPENDED', message: 'Akun Anda telah disuspend. Hubungi administrator.', status: 403 };
  }

  if (user.status === 'deactivated') {
    throw { code: 'ACCOUNT_DEACTIVATED', message: 'Akun Anda telah dinonaktifkan.', status: 403 };
  }

  // Update last login
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  await logAudit({
    actorId: user.id,
    actorRole: user.role,
    action: AuditAction.LOGIN,
    entityType: EntityType.USER,
    entityId: user.id,
    ipAddress: ip,
    userAgent,
  });

  const token = generateToken(user);
  return { token, user: sanitizeUser(user) };
}

// ─────────────────────────────────────────────
// GET ME
// ─────────────────────────────────────────────

export async function getMe(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      subscriptions: {
        where: { status: { in: ['trial', 'active', 'expiring_soon'] } },
        include: { plan: true },
        orderBy: { endsAt: 'desc' },
        take: 1,
      },
    },
  });

  if (!user) {
    throw { code: 'NOT_FOUND', message: 'User tidak ditemukan.', status: 404 };
  }

  return {
    ...sanitizeUser(user),
    activeSubscription: user.subscriptions[0] || null,
  };
}

// ─────────────────────────────────────────────
// UPDATE PROFILE
// ─────────────────────────────────────────────

export async function updateProfile(userId: string, input: UpdateProfileInput) {
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(input.name && { name: input.name }),
      ...(input.phone !== undefined && { phone: input.phone }),
    },
  });

  await logAudit({
    actorId: userId,
    actorRole: 'owner',
    action: AuditAction.PROPERTY_UPDATE,
    entityType: EntityType.USER,
    entityId: userId,
    newValue: input,
  });

  return sanitizeUser(user);
}

// ─────────────────────────────────────────────
// CHANGE PASSWORD
// ─────────────────────────────────────────────

export async function changePassword(userId: string, input: ChangePasswordInput) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw { code: 'NOT_FOUND', message: 'User tidak ditemukan.', status: 404 };

  const valid = await bcrypt.compare(input.currentPassword, user.passwordHash);
  if (!valid) {
    throw { code: 'INVALID_CREDENTIALS', message: 'Password saat ini tidak valid.', status: 400 };
  }

  const newHash = await bcrypt.hash(input.newPassword, env.BCRYPT_SALT_ROUNDS);
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: newHash },
  });

  await logAudit({
    actorId: userId,
    actorRole: user.role,
    action: AuditAction.PASSWORD_RESET,
    entityType: EntityType.USER,
    entityId: userId,
  });
}

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

function generateToken(user: { id: string; role: string; status: string }): string {
  const payload: AuthPayload = {
    sub: user.id,
    role: user.role as AuthPayload['role'],
    status: user.status as AuthPayload['status'],
  };
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'] });
}

function sanitizeUser(user: {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  role: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  emailVerifiedAt?: Date | null;
  lastLoginAt?: Date | null;
}) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    phone: user.phone,
    role: user.role,
    status: user.status,
    emailVerifiedAt: user.emailVerifiedAt,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}
