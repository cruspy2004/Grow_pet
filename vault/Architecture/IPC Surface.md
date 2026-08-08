---
tags: [architecture, ipc]
---

# IPC Surface

Every method exposed on `window.growBuddy` by `preload.js`, and the main-process handler it maps to.

## Read

| Method | IPC channel | Returns |
|---|---|---|
| `getState()` | `app:get-state` | Full snapshot |

## Windows

| Method | IPC channel | Effect |
|---|---|---|
| `openPanel()` | `panel:open` | Creates or focuses the panel window |
| `notifyRightClick()` | `widget:right-click` (send) | Opens panel |
| `showPanelFromWidget()` | `widget:toggle-panel` (send) | Opens panel |

## Goals

| Method | IPC channel | Effect |
|---|---|---|
| `createGoal(payload)` | `goal:create` | Upsert new goal |
| `updateGoal(payload)` | `goal:update` | Upsert existing goal |
| `activateGoal(goalId)` | `goal:activate` | Mark one goal as active |
| `deleteGoal(goalId)` | `goal:delete` | Delete goal + its steps + related shares |
| `archiveGoal(goalId)` | `goal:archive` | Set `archived: true` without deleting history |
| `extendGoal(payload)` | `goal:extend` | Update deadline and/or target on an existing goal |

## Steps

| Method | IPC channel | Effect |
|---|---|---|
| `addStep({ goalId, delta })` | `step:add` | Append a StepEvent; triggers completion notification if target hit |
| `updateStep({ eventId, delta, timestamp })` | `step:update` | Edit a step |
| `deleteStep(eventId)` | `step:delete` | Remove a step |

## Settings

| Method | IPC channel | Effect |
|---|---|---|
| `updateSettings(partial)` | `settings:update` | Merge partial into settings, re-register hotkey, update login item |

## Data

| Method | IPC channel | Effect |
|---|---|---|
| `exportData()` | `data:export` | Save dialog → write JSON |
| `importData()` | `data:import` | Open dialog → replace state |

## Pro

| Method | IPC channel | Effect |
|---|---|---|
| `updatePro(partial)` | `pro:update` | Merge pro settings (never blanks token if new one absent) |
| `proJoinShareCode(code)` | `pro:join` | Call server `/v1/shares/:code/join` and add to `pro.shares` |
| `proCreateShareCode(goalId)` | `pro:create-share` | Call server `/v1/shares` and store outgoing share |
| `proSyncNow()` | `pro:sync-now` | Trigger an immediate push+pull |

## Push (renderer subscribes)

| Method | IPC channel | Payload |
|---|---|---|
| `onStateChange(cb)` | `state:snapshot` | Full snapshot on every mutation |

## Notes

- All handlers return a `getSnapshot()` result so renderers get an authoritative post-mutation state without needing a follow-up read.
- `pro.userToken` is redacted (`***`) in every snapshot sent to renderers. The panel's Pro tab treats an empty token input as "keep the existing one" — only replaces it if the user actually types a new value.
- Never add renderer-only IPC channels — every channel must have a main handler defined in `main.js`.
