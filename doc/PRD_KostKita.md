# Product Requirements Document (PRD)

# KostKita — SaaS Platform Manajemen Kost & Kost Discovery

| Field | Detail |
|---|---|
| Product | KostKita |
| Document | Product Requirements Document |
| Version | 1.0 |
| Status | Draft / MVP |
| Date | 2 October 2026 |
| Product Type | SaaS Multi-Tenant + Public Kost Discovery |
| Primary Market | Indonesia |
| Primary Language | Bahasa Indonesia |

---

## 1. Product Overview

KostKita adalah aplikasi SaaS modern untuk membantu pemilik kost mengelola bisnis kost secara digital sekaligus menyediakan platform public untuk calon penyewa mencari kost berdasarkan lokasi, harga, tipe, fasilitas, dan ketersediaan.

KostKita memiliki tiga role utama:

1. **Super Admin** — mengelola platform, owner, paket subscription, pembayaran subscription, listing, dan konfigurasi sistem.
2. **Owner Kost** — mengelola bisnis kost, properti, kamar, penghuni, pembayaran, laporan, dan subscription.
3. **Penyewa / Public User** — tidak membutuhkan akun; dapat mencari kost, melihat detail kost, dan menghubungi owner melalui WhatsApp.

KostKita menggunakan model **multi-tenant**, sehingga data setiap Owner harus terisolasi dan tidak dapat diakses oleh Owner lain.

---

# 2. Product Goals

## 2.1 Primary Goals

- Membantu Owner mengelola bisnis kost secara terpusat.
- Memberikan pengalaman pencarian kost yang mudah bagi calon penyewa.
- Menyediakan pencarian kost berbasis lokasi.
- Memudahkan calon penyewa menghubungi Owner melalui WhatsApp.
- Menyediakan model SaaS dengan subscription yang dapat dikonfigurasi oleh Super Admin.
- Menyediakan sistem verifikasi pembayaran subscription secara manual.
- Menjaga isolasi dan keamanan data antar Owner.
- Menyediakan fondasi yang dapat dikembangkan menjadi platform property management yang lebih lengkap.

## 2.2 Secondary Goals

- Menyediakan laporan operasional sederhana.
- Memberikan insight occupancy dan pemasukan kepada Owner.
- Menyediakan moderation dan reporting untuk public listing.
- Menyediakan audit trail untuk aktivitas penting.
- Menyiapkan arsitektur agar fitur Staff dapat ditambahkan di masa depan.

---

# 3. Non-Goals MVP

Fitur berikut tidak menjadi prioritas MVP:

- Staff / employee role.
- Online payment gateway.
- Automatic bank verification.
- Booking atau reservation system.
- In-app chat antara penyewa dan Owner.
- Marketplace transaksi sewa.
- Accounting penuh.
- Payroll.
- Inventory management.
- Maintenance ticketing kompleks.
- Mobile application native untuk Owner.
- Mobile application native untuk Penyewa.
- Automated WhatsApp API.
- KYC/KTP verification Owner, kecuali diwajibkan oleh kebutuhan bisnis atau regulasi.
- Dynamic pricing.
- Review/rating kompleks.

---

# 4. User Roles

## 4.1 Super Admin

Super Admin adalah pengelola platform KostKita.

### Responsibilities

- Mengelola Owner.
- Mengelola paket subscription.
- Mengelola konfigurasi benefit dan limit paket.
- Memverifikasi pembayaran subscription.
- Mengelola listing.
- Melakukan suspend Owner.
- Melakukan suspend listing.
- Melihat laporan platform.
- Melihat audit log.
- Mengelola konfigurasi sistem.

---

## 4.2 Owner Kost

Owner adalah pengguna utama SaaS.

### Responsibilities

- Register dan login.
- Mengelola profil.
- Mengelola subscription.
- Mengelola kost.
- Mengelola kamar.
- Mengelola penghuni.
- Mencatat pembayaran penghuni.
- Melihat laporan.
- Mengelola listing public.
- Mengunggah bukti pembayaran subscription.

---

## 4.3 Penyewa / Public User

Public User tidak membutuhkan akun.

### Responsibilities

- Mencari kost.
- Menggunakan lokasi perangkat atau lokasi manual.
- Melihat kost terdekat.
- Memfilter kost.
- Melihat detail kost.
- Melihat kamar yang tersedia.
- Menghubungi Owner melalui WhatsApp.
- Melaporkan listing yang bermasalah.

