# Tasks — NestClaw Agent Hosting Platform

Execute these tasks in exact order. Do not skip. Mark each complete before starting the next.
After each GROUP, run `pnpm check` to verify TypeScript compiles clean.

---

## GROUP 1: Project Scaffold
**Goal**: Turborepo monorepo running with both apps in dev mode.

- [ ] 1.1 Initialize Turborepo monorepo with pnpm workspaces
  - Create root `package.json`, `pnpm-workspace.yaml`, `turbo.json`
  - Set up `apps/api` and `apps/web` as workspace packages
  - Set up `packages/shared` for shared TypeScript types

- [ ] 1.2 Initialize Hono.js API app (`apps/api`)
  - Install: `hono`, `@hono/node-server`, `drizzle-orm`, `@neondatabase/serverless`, `ws`, `zod`, `@supabase/supabase-js`, `resend`, `dotenv`
  - Install dev: `typescript`, `@types/node`, `tsx`, `drizzle-kit`, `vitest`
  - Create `src/index.ts` — basic Hono app on port 2222 with `/api/health` route
  - Create `tsconfig.json` — strict TypeScript

- [ ] 1.3 Initialize React + Vite frontend app (`apps/web`)
  - Install: `react`, `react-dom`, `react-router-dom`, `@supabase/supabase-js`, `zustand`, `@tanstack/react-query`, `axios`
  - Install shadcn/ui + Tailwind CSS
  - Install dev: `vite`, `@vitejs/plugin-react`, `typescript`
  - Create minimal `App.tsx` with router, `main.tsx` entry
  - Configure Vite to proxy `/api` to `localhost:2222`

- [ ] 1.4 Create shared types package (`packages/shared`)
  - Export TypeScript interfaces: `User`, `Container`, `AgentType`, `ContainerStatus`, `ApiResponse<T>`
  - Import shared types in both api and web

- [ ] 1.5 Verify scaffold
  - Run `pnpm dev` — both apps should start without errors
  - `GET http://localhost:2222/api/health` returns `{ status: "ok" }`

---

## GROUP 2: Database Schema and Migrations
**Goal**: Neon PostgreSQL connected, schema applied, Drizzle Studio accessible.

- [ ] 2.1 Create Drizzle schema (`apps/api/src/db/schema.ts`)
  - `users` table: id (uuid PK), email (text unique), supabase_id (text unique), polar_customer_id (text nullable), agent_type (text — 'openclaw'|'hermes'), created_at (timestamp)
  - `containers` table: id (uuid PK), user_id (uuid FK), subdomain (text unique), container_name (text unique), agent_type (text), terminal_port (int), webui_port (int nullable), subscription_status (text — 'active'|'grace_period'|'deleted'|'provisioning'|'error'), polar_subscription_id (text), deletion_scheduled_at (timestamp nullable), created_at (timestamp), last_seen_at (timestamp nullable)

- [ ] 2.2 Set up Neon DB connection (`apps/api/src/db/index.ts`)
  - Use `@neondatabase/serverless` with `ws` WebSocket adapter
  - Export Drizzle instance and schema

- [ ] 2.3 Generate and apply migration
  - Run `pnpm --filter api db:generate`
  - Run `pnpm --filter api db:migrate`
  - Verify tables created with `pnpm --filter api db:studio`

---

## GROUP 3: Supabase Auth Middleware
**Goal**: Auth middleware working — protected routes reject unauthenticated requests.

- [ ] 3.1 Create auth middleware (`apps/api/src/middleware/auth.ts`)
  - Initialize Supabase admin client with service role key
  - Extract Bearer token from Authorization header
  - Call `supabase.auth.getUser(token)` to verify JWT
  - On success: attach `c.set('user', { id, email, supabase_id })` to context
  - On failure: return `401 { error: "Unauthorized" }`

- [ ] 3.2 Create users route (`apps/api/src/routes/users.ts`)
  - `GET /api/users/me` — protected, returns user from DB (or 404 if not yet created)
  - `POST /api/users/me/agent-type` — protected, saves agent_type to user record (called from onboarding)

- [ ] 3.3 Apply middleware to all `/api/*` routes except `/api/health` and `/api/webhooks/polar`

---

## GROUP 4: Docker Images
**Goal**: Both Docker images build successfully and containers start cleanly.

