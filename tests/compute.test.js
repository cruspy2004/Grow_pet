const test = require('node:test');
const assert = require('node:assert/strict');
const { computeGoalMetrics, daysBetween, clamp, toDateOnly } = require('../src/compute');

function goal(overrides = {}) {
  return {
    id: 'g1',
    name: 'Test Goal',
    target: 1000,
    unitValue: 10,
    startDate: '2026-01-01',
    deadline: '2026-01-11',
    idealStartValue: 0,
    barColor: '#5fb8ff',
    active: true,
    archived: false,
    ...overrides
  };
}

function step(delta, timestamp, goalId = 'g1') {
  return { id: `e-${Math.random()}`, goalId, delta, timestamp };
}

test('actual is unitValue times sum of deltas', () => {
  const events = [step(1, '2026-01-02'), step(1, '2026-01-03'), step(-1, '2026-01-04')];
  const metrics = computeGoalMetrics(goal(), events, new Date('2026-01-05'));
  assert.equal(metrics.stepCount, 1);
  assert.equal(metrics.actual, 10);
});

test('ideal grows linearly from start to deadline', () => {
  const midpoint = new Date('2026-01-06');
  const metrics = computeGoalMetrics(goal(), [], midpoint);
  assert.ok(metrics.ideal > 400 && metrics.ideal < 600, `expected ~500, got ${metrics.ideal}`);
});

test('ideal respects idealStartValue offset', () => {
  const midpoint = new Date('2026-01-06');
  const metrics = computeGoalMetrics(goal({ idealStartValue: 200 }), [], midpoint);
  assert.ok(metrics.ideal >= 200, `ideal should never go below start value, got ${metrics.ideal}`);
});

test('delta is signed: positive when ahead, negative when behind', () => {
  const midpoint = new Date('2026-01-06');
  const behind = computeGoalMetrics(goal(), [], midpoint);
  assert.ok(behind.delta < 0);
  assert.ok(behind.isBehind);

  const aheadEvents = Array.from({ length: 100 }, (_, i) => step(1, '2026-01-02'));
  const ahead = computeGoalMetrics(goal(), aheadEvents, midpoint);
  assert.ok(ahead.delta > 0);
  assert.ok(!ahead.isBehind);
});

test('requiredPace divides remaining amount by remaining days', () => {
  const now = new Date('2026-01-06');
  const events = [step(1, '2026-01-02'), step(1, '2026-01-03')];
  const metrics = computeGoalMetrics(goal(), events, now);
  const remainingAmount = 1000 - 20;
  const remainingDays = 5;
  assert.equal(metrics.requiredPace, remainingAmount / remainingDays);
});

test('completed goal reports isComplete', () => {
  const events = Array.from({ length: 100 }, () => step(1, '2026-01-02'));
  const metrics = computeGoalMetrics(goal(), events, new Date('2026-01-06'));
  assert.equal(metrics.isComplete, true);
});

test('ratios clamp to at most 1.2', () => {
  const events = Array.from({ length: 1000 }, () => step(1, '2026-01-02'));
  const metrics = computeGoalMetrics(goal(), events, new Date('2026-01-06'));
  assert.ok(metrics.actualRatio <= 1.2);
});

test('history is sorted newest first', () => {
  const events = [
    step(1, '2026-01-02T09:00:00Z'),
    step(1, '2026-01-04T09:00:00Z'),
    step(1, '2026-01-03T09:00:00Z')
  ];
  const metrics = computeGoalMetrics(goal(), events, new Date('2026-01-05'));
  const timestamps = metrics.history.map((e) => e.timestamp);
  assert.deepEqual(timestamps, [
    '2026-01-04T09:00:00Z',
    '2026-01-03T09:00:00Z',
    '2026-01-02T09:00:00Z'
  ]);
});

test('zero-target goal returns zero ratios', () => {
  const metrics = computeGoalMetrics(goal({ target: 0 }), [step(1, '2026-01-02')], new Date('2026-01-06'));
  assert.equal(metrics.actualRatio, 0);
  assert.equal(metrics.idealRatio, 0);
});

test('deadline in the past yields zero remaining days', () => {
  const metrics = computeGoalMetrics(goal(), [], new Date('2026-06-01'));
  assert.equal(metrics.daysRemaining, 0);
});

test('daysBetween handles day boundaries and DST', () => {
  assert.equal(daysBetween('2026-03-07', '2026-03-10'), 3);
  assert.equal(daysBetween('2026-03-07T23:59:00', '2026-03-08T00:01:00'), 1);
});

test('clamp bounds a value', () => {
  assert.equal(clamp(5, 0, 10), 5);
  assert.equal(clamp(-1, 0, 10), 0);
  assert.equal(clamp(11, 0, 10), 10);
});

test('toDateOnly zeroes time components', () => {
  const d = toDateOnly('2026-05-05T14:30:00');
  assert.equal(d.getHours(), 0);
  assert.equal(d.getMinutes(), 0);
});
