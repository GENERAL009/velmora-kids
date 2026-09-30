#!/bin/bash
set -e

# Run this ONCE on your Hetzner server to set up the environment
# Usage: ssh root@your-server 'bash -s' < scripts/server-setup.sh

echo "=== Velmora Kids Server Setup ==="

# 1. System updates
echo "[1/7] Updating system..."
apt-get update && apt-get upgrade -y

# 2. Install Docker
echo "[2/7] Installing Docker..."
if ! command -v docker &> /dev/null; then
  curl -fsSL https://get.docker.com | sh
  systemctl enable docker
  systemctl start docker
fi

# 3. Install Docker Compose plugin
echo "[3/7] Docker Compose..."
docker compose version || apt-get install -y docker-compose-plugin

# 4. Install certbot
echo "[4/7] Installing Certbot..."
apt-get install -y certbot

# 5. Clone repo
echo "[5/7] Cloning repository..."
APP_DIR="/opt/velmora-kids"
if [ ! -d "$APP_DIR" ]; then
  git clone https://github.com/GENERAL009/velmora-kids.git "$APP_DIR"
else
  echo "  -> Already cloned"
fi

# 6. SSL certificate
echo "[6/7] SSL certificate..."
DOMAIN="velmora-kids.uz"
if [ ! -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
  mkdir -p /var/www/certbot
  certbot certonly --standalone -d $DOMAIN -d www.$DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN
else
  echo "  -> SSL cert already exists"
fi

# 7. Create .env file
echo "[7/7] Environment file..."
ENV_FILE="$APP_DIR/.env.prod"
if [ ! -f "$ENV_FILE" ]; then
  cat > "$ENV_FILE" << 'ENVEOF'
# Database
POSTGRES_DB=velmora_kids
POSTGRES_USER=velmora
POSTGRES_PASSWORD=CHANGE_ME_STRONG_PASSWORD

# Backend
SECRET_KEY=CHANGE_ME_RANDOM_SECRET_64_CHARS

# Telegram
TELEGRAM_BOT_TOKEN=
TELEGRAM_GROUP_ID=-1003937642808
ENVEOF
  echo "  -> Created $ENV_FILE — EDIT IT with real passwords!"
else
  echo "  -> $ENV_FILE already exists"
fi

# Setup auto-renew cron for SSL
echo "0 0 1 * * certbot renew --webroot -w /var/www/certbot --quiet && docker restart velmora_nginx" | crontab -

echo ""
echo "=== Setup Complete ==="
echo ""
echo "Next steps:"
echo "  1. Edit /opt/velmora-kids/.env.prod with real passwords"
echo "  2. cd /opt/velmora-kids && docker compose -f docker-compose.prod.yml --env-file .env.prod up -d"
echo "  3. Add GitHub Secrets (see README)"
echo ""
