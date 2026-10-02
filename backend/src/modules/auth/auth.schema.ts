import { z } from 'zod';

const passwordSchema = z
  .string()
  .min(8, 'Password minimal 8 karakter')
  .max(100, 'Password terlalu panjang');

const phoneSchema = z
  .string()
  .trim()
  .optional()
  .transform((val) => (val === '' ? undefined : val))
  .pipe(z.string().regex(/^[0-9]{9,15}$/, 'Nomor telepon tidak valid').optional());

export const registerSchema = z.object({
  name: z.string().min(2, 'Nama minimal 2 karakter').max(100, 'Nama terlalu panjang'),
  email: z.string().email('Format email tidak valid'),
  password: passwordSchema,
  phone: phoneSchema,
});

export const loginSchema = z.object({
  email: z.string().email('Format email tidak valid'),
  password: z.string().min(1, 'Password tidak boleh kosong'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Format email tidak valid'),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: passwordSchema,
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Password saat ini tidak boleh kosong'),
  newPassword: passwordSchema,
});

export const updateProfileSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  phone: phoneSchema,
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
