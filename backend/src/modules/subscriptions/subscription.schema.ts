import { z } from 'zod';

export const submitPaymentSchema = z.object({
  planId: z.string().uuid('Plan ID tidak valid'),
  amount: z.number().positive('Nominal harus lebih dari 0'),
  paymentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD'),
  paymentMethod: z.string().min(1),
  notes: z.string().max(500).optional(),
});

export const rejectPaymentSchema = z.object({
  reason: z.string().min(5, 'Alasan penolakan minimal 5 karakter').max(500),
});

export type SubmitPaymentInput = z.infer<typeof submitPaymentSchema>;
export type RejectPaymentInput = z.infer<typeof rejectPaymentSchema>;
