#!/bin/sh

echo "==> Syncing database schema..."
# prisma db push dibuat non-fatal: jika gagal (misal tabel sudah ada dari SQL import),
# app tetap jalan. Ini mencegah crash-loop saat DB sudah diisi manual.
npx --no prisma db push \
    --schema=./prisma/schema.prisma \
    --accept-data-loss \
    --skip-generate 2>&1 || echo "==> [WARN] prisma db push failed (tables may already exist), continuing..."

echo "==> Seeding default user & master data (idempotent upsert)..."
node ./prisma/seed.js 2>&1 || echo "==> [WARN] seed.js failed (may already exist), continuing..."

echo "==> Fixing invalid datetime values (0000-00-00)..."
node ./scripts/fix-dates.js 2>&1 || echo "==> [WARN] datetime fix script failed, continuing..."

echo "==> Starting Next.js..."
exec node server.js
