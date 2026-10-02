import prisma from '../../config/database';
import { getPaginationParams, buildPaginationMeta } from '../../utils/response';
import { haversineDistance } from '../../utils/geo';

// Visibility condition for public listings
const PUBLIC_VISIBILITY_WHERE = {
  status: 'active' as const,
  owner: { status: 'active' as const },
  // Subscription check done via subquery
};

// ─────────────────────────────────────────────
// SEARCH PROPERTIES
// ─────────────────────────────────────────────

export async function searchProperties(query: {
  page?: number;
  perPage?: number;
  city?: string;
  district?: string;
  type?: string;
  priceMin?: number;
  priceMax?: number;
  facilities?: string[];
  availableOnly?: boolean;
  lat?: number;
  lng?: number;
  radius?: number;
  search?: string;
}) {
  const { page, perPage, skip } = getPaginationParams(query);

  // Build visibility filter: owner active + subscription active
  const where: any = {
    status: 'active',
    owner: {
      status: 'active',
      subscriptions: {
        some: {
          status: { in: ['trial', 'active', 'expiring_soon'] },
          endsAt: { gt: new Date() },
        },
      },
    },
    ...(query.city && { city: { contains: query.city, mode: 'insensitive' } }),
    ...(query.district && { district: { contains: query.district, mode: 'insensitive' } }),
    ...(query.type && { type: query.type }),
    ...(query.priceMin !== undefined && { priceStart: { gte: query.priceMin } }),
    ...(query.priceMax !== undefined && { priceStart: { lte: query.priceMax } }),
    ...(query.search && {
      OR: [
        { name: { contains: query.search, mode: 'insensitive' } },
        { city: { contains: query.search, mode: 'insensitive' } },
        { address: { contains: query.search, mode: 'insensitive' } },
      ],
    }),
    ...(query.facilities?.length && {
      facilities: { some: { facilityName: { in: query.facilities } } },
    }),
    ...(query.availableOnly && {
      rooms: { some: { status: 'available' } },
    }),
  };

  const [total, properties] = await Promise.all([
    prisma.property.count({ where }),
    prisma.property.findMany({
      where,
      include: {
        photos: { where: { isPrimary: true }, take: 1 },
        facilities: true,
        _count: {
          select: {
            rooms: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: perPage,
    }),
  ]);

  // Apply geo-filter and compute distance if lat/lng provided
  let results = properties;
  if (query.lat !== undefined && query.lng !== undefined) {
    results = properties
      .filter((p) => {
        if (!p.latitude || !p.longitude) return false;
        if (!query.radius) return true;
        const dist = haversineDistance(
          query.lat!,
          query.lng!,
          Number(p.latitude),
          Number(p.longitude)
        );
        return dist <= query.radius;
      })
      .map((p) => ({
        ...p,
        distanceKm: p.latitude && p.longitude
          ? Math.round(haversineDistance(query.lat!, query.lng!, Number(p.latitude), Number(p.longitude)) * 10) / 10
          : null,
      }))
      .sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999));
  }

  return { data: results, meta: buildPaginationMeta(total, page, perPage) };
}

// ─────────────────────────────────────────────
// GET PROPERTY DETAIL (PUBLIC)
// ─────────────────────────────────────────────

export async function getPublicPropertyDetail(slug: string, lat?: number, lng?: number) {
  const property = await prisma.property.findUnique({
    where: { slug },
    include: {
      photos: { orderBy: { order: 'asc' } },
      facilities: true,
      rules: true,
      rooms: {
        where: { status: 'available' },
        include: {
          photos: { where: { isPrimary: true }, take: 1 },
          facilities: true,
        },
        orderBy: { price: 'asc' },
      },
      owner: {
        select: {
          status: true,
          subscriptions: {
            where: {
              status: { in: ['trial', 'active', 'expiring_soon'] },
              endsAt: { gt: new Date() },
            },
            take: 1,
          },
        },
      },
    },
  });

  if (!property) {
    throw { code: 'NOT_FOUND', message: 'Properti tidak ditemukan.', status: 404 };
  }

  // Check if active
  const isActive =
    property.status === 'active' &&
    property.owner.status === 'active' &&
    property.owner.subscriptions.length > 0;

  // Compute distance if coords provided
  const distanceKm =
    lat !== undefined && lng !== undefined && property.latitude && property.longitude
      ? Math.round(haversineDistance(lat, lng, Number(property.latitude), Number(property.longitude)) * 10) / 10
      : undefined;

  // Strip sensitive owner data
  const { owner, ...propertyData } = property;

  return {
    ...propertyData,
    isActive,
    distanceKm,
    // NEVER expose internal IDs in a way that enables scraping
  };
}

// ─────────────────────────────────────────────
// SUBMIT LISTING REPORT
// ─────────────────────────────────────────────

export async function submitListingReport(input: {
  propertyId: string;
  reason: string;
  description?: string;
  reporterName?: string;
  reporterContact?: string;
}) {
  const property = await prisma.property.findUnique({ where: { id: input.propertyId } });
  if (!property) throw { code: 'NOT_FOUND', message: 'Properti tidak ditemukan.', status: 404 };

  return prisma.listingReport.create({
    data: {
      propertyId: input.propertyId,
      reason: input.reason as any,
      description: input.description,
      reporterName: input.reporterName,
      reporterContact: input.reporterContact,
      status: 'pending',
    },
  });
}
