const test = require('node:test');
const assert = require('node:assert/strict');

const {
  PET_BOX,
  WIDGET_SIZES,
  sizeForMode,
  normalizeMode,
  defaultWidgetAnchor,
  anchorIsOnScreen,
  computeWidgetBounds,
  anchorFromWidgetBounds,
  clampAnchor
} = require('../src/widgetLayout');

const HD = { x: 0, y: 0, width: 1920, height: 1040 };
const LEFT_OF_PRIMARY = { x: -1920, y: -200, width: 1920, height: 1040 };
const RIGHT_OF_PRIMARY = { x: 1920, y: 0, width: 1920, height: 1040 };
const MODES = ['idle', 'expanded', 'menu'];

function roundTrip(mode, anchor, area) {
  const bounds = computeWidgetBounds(mode, anchor, area);
  return { bounds, anchor: anchorFromWidgetBounds(bounds, bounds.side, bounds.menuUp) };
}

/* ------------------------------------------------------------------ sizes */

test('mode table matches the locked widget sizes', () => {
  assert.equal(PET_BOX, 88);
  assert.deepEqual(WIDGET_SIZES.idle, { width: 88, height: 88 });
  assert.deepEqual(WIDGET_SIZES.expanded, { width: 360, height: 88 });
  assert.deepEqual(WIDGET_SIZES.menu, { width: 360, height: 136 });
});

test('unknown modes fall back to idle', () => {
  assert.equal(normalizeMode('nope'), 'idle');
  assert.equal(normalizeMode(undefined), 'idle');
  assert.equal(normalizeMode('menu'), 'menu');
  assert.deepEqual(sizeForMode('nope'), WIDGET_SIZES.idle);
});

/* --------------------------------------------------------- anchor stability */

test('the pet square never moves when the mode changes (single 1920x1040 display)', () => {
  for (let x = HD.x; x <= HD.x + HD.width - PET_BOX; x += 13) {
    for (let y = HD.y; y <= HD.y + HD.height - PET_BOX; y += 17) {
      const anchor = { x, y };
      for (const mode of MODES) {
        const { bounds } = roundTrip(mode, anchor, HD);
        const petLeft = bounds.side === 'right' ? bounds.x + bounds.width - PET_BOX : bounds.x;
        const petTop = bounds.menuUp ? bounds.y + bounds.height - PET_BOX : bounds.y;
        assert.equal(petLeft, x, `pet moved horizontally in ${mode} at ${x},${y}`);
        assert.equal(petTop, y, `pet moved vertically in ${mode} at ${x},${y}`);
      }
    }
  }
});

test('anchorFromWidgetBounds exactly inverts computeWidgetBounds for every mode', () => {
  for (const area of [HD, LEFT_OF_PRIMARY, RIGHT_OF_PRIMARY]) {
    for (let x = area.x; x <= area.x + area.width - PET_BOX; x += 29) {
      for (let y = area.y; y <= area.y + area.height - PET_BOX; y += 31) {
        for (const mode of MODES) {
          const { anchor } = roundTrip(mode, { x, y }, area);
          assert.deepEqual(anchor, { x, y }, `round trip failed for ${mode} at ${x},${y}`);
        }
      }
    }
  }
});

test('walking idle -> expanded -> menu -> expanded -> idle leaves the anchor unchanged', () => {
  const start = { x: 1500, y: 900 };
  let anchor = start;
  for (const mode of ['idle', 'expanded', 'menu', 'expanded', 'idle']) {
    const step = roundTrip(mode, anchor, HD);
    anchor = step.anchor;
  }
  assert.deepEqual(anchor, start);
});

/* ------------------------------------------------------------ edge flipping */

test('side flips to right only when the expanded row would overflow the right edge', () => {
  const fits = computeWidgetBounds('expanded', { x: HD.width - 360, y: 100 }, HD);
  assert.equal(fits.side, 'left');
  assert.equal(fits.x, HD.width - 360);

  const overflows = computeWidgetBounds('expanded', { x: HD.width - 359, y: 100 }, HD);
  assert.equal(overflows.side, 'right');
  assert.equal(overflows.x + overflows.width - PET_BOX, HD.width - 359, 'pet keeps its x');
});

test('menuUp flips only when the 136px menu would overflow the bottom edge', () => {
  const bottom = HD.y + HD.height;
  const fits = computeWidgetBounds('menu', { x: 400, y: bottom - 136 }, HD);
  assert.equal(fits.menuUp, false);

  const overflows = computeWidgetBounds('menu', { x: 400, y: bottom - 135 }, HD);
  assert.equal(overflows.menuUp, true);
  assert.equal(overflows.y + overflows.height - PET_BOX, bottom - 135, 'pet keeps its y');
});

test('idle and expanded never open the menu upwards (they are only 88px tall)', () => {
  const y = HD.y + HD.height - PET_BOX;
  assert.equal(computeWidgetBounds('idle', { x: 10, y }, HD).menuUp, false);
  assert.equal(computeWidgetBounds('expanded', { x: 10, y }, HD).menuUp, false);
});

test('a bottom-right anchor flips both axes at once', () => {
  const anchor = { x: HD.width - PET_BOX, y: HD.height - PET_BOX };
  const bounds = computeWidgetBounds('menu', anchor, HD);
  assert.equal(bounds.side, 'right');
  assert.equal(bounds.menuUp, true);
  assert.deepEqual(anchorFromWidgetBounds(bounds, bounds.side, bounds.menuUp), anchor);
});

