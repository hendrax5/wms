#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════
#  WMS-2026 — Install & Update Script
#
#  Install baru:
#    bash <(curl -fsSL https://raw.githubusercontent.com/hendrax5/wms/main/install.sh)
#    bash <(wget -qO- https://raw.githubusercontent.com/hendrax5/wms/main/install.sh)
#
#  Atau manual:
#    git clone https://github.com/hendrax5/wms.git /opt/wms
#    cd /opt/wms && ./install.sh
# ═══════════════════════════════════════════════════════════════════════════

set -e

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'
CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'
info() { echo -e "${GREEN}[INFO]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }
ok()   { echo -e "${GREEN}  ✓${NC} $1"; }

# ── Config ────────────────────────────────────────────────────────────────
REPO_URL="https://github.com/hendrax5/wms.git"
INSTALL_DIR="${WMS_DIR:-/opt/wms}"
APP_PORT="${APP_PORT:-3000}"

# ── Banner ────────────────────────────────────────────────────────────────
clear 2>/dev/null || true
echo ""
echo -e "${BOLD}  WMS-2026 — Warehouse & Asset Management System${NC}"
echo "══════════════════════════════════════════════════"
echo ""

# ── Deteksi mode: install baru atau update ────────────────────────────────
MODE=""
if [ -d "$INSTALL_DIR/.git" ]; then
    echo -e "  Instalasi WMS terdeteksi di ${CYAN}$INSTALL_DIR${NC}"
    echo ""
    echo "  Pilih aksi:"
    echo -e "    ${BOLD}1)${NC} 🔄 Update — pull kode terbaru & rebuild"
    echo -e "    ${BOLD}2)${NC} 🆕 Install Baru — hapus semua data & install ulang"
    echo -e "    ${BOLD}3)${NC} ❌ Batal"
    echo ""
    read -p "  Pilihan [1/2/3]: " CHOICE
    case "$CHOICE" in
        1) MODE="update" ;;
        2) MODE="fresh" ;;
        *) echo ""; info "Dibatalkan."; exit 0 ;;
    esac
else
    MODE="fresh"
fi

echo ""

# ═══════════════════════════════════════════════════════════════════════════
#  Step 1: Cek & upgrade Docker Compose
# ═══════════════════════════════════════════════════════════════════════════
info "Memeriksa Docker..."
command -v docker >/dev/null 2>&1 || error "Docker tidak terinstall. Install Docker terlebih dahulu."

COMPOSE_CMD=""
if docker compose version >/dev/null 2>&1; then
    COMPOSE_CMD="docker compose"
    ok "Docker Compose v2 ditemukan"
elif command -v docker-compose >/dev/null 2>&1; then
    COMPOSE_VERSION=$(docker-compose version --short 2>/dev/null | cut -d. -f1)
    if [ "$COMPOSE_VERSION" = "1" ]; then
        warn "docker-compose v1 terdeteksi (versi lama, ada bug ContainerConfig)"
        info "Menginstall Docker Compose v2 plugin..."

        mkdir -p /usr/local/lib/docker/cli-plugins
        curl -fsSL "https://github.com/docker/compose/releases/download/v2.24.5/docker-compose-$(uname -s)-$(uname -m)" \
            -o /usr/local/lib/docker/cli-plugins/docker-compose
        chmod +x /usr/local/lib/docker/cli-plugins/docker-compose

        COMPOSE_CMD="docker compose"
        ok "Docker Compose v2 berhasil diinstall"
    else
        COMPOSE_CMD="docker-compose"
        ok "Docker Compose ditemukan"
    fi
else
    error "Docker Compose tidak ditemukan. Install Docker terlebih dahulu."
fi

# ═══════════════════════════════════════════════════════════════════════════
#  Step 2: Handle mode (fresh / update)
# ═══════════════════════════════════════════════════════════════════════════

if [ "$MODE" = "fresh" ]; then
    # ── Fresh Install ─────────────────────────────────────────────────────

    # Hapus container & volume lama jika ada
    if docker ps -a --format '{{.Names}}' | grep -q "wms-app\|wms-db"; then
        warn "Menghapus container lama..."
        $COMPOSE_CMD -f "$INSTALL_DIR/docker-compose.yml" down -v 2>/dev/null || true
        docker rm -f wms-app wms-db 2>/dev/null || true
    fi

    # Hapus instalasi lama jika ada (kecuali .env untuk preserve config)
    if [ -d "$INSTALL_DIR" ]; then
        # Backup .env jika ada
        if [ -f "$INSTALL_DIR/.env" ]; then
            cp "$INSTALL_DIR/.env" /tmp/wms_env_backup 2>/dev/null || true
            info "Backup .env lama ke /tmp/wms_env_backup"
        fi
        rm -rf "$INSTALL_DIR"
    fi

    info "Mengkloning repo ke $INSTALL_DIR ..."
    git clone "$REPO_URL" "$INSTALL_DIR"

    # Restore .env backup jika ada
    if [ -f /tmp/wms_env_backup ]; then
        cp /tmp/wms_env_backup "$INSTALL_DIR/.env"
        ok "Restored .env dari backup"
        rm -f /tmp/wms_env_backup
    fi