---

# 5. Subscription Model

KostKita menggunakan tiga paket awal:

1. Trial
2. Basic
3. Pro

Semua konfigurasi paket dikelola oleh Super Admin.

## 5.1 Package Configuration

Super Admin dapat mengatur:

- Nama paket.
- Harga.
- Durasi.
- Deskripsi.
- Benefit.
- Feature availability.
- Limit jumlah kost.
- Limit jumlah kamar.
- Limit jumlah penghuni.
- Status aktif/nonaktif.
- Urutan tampilan paket.
- Paket default registrasi.

Konfigurasi tidak boleh di-hard-code pada aplikasi.

---

# 6. Trial Subscription

Ketika Owner melakukan registrasi:

```text
Register
  ↓
Account Created
  ↓
Trial Automatically Activated
  ↓
Owner Dashboard
```

Trial diberikan otomatis tanpa pembayaran.

Durasi default MVP:

**30 hari**

Durasi tetap dapat diubah oleh Super Admin.

---

# 7. Paid Subscription

Basic dan Pro merupakan subscription berbayar.

Flow:

```text
Owner
  ↓
Menu Subscription
  ↓
Pilih Paket
  ↓
Lihat Harga & Instruksi Pembayaran
  ↓
Transfer Manual
  ↓
Upload Bukti Pembayaran
  ↓
Menunggu Konfirmasi
  ↓
Super Admin Review
  ↓
Approved / Rejected
```

---

# 8. Manual Payment

MVP tidak menggunakan Xendit atau payment gateway.

Owner melakukan pembayaran secara manual berdasarkan instruksi yang diberikan sistem.

## 8.1 Payment Proof

Owner dapat mengirim:

- Paket yang dipilih.
- Nominal pembayaran.
- Tanggal pembayaran.
- Metode pembayaran.
- Bukti pembayaran.
- Catatan tambahan.

## 8.2 Payment Verification

Super Admin dapat:

- Melihat detail pembayaran.
- Melihat bukti pembayaran.
- Approve.
- Reject.
- Memberikan alasan rejection.

## 8.3 Payment Status

Status minimal:

- Pending / Menunggu Konfirmasi.
- Approved / Disetujui.
- Rejected / Ditolak.
- Expired.
- Cancelled.

---

# 9. Subscription Lifecycle

Lifecycle subscription:

```text
TRIAL / ACTIVE
      ↓
EXPIRING SOON
      ↓
EXPIRED
```

## 9.1 Reminder

Owner menerima notification:

- H-3 sebelum expiration.
- H-1 sebelum expiration.
- Saat subscription expired.

## 9.2 Expired Subscription

Ketika subscription expired:

- Listing menjadi inactive.
- Listing tidak muncul pada hasil pencarian aktif.
- Listing tidak muncul sebagai kost aktif pada map discovery.
- Data kost tetap disimpan.
- Owner tetap dapat login.
- Owner dapat melakukan upgrade/renewal.

## 9.3 Grace Period

Untuk MVP, tidak diperlukan grace period penuh yang mempertahankan listing aktif.

Setelah tanggal expiration terlewati:

```text
Subscription → EXPIRED
Listing → INACTIVE
```

Owner masih memiliki akses terbatas ke dashboard untuk mengurus renewal.

---

# 10. Subscription Upgrade

Owner dapat memilih:

```text
Trial → Basic
Trial → Pro
Basic → Pro
```

Flow:

```text
Choose Plan
  ↓
Payment Instructions
  ↓
Manual Transfer
  ↓
Upload Proof
  ↓
Admin Verification
  ↓
Approved
  ↓
New Subscription Activated
```

Untuk MVP, subscription baru mulai dihitung sejak pembayaran disetujui.

---

# 11. Owner Management

Super Admin dapat:

- Melihat seluruh Owner.
- Search Owner.
- Filter Owner.
- Melihat detail Owner.
- Melihat subscription.
- Melihat kost Owner.
- Melihat status akun.
- Suspend Owner.
- Activate Owner.
- Melihat aktivitas Owner.

## 11.1 Owner Status

- Active.
- Suspended.
- Deactivated.

Ketika Owner suspended:

