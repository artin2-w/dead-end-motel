const MAX_QUEUE = 4;

function makeId(prefix = 'dc') {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

function toInt(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.round(parsed) : fallback;
}

function clampTicks(value) {
  return Math.max(1, Math.min(6, toInt(value, 2)));
}

function pickZoneHint(room, contextTag = '') {
  if (room?.label) return room.label;
  const tag = String(contextTag || '').toLowerCase();
  if (tag.includes('vehicle') || tag.includes('parking')) return 'Parking Lot';
  if (tag.includes('maintenance')) return 'Laundry Access';
  if (tag.includes('service') || tag.includes('rear')) return 'Rear Exit';
  if (tag.includes('hall')) return 'Hallway';
  return 'Lobby Edge';
}

function buildConsequenceTemplate({ guest, action, room, policyResult }) {
  const risk = String(guest?.riskLevel || 'Low');
  const archetype = String(guest?.archetypeKey || '');
  const deception = Number(guest?.deceptionSignal || 0);
  const instability = Number(guest?.instabilitySignal || 0);
  const urgency = Number(guest?.urgencySignal || 0);
  const profile = guest?.delayedRiskProfile || {};
  const contextTag = String(guest?.contextTag || guest?.contextClue || '').toLowerCase();
  const zoneLabel = pickZoneHint(room, contextTag);
  const roomId = room?.id ?? null;

  const riskyApproval =
    action === 'checkin' &&
    (risk === 'High' || deception >= 2 || instability >= 2 || Number(profile?.approval || 0) >= 2);

  const manipulativeRejection =
    action === 'reject' && (archetype.includes('manipulative') || deception >= 2 || urgency >= 2);

  const stabilizingFlag =
    action === 'flag' &&
    (risk === 'Medium' || risk === 'High' || deception >= 1 || instability >= 1 || policyResult === 'followed');

  if (riskyApproval) {
    return {
      type: 'room-disturbance-thread',
      ticksRemaining: 2,
      zoneLabel,
      roomId,
      logLine: `${guest.name}'s check-in read starts a thread near ${zoneLabel}. The mood around that area is tightening.`,
      alert: `Thread pressure rising near ${zoneLabel}. Earlier desk judgment may be involved.`,
      reputationDelta: -1,
      chainSeverity: 1,
      statKey: 'deskConsequencesTriggered',
      teachLine: 'Readback: confident approval on a deceptive profile increased delayed pressure.'
    };
  }

  if (manipulativeRejection) {
    return {
      type: 'public-callback-thread',
      ticksRemaining: 2,
      zoneLabel: 'Parking Lot',
      roomId: null,
      logLine: `${guest.name} lingers outside and starts drawing attention in the Parking Lot after rejection.`,
      alert: 'A rejected guest is still nearby. Parking lot attention is climbing.',
      reputationDelta: -1,
      chainSeverity: 0,
      statKey: 'deskConsequencesTriggered',
      teachLine: 'Readback: rejecting manipulative guests can be safe, but often causes outside pressure.'
    };
  }

  if (stabilizingFlag) {
    return {
      type: 'monitoring-payoff-thread',
      ticksRemaining: 2,
      zoneLabel,
      roomId,
      logLine: `Monitoring note: the ${zoneLabel} thread cooled because ${guest.name} was flagged early.`,
      alert: `Flag watch paid off near ${zoneLabel}. Escalation was softened.`,
      reputationDelta: 0,
      chainSeverity: -1,
      statKey: 'deskConsequencesPrevented',
      teachLine: 'Readback: flagging uncertain behavior reduced delayed escalation.'
    };
  }

  return null;
}

export function normalizeDeskConsequenceState(state) {
  if (!state || typeof state !== 'object') return state;
  const existing = state.deskConsequences || {};
  state.deskConsequences = {
    queue: Array.isArray(existing.queue)
      ? existing.queue
          .filter((entry) => entry && typeof entry === 'object')
          .map((entry) => ({
            ...entry,
            ticksRemaining: clampTicks(entry.ticksRemaining),
            id: String(entry.id || makeId('dc-norm')),
            key: String(entry.key || entry.id || makeId('dc-key'))
          }))
      : [],
    historyKeys: Array.isArray(existing.historyKeys)
      ? existing.historyKeys.slice(-20).map((entry) => String(entry))
      : [],
    threadFlags: {
      suspiciousVehicleSeen: Boolean(existing?.threadFlags?.suspiciousVehicleSeen),
      strangeKnockNoted: Boolean(existing?.threadFlags?.strangeKnockNoted),
      fakeMaintenanceHint: Boolean(existing?.threadFlags?.fakeMaintenanceHint)
    }
  };
  return state;
}

export function queueDeskConsequence(state, payload = {}) {
  normalizeDeskConsequenceState(state);
  const queue = state?.deskConsequences?.queue || [];
  const history = state?.deskConsequences?.historyKeys || [];
  if (queue.length >= MAX_QUEUE) return { queued: false, reason: 'queue-cap' };

  const key = String(payload.key || payload.id || makeId('dc-key'));
  if (queue.some((entry) => entry.key === key) || history.includes(key)) {
    return { queued: false, reason: 'duplicate' };
  }

  queue.push({
    id: String(payload.id || makeId('dc')),
    key,
    type: String(payload.type || 'generic-thread'),
    ticksRemaining: clampTicks(payload.ticksRemaining),
    zoneLabel: String(payload.zoneLabel || 'Lobby Edge'),
    roomId: payload.roomId ?? null,
    logLine: String(payload.logLine || 'A desk decision creates follow-up pressure.'),
    alert: String(payload.alert || 'A delayed desk consequence just surfaced.'),
    reputationDelta: toInt(payload.reputationDelta, 0),
    chainSeverity: toInt(payload.chainSeverity, 0),
    statKey: String(payload.statKey || 'deskConsequencesTriggered'),
    teachLine: String(payload.teachLine || '')
  });

  return { queued: true, key };
}

export function queueDeskFollowupForDecision(state, { guest, action, room = null, policyResult = 'neutral' } = {}) {
  if (!state || !guest || !action) return { queued: false, reason: 'missing-input' };
  normalizeDeskConsequenceState(state);

  const template = buildConsequenceTemplate({ guest, action, room, policyResult });
  if (!template) return { queued: false, reason: 'no-template' };

  const key = `${action}-${guest.id || guest.name}-${template.type}-${state.night || 1}`;
  const primary = queueDeskConsequence(state, { ...template, key });

  if (!primary.queued) return primary;

  const flags = state.deskConsequences.threadFlags;
  if (template.type === 'public-callback-thread') {
    flags.suspiciousVehicleSeen = true;
  }
  if (template.type === 'room-disturbance-thread' && Math.random() < 0.28) {
    flags.strangeKnockNoted = true;
  }
  if (String(guest?.contextTag || '').toLowerCase().includes('maintenance') && Math.random() < 0.32) {
    flags.fakeMaintenanceHint = true;
  }

  const rareMomentChance = Math.random();
  if (rareMomentChance < 0.06 && state.deskConsequences.queue.length < MAX_QUEUE) {
    queueDeskConsequence(state, {
      key: `${key}-rare`,
      type: 'rare-moment-thread',
      ticksRemaining: 3,
      zoneLabel: flags.suspiciousVehicleSeen ? 'Parking Lot' : 'Rear Exit',
      logLine: 'Rare moment: the same figure appears on two separate camera angles, then vanishes from both.',
      alert: 'Something repeated in motel surveillance and did not add up.',
      reputationDelta: 0,
      chainSeverity: 1,
      statKey: 'deskRareMoments',
      teachLine: 'Rare thread surfaced: watch for repeating patterns across zones.'
    });
  }

  return primary;
}

export function tickDeskConsequences(state) {
  normalizeDeskConsequenceState(state);
  const queue = state?.deskConsequences?.queue || [];
  const history = state?.deskConsequences?.historyKeys || [];
  if (!queue.length) return { triggered: [] };

  queue.forEach((entry) => {
    entry.ticksRemaining = clampTicks(entry.ticksRemaining - 1);
  });

  const ready = queue.filter((entry) => Number(entry.ticksRemaining || 0) <= 1).slice(0, 1);
  if (!ready.length) return { triggered: [] };

  const triggerIds = new Set(ready.map((entry) => entry.id));
  state.deskConsequences.queue = queue.filter((entry) => !triggerIds.has(entry.id));

  ready.forEach((entry) => {
    history.push(entry.key);
  });
  state.deskConsequences.historyKeys = history.slice(-20);

  return {
    triggered: ready
  };
}