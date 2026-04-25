#!/bin/bash
# ================================================================
# deploy.sh - Deploy "S myshkoy po zhizni" to VPS
# Domain: withmouse.tirskix.space
#
# Usage:
#   bash deploy.sh           - first deploy
#   bash deploy.sh update    - update code without recreating DB
#
# Requires: Caddy already running on server (e.g. learning-portal).
# The script auto-detects Caddy, joins its Docker network,
# and adds a virtual host to the Caddyfile.
# ================================================================
set -e

DOMAIN="withmouse.tirskix.space"
REPO_URL="https://github.com/AspWinCode/withmouse.git"
APP_DIR="/opt/mouse"
COMPOSE="docker compose"
COMPOSE_FILES="-f docker-compose.yml -f docker-compose.prod.yml"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
log()  { echo -e "${GREEN}[OK] $1${NC}"; }
warn() { echo -e "${YELLOW}[WARN] $1${NC}"; }
err()  { echo -e "${RED}[ERR] $1${NC}"; exit 1; }
info() { echo -e "${BLUE}[INFO] $1${NC}"; }

echo ""
echo "=============================================="
echo "  S myshkoy po zhizni - Production Deploy"
echo "  Domain: ${DOMAIN}"
echo "=============================================="
echo ""

# -- 0. Check root
[ "$EUID" -ne 0 ] && err "Run as root: sudo bash deploy.sh"

# -- 1. System dependencies
log "Updating packages..."
apt-get update -qq && apt-get install -y -qq curl git openssl

# -- 2. Docker
if ! command -v docker &>/dev/null; then
  log "Installing Docker..."
  curl -fsSL https://get.docker.com | sh
  systemctl enable --now docker
  log "Docker installed"
else
  log "Docker: $(docker --version | cut -d' ' -f3 | tr -d ',')"
fi

if ! docker compose version &>/dev/null 2>&1; then
  log "Installing Docker Compose plugin..."
  apt-get install -y docker-compose-plugin
fi

# -- 3. Find Caddy container (identified by port 2019 = Caddy admin API)
log "Looking for Caddy on this server..."

CADDY_CONTAINER=""
for name in $(docker ps --format '{{.Names}}'); do
  ports=$(docker inspect "$name" --format '{{range $p,$b := .NetworkSettings.Ports}}{{$p}} {{end}}' 2>/dev/null || true)
  if echo "$ports" | grep -q "2019/tcp"; then
    CADDY_CONTAINER="$name"
    break
  fi
done

if [ -z "$CADDY_CONTAINER" ]; then
  err "Caddy not found. Make sure a Caddy container is running (port 2019 = Caddy admin API)."
fi
log "Found Caddy container: $CADDY_CONTAINER"

# Get Caddy's Docker network
export CADDY_NETWORK
CADDY_NETWORK=$(docker inspect "$CADDY_CONTAINER" \
  --format '{{range $k,$v := .NetworkSettings.Networks}}{{$k}} {{end}}' \
  | tr ' ' '\n' | grep -v '^$' | head -1)

if [ -z "$CADDY_NETWORK" ]; then
  err "Could not determine Caddy's Docker network."
fi
log "Caddy network: $CADDY_NETWORK"

# -- 4. Code
if [ -d "$APP_DIR/.git" ]; then
  log "Updating code from GitHub..."
  cd "$APP_DIR"
  git fetch origin
  git reset --hard origin/main
else
  log "Cloning repository..."
  git clone "$REPO_URL" "$APP_DIR"
fi
cd "$APP_DIR"

# -- 5. Generate .env
if [ ! -f "$APP_DIR/backend/.env" ]; then
  log "Creating backend/.env..."
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
  log ".env created with random SECRET_KEY and DB password"
else
  warn ".env already exists, skipping"
fi

# -- 6. Build images
log "Building Docker images (3-5 min)..."
CADDY_NETWORK="$CADDY_NETWORK" $COMPOSE $COMPOSE_FILES build --no-cache

# -- 7. Start services
log "Starting services..."
CADDY_NETWORK="$CADDY_NETWORK" $COMPOSE $COMPOSE_FILES up -d

# -- 8. Configure Caddy
log "Configuring Caddy for domain $DOMAIN..."

CADDY_BLOCK="
# === ${DOMAIN} (added by deploy.sh) ===
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

# Find Caddyfile host path via volume mount
CADDYFILE_HOST=$(docker inspect "$CADDY_CONTAINER" \
  --format '{{range .Mounts}}{{if eq .Destination "/etc/caddy/Caddyfile"}}{{.Source}}{{end}}{{end}}' 2>/dev/null || true)

