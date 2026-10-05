import fs from 'fs';
import path from 'path';
import prisma from '../../config/database';
import { cloudinary } from '../../config/storage';
import { env } from '../../config/env';
import { logAudit } from '../../utils/audit';
import { getActiveSubscription, checkRoomLimit } from '../../utils/subscription';
import { AuditAction, EntityType } from '../../types/constants';
import { getPaginationParams, buildPaginationMeta } from '../../utils/response';
import { CreateRoomInput, UpdateRoomInput } from './room.schema';

// ─────────────────────────────────────────────
// LIST
// ─────────────────────────────────────────────

export async function listRooms(
  ownerId: string,
  propertyId?: string,
  query?: { page?: number; perPage?: number; status?: string; search?: string }
) {
  // Verify property ownership if propertyId is provided
  if (propertyId) {
    const property = await prisma.property.findFirst({ where: { id: propertyId, ownerId } });
    if (!property) throw { code: 'NOT_FOUND', message: 'Properti tidak ditemukan.', status: 404 };
  }

  const { page, perPage, skip } = getPaginationParams(query || {}, 100, 500);

  const where = {
    ownerId,
    ...(propertyId && { propertyId }),
    ...(query?.status && { status: query.status as any }),
    ...(query?.search && {
      OR: [
        { roomNumber: { contains: query.search, mode: 'insensitive' as const } },
        { name: { contains: query.search, mode: 'insensitive' as const } },
      ],
    }),
  };

  const [total, rooms] = await Promise.all([
    prisma.room.count({ where }),
    prisma.room.findMany({
      where,
      include: {
        photos: { where: { isPrimary: true }, take: 1 },
        facilities: true,
        property: { select: { id: true, name: true, city: true } },
        _count: { select: { stays: { where: { status: 'active' } } } },
      },
      orderBy: { roomNumber: 'asc' },
      skip,
      take: perPage,
    }),
  ]);

  return { data: rooms, meta: buildPaginationMeta(total, page, perPage) };
}

// ─────────────────────────────────────────────
// CREATE
// ─────────────────────────────────────────────

export async function createRoom(
  ownerId: string,
  propertyId: string,
  input: CreateRoomInput,
  ip?: string,
  userAgent?: string
) {
  const property = await prisma.property.findFirst({ where: { id: propertyId, ownerId } });
  if (!property) throw { code: 'NOT_FOUND', message: 'Properti tidak ditemukan.', status: 404 };

  const subscription = await getActiveSubscription(ownerId);
  if (!subscription) throw { code: 'SUBSCRIPTION_EXPIRED', message: 'Subscription Anda telah berakhir.', status: 403 };

  const limitCheck = await checkRoomLimit(ownerId, subscription.planId);
  if (!limitCheck.allowed) {
    throw {
      code: 'ROOM_LIMIT_EXCEEDED',
      message: `Anda telah mencapai batas maksimum ${limitCheck.limit} kamar pada paket ini.`,
      status: 403,
    };
  }

  // Check room number uniqueness within property
  const existingRoom = await prisma.room.findUnique({ where: { propertyId_roomNumber: { propertyId, roomNumber: input.roomNumber } } });
  if (existingRoom) throw { code: 'DUPLICATE_ROOM_NUMBER', message: 'Nomor kamar sudah digunakan pada properti ini.', status: 409 };

  const room = await prisma.$transaction(async (tx) => {
    const newRoom = await tx.room.create({
      data: {
        propertyId,
        ownerId,
        roomNumber: input.roomNumber,
        name: input.name,
        type: input.type,
        price: input.price,
        description: input.description,
        status: (input.status as any) || 'available',
      },
    });

    if (input.facilities?.length) {
      await tx.roomFacility.createMany({
        data: input.facilities.map((f) => ({ roomId: newRoom.id, facilityName: f })),
      });
    }

    return newRoom;
  });

  await logAudit({ actorId: ownerId, actorRole: 'owner', action: AuditAction.ROOM_CREATE, entityType: EntityType.ROOM, entityId: room.id, newValue: input, ipAddress: ip, userAgent });

  return getRoomById(ownerId, propertyId, room.id);
}

// ─────────────────────────────────────────────
// GET BY ID
// ─────────────────────────────────────────────

export async function getRoomById(ownerId: string, propertyId: string | undefined, roomId: string) {
  const room = await prisma.room.findFirst({
    where: { id: roomId, ownerId, ...(propertyId && { propertyId }) },
    include: {
      photos: { orderBy: { order: 'asc' } },
      facilities: true,
      property: { select: { id: true, name: true, city: true } },
      stays: {
        where: { status: 'active' },
        include: { tenant: { select: { id: true, name: true, whatsapp: true } } },
      },
    },
  });

  if (!room) throw { code: 'NOT_FOUND', message: 'Kamar tidak ditemukan.', status: 404 };
  return room;
}

// ─────────────────────────────────────────────
// UPDATE
// ─────────────────────────────────────────────

