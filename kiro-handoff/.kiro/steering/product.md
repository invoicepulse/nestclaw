---
inclusion: always
---

# Product Overview: NestClaw

## What It Is
NestClaw is a shared AI agent hosting platform. For $2.99/month, any developer or power user
gets their own always-on AI agent (OpenClaw or Hermes) running in an isolated Docker container
on our bare-metal server. They access it via browser — no SSH client, no DevOps knowledge needed.

## The Core Problem We Solve
Running your own AI agent on a VPS requires: choosing a provider, setting up Docker, configuring
SSL, managing nginx, keeping the agent updated, and paying $10-20/month minimum for a small VPS.
Most people abandon it after 2 hours of setup frustration.

NestClaw eliminates all of that. One signup, one payment, 60 seconds, you're in.

## Target Users
1. **Developers** who want a personal AI agent that runs 24/7 without babysitting
2. **Non-technical power users** who want Telegram/Discord/WhatsApp AI agent automation
3. **Indie makers** who need a cheap always-on AI for automations and scheduled tasks
4. **Teams** running shared automations (Slack bots, cron tasks, web monitoring)

## Agent Types We Host

### OpenClaw
- Most popular open-source AI agent (CLI-first)
- Runs via npm: `npm install -g @openclaw/openclaw`
- Has ClawHub marketplace for skills/integrations
- Composio pre-installed: 500+ app integrations (Gmail, Slack, Notion, GitHub, etc.)
- Access via: ttyd browser terminal at `user123.nestclaw.io`

### Hermes Agent (by Nous Research)
- Released Feb 2026, 95k+ GitHub stars, fastest growing AI agent project
- Python-based, self-improving — learns from every session
- Has hermes-webui: full browser UI (not just terminal) with memory browser, skills manager
- Supports Telegram, Discord, Slack, WhatsApp gateway out of the box
- 3-layer persistent memory across sessions
- Access via: ttyd terminal + hermes-webui at `user123.nestclaw.io`
- Massive migration wave happening from OpenClaw → Hermes right now

## Key Features at Launch
- Instant provisioning (<60 seconds after payment)
- Browser-based terminal (ttyd) — no SSH client needed
- Subdomain per user (user123.nestclaw.io)
- HTTPS SSL auto-configured via Caddy + Let's Encrypt
- Choice of OpenClaw or Hermes at signup
- Composio integrations pre-installed (OpenClaw containers)
- hermes-webui pre-installed (Hermes containers)
- Container persists between sessions (data never lost)
- Graceful deprovisioning on cancellation (7-day grace period)

## Success Metrics
- 50 users = break-even
- 300 users = $750/month net profit
- Sub-60-second provisioning time
- 99%+ container uptime
- <5% monthly churn

## Monetization
- $2.99/month flat (one plan, no tiers at launch)
- Billing via Polar.sh
- Future: $4.99/month Pro (more RAM, more storage, priority support)

## What We Are NOT Building at Launch
- Multi-server support (single server only)
- Custom domain per user (subdomain only)
- User-selectable resource limits
- Team/shared containers
- Any agent beyond OpenClaw and Hermes
