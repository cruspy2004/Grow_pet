const { app, BrowserWindow, ipcMain, nativeTheme } = require('electron');
const fs = require('fs/promises');
const path = require('path');
const { randomUUID } = require('crypto');

const DEFAULT_STATE = {
  settings: {
    autoHideSeconds: 6,
    launchAtStartup: false
  },
  goals: [],
  stepEvents: []
};

const DAY_MS = 24 * 60 * 60 * 1000;
const dataFilePath = () => path.join(app.getPath('userData'), 'goals.json');

let state = structuredClone(DEFAULT_STATE);
let widgetWindow = null;
let panelWindow = null;

function toDateOnly(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return new Date();
  }

  date.setHours(0, 0, 0, 0);
  return date;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function daysBetween(start, end) {
  return Math.round((toDateOnly(end) - toDateOnly(start)) / DAY_MS);
}

function normalizeState(input) {
  const safeInput = input && typeof input === 'object' ? input : {};
  const settings = {
    ...DEFAULT_STATE.settings,
    ...(safeInput.settings || {})
  };

  const goals = Array.isArray(safeInput.goals) ? safeInput.goals : [];
  const stepEvents = Array.isArray(safeInput.stepEvents) ? safeInput.stepEvents : [];

  return {
    settings: {
      autoHideSeconds: Math.max(0, Number(settings.autoHideSeconds) || DEFAULT_STATE.settings.autoHideSeconds),
      launchAtStartup: Boolean(settings.launchAtStartup)
    },
    goals: goals.map((goal, index) => ({
      id: String(goal?.id || randomUUID()),
      name: String(goal?.name || `Goal ${index + 1}`),
      target: Number(goal?.target) || 0,
      unitValue: Number(goal?.unitValue) || 1,
      startDate: String(goal?.startDate || new Date().toISOString()),
      deadline: String(goal?.deadline || new Date().toISOString()),
      spriteKey: goal?.spriteKey === 'naruto' ? 'naruto' : 'avatar',
      spriteVariant: [1, 2, 3].includes(Number(goal?.spriteVariant)) ? Number(goal.spriteVariant) : 1,
      idealStartValue: Math.max(0, Number(goal?.idealStartValue) || 0),
      barColor: String(goal?.barColor || '#5fb8ff'),
      active: Boolean(goal?.active)
    })),
    stepEvents: stepEvents.map((event) => ({
      id: String(event?.id || randomUUID()),
      goalId: String(event?.goalId || ''),
      delta: Number(event?.delta) || 0,
      timestamp: String(event?.timestamp || new Date().toISOString())
    }))
  };
}

async function loadState() {
  try {
    const raw = await fs.readFile(dataFilePath(), 'utf8');
    state = normalizeState(JSON.parse(raw));
  } catch (error) {
    state = normalizeState(DEFAULT_STATE);
    await saveState();
  }

  ensureActiveGoal();
}

async function saveState() {
  await fs.mkdir(path.dirname(dataFilePath()), { recursive: true });
  await fs.writeFile(dataFilePath(), JSON.stringify(state, null, 2), 'utf8');
}

function ensureActiveGoal() {
  if (!state.goals.length) {
    return;
  }

  const activeGoal = state.goals.find((goal) => goal.active) || state.goals[0];
  state.goals = state.goals.map((goal) => ({
    ...goal,
    active: goal.id === activeGoal.id
  }));
}

function getActiveGoalId() {
  return state.goals.find((goal) => goal.active)?.id || state.goals[0]?.id || null;
}

