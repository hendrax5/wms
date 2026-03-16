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

### ⚡ Quick Deploy — 1 Perintah

```bash
# Menggunakan curl:
bash <(curl -fsSL https://raw.githubusercontent.com/USERNAME/REPO/main/install.sh)

# Menggunakan wget:
bash <(wget -qO- https://raw.githubusercontent.com/USERNAME/REPO/main/install.sh)
```

Script otomatis:
- ✅ Cek Docker & Git terinstall
- ✅ Clone repository ke `/opt/wms`
- ✅ Set `NEXTAUTH_URL` ke IP server secara otomatis
- ✅ Generate `NEXTAUTH_SECRET` yang aman
- ✅ Build & jalankan via Docker Compose
- ✅ Tunggu sampai app siap dan tampilkan URL akses

> **Ganti `USERNAME/REPO`** dengan path repository kamu di GitHub sebelum menggunakan perintah di atas.

---

### Manual Deploy

**1. Clone repository**
```bash
git clone https://github.com/USERNAME/REPO.git /opt/wms
cd /opt/wms
```

**2. (Opsional) Sesuaikan URL server**

Jika deploy di VPS, buka `docker-compose.yml` dan ganti:
```yaml
- NEXTAUTH_URL=http://IP_SERVER:3000
```

**3. Build & jalankan**
```bash
docker compose up -d --build
```

**4. Verifikasi**
```bash
curl http://localhost:3000/api/health
# → {"status":"ok"}
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
