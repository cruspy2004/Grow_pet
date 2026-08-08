---
tags: [product, design]
source: design-doc.txt
---

# Design Doc

Ported from `design-doc.txt`. Cross-refs to what actually shipped in [[Overview]].

## UI surface diagram

```
IDLE (per updated PRD: bar visible when goal active)
 [pet]==bar==[ +1 ][v]

DROPDOWN (click caret)
 [pet]==bar==[ +1 ][v]
                    [-1]

RIGHT-CLICK anywhere on pet or bar
   opens FULL PANEL
```

The compact widget never renders more than: pet, bar, one button, one caret, one dropdown item (-1). All computation and configuration lives behind the right-click panel.

## Component breakdown

| Component | Responsibility |
|---|---|
| Pet Icon | Always-visible, draggable via a dedicated handle, transparent-background sprite. Left-click logs +1. Right-click opens the full panel. |
| Bar | Two markers: ideal-pace position (computed from date, non-interactive) and actual position (pet marker, derived from step count × unit value). |
| Button + Caret | Button = +1 step, instant. Caret reveals a single -1 menu item, closes on selection or click-away. |
| Full Panel | Standard window: goal CRUD, stats, history, settings, [[Pro Tier]] tab. Opened via right-click. |

## Data model

See [[Data Model]] for the current, versioned shape.

## Core calculations

| Metric | Formula |
|---|---|
| Actual | sum(StepEvent.delta) × unitValue |
| Ideal by today | idealStartValue + (daysElapsed / totalDays) × (target − idealStartValue) |
| Delta | Actual − Ideal (positive = ahead, negative = behind) |
| Required pace | (target − Actual) / daysRemaining |

Implemented in `src/compute.js` and unit-tested in `tests/compute.test.js`.

## Tech stack

- **Shell:** Electron — transparent, always-on-top, frameless widget window over the desktop.
- **Full panel:** second, standard Electron window on right-click.
- **Storage:** local JSON with schema versioning + serialized save queue. See [[Free Tier]].
- **Rendering:** plain HTML/CSS/JS, no framework.
- **Pro tier:** Cloudflare Workers + D1 backend. See [[Pro Tier]].

## Interaction details

- Left-click on pet: +1 step (changed from the original "toggle bar" behavior — see [[2026-08-07 Always-visible bar]]).
- Left-click on caret: show single -1 item; selecting appends a StepEvent with delta -1.
- Right-click anywhere on pet or bar: open full panel window.
- Global hotkey (default `Ctrl+Alt+=`): +1 from anywhere on the OS.

## Future extensions (not v1)

- Ghost/multiplayer marker → **now the paid tier**, see [[Pro Tier]].
- Non-linear/milestone-based ideal lines → [[Later]].
- Multiple pets on screen simultaneously → [[Later]].
