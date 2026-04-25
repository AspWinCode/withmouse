#!/bin/bash
# ================================================================
# deploy.sh - Deploy "S myshkoy po zhizni" to VPS
# Domain: withmouse.tirskix.space
#
# Usage:
#   bash deploy.sh           - first deploy (full rebuild)
#   bash deploy.sh update    - pull code + restart, no DB wipe
# ================================================================
set -e

DOMAIN="withmouse.tirskix.space"
REPO_URL="https://github.com/AspWinCode/withmouse.git"
APP_DIR="/opt/mouse"
COMPOSE="docker compose"
COMPOSE_FILES="-f docker-compose.yml -f docker-compose.prod.yml"

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; BLUE='\033[0;34m'; NC='\033[0m'
log()  { echo -e "${GREEN}[OK]   $1${NC}"; }
warn() { echo -e "${YELLOW}[WARN] $1${NC}"; }
err()  { echo -e "${RED}[ERR]  $1${NC}"; exit 1; }
info() { echo -e "${BLUE}[INFO] $1${NC}"; }

echo "=============================================="
echo "  S myshkoy po zhizni - Production Deploy"
echo "  Domain: ${DOMAIN}"
echo "=============================================="

# -- 0. Must be root
[ "$EUID" -ne 0 ] && err "Run as root: sudo bash deploy.sh"

# -- 1. System deps
log "Checking system dependencies..."
apt-get update -qq
apt-get install -y -qq curl git openssl

# -- 2. Docker
if ! command -v docker &>/dev/null; then
  log "Installing Docker..."
  curl -fsSL https://get.docker.com | sh
  systemctl enable --now docker
else
  log "Docker OK: $(docker --version | cut -d' ' -f3 | tr -d ',')"
fi
if ! docker compose version &>/dev/null 2>&1; then
  apt-get install -y -qq docker-compose-plugin
fi

# -- 3. Find Caddy (port 2019 = Caddy admin API)
log "Detecting Caddy container..."
CADDY_CONTAINER=""
for cname in $(docker ps --format '{{.Names}}'); do
  plist=$(docker inspect "$cname" --format \
    '{{range $p,$b := .NetworkSettings.Ports}}{{$p}} {{end}}' 2>/dev/null || true)
  if echo "$plist" | grep -q "2019/tcp"; then
    CADDY_CONTAINER="$cname"
    break
  fi
done
[ -z "$CADDY_CONTAINER" ] && err "Caddy not found (no container with port 2019). Is learning-portal running?"
log "Caddy container: $CADDY_CONTAINER"

CADDY_NETWORK=$(docker inspect "$CADDY_CONTAINER" \
  --format '{{range $k,$v := .NetworkSettings.Networks}}{{$k}} {{end}}' \
  | tr ' ' '\n' | grep -v '^$' | head -1)
[ -z "$CADDY_NETWORK" ] && err "Could not determine Caddy Docker network."
log "Caddy network: $CADDY_NETWORK"

# -- 4. Code
if [ -d "$APP_DIR/.git" ]; then
  log "Pulling latest code..."
  cd "$APP_DIR"
  git fetch origin
  git reset --hard origin/main
else
  log "Cloning repository..."
  git clone "$REPO_URL" "$APP_DIR"
  cd "$APP_DIR"
fi
cd "$APP_DIR"

# -- 5. Write CADDY_NETWORK to project .env so compose picks it up automatically
# Docker Compose reads <project_dir>/.env automatically for variable substitution.
# We write CADDY_NETWORK there so we never need to prefix every compose command.
if [ -f "$APP_DIR/.env" ]; then
  # Update existing value
  if grep -q "^CADDY_NETWORK=" "$APP_DIR/.env"; then
    sed -i "s|^CADDY_NETWORK=.*|CADDY_NETWORK=${CADDY_NETWORK}|" "$APP_DIR/.env"
  else
    echo "CADDY_NETWORK=${CADDY_NETWORK}" >> "$APP_DIR/.env"
  fi
else
  echo "CADDY_NETWORK=${CADDY_NETWORK}" > "$APP_DIR/.env"
fi
log "CADDY_NETWORK=${CADDY_NETWORK} written to .env"

# -- 6. Generate backend secrets
if [ ! -f "$APP_DIR/backend/.env" ]; then
  log "Creating backend/.env with random secrets..."
  SECRET=$(openssl rand -hex 32)
  PGPASS=$(openssl rand -hex 16)
  cat > "$APP_DIR/backend/.env" <<ENVEOF
DATABASE_URL=postgresql://postgres:${PGPASS}@db:5432/mouse_db
POSTGRES_PASSWORD=${PGPASS}
SECRET_KEY=${SECRET}
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7
UPLOAD_DIR=/uploads
MAX_FILE_SIZE_MB=50
CORS_ORIGINS=["https://${DOMAIN}"]
ENVEOF
  log "backend/.env created"
else
  warn "backend/.env already exists — skipping (delete it to regenerate secrets)"
fi

# -- 7. Stop old containers cleanly (removes port locks, orphans, stale state)
log "Stopping any existing containers for this project..."
$COMPOSE $COMPOSE_FILES down --remove-orphans 2>/dev/null || true

# Also kill any lingering containers by name in case they're from another compose project
for cname in mouse_backend mouse_frontend mouse_db mouse_nginx mouse_certbot; do
  if docker ps -a --format '{{.Names}}' | grep -q "^${cname}$"; then
    warn "Removing stale container: $cname"
    docker rm -f "$cname" 2>/dev/null || true
  fi
done

