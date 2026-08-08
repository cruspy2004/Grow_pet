---
tags: [marketing, assets]
---

# Demo GIF Script

The single most important asset. **10-15 seconds. No sound. No cursor rings. No text overlays.** Shot at 1x speed — speeding it up hides the "instant" feel.

## Setup

- Fresh install so no clutter in the widget or panel.
- A "Mercedes fund" goal preloaded: target ₹5,000,000, unit value ₹1,000, start 2026-08-01, deadline 2026-12-31, ideal-start 0, bar color a warm accent.
- Screen background: dark, minimal (not the default Windows one). Solid or subtle gradient.
- Widget positioned top-right.
- Recording tool: ScreenToGif (Windows) or Kap (macOS). Export as GIF, target < 5 MB.

## Shot list

**0:00 — 0:02.** Wide shot: cluttered desktop with a browser and code editor open. Grow Buddy widget visible in the corner, showing the pet clearly behind the ideal line.

**0:02 — 0:03.** Cursor slides toward the pet.

**0:03 — 0:04.** Click the pet. Pet slides forward on the bar. No dialog, no confirmation.

**0:04 — 0:05.** Second click. Pet slides again.

**0:05 — 0:07.** Zoom / crop tighter on the widget so the marker positions are legible. Actual marker is now visibly closer to (but not past) the ideal line.

**0:07 — 0:09.** Three more clicks in quick succession. Pet slides ahead of the ideal line. A subtle color shift on the bar (no longer "behind pink").

**0:09 — 0:11.** Cursor moves away. Widget stays visible. Ambient. That's the whole point — you didn't open anything.

**0:11 — 0:13.** Cut back to the wide desktop shot with the widget in the corner. Freeze on the ahead-state for the last frame so the GIF loop restarts on the same beat.

## Do not

- Use a screen cursor ring or highlight (looks like a tutorial video).
- Overlay text ("Just click!"). The GIF must be self-evident.
- Speed it up beyond 1x. Slow-and-obvious beats fast-and-slick for a "look what happens with one click" pitch.
- Show the right-click panel. That belongs in a follow-up screenshot, not the hero GIF.
- Use a fake goal like "Buy Ferrari" — the point is that it works for real goals, not aspirational memes.

## Where it goes

- Landing page hero (`web/index.html`) as `<img src="demo.gif">` above the H1.
- Product Hunt gallery — first slot.
- Twitter/X launch tweet.
- Reddit posts (embed as .gif, not .mp4 — Reddit auto-loops GIFs better).
- HN post: link only (HN doesn't render inline GIFs).
