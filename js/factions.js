const FACTIONS = ['guests', 'staff', 'locals', 'authorities', 'ownership'];

const DEFAULT_FACTION_STATE = Object.freeze({
  guests: 0,
  staff: 0,
  locals: 0,
  authorities: 0,
  ownership: 0
});

function clampScore(value) {
  return Math.max(-10, Math.min(10, Number(value || 0)));
}

function getBand(score) {
  if (score <= -6) return 'Hostile';
  if (score <= -2) return 'Wary';
  if (score < 3) return 'Neutral';
  if (score < 7) return 'Favorable';
  return 'Strong';
}

export function normalizeFactionState(state) {
  const next = state && typeof state === 'object' ? state : {};
  const current = next.factions && typeof next.factions === 'object'
    ? next.factions
    : DEFAULT_FACTION_STATE;

  const scores = { ...DEFAULT_FACTION_STATE };
  FACTIONS.forEach((faction) => {
    scores[faction] = clampScore(current[faction]);
  });
  next.factions = scores;
  return next;
}

export function applyFactionDelta(state, deltas = {}) {
  const next = normalizeFactionState(state);
  FACTIONS.forEach((faction) => {
    if (typeof deltas[faction] === 'number' && deltas[faction] !== 0) {
      next.factions[faction] = clampScore(next.factions[faction] + deltas[faction]);
    }
  });
  return next.factions;
}

export function getFactionClimateSummary(factions = {}) {
  const scores = { ...DEFAULT_FACTION_STATE, ...(factions || {}) };
  return FACTIONS.map((id) => ({
    id,
    score: clampScore(scores[id]),
    band: getBand(scores[id])
  }));
}

export function getFactionModifiers(factions = {}) {
  const scores = { ...DEFAULT_FACTION_STATE, ...(factions || {}) };
  return {
    staffDispatchBonus: scores.staff >= 6 ? 0.06 : scores.staff <= -6 ? -0.05 : 0,
    staffReliabilityNote: scores.staff >= 3,
    authorityPoliceBonus: scores.authorities >= 5 ? 1 : 0,
    policeFallbackRisk: scores.authorities <= -5 ? 1 : 0,
    guestDeskCalm: scores.guests >= 5 ? 1 : 0,
    guestRepShield: scores.guests >= 6 ? 1 : 0,
    localOutsideRisk: scores.locals <= -5 ? 1 : 0,
    localOutsideRelief: scores.locals >= 6 ? 1 : 0,
    ownershipPrepBonus: scores.ownership >= 6 ? 5 : 0,
    ownershipPressure: scores.ownership <= -5
  };
}

export function buildPrepFactionNotes(factions = {}, limit = 3) {
  const scores = { ...DEFAULT_FACTION_STATE, ...(factions || {}) };
  const notes = [];
  if (scores.staff >= 4) notes.push('Staff confidence is rising around your shift decisions.');
  if (scores.staff <= -4) notes.push('Staff confidence is thinning; response reliability may slip.');
  if (scores.guests <= -4) notes.push('Guests are becoming distrustful at the desk.');
  if (scores.authorities >= 4) notes.push('Authorities are more responsive to your coordination.');
  if (scores.authorities <= -4) notes.push('Authority patience is thinning; visibility mistakes may escalate faster.');
  if (scores.locals <= -4) notes.push('Local tension may intensify outside incident chains.');
  if (scores.locals >= 5) notes.push('Local climate is unusually cooperative around perimeter noise.');
  if (scores.ownership <= -4) notes.push('Ownership is watching policy compliance closely.');
  if (scores.ownership >= 5) notes.push('Ownership confidence is giving you slight operating latitude.');
  if (scores.guests >= 5) notes.push('Guest-facing friction is lower; soft interventions gain more room.');
  if (!notes.length) notes.push('Faction climate is currently stable across motel stakeholders.');
  return notes.slice(0, Math.max(1, limit));
}

export function buildFactionSummaryLines(factions = {}, limit = 3) {
  const scores = { ...DEFAULT_FACTION_STATE, ...(factions || {}) };
  const lines = [];
  if (scores.guests <= -5) lines.push('Guest trust slipped after repeated hardline desk outcomes.');
  if (scores.staff >= 5) lines.push('Staff confidence improved after controlled interventions.');
  if (scores.locals <= -5) lines.push('Local hostility increased due to force-heavy containment.');
  if (scores.authorities >= 5) lines.push('Authority coordination strengthened your formal response posture.');
  if (scores.ownership >= 5) lines.push('Management approval rose after stable operational control.');
  if (scores.ownership <= -5) lines.push('Ownership pressure mounted over visible instability and compliance drift.');
  if (scores.authorities <= -5) lines.push('Authority confidence declined, narrowing your margin for procedural error.');
  if (scores.guests >= 5 && scores.locals >= 0) lines.push('Guest confidence held while perimeter pressure stayed manageable.');
  if (scores.staff <= -5) lines.push('Staff trust strain reduced consistency in critical response windows.');
  if (!lines.length) lines.push('Faction pressure stayed balanced without major alignment swings.');
  return lines.slice(0, Math.max(1, limit));
}

export function getPrimaryFactionSignal(factions = {}) {
  const scores = { ...DEFAULT_FACTION_STATE, ...(factions || {}) };
  const ranked = FACTIONS
    .map((id) => ({ id, score: clampScore(scores[id]) }))
    .sort((a, b) => Math.abs(b.score) - Math.abs(a.score));
  const top = ranked[0] || { id: 'guests', score: 0 };
  if (top.score >= 4) {
    return `${top.id.charAt(0).toUpperCase()}${top.id.slice(1)} alignment is currently assisting operations.`;
  }
  if (top.score <= -4) {
    return `${top.id.charAt(0).toUpperCase()}${top.id.slice(1)} pressure is increasing operational risk.`;
  }
  return 'Faction climate remains mostly neutral tonight.';
}