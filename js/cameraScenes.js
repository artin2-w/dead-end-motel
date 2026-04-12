import { getLowPowerStage } from './powerEconomy.js';
import {
  getLocationZoneState,
  listActiveLocationModifiers,
  setLocationModifier
} from './locationState.js';

const STAGE_BY_SEVERITY = {
  low: 1,
  medium: 2,
  high: 3
};

const STAGE_SEVERITY = {
  1: 'low',
  2: 'medium',
  3: 'high'
};

const MODIFIER_META = {
  floodlightsActive: { label: 'Floodlights Active', suppress: 0.23 },
  lobbyLocked: { label: 'Lobby Locked', suppress: 0.2 },
  hallwayPatrol: { label: 'Hallway Patrol', suppress: 0.16 },
  serviceAccessSealed: { label: 'Service Access Sealed', suppress: 0.18 },
  utilityIsolated: { label: 'Utility Isolated', suppress: 0.14 },
  rearExitBarred: { label: 'Rear Exit Barred', suppress: 0.2 },
  policeSweepActive: { label: 'Police Sweep Active', suppress: 0.24 },
  staffSweepActive: { label: 'Staff Sweep Active', suppress: 0.12 }
};

const SCENE_DEFS = {
  Lobby: {
    stages: [
      {
        label: 'Shadow Figure Near Entrance',
        status: 'Shadow Figure',
        severity: 'low',
        pressure: 1,
        flavor: 'A silhouette lingers near reception and then slips past frame.'
      },
      {
        label: 'Suspicious Entry Pressure',
        status: 'Movement Detected',
        severity: 'medium',
        pressure: 2,
        flavor: 'Repeated movement presses against the front doors and glass.'
      },
      {
        label: 'Front Desk Security Concern',
        status: 'Door Ajar',
        severity: 'high',
        pressure: 3,
        flavor: 'Entry control is unstable. Front desk exposure is increasing.'
      }
    ],
    actions: [
      {
        id: 'lobby-check-entrance',
        label: 'Check Entrance Feed',
        hint: 'Low draw verification. Better as an early read than hard containment.',
        powerCost: 2,
        successBias: 0.62,
        strength: 'weak'
      },
      {
        id: 'lobby-brighten',
        label: 'Flood Lobby Lighting',
        hint: 'High visibility control. Effective but power heavy.',
        powerCost: 5,
        successBias: 0.75,
        lowPowerRestricted: true,
        strength: 'strong',
        modifierKey: 'lobbyLocked',
        modifierTurns: 3
      },
      {
        id: 'lobby-intercom',
        label: 'Intercom Warning',
        hint: 'Cheap pressure release. May not hold for long.',
        powerCost: 2,
        successBias: 0.57,
        strength: 'weak'
      },
      {
        id: 'lobby-lock-front',
        label: 'Lock Front Access',
        hint: 'Strong containment with minor reputation risk.',
        powerCost: 3,
        successBias: 0.67,
        reputationDelta: -1,
        strength: 'strong',
        modifierKey: 'lobbyLocked',
        modifierTurns: 2
      }
    ]
  },
  'Parking Lot': {
    stages: [
      {
        label: 'Lot Static Disturbance',
        status: 'Static',
        severity: 'low',
        pressure: 1,
        flavor: 'Camera noise rolls over parked vehicles in short bursts.'
      },
      {
        label: 'Vehicle-Line Movement',
        status: 'Movement Detected',
        severity: 'medium',
        pressure: 2,
        flavor: 'Movement keeps shifting between rows without a clear source.'
      },
      {
        label: 'Prowler / Vehicle Threat',
        status: 'Blocked',
        severity: 'high',
        pressure: 3,
        flavor: 'Blind spots are being used aggressively around occupied cars.'
      }
    ],
    actions: [
      {
        id: 'parking-floodlight',
        label: 'Trigger Floodlights',
        hint: 'Best lot control. High power draw.',
        powerCost: 6,
        successBias: 0.76,
        lowPowerRestricted: true,
        strength: 'strong',
        modifierKey: 'floodlightsActive',
        modifierTurns: 3
      },
      {
        id: 'parking-warning',
        label: 'Broadcast Lot Warning',
        hint: 'Budget deterrence. Moderate reliability.',
        powerCost: 3,
        successBias: 0.59,
        strength: 'medium'
      },
      {
        id: 'parking-staff',
        label: 'Send Staff Sweep',
        hint: 'Mid-cost patrol. Can calm pressure if it lands cleanly.',
        powerCost: 2,
        moneyCost: 3,
        successBias: 0.56,
        strength: 'medium',
        modifierKey: 'staffSweepActive',
        modifierTurns: 2
      },
      {
        id: 'parking-police',
        label: 'Call Police Sweep',
        hint: 'Strongest containment. Expensive and reputation-sensitive.',
        powerCost: 2,
        moneyCost: 10,
        successBias: 0.8,
        reputationDelta: -1,
        strength: 'strong',
        modifierKey: 'policeSweepActive',
        modifierTurns: 3
      }
    ]
  },
  Hallway: {
    stages: [
      {
        label: 'Hallway Irregular Noise',
        status: 'Movement Detected',
        severity: 'low',
        pressure: 1,
        flavor: 'Door-side shadows and audio spikes keep desyncing.'
      },
      {
        label: 'Room-Side Disturbance',
        status: 'Door Ajar',
        severity: 'medium',
        pressure: 2,
        flavor: 'Doors and handles show repeated contact along occupied rooms.'
      },
      {
        label: 'Violent Hallway Pressure',
        status: 'Blocked',
        severity: 'high',
        pressure: 3,
        flavor: 'Line-of-sight and corridor control are breaking down quickly.'
      }
    ],
    actions: [
      {
        id: 'hallway-isolate',
        label: 'Isolate Corridor',
        hint: 'Hard reset for hallway access. Strong but expensive.',
        powerCost: 5,
        successBias: 0.72,
        lowPowerRestricted: true,
        strength: 'strong',
        modifierKey: 'hallwayPatrol',
        modifierTurns: 3
      },
      {
        id: 'hallway-knock',
        label: 'Remote Door Check',
        hint: 'Quick pressure probe. Risky under heavy escalation.',
        powerCost: 2,
        successBias: 0.57,
        strength: 'weak'
      },
      {
        id: 'hallway-dispatch',
        label: 'Dispatch Staff Patrol',
        hint: 'Medium containment with moderate cost and variance.',
        powerCost: 2,
        moneyCost: 4,
        successBias: 0.58,
        strength: 'medium',
        modifierKey: 'hallwayPatrol',
        modifierTurns: 2
      },
      {
        id: 'hallway-lock',
        label: 'Lock Hall Segment',
        hint: 'Strong short-term control, mild reputation tradeoff.',
        powerCost: 3,
        successBias: 0.66,
        reputationDelta: -1,
        strength: 'strong',
        modifierKey: 'hallwayPatrol',
        modifierTurns: 2
      }
    ]
  },
  Laundry: {
    stages: [
      {
        label: 'Laundry Feed Static',
        status: 'Static',
        severity: 'low',
        pressure: 1,
        flavor: 'Utility corridor static pulses around service access.'
      },
      {
        label: 'Utility Irregularity',
        status: 'Movement Detected',
        severity: 'medium',
        pressure: 2,
        flavor: 'Load spikes and access movement overlap in the utility lane.'
      },
      {
        label: 'Overload / Service Breach Risk',
        status: 'Blocked',
        severity: 'high',
        pressure: 3,
        flavor: 'Service-side control is compromised and affecting nearby systems.'
      }
    ],
    actions: [
      {
        id: 'laundry-inspect',
        label: 'Inspect Utility Feed',
        hint: 'Cheap diagnostic pass. May only delay follow-up.',
        powerCost: 2,
        successBias: 0.58,
        strength: 'weak'
      },
      {
        id: 'laundry-cut',
        label: 'Isolate Utility Circuit',
        hint: 'Strong control but can increase later instability.',
        powerCost: 5,
        successBias: 0.7,
        lowPowerRestricted: true,
        strength: 'strong',
        modifierKey: 'utilityIsolated',
        modifierTurns: 3,
        instabilityRisk: 1
      },
      {
        id: 'laundry-seal',
        label: 'Seal Service Access',
        hint: 'Reduces repeat entry routes.',
        powerCost: 3,
        successBias: 0.64,
        strength: 'strong',
        modifierKey: 'serviceAccessSealed',
        modifierTurns: 3
      },
      {
        id: 'laundry-maint',
        label: 'Send Maintenance',
        hint: 'Cheaper than police, weaker under high pressure.',
        powerCost: 2,
        moneyCost: 5,
        successBias: 0.56,
        strength: 'medium',
        modifierKey: 'staffSweepActive',
        modifierTurns: 2
      }
    ]
  },
  'Ice Machine': {
    stages: [
      {
        label: 'Side Corridor Disturbance',
        status: 'Blocked',
        severity: 'low',
        pressure: 1,
        flavor: 'Access visibility around the ice alcove drops in short bursts.'
      },
      {
        label: 'Tampering / Leak Suspicion',
        status: 'Door Ajar',
        severity: 'medium',
        pressure: 2,
        flavor: 'Side door and machine feed suggest repeated tampering.'
      },
      {
        label: 'Maintenance Liability Risk',
        status: 'Movement Detected',
        severity: 'high',
        pressure: 3,
        flavor: 'Potential property damage risk is now linked to this corridor.'
      }
    ],
    actions: [
      {
        id: 'ice-inspect',
        label: 'Inspect Side Door',
        hint: 'Low-cost check. Good for early-stage verification.',
        powerCost: 2,
        successBias: 0.6,
        strength: 'weak'
      },
      {
        id: 'ice-brighten',
        label: 'Brighten Corridor',
        hint: 'Strong visual suppression with extra draw.',
        powerCost: 4,
        successBias: 0.71,
        lowPowerRestricted: true,
        strength: 'strong',
        modifierKey: 'floodlightsActive',
        modifierTurns: 2
      },
      {
        id: 'ice-restrict',
        label: 'Restrict Access',
        hint: 'Containment option with slight guest-facing downside.',
        powerCost: 3,
        successBias: 0.64,
        reputationDelta: -1,
        strength: 'strong',
        modifierKey: 'serviceAccessSealed',
        modifierTurns: 2
      },
      {
        id: 'ice-dispatch',
        label: 'Dispatch Staff',
        hint: 'Balanced response, moderate reliability.',
        powerCost: 2,
        moneyCost: 3,
        successBias: 0.57,
        strength: 'medium',
        modifierKey: 'staffSweepActive',
        modifierTurns: 2
      }
    ]
  },
  'Rear Exit': {
    stages: [
      {
        label: 'Rear Exit Irregular Activity',
        status: 'Door Ajar',
        severity: 'low',
        pressure: 1,
        flavor: 'Rear door telemetry keeps toggling between closed and open.'
      },
      {
        label: 'Forced Exit Pressure',
        status: 'Movement Detected',
        severity: 'medium',
        pressure: 2,
        flavor: 'Service lane traffic suggests repeated route testing.'
      },
      {
        label: 'Breach / Escape Route Risk',
        status: 'Blocked',
        severity: 'high',
        pressure: 3,
        flavor: 'Rear containment is failing and route control is degrading.'
      }
    ],
    actions: [
      {
        id: 'rear-lock',
        label: 'Bar Rear Exit',
        hint: 'Strong containment. Reputation may dip if used repeatedly.',
        powerCost: 3,
        successBias: 0.69,
        reputationDelta: -1,
        strength: 'strong',
        modifierKey: 'rearExitBarred',
        modifierTurns: 3
      },
      {
        id: 'rear-warning',
        label: 'Trigger Rear Warning',
        hint: 'Fast deterrent with moderate success rate.',
        powerCost: 3,
        successBias: 0.59,
        strength: 'medium'
      },
      {
        id: 'rear-inspect',
        label: 'Inspect Access Feed',
        hint: 'Low-cost check but weaker under high pressure.',
        powerCost: 2,
        successBias: 0.57,
        strength: 'weak'
      },
      {
        id: 'rear-police',
        label: 'Police Response',
        hint: 'High containment confidence with money/reputation tradeoff.',
        powerCost: 2,
        moneyCost: 10,
        successBias: 0.8,
        reputationDelta: -2,
        strength: 'strong',
        modifierKey: 'policeSweepActive',
        modifierTurns: 3
      }
    ]
  }
};

