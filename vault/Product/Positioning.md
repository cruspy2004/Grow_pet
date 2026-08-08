---
tags: [product, positioning]
---

# Positioning

## Name

**Grow Buddy.** Decided on [[2026-08-06 Rename to Grow Buddy]]. The internal code name was "Grow Pet"; the PRD/design doc originally called it "Pacer."

## Audience

**People with goals.** Deliberately broad in v1. Narrower niches (indie hackers, students, savers, dieters) will get their own landing pages later, but v1 talks to anyone with a linear, date-bound goal.

## Tiers

### Free

- 100% local. No account, no server, no telemetry.
- Everything the original PRD promised: pet + bar + one click = +1 step.
- Data lives in `%APPDATA%\Grow Buddy\goals.json` (Windows equivalents on macOS/Linux).
- See [[Free Tier]] for implementation.

### Pro (opt-in)

- Adds a **social layer**: see other people's progress on the same bar via share codes.
- Requires an account + a backend (magic-link auth, no passwords).
- Only uploads the small snapshot fields needed to render a friend's marker — never raw step history or the user's target amount.
- Currently free while validating demand; Stripe integration deferred to a follow-up.
- See [[Pro Tier]] for implementation.

## Why this split works

- Free tier is the trust anchor. Local-only is a strong promise most competitors can't make.
- Pro tier is inherently networked — worth zero alone, meaningful with a buddy. That creates viral loops (invite a friend to use it) that free-only wouldn't.
- The ghost/multiplayer marker from `design-doc.txt §8` was already envisioned as a future extension. Elevating it to the monetization hook keeps the product coherent instead of bolting on unrelated features.

## Pricing (not final)

- Free forever for the local tier.
- Pro: TBD. Instinct is $4-6/month or a one-time $29, decided after 100+ free users tell us what a Pro invite would need to be worth.

## What we are NOT competing with

- Habit apps like Streaks, Habitica — those track binary daily behavior. Grow Buddy tracks numeric progress toward a specific dated target.
- Todo apps — those are lists. Grow Buddy is one goal, one number, one deadline.
- Financial trackers — Grow Buddy doesn't sync your bank account; you tell it what "one step" is worth.

## Positioning line

> "The pet that walks only as fast as you do."

Used on the landing page hero. Short, memorable, and encodes both the ambient-visibility and the ahead/behind-pace mechanics.
