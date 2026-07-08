const shared = window.growPetShared;
const petApi = window.growPet;

const state = {
  snapshot: null,
  controlsVisible: false,
  dropdownVisible: false,
  hideTimer: null,
  lastActual: null,
  frameIndex: 0,
  frameTimer: null
};

const petButton = document.getElementById('petButton');
const petSprite = document.getElementById('petSprite');
const controls = document.getElementById('controls');
const goalName = document.getElementById('goalName');
const goalMeta = document.getElementById('goalMeta');
const progressBar = document.getElementById('progressBar');
const idealLine = document.getElementById('idealLine');
const actualMarker = document.getElementById('actualMarker');
const markerSprite = document.getElementById('markerSprite');
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

function currentFrames() {
  return shared.getSpriteFrames(state.snapshot?.activeGoal?.spriteKey);
}

function renderSprites() {
  const frames = currentFrames();
  const sprite = frames[state.frameIndex % frames.length];
  petSprite.src = sprite;
  markerSprite.src = sprite;
}

function startSpriteAnimation() {
  clearInterval(state.frameTimer);
  state.frameTimer = setInterval(() => {
    if (!state.snapshot?.activeGoal) {
      return;
    }

    state.frameIndex = (state.frameIndex + 1) % 3;
    renderSprites();
  }, 220);
}

function renderGoal() {
  const activeGoal = state.snapshot?.activeGoal;
  if (!activeGoal) {
    goalName.textContent = 'No active goal';
    goalMeta.textContent = 'Open the panel to create or activate a goal.';
    idealLine.style.left = '0px';
    actualMarker.style.left = '0px';
    petSprite.src = '';
    markerSprite.src = '';
    return;
  }

  const stats = activeGoal.stats;
  goalName.textContent = activeGoal.name;
  goalMeta.textContent = `${formatCompactCurrency(stats.actual)} actual · ${formatCompactCurrency(stats.ideal)} ideal · ${formatCompactCurrency(stats.delta)} delta`;

  idealLine.style.left = `${clampPosition(stats.idealRatio)}px`;
  actualMarker.style.left = `${clampPosition(stats.actualRatio)}px`;
  renderSprites();

  if (state.lastActual !== stats.actual) {
    actualMarker.classList.remove('bump');
    void actualMarker.offsetWidth;
    actualMarker.classList.add('bump');
    state.lastActual = stats.actual;
  }
}

function render(snapshot) {
  state.snapshot = snapshot;
  state.frameIndex = 0;
  renderGoal();
  startSpriteAnimation();
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

petButton.addEventListener('click', () => {
  setControlsVisible(!state.controlsVisible);
  if (state.controlsVisible) {
    resetHideTimer();
  }
});

petButton.addEventListener('contextmenu', (event) => {
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
