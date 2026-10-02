// Feature keys for subscription plan limits
export const PlanFeatureKey = {
  MAX_PROPERTIES: 'max_properties',
  MAX_ROOMS: 'max_rooms',
  MAX_TENANTS: 'max_tenants',
} as const;

export type PlanFeatureKeyType = (typeof PlanFeatureKey)[keyof typeof PlanFeatureKey];

// Audit actions
export const AuditAction = {
  LOGIN: 'login',
  LOGOUT: 'logout',
  REGISTER: 'register',
  PASSWORD_RESET: 'password_reset',

  PROPERTY_CREATE: 'property.create',
  PROPERTY_UPDATE: 'property.update',
  PROPERTY_DELETE: 'property.delete',
  PROPERTY_PUBLISH: 'property.publish',
  PROPERTY_UNPUBLISH: 'property.unpublish',
  PROPERTY_SUSPEND: 'property.suspend',
  PROPERTY_ACTIVATE: 'property.activate',

  ROOM_CREATE: 'room.create',
  ROOM_UPDATE: 'room.update',
  ROOM_DELETE: 'room.delete',

  TENANT_CREATE: 'tenant.create',
  TENANT_UPDATE: 'tenant.update',
  TENANT_DELETE: 'tenant.delete',

  STAY_CREATE: 'stay.create',
  STAY_END: 'stay.end',

  PAYMENT_CREATE: 'payment.create',
  PAYMENT_UPDATE: 'payment.update',

  SUBSCRIPTION_PAYMENT_SUBMIT: 'subscription_payment.submit',
  SUBSCRIPTION_PAYMENT_APPROVE: 'subscription_payment.approve',
  SUBSCRIPTION_PAYMENT_REJECT: 'subscription_payment.reject',
  SUBSCRIPTION_ACTIVATE: 'subscription.activate',
  SUBSCRIPTION_EXPIRE: 'subscription.expire',

  OWNER_SUSPEND: 'owner.suspend',
  OWNER_ACTIVATE: 'owner.activate',

  PLAN_CREATE: 'plan.create',
  PLAN_UPDATE: 'plan.update',

  LISTING_REPORT_REVIEW: 'listing_report.review',

  SETTINGS_UPDATE: 'settings.update',
} as const;

export type AuditActionType = (typeof AuditAction)[keyof typeof AuditAction];

// Entity types for audit log
export const EntityType = {
  USER: 'user',
  PROPERTY: 'property',
  ROOM: 'room',
  TENANT: 'tenant',
  TENANT_STAY: 'tenant_stay',
  PAYMENT: 'tenant_payment',
  SUBSCRIPTION: 'subscription',
  SUBSCRIPTION_PAYMENT: 'subscription_payment',
  PLAN: 'subscription_plan',
  LISTING_REPORT: 'listing_report',
  SYSTEM_SETTING: 'system_setting',
} as const;
