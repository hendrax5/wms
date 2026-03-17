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
git clone https://github.com/USERNAME/REPO.git wms
cd wms
docker compose up -d --build
```

Selesai. Tidak ada konfigurasi tambahan.

> **Prasyarat:** Docker & Git terinstall. Pastikan menggunakan `docker compose` (v2), bukan `docker-compose` (v1).

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

## Development Lokal

```bash
# Install dependencies
npm install

# Setup database (pastikan MySQL berjalan)
cp .env.example .env
# Edit .env — isi DATABASE_URL

# Generate Prisma client & migrate
npx prisma generate
npx prisma migrate dev

# Jalankan dev server
npm run dev
```

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
