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

# -- 5. Generate backend secrets
# Strip any \r (CRLF) from the env file if it already exists — git on Windows
# stores shell scripts with CRLF, heredoc output on Linux may inherit \r chars.
strip_cr() { sed -i 's/\r//' "$1" 2>/dev/null || true; }

if [ ! -f "$APP_DIR/backend/.env" ]; then
  log "Creating backend/.env with random secrets..."
  SECRET=$(openssl rand -hex 32)
  PGPASS=$(openssl rand -hex 16)
  # Use printf to guarantee LF-only line endings regardless of script encoding
  printf 'DATABASE_URL=postgresql://postgres:%s@db:5432/mouse_db\n' "$PGPASS" > "$APP_DIR/backend/.env"
  printf 'POSTGRES_PASSWORD=%s\n' "$PGPASS"   >> "$APP_DIR/backend/.env"
  printf 'SECRET_KEY=%s\n'        "$SECRET"   >> "$APP_DIR/backend/.env"
  printf 'ALGORITHM=HS256\n'                  >> "$APP_DIR/backend/.env"
  printf 'ACCESS_TOKEN_EXPIRE_MINUTES=30\n'   >> "$APP_DIR/backend/.env"
  printf 'REFRESH_TOKEN_EXPIRE_DAYS=7\n'      >> "$APP_DIR/backend/.env"
  printf 'UPLOAD_DIR=/uploads\n'              >> "$APP_DIR/backend/.env"
  printf 'MAX_FILE_SIZE_MB=50\n'              >> "$APP_DIR/backend/.env"
  printf 'CORS_ORIGINS=["https://%s"]\n' "$DOMAIN" >> "$APP_DIR/backend/.env"
  log "backend/.env created"
else
  warn "backend/.env already exists — skipping regeneration"
  # Always strip \r in case the file was previously written with CRLF
  strip_cr "$APP_DIR/backend/.env"

  # Backward-compat: old backend/.env may lack POSTGRES_PASSWORD line.
  if ! grep -q "^POSTGRES_PASSWORD=" "$APP_DIR/backend/.env"; then
    PGPASS_DERIVED=$(grep "^DATABASE_URL=" "$APP_DIR/backend/.env" \
      | sed 's|.*://[^:]*:\([^@]*\)@.*|\1|' | tr -d '\r')
    if [ -n "$PGPASS_DERIVED" ]; then
      printf 'POSTGRES_PASSWORD=%s\n' "$PGPASS_DERIVED" >> "$APP_DIR/backend/.env"
      warn "Added missing POSTGRES_PASSWORD to backend/.env (derived from DATABASE_URL)"
    else
      err "Cannot determine POSTGRES_PASSWORD. Delete backend/.env and re-run."
    fi
  fi
fi

# -- 6. Write project .env — single source of truth for compose variable substitution.
# docker-compose.prod.yml references ${POSTGRES_PASSWORD}, ${DATABASE_URL}, ${SECRET_KEY},
# ${CADDY_NETWORK}. All must be in project .env for compose to resolve them correctly.

write_env_var() {
  local key="$1" val="$2" file="$3"
  if grep -q "^${key}=" "$file" 2>/dev/null; then
    sed -i "s|^${key}=.*|${key}=${val}|" "$file"
  else
    printf '%s=%s\n' "$key" "$val" >> "$file"
  fi
}

# Read values and strip any accidental \r (CRLF artefact)
PGPASS_CURRENT=$(grep "^POSTGRES_PASSWORD=" "$APP_DIR/backend/.env" | cut -d= -f2 | tr -d '\r')
DBURL_CURRENT=$(grep  "^DATABASE_URL="      "$APP_DIR/backend/.env" | cut -d= -f2- | tr -d '\r')
SECRET_CURRENT=$(grep "^SECRET_KEY="        "$APP_DIR/backend/.env" | cut -d= -f2  | tr -d '\r')

[ -z "$PGPASS_CURRENT" ] && err "POSTGRES_PASSWORD empty in backend/.env — delete it and re-run"
[ -z "$DBURL_CURRENT" ]  && err "DATABASE_URL empty in backend/.env — delete it and re-run"
[ -z "$SECRET_CURRENT" ] && err "SECRET_KEY empty in backend/.env — delete it and re-run"

write_env_var "CADDY_NETWORK"    "$CADDY_NETWORK"    "$APP_DIR/.env"
write_env_var "POSTGRES_PASSWORD" "$PGPASS_CURRENT"  "$APP_DIR/.env"
write_env_var "DATABASE_URL"     "$DBURL_CURRENT"    "$APP_DIR/.env"
write_env_var "SECRET_KEY"       "$SECRET_CURRENT"   "$APP_DIR/.env"
log "Project .env updated: CADDY_NETWORK, POSTGRES_PASSWORD, DATABASE_URL, SECRET_KEY"

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

# On first deploy (not update): wipe postgres volume to avoid password mismatch
# from previous failed attempts. Volume will be re-initialized with the correct
# password from backend/.env. Use "bash deploy.sh update" to keep existing data.
if [ "$1" != "update" ]; then
  if docker volume ls --format '{{.Name}}' | grep -q '^mouse_postgres_data$'; then
    warn "Removing existing postgres volume for clean init (passwords may differ from failed attempts)"
    docker volume rm mouse_postgres_data 2>/dev/null || true
  fi
fi

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
# Strategy: Caddyfile may not be host-bind-mounted (baked into image).
# We use "docker exec" to check and patch it directly inside the container,
# then reload. This works regardless of how Caddy was deployed.
log "Configuring Caddy virtual host for $DOMAIN..."

CADDY_BLOCK="
# === ${DOMAIN} added by deploy.sh ===
${DOMAIN} {
    encode gzip zstd
    reverse_proxy /uploads/* mouse_backend:8000
    reverse_proxy /api/* mouse_backend:8000
    reverse_proxy * mouse_frontend:3000
}
"

# Check if our domain is already present in Caddyfile
ALREADY=$(docker exec "$CADDY_CONTAINER" grep -c "$DOMAIN" /etc/caddy/Caddyfile 2>/dev/null || echo "0")

if [ "$ALREADY" != "0" ]; then
  warn "$DOMAIN already present in Caddyfile — skipping"
else
  log "Appending virtual host block to Caddyfile inside $CADDY_CONTAINER..."

  # Write block to a temp file on host, docker cp into container, then append
  TMPFILE=$(mktemp)
  printf '%s\n' "$CADDY_BLOCK" > "$TMPFILE"
  docker cp "$TMPFILE" "${CADDY_CONTAINER}:/tmp/mouse_caddy_block.txt"
  rm -f "$TMPFILE"

  docker exec "$CADDY_CONTAINER" sh -c \
    'cat /tmp/mouse_caddy_block.txt >> /etc/caddy/Caddyfile && rm /tmp/mouse_caddy_block.txt'

  log "Reloading Caddy..."
  if docker exec "$CADDY_CONTAINER" caddy reload --config /etc/caddy/Caddyfile; then
    log "Caddy reloaded OK — SSL will be provisioned automatically on first request"
  else
    warn "Caddy reload failed. Trying fmt first..."
    docker exec "$CADDY_CONTAINER" caddy fmt --overwrite /etc/caddy/Caddyfile 2>/dev/null || true
    docker exec "$CADDY_CONTAINER" caddy reload --config /etc/caddy/Caddyfile \
      && log "Caddy reloaded OK" \
      || warn "Reload still failed — check: docker exec $CADDY_CONTAINER caddy validate --config /etc/caddy/Caddyfile"
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
