-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('super_admin', 'owner');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('active', 'suspended', 'deactivated');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('trial', 'active', 'expiring_soon', 'expired', 'cancelled');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('pending', 'approved', 'rejected', 'expired', 'cancelled');

-- CreateEnum
CREATE TYPE "PropertyType" AS ENUM ('putra', 'putri', 'campur');

-- CreateEnum
CREATE TYPE "PropertyStatus" AS ENUM ('draft', 'active', 'inactive', 'suspended');

-- CreateEnum
CREATE TYPE "RoomStatus" AS ENUM ('available', 'occupied', 'maintenance');

-- CreateEnum
CREATE TYPE "TenantStayStatus" AS ENUM ('active', 'ended');

-- CreateEnum
CREATE TYPE "TenantPaymentStatus" AS ENUM ('paid', 'pending', 'overdue');

-- CreateEnum
CREATE TYPE "TenantPaymentMethod" AS ENUM ('cash', 'bank_transfer', 'other');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('subscription_expiring', 'subscription_expired', 'payment_approved', 'payment_rejected', 'listing_suspended', 'owner_suspended', 'system_announcement');

-- CreateEnum
CREATE TYPE "ListingReportReason" AS ENUM ('info_not_match', 'whatsapp_inactive', 'not_available', 'location_not_match', 'inappropriate_content', 'fraud', 'other');

-- CreateEnum
CREATE TYPE "ListingReportStatus" AS ENUM ('pending', 'reviewed', 'resolved');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'owner',
    "status" "UserStatus" NOT NULL DEFAULT 'active',
    "email_verified_at" TIMESTAMP(3),
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_plans" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL(12,2) NOT NULL,
    "duration_days" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_plan_features" (
    "id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "feature_key" TEXT NOT NULL,
    "feature_value" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscription_plan_features_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'trial',
    "starts_at" TIMESTAMP(3) NOT NULL,
    "ends_at" TIMESTAMP(3) NOT NULL,
    "activated_by_payment_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_payments" (
    "id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "reference_no" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "payment_date" DATE NOT NULL,
    "payment_method" TEXT NOT NULL,
    "proof_url" TEXT,
    "notes" TEXT,
    "status" "PaymentStatus" NOT NULL DEFAULT 'pending',
    "reviewed_by" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "rejection_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "properties" (
    "id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "type" "PropertyType" NOT NULL,
    "whatsapp" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "province" TEXT,
    "city" TEXT,
    "district" TEXT,
    "subdistrict" TEXT,
    "postal_code" TEXT,
    "latitude" DECIMAL(10,8),
    "longitude" DECIMAL(11,8),
    "price_start" DECIMAL(12,2),
    "status" "PropertyStatus" NOT NULL DEFAULT 'draft',
    "suspended_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "properties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "property_photos" (
    "id" TEXT NOT NULL,
    "property_id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "property_photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "property_facilities" (
    "id" TEXT NOT NULL,
    "property_id" TEXT NOT NULL,
    "facility_name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "property_facilities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "property_rules" (
    "id" TEXT NOT NULL,
    "property_id" TEXT NOT NULL,
    "rule" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "property_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rooms" (
    "id" TEXT NOT NULL,
    "property_id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "room_number" TEXT NOT NULL,
    "name" TEXT,
    "type" TEXT,
    "price" DECIMAL(12,2) NOT NULL,
    "description" TEXT,
    "status" "RoomStatus" NOT NULL DEFAULT 'available',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "room_photos" (
    "id" TEXT NOT NULL,
    "room_id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "room_photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "room_facilities" (
    "id" TEXT NOT NULL,
    "room_id" TEXT NOT NULL,
    "facility_name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "room_facilities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenants" (
    "id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "whatsapp" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_stays" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "room_id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "check_in_date" DATE NOT NULL,
    "check_out_date" DATE,
    "rent_price" DECIMAL(12,2) NOT NULL,
    "deposit" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "status" "TenantStayStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_stays_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_payments" (
    "id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "tenant_stay_id" TEXT NOT NULL,
    "period_start" DATE NOT NULL,
    "period_end" DATE NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "payment_date" DATE,
    "payment_method" "TenantPaymentMethod",
    "status" "TenantPaymentStatus" NOT NULL DEFAULT 'pending',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "data" JSONB,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "listing_reports" (
    "id" TEXT NOT NULL,
    "property_id" TEXT NOT NULL,
    "reason" "ListingReportReason" NOT NULL,
    "description" TEXT,
    "reporter_name" TEXT,
    "reporter_contact" TEXT,
    "status" "ListingReportStatus" NOT NULL DEFAULT 'pending',
    "reviewed_by" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "listing_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "actor_id" TEXT,
    "actor_role" TEXT,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT,
    "old_value" JSONB,
    "new_value" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_settings" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT,
    "description" TEXT,
    "updated_by" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_plans_slug_key" ON "subscription_plans"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_plan_features_plan_id_feature_key_key" ON "subscription_plan_features"("plan_id", "feature_key");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_activated_by_payment_id_key" ON "subscriptions"("activated_by_payment_id");

-- CreateIndex
CREATE INDEX "subscriptions_owner_id_idx" ON "subscriptions"("owner_id");

-- CreateIndex
CREATE INDEX "subscriptions_status_idx" ON "subscriptions"("status");

-- CreateIndex
CREATE INDEX "subscriptions_ends_at_idx" ON "subscriptions"("ends_at");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_payments_reference_no_key" ON "subscription_payments"("reference_no");

-- CreateIndex
CREATE INDEX "subscription_payments_owner_id_idx" ON "subscription_payments"("owner_id");

-- CreateIndex
CREATE INDEX "subscription_payments_status_idx" ON "subscription_payments"("status");

-- CreateIndex
CREATE UNIQUE INDEX "properties_slug_key" ON "properties"("slug");

-- CreateIndex
CREATE INDEX "properties_owner_id_idx" ON "properties"("owner_id");

-- CreateIndex
CREATE INDEX "properties_status_idx" ON "properties"("status");

-- CreateIndex
CREATE INDEX "properties_city_idx" ON "properties"("city");

-- CreateIndex
CREATE INDEX "properties_type_idx" ON "properties"("type");

-- CreateIndex
CREATE INDEX "properties_latitude_longitude_idx" ON "properties"("latitude", "longitude");

-- CreateIndex
CREATE INDEX "rooms_owner_id_idx" ON "rooms"("owner_id");

-- CreateIndex
CREATE INDEX "rooms_status_idx" ON "rooms"("status");

-- CreateIndex
CREATE UNIQUE INDEX "rooms_property_id_room_number_key" ON "rooms"("property_id", "room_number");

-- CreateIndex
CREATE INDEX "tenants_owner_id_idx" ON "tenants"("owner_id");

-- CreateIndex
CREATE INDEX "tenant_stays_owner_id_idx" ON "tenant_stays"("owner_id");

-- CreateIndex
CREATE INDEX "tenant_stays_status_idx" ON "tenant_stays"("status");

-- CreateIndex
CREATE INDEX "tenant_payments_owner_id_idx" ON "tenant_payments"("owner_id");

-- CreateIndex
CREATE INDEX "tenant_payments_status_idx" ON "tenant_payments"("status");

-- CreateIndex
CREATE INDEX "notifications_user_id_idx" ON "notifications"("user_id");

-- CreateIndex
CREATE INDEX "notifications_read_at_idx" ON "notifications"("read_at");

-- CreateIndex
CREATE INDEX "audit_logs_actor_id_idx" ON "audit_logs"("actor_id");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "system_settings_key_key" ON "system_settings"("key");

-- AddForeignKey
ALTER TABLE "subscription_plan_features" ADD CONSTRAINT "subscription_plan_features_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "subscription_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "subscription_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_activated_by_payment_id_fkey" FOREIGN KEY ("activated_by_payment_id") REFERENCES "subscription_payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_payments" ADD CONSTRAINT "subscription_payments_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_payments" ADD CONSTRAINT "subscription_payments_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "subscription_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_payments" ADD CONSTRAINT "subscription_payments_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "properties" ADD CONSTRAINT "properties_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_photos" ADD CONSTRAINT "property_photos_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_facilities" ADD CONSTRAINT "property_facilities_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_rules" ADD CONSTRAINT "property_rules_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_photos" ADD CONSTRAINT "room_photos_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_facilities" ADD CONSTRAINT "room_facilities_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenants" ADD CONSTRAINT "tenants_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_stays" ADD CONSTRAINT "tenant_stays_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_stays" ADD CONSTRAINT "tenant_stays_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_stays" ADD CONSTRAINT "tenant_stays_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_payments" ADD CONSTRAINT "tenant_payments_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_payments" ADD CONSTRAINT "tenant_payments_tenant_stay_id_fkey" FOREIGN KEY ("tenant_stay_id") REFERENCES "tenant_stays"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listing_reports" ADD CONSTRAINT "listing_reports_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listing_reports" ADD CONSTRAINT "listing_reports_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system_settings" ADD CONSTRAINT "system_settings_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
