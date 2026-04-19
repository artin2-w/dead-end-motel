/**
 * v0.35 — Endless shift mode, dark-web contracts, dawn auditor / exposure.
 * v0.39 — Winter ledger audits + trace exposure hooks (finalWinter).
 */

import { SHIFT_DURATION_MINUTES } from './nightCycle.js';
import { maybeRollWinterLedgerAudit, dawnExposureAdjustments } from './finalWinter.js';

const DAWN_CLEANUP_START = SHIFT_DURATION_MINUTES - 16;
const DAWN_WARNING_AT = SHIFT_DURATION_MINUTES - 22;

export const DARK_CONTRACT_CATALOG = Object.freeze([
  {
    id: 'dw-stale-feed',
    codename: 'GHOST-CAM-9',
    headline: '+12% archive bonus',
    upside: 'Heavier payout if you survive the read.',
    downside: 'Camera feeds feel one beat late; interference baseline +1.',
    rewardBonusPercent: 12,
    modifiers: { eventTriggerBonus: 0.02 },
    runtime: { cameraInterferenceBonus: 1 }
  },
  {
    id: 'dw-neon-ration',
    codename: 'NO-FACADE',
    headline: '+14% archive bonus',
    upside: 'Dark-web premium for running without a bright sign story.',
    downside: 'Neon locked dim; outdoor reads lean colder.',
    rewardBonusPercent: 14,
    modifiers: { passiveDrainMult: 1.06 },
    runtime: { neonLockedDim: true }
  },
  {
    id: 'dw-thin-grid',
    codename: 'BROWNOUT-LINE',
    headline: '+15% archive bonus',
    upside: 'Anonymous buyer wants proof you can run lean.',
    downside: 'Breaker budget −2; restore gain ×0.92.',
    rewardBonusPercent: 15,
    modifiers: { restoreGainMult: 0.92, passiveDrainMult: 1.05 },
    runtime: { breakerBudgetPenalty: 2 }
  },
  {
    id: 'dw-no-backup',
    codename: 'SOLO-DESK',
    headline: '+11% archive bonus',
    upside: 'Premium for operating without spare hands.',
    downside: 'Staff morale starts lower; paranoia ticks slightly faster.',
    rewardBonusPercent: 11,
    modifiers: { harshActionPenaltyMult: 1.08 },
    runtime: { staffMoraleStartPenalty: 0.08 }
  },
  {
    id: 'dw-perma-fog',
    codename: 'STATIC-SKY',
    headline: '+13% archive bonus',
    upside: 'Contractor pays for a motel that never sees a clean horizon.',
    downside: 'Fog-prone conditions pinned for the shift.',
    rewardBonusPercent: 13,
    modifiers: { anomalyChanceBonus: 0.03 },
    runtime: { forceFogForecast: true }
  },
  {
    id: 'dw-hunted-lot',
    codename: 'HUNT-ROUTER',
    headline: '+16% archive bonus',
    upside: 'High yield for keeping doors open under planted traffic.',
    downside: 'Hunt-adjacent pressure: event trigger +0.035; guest risk +1.',
    rewardBonusPercent: 16,
    modifiers: { eventTriggerBonus: 0.035, guestRiskBonus: 1 },
    runtime: { huntPressureEcho: true }
  },
  {
    id: 'dw-dirty-wire',
    codename: 'WASH-HOUSE',
    headline: '+14% archive bonus',
    upside: 'Better dirty margins — if you can stand the audit heat.',
    downside: 'Dirty score weighs heavier on town suspicion drift.',
    rewardBonusPercent: 14,
    modifiers: { moneyIncomeMult: 1.06 },
    runtime: { dirtyAuditWeight: 1.35 }
  },
  {
    id: 'dw-law-satellite',
    codename: 'SAT-LINK',
    headline: '+12% archive bonus',
    upside: 'Satellite buyer wants “clean paperwork” optics.',
    downside: 'Dawn auditor chance +18%; exposure from missed events +25%.',
    rewardBonusPercent: 12,
    modifiers: { reputationPenaltyMult: 1.08 },
    runtime: { auditorChanceBonus: 0.18, exposureMissedEventMult: 1.25 }
  }
]);

function n(value, fallback = 0) {
  const x = Number(value);
  return Number.isFinite(x) ? x : fallback;
}

export function isEndlessMode(state) {
  return String(state?.runSetup?.campaignMode || '') === 'endless';
}

export function darkWebContractsEnabled(state) {
  if (isEndlessMode(state)) return true;
  const d = String(state?.runSetup?.difficultyId || '');
  return d === 'hard' || d === 'nightmare';
}

export function getDarkContractById(id) {
  return DARK_CONTRACT_CATALOG.find((c) => c.id === String(id || '')) || null;
}