# -- 8. Build images
if [ "$1" = "update" ]; then
  log "Building images (incremental, using cache)..."
  $COMPOSE $COMPOSE_FILES build
else
  log "Building images (no cache, first deploy)..."
  $COMPOSE $COMPOSE_FILES build --no-cache
fi

# -- 9. Start all services
log "Starting services..."
$COMPOSE $COMPOSE_FILES up -d --remove-orphans

# -- 10. Configure Caddy
log "Configuring Caddy virtual host for $DOMAIN..."

CADDY_BLOCK="
# === ${DOMAIN} added by deploy.sh ===
${DOMAIN} {
    encode gzip

    reverse_proxy /uploads/* mouse_backend:8000
    reverse_proxy /api/* mouse_backend:8000
    reverse_proxy * mouse_frontend:3000

    header /uploads/* {
        Cache-Control \"public, max-age=2592000, no-transform\"
    }
}
"

CADDYFILE_HOST=$(docker inspect "$CADDY_CONTAINER" \
  --format '{{range .Mounts}}{{if eq .Destination "/etc/caddy/Caddyfile"}}{{.Source}}{{end}}{{end}}' \
  2>/dev/null || true)

if [ -n "$CADDYFILE_HOST" ] && [ -f "$CADDYFILE_HOST" ]; then
  if grep -q "$DOMAIN" "$CADDYFILE_HOST"; then
    warn "$DOMAIN already present in Caddyfile — skipping"
  else
    log "Appending virtual host to $CADDYFILE_HOST"
    printf '%s\n' "$CADDY_BLOCK" >> "$CADDYFILE_HOST"
    log "Reloading Caddy..."
    docker exec "$CADDY_CONTAINER" caddy reload --config /etc/caddy/Caddyfile --force \
      && log "Caddy reloaded OK" \
      || warn "Caddy reload failed — try: docker restart $CADDY_CONTAINER"
  fi
else
  warn "Caddyfile not mounted from host — trying Caddy JSON API..."

  # Discover server key
  SERVERS_JSON=$(curl -s http://localhost:2019/config/apps/http/servers 2>/dev/null || echo "{}")
  if echo "$SERVERS_JSON" | grep -q '"srv0"'; then
    SERVER_KEY="srv0"
  else
    SERVER_KEY=$(echo "$SERVERS_JSON" | \
      python3 -c "import sys,json; d=json.load(sys.stdin); print(list(d.keys())[0])" \
      2>/dev/null || echo "srv0")
  fi

  ID="mouse_${DOMAIN//./_}"
  ROUTE="{\"@id\":\"${ID}\",\"match\":[{\"host\":[\"${DOMAIN}\"]}],\"handle\":[{\"handler\":\"subroute\",\"routes\":[{\"match\":[{\"path\":[\"/uploads/*\",\"/api/*\"]}],\"handle\":[{\"handler\":\"reverse_proxy\",\"upstreams\":[{\"dial\":\"mouse_backend:8000\"}]}]},{\"handle\":[{\"handler\":\"reverse_proxy\",\"upstreams\":[{\"dial\":\"mouse_frontend:3000\"}]}]}]}],\"terminal\":true}"

  RC=$(curl -s -o /dev/null -w "%{http_code}" \
    -X POST "http://localhost:2019/config/apps/http/servers/${SERVER_KEY}/routes" \
    -H "Content-Type: application/json" -d "$ROUTE" 2>/dev/null || echo "000")

  if [ "$RC" = "200" ]; then
    log "Route added via Caddy API (server=$SERVER_KEY)"
    warn "This config resets on Caddy restart. Add Caddyfile.snippet manually for persistence."
  else
    warn "Caddy API returned $RC"
    info "Manual step required:"
    info "  1. Add contents of $APP_DIR/Caddyfile.snippet to Caddy's Caddyfile"
    info "  2. Run: docker exec $CADDY_CONTAINER caddy reload --config /etc/caddy/Caddyfile"
  fi
fi

# -- 11. Seed database
log "Waiting for database to be ready..."
sleep 15

DB_USERS=$($COMPOSE $COMPOSE_FILES exec -T db \
  psql -U postgres -d mouse_db -tAc "SELECT COUNT(*) FROM users;" 2>/dev/null \
  | tr -d '[:space:]' || echo "0")

if [ "$DB_USERS" = "0" ] || [ -z "$DB_USERS" ]; then
  log "Seeding database with initial data..."
  sleep 5
  $COMPOSE $COMPOSE_FILES exec -T backend python seed.py && log "Seed complete"
else
  warn "Database already has ${DB_USERS} users — skipping seed"
fi

# -- 12. Health check
sleep 8
HC=$(curl -sk -o /dev/null -w "%{http_code}" "https://${DOMAIN}/api/health" || echo "000")
case "$HC" in
  200) log "Health check passed (HTTP 200)" ;;
  000) warn "Health check unreachable — Caddy may still be provisioning SSL (normal on first deploy)" ;;
  *)   warn "Health check returned HTTP $HC — check: $COMPOSE $COMPOSE_FILES logs backend" ;;
esac

# -- 13. Done
echo ""
echo "=============================================="
echo "  DEPLOY COMPLETE"
echo "  Site:    https://${DOMAIN}"
echo "  API:     https://${DOMAIN}/api/docs"
echo "  Network: ${CADDY_NETWORK}"
echo "----------------------------------------------"
echo "  Admin:   +79990000000 / admin123"
echo "  Student: +79991111111 / student123"
echo "----------------------------------------------"
echo "  Logs:   $COMPOSE $COMPOSE_FILES logs -f"
echo "  Update: bash deploy.sh update"
echo "=============================================="