const TIER_LABELS = {
  none: 'No active containment',
  temporary: 'Temporary deterrence',
  partial: 'Partial stabilization',
  durable: 'Durable containment',
  'root-lockout': 'Root-cause lockout'
};

const STATUS_LABELS = {
  clear: 'Clear',
  'temporarily-deterred': 'Temporarily deterred',
  'under-watch': 'Under watch',
  stabilized: 'Stabilized',
  'unresolved-pressure': 'Unresolved pressure',
  escalating: 'Escalating',
  relapsed: 'Relapsed'
};

function clamp01(value) {
  return Math.max(0, Math.min(1, Number(value) || 0));
}

function clampStage(stage) {
  return Math.max(1, Math.min(3, Number(stage) || 1));
}

/** Matches merge relapse “breakthrough” — allows fresh hits despite durable windows. */
export function isExtraordinaryZoneBreak(zoneState) {
  if (!zoneState) return false;
  const pressure = Math.max(0, Number(zoneState.followupPressure || 0));
  const unresolved = Math.max(0, Number(zoneState.unresolvedCount || 0));
  const stage = clampStage(zoneState.issueStage || 1);
  return pressure >= 6 || unresolved >= 3 || stage >= 3;
}

/** Durable/root-lockout + protected scans: block random fresh anomaly unless escalation break. */
export function shouldHardSkipZoneForFreshAnomaly(state, cameraId) {
  if (!state) return false;
  const zoneState = getLocationZoneState(state, cameraId);
  if (!zoneState) return false;
  const tier = String(zoneState.containmentTier || 'none');
  if (tier !== 'durable' && tier !== 'root-lockout') return false;
  if (Math.max(0, Number(zoneState.protectedScansRemaining || 0)) <= 0) return false;
  if (isExtraordinaryZoneBreak(zoneState)) return false;
  return true;
}

