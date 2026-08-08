---
tags: [decision]
date: 2026-08-06
status: accepted
---

# Rename to Grow Buddy

## Decision

Ship as **Grow Buddy** across code, installers, landing page, and stores. Retire "Grow Pet" (internal code name) and "Pacer" (PRD/design-doc name).

## Context

Three names were in use:

- **Pacer** in `prd.txt` and `design-doc.txt`.
- **Grow Pet** in `package.json`, IPC prefixes, window titles.
- **Grow Buddy** — a fresh candidate that stuck.

## Why Grow Buddy

- "Pet" reads too generic in a store search; "Buddy" is more distinctive.
- "Buddy" primes the [[Pro Tier]] social angle (share with your buddy) — it's the same word.
- Not taken on npm, GitHub, or major domain endings we care about at the time of the decision.
- The user's working directory is already `D:/grow_buddy` — reduces friction.

## Consequences

- Full rename pass across `package.json`, `preload.js` (`window.growPet` → `window.growBuddy`), `shared.js` (`window.growPetShared` → `window.growBuddyShared`), all HTML titles, main window title. Sprite filenames (`me-*.png`, `naruto-*.png`) are neutral and stay.
- README, LICENSE, PRIVACY all name the product Grow Buddy.
- Original design docs (`prd.txt`, `design-doc.txt`) still say "Pacer" — kept as-is for historical trace; ported to Markdown in this vault with the new name at the top.
