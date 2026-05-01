---
inclusion: always
---

# Tech Stack — NestClaw

## Monorepo Structure
- **Tooling**: Turborepo + pnpm workspaces (adapted from ClawHost)
- **Language**: TypeScript everywhere (strict mode)
- **Node version**: 22 LTS

## Backend API
- **Framework**: Hono.js on Node.js (fast, lightweight, edge-ready)
- **Port**: 2222 (dev), behind Caddy in production
- **ORM**: Drizzle ORM
- **Validation**: Zod for all request/response schemas
- **Process manager**: PM2 (production, auto-restart on crash)

## Frontend Dashboard
- **Framework**: React 18 + Vite
- **UI Components**: shadcn/ui + Tailwind CSS
- **State**: Zustand
- **Data fetching**: TanStack React Query
- **Icons**: Phosphor Icons
- **Port**: 1111 (dev)

## Database
- **Provider**: Neon (serverless PostgreSQL, free tier for testing)
- **ORM**: Drizzle ORM with migrations
- **Connection**: Pool via `@neondatabase/serverless` with WebSocket adapter

## Authentication
- **Provider**: Supabase Auth
- **Method**: Email OTP (magic code — no passwords)
- **Why Supabase over Firebase**: Handles OTP emails natively, no extra config
- **Backend**: Verify Supabase JWT on every protected API request via middleware
- **Frontend**: Supabase JS client, auth state in Zustand

## Billing
- **Provider**: Polar.sh
- **Product**: "NestClaw Agent Instance" at $2.99/month recurring
- **Webhook**: `POST /api/webhooks/polar` — fires on payment success and cancellation
- **Payment success** → triggers container provisioning
- **Cancellation** → schedules container deletion (7-day grace period)

## Container Runtime
- **Technology**: Docker + Docker Compose
- **One container per user** on the single host server
- **Image variants**: `nestclaw/openclaw:latest`, `nestclaw/hermes:latest`
- **Resource limits** (enforced via Docker):
  - CPU: 1 vCPU soft limit (--cpus="1")
  - RAM: 4GB soft limit (--memory="4g")
  - Storage: 3GB named volume per container
- **Networking**: Each container on isolated Docker bridge network
  - Containers cannot communicate with each other
  - Only the API can reach containers via their internal ports

## Reverse Proxy
- **Technology**: Caddy 2
- **Features used**:
  - Wildcard SSL via Let's Encrypt (*.nestclaw.io)
  - Dynamic route registration via Caddy Admin API (no restart needed)
  - WebSocket proxying for ttyd terminal streams
  - Routes added/removed programmatically when containers are provisioned/removed
- **Caddyfile**: wildcard domain with dynamic upstreams

## DNS
- **Provider**: Cloudflare
- **Record**: Wildcard A record `*.nestclaw.io → server IP`
- **Per-user DNS**: Created via Cloudflare API on provisioning (CNAME per user to wildcard)
- **TTL**: 60 seconds

## Email
- **Provider**: Resend (with React Email templates)
- **Used for**: Welcome email with access URL, cancellation warning
- **NOT used for**: Auth OTP (Supabase handles that natively)

## Terminal Access
- **Technology**: ttyd (browser-based terminal via WebSocket)
- **Runs inside** each user container on port 7681
- **Proxied via** Caddy: `terminal.user123.nestclaw.io → container:7681`
- **Auth**: Token-based (ttyd credential passed on provisioning)

## Hermes Web UI (Hermes containers only)
- **Repo**: github.com/nesquena/hermes-webui
- **Port**: 5000 (inside container)
- **Proxied via** Caddy: `ui.user123.nestclaw.io → container:5000`
- **No extra setup**: Pure Python + vanilla JS, no build step

## Key Scripts (on host server)
- `/opt/nestclaw/scripts/provision.sh` — creates container, finds free ports, returns JSON
- `/opt/nestclaw/scripts/deprovision.sh` — removes container and volume on cancellation

## Environment Variables — API
```
DATABASE_URL=             # Neon PostgreSQL connection string
SUPABASE_URL=             # Supabase project URL
SUPABASE_SERVICE_ROLE_KEY= # Supabase service role key (for server-side auth verification)
POLAR_ACCESS_TOKEN=       # Polar.sh API token
POLAR_WEBHOOK_SECRET=     # Polar webhook signing secret
POLAR_PRODUCT_ID=         # ID of the $2.99/month product
RESEND_API_KEY=           # Resend email API key
CLOUDFLARE_API_TOKEN=     # Cloudflare zone:DNS:edit token
CLOUDFLARE_ZONE_ID=       # Zone ID for nestclaw.io
CADDY_ADMIN_URL=          # http://localhost:2019 (Caddy admin API)
HOST_SCRIPTS_PATH=        # /opt/nestclaw/scripts
DOMAIN=                   # nestclaw.io
PORT=2222
```

## Environment Variables — Web
```
VITE_SUPABASE_URL=        # Supabase project URL
VITE_SUPABASE_ANON_KEY=   # Supabase anon key
VITE_API_URL=             # Backend API URL
```

## Code Quality
- ESLint + Prettier (strict)
- TypeScript strict mode — no `any` types
- Zod validation on all API inputs
- All async functions wrapped in try/catch with typed errors
- No console.log in production — use structured logging

## Testing Strategy
- Unit tests: Vitest
- Integration tests: Test webhook handlers with mocked Polar payloads
- Manual E2E: Provision one container, verify subdomain works, verify terminal works
- Load test: spin up 30 containers on Azure, verify isolation