/** Partial/temporary: reduce selection weight (not a hard block). */
export function getFreshScanZoneWeightMultiplier(state, cameraId) {
  if (!state) return 1;
  const zoneState = getLocationZoneState(state, cameraId);
  if (!zoneState) return 1;
  const tier = String(zoneState.containmentTier || 'none');
  if (tier !== 'temporary' && tier !== 'partial') return 1;
  const base = tier === 'temporary' ? 0.26 : 0.4;
  const sup = clamp01(zoneState.recurrenceSuppression || 0);
  const mult = base * Math.max(0.08, 1 - sup * 0.72);
  return Math.max(0.04, mult);
}

function getDurabilityProfile(action, outcomeKey, stageInfo) {
  const strength = action?.strength || 'medium';

  if (outcomeKey === 'resolved') {
    if (strength === 'strong' && Number(stageInfo?.stage || 1) <= 1) {
      return {
        tier: 'root-lockout',
        status: 'stabilized',
        protectedScans: 5,
        stabilityScans: 6,
        recurrenceSuppression: 0.68,
        reappearCooldown: 3,
        note: 'Root cause appears contained. This zone should hold unless a major escalation breaks through.',
        guidance: 'Full lockout established. Near-term same-zone recurrence should be rare.'
      };
    }

    if (strength === 'strong') {
      return {
        tier: 'durable',
        status: 'stabilized',
        protectedScans: 4,
        stabilityScans: 5,
        recurrenceSuppression: 0.52,
        reappearCooldown: 2,
        note: 'Durable containment applied. This zone has a protected stability window.',
        guidance: 'Durable containment established. Recurrence chance is heavily suppressed for several scans.'
      };
    }

    if (strength === 'weak') {
      return {
        tier: 'temporary',
        status: 'temporarily-deterred',
        protectedScans: 0,
        stabilityScans: 2,
        recurrenceSuppression: 0.14,
        reappearCooldown: 0,
        note: 'Temporary deterrence only. Pressure can return quickly if root causes remain.',
        guidance: 'Temporary deterrence only. Monitor this zone closely for relapse.'
      };
    }

    return {
      tier: 'partial',
      status: 'under-watch',
      protectedScans: 2,
      stabilityScans: 3,
      recurrenceSuppression: 0.3,
      reappearCooldown: 1,
      note: 'Partial stabilization achieved. Risk is reduced but not eliminated.',
      guidance: 'Partial stabilization achieved. Recurrence is reduced, not removed.'
    };
  }

  if (outcomeKey === 'falseAlarm') {
    return {
      tier: strength === 'strong' ? 'partial' : 'temporary',
      status: 'under-watch',
      protectedScans: strength === 'strong' ? 2 : 0,
      stabilityScans: strength === 'strong' ? 2 : 1,
      recurrenceSuppression: strength === 'strong' ? 0.22 : 0.11,
      reappearCooldown: 1,
      note: 'Low-confidence containment. Immediate threat dropped, but zone should remain under watch.',
      guidance: 'Containment confidence is limited. Re-scan this zone soon.'
    };
  }

  if (outcomeKey === 'moved') {
    return {
      tier: 'temporary',
      status: 'unresolved-pressure',
      protectedScans: 0,
      stabilityScans: 0,
      recurrenceSuppression: 0.06,
      reappearCooldown: 0,
      note: 'Pressure shifted rather than resolved. Root risk remains active in this zone.',
      guidance: 'Containment was temporary. Use a stronger follow-up to secure this zone.'
    };
  }

  return {
    tier: 'none',
    status: 'escalating',
    protectedScans: 0,
    stabilityScans: 0,
    recurrenceSuppression: 0,
    reappearCooldown: 0,
    note: 'Containment failed. Zone is actively escalating.',
    guidance: 'Escalation active. Immediate stronger containment is recommended.'
  };
}

