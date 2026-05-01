---
inclusion: always
---

# Autonomous Build Mode

## Session Goal
Complete the full NestClaw MVP in a single autonomous session.
Every task must be implemented with real, working code — no stubs, no TODOs for core logic.

## Behavior Rules
1. **Do not pause to ask questions.** Make all decisions yourself based on the steering files.
2. **Do not ask for confirmation** on library choices, file naming, or architecture decisions.
3. **When blocked by missing credentials**, add a clearly labeled `// MISSING: ENV_VAR_NAME` comment and continue implementing the rest of the function.
4. **Follow tasks.md strictly** — complete tasks in order, do not skip ahead.
5. **After completing each task group**, run `pnpm check` and `pnpm test` before continuing.
6. **Fix any TypeScript errors immediately** — do not leave type errors.
7. **Write real implementations**: Every service function (caddy, cloudflare, docker, resend) must have the actual HTTP calls, not empty shells.
8. **Build the Dockerfiles completely** — they must be runnable with `docker build`.
9. **The webhook handler is the most critical piece** — implement it fully with signature verification, error handling, and all side effects.

## Decision Defaults (use these when you have a choice)
- Error handling: try/catch with typed error returns (no unhandled rejections)
- Logging: console.log with structured JSON objects (timestamp, level, message, data)
- Port conflicts: always re-scan before assigning (never assume a port is free)
- Missing optional env vars: log a warning and disable the feature gracefully
- CORS: allow the web app origin only in production, all origins in dev
- Timeouts: 30 seconds for Docker exec operations, 10 seconds for external API calls
- Retries: 3 retries with exponential backoff on Cloudflare and Caddy calls

## Quality Bar
- All routes must have Zod input validation
- All DB operations must handle connection errors
- No `any` types in TypeScript
- All async functions must have proper error boundaries
- Docker exec calls must handle stdout/stderr and non-zero exit codes
