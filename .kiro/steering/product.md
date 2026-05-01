---
inclusion: always
---

# Product: NestClaw

NestClaw is a multi-tenant AI agent hosting SaaS. Users pay $2.99/month and get an isolated Docker container running either **OpenClaw** or **Hermes Agent**, accessible 24/7 via a browser terminal — no SSH or DevOps knowledge required. Containers are provisioned automatically within 60 seconds of payment.

## Infrastructure Model
- Single bare-metal server (Hetzner EPYC, 384GB RAM) — NOT one VPS per user
- Each user = one Docker container: 1 vCPU soft, 4GB RAM, 3GB storage volume
- Containers are network-isolated; only the API can reach them
- Testing phase uses Azure Standard_D4s_v3 (free credits) before committing to Hetzner

## Agent Types

### OpenClaw
- CLI-first, Node.js-based AI agent
- Composio pre-installed (500+ integrations)
- Access: ttyd browser terminal at `{subdomain}.nestclaw.io`

### Hermes Agent
- Python-based, self-improving; includes hermes-webui (full browser UI)
- Supports Telegram, Discord, Slack, WhatsApp natively
- Access: ttyd terminal at `{subdomain}.nestclaw.io` + web UI at `ui.{subdomain}.nestclaw.io`

## Key Flows
1. User pays → Polar webhook → provision container → register Caddy routes → create DNS → send welcome email
2. User cancels → set `grace_period` → schedule deletion 7 days out → deprovision on schedule

## Business Model
- $2.99/month flat (one plan)
- Break-even: 50 users; target: 300 users (~$750/month net profit)
- Users choose agent type at signup; cannot change without admin

## Out of Scope (launch)
- Multi-server support
- Custom domains per user
- User-selectable resource limits
- Team/shared containers
- Any agent beyond OpenClaw and Hermes
