/**
 * v0.39 — Final winter: dawn trace pressure, boiler/deep freeze, rival skim,
 * desk shredder / incinerator, auditor blackmail leverage, one-run 4 AM fixer.
 */

import { SHIFT_DURATION_MINUTES } from './nightCycle.js';
import { normalizeAnalogSurvivalState, enforceBreakerBudget } from './analogSurvival.js';
import { bumpRoadHeat } from './roadWorld.js';

function n(v, d = 0) {
  const x = Number(v);
  return Number.isFinite(x) ? x : d;
}

const DAWN_CLEANUP_START = SHIFT_DURATION_MINUTES - 16;
const BLACKMAIL_TEMPLATE_IDS = new Set([
  'police-payoff-receipt',
  'false-police-log',
  'informant-record',
  'bagman-visit-note',
  'unsigned-expense-form'
]);
const SHRED_TEMPLATE_IDS = new Set([
  'border-transfer-slip',
  'witness-note-scribble',
  'route-token-smudge',
  'cargo-tag-fragment',
  'burner-instruction-slip',
  'off-book-register-note',
  'torn-ledger-fragment',
  'dos-reboot-log',
  'caller-log-entry',
  'intercept-success',
  'inside-job-note',
  'overwritten-dispatch-note',
  'staff-loyalty-record',
  'police-payoff-receipt',
  'false-police-log',
  'informant-record',
  'bagman-visit-note'
]);

export function readWeatherPrimary(state) {
  const explicit = state?.nightWeather?.primary;
  if (explicit) return explicit;
  const scenario = String(state?.activeScenario?.label || '').toLowerCase();
  if (/storm|surge|volatile/.test(scenario)) return 'storm';
  if (/fog|mist|low.vis/.test(scenario)) return 'fog';
  if (/cold|freeze|winter/.test(scenario)) return 'cold';
  if (/rain|wet|drizzle/.test(scenario)) return 'rain';
  return 'clear';
}

export function isColdWeatherNight(state) {
  return readWeatherPrimary(state) === 'cold';
}

export function normalizeFinalWinterState(state) {
  if (!state || typeof state !== 'object') return state;
  const fw = state.finalWinter && typeof state.finalWinter === 'object' ? state.finalWinter : {};
  state.finalWinter = {
    boilerStrain: Math.max(0, Math.min(10, n(fw.boilerStrain, 0))),
    pipeStressLogged: Boolean(fw.pipeStressLogged),
    room9FreezeHorrorFired: Boolean(fw.room9FreezeHorrorFired),
    rivalPressure: Math.max(0, Math.min(5, n(fw.rivalPressure, 0))),
    shredderUses: Math.max(0, Math.min(2, n(fw.shredderUses, 0))),
    incineratorUses: Math.max(0, Math.min(1, n(fw.incineratorUses, 0))),
    blackmailUsed: Boolean(fw.blackmailUsed),
    fixerDebtNight: n(fw.fixerDebtNight, 0),
    lastBoilerTickMinute: n(fw.lastBoilerTickMinute, -1)
  };
  return state;
}

export function resetFinalWinterPerNight(state) {
  normalizeFinalWinterState(state);
  state.finalWinter.shredderUses = 0;
  state.finalWinter.incineratorUses = 0;
  state.finalWinter.blackmailUsed = false;
  state.finalWinter.pipeStressLogged = false;
  state.finalWinter.room9FreezeHorrorFired = false;
  state.finalWinter.lastBoilerTickMinute = -1;
  return state;
}

export function bumpRivalPressureOnPrep(state) {
  normalizeFinalWinterState(state);
  const night = Math.max(1, n(state.night, 1));
  if (night < 2) return;
  const rep = n(state.reputation, 50);
  if (rep >= 52) state.finalWinter.rivalPressure = Math.min(5, state.finalWinter.rivalPressure + 0.35);
  if (night % 2 === 0) state.finalWinter.rivalPressure = Math.min(5, state.finalWinter.rivalPressure + 0.25);
  if (state.finalWinter.rivalPressure >= 2.5) {
    state.logs.push('[Rival] Bright chain up the exit keeps peeling daylight traffic — your sign has to shout louder for the same money.');
  }
}

export function applyRivalSkimToIntake(state) {
  normalizeFinalWinterState(state);
  if (!state.intake || typeof state.intake !== 'object') return;
  const rp = state.finalWinter.rivalPressure;
  if (rp < 1) return;
  const cut = Math.min(2, Math.floor(rp * 0.45));
  state.intake.arrivalsRemaining = Math.max(2, n(state.intake.arrivalsRemaining, 4) - cut);
}

export function maybeRollWinterLedgerAudit(state) {
  if (state.dawnAuditor?.active) return;
  if (!isColdWeatherNight(state)) return;
  const night = Math.max(1, n(state.night, 1));
  if (night < 2) return;
  const dirty = n(state?.dirtyLedger?.dirtyScore, n(state?.dirtyLedger?.totalDirtyMoney, 0) / 28);
  const locker = Array.isArray(state?.evidenceLocker?.items) ? state.evidenceLocker.items.length : 0;
  const missed = n(state?.shiftStats?.nightEventsMissed, 0);
  const heat = dirty * 1.1 + locker * 0.4 + missed * 1.2;
  const chance = Math.min(0.14, 0.035 + heat * 0.015);
  if (Math.random() > chance) return;
  state.dawnAuditor.active = true;
  state.dawnAuditor.kind = 'winter';
  state.dawnAuditor.warned = false;
  state.dawnAuditor.cleanupWindow = false;
  state.dawnAuditor.cleanupUsed = 0;
  state.dawnAuditor.exposureEstimate = 0;
  state.dawnAuditor.outcomeBand = '';
  state.logs.push('[Winter] County clipboards love a cold motel — rumor of an informal dawn walk-through tonight.');
}

/** Read-only winter pressure add-on for dawn exposure (does not duplicate locker/missed base formula). */
export function computeWinterTraceBonus(state) {
  normalizeFinalWinterState(state);
  let t = 0;
  if (isColdWeatherNight(state)) t += 0.85;
  if (n(state.finalWinter.boilerStrain, 0) >= 6) t += 0.95;
  if (n(state.finalWinter.boilerStrain, 0) >= 8.5) t += 0.55;
  if (n(state.finalWinter.rivalPressure, 0) >= 3) t += 0.45;
  return Math.min(3.5, Math.round(t * 10) / 10);
}

export function dawnExposureAdjustments(state) {
  normalizeFinalWinterState(state);
  let delta = computeWinterTraceBonus(state);
  if (state.dawnAuditor?.blackmailUsed) delta -= 7.5;
  if (n(state?.shiftStats?.dawnShredderPasses, 0) >= 1) delta -= 1.8;
  if (n(state?.shiftStats?.dawnIncineratorRuns, 0) >= 1) delta -= 3.2;
  return delta;
}

export function tickFinalWinterDuringShift(state, pushAlert) {
  normalizeFinalWinterState(state);
  normalizeAnalogSurvivalState(state);
  const minute = n(state?.shiftElapsedMinutes, 0);
  if (minute === state.finalWinter.lastBoilerTickMinute) return;
  state.finalWinter.lastBoilerTickMinute = minute;

  if (!isColdWeatherNight(state)) {
    state.finalWinter.boilerStrain = Math.max(0, state.finalWinter.boilerStrain - 0.04);
    return;
  }

  const ht = String(state.analogSurvival.circuits.heating?.tier || 'dim');
  let inc = ht === 'off' ? 0.32 : ht === 'dim' ? 0.16 : 0.07;
  const neon = String(state.analogSurvival.circuits.neon?.tier || 'dim');
  if (neon === 'full') inc += 0.05;
  state.finalWinter.boilerStrain = Math.min(10, state.finalWinter.boilerStrain + inc);

  if (state.finalWinter.boilerStrain >= 7.2 && !state.finalWinter.pipeStressLogged && Math.random() < 0.08) {
    state.finalWinter.pipeStressLogged = true;
    state.logs.push('[Boiler] Radiators hammer — water hammer in the old spine. The building is asking for slack you do not have.');
    if (typeof pushAlert === 'function') {
      pushAlert({
        type: 'warning',
        message: 'Deep freeze: boiler line stressed — heating load and facade power are fighting.',
        dedupeKey: `boiler-stress-${state.night}`
      });
    }
  }

  if (
    ht === 'off' &&
    n(state?.protectedRoom?.pressureLevel, 0) >= 2 &&
    !state.finalWinter.room9FreezeHorrorFired &&
    Math.random() < 0.022
  ) {
    state.finalWinter.room9FreezeHorrorFired = true;
    state.protectedRoom = state.protectedRoom || {};
    state.protectedRoom.pressureLevel = Math.min(4, n(state.protectedRoom.pressureLevel, 0) + 1);
    state.protectedRoom.contaminationCount = n(state.protectedRoom.contaminationCount, 0) + 1;
    state.shiftStats.room9FreezeSpikes = n(state.shiftStats.room9FreezeSpikes, 0) + 1;
    if (Array.isArray(state.dayShift?.staff?.roster)) {
      state.dayShift.staff.roster.forEach((m) => {
        if (!m || m.active === false) return;
        m.fear = Math.min(1, n(m.fear, 0) + 0.14);
        m.morale = Math.max(0.12, n(m.morale, 0.56) - 0.08);
      });
    }
    state.logs.push(
      '[Room 9] Black water coughs in a freeze line — cold broke a seal somewhere the owner swore was dormant. Hallway fear spikes.'
    );
    if (typeof pushAlert === 'function') {
      pushAlert({
        type: 'danger',
        message: 'Winter horror: sealed line weeps under freeze — contamination pressure jumped.',
        dedupeKey: `r9-freeze-${state.night}`
      });
    }
  }
}

export function hasAuditorBlackmailLeverage(state) {
  const items = Array.isArray(state?.evidenceLocker?.items) ? state.evidenceLocker.items : [];
  return items.some((it) => BLACKMAIL_TEMPLATE_IDS.has(String(it.templateId || it.id || '')));
}

export function canUseDawnCleanupTools(state) {
  const da = state.dawnAuditor && typeof state.dawnAuditor === 'object' ? state.dawnAuditor : {};
  return Boolean(da.active && da.cleanupWindow);
}

export function applyDeskShredderPass(state) {
  normalizeFinalWinterState(state);
  if (!canUseDawnCleanupTools(state)) return { ok: false, reason: 'Shredder only during dawn cleanup window (before pass spent).' };
  if (state.finalWinter.shredderUses >= 2) return { ok: false, reason: 'Shredder overheated for tonight.' };
  const items = Array.isArray(state.evidenceLocker?.items) ? state.evidenceLocker.items : [];
  const victims = items.filter((it) => SHRED_TEMPLATE_IDS.has(String(it.templateId || '')));
  if (!victims.length) return { ok: false, reason: 'No desk-grade paper slips left to shred.' };
  const removeIds = new Set(victims.slice(-2).map((it) => it.id));
  state.evidenceLocker.items = items.filter((it) => !removeIds.has(it.id));
  state.finalWinter.shredderUses += 1;
  if (!state.shiftStats) state.shiftStats = {};
  state.shiftStats.dawnShredderPasses = n(state.shiftStats.dawnShredderPasses, 0) + 1;
  state.townState = state.townState || {};
  state.townState.townSuspicion = Math.min(10, n(state.townState.townSuspicion, 0) + 0.35);
  state.logs.push('[Desk] Shredder screamed for twenty seconds — fast, loud, and everyone pretends not to know why.');
  return { ok: true, removed: removeIds.size };
}

export function applyBasementIncineratorPass(state) {
  normalizeFinalWinterState(state);
  if (!canUseDawnCleanupTools(state)) return { ok: false, reason: 'Furnace route only during dawn cleanup window.' };
  if (state.finalWinter.incineratorUses >= 1) return { ok: false, reason: 'Furnace already ran hot tonight.' };
  const items = Array.isArray(state.evidenceLocker?.items) ? state.evidenceLocker.items : [];
  if (!items.length) return { ok: false, reason: 'Locker empty — nothing to burn.' };
  const take = Math.min(4, items.length);
  state.evidenceLocker.items = items.slice(0, Math.max(0, items.length - take));
  state.finalWinter.incineratorUses += 1;
  state.power = Math.max(0, n(state.power, 100) - 18);
  state.finalWinter.boilerStrain = Math.min(10, state.finalWinter.boilerStrain + 1.4);
  bumpRoadHeat(state, 0.22, 'Smoke column tilted wrong — someone upstream noticed the stack.');
  if (!state.shiftStats) state.shiftStats = {};
  state.shiftStats.dawnIncineratorRuns = n(state.shiftStats.dawnIncineratorRuns, 0) + 1;
  state.shiftStats.powerHeavyResponses = n(state.shiftStats.powerHeavyResponses, 0) + 1;
  normalizeAnalogSurvivalState(state);
  enforceBreakerBudget(state);
  state.logs.push('[Basement] Incinerator gulp — proof becomes heat, then ash, then grid regret.');
  return { ok: true, removed: take };
}

export function applyAuditorBlackmailPass(state) {
  normalizeFinalWinterState(state);
  if (!state.dawnAuditor.active || !state.dawnAuditor.cleanupWindow) return { ok: false, reason: 'No active inspection window.' };
  if (state.dawnAuditor.cleanupUsed >= 1) return { ok: false, reason: 'Cleanup pass already committed.' };
  if (state.dawnAuditor.blackmailUsed) return { ok: false, reason: 'Leverage already spent tonight.' };
  if (!hasAuditorBlackmailLeverage(state)) return { ok: false, reason: 'Need corruption-class evidence to lean on an inspector.' };
  state.dawnAuditor.blackmailUsed = true;
  state.dawnAuditor.cleanupUsed += 1;
  state.finalWinter.blackmailUsed = true;
  state.townState = state.townState || {};
  state.townState.corruption = Math.min(10, n(state.townState.corruption, 0) + 1);
  state.shadowRep = n(state.shadowRep, 0) + 2;
  if (!state.shiftStats) state.shiftStats = {};
  state.shiftStats.dawnAuditorBlackmails = n(state.shiftStats.dawnAuditorBlackmails, 0) + 1;
  state.logs.push(
    '[Dawn] You let the auditor see the edge of something that implicates them — the clipboard closes early, and the rot deepens.'
  );
  return { ok: true };
}

export function applyFourAmFixer(state) {
  const mr = state.metaRunState && typeof state.metaRunState === 'object' ? state.metaRunState : {};
  state.metaRunState = mr;
  if (mr.fourAmFixerUsed) return { ok: false, reason: 'Fixer line already burned for this run.' };
  const minute = n(state?.shiftElapsedMinutes, 0);
  if (minute < 300 || minute > 430) return { ok: false, reason: 'Fixer only answers in the true dead hours (~2:00–5:30 AM).' };
  mr.fourAmFixerUsed = true;
  state.finalWinter = state.finalWinter || {};
  state.finalWinter.fixerDebtNight = Math.max(1, n(state.night, 1) + 1);
  state.dirtyPressure = Math.max(0, n(state.dirtyPressure, 0) - 2);
  state.shiftStats.nightEventsMissed = Math.max(0, n(state.shiftStats.nightEventsMissed, 0) - 2);
  state.townState = state.townState || {};
  state.townState.townSuspicion = Math.max(0, n(state.townState.townSuspicion, 0) - 1);
  state.dirtyLedger = state.dirtyLedger || {};
  state.dirtyLedger.totalDirtyMoney = n(state.dirtyLedger.totalDirtyMoney, 0) + 28;
  state.dirtyLedger.dirtyScore = n(state.dirtyLedger.dirtyScore, 0) + 1.2;
  if (!state.shiftStats) state.shiftStats = {};
  state.shiftStats.fourAmFixerInvoked = n(state.shiftStats.fourAmFixerInvoked, 0) + 1;
  state.logs.push(
    '[4:00 AM] A fixer picks up once per life — the mess goes quiet, but tomorrow owes a uglier favor and dirty cash lands like a receipt.'
  );
  return { ok: true };
}

export function applyFixerDebtIfDue(state) {
  const mr = state.metaRunState || {};
  if (!mr.fourAmFixerUsed) return;
  normalizeFinalWinterState(state);
  if (n(state.finalWinter.fixerDebtNight, 0) !== n(state.night, 1)) return;
  state.shadowRep = n(state.shadowRep, 0) + 2;
  bumpRoadHeat(state, 0.55, 'Fixer collection: someone upstream remembers your panic call.');
  state.logs.push('[Fixer debt] The line clicks — not a threat, a schedule. Your clean cover thinned when you begged.');
  state.finalWinter.fixerDebtNight = 0;
}

export function buildFinalWinterRenderModel(state) {
  normalizeFinalWinterState(state);
  const cold = isColdWeatherNight(state);
  const boiler = state.finalWinter.boilerStrain;
  let freezeTier = 0;
  if (cold) freezeTier += 1;
  if (boiler >= 5) freezeTier += 1;
  if (String(state?.analogSurvival?.circuits?.heating?.tier || '') === 'off') freezeTier += 1;
  freezeTier = Math.min(3, freezeTier);
  const minute = n(state?.shiftElapsedMinutes, 0);
  const fixerAvailable =
    !state.metaRunState?.fourAmFixerUsed && minute >= 300 && minute <= 430 && (n(state.dirtyPressure, 0) >= 2 || n(state.shiftStats?.nightEventsMissed, 0) >= 2);
  return {
    coldNight: cold,
    boilerStrain: Math.round(boiler * 10) / 10,
    freezeTier,
    rivalPressure: Math.round(state.finalWinter.rivalPressure * 10) / 10,
    tracePreview: computeWinterTraceBonus(state),
    blackmailAvailable: hasAuditorBlackmailLeverage(state) && !state.dawnAuditor?.blackmailUsed,
    shredderUses: state.finalWinter.shredderUses,
    incineratorUses: state.finalWinter.incineratorUses,
    fixerAvailable
  };
}

export function buildFinalWinterPrepLine(state) {
  normalizeFinalWinterState(state);
  const parts = [];
  if (isColdWeatherNight(state)) parts.push('Deep freeze: keep heating in budget or the old pipes will ask for blood.');
  if (state.finalWinter.rivalPressure >= 2) parts.push('Rival chain up-road is skimming safe traffic — dirtier rooms pay faster tonight.');
  if (state.metaRunState?.fourAmFixerUsed) parts.push('Fixer line is burned for this run — you already spent that panic.');
  return parts.join(' ');
}
