# NESTCLAW — COMPLETE PROJECT CONTEXT
# Give this document to any AI assistant (Claude Code, Cursor, etc.) to continue the project.
# Written: May 2026. Verified against live server.

---

## WHAT IS NESTCLAW

NestClaw is a shared AI agent hosting SaaS. Users pay $2.99/month and receive their own
isolated Docker container running either OpenClaw or Hermes Agent — accessible 24/7 via
a browser terminal (ttyd) with no SSH client needed. The container is provisioned
automatically within 60 seconds of payment.

The business model: one bare-metal server (Hetzner Auction, AMD EPYC, 384GB RAM, ~$146/mo)
hosts up to 300-400 Docker containers simultaneously. Break-even is 50 users ($149.50/mo
revenue). At 300 users the net profit is ~$750/month. The cheapest competitor (Agent37)
charges $3.99/month and only offers OpenClaw. NestClaw charges $2.99 and offers both
OpenClaw and Hermes Agent.

---

## LIVE SERVER

Provider: Microsoft Azure (testing phase, using $500 free credits)
VM type: Standard_D4s_v3 (4 vCPU, 16GB RAM)
Public IP: 20.161.26.0
OS: Ubuntu 22.04 LTS
Project root on server: /opt/nestclaw
GitHub repo: https://github.com/invoicepulse/nestclaw

Production plan (after testing): Hetzner Server Auction, AMD EPYC 7502P, 384GB RAM,
960GB NVMe, ~$146/month. Switch when ready to launch publicly.

---

## WHAT IS 100% COMPLETE AND VERIFIED WORKING

**Docker images — VERIFIED WORKING**
Both images are built and actively running containers on the server right now.
- nestclaw/openclaw:latest (1.76GB) — OpenClaw + ttyd browser terminal
- nestclaw/hermes:latest (8.22GB) — Hermes Agent + ttyd + hermes-webui on port 5000
Agents open in browser terminal and respond correctly. This was manually tested.

**Running containers — VERIFIED (21 containers active)**
21 user containers are running right now. OpenClaw containers expose port 7681 (ttyd)
mapped to host ports 10000-10020. Hermes containers additionally expose port 5000
(hermes-webui) mapped to host ports 20000-20004. Each container is named nestclaw_{subdomain}.

**Docker network — VERIFIED**
nestclaw_net bridge network exists (ID: c97767ab0eef). All containers use this network.
Note: there is also a stale nestclaw_ne network — this can be safely removed with
`docker network rm nestclaw_ne`.

**API backend — VERIFIED WORKING**
Running at http://localhost:2222. Health check returns {"status":"ok"}.
Built with Hono.js on Node.js 22. Currently started manually with:
`cd /opt/nestclaw/apps/api && npx tsx src/index.ts &`
(See KNOWN ISSUE below about PM2.)

**Database — VERIFIED CONNECTED**
Neon serverless PostgreSQL. Drizzle ORM. Migrations have been applied.
Two tables: users and containers.
Credentials in apps/api/.env (DATABASE_URL configured and verified).

**Auth — VERIFIED CONFIGURED**
Supabase Auth with email OTP (magic code, no passwords).
SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY both configured in .env.
Auth middleware in apps/api/src/middleware/auth.ts verifies JWT on every protected route.

**Billing — VERIFIED CONFIGURED (sandbox mode)**
Polar.sh. POLAR_WEBHOOK_SECRET and POLAR_ACCESS_TOKEN both configured.
Polar is currently in SANDBOX mode (test payments only, not live).
Checkout URL is a sandbox link in apps/web/.env.

**Stripe is NOT used anywhere in this project.**

**Email — VERIFIED CONFIGURED**
Resend. RESEND_API_KEY configured. Sends from hello@nestclaw.io.
Used for welcome emails after provisioning and cancellation warnings.

**DNS — CONFIGURED BUT NOT ACTIVE**
Cloudflare API token and zone ID are configured. However there is no domain
pointed to Cloudflare yet. DNS calls in the API will succeed but have no effect
until a real domain is set up. The DOMAIN env var is currently set to the raw
IP address (20.161.26.0) as a temporary workaround.

