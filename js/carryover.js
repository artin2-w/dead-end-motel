function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeCarryoverItem(item = {}) {
  return {
    type: item.type || 'general-pressure',
    severity: clamp(Number(item.severity || 1), 1, 5),
    sourceNight: Math.max(1, Number(item.sourceNight || 1)),
    title: item.title || 'Lingering Pressure',
    description: item.description || '',
    temporary: item.temporary !== false,
    applied: Boolean(item.applied),
    appliedNight: item.appliedNight == null ? null : Math.max(1, Number(item.appliedNight || 1)),
    modifierPayload:
      item.modifierPayload && typeof item.modifierPayload === 'object'
        ? { ...item.modifierPayload }
        : {}
  };
}

export function normalizeCarryoverState(state) {
  return {
    ...state,
    carryover: asArray(state?.carryover).map((item) => normalizeCarryoverItem(item)),
    carryoverBriefing: asArray(state?.carryoverBriefing).slice(0, 6),
    narrativeBias:
      state?.narrativeBias && typeof state.narrativeBias === 'object'
        ? { ...state.narrativeBias }
        : {
            anomalyChanceBonus: 0,
            eventTriggerBonus: 0,
            riskBonus: 0,
            chainBonus: 0,
            powerScanPenalty: 0,
            investigationPenalty: 0,
            openingReputationDelta: 0,
            openingPressureNote: null
          }
  };
}

function hasCarryoverType(carryover = [], type) {
  return carryover.some((item) => item?.type === type && !item?.applied);
}

function pushCarryover(next, item) {
  if (hasCarryoverType(next, item.type)) return;
  next.push(normalizeCarryoverItem(item));
}

export function analyzeNightCarryover(state, night = 1) {
  const next = asArray(state?.carryover).map((item) => normalizeCarryoverItem(item));
  const stats = state?.shiftStats || {};
  const unresolved = Number(stats.unresolvedLocationScenes || 0);
  const policyOverrides = Number(stats.policyBroken || 0) + Number(stats.policyOverrides || 0);
  const evictions = Number(stats.evictions || 0) + Number(stats.recurringGuestsMissed || 0);
  const cleanHandling = Number(stats.cleanResponses || 0) + Number(stats.sceneResolved || 0);
  const tacticalOveruse =
    Number(stats.powerHeavyResponses || 0) +
    Number(stats.majorPowerIncidents || 0) +
    Number(stats.forcedCompromises || 0);
  const criticalRooms = (state?.rooms || []).filter((room) => room?.condition === 'Critical').length;

  if (unresolved >= 2) {
    pushCarryover(next, {
      type: 'unresolved-location-issues',
      severity: clamp(1 + Math.floor(unresolved / 2), 1, 4),
      sourceNight: night,
      title: 'Lingering Location Instability',
      description: 'Unresolved camera/location issues are likely to resurface next shift.',
      temporary: true,
      applied: false,
      modifierPayload: {
        anomalyChanceBonus: 0.08,
        eventTriggerBonus: 0.04,
        zonePressureTag: 'location-instability'
      }
    });
  }

  if (policyOverrides >= 2) {
    pushCarryover(next, {
      type: 'management-distrust',
      severity: clamp(1 + Math.floor(policyOverrides / 2), 1, 4),
      sourceNight: night,
      title: 'Management Compliance Watch',
      description: 'Repeated policy overrides increased management distrust pressure.',
      temporary: true,
      applied: false,
      modifierPayload: {
        riskBonus: 1,
        openingReputationDelta: -1,
        openingPressureNote: 'Management is watching policy compliance more closely.'
      }
    });
  }

  if (evictions >= 2) {
    pushCarryover(next, {
      type: 'reputation-softness',
      severity: 2,
      sourceNight: night,
      title: 'Guest Trust Softness',
      description: 'Heavy removals made incoming guest trust less stable.',
      temporary: true,
      applied: false,
      modifierPayload: {
        eventTriggerBonus: 0.03,
        openingReputationDelta: -1
      }
    });
  }

  if (cleanHandling >= 3 && unresolved === 0) {
    pushCarryover(next, {
      type: 'stable-opening-bonus',
      severity: 1,
      sourceNight: night,
      title: 'Calm Opening Expected',
      description: 'Strong containment and clean handling should reduce opening pressure.',
      temporary: true,
      applied: false,
      modifierPayload: {
        eventTriggerBonus: -0.04,
        anomalyChanceBonus: -0.05,
        openingReputationDelta: 1,
        openingPressureNote: 'Calm opening expected after stable handling.'
      }
    });
  }

  if (criticalRooms >= 2) {
    pushCarryover(next, {
      type: 'critical-room-tension',
      severity: clamp(criticalRooms - 1, 1, 4),
      sourceNight: night,
      title: 'Critical Room Tension',
      description: 'Repeated critical rooms left lingering tactical pressure.',
      temporary: true,
      applied: false,
      modifierPayload: {
        chainBonus: 1,
        investigationPenalty: 0.04,
        openingPressureNote: 'Lingering tension in previously unstable rooms.'
      }
    });
  }

  if (tacticalOveruse >= 3) {
    pushCarryover(next, {
      type: 'power-instability-risk',
      severity: 2,
      sourceNight: night,
      title: 'Generator Strain Risk',
      description: 'Emergency reroutes and heavy tactical load increased grid instability risk.',
      temporary: true,
      applied: false,
      modifierPayload: {
        powerScanPenalty: 1,
        eventTriggerBonus: 0.03,
        openingPressureNote: 'Generator strain risk increased.'
      }
    });
  }

  state.carryover = next;
  return next;
}

