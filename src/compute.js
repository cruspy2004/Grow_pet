const DAY_MS = 24 * 60 * 60 * 1000;

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

function computeGoalMetrics(goal, stepEvents, now = new Date()) {
  const events = stepEvents.filter((event) => event.goalId === goal.id);
  const stepCount = events.reduce((sum, event) => sum + Number(event.delta || 0), 0);
  const actual = stepCount * Number(goal.unitValue || 0);
  const today = toDateOnly(now);
  const start = toDateOnly(goal.startDate);
  const deadline = toDateOnly(goal.deadline);
  const totalDays = Math.max(1, daysBetween(start, deadline));
  const elapsedDays = clamp(daysBetween(start, today), 0, totalDays);
  const target = Number(goal.target || 0);
  const idealStartValue = clamp(Number(goal.idealStartValue) || 0, 0, target);
  const ideal = idealStartValue + (elapsedDays / totalDays) * Math.max(target - idealStartValue, 0);
  const remainingDays = Math.max(0, daysBetween(today, deadline));
  const remainingAmount = target - actual;
  const requiredPace = remainingDays > 0
    ? remainingAmount / remainingDays
    : remainingAmount > 0 ? remainingAmount : 0;
  const isComplete = target > 0 && actual >= target;
  const isBehind = actual < ideal;

  return {
    stepCount,
    actual,
    ideal,
    delta: actual - ideal,
    requiredPace,
    actualRatio: target > 0 ? clamp(actual / target, 0, 1.2) : 0,
    idealRatio: target > 0 ? clamp(ideal / target, 0, 1.2) : 0,
    idealStartValue,
    isComplete,
    isBehind,
    daysRemaining: remainingDays,
    daysElapsed: elapsedDays,
    totalDays,
    history: [...events].sort((left, right) => new Date(right.timestamp) - new Date(left.timestamp))
  };
}

module.exports = {
  DAY_MS,
  toDateOnly,
  clamp,
  daysBetween,
  computeGoalMetrics
};
