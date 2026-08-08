---
tags: [decision, infra]
date: 2026-08-07
status: accepted
---

# Cloudflare Workers + D1 for the Pro backend

## Decision

The [[Pro Tier]] backend is a Cloudflare Workers app (Hono router) backed by D1 (SQLite at the edge), with Resend for magic-link email delivery.

## Context

Options considered for the Pro tier backend:

1. **Supabase** — Postgres + auth + REST out of the box.
2. **Cloudflare Workers + D1** — edge-first, generous free tier, minimal ops.
3. **Vercel + Neon** — familiar stack, more expensive at scale.
4. **Self-hosted Node + SQLite** — maximum control, worst ops burden for a solo dev.

## Why Cloudflare Workers + D1

- Free tier is real: 100k requests/day + 5M reads/day on D1. Enough for the first several thousand Pro users.
- Zero cold start on the edge; Pro sync happens every 5 minutes and needs to feel instant.
- D1 is just SQLite. Migrations are plain `.sql` files. No ORM required.
- Wrangler CLI is good enough that a scaffolded app runs locally in one command.
- Hono is a small, well-typed router that fits Workers ergonomics without heavyweight framework baggage.

## Why not Supabase

- We only need small primitives (users, sessions, shares, snapshots). Supabase's row-level security machinery is more surface area than needed.
- No obvious lever for cost when we scale.
- Auth story is opinionated in ways that don't match our magic-link-only decision.

## Consequences

- `server/` in the repo owns the whole backend surface — a self-contained subproject with its own `package.json`, `tsconfig.json`, `wrangler.toml`, migrations, and README.
- `src/proClient.js` in the desktop app calls the exact paths implemented in `server/src/index.ts` — client and server ship together.
- Deployment gated on: (a) a Cloudflare account, (b) a Resend account for real email, (c) DNS on `growbuddy.app`. Documented in `server/README.md`.

## Out of scope (deferred)

- Rate limiting on `/v1/auth/magic-link` — must add Turnstile or a KV IP throttle before public launch.
- Refresh tokens — current bearer tokens are long-lived.
- Stripe billing — Pro is free while validating demand.

## Superseded by

Nothing yet.