- Owner tidak dapat menggunakan fungsi dashboard normal.
- Listing Owner menjadi tidak aktif.
- Alasan suspend wajib dicatat.
- Aktivitas dicatat dalam audit log.

---

# 12. Property / Kost Management

Owner dapat membuat satu atau beberapa kost sesuai limit paket.

## 12.1 Property Data

### Basic Information

- Nama kost.
- Deskripsi.
- Foto.
- Nomor WhatsApp Owner.
- Alamat.
- Provinsi.
- Kota/Kabupaten.
- Kecamatan.
- Kelurahan.
- Kode pos.
- Latitude.
- Longitude.

### Property Information

- Jenis kost.
- Fasilitas.
- Aturan kost.
- Harga mulai.
- Status listing.

## 12.2 Property Type

MVP:

- Putra.
- Putri.
- Campur.

---

# 13. Property Location

Lokasi merupakan fitur inti KostKita.

Owner tidak perlu memasukkan latitude dan longitude secara manual.

Flow:

```text
Input Address
  ↓
Map / Location Detection
  ↓
Marker
  ↓
Owner dapat mengoreksi posisi
  ↓
Save Location
```

Public user dapat menggunakan:

- Current device location.
- Manual location search.

KostKita tidak menampilkan koordinat presisi Owner sebagai data mentah kepada public.

---

# 14. Property Listing Status

Status listing:

- Draft.
- Active.
- Inactive.
- Suspended.

## 14.1 Listing Flow

```text
Create Property
  ↓
Draft
  ↓
Publish
  ↓
Active
```

Jika subscription expired:

```text
Active
  ↓
Subscription Expired
  ↓
Inactive
```

Jika Super Admin melakukan suspend:

```text
Active
  ↓
Suspended
```

---

# 15. Public Listing Rules

Listing hanya dapat muncul sebagai listing aktif apabila:

```text
Owner Account = Active
AND
Subscription = Active
AND
Property = Published
AND
Property ≠ Suspended
```

Jika kondisi tidak terpenuhi:

```text
Listing = Not Active
```

Listing inactive tidak muncul pada pencarian aktif dan map discovery.

Halaman detail dapat tetap tersedia apabila diperlukan untuk mempertahankan URL, tetapi harus menampilkan status:

> Kost ini sedang tidak aktif.

---

# 16. Room Management

Owner dapat mengelola kamar di dalam setiap kost.

## 16.1 Room Data

- Nomor kamar.
- Nama kamar, jika diperlukan.
- Tipe kamar.
- Harga sewa.
- Deskripsi.
- Foto.
- Fasilitas.
- Status.

## 16.2 Room Status

- Available.
- Occupied.
- Maintenance.

MVP tidak menggunakan reservation system.

---

# 17. Tenant / Penghuni Management

Owner dapat mengelola penghuni.

## 17.1 Tenant Data

- Nama.
- Nomor WhatsApp.
- Kamar.
- Tanggal masuk.
- Tanggal keluar.
- Harga sewa.
- Deposit, jika digunakan.
- Catatan.

Data penghuni bersifat private dan tidak boleh muncul pada public website.

---

# 18. Tenant Stay

Relasi penghuni dengan kamar sebaiknya menggunakan entitas masa tinggal/stay.

Contoh:

```text
Tenant
  ↓
Tenant Stay
  ↓
Room
  ↓
Property
```

Hal ini memungkinkan seorang tenant memiliki riwayat kamar tanpa kehilangan data historis.

---

# 19. Payment Management

MVP menggunakan pencatatan pembayaran manual untuk pembayaran penghuni.

Owner dapat mencatat:

- Tenant.
- Kamar.
- Periode.
- Nominal.
- Tanggal pembayaran.
- Metode pembayaran.
- Catatan.

## 19.1 Payment Method

- Cash.
- Bank Transfer.
- Other.

## 19.2 Payment Status

- Paid.
- Pending.
- Overdue.

MVP tidak melakukan transaksi pembayaran penghuni secara langsung.

---

# 20. Reports

Owner dapat melihat laporan sederhana:

### Revenue

- Total pemasukan.
- Pemasukan bulan berjalan.
- Pemasukan berdasarkan periode.

### Occupancy

- Total kamar.
- Kamar terisi.
- Kamar tersedia.
- Occupancy rate.

### Payment

- Paid.
- Pending.
- Overdue.

---

# 21. Owner Dashboard

