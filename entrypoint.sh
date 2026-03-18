#!/bin/sh

echo "==> Syncing database schema..."
# prisma db push dibuat non-fatal: jika gagal (misal tabel sudah ada dari SQL import),
# app tetap jalan. Ini mencegah crash-loop saat DB sudah diisi manual.
prisma db push \
    --schema=./prisma/schema.prisma \
    --accept-data-loss \
    --skip-generate 2>&1 || echo "==> [WARN] prisma db push failed (tables may already exist), continuing..."

echo "==> Starting Next.js..."
exec node server.js