export function pickDarkContractOffers(state, count = 3) {
  if (!darkWebContractsEnabled(state)) return [];
  const pool = [...DARK_CONTRACT_CATALOG];
  const out = [];
  const avoid = String(state?.endlessRun?.lastContractId || '');
  while (out.length < count && pool.length) {
    const idx = Math.floor(Math.random() * pool.length);
    const [c] = pool.splice(idx, 1);
    if (c.id === avoid && pool.length) continue;
    out.push(c);
  }
  return out;
}

function mergeModifierProfile(base, patch = {}) {
  const out = { ...base };
  Object.entries(patch).forEach(([key, value]) => {
    if (typeof value !== 'number') return;
    if (key.endsWith('Mult') || key.endsWith('Scale')) {
      out[key] = Math.max(0.5, Math.min(3, n(out[key], 1) * value));
    } else {
      out[key] = n(out[key], 0) + value;
    }
  });
  return out;
}

export function mergeDarkContractIntoRunModifiers(baseProfile, contractId) {
  const c = getDarkContractById(contractId);
  if (!c) return { ...baseProfile, archiveBonusPercent: n(baseProfile?.archiveBonusPercent, 0) };
  let next = mergeModifierProfile(baseProfile, c.modifiers || {});
  next.archiveBonusPercent = Math.min(400, n(next.archiveBonusPercent, 0) + n(c.rewardBonusPercent, 0));
  return next;
}

export function normalizeEndlessRunState(state) {
  if (!state || typeof state !== 'object') return state;
  const er = state.endlessRun && typeof state.endlessRun === 'object' ? state.endlessRun : {};
  state.endlessRun = {
    active: Boolean(er.active || isEndlessMode(state)),
    wave: Math.max(0, n(er.wave, 0)),
    survivalScore: n(er.survivalScore, 0),
    lastContractId: String(er.lastContractId || ''),
    selectedDarkContractId: String(er.selectedDarkContractId || ''),
    nextDarkContractId: String(er.nextDarkContractId || ''),
    crisisSurvived: n(er.crisisSurvived, 0),
    convergencePeak: n(er.convergencePeak, 0),
    auditorPasses: n(er.auditorPasses, 0),
    auditorFails: n(er.auditorFails, 0),
    auditorPartials: n(er.auditorPartials, 0),
    cleanupPasses: n(er.cleanupPasses, 0)
  };
  return state;
}

export function normalizeContractRuntime(state) {
  if (!state || typeof state !== 'object') return state;
  const cr = state.contractRuntime && typeof state.contractRuntime === 'object' ? state.contractRuntime : {};
  state.contractRuntime = {
    cameraInterferenceBonus: n(cr.cameraInterferenceBonus, 0),
    neonLockedDim: Boolean(cr.neonLockedDim),
    breakerBudgetPenalty: n(cr.breakerBudgetPenalty, 0),
    staffMoraleStartPenalty: n(cr.staffMoraleStartPenalty, 0),
    forceFogForecast: Boolean(cr.forceFogForecast),
    huntPressureEcho: Boolean(cr.huntPressureEcho),
    dirtyAuditWeight: n(cr.dirtyAuditWeight, 1),
    auditorChanceBonus: n(cr.auditorChanceBonus, 0),
    exposureMissedEventMult: n(cr.exposureMissedEventMult, 1)
  };
  return state;
}

export function normalizeDawnAuditorState(state) {
  if (!state || typeof state !== 'object') return state;
  const da = state.dawnAuditor && typeof state.dawnAuditor === 'object' ? state.dawnAuditor : {};
  state.dawnAuditor = {
    active: Boolean(da.active),
    warned: Boolean(da.warned),
    cleanupWindow: Boolean(da.cleanupWindow),
    cleanupUsed: n(da.cleanupUsed, 0),
    exposureEstimate: n(da.exposureEstimate, 0),
    outcomeBand: String(da.outcomeBand || ''),
    kind: String(da.kind || ''),
    blackmailUsed: Boolean(da.blackmailUsed)
  };
  return state;
}

export function clearContractRuntime(state) {
  state.contractRuntime = {
    cameraInterferenceBonus: 0,
    neonLockedDim: false,
    breakerBudgetPenalty: 0,
    staffMoraleStartPenalty: 0,
    forceFogForecast: false,
    huntPressureEcho: false,
    dirtyAuditWeight: 1,
    auditorChanceBonus: 0,
    exposureMissedEventMult: 1
  };
}

export function applyDarkContractRuntime(state, contractId) {
  clearContractRuntime(state);
  const c = getDarkContractById(contractId);
  if (!c?.runtime) return;
  const r = c.runtime;
  state.contractRuntime = {
    cameraInterferenceBonus: n(r.cameraInterferenceBonus, 0),
    neonLockedDim: Boolean(r.neonLockedDim),
    breakerBudgetPenalty: n(r.breakerBudgetPenalty, 0),
    staffMoraleStartPenalty: n(r.staffMoraleStartPenalty, 0),
    forceFogForecast: Boolean(r.forceFogForecast),
    huntPressureEcho: Boolean(r.huntPressureEcho),
    dirtyAuditWeight: n(r.dirtyAuditWeight, 1),
    auditorChanceBonus: n(r.auditorChanceBonus, 0),
    exposureMissedEventMult: n(r.exposureMissedEventMult, 1)
  };
}

export function applyContractAnalogHooks(state) {
  if (!state?.analogSurvival) return;
  if (state.contractRuntime?.neonLockedDim) {
    state.analogSurvival.neonPlayerWish = 'dark';
  }
}

export function applyContractStaffHook(state) {
  const pen = n(state?.contractRuntime?.staffMoraleStartPenalty, 0);
  if (!pen || !Array.isArray(state?.dayShift?.staff?.roster)) return;
  state.dayShift.staff.roster.forEach((m) => {
    if (!m || m.active === false) return;
    m.morale = Math.max(0.12, n(m.morale, 0.56) - pen);
  });
}

export function applyContractWeatherHook(state) {
  if (!state.contractRuntime?.forceFogForecast) return;
  state.nightForecast = state.nightForecast && typeof state.nightForecast === 'object' ? state.nightForecast : {};
  const cond = Array.isArray(state.nightForecast.conditions) ? [...state.nightForecast.conditions] : [];
  if (!cond.some((c) => String(c).toLowerCase().includes('fog'))) {
    cond.push('fog-prone');
    state.nightForecast.conditions = cond.slice(0, 6);
  }
}

export function rollDawnAuditor(state) {
  normalizeDawnAuditorState(state);
  state.dawnAuditor = {
    active: false,
    warned: false,
    cleanupWindow: false,
    cleanupUsed: 0,
    exposureEstimate: 0,
    outcomeBand: '',
    kind: '',
    blackmailUsed: false
  };
  if (!darkWebContractsEnabled(state)) {
    maybeRollWinterLedgerAudit(state);
    return;
  }
  const dirty = n(state?.dirtyLedger?.dirtyScore, n(state?.dirtyLedger?.totalDirtyMoney, 0) / 25);
  const town = n(state?.townState?.townSuspicion, 0);
  const locker = Array.isArray(state?.evidenceLocker?.items) ? state.evidenceLocker.items.length : 0;
  const missed = n(state?.shiftStats?.nightEventsMissed, 0);
  const heat = dirty * 1.2 + town * 0.45 + locker * 0.35 + missed * 1.5;
  let chance = Math.min(0.5, 0.07 + heat * 0.028);
  chance += n(state?.contractRuntime?.auditorChanceBonus, 0);
  if (Math.random() > chance) {
    maybeRollWinterLedgerAudit(state);
    return;
  }
  state.dawnAuditor.active = true;
  state.dawnAuditor.kind = 'broker';
  state.logs.push('Anonymous tip: an outside inspector may walk the lobby at dawn looking for visible mess.');
}

export function tickDawnAuditor(state, pushAlert) {
  normalizeDawnAuditorState(state);
  if (!state.dawnAuditor.active) return;
  const el = n(state?.shiftElapsedMinutes, 0);
  if (!state.dawnAuditor.warned && el >= DAWN_WARNING_AT) {
    state.dawnAuditor.warned = true;
    if (typeof pushAlert === 'function') {
      pushAlert({
        type: 'warning',
        message:
          'Dawn auditor: rumor says someone with a clipboard hits the lobby at 6:00. You have a thin window to reduce visible exposure.',
        dedupeKey: `dawn-auditor-warn-${state.night}`
      });
    }
  }
  if (!state.dawnAuditor.cleanupWindow && el >= DAWN_CLEANUP_START) {
    state.dawnAuditor.cleanupWindow = true;
  }
}

export function computeDawnExposure(state) {
  const missed = n(state?.shiftStats?.nightEventsMissed, 0);
  const mult = n(state?.contractRuntime?.exposureMissedEventMult, 1);
  const policyBreaks = n(state?.shiftStats?.policyBroken, 0);
  const harsh = n(state?.shiftStats?.harshDeskActions, 0);
  const dirty = n(state?.dirtyLedger?.dirtyScore, n(state?.dirtyLedger?.totalDirtyMoney, 0) / 22);
  const town = n(state?.townState?.townSuspicion, 0);
  const locker = Array.isArray(state?.evidenceLocker?.items) ? state.evidenceLocker.items.length : 0;
  const uv = Array.isArray(state?.evidenceLocker?.items) ? state.evidenceLocker.items.filter((i) => i?.uvConfirmed).length : 0;
  const unresolved = n(state?.shiftStats?.unresolvedLocationScenes, 0);
  const dirtyW = n(state?.contractRuntime?.dirtyAuditWeight, 1);

  let score =
    missed * 2.2 * mult +
    policyBreaks * 1.4 +
    harsh * 0.9 +
    dirty * 1.8 * dirtyW +
    town * 0.55 +
    locker * 0.28 +
    unresolved * 1.1;
  score -= uv * 1.1;
  if (n(state?.shiftStats?.nightEventsResolved, 0) >= 2) score -= 1.2;
  if (n(state?.dawnAuditor?.cleanupUsed, 0) >= 1 && !state?.dawnAuditor?.blackmailUsed) score -= 3.5;
  score += dawnExposureAdjustments(state);
  return Math.max(0, Math.round(score * 10) / 10);
}

export function applyDawnAuditorCleanupPass(state) {
  normalizeDawnAuditorState(state);
  if (!state.dawnAuditor.active || !state.dawnAuditor.cleanupWindow) return { ok: false, reason: 'No cleanup window.' };
  if (state.dawnAuditor.cleanupUsed >= 1) return { ok: false, reason: 'Already ran a concealment pass.' };
  state.dawnAuditor.cleanupUsed += 1;
  state.endlessRun = state.endlessRun || {};
  state.endlessRun.cleanupPasses = n(state.endlessRun.cleanupPasses, 0) + 1;
  state.money = Math.max(0, n(state.money, 0) - 14);
  state.reputation = Math.max(0, n(state.reputation, 50) - 2);
  state.logs.push('Late concealment pass: cash and favors moved off the visible desk before dawn.');
  return { ok: true };
}

export function resolveDawnAuditorAtDawn(state) {
  normalizeDawnAuditorState(state);
  if (!state.dawnAuditor.active) {
    return { band: 'none', lines: [] };
  }
  const exp = computeDawnExposure(state);
  state.dawnAuditor.exposureEstimate = exp;
  let band = 'clean';
  const lines = [];
  if (exp < 6) {
    band = 'clean';
    lines.push('Dawn auditor: clipboard walk finds nothing they can hang a fine on.');
    state.endlessRun = state.endlessRun || {};
    state.endlessRun.auditorPasses = n(state.endlessRun.auditorPasses, 0) + 1;
  } else if (exp < 13) {
    band = 'partial';
    state.money = Math.max(0, n(state.money, 0) - 22);
    if (state.townState) {
      state.townState.townSuspicion = Math.min(10, n(state.townState.townSuspicion, 0) + 1);
    }
    lines.push('Dawn auditor: partial hit — small fine and the town remembers a sloppy morning.');
    state.endlessRun = state.endlessRun || {};
    state.endlessRun.auditorPartials = n(state.endlessRun.auditorPartials, 0) + 1;
  } else {
    band = 'severe';
    state.reputation = Math.max(0, n(state.reputation, 50) - 6);
    state.dirtyPressure = n(state.dirtyPressure, 0) + 2;
    if (state.townState) {
      state.townState.townSuspicion = Math.min(10, n(state.townState.townSuspicion, 0) + 2);
    }
    lines.push('Dawn auditor: severe — visible mess and paperwork trail draw real heat.');
    state.endlessRun = state.endlessRun || {};
    state.endlessRun.auditorFails = n(state.endlessRun.auditorFails, 0) + 1;
  }
  if (state.dawnAuditor.blackmailUsed) {
    lines.push('Dawn ledger: leverage burned — the inspector chose silence over paperwork.');
  }
  state.dawnAuditor.outcomeBand = band;
  state.dawnAuditor.active = false;
  state.dawnAuditor.cleanupWindow = false;
  return { band, lines };
}

export function recordEndlessWaveStats(state, summary = {}) {
  if (!isEndlessMode(state)) return;
  normalizeEndlessRunState(state);
  state.endlessRun.wave = Math.max(state.endlessRun.wave, n(state.night, 1));
  const gradeScore = n(summary?.score, 50);
  state.endlessRun.survivalScore += Math.round(gradeScore * 0.35) + 8;
  if (state?.crisisNight?.trueCrisisNight) {
    state.endlessRun.crisisSurvived += 1;
    state.endlessRun.survivalScore += 18;
  }
  const ct = n(state?.crisisNight?.convergenceTier, 0);
  if (ct > state.endlessRun.convergencePeak) state.endlessRun.convergencePeak = ct;
  state.endlessRun.survivalScore += ct * 4;
}
