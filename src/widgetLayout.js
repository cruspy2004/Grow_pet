const { clamp } = require('./compute');

// The idle widget window is a square that contains nothing but the pet sprite.
const PET_BOX = 88;

const WIDGET_SIZES = {
  idle: { width: PET_BOX, height: PET_BOX },
  expanded: { width: 360, height: PET_BOX },
  menu: { width: 360, height: 136 }
};

function sizeForMode(mode) {
  return WIDGET_SIZES[mode] || WIDGET_SIZES.idle;
}

function normalizeMode(mode) {
  return WIDGET_SIZES[mode] ? mode : 'idle';
}

function defaultWidgetAnchor(area) {
  return {
    x: Math.max(area.x + 20, area.x + area.width - PET_BOX - 24),
    y: area.y + 60
  };
}

// The pet square's centre must land inside some display's work area, otherwise a
// position saved on a monitor that is no longer attached would open off-screen.
function anchorIsOnScreen(position, workAreas) {
  if (!position || !Number.isFinite(position.x) || !Number.isFinite(position.y)) {
    return false;
  }
  const centerX = position.x + PET_BOX / 2;
  const centerY = position.y + PET_BOX / 2;
  return workAreas.some((area) => centerX >= area.x
    && centerX <= area.x + area.width
    && centerY >= area.y
    && centerY <= area.y + area.height);
}

// Derive the window rectangle for a mode from the pet anchor. The PET_BOX square
// always stays exactly where it is; the row grows left/right and the menu opens
// up/down depending on the room left in the work area.
function computeWidgetBounds(mode, anchor, area) {
  const size = sizeForMode(mode);

  let side = 'left';
  let x = anchor.x;
  if (x + size.width > area.x + area.width) {
    side = 'right';
    x = anchor.x + PET_BOX - size.width;
  }

  let menuUp = false;
  let y = anchor.y;
  if (y + size.height > area.y + area.height) {
    menuUp = true;
    y = anchor.y + PET_BOX - size.height;
  }

  return {
    x: Math.round(clamp(x, area.x, area.x + area.width - size.width)),
    y: Math.round(clamp(y, area.y, area.y + area.height - size.height)),
    width: size.width,
    height: size.height,
    side,
    menuUp
  };
}

// Reverse of computeWidgetBounds: recover the pet square from a window rectangle.
function anchorFromWidgetBounds(bounds, side, menuUp) {
  return {
    x: side === 'right' ? bounds.x + bounds.width - PET_BOX : bounds.x,
    y: menuUp ? bounds.y + bounds.height - PET_BOX : bounds.y
  };
}

// Dragging moves the pet square, so it is the square that has to stay on screen.
// Clamping the whole window instead would make the reachable area shrink by the
// width of whatever the current mode adds around the sprite.
function clampAnchor(anchor, area) {
  return {
    x: Math.round(clamp(anchor.x, area.x, area.x + area.width - PET_BOX)),
    y: Math.round(clamp(anchor.y, area.y, area.y + area.height - PET_BOX))
  };
}

module.exports = {
  PET_BOX,
  WIDGET_SIZES,
  sizeForMode,
  normalizeMode,
  defaultWidgetAnchor,
  anchorIsOnScreen,
  computeWidgetBounds,
  anchorFromWidgetBounds,
  clampAnchor
};