**Scripts — ALL PRESENT AND EXECUTABLE**
Located at /opt/nestclaw/scripts/:
- provision.sh: creates a Docker container for a user, finds free ports, returns JSON
- deprovision.sh: stops and removes container on subscription cancellation
- find-free-port.sh: scans port range and returns first available port
- install-host.sh: one-time server setup (Docker, Node, PM2, Caddy)
- container-monitor.sh: health monitoring, restarts crashed containers
- wake-container.sh: wakes sleeping containers
- rebuild-openclaw.sh: rebuilds the OpenClaw Docker image
- test-webhook.py: simulates a Polar payment webhook for local testing

**Full API route structure — BUILT**
- POST /api/webhooks/polar — Polar webhook handler (payment → provision container)
- GET /api/containers/me — returns user's container status and access URLs
- GET /api/users/me — returns user profile
- POST /api/users/me/agent-type — saves chosen agent type (openclaw or hermes)
- GET /api/health — health check

**Full services layer — BUILT**
- apps/api/src/services/docker.ts — executes provision.sh and deprovision.sh
- apps/api/src/services/caddy.ts — Caddy Admin API integration for dynamic routing
- apps/api/src/services/cloudflare.ts — creates/deletes DNS records
- apps/api/src/services/email.ts — Resend email sending
- apps/api/src/services/wake.ts — container wake functionality

**Cleanup job — BUILT**
apps/api/src/jobs/cleanup.ts runs every 24 hours. Finds containers past their
deletion_scheduled_at date and runs deprovision.sh on them.

**Complete frontend — BUILT (not yet served publicly)**
React 18 + Vite + Tailwind + shadcn/ui. All pages exist:
- Landing.tsx — public marketing page with pricing and agent comparison
- Login.tsx — Supabase OTP email login flow
- Onboarding.tsx — agent type selection (OpenClaw vs Hermes), redirects to Polar checkout
- Dashboard.tsx — shows container status, terminal button, webui button (Hermes only)
Components: ContainerCard.tsx, StatusBadge.tsx
Hooks: useAuth.ts, useContainer.ts (polls every 5s when status is 'provisioning')
State: Zustand auth store
The frontend has NOT been built (pnpm build) or served yet.

**Caddy config — WRITTEN (not installed)**
caddy/Caddyfile exists in the project but Caddy is not installed on the server yet.

---

## DATABASE SCHEMA (Drizzle ORM, Neon PostgreSQL)

users table:
- id: uuid (primary key, auto-generated)
- email: text (unique, not null)
- supabase_id: text (unique) — from Supabase Auth
- polar_customer_id: text (nullable) — set on first Polar webhook
- agent_type: text ('openclaw' or 'hermes') — chosen during onboarding
- created_at: timestamp

containers table:
- id: uuid (primary key)
- user_id: uuid (foreign key → users.id)
- subdomain: text (unique) — 8-char random alphanumeric e.g. "abc1234x"
- container_name: text (unique) — e.g. "nestclaw_abc1234x"
- agent_type: text ('openclaw' or 'hermes')
- terminal_port: integer — host port mapped to container ttyd:7681
- webui_port: integer (nullable) — host port for hermes-webui:5000 (Hermes only)
- subscription_status: text ('active'|'grace_period'|'deleted'|'provisioning'|'error')
- polar_subscription_id: text
- deletion_scheduled_at: timestamp (nullable) — set 7 days after cancellation
- created_at: timestamp
- last_seen_at: timestamp (nullable)

---

## HOW PROVISIONING WORKS (The Core Flow)

When a user pays $2.99 on Polar.sh, Polar sends a webhook to POST /api/webhooks/polar.
The webhook handler does the following in sequence:

1. Verifies the Polar webhook signature (HMAC-SHA256 using POLAR_WEBHOOK_SECRET)
2. Finds or creates the user in the database by email
3. Generates a unique 8-character subdomain (checks uniqueness in DB)
4. Sets container status to 'provisioning' in the database
5. Executes provision.sh with: userId, subdomain, agent_type
6. provision.sh finds a free host port, runs docker run with resource limits,
   returns JSON: {"terminal_port": N, "webui_port": N|null, "container_name": "..."}
7. Updates the container record in DB with ports and sets status to 'active'
8. Calls Caddy Admin API to register the terminal route (and webui route for Hermes)
9. Creates a Cloudflare DNS record for the subdomain
10. Sends a welcome email via Resend with the user's access URLs

