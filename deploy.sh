#!/bin/bash
# AutoHire ATS — One-command deploy script
# Usage: bash deploy.sh

set -e

SERVER="ubuntu@your-server-ip"
APP_DIR="/var/www/hr-ats"

echo "==> Deploying to server..."

ssh $SERVER "
  cd $APP_DIR &&
  git pull &&
  docker compose down &&
  docker compose up --build -d &&
  docker compose logs migrate --follow &
  sleep 15 &&
  docker compose ps
"

echo "==> Deploy complete."
