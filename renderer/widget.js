const shared = window.growBuddyShared;
const buddyApi = window.growBuddy;

const DRAG_THRESHOLD = 4;

const ui = {
  snapshot: null,
  mode: 'idle',
  side: 'left',
  menuUp: false,
  hideTimer: null,
  lastActual: null,
  drag: null,
  suppressClick: false,
  suppressTimer: null,
  modeSeq: 0
};

const shell = document.getElementById('app');
const petSlot = document.getElementById('petSlot');
const petSprite = document.getElementById('petSprite');
const barWrap = document.getElementById('barWrap');
const progressBar = document.getElementById('progressBar');
const progressFill = document.getElementById('progressFill');
const idealLine = document.getElementById('idealLine');
const actualSprite = document.getElementById('actualSprite');
const addStepButton = document.getElementById('addStepButton');
const caretButton = document.getElementById('caretButton');
const undoStepButton = document.getElementById('undoStepButton');

function fmt(value) {
  return shared.formatCurrency(value);
}

/* ------------------------------------------------------------ window mode */

function applyLayout(layout) {
  if (!layout || !layout.mode) {
    return;
  }
  ui.mode = layout.mode;
  ui.side = layout.side === 'right' ? 'right' : 'left';
  ui.menuUp = Boolean(layout.menuUp);
  shell.dataset.mode = ui.mode;
  shell.dataset.side = ui.side;
  shell.dataset.menu = ui.menuUp ? 'up' : 'down';
  requestAnimationFrame(renderBar);
}

async function setMode(mode) {
  ui.mode = mode;
  shell.dataset.mode = mode;
  if (mode === 'idle') {
    clearTimeout(ui.hideTimer);
    ui.hideTimer = null;
  }
  // Two quick interactions overlap their round trips; without this the earlier
  // reply lands last and visibly undoes the later one before it self-corrects.
  const seq = ++ui.modeSeq;
  const layout = await buddyApi.setWidgetMode(mode);
  if (seq !== ui.modeSeq) {
    return;
  }
  applyLayout(layout);
  if (mode !== 'idle') {
    resetHideTimer();
  }
}

function toggleWidget() {
  return setMode(ui.mode === 'idle' ? 'expanded' : 'idle');
}

function openDropdown() {
  return setMode('menu');
}

function closeDropdown() {
  if (ui.mode === 'menu') {
    return setMode('expanded');
  }
  return Promise.resolve();
}

function resetHideTimer() {
  clearTimeout(ui.hideTimer);
  ui.hideTimer = null;
  if (ui.mode === 'idle') {
    return;
  }
  const seconds = Number(ui.snapshot?.settings?.autoHideSeconds || 0);
  if (seconds <= 0) {
    return;
  }
  ui.hideTimer = setTimeout(() => {
    // Collapsing mid-drag would resize the window out from under the pointer and
    // snap the sprite back to where the drag started.
    if (ui.drag) {
      resetHideTimer();
      return;
    }
    setMode('idle');
  }, seconds * 1000);
}

/* --------------------------------------------------------------- render */

function barWidth() {
  return progressBar.getBoundingClientRect().width || 168;
}

function clampPosition(ratio) {
  const width = barWidth();
  return Math.max(0, Math.min(width, width * (Number(ratio) || 0)));
}

function renderSprites() {
  const activeGoal = ui.snapshot?.activeGoal;
  const spriteKey = activeGoal?.spriteKey || 'avatar';
  const spriteVariant = activeGoal?.spriteVariant || 1;
  const sourceList = ui.snapshot?.spriteSources?.[spriteKey] || [];
  const index = Math.min(sourceList.length, Math.max(1, Number(spriteVariant) || 1)) - 1;
  const sprite = sourceList[index] || shared.getSpriteFrame(spriteKey, spriteVariant);
  petSprite.src = sprite;
  actualSprite.src = sprite;
}

function renderBar() {
  const activeGoal = ui.snapshot?.activeGoal;
  if (!activeGoal) {
    progressFill.style.width = '0%';
    return;
  }
  const stats = activeGoal.stats;
  progressFill.style.width = `${Math.min(100, stats.actualRatio * 100)}%`;
  idealLine.style.left = `${clampPosition(stats.idealRatio)}px`;
  actualSprite.style.left = `${clampPosition(stats.actualRatio)}px`;
}

function renderGoal() {
  const activeGoal = ui.snapshot?.activeGoal;
  renderSprites();

  if (!activeGoal) {
    shell.dataset.state = 'empty';
    shell.classList.remove('behind');
    petSprite.classList.remove('celebrating');
    barWrap.title = 'No active goal — right-click to open the panel.';
    renderBar();
    return;
  }

  shell.dataset.state = 'active';
  const stats = activeGoal.stats;
  shell.style.setProperty('--bar-color', activeGoal.barColor || '#5fb8ff');

  const deltaWord = stats.delta >= 0 ? 'ahead' : 'behind';
  const summary = `${activeGoal.name} — ${fmt(stats.actual)} of ${fmt(activeGoal.target)}`
    + ` · ${fmt(Math.abs(stats.delta))} ${deltaWord}`;
  barWrap.title = stats.isComplete ? `${summary} · goal reached` : summary;

  renderBar();

  shell.classList.toggle('behind', stats.isBehind && !stats.isComplete);
  petSprite.classList.toggle('celebrating', stats.isComplete);

  if (ui.lastActual !== stats.actual) {
    actualSprite.classList.remove('bump');
    void actualSprite.offsetWidth;
    actualSprite.classList.add('bump');
    ui.lastActual = stats.actual;
  }
}

