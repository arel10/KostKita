import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // ── Super Admin ───────────────────────────────
  const adminEmail = 'admin@kostkita.id';
  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });

  let admin;
  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash('Admin@KostKita2026!', 12);
    admin = await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash,
        name: 'Super Admin',
        role: 'super_admin',
        status: 'active',
      },
    });
    console.log('✅ Super Admin created:', adminEmail);
  } else {
    admin = existingAdmin;
    console.log('ℹ️  Super Admin already exists');
  }

  // ── Subscription Plans ────────────────────────
  const plans = [
    {
      name: 'Trial',
      slug: 'trial',
      description: 'Paket percobaan gratis selama 30 hari untuk mengenal KostKita.',
      price: 0,
      durationDays: 30,
      isActive: true,
      isDefault: true,
      sortOrder: 0,
      features: [
        { featureKey: 'max_properties', featureValue: '1' },
        { featureKey: 'max_rooms', featureValue: '5' },
        { featureKey: 'max_tenants', featureValue: '5' },
      ],
    },
    {
      name: 'Basic',
      slug: 'basic',
      description: 'Paket Basic untuk pemilik kost dengan 1 properti dan hingga 20 kamar.',
      price: 99000,
      durationDays: 30,
      isActive: true,
      isDefault: false,
      sortOrder: 1,
      features: [
        { featureKey: 'max_properties', featureValue: '1' },
        { featureKey: 'max_rooms', featureValue: '20' },
        { featureKey: 'max_tenants', featureValue: '20' },
      ],
    },
    {
      name: 'Pro',
      slug: 'pro',
      description: 'Paket Pro untuk pemilik kost dengan banyak properti. Tidak ada batasan kamar dan penghuni.',
      price: 249000,
      durationDays: 30,
      isActive: true,
      isDefault: false,
      sortOrder: 2,
      features: [
        { featureKey: 'max_properties', featureValue: 'unlimited' },
        { featureKey: 'max_rooms', featureValue: 'unlimited' },
        { featureKey: 'max_tenants', featureValue: 'unlimited' },
      ],
    },
  ];

  for (const planData of plans) {
    const { features, ...plan } = planData;

    const existing = await prisma.subscriptionPlan.findUnique({ where: { slug: plan.slug } });
    if (!existing) {
      const created = await prisma.subscriptionPlan.create({ data: plan });
      await prisma.subscriptionPlanFeature.createMany({
        data: features.map((f) => ({ planId: created.id, ...f })),
      });
      console.log(`✅ Plan created: ${plan.name}`);
    } else {
      console.log(`ℹ️  Plan already exists: ${plan.name}`);
    }
  }

  // ── System Settings ───────────────────────────
  const settings = [
    { key: 'app_name', value: 'KostKita', description: 'Nama aplikasi' },
    { key: 'contact_email', value: 'support@kostkita.id', description: 'Email kontak support' },
    { key: 'support_whatsapp', value: '6281234567890', description: 'Nomor WhatsApp support' },
    { key: 'payment_bank_name', value: 'Bank Central Asia (BCA)', description: 'Nama bank untuk pembayaran subscription' },
    { key: 'payment_account_number', value: '1234567890', description: 'Nomor rekening pembayaran subscription' },
    { key: 'payment_account_name', value: 'PT KostKita Indonesia', description: 'Nama rekening' },
    { key: 'maintenance_mode', value: 'false', description: 'Mode maintenance (true/false)' },
    { key: 'trial_duration_days', value: '30', description: 'Durasi default trial dalam hari' },
  ];

  for (const setting of settings) {
    await prisma.systemSetting.upsert({
      where: { key: setting.key },
      update: { value: setting.value, description: setting.description },
      create: { ...setting, updatedBy: admin.id },
    });
  }
  console.log('✅ System settings seeded');

  console.log('🎉 Seeding complete!');
  console.log('');
  console.log('Super Admin credentials:');
  console.log('  Email   : admin@kostkita.id');
  console.log('  Password: Admin@KostKita2026!');
  console.log('  ⚠️  Change password after first login!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
