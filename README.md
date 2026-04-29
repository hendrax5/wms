# WMS-2026 — Warehouse & Asset Management System

Sistem manajemen gudang dan aset terpadu untuk operasional multi-lokasi. Dibangun dengan Next.js 16, Prisma ORM, dan MySQL.

## Fitur Utama

### 📦 Warehouse Management
- **Barang Masuk (Inbound)** — penerimaan barang dari vendor dengan tracking serial number
- **Barang Keluar (Outbound)** — pengeluaran ke pelanggan, POP, atau transfer antar gudang
- **Transfer Stok** — perpindahan barang antar cabang dengan status In-Transit & Delivery Manifest
- **Tracking Serial Number** — lacak riwayat lengkap setiap unit berdasarkan SN
- **Stock Opname** — pencocokan stok fisik vs sistem dengan workflow Draft → Frozen → Completed
- **Stock Adjustment** — koreksi stok manual dengan approval workflow
- **Laporan** — Stok Gudang, Histori Transaksi, Barang Rusak, Mutasi Aset, Inventory Log

### 🖥️ Asset Management
- **Daftar Aset** — semua aset yang sedang ter-deploy di lapangan
- **Scan & Deploy** — deploy aset ke lokasi via scan serial number
- **Return Aset** — kembalikan aset dari lapangan ke gudang (Dismantle / Rusak)
- **Jadwal Maintenance** — buat jadwal, catat temuan, mark complete
- **Depresiasi Aset** — kalkulator nilai buku metode Garis Lurus (Straight-Line)
- **Location Tracking** — riwayat perpindahan aset antar POP/lokasi

### 🔔 Dashboard & Notifikasi
- **Dashboard KPI** — stok gudang, total SN, transaksi hari ini, aset aktif, maintenance overdue
- **Notification Bell** — alert real-time: stok rendah, maintenance overdue, aset baru
- **Multi-lokasi** — support gudang pusat + cabang dengan branch context switcher
- **Audit Log** — pencatatan seluruh aktivitas operasional

---

## Tech Stack

| Layer | Teknologi |
|---|---|
| Frontend | Next.js 16 (App Router), TailwindCSS v4 |
| Backend | Next.js API Routes, Server Actions |
| Auth | NextAuth.js v5 (Credentials + JWT) |
| Database | MySQL 8 via Prisma ORM |
| Deployment | Docker + Docker Compose |

---

## 🔐 Default User & Kredensial

Saat pertama kali deploy via Docker, database otomatis di-seed dengan user default:

| Field | Nilai |
|---|---|
| **Username** | `admin` |
| **Password** | `!Tahun2026` |
| **Nama** | Administrator |
| **Level** | `MASTER` (akses penuh) |
| **Jabatan** | System Administrator |

> ⚠️ **PENTING:** Segera ganti password default setelah login pertama kali via menu **Master Data → Kelola User**.

### Role & Level Akses (RBAC)

Sistem menggunakan 5 level user dengan hak akses berbeda:

| Level | Hak Akses |
|---|---|
| `MASTER` | Akses penuh ke semua gudang, semua fitur, kelola user & konfigurasi |
| `CABANG` | Admin cabang — akses penuh untuk gudang yang di-assign |
| `SPV` | Supervisor — akses multi-gudang sesuai assignment via `UserWarehouseAccess` |
| `STAFF` | Operasional harian — inbound/outbound/transfer di gudang yang di-assign |
| `USER` | Read-only / akses terbatas |

---

## Deployment (Docker Compose)

### ⚡ Zero Config — Deploy Langsung

```bash
git clone https://github.com/USERNAME/REPO.git wms
cd wms
docker compose up -d --build
```

Selesai. Tidak ada konfigurasi tambahan.

> **Prasyarat:** Docker & Git terinstall. Pastikan menggunakan `docker compose` (v2), bukan `docker-compose` (v1).

### Apa yang terjadi saat pertama kali deploy?

1. Docker build image Next.js + Prisma
2. MySQL 8 container berjalan & healthcheck ready
3. `entrypoint.sh` menjalankan `prisma db push` (sync schema ke database)
4. **Auto-seed** — buat user default `admin`, kategori, tipe barang, dll (hanya jika belum ada user)
5. Next.js server start di port `3000`

> **Login langsung** dengan `admin` / `!Tahun2026` setelah deploy selesai.

---

### Auto Install via curl/wget

```bash
# curl:
bash <(curl -fsSL https://raw.githubusercontent.com/USERNAME/REPO/main/install.sh)

# wget:
bash <(wget -qO- https://raw.githubusercontent.com/USERNAME/REPO/main/install.sh)
```

Script `install.sh` otomatis menangani:
- ✅ Deteksi & upgrade `docker-compose` v1 → v2 (fix error `ContainerConfig`)
- ✅ Clone repo & build
- ✅ Tunggu app siap, tampilkan URL akses

---

### Fix Error `ContainerConfig` (docker-compose v1 lama)

Jika muncul error `KeyError: 'ContainerConfig'`, artinya server menggunakan `docker-compose` versi lama (v1.29.x). Solusi:

