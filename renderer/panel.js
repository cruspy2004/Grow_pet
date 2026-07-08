const shared = window.growPetShared;
const petApi = window.growPet;

const ui = {
  snapshot: null,
  selectedGoalId: null,
  draftMode: false
};

const goalList = document.getElementById('goalList');
const newGoalButton = document.getElementById('newGoalButton');
const heroTitle = document.getElementById('heroTitle');
const heroSubtitle = document.getElementById('heroSubtitle');
const heroStats = document.getElementById('heroStats');
const goalForm = document.getElementById('goalForm');
const goalIdInput = document.getElementById('goalIdInput');
const goalNameInput = document.getElementById('goalNameInput');
const goalTargetInput = document.getElementById('goalTargetInput');
const goalUnitValueInput = document.getElementById('goalUnitValueInput');
const goalStartInput = document.getElementById('goalStartInput');
const goalDeadlineInput = document.getElementById('goalDeadlineInput');
const goalSpriteInput = document.getElementById('goalSpriteInput');
const activateGoalButton = document.getElementById('activateGoalButton');
const deleteGoalButton = document.getElementById('deleteGoalButton');
const resetGoalButton = document.getElementById('resetGoalButton');
const statsGrid = document.getElementById('statsGrid');
const historyList = document.getElementById('historyList');
const autoHideInput = document.getElementById('autoHideInput');
const launchInput = document.getElementById('launchInput');
const saveSettingsButton = document.getElementById('saveSettingsButton');

function currency(value) {
  return shared.formatCurrency(value);
}

function currentGoal() {
  if (!ui.snapshot || ui.draftMode) {
    return null;
  }

  return ui.snapshot.goals.find((goal) => goal.id === ui.selectedGoalId) || ui.snapshot.activeGoal || ui.snapshot.goals[0] || null;
}

function createStatCard(label, value) {
  return `<section class="stat-card"><span>${shared.escapeHtml(label)}</span><strong>${shared.escapeHtml(value)}</strong></section>`;
}

function spriteLabel(goal) {
  return shared.getSpriteLabel(goal?.spriteKey);
}

function renderGoalList() {
  const goals = ui.snapshot?.goals || [];
  if (!goals.length) {
    goalList.innerHTML = '<div class="empty-state">No goals yet. Create one to get started.</div>';
    return;
  }

  goalList.innerHTML = goals
    .map((goal) => {
      const activeClass = goal.active ? 'active' : '';
      return `
        <article class="goal-item ${activeClass}" data-goal-id="${goal.id}">
          <h3>${shared.escapeHtml(goal.name)}</h3>
          <p>${currency(goal.stats.actual)} actual · ${currency(goal.stats.ideal)} ideal</p>
          <div class="meta-row">
            <span>Target ${currency(goal.target)}</span>
            <span>Unit ${currency(goal.unitValue)}</span>
          </div>
          <p class="goal-sprite">Sprite ${shared.escapeHtml(spriteLabel(goal))}</p>
          <div class="item-actions">
            <button class="secondary-button select-goal" type="button">Open</button>
            <button class="secondary-button activate-goal" type="button">Set active</button>
          </div>
        </article>
      `;
    })
    .join('');

  for (const item of goalList.querySelectorAll('.goal-item')) {
    item.addEventListener('click', () => {
      ui.draftMode = false;
      ui.selectedGoalId = item.dataset.goalId;
      fillGoalForm(ui.snapshot.goals.find((goal) => goal.id === ui.selectedGoalId));
      renderAll();
    });
  }

  for (const button of goalList.querySelectorAll('.select-goal')) {
    button.addEventListener('click', async (event) => {
      event.stopPropagation();
      const goalId = button.closest('.goal-item')?.dataset.goalId;
      ui.draftMode = false;
      ui.selectedGoalId = goalId;
      fillGoalForm(ui.snapshot.goals.find((goal) => goal.id === goalId));
      renderAll();
      await petApi.activateGoal(goalId);
    });
  }

  for (const button of goalList.querySelectorAll('.activate-goal')) {
    button.addEventListener('click', async (event) => {
      event.stopPropagation();
      const goalId = button.closest('.goal-item')?.dataset.goalId;
      ui.draftMode = false;
      await petApi.activateGoal(goalId);
    });
  }
}

function fillGoalForm(goal) {
  goalIdInput.value = goal?.id || '';
  goalNameInput.value = goal?.name || '';
  goalTargetInput.value = goal?.target ?? 0;
  goalUnitValueInput.value = goal?.unitValue ?? 1;
  goalStartInput.value = shared.toInputDate(goal?.startDate || new Date());
  goalDeadlineInput.value = shared.toInputDate(goal?.deadline || new Date());
  goalSpriteInput.value = goal?.spriteKey || 'avatar';
}

function renderHero(goal) {
  if (!goal) {
    heroTitle.textContent = 'No active goal';
    heroSubtitle.textContent = 'Create a goal to start tracking steps.';
    heroStats.innerHTML = '';
    return;
  }

  heroTitle.textContent = goal.name;
  heroSubtitle.textContent = `${currency(goal.stats.delta)} delta · ${currency(goal.stats.requiredPace)} required per day · ${spriteLabel(goal)}`;
  heroStats.innerHTML = [
    createStatCard('Actual', currency(goal.stats.actual)),
    createStatCard('Ideal by today', currency(goal.stats.ideal)),
    createStatCard('Delta', currency(goal.stats.delta)),
    createStatCard('Required pace', currency(goal.stats.requiredPace))
  ].join('');
}

