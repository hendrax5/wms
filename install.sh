#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════
#  WMS-2026 — Auto Install Script
#  Jalankan: bash <(curl -fsSL https://raw.githubusercontent.com/USERNAME/REPO/main/install.sh)
#  atau:     bash <(wget -qO- https://raw.githubusercontent.com/USERNAME/REPO/main/install.sh)
# ═══════════════════════════════════════════════════════════════════════════

set -e

# ── Warna output ──────────────────────────────────────────────────────────
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
info()    { echo -e "${GREEN}[INFO]${NC} $1"; }
warn()    { echo -e "${YELLOW}[WARN]${NC} $1"; }
error()   { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }
ok()      { echo -e "${GREEN}[OK]${NC} $1"; }

echo ""
echo "  ██╗    ██╗███╗   ███╗███████╗"
echo "  ██║    ██║████╗ ████║██╔════╝"
echo "  ██║ █╗ ██║██╔████╔██║███████╗"
echo "  ██║███╗██║██║╚██╔╝██║╚════██║"
echo "  ╚███╔███╔╝██║ ╚═╝ ██║███████║"
echo "   ╚══╝╚══╝ ╚═╝     ╚═╝╚══════╝  2026"
echo ""
echo "  Warehouse & Asset Management System"
echo "══════════════════════════════════════════"
echo ""

# ── Konfigurasi ──────────────────────────────────────────────────────────
REPO_URL="https://github.com/USERNAME/REPO.git"   # ← GANTI dengan URL repo kamu
INSTALL_DIR="${WMS_DIR:-/opt/wms}"
APP_PORT="${APP_PORT:-3000}"
NEXTAUTH_URL="${NEXTAUTH_URL:-http://$(hostname -I | awk '{print $1}'):${APP_PORT}}"

# ── 1. Cek dependencies ──────────────────────────────────────────────────
info "Memeriksa dependency..."

command -v docker >/dev/null 2>&1 || error "Docker tidak terinstall. Install dulu: https://docs.docker.com/engine/install/"
command -v git    >/dev/null 2>&1 || error "Git tidak terinstall."

# Cek Docker Compose (plugin v2 atau standalone v1)
if docker compose version >/dev/null 2>&1; then
    COMPOSE_CMD="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
    COMPOSE_CMD="docker-compose"
else
    error "Docker Compose tidak terinstall."
fi

ok "Docker   : $(docker --version)"
ok "Compose  : $($COMPOSE_CMD version --short 2>/dev/null || echo 'ok')"
ok "Git      : $(git --version)"

# ── 2. Clone / Update repo ───────────────────────────────────────────────
echo ""
if [ -d "$INSTALL_DIR/.git" ]; then
    info "Direktori sudah ada, melakukan update..."
    git -C "$INSTALL_DIR" pull origin main
else
    info "Mengunduh WMS ke $INSTALL_DIR ..."
    git clone "$REPO_URL" "$INSTALL_DIR"
fi

cd "$INSTALL_DIR"

# ── 3. Sesuaikan NEXTAUTH_URL di docker-compose.yml ─────────────────────
echo ""
info "Mengatur NEXTAUTH_URL => $NEXTAUTH_URL"
sed -i "s|NEXTAUTH_URL=.*|NEXTAUTH_URL=$NEXTAUTH_URL|g" docker-compose.yml
sed -i "s|AUTH_SECRET=.*|AUTH_SECRET=$(openssl rand -base64 32 2>/dev/null || echo 'wms2026-secret-key')|g" docker-compose.yml
sed -i "s|NEXTAUTH_SECRET=.*|NEXTAUTH_SECRET=$(openssl rand -base64 32 2>/dev/null || echo 'wms2026-secret-key')|g" docker-compose.yml

# ── 4. Build & jalankan ──────────────────────────────────────────────────
echo ""
info "Membangun dan menjalankan container (ini mungkin butuh beberapa menit)..."
$COMPOSE_CMD up -d --build

# ── 5. Tunggu app siap ───────────────────────────────────────────────────
echo ""
info "Menunggu aplikasi siap..."
MAX_WAIT=120
ELAPSED=0
until curl -sf "http://localhost:${APP_PORT}/api/health" >/dev/null 2>&1; do
    if [ $ELAPSED -ge $MAX_WAIT ]; then
        warn "Timeout menunggu app. Cek log dengan: $COMPOSE_CMD logs wms-app"
        break
    fi
    printf "."
    sleep 3
    ELAPSED=$((ELAPSED + 3))
done
echo ""

# ── 6. Selesai ───────────────────────────────────────────────────────────
echo ""
echo "══════════════════════════════════════════"
ok "WMS berhasil diinstall!"
echo ""
echo "  🌐 URL Akses  : http://$(hostname -I | awk '{print $1}'):${APP_PORT}"
echo "  📁 Direktori  : $INSTALL_DIR"
echo ""
echo "  Perintah berguna:"
echo "    Lihat log   : $COMPOSE_CMD -C $INSTALL_DIR logs wms-app -f"
echo "    Stop        : $COMPOSE_CMD -C $INSTALL_DIR down"
echo "    Update      : cd $INSTALL_DIR && git pull && $COMPOSE_CMD up -d --build"
echo "══════════════════════════════════════════"