```bash
# Hapus container lama
docker rm -f wms-app wms-db

# Gunakan docker compose v2 (bukan docker-compose)
docker compose up -d --build
```

Atau upgrade ke Docker Compose v2:
```bash
mkdir -p /usr/local/lib/docker/cli-plugins
curl -fsSL "https://github.com/docker/compose/releases/download/v2.24.5/docker-compose-$(uname -s)-$(uname -m)" \
    -o /usr/local/lib/docker/cli-plugins/docker-compose
chmod +x /usr/local/lib/docker/cli-plugins/docker-compose
```

---

## Seeding Database

Seed otomatis berjalan saat pertama kali container start (via `entrypoint.sh`). Jika database sudah memiliki user, seed akan **di-skip** secara otomatis.

### Data yang di-seed

| Data | Detail |
|---|---|
| **Area** | `JABODETABEK` |
| **Warehouse** | `Gudang Pusat Jakarta` (tipe: PUSAT) |
| **User Master** | `admin` / `!Tahun2026` (level: MASTER) |
| **Kategori** | SWITCH, ROUTER, SFP, ONT, CABLE, ACCESSORY |
| **Tipe Barang** | Baru, Dismantle, Rusak, Return, Awal |
| **Status Barang** | Belum disetujui, Disetujui, Ditolak, On Progress, Di Return, In Stock, Dipakai, Rusak |
| **Sample Item** | Mikrotik RB4011 (code: `SW-RB4011`, hasSN: true) |

### Cara Menjalankan Seed Manual

**Development (lokal):**
```bash
npm run seed
# atau
npx tsx prisma/seed.ts
```

**Production (Docker):**
```bash
# Seed otomatis saat container pertama kali start.
# Jika ingin re-seed manual (misal setelah reset database):
docker exec -it wms-app node scripts/seed-prod.js
```

> **Note:** Seed menggunakan guard `user.count() > 0` — hanya berjalan jika belum ada user di database.

---

## Development Lokal

### Prasyarat
- Node.js 20+
- MySQL 8 berjalan
- npm / pnpm

### Setup

```bash
# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env — sesuaikan DATABASE_URL
```

### Environment Variables

| Variable | Deskripsi | Contoh |
|---|---|---|
| `DATABASE_URL` | Koneksi MySQL | `mysql://root:password@localhost:3306/wms_2026` |
| `NEXTAUTH_SECRET` | Secret untuk JWT signing | `openssl rand -base64 32` |
| `NEXTAUTH_URL` | Base URL aplikasi | `http://localhost:3000` |
| `AUTH_TRUST_HOST` | Izinkan akses tanpa HTTPS | `1` (production tanpa SSL) |

### Jalankan

```bash
# Generate Prisma client & migrate
npx prisma generate
npx prisma migrate dev

# Seed database (pertama kali)
npm run seed

# Jalankan dev server
npm run dev
```

Akses di `http://localhost:3000` → Login dengan kredensial default di atas.

---

## Struktur Direktori

```
src/
├── app/
│   ├── (dashboard)/        # Halaman utama: stock, reports, assets, transfer, dll
│   │   └── master/         # Master Data: users, warehouses, categories, items
│   ├── api/                # API routes (REST)
│   ├── actions/            # Server Actions (data fetching & mutations)
│   ├── dashboard/          # Halaman teknisi: deploy, return
│   └── login/              # Halaman login
├── components/             # Shared: Sidebar, Header, AuthProvider, BranchSelector
└── lib/                    # Prisma client, auth config, RBAC utilities
prisma/
├── schema.prisma           # Database schema (850+ lines, 25+ models)
├── seed.ts                 # Database seeder (TypeScript)
└── seed.js                 # Compiled seeder (auto-generated)
scripts/
├── fix-dates.js            # Fix invalid MySQL datetime values
├── migrateLegacy.ts        # Migrasi data dari sistem lama
└── deploy_remote.js        # Remote deployment helper
```

---

## Docker Environment

Default environment di `docker-compose.yml`:

| Variable | Default Value |
|---|---|
| `DATABASE_URL` | `mysql://root:wmspassword@wms-db:3306/wms_2026` |
| `MYSQL_ROOT_PASSWORD` | `wmspassword` |
| `MYSQL_DATABASE` | `wms_2026` |
| `AUTH_SECRET` | `wms2026-default-secret-changeme` |
| `AUTH_TRUST_HOST` | `1` |
| `PORT` | `3000` |

> ⚠️ Untuk production, **wajib** ganti `AUTH_SECRET` dan `MYSQL_ROOT_PASSWORD` dengan nilai yang aman.

---

## Operasional

### Update Aplikasi
```bash
cd /opt/wms
git pull origin main
docker compose up -d --build
```

### Lihat Log
```bash
docker compose logs -f wms-app
```

### Backup Database
```bash
docker exec wms-db mysqldump -u root -pwmspassword wms_2026 > backup_$(date +%Y%m%d).sql
```

### Restore Database
```bash
docker exec -i wms-db mysql -u root -pwmspassword wms_2026 < backup.sql
```

---

## License

Private — Internal use only.