When a subscription is cancelled, Polar sends a cancellation webhook. The handler sets
status to 'grace_period' and deletion_scheduled_at to now + 7 days. The cleanup job
runs deprovision.sh after that period.

---

## TECH STACK

Monorepo: Turborepo + pnpm workspaces
Backend: Hono.js on Node.js 22 (apps/api)
Frontend: React 18 + Vite + Tailwind + shadcn/ui (apps/web)
Shared types: packages/shared
Database: Neon (serverless PostgreSQL) + Drizzle ORM
Auth: Supabase Auth (email OTP)
Billing: Polar.sh ($2.99/month recurring)
Email: Resend
DNS: Cloudflare
Container runtime: Docker (one container per user on single host server)
Reverse proxy: Caddy (not yet installed — see remaining work)
Process manager: PM2 (configured but has a known issue — see below)
Language: TypeScript strict mode throughout

---

## KNOWN ISSUES TO FIX

**Issue 1 — API does not survive server reboots (HIGHEST PRIORITY)**
The API is started manually with: `cd /opt/nestclaw/apps/api && npx tsx src/index.ts &`
PM2 was set up but does not work reliably with pnpm subprocesses. The pm2 startup
systemd service was registered but the API process itself was not saved correctly.

The fix: After starting the API manually, immediately run:
`pm2 start --name nestclaw-api --cwd /opt/nestclaw/apps/api npx -- tsx src/index.ts`
Then run `pm2 save` to persist.

Alternatively: Create a simple shell wrapper at /opt/nestclaw/start-api.sh:
```
#!/bin/bash
cd /opt/nestclaw/apps/api
exec npx tsx src/index.ts
```
Then: `pm2 start /opt/nestclaw/start-api.sh --name nestclaw-api && pm2 save`

**Issue 2 — Docker network lost on reboot**
The nestclaw_net Docker bridge network is deleted when the server reboots. /etc/rc.local
has been configured with: `docker network create nestclaw_net 2>/dev/null || true`
Verify this persists by checking: `cat /etc/rc.local`

**Issue 3 — Stale Docker network**
There is a duplicate network named nestclaw_ne (without the t). Remove it:
`docker network rm nestclaw_ne`

