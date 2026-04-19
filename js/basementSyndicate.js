/**
 * v0.40 — Basement syndicate: optional dirty engine, split upstairs/downstairs pressure, grid echo.
 */

import { isEndlessMode } from './endlessShift.js';
import { normalizeAnalogSurvivalState, enforceBreakerBudget } from './analogSurvival.js';

function n(v, d = 0) {
  const x = Number(v);
  return Number.isFinite(x) ? x : d;
}

const INCIDENTS = [
  { id: 'cheat-accusation', label: 'Cheating accusation', split: true },
  { id: 'debt-fight', label: 'Debt fight', split: false },
  { id: 'payout-dispute', label: 'Violent payout dispute', split: true },
  { id: 'club-noise', label: 'Hidden club noise leak', split: true },
  { id: 'ventilation', label: 'Downstairs ventilation choke', split: false },
  { id: 'police-rumor', label: 'Police sweep rumor', split: true },
  { id: 'syndicate-demand', label: 'Syndicate collection demand', split: false }
];

export function normalizeBasementSyndicate(state) {
  if (!state || typeof state !== 'object') return state;
  const b = state.basementSyndicate && typeof state.basementSyndicate === 'object' ? state.basementSyndicate : {};
  state.basementSyndicate = {
    unlockedEver: Boolean(b.unlockedEver),
    heat: Math.max(0, Math.min(10, n(b.heat, 0))),
    incident: b.incident && typeof b.incident === 'object' ? { ...b.incident } : null,
    skimmedTonight: Boolean(b.skimmedTonight),
    upstairsPull: Boolean(b.upstairsPull),
    violenceTonight: n(b.violenceTonight, 0)
  };
  return state;
}

export function evaluateBasementUnlock(state) {
  normalizeBasementSyndicate(state);
  if (state.basementSyndicate.unlockedEver) return true;
  if (isEndlessMode(state)) {
    state.basementSyndicate.unlockedEver = true;
    return true;
  }
  const dirty = n(state?.dirtyLedger?.totalDirtyMoney, 0) >= 38;
  const score = n(state?.dirtyLedger?.dirtyScore, 0) >= 1.5;
  const shadow = n(state?.shadowRep, 0) >= 2;
  const corrupt = n(state?.townState?.corruption, 0) >= 1 && n(state.night, 1) >= 3;
  const deep = n(state?.protectedRoom?.pressureLevel, 0) >= 2 && n(state.night, 1) >= 4;
  if (dirty || score || shadow || corrupt || deep) {
    state.basementSyndicate.unlockedEver = true;
    return true;
  }
  return false;
}

export function basementBreakerPenalty(state) {
  normalizeBasementSyndicate(state);
  if (!state.basementSyndicate.unlockedEver) return 0;
  return Math.min(2, Math.floor(n(state.basementSyndicate.heat, 0) / 3) + (state.basementSyndicate.incident ? 1 : 0));
}

export function tickBasementSyndicateDuringShift(state, pushAlert) {
  normalizeBasementSyndicate(state);
  if (!evaluateBasementUnlock(state)) return;
  const minute = n(state?.shiftElapsedMinutes, 0);
  if (state.basementSyndicate.incident) return;
  if (minute < 95 || minute > 430) return;
  const h = n(state.basementSyndicate.heat, 0);
  const chance = 0.008 + h * 0.0018 + n(state?.dirtyLedger?.dirtyScore, 0) * 0.002;
  if (Math.random() > chance) return;
  const pick = INCIDENTS[Math.floor(Math.random() * INCIDENTS.length)];
  state.basementSyndicate.incident = {
    id: pick.id,
    label: pick.label,
    split: Boolean(pick.split && Math.random() < 0.42),
    sinceMinute: minute
  };
  state.basementSyndicate.heat = Math.min(10, h + 1.2);
  state.basementSyndicate.upstairsPull = Boolean(state.basementSyndicate.incident.split);
  state.logs.push(`[Basement] ${pick.label} — downstairs noise stops pretending it is laundry.`);
  if (!state.shiftStats) state.shiftStats = {};
  state.shiftStats.basementIncidentsSpawned = n(state.shiftStats.basementIncidentsSpawned, 0) + 1;
  if (typeof pushAlert === 'function') {
    pushAlert({
      type: 'warning',
      message: 'Basement incident: syndicate floor needs a decision before it bleeds upstairs.',
      dedupeKey: `basement-inc-${state.night}-${minute}`
    });
  }
}

