#!/bin/sh
# ─────────────────────────────────────────────────────────
# WMS — Build & Run tanpa Docker Compose
# Jalankan: sh run.sh
# ─────────────────────────────────────────────────────────

IMAGE_NAME="wms-app"
CONTAINER_NAME="wms-app"

# ── Konfigurasi — Edit sesuai env kamu ───────────────────
DATABASE_URL="mysql://root:password@HOST_DB:3306/wms_2026"
NEXTAUTH_URL="http://IP_ATAU_DOMAIN:3000"
NEXTAUTH_SECRET="ganti_dengan_secret_kuat"
APP_PORT=3000
# ─────────────────────────────────────────────────────────

echo "==> Membangun Docker image..."
docker build -t $IMAGE_NAME .

echo "==> Menghapus container lama (jika ada)..."
docker rm -f $CONTAINER_NAME 2>/dev/null || true

echo "==> Menjalankan container..."
docker run -d \
  --name $CONTAINER_NAME \
  --restart always \
  -p $APP_PORT:3000 \
  -e DATABASE_URL="$DATABASE_URL" \
  -e NEXTAUTH_URL="$NEXTAUTH_URL" \
  -e NEXTAUTH_SECRET="$NEXTAUTH_SECRET" \
  -e AUTH_SECRET="$NEXTAUTH_SECRET" \
  -e NODE_ENV=production \
  $IMAGE_NAME

echo ""
echo "✅ WMS berjalan di http://$(hostname -I | awk '{print $1}'):$APP_PORT"
echo "   Cek log: docker logs $CONTAINER_NAME -f"
