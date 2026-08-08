---
tags: [product, prd]
source: prd.txt
---

# PRD — Grow Buddy (originally "Pacer")

> The pet that walks only as fast as you do.

Ported from `prd.txt` at the repo root. See [[Positioning]] and [[Launch Plan]] for how this evolved into the current shipping product.

## 1. Problem

Goal-tracking tools require opening an app to feel their pressure. The moment the app is closed, the goal is invisible, and invisible goals get deprioritized under daily noise. The working pattern that actually works responds to **visible, ambient, fixed targets** (e.g. Mercedes C200 by August 28), not periodic check-ins in a separate tool.

Why existing tools fail:

- Spreadsheets and habit apps are opt-in: you only see progress when you remember to look.
- Most progress bars show a single static percentage, not a comparison against an ideal pace.
- Logging an amount (typing a number) is friction most people drop after a few days.

## 2. Goal

A desktop-resident pet that sits on screen at all times, and with **a single click** lets the user log one unit of progress toward any linear, date-bound goal (money saved, kilograms lost, pages written, etc). The pet's position on a bar reflects actual progress; a fixed ideal line shows where the user should be if progressing linearly toward the deadline.

> **Core selling point:** at a glance, the user knows if they are ahead of or behind the pace required to hit their goal on time, without opening anything.

## 3. Users

Originally scoped as a single-user tool for Haadhee. Broadened at launch to "people with goals" — see [[Positioning]].

## 4. Core user flow (locked)

| State | Trigger | What appears |
|---|---|---|
| Idle | Default | Pet is visible on the desktop with the bar. **(Updated 2026-08-07)** |
| Add step | Click the pet, or +1 button, or global hotkey | +1 immediately. Pet marker moves. No confirmation. |
| Undo step | Click the caret arrow | One option: -1 |
| Full panel | Right-click the pet or bar | Opens Goal setup, stats, history, multiple goals |

> Note: The original PRD had the pet in a hidden state until clicked. This regressed the "ambient visibility" promise, so on [[2026-08-07 Always-visible bar]] we made the bar visible by default when a goal is active.

## 5. Functional requirements

### 5.1 Compact widget (idle + toggled state)

- Pet icon always visible on desktop, no window border/chrome.
- Left-click the pet = +1 step (updated per [[2026-08-07 Always-visible bar]]).
- Dropdown arrow reveals a single "-1" option only.
- Bar visually shows an ideal-pace marker (fixed line based on today's date) and the pet's actual position.

### 5.2 Full panel (right-click)

- Goal setup: name, target amount, unit value per step, start date, deadline.
- Support for multiple concurrent goals.
- Stats: actual total, ideal-by-today, signed delta, required daily pace from today to deadline.
- History log of every step, with edit/delete.
- Settings: change unit value, change deadline, reset goal, delete goal.
- Added: [[Pro Tier]] tab, export/import, notify-when-behind, global hotkey rebinding.

## 6. Non-functional

- Persistent background, negligible CPU/RAM.
- Survives reboots (auto-launch on system start, optional toggle).
- All data stored locally on the free tier; see [[Free Tier]].
- Single click must feel instant (<100ms visual feedback).

## 7. Out of scope (v1)

- Social/multiplayer comparison — **promoted to Pro tier** on [[2026-08-06 Two-tier free plus Pro]].
- Mobile companion app — [[Later]].
- Cloud sync across devices — [[Later]].

## 8. Success criteria

- Daily use of the +1 button without needing to open the full panel.
- At any moment, glancing at the pet answers "am I ahead or behind" without a click.
- Setting up a brand-new goal takes under a minute in the full panel.

## 9. Open questions

- Should -1 hold-to-repeat? — currently No, keep in full panel for bulk correction.
- Non-linear/milestone pace lines? — [[Later]].