export function resolveBasementIncidentFocus(state, focus) {
  normalizeBasementSyndicate(state);
  const inc = state.basementSyndicate.incident;
  if (!inc) return { ok: false, reason: 'No basement incident active.' };
  if (!state.shiftStats) state.shiftStats = {};
  if (focus === 'upstairs') {
    state.basementSyndicate.heat = Math.min(10, n(state.basementSyndicate.heat, 0) + 0.9);
    state.crisisEscalation = state.crisisEscalation || {};
    state.crisisEscalation.hallwayThreatLevel = Math.max(
      n(state.crisisEscalation.hallwayThreatLevel, 0),
      1
    );
    state.shiftStats.basementSplitUpstairs = n(state.shiftStats.basementSplitUpstairs, 0) + 1;
    state.logs.push('[Basement] You pulled cover upstairs — the corridor tightens while the hole downstairs keeps boiling.');
  } else if (focus === 'basement') {
    state.basementSyndicate.heat = Math.max(0, n(state.basementSyndicate.heat, 0) - 0.35);
    state.basementSyndicate.violenceTonight += 1;
    state.dayShift = state.dayShift || {};
    state.dayShift.ownerPressure = Math.min(10, n(state.dayShift.ownerPressure, 0) + 1);
    state.shiftStats.basementSplitDownstairs = n(state.shiftStats.basementSplitDownstairs, 0) + 1;
    state.logs.push('[Basement] Hands downstairs — quieter lobby, uglier books. Ownership will hear the vibration.');
  } else if (focus === 'delay') {
    state.basementSyndicate.heat = Math.min(10, n(state.basementSyndicate.heat, 0) + 1.4);
    state.townState = state.townState || {};
    state.townState.townSuspicion = Math.min(10, n(state.townState.townSuspicion, 0) + 0.5);
    state.shiftStats.basementDelayed = n(state.shiftStats.basementDelayed, 0) + 1;
    state.logs.push('[Basement] You froze — both floors felt it. Rumor gains mass when nobody owns the mess.');
  } else {
    return { ok: false, reason: 'Unknown focus.' };
  }
  state.shiftStats.basementIncidentsResolved = n(state.shiftStats.basementIncidentsResolved, 0) + 1;
  state.basementSyndicate.incident = null;
  state.basementSyndicate.upstairsPull = false;
  return { ok: true };
}

export function takeBasementSkim(state) {
  normalizeBasementSyndicate(state);
  if (!evaluateBasementUnlock(state)) return { ok: false, reason: 'Basement not in play.' };
  if (state.basementSyndicate.skimmedTonight) return { ok: false, reason: 'Skim already moved tonight.' };
  state.basementSyndicate.skimmedTonight = true;
  state.dirtyLedger = state.dirtyLedger || {};
  const cut = 16 + Math.floor(Math.random() * 14);
  state.dirtyLedger.totalDirtyMoney = n(state.dirtyLedger.totalDirtyMoney, 0) + cut;
  state.dirtyLedger.dirtyScore = n(state.dirtyLedger.dirtyScore, 0) + 0.55;
  state.basementSyndicate.heat = Math.min(10, n(state.basementSyndicate.heat, 0) + 1.8);
  state.power = Math.max(0, n(state.power, 100) - 8);
  state.townState = state.townState || {};
  state.townState.townSuspicion = Math.min(10, n(state.townState.townSuspicion, 0) + 0.35);
  if (!state.shiftStats) state.shiftStats = {};
  state.shiftStats.basementSkims = n(state.shiftStats.basementSkims, 0) + 1;
  normalizeAnalogSurvivalState(state);
  enforceBreakerBudget(state);
  state.logs.push(`[Basement] Off-book skim: $${cut} dirty through the trap — the building paid in heat and watts.`);
  return { ok: true, cut };
}

export function resetBasementNightFlags(state) {
  normalizeBasementSyndicate(state);
  state.basementSyndicate.skimmedTonight = false;
  state.basementSyndicate.incident = null;
  state.basementSyndicate.upstairsPull = false;
  state.basementSyndicate.violenceTonight = 0;
}

export function buildBasementRenderModel(state) {
  normalizeBasementSyndicate(state);
  const on = evaluateBasementUnlock(state);
  const inc = state.basementSyndicate.incident;
  return {
    unlocked: on,
    heat: Math.round(n(state.basementSyndicate.heat, 0) * 10) / 10,
    heatLabel:
      n(state.basementSyndicate.heat, 0) >= 7 ? 'Critical' : n(state.basementSyndicate.heat, 0) >= 4 ? 'Hot' : 'Warm',
    incident: inc,
    skimmedTonight: state.basementSyndicate.skimmedTonight,
    upstairsPull: state.basementSyndicate.upstairsPull,
    breakerEcho: basementBreakerPenalty(state)
  };
}

export function buildBasementPrepLine(state) {
  if (!evaluateBasementUnlock(state)) return '';
  return 'Basement syndicate is live — skims pay dirty but steal grid breath; split staff when upstairs and downstairs scream together.';
}
