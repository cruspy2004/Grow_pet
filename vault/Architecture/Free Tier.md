---
tags: [architecture, tier-free]
---

# Free Tier

The free tier is **100% local** — no account, no server, no telemetry, no network calls.

## Storage

A single JSON file per install:

- Windows: `%APPDATA%\Grow Buddy\goals.json`
- macOS: `~/Library/Application Support/Grow Buddy/goals.json`
- Linux: `~/.config/Grow Buddy/goals.json`

Plus a rotating log at `logs/app.log` (1 MB cap) beside it.

## Shape

```json
{
  "schemaVersion": 1,
  "settings": { ... },
  "pro": { ... },        // present but unused when pro.enabled is false
  "goals": [ ... ],
  "stepEvents": [ ... ]
}
```

Full shape lives in [[Data Model]].

## Write safety

Every mutation goes through `scheduleSave()` in `main.js`:

- Serializes writes on a single promise chain (no interleaving).
- Writes to `goals.json.tmp` then `rename`s to `goals.json` (atomic on POSIX; near-atomic on Windows NTFS).
- Errors are logged but never crash the app.

## Schema versioning

`CURRENT_SCHEMA_VERSION = 1`. On load, `normalizeState()` migrates any older or malformed input to v1. New settings get defaulted; unknown fields are dropped. See [[2026-08-07 Schema version 1]].

## No network — really

- No analytics library, no crash reporter, no update-check ping.
- The Pro sync code path (`src/proClient.js`) only runs if `state.pro.enabled` is `true`, which requires a user to explicitly turn it on and save an access token.
- CSP on both renderers is `default-src 'none'; style-src 'self'; script-src 'self'; img-src 'self' data:`. No CDN, no Google Fonts, nothing.

## Trust story

If you `netstat` Grow Buddy on the free tier, you should see zero connections. That's the promise, and it's what lets us charge for Pro on top of an otherwise generous free product.
