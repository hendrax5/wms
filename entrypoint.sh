#!/bin/sh
set -e

echo "==> Running DB migrations..."
node_modules/.bin/prisma migrate deploy --schema=./prisma/schema.prisma

echo "==> Starting Next.js..."
exec node server.js
