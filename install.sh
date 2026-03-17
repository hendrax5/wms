#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════
#  WMS-2026 — Auto Install Script
#
#  Jalankan di server:
#    bash <(curl -fsSL https://raw.githubusercontent.com/USERNAME/REPO/main/install.sh)
#    bash <(wget -qO- https://raw.githubusercontent.com/USERNAME/REPO/main/install.sh)
#
#  Atau manual:
#    git clone <repo> /opt/wms && cd /opt/wms && docker compose up -d --build
# ═══════════════════════════════════════════════════════════════════════════

set -e

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
info() { echo -e "${GREEN}[INFO]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }
ok()   { echo -e "${GREEN}[OK]${NC} $1"; }

echo ""
echo "  WMS-2026 — Warehouse & Asset Management System"
echo "══════════════════════════════════════════════════"
echo ""

# ── GANTI INI dengan URL repo GitHub kamu ────────────────────────────────
REPO_URL="https://github.com/USERNAME/REPO.git"
INSTALL_DIR="${WMS_DIR:-/opt/wms}"
APP_PORT="${APP_PORT:-3000}"

# ── 1. Cek & upgrade Docker Compose ke v2 ────────────────────────────────
info "Memeriksa Docker Compose..."
command -v docker >/dev/null 2>&1 || error "Docker tidak terinstall."

if docker compose version >/dev/null 2>&1; then
    COMPOSE_CMD="docker compose"
    ok "Docker Compose v2 ditemukan"
elif command -v docker-compose >/dev/null 2>&1; then
    COMPOSE_VERSION=$(docker-compose version --short 2>/dev/null | cut -d. -f1)
    if [ "$COMPOSE_VERSION" = "1" ]; then
        warn "docker-compose v1 terdeteksi (versi lama, ada bug ContainerConfig)"
        info "Menginstall Docker Compose v2 plugin..."

        # Install docker compose v2 plugin
        mkdir -p /usr/local/lib/docker/cli-plugins
        curl -fsSL "https://github.com/docker/compose/releases/download/v2.24.5/docker-compose-$(uname -s)-$(uname -m)" \
            -o /usr/local/lib/docker/cli-plugins/docker-compose
        chmod +x /usr/local/lib/docker/cli-plugins/docker-compose

        COMPOSE_CMD="docker compose"
        ok "Docker Compose v2 berhasil diinstall"
    else
        COMPOSE_CMD="docker-compose"
    fi
else
    error "Docker Compose tidak ditemukan. Install Docker terlebih dahulu."
fi

# ── 2. Hapus container lama jika ada (fix ContainerConfig error) ──────────
info "Membersihkan container lama (jika ada)..."
docker rm -f wms-app wms-db 2>/dev/null && info "Container lama dihapus" || true

# ── 3. Clone / Update repo ────────────────────────────────────────────────
echo ""
if [ -d "$INSTALL_DIR/.git" ]; then
    info "Repo sudah ada, melakukan git pull..."
    git -C "$INSTALL_DIR" pull origin main
else
    info "Mengkloning repo ke $INSTALL_DIR ..."
    git clone "$REPO_URL" "$INSTALL_DIR"
fi

cd "$INSTALL_DIR"

# ── 4. Build & Run (zero config) ─────────────────────────────────────────
echo ""
info "Membangun image dan menjalankan container..."
$COMPOSE_CMD up -d --build

# ── 5. Tunggu app siap ────────────────────────────────────────────────────
echo ""
info "Menunggu aplikasi siap..."
ELAPSED=0
until curl -sf "http://localhost:${APP_PORT}/api/health" >/dev/null 2>&1; do
    [ $ELAPSED -ge 120 ] && { warn "Timeout. Cek: $COMPOSE_CMD logs wms-app"; break; }
    printf "."; sleep 3; ELAPSED=$((ELAPSED + 3))
done
echo ""

# ── 6. Selesai ────────────────────────────────────────────────────────────
LOCAL_IP=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "localhost")
echo ""
echo "══════════════════════════════════════════════════"
ok "WMS berhasil diinstall!"
echo ""
echo "  🌐 Akses : http://${LOCAL_IP}:${APP_PORT}"
echo ""
echo "  Update app : cd $INSTALL_DIR && git pull && $COMPOSE_CMD up -d --build"
echo "  Lihat log  : $COMPOSE_CMD -f $INSTALL_DIR/docker-compose.yml logs -f"
echo "  Stop       : $COMPOSE_CMD -f $INSTALL_DIR/docker-compose.yml down"
echo "══════════════════════════════════════════════════"
