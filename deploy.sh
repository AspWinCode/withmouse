#!/bin/bash
# ================================================================
# deploy.sh — Деплой «С мышкой по жизни» на VPS
# Домен: withmouse.tirskix.space
#
# Использование:
#   bash deploy.sh           — первый деплой
#   bash deploy.sh update    — обновить код без пересоздания БД
# ================================================================
set -e

DOMAIN="withmouse.tirskix.space"
EMAIL="admin@${DOMAIN}"          # ← можно изменить на свой email
REPO_URL="https://github.com/AspWinCode/withmouse.git"
APP_DIR="/opt/mouse"
COMPOSE="docker compose"
COMPOSE_FILES="-f docker-compose.yml -f docker-compose.prod.yml"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
log()  { echo -e "${GREEN}✅ $1${NC}"; }
warn() { echo -e "${YELLOW}⚠️  $1${NC}"; }
err()  { echo -e "${RED}❌ $1${NC}"; exit 1; }

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║     С мышкой по жизни — Production Deploy    ║"
echo "║     Домен: ${DOMAIN}          ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

# ── 0. Проверяем root ──────────────────────────────────────
[ "$EUID" -ne 0 ] && err "Запустите скрипт от root: sudo bash deploy.sh"

# ── 1. Зависимости системы ────────────────────────────────
log "Обновляю пакеты..."
apt-get update -qq && apt-get install -y -qq curl git openssl

# ── 2. Docker ─────────────────────────────────────────────
if ! command -v docker &>/dev/null; then
  log "Устанавливаю Docker..."
  curl -fsSL https://get.docker.com | sh
  systemctl enable --now docker
  log "Docker установлен"
else
  log "Docker: $(docker --version | cut -d' ' -f3 | tr -d ',')"
fi

if ! docker compose version &>/dev/null 2>&1; then
  log "Устанавливаю Docker Compose plugin..."
  apt-get install -y docker-compose-plugin
fi

# ── 3. Код ────────────────────────────────────────────────
if [ -d "$APP_DIR/.git" ]; then
  log "Обновляю код из GitHub..."
  cd "$APP_DIR"
  git fetch origin
  git reset --hard origin/main
  git pull origin main
else
  log "Клонирую репозиторий..."
  git clone "$REPO_URL" "$APP_DIR"
  cd "$APP_DIR"
fi
cd "$APP_DIR"

# ── 4. Генерируем .env ────────────────────────────────────
if [ ! -f "$APP_DIR/backend/.env" ]; then
  log "Создаю backend/.env..."
  SECRET=$(openssl rand -hex 32)
  PGPASS=$(openssl rand -hex 16)
  cat > "$APP_DIR/backend/.env" <<EOF
DATABASE_URL=postgresql://postgres:${PGPASS}@db:5432/mouse_db
SECRET_KEY=${SECRET}
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7
UPLOAD_DIR=/uploads
MAX_FILE_SIZE_MB=50
CORS_ORIGINS=["https://${DOMAIN}"]
EOF
  # Записываем пароль в docker-compose.prod.yml env
  sed -i "s/postgres_strong_pass/${PGPASS}/g" "$APP_DIR/docker-compose.prod.yml" 2>/dev/null || true
  log ".env создан (SECRET_KEY и пароль БД — случайные)"
else
  warn ".env уже существует, пропускаю"
fi

# ── 5. Создаём том для сертификатов ───────────────────────
docker volume create mouse_certbot_www 2>/dev/null || true
docker volume create mouse_certbot_certs 2>/dev/null || true

# ── 6. Сборка образов ────────────────────────────────────
log "Собираю Docker-образы (это может занять 3-5 минут)..."
$COMPOSE $COMPOSE_FILES build --no-cache

# ── 7. Первый запуск с временным nginx (без SSL) ─────────
log "Запускаю временный nginx для получения SSL-сертификата..."

# Запускаем только nginx с init-конфигом
cp "$APP_DIR/nginx/nginx.init.conf" "$APP_DIR/nginx/nginx.current.conf"
docker run -d --name nginx_init \
  -p 80:80 \
  -v "$APP_DIR/nginx/nginx.init.conf:/etc/nginx/conf.d/default.conf:ro" \
  -v mouse_certbot_www:/var/www/certbot \
  nginx:alpine 2>/dev/null || warn "nginx_init уже запущен"

sleep 3

# ── 8. Получаем SSL-сертификат ────────────────────────────
CERT_EXISTS=$(docker run --rm \
  -v mouse_certbot_certs:/etc/letsencrypt \
  certbot/certbot certificates 2>/dev/null | grep -c "$DOMAIN" || echo 0)

if [ "$CERT_EXISTS" = "0" ]; then
  log "Получаю SSL-сертификат от Let's Encrypt..."
  docker run --rm \
    -v mouse_certbot_www:/var/www/certbot \
    -v mouse_certbot_certs:/etc/letsencrypt \
    certbot/certbot certonly \
      --webroot \
      --webroot-path=/var/www/certbot \
      --email "$EMAIL" \
      --agree-tos \
      --no-eff-email \
      -d "$DOMAIN" \
    && log "SSL-сертификат получен!" \
    || err "Не удалось получить SSL-сертификат. Убедитесь, что DNS ${DOMAIN} → IP этого сервера."
else
  log "SSL-сертификат уже существует"
fi

# Останавливаем временный nginx
docker stop nginx_init && docker rm nginx_init 2>/dev/null || true

# ── 9. Полный запуск всех сервисов ───────────────────────
log "Запускаю все сервисы..."
$COMPOSE $COMPOSE_FILES up -d

log "Жду готовности базы данных..."
sleep 15

# ── 10. Seed ─────────────────────────────────────────────
DB_USERS=$($COMPOSE exec -T db psql -U postgres -d mouse_db -tAc \
  "SELECT COUNT(*) FROM users;" 2>/dev/null | tr -d '[:space:]' || echo "0")

if [ "$DB_USERS" = "0" ] || [ -z "$DB_USERS" ]; then
  log "Заполняю базу данных начальными данными..."
  sleep 5
  $COMPOSE exec -T backend python seed.py
  log "Seed выполнен"
else
  warn "В базе уже есть ${DB_USERS} пользователей, seed пропущен"
fi

# ── 11. Проверка ──────────────────────────────────────────
sleep 5
HTTP_CODE=$(curl -sk -o /dev/null -w "%{http_code}" "https://${DOMAIN}/api/health" || echo "000")
if [ "$HTTP_CODE" = "200" ]; then
  log "Health check прошёл ✓"
else
  warn "Health check вернул ${HTTP_CODE} — проверьте: docker compose logs backend"
fi

# ── 12. Итог ─────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║                 🚀 ДЕПЛОЙ ЗАВЕРШЁН                   ║"
echo "╠══════════════════════════════════════════════════════╣"
printf "║  🌐 Сайт:    https://%-33s║\n" "${DOMAIN}"
printf "║  📖 API:     https://${DOMAIN}/api/docs%-6s║\n" ""
echo "╠══════════════════════════════════════════════════════╣"
echo "║  👤 Admin:   +79990000000  /  admin123               ║"
echo "║  👤 Student: +79991111111  /  student123             ║"
echo "╠══════════════════════════════════════════════════════╣"
echo "║  📋 Логи:    docker compose logs -f                  ║"
echo "║  🔄 Обновить: bash deploy.sh update                  ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""
