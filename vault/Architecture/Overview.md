---
tags: [architecture]
---

# Overview

## Two processes, two windows

Electron app.

- **Main process** (`main.js`) owns state, IPC, file I/O, notifications, hotkey registration, tray, and window lifecycle.
- **Preload** (`preload.js`) exposes a locked-down `window.growBuddy` API via `contextBridge`. Renderers have zero Node access.
- **Widget renderer** (`renderer/widget.{html,css,js}`) is the transparent always-on-top surface with the pet, bar, and +1/caret. See [[Free Tier]].
- **Panel renderer** (`renderer/panel.{html,css,js}`) is the full control window with Goals / Pro / Settings tabs.

## Pure logic lives in `src/`

Everything Electron-independent is separated so it can be unit-tested and reused by both renderers and the Pro tier server.

| File | Purpose |
|---|---|
| `src/compute.js` | Goal-metric math: actual, ideal, delta, requiredPace, ratios, completion detection. See [[Data Model]]. |
| `src/state.js` | Schema versioning (`CURRENT_SCHEMA_VERSION = 1`) and normalization. See [[2026-08-07 Schema version 1]]. |
| `src/logger.js` | Local rotating file logger (1 MB cap). |
| `src/proClient.js` | HTTP client for [[Pro Tier]] snapshot push/pull. |

## Tests

`tests/compute.test.js` (13 tests) + `tests/state.test.js` (5 tests). Both use Node's built-in test runner. Run with `npm test`.

## Data flow (write path)

1. Renderer calls `window.growBuddy.addStep({ goalId, delta })`.
2. Preload turns it into an `ipcRenderer.invoke('step:add', ...)`.
3. Main handler appends a `StepEvent`, calls `scheduleSave()`.
4. `scheduleSave()` chains onto a promise so writes are serialized; each write is atomic (`writeFile` to `.tmp` then `rename`).
5. Main calls `sendSnapshot()` — both renderers receive the new state via `state:snapshot`.
6. Both renderers re-render idempotently from the snapshot.

## Data flow (Pro sync)

1. Every 5 min, main calls `runProSync()` if `state.pro.enabled`.
2. For each outgoing share, `proClient.pushSnapshot()` POSTs a minimal snapshot to `/v1/shares/:code/snapshot`.
3. `proClient.pullIncoming()` GETs snapshots for every share we've joined.
4. Received snapshots are merged into `state.pro.shares[i].snapshot` and rebroadcast.

## Backend

`server/` is a Cloudflare Workers + D1 scaffold that implements the endpoints `src/proClient.js` calls. See [[Pro Tier]].

## Landing page

`web/` is a static single-page site. Deployable to GitHub Pages or Vercel.

## Packaging

`electron-builder` config lives in `package.json` under `build`. Icons + entitlements are in `build/`. See `build/README.md` for regen instructions.
