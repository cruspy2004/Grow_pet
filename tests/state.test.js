const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeState, CURRENT_SCHEMA_VERSION, DEFAULT_STATE } = require('../src/state');

test('normalizeState produces default when given nothing', () => {
  const state = normalizeState(null);
  assert.equal(state.schemaVersion, CURRENT_SCHEMA_VERSION);
  assert.deepEqual(state.goals, []);
  assert.deepEqual(state.stepEvents, []);
  assert.equal(state.settings.autoHideSeconds, DEFAULT_STATE.settings.autoHideSeconds);
});

test('normalizeState migrates a legacy schema file (no schemaVersion field)', () => {
  const legacy = {
    settings: { autoHideSeconds: 3, launchAtStartup: true },
    goals: [{ name: 'Old goal', target: 100, unitValue: 1 }],
    stepEvents: [{ delta: 1, timestamp: '2026-01-01T00:00:00Z', goalId: 'x' }]
  };
  const state = normalizeState(legacy);
  assert.equal(state.schemaVersion, CURRENT_SCHEMA_VERSION);
  assert.equal(state.goals[0].name, 'Old goal');
  assert.equal(state.settings.launchAtStartup, true);
  assert.equal(state.settings.notifyWhenBehind, false, 'new setting defaults to false');
  assert.equal(state.pro.enabled, false);
});

test('normalizeState coerces bad types safely', () => {
  const state = normalizeState({
    schemaVersion: 1,
    settings: { autoHideSeconds: 'nope' },
    goals: [{ target: '500', unitValue: 'x', spriteVariant: '99' }],
    stepEvents: 'not-an-array'
  });
  assert.equal(state.settings.autoHideSeconds, 0);
  assert.equal(state.goals[0].target, 500);
  assert.equal(state.goals[0].unitValue, 1, 'invalid unitValue floors to 1');
  assert.equal(state.goals[0].spriteVariant, 1, 'invalid variant falls back to 1');
  assert.deepEqual(state.stepEvents, []);
});

test('normalizeState preserves pro shares', () => {
  const state = normalizeState({
    schemaVersion: 1,
    pro: {
      enabled: true,
      userToken: 'abc',
      userEmail: 'a@b.com',
      shares: [{ code: 'FOO', goalId: 'g1', direction: 'outgoing' }]
    }
  });
  assert.equal(state.pro.enabled, true);
  assert.equal(state.pro.shares.length, 1);
  assert.equal(state.pro.shares[0].code, 'FOO');
  assert.equal(state.pro.shares[0].direction, 'outgoing');
});

test('normalizeState keeps a valid widget position and rejects a broken one', () => {
  assert.equal(normalizeState(null).settings.widgetPosition, null, 'defaults to null');

  const kept = normalizeState({ settings: { widgetPosition: { x: 120, y: -40 } } });
  assert.deepEqual(kept.settings.widgetPosition, { x: 120, y: -40 });

  for (const bad of [{ x: 'a', y: 2 }, { x: 1 }, { x: NaN, y: 0 }, 'nope', []]) {
    assert.equal(
      normalizeState({ settings: { widgetPosition: bad } }).settings.widgetPosition,
      null,
      `rejects ${JSON.stringify(bad)}`
    );
  }
});

test('normalizeState defaults every goal to unarchived', () => {
  const state = normalizeState({ goals: [{ name: 'X' }] });
  assert.equal(state.goals[0].archived, false);
});