Dashboard harus memberikan overview bisnis secara cepat.

## 21.1 Main Metrics

- Total properties.
- Total rooms.
- Occupied rooms.
- Available rooms.
- Occupancy rate.
- Revenue.
- Unpaid payments.

## 21.2 Subscription Widget

Menampilkan:

- Paket aktif.
- Status.
- Tanggal mulai.
- Tanggal berakhir.
- Sisa hari.
- Tombol upgrade/renew.

## 21.3 Recent Activity

Menampilkan aktivitas terbaru:

- Tenant ditambahkan.
- Pembayaran dicatat.
- Property diperbarui.
- Room dibuat.
- Subscription berubah.

---

# 22. Public Website

Public website adalah bagian discovery KostKita.

## 22.1 Public Pages

- Home.
- Search.
- Map Discovery.
- Property Detail.
- About.
- Help.
- Report Listing.
- Terms of Service.
- Privacy Policy.

Public website tidak membutuhkan login.

---

# 23. Search & Discovery

Public user dapat mencari berdasarkan:

- Lokasi.
- Jarak.
- Harga.
- Jenis kost.
- Fasilitas.
- Ketersediaan.

## 23.1 Location Search

Pilihan:

```text
Gunakan Lokasi Saya
atau
Cari Lokasi Manual
```

---

# 24. Map Discovery

Desktop menggunakan pola:

```text
┌──────────────────────┬────────────────────────┐
│ Property List        │ Map                    │
│                      │                        │
│ Kost A               │       Marker           │
│ Kost B               │            Marker      │
│ Kost C               │   Marker               │
│                      │                        │
└──────────────────────┴────────────────────────┘
```

Mobile dapat menggunakan:

```text
Map
↓
Nearby Properties
```

Map menjadi salah satu core experience KostKita.

---

# 25. Search Filters

Filter MVP:

### Location

- Kota.
- Kecamatan.
- Radius/jarak.

### Price

- Minimum.
- Maximum.

### Type

- Putra.
- Putri.
- Campur.

### Facilities

Contoh:

- WiFi.
- AC.
- Kamar mandi dalam.
- Parkir.
- Dapur.
- Laundry.

### Availability

- Available only.

---

# 26. Property Detail

Halaman detail menampilkan:

- Foto.
- Nama kost.
- Rating, jika fitur rating sudah diaktifkan.
- Harga mulai.
- Lokasi.
- Deskripsi.
- Fasilitas.
- Aturan.
- Kamar tersedia.
- Informasi lokasi.
- WhatsApp Owner.

CTA utama:

```text
Hubungi Pemilik via WhatsApp
```

---

# 27. WhatsApp Contact

KostKita tidak menyediakan in-app chat pada MVP.

Ketika public user menekan:

```text
Hubungi Pemilik via WhatsApp
```

sistem membuka WhatsApp dengan nomor Owner.

Pesan template:

> Halo, saya tertarik dengan [Nama Kost] yang saya lihat di KostKita. Apakah masih tersedia?

Pesan dapat dibuat dinamis berdasarkan property.

---

# 28. Listing Report

Public user dapat melaporkan listing.

Alasan:

- Informasi tidak sesuai.
- Nomor WhatsApp tidak aktif.
- Kost tidak tersedia.
- Lokasi tidak sesuai.
- Konten tidak pantas.
- Penipuan / mencurigakan.
- Lainnya.

Super Admin dapat melihat dan menindaklanjuti laporan.

---

# 29. Super Admin Dashboard

## 29.1 Main Metrics

- Total Owner.
- Active Owner.
- Suspended Owner.
- Total Properties.
- Active Listings.
- Inactive Listings.
- Pending Payments.
- Monthly Revenue.
- Active Subscriptions.

## 29.2 Platform Activity

- Owner baru.
- Subscription baru.
- Payment pending.
- Listing baru.
- Report baru.
- Suspend activity.

---

# 30. Super Admin Navigation

```text
Dashboard

Owners
Properties
Subscriptions
Payments
Plans
Reports
Notifications
Audit Logs
Settings
```

---

# 31. Plan Management

Super Admin dapat:

- Create plan.
- Update plan.
- Activate/deactivate plan.
- Configure price.
- Configure duration.
- Configure features.
- Configure limits.
- Set default plan.

## 31.1 Plan Feature Model

Plan feature sebaiknya disimpan sebagai konfigurasi database.