function computeGoalMetrics(goal) {
  const events = state.stepEvents.filter((event) => event.goalId === goal.id);
  const stepCount = events.reduce((sum, event) => sum + Number(event.delta || 0), 0);
  const actual = stepCount * goal.unitValue;
  const today = toDateOnly(new Date());
  const start = toDateOnly(goal.startDate);
  const deadline = toDateOnly(goal.deadline);
  const totalDays = Math.max(1, daysBetween(start, deadline));
  const elapsedDays = clamp(daysBetween(start, today), 0, totalDays);
  const idealStartValue = clamp(Number(goal.idealStartValue) || 0, 0, goal.target);
  const ideal = idealStartValue + (elapsedDays / totalDays) * Math.max(goal.target - idealStartValue, 0);
  const remainingDays = Math.max(0, daysBetween(today, deadline));
  const remainingAmount = goal.target - actual;
  const requiredPace = remainingDays > 0 ? remainingAmount / remainingDays : remainingAmount > 0 ? remainingAmount : 0;

  return {
    stepCount,
    actual,
    ideal,
    delta: actual - ideal,
    requiredPace,
    actualRatio: goal.target > 0 ? clamp(actual / goal.target, 0, 1.2) : 0,
    idealRatio: goal.target > 0 ? clamp(ideal / goal.target, 0, 1.2) : 0,
    idealStartValue,
    history: [...events].sort((left, right) => new Date(right.timestamp) - new Date(left.timestamp))
  };
}

function formatGoal(goal) {
  const stats = computeGoalMetrics(goal);
  return {
    ...goal,
    stats
  };
}

function getSnapshot() {
  const activeGoalId = getActiveGoalId();
  const goals = state.goals.map(formatGoal);
  const activeGoal = goals.find((goal) => goal.id === activeGoalId) || null;

  return {
    settings: { ...state.settings },
    goals,
    activeGoalId,
    activeGoal,
    theme: nativeTheme.shouldUseDarkColors ? 'dark' : 'light'
  };
}

function sendSnapshot() {
  const snapshot = getSnapshot();
  for (const window of [widgetWindow, panelWindow]) {
    if (window && !window.isDestroyed()) {
      window.webContents.send('state:snapshot', snapshot);
    }
  }
}