export async function updateRoom(
  ownerId: string,
  propertyId: string | undefined,
  roomId: string,
  input: UpdateRoomInput,
  ip?: string,
  userAgent?: string
) {
  const existing = await prisma.room.findFirst({
    where: { id: roomId, ownerId, ...(propertyId && { propertyId }) },
  });
  if (!existing) throw { code: 'NOT_FOUND', message: 'Kamar tidak ditemukan.', status: 404 };

  const room = await prisma.$transaction(async (tx) => {
    const updated = await tx.room.update({
      where: { id: roomId },
      data: {
        ...(input.roomNumber && { roomNumber: input.roomNumber }),
        ...(input.name !== undefined && { name: input.name }),
        ...(input.type !== undefined && { type: input.type }),
        ...(input.price !== undefined && { price: input.price }),
        ...(input.status !== undefined && { status: input.status as any }),
        ...(input.description !== undefined && { description: input.description }),
      },
    });

    if (input.facilities !== undefined) {
      await tx.roomFacility.deleteMany({ where: { roomId } });
      if (input.facilities.length > 0) {
        await tx.roomFacility.createMany({
          data: input.facilities.map((f) => ({ roomId, facilityName: f })),
        });
      }
    }

    return updated;
  });

  await logAudit({ actorId: ownerId, actorRole: 'owner', action: AuditAction.ROOM_UPDATE, entityType: EntityType.ROOM, entityId: roomId, oldValue: existing, newValue: input, ipAddress: ip, userAgent });

  return getRoomById(ownerId, propertyId, roomId);
}

// ─────────────────────────────────────────────
// DELETE
// ─────────────────────────────────────────────

export async function deleteRoom(ownerId: string, propertyId: string | undefined, roomId: string, ip?: string, userAgent?: string) {
  const room = await prisma.room.findFirst({
    where: { id: roomId, ownerId, ...(propertyId && { propertyId }) },
  });
  if (!room) throw { code: 'NOT_FOUND', message: 'Kamar tidak ditemukan.', status: 404 };

  if (room.status === 'occupied') {
    throw { code: 'ROOM_OCCUPIED', message: 'Kamar yang sedang ditempati tidak dapat dihapus.', status: 409 };
  }

  await prisma.room.delete({ where: { id: roomId } });

  await logAudit({ actorId: ownerId, actorRole: 'owner', action: AuditAction.ROOM_DELETE, entityType: EntityType.ROOM, entityId: roomId, oldValue: { roomNumber: room.roomNumber }, ipAddress: ip, userAgent });
}

// ─────────────────────────────────────────────
// PHOTO UPLOAD
// ─────────────────────────────────────────────

export async function uploadRoomPhotos(ownerId: string, propertyId: string | undefined, roomId: string, files: Express.Multer.File[]) {
  const room = await prisma.room.findFirst({
    where: { id: roomId, ownerId, ...(propertyId && { propertyId }) },
  });
  if (!room) throw { code: 'NOT_FOUND', message: 'Kamar tidak ditemukan.', status: 404 };

  const existingCount = await prisma.roomPhoto.count({ where: { roomId } });
  if (existingCount + files.length > 10) throw { code: 'TOO_MANY_PHOTOS', message: 'Maksimal 10 foto per kamar.', status: 400 };

  const hasCloudinary = Boolean(env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET);

  const uploadedPhotos = await Promise.all(
    files.map(async (file, index) => {
      let photoUrl = '';

      if (hasCloudinary) {
        try {
          const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
            const uploadTimeout = setTimeout(() => {
              reject(new Error('Cloudinary upload timed out after 12s'));
            }, 12000);

            const stream = cloudinary.uploader.upload_stream(
              { folder: `kostkita/rooms/${roomId}`, resource_type: 'image' },
              (error, result) => {
                clearTimeout(uploadTimeout);
                if (error) reject(error);
                else resolve(result as { secure_url: string });
              }
            );

            stream.end(file.buffer);
          });
          photoUrl = result.secure_url;
        } catch (cloudErr) {
          console.warn('Cloudinary upload failed for room, fallback to local storage:', cloudErr);
        }
      }

      if (!photoUrl) {
        const uploadDir = path.resolve(process.cwd(), 'uploads/rooms', roomId);
        fs.mkdirSync(uploadDir, { recursive: true });
        const ext = path.extname(file.originalname) || (file.mimetype === 'image/png' ? '.png' : file.mimetype === 'image/webp' ? '.webp' : '.jpg');
        const filename = `${Date.now()}-${index}-${Math.random().toString(36).substring(2, 8)}${ext}`;
        const filePath = path.join(uploadDir, filename);
        fs.writeFileSync(filePath, file.buffer);
        photoUrl = `${env.APP_URL}/uploads/rooms/${roomId}/${filename}`;
      }

      return { roomId, url: photoUrl, order: existingCount + index, isPrimary: existingCount === 0 && index === 0 };
    })
  );

  await prisma.roomPhoto.createMany({ data: uploadedPhotos });
  return prisma.roomPhoto.findMany({ where: { roomId }, orderBy: { order: 'asc' } });
}