function applyDurabilityProfile(zoneState, profile) {
  if (!zoneState || !profile) return;
  zoneState.containmentTier = profile.tier;
  zoneState.stabilityStatus = profile.status;
  zoneState.protectedScansRemaining = Math.max(0, Number(profile.protectedScans || 0));
  zoneState.stabilityScansRemaining = Math.max(0, Number(profile.stabilityScans || 0));
  zoneState.recurrenceSuppression = clamp01(profile.recurrenceSuppression || 0);
  zoneState.lastStatusNote = profile.note || null;
  zoneState.lastRecurrenceReason = null;
  if (!zoneState.cooldowns || typeof zoneState.cooldowns !== 'object') {
    zoneState.cooldowns = {};
  }
  if (Number(profile.reappearCooldown || 0) > 0) {
    zoneState.cooldowns.reappear = Math.max(
      Number(zoneState.cooldowns.reappear || 0),
      Number(profile.reappearCooldown || 0)
    );
  }
}

function getZoneStatusLine(zoneState) {
  const tier = String(zoneState?.containmentTier || 'none');
  const tierLabel = TIER_LABELS[tier] || TIER_LABELS.none;
  const statusLabel = STATUS_LABELS[zoneState?.stabilityStatus] || STATUS_LABELS.clear;
  const protectedScans = Math.max(0, Number(zoneState?.protectedScansRemaining || 0));
  const suppressionPct = Math.round(clamp01(zoneState?.recurrenceSuppression || 0) * 100);
  const fp = Math.max(0, Number(zoneState?.followupPressure || 0));
  const parts = [`Status: ${statusLabel}`, `Containment: ${tierLabel}`];
  if (protectedScans > 0) {
    parts.push(`Protected scans: ${protectedScans}`);
    if (tier === 'durable' || tier === 'root-lockout') {
      parts.push('Fresh sweeps prioritize other feeds until this window ends');
    }
  }
  if (suppressionPct > 0) parts.push(`Recurrence suppression: ${suppressionPct}%`);
  if (fp > 0) {
    parts.push(`Residual pressure: ${fp}/8`);
  }
  if (zoneState?.stabilityStatus === 'relapsed' && zoneState?.lastRecurrenceReason) {
    parts.push(`Last relapse: ${zoneState.lastRecurrenceReason}`);
  }
  return parts.join(' • ');
}

function tickZoneScanStability(zoneState) {
  if (!zoneState) return;
  zoneState.protectedScansRemaining = Math.max(0, Number(zoneState.protectedScansRemaining || 0) - 1);
  zoneState.stabilityScansRemaining = Math.max(0, Number(zoneState.stabilityScansRemaining || 0) - 1);
  const tier = String(zoneState.containmentTier || 'none');
  let decay = 0.03;
  if (tier === 'root-lockout') decay = 0.011;
  else if (tier === 'durable') decay = 0.015;
  else if (tier === 'partial') decay = 0.021;
  else if (tier === 'temporary') decay = 0.026;
  const nextSuppression = clamp01(zoneState.recurrenceSuppression || 0) - decay;
  zoneState.recurrenceSuppression = Math.max(0, Number(nextSuppression.toFixed(2)));

  if ((zoneState.pendingIssue || zoneState.followupPressure > 0 || zoneState.unresolvedCount > 0) && zoneState.stabilityStatus === 'stabilized') {
    zoneState.stabilityStatus = 'under-watch';
  }

  if (!zoneState.pendingIssue && zoneState.followupPressure <= 0 && zoneState.unresolvedCount <= 0 && zoneState.protectedScansRemaining <= 0) {
    if (zoneState.containmentTier !== 'none') {
      zoneState.stabilityStatus = 'clear';
    }
  }
}

function buildFreshZoneScene(zoneName = 'Unknown Zone') {
  return {
    stage: 1,
    stageLabel: 'Initial Irregularity',
    status: 'Movement Detected',
    severity: 'low',
    pressure: 1,
    flavor: `${zoneName} requires closer monitoring.`
  };
}

function stageFromSeverity(severity = 'low') {
  return STAGE_BY_SEVERITY[severity] || 1;
}

function getStageForZone(zoneDef, stage = 1) {
  if (!zoneDef?.stages?.length) return buildFreshZoneScene();
  const clamped = clampStage(stage);
  const pick = zoneDef.stages[clamped - 1] || zoneDef.stages[0];
  return {
    stage: clamped,
    stageLabel: pick.label,
    status: pick.status,
    severity: pick.severity,
    pressure: pick.pressure,
    flavor: pick.flavor
  };
}

function getSuppressionFromModifiers(zoneState) {
  return Object.entries(zoneState?.temporaryModifiers || {}).reduce((sum, [key, turns]) => {
    if ((Number(turns) || 0) <= 0) return sum;
    return sum + Number(MODIFIER_META[key]?.suppress || 0);
  }, 0);
}