test('negative-origin displays (monitor left of primary) round trip', () => {
  const anchor = { x: LEFT_OF_PRIMARY.x + 40, y: LEFT_OF_PRIMARY.y + 40 };
  for (const mode of MODES) {
    const { bounds, anchor: back } = roundTrip(mode, anchor, LEFT_OF_PRIMARY);
    assert.ok(bounds.x >= LEFT_OF_PRIMARY.x, 'stays inside the display');
    assert.deepEqual(back, anchor);
  }
});

/* ---------------------------------------------------------- restore on boot */

test('anchorIsOnScreen accepts a position on any attached display', () => {
  const areas = [HD, RIGHT_OF_PRIMARY];
  assert.equal(anchorIsOnScreen({ x: 100, y: 100 }, areas), true);
  assert.equal(anchorIsOnScreen({ x: 2400, y: 300 }, areas), true);
});

test('anchorIsOnScreen rejects a position saved on a monitor that is now gone', () => {
  const onlyPrimary = [HD];
  // Saved while a second monitor sat to the right; that monitor is unplugged now.
  assert.equal(anchorIsOnScreen({ x: 2400, y: 300 }, onlyPrimary), false);
  // ...and one that sat above/left of the primary.
  assert.equal(anchorIsOnScreen({ x: -1500, y: -400 }, onlyPrimary), false);
});

test('anchorIsOnScreen rejects malformed saved positions', () => {
  for (const bad of [null, undefined, {}, { x: 1 }, { x: NaN, y: 0 }, { x: 'a', y: 'b' }]) {
    assert.equal(anchorIsOnScreen(bad, [HD]), false, `rejects ${JSON.stringify(bad)}`);
  }
});

test('the default anchor sits fully inside the primary work area', () => {
  const anchor = defaultWidgetAnchor(HD);
  assert.ok(anchor.x >= HD.x && anchor.x + PET_BOX <= HD.x + HD.width);
  assert.ok(anchor.y >= HD.y && anchor.y + PET_BOX <= HD.y + HD.height);
  assert.equal(anchorIsOnScreen(anchor, [HD]), true);
});

test('the default anchor stays on screen on a very narrow display', () => {
  const narrow = { x: 0, y: 0, width: 100, height: 400 };
  const anchor = defaultWidgetAnchor(narrow);
  assert.equal(anchor.x, 20, 'falls back to the left inset rather than a negative x');
});

/* --------------------------------------------------------------- drag clamp */

test('clampAnchor keeps a dragged pet inside its work area', () => {
  assert.deepEqual(clampAnchor({ x: -50, y: -50 }, HD), { x: 0, y: 0 });
  assert.deepEqual(clampAnchor({ x: 5000, y: 5000 }, HD), {
    x: HD.width - PET_BOX,
    y: HD.height - PET_BOX
  });
  assert.deepEqual(clampAnchor({ x: 300.4, y: 200.6 }, HD), { x: 300, y: 201 });
});

test('a drag that gets clamped still round trips through drag-end', () => {
  // Expanded drag pushed past the right edge, then re-derived as widget:drag-end does.
  const bounds = computeWidgetBounds('expanded', { x: 1000, y: 500 }, HD);
  const afterDrag = clampAnchor(
    anchorFromWidgetBounds({ ...bounds, x: 5000, y: 500 }, bounds.side, bounds.menuUp),
    HD
  );
  const reapplied = computeWidgetBounds('expanded', afterDrag, HD);
  const settled = anchorFromWidgetBounds(reapplied, reapplied.side, reapplied.menuUp);
  assert.deepEqual(settled, afterDrag, 'drag-end must not shift the pet a second time');
  assert.deepEqual(settled, { x: HD.width - PET_BOX, y: 500 });

  // The next mode change must not teleport the sprite.
  const expanded = computeWidgetBounds('expanded', settled, HD);
  assert.equal(expanded.side, 'right');
  assert.deepEqual(anchorFromWidgetBounds(expanded, expanded.side, expanded.menuUp), settled);
});

/* ------------------------------------------------------- known limitations */

test('the pet reaches the same screen edges in every mode', () => {
  // Dragging clamps the pet square, so the reachable area must not shrink by the
  // width of whatever the current mode draws around the sprite.
  const reach = MODES.map(() => clampAnchor({ x: 5000, y: 5000 }, HD));
  for (const corner of reach) {
    assert.deepEqual(corner, { x: 1832, y: 952 });
  }
  assert.deepEqual(clampAnchor({ x: -5000, y: -5000 }, HD), { x: 0, y: 0 });
});

test('clampAnchor keeps the pet square inside an offset display', () => {
  assert.deepEqual(clampAnchor({ x: 9999, y: 9999 }, RIGHT_OF_PRIMARY), { x: 3752, y: 952 });
  assert.deepEqual(clampAnchor({ x: -9999, y: -9999 }, LEFT_OF_PRIMARY), { x: -1920, y: -200 });
});

test('a clamped anchor settles after one re-derive instead of drifting', () => {
  // On a work area too small to hold the expanded row the bounds get clamped and
  // the anchor cannot round-trip exactly. main.js re-derives the anchor from the
  // applied bounds, which has to converge rather than creep on every mode change.
  const small = { x: 0, y: 0, width: 600, height: 400 };
  const bounds = computeWidgetBounds('expanded', { x: 245, y: 40 }, small);
  assert.equal(bounds.side, 'right');
  assert.equal(bounds.x, 0, 'clamped against the left edge');

  const settled = anchorFromWidgetBounds(bounds, bounds.side, bounds.menuUp);
  const again = computeWidgetBounds('expanded', settled, small);
  assert.deepEqual(
    anchorFromWidgetBounds(again, again.side, again.menuUp),
    settled,
    'the second pass is a fixed point'
  );
});
