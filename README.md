# NestClaw

Multi-tenant AI agent hosting SaaS. Users pay $2.99/month for an isolated Docker container running OpenClaw or Hermes Agent, accessible via browser terminal.

## Architecture

```
Internet → Cloudflare (*.nestclaw.io) → Caddy (SSL + routing)
  ├── nestclaw.io → React SPA
  ├── terminal.X.nestclaw.io → container X ttyd:7681
  ├── ui.X.nestclaw.io → container X hermes-webui:5000
  └── /api/* → Hono API :2222
        ├── Neon PostgreSQL (users, containers)
        ├── Supabase Auth (JWT)
        ├── Polar.sh (billing webhooks)
        ├── Docker (provision/deprovision)
        ├── Caddy Admin API (dynamic routes)
        ├── Cloudflare API (DNS)
        └── Resend (email)
```

## Tech Stack

- **Monorepo**: Turborepo + pnpm
- **API**: Hono.js, Drizzle ORM, Neon PostgreSQL
- **Frontend**: React 18, Vite, Tailwind CSS, TanStack Query, Zustand
- **Auth**: Supabase (email OTP)
- **Billing**: Polar.sh
- **Containers**: Docker (1 per user), ttyd for terminal
- **Proxy**: Caddy 2 (wildcard SSL, dynamic routing)

## Setup

```bash
pnpm install
cp apps/api/.env.example apps/api/.env   # fill in values
cp apps/web/.env.example apps/web/.env   # fill in values
pnpm dev                                  # starts API :2222 + Web :1111
```

## Commands

```bash
pnpm dev          # dev mode (all apps)
pnpm build        # build all
pnpm check        # typecheck all
pnpm test         # run tests
```

## Deployment

1. Run `scripts/install-host.sh` on the server
2. Build Docker images: `docker build -t nestclaw/openclaw:latest containers/openclaw/`
3. Copy API + Web to server, run migrations
4. Start with PM2: `pm2 start dist/index.js --name nestclaw-api`
5. Configure Caddy with `caddy/Caddyfile`