function getModifierUiState(state, zoneId) {
  return listActiveLocationModifiers(state, zoneId).map((entry) => ({
    ...entry,
    label: MODIFIER_META[entry.key]?.label || entry.key
  }));
}

function setEventOnCamera(cameras = [], zoneId, status) {
  return cameras.map((camera) =>
    String(camera.id) === String(zoneId)
      ? {
          ...camera,
          status
        }
      : camera
  );
}

function getRunActionCostMultiplierForScene(state) {
  const base = Math.max(0.7, Number(state?.runModifiers?.actionCostMult || 1));
  const pressurePenalty = 1 + (Number(state?.phase2Pressure?.difficultyPulse || 0) * 0.06);
  return Math.max(0.7, base * pressurePenalty);
}

function scaleSceneActionCost(value, state) {
  const numeric = Number(value || 0);
  if (numeric <= 0) return 0;
  return Math.max(1, Math.round(numeric * getRunActionCostMultiplierForScene(state)));
}

export function computeCameraSceneActionCosts(state, action = {}) {
  const night = Math.max(1, Number(state?.night || 1));
  const moneyCostMult = night <= 2 ? 0.9 : night >= 5 ? 1.15 : night >= 4 ? 1.08 : 1;
  const powerCostMult = night <= 2 ? 0.9 : night >= 5 ? 1.15 : night >= 4 ? 1.08 : 1;

  const baseMoney = Math.round(Number(action?.moneyCost || 0) * moneyCostMult);
  const basePower = Math.round(Number(action?.powerCost || 0) * powerCostMult);

  return {
    moneyCost: scaleSceneActionCost(baseMoney, state),
    powerCost: scaleSceneActionCost(basePower, state),
    runActionCostMult: getRunActionCostMultiplierForScene(state)
  };
}

function pickSceneActionState(action, lowPowerStage) {
  const disabled =
    Boolean(action.lowPowerRestricted) &&
    (lowPowerStage === 'critical' || (lowPowerStage === 'low' && (action.powerCost || 0) >= 4));

  const likelyEffect =
    action.strength === 'strong'
      ? 'Strong response: best chance of full containment, highest operational cost.'
      : action.strength === 'weak'
        ? 'Weak response: temporary deterrence only. May reduce pressure but not fully secure the area.'
        : 'Medium response: partial containment likely. Residual risk may remain after response.';

  return {
    ...action,
    disabled,
    likelyEffect,
    disabledReason: disabled ? 'Unavailable: low power limits this response.' : ''
  };
}

function buildReactiveSceneOverlay(state, zoneName = '', stageInfo = {}) {
  const tendencies = state?.doctrine?.tendencies || {};
  const factions = state?.factions || {};
  const activeBeat = state?.activeStoryBeat;
  const history = state?.contentHistory || {};
  const lowPowerStage = getLowPowerStage(state);
  const lines = [];

  if (Number(tendencies.control || 0) >= 6) {
    lines.push('Control-heavy doctrine favors immediate perimeter discipline here.');
  } else if (Number(tendencies.compassion || 0) >= 6) {
    lines.push('Compassion-led handling may reduce collateral backlash in this zone.');
  } else if (Number(tendencies.secrecy || 0) >= 6) {
    lines.push('Quiet handling posture can contain this with less public spillover.');
  }

  if (Number(factions.authorities || 0) >= 4 && (zoneName === 'Lobby' || zoneName === 'Parking Lot')) {
    lines.push('Authority visibility is high; visible mistakes are punished faster.');
  }
  if (Number(factions.locals || 0) <= -4 && (zoneName === 'Parking Lot' || zoneName === 'Rear Exit')) {
    lines.push('Local hostility raises risk of fast outside regrouping.');
  }
  if (Number(factions.guests || 0) <= -4 && zoneName === 'Hallway') {
    lines.push('Guest trust is thin — heavy-handed responses may echo across rooms.');
  }

  if (lowPowerStage === 'critical') {
    lines.push('Critical grid state: this zone is operating with severe response constraints.');
  }

  if (activeBeat?.zone && String(activeBeat.zone) === String(zoneName)) {
    lines.push(`Thread pressure overlap: ${activeBeat.title} is active in this zone.`);
  }

  if (Array.isArray(history.recentLocationZones) && history.recentLocationZones.slice(-4).filter((z) => z === zoneName).length >= 2) {
    lines.push('Repeat zone pressure detected: recent nights show recurring instability here.');
  }

  if (Number(stageInfo?.stage || 1) >= 3) {
    lines.push('Stage-3 pressure: follow-up consequences are likely even on partial success.');
  }

  return lines.slice(0, 2);
}

function getOutcomeKey(roll, successChance) {
  if (roll <= successChance * 0.72) return 'resolved';
  if (roll <= successChance) return 'falseAlarm';
  if (roll <= successChance + 0.16) return 'moved';
  return 'escalated';
}

export function normalizeCameraSceneState(state) {
  const current = state?.cameraScene || {};
  return {
    ...state,
    cameraScene: {
      activeScene: current?.activeScene || null,
      resolvedZones:
        current?.resolvedZones && typeof current.resolvedZones === 'object'
          ? current.resolvedZones
          : {}
    }
  };
}

export function buildFreshCameraSceneState() {
  return {
    activeScene: null,
    resolvedZones: {}
  };
}

export function clearCameraScene(state) {
  if (!state?.cameraScene) return;
  state.cameraScene.activeScene = null;
}

