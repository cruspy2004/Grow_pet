const {
  app,
  BrowserWindow,
  ipcMain,
  nativeTheme,
  globalShortcut,
  Notification,
  dialog,
  Menu,
  Tray,
  screen
} = require('electron');
const fs = require('fs/promises');
const fsSync = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');

const { normalizeState, CURRENT_SCHEMA_VERSION, DEFAULT_STATE } = require('./src/state');
const { computeGoalMetrics } = require('./src/compute');
const { createLogger } = require('./src/logger');
const proClient = require('./src/proClient');
const widgetLayout = require('./src/widgetLayout');

app.disableHardwareAcceleration();
const userDataPath = app.getPath('userData');
app.setPath('cache', path.join(userDataPath, 'Cache'));
app.setPath('crashDumps', path.join(userDataPath, 'Crashpad'));
// Electron re-derives userData from cache, so the two lines above quietly move it
// to <userData>/Cache/<name> — which put goals.json inside a cache directory.
// Re-assert it so user data sits where it belongs.
app.setPath('userData', userDataPath);

const logger = createLogger(path.join(userDataPath, 'logs'));

const dataFilePath = () => path.join(app.getPath('userData'), 'goals.json');

// Widget window geometry lives in src/widgetLayout.js as pure functions so it can
// be unit tested without Electron; main.js only supplies the live screen data.
const { PET_BOX } = widgetLayout;

const spriteAssetMap = {
  avatar: ['me-1.png', 'me-2.png', 'me-3.png'],
  naruto: ['naruto-1.png', 'naruto-2.png', 'naruto-3.png']
};

let state = structuredClone(DEFAULT_STATE);
let widgetWindow = null;
let panelWindow = null;
let tray = null;
let spriteSources = { avatar: [], naruto: [] };
let saveQueue = Promise.resolve();
let dailyNotifyTimer = null;
let syncTimer = null;
let currentHotkey = '';
let quitting = false;
// Screen coords of the top-left of the PET_BOX square. The sprite never moves
// when the widget changes mode; only the surrounding window grows around it.
let widgetAnchor = { x: 0, y: 0 };
let widgetMode = 'idle';
let widgetSide = 'left';
let widgetMenuUp = false;

function scheduleSave() {
  saveQueue = saveQueue.then(async () => {
    try {
      await fs.mkdir(path.dirname(dataFilePath()), { recursive: true });
      const payload = JSON.stringify(state, null, 2);
      const tmp = `${dataFilePath()}.tmp`;
      await fs.writeFile(tmp, payload, 'utf8');
      await fs.rename(tmp, dataFilePath());
    } catch (error) {
      logger.error('save-failed', { message: error.message });
    }
  });
  return saveQueue;
}

// Two past mistakes stranded user data: the app shipped as "grow_pet" before the
// rename, and setPath('cache') used to push userData down into <userData>/Cache/<name>.
// On a first run with no data file, adopt the most recently written of those
// stores. Originals are copied, never moved, so a wrong guess loses nothing.
function legacyDataPaths() {
  const appData = app.getPath('appData');
  return [
    path.join(appData, 'Grow Buddy', 'Cache', 'Grow Buddy', 'goals.json'),
    path.join(appData, 'grow_pet', 'Cache', 'grow_pet', 'goals.json'),
    path.join(appData, 'grow_pet', 'goals.json')
  ];
}