Contoh:

```text
subscription_plans
subscription_plan_features
```

Tidak boleh bergantung pada hard-coded feature limit.

---

# 32. Payment Verification Dashboard

Super Admin memiliki halaman:

```text
Payment Verification
```

Data:

- Invoice/reference number.
- Owner.
- Package.
- Amount.
- Payment date.
- Payment method.
- Proof.
- Submitted date.
- Status.

Action:

- Approve.
- Reject.

Reject wajib memiliki reason.

---

# 33. Listing Management

Super Admin dapat:

- Melihat semua listing.
- Search listing.
- Filter status.
- Melihat detail.
- Suspend listing.
- Reactivate listing.
- Melihat report.
- Melihat Owner.

---

# 34. Notification System

Notification digunakan untuk:

- Subscription expiring.
- Subscription expired.
- Payment approved.
- Payment rejected.
- Listing suspended.
- Owner suspended.
- System announcement.

Minimal notification memiliki:

```text
id
user_id
type
title
message
read_at
created_at
```

---

# 35. Audit Log

Aktivitas penting harus dicatat.

Contoh:

- Login.
- Logout.
- Create.
- Update.
- Delete.
- Payment verification.
- Subscription change.
- Owner suspension.
- Listing suspension.
- Plan change.

Audit log minimal:

```text
actor_id
action
entity_type
entity_id
old_value
new_value
ip_address
user_agent
created_at
```

---

# 36. Role & Permission

## 36.1 Super Admin

Contoh permission:

```text
owner.read
owner.suspend
owner.activate

property.read
property.suspend
property.activate

subscription.read
subscription.manage

payment.read
payment.verify

plan.create
plan.update
plan.delete

audit.read
report.read
```

## 36.2 Owner

Contoh permission:

```text
property.create
property.read
property.update
property.delete

room.create
room.read
room.update
room.delete

tenant.create
tenant.read
tenant.update
tenant.delete

payment.create
payment.read

subscription.read
subscription.upgrade

report.read
```

## 36.3 Public User

Tidak memiliki authenticated permission.

Akses hanya ke endpoint public.

---

# 37. Multi-Tenant Data Isolation

KostKita harus menggunakan isolasi data berdasarkan Owner.

Contoh:

```text
Owner A
 ├── Property A
 ├── Rooms
 ├── Tenants
 └── Payments

Owner B
 ├── Property B
 ├── Rooms
 ├── Tenants
 └── Payments
```

Owner A tidak boleh mengakses data Owner B.

Filtering harus dilakukan di backend, bukan hanya frontend.

---

# 38. Security Requirements

Minimum security:

- Password hashing.
- HTTPS.
- Secure authentication.
- Backend authorization.
- Input validation.
- Rate limiting.
- SQL injection protection.
- XSS protection.
- CSRF protection sesuai arsitektur.
- Secure password reset.
- File upload validation.
- File type restriction.
- File size restriction.
- Secure payment proof storage.
- Database backup.
- Audit logging.
- Access control.

---

# 39. Personal Data & Privacy

KostKita memproses data pribadi seperti:

- Nama.
- Email.
- Nomor WhatsApp.
- Data penghuni.
- Riwayat pembayaran.

Prinsip:

- Data dikumpulkan sesuai tujuan.
- Hanya data yang diperlukan yang dikumpulkan.
- Akses dibatasi berdasarkan role.
- Data private tidak ditampilkan ke public.
- Data harus diamankan.
- Pengguna harus diberi informasi mengenai penggunaan data.

Dokumen yang diperlukan:

- Privacy Policy.
- Terms of Service.
- Contact/Support information.
- Data handling policy internal.

---

# 40. Privacy Policy Requirements

Privacy Policy minimal menjelaskan:

- Data yang dikumpulkan.
- Tujuan penggunaan data.
- Dasar pemrosesan yang relevan.
- Penyimpanan data.
- Pengamanan data.
- Pihak yang dapat mengakses data.
- Hak pengguna.
- Prosedur permintaan terkait data.
- Kontak pengelola.

Implementasi production harus ditinjau berdasarkan ketentuan hukum Indonesia yang berlaku, termasuk UU Perlindungan Data Pribadi.

---

# 41. Terms of Service

Terms harus menjelaskan tanggung jawab Owner terhadap:

- Kebenaran informasi listing.
- Harga.
- Ketersediaan kamar.
- Fasilitas.
- Nomor WhatsApp.
- Foto.
- Deskripsi.
- Aturan kost.
- Konten yang diunggah.
- Kepatuhan terhadap hukum.

Terms juga menjelaskan hak KostKita untuk:

- Menonaktifkan listing.
- Suspend Owner.
- Menolak konten.
- Menindak laporan.
- Mengubah layanan.

---

# 42. PSE & Compliance

Karena KostKita merupakan platform digital yang memproses data pengguna dan menampilkan konten/listing dari Owner, aspek PSE dan perlindungan data harus diperiksa sebelum commercial production launch.

Tahapan:

```text
Development
↓
Testing
↓
Security Review
↓
Privacy & Legal Review
↓
PSE Assessment / Registration if applicable
↓
Production
```

Kepatuhan harus disesuaikan dengan ketentuan Indonesia yang berlaku pada saat peluncuran.

---

# 43. Recommended Technical Architecture

## 43.1 Public Website

```text
Next.js
React
TypeScript
```

Alasan:

- SEO.
- Public property pages.
- Search engine indexing.
- Fast initial rendering.
- Cocok untuk discovery platform.

## 43.2 Owner Dashboard

```text
React
Vite
TypeScript
```

## 43.3 Super Admin Dashboard

```text
React
Vite
TypeScript
```

## 43.4 Backend

```text
Node.js
Express.js
TypeScript
```

## 43.5 Database

```text
PostgreSQL
```

## 43.6 File Storage

Object storage untuk:

- Property photos.
- Room photos.
- Payment proofs.

File tidak disimpan sebagai binary utama di database.

---

# 44. API Structure

Base:

```text
/api/v1
```

Modules:

```text
/auth
/owners
/properties
/rooms
/tenants
/payments
/subscriptions
/packages
/public
/notifications
/reports
/admin
```

Contoh:

```http
GET /api/v1/public/properties
GET /api/v1/public/properties/:slug

POST /api/v1/properties
GET /api/v1/properties
PATCH /api/v1/properties/:id
DELETE /api/v1/properties/:id
```

---

# 45. Database High-Level

Recommended entities:

```text
users
roles
permissions
role_permissions

properties
property_photos
property_facilities
property_rules

rooms
room_photos
room_facilities

tenants
tenant_stays

payments

subscription_plans
subscription_plan_features
subscriptions
subscription_payments

notifications

listing_reports

audit_logs

system_settings
```

---

# 46. Core Entity Relationship

```text
User
 │
 ├── Subscription
 │
 └── Properties
       │
       └── Rooms
             │
             └── Tenant Stays
                   │
                   └── Tenant

Subscription
 │
 └── Subscription Plan

Subscription Payment
 │
 └── Subscription

Payment
 │
 └── Tenant / Tenant Stay
```

---

# 47. URL & SEO Strategy

Public property detail menggunakan slug.

Contoh:

```text
/kost
/kost/padang
/kost/padang/kuranji
/kost/padang/kuranji/kost-melati
```

Detail:

```text
/kost/[city]/[district]/[slug]
```

SEO metadata:

- Title.
- Description.
- Canonical URL.
- Open Graph.
- Structured data jika relevan.

Listing inactive tidak diprioritaskan dalam search results.

---

# 48. Public SEO Content

Public pages dapat di-index oleh search engine.

Contoh:

```text
Kost di Padang
Kost di Kuranji
Kost Putri di Padang
Kost Putra di Padang
Kost Murah di Padang
```

Konten harus berasal dari data aktual dan tidak boleh menghasilkan halaman spam secara otomatis.

---

# 49. UX Principles

KostKita harus memiliki UX:

- Modern.
- Clean.
- Professional.
- Mobile responsive.
- Fast.
- Simple.
- Trustworthy.
- Tidak terasa seperti software enterprise lama.

## Owner Dashboard

Fokus pada:

> "Saya bisa mengelola bisnis kost tanpa merasa rumit."

## Public Website

Fokus pada:

> "Saya bisa menemukan kost yang cocok dalam beberapa langkah."

## Super Admin

Fokus pada:

> "Saya bisa mengontrol seluruh platform dengan jelas."

---

# 50. MVP User Journey

## 50.1 Owner Journey