function render(snapshot) {
  ui.snapshot = snapshot;
  renderGoal();
}

/* --------------------------------------------------------------- actions */

async function addStep(delta) {
  const goalId = ui.snapshot?.activeGoalId;
  if (!goalId) {
    await buddyApi.openPanel();
    return;
  }
  await buddyApi.addStep({ goalId, delta });
  resetHideTimer();
}

/* ------------------------------------------------------- drag the sprite */

function suppressNextClick() {
  ui.suppressClick = true;
  clearTimeout(ui.suppressTimer);
  ui.suppressTimer = setTimeout(() => {
    ui.suppressClick = false;
  }, 300);
}

petSlot.addEventListener('pointerdown', (event) => {
  if (event.button !== 0 || ui.drag) {
    return;
  }
  event.preventDefault();
  try {
    petSlot.setPointerCapture(event.pointerId);
  } catch (error) {
    // pointer capture is best-effort
  }
  ui.drag = {
    pointerId: event.pointerId,
    startX: event.screenX,
    startY: event.screenY,
    originX: null,
    originY: null,
    moved: false
  };
  buddyApi.getWidgetPosition().then((position) => {
    if (ui.drag && ui.drag.pointerId === event.pointerId && position) {
      ui.drag.originX = Number(position.x);
      ui.drag.originY = Number(position.y);
    }
  });
  resetHideTimer();
});

petSlot.addEventListener('pointermove', (event) => {
  const drag = ui.drag;
  if (!drag || drag.pointerId !== event.pointerId) {
    return;
  }
  const dx = event.screenX - drag.startX;
  const dy = event.screenY - drag.startY;
  if (!drag.moved && Math.hypot(dx, dy) <= DRAG_THRESHOLD) {
    return;
  }
  drag.moved = true;
  resetHideTimer();
  if (drag.originX === null || drag.originY === null) {
    return;
  }
  buddyApi.moveWidget({ x: drag.originX + dx, y: drag.originY + dy });
});

async function finishDrag(event, allowClick) {
  const drag = ui.drag;
  if (!drag || drag.pointerId !== event.pointerId) {
    return;
  }
  ui.drag = null;
  try {
    petSlot.releasePointerCapture(event.pointerId);
  } catch (error) {
    // capture may already be gone
  }
  if (drag.moved) {
    suppressNextClick();
    const layout = await buddyApi.endWidgetDrag();
    applyLayout(layout);
    resetHideTimer();
    return;
  }
  if (allowClick) {
    await toggleWidget();
  }
}

petSlot.addEventListener('pointerup', (event) => finishDrag(event, true));
petSlot.addEventListener('pointercancel', (event) => finishDrag(event, false));

petSlot.addEventListener('click', (event) => {
  // A real drag ends with a synthetic click; swallow it.
  if (ui.suppressClick) {
    ui.suppressClick = false;
    clearTimeout(ui.suppressTimer);
    event.preventDefault();
    event.stopPropagation();
  }
}, true);

/* ---------------------------------------------------------- interactions */

addStepButton.addEventListener('click', () => {
  resetHideTimer();
  addStep(1);
});

caretButton.addEventListener('click', (event) => {
  event.stopPropagation();
  if (ui.mode === 'menu') {
    closeDropdown();
  } else {
    openDropdown();
  }
});

undoStepButton.addEventListener('click', async (event) => {
  event.stopPropagation();
  await addStep(-1);
  await closeDropdown();
});

document.addEventListener('click', (event) => {
  if (event.target.closest('.action-row') || event.target.closest('.dropdown') || event.target.closest('.pet-slot')) {
    return;
  }
  closeDropdown();
});

document.addEventListener('contextmenu', (event) => {
  event.preventDefault();
  resetHideTimer();
  buddyApi.notifyRightClick();
});

document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') {
    return;
  }
  if (ui.mode === 'menu') {
    closeDropdown();
  } else if (ui.mode !== 'idle') {
    setMode('idle');
  }
});

// Clicking away lands outside this window entirely, so the document-level
// listener above never sees it — losing focus is the only signal we get.
window.addEventListener('blur', () => {
  closeDropdown();
});

window.addEventListener('resize', () => {
  if (ui.snapshot) {
    renderBar();
  }
});

buddyApi.onWidgetLayout(applyLayout);
buddyApi.onStateChange(render);
buddyApi.getState().then(render);
