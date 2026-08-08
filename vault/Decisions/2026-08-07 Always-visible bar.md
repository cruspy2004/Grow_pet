---
tags: [decision, ux]
date: 2026-08-07
status: accepted
---

# Always-visible bar when a goal is active

## Decision

The bar is **visible by default** whenever a goal is active. The pet itself is the +1 button. Auto-hide (if enabled) only collapses the +1/caret controls; the pet-on-bar stays.

## Context

The original PRD had three states:

- Idle: pet only, no bar
- Toggled: click pet → shows bar + button
- Dropdown: click caret → shows -1

But PRD §8 success criterion says: *"glancing at the pet answers 'am I ahead or behind' without a click."*

Those two are in direct conflict — if idle hides the bar, you can't glance and know without a click. The old behavior regressed on the core promise.

## Why change it

- The whole product exists to make progress **ambient**. Hiding the bar until clicked defeats the pitch.
- "Click pet = show bar → click +1 button = log +1" is two clicks, not one, further violating the "single click for the core action" success criterion.
- Making the pet itself the +1 button and keeping the bar visible turns the ambient state and the log action into one gesture.

## What replaced it

- Bar is always visible when `activeGoal !== null`.
- Left-click on pet: +1 step.
- Auto-hide (if set > 0 seconds) collapses only the goal-name text and the +1/caret buttons, leaving pet + bar + marker positions visible.
- Global hotkey `Ctrl+Alt+=` = +1 from anywhere on the OS.
- A dedicated drag handle (visible as a subtle vertical grip on the left) is the only draggable region, so pet clicks aren't ambiguous with window moves.

## Consequences

- `widget.html` restructured: `.pet-button` is now a `<button>` wrapping the sprite; a `.drag-handle` div carries `-webkit-app-region: drag`.
- `widget.css` completely rewritten (the old file had accumulated three duplicated blocks with unbalanced braces).
- `widget.js` no longer toggles a `.hidden` on `.controls`; instead adds `.controls-collapsed` after `autoHideSeconds`, which fades only the peripheral controls.

## Superseded by

Nothing yet.
