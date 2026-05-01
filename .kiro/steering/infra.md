---
inclusion: always
---
<!------------------------------------------------------------------------------------
   Infrastructure — NestClaw
Host Server
Testing Phase (NOW — use this first)
Provider: Azure (free $500 credits)
VM: Standard_D4s_v3 (4 vCPU, 16GB RAM)
OS: Ubuntu 22.04 LTS
Purpose: Validate full provisioning flow with ~30 test containers
Cost: $0 (credits)
Production Phase (after successful test)
Provider: Hetzner Server Auction (hetzner.com/sb)
Server: AMD EPYC 7502P, 384GB RAM, 2x 480GB NVMe RAID, 1Gbps unmetered
Cost: ~$146/month
Capacity: 300-400 Docker containers simultaneously
Break-even: 50 users ($149.50 revenue/month)
Host Setup (install-host.sh does all of this)
```bash
# 1. System updates
apt-get update && apt-get upgrade -y

# 2. Docker (latest, not snap version)
curl -fsSL https://get.docker.com | bash
usermod -aG docker ubuntu

# 3. Node.js 22
curl -fsSL https://deb.nodesource.com/setup_22.x | bash
apt-get install -y nodejs

# 4. pnpm
npm install -g pnpm

# 5. PM2
npm install -g pm2

# 6. Caddy
apt-get install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/caddy-stable-archive-keyring.gpg] https://dl.cloudsmith.io/public/caddy/stable/debian.bookworm main" | tee /etc/apt/sources.list.d/caddy-stable.list
apt-get update && apt-get install -y caddy

# 7. Create working directory
mkdir -p /opt/nestclaw/scripts /opt/nestclaw/data /opt/nestclaw/api /opt/nestclaw/web
```
Docker: Container Per User
Port Allocation Strategy
Each container needs 2 ports on the host:
`terminal_port`: maps to container's ttyd (7681) — range 10000-19999
`webui_port`: maps to container's hermes-webui (5000) — range 20000-29999 (Hermes only)
`find-free-port.sh` scans the range and returns the first unused port.
provision.sh Logic
```bash
#!/bin/bash
# Usage: ./provision.sh <user_id> <subdomain> <agent_type>
# Returns: JSON with terminal_port, webui_port (if hermes)
# Called by: API webhook handler via child_process.exec

USER_ID=$1
SUBDOMAIN=$2
AGENT_TYPE=$3  # "openclaw" or "hermes"
CONTAINER_NAME="nestclaw_${SUBDOMAIN}"
DATA_DIR="/opt/nestclaw/data/${SUBDOMAIN}"

# Find free ports
TERMINAL_PORT=$(./find-free-port.sh 10000 19999)
WEBUI_PORT=""
if [ "$AGENT_TYPE" = "hermes" ]; then
  WEBUI_PORT=$(./find-free-port.sh 20000 29999)
fi

# Create data directory (persists agent memory/settings)
mkdir -p "$DATA_DIR"

# Build the docker run command
IMAGE="nestclaw/${AGENT_TYPE}:latest"

if [ "$AGENT_TYPE" = "openclaw" ]; then
  docker run -d \
    --name "$CONTAINER_NAME" \
    --restart unless-stopped \
    --cpus="1" \
    --memory="4g" \
    --network nestclaw_net \
    --network-alias "$SUBDOMAIN" \
    -p "${TERMINAL_PORT}:7681" \
    -v "${DATA_DIR}:/home/agent/.openclaw" \
    --label "nestclaw.user_id=${USER_ID}" \
    --label "nestclaw.subdomain=${SUBDOMAIN}" \
    "$IMAGE"
else
  docker run -d \
    --name "$CONTAINER_NAME" \
    --restart unless-stopped \
    --cpus="1" \
    --memory="4g" \
    --network nestclaw_net \
    --network-alias "$SUBDOMAIN" \
    -p "${TERMINAL_PORT}:7681" \
    -p "${WEBUI_PORT}:5000" \
    -v "${DATA_DIR}:/home/agent/.hermes" \
    --label "nestclaw.user_id=${USER_ID}" \
    --label "nestclaw.subdomain=${SUBDOMAIN}" \
    "$IMAGE"
fi

# Output JSON for API to parse
echo "{\"terminal_port\": $TERMINAL_PORT, \"webui_port\": ${WEBUI_PORT:-null}, \"container_name\": \"$CONTAINER_NAME\"}"
```
deprovision.sh Logic
```bash
#!/bin/bash
# Usage: ./deprovision.sh <subdomain> [--force]
# Stops and removes container + data volume

SUBDOMAIN=$1
CONTAINER_NAME="nestclaw_${SUBDOMAIN}"
DATA_DIR="/opt/nestclaw/data/${SUBDOMAIN}"

docker stop "$CONTAINER_NAME" 2>/dev/null
docker rm "$CONTAINER_NAME" 2>/dev/null

if [ "$2" = "--force" ]; then
  rm -rf "$DATA_DIR"
fi

echo "{\"success\": true}"
```
Caddy Configuration
Static Caddyfile (base config)
```caddyfile
{
  admin localhost:2019    # Caddy Admin API — API calls this to add routes dynamically
  email admin@nestclaw.io
}

nestclaw.io {
  root * /opt/nestclaw/web/dist
  file_server
  try_files {path} /index.html
}

*.nestclaw.io {
  tls {
    dns cloudflare {env.CLOUDFLARE_API_TOKEN}
  }
  @terminal host terminal.*.nestclaw.io
  @webui host ui.*.nestclaw.io
}
```
Dynamic Route Registration (Caddy Admin API)
When a container is provisioned, the API calls Caddy's admin API to add routes:
```typescript
// services/caddy.ts
async function addContainerRoutes(subdomain: string, terminalPort: number, webuiPort?: number) {
  // Add terminal route: terminal.{subdomain}.nestclaw.io → localhost:{terminalPort}
  await fetch('http://localhost:2019/config/apps/http/servers/srv0/routes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      match: [{ host: [`terminal.${subdomain}.nestclaw.io`] }],
      handle: [{
        handler: 'reverse_proxy',
        upstreams: [{ dial: `localhost:${terminalPort}` }],
        transport: { protocol: 'http', read_buffer_size: 4096 }
      }]
    })
  });
  // Add webui route if Hermes
  if (webuiPort) { /* similar call for ui.{subdomain}.nestclaw.io */ }
}
```
Docker Network Setup (one-time on host)
```bash
docker network create nestclaw_net --driver bridge --internal=false
```
All containers join this network. They can reach the internet but not each other
(enforced by --network-alias isolation and no cross-container routes).
Cloudflare DNS
Wildcard A record: `*.nestclaw.io → {server_ip}` (set once manually)
Per-user CNAME not strictly needed since wildcard catches everything
API creates DNS record on Cloudflare for tracking/management purposes
TTL: 60 seconds
Monitoring (Basic — PM2)
```bash
pm2 start /opt/nestclaw/api/dist/index.js --name nestclaw-api
pm2 start /opt/nestclaw/web/server.js --name nestclaw-web  # or serve static
pm2 startup  # auto-restart on reboot
pm2 save
```
Container health: poll `docker inspect --format='{{.State.Status}}'` every 5 minutes.
Update `last_seen_at` in DB. If container is stopped/crashed, restart it automatically.
-------------------------------------------------------------------------------------> 