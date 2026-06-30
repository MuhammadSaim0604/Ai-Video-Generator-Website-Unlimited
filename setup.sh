#!/bin/bash
# ============================================================
#  VEO 3 Free — Ubuntu Server One-File Setup
#  Run as root on a fresh Ubuntu 22.04 / 24.04 server:
#    curl -fsSL https://your-domain/setup.sh | bash
#  Or:
#    bash setup.sh
# ============================================================
set -e

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
info()    { echo -e "${CYAN}[INFO]${NC} $1"; }
success() { echo -e "${GREEN}[OK]${NC}   $1"; }
warn()    { echo -e "${YELLOW}[WARN]${NC} $1"; }
error()   { echo -e "${RED}[ERR]${NC}  $1"; exit 1; }

# ── Root check ───────────────────────────────────────────────
[[ $EUID -ne 0 ]] && error "Please run as root: sudo bash setup.sh"

# ── Banner ───────────────────────────────────────────────────
echo ""
echo -e "${CYAN}╔══════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║        VEO 3 Free — Server Setup             ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════╝${NC}"
echo ""

# ── Collect config ───────────────────────────────────────────
read -rp "$(echo -e "${YELLOW}Domain name${NC} (e.g. veo3free.com): ")" DOMAIN
[[ -z "$DOMAIN" ]] && error "Domain is required"

read -rp "$(echo -e "${YELLOW}Email${NC} for SSL certificate (Let's Encrypt): ")" SSL_EMAIL
[[ -z "$SSL_EMAIL" ]] && error "Email is required"

read -rp "$(echo -e "${YELLOW}Git repo URL${NC} (leave blank to use current directory): ")" REPO_URL

read -rp "$(echo -e "${YELLOW}JWT admin secret${NC} (hit enter to auto-generate): ")" JWT_ADMIN_SECRET; echo
[[ -z "$JWT_ADMIN_SECRET" ]] && JWT_ADMIN_SECRET=$(openssl rand -base64 32 | tr -d '/+=') && info "Generated JWT admin secret"

read -rp "$(echo -e "${YELLOW}Google OAuth client ID${NC} (hit enter to skip): ")" GOOGLE_CLIENT_ID
[[ -z "$GOOGLE_CLIENT_ID" ]] && error "Google Client ID is required"

read -rp "$(echo -e "${YELLOW}Google OAuth client secret${NC} (hit enter to skip): ")" GOOGLE_CLIENT_SECRET
[[ -z "$GOOGLE_CLIENT_SECRET" ]] && error "Google Client Secret is required"

read -rsp "$(echo -e "${YELLOW}DB password${NC} (hit enter to auto-generate): ")" DB_PASSWORD; echo
[[ -z "$DB_PASSWORD" ]] && DB_PASSWORD=$(openssl rand -base64 32 | tr -d '/+=') && info "Generated DB password"

read -rsp "$(echo -e "${YELLOW}Admin password${NC} (hit enter to auto-generate): ")" ADMIN_SECRET; echo
[[ -z "$ADMIN_SECRET" ]] && ADMIN_SECRET=$(openssl rand -base64 16 | tr -d '/+=') && info "Generated admin password: $ADMIN_SECRET"

SESSION_SECRET=$(openssl rand -base64 48 | tr -d '/+=')

APP_DIR="/opt/veo3"

# ── System update ─────────────────────────────────────────────
info "Updating system packages..."
apt-get update -qq && apt-get upgrade -y -qq
success "System updated"

# ── Install Docker ────────────────────────────────────────────
if ! command -v docker &>/dev/null; then
  info "Installing Docker..."
  apt-get install -y -qq ca-certificates curl gnupg
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  chmod a+r /etc/apt/keyrings/docker.gpg
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
    https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update -qq
  apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-compose-plugin
  systemctl enable docker --now
  success "Docker installed"
else
  success "Docker already installed ($(docker --version | cut -d' ' -f3 | tr -d ','))"
fi

# ── Firewall ──────────────────────────────────────────────────
if command -v ufw &>/dev/null; then
  info "Configuring firewall..."
  ufw allow 22/tcp   &>/dev/null || true
  ufw allow 80/tcp   &>/dev/null || true
  ufw allow 443/tcp  &>/dev/null || true
  ufw --force enable &>/dev/null || true
  success "Firewall: ports 22, 80, 443 open"
fi

# ── App directory ─────────────────────────────────────────────
info "Setting up app directory at $APP_DIR..."
if [[ -n "$REPO_URL" ]]; then
  if [[ -d "$APP_DIR" ]]; then
    cd "$APP_DIR" && git pull
  else
    git clone "$REPO_URL" "$APP_DIR"
  fi
else
  # Use current directory
  SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  if [[ "$SCRIPT_DIR" != "$APP_DIR" ]]; then
    mkdir -p "$APP_DIR"
    cp -r "$SCRIPT_DIR"/. "$APP_DIR/"
  fi
fi
cd "$APP_DIR"
success "App directory ready"

# ── Create .env ───────────────────────────────────────────────
info "Writing .env..."
cat > "$APP_DIR/.env" <<EOF
DB_PASSWORD=${DB_PASSWORD}
ADMIN_SECRET=${ADMIN_SECRET}
SESSION_SECRET=${SESSION_SECRET}
DOMAIN=${DOMAIN}
JWT_ADMIN_SECRET=${JWT_ADMIN_SECRET}
GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}
GOOGLE_CLIENT_SECRET=${GOOGLE_CLIENT_SECRET}
EOF
chmod 600 "$APP_DIR/.env"
success ".env written"

