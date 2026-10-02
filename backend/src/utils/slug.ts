import slugify from 'slugify';
import prisma from '../config/database';

/**
 * Generate a unique slug for a property.
 * Pattern: {name}-{city}-{counter if needed}
 */
export async function generatePropertySlug(
  name: string,
  city?: string | null
): Promise<string> {
  const base = slugify(`${name}${city ? ' ' + city : ''}`, {
    lower: true,
    strict: true,
    trim: true,
  });

  let slug = base;
  let counter = 1;

  while (true) {
    const existing = await prisma.property.findUnique({ where: { slug } });
    if (!existing) break;
    slug = `${base}-${counter}`;
    counter++;
  }

  return slug;
}

/**
 * Generate a slug for a subscription plan.
 */
export function generatePlanSlug(name: string): string {
  return slugify(name, { lower: true, strict: true, trim: true });
}