if [ -n "$CADDYFILE_HOST" ] && [ -f "$CADDYFILE_HOST" ]; then
  if grep -q "$DOMAIN" "$CADDYFILE_HOST"; then
    warn "$DOMAIN already in Caddyfile, skipping"
  else
    log "Appending block to Caddyfile: $CADDYFILE_HOST"
    printf '%s\n' "$CADDY_BLOCK" >> "$CADDYFILE_HOST"
    log "Reloading Caddy..."
    if docker exec "$CADDY_CONTAINER" caddy reload --config /etc/caddy/Caddyfile --force; then
      log "Caddy reloaded successfully"
    else
      warn "Could not reload Caddy. Restart manually: docker restart $CADDY_CONTAINER"
    fi
  fi
else
  warn "Caddyfile not found as a volume-mount on host."
  info "Trying Caddy JSON API on port 2019..."

  SERVER_KEY="srv0"
  SERVERS=$(curl -s http://localhost:2019/config/apps/http/servers 2>/dev/null || true)
  if [ -n "$SERVERS" ] && ! echo "$SERVERS" | grep -q "srv0"; then
    SERVER_KEY=$(echo "$SERVERS" | python3 -c "import sys,json; d=json.load(sys.stdin); print(list(d.keys())[0])" 2>/dev/null || echo "srv0")
  fi

  ROUTE_JSON="{\"@id\":\"mouse_${DOMAIN//./_}\",\"match\":[{\"host\":[\"${DOMAIN}\"]}],\"handle\":[{\"handler\":\"subroute\",\"routes\":[{\"match\":[{\"path\":[\"/uploads/*\"]}],\"handle\":[{\"handler\":\"reverse_proxy\",\"upstreams\":[{\"dial\":\"mouse_backend:8000\"}]}]},{\"match\":[{\"path\":[\"/api/*\"]}],\"handle\":[{\"handler\":\"reverse_proxy\",\"upstreams\":[{\"dial\":\"mouse_backend:8000\"}]}]},{\"handle\":[{\"handler\":\"reverse_proxy\",\"upstreams\":[{\"dial\":\"mouse_frontend:3000\"}]}]}]}],\"terminal\":true}"

  HTTP_RESP=$(curl -s -o /dev/null -w "%{http_code}" \
    -X POST "http://localhost:2019/config/apps/http/servers/${SERVER_KEY}/routes" \
    -H "Content-Type: application/json" \
    -d "$ROUTE_JSON" 2>/dev/null || echo "000")

  if [ "$HTTP_RESP" = "200" ]; then
    log "Route added via Caddy API (server: $SERVER_KEY)"
    warn "NOTE: This config resets on Caddy container restart!"
    info "For persistence, manually add Caddyfile.snippet to Caddy's Caddyfile."
  else
    warn "API returned HTTP $HTTP_RESP"
    info "Manually add the block from $APP_DIR/Caddyfile.snippet to Caddy's config."
    info "Then run: docker exec $CADDY_CONTAINER caddy reload --config /etc/caddy/Caddyfile"
  fi
fi

# -- 9. Wait for DB and seed
log "Waiting for database..."
sleep 15

DB_USERS=$(CADDY_NETWORK="$CADDY_NETWORK" $COMPOSE $COMPOSE_FILES exec -T db \
  psql -U postgres -d mouse_db -tAc "SELECT COUNT(*) FROM users;" 2>/dev/null \
  | tr -d '[:space:]' || echo "0")

if [ "$DB_USERS" = "0" ] || [ -z "$DB_USERS" ]; then
  log "Seeding database..."
  sleep 5
  CADDY_NETWORK="$CADDY_NETWORK" $COMPOSE $COMPOSE_FILES exec -T backend python seed.py
  log "Seed done"
else
  warn "DB already has ${DB_USERS} users, skipping seed"
fi

# -- 10. Health check
sleep 10
HTTP_CODE=$(curl -sk -o /dev/null -w "%{http_code}" "https://${DOMAIN}/api/health" || echo "000")
if [ "$HTTP_CODE" = "200" ]; then
  log "Health check passed"
elif [ "$HTTP_CODE" = "000" ]; then
  warn "Health check unreachable - SSL may still be provisioning (Caddy does it automatically)"
else
  warn "Health check returned ${HTTP_CODE} - check logs: $COMPOSE $COMPOSE_FILES logs backend"
fi

# -- 11. Summary
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
echo "  Logs:    $COMPOSE $COMPOSE_FILES logs -f"
echo "  Update:  bash deploy.sh update"
echo "=============================================="
echo ""
