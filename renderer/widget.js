const shared = window.growPetShared;
const petApi = window.growPet;

const state = {
  snapshot: null,
  controlsVisible: false,
  dropdownVisible: false,
  hideTimer: null,
  lastActual: null
};

const petSprite = document.getElementById('petSprite');
const controls = document.getElementById('controls');
const goalName = document.getElementById('goalName');
const goalMeta = document.getElementById('goalMeta');
const progressBar = document.getElementById('progressBar');
const idealLine = document.getElementById('idealLine');
const idealSprite = document.getElementById('idealSprite');
const actualSprite = document.getElementById('actualSprite');
const addStepButton = document.getElementById('addStepButton');
const caretButton = document.getElementById('caretButton');
const dropdownMenu = document.getElementById('dropdownMenu');
const undoStepButton = document.getElementById('undoStepButton');

function formatCompactCurrency(value) {
  return shared.formatCurrency(value);
}

function setControlsVisible(visible) {
  state.controlsVisible = visible;
  controls.classList.toggle('hidden', !visible);
  if (!visible) {
    state.dropdownVisible = false;
    dropdownMenu.classList.add('hidden');
  }
}

function setDropdownVisible(visible) {
  state.dropdownVisible = visible;
  dropdownMenu.classList.toggle('hidden', !visible);
}

function resetHideTimer() {
  clearTimeout(state.hideTimer);
  const timeout = Number(state.snapshot?.settings?.autoHideSeconds || 0);
  if (!state.controlsVisible || timeout <= 0) {
    return;
  }

  state.hideTimer = setTimeout(() => {
    setControlsVisible(false);
  }, timeout * 1000);
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
    goalName.textContent = 'No active goal';
    goalMeta.textContent = 'Open the panel to create or activate a goal.';
    idealLine.style.left = '0px';
    progressBar.style.setProperty('--bar-color', '#5fb8ff');
    renderSprites();
    return;
  }

  const stats = activeGoal.stats;
  goalName.textContent = activeGoal.name;
  goalMeta.textContent = `${formatCompactCurrency(stats.actual)} actual · ${formatCompactCurrency(stats.ideal)} ideal · ${formatCompactCurrency(stats.delta)} delta`;

  progressBar.style.setProperty('--bar-color', activeGoal.barColor || '#5fb8ff');
  idealLine.style.left = `${clampPosition(stats.idealRatio)}px`;
  idealSprite.style.left = `${clampPosition(stats.idealRatio)}px`;
  actualSprite.style.left = `${clampPosition(stats.actualRatio)}px`;
  renderSprites();

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
  if (snapshot?.settings?.autoHideSeconds > 0) {
    resetHideTimer();
  }
}

async function addStep(delta) {
  const goalId = state.snapshot?.activeGoalId;
  if (!goalId) {
    await petApi.openPanel();
    return;
  }

  await petApi.addStep({ goalId, delta });
  resetHideTimer();
}

petSprite.addEventListener('click', () => {
  setControlsVisible(!state.controlsVisible);
  if (state.controlsVisible) {
    resetHideTimer();
  }
});

petSprite.addEventListener('contextmenu', (event) => {
  event.preventDefault();
  petApi.notifyRightClick();
});

controls.addEventListener('contextmenu', (event) => {
  event.preventDefault();
  petApi.notifyRightClick();
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

window.addEventListener('resize', () => {
  if (state.snapshot) {
    renderGoal();
  }
});

petApi.onStateChange(render);

petApi.getState().then(render);
