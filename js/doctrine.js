const TRAITS = ['control', 'compassion', 'secrecy', 'improvisation', 'stability', 'force'];

const DEFAULT_TENDENCIES = Object.freeze({
  control: 0,
  compassion: 0,
  secrecy: 0,
  improvisation: 0,
  stability: 0,
  force: 0
});

const DOCTRINE_PROFILES = [
  {
    id: 'hardline-controller',
    title: 'Hardline Controller',
    summary: 'Command-first operations with little tolerance for ambiguity.',
    dominantTraits: ['control', 'force'],
    hints: [
      'Firm tactics gain consistency, but guest trust can erode.',
      'Authority-facing pressure usually softens while rumor pressure often hardens.'
    ],
    test: (t) => t.control >= 7 && t.force >= 6
  },
  {
    id: 'quiet-fixer',
    title: 'Quiet Fixer',
    summary: 'Problems are solved discreetly before they become public fires.',
    dominantTraits: ['secrecy', 'stability'],
    hints: [
      'Discreet handling improves, loud interventions feel less efficient.',
      'Quiet wins stack over time, but public scrutiny can intensify if you stall.'
    ],
    test: (t) => t.secrecy >= 6 && t.stability >= 5 && t.force < 6
  },
  {
    id: 'guest-first-host',
    title: 'Guest-First Host',
    summary: 'Hospitality and careful de-escalation shape the night.',
    dominantTraits: ['compassion', 'stability'],
    hints: [
      'Guest flow is calmer, hardline pressure tools lose edge.',
      'Reputation recovers faster, but hostile actors may test softer boundaries.'
    ],
    test: (t) => t.compassion >= 7 && t.stability >= 5
  },
  {
    id: 'emergency-improviser',
    title: 'Emergency Improviser',
    summary: 'Rapid pivots and reactive tools keep the motel alive.',
    dominantTraits: ['improvisation', 'force'],
    hints: [
      'Emergency actions gain impact, outcomes are swingier.',
      'High-volatility recoveries can save nights but leave heavier aftermath notes.'
    ],
    test: (t) => t.improvisation >= 7 && t.stability <= 4
  },
  {
    id: 'strict-enforcer',
    title: 'Strict Enforcer',
    summary: 'Policy and consequence drive behavior across the property.',
    dominantTraits: ['control', 'stability'],
    hints: [
      'Policy follow-through strengthens containment consistency.',
      'Documented control improves oversight confidence, but warmth declines.'
    ],
    test: (t) => t.control >= 6 && t.stability >= 6 && t.force >= 4
  },
  {
    id: 'stability-manager',
    title: 'Stability Manager',
    summary: 'Low-chaos continuity is prioritized over dramatic responses.',
    dominantTraits: ['stability', 'compassion'],
    hints: [
      'Night pressure rises more slowly under clean operations.',
      'Steady pacing reduces spikes, though rare pressure bursts can feel abrupt.'
    ],
    test: (t) => t.stability >= 7 && t.improvisation <= 5
  },
  {
    id: 'shadow-operator',
    title: 'Shadow Operator',
    summary: 'Private channels and controlled information shape decisions.',
    dominantTraits: ['secrecy', 'control'],
    hints: [
      'Quiet containment strengthens, overt force is less welcomed.',
      'Private channels become more effective while transparency costs increase.'
    ],
    test: (t) => t.secrecy >= 7 && t.control >= 5
  },
  {
    id: 'fractured-survivor',
    title: 'Fractured Survivor',
    summary: 'Patchwork decisions keep the lights on, but strain is visible.',
    dominantTraits: ['improvisation', 'force'],
    hints: [
      'Emergency actions spike harder while long-run cohesion suffers.',
      'You can still survive the night, but recurring tension often compounds.'
    ],
    test: (t) => t.stability <= 3 && (t.improvisation >= 6 || t.force >= 6)
  }
];

function clampTrait(value) {
  return Math.max(-10, Math.min(10, Number(value || 0)));
}

function normalizeTendencies(tendencies = {}) {
  const normalized = { ...DEFAULT_TENDENCIES };
  TRAITS.forEach((trait) => {
    normalized[trait] = clampTrait(tendencies[trait]);
  });
  return normalized;
}

function getDefaultDoctrineState() {
  return {
    tendencies: { ...DEFAULT_TENDENCIES },
    profileId: 'stability-manager',
    baselineProfileId: 'stability-manager',
    baselineTendencies: { ...DEFAULT_TENDENCIES },
    recentInfluences: []
  };
}

export function normalizeDoctrineState(state) {
  const next = state && typeof state === 'object' ? state : {};
  const current = next.doctrine && typeof next.doctrine === 'object'
    ? next.doctrine
    : getDefaultDoctrineState();

  const tendencies = normalizeTendencies(current.tendencies);
  const profile = deriveDoctrineProfile({ tendencies });
  next.doctrine = {
    ...getDefaultDoctrineState(),
    ...current,
    tendencies,
    profileId: current.profileId || profile.id,
    baselineProfileId: current.baselineProfileId || profile.id,
    baselineTendencies: normalizeTendencies(current.baselineTendencies || tendencies),
    recentInfluences: Array.isArray(current.recentInfluences)
      ? current.recentInfluences.slice(-8)
      : []
  };
  return next;
}

