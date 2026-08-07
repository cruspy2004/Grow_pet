# Grow Buddy Pro — backend

Cloudflare Workers + D1 API that powers the paid tier of Grow Buddy.
This is a **scaffold**: it runs end-to-end locally, but you must
configure your own Cloudflare account and an email provider before
deploying.

## What it does

- Magic-link email login (no passwords).
- Bearer-token sessions in D1.
- Share codes: an owner creates a code for a goal; a friend joins with
  the code to see the owner's latest snapshot on their bar.
- Snapshot upsert: the desktop client pushes actual/ideal/ratio numbers
  every few minutes; joiners read them.

Cost model: at rest it's free — Cloudflare Workers has a generous free
tier and D1 free tier covers early usage. Email delivery via Resend is
$0 up to 3k emails/month.

## Endpoints

| Method | Path | Notes |
|---|---|---|
| POST | `/v1/auth/magic-link` | Request a code by email |
| POST | `/v1/auth/verify` | Exchange code for bearer token |
| POST | `/v1/auth/logout` | Delete the current session |
| POST | `/v1/shares` | Create a share for a goal (owner) |
| POST | `/v1/shares/:code/join` | Join an existing share (joiner) |
| GET  | `/v1/shares/:code/snapshot` | Read latest snapshot |
| POST | `/v1/shares/:code/snapshot` | Push latest snapshot (owner) |
| GET  | `/v1/me/shares` | List shares I'm in |
| DELETE | `/v1/shares/:code` | Delete a share (owner) |

The `src/proClient.js` in the desktop app already calls these paths.

## Local development

```bash
cd server
npm install
npx wrangler d1 create grow-buddy               # once — copy the DB id into wrangler.toml
npm run db:local:init                            # applies migrations/0001_init.sql
npm run dev                                      # starts on http://127.0.0.1:8787
```

Without a `RESEND_API_KEY` secret, magic-link codes are printed to the
Wrangler dev console instead of being emailed. That's the fast path
for local testing.

Try it:

```bash
curl -X POST http://127.0.0.1:8787/v1/auth/magic-link \
  -H 'content-type: application/json' \
  -d '{"email":"me@example.com"}'

# check dev logs for the printed code, then:
curl -X POST http://127.0.0.1:8787/v1/auth/verify \
  -H 'content-type: application/json' \
  -d '{"email":"me@example.com","code":"THECODE"}'
```

## Deployment

1. `wrangler login` on your Cloudflare account.
2. `wrangler d1 create grow-buddy` — copy the returned `database_id`
   into `wrangler.toml`.
3. `npm run db:remote:init` to run migrations against the remote DB.
4. `wrangler secret put MAGIC_LINK_SIGNING_KEY` — any long random
   string; used to sign future long-lived tokens.
5. `wrangler secret put RESEND_API_KEY` — from resend.com. Without
   this, magic-link emails fall back to console logging (fine for
   staging, unusable in production).
6. `npm run deploy`.

## Out of scope for this scaffold

- Rate limiting on magic-link requests (add Cloudflare Turnstile or a
  KV-backed IP throttle before launch).
- Refresh tokens / token rotation.
- Stripe billing integration (Pro is currently free while we validate
  demand — the plan is to add Stripe subscriptions once the tier has
  active users).
- Analytics — deliberately none for now, matching the free-tier trust
  story.