# ── Nginx config (substitute domain) ─────────────────────────
info "Configuring nginx for domain: $DOMAIN..."
mkdir -p "$APP_DIR/nginx"
sed "s/DOMAIN_PLACEHOLDER/${DOMAIN}/g" "$APP_DIR/nginx/nginx.conf" > /tmp/nginx_final.conf
cp /tmp/nginx_final.conf "$APP_DIR/nginx/nginx.conf"
success "Nginx config updated"

# ── Create certbot dirs ───────────────────────────────────────
mkdir -p "$APP_DIR/certbot/conf" "$APP_DIR/certbot/www"

# ── Temporary HTTP-only nginx for ACME challenge ──────────────
info "Starting temporary nginx for SSL certificate challenge..."
cat > /tmp/nginx_init.conf <<NGINXEOF
events { worker_connections 1024; }
http {
  server {
    listen 80;
    server_name ${DOMAIN};
    location /.well-known/acme-challenge/ {
      root /var/www/certbot;
    }
    location / {
      return 200 'VEO3 Setup in progress...';
      add_header Content-Type text/plain;
    }
  }
}
NGINXEOF

docker run -d --name veo3_init_nginx \
  -p 80:80 \
  -v /tmp/nginx_init.conf:/etc/nginx/nginx.conf:ro \
  -v "$APP_DIR/certbot/www:/var/www/certbot:ro" \
  nginx:1.27-alpine

# ── Get SSL certificate ───────────────────────────────────────
info "Requesting SSL certificate from Let's Encrypt for $DOMAIN..."
sleep 2
docker run --rm \
  -v "$APP_DIR/certbot/conf:/etc/letsencrypt" \
  -v "$APP_DIR/certbot/www:/var/www/certbot" \
  certbot/certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email "$SSL_EMAIL" \
    --agree-tos \
    --no-eff-email \
    -d "$DOMAIN" \
    -d "www.$DOMAIN" 2>&1 || {
      warn "www.$DOMAIN failed, trying just $DOMAIN..."
      docker run --rm \
        -v "$APP_DIR/certbot/conf:/etc/letsencrypt" \
        -v "$APP_DIR/certbot/www:/var/www/certbot" \
        certbot/certbot certonly \
          --webroot \
          --webroot-path=/var/www/certbot \
          --email "$SSL_EMAIL" \
          --agree-tos \
          --no-eff-email \
          -d "$DOMAIN"
    }

docker stop veo3_init_nginx && docker rm veo3_init_nginx
success "SSL certificate obtained"

# ── Start the full stack ──────────────────────────────────────
info "Building and starting all containers..."
cd "$APP_DIR"
docker compose --env-file .env up -d --build

# ── Wait for services ─────────────────────────────────────────
info "Waiting for services to be healthy..."
sleep 10
for i in $(seq 1 30); do
  if docker compose ps | grep -q "healthy\|running"; then
    break
  fi
  sleep 2
done
success "All containers started"

# ── SSL auto-renewal cron ─────────────────────────────────────
info "Setting up SSL auto-renewal..."
CRON_JOB="0 3 * * * cd $APP_DIR && docker compose run --rm certbot renew --quiet && docker compose exec nginx nginx -s reload >> /var/log/veo3-certbot.log 2>&1"
(crontab -l 2>/dev/null | grep -v "veo3-certbot"; echo "$CRON_JOB") | crontab -
success "SSL auto-renewal scheduled (daily at 3am)"

# ── Auto-start on reboot ──────────────────────────────────────
info "Setting up auto-start on reboot..."
cat > /etc/systemd/system/veo3.service <<SERVICEEOF
[Unit]
Description=VEO 3 Free Stack
Requires=docker.service
After=docker.service network-online.target

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=${APP_DIR}
ExecStart=/usr/bin/docker compose up -d
ExecStop=/usr/bin/docker compose down
TimeoutStartSec=300

[Install]
WantedBy=multi-user.target
SERVICEEOF
systemctl daemon-reload
systemctl enable veo3.service
success "Auto-start on reboot enabled"

# ── Done ──────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║            Setup Complete!                   ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  ${CYAN}Site:${NC}         https://${DOMAIN}"
echo -e "  ${CYAN}Admin panel:${NC}  https://${DOMAIN}/admin/login"
echo -e "  ${CYAN}Admin user:${NC}   admin"
echo -e "  ${CYAN}Admin pass:${NC}   ${ADMIN_SECRET}"
echo -e "  ${CYAN}App dir:${NC}      ${APP_DIR}"
echo ""
echo -e "  ${YELLOW}Useful commands:${NC}"
echo -e "  docker compose -f ${APP_DIR}/docker-compose.yml logs -f"
echo -e "  docker compose -f ${APP_DIR}/docker-compose.yml restart"
echo -e "  docker compose -f ${APP_DIR}/docker-compose.yml down"
echo ""
