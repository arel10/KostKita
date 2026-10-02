import { z } from 'zod';

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD');

export const createPaymentSchema = z.object({
  tenantStayId: z.string().uuid(),
  periodStart: dateSchema,
  periodEnd: dateSchema,
  amount: z.number().positive(),
  paymentDate: dateSchema.optional(),
  paymentMethod: z.enum(['cash', 'bank_transfer', 'other']).optional(),
  status: z.enum(['paid', 'pending']).default('pending'),
  notes: z.string().max(500).optional(),
});

export const updatePaymentSchema = z.object({
  paymentDate: dateSchema.optional(),
  paymentMethod: z.enum(['cash', 'bank_transfer', 'other']).optional(),
  status: z.enum(['paid', 'pending', 'overdue']).optional(),
  notes: z.string().max(500).optional(),
  amount: z.number().positive().optional(),
});

export const paymentQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  perPage: z.coerce.number().int().positive().max(50).default(10),
  status: z.enum(['paid', 'pending', 'overdue']).optional(),
  tenantStayId: z.string().uuid().optional(),
  propertyId: z.string().uuid().optional(),
});

export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
export type UpdatePaymentInput = z.infer<typeof updatePaymentSchema>;
