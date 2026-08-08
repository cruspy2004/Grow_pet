---
tags: [roadmap]
---

# Launch Plan

The full path from "runs on my machine" to "public launch." Free tier first; Pro tier is a phase-7 activity gated on free-tier demand signal.

## Phase 0 — Decide (DONE)

- [x] Name: [[Positioning|Grow Buddy]]
- [x] Audience: people with goals
- [x] Free = local single-user, Pro = social layer
- [x] Windows first, macOS + Linux to follow
- [x] Local-only free tier, no backend needed for v1 of the free product

## Phase 1 — Close product gaps (DONE)

- [x] Restore single-click promise (bar always visible when a goal is active) — [[2026-08-07 Always-visible bar]]
- [x] Pet is the +1 button
- [x] Draggable widget (dedicated drag handle)
- [x] Goal-completion celebration + panel banner
- [x] Export/import data
- [x] Behind-pace opt-in notification
- [x] Schema version + serialized save queue — [[2026-08-07 Schema version 1]]

## Phase 2 — Engineering quality (DONE)

- [x] Race-safe writes (atomic tmp rename, serialized queue)
- [x] Local rotating logger
- [x] Global +1 hotkey
- [x] 18 unit tests around pure logic
- [x] CSP tightened (no `unsafe-inline`)

## Phase 3 — Packaging (PARTIAL)

- [x] `electron-builder` config in package.json
- [x] Placeholder `build/icon.png` + `build/README.md` regen instructions
- [ ] Real 1024×1024 brand icon
- [ ] Generate `build/icon.ico` and `build/icon.icns`
- [ ] Windows code-signing cert (Sectigo / SSL.com, ~$70/yr)
- [ ] Apple Developer + notarization for macOS DMG
- [ ] Auto-update via `electron-updater` pointed at GitHub Releases

## Phase 4 — Marketing surface (PARTIAL)

- [x] Landing page (`web/`) — [[Landing Copy]]
- [x] Free-vs-Pro story documented in [[PRIVACY.md|PRIVACY]]
- [x] MIT LICENSE
- [ ] Record 10-15 sec demo GIF — [[Demo GIF Script]]
- [ ] 3 real screenshots (idle / logging / panel)
- [ ] Deploy `web/` to GitHub Pages
- [ ] Domain: `growbuddy.app` (buy it if desired)

## Phase 5 — Launch (NOT STARTED)

- [ ] HN Show HN post
- [ ] Product Hunt Ship
- [ ] r/productivity, r/getdisciplined post
- [ ] IndieHackers write-up
- [ ] Twitter/X launch thread
- See [[Launch Channels]] for the day-by-day plan.

## Phase 6 — Post-launch (NOT STARTED)

- [ ] v1.0.1 with top-3 bug fixes from launch feedback
- [ ] "What I learned" launch post (second traffic wave)
- [ ] Decide on next big thing based on user asks

## Phase 7 — Pro tier (NOT STARTED)

Gated on free-tier users explicitly asking for a share/social feature.

- [ ] Deploy `server/` to real Cloudflare + D1 — [[Pro Tier]]
- [ ] Wire up Resend for magic-link email deliverability
- [ ] Add rate limiting on `/v1/auth/magic-link`
- [ ] Add Stripe billing (only when there's usage to bill for)
- [ ] Refresh tokens / token rotation
