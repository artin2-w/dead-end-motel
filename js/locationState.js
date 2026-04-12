const ZONE_ORDER = ['Lobby', 'Parking Lot', 'Hallway', 'Laundry', 'Ice Machine', 'Rear Exit'];

function createZoneState(zoneId, zoneName) {
  return {
    zoneId,
    zoneName,
    issueStage: 0,
    pendingIssue: null,
    lastResolvedAction: null,
    followupPressure: 0,
    temporaryModifiers: {},
    cooldowns: {},
    ignoreCount: 0,
    unresolvedCount: 0,
    lastInvestigatedNight: null,
    lastOutcome: null,
    lastSeverity: 'low',
    containmentTier: 'none',
    stabilityStatus: 'clear',
    protectedScansRemaining: 0,
    stabilityScansRemaining: 0,
    recurrenceSuppression: 0,
    lastRecurrenceReason: null,
    lastStatusNote: null
  };
}

export function createLocationState() {
  const zones = {};
  ZONE_ORDER.forEach((name, index) => {
    const zoneId = index + 1;
    zones[zoneId] = createZoneState(zoneId, name);
  });
  return {
    zones,
    lastTickNight: null
  };
}

function normalizeCounter(value) {
  if (typeof value !== 'number' || Number.isNaN(value)) return 0;
  return Math.max(0, Math.floor(value));
}

function normalizeZone(zone = {}, fallbackId, fallbackName) {
  const suppression = Number(zone.recurrenceSuppression || 0);
  return {
    zoneId: Number(zone.zoneId || fallbackId) || fallbackId,
    zoneName: zone.zoneName || fallbackName,
    issueStage: Math.max(0, Math.min(3, normalizeCounter(zone.issueStage))),
    pendingIssue: zone.pendingIssue || null,
    lastResolvedAction: zone.lastResolvedAction || null,
    followupPressure: normalizeCounter(zone.followupPressure),
    temporaryModifiers:
      zone.temporaryModifiers && typeof zone.temporaryModifiers === 'object'
        ? { ...zone.temporaryModifiers }
        : {},
    cooldowns:
      zone.cooldowns && typeof zone.cooldowns === 'object'
        ? { ...zone.cooldowns }
        : {},
    ignoreCount: normalizeCounter(zone.ignoreCount),
    unresolvedCount: normalizeCounter(zone.unresolvedCount),
    lastInvestigatedNight:
      typeof zone.lastInvestigatedNight === 'number' ? Math.max(1, zone.lastInvestigatedNight) : null,
    lastOutcome: zone.lastOutcome || null,
    lastSeverity: zone.lastSeverity || 'low',
    containmentTier: zone.containmentTier || 'none',
    stabilityStatus: zone.stabilityStatus || 'clear',
    protectedScansRemaining: normalizeCounter(zone.protectedScansRemaining),
    stabilityScansRemaining: normalizeCounter(zone.stabilityScansRemaining),
    recurrenceSuppression: Math.max(0, Math.min(0.75, Number.isFinite(suppression) ? suppression : 0)),
    lastRecurrenceReason: zone.lastRecurrenceReason || null,
    lastStatusNote: zone.lastStatusNote || null
  };
}

export function normalizeLocationState(state) {
  const current = state?.locationState || {};
  const zones = {};

  ZONE_ORDER.forEach((zoneName, index) => {
    const zoneId = index + 1;
    const rawZone =
      (current?.zones && current.zones[zoneId]) ||
      (current?.zones && current.zones[String(zoneId)]) ||
      null;
    zones[zoneId] = normalizeZone(rawZone || {}, zoneId, zoneName);
  });

  return {
    ...state,
    locationState: {
      zones,
      lastTickNight:
        typeof current.lastTickNight === 'number' ? Math.max(1, current.lastTickNight) : null
    }
  };
}

export function resetLocationStateForNight(state) {
  if (!state) return;
  state.locationState = createLocationState();
}

export function getLocationZoneState(state, zoneId, zoneName = null) {
  if (!state?.locationState?.zones) return null;
  const id = Number(zoneId);
  if (!id) return null;

  if (!state.locationState.zones[id]) {
    state.locationState.zones[id] = createZoneState(id, zoneName || `Zone ${id}`);
  }

  if (zoneName && !state.locationState.zones[id].zoneName) {
    state.locationState.zones[id].zoneName = zoneName;
  }

  return state.locationState.zones[id];
}

export function setLocationModifier(state, zoneId, modifierKey, turns = 1) {
  const zone = getLocationZoneState(state, zoneId);
  if (!zone || !modifierKey) return;
  zone.temporaryModifiers[modifierKey] = Math.max(1, Number(turns) || 1);
}

export function tickLocationState(state) {
  if (!state?.locationState?.zones) return;

  Object.values(state.locationState.zones).forEach((zone) => {
    if (!zone || typeof zone !== 'object') return;

    const nextModifiers = {};
    Object.entries(zone.temporaryModifiers || {}).forEach(([key, value]) => {
      const next = normalizeCounter(value) - 1;
      if (next > 0) {
        nextModifiers[key] = next;
      }
    });
    zone.temporaryModifiers = nextModifiers;

    const nextCooldowns = {};
    Object.entries(zone.cooldowns || {}).forEach(([key, value]) => {
      const next = normalizeCounter(value) - 1;
      if (next > 0) {
        nextCooldowns[key] = next;
      }
    });
    zone.cooldowns = nextCooldowns;

    if (!zone.pendingIssue && zone.followupPressure > 0) {
      zone.followupPressure = Math.max(0, zone.followupPressure - 1);
    }
  });
}

export function listActiveLocationModifiers(state, zoneId) {
  const zone = getLocationZoneState(state, zoneId);
  if (!zone) return [];
  return Object.entries(zone.temporaryModifiers || {})
    .filter(([, turns]) => normalizeCounter(turns) > 0)
    .map(([key, turns]) => ({ key, turns: normalizeCounter(turns) }));
}
