---
inclusion: always
---

# Project Structure — NestClaw

## Repository Layout

```
nestclaw/
├── .kiro/
│   ├── steering/           # These files (always loaded by Kiro)
│   ├── specs/              # Feature specs with tasks
│   └── hooks/              # Automated hooks
│
├── apps/
│   ├── api/                # Hono.js backend (port 2222)
│   │   ├── src/
│   │   │   ├── index.ts           # Entry point, Hono app setup
│   │   │   ├── middleware/
│   │   │   │   ├── auth.ts        # Supabase JWT verification
│   │   │   │   └── logger.ts      # Request logging
│   │   │   ├── routes/
│   │   │   │   ├── webhooks.ts    # POST /api/webhooks/polar (MOST CRITICAL)
│   │   │   │   ├── containers.ts  # GET /api/containers/me
│   │   │   │   ├── users.ts       # GET/PUT /api/users/me
│   │   │   │   └── health.ts      # GET /api/health
│   │   │   ├── services/
│   │   │   │   ├── docker.ts      # Execute provision.sh / deprovision.sh
│   │   │   │   ├── caddy.ts       # Caddy Admin API: add/remove routes
│   │   │   │   ├── cloudflare.ts  # Create/delete DNS CNAME records
│   │   │   │   ├── resend.ts      # Send welcome/cancellation emails
│   │   │   │   └── polar.ts       # Polar API client helpers
│   │   │   └── db/
│   │   │       ├── schema.ts      # Drizzle schema (users, containers tables)
│   │   │       ├── migrations/    # Auto-generated Drizzle migrations
│   │   │       └── index.ts       # Neon DB connection
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── web/                # React + Vite frontend (port 1111)
│       ├── src/
│       │   ├── main.tsx           # App entry
│       │   ├── App.tsx            # Router setup
│       │   ├── pages/
│       │   │   ├── Landing.tsx    # Public landing page
│       │   │   ├── Login.tsx      # Supabase OTP auth
│       │   │   ├── Dashboard.tsx  # User's container status + access links
│       │   │   ├── Onboarding.tsx # Agent type selection (OpenClaw vs Hermes)
│       │   │   └── Billing.tsx    # Polar billing portal link
│       │   ├── components/
│       │   │   ├── ContainerCard.tsx   # Shows status, terminal link, uptime
│       │   │   ├── AgentSelector.tsx   # OpenClaw vs Hermes picker
│       │   │   ├── StatusBadge.tsx     # running/provisioning/stopped badge
│       │   │   └── ui/                 # shadcn/ui components
│       │   ├── store/
│       │   │   ├── auth.ts        # Zustand auth slice
│       │   │   └── container.ts   # Zustand container slice
│       │   ├── lib/
│       │   │   ├── supabase.ts    # Supabase client
│       │   │   └── api.ts         # API client (wraps fetch)
│       │   └── hooks/
│       │       ├── useContainer.ts  # TanStack Query for container status
│       │       └── useAuth.ts       # Auth state hook
│       ├── public/
│       ├── index.html
│       ├── package.json
│       └── vite.config.ts
│
├── packages/
│   └── shared/             # Shared TypeScript types
│       ├── src/
│       │   └── types.ts    # Container, User, AgentType interfaces
│       └── package.json
│
├── containers/
│   ├── openclaw/
│   │   ├── Dockerfile         # OpenClaw + ttyd + Composio
│   │   └── start.sh           # Container startup script
│   └── hermes/
│       ├── Dockerfile         # Hermes Agent + ttyd + hermes-webui
│       └── start.sh           # Container startup script
│
├── scripts/                # Host-level bash scripts (run on bare metal)
│   ├── provision.sh        # Create container for new user
│   ├── deprovision.sh      # Remove container on cancellation
│   ├── install-host.sh     # One-time host setup (Docker, Caddy, PM2, Node)
│   └── find-free-port.sh   # Find available port range for new container
│
├── caddy/
│   └── Caddyfile           # Wildcard SSL + dynamic routing config
│
├── turbo.json
├── pnpm-workspace.yaml
├── package.json
└── KIRO.md                 # This file
```

## Database Schema

```typescript
// users table
{
  id: uuid (PK, default gen_random_uuid())
  email: text (unique, not null)
  supabase_id: text (unique, not null)  // from Supabase Auth
  polar_customer_id: text               // set on first Polar webhook
  agent_type: enum('openclaw', 'hermes') // chosen at onboarding
  created_at: timestamp
}

// containers table
{
  id: uuid (PK)
  user_id: uuid (FK → users.id)
  subdomain: text (unique)              // e.g. "abc1234"
  container_name: text (unique)         // e.g. "nestclaw_abc1234"
  agent_type: enum('openclaw', 'hermes')
  terminal_port: integer                // host port mapped to ttyd:7681
  webui_port: integer (nullable)        // host port for hermes-webui:5000
  subscription_status: enum('active', 'cancelled', 'grace_period')
  polar_subscription_id: text
  deletion_scheduled_at: timestamp (nullable)
  created_at: timestamp
  last_seen_at: timestamp
}
```

## API Route Conventions
- All protected routes require `Authorization: Bearer <supabase-jwt>` header
- Auth middleware decodes and verifies JWT, attaches `user` to context
- All responses: `{ data: T } | { error: string }`
- Webhooks: verify Polar signature before processing

## Naming Conventions
- Files: `kebab-case.ts`
- React components: `PascalCase.tsx`
- Functions: `camelCase`
- DB columns: `snake_case`
- Env vars: `SCREAMING_SNAKE_CASE`
- Container names: `nestclaw_{subdomain}` e.g. `nestclaw_abc1234`
- Subdomains: 8-char random alphanumeric e.g. `abc1234x`
