---
inclusion: always
---

# Tech Stack: NestClaw

## Monorepo
- **Tooling**: Turborepo + pnpm workspaces
- **Language**: TypeScript everywhere, strict mode — no `any` types
- **Node version**: 22 LTS

## Backend (`apps/api`)
- **Framework**: Hono.js on Node.js
- **Port**: 2222 (dev), behind Caddy in production
- **ORM**: Drizzle ORM
- **Validation**: Zod on all request/response schemas
- **Process manager**: PM2 (production)

## Frontend (`apps/web`)
- **Framework**: React 18 + Vite
- **UI**: shadcn/ui + Tailwind CSS
- **State**: Zustand
- **Data fetching**: TanStack React Query
- **Icons**: Phosphor Icons
- **Port**: 1111 (dev)

## Database
- **Provider**: Neon (serverless PostgreSQL)
- **ORM**: Drizzle ORM with migrations
- **Connection**: `@neondatabase/serverless` with WebSocket adapter

## Auth
- **Provider**: Supabase Auth — email OTP (no passwords)
- **Backend**: Verify Supabase JWT on every protected route via middleware
- **Frontend**: Supabase JS client, auth state in Zustand

## Billing
- **Provider**: Polar.sh — `POST /api/webhooks/polar`
- `subscription.created` → provision container
- `subscription.cancelled` → schedule deletion (7-day grace period)

## Container Runtime
- Docker; one container per user
- Images: `nestclaw/openclaw:latest`, `nestclaw/hermes:latest`
- Limits: `--cpus="1"` `--memory="4g"`, 3GB named volume
- Network: isolated Docker bridge (`nestclaw_net`) — containers cannot reach each other

## Reverse Proxy
- **Caddy 2** — wildcard SSL via Let's Encrypt (`*.nestclaw.io`)
- Dynamic route registration via Caddy Admin API (port 2019) — no restart needed
- WebSocket proxying for ttyd terminal streams

## DNS
- **Cloudflare** — wildcard A record `*.nestclaw.io → server IP`
- Per-user records created/deleted via Cloudflare API on provision/deprovision

## Email
- **Resend** with React Email templates
- Welcome email (access URLs) and cancellation warning
- Auth OTP handled by Supabase natively — Resend is NOT used for auth

## Terminal Access
- **ttyd** runs inside each container on port 7681
- Proxied via Caddy: `terminal.{subdomain}.nestclaw.io → container:7681`

## Hermes Web UI (Hermes containers only)
- Pure Python + vanilla JS, no build step, port 5000
- Proxied via Caddy: `ui.{subdomain}.nestclaw.io → container:5000`

## Environment Variables

### API (`apps/api/.env`)
```
DATABASE_URL=             # Neon PostgreSQL connection string
SUPABASE_URL=             # Supabase project URL
SUPABASE_SERVICE_ROLE_KEY= # Supabase service role key
POLAR_ACCESS_TOKEN=       # Polar.sh API token
POLAR_WEBHOOK_SECRET=     # Polar webhook signing secret
POLAR_PRODUCT_ID=         # ID of the $2.99/month product
POLAR_ORG_ID=             # Polar organization ID
RESEND_API_KEY=           # Resend email API key
EMAIL_FROM=               # hello@nestclaw.io
CLOUDFLARE_API_TOKEN=     # Cloudflare zone:DNS:edit token
CLOUDFLARE_ZONE_ID=       # Zone ID for nestclaw.io
SERVER_IP=                # Host server public IP
CADDY_ADMIN_URL=          # http://localhost:2019
HOST_SCRIPTS_PATH=        # /opt/nestclaw/scripts
DOMAIN=                   # nestclaw.io
PORT=2222
NODE_ENV=
```

### Web (`apps/web/.env`)
```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_API_URL=             # http://localhost:2222
VITE_DOMAIN=              # nestclaw.io
VITE_POLAR_CHECKOUT_URL=  # Polar checkout link
```

## Code Quality Rules
- ESLint + Prettier (strict)
- No `any` types in TypeScript
- Zod validation on all API inputs
- All async functions wrapped in try/catch with typed errors
- No `console.log` in production — use structured JSON logging
- Error handling: try/catch with typed error returns (no unhandled rejections)
- Timeouts: 30s for Docker exec, 10s for external API calls
- Retries: 3x with exponential backoff on Cloudflare and Caddy calls

## Testing
- Unit tests: Vitest
- Integration tests: webhook handlers with mocked Polar payloads
- Manual E2E: provision one container, verify subdomain + terminal work
- Run single-pass (non-watch): `vitest --run`

## Common Commands
```bash
# Install dependencies
pnpm install

# Dev (all apps)
pnpm dev

# Build all
pnpm build

# Type-check + lint
pnpm check

# Run tests (single pass)
pnpm test

# DB migrations (API only)
pnpm --filter api db:migrate

# Build Docker images
docker build -t nestclaw/openclaw:latest containers/openclaw/
docker build -t nestclaw/hermes:latest containers/hermes/
```
