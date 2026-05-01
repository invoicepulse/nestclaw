# KIRO AGENT INSTRUCTIONS — READ THIS FIRST

You are building a production SaaS called **NestClaw** (working name — rename if you prefer).
This is a shared AI agent hosting platform. Users pay $2.99/month and receive their own
isolated Docker container running either **OpenClaw** or **Hermes Agent**, accessible 24/7
via a browser terminal (ttyd) and web UI. No SSH client needed.

## What You Are Building — In One Sentence
A multi-tenant AI agent hosting platform on a single bare-metal server, where each user's
agent lives in an isolated Docker container with CLI access, pre-installed integrations,
and a persistent subdomain — all provisioned automatically within 60 seconds of payment.

## Autonomous Mode
This is a 4-hour build session. You are running autonomously. Do the following:
- Make all architectural decisions yourself — do not pause to ask.
- Follow the task list in `.kiro/specs/agent-hosting/tasks.md` top to bottom.
- When a task is complete, immediately start the next one.
- If you hit a blocker on an external service credential, stub it with a TODO comment and continue.
- Write real working code, not placeholders. Every function must be implemented.
- After each task group, run the relevant tests before moving on.

## Competitors to Understand
- **Agent37** (agent37.com) — does OpenClaw only at $3.99/mo, confirmed Docker containers + ttyd
- **ClawHost** (github.com/bfzli/clawhost, MIT) — open source, provisions dedicated VPS per user.
  We adapt their billing, DNS, email, and frontend logic but replace VPS provisioning with Docker.

## Our Advantages Over Agent37
1. $2.99/mo vs $3.99/mo — cheapest on market
2. Both OpenClaw AND Hermes Agent (Agent37 does OpenClaw only)
3. hermes-webui bundled in Hermes containers (browser UI, not just terminal)
4. Clean modern dashboard UI

## Infrastructure Model (CRITICAL — READ THIS)
We are NOT spinning up a new VPS per user. That is ClawHost's model. Ours is different:
- ONE dedicated bare-metal server (Hetzner Auction: AMD EPYC 7502P, 384GB RAM, 960GB NVMe, ~$146/mo)
- Each user = one Docker container on that server
- Containers are isolated via Docker networking — no container can reach another
- Resource limits: 1 vCPU soft, 4GB RAM soft, 3GB storage volume per container
- We are testing first on Azure Standard_D4s_v3 (free credits) before committing to Hetzner

## Business Model
- Price: $2.99/month per user (one plan, no tiers)
- Break-even: 50 users ($149.50 revenue)
- Target: 300 users = ~$750/month net profit
- Billing: Polar.sh (webhook-driven container provisioning)
- Users choose OpenClaw OR Hermes at signup (can't change later without admin)