- [ ] 4.1 Write OpenClaw Dockerfile (`containers/openclaw/Dockerfile`)
  ```dockerfile
  FROM node:22-slim
  RUN apt-get update && apt-get install -y \
      curl wget bash ttyd \
      && rm -rf /var/lib/apt/lists/*
  # Install OpenClaw globally
  RUN npm install -g @openclaw/openclaw
  # Install Composio
  RUN npm install -g composio-core
  # Create agent user (non-root)
  RUN useradd -m -s /bin/bash agent
  WORKDIR /home/agent
  # Copy startup script
  COPY start.sh /start.sh
  RUN chmod +x /start.sh
  USER agent
  EXPOSE 7681
  CMD ["/start.sh"]
  ```

- [ ] 4.2 Write OpenClaw start.sh (`containers/openclaw/start.sh`)
  - Start ttyd in background: `ttyd -p 7681 -W bash &`
  - Start openclaw: `openclaw` (or wait for user to start it via terminal)
  - Keep container alive: `tail -f /dev/null`

- [ ] 4.3 Write Hermes Dockerfile (`containers/hermes/Dockerfile`)
  ```dockerfile
  FROM python:3.11-slim
  RUN apt-get update && apt-get install -y \
      curl wget bash git ttyd nodejs npm \
      && rm -rf /var/lib/apt/lists/*
  # Install uv (Python package manager used by Hermes installer)
  RUN curl -fsSL https://astral.sh/uv/install.sh | bash
  ENV PATH="/root/.local/bin:$PATH"
  # Install Hermes Agent
  RUN curl -fsSL https://raw.githubusercontent.com/NousResearch/hermes-agent/main/scripts/install.sh | bash
  ENV PATH="/root/.local/bin:/root/.hermes/bin:$PATH"
  # Install hermes-webui
  RUN pip install hermes-webui 2>/dev/null || pip install git+https://github.com/nesquena/hermes-webui.git
  # Create agent user
  RUN useradd -m -s /bin/bash agent
  WORKDIR /home/agent
  COPY start.sh /start.sh
  RUN chmod +x /start.sh
  EXPOSE 7681 5000
  CMD ["/start.sh"]
  ```

- [ ] 4.4 Write Hermes start.sh (`containers/hermes/start.sh`)
  - Start ttyd: `ttyd -p 7681 -W bash &`
  - Start hermes-webui: `python -m hermes_webui --port 5000 --host 0.0.0.0 &`
  - Keep alive: `tail -f /dev/null`

- [ ] 4.5 Build and test both images locally
  - `docker build -t nestclaw/openclaw:latest containers/openclaw/`
  - `docker build -t nestclaw/hermes:latest containers/hermes/`
  - Run test container: `docker run -d -p 10001:7681 nestclaw/openclaw:latest`
  - Verify `http://localhost:10001` shows a working bash terminal in browser

---

## GROUP 5: Host Scripts
**Goal**: provision.sh and deprovision.sh work correctly on the host server.

- [ ] 5.1 Write `scripts/find-free-port.sh`
  - Takes START_PORT and END_PORT as args
  - Scans range for ports not in use (using `ss -tlnp` or `/proc/net/tcp`)
  - Echoes first available port number

- [ ] 5.2 Write `scripts/provision.sh` (full implementation)
  - Validate args (user_id, subdomain, agent_type)
  - Check container doesn't already exist (idempotency)
  - Call find-free-port.sh for terminal_port
  - Call find-free-port.sh for webui_port (if hermes)
  - Create data directory: `/opt/nestclaw/data/{subdomain}`
  - Run docker command with all correct flags (resource limits, port mappings, volume)
  - Output JSON result or JSON error
  - Chmod +x

- [ ] 5.3 Write `scripts/deprovision.sh` (full implementation)
  - Docker stop + remove
  - Optional --force data deletion
  - Idempotent (no error if container missing)
  - Output JSON
  - Chmod +x

- [ ] 5.4 Write `scripts/install-host.sh`
  - Full one-time server setup script (Docker, Node 22, pnpm, PM2, Caddy)
  - Creates nestclaw_net Docker network
  - Creates /opt/nestclaw directory structure
  - Copies scripts to /opt/nestclaw/scripts/

- [ ] 5.5 Test scripts manually on the Azure VM
  - Run provision.sh with test values
  - Verify container starts and port is accessible
  - Run deprovision.sh
  - Verify container is removed

---

## GROUP 6: Services Layer
**Goal**: All external service integrations implemented and tested with unit tests.

