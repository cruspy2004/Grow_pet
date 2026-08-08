---
tags: [architecture, tier-pro]
---

# Pro Tier

The Pro tier adds a **social layer**: see other people's progress on the same bar via share codes. Opt-in per user; the [[Free Tier]] keeps working unchanged.

## What's on the wire

Per goal that a user opts into sharing, the client pushes a small snapshot every 5 min:

```json
{
  "goalName": "Mercedes fund",
  "target": 5000000,
  "deadline": "2026-08-28",
  "actual": 1200000,
  "ideal": 1400000,
  "actualRatio": 0.24,
  "idealRatio": 0.28,
  "isBehind": true,
  "isComplete": false,
  "reportedAt": "2026-08-07T20:00:00Z"
}
```

Nothing else leaves the machine. No step history, no unit value, no personal notes.

## Endpoints (implemented in `server/`)

| Method | Path | Role |
|---|---|---|
| POST | `/v1/auth/magic-link` | Send an email code |
| POST | `/v1/auth/verify` | Exchange code for a bearer token |
| POST | `/v1/auth/logout` | Delete session |
| POST | `/v1/shares` | Owner creates a share for a goal |
| POST | `/v1/shares/:code/join` | Joiner joins by code |
| GET  | `/v1/shares/:code/snapshot` | Read latest |
| POST | `/v1/shares/:code/snapshot` | Owner pushes latest |
| GET  | `/v1/me/shares` | List my shares |
| DELETE | `/v1/shares/:code` | Owner deletes |

## Stack

- **Cloudflare Workers** — free tier is generous; deploy from `wrangler` CLI.
- **D1 (SQLite at the edge)** — same reasoning: free tier + no ops.
- **Hono** — small router with good Workers ergonomics.
- **Resend** — for magic-link email; optional (falls back to dev-console log if `RESEND_API_KEY` isn't set).

## Data model — server side

See `server/migrations/0001_init.sql`. Tables:

- `users` (id, email, display_name, created_at)
- `magic_codes` (code, email, expiry, consumed_at)
- `sessions` (token, user_id, created_at, last_seen_at)
- `shares` (code, owner_user_id, goal_label, created_at)
- `share_participants` (share_code, user_id, joined_at)
- `snapshots` (share_code PK, reported_at, payload JSON)

## Client-side wiring

- `src/proClient.js` — HTTP calls.
- Panel's Pro tab (`renderer/panel.html`, `panel.js`) — account settings, buddy list, join-code and create-code flows.
- Main-process `runProSync()` — 5-minute interval push+pull once `state.pro.enabled` is true and a token is saved.

## Out of scope (deferred)

- **Rate limiting.** Needed before public launch; add Cloudflare Turnstile or KV-backed IP throttle on `/v1/auth/magic-link`.
- **Refresh tokens.** Current bearer tokens are long-lived until logout.
- **Stripe billing.** Pro is free while we validate demand (see [[Positioning]]).
- **Real email deliverability.** Requires DKIM/SPF on `growbuddy.app` domain.

## Decision links

- [[2026-08-06 Two-tier free plus Pro]]
- [[2026-08-07 Cloudflare Workers backend]]
