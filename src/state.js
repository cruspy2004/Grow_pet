const { randomUUID } = require('crypto');

const CURRENT_SCHEMA_VERSION = 1;

const DEFAULT_STATE = {
  schemaVersion: CURRENT_SCHEMA_VERSION,
  settings: {
    autoHideSeconds: 6,
    launchAtStartup: false,
    notifyWhenBehind: false,
    hotkeyPlusOne: 'CommandOrControl+Alt+='
  },
  pro: {
    enabled: false,
    apiBaseUrl: 'https://api.growbuddy.app',
    userToken: '',
    userEmail: '',
    shares: []
  },
  goals: [],
  stepEvents: []
};

function normalizeGoal(goal, index) {
  const safe = goal && typeof goal === 'object' ? goal : {};
  return {
    id: String(safe.id || randomUUID()),
    name: String(safe.name || `Goal ${index + 1}`),
    target: Math.max(0, Number(safe.target) || 0),
    unitValue: Math.max(1, Number(safe.unitValue) || 1),
    startDate: String(safe.startDate || new Date().toISOString()),
    deadline: String(safe.deadline || new Date().toISOString()),
    spriteKey: safe.spriteKey === 'naruto' ? 'naruto' : 'avatar',
    spriteVariant: [1, 2, 3].includes(Number(safe.spriteVariant)) ? Number(safe.spriteVariant) : 1,
    idealStartValue: Math.max(0, Number(safe.idealStartValue) || 0),
    barColor: String(safe.barColor || '#5fb8ff'),
    active: Boolean(safe.active),
    archived: Boolean(safe.archived),
    shareCode: safe.shareCode ? String(safe.shareCode) : ''
  };
}

function normalizeStepEvent(event) {
  const safe = event && typeof event === 'object' ? event : {};
  return {
    id: String(safe.id || randomUUID()),
    goalId: String(safe.goalId || ''),
    delta: Number(safe.delta) || 0,
    timestamp: String(safe.timestamp || new Date().toISOString())
  };
}

function migrateFromLegacy(input) {
  if (!input || typeof input !== 'object') {
    return { ...DEFAULT_STATE };
  }
  if (Number(input.schemaVersion) === CURRENT_SCHEMA_VERSION) {
    return input;
  }
  return {
    ...DEFAULT_STATE,
    ...input,
    schemaVersion: CURRENT_SCHEMA_VERSION
  };
}

function normalizeState(rawInput) {
  const input = migrateFromLegacy(rawInput);
  const settings = { ...DEFAULT_STATE.settings, ...(input.settings || {}) };
  const pro = { ...DEFAULT_STATE.pro, ...(input.pro || {}) };
  const goals = Array.isArray(input.goals) ? input.goals : [];
  const stepEvents = Array.isArray(input.stepEvents) ? input.stepEvents : [];

  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    settings: {
      autoHideSeconds: Math.max(0, Number(settings.autoHideSeconds) || 0),
      launchAtStartup: Boolean(settings.launchAtStartup),
      notifyWhenBehind: Boolean(settings.notifyWhenBehind),
      hotkeyPlusOne: String(settings.hotkeyPlusOne || DEFAULT_STATE.settings.hotkeyPlusOne)
    },
    pro: {
      enabled: Boolean(pro.enabled),
      apiBaseUrl: String(pro.apiBaseUrl || DEFAULT_STATE.pro.apiBaseUrl),
      userToken: String(pro.userToken || ''),
      userEmail: String(pro.userEmail || ''),
      shares: Array.isArray(pro.shares)
        ? pro.shares.map((share) => ({
            code: String(share?.code || ''),
            goalId: String(share?.goalId || ''),
            direction: share?.direction === 'incoming' ? 'incoming' : 'outgoing',
            friendLabel: String(share?.friendLabel || ''),
            lastSyncedAt: String(share?.lastSyncedAt || ''),
            snapshot: share?.snapshot && typeof share.snapshot === 'object' ? share.snapshot : null
          }))
        : []
    },
    goals: goals.map((goal, index) => normalizeGoal(goal, index)),
    stepEvents: stepEvents.map(normalizeStepEvent)
  };
}

module.exports = {
  CURRENT_SCHEMA_VERSION,
  DEFAULT_STATE,
  normalizeGoal,
  normalizeStepEvent,
  normalizeState,
  migrateFromLegacy
};