```text
Landing
 ↓
Register
 ↓
Trial Activated
 ↓
Dashboard
 ↓
Create Property
 ↓
Create Rooms
 ↓
Publish Property
 ↓
Manage Tenants
 ↓
Record Payments
 ↓
View Reports
```

## 50.2 Public User Journey

```text
Landing
 ↓
Search Location
 ↓
Map / List
 ↓
Apply Filters
 ↓
Property Detail
 ↓
View Available Rooms
 ↓
WhatsApp Owner
```

## 50.3 Subscription Journey

```text
Trial
 ↓
H-3 Notification
 ↓
Expiration
 ↓
Listing Inactive
 ↓
Choose Package
 ↓
Manual Payment
 ↓
Upload Proof
 ↓
Admin Verification
 ↓
Approved
 ↓
Subscription Active
 ↓
Listing Active
```

---

# 51. MVP Page List

## 51.1 Public

```text
/
 /search
 /map
 /kost/[slug]
 /about
 /help
 /report
 /terms
 /privacy
```

## 51.2 Owner

```text
/login
/register
/forgot-password

/dashboard

/properties
/properties/new
/properties/:id
/properties/:id/edit

/rooms
/rooms/:id

/tenants
/tenants/:id

/payments
/payments/new

/reports

/subscription
/subscription/plans
/subscription/payment
/subscription/history

/notifications

/settings
```

## 51.3 Super Admin

```text
/admin/login
/admin/dashboard

/admin/owners
/admin/owners/:id

/admin/properties
/admin/properties/:id

/admin/subscriptions
/admin/payments
/admin/payments/:id

/admin/plans
/admin/plans/new
/admin/plans/:id/edit

/admin/reports
/admin/listing-reports

/admin/audit-logs
/admin/settings
```

---

# 52. Acceptance Criteria — Owner

Owner dapat:

- Register.
- Mendapat Trial otomatis.
- Login.
- Logout.
- Reset password.
- Melihat subscription.
- Membuat kost.
- Mengubah kost.
- Menghapus kost sesuai aturan sistem.
- Mengatur lokasi.
- Membuat kamar.
- Mengubah kamar.
- Mengelola penghuni.
- Mencatat pembayaran.
- Melihat laporan.
- Upgrade subscription.
- Upload bukti pembayaran.
- Melihat status verifikasi.
- Menerima notification.

---

# 53. Acceptance Criteria — Super Admin

Super Admin dapat:

- Login.
- Melihat dashboard.
- Melihat Owner.
- Suspend/activate Owner.
- Melihat property.
- Suspend/activate listing.
- Membuat paket.
- Mengubah paket.
- Mengatur harga.
- Mengatur durasi.
- Mengatur benefit.
- Mengatur limit.
- Melihat pembayaran subscription.
- Approve pembayaran.
- Reject pembayaran dengan alasan.
- Melihat report listing.
- Melihat audit log.

---

# 54. Acceptance Criteria — Public User

Public user dapat:

- Membuka website tanpa login.
- Mencari berdasarkan lokasi.
- Menggunakan current location.
- Mencari lokasi manual.
- Melihat map.
- Menggunakan filter.
- Melihat kost aktif.
- Melihat detail kost.
- Melihat kamar tersedia.
- Menghubungi Owner via WhatsApp.
- Melaporkan listing.

Public user tidak dapat:

- Mengakses dashboard Owner.
- Mengakses data penghuni.
- Mengakses data pembayaran.
- Mengubah listing.

---

# 55. Error & Edge Cases

Sistem harus menangani:

### Trial expired

```text
Subscription expired.
Listing menjadi inactive.
```

### Payment rejected

```text
Owner menerima alasan rejection.
Owner dapat melakukan submission ulang.
```

### Owner suspended

```text
Owner tidak dapat menggunakan dashboard normal.
Listing inactive.
```

### Listing suspended

```text
Listing tidak tampil di public.
Owner menerima alasan suspend.
```

### Room limit exceeded

```text
Owner tidak dapat menambah room baru.
Tampilkan informasi upgrade package.
```

### Property limit exceeded

```text
Owner tidak dapat menambah property baru.
Tampilkan informasi upgrade package.
```

### Payment proof invalid

```text
Submission ditolak.
Owner diminta mengirim bukti yang valid.
```

---

# 56. System Configuration

Super Admin dapat mengatur konfigurasi tertentu melalui:

```text
System Settings
```