function createWidgetWindow() {
  if (widgetWindow && !widgetWindow.isDestroyed()) {
    return widgetWindow;
  }

  widgetWindow = new BrowserWindow({
    width: 420,
    height: 180,
    minWidth: 360,
    minHeight: 160,
    frame: false,
    transparent: true,
    resizable: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    hasShadow: false,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  widgetWindow.setAlwaysOnTop(true, 'screen-saver');
  widgetWindow.loadFile(path.join(__dirname, 'renderer', 'widget.html'));

  widgetWindow.on('closed', () => {
    widgetWindow = null;
  });

  return widgetWindow;
}

function createPanelWindow() {
  if (panelWindow && !panelWindow.isDestroyed()) {
    panelWindow.show();
    panelWindow.focus();
    return panelWindow;
  }

  panelWindow = new BrowserWindow({
    width: 1120,
    height: 780,
    minWidth: 960,
    minHeight: 680,
    backgroundColor: '#111318',
    title: 'Grow Pet',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  panelWindow.loadFile(path.join(__dirname, 'renderer', 'panel.html'));

  panelWindow.on('closed', () => {
    panelWindow = null;
  });

  return panelWindow;
}

async function upsertGoal(goalId, payload) {
  const goalIndex = state.goals.findIndex((goal) => goal.id === goalId);
  const startDate = String(payload.startDate || new Date().toISOString());
  const deadline = String(payload.deadline || new Date().toISOString());
  const goal = {
    id: goalId || randomUUID(),
    name: String(payload.name || 'Untitled goal'),
    target: Math.max(0, Number(payload.target) || 0),
    unitValue: Math.max(1, Number(payload.unitValue) || 1),
    startDate,
    deadline,
    spriteKey: payload.spriteKey === 'naruto' ? 'naruto' : 'avatar',
    spriteVariant: [1, 2, 3].includes(Number(payload.spriteVariant)) ? Number(payload.spriteVariant) : 1,
    idealStartValue: Math.max(0, Number(payload.idealStartValue) || 0),
    barColor: String(payload.barColor || '#5fb8ff'),
    active: Boolean(payload.active)
  };

  if (goalIndex >= 0) {
    state.goals[goalIndex] = {
      ...state.goals[goalIndex],
      ...goal
    };
  } else {
    state.goals.push(goal);
  }

  if (!state.goals.some((entry) => entry.active)) {
    state.goals = state.goals.map((entry, index) => ({
      ...entry,
      active: index === 0
    }));
  }

  if (goal.active) {
    state.goals = state.goals.map((entry) => ({
      ...entry,
      active: entry.id === goal.id
    }));
  }

  await saveState();
  sendSnapshot();
  return getSnapshot();
}

async function addStep(goalId, delta) {
  const targetGoalId = goalId || getActiveGoalId();
  if (!targetGoalId) {
    return getSnapshot();
  }

  state.stepEvents.push({
    id: randomUUID(),
    goalId: targetGoalId,
    delta: Number(delta) || 0,
    timestamp: new Date().toISOString()
  });

  await saveState();
  sendSnapshot();
  return getSnapshot();
}

async function updateStep(eventId, payload) {
  const eventIndex = state.stepEvents.findIndex((event) => event.id === eventId);
  if (eventIndex === -1) {
    return getSnapshot();
  }

  state.stepEvents[eventIndex] = {
    ...state.stepEvents[eventIndex],
    delta: Number(payload.delta) || 0,
    timestamp: String(payload.timestamp || state.stepEvents[eventIndex].timestamp)
  };

  await saveState();
  sendSnapshot();
  return getSnapshot();
}

async function deleteStep(eventId) {
  state.stepEvents = state.stepEvents.filter((event) => event.id !== eventId);
  await saveState();
  sendSnapshot();
  return getSnapshot();
}

async function deleteGoal(goalId) {
  state.goals = state.goals.filter((goal) => goal.id !== goalId);
  state.stepEvents = state.stepEvents.filter((event) => event.goalId !== goalId);

  if (state.goals.length) {
    const activeGoal = state.goals.find((goal) => goal.active) || state.goals[0];
    state.goals = state.goals.map((goal) => ({
      ...goal,
      active: goal.id === activeGoal.id
    }));
  }

  await saveState();
  sendSnapshot();
  return getSnapshot();
}

async function setGoalActive(goalId) {
  state.goals = state.goals.map((goal) => ({
    ...goal,
    active: goal.id === goalId
  }));

  await saveState();
  sendSnapshot();
  return getSnapshot();
}

async function updateSettings(partial) {
  state.settings = {
    ...state.settings,
    ...partial,
    autoHideSeconds: Math.max(0, Number(partial.autoHideSeconds ?? state.settings.autoHideSeconds) || 0),
    launchAtStartup: Boolean(partial.launchAtStartup ?? state.settings.launchAtStartup)
  };

  app.setLoginItemSettings({
    openAtLogin: state.settings.launchAtStartup,
    path: process.execPath,
    args: []
  });

  await saveState();
  sendSnapshot();
  return getSnapshot();
}

app.whenReady().then(async () => {
  await loadState();
  createWidgetWindow();
  sendSnapshot();

  ipcMain.handle('app:get-state', async () => getSnapshot());
  ipcMain.handle('panel:open', async () => {
    createPanelWindow();
    sendSnapshot();
    return getSnapshot();
  });
  ipcMain.handle('goal:create', async (_event, payload) => upsertGoal(payload?.id, payload || {}));
  ipcMain.handle('goal:update', async (_event, payload) => upsertGoal(payload?.id, payload || {}));
  ipcMain.handle('goal:activate', async (_event, goalId) => setGoalActive(goalId));
  ipcMain.handle('goal:delete', async (_event, goalId) => deleteGoal(goalId));
  ipcMain.handle('step:add', async (_event, payload) => addStep(payload?.goalId, payload?.delta));
  ipcMain.handle('step:update', async (_event, payload) => updateStep(payload?.eventId, payload || {}));
  ipcMain.handle('step:delete', async (_event, eventId) => deleteStep(eventId));
  ipcMain.handle('settings:update', async (_event, partial) => updateSettings(partial || {}));

  ipcMain.on('widget:right-click', () => {
    createPanelWindow();
    sendSnapshot();
  });

  ipcMain.on('widget:toggle-panel', () => {
    createPanelWindow();
    sendSnapshot();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
