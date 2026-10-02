import { z } from 'zod';

export const createRoomSchema = z.object({
  propertyId: z.string().optional(),
  roomNumber: z.string().min(1).max(20),
  name: z.string().max(100).optional(),
  type: z.string().max(100).optional(),
  price: z.number().positive('Harga harus lebih dari 0'),
  status: z.enum(['available', 'occupied', 'maintenance']).optional(),
  description: z.string().max(1000).optional(),
  facilities: z.array(z.string()).optional(),
});

export const updateRoomSchema = createRoomSchema.partial();

export const roomQuerySchema = z.object({
  propertyId: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  perPage: z.coerce.number().int().positive().max(50).default(10),
  status: z.enum(['available', 'occupied', 'maintenance']).optional(),
  search: z.string().optional(),
});

export type CreateRoomInput = z.infer<typeof createRoomSchema>;
export type UpdateRoomInput = z.infer<typeof updateRoomSchema>;