**Issue 4 — Caddy not installed (blocks subdomain routing)**
Without Caddy, there is no subdomain routing and no SSL. Users currently access their
terminals directly via IP:port (e.g. http://20.161.26.0:10001). This works for testing
but is not suitable for production. Azure firewall must have ports 10000-10020 open.

**Issue 5 — No domain yet**
All URLs use the raw IP 20.161.26.0. The DOMAIN env var in apps/api/.env is set to
the IP address. Once a domain is purchased and pointed to Cloudflare, update DOMAIN
in .env, update VITE_DOMAIN in apps/web/.env, reinstall Caddy, and restart the API.

**Issue 6 — Frontend not served**
The React app has not been built or deployed. Nobody can visit the website yet.
To serve it: `cd /opt/nestclaw && pnpm --filter web build`
Then serve the dist folder via Caddy or: `pm2 serve apps/web/dist 3000 --name nestclaw-web --spa`

**Issue 7 — Polar is in sandbox mode**
Only test payments work. Before going live: switch Polar to production mode,
update POLAR_WEBHOOK_SECRET and POLAR_ACCESS_TOKEN in .env, update the Polar
checkout URL in apps/web/.env to the live checkout link.

---

## WHAT NEEDS TO BE DONE NEXT (IN ORDER)

Step 1 — Fix PM2 permanently (15 minutes)
Make the API auto-start on reboot without manual intervention.

Step 2 — Install Caddy (20 minutes)
```
sudo apt-get install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.bookworm main' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt-get update && sudo apt-get install caddy
```
For now (no domain), configure Caddy to serve the frontend on port 80 and proxy
/api/* to port 2222.

Step 3 — Build and serve the frontend (10 minutes)
```
cd /opt/nestclaw
pnpm --filter web build
```
Then configure Caddy to serve apps/web/dist as static files.

Step 4 — Open Azure firewall ports
In Azure portal → VM → Networking → Add inbound rules for ports 80, 443, 2222,
and range 10000-10020 (for terminal access during testing).

Step 5 — End-to-end test without a domain
Visit http://20.161.26.0 → sign up → choose agent → complete Polar sandbox
payment → verify container spins up → verify terminal accessible at
http://20.161.26.0:{terminal_port}

Step 6 — Get a domain ($2-10, any registrar)
Point nameservers to Cloudflare. Add wildcard A record: *.nestclaw.io → 20.161.26.0
Update DOMAIN in .env. Update VITE_API_URL and VITE_DOMAIN in web .env.
Reinstall Caddy with wildcard SSL configuration using Cloudflare DNS challenge.

Step 7 — Switch Polar to live mode
Update Polar credentials in .env. Update frontend checkout URL. Test with a real $2.99
payment.

Step 8 — List on TrustMRR / ProductHunt
The product is functional and has real provisioning working. Even at $0 MRR with
a working demo, it is sellable. Record a Loom showing: signup → payment → agent running
in browser → terminal working. This is the demo.

---

## REPOSITORY

GitHub: https://github.com/invoicepulse/nestclaw
To pull latest on server: `cd /opt/nestclaw && git pull`
To restart API after pull: `pkill -f tsx && cd apps/api && npx tsx src/index.ts &`

---

## HOW TO RESTART EVERYTHING FROM SCRATCH (after reboot)

```bash
# 1. Recreate Docker network if lost
docker network create nestclaw_net 2>/dev/null || true

# 2. Start all stopped containers
docker start $(docker ps -aq)

# 3. Start the API
cd /opt/nestclaw/apps/api && npx tsx src/index.ts &

# 4. Verify
sleep 3 && curl http://localhost:2222/api/health
```

---

## ENVIRONMENT VARIABLES (apps/api/.env) — ALL CONFIGURED

DATABASE_URL — Neon PostgreSQL connection string ✓
SUPABASE_URL — Supabase project URL ✓
SUPABASE_SERVICE_ROLE_KEY — Supabase service role key ✓
POLAR_WEBHOOK_SECRET — Polar webhook signing secret ✓
POLAR_ACCESS_TOKEN — Polar API access token ✓
RESEND_API_KEY — Resend email API key ✓
EMAIL_FROM — hello@nestclaw.io ✓
CLOUDFLARE_API_TOKEN — Cloudflare zone:DNS:edit token ✓
CLOUDFLARE_ZONE_ID — Zone ID ✓
SERVER_IP — 20.161.26.0 ✓
CADDY_ADMIN_URL — http://localhost:2019 ✓
HOST_SCRIPTS_PATH — /opt/nestclaw/scripts ✓
DOMAIN — 20.161.26.0 (update to real domain when ready)
PORT — 2222 ✓
NODE_ENV — development

---

## ENVIRONMENT VARIABLES (apps/web/.env) — ALL CONFIGURED

VITE_SUPABASE_URL ✓
VITE_SUPABASE_ANON_KEY ✓
VITE_API_URL — http://20.161.26.0:2222
VITE_DOMAIN — 20.161.26.0
VITE_POLAR_CHECKOUT_URL — sandbox checkout URL ✓

---

## COMPETITOR REFERENCE

Agent37 (agent37.com): OpenClaw only, $3.99/month, 700+ subscribers, launched ProductHunt
ranked #1. Uses same Docker + ttyd model on shared bare metal. This validates our approach.

ClawHost (github.com/bfzli/clawhost, MIT license): Open source repo that NestClaw
is partially adapted from. Original author hit $1,475 MRR with 67 users in one month
and listed the business for $25,000 on TrustMRR. We replaced VPS-per-user provisioning
with shared Docker containers, replaced Firebase with Supabase, and added Hermes Agent.

---

## WHAT MAKES NESTCLAW BETTER THAN AGENT37

1. $2.99/month vs $3.99/month — cheapest on the market
2. Both OpenClaw AND Hermes Agent (Agent37 only does OpenClaw)
3. hermes-webui bundled for Hermes users (full browser UI, not just terminal)
4. Composio pre-installed (500+ integrations: Gmail, Slack, Notion, GitHub, etc.)

IMPORTANT FOR AI ASSISTANT:
- Do not rewrite or refactor working code
- Do not change the API startup command without testing first  
- Do not run any destructive commands (rm -rf, docker system prune, etc.)
- Always verify with curl http://localhost:2222/api/health after any API change
- The 21 running containers belong to real test users — do not stop them
- Ask before running any command that could affect running containers

