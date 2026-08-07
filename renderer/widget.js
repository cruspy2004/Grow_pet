const shared = window.growBuddyShared;
const buddyApi = window.growBuddy;

const state = {
  snapshot: null,
  dropdownVisible: false,
  hideTimer: null,
  lastActual: null,
  controlsCollapsed: false
};

const petShell = document.getElementById('petShell');
const petButton = document.getElementById('petButton');
const petSprite = document.getElementById('petSprite');
const controls = document.getElementById('controls');
const goalName = document.getElementById('goalName');
const goalMeta = document.getElementById('goalMeta');
const progressBar = document.getElementById('progressBar');
const progressFill = document.getElementById('progressFill');
const idealLine = document.getElementById('idealLine');
const idealSprite = document.getElementById('idealSprite');
const actualSprite = document.getElementById('actualSprite');
const addStepButton = document.getElementById('addStepButton');
const caretButton = document.getElementById('caretButton');
const dropdownMenu = document.getElementById('dropdownMenu');
const undoStepButton = document.getElementById('undoStepButton');
const celebrateBadge = document.getElementById('celebrateBadge');

function fmt(value) {
  return shared.formatCurrency(value);
}

function setDropdownVisible(visible) {
  state.dropdownVisible = visible;
  dropdownMenu.classList.toggle('hidden', !visible);
}

function collapseControls(collapsed) {
  state.controlsCollapsed = collapsed;
  petShell.classList.toggle('controls-collapsed', collapsed);
}

function resetHideTimer() {
  clearTimeout(state.hideTimer);
  const timeout = Number(state.snapshot?.settings?.autoHideSeconds || 0);
  if (timeout <= 0) {
    collapseControls(false);
    return;
  }
  collapseControls(false);
  state.hideTimer = setTimeout(() => collapseControls(true), timeout * 1000);
}

function clampPosition(ratio) {
  const width = progressBar.getBoundingClientRect().width || 220;
  return Math.max(0, Math.min(width, width * ratio));
}

function renderSprites() {
  const activeGoal = state.snapshot?.activeGoal;
  if (!activeGoal) {
    petSprite.src = '';
    idealSprite.src = '';
    actualSprite.src = '';
    return;
  }
  const sourceList = state.snapshot?.spriteSources?.[activeGoal.spriteKey] || [];
  const normalizedVariant = Math.min(sourceList.length, Math.max(1, Number(activeGoal.spriteVariant) || 1));
  const sprite = sourceList[normalizedVariant - 1] || shared.getSpriteFrame(activeGoal.spriteKey, activeGoal.spriteVariant);
  petSprite.src = sprite;
  idealSprite.src = sprite;
  actualSprite.src = sprite;
}

function renderGoal() {
  const activeGoal = state.snapshot?.activeGoal;
  if (!activeGoal) {
    petShell.dataset.state = 'empty';
    goalName.textContent = 'No active goal';
    goalMeta.textContent = 'Right-click to open the panel.';
    progressFill.style.width = '0%';
    idealLine.style.left = '0px';
    petShell.classList.remove('behind');
    celebrateBadge.classList.add('hidden');
    petButton.classList.remove('celebrating');
    renderSprites();
    return;
  }

  petShell.dataset.state = 'active';
  const stats = activeGoal.stats;
  goalName.textContent = activeGoal.name;
  const deltaWord = stats.delta >= 0 ? 'ahead' : 'behind';
  goalMeta.textContent = `${fmt(stats.actual)} of ${fmt(activeGoal.target)} · ${fmt(Math.abs(stats.delta))} ${deltaWord}`;

  petShell.style.setProperty('--bar-color', activeGoal.barColor || '#5fb8ff');
  const actualLeft = clampPosition(stats.actualRatio);
  const idealLeft = clampPosition(stats.idealRatio);
  progressFill.style.width = `${Math.min(100, stats.actualRatio * 100)}%`;
  idealLine.style.left = `${idealLeft}px`;
  idealSprite.style.left = `${idealLeft}px`;
  actualSprite.style.left = `${actualLeft}px`;
  renderSprites();

  petShell.classList.toggle('behind', stats.isBehind && !stats.isComplete);
  celebrateBadge.classList.toggle('hidden', !stats.isComplete);
  petButton.classList.toggle('celebrating', stats.isComplete);

  if (state.lastActual !== stats.actual) {
    actualSprite.classList.remove('bump');
    void actualSprite.offsetWidth;
    actualSprite.classList.add('bump');
    state.lastActual = stats.actual;
  }
}

function render(snapshot) {
  state.snapshot = snapshot;
  renderGoal();
  resetHideTimer();
}

async function addStep(delta) {
  const goalId = state.snapshot?.activeGoalId;
  if (!goalId) {
    await buddyApi.openPanel();
    return;
  }
  await buddyApi.addStep({ goalId, delta });
  resetHideTimer();
}

petButton.addEventListener('click', () => addStep(1));

petButton.addEventListener('contextmenu', (event) => {
  event.preventDefault();
  buddyApi.notifyRightClick();
});

petShell.addEventListener('contextmenu', (event) => {
  event.preventDefault();
  buddyApi.notifyRightClick();
});

addStepButton.addEventListener('click', () => addStep(1));

caretButton.addEventListener('click', (event) => {
  event.stopPropagation();
  setDropdownVisible(!state.dropdownVisible);
  if (state.dropdownVisible) {
    resetHideTimer();
  }
});

undoStepButton.addEventListener('click', async () => {
  await addStep(-1);
  setDropdownVisible(false);
});

document.addEventListener('click', (event) => {
  if (!event.target.closest('.action-row')) {
    setDropdownVisible(false);
  }
});

document.addEventListener('mousemove', () => {
  if (state.controlsCollapsed) {
    collapseControls(false);
  }
  resetHideTimer();
});

window.addEventListener('resize', () => {
  if (state.snapshot) {
    renderGoal();
  }
});

buddyApi.onStateChange(render);
buddyApi.getState().then(render);
