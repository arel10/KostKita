import {
  PrismaClient,
  PropertyType,
  PropertyStatus,
  RoomStatus,
  SubscriptionStatus,
  PaymentStatus,
  TenantStayStatus,
  TenantPaymentStatus,
  TenantPaymentMethod,
  NotificationType,
  ListingReportReason,
  ListingReportStatus,
} from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// ─────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────

function daysFromNow(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

function monthsAgo(months: number, dayOfMonth = 1): Date {
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  d.setDate(dayOfMonth);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

// Curated Unsplash room & house photos (free, stable, high-res)
const PROPERTY_PHOTOS = [
  'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1000&q=80',
  'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1000&q=80',
  'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1000&q=80',
  'https://images.unsplash.com/photo-1554995207-c18c203602cb?w=1000&q=80',
  'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=1000&q=80',
  'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1000&q=80',
  'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1000&q=80',
  'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1000&q=80',
];

const ROOM_PHOTOS = [
  'https://images.unsplash.com/photo-1540518614846-7eded433c457?w=900&q=80',
  'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?w=900&q=80',
  'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=900&q=80',
  'https://images.unsplash.com/photo-1616594039964-ae9021a400a0?w=900&q=80',
  'https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=900&q=80',
  'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=900&q=80',
];

const TENANT_NAMES = [
  'Rizky Pratama',
  'Nadia Putri Maharani',
  'Fajar Nugroho',
  'Siti Rahmawati',
  'Dimas Saputra',
  'Aulia Azzahra',
  'Bagas Kurniawan',
  'Intan Permatasari',
  'Reza Mahendra',
  'Putri Wulandari',
  'Ilham Ramadhan',
  'Dinda Lestari',
  'Kevin Wijaya',
  'Salsa Billa',
  'Andi Firmansyah',
  'Larasati Dewi',
  'Yoga Pratama',
  'Mutiara Hasanah',
  'Rama Aditya',
  'Citra Kusuma',
  'Gilang Perkasa',
  'Fitri Handayani',
  'Arif Hidayat',
  'Nabila Syakira',
  'Bayu Setiawan',
  'Vina Oktaviani',
  'Hafiz Alfarizi',
  'Tiara Anggraini',
  'Farhan Maulana',
  'Rani Puspita',
];

const PROPERTY_FACILITIES_POOL = [
  'AC Inverter',
  'WiFi Fiber 100 Mbps',
  'Kamar Mandi Dalam',
  'Water Heater',
  'Dapur Bersama',
  'Kulkas Bersama',
  'Dispenser Air Minum',
  'Parkir Motor Beratap',
  'Parkir Mobil',
  'CCTV 24 Jam',
  'Penjaga Kost 24 Jam',
  'Ruang Jemur & Laundry',
  'Rooftop Santai',
  'Akses Kunci Kartu / Smart Lock',
];

const PROPERTY_RULES_POOL = [
  'Akses gerbang 24 jam dengan kunci pribadi / kartu akses',
  'Tamu lawan jenis dilarang masuk ke dalam kamar',
  'Dilarang merokok di dalam kamar ber-AC',
  'Dilarang membawa hewan peliharaan',
  'Jam tenang malam hari mulai pukul 22.00 WIB',
  'Wajib menjaga kebersihan area bersama dan dapur',
  'Pembayaran sewa maksimal tanggal 5 setiap bulan',
];

interface OwnerSeedConfig {
  index: number;
  email: string;
  name: string;
  phone: string;
  planSlug: 'pro' | 'basic' | 'trial';
  subStatus: SubscriptionStatus;
  subDaysLeft: number;
  hasPendingUpgrade?: boolean;
  properties: {
    name: string;
    slug: string;
    type: PropertyType;
    address: string;
    province: string;
    city: string;
    district: string;
    subdistrict: string;
    postalCode: string;
    latitude: number;
    longitude: number;
    basePrice: number;
    roomCount: number;
    description: string;
  }[];
}

// ─────────────────────────────────────────────
// 20 OWNER ACCOUNTS DATA
// ─────────────────────────────────────────────

const OWNERS_CONFIG: OwnerSeedConfig[] = [
  {
    index: 1,
    email: 'owner01@kostkita.id',
    name: 'H. Ahmad Fauzi',
    phone: '6281270010001',
    planSlug: 'pro',
    subStatus: SubscriptionStatus.active,
    subDaysLeft: 280,
    properties: [
      {
        name: 'Kost Andalas Premier Padang',
        slug: 'kost-andalas-premier-padang',
        type: PropertyType.campur,
        address: 'Jl. Dr. Moh. Hatta No. 18, Pasar Ambacang',
        province: 'Sumatera Barat',
        city: 'Kota Padang',
        district: 'Kuranji',
        subdistrict: 'Pasar Ambacang',
        postalCode: '25152',
        latitude: -0.9278,
        longitude: 100.4152,
        basePrice: 1200000,
        roomCount: 5,
        description: 'Kost eksklusif dekat Kampus Unand Limau Manis dengan akses jalan besar, parkir luas, WiFi kencang, dan suasana tenang.',
      },
      {
        name: 'Kost Khatib Sulaiman Residence',
        slug: 'kost-khatib-sulaiman-residence',
        type: PropertyType.putri,
        address: 'Jl. Khatib Sulaiman No. 55, Lolong Belanti',
        province: 'Sumatera Barat',
        city: 'Kota Padang',
        district: 'Padang Utara',
        subdistrict: 'Lolong Belanti',
        postalCode: '25136',
        latitude: -0.9165,
        longitude: 100.3589,
        basePrice: 1350000,
        roomCount: 4,
        description: 'Kost putri modern di pusat kota Padang, dekat pusat perkantoran, Transmart, dan kampus UNP.',
      },
    ],
  },
  {
    index: 2,
    email: 'owner02@kostkita.id',
    name: 'Ratna Sari Dewi',
    phone: '6281270010002',
    planSlug: 'pro',
    subStatus: SubscriptionStatus.active,
    subDaysLeft: 210,
    properties: [
      {
        name: 'Kost Griya Kaliurang UGM',
        slug: 'kost-griya-kaliurang-ugm',
        type: PropertyType.putri,
        address: 'Jl. Kaliurang KM 6.5 Gg. Pandega Marta No. 12',
        province: 'D.I. Yogyakarta',
        city: 'Kabupaten Sleman',
        district: 'Depok',
        subdistrict: 'Caturtunggal',
        postalCode: '55281',
        latitude: -7.7521,
        longitude: 110.3824,
        basePrice: 1450000,
        roomCount: 5,
        description: 'Kost putri nyaman dan aman hanya 5 menit dari UGM dan Ringroad Utara, kamar full furnished dengan balkon.',
      },
      {
        name: 'Kost Seturan Executive Jogja',
        slug: 'kost-seturan-executive-jogja',
        type: PropertyType.campur,
        address: 'Jl. Seturan Raya No. 88, Caturtunggal',
        province: 'D.I. Yogyakarta',
        city: 'Kabupaten Sleman',
        district: 'Depok',
        subdistrict: 'Caturtunggal',
        postalCode: '55281',
        latitude: -7.7689,
        longitude: 110.4098,
        basePrice: 1600000,
        roomCount: 4,
        description: 'Kost eksekutif strategis di kawasan kampus UPN, Atma Jaya, dan YKPN. Dikelilingi kafe dan kuliner 24 jam.',
      },
    ],
  },
  {
    index: 3,
    email: 'owner03@kostkita.id',
    name: 'Budi Santoso',
    phone: '6281270010003',
    planSlug: 'basic',
    subStatus: SubscriptionStatus.active,
    subDaysLeft: 150,
    hasPendingUpgrade: true,
    properties: [
      {
        name: 'Kost Cisitu Indah ITB',
        slug: 'kost-cisitu-indah-itb',
        type: PropertyType.putra,
        address: 'Jl. Cisitu Indah VI No. 9, Dago',
        province: 'Jawa Barat',
        city: 'Kota Bandung',
        district: 'Coblong',
        subdistrict: 'Dago',
        postalCode: '40135',
        latitude: -6.8805,
        longitude: 107.6112,
        basePrice: 1350000,
        roomCount: 5,
        description: 'Kost putra berhawa sejuk di Cisitu, hanya 7 menit jalan kaki ke gerbang belakang ITB.',
      },
    ],
  },
  {
    index: 4,
    email: 'owner04@kostkita.id',
    name: 'Ir. Hendri Wijaya',
    phone: '6281270010004',
    planSlug: 'pro',
    subStatus: SubscriptionStatus.active,
    subDaysLeft: 320,
    properties: [
      {
        name: 'Kost Kemang Urban Living',
        slug: 'kost-kemang-urban-living',
        type: PropertyType.campur,
        address: 'Jl. Kemang Timur Raya No. 31, Bangka',
        province: 'DKI Jakarta',
        city: 'Kota Jakarta Selatan',
        district: 'Mampang Prapatan',
        subdistrict: 'Bangka',
        postalCode: '12730',
        latitude: -6.2643,
        longitude: 106.8221,
        basePrice: 2400000,
        roomCount: 5,
        description: 'Hunian kost modern bergaya apartemen studio di area Kemang, cocok untuk pekerja SCBD dan profesional muda.',
      },
      {
        name: 'Kost Setiabudi Kuningan Suite',
        slug: 'kost-setiabudi-kuningan-suite',
        type: PropertyType.campur,
        address: 'Jl. Karet Pedurenan No. 19, Kuningan',
        province: 'DKI Jakarta',
        city: 'Kota Jakarta Selatan',
        district: 'Setiabudi',
        subdistrict: 'Karet Kuningan',
        postalCode: '12940',
        latitude: -6.2185,
        longitude: 106.8294,
        basePrice: 2750000,
        roomCount: 4,
        description: 'Kost premium walking distance ke perkantoran Mega Kuningan dan MRT Setiabudi Astra.',
      },
    ],
  },
  {
    index: 5,
    email: 'owner05@kostkita.id',
    name: 'Siti Aminah',
    phone: '6281270010005',
    planSlug: 'basic',
    subStatus: SubscriptionStatus.active,
    subDaysLeft: 95,
    properties: [
      {
        name: 'Kost Margonda Raya Asri',
        slug: 'kost-margonda-raya-asri',
        type: PropertyType.putri,
        address: 'Jl. Margonda Raya Gg. Kapuk No. 14, Pondok Cina',
        province: 'Jawa Barat',
        city: 'Kota Depok',
        district: 'Beji',
        subdistrict: 'Pondok Cina',
        postalCode: '16424',
        latitude: -6.3688,
        longitude: 106.8331,
        basePrice: 1250000,
        roomCount: 5,
        description: 'Kost putri strategis dekat Stasiun KRL Pondok Cina, Margo City, dan Universitas Indonesia.',
      },
    ],
  },
  {
    index: 6,
    email: 'owner06@kostkita.id',
    name: 'Drs. Eko Prasetyo',
    phone: '6281270010006',
    planSlug: 'pro',
    subStatus: SubscriptionStatus.active,
    subDaysLeft: 190,
    properties: [
      {
        name: 'Kost Keputih Smart ITS Surabaya',
        slug: 'kost-keputih-smart-its-surabaya',
        type: PropertyType.putra,
        address: 'Jl. Keputih Tegal Timur No. 22, Sukolilo',
        province: 'Jawa Timur',
        city: 'Kota Surabaya',
        district: 'Sukolilo',
        subdistrict: 'Keputih',
        postalCode: '60111',
        latitude: -7.2874,
        longitude: 112.8012,
        basePrice: 1150000,
        roomCount: 5,
        description: 'Kost putra bersih dan terawat hanya 4 menit dari Kampus ITS Sukolilo dan Pakuwon City Mall.',
      },
      {
        name: 'Kost Dharmawangsa Unair Residence',
        slug: 'kost-dharmawangsa-unair-residence',
        type: PropertyType.putri,
        address: 'Jl. Dharmawangsa Dalam No. 10, Gubeng',
        province: 'Jawa Timur',
        city: 'Kota Surabaya',
        district: 'Gubeng',
        subdistrict: 'Airlangga',
        postalCode: '60286',
        latitude: -7.2721,
        longitude: 112.7584,
        basePrice: 1450000,
        roomCount: 4,
        description: 'Kost putri eksklusif dekat Kampus B & C Universitas Airlangga serta RSUD Dr. Soetomo.',
      },
    ],
  },
  {
    index: 7,
    email: 'owner07@kostkita.id',
    name: 'Wahyu Hidayat',
    phone: '6281270010007',
    planSlug: 'basic',
    subStatus: SubscriptionStatus.active,
    subDaysLeft: 60,
    properties: [
      {
        name: 'Kost Soekarno Hatta UB Malang',
        slug: 'kost-soekarno-hatta-ub-malang',
        type: PropertyType.campur,
        address: 'Jl. Soekarno Hatta Indah Blok C No. 7, Lowokwaru',
        province: 'Jawa Timur',
        city: 'Kota Malang',
        district: 'Lowokwaru',
        subdistrict: 'Mojolangu',
        postalCode: '65142',
        latitude: -7.9415,
        longitude: 112.6178,
        basePrice: 1100000,
        roomCount: 5,
        description: 'Kost nyaman berudara sejuk dekat Universitas Brawijaya, Polinema, dan pusat kuliner Suhat Malang.',
      },
    ],
  },
  {
    index: 8,
    email: 'owner08@kostkita.id',
    name: 'Lina Kusumawati',
    phone: '6281270010008',
    planSlug: 'basic',
    subStatus: SubscriptionStatus.expiring_soon,
    subDaysLeft: 5,
    hasPendingUpgrade: true,
    properties: [
      {
        name: 'Kost Tembalang Hill UNDIP',
        slug: 'kost-tembalang-hill-undip',
        type: PropertyType.putri,
        address: 'Jl. Sirojudin No. 45, Tembalang',
        province: 'Jawa Tengah',
        city: 'Kota Semarang',
        district: 'Tembalang',
        subdistrict: 'Tembalang',
        postalCode: '50275',
        latitude: -7.0548,
        longitude: 110.4332,
        basePrice: 1200000,
        roomCount: 5,
        description: 'Kost putri favorit mahasiswi UNDIP Tembalang, bebas banjir, dekat Indomaret dan laundry.',
      },
    ],
  },
  {
    index: 9,
    email: 'owner09@kostkita.id',
    name: 'Taufik Siregar',
    phone: '6281270010009',
    planSlug: 'basic',
    subStatus: SubscriptionStatus.active,
    subDaysLeft: 120,
    properties: [
      {
        name: 'Kost Dr. Mansyur USU Medan',
        slug: 'kost-dr-mansyur-usu-medan',
        type: PropertyType.campur,
        address: 'Jl. Dr. Mansyur Gg. Sehat No. 16, Padang Bulan',
        province: 'Sumatera Utara',
        city: 'Kota Medan',
        district: 'Medan Baru',
        subdistrict: 'Padang Bulan',
        postalCode: '20155',
        latitude: 3.5654,
        longitude: 98.6512,
        basePrice: 1050000,
        roomCount: 5,
        description: 'Kost strategis hanya 3 menit dari Pintu 1 USU Medan, dilengkapi AC, WiFi, dan parkir luas.',
      },
    ],
  },
  {
    index: 10,
    email: 'owner10@kostkita.id',
    name: 'Andi Muh. Yusuf',
    phone: '6281270010010',
    planSlug: 'pro',
    subStatus: SubscriptionStatus.active,
    subDaysLeft: 245,
    properties: [
      {
        name: 'Kost Tamalanrea UNHAS Makassar',
        slug: 'kost-tamalanrea-unhas-makassar',
        type: PropertyType.putra,
        address: 'Jl. Perintis Kemerdekaan KM 10 No. 28',
        province: 'Sulawesi Selatan',
        city: 'Kota Makassar',
        district: 'Tamalanrea',
        subdistrict: 'Tamalanrea Indah',
        postalCode: '90245',
        latitude: -5.1342,
        longitude: 119.4881,
        basePrice: 1000000,
        roomCount: 5,
        description: 'Kost putra rapi dan aman dekat gerbang utama Universitas Hasanuddin dan RS Wahidin.',
      },
      {
        name: 'Kost Panakkukang Business Stay',
        slug: 'kost-panakkukang-business-stay',
        type: PropertyType.campur,
        address: 'Jl. Boulevard Panakkukang Blok F No. 5',
        province: 'Sulawesi Selatan',
        city: 'Kota Makassar',
        district: 'Panakkukang',
        subdistrict: 'Masale',
        postalCode: '90231',
        latitude: -5.1589,
        longitude: 119.4465,
        basePrice: 1650000,
        roomCount: 4,
        description: 'Kost eksekutif di jantung bisnis Panakkukang, selangkah ke Mall Panakkukang.',
      },
    ],
  },
  {
    index: 11,
    email: 'owner11@kostkita.id',
    name: 'Ni Made Ayu Lestari',
    phone: '6281270010011',
    planSlug: 'pro',
    subStatus: SubscriptionStatus.active,
    subDaysLeft: 300,
    properties: [
      {
        name: 'Kost Renon Tropical Bali',
        slug: 'kost-renon-tropical-bali',
        type: PropertyType.campur,
        address: 'Jl. Tukad Yeh Aya No. 64, Renon',
        province: 'Bali',
        city: 'Kota Denpasar',
        district: 'Denpasar Selatan',
        subdistrict: 'Renon',
        postalCode: '80226',
        latitude: -8.6789,
        longitude: 115.2356,
        basePrice: 1850000,
        roomCount: 5,
        description: 'Kost modern bernuansa tropis Bali di kawasan elit Renon, 10 menit ke Pantai Sanur dan Lapangan Puputan.',
      },
    ],
  },
  {
    index: 12,
    email: 'owner12@kostkita.id',
    name: 'Dedi Kurniawan',
    phone: '6281270010012',
    planSlug: 'basic',
    subStatus: SubscriptionStatus.active,
    subDaysLeft: 80,
    properties: [
      {
        name: 'Kost Summarecon Bekasi Nyaman',
        slug: 'kost-summarecon-bekasi-nyaman',
        type: PropertyType.campur,
        address: 'Jl. Perjuangan No. 77, Marga Mulya',
        province: 'Jawa Barat',
        city: 'Kota Bekasi',
        district: 'Bekasi Utara',
        subdistrict: 'Marga Mulya',
        postalCode: '17142',
        latitude: -6.2241,
        longitude: 107.0015,
        basePrice: 1300000,
        roomCount: 5,
        description: 'Kost bersih dan strategis dekat Stasiun Bekasi dan Summarecon Mall Bekasi, ideal untuk komuter Jakarta.',
      },
    ],
  },
  {
    index: 13,
    email: 'owner13@kostkita.id',
    name: 'Stephanie Tanuwijaya',
    phone: '6281270010013',
    planSlug: 'pro',
    subStatus: SubscriptionStatus.active,
    subDaysLeft: 340,
    properties: [
      {
        name: 'Kost BSD City Smart Living',
        slug: 'kost-bsd-city-smart-living',
        type: PropertyType.campur,
        address: 'Jl. Pahlawan Seribu Blok D No. 11, Lengkong Gudang',
        province: 'Banten',
        city: 'Kota Tangerang Selatan',
        district: 'Serpong',
        subdistrict: 'Lengkong Gudang',
        postalCode: '15321',
        latitude: -6.2981,
        longitude: 106.6662,
        basePrice: 1950000,
        roomCount: 5,
        description: 'Kost modern dengan smart lock di kawasan BSD City, dekat Prasetya Mulya, AEON Mall, dan The Breeze.',
      },
    ],
  },
  {
    index: 14,
    email: 'owner14@kostkita.id',
    name: 'H. Dadang Supriatna',
    phone: '6281270010014',
    planSlug: 'basic',
    subStatus: SubscriptionStatus.active,
    subDaysLeft: 110,
    properties: [
      {
        name: 'Kost Babakan Dramaga IPB Bogor',
        slug: 'kost-babakan-dramaga-ipb-bogor',
        type: PropertyType.putri,
        address: 'Jl. Babakan Raya No. 33, Dramaga',
        province: 'Jawa Barat',
        city: 'Kabupaten Bogor',
        district: 'Dramaga',
        subdistrict: 'Babakan',
        postalCode: '16680',
        latitude: -6.5612,
        longitude: 106.7318,
        basePrice: 950000,
        roomCount: 5,
        description: 'Kost putri asri dan hemat listrik dekat gerbang utama IPB Dramaga Bogor.',
      },
    ],
  },
  {
    index: 15,
    email: 'owner15@kostkita.id',
    name: 'Sri Mulyani Rahayu',
    phone: '6281270010015',
    planSlug: 'trial',
    subStatus: SubscriptionStatus.trial,
    subDaysLeft: 22,
    properties: [
      {
        name: 'Kost Kentingan UNS Solo',
        slug: 'kost-kentingan-uns-solo',
        type: PropertyType.putri,
        address: 'Jl. Ir. Sutami Gg. Mawar No. 6, Jebres',
        province: 'Jawa Tengah',
        city: 'Kota Surakarta',
        district: 'Jebres',
        subdistrict: 'Jebres',
        postalCode: '57126',
        latitude: -7.5582,
        longitude: 110.8567,
        basePrice: 900000,
        roomCount: 4,
        description: 'Kost putri ramah mahasiswa di belakang kampus UNS Kentingan Solo, bersih dan aman.',
      },
    ],
  },
  {
    index: 16,
    email: 'owner16@kostkita.id',
    name: 'M. Ridwan Hakim',
    phone: '6281270010016',
    planSlug: 'trial',
    subStatus: SubscriptionStatus.trial,
    subDaysLeft: 18,
    hasPendingUpgrade: true,
    properties: [
      {
        name: 'Kost Bukit Besar UNSRI Palembang',
        slug: 'kost-bukit-besar-unsri-palembang',
        type: PropertyType.putra,
        address: 'Jl. Srijaya Negara No. 21, Bukit Lama',
        province: 'Sumatera Selatan',
        city: 'Kota Palembang',
        district: 'Ilir Barat I',
        subdistrict: 'Bukit Lama',
        postalCode: '30139',
        latitude: -2.9876,
        longitude: 104.7312,
        basePrice: 1000000,
        roomCount: 4,
        description: 'Kost putra strategis di Bukit Besar dekat Kampus UNSRI Palembang dan Politeknik Negeri Sriwijaya.',
      },
    ],
  },
  {
    index: 17,
    email: 'owner17@kostkita.id',
    name: 'Rina Oktaviani',
    phone: '6281270010017',
    planSlug: 'basic',
    subStatus: SubscriptionStatus.active,
    subDaysLeft: 75,
    properties: [
      {
        name: 'Kost Panam UNRI Pekanbaru',
        slug: 'kost-panam-unri-pekanbaru',
        type: PropertyType.putri,
        address: 'Jl. HR. Soebrantas KM 12.5 Gg. Melati No. 4',
        province: 'Riau',
        city: 'Kota Pekanbaru',
        district: 'Tampan',
        subdistrict: 'Simpang Baru',
        postalCode: '28293',
        latitude: 0.4648,
        longitude: 101.3842,
        basePrice: 1050000,
        roomCount: 5,
        description: 'Kost putri nyaman dekat Kampus Universitas Riau (UNRI) dan RS Awal Bros Panam.',
      },
    ],
  },
  {
    index: 18,
    email: 'owner18@kostkita.id',
    name: 'Hendra Gunawan Putra',
    phone: '6281270010018',
    planSlug: 'trial',
    subStatus: SubscriptionStatus.expiring_soon,
    subDaysLeft: 3,
    properties: [
      {
        name: 'Kost Ahmad Yani UNTAN Pontianak',
        slug: 'kost-ahmad-yani-untan-pontianak',
        type: PropertyType.campur,
        address: 'Jl. Prof. Dr. H. Hadari Nawawi No. 15, Bansir Laut',
        province: 'Kalimantan Barat',
        city: 'Kota Pontianak',
        district: 'Pontianak Tenggara',
        subdistrict: 'Bansir Laut',
        postalCode: '78124',
        latitude: -0.0568,
        longitude: 109.3489,
        basePrice: 1100000,
        roomCount: 4,
        description: 'Kost modern dekat Universitas Tanjungpura dan Ayani Mega Mall Pontianak.',
      },
    ],
  },
  {
    index: 19,
    email: 'owner19@kostkita.id',
    name: 'Nurhayati Mansur',
    phone: '6281270010019',
    planSlug: 'basic',
    subStatus: SubscriptionStatus.active,
    subDaysLeft: 140,
    properties: [
      {
        name: 'Kost Gunung Kelua UNMUL Samarinda',
        slug: 'kost-gunung-kelua-unmul-samarinda',
        type: PropertyType.putri,
        address: 'Jl. M. Yamin Gg. Keluarga No. 9, Gunung Kelua',
        province: 'Kalimantan Timur',
        city: 'Kota Samarinda',
        district: 'Samarinda Ulu',
        subdistrict: 'Gunung Kelua',
        postalCode: '75123',
        latitude: -0.4712,
        longitude: 117.1524,
        basePrice: 1200000,
        roomCount: 5,
        description: 'Kost putri bersih dengan kamar mandi dalam dekat Kampus Universitas Mulawarman.',
      },
    ],
  },
  {
    index: 20,
    email: 'owner20@kostkita.id',
    name: 'Agus Setiawan',
    phone: '6281270010020',
    planSlug: 'pro',
    subStatus: SubscriptionStatus.active,
    subDaysLeft: 350,
    properties: [
      {
        name: 'Kost Balikpapan Baru Executive',
        slug: 'kost-balikpapan-baru-executive',
        type: PropertyType.campur,
        address: 'Jl. MT Haryono Komplek Balikpapan Baru Blok B No. 14',
        province: 'Kalimantan Timur',
        city: 'Kota Balikpapan',
        district: 'Balikpapan Selatan',
        subdistrict: 'Damai',
        postalCode: '76114',
        latitude: -1.2421,
        longitude: 116.8673,
        basePrice: 1800000,
        roomCount: 5,
        description: 'Kost eksklusif di kawasan Balikpapan Baru, akses cepat ke Bandara SAMS Sepinggan dan pusat bisnis.',
      },
      {
        name: 'Kost Sudirman Sea View Balikpapan',
        slug: 'kost-sudirman-seaview-balikpapan',
        type: PropertyType.campur,
        address: 'Jl. Jenderal Sudirman No. 92, Klandasan Ilir',
        province: 'Kalimantan Timur',
        city: 'Kota Balikpapan',
        district: 'Balikpapan Kota',
        subdistrict: 'Klandasan Ilir',
        postalCode: '76113',
        latitude: -1.2756,
        longitude: 116.8421,
        basePrice: 2100000,
        roomCount: 4,
        description: 'Kost premium dengan pemandangan laut di kawasan Sudirman Balikpapan, fasilitas lengkap standar hotel.',
      },
    ],
  },
];

// ─────────────────────────────────────────────
// MAIN SEEDER
// ─────────────────────────────────────────────

async function seedOwners() {
  console.log('🚀 Mulai seeding 20 akun Owner lengkap dengan seluruh datanya...\n');

  const passwordHash = await bcrypt.hash('Owner@KostKita2026!', 10);

  // Pastikan Super Admin & Plans sudah ada
  const admin = await prisma.user.findFirst({ where: { role: 'super_admin' } });
  const plans = await prisma.subscriptionPlan.findMany();
  const planMap = new Map(plans.map((p) => [p.slug, p]));

  if (!planMap.get('trial') || !planMap.get('basic') || !planMap.get('pro')) {
    throw new Error(
      'Subscription plans (trial, basic, pro) belum ada. Jalankan "npm run db:seed" terlebih dahulu!'
    );
  }

  let tenantNameCursor = 0;
  let totalProperties = 0;
  let totalRooms = 0;
  let totalTenants = 0;
  let totalPayments = 0;

  for (const cfg of OWNERS_CONFIG) {
    const plan = planMap.get(cfg.planSlug)!;

    // 1. Create / Find Owner User
    let owner = await prisma.user.findUnique({ where: { email: cfg.email } });
    if (owner) {
      console.log(`⏭️  [${String(cfg.index).padStart(2, '0')}/20] Owner sudah ada: ${cfg.email} (skip)`);
      continue;
    }

    owner = await prisma.user.create({
      data: {
        email: cfg.email,
        passwordHash,
        name: cfg.name,
        phone: cfg.phone,
        role: 'owner',
        status: 'active',
        emailVerifiedAt: monthsAgo(4, 5),
        lastLoginAt: daysFromNow(-1 * (cfg.index % 5)),
      },
    });

    // 2. Subscription Payment & Active Subscription
    let activatedPaymentId: string | null = null;
    if (cfg.planSlug !== 'trial') {
      const refNo = `PAY-SEED-OWN${String(cfg.index).padStart(2, '0')}-001`;
      const subPayment = await prisma.subscriptionPayment.create({
        data: {
          ownerId: owner.id,
          planId: plan.id,
          referenceNo: refNo,
          amount: plan.price,
          paymentDate: monthsAgo(2, 10),
          paymentMethod: cfg.index % 2 === 0 ? 'Transfer Bank BCA' : 'QRIS KostKita',
          proofUrl: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=600&q=80',
          notes: `Pembayaran paket ${plan.name} oleh ${cfg.name}`,
          status: PaymentStatus.approved,
          reviewedBy: admin?.id ?? null,
          reviewedAt: monthsAgo(2, 11),
        },
      });
      activatedPaymentId = subPayment.id;
    }

    await prisma.subscription.create({
      data: {
        ownerId: owner.id,
        planId: plan.id,
        status: cfg.subStatus,
        startsAt: monthsAgo(2, 11),
        endsAt: daysFromNow(cfg.subDaysLeft),
        activatedByPaymentId: activatedPaymentId,
      },
    });

    // Optional pending upgrade payment for Admin moderation testing
    if (cfg.hasPendingUpgrade) {
      const proPlan = planMap.get('pro')!;
      await prisma.subscriptionPayment.create({
        data: {
          ownerId: owner.id,
          planId: proPlan.id,
          referenceNo: `PAY-SEED-OWN${String(cfg.index).padStart(2, '0')}-PENDING`,
          amount: proPlan.price,
          paymentDate: new Date(),
          paymentMethod: 'Transfer Bank BCA',
          proofUrl: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=600&q=80',
          notes: 'Pengajuan upgrade ke paket Pro',
          status: PaymentStatus.pending,
        },
      });
    }

    // 3. Properties, Photos, Facilities, Rules, Rooms, Tenants, Stays, TenantPayments
    const ownerPropertyIds: string[] = [];

    for (let pIdx = 0; pIdx < cfg.properties.length; pIdx++) {
      const pCfg = cfg.properties[pIdx];
      const existingProp = await prisma.property.findUnique({ where: { slug: pCfg.slug } });
      if (existingProp) continue;

      // Pick 3 photos rotated from pool
      const propPhotos = [0, 1, 2].map((offset) => ({
        url: PROPERTY_PHOTOS[(cfg.index + pIdx + offset) % PROPERTY_PHOTOS.length],
        order: offset,
        isPrimary: offset === 0,
      }));

      // Pick 8 facilities
      const propFacilities = PROPERTY_FACILITIES_POOL.slice(0, 8 + (cfg.index % 4)).map((f) => ({
        facilityName: f,
      }));

      // Pick 5 rules
      const propRules = PROPERTY_RULES_POOL.slice(0, 5).map((r) => ({ rule: r }));

      const property = await prisma.property.create({
        data: {
          ownerId: owner.id,
          name: pCfg.name,
          slug: pCfg.slug,
          description: pCfg.description,
          type: pCfg.type,
          whatsapp: cfg.phone,
          address: pCfg.address,
          province: pCfg.province,
          city: pCfg.city,
          district: pCfg.district,
          subdistrict: pCfg.subdistrict,
          postalCode: pCfg.postalCode,
          latitude: pCfg.latitude,
          longitude: pCfg.longitude,
          priceStart: pCfg.basePrice,
          status: PropertyStatus.active,
          photos: { create: propPhotos },
          facilities: { create: propFacilities },
          rules: { create: propRules },
        },
      });

      ownerPropertyIds.push(property.id);
      totalProperties++;

      // Create Rooms for this property
      const roomTypes = [
        { type: 'Standar', label: 'Standar AC', extra: 0, facs: ['AC', 'KM Dalam', 'WiFi', 'Kasur Single', 'Lemari'] },
        { type: 'Superior', label: 'Superior Queen', extra: 200000, facs: ['AC', 'KM Dalam', 'Water Heater', 'WiFi', 'Kasur Queen', 'Meja Belajar'] },
        { type: 'Deluxe', label: 'Deluxe Balkon', extra: 400000, facs: ['AC', 'KM Dalam', 'Water Heater', 'Balkon', 'WiFi', 'Smart TV'] },
        { type: 'Executive', label: 'Executive Studio', extra: 650000, facs: ['AC Inverter', 'KM Dalam', 'Water Heater', 'Smart TV', 'Kulkas Mini', 'WiFi'] },
        { type: 'Standar', label: 'Standar Hemat', extra: 50000, facs: ['AC', 'KM Dalam', 'WiFi', 'Meja Belajar'] },
      ];

      for (let rIdx = 0; rIdx < pCfg.roomCount; rIdx++) {
        const floor = Math.floor(rIdx / 3) + 1;
        const unit = (rIdx % 3) + 1;
        const roomNumber = `${floor}0${unit}`;
        const rt = roomTypes[rIdx % roomTypes.length];
        const roomPrice = pCfg.basePrice + rt.extra;

        // Pattern: ~60% occupied, ~30% available, occasional maintenance
        let roomStatus: RoomStatus = RoomStatus.available;
        if (rIdx < Math.ceil(pCfg.roomCount * 0.6)) {
          roomStatus = RoomStatus.occupied;
        } else if (rIdx === pCfg.roomCount - 1 && cfg.index % 4 === 0) {
          roomStatus = RoomStatus.maintenance;
        }

        const room = await prisma.room.create({
          data: {
            propertyId: property.id,
            ownerId: owner.id,
            roomNumber,
            name: `Kamar ${rt.label} ${roomNumber}`,
            type: rt.type,
            price: roomPrice,
            description: `Kamar tipe ${rt.type} nomor ${roomNumber} di lantai ${floor}, sirkulasi udara baik, bersih, siap huni.`,
            status: roomStatus,
            facilities: {
              create: rt.facs.map((f) => ({ facilityName: f })),
            },
            photos: {
              create: [
                {
                  url: ROOM_PHOTOS[(cfg.index + rIdx) % ROOM_PHOTOS.length],
                  order: 0,
                  isPrimary: true,
                },
                {
                  url: ROOM_PHOTOS[(cfg.index + rIdx + 1) % ROOM_PHOTOS.length],
                  order: 1,
                  isPrimary: false,
                },
              ],
            },
          },
        });
        totalRooms++;

        // If occupied, create Tenant + Active TenantStay + 3 months TenantPayments
        if (roomStatus === RoomStatus.occupied) {
          const tenantName = TENANT_NAMES[tenantNameCursor % TENANT_NAMES.length];
          tenantNameCursor++;

          const tenant = await prisma.tenant.create({
            data: {
              ownerId: owner.id,
              name: tenantName,
              whatsapp: `62852${String(10000000 + cfg.index * 1000 + rIdx * 37).slice(-8)}`,
              notes: `Penghuni kamar ${roomNumber} - ${pCfg.name}`,
            },
          });
          totalTenants++;

          const checkIn = monthsAgo(3, 1);
          const stay = await prisma.tenantStay.create({
            data: {
              tenantId: tenant.id,
              roomId: room.id,
              ownerId: owner.id,
              checkInDate: checkIn,
              rentPrice: roomPrice,
              deposit: Math.round(roomPrice * 0.5),
              status: TenantStayStatus.active,
            },
          });

          // Create 3 monthly payments: 2 months ago (paid), 1 month ago (paid), current month (paid/pending/overdue)
          for (let m = 2; m >= 0; m--) {
            const pStart = monthsAgo(m, 1);
            const pEnd = endOfMonth(pStart);

            let payStatus: TenantPaymentStatus = TenantPaymentStatus.paid;
            let payDate: Date | null = new Date(pStart.getFullYear(), pStart.getMonth(), 3);
            let payMethod: TenantPaymentMethod | null =
              (rIdx + m) % 2 === 0 ? TenantPaymentMethod.bank_transfer : TenantPaymentMethod.cash;

            if (m === 0) {
              if (rIdx % 3 === 1) {
                payStatus = TenantPaymentStatus.pending;
                payDate = null;
                payMethod = null;
              } else if (rIdx % 3 === 2) {
                payStatus = TenantPaymentStatus.overdue;
                payDate = null;
                payMethod = null;
              }
            }

            await prisma.tenantPayment.create({
              data: {
                ownerId: owner.id,
                tenantStayId: stay.id,
                periodStart: pStart,
                periodEnd: pEnd,
                amount: roomPrice,
                paymentDate: payDate,
                paymentMethod: payMethod,
                status: payStatus,
                notes:
                  payStatus === TenantPaymentStatus.paid
                    ? 'Pembayaran sewa bulanan lunas'
                    : payStatus === TenantPaymentStatus.pending
                    ? 'Menunggu pembayaran bulan berjalan'
                    : 'Melewati jatuh tempo pembayaran',
              },
            });
            totalPayments++;
          }
        }
      }

      // Add 1 historical (ended) tenant stay on the first room of first property (respecting trial limit)
      if (pIdx === 0 && cfg.planSlug !== 'trial') {
        const firstRoom = await prisma.room.findFirst({
          where: { propertyId: property.id },
          orderBy: { roomNumber: 'asc' },
        });
        if (firstRoom) {
          const pastTenantName = `${TENANT_NAMES[tenantNameCursor % TENANT_NAMES.length]} (Alumni)`;
          tenantNameCursor++;

          const pastTenant = await prisma.tenant.create({
            data: {
              ownerId: owner.id,
              name: pastTenantName,
              whatsapp: `62853${String(20000000 + cfg.index * 500).slice(-8)}`,
              notes: 'Mantan penghuni (sudah check-out dengan baik)',
            },
          });
          totalTenants++;

          const pastStay = await prisma.tenantStay.create({
            data: {
              tenantId: pastTenant.id,
              roomId: firstRoom.id,
              ownerId: owner.id,
              checkInDate: monthsAgo(6, 1),
              checkOutDate: monthsAgo(4, 28),
              rentPrice: firstRoom.price,
              deposit: 500000,
              status: TenantStayStatus.ended,
            },
          });

          const pStart = monthsAgo(5, 1);
          await prisma.tenantPayment.create({
            data: {
              ownerId: owner.id,
              tenantStayId: pastStay.id,
              periodStart: pStart,
              periodEnd: endOfMonth(pStart),
              amount: firstRoom.price,
              paymentDate: new Date(pStart.getFullYear(), pStart.getMonth(), 2),
              paymentMethod: TenantPaymentMethod.bank_transfer,
              status: TenantPaymentStatus.paid,
              notes: 'Pembayaran sewa bulan terakhir sebelum check-out',
            },
          });
          totalPayments++;
        }
      }
    }

    // 4. Notifications for Owner
    const notificationsData: {
      userId: string;
      type: NotificationType;
      title: string;
      message: string;
      readAt: Date | null;
    }[] = [
      {
        userId: owner.id,
        type: NotificationType.system_announcement,
        title: 'Selamat Datang di KostKita!',
        message: `Halo ${cfg.name}, akun owner Anda sudah aktif. Kelola properti, kamar, dan tagihan penghuni dengan mudah.`,
        readAt: monthsAgo(1, 15),
      },
    ];

    if (cfg.planSlug !== 'trial') {
      notificationsData.push({
        userId: owner.id,
        type: NotificationType.payment_approved,
        title: `Langganan Paket ${plan.name} Aktif`,
        message: `Pembayaran paket ${plan.name} Anda telah diverifikasi. Masa aktif berlaku hingga ${daysFromNow(cfg.subDaysLeft).toLocaleDateString('id-ID')}.`,
        readAt: null,
      });
    }

    if (cfg.subStatus === SubscriptionStatus.expiring_soon) {
      notificationsData.push({
        userId: owner.id,
        type: NotificationType.subscription_expiring,
        title: 'Masa Langganan Segera Berakhir',
        message: `Langganan Anda akan berakhir dalam ${cfg.subDaysLeft} hari. Segera lakukan perpanjangan agar properti tetap tampil di portal publik.`,
        readAt: null,
      });
    }

    await prisma.notification.createMany({ data: notificationsData });

    // 5. Sample Listing Report on every 5th owner's first property (for Admin dashboard)
    if (cfg.index % 5 === 0 && ownerPropertyIds[0]) {
      await prisma.listingReport.create({
        data: {
          propertyId: ownerPropertyIds[0],
          reason: cfg.index % 10 === 0 ? ListingReportReason.info_not_match : ListingReportReason.not_available,
          description: 'Mohon update ketersediaan kamar terbaru pada halaman listing.',
          reporterName: 'Calon Penghuni',
          reporterContact: '6281999888777',
          status: cfg.index === 20 ? ListingReportStatus.pending : ListingReportStatus.resolved,
          reviewedBy: cfg.index === 20 ? null : admin?.id ?? null,
          reviewedAt: cfg.index === 20 ? null : daysFromNow(-2),
        },
      });
    }

    // 6. Sample Audit Log
    await prisma.auditLog.create({
      data: {
        actorId: owner.id,
        actorRole: 'owner',
        action: 'property.created',
        entityType: 'property',
        entityId: ownerPropertyIds[0] ?? null,
        newValue: { ownerEmail: cfg.email, plan: cfg.planSlug, propertiesCount: ownerPropertyIds.length },
        ipAddress: '127.0.0.1',
        userAgent: 'KostKita-Seeder/1.0',
      },
    });

    console.log(
      `✅ [${String(cfg.index).padStart(2, '0')}/20] ${cfg.name} (${cfg.email}) — Plan: ${plan.name.toUpperCase()}, Properti: ${ownerPropertyIds.length}`
    );
  }

  console.log('\n─────────────────────────────────────────────');
  console.log('🎉 Seeding 20 akun Owner selesai!');
  console.log(`   Total Properti baru   : ${totalProperties}`);
  console.log(`   Total Kamar baru      : ${totalRooms}`);
  console.log(`   Total Penghuni baru   : ${totalTenants}`);
  console.log(`   Total Tagihan/Bayar   : ${totalPayments}`);
  console.log('');
  console.log('🔑 Kredensial Login Owner (semua 20 akun):');
  console.log('   Email   : owner01@kostkita.id s/d owner20@kostkita.id');
  console.log('   Password: Owner@KostKita2026!');
  console.log('─────────────────────────────────────────────');
}

seedOwners()
  .catch((e) => {
    console.error('❌ Seeding owners gagal:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