function renderStats(goal) {
  if (!goal) {
    statsGrid.innerHTML = '<div class="empty-state">Select a goal to inspect stats.</div>';
    return;
  }

  statsGrid.innerHTML = [
    createStatCard('Goal target', currency(goal.target)),
    createStatCard('Unit value', currency(goal.unitValue)),
    createStatCard('Step count', String(goal.stats.stepCount)),
    createStatCard('Deadline', shared.toInputDate(goal.deadline))
  ].join('');
}

function renderHistory(goal) {
  if (!goal) {
    historyList.innerHTML = '<div class="empty-state">History appears here once steps are logged.</div>';
    return;
  }

  if (!goal.stats.history.length) {
    historyList.innerHTML = '<div class="empty-state">No step events yet.</div>';
    return;
  }

  historyList.innerHTML = goal.stats.history
    .map((event) => `
      <article class="history-item" data-event-id="${event.id}">
        <header>
          <strong>${event.delta > 0 ? '+' : ''}${event.delta}</strong>
          <span>${shared.toInputDateTime(event.timestamp)}</span>
        </header>
        <div class="inline-edit">
          <label>
            <span>Delta</span>
            <input class="event-delta" type="number" step="1" value="${event.delta}" />
          </label>
          <label>
            <span>Timestamp</span>
            <input class="event-timestamp" type="datetime-local" value="${shared.toInputDateTime(event.timestamp)}" />
          </label>
          <button class="primary-button save-event" type="button">Save</button>
        </div>
        <div class="history-actions">
          <span>Stored locally</span>
          <button class="danger-button delete-event" type="button">Delete</button>
        </div>
      </article>
    `)
    .join('');

  for (const button of historyList.querySelectorAll('.save-event')) {
    button.addEventListener('click', async () => {
      const row = button.closest('.history-item');
      const eventId = row?.dataset.eventId;
      const delta = Number(row.querySelector('.event-delta')?.value || 0);
      const timestamp = row.querySelector('.event-timestamp')?.value || new Date().toISOString();
      await petApi.updateStep({ eventId, delta, timestamp: new Date(timestamp).toISOString() });
    });
  }

  for (const button of historyList.querySelectorAll('.delete-event')) {
    button.addEventListener('click', async () => {
      const row = button.closest('.history-item');
      const eventId = row?.dataset.eventId;
      await petApi.deleteStep(eventId);
    });
  }
}

function syncSettings() {
  autoHideInput.value = ui.snapshot?.settings?.autoHideSeconds ?? 6;
  launchInput.checked = Boolean(ui.snapshot?.settings?.launchAtStartup);
}

function renderAll() {
  const goal = currentGoal();
  renderGoalList();
  renderHero(goal);
  renderStats(goal);
  renderHistory(goal);
  syncSettings();
  fillGoalForm(goal);
}

goalForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const payload = {
    id: goalIdInput.value || undefined,
    name: goalNameInput.value.trim() || 'Untitled goal',
    target: Number(goalTargetInput.value || 0),
    unitValue: Number(goalUnitValueInput.value || 1),
    startDate: new Date(goalStartInput.value || new Date()).toISOString(),
    deadline: new Date(goalDeadlineInput.value || new Date()).toISOString(),
    spriteKey: goalSpriteInput.value,
    active: true
  };

  const next = await petApi.updateGoal(payload);
  ui.snapshot = next;
  ui.selectedGoalId = next.activeGoalId;
  renderAll();
});

newGoalButton.addEventListener('click', () => {
  ui.selectedGoalId = null;
  ui.draftMode = true;
  fillGoalForm(null);
  renderGoalList();
  renderHero(null);
  renderStats(null);
  renderHistory(null);
  syncSettings();
  goalNameInput.focus();
});

activateGoalButton.addEventListener('click', async () => {
  const goal = currentGoal();
  if (goal) {
    await petApi.activateGoal(goal.id);
  }
});

deleteGoalButton.addEventListener('click', async () => {
  const goal = currentGoal();
  if (goal) {
    await petApi.deleteGoal(goal.id);
    ui.selectedGoalId = null;
  }
});

resetGoalButton.addEventListener('click', async () => {
  const goal = currentGoal();
  if (!goal) {
    return;
  }

  for (const event of goal.stats.history) {
    await petApi.deleteStep(event.id);
  }
});

saveSettingsButton.addEventListener('click', async () => {
  await petApi.updateSettings({
    autoHideSeconds: Number(autoHideInput.value || 0),
    launchAtStartup: launchInput.checked
  });
});

petApi.onStateChange((snapshot) => {
  ui.snapshot = snapshot;
  ui.draftMode = false;
  if (!ui.selectedGoalId) {
    ui.selectedGoalId = snapshot.activeGoalId || snapshot.goals[0]?.id || null;
  }
  renderAll();
});

petApi.getState().then((snapshot) => {
  ui.snapshot = snapshot;
  ui.draftMode = false;
  ui.selectedGoalId = snapshot.activeGoalId || snapshot.goals[0]?.id || null;
  renderAll();
});