export function recordDoctrineInfluence(state, payload = {}) {
  const next = normalizeDoctrineState(state);
  const deltas = payload?.deltas && typeof payload.deltas === 'object' ? payload.deltas : {};
  const tendencies = { ...next.doctrine.tendencies };
  TRAITS.forEach((trait) => {
    if (typeof deltas[trait] === 'number' && deltas[trait] !== 0) {
      tendencies[trait] = clampTrait(tendencies[trait] + deltas[trait]);
    }
  });
  next.doctrine.tendencies = tendencies;
  const profile = deriveDoctrineProfile(next.doctrine);
  next.doctrine.profileId = profile.id;
  if (payload?.reason) {
    next.doctrine.recentInfluences = [
      ...next.doctrine.recentInfluences,
      String(payload.reason)
    ].slice(-8);
  }
  return profile;
}

export function deriveDoctrineProfile(doctrineState = {}) {
  const tendencies = normalizeTendencies(doctrineState.tendencies);
  const matched = DOCTRINE_PROFILES.find((profile) => profile.test(tendencies));
  if (matched) return matched;
  return DOCTRINE_PROFILES.find((entry) => entry.id === 'stability-manager') || DOCTRINE_PROFILES[0];
}

export function getDoctrineDisplay(doctrineState = {}) {
  const profile = deriveDoctrineProfile(doctrineState);
  return {
    id: profile.id,
    title: profile.title,
    summary: profile.summary,
    dominantTraits: profile.dominantTraits,
    hints: profile.hints || []
  };
}

export function beginDoctrineNight(doctrineState = {}) {
  const profile = deriveDoctrineProfile(doctrineState);
  return {
    ...doctrineState,
    baselineProfileId: profile.id,
    baselineTendencies: normalizeTendencies(doctrineState.tendencies)
  };
}

export function getDoctrineModifiers(doctrineState = {}) {
  const tendencies = normalizeTendencies(doctrineState.tendencies);
  const profile = deriveDoctrineProfile(doctrineState);
  return {
    profileId: profile.id,
    dispatchBonus: tendencies.stability >= 6 ? 0.03 : tendencies.stability <= -6 ? -0.02 : 0,
    guestCalmBonus: tendencies.compassion >= 6 ? 1 : 0,
    guestPenalty: tendencies.force >= 7 ? -1 : 0,
    discreetActionBonus: tendencies.secrecy >= 6 ? 0.08 : 0,
    openControlPenalty: tendencies.secrecy >= 7 ? -0.5 : 0,
    policeRepBonus: tendencies.control >= 7 || tendencies.force >= 7 ? 1 : 0,
    chaosDampener: tendencies.stability >= 7 ? 1 : 0,
    emergencyPowerBonus: tendencies.improvisation >= 6 ? 2 : 0,
    emergencyVolatility: tendencies.improvisation >= 8 ? 1 : 0
  };
}

export function buildDoctrineShiftNotes(doctrineState = {}, limit = 2) {
  const current = deriveDoctrineProfile(doctrineState);
  const baseline = String(doctrineState?.baselineProfileId || current.id);
  const notes = [];

  if (baseline !== current.id) {
    notes.push(`Management doctrine shifted toward ${current.title.toLowerCase()} this night.`);
  }

  const baselineT = normalizeTendencies(doctrineState?.baselineTendencies || {});
  const nowT = normalizeTendencies(doctrineState?.tendencies || {});
  const biggest = TRAITS
    .map((trait) => ({ trait, delta: nowT[trait] - baselineT[trait] }))
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))[0];

  if (biggest && Math.abs(biggest.delta) >= 2) {
    const direction = biggest.delta > 0 ? 'increased' : 'softened';
    notes.push(`${biggest.trait.charAt(0).toUpperCase()}${biggest.trait.slice(1)} posture ${direction} over the shift.`);
  }

  if (!notes.length) {
    notes.push(`Doctrine remained ${current.title.toLowerCase()} with only subtle drift.`);
  }

  const currentT = normalizeTendencies(doctrineState?.tendencies || {});
  if (notes.length < Math.max(1, limit)) {
    if (currentT.control >= 6 && currentT.compassion <= 1) {
      notes.push('Shift posture prioritized command clarity over relational flexibility.');
    } else if (currentT.compassion >= 6 && currentT.force <= 1) {
      notes.push('Shift posture favored de-escalation, patience, and guest-facing stability cues.');
    } else if (currentT.secrecy >= 6) {
      notes.push('Shift posture leaned into discreet channels and low-visibility containment.');
    }
  }

  return notes.slice(0, Math.max(1, limit));
}