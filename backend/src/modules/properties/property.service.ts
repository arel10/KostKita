import fs from 'fs';
import path from 'path';
import prisma from '../../config/database';
import { cloudinary } from '../../config/storage';
import { env } from '../../config/env';
import { generatePropertySlug } from '../../utils/slug';
import { logAudit } from '../../utils/audit';
import { getActiveSubscription, checkPropertyLimit } from '../../utils/subscription';
import { AuditAction, EntityType } from '../../types/constants';
import { getPaginationParams, buildPaginationMeta } from '../../utils/response';
import { deleteCache } from '../../config/redis';
import {
  CreatePropertyInput,
  UpdatePropertyInput,
  PropertyQueryInput,
} from './property.schema';

const PROPERTY_WITH_DETAILS = {
  photos: { orderBy: { order: 'asc' as const } },
  facilities: true,
  rules: true,
  rooms: {
    select: {
      id: true,
      roomNumber: true,
      name: true,
      type: true,
      price: true,
      status: true,
    },
  },
} as const;

// ─────────────────────────────────────────────
// LIST
// ─────────────────────────────────────────────

export async function listProperties(ownerId: string, query: PropertyQueryInput) {
  const { page, perPage, skip } = getPaginationParams(query);

  const where = {
    ownerId,
    ...(query.status && { status: query.status }),
    ...(query.search && {
      OR: [
        { name: { contains: query.search, mode: 'insensitive' as const } },
        { city: { contains: query.search, mode: 'insensitive' as const } },
        { address: { contains: query.search, mode: 'insensitive' as const } },
      ],
    }),
  };

  const [total, properties] = await Promise.all([
    prisma.property.count({ where }),
    prisma.property.findMany({
      where,
      include: {
        photos: { where: { isPrimary: true }, take: 1 },
        _count: { select: { rooms: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: perPage,
    }),
  ]);

  return {
    data: properties,
    meta: buildPaginationMeta(total, page, perPage),
  };
}

// ─────────────────────────────────────────────
// CREATE
// ─────────────────────────────────────────────

export async function createProperty(
  ownerId: string,
  input: CreatePropertyInput,
  ip?: string,
  userAgent?: string
) {
  // Check active subscription
  const subscription = await getActiveSubscription(ownerId);
  if (!subscription) {
    throw { code: 'SUBSCRIPTION_EXPIRED', message: 'Subscription Anda telah berakhir. Silakan perpanjang untuk menambah properti.', status: 403 };
  }

  // Check property limit
  const limitCheck = await checkPropertyLimit(ownerId, subscription.planId);
  if (!limitCheck.allowed) {
    throw {
      code: 'PROPERTY_LIMIT_EXCEEDED',
      message: `Anda telah mencapai batas maksimum ${limitCheck.limit} properti pada paket ini. Upgrade paket untuk menambah lebih banyak properti.`,
      status: 403,
    };
  }

  const slug = await generatePropertySlug(input.name, input.city);

  const property = await prisma.$transaction(async (tx) => {
    const prop = await tx.property.create({
      data: {
        ownerId,
        name: input.name,
        slug,
        description: input.description,
        type: input.type,
        whatsapp: input.whatsapp,
        address: input.address,
        province: input.province,
        city: input.city,
        district: input.district,
        subdistrict: input.subdistrict,
        postalCode: input.postalCode,
        latitude: input.latitude,
        longitude: input.longitude,
        priceStart: input.priceStart !== undefined ? input.priceStart : undefined,
        status: 'draft',
      },
    });

    if (input.facilities?.length) {
      await tx.propertyFacility.createMany({
        data: input.facilities.map((f) => ({ propertyId: prop.id, facilityName: f })),
      });
    }

    if (input.rules?.length) {
      await tx.propertyRule.createMany({
        data: input.rules.map((r) => ({ propertyId: prop.id, rule: r })),
      });
    }

    if (input.photos?.length) {
      await tx.propertyPhoto.createMany({
        data: input.photos.map((url, idx) => ({
          propertyId: prop.id,
          url,
          order: idx,
          isPrimary: idx === 0,
        })),
      });
    }

    return prop;
  });

  await logAudit({
    actorId: ownerId,
    actorRole: 'owner',
    action: AuditAction.PROPERTY_CREATE,
    entityType: EntityType.PROPERTY,
    entityId: property.id,
    newValue: { name: property.name, slug: property.slug },
    ipAddress: ip,
    userAgent,
  });

  await deleteCache('cache:public:*');

  return getPropertyById(ownerId, property.id);
}

// ─────────────────────────────────────────────
// GET BY ID
// ─────────────────────────────────────────────

export async function getPropertyById(ownerId: string, propertyId: string) {
  const property = await prisma.property.findFirst({
    where: { id: propertyId, ownerId },
    include: PROPERTY_WITH_DETAILS,
  });

  if (!property) {
    throw { code: 'NOT_FOUND', message: 'Properti tidak ditemukan.', status: 404 };
  }

  return property;
}

// ─────────────────────────────────────────────
// UPDATE
// ─────────────────────────────────────────────

export async function updateProperty(
  ownerId: string,
  propertyId: string,
  input: UpdatePropertyInput,
  ip?: string,
  userAgent?: string
) {
  const existing = await prisma.property.findFirst({ where: { id: propertyId, ownerId } });
  if (!existing) {
    throw { code: 'NOT_FOUND', message: 'Properti tidak ditemukan.', status: 404 };
  }

  if (existing.status === 'suspended') {
    throw { code: 'PROPERTY_SUSPENDED', message: 'Properti yang disuspend tidak dapat diedit.', status: 403 };
  }

  const property = await prisma.$transaction(async (tx) => {
    const updated = await tx.property.update({
      where: { id: propertyId },
      data: {
        ...(input.name && { name: input.name }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.type && { type: input.type }),
        ...(input.whatsapp && { whatsapp: input.whatsapp }),
        ...(input.address && { address: input.address }),
        ...(input.province !== undefined && { province: input.province }),
        ...(input.city !== undefined && { city: input.city }),
        ...(input.district !== undefined && { district: input.district }),
        ...(input.subdistrict !== undefined && { subdistrict: input.subdistrict }),
        ...(input.postalCode !== undefined && { postalCode: input.postalCode }),
        ...(input.latitude !== undefined && { latitude: input.latitude }),
        ...(input.longitude !== undefined && { longitude: input.longitude }),
        ...(input.priceStart !== undefined && { priceStart: input.priceStart }),
      },
    });

    // Update facilities if provided
    if (input.facilities !== undefined) {
      await tx.propertyFacility.deleteMany({ where: { propertyId } });
      if (input.facilities.length > 0) {
        await tx.propertyFacility.createMany({
          data: input.facilities.map((f) => ({ propertyId, facilityName: f })),
        });
      }
    }

    // Update rules if provided
    if (input.rules !== undefined) {
      await tx.propertyRule.deleteMany({ where: { propertyId } });
      if (input.rules.length > 0) {
        await tx.propertyRule.createMany({
          data: input.rules.map((r) => ({ propertyId, rule: r })),
        });
      }
    }

    // Update photos if provided
    if (input.photos !== undefined) {
      await tx.propertyPhoto.deleteMany({ where: { propertyId } });
      if (input.photos.length > 0) {
        await tx.propertyPhoto.createMany({
          data: input.photos.map((url, idx) => ({
            propertyId,
            url,
            order: idx,
            isPrimary: idx === 0,
          })),
        });
      }
    }

    return updated;
  });

  await logAudit({
    actorId: ownerId,
    actorRole: 'owner',
    action: AuditAction.PROPERTY_UPDATE,
    entityType: EntityType.PROPERTY,
    entityId: propertyId,
    oldValue: existing,
    newValue: input,
    ipAddress: ip,
    userAgent,
  });

  await deleteCache('cache:public:*');

  return getPropertyById(ownerId, propertyId);
}

// ─────────────────────────────────────────────
// PUBLISH / UNPUBLISH
// ─────────────────────────────────────────────

export async function publishProperty(
  ownerId: string,
  propertyId: string,
  ip?: string,
  userAgent?: string
) {
  const property = await prisma.property.findFirst({ where: { id: propertyId, ownerId } });
  if (!property) {
    throw { code: 'NOT_FOUND', message: 'Properti tidak ditemukan.', status: 404 };
  }

  if (property.status === 'active') {
    return property;
  }

  if (property.status === 'suspended') {
    throw { code: 'PROPERTY_SUSPENDED', message: 'Properti yang disuspend tidak dapat dipublish.', status: 403 };
  }

  // Validate required fields
  const missing: string[] = [];
  if (!property.whatsapp) missing.push('nomor WhatsApp');
  if (!property.address) missing.push('alamat');
  if (missing.length > 0) {
    throw { code: 'INCOMPLETE_DATA', message: `Lengkapi data berikut sebelum publish: ${missing.join(', ')}.`, status: 400 };
  }

  // Check subscription is active
  const subscription = await getActiveSubscription(ownerId);
  if (!subscription) {
    throw { code: 'SUBSCRIPTION_EXPIRED', message: 'Subscription Anda telah berakhir. Perpanjang untuk publish properti.', status: 403 };
  }

  // Check owner status
  const owner = await prisma.user.findUnique({ where: { id: ownerId } });
  if (owner?.status !== 'active') {
    throw { code: 'OWNER_SUSPENDED', message: 'Akun Anda tidak aktif.', status: 403 };
  }

  await prisma.property.update({ where: { id: propertyId }, data: { status: 'active' } });

  await logAudit({
    actorId: ownerId,
    actorRole: 'owner',
    action: AuditAction.PROPERTY_PUBLISH,
    entityType: EntityType.PROPERTY,
    entityId: propertyId,
    ipAddress: ip,
    userAgent,
  });

  await deleteCache('cache:public:*');

  return getPropertyById(ownerId, propertyId);
}

export async function unpublishProperty(
  ownerId: string,
  propertyId: string,
  ip?: string,
  userAgent?: string
) {
  const property = await prisma.property.findFirst({ where: { id: propertyId, ownerId } });
  if (!property) {
    throw { code: 'NOT_FOUND', message: 'Properti tidak ditemukan.', status: 404 };
  }

  await prisma.property.update({ where: { id: propertyId }, data: { status: 'inactive' } });

  await logAudit({
    actorId: ownerId,
    actorRole: 'owner',
    action: AuditAction.PROPERTY_UNPUBLISH,
    entityType: EntityType.PROPERTY,
    entityId: propertyId,
    ipAddress: ip,
    userAgent,
  });

  await deleteCache('cache:public:*');

  return getPropertyById(ownerId, propertyId);
}

// ─────────────────────────────────────────────
// DELETE
// ─────────────────────────────────────────────

export async function deleteProperty(
  ownerId: string,
  propertyId: string,
  ip?: string,
  userAgent?: string
) {
  const property = await prisma.property.findFirst({ where: { id: propertyId, ownerId } });
  if (!property) {
    throw { code: 'NOT_FOUND', message: 'Properti tidak ditemukan.', status: 404 };
  }

  if (property.status === 'suspended') {
    throw { code: 'PROPERTY_SUSPENDED', message: 'Properti yang disuspend tidak dapat dihapus.', status: 403 };
  }

  // Check if there are active tenants
  const activeStays = await prisma.tenantStay.count({
    where: {
      room: { propertyId },
      status: 'active',
    },
  });

  if (activeStays > 0) {
    throw { code: 'HAS_ACTIVE_TENANTS', message: 'Tidak dapat menghapus properti yang masih memiliki penghuni aktif.', status: 409 };
  }

  // Soft delete by setting status to inactive
  await prisma.property.update({
    where: { id: propertyId },
    data: { status: 'inactive' },
  });

  await logAudit({
    actorId: ownerId,
    actorRole: 'owner',
    action: AuditAction.PROPERTY_DELETE,
    entityType: EntityType.PROPERTY,
    entityId: propertyId,
    oldValue: { name: property.name, status: property.status },
    ipAddress: ip,
    userAgent,
  });

  await deleteCache('cache:public:*');
}

// ─────────────────────────────────────────────
// PHOTO UPLOAD
// ─────────────────────────────────────────────

export async function uploadPropertyPhotos(
  ownerId: string,
  propertyId: string,
  files: Express.Multer.File[]
) {
  const property = await prisma.property.findFirst({ where: { id: propertyId, ownerId } });
  if (!property) {
    throw { code: 'NOT_FOUND', message: 'Properti tidak ditemukan.', status: 404 };
  }

  const existingCount = await prisma.propertyPhoto.count({ where: { propertyId } });
  if (existingCount + files.length > 10) {
    throw { code: 'TOO_MANY_PHOTOS', message: 'Maksimal 10 foto per properti.', status: 400 };
  }

  const hasCloudinary = Boolean(env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET);

  const uploadedPhotos = await Promise.all(
    files.map(async (file, index) => {
      let photoUrl = '';

      if (hasCloudinary) {
        try {
          const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
            cloudinary.uploader.upload_stream(
              {
                folder: `kostkita/properties/${propertyId}`,
                resource_type: 'image',
                transformation: [{ quality: 'auto', fetch_format: 'auto' }],
              },
              (error, result) => {
                if (error) reject(error);
                else resolve(result as { secure_url: string });
              }
            ).end(file.buffer);
          });
          photoUrl = result.secure_url;
        } catch (cloudErr) {
          console.warn('Cloudinary upload failed, falling back to local file storage:', cloudErr);
        }
      }

      if (!photoUrl) {
        const uploadDir = path.resolve(process.cwd(), 'uploads/properties', propertyId);
        fs.mkdirSync(uploadDir, { recursive: true });
        const ext = path.extname(file.originalname) || (file.mimetype === 'image/png' ? '.png' : file.mimetype === 'image/webp' ? '.webp' : '.jpg');
        const filename = `${Date.now()}-${index}-${Math.random().toString(36).substring(2, 8)}${ext}`;
        const filePath = path.join(uploadDir, filename);
        fs.writeFileSync(filePath, file.buffer);
        photoUrl = `${env.APP_URL}/uploads/properties/${propertyId}/${filename}`;
      }

      return {
        propertyId,
        url: photoUrl,
        order: existingCount + index,
        isPrimary: existingCount === 0 && index === 0,
      };
    })
  );

  await prisma.propertyPhoto.createMany({ data: uploadedPhotos });

  return prisma.propertyPhoto.findMany({
    where: { propertyId },
    orderBy: { order: 'asc' },
  });
}

export async function deletePropertyPhoto(
  ownerId: string,
  propertyId: string,
  photoId: string
) {
  const property = await prisma.property.findFirst({ where: { id: propertyId, ownerId } });
  if (!property) {
    throw { code: 'NOT_FOUND', message: 'Properti tidak ditemukan.', status: 404 };
  }

  const photo = await prisma.propertyPhoto.findFirst({ where: { id: photoId, propertyId } });
  if (!photo) {
    throw { code: 'NOT_FOUND', message: 'Foto tidak ditemukan.', status: 404 };
  }

  await prisma.propertyPhoto.delete({ where: { id: photoId } });

  // If deleted photo was primary, set next photo as primary
  if (photo.isPrimary) {
    const nextPhoto = await prisma.propertyPhoto.findFirst({
      where: { propertyId },
      orderBy: { order: 'asc' },
    });
    if (nextPhoto) {
      await prisma.propertyPhoto.update({ where: { id: nextPhoto.id }, data: { isPrimary: true } });
    }
  }
}
