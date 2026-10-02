import { z } from 'zod';

export const createPropertySchema = z.object({
  name: z.string().min(3, 'Nama minimal 3 karakter').max(100),
  description: z.string().max(2000).optional(),
  type: z.enum(['putra', 'putri', 'campur']),
  whatsapp: z.string().regex(/^[0-9]{9,15}$/, 'Nomor WhatsApp tidak valid'),
  address: z.string().min(5, 'Alamat terlalu pendek').max(500),
  province: z.string().max(100).optional(),
  city: z.string().max(100).optional(),
  district: z.string().max(100).optional(),
  subdistrict: z.string().max(100).optional(),
  postalCode: z.string().max(10).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  priceStart: z.number().min(0).optional(),
  facilities: z.array(z.string()).optional(),
  rules: z.array(z.string()).optional(),
  photos: z.array(z.string()).optional(),
});

export const updatePropertySchema = createPropertySchema.partial();

export const propertyQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  perPage: z.coerce.number().int().positive().max(50).default(10),
  status: z.enum(['draft', 'active', 'inactive', 'suspended']).optional(),
  search: z.string().optional(),
});

export type CreatePropertyInput = z.infer<typeof createPropertySchema>;
export type UpdatePropertyInput = z.infer<typeof updatePropertySchema>;
export type PropertyQueryInput = z.infer<typeof propertyQuerySchema>;
