---
inclusion: always
---

# Project Structure: NestClaw

## Repository Layout

```
nestclaw/
├── apps/
│   ├── api/                        # Hono.js backend (port 2222)
│   │   └── src/
│   │       ├── index.ts            # Entry point, Hono app setup
│   │       ├── middleware/
│   │       │   ├── auth.ts         # Supabase JWT verification
│   │       │   └── logger.ts       # Request logging
│   │       ├── routes/
│   │       │   ├── webhooks.ts     # POST /api/webhooks/polar (MOST CRITICAL)
│   │       │   ├── containers.ts   # GET /api/containers/me
│   │       │   ├── users.ts        # GET/PUT /api/users/me
│   │       │   └── health.ts       # GET /api/health
│   │       ├── services/
│   │       │   ├── docker.ts       # Executes provision.sh / deprovision.sh
│   │       │   ├── caddy.ts        # Caddy Admin API: add/remove routes
│   │       │   ├── cloudflare.ts   # Create/delete DNS records
│   │       │   ├── resend.ts       # Welcome and cancellation emails
│   │       │   └── polar.ts        # Polar API client helpers
│   │       └── db/
│   │           ├── schema.ts       # Drizzle schema (users, containers)
│   │           ├── migrations/     # Auto-generated Drizzle migrations
│   │           └── index.ts        # Neon DB connection
│   │
│   └── web/                        # React + Vite frontend (port 1111)
│       └── src/
│           ├── main.tsx
│           ├── App.tsx             # Router setup
│           ├── pages/
│           │   ├── Landing.tsx     # Public landing page
│           │   ├── Login.tsx       # Supabase OTP auth
│           │   ├── Dashboard.tsx   # Container status + access links
│           │   ├── Onboarding.tsx  # Agent type selection
│           │   └── Billing.tsx     # Polar billing portal link
│           ├── components/
│           │   ├── ContainerCard.tsx
│           │   ├── AgentSelector.tsx
│           │   ├── StatusBadge.tsx
│           │   └── ui/             # shadcn/ui components
│           ├── store/
│           │   ├── auth.ts         # Zustand auth slice
│           │   └── container.ts    # Zustand container slice
│           ├── lib/
│           │   ├── supabase.ts     # Supabase client
│           │   └── api.ts          # API client (wraps fetch)
│           └── hooks/
│               ├── useContainer.ts # TanStack Query for container status
│               └── useAuth.ts      # Auth state hook
│
├── packages/
│   └── shared/                     # Shared TypeScript types
│       └── src/
│           └── types.ts            # Container, User, AgentType interfaces
│
├── containers/
│   ├── openclaw/
│   │   ├── Dockerfile              # node:22-slim + openclaw + ttyd + Composio
│   │   └── start.sh
│   └── hermes/
│       ├── Dockerfile              # python:3.11-slim + hermes + ttyd + hermes-webui
│       └── start.sh
│
├── scripts/                        # Host-level bash (run on bare metal)
│   ├── provision.sh                # Create container, find free ports, return JSON
│   ├── deprovision.sh              # Stop + remove container and volume
│   ├── install-host.sh             # One-time host setup
│   └── find-free-port.sh           # Scan port range, return first free port
│
├── caddy/
│   └── Caddyfile                   # Wildcard SSL + dynamic routing base config
│
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

## Database Schema

```typescript
// users
id: uuid PK
email: text unique not null
supabase_id: text unique not null
polar_customer_id: text
agent_type: enum('openclaw', 'hermes')
created_at: timestamp

// containers
id: uuid PK
user_id: uuid FK → users.id
subdomain: text unique          // e.g. "abc1234x" (8-char random alphanumeric)
container_name: text unique     // e.g. "nestclaw_abc1234x"
agent_type: enum('openclaw', 'hermes')
terminal_port: integer          // host port → container ttyd:7681 (range 10000–19999)
webui_port: integer nullable    // host port → hermes-webui:5000 (range 20000–29999)
subscription_status: enum('active', 'cancelled', 'grace_period', 'deleted')
polar_subscription_id: text
deletion_scheduled_at: timestamp nullable
created_at: timestamp
last_seen_at: timestamp
```

## Naming Conventions
- Files: `kebab-case.ts`
- React components: `PascalCase.tsx`
- Functions: `camelCase`
- DB columns: `snake_case`
- Env vars: `SCREAMING_SNAKE_CASE`
- Container names: `nestclaw_{subdomain}` e.g. `nestclaw_abc1234x`
- Subdomains: 8-char random alphanumeric e.g. `abc1234x`

## API Conventions
- All protected routes require `Authorization: Bearer <supabase-jwt>`
- All responses: `{ data: T } | { error: string }`
- Webhooks: verify Polar HMAC-SHA256 signature before any processing
- Auth middleware decodes JWT and attaches `user` to Hono context

## Port Allocation
- Terminal (ttyd): host ports 10000–19999
- Hermes WebUI: host ports 20000–29999
- API: 2222
- Web: 1111
- Caddy Admin API: 2019