Contoh:

- Nama aplikasi.
- Logo.
- Contact email.
- Support WhatsApp.
- Payment bank account.
- Default trial plan.
- Notification configuration.
- Maintenance mode.
- Public listing configuration.

---

# 57. Support

MVP menyediakan support melalui:

- Email support.
- WhatsApp support.

Tidak perlu membuat ticketing system kompleks pada MVP.

---

# 58. Future Roadmap

Setelah MVP stabil:

## Phase 2

- Staff role.
- Advanced reports.
- Automated reminders.
- Tenant portal.
- Tenant payment reminder.
- Property analytics.
- Review/rating.

## Phase 3

- Online payment.
- Automated subscription renewal.
- WhatsApp API.
- Booking system.
- Reservation.
- Digital contracts.

## Phase 4

- Mobile Owner App.
- Mobile Tenant App.
- Advanced analytics.
- AI-assisted property management.
- Recommendation engine.

---

# 59. MVP Success Metrics

Beberapa metric utama:

## Acquisition

- Number of registered Owners.
- Number of published properties.

## Activation

- Percentage of Owner completing first property.
- Percentage of Owner publishing first listing.
- Time from registration to first listing.

## Discovery

- Search sessions.
- Property detail views.
- Map interactions.
- WhatsApp CTA clicks.

## SaaS

- Trial-to-paid conversion.
- Active subscriptions.
- Renewal rate.
- Subscription revenue.

## Operations

- Occupancy data recorded.
- Payments recorded.
- Active tenants.

---

# 60. Product Principles

KostKita harus mengikuti prinsip:

### 1. Owner First

Pengelolaan kost harus sederhana dan cepat.

### 2. Discovery First

Public website harus memudahkan calon penyewa menemukan kost.

### 3. Data Isolation

Data Owner harus benar-benar terisolasi.

### 4. Configurable SaaS

Paket, benefit, limit, dan konfigurasi bisnis tidak boleh hard-coded.

### 5. Manual First

MVP menggunakan proses manual yang sederhana sebelum mengotomatisasi pembayaran.

### 6. Privacy by Design

Data pribadi hanya dikumpulkan dan diproses sesuai kebutuhan.

### 7. Scalable Architecture

Arsitektur harus memungkinkan penambahan Staff, mobile app, payment gateway, dan fitur lanjutan.

---

# 61. Final MVP Scope

### Must Have

- Owner registration.
- Owner login.
- Trial subscription.
- Subscription management.
- Manual payment.
- Payment proof upload.
- Admin payment verification.
- Property management.
- Room management.
- Tenant management.
- Payment recording.
- Basic reports.
- Public property discovery.
- Map.
- Location search.
- Filters.
- Property detail.
- WhatsApp contact.
- Listing status.
- Listing report.
- Super Admin dashboard.
- Owner management.
- Package management.
- Audit logs.
- Notifications.
- Role-based access.
- Multi-tenant data isolation.

### Should Have

- Password reset.
- Advanced property filters.
- Occupancy dashboard.
- Revenue dashboard.
- SEO optimization.
- Structured metadata.
- Support page.

### Later

- Staff.
- Online payment.
- Booking.
- In-app chat.
- Automated WhatsApp.
- Tenant app.
- Owner mobile app.
- Reviews.
- Advanced analytics.

---

# 62. Final Product Definition

KostKita adalah:

> **Platform SaaS manajemen kost yang memungkinkan Owner mengelola bisnis kost secara digital, sementara calon penyewa dapat menemukan kost berdasarkan lokasi dan langsung menghubungi Owner melalui WhatsApp.**

Core loop:

```text
OWNER
Register
 ↓
Trial
 ↓
Manage Kost
 ↓
Publish Listing
 ↓
PENYEWA
Search
 ↓
Discover
 ↓
View
 ↓
WhatsApp
 ↓
OWNER
```

Business loop:

```text
Trial
 ↓
Expiration Reminder
 ↓
Subscription Expired
 ↓
Listing Inactive
 ↓
Upgrade
 ↓
Manual Payment
 ↓
Admin Verification
 ↓
Active Subscription
 ↓
Listing Active
```

KostKita MVP harus memprioritaskan **simplicity, data isolation, configurable subscription, reliable listing discovery, dan pengalaman WhatsApp-first untuk komunikasi penyewa dengan Owner**.
