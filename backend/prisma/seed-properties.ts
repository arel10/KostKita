import { PrismaClient, PropertyType, PropertyStatus, RoomStatus, SubscriptionStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function seedProperties() {
  console.log('🏘️  Mulai seeding real data properti & kamar...');

  const passwordHash = await bcrypt.hash('Owner@KostKita2026!', 10);
  const proPlan = await prisma.subscriptionPlan.findUnique({ where: { slug: 'pro' } });
  if (!proPlan) {
    throw new Error('Pro plan not found. Please run base seed first.');
  }

  // 1. Owner Accounts
  const ownersData = [
    {
      email: 'owner.melati@gmail.com',
      name: 'Hj. Rosmawati S.E.',
      phone: '6281267891234',
    },
    {
      email: 'owner.pogung@gmail.com',
      name: 'Bambang Prasetyo',
      phone: '6281328905678',
    },
    {
      email: 'owner.kukusan@gmail.com',
      name: 'Anita Wijaya',
      phone: '628119876543',
    },
    {
      email: 'owner.tebet@gmail.com',
      name: 'Hendra Gunawan',
      phone: '628176543210',
    },
    {
      email: 'owner.dago@gmail.com',
      name: 'Dr. Dewi Sartika',
      phone: '628122345678',
    },
  ];

  const createdOwners: Record<string, string> = {};

  for (const o of ownersData) {
    let user = await prisma.user.findUnique({ where: { email: o.email } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: o.email,
          name: o.name,
          phone: o.phone,
          passwordHash,
          role: 'owner',
          status: 'active',
        },
      });
      console.log(`✅ Owner created: ${o.name} (${o.email})`);
    } else {
      console.log(`ℹ️  Owner exists: ${o.name}`);
    }
    createdOwners[o.email] = user.id;

    // Check & create active subscription
    const existingSub = await prisma.subscription.findFirst({
      where: {
        ownerId: user.id,
        status: { in: ['trial', 'active'] },
        endsAt: { gt: new Date() },
      },
    });

    if (!existingSub) {
      const now = new Date();
      const endsAt = new Date();
      endsAt.setFullYear(endsAt.getFullYear() + 1); // 1 year active

      await prisma.subscription.create({
        data: {
          ownerId: user.id,
          planId: proPlan.id,
          status: SubscriptionStatus.active,
          startsAt: now,
          endsAt: endsAt,
        },
      });
      console.log(`  ⭐ Subscription Pro diaktifkan untuk: ${o.name}`);
    }
  }

  // 2. Real Properties Data
  const properties = [
    {
      ownerEmail: 'owner.melati@gmail.com',
      name: 'Kost Melati Residence Padang',
      slug: 'kost-melati-residence-padang',
      description: 'Kost modern eksklusif dengan konsep arsitektur tropis minimalis di kawasan strategis Kuranji, Padang. Lingkungan sangat asri, tenang, dan aman. Lokasi hanya 7 menit dari Kampus Universitas Andalas (Unand) Limau Manis, 10 menit ke RSUP M. Djamil, dan dekat berbagai pusat kuliner serta minimarket 24 jam. Kamar full furnished dengan sirkulasi udara optimal dan pencahayaan alami.',
      type: PropertyType.campur,
      whatsapp: '6281267891234',
      address: 'Jl. Belimbing Raya No. 14, Kuranji',
      province: 'Sumatera Barat',
      city: 'Kota Padang',
      district: 'Kuranji',
      subdistrict: 'Korong Gadang',
      postalCode: '25156',
      latitude: -0.92420000,
      longitude: 100.38310000,
      priceStart: 1250000,
      status: PropertyStatus.active,
      photos: [
        {
          url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD0LbOhOvast8uvMNY-z1KqdiSC4q4graOrUG25GpsXyNt0Oq0vEbGQuWllFsri6j5Szm4uG61kKJJMpF9FkA4JtafaqKDDAgC96ZLq_ten9mFSVcpwGaMzmFItz78sN9-wLj7SZ-VTKteVeq-HcDL9iHsrmT54rNKdeCZxhslF_VtwYqS-QEp5rinf2J-51LJAQRSLunZ7yrUieHeN27yJDYpui9b2kxg0JvyGScjvv86L8zhpcAC2',
          isPrimary: true,
          order: 0,
        },
        {
          url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAHmx9NhsGul26qIBpa25O7zRRbHdb1wVctK4cFWnpmiXWf_5EcnX5XJUuOqpWKlQPBLQfW4QDOetPN_Xo_fpydSoATncQ_GIejX7N6v2ErJaFJtZ_3ozspkq03KQ0h2XbEQNVcV09dNdxYfDAt0_0nCoAXM3fJ1T7ohgaE7PEbWFfSHNjQMtBQ4gyRL8QdFF1Q01mG3UJW26rRmsXrqhb1mVn0lcc2ROzIFyeTCSz5Gzxkp09lnegI',
          isPrimary: false,
          order: 1,
        },
        {
          url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCGkzI4WkRZGat0yhMDq5Q3awPpxPSHmntCs4ukwhLcfkuuYzCpY6-zL-xGGjIKw-JOnvBgoeh8MPhTVHhOO-_Y1gaNct3wSTVuCnpx3PHaVrmf5K0UnCJKRtV-rq4YmB4oeC10y0xvRSM-5iq1m_XGPPAVOQJo214XG4AlL73Gvnd15pFFckrsZ_KbErDrhDGR-bs12Cmiao4EZOLrOYhf5Gv5n8sEQ2Se2c63ROkDK2BswsL67GRp',
          isPrimary: false,
          order: 2,
        },
        {
          url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDCEO4KOPxTnFmJUTxAC4_2sshMoiLBBtvxL2kkSkG46suA-pmAi6JgZ2g4DVIr5PufMTxat1vpf3oeZ2RtWPe0yXoPOF7YpAhezNkETNDA39k_VcjroaYTUrD_iUpBBSeVVuyO_d70_so6OI3bhdaiKUzAGlrm38hoIav_-q6By1q9bXCEwRPmpCZjJZagsZbE2or0VZjLlIhCaGJVRA_seD8ADCyxLou_lhuogmRVcKRStyJwGzO0',
          isPrimary: false,
          order: 3,
        },
        {
          url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCtpOPyD1HEkelEwxcQIFeuJDwOlwxZEYc5dx9TKqRgvtHvW2ADxMi-blUKDs2XMLf3YkQnlMsTdMmTk_QRTVV9JbQT1n4lj1Fv1182bv_8CjAP3lnu20AQA0zinD865q8E33iST96SAxJkB440aVdXJoomQhb4vqqDvuVwvYUyV1HhlmuwLIqXwJ1uAEqvVnkmANbkIUt6knDMZ-DsEuTAV6NkggqZipwGvgP-6boxOzaTo4zFDwvW',
          isPrimary: false,
          order: 4,
        },
      ],
      facilities: [
        'AC Inverter',
        'WiFi Fiber 100 Mbps',
        'Kamar Mandi Dalam',
        'Water Heater',
        'Kasur Springbed Queen Size',
        'Meja & Kursi Belajar Ergonomis',
        'Lemari Pakaian 2 Pintu',
        'Dapur Bersama Lengkap',
        'Kulkas Bersama',
        'Dispenser Air Minum Gratis',
        'Parkir Mobil Luas',
        'Parkir Motor Beratap',
        'CCTV 24 Jam',
        'Gazebo Santai & Rooftop',
      ],
      rules: [
        'Akses gerbang bebas 24 jam dengan kunci digital card',
        'Tamu lawan jenis dilarang masuk ke dalam kamar privat (gunakan ruang tamu / gazebo bersama)',
        'Dilarang keras merokok di dalam kamar ber-AC',
        'Dilarang membawa hewan peliharaan',
        'Jam tenang malam hari mulai pukul 22.00 WIB untuk kenyamanan istirahat penghuni',
      ],
      rooms: [
        {
          roomNumber: '101',
          name: 'Kamar Deluxe A',
          type: 'Deluxe',
          price: 1500000,
          description: 'Kamar ukuran 4x4 meter, lantai 1, kasur queen, AC, KM dalam dengan shower dan water heater, meja belajar, jendela menghadap taman.',
          status: RoomStatus.available,
          facilities: ['AC', 'KM Dalam', 'Water Heater', 'Kasur Springbed', 'WiFi', 'Meja Belajar'],
          photos: [
            {
              url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD0LbOhOvast8uvMNY-z1KqdiSC4q4graOrUG25GpsXyNt0Oq0vEbGQuWllFsri6j5Szm4uG61kKJJMpF9FkA4JtafaqKDDAgC96ZLq_ten9mFSVcpwGaMzmFItz78sN9-wLj7SZ-VTKteVeq-HcDL9iHsrmT54rNKdeCZxhslF_VtwYqS-QEp5rinf2J-51LJAQRSLunZ7yrUieHeN27yJDYpui9b2kxg0JvyGScjvv86L8zhpcAC2',
              isPrimary: true,
            }
          ]
        },
        {
          roomNumber: '102',
          name: 'Kamar Deluxe B (Balkon)',
          type: 'Deluxe',
          price: 1650000,
          description: 'Kamar ukuran 4x4.5 meter di lantai 2 dengan balkon pribadi pemandangan bukit Padang, AC, KM dalam, Smart TV 32 inch.',
          status: RoomStatus.available,
          facilities: ['AC', 'Balkon', 'KM Dalam', 'Water Heater', 'Smart TV', 'WiFi'],
          photos: [
            {
              url: 'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=800&q=80',
              isPrimary: true,
            }
          ]
        },
        {
          roomNumber: '103',
          name: 'Kamar Superior',
          type: 'Superior',
          price: 1250000,
          description: 'Kamar ukuran 3x4 meter, single bed nyaman, AC, KM dalam, meja belajar compact, hemat listrik.',
          status: RoomStatus.available,
          facilities: ['AC', 'KM Dalam', 'Kasur Single', 'WiFi', 'Meja Belajar'],
          photos: [
            {
              url: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=800&q=80',
              isPrimary: true,
            }
          ]
        },
        {
          roomNumber: '104',
          name: 'Kamar Standar AC',
          type: 'Standar',
          price: 1300000,
          description: 'Kamar ukuran 3x3.5 meter, sudah terisi penyewa aktif.',
          status: RoomStatus.occupied,
          facilities: ['AC', 'KM Dalam', 'WiFi'],
          photos: []
        },
      ]
    },
    {
      ownerEmail: 'owner.pogung@gmail.com',
      name: 'Kost Graha Pogung Indah UGM',
      slug: 'kost-graha-pogung-indah-ugm',
      description: 'Kost asri dan modern khusus putri mahasiswi/karyawati di kawasan Pogung Baru, hanya 3 menit ke Fakultas Kedokteran & Teknik UGM. Fasilitas lengkap serba ada, lingkungan aman dengan satpam komplek 24 jam.',
      type: PropertyType.putri,
      whatsapp: '6281328905678',
      address: 'Jl. Pogung Baru Blok F No. 8, Sinduadi, Mlati',
      province: 'D.I. Yogyakarta',
      city: 'Kabupaten Sleman',
      district: 'Mlati',
      subdistrict: 'Sinduadi',
      postalCode: '55284',
      latitude: -7.76120000,
      longitude: 110.37250000,
      priceStart: 1400000,
      status: PropertyStatus.active,
      photos: [
        {
          url: 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=800&q=80',
          isPrimary: true,
          order: 0,
        },
        {
          url: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=800&q=80',
          isPrimary: false,
          order: 1,
        },
      ],
      facilities: ['AC', 'WiFi Cepat', 'KM Dalam', 'Water Heater', 'Dapur Bersama', 'Kulkas Bersama', 'Parkir Motor Aman', 'CCTV 24 Jam'],
      rules: [
        'Khusus Putri Mahasiswi / Karyawati',
        'Tamu pria dilarang masuk ke koridor kamar',
        'Pintu gerbang ditutup pukul 23.00 WIB',
        'Dilarang merokok di area kost',
      ],
      rooms: [
        {
          roomNumber: 'A-01',
          name: 'Kamar Standard AC',
          type: 'Standard',
          price: 1400000,
          description: 'Kamar 3x3.5 m, AC, kasur springbed, KM dalam, lemari kayu jati.',
          status: RoomStatus.available,
          facilities: ['AC', 'KM Dalam', 'Kasur', 'WiFi'],
          photos: []
        },
        {
          roomNumber: 'A-02',
          name: 'Kamar Deluxe Mezanin',
          type: 'Deluxe',
          price: 1750000,
          description: 'Kamar mezanin dengan area kerja di bawah dan tempat tidur di atas.',
          status: RoomStatus.available,
          facilities: ['AC', 'KM Dalam', 'Water Heater', 'WiFi'],
          photos: []
        }
      ]
    },
    {
      ownerEmail: 'owner.kukusan@gmail.com',
      name: 'Kost Kukusan Asri Dekat UI Depok',
      slug: 'kost-kukusan-asri-ui-depok',
      description: 'Kost nyaman dan terjangkau berlokasi strategis di Kukusan, sangat dekat dengan Pintu Masuk Vokasi dan Teknik Universitas Indonesia. Akses jalan lebar bisa mobil, bebas banjir, suasana tenang untuk fokus belajar.',
      type: PropertyType.campur,
      whatsapp: '628119876543',
      address: 'Jl. Juragan Sinda No. 25, Kukusan',
      province: 'Jawa Barat',
      city: 'Kota Depok',
      district: 'Beji',
      subdistrict: 'Kukusan',
      postalCode: '16425',
      latitude: -6.36210000,
      longitude: 106.82450000,
      priceStart: 1100000,
      status: PropertyStatus.active,
      photos: [
        {
          url: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80',
          isPrimary: true,
          order: 0,
        },
        {
          url: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80',
          isPrimary: false,
          order: 1,
        }
      ],
      facilities: ['AC', 'WiFi Cepat', 'KM Dalam', 'Dapur Bersama', 'Parkir Motor', 'Penjaga Kost'],
      rules: [
        'Akses gerbang bebas 24 jam',
        'Dilarang berisik di atas jam 22.00',
        'Jaga kebersihan dapur bersama setelah memasak'
      ],
      rooms: [
        {
          roomNumber: 'K-01',
          name: 'Kamar Cozy Single',
          type: 'Standard',
          price: 1100000,
          description: 'Kamar 3x3 meter, AC, single bed, meja belajar, KM dalam.',
          status: RoomStatus.available,
          facilities: ['AC', 'KM Dalam', 'WiFi'],
          photos: []
        },
        {
          roomNumber: 'K-02',
          name: 'Kamar Large Queen',
          type: 'Deluxe',
          price: 1350000,
          description: 'Kamar 3.5x4 meter, AC, kasur queen, KM dalam.',
          status: RoomStatus.available,
          facilities: ['AC', 'KM Dalam', 'WiFi'],
          photos: []
        }
      ]
    },
    {
      ownerEmail: 'owner.tebet@gmail.com',
      name: 'Kost Tebet Eco Living Jakarta Selatan',
      slug: 'kost-tebet-eco-living-jaksel',
      description: 'Kost modern berkonsep ramah lingkungan di jantung Jakarta Selatan. Hanya 5 menit jalan kaki ke Stasiun KRL Tebet, dikelilingi cafe hits dan pusat kuliner Tebet. Cocok untuk profesional muda dan eksekutif.',
      type: PropertyType.campur,
      whatsapp: '628176543210',
      address: 'Jl. Tebet Barat Dalam Raya No. 42, Tebet',
      province: 'DKI Jakarta',
      city: 'Kota Jakarta Selatan',
      district: 'Tebet',
      subdistrict: 'Tebet Barat',
      postalCode: '12810',
      latitude: -6.23450000,
      longitude: 106.85230000,
      priceStart: 2100000,
      status: PropertyStatus.active,
      photos: [
        {
          url: 'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?auto=format&fit=crop&w=800&q=80',
          isPrimary: true,
          order: 0,
        },
        {
          url: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=800&q=80',
          isPrimary: false,
          order: 1,
        }
      ],
      facilities: ['AC Inverter', 'WiFi Fiber Optic', 'KM Dalam', 'Water Heater', 'Smart Lock', 'Coworking Space', 'Dapur Bersama', 'Parkir Mobil'],
      rules: [
        'Akses pintu utama kartu RFID smart lock 24 jam',
        'Bebas rokok di seluruh area indoor',
        'Tamu wajib lapor ke resepsionis/security'
      ],
      rooms: [
        {
          roomNumber: 'T-201',
          name: 'Executive Studio',
          type: 'Executive',
          price: 2500000,
          description: 'Studio 4x5 meter, smart TV, kulkas mini, AC, water heater.',
          status: RoomStatus.available,
          facilities: ['AC', 'Smart TV', 'KM Dalam', 'Water Heater', 'Kulkas Mini'],
          photos: []
        },
        {
          roomNumber: 'T-202',
          name: 'Deluxe Room',
          type: 'Deluxe',
          price: 2100000,
          description: 'Kamar 3.5x4 meter, AC, KM dalam, meja kerja minimalis.',
          status: RoomStatus.available,
          facilities: ['AC', 'KM Dalam', 'Water Heater', 'WiFi'],
          photos: []
        }
      ]
    },
    {
      ownerEmail: 'owner.dago@gmail.com',
      name: 'Kost Dago Heritage ITB Bandung',
      slug: 'kost-dago-heritage-itb-bandung',
      description: 'Kost eksklusif berhawa sejuk di kawasan Dago Asri Bandung. 5 menit ke ITB, UNPAD Dipatiukur, dan ITHB. Bangunan bernuansa heritage modern dengan taman hijau yang luas.',
      type: PropertyType.putra,
      whatsapp: '628122345678',
      address: 'Jl. Dago Asri Blok B No. 12, Coblong',
      province: 'Jawa Barat',
      city: 'Kota Bandung',
      district: 'Coblong',
      subdistrict: 'Dago',
      postalCode: '40135',
      latitude: -6.88210000,
      longitude: 107.61890000,
      priceStart: 1600000,
      status: PropertyStatus.active,
      photos: [
        {
          url: 'https://images.unsplash.com/photo-1507089947368-19c1da9775ae?auto=format&fit=crop&w=800&q=80',
          isPrimary: true,
          order: 0,
        },
        {
          url: 'https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=800&q=80',
          isPrimary: false,
          order: 1,
        }
      ],
      facilities: ['AC', 'WiFi Cepat', 'KM Dalam', 'Water Heater', 'Taman Santai', 'Dapur Bersama', 'Parkir Mobil & Motor'],
      rules: [
        'Khusus Putra Mahasiswa / Profesional',
        'Pintu gerbang ditutup pukul 23.30 WIB',
        'Dilarang membawa minuman keras / narkoba'
      ],
      rooms: [
        {
          roomNumber: 'D-01',
          name: 'Superior Room Dago',
          type: 'Superior',
          price: 1600000,
          description: 'Kamar 3.5x4 meter, kasur springbed, KM dalam water heater, jendela taman.',
          status: RoomStatus.available,
          facilities: ['AC', 'KM Dalam', 'Water Heater', 'WiFi'],
          photos: []
        }
      ]
    },
  ];

  for (const p of properties) {
    const ownerId = createdOwners[p.ownerEmail];
    const existing = await prisma.property.findUnique({ where: { slug: p.slug } });

    if (!existing) {
      const createdProp = await prisma.property.create({
        data: {
          ownerId,
          name: p.name,
          slug: p.slug,
          description: p.description,
          type: p.type,
          whatsapp: p.whatsapp,
          address: p.address,
          province: p.province,
          city: p.city,
          district: p.district,
          subdistrict: p.subdistrict,
          postalCode: p.postalCode,
          latitude: p.latitude,
          longitude: p.longitude,
          priceStart: p.priceStart,
          status: p.status,
          photos: {
            create: p.photos.map((ph) => ({
              url: ph.url,
              isPrimary: ph.isPrimary,
              order: ph.order,
            })),
          },
          facilities: {
            create: p.facilities.map((f) => ({ facilityName: f })),
          },
          rules: {
            create: p.rules.map((r) => ({ rule: r })),
          },
        },
      });

      console.log(`✅ Property created: ${p.name}`);

      // Create rooms
      for (const room of p.rooms) {
        const createdRoom = await prisma.room.create({
          data: {
            propertyId: createdProp.id,
            ownerId,
            roomNumber: room.roomNumber,
            name: room.name,
            type: room.type,
            price: room.price,
            description: room.description,
            status: room.status,
            facilities: {
              create: room.facilities.map((f) => ({ facilityName: f })),
            },
            photos: {
              create: room.photos.map((ph, idx) => ({
                url: ph.url,
                isPrimary: ph.isPrimary,
                order: idx,
              })),
            },
          },
        });
        console.log(`   🛏️ Room created: ${room.roomNumber} - ${room.name} (Rp ${room.price.toLocaleString('id-ID')})`);
      }
    } else {
      console.log(`ℹ️  Property already exists: ${p.name}`);
    }
  }

  console.log('🎉 Seeding real properties & rooms selesai dengan sukses!');
}

seedProperties()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