function syncZoneIssueFromEvent(state, event) {
  const zoneDef = SCENE_DEFS[event.cameraName];
  if (!zoneDef) return null;

  const zoneState = getLocationZoneState(state, event.cameraId, event.cameraName);
  if (!zoneState) return null;

  const incomingStage = stageFromSeverity(event.severity || 'low');
  zoneState.issueStage = Math.max(clampStage(zoneState.issueStage || 1), incomingStage);

  const stageInfo = getStageForZone(zoneDef, zoneState.issueStage);
  zoneState.pendingIssue = stageInfo.stageLabel;
  zoneState.lastSeverity = stageInfo.severity;

  return {
    zoneDef,
    zoneState,
    stageInfo
  };
}

export function registerUnresolvedCameraEvents(state) {
  const events = Array.isArray(state?.activeEvents) ? state.activeEvents : [];
  let unresolved = 0;

  events.forEach((event) => {
    const synced = syncZoneIssueFromEvent(state, event);
    if (!synced) return;

    const { zoneState, stageInfo } = synced;
    unresolved += 1;
    zoneState.unresolvedCount = Math.max(0, Number(zoneState.unresolvedCount || 0)) + 1;
    zoneState.ignoreCount = Math.max(0, Number(zoneState.ignoreCount || 0)) + 1;
    zoneState.followupPressure = Math.min(
      7,
      Math.max(0, Number(zoneState.followupPressure || 0)) + stageInfo.pressure
    );

    if (zoneState.unresolvedCount >= 2 || zoneState.followupPressure >= 4) {
      zoneState.issueStage = clampStage((zoneState.issueStage || 1) + 1);
    }

    zoneState.stabilityStatus = zoneState.followupPressure >= 5 ? 'escalating' : 'unresolved-pressure';
    zoneState.lastRecurrenceReason = 'Ongoing unresolved pressure persisted between scans.';
    zoneState.lastStatusNote = zoneState.followupPressure >= 5
      ? 'Zone pressure is escalating because earlier containment did not close the root issue.'
      : 'Zone remains unstable: unresolved pressure is still active.';

    const updatedStage = getStageForZone(synced.zoneDef, zoneState.issueStage);
    zoneState.pendingIssue = updatedStage.stageLabel;
    zoneState.lastSeverity = updatedStage.severity;
  });

  return unresolved;
}

export function mergeCameraScanWithLocationState(state, result) {
  const merged = {
    cameras: Array.isArray(result?.cameras) ? [...result.cameras] : [],
    activeEvents: Array.isArray(result?.activeEvents) ? [...result.activeEvents] : [],
    logs: Array.isArray(result?.logs) ? [...result.logs] : [],
    persistentReturns: 0,
    preEscalations: 0,
    returnReasonLines: []
  };

  const seen = new Set(merged.activeEvents.map((event) => String(event.cameraId)));

  merged.activeEvents.forEach((event) => {
    syncZoneIssueFromEvent(state, event);
  });

  const zones = Object.values(state?.locationState?.zones || {});
  zones.forEach((zoneState) => {
    if (!zoneState) return;

    const zoneName = zoneState.zoneName;
    const zoneDef = SCENE_DEFS[zoneName];
    if (!zoneDef) return;

    tickZoneScanStability(zoneState);

    const stage = clampStage(zoneState.issueStage || 1);
    if (!zoneState.pendingIssue && zoneState.followupPressure <= 0 && zoneState.unresolvedCount <= 0) {
      return;
    }

    if (seen.has(String(zoneState.zoneId))) return;
    if ((zoneState.cooldowns?.reappear || 0) > 0) return;

    const modifierSuppression = getSuppressionFromModifiers(zoneState);
    const durabilitySuppression = clamp01(zoneState.recurrenceSuppression || 0);
    const suppression = modifierSuppression + durabilitySuppression;
    const pressure = Math.max(0, Number(zoneState.followupPressure || 0));
    const unresolved = Math.max(0, Number(zoneState.unresolvedCount || 0));

    const protectedScans = Math.max(0, Number(zoneState.protectedScansRemaining || 0));
    const containmentTier = String(zoneState.containmentTier || 'none');
    const hasDurableProtection = containmentTier === 'durable' || containmentTier === 'root-lockout';
    const extraordinaryBreak = isExtraordinaryZoneBreak(zoneState);
    if (hasDurableProtection && protectedScans > 0 && !extraordinaryBreak) {
      return;
    }

    const chanceMultiplier = Math.max(
      0.55,
      Number(state?.progressionModifiers?.unresolvedReturnChanceMult || 1)
    );
    const tierPaceMult =
      containmentTier === 'temporary' ? 1.06 : containmentTier === 'partial' ? 0.94 : 1;
    const chance = Math.max(
      0.05,
      Math.min(
        0.88,
        (0.18 + stage * 0.16 + pressure * 0.05 + unresolved * 0.04 - suppression) *
          chanceMultiplier *
          tierPaceMult
      )
    );
    if (Math.random() > chance) return;

    const stageInfo = getStageForZone(zoneDef, stage);
    merged.activeEvents.push({
      cameraId: zoneState.zoneId,
      cameraName: zoneName,
      status: stageInfo.status,
      severity: stageInfo.severity
    });
    merged.cameras = setEventOnCamera(merged.cameras, zoneState.zoneId, stageInfo.status);
    let returnReason = 'Unresolved pressure resurfaced after temporary deterrence.';
    if (hasDurableProtection && protectedScans > 0 && extraordinaryBreak) {
      returnReason = 'A high-pressure escalation broke through prior durable containment.';
    } else if (containmentTier === 'partial') {
      returnReason = 'Partial stabilization reduced risk, but root pressure remained active.';
    } else if (containmentTier === 'temporary') {
      returnReason = 'Temporary deterrence held briefly, then relapsed.';
    } else if (containmentTier === 'root-lockout') {
      returnReason = 'A new anomaly pulse reopened this zone despite earlier lockout.';
    }

    merged.logs.push(`[${zoneName}] ${returnReason} (${stageInfo.stageLabel}).`);
    merged.returnReasonLines.push(`${zoneName}: ${returnReason}`);

    zoneState.pendingIssue = stageInfo.stageLabel;
    zoneState.lastSeverity = stageInfo.severity;
    zoneState.stabilityStatus = 'relapsed';
    zoneState.lastRecurrenceReason = returnReason;
    zoneState.lastStatusNote = `Relapse detected: ${returnReason}. Further relapse checks are on cooldown.`;
    zoneState.cooldowns.reappear = Math.max(3, Number(zoneState.cooldowns.reappear || 0));
    merged.persistentReturns += 1;

    if (stage >= 3) {
      merged.preEscalations += 1;
    }
  });

  return merged;
}

export function markActiveSceneIgnored(state) {
  const scene = state?.cameraScene?.activeScene;
  if (!scene) return false;

  const zoneState = getLocationZoneState(state, scene.zoneId, scene.zoneName);
  if (!zoneState) return false;

  zoneState.ignoreCount = Math.max(0, Number(zoneState.ignoreCount || 0)) + 1;
  zoneState.unresolvedCount = Math.max(0, Number(zoneState.unresolvedCount || 0)) + 1;
  zoneState.followupPressure = Math.min(8, Math.max(0, Number(zoneState.followupPressure || 0)) + 1);
  if (zoneState.ignoreCount >= 2) {
    zoneState.issueStage = clampStage((zoneState.issueStage || 1) + 1);
  }

  return true;
}

export function openCameraScene(state, cameraId) {
  if (!state) return null;
  const event = (state.activeEvents || []).find(
    (entry) => String(entry?.cameraId) === String(cameraId)
  );
  if (!event) return null;

  const zoneDef = SCENE_DEFS[event.cameraName];
  if (!zoneDef) return null;

  const synced = syncZoneIssueFromEvent(state, event);
  if (!synced) return null;
  const { zoneState } = synced;

  const stageInfo = getStageForZone(zoneDef, zoneState.issueStage || stageFromSeverity(event.severity));
  const lowPowerStage = getLowPowerStage(state);

  const actions = zoneDef.actions
    .slice(0, 4)
    .map((action) => {
      const actionState = pickSceneActionState(action, lowPowerStage);
      const costs = computeCameraSceneActionCosts(state, action);
      return {
        ...actionState,
        displayPowerCost: costs.powerCost,
        displayMoneyCost: costs.moneyCost
      };
    });

  const modifiers = getModifierUiState(state, event.cameraId);

  const scene = {
    zoneId: event.cameraId,
    zoneName: event.cameraName,
    title: stageInfo.stageLabel,
    subLabel: `Stage ${stageInfo.stage} • ${stageInfo.severity.toUpperCase()} severity`,
    description: `Surveillance anomaly: ${event.status}. Manage pressure before this chain worsens.`,
    atmosphere: stageInfo.flavor,
    reactiveOverlay: buildReactiveSceneOverlay(state, event.cameraName, stageInfo),
    severity: stageInfo.severity,
    stage: stageInfo.stage,
    pressure: stageInfo.pressure,
    zoneStatusLine: getZoneStatusLine(zoneState),
    statusNote: zoneState.lastStatusNote || '',
    actions,
    modifiers
  };

  zoneState.lastInvestigatedNight = Number(state?.night || 1);
  state.cameraScene.activeScene = scene;
  return scene;
}

