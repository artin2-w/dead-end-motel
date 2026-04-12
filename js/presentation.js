const DEFAULT_ALERT_TTL = 9000;
const MAX_ALERTS = 5;
const ALERT_COOLDOWN_MS = 7000;
const ALERT_PRIORITY = {
  danger: 4,
  warning: 3,
  success: 2,
  info: 1
};

function countCriticalOccupiedRooms(rooms = []) {
  return rooms.filter((room) => room?.occupiedBy && room?.condition === 'Critical').length;
}

function getChainPressureTotal(state) {
  if (!Array.isArray(state?.storyChains)) return 0;
  return state.storyChains.reduce((sum, chain) => sum + Math.max(0, Number(chain?.pressure || 0)), 0);
}

function getShiftProgressPercent(state) {
  const elapsed = Math.max(0, Number(state?.shiftElapsedMinutes || 0));
  return Math.round((elapsed / 480) * 100);
}

export function normalizePresentationState(state) {
  if (!state || typeof state !== 'object') return state;

  return {
    ...state,
    liveAlerts: Array.isArray(state.liveAlerts) ? state.liveAlerts : [],
    uiFlags: {
      lowPowerWarned: false,
      lowReputationWarned: false,
      criticalPressureWarned: false,
      nearDawnWarned: false,
      ...(state.uiFlags || {})
    },
    alertCooldowns: {
      ...(state.alertCooldowns || {})
    }
  };
}

export function pushLiveAlert(state, payload) {
  if (!state || !payload?.message) return null;
  if (!Array.isArray(state.liveAlerts)) {
    state.liveAlerts = [];
  }
  if (!state.alertCooldowns || typeof state.alertCooldowns !== 'object') {
    state.alertCooldowns = {};
  }

  const now = Date.now();
  const dedupeKey = payload.dedupeKey || payload.id || payload.message;
  const lastAt = state.alertCooldowns[dedupeKey] || 0;
  if (now - lastAt < ALERT_COOLDOWN_MS) {
    return null;
  }

  const existingIndex = state.liveAlerts.findIndex(
    (entry) => entry?.dedupeKey === dedupeKey || entry?.message === payload.message
  );
  if (existingIndex >= 0) {
    state.liveAlerts.splice(existingIndex, 1);
  }

  const alert = {
    id: payload.id || `alert-${now}-${Math.floor(Math.random() * 1000)}`,
    type: payload.type || 'info',
    kind: payload.kind || 'status',
    message: payload.message,
    dedupeKey,
    createdAt: now,
    expiresAt: now + Math.max(1200, Number(payload.ttl || DEFAULT_ALERT_TTL))
  };

  state.alertCooldowns[dedupeKey] = now;
  const merged = [...state.liveAlerts, alert].sort((a, b) => {
    const priorityDiff = (ALERT_PRIORITY[b?.type] || 0) - (ALERT_PRIORITY[a?.type] || 0);
    if (priorityDiff !== 0) return priorityDiff;
    return Number(b?.createdAt || 0) - Number(a?.createdAt || 0);
  });
  state.liveAlerts = merged.slice(0, MAX_ALERTS);
  return alert;
}

export function pruneLiveAlerts(state) {
  if (!state || !Array.isArray(state.liveAlerts)) return;
  const now = Date.now();
  state.liveAlerts = state.liveAlerts.filter((alert) => !alert?.expiresAt || alert.expiresAt > now);
}

export function deriveUiPressureLevel(state) {
  const criticalRooms = countCriticalOccupiedRooms(state?.rooms || []);
  const chainPressure = getChainPressureTotal(state);
  const power = Number(state?.power ?? 100);
  const reputation = Number(state?.reputation ?? 50);
  const progress = getShiftProgressPercent(state);

  if (
    power <= 22 ||
    reputation <= 28 ||
    criticalRooms >= 2 ||
    chainPressure >= 9
  ) {
    return 'dire';
  }

  if (
    power <= 40 ||
    reputation <= 40 ||
    criticalRooms >= 1 ||
    chainPressure >= 4 ||
    progress >= 78
  ) {
    return 'tense';
  }

  return 'calm';
}

export function getTopbarWarningFlags(state) {
  const criticalRooms = countCriticalOccupiedRooms(state?.rooms || []);
  const progress = getShiftProgressPercent(state);

  return {
    lowPower: Number(state?.power ?? 100) <= 30,
    lowReputation: Number(state?.reputation ?? 50) <= 35,
    criticalPressure: criticalRooms >= 2,
    nearDawn: progress >= 80
  };
}

export function getRoomPresentationMeta(room) {
  const risk = String(room?.riskLevel || 'Low').toLowerCase();
  const condition = String(room?.condition || 'Stable').toLowerCase();
  const chainPressure = Math.max(0, Number(room?.chainPressure || 0));
  const isOccupied = Boolean(room?.occupiedBy);

  let tone = 'normal';
  if (condition === 'critical' || chainPressure >= 6 || risk === 'high') {
    tone = 'danger';
  } else if (condition === 'watch' || chainPressure >= 3 || risk === 'medium') {
    tone = 'warning';
  }

  return {
    shouldPulse: isOccupied && (condition === 'critical' || chainPressure >= 6),
    tone,
    compactMetaRows: [
      { label: 'Risk', value: room?.riskLevel || 'Low' },
      { label: 'Desk Flagged', value: room?.deskFlagged ? 'Yes' : 'No' },
      { label: 'Policy', value: room?.policyRecommendation || 'Approve' },
      { label: 'Override', value: room?.policyOverride ? 'Yes' : 'No' }
    ]
  };
}