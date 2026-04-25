#!/bin/bash
# ================================================================
# deploy.sh — Деплой «С мышкой по жизни» на VPS
# Домен: withmouse.tirskix.space
#
# Использование:
#   bash deploy.sh           — первый деплой
#   bash deploy.sh update    — обновить код без пересоздания БД
#
# Требования: на сервере уже работает Caddy (например learning-portal).
# Скрипт автоматически найдёт Caddy, подключит наши контейнеры
# к его Docker-сети и добавит виртуальный хост в Caddyfile.
# ================================================================
set -e

DOMAIN="withmouse.tirskix.space"
REPO_URL="https://github.com/AspWinCode/withmouse.git"
APP_DIR="/opt/mouse"
COMPOSE="docker compose"
COMPOSE_FILES="-f docker-compose.yml -f docker-compose.prod.yml"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
log()  { echo -e "${GREEN}✅ $1${NC}"; }
warn() { echo -e "${YELLOW}⚠️  $1${NC}"; }
err()  { echo -e "${RED}❌ $1${NC}"; exit 1; }
info() { echo -e "${BLUE}ℹ️  $1${NC}"; }

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

# ── 3. Находим Caddy ──────────────────────────────────────
log "Ищу Caddy на сервере..."

# Caddy слушает порт 2019 (admin API) — по нему и определяем
CADDY_CONTAINER=$(docker ps --format '{{.Names}}' | while read name; do
  ports=$(docker inspect "$name" --format '{{range $p,$b := .NetworkSettings.Ports}}{{$p}} {{end}}' 2>/dev/null || echo "")
  if echo "$ports" | grep -q "2019/tcp"; then
    echo "$name"
    break
  fi
done)

if [ -z "$CADDY_CONTAINER" ]; then
  err "Caddy не найден. Убедитесь, что контейнер с Caddy запущен (порт 2019 = Caddy admin API)."
fi
log "Caddy контейнер: $CADDY_CONTAINER"

# Получаем первую сеть Caddy (обычно это learning-portal_default или подобное)
export CADDY_NETWORK=$(docker inspect "$CADDY_CONTAINER" \
  --format '{{range $k,$v := .NetworkSettings.Networks}}{{$k}} {{end}}' \
  | tr ' ' '\n' | grep -v '^$' | head -1)

if [ -z "$CADDY_NETWORK" ]; then
  err "Не удалось определить Docker-сеть Caddy."
fi
log "Caddy сеть: $CADDY_NETWORK"

# ── 4. Код ────────────────────────────────────────────────
if [ -d "$APP_DIR/.git" ]; then
  if [ "$1" = "update" ]; then
    log "Обновляю код из GitHub..."
    cd "$APP_DIR"
    git fetch origin
    git reset --hard origin/main
  else
    log "Репозиторий уже существует, обновляю..."
    cd "$APP_DIR"
    git fetch origin
    git reset --hard origin/main
  fi
else
  log "Клонирую репозиторий..."
  git clone "$REPO_URL" "$APP_DIR"
  cd "$APP_DIR"
fi
cd "$APP_DIR"

# ── 5. Генерируем .env ────────────────────────────────────
if [ ! -f "$APP_DIR/backend/.env" ]; then
  log "Создаю backend/.env..."
  SECRET=$(openssl rand -hex 32)
  PGPASS=$(openssl rand -hex 16)
  cat > "$APP_DIR/backend/.env" <<EOF
DATABASE_URL=postgresql://postgres:${PGPASS}@db:5432/mouse_db
POSTGRES_PASSWORD=${PGPASS}
SECRET_KEY=${SECRET}
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7
UPLOAD_DIR=/uploads
MAX_FILE_SIZE_MB=50
CORS_ORIGINS=["https://${DOMAIN}"]
EOF
  log ".env создан (SECRET_KEY и пароль БД — случайные)"
else
  warn ".env уже существует, пропускаю"
fi

# Обновляем пароль БД в docker-compose.yml если нужно
PGPASS_ACTUAL=$(grep POSTGRES_PASSWORD "$APP_DIR/backend/.env" | cut -d= -f2)
if [ -n "$PGPASS_ACTUAL" ]; then
  sed -i "s/postgres_password/${PGPASS_ACTUAL}/g" "$APP_DIR/docker-compose.yml" 2>/dev/null || true
fi

# ── 6. Сборка образов ────────────────────────────────────
log "Собираю Docker-образы (это может занять 3-5 минут)..."
CADDY_NETWORK="$CADDY_NETWORK" $COMPOSE $COMPOSE_FILES build --no-cache

# ── 7. Запуск сервисов ───────────────────────────────────
log "Запускаю сервисы..."
CADDY_NETWORK="$CADDY_NETWORK" $COMPOSE $COMPOSE_FILES up -d

# ── 8. Настройка Caddy ───────────────────────────────────
log "Настраиваю Caddy для домена $DOMAIN..."

# Находим Caddyfile внутри контейнера / на хосте
CADDYFILE_HOST=$(docker inspect "$CADDY_CONTAINER" \
  --format '{{range .Mounts}}{{if eq .Destination "/etc/caddy/Caddyfile"}}{{.Source}}{{end}}{{end}}' 2>/dev/null || echo "")