- [ ] 6.1 Docker service (`apps/api/src/services/docker.ts`)
  - `provisionContainer(userId, subdomain, agentType)` — executes provision.sh, parses JSON output
  - `deprovisionContainer(subdomain, force?)` — executes deprovision.sh
  - `getContainerStatus(containerName)` — `docker inspect` to get running/stopped/etc.
  - Timeout: 60s for provision, 30s for others
  - Full error handling with typed errors

- [ ] 6.2 Caddy service (`apps/api/src/services/caddy.ts`)
  - `addContainerRoutes(subdomain, terminalPort, webuiPort?)` — POST to Caddy Admin API
  - `removeContainerRoutes(subdomain)` — DELETE from Caddy Admin API
  - `healthCheck()` — verify Caddy admin API is reachable
  - Handle Caddy API response errors properly

- [ ] 6.3 Cloudflare service (`apps/api/src/services/cloudflare.ts`)
  - `createDnsRecord(subdomain)` — creates A record `{subdomain}.nestclaw.io → server IP`
  - `deleteDnsRecord(subdomain)` — deletes the record by name
  - `listRecords()` — for admin/debugging
  - (Note: wildcard *.nestclaw.io handles actual routing; this is for tracking)

- [ ] 6.4 Resend email service (`apps/api/src/services/email.ts`)
  - `sendWelcomeEmail(email, subdomain, agentType, terminalUrl, webuiUrl?)` — HTML email
  - `sendCancellationEmail(email, deletionDate)` — plain HTML email
  - Non-blocking (don't throw on failure, just log)
  - Write email templates inline (no React Email needed for MVP — plain HTML is fine)

- [ ] 6.5 Write unit tests for all services (vitest, mock external calls)
  - Mock exec, fetch, Cloudflare API
  - Test happy path + error paths for each service

---

## GROUP 7: Polar Webhook Handler (MOST CRITICAL TASK)
**Goal**: Full payment → provisioning flow working end-to-end.

- [ ] 7.1 Write webhook handler (`apps/api/src/routes/webhooks.ts`)
  ```
  POST /api/webhooks/polar (no auth middleware — uses signature verification instead)
  
  Steps for subscription.created:
    1. Read raw request body as text
    2. Verify HMAC-SHA256 signature using POLAR_WEBHOOK_SECRET
    3. Parse JSON body
    4. Extract: customer email, customer id, subscription id, metadata
    5. Upsert user in DB (by polar_customer_id or email)
    6. Get agent_type from user record (set during onboarding)
    7. Generate unique subdomain (with DB uniqueness check)
    8. Set container status to 'provisioning' in DB
    9. Call provisionContainer() service
    10. Update container record with ports and container_name
    11. Set container status to 'active'
    12. Call addContainerRoutes() service
    13. Call createDnsRecord() service
    14. Call sendWelcomeEmail() service
    15. Return 200 OK
    
  Steps for subscription.cancelled:
    1. Verify signature
    2. Find container by polar_subscription_id
    3. Update status to 'grace_period', set deletion_scheduled_at = now + 7 days
    4. Send cancellation email
    5. Return 200 OK
    
  For any other event type: return 200 OK (ignore gracefully)
  ```

- [ ] 7.2 Write cron job for container deletion (`apps/api/src/jobs/cleanup.ts`)
  - Query containers WHERE deletion_scheduled_at < now AND status = 'grace_period'
  - For each: deprovisionContainer, removeContainerRoutes, deleteDnsRecord, update status to 'deleted'
  - Schedule via setInterval every 24 hours when API starts
  - Log all actions

- [ ] 7.3 Add containers route (`apps/api/src/routes/containers.ts`)
  - `GET /api/containers/me` — returns user's container (or 404)
  - `GET /api/admin/containers` — admin only (hardcoded admin email check for now)

- [ ] 7.4 Write integration tests for webhook handler
  - Test with valid Polar payload + signature → verify DB changes
  - Test with invalid signature → verify 400 response
  - Test cancellation flow → verify grace period set

---

## GROUP 8: Frontend — Landing Page
**Goal**: Public landing page deployed, explains the product clearly.

- [ ] 8.1 Build `pages/Landing.tsx`
  - Hero: "Your AI agent, always on. $2.99/month." with CTA button
  - Pricing section: single $2.99/month card with features list
  - Agent comparison: OpenClaw vs Hermes side-by-side cards
  - How it works: 3 steps (sign up, choose agent, get your URL)
  - Footer with links
  - Responsive (mobile-first with Tailwind)

---

## GROUP 9: Frontend — Auth and Onboarding
**Goal**: Users can log in and choose their agent type.

- [ ] 9.1 Build `pages/Login.tsx`
  - Email input → "Send code" button → OTP input → "Verify" button
  - Use Supabase OTP flow
  - Redirect to dashboard (or onboarding) on success
  - Handle errors (invalid OTP, expired code)

- [ ] 9.2 Build `pages/Onboarding.tsx`
  - Show only if user has no container
  - Two cards: OpenClaw (description, features) and Hermes (description, features)
  - Clicking a card: POST to `/api/users/me/agent-type` then redirect to Polar checkout URL
  - Include Polar product checkout URL (hardcoded from env var `VITE_POLAR_CHECKOUT_URL`)

---

## GROUP 10: Frontend — Dashboard
**Goal**: Users see their container status and can access their agent.

- [ ] 10.1 Build `hooks/useContainer.ts`
  - TanStack Query fetching `GET /api/containers/me`
  - Auto-refetch every 5 seconds if status is 'provisioning'
  - Stop polling once status is 'active'

- [ ] 10.2 Build `pages/Dashboard.tsx`
  - Show: user email, agent type badge, container status badge
  - If provisioning: spinner + "Your agent is being set up (< 60 seconds)"
  - If active: "Open Terminal" button → opens terminal URL in new tab
  - If Hermes and active: "Open Web UI" button → opens webui URL in new tab
  - Show subdomain URL
  - "Manage Billing" button → Polar billing portal
  - Show creation date

- [ ] 10.3 Build `components/ContainerCard.tsx` and `components/StatusBadge.tsx`
  - StatusBadge: green (active), yellow (provisioning), red (error), grey (grace_period)

---

## GROUP 11: Caddy and SSL Configuration
**Goal**: Wildcard SSL working, dynamic routes added for test container.

- [ ] 11.1 Write `caddy/Caddyfile`
  - Wildcard domain `*.nestclaw.io` with Cloudflare DNS challenge for SSL
  - Admin API enabled on localhost:2019
  - Static file serving for main domain

- [ ] 11.2 Test Caddy on Azure VM
  - Install Caddy, start with Caddyfile
  - Verify admin API reachable: `curl http://localhost:2019/config/`
  - Add a test route via API, verify it works

---

## GROUP 12: End-to-End Test
**Goal**: Complete flow from payment to working agent, validated on Azure.

- [ ] 12.1 Deploy API to Azure VM
  - Copy code to VM, install dependencies, run migrations against Neon
  - Start API with PM2

- [ ] 12.2 Build and start Caddy on Azure VM
  - Configure with real domain (use test subdomain if no domain yet)
  - Verify SSL works

- [ ] 12.3 Simulate a Polar webhook
  ```bash
  # Generate a test webhook payload and correct signature
  # POST to /api/webhooks/polar
  # Verify: container created, ports assigned, Caddy route added
  ```

- [ ] 12.4 Access test container
  - Open `terminal.{testsubdomain}.nestclaw.io` in browser
  - Verify bash terminal works
  - Type a command, verify response

- [ ] 12.5 Build and deploy frontend to Vercel (or serve static from Caddy)

- [ ] 12.6 Fix any issues found during E2E test

---

## GROUP 13: Polish and Launch Prep
**Goal**: Production-ready for Hetzner and ProductHunt.

- [ ] 13.1 Write README.md with full setup instructions
- [ ] 13.2 Create `.env.example` files for both apps with all required variables listed
- [ ] 13.3 Write `scripts/install-host.sh` — complete one-time server setup
- [ ] 13.4 Switch Polar from test mode to live mode
- [ ] 13.5 Configure real domain on Cloudflare with wildcard A record
- [ ] 13.6 Create ProductHunt launch assets checklist in README

---

## MCP Servers Recommended for This Build
Configure these in `.kiro/mcp.json` before starting:
```json
{
  "mcpServers": {
    "fetch": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-fetch"],
      "disabled": false
    },
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": { "GITHUB_PERSONAL_ACCESS_TOKEN": "your-token" },
      "disabled": false
    }
  }
}
```
Use the fetch MCP to read ClawHost source files from GitHub directly during development.
