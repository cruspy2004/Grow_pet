const shared = window.growBuddyShared;
const buddyApi = window.growBuddy;

const ui = {
  snapshot: null,
  selectedGoalId: null,
  draftMode: false,
  currentTab: 'goals'
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
const goalSpriteVariantInput = document.getElementById('goalSpriteVariantInput');
const goalIdealStartInput = document.getElementById('goalIdealStartInput');
const goalBarColorInput = document.getElementById('goalBarColorInput');
const activateGoalButton = document.getElementById('activateGoalButton');
const deleteGoalButton = document.getElementById('deleteGoalButton');
const archiveGoalButton = document.getElementById('archiveGoalButton');
const extendGoalButton = document.getElementById('extendGoalButton');
const resetGoalButton = document.getElementById('resetGoalButton');
const statsGrid = document.getElementById('statsGrid');
const historyList = document.getElementById('historyList');
const completionBanner = document.getElementById('completionBanner');
const completionText = document.getElementById('completionText');

const tabNav = document.getElementById('tabNav');

const autoHideInput = document.getElementById('autoHideInput');
const launchInput = document.getElementById('launchInput');
const notifyInput = document.getElementById('notifyInput');
const hotkeyInput = document.getElementById('hotkeyInput');
const saveSettingsButton = document.getElementById('saveSettingsButton');
const exportButton = document.getElementById('exportButton');
const importButton = document.getElementById('importButton');
const dataStatus = document.getElementById('dataStatus');
const appVersionLabel = document.getElementById('appVersionLabel');
const schemaVersionLabel = document.getElementById('schemaVersionLabel');

const proEmailInput = document.getElementById('proEmailInput');
const proApiInput = document.getElementById('proApiInput');
const proTokenInput = document.getElementById('proTokenInput');
const proEnabledInput = document.getElementById('proEnabledInput');
const saveProButton = document.getElementById('saveProButton');
const syncNowButton = document.getElementById('syncNowButton');
const buddyList = document.getElementById('buddyList');
const joinCodeInput = document.getElementById('joinCodeInput');
const joinCodeButton = document.getElementById('joinCodeButton');
const shareGoalSelect = document.getElementById('shareGoalSelect');
const createShareButton = document.getElementById('createShareButton');

function currency(value) {
  return shared.formatCurrency(value);
}

function activeGoals() {
  return (ui.snapshot?.goals || []).filter((goal) => !goal.archived);
}

function currentGoal() {
  if (!ui.snapshot || ui.draftMode) {
    return null;
  }
  const goals = ui.snapshot.goals || [];
  return goals.find((goal) => goal.id === ui.selectedGoalId) || ui.snapshot.activeGoal || goals[0] || null;
}

function createStatCard(label, value) {
  return `<section class="stat-card"><span>${shared.escapeHtml(label)}</span><strong>${shared.escapeHtml(value)}</strong></section>`;
}

function spriteLabel(goal) {
  return shared.getSpriteLabel(goal?.spriteKey);
}

function spriteVariantLabel(goal) {
  return `v${goal?.spriteVariant || 1}`;
}

function switchTab(tab) {
  ui.currentTab = tab;
  for (const button of tabNav.querySelectorAll('.tab-button')) {
    button.classList.toggle('active', button.dataset.tab === tab);
  }
  for (const panel of document.querySelectorAll('.tab-panel')) {
    panel.classList.toggle('active', panel.dataset.tabPanel === tab);
  }
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
      const archivedClass = goal.archived ? 'archived' : '';
      return `
        <article class="goal-item ${activeClass} ${archivedClass}" data-goal-id="${shared.escapeHtml(goal.id)}">
          <h3>${shared.escapeHtml(goal.name)}${goal.archived ? ' <span class="pill">Archived</span>' : ''}</h3>
          <p>${currency(goal.stats.actual)} actual · ${currency(goal.stats.ideal)} ideal</p>
          <div class="meta-row">
            <span>Target ${currency(goal.target)}</span>
            <span>Unit ${currency(goal.unitValue)}</span>
          </div>
          <p class="goal-sprite">Sprite ${shared.escapeHtml(spriteLabel(goal))} ${shared.escapeHtml(spriteVariantLabel(goal))}</p>
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
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      const goalId = button.closest('.goal-item')?.dataset.goalId;
      ui.draftMode = false;
      ui.selectedGoalId = goalId;
      fillGoalForm(ui.snapshot.goals.find((goal) => goal.id === goalId));
      renderAll();
    });
  }
  for (const button of goalList.querySelectorAll('.activate-goal')) {
    button.addEventListener('click', async (event) => {
      event.stopPropagation();
      const goalId = button.closest('.goal-item')?.dataset.goalId;
      ui.draftMode = false;
      await buddyApi.activateGoal(goalId);
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
  goalSpriteVariantInput.value = String(goal?.spriteVariant || 1);
  goalIdealStartInput.value = String(goal?.idealStartValue ?? 0);
  goalBarColorInput.value = goal?.barColor || '#5fb8ff';
}

function renderHero(goal) {
  if (!goal) {
    heroTitle.textContent = 'No active goal';
    heroSubtitle.textContent = 'Create a goal to start tracking steps.';
    heroStats.innerHTML = '';
    completionBanner.classList.add('hidden');
    return;
  }
  heroTitle.textContent = goal.name;
  const deltaWord = goal.stats.delta >= 0 ? 'ahead' : 'behind';
  heroSubtitle.textContent = `${currency(Math.abs(goal.stats.delta))} ${deltaWord} · ${currency(goal.stats.requiredPace)}/day required · ${goal.stats.daysRemaining} days left`;
  heroStats.innerHTML = [
    createStatCard('Actual', currency(goal.stats.actual)),
    createStatCard('Ideal by today', currency(goal.stats.ideal)),
    createStatCard('Delta', currency(goal.stats.delta)),
    createStatCard('Required pace', currency(goal.stats.requiredPace))
  ].join('');

  if (goal.stats.isComplete) {
    completionBanner.classList.remove('hidden');
    completionText.textContent = `${goal.name}: ${currency(goal.stats.actual)} of ${currency(goal.target)}.`;
  } else {
    completionBanner.classList.add('hidden');
  }
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
    createStatCard('Days elapsed', String(goal.stats.daysElapsed)),
    createStatCard('Days remaining', String(goal.stats.daysRemaining)),
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
      <article class="history-item" data-event-id="${shared.escapeHtml(event.id)}">
        <header>
          <strong>${event.delta > 0 ? '+' : ''}${event.delta}</strong>
          <span>${shared.escapeHtml(shared.toInputDateTime(event.timestamp))}</span>
        </header>
        <div class="inline-edit">
          <label>
            <span>Delta</span>
            <input class="event-delta" type="number" step="1" value="${event.delta}" />
          </label>
          <label>
            <span>Timestamp</span>
            <input class="event-timestamp" type="datetime-local" value="${shared.escapeHtml(shared.toInputDateTime(event.timestamp))}" />
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
      await buddyApi.updateStep({ eventId, delta, timestamp: new Date(timestamp).toISOString() });
    });
  }
  for (const button of historyList.querySelectorAll('.delete-event')) {
    button.addEventListener('click', async () => {
      const row = button.closest('.history-item');
      const eventId = row?.dataset.eventId;
      await buddyApi.deleteStep(eventId);
    });
  }
}

function syncSettings() {
  autoHideInput.value = ui.snapshot?.settings?.autoHideSeconds ?? 6;
  launchInput.checked = Boolean(ui.snapshot?.settings?.launchAtStartup);
  notifyInput.checked = Boolean(ui.snapshot?.settings?.notifyWhenBehind);
  hotkeyInput.value = ui.snapshot?.settings?.hotkeyPlusOne || '';
  appVersionLabel.textContent = ui.snapshot?.appVersion || '';
  schemaVersionLabel.textContent = String(ui.snapshot?.schemaVersion ?? 1);
}

function syncPro() {
  const pro = ui.snapshot?.pro || {};
  proEmailInput.value = pro.userEmail || '';
  proApiInput.value = pro.apiBaseUrl || '';
  proTokenInput.placeholder = pro.userToken ? 'Token saved. Paste a new one to replace.' : 'Paste your Pro access token';
  proTokenInput.value = '';
  proEnabledInput.checked = Boolean(pro.enabled);

  const shares = pro.shares || [];
  if (!shares.length) {
    buddyList.innerHTML = '<div class="empty-state">Share a code or join one to see buddies here.</div>';
  } else {
    buddyList.innerHTML = shares
      .map((share) => {
        const snap = share.snapshot || {};
        const label = share.friendLabel || share.code;
        const direction = share.direction === 'outgoing' ? 'You share' : 'Watching';
        const progress = snap.actualRatio != null ? `${Math.round(snap.actualRatio * 100)}%` : '—';
        return `
          <article class="buddy-item">
            <header><strong>${shared.escapeHtml(label)}</strong><span>${shared.escapeHtml(direction)}</span></header>
            <p>${shared.escapeHtml(snap.goalName || 'No snapshot yet')} · ${shared.escapeHtml(progress)}</p>
            <p class="helper-text">Code: ${shared.escapeHtml(share.code)}</p>
          </article>
        `;
      })
      .join('');
  }

  shareGoalSelect.innerHTML = activeGoals()
    .map((goal) => `<option value="${shared.escapeHtml(goal.id)}">${shared.escapeHtml(goal.name)}</option>`)
    .join('') || '<option value="">No goals yet</option>';
}

function renderAll() {
  const goal = currentGoal();
  renderGoalList();
  renderHero(goal);
  renderStats(goal);
  renderHistory(goal);
  syncSettings();
  syncPro();
  fillGoalForm(goal);
}

for (const button of tabNav.querySelectorAll('.tab-button')) {
  button.addEventListener('click', () => switchTab(button.dataset.tab));
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
    spriteVariant: Number(goalSpriteVariantInput.value || 1),
    idealStartValue: Number(goalIdealStartInput.value || 0),
    barColor: goalBarColorInput.value,
    active: true
  };
  const next = await buddyApi.updateGoal(payload);
  ui.snapshot = next;
  ui.selectedGoalId = next.activeGoalId;
  renderAll();
});

newGoalButton.addEventListener('click', () => {
  ui.selectedGoalId = null;
  ui.draftMode = true;
  fillGoalForm(null);
  switchTab('goals');
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
    await buddyApi.activateGoal(goal.id);
  }
});

deleteGoalButton.addEventListener('click', async () => {
  const goal = currentGoal();
  if (goal && confirm(`Delete "${goal.name}"? This removes the goal and its history permanently.`)) {
    await buddyApi.deleteGoal(goal.id);
    ui.selectedGoalId = null;
  }
});

archiveGoalButton.addEventListener('click', async () => {
  const goal = currentGoal();
  if (goal) {
    await buddyApi.archiveGoal(goal.id);
  }
});

extendGoalButton.addEventListener('click', async () => {
  const goal = currentGoal();
  if (!goal) return;
  const newDeadline = prompt('New deadline (YYYY-MM-DD):', shared.toInputDate(goal.deadline));
  if (!newDeadline) return;
  const newTargetStr = prompt('New target (leave blank to keep current):', String(goal.target));
  const payload = {
    goalId: goal.id,
    deadline: new Date(newDeadline).toISOString(),
    target: newTargetStr && newTargetStr.trim() ? Number(newTargetStr) : goal.target
  };
  await buddyApi.extendGoal(payload);
});

resetGoalButton.addEventListener('click', async () => {
  const goal = currentGoal();
  if (!goal) return;
  if (!confirm(`Reset all progress for "${goal.name}"? This deletes every step event.`)) return;
  for (const event of goal.stats.history) {
    await buddyApi.deleteStep(event.id);
  }
});

saveSettingsButton.addEventListener('click', async () => {
  await buddyApi.updateSettings({
    autoHideSeconds: Number(autoHideInput.value || 0),
    launchAtStartup: launchInput.checked,
    notifyWhenBehind: notifyInput.checked,
    hotkeyPlusOne: hotkeyInput.value.trim() || 'CommandOrControl+Alt+='
  });
});

exportButton.addEventListener('click', async () => {
  const result = await buddyApi.exportData();
  dataStatus.textContent = result?.ok
    ? `Exported to ${result.path}`
    : result?.canceled ? 'Export canceled.' : 'Export failed.';
});

importButton.addEventListener('click', async () => {
  if (!confirm('Importing will replace your current goals and history. Continue?')) return;
  const result = await buddyApi.importData();
  dataStatus.textContent = result?.ok
    ? 'Import complete.'
    : result?.canceled ? 'Import canceled.' : `Import failed: ${result?.error || 'unknown error'}`;
});

saveProButton.addEventListener('click', async () => {
  const payload = {
    userEmail: proEmailInput.value.trim(),
    apiBaseUrl: proApiInput.value.trim() || 'https://api.growbuddy.app',
    enabled: proEnabledInput.checked
  };
  if (proTokenInput.value.trim()) {
    payload.userToken = proTokenInput.value.trim();
  }
  await buddyApi.updatePro(payload);
});

syncNowButton.addEventListener('click', async () => {
  await buddyApi.proSyncNow();
});

joinCodeButton.addEventListener('click', async () => {
  const code = joinCodeInput.value.trim();
  if (!code) return;
  const result = await buddyApi.proJoinShareCode(code);
  if (!result?.ok) {
    alert(`Could not join: ${result?.reason || 'unknown error'}`);
  }
  joinCodeInput.value = '';
});

createShareButton.addEventListener('click', async () => {
  const goalId = shareGoalSelect.value;
  if (!goalId) {
    alert('Create a goal first.');
    return;
  }
  const result = await buddyApi.proCreateShareCode(goalId);
  if (result?.ok) {
    alert(`Share code created: ${result.code}\nSend it to your buddy.`);
  } else {
    alert(`Could not create share code: ${result?.reason || 'unknown error'}`);
  }
});

buddyApi.onStateChange((snapshot) => {
  ui.snapshot = snapshot;
  ui.draftMode = false;
  if (!ui.selectedGoalId) {
    ui.selectedGoalId = snapshot.activeGoalId || snapshot.goals[0]?.id || null;
  }
  renderAll();
});

buddyApi.getState().then((snapshot) => {
  ui.snapshot = snapshot;
  ui.draftMode = false;
  ui.selectedGoalId = snapshot.activeGoalId || snapshot.goals[0]?.id || null;
  renderAll();
});
