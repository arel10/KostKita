import prisma from '../config/database';
import { PlanFeatureKey } from '../types/constants';

interface PlanLimits {
  maxProperties: number | null; // null = unlimited
  maxRooms: number | null;
  maxTenants: number | null;
}

/**
 * Get plan feature limits from database.
 * Returns null for unlimited (when feature value is 'unlimited' or not set).
 */
export async function getPlanLimits(planId: string): Promise<PlanLimits> {
  const features = await prisma.subscriptionPlanFeature.findMany({
    where: { planId },
  });

  const getLimit = (key: string): number | null => {
    const feature = features.find((f) => f.featureKey === key);
    if (!feature || feature.featureValue === 'unlimited') return null;
    return parseInt(feature.featureValue, 10);
  };

  return {
    maxProperties: getLimit(PlanFeatureKey.MAX_PROPERTIES),
    maxRooms: getLimit(PlanFeatureKey.MAX_ROOMS),
    maxTenants: getLimit(PlanFeatureKey.MAX_TENANTS),
  };
}

/**
 * Check if owner has reached the property limit.
 */
export async function checkPropertyLimit(
  ownerId: string,
  planId: string
): Promise<{ allowed: boolean; current: number; limit: number | null }> {
  const limits = await getPlanLimits(planId);
  const current = await prisma.property.count({
    where: { ownerId, status: { not: 'inactive' } },
  });

  if (limits.maxProperties === null) return { allowed: true, current, limit: null };

  return {
    allowed: current < limits.maxProperties,
    current,
    limit: limits.maxProperties,
  };
}

/**
 * Check if owner has reached the room limit (across all properties).
 */
export async function checkRoomLimit(
  ownerId: string,
  planId: string
): Promise<{ allowed: boolean; current: number; limit: number | null }> {
  const limits = await getPlanLimits(planId);
  const current = await prisma.room.count({ where: { ownerId } });

  if (limits.maxRooms === null) return { allowed: true, current, limit: null };

  return {
    allowed: current < limits.maxRooms,
    current,
    limit: limits.maxRooms,
  };
}

/**
 * Check if owner has reached the active tenant limit.
 */
export async function checkTenantLimit(
  ownerId: string,
  planId: string
): Promise<{ allowed: boolean; current: number; limit: number | null }> {
  const limits = await getPlanLimits(planId);
  const current = await prisma.tenantStay.count({
    where: { ownerId, status: 'active' },
  });

  if (limits.maxTenants === null) return { allowed: true, current, limit: null };

  return {
    allowed: current < limits.maxTenants,
    current,
    limit: limits.maxTenants,
  };
}

/**
 * Get the active subscription for an owner.
 */
export async function getActiveSubscription(ownerId: string) {
  return prisma.subscription.findFirst({
    where: {
      ownerId,
      status: { in: ['trial', 'active', 'expiring_soon'] },
    },
    include: { plan: { include: { features: true } } },
    orderBy: { endsAt: 'desc' },
  });
}
