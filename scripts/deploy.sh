#!/bin/bash
set -e

APP_DIR="/opt/velmora-kids"
COMPOSE_FILE="docker-compose.prod.yml"

echo "=== Velmora Kids Deploy ==="
echo "$(date '+%Y-%m-%d %H:%M:%S')"

cd "$APP_DIR"

echo "[1/5] Pulling latest code..."
git fetch origin main
git reset --hard origin/main

echo "[2/5] Running migrations..."
docker compose -f $COMPOSE_FILE run --rm \
  -e DATABASE_URL_SYNC="postgresql+psycopg2://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}" \
  -e DATABASE_URL="postgresql+asyncpg://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}" \
  --no-deps backend sh -c "alembic upgrade head" 2>/dev/null || \
  echo "  -> Migration skipped (DB not ready yet, will run on start)"

echo "[3/5] Building images..."
docker compose -f $COMPOSE_FILE build --parallel

echo "[4/5] Starting services..."
docker compose -f $COMPOSE_FILE up -d

echo "[5/5] Running post-deploy migration..."
sleep 5
docker compose -f $COMPOSE_FILE exec -T backend sh -c "alembic upgrade head"

echo ""
echo "=== Cleaning up old images ==="
docker image prune -f

echo ""
echo "=== Deploy Complete ==="
echo "Site: https://velmora-kids.uz"

# Health check
sleep 3
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" https://velmora-kids.uz/ || echo "000")
if [ "$HTTP_CODE" = "200" ]; then
  echo "Health check: OK (HTTP $HTTP_CODE)"
else
  echo "Health check: WARN (HTTP $HTTP_CODE) - may still be starting up"
fi
