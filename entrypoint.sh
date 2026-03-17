#!/bin/sh
set -e

echo "==> Syncing database schema..."
# Gunakan prisma db push karena tidak ada migration files
# Ini akan membuat semua tabel sesuai schema.prisma langsung ke DB
node node_modules/prisma/build/index.js db push \
    --schema=./prisma/schema.prisma \
    --accept-data-loss \
    --skip-generate

echo "==> Schema sync selesai. Starting Next.js..."
exec node server.js