export function resolveCameraSceneAction(state, cameraId, actionId) {
  const event = (state?.activeEvents || []).find(
    (entry) => String(entry?.cameraId) === String(cameraId)
  );
  if (!event) return null;

  const zoneDef = SCENE_DEFS[event.cameraName];
  if (!zoneDef) return null;

  const action = zoneDef.actions.find((entry) => entry.id === actionId);
  if (!action) return null;
  const actionCosts = computeCameraSceneActionCosts(state, action);

  const synced = syncZoneIssueFromEvent(state, event);
  if (!synced) return null;
  const { zoneState } = synced;
  const stageInfo = getStageForZone(zoneDef, zoneState.issueStage || stageFromSeverity(event.severity));
  const previousStageLabel = stageInfo.stageLabel;
  const previousSeverity = stageInfo.severity;

  const lowPowerStage = getLowPowerStage(state);
  const disabledByPower =
    Boolean(action.lowPowerRestricted) &&
    (lowPowerStage === 'critical' || (lowPowerStage === 'low' && (action.powerCost || 0) >= 4));

  if (disabledByPower) {
    return {
      blocked: true,
      logs: ['Power is too low to run that camera response safely.'],
      alert: {
        type: 'warning',
        message: `Low power is limiting surveillance actions in ${event.cameraName}.`
      }
    };
  }

  const severityPenalty = stageInfo.severity === 'high' ? 0.15 : stageInfo.severity === 'medium' ? 0.08 : 0.03;
  const lowPowerPenalty = lowPowerStage === 'critical' ? 0.2 : lowPowerStage === 'low' ? 0.1 : 0;
  const modifierAssist = Math.min(0.18, getSuppressionFromModifiers(zoneState) * 0.45);
  const successChance = Math.max(
    0.16,
    Math.min(
      0.92,
      Number(action.successBias || 0.55) -
        severityPenalty -
        lowPowerPenalty +
        modifierAssist +
        Number(state?.progressionModifiers?.investigationSuccessBonus || 0) -
        Number(state?.narrativeBias?.investigationPenalty || 0)
    )
  );

  const roll = Math.random();
  const outcomeKey = getOutcomeKey(roll, successChance);
  const clearEvent = outcomeKey === 'resolved' || outcomeKey === 'falseAlarm';

  let chainPressure = 0;
  let spilloverPressure = 0;
  let setCondition = null;
  let followupDelta = 0;

  if (outcomeKey === 'resolved') {
    chainPressure = -2;
    followupDelta = -2;
    zoneState.unresolvedCount = Math.max(0, Number(zoneState.unresolvedCount || 0) - 1);
    zoneState.issueStage = Math.max(1, clampStage(zoneState.issueStage || 1) - 1);
    setCondition = 'Watch';
  } else if (outcomeKey === 'falseAlarm') {
    chainPressure = -1;
    followupDelta = -1;
    zoneState.issueStage = Math.max(1, clampStage(zoneState.issueStage || 1) - 1);
  } else if (outcomeKey === 'moved') {
    chainPressure = 1;
    spilloverPressure = 1;
    followupDelta = 2;
    zoneState.unresolvedCount = Math.max(0, Number(zoneState.unresolvedCount || 0)) + 1;
    zoneState.issueStage = clampStage((zoneState.issueStage || 1) + 1);
  } else {
    chainPressure = 2;
    followupDelta = 3;
    setCondition = 'Critical';
    zoneState.unresolvedCount = Math.max(0, Number(zoneState.unresolvedCount || 0)) + 2;
    zoneState.issueStage = clampStage((zoneState.issueStage || 1) + 1);
  }

  const chainPressureMult = Math.max(
    0.7,
    Number(state?.progressionModifiers?.cameraChainPressureMult || 1)
  );
  chainPressure = Math.round(chainPressure * chainPressureMult);
  spilloverPressure = Math.round(spilloverPressure * chainPressureMult);

  zoneState.followupPressure = Math.max(0, Math.min(8, Number(zoneState.followupPressure || 0) + followupDelta));
  zoneState.lastResolvedAction = action.id;
  zoneState.lastOutcome = outcomeKey;
  zoneState.pendingIssue = clearEvent
    ? null
    : outcomeKey === 'moved'
      ? `Temporarily stabilized: ${getStageForZone(zoneDef, zoneState.issueStage).stageLabel}`
      : `Escalated pressure: ${getStageForZone(zoneDef, zoneState.issueStage).stageLabel}`;
  zoneState.lastSeverity = STAGE_SEVERITY[zoneState.issueStage] || stageInfo.severity;
  zoneState.ignoreCount = clearEvent ? 0 : Math.max(0, Number(zoneState.ignoreCount || 0));

  const durability = getDurabilityProfile(action, outcomeKey, stageInfo);
  applyDurabilityProfile(zoneState, durability);

  if (action.modifierKey) {
    const turns =
      outcomeKey === 'resolved' || outcomeKey === 'falseAlarm'
        ? Math.max(1, Number(action.modifierTurns || 2))
        : Math.max(1, Number(action.modifierTurns || 2) - 1);
    setLocationModifier(state, cameraId, action.modifierKey, turns);
  }

  if (action.instabilityRisk && Math.random() < 0.5) {
    zoneState.followupPressure = Math.min(8, zoneState.followupPressure + 1);
  }

  const modifierStates = getModifierUiState(state, cameraId);
  const heavyResponse = (action.powerCost || 0) >= 5;
  const strongContainment = action.strength === 'strong';
  const weakDecision = action.strength === 'weak';

  return {
    blocked: false,
    outcomeKey,
    clearEvent,
    powerCost: action.powerCost || 0,
    moneyCost: action.moneyCost || 0,
    appliedPowerCost: actionCosts.powerCost,
    appliedMoneyCost: actionCosts.moneyCost,
    reputationDelta: Number(action.reputationDelta || 0),
    chainPressure,
    spilloverPressure,
    setCondition,
    strongContainment,
    weakDecision,
    heavyResponse,
    escalatedIssue: outcomeKey === 'escalated' || outcomeKey === 'moved',
    unresolvedPersists: !clearEvent,
    previousStageLabel,
    previousSeverity,
    nextStage: zoneState.issueStage,
    nextSeverity: STAGE_SEVERITY[zoneState.issueStage] || stageInfo.severity,
    nextStageLabel: getStageForZone(zoneDef, zoneState.issueStage).stageLabel,
    nextStatus: getStageForZone(zoneDef, zoneState.issueStage).status,
    containmentTier: zoneState.containmentTier,
    containmentTierLabel: TIER_LABELS[zoneState.containmentTier] || TIER_LABELS.none,
    stabilityStatus: zoneState.stabilityStatus,
    stabilityStatusLabel: STATUS_LABELS[zoneState.stabilityStatus] || STATUS_LABELS.clear,
    protectedScansRemaining: Number(zoneState.protectedScansRemaining || 0),
    recurrenceSuppression: clamp01(zoneState.recurrenceSuppression || 0),
    durabilityGuidance: durability.guidance,
    statusNote: zoneState.lastStatusNote,
    modifierStates,
    logs: [
      `[${event.cameraName}] ${stageInfo.stageLabel} response ${
        outcomeKey === 'resolved'
          ? 'contained the issue.'
          : outcomeKey === 'falseAlarm'
            ? 'verified minimal threat and reduced pressure.'
            : outcomeKey === 'moved'
              ? 'redirected the issue into neighboring pressure lines.'
              : 'failed and the location chain escalated.'
      }`
    ],
    alert:
      outcomeKey === 'escalated'
        ? {
            type: 'danger',
            message: `${event.cameraName} containment failed — chain pressure increased.`
          }
        : outcomeKey === 'resolved'
          ? {
              type: 'success',
              message: `${event.cameraName} stabilized. ${durability.guidance}`
            }
          : {
              type: 'warning',
              message: `${event.cameraName} updated. ${durability.guidance}`
            }
  };
}