export function applyCarryoverForNight(state, night = 1, options = {}) {
  const targetNight = Math.max(1, Number(night || 1));
  const allowReplay = Boolean(options?.allowReplay);
  const appliedNotes = [];
  const bias = {
    anomalyChanceBonus: 0,
    eventTriggerBonus: 0,
    riskBonus: 0,
    chainBonus: 0,
    powerScanPenalty: 0,
    investigationPenalty: 0,
    openingReputationDelta: 0,
    openingPressureNote: null
  };

  asArray(state?.carryover).forEach((item) => {
    const normalized = normalizeCarryoverItem(item);
    const alreadyAppliedThisNight = normalized.appliedNight === targetNight;
    const shouldApply = !normalized.applied || (allowReplay && alreadyAppliedThisNight);
    if (!shouldApply) return;

    const payload = normalized.modifierPayload || {};
    bias.anomalyChanceBonus += Number(payload.anomalyChanceBonus || 0);
    bias.eventTriggerBonus += Number(payload.eventTriggerBonus || 0);
    bias.riskBonus += Number(payload.riskBonus || 0);
    bias.chainBonus += Number(payload.chainBonus || 0);
    bias.powerScanPenalty += Number(payload.powerScanPenalty || 0);
    bias.investigationPenalty += Number(payload.investigationPenalty || 0);
    bias.openingReputationDelta += Number(payload.openingReputationDelta || 0);
    if (!bias.openingPressureNote && payload.openingPressureNote) {
      bias.openingPressureNote = payload.openingPressureNote;
    }

    if (!allowReplay || !alreadyAppliedThisNight) {
      normalized.applied = true;
      normalized.appliedNight = targetNight;
      Object.assign(item, normalized);
    }
    appliedNotes.push(normalized.title);
  });

  state.narrativeBias = bias;
  if (bias.openingReputationDelta !== 0) {
    state.reputation = Math.max(0, Number(state.reputation || 0) + bias.openingReputationDelta);
  }
  return {
    bias,
    appliedNotes: appliedNotes.slice(0, 4)
  };
}

export function clearTemporaryCarryover(state) {
  state.carryover = asArray(state?.carryover).filter((item) => {
    const normalized = normalizeCarryoverItem(item);
    return !(normalized.temporary && normalized.applied);
  });
}

export function buildIncomingNightNotes(state, nextNight = 1) {
  const notes = [];
  const pending = asArray(state?.carryover)
    .map((item) => normalizeCarryoverItem(item))
    .filter((item) => !item.applied || item.appliedNight !== Number(nextNight));

  pending.slice(0, 4).forEach((item) => {
    notes.push({
      title: item.title,
      note: item.description,
      severity: item.severity,
      kind: item.severity >= 3 ? 'warning' : 'note'
    });
  });

  return notes;
}

export function resetCarryoverMemory(state) {
  state.carryover = [];
  state.carryoverBriefing = [];
  state.narrativeBias = {
    anomalyChanceBonus: 0,
    eventTriggerBonus: 0,
    riskBonus: 0,
    chainBonus: 0,
    powerScanPenalty: 0,
    investigationPenalty: 0,
    openingReputationDelta: 0,
    openingPressureNote: null
  };
}