async function migrateLegacyUserData() {
  const target = dataFilePath();
  try {
    await fs.access(target);
    return;
  } catch {
    // No data at the current location — a legacy store may still exist.
  }

  const candidates = [];
  for (const candidatePath of legacyDataPaths()) {
    try {
      const [stats, raw] = await Promise.all([
        fs.stat(candidatePath),
        fs.readFile(candidatePath, 'utf8')
      ]);
      candidates.push({
        path: candidatePath,
        modifiedAt: stats.mtimeMs,
        state: normalizeState(JSON.parse(raw))
      });
    } catch (error) {
      if (error.code !== 'ENOENT') {
        logger.warn('legacy-candidate-unreadable', { path: candidatePath, message: error.message });
      }
    }
  }
  if (!candidates.length) {
    return;
  }

  // A previous run of the buggy build wrote an empty defaults file to one of
  // these paths, and it carries the freshest mtime. Prefer a store that actually
  // holds something, and only fall back to recency to break a real tie.
  const weigh = (candidate) => (candidate.state.goals.length ? 1 : 0);
  const newest = candidates.sort((left, right) => (
    weigh(right) - weigh(left)
    || right.state.stepEvents.length - left.state.stepEvents.length
    || right.modifiedAt - left.modifiedAt
  ))[0];
  try {
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, JSON.stringify(newest.state, null, 2), 'utf8');
    logger.info('legacy-data-migrated', {
      from: newest.path,
      goals: newest.state.goals.length,
      events: newest.state.stepEvents.length,
      otherCandidates: candidates.length - 1
    });
  } catch (error) {
    logger.warn('legacy-migration-failed', { message: error.message });
  }
}

async function loadState() {
  await migrateLegacyUserData();
  try {
    const raw = await fs.readFile(dataFilePath(), 'utf8');
    state = normalizeState(JSON.parse(raw));
    logger.info('state-loaded', { goals: state.goals.length, events: state.stepEvents.length });
  } catch (error) {
    state = normalizeState(DEFAULT_STATE);
    logger.warn('state-load-fallback', { message: error.message });
    await scheduleSave();
  }
  ensureActiveGoal();
}

async function loadSpriteSources() {
  const assetDir = path.join(__dirname, 'assets');
  const loaded = {};
  for (const [spriteKey, fileNames] of Object.entries(spriteAssetMap)) {
    loaded[spriteKey] = [];
    for (const fileName of fileNames) {
      const filePath = path.join(assetDir, fileName);
      try {
        const buffer = await fs.readFile(filePath);
        loaded[spriteKey].push(`data:image/png;base64,${buffer.toString('base64')}`);
      } catch (error) {
        logger.warn('sprite-load-failed', { file: fileName, message: error.message });
        loaded[spriteKey].push('');
      }
    }
  }
  spriteSources = loaded;
}

function ensureActiveGoal() {
  const usable = state.goals.filter((goal) => !goal.archived);
  if (!usable.length) {
    state.goals = state.goals.map((goal) => ({ ...goal, active: false }));
    return;
  }
  const activeGoal = usable.find((goal) => goal.active) || usable[0];
  state.goals = state.goals.map((goal) => ({
    ...goal,
    active: goal.id === activeGoal.id
  }));
}

function getActiveGoalId() {
  return state.goals.find((goal) => goal.active && !goal.archived)?.id
    || state.goals.find((goal) => !goal.archived)?.id
    || null;
}

function formatGoal(goal) {
  return { ...goal, stats: computeGoalMetrics(goal, state.stepEvents) };
}

function getSnapshot() {
  const activeGoalId = getActiveGoalId();
  const goals = state.goals.map(formatGoal);
  const activeGoal = goals.find((goal) => goal.id === activeGoalId) || null;
  return {
    schemaVersion: state.schemaVersion,
    settings: { ...state.settings },
    pro: {
      ...state.pro,
      userToken: state.pro.userToken ? '***' : ''
    },
    goals,
    activeGoalId,
    activeGoal,
    spriteSources,
    theme: nativeTheme.shouldUseDarkColors ? 'dark' : 'light',
    appVersion: app.getVersion()
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

function workAreaNear(x, y) {
  return screen.getDisplayNearestPoint({ x: Math.round(x), y: Math.round(y) }).workArea;
}

function defaultWidgetAnchor() {
  return widgetLayout.defaultWidgetAnchor(screen.getPrimaryDisplay().workArea);
}

function anchorIsOnScreen(position) {
  return widgetLayout.anchorIsOnScreen(
    position,
    screen.getAllDisplays().map((display) => display.workArea)
  );
}

function computeWidgetBounds(mode, anchor) {
  return widgetLayout.computeWidgetBounds(
    mode,
    anchor,
    workAreaNear(anchor.x + PET_BOX / 2, anchor.y + PET_BOX / 2)
  );
}

function applyWidgetMode(mode) {
  widgetMode = widgetLayout.normalizeMode(mode);
  const bounds = computeWidgetBounds(widgetMode, widgetAnchor);
  widgetSide = bounds.side;
  widgetMenuUp = bounds.menuUp;
  if (widgetWindow && !widgetWindow.isDestroyed()) {
    widgetWindow.setBounds({
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height
    });
    // Re-derive from what was actually applied: on a work area too small to hold
    // the expanded row the bounds get clamped, and keeping the stale anchor would
    // let the sprite drift a little further on every mode change.
    widgetAnchor = anchorFromWidgetBounds();
  }
  return { mode: widgetMode, side: widgetSide, menuUp: widgetMenuUp };
}

// Reverse of computeWidgetBounds: recover the pet square from the live window.
function anchorFromWidgetBounds() {
  if (!widgetWindow || widgetWindow.isDestroyed()) {
    return widgetAnchor;
  }
  return widgetLayout.anchorFromWidgetBounds(widgetWindow.getBounds(), widgetSide, widgetMenuUp);
}

function persistWidgetAnchor() {
  state.settings.widgetPosition = { x: Math.round(widgetAnchor.x), y: Math.round(widgetAnchor.y) };
  return scheduleSave();
}

function createWidgetWindow() {
  if (widgetWindow && !widgetWindow.isDestroyed()) {
    return widgetWindow;
  }
  const saved = state.settings.widgetPosition;
  widgetAnchor = anchorIsOnScreen(saved)
    ? { x: Number(saved.x), y: Number(saved.y) }
    : defaultWidgetAnchor();
  widgetMode = 'idle';
  const bounds = computeWidgetBounds('idle', widgetAnchor);
  widgetSide = bounds.side;
  widgetMenuUp = bounds.menuUp;
  widgetWindow = new BrowserWindow({
    width: bounds.width,
    height: bounds.height,
    x: bounds.x,
    y: bounds.y,
    frame: false,
    transparent: true,
    resizable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    hasShadow: false,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
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
    width: 1160,
    height: 820,
    minWidth: 960,
    minHeight: 680,
    backgroundColor: '#0b0d12',
    title: 'Grow Buddy',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
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
  const nextGoal = {
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
    active: Boolean(payload.active),
    archived: Boolean(payload.archived),
    shareCode: String(payload.shareCode || '')
  };
  if (goalIndex >= 0) {
    state.goals[goalIndex] = { ...state.goals[goalIndex], ...nextGoal };
  } else {
    state.goals.push(nextGoal);
  }
  if (nextGoal.active) {
    state.goals = state.goals.map((entry) => ({
      ...entry,
      active: entry.id === nextGoal.id
    }));
  } else if (!state.goals.some((entry) => entry.active && !entry.archived)) {
    ensureActiveGoal();
  }
  await scheduleSave();
  sendSnapshot();
  return getSnapshot();
}

async function addStep(goalId, delta) {
  const targetGoalId = goalId || getActiveGoalId();
  if (!targetGoalId) {
    logger.warn('add-step-no-goal');
    return getSnapshot();
  }
  state.stepEvents.push({
    id: randomUUID(),
    goalId: targetGoalId,
    delta: Number(delta) || 0,
    timestamp: new Date().toISOString()
  });
  await scheduleSave();
  sendSnapshot();
  const goal = state.goals.find((entry) => entry.id === targetGoalId);
  if (goal && !goal.archived) {
    const metrics = computeGoalMetrics(goal, state.stepEvents);
    if (metrics.isComplete) {
      showNotification('Goal reached', `${goal.name} — target hit. Open the panel to archive or extend.`);
    }
  }
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
  await scheduleSave();
  sendSnapshot();
  return getSnapshot();
}

async function deleteStep(eventId) {
  state.stepEvents = state.stepEvents.filter((event) => event.id !== eventId);
  await scheduleSave();
  sendSnapshot();
  return getSnapshot();
}

async function deleteGoal(goalId) {
  state.goals = state.goals.filter((goal) => goal.id !== goalId);
  state.stepEvents = state.stepEvents.filter((event) => event.goalId !== goalId);
  state.pro.shares = state.pro.shares.filter((share) => share.goalId !== goalId);
  ensureActiveGoal();
  await scheduleSave();
  sendSnapshot();
  return getSnapshot();
}

async function archiveGoal(goalId) {
  state.goals = state.goals.map((goal) =>
    goal.id === goalId ? { ...goal, archived: true, active: false } : goal
  );
  ensureActiveGoal();
  await scheduleSave();
  sendSnapshot();
  return getSnapshot();
}

async function extendGoal({ goalId, deadline, target }) {
  const index = state.goals.findIndex((goal) => goal.id === goalId);
  if (index === -1) {
    return getSnapshot();
  }
  const current = state.goals[index];
  state.goals[index] = {
    ...current,
    archived: false,
    deadline: deadline ? String(deadline) : current.deadline,
    target: target != null ? Math.max(0, Number(target) || 0) : current.target
  };
  ensureActiveGoal();
  await scheduleSave();
  sendSnapshot();
  return getSnapshot();
}

async function setGoalActive(goalId) {
  state.goals = state.goals.map((goal) => ({
    ...goal,
    active: goal.id === goalId && !goal.archived
  }));
  await scheduleSave();
  sendSnapshot();
  return getSnapshot();
}

async function updateSettings(partial) {
  state.settings = {
    ...state.settings,
    ...partial,
    autoHideSeconds: Math.max(0, Number(partial.autoHideSeconds ?? state.settings.autoHideSeconds) || 0),
    launchAtStartup: Boolean(partial.launchAtStartup ?? state.settings.launchAtStartup),
    notifyWhenBehind: Boolean(partial.notifyWhenBehind ?? state.settings.notifyWhenBehind),
    hotkeyPlusOne: String(partial.hotkeyPlusOne ?? state.settings.hotkeyPlusOne),
    widgetPosition: state.settings.widgetPosition
  };
  try {
    app.setLoginItemSettings({
      openAtLogin: state.settings.launchAtStartup,
      path: process.execPath,
      args: []
    });
  } catch (error) {
    logger.warn('login-item-set-failed', { message: error.message });
  }
  registerHotkey();
  await scheduleSave();
  sendSnapshot();
  return getSnapshot();
}

async function updatePro(partial) {
  const merged = { ...state.pro, ...partial };
  state.pro = {
    enabled: Boolean(merged.enabled),
    apiBaseUrl: String(merged.apiBaseUrl || DEFAULT_STATE.pro.apiBaseUrl),
    userToken: String(merged.userToken || ''),
    userEmail: String(merged.userEmail || ''),
    shares: Array.isArray(merged.shares) ? merged.shares : state.pro.shares
  };
  await scheduleSave();
  sendSnapshot();
  return getSnapshot();
}

async function exportData() {
  const result = await dialog.showSaveDialog({
    title: 'Export Grow Buddy data',
    defaultPath: `grow-buddy-${new Date().toISOString().slice(0, 10)}.json`,
    filters: [{ name: 'JSON', extensions: ['json'] }]
  });
  if (result.canceled || !result.filePath) {
    return { ok: false, canceled: true };
  }
  await fs.writeFile(result.filePath, JSON.stringify(state, null, 2), 'utf8');
  logger.info('data-exported', { path: result.filePath });
  return { ok: true, path: result.filePath };
}

async function importData() {
  const result = await dialog.showOpenDialog({
    title: 'Import Grow Buddy data',
    properties: ['openFile'],
    filters: [{ name: 'JSON', extensions: ['json'] }]
  });
  if (result.canceled || !result.filePaths.length) {
    return { ok: false, canceled: true };
  }
  try {
    const raw = await fs.readFile(result.filePaths[0], 'utf8');
    const parsed = JSON.parse(raw);
    state = normalizeState(parsed);
    ensureActiveGoal();
    await scheduleSave();
    sendSnapshot();
    logger.info('data-imported', { path: result.filePaths[0] });
    return { ok: true };
  } catch (error) {
    logger.error('import-failed', { message: error.message });
    return { ok: false, error: error.message };
  }
}

function showNotification(title, body) {
  try {
    if (!Notification.isSupported()) {
      return;
    }
    new Notification({ title, body, silent: false }).show();
  } catch (error) {
    logger.warn('notification-failed', { message: error.message });
  }
}

function checkBehindPace() {
  if (!state.settings.notifyWhenBehind) {
    return;
  }
  const activeGoalId = getActiveGoalId();
  if (!activeGoalId) {
    return;
  }
  const goal = state.goals.find((entry) => entry.id === activeGoalId);
  if (!goal) {
    return;
  }
  const metrics = computeGoalMetrics(goal, state.stepEvents);
  if (metrics.isBehind && !metrics.isComplete) {
    showNotification(
      'Behind on ' + goal.name,
      `You are ${Math.round(metrics.ideal - metrics.actual)} behind pace. Log a step to catch up.`
    );
  }
}

function scheduleDailyNotify() {
  clearInterval(dailyNotifyTimer);
  dailyNotifyTimer = setInterval(checkBehindPace, 6 * 60 * 60 * 1000);
  setTimeout(checkBehindPace, 30 * 1000);
}

function registerHotkey() {
  if (currentHotkey && globalShortcut.isRegistered(currentHotkey)) {
    globalShortcut.unregister(currentHotkey);
  }
  const accelerator = state.settings.hotkeyPlusOne;
  if (!accelerator) {
    currentHotkey = '';
    return;
  }
  try {
    const ok = globalShortcut.register(accelerator, async () => {
      const goalId = getActiveGoalId();
      if (!goalId) {
        return;
      }
      await addStep(goalId, 1);
      showNotification('Grow Buddy', '+1 logged');
    });
    if (ok) {
      currentHotkey = accelerator;
      logger.info('hotkey-registered', { accelerator });
    } else {
      logger.warn('hotkey-register-failed', { accelerator });
      currentHotkey = '';
    }
  } catch (error) {
    logger.warn('hotkey-error', { accelerator, message: error.message });
    currentHotkey = '';
  }
}

function scheduleProSync() {
  clearInterval(syncTimer);
  syncTimer = setInterval(runProSync, 5 * 60 * 1000);
  setTimeout(runProSync, 15 * 1000);
}

async function runProSync() {
  if (!state.pro.enabled || !state.pro.userToken) {
    return;
  }
  try {
    for (const goal of state.goals) {
      if (goal.archived) continue;
      await proClient.pushSnapshot(state.pro, goal, state.stepEvents);
    }
    const { snapshots } = await proClient.pullIncoming(state.pro);
    if (snapshots?.length) {
      state.pro.shares = state.pro.shares.map((share) => {
        const found = snapshots.find((entry) => entry.code === share.code);
        return found
          ? { ...share, snapshot: found.snapshot, lastSyncedAt: new Date().toISOString() }
          : share;
      });
      await scheduleSave();
      sendSnapshot();
    }
  } catch (error) {
    logger.warn('pro-sync-error', { message: error.message });
  }
}

function buildTrayIcon() {
  try {
    const iconPath = path.join(__dirname, 'assets', 'me-1.png');
    if (!fsSync.existsSync(iconPath)) {
      return;
    }
    tray = new Tray(iconPath);
    tray.setToolTip('Grow Buddy');
    tray.setContextMenu(Menu.buildFromTemplate([
      { label: 'Show widget', click: () => createWidgetWindow() },
      { label: 'Open panel', click: () => createPanelWindow() },
      { type: 'separator' },
      { label: 'Quit', click: () => { quitting = true; app.quit(); } }
    ]));
    tray.on('click', () => createPanelWindow());
  } catch (error) {
    logger.warn('tray-init-failed', { message: error.message });
  }
}

const singleInstanceLock = app.requestSingleInstanceLock();
if (!singleInstanceLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (widgetWindow) {
      widgetWindow.show();
      widgetWindow.focus();
    } else {
      createWidgetWindow();
    }
    if (panelWindow) {
      panelWindow.show();
      panelWindow.focus();
    }
  });
}

app.whenReady().then(async () => {
  await loadState();
  await loadSpriteSources();
  createWidgetWindow();
  buildTrayIcon();
  scheduleDailyNotify();
  scheduleProSync();
  registerHotkey();
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
  ipcMain.handle('goal:archive', async (_event, goalId) => archiveGoal(goalId));
  ipcMain.handle('goal:extend', async (_event, payload) => extendGoal(payload || {}));
  ipcMain.handle('step:add', async (_event, payload) => addStep(payload?.goalId, payload?.delta));
  ipcMain.handle('step:update', async (_event, payload) => updateStep(payload?.eventId, payload || {}));
  ipcMain.handle('step:delete', async (_event, eventId) => deleteStep(eventId));
  ipcMain.handle('settings:update', async (_event, partial) => updateSettings(partial || {}));
  ipcMain.handle('pro:update', async (_event, partial) => updatePro(partial || {}));
  ipcMain.handle('data:export', async () => exportData());
  ipcMain.handle('data:import', async () => importData());
  ipcMain.handle('pro:join', async (_event, code) => {
    const result = await proClient.joinShareCode(state.pro, String(code || '').trim());
    if (result.ok) {
      state.pro.shares.push({
        code: String(code).trim(),
        goalId: '',
        direction: 'incoming',
        friendLabel: result.data?.friendLabel || '',
        lastSyncedAt: '',
        snapshot: null
      });
      await scheduleSave();
      sendSnapshot();
    }
    return result;
  });
  ipcMain.handle('pro:create-share', async (_event, goalId) => {
    const result = await proClient.createShareCode(state.pro, goalId);
    if (result.ok && result.code) {
      state.pro.shares.push({
        code: result.code,
        goalId: String(goalId),
        direction: 'outgoing',
        friendLabel: '',
        lastSyncedAt: '',
        snapshot: null
      });
      await scheduleSave();
      sendSnapshot();
    }
    return result;
  });
  ipcMain.handle('pro:sync-now', async () => {
    await runProSync();
    return getSnapshot();
  });

  ipcMain.handle('widget:set-mode', async (_event, mode) => applyWidgetMode(mode));
  // Drag positions are expressed as the pet square, never as the window. The
  // window origin means different things either side of an edge flip, so a drag
  // that crossed one would jump by the width of the control pill.
  ipcMain.handle('widget:get-position', async () => (
    { x: Math.round(widgetAnchor.x), y: Math.round(widgetAnchor.y) }
  ));
  ipcMain.on('widget:move-to', (_event, payload) => {
    if (!widgetWindow || widgetWindow.isDestroyed()) {
      return;
    }
    const x = Number(payload?.x);
    const y = Number(payload?.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      return;
    }
    const area = workAreaNear(x + PET_BOX / 2, y + PET_BOX / 2);
    widgetAnchor = widgetLayout.clampAnchor({ x, y }, area);
    const previousSide = widgetSide;
    const previousMenuUp = widgetMenuUp;
    const layout = applyWidgetMode(widgetMode);
    // Dragging an open widget past an edge flips which way the row unfolds; the
    // renderer has to mirror itself to keep the sprite over the same pixels.
    if (layout.side !== previousSide || layout.menuUp !== previousMenuUp) {
      widgetWindow.webContents.send('widget:layout', layout);
    }
  });
  ipcMain.handle('widget:drag-end', async () => {
    widgetAnchor = anchorFromWidgetBounds();
    const layout = applyWidgetMode(widgetMode);
    widgetAnchor = anchorFromWidgetBounds();
    await persistWidgetAnchor();
    return layout;
  });

  ipcMain.on('widget:right-click', () => {
    createPanelWindow();
    sendSnapshot();
  });

  logger.info('app-ready', { schemaVersion: CURRENT_SCHEMA_VERSION, version: app.getVersion() });
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  clearInterval(dailyNotifyTimer);
  clearInterval(syncTimer);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin' && quitting) {
    app.quit();
  }
});

process.on('uncaughtException', (error) => {
  logger.error('uncaught-exception', { message: error.message, stack: error.stack });
});

process.on('unhandledRejection', (reason) => {
  logger.error('unhandled-rejection', { message: String(reason) });
});
