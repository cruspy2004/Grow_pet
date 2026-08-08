---
tags: [decision, business-model]
date: 2026-08-06
status: accepted
---

# Two-tier: free local, paid social

## Decision

Ship two tiers:

- **Free:** the local-only, no-account experience from the PRD.
- **Pro (paid, opt-in):** adds the ability to see other people's progress on the same bar via share codes.

## Context

The user brought the tiering question in Phase 0 of the [[Launch Plan]]. Options considered:

1. Free & open source, no paid tier
2. Free desktop, paid Pro with sync
3. One-time $19 purchase, no free
4. Donationware

## Why free + Pro social

- The original PRD's design-doc §8 already imagined a "ghost / multiplayer marker" as a future extension. Elevating it to the paid tier makes the product more coherent (one feature, one monetization) instead of bolting on unrelated Pro features.
- Free tier stays a strong trust anchor: no account, no server, no telemetry. That's rare and defensible.
- Pro is inherently networked — worth zero alone, valuable with a buddy. Creates a viral loop: invite a friend → they install the free app → they might upgrade.
- Impossible to replicate locally: pays for itself in server cost + real ongoing value, not just brand.

## Consequences

- Backend work required (Cloudflare Workers + D1 — see [[2026-08-07 Cloudflare Workers backend]]) but ONLY in service of Pro. The free tier never needs the network.
- Data model gains a `pro` section with `enabled`, `apiBaseUrl`, `userToken`, `userEmail`, `shares[]`.
- Privacy story becomes tiered — [[PRIVACY.md]] carefully separates what leaves the machine on Pro vs. what doesn't (never raw history, never unit value).
- Pro tier is deferred to Phase 7 — do not build the backend in production until free tier has users asking for it.

## Superseded by

Nothing yet.
