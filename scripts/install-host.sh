#!/bin/bash
set -e

echo "=== NestClaw Host Setup ==="

apt-get update && apt-get upgrade -y

# Docker
curl -fsSL https://get.docker.com | bash
usermod -aG docker ubuntu

# Node.js 22
curl -fsSL https://deb.nodesource.com/setup_22.x | bash
apt-get install -y nodejs

# pnpm + PM2
npm install -g pnpm pm2

# Caddy
apt-get install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/caddy-stable-archive-keyring.gpg] https://dl.cloudsmith.io/public/caddy/stable/debian.bookworm main" | tee /etc/apt/sources.list.d/caddy-stable.list
apt-get update && apt-get install -y caddy

# bc for monitor script math
apt-get install -y bc

# Directories
mkdir -p /opt/nestclaw/{scripts,data,api,web}

# Docker network
docker network create nestclaw_net --driver bridge 2>/dev/null || true

# Copy scripts
cp scripts/*.sh /opt/nestclaw/scripts/
chmod +x /opt/nestclaw/scripts/*.sh

# Container inactivity monitor — runs every 5 minutes, stops after 30 min idle
(crontab -l 2>/dev/null; echo "*/5 * * * * /opt/nestclaw/scripts/container-monitor.sh 30") | crontab -

echo "=== Setup complete ==="
echo "Next: fill in .env files, build Docker images, run db:migrate, start with PM2"
