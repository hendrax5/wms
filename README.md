# WMS-2026 — Warehouse & Asset Management System

Sistem manajemen gudang dan aset terpadu untuk operasional multi-lokasi. Dibangun dengan Next.js 16, Prisma ORM, dan MySQL.

## Fitur Utama

### 📦 Warehouse Management
- **Barang Masuk (Inbound)** — penerimaan barang dari vendor dengan tracking serial number
- **Barang Keluar (Outbound)** — pengeluaran ke pelanggan, POP, atau transfer antar gudang
- **Transfer Stok** — perpindahan barang antar cabang dengan status In-Transit
- **Tracking Serial Number** — lacak riwayat lengkap setiap unit berdasarkan SN
- **Laporan** — Stok Gudang, Histori Transaksi, Barang Rusak, Mutasi Aset

### 🖥️ Asset Management
- **Daftar Aset** — semua aset yang sedang ter-deploy di lapangan
- **Scan & Deploy** — deploy aset ke lokasi via scan serial number
- **Return Aset** — kembalikan aset dari lapangan ke gudang (Dismantle / Rusak)
- **Jadwal Maintenance** — buat jadwal, catat temuan, mark complete
- **Depresiasi Aset** — kalkulator nilai buku metode Garis Lurus (Straight-Line)

### 🔔 Dashboard & Notifikasi
- **Dashboard KPI** — stok gudang, total SN, transaksi hari ini, aset aktif, maintenance overdue
- **Notification Bell** — alert real-time: stok rendah, maintenance overdue, aset baru
- **Multi-lokasi** — support gudang pusat + cabang

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

## Deployment (Docker Compose)

### ⚡ Zero Config — Deploy Langsung

```bash
git clone https://github.com/hendrax5/wms.git
cd wms
docker compose up -d --build
```

Selesai. Tidak ada konfigurasi tambahan.

> **Prasyarat:** Docker & Git terinstall. Pastikan menggunakan `docker compose` (v2), bukan `docker-compose` (v1).

---

### Auto Install via curl/wget

```bash
# curl:
bash <(curl -fsSL https://raw.githubusercontent.com/hendrax5/wms/main/install.sh)

# wget:
bash <(wget -qO- https://raw.githubusercontent.com/hendrax5/wms/main/install.sh)
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

## Panduan Lengkap Instalasi & Deployment Lokal (Dari Awal)

Ikuti langkah-langkah di bawah ini untuk menginstal dan menjalankan aplikasi WMS-2026 di lingkungan lokal Anda secara lengkap dari awal (from scratch).

### 1. Prasyarat Sistem
Pastikan sistem operasi Anda sudah menginstal:
- **Node.js** (Disarankan versi 18.x atau yang lebih baru)
- **MySQL Server** (Berjalan secara lokal, misal di port 3306)
- **Git**

### 2. Kloning Repositori & Masuk Folder
```bash
git clone https://github.com/hendrax5/wms.git
cd wms
```

### 3. Install NPM Dependencies
Unduh semua pustaka yang dibutuhkan oleh Next.js:
```bash
npm install
```

### 4. Konfigurasi Environment Variables (`.env`)
WMS-2026 membutuhkan konfigurasi `.env` untuk bisa bekerja. Buat file baru bernama `.env` di *root* (folder utama) proyek, lalu isi dengan konfigurasi berikut ini:

```env
# URL Koneksi Database MySQL 
# Format: mysql://USER:PASSWORD@HOST:PORT/NAMA_DATABASE
# Ubah '!Tahun2026' menjadi password MySQL root Anda.
DATABASE_URL="mysql://root:!Tahun2026@localhost:3306/wms_2026"

# Konfigurasi NextAuth (Wajib untuk fungsi Login)
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="kunci-rahasia-wms-2026-super-aman"
```

### 5. Inisialisasi Database dengan Prisma
Langkah ini penting untuk membuat skema tabel ke dalam MySQL:

```bash
# Sinkronisasi schema.prisma ke database (membuat otomatis tabel jika belum ada)
npx prisma db push

# Generate Prisma Client untuk integrasi dengan kode TypeScript
npx prisma generate
```

### 6. Impor Data Awal / Seeding (Opsional namun disarankan)
Agar aplikasi tidak benar-benar kosong dan bisa dipakai login, Anda bisa melakukan import dari backup SQL (*database dump*) yang sudah disertakan di repositori proyek, yaitu file `wms_2026.sql`.

```bash
# Gunakan perintah ini memakai CLI MySQL, pastikan memasukkan password saat diminta
mysql -u root -p wms_2026 < wms_2026.sql
```

### 7. Menjalankan Server Development Lokal
Semua konfigurasi selesai, sekarang jalankan aplikasi:
```bash
npm run dev
```

Server lokal akan mulai, buka browser dan akses aplikasi melalui URL:
**[http://localhost:3000](http://localhost:3000)**

---

## Struktur Direktori

```
src/
├── app/
│   ├── (dashboard)/        # Halaman utama: stock, reports, assets, dll
│   ├── api/                # API routes (REST)
│   ├── actions/            # Server Actions (data fetching)
│   └── dashboard/          # Halaman teknisi: deploy, return
├── components/             # Shared: Sidebar, Header, AuthProvider
└── lib/                    # Prisma client, auth config
prisma/
├── schema.prisma           # Database schema
└── migrations/             # Auto-generated migrations
```