CADDY_BLOCK="
# === withmouse.tirskix.space (добавлено deploy.sh) ===
withmouse.tirskix.space {
    encode gzip

    reverse_proxy /uploads/* mouse_backend:8000
    reverse_proxy /api/* mouse_backend:8000
    reverse_proxy * mouse_frontend:3000

    header /uploads/* {
        Cache-Control \"public, max-age=2592000, no-transform\"
    }
}
"

if [ -n "$CADDYFILE_HOST" ] && [ -f "$CADDYFILE_HOST" ]; then
  # Caddyfile смонтирован из хоста
  if grep -q "withmouse.tirskix.space" "$CADDYFILE_HOST"; then
    warn "withmouse.tirskix.space уже есть в Caddyfile, пропускаю"
  else
    log "Добавляю блок в Caddyfile: $CADDYFILE_HOST"
    echo "$CADDY_BLOCK" >> "$CADDYFILE_HOST"
    log "Перезагружаю Caddy..."
    docker exec "$CADDY_CONTAINER" caddy reload --config /etc/caddy/Caddyfile --force \
      && log "Caddy перезагружен" \
      || warn "Не удалось перезагрузить Caddy — перезапустите вручную: docker restart $CADDY_CONTAINER"
  fi
else
  # Caddyfile не смонтирован из хоста — пробуем через API (эфемерно, сбросится при рестарте)
  warn "Caddyfile не найден как volume-mount на хосте."
  info "Пробую добавить через Caddy JSON API (до рестарта контейнера)..."

  # Определяем имена серверов в Caddy
  SERVERS=$(curl -s http://localhost:2019/config/apps/http/servers 2>/dev/null || echo "{}")

  if echo "$SERVERS" | grep -q "srv0"; then
    SERVER_KEY="srv0"
  else
    SERVER_KEY=$(echo "$SERVERS" | python3 -c "import sys,json; d=json.load(sys.stdin); print(list(d.keys())[0])" 2>/dev/null || echo "srv0")
  fi

  ROUTE_JSON=$(cat <<'JSONEOF'
{
  "@id": "withmouse_tirskix_space",
  "match": [{"host": ["withmouse.tirskix.space"]}],
  "handle": [
    {
      "handler": "subroute",
      "routes": [
        {
          "match": [{"path": ["/uploads/*"]}],
          "handle": [{"handler": "reverse_proxy", "upstreams": [{"dial": "mouse_backend:8000"}]}]
        },
        {
          "match": [{"path": ["/api/*"]}],
          "handle": [{"handler": "reverse_proxy", "upstreams": [{"dial": "mouse_backend:8000"}]}]
        },
        {
          "handle": [{"handler": "reverse_proxy", "upstreams": [{"dial": "mouse_frontend:3000"}]}]
        }
      ]
    }
  ],
  "terminal": true
}
JSONEOF
)

  HTTP_RESP=$(curl -s -o /dev/null -w "%{http_code}" \
    -X POST "http://localhost:2019/config/apps/http/servers/${SERVER_KEY}/routes" \
    -H "Content-Type: application/json" \
    -d "$ROUTE_JSON" 2>/dev/null || echo "000")

  if [ "$HTTP_RESP" = "200" ]; then
    log "Маршрут добавлен через Caddy API (сервер: $SERVER_KEY)"
    warn "ВАЖНО: Эта конфигурация сбросится при перезапуске Caddy!"
    info "Для постоянства — вручную добавьте блок из Caddyfile.snippet в Caddyfile Caddy."
  else
    warn "Не удалось добавить через API (код: $HTTP_RESP)"
    info "Вручную добавьте содержимое Caddyfile.snippet в конфиг Caddy и перезагрузите его."
    info "Файл: $APP_DIR/Caddyfile.snippet"
    info "Сеть: добавьте mouse_backend и mouse_frontend в сеть $CADDY_NETWORK"
  fi
fi

# ── 9. Ждём БД и делаем seed ─────────────────────────────
log "Жду готовности базы данных..."
sleep 15

DB_USERS=$(CADDY_NETWORK="$CADDY_NETWORK" $COMPOSE $COMPOSE_FILES exec -T db \
  psql -U postgres -d mouse_db -tAc "SELECT COUNT(*) FROM users;" 2>/dev/null \
  | tr -d '[:space:]' || echo "0")

if [ "$DB_USERS" = "0" ] || [ -z "$DB_USERS" ]; then
  log "Заполняю базу данных начальными данными..."
  sleep 5
  CADDY_NETWORK="$CADDY_NETWORK" $COMPOSE $COMPOSE_FILES exec -T backend python seed.py
  log "Seed выполнен"
else
  warn "В базе уже есть ${DB_USERS} пользователей, seed пропущен"
fi

# ── 10. Проверка ─────────────────────────────────────────
sleep 10
HTTP_CODE=$(curl -sk -o /dev/null -w "%{http_code}" "https://${DOMAIN}/api/health" || echo "000")
if [ "$HTTP_CODE" = "200" ]; then
  log "Health check прошёл ✓"
elif [ "$HTTP_CODE" = "000" ]; then
  warn "Health check недоступен — SSL ещё не получен или DNS не настроен"
  info "Caddy получит SSL автоматически при первом запросе к домену"
else
  warn "Health check вернул ${HTTP_CODE} — проверьте: $COMPOSE $COMPOSE_FILES logs backend"
fi

# ── 11. Итог ─────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║                 🚀 ДЕПЛОЙ ЗАВЕРШЁН                   ║"
echo "╠══════════════════════════════════════════════════════╣"
printf "║  🌐 Сайт:    https://%-33s║\n" "${DOMAIN}"
printf "║  📖 API:     https://${DOMAIN}/api/docs      ║\n"
echo "╠══════════════════════════════════════════════════════╣"
echo "║  Сеть Caddy: ${CADDY_NETWORK}"
echo "╠══════════════════════════════════════════════════════╣"
echo "║  👤 Admin:   +79990000000  /  admin123               ║"
echo "║  👤 Student: +79991111111  /  student123             ║"
echo "╠══════════════════════════════════════════════════════╣"
echo "║  📋 Логи:    docker compose -f docker-compose.yml \  ║"
echo "║              -f docker-compose.prod.yml logs -f      ║"
echo "║  🔄 Обновить: bash deploy.sh update                  ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""
