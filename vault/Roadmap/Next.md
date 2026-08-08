---
tags: [roadmap, next]
---

# Next

Queued for the pass after Now. Not started yet, but committed to.

## macOS + Linux polish

- [ ] Test transparent widget on macOS 12+ (expect real bugs)
- [ ] Test on Ubuntu 22.04 with GNOME (transparency behavior varies)
- [ ] Ship signed macOS DMG after Apple Developer signup

## Pro tier — first real deploy

Conditional: do this once at least a few free-tier users ask about sharing.

- [ ] `wrangler d1 create grow-buddy`, update `wrangler.toml` DB id
- [ ] Migrate: `npm run db:remote:init`
- [ ] `wrangler secret put MAGIC_LINK_SIGNING_KEY`
- [ ] Sign up for Resend, `wrangler secret put RESEND_API_KEY`
- [ ] Set up DKIM/SPF on `growbuddy.app`
- [ ] `npm run deploy`
- [ ] Rate limit `/v1/auth/magic-link` (Turnstile or KV IP throttle)

## Product

- [ ] Quick-amount row (`+100`, `+500`) for goals where 1 step isn't the right unit — widens the addressable audience beyond linear-per-click goals
- [ ] Streak count on the widget (soft — "3 days in a row you're ahead")
- [ ] Goal completion history / archive view in the panel
