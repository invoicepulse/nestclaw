# Design — NestClaw Agent Hosting Platform

## Architecture Overview

```
Internet
    │
    ▼
Cloudflare (DNS + CDN)
    │ *.nestclaw.io → server IP
    ▼
[Host Server — Azure D4s_v3 / Hetzner EPYC]
    │
    ▼
Caddy (port 80/443)
    │ nestclaw.io         → Web App (static)
    │ terminal.X.nestclaw.io → container X port 10xxx (ttyd)
    │ ui.X.nestclaw.io    → container X port 20xxx (hermes-webui)
    ▼
Hono API (port 2222) ← Polar webhooks
    │
    ├── Docker (provision.sh / deprovision.sh)
    │     ├── nestclaw_abc1234 [OpenClaw container]
    │     │     └── ttyd :7681 → host :10001
    │     ├── nestclaw_def5678 [Hermes container]
    │     │     ├── ttyd :7681 → host :10002
    │     │     └── hermes-webui :5000 → host :20001
    │     └── ... (up to 300-400 containers)
    │
    ├── Caddy Admin API (port 2019) — dynamic route registration
    ├── Neon PostgreSQL — user and container state
    ├── Supabase Auth — JWT verification
    ├── Cloudflare API — DNS management
    └── Resend — transactional email
```

## Provisioning Flow (Happy Path)

```
User pays $2.99 → Polar.sh
    │
    ▼ webhook: subscription.created
POST /api/webhooks/polar
    │
    ├─ 1. Verify Polar signature (HMAC-SHA256)
    ├─ 2. Find/create user in DB (by polar_customer_id / email)
    ├─ 3. Generate subdomain (8-char random alphanumeric, check uniqueness)
    ├─ 4. exec provision.sh → get ports + container_name
    ├─ 5. INSERT into containers table
    ├─ 6. Caddy Admin API → add terminal route (+ webui route if Hermes)
    ├─ 7. Cloudflare API → create A record (for logging; wildcard already handles routing)
    └─ 8. Resend → welcome email with terminal URL
    
Total time target: < 60 seconds
```

## Deprovisioning Flow

```
User cancels → Polar.sh
    │
    ▼ webhook: subscription.cancelled
POST /api/webhooks/polar
    │
    ├─ 1. Set subscription_status = 'grace_period'
    ├─ 2. Set deletion_scheduled_at = now + 7 days
    └─ 3. Send cancellation warning email

7 days later → Cron job (PM2 scheduled task, runs daily)
    │
    ├─ Query containers WHERE deletion_scheduled_at < now AND status = 'grace_period'
    ├─ exec deprovision.sh --force
    ├─ Remove Caddy routes
    ├─ Delete Cloudflare DNS record
    └─ Update containers table: status = 'deleted'
```

## Key Design Decisions

### Why Docker on one server (not VPS per user like ClawHost)?
ClawHost spins up a new Hetzner VPS per user (~$5-10/month minimum). That's why their pricing
is higher. We pack 300+ users into one server, keeping our cost at $0.49/user/month infrastructure.
This is what Agent37 does, and it's confirmed to work.

### Why Caddy over Nginx?
Caddy has a built-in Admin API for dynamic route registration without reloads. With Nginx,
adding a new user requires writing a config file and running `nginx -s reload`. With Caddy,
it's a single HTTP call. This is critical for sub-60-second provisioning.

### Why Supabase Auth over Firebase?
ClawHost uses Firebase for magic link auth. Firebase requires configuring email templates,
authorized domains, and service account keys. Supabase Auth sends OTP emails natively
with zero configuration beyond creating a project. Faster to set up.

### Why Polar.sh over Stripe?
Polar is designed for indie makers — simpler dashboard, easier webhook setup, built-in
customer portal, and handles EU VAT automatically. No need to build a billing portal.

### Why Neon over Supabase DB?
Neon is pure serverless PostgreSQL with better free tier limits for a new project.
We're already using Supabase for auth — keeping DB separate avoids vendor concentration.

### Subdomain Generation
```typescript
function generateSubdomain(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}
// Check uniqueness against DB before using
```

### Port Allocation
- Terminal ports: 10000–19999 (10,000 possible users — more than enough)
- WebUI ports: 20000–29999 (Hermes only)
- find-free-port.sh reads `/proc/net/tcp` or uses `ss -tlnp` to find unused ports in range

### Docker Exec from Node.js
```typescript
// services/docker.ts
import { exec } from 'child_process';
import { promisify } from 'util';
const execAsync = promisify(exec);

export async function provisionContainer(userId: string, subdomain: string, agentType: 'openclaw' | 'hermes') {
  const { stdout, stderr } = await execAsync(
    `/opt/nestclaw/scripts/provision.sh ${userId} ${subdomain} ${agentType}`,
    { timeout: 60000 }
  );
  if (!stdout) throw new Error(`Provision failed: ${stderr}`);
  return JSON.parse(stdout) as { terminal_port: number; webui_port: number | null; container_name: string };
}
```

## Frontend State Machine

```
User visits site
    │
    ├─ Not logged in → Landing Page
    │     └─ Click "Get Started" → Login Page (OTP input)
    │
    └─ Logged in
          │
          ├─ No container in DB → Onboarding Page
          │     └─ Choose agent → Redirect to Polar checkout
          │
          └─ Container exists
                ├─ status: 'provisioning' → Dashboard (polling every 5s)
                └─ status: 'active' → Dashboard (full controls visible)
```

## Email Templates (React Email)

### Welcome Email
- Subject: "Your NestClaw agent is ready 🚀"
- Content: Agent type, terminal URL (big button), webui URL if Hermes, 3 quick-start tips

### Cancellation Warning
- Subject: "Your NestClaw agent will be deleted in 7 days"
- Content: Deletion date, resubscribe link, data export reminder

## Reference: ClawHost Repo
**Repo**: https://github.com/bfzli/clawhost (MIT License — free to use commercially)
**What we copy/adapt**: 
- Polar webhook handler structure (lib/polar/)
- Cloudflare DNS service (services/cloudflare.ts)
- Resend email service setup (services/resend/)
- Frontend dashboard UI layout (adapt to our container model)
- Drizzle schema patterns

**What we DO NOT copy**:
- Hetzner Cloud VPS provisioning (apps/api/src/routes/claws.ts) — we use Docker instead
- Firebase auth — we use Supabase
- SSH key management — not needed for container model
- Volume/plan management — single plan only

## Reference: Hermes WebUI
**Repo**: https://github.com/nesquena/hermes-webui
- Pure Python + vanilla JS, no build step
- Run with: `python -m hermes_webui` (or similar)
- Proxied via Caddy at `ui.{subdomain}.nestclaw.io`
- Users get full parity with Hermes CLI from browser
