import { z } from 'zod';

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD');

export const createTenantSchema = z.object({
  name: z.string().min(2).max(100),
  whatsapp: z.string().regex(/^[0-9]{9,15}$/).optional(),
  notes: z.string().max(500).optional(),
});

export const updateTenantSchema = createTenantSchema.partial();

export const createStaySchema = z.object({
  roomId: z.string().uuid('Room ID tidak valid'),
  checkInDate: dateSchema,
  rentPrice: z.number().positive(),
  deposit: z.number().min(0).default(0),
});

export const endStaySchema = z.object({
  checkOutDate: dateSchema,
});

export const tenantQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  perPage: z.coerce.number().int().positive().max(50).default(10),
  search: z.string().optional(),
});

export type CreateTenantInput = z.infer<typeof createTenantSchema>;
export type UpdateTenantInput = z.infer<typeof updateTenantSchema>;
export type CreateStayInput = z.infer<typeof createStaySchema>;
export type EndStayInput = z.infer<typeof endStaySchema>;
