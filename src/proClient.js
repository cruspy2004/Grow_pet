const { computeGoalMetrics } = require('./compute');

async function pushSnapshot(pro, goal, stepEvents) {
  if (!pro?.enabled || !pro?.userToken || !pro?.apiBaseUrl) {
    return { ok: false, reason: 'pro-disabled' };
  }
  const share = (pro.shares || []).find((entry) => entry.goalId === goal.id && entry.direction === 'outgoing');
  if (!share) {
    return { ok: false, reason: 'no-share' };
  }
  const metrics = computeGoalMetrics(goal, stepEvents);
  const body = {
    shareCode: share.code,
    goalName: goal.name,
    target: goal.target,
    deadline: goal.deadline,
    actual: metrics.actual,
    ideal: metrics.ideal,
    actualRatio: metrics.actualRatio,
    idealRatio: metrics.idealRatio,
    isBehind: metrics.isBehind,
    isComplete: metrics.isComplete,
    reportedAt: new Date().toISOString()
  };
  try {
    const response = await fetch(`${pro.apiBaseUrl}/v1/shares/${encodeURIComponent(share.code)}/snapshot`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${pro.userToken}`
      },
      body: JSON.stringify(body)
    });
    if (!response.ok) {
      return { ok: false, reason: `http-${response.status}` };
    }
    return { ok: true };
  } catch (error) {
    return { ok: false, reason: 'network', message: error.message };
  }
}

async function pullIncoming(pro) {
  if (!pro?.enabled || !pro?.userToken || !pro?.apiBaseUrl) {
    return { ok: false, snapshots: [] };
  }
  const incoming = (pro.shares || []).filter((share) => share.direction === 'incoming');
  const snapshots = [];
  for (const share of incoming) {
    try {
      const response = await fetch(`${pro.apiBaseUrl}/v1/shares/${encodeURIComponent(share.code)}/snapshot`, {
        headers: { authorization: `Bearer ${pro.userToken}` }
      });
      if (!response.ok) {
        continue;
      }
      const data = await response.json();
      snapshots.push({ code: share.code, snapshot: data });
    } catch {
      // ignore transient errors
    }
  }
  return { ok: true, snapshots };
}

async function joinShareCode(pro, code) {
  if (!pro?.enabled || !pro?.userToken || !pro?.apiBaseUrl) {
    return { ok: false, reason: 'pro-disabled' };
  }
  try {
    const response = await fetch(`${pro.apiBaseUrl}/v1/shares/${encodeURIComponent(code)}/join`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${pro.userToken}`
      }
    });
    if (!response.ok) {
      return { ok: false, reason: `http-${response.status}` };
    }
    const data = await response.json();
    return { ok: true, data };
  } catch (error) {
    return { ok: false, reason: 'network', message: error.message };
  }
}

async function createShareCode(pro, goalId) {
  if (!pro?.enabled || !pro?.userToken || !pro?.apiBaseUrl) {
    return { ok: false, reason: 'pro-disabled' };
  }
  try {
    const response = await fetch(`${pro.apiBaseUrl}/v1/shares`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${pro.userToken}`
      },
      body: JSON.stringify({ goalId })
    });
    if (!response.ok) {
      return { ok: false, reason: `http-${response.status}` };
    }
    const data = await response.json();
    return { ok: true, code: data?.code };
  } catch (error) {
    return { ok: false, reason: 'network', message: error.message };
  }
}

module.exports = {
  pushSnapshot,
  pullIncoming,
  joinShareCode,
  createShareCode
};