elif [ "$MODE" = "update" ]; then
    # ── Update ────────────────────────────────────────────────────────────
    info "Pulling kode terbaru..."
    git -C "$INSTALL_DIR" pull origin main
    ok "Kode berhasil diupdate"
fi

cd "$INSTALL_DIR"

# ═══════════════════════════════════════════════════════════════════════════
#  Step 3: Generate .env jika belum ada
# ═══════════════════════════════════════════════════════════════════════════

if [ ! -f ".env" ]; then
    echo ""
    info "File .env belum ada, membuat konfigurasi production..."
    echo ""

    # Generate random secrets
    AUTH_SECRET=$(openssl rand -base64 32 2>/dev/null || head -c 32 /dev/urandom | base64)
    DB_PASSWORD=$(openssl rand -hex 16 2>/dev/null || head -c 16 /dev/urandom | xxd -p)

    # ── Admin User ─────────────────────────────────────────────
    echo -e "  ${BOLD}Setup Admin User${NC}"
    echo ""

    read -p "  Username admin [admin]: " INPUT_ADMIN_USER
    ADMIN_USER="${INPUT_ADMIN_USER:-admin}"

    ADMIN_PASS=""
    while [ -z "$ADMIN_PASS" ]; do
        echo ""
        read -sp "  Password admin (min 6 karakter): " INPUT_ADMIN_PASS
        echo ""
        if [ ${#INPUT_ADMIN_PASS} -lt 6 ]; then
            warn "Password minimal 6 karakter, coba lagi."
        else
            read -sp "  Konfirmasi password: " INPUT_ADMIN_PASS2
            echo ""
            if [ "$INPUT_ADMIN_PASS" != "$INPUT_ADMIN_PASS2" ]; then
                warn "Password tidak cocok, coba lagi."
            else
                ADMIN_PASS="$INPUT_ADMIN_PASS"
            fi
        fi
    done

    ok "Admin: $ADMIN_USER"
    echo ""

    # ── Port ──────────────────────────────────────────────────
    read -p "  Port aplikasi [${APP_PORT}]: " INPUT_PORT
    APP_PORT="${INPUT_PORT:-$APP_PORT}"

    # ── MySQL Password ────────────────────────────────────────
    echo ""
    echo -e "  MySQL root password (kosongkan untuk auto-generate):"
    read -sp "  Password: " INPUT_DB_PASS
    echo ""
    if [ -n "$INPUT_DB_PASS" ]; then
        DB_PASSWORD="$INPUT_DB_PASS"
    fi

    # Tulis .env
    cat > .env <<EOF
# ═══════════════════════════════════════════════════════════════
# WMS-2026 — Production Environment
# Generated: $(date '+%Y-%m-%d %H:%M:%S')
# ═══════════════════════════════════════════════════════════════

# ── Database ──────────────────────────────────────────────────
DATABASE_URL=mysql://root:${DB_PASSWORD}@wms-db:3306/wms_2026
MYSQL_ROOT_PASSWORD=${DB_PASSWORD}
MYSQL_DATABASE=wms_2026

# ── Auth ──────────────────────────────────────────────────────
AUTH_SECRET=${AUTH_SECRET}
AUTH_TRUST_HOST=1

# ── App ───────────────────────────────────────────────────────
NODE_ENV=production
APP_PORT=${APP_PORT}

# ── Seed (dipakai saat pertama kali boot) ─────────────────────
SEED_ADMIN_USERNAME=${ADMIN_USER}
SEED_ADMIN_PASSWORD=${ADMIN_PASS}
EOF

    ok "File .env berhasil dibuat"
    echo ""
    echo -e "  ${YELLOW}Konfigurasi tersimpan:${NC}"
    echo "    Database Password : ${DB_PASSWORD}"
    echo "    App Port          : ${APP_PORT}"
    echo ""
else
    ok "File .env sudah ada, menggunakan konfigurasi existing"

    # Baca APP_PORT dari .env jika ada
    ENV_PORT=$(grep -E "^APP_PORT=" .env 2>/dev/null | cut -d= -f2)
    if [ -n "$ENV_PORT" ]; then
        APP_PORT="$ENV_PORT"
    fi
fi

# ═══════════════════════════════════════════════════════════════════════════
#  Step 4: Generate docker-compose.yml (uses env_file for safe value passing)
# ═══════════════════════════════════════════════════════════════════════════

# Baca APP_PORT dari .env (hanya untuk port mapping)
ENV_APP_PORT=$(grep -E "^APP_PORT=" .env 2>/dev/null | cut -d= -f2)
APP_PORT="${ENV_APP_PORT:-3000}"

cat > docker-compose.yml <<COMPOSE_EOF
# ─────────────────────────────────────────────────────────────────────────────
# WMS-2026 — Docker Compose (auto-generated by install.sh)
# ─────────────────────────────────────────────────────────────────────────────

services:
  wms-app:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: wms-app
    restart: always
    ports:
      - "${APP_PORT}:3000"
    env_file: .env
    environment:
      - AUTH_TRUST_HOST=1
    depends_on:
      wms-db:
        condition: service_healthy

  wms-db:
    image: mysql:8.0
    container_name: wms-db
    restart: always
    env_file: .env
    volumes:
      - wms_db_data:/var/lib/mysql
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      interval: 10s
      timeout: 10s
      retries: 10
      start_period: 60s

volumes:
  wms_db_data:
    driver: local
COMPOSE_EOF

ok "docker-compose.yml updated"

# ═══════════════════════════════════════════════════════════════════════════
#  Step 5: Build & Run
# ═══════════════════════════════════════════════════════════════════════════
echo ""
info "Membangun image dan menjalankan container..."
$COMPOSE_CMD up -d --build

# ═══════════════════════════════════════════════════════════════════════════
#  Step 6: Tunggu app siap
# ═══════════════════════════════════════════════════════════════════════════
echo ""
info "Menunggu aplikasi siap..."
ELAPSED=0
until curl -sf "http://localhost:${APP_PORT}/api/health" >/dev/null 2>&1; do
    [ $ELAPSED -ge 180 ] && { warn "Timeout setelah 3 menit. Cek log: $COMPOSE_CMD logs wms-app"; break; }
    printf "."
    sleep 3
    ELAPSED=$((ELAPSED + 3))
done
echo ""

# ═══════════════════════════════════════════════════════════════════════════
#  Step 7: Selesai
# ═══════════════════════════════════════════════════════════════════════════
LOCAL_IP=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "localhost")

# Baca kredensial dari .env untuk display
SHOW_USER=$(grep -E "^SEED_ADMIN_USERNAME=" .env 2>/dev/null | cut -d= -f2)
SHOW_PASS=$(grep -E "^SEED_ADMIN_PASSWORD=" .env 2>/dev/null | cut -d= -f2)
SHOW_USER="${SHOW_USER:-admin}"
SHOW_PASS="${SHOW_PASS:-!Tahun2026}"

echo ""
echo "══════════════════════════════════════════════════"

if [ "$MODE" = "fresh" ]; then
    ok "WMS berhasil diinstall!"
    echo ""
    echo -e "  🌐 Akses  : ${CYAN}http://${LOCAL_IP}:${APP_PORT}${NC}"
    echo ""
    echo -e "  ${BOLD}Login:${NC}"
    echo "    Username : ${SHOW_USER}"
    echo "    Password : ${SHOW_PASS}"
    echo ""
    echo -e "  ${YELLOW}⚠️  Segera ganti password setelah login pertama!${NC}"
else
    ok "WMS berhasil diupdate!"
    echo ""
    echo -e "  🌐 Akses  : ${CYAN}http://${LOCAL_IP}:${APP_PORT}${NC}"
fi

echo ""
echo "  Perintah berguna:"
echo "    Update    : cd $INSTALL_DIR && ./install.sh"
echo "    Log       : $COMPOSE_CMD -f $INSTALL_DIR/docker-compose.yml logs -f"
echo "    Stop      : $COMPOSE_CMD -f $INSTALL_DIR/docker-compose.yml down"
echo "    Backup DB : docker exec wms-db mysqldump -u root -p\$(grep MYSQL_ROOT_PASSWORD $INSTALL_DIR/.env | cut -d= -f2) wms_2026 > backup.sql"
echo "══════════════════════════════════════════════════"
echo ""
