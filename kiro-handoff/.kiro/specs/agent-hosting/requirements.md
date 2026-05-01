# Requirements — NestClaw Agent Hosting Platform

## Introduction
NestClaw is a SaaS platform where users pay $2.99/month to receive a fully provisioned,
isolated Docker container running either OpenClaw or Hermes Agent, accessible via browser
terminal within 60 seconds of payment confirmation.

This spec covers the complete MVP: infrastructure scripts, API backend, frontend dashboard,
billing integration, and Docker images for both agent types.

---

## Requirement 1 — Docker Images

**User Story:** As the platform operator, I need pre-built Docker images for OpenClaw and
Hermes Agent so that containers can be provisioned quickly and consistently for users.

### Acceptance Criteria

**OpenClaw Image (containers/openclaw/Dockerfile):**
1. WHEN the OpenClaw image is built, THEN it SHALL be based on `node:22-slim`
2. WHEN the image starts, THEN it SHALL have `@openclaw/openclaw` installed globally via npm
3. WHEN the image starts, THEN it SHALL have `ttyd` installed and running on port 7681
4. WHEN the image starts, THEN it SHALL have Composio CLI available for integrations
5. WHEN a user opens the browser terminal, THEN they SHALL land in a bash shell as user `agent`
6. WHEN the container restarts, THEN any data in `/home/agent/.openclaw` SHALL persist (via mounted volume)

**Hermes Image (containers/hermes/Dockerfile):**
1. WHEN the Hermes image is built, THEN it SHALL be based on `python:3.11-slim`
2. WHEN the image starts, THEN it SHALL have Hermes Agent installed via the official install script
3. WHEN the image starts, THEN it SHALL have `ttyd` running on port 7681 (bash shell)
4. WHEN the image starts, THEN it SHALL have `hermes-webui` running on port 5000
5. WHEN a user opens the web UI, THEN they SHALL see the Hermes WebUI without additional setup
6. WHEN the container restarts, THEN data in `/home/agent/.hermes` SHALL persist (via mounted volume)

---

## Requirement 2 — Host Provisioning Scripts

**User Story:** As the platform operator, I need bash scripts that create and destroy user
containers on the host server so the API can provision users automatically.

### Acceptance Criteria

**provision.sh:**
1. WHEN called with `<user_id> <subdomain> <agent_type>`, THEN it SHALL create a running Docker container
2. WHEN provisioning, THEN it SHALL find and assign free host ports for terminal (and webui for Hermes)
3. WHEN the container is created, THEN it SHALL output valid JSON: `{"terminal_port": N, "webui_port": N|null, "container_name": "..."}`
4. WHEN provisioning fails, THEN it SHALL output `{"error": "reason"}` with exit code 1
5. WHEN called for the same subdomain twice, THEN it SHALL return an error (idempotency check)
6. WHEN creating a container, THEN it SHALL enforce CPU and RAM limits

**deprovision.sh:**
1. WHEN called with `<subdomain>`, THEN it SHALL stop and remove the container
2. WHEN called with `--force` flag, THEN it SHALL also delete the user's data directory
3. WHEN the container does not exist, THEN it SHALL succeed silently (idempotent)
4. WHEN called, THEN it SHALL output `{"success": true}`

---

## Requirement 3 — Database Schema and Migrations

**User Story:** As the system, I need a database to track users and their containers so the
API can retrieve container status and manage provisioning state.

### Acceptance Criteria
1. WHEN the migration runs, THEN it SHALL create a `users` table with: id, email, supabase_id, polar_customer_id, agent_type, created_at
2. WHEN the migration runs, THEN it SHALL create a `containers` table with: id, user_id, subdomain, container_name, agent_type, terminal_port, webui_port, subscription_status, polar_subscription_id, deletion_scheduled_at, created_at, last_seen_at
3. WHEN a user's supabase_id is inserted, THEN it SHALL be unique
4. WHEN a subdomain is inserted, THEN it SHALL be unique
5. WHEN `pnpm --filter api db:migrate` is run, THEN all migrations SHALL apply without errors

---

## Requirement 4 — Supabase Auth Middleware

**User Story:** As a user, I want to sign in with my email (OTP magic code) so that I can
access my dashboard securely without managing a password.

### Acceptance Criteria
1. WHEN a user submits their email, THEN the frontend SHALL call Supabase's OTP send method
2. WHEN the user enters the correct OTP, THEN Supabase SHALL return a JWT session token
3. WHEN the frontend makes API requests, THEN it SHALL include the JWT in the Authorization header
4. WHEN the API receives a request to a protected route, THEN it SHALL verify the JWT with Supabase
5. WHEN the JWT is invalid or expired, THEN the API SHALL return `401 Unauthorized`
6. WHEN the JWT is valid, THEN the API SHALL attach the decoded user to the request context

---

## Requirement 5 — Polar.sh Webhook Handler (MOST CRITICAL)

**User Story:** As a new customer, I want my agent container to be automatically provisioned
within 60 seconds of completing payment so I can start using my agent immediately.

### Acceptance Criteria
1. WHEN Polar sends a `subscription.created` webhook, THEN the API SHALL verify the webhook signature
2. WHEN signature is valid and subscription is active, THEN the API SHALL:
   a. Create or find the user in the database
   b. Generate a unique 8-char subdomain
   c. Run provision.sh with the user's agent_type preference
   d. Store container details (ports, subdomain) in the containers table
   e. Register terminal (and webui) routes in Caddy via Admin API
   f. Create Cloudflare DNS record via API
   g. Send welcome email via Resend with the user's access URLs
3. WHEN any provisioning step fails, THEN the API SHALL log the error and set container status to 'error'
4. WHEN Polar sends a `subscription.cancelled` webhook, THEN the API SHALL:
   a. Set subscription_status to 'grace_period'
   b. Set deletion_scheduled_at to now + 7 days
   c. Send cancellation warning email
5. WHEN a container has passed its deletion_scheduled_at, THEN a cron job SHALL run deprovision.sh
6. WHEN the webhook endpoint receives an invalid signature, THEN it SHALL return 400 immediately

---

## Requirement 6 — Container Status API

**User Story:** As a logged-in user, I want to see my container's status and access links
so I can connect to my agent from the dashboard.

### Acceptance Criteria
1. WHEN a user calls `GET /api/containers/me`, THEN it SHALL return their container details
2. WHEN the container is running, THEN the response SHALL include terminal_url and (for Hermes) webui_url
3. WHEN the container is not yet provisioned, THEN the response SHALL return status: 'provisioning'
4. WHEN the user has no active subscription, THEN it SHALL return 404

---

## Requirement 7 — Frontend Dashboard

**User Story:** As a logged-in user, I want a clean dashboard that shows my agent container
status and gives me one-click access to my terminal and web UI.

### Acceptance Criteria
1. WHEN a user visits the landing page, THEN they SHALL see: headline, pricing, agent type comparison, CTA
2. WHEN a user clicks "Get Started", THEN they SHALL be directed to the login page
3. WHEN a new user logs in for the first time (no container), THEN they SHALL see the onboarding page
4. WHEN on onboarding, THEN the user SHALL choose between OpenClaw and Hermes (with descriptions)
5. WHEN the user chooses an agent, THEN they SHALL be redirected to Polar checkout ($2.99/month)
6. WHEN a returning user logs in with an active container, THEN they SHALL see the dashboard
7. WHEN on the dashboard, THEN the user SHALL see: container status badge, terminal button, webui button (Hermes only), uptime, agent type
8. WHEN the user clicks "Open Terminal", THEN it SHALL open `terminal.{subdomain}.nestclaw.io` in a new tab
9. WHEN the container is provisioning, THEN the dashboard SHALL auto-refresh every 5 seconds until active

---

## Requirement 8 — Welcome Email

**User Story:** As a new user, I want to receive a welcome email with my access URLs
immediately after provisioning so I know how to connect to my agent.

### Acceptance Criteria
1. WHEN provisioning completes, THEN Resend SHALL send a welcome email to the user's address
2. WHEN the email arrives, THEN it SHALL include: terminal URL, webui URL (Hermes only), quick-start instructions
3. WHEN the email is sent, THEN it SHALL come from `hello@nestclaw.io`
4. WHEN sending fails, THEN the API SHALL log the error but NOT fail the provisioning flow
