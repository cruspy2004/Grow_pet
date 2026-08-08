---
tags: [decision, data]
date: 2026-08-07
status: accepted
---

# Schema version 1 with normalizer

## Decision

Persisted state carries a `schemaVersion: 1` field. Every load goes through `normalizeState()` in `src/state.js`, which migrates any legacy or malformed input into the current shape.

## Context

The original `main.js` normalized state on load but had no explicit version marker. Two things forced a change:

1. The [[Pro Tier]] addition introduces a `pro` object with `enabled`, `apiBaseUrl`, `userToken`, `userEmail`, `shares[]`. Existing installs' `goals.json` won't have this.
2. The upcoming quick-amounts / streak features (see [[Next]]) will each want their own defaults on installs that predate them.

Without a schema version and a normalizer, every new field becomes a defensive `|| default` scattered through the code — brittle and easy to get wrong.

## What's in v1

- `schemaVersion: 1`
- `settings`: `autoHideSeconds`, `launchAtStartup`, `notifyWhenBehind`, `hotkeyPlusOne`
- `pro`: full [[Pro Tier]] shape
- `goals`: existing fields + `archived`, `shareCode`
- `stepEvents`: unchanged

## Migration policy

- **Missing `schemaVersion`** → treated as pre-v1. `migrateFromLegacy` fills in defaults and stamps `schemaVersion: 1`.
- **Newer than v1** → left alone (future-forward compatibility on downgrade is a non-goal for a solo desktop app; the user shouldn't downgrade).
- **Malformed** → normalized (bad types coerced, bad arrays defaulted to empty).

Every migration path is exercised by `tests/state.test.js`.

## Save safety

Landing schema versioning alongside a **serialized save queue** with atomic tmp-file rename in `main.js`:

- All mutations chain onto `saveQueue` — no interleaving writes.
- Write path: `writeFile('goals.json.tmp')` then `rename` to `goals.json`. Near-atomic on NTFS, atomic on POSIX.
- Errors are logged but never crash the app.

## Consequences

- Every new setting or field must be added to `DEFAULT_STATE` in `src/state.js` AND to `normalizeState` so it appears on old installs.
- Bump `CURRENT_SCHEMA_VERSION` only when the shape becomes incompatible with the v1 normalizer.

## Superseded by

Nothing yet.
