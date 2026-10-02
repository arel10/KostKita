/**
 * Calculate distance between two coordinates using the Haversine formula.
 * Returns distance in kilometers.
 */
export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

/**
 * Build Haversine SQL expression for PostgreSQL.
 * Returns distance in kilometers.
 */
export function haversineSQL(lat: number, lng: number): string {
  return `
    (6371 * acos(
      LEAST(1.0, 
        cos(radians(${lat})) * cos(radians(latitude::float)) *
        cos(radians(longitude::float) - radians(${lng})) +
        sin(radians(${lat})) * sin(radians(latitude::float))
      )
    ))
  `;
}

/**
 * Generate WhatsApp link with optional pre-filled message.
 */
export function buildWhatsAppUrl(phone: string, message?: string): string {
  // Normalize phone: remove non-digits, ensure starts with 62
  let normalized = phone.replace(/\D/g, '');
  if (normalized.startsWith('0')) {
    normalized = '62' + normalized.slice(1);
  }
  if (!normalized.startsWith('62')) {
    normalized = '62' + normalized;
  }

  const encoded = message ? `?text=${encodeURIComponent(message)}` : '';
  return `https://wa.me/${normalized}${encoded}`;
}
