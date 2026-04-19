/**
 * v0.38 — Border drop / fog transfer blind windows, witness pressure, maintenance shaft routing hooks.
 */

import { normalizeAnalogSurvivalState, enforceBreakerBudget } from './analogSurvival.js';
import { normalizeRoadWorldState, bumpRoadHeat } from './roadWorld.js';
import { buildEvidenceItem } from './storyThreads.js';

function n(v, d = 0) {
  const x = Number(v);
  return Number.isFinite(x) ? x : d;
}

function readWeatherPrimary(state) {
  const explicit = state?.nightWeather?.primary;
  if (explicit) return explicit;
  const scenario = String(state?.activeScenario?.label || '').toLowerCase();
  if (/storm|surge|volatile/.test(scenario)) return 'storm';
  if (/fog|mist|low.vis/.test(scenario)) return 'fog';
  if (/cold|freeze|winter/.test(scenario)) return 'cold';
  if (/rain|wet|drizzle/.test(scenario)) return 'rain';
  return 'clear';
}

export function isDenseFogNight(state) {
  return readWeatherPrimary(state) === 'fog';
}

export function buildFreshBorderTransfer() {
  return {
    phase: 'idle',
    blindTurnsRemaining: 0,
    circuitSnapshot: null,
    witnessGuest: '',
    transferThisShift: false,
    refusedHard: false,
    blindOpened: false,
    transferSucceeded: false,
    witnessPending: false,
    lastOutcomeLine: '',
    stagingSinceMinute: -1
  };
}

export function normalizeBorderTransferState(state) {
  if (!state || typeof state !== 'object') return state;
  const base = buildFreshBorderTransfer();
  const cur = state.borderTransfer && typeof state.borderTransfer === 'object' ? state.borderTransfer : {};
  state.borderTransfer = {
    ...base,
    ...cur,
    phase: ['idle', 'staging', 'blind', 'witness', 'resolved'].includes(cur.phase) ? cur.phase : 'idle',
    blindTurnsRemaining: Math.max(0, Math.min(6, n(cur.blindTurnsRemaining, 0))),
    stagingSinceMinute: n(cur.stagingSinceMinute, -1)
  };
  return state;
}

export function resetBorderTransferForNewNight(state) {
  normalizeBorderTransferState(state);
  state.borderTransfer = buildFreshBorderTransfer();
}

function appendEvidence(state, triggerId, contextLabel) {
  if (!state.evidenceLocker || typeof state.evidenceLocker !== 'object') {
    state.evidenceLocker = { items: [], mysteryFragmentsFound: 0 };
  }
  if (!Array.isArray(state.evidenceLocker.items)) state.evidenceLocker.items = [];
  const night = Math.max(1, n(state.night, 1));
  const item = buildEvidenceItem(triggerId, night, contextLabel);
  if (!item) return false;
  state.evidenceLocker.items = [...state.evidenceLocker.items, item].slice(-32);
  return true;
}

function pickWitnessGuest(state) {
  const occ = (state.rooms || []).filter((r) => r?.occupiedBy);
  if (!occ.length) return 'A lobby guest';
  const r = occ[Math.floor(Math.random() * occ.length)];
  return String(r.occupiedBy || r.guestName || 'Guest');
}

export function maybeOfferBorderTransferStaging(state, pushAlert) {
  normalizeBorderTransferState(state);
  const bt = state.borderTransfer;
  if (bt.phase !== 'idle') return;
  if (bt.transferThisShift) return;
  if (!isDenseFogNight(state)) return;
  const heat = n(state.roadWorld?.roadHeat, 0);
  const dirty = n(state.dirtyLedger?.totalDirtyMoney, 0) >= 35 || n(state.dirtyLedger?.dirtyScore, 0) >= 1;
  const corrupt = n(state.townState?.corruption, 0) >= 1;
  if (heat < 3 && !dirty && !corrupt) return;
  const minute = n(state.shiftElapsedMinutes, 0);
  if (minute < 65 || minute > 430) return;
  const chance = 0.0024 + (heat >= 6 ? 0.0022 : 0) + (dirty ? 0.0016 : 0) + (corrupt ? 0.001 : 0);
  if (Math.random() > chance) return;
  bt.phase = 'staging';
  bt.transferThisShift = true;
  bt.stagingSinceMinute = minute;
  state.logs.push(
    '[Border] Fog lot: paired tail lights idle too long. A text hits the burner stack — they want the rear lane "quiet" for a handoff.'
  );
  if (typeof pushAlert === 'function') {
    pushAlert({
      type: 'warning',
      message: 'Border transfer pressure — fog night wants a deliberate blind window on the lot.',
      dedupeKey: `border-staging-${state.night}-${minute}`
    });
  }
}

export function beginBorderBlindWindow(state) {
  normalizeBorderTransferState(state);
  normalizeAnalogSurvivalState(state);
  const bt = state.borderTransfer;
  if (bt.phase !== 'staging') return { ok: false, reason: 'No active staging window.' };
  const circuits = state.analogSurvival.circuits;
  bt.circuitSnapshot = { parking: circuits.parking.tier, cameras: circuits.cameras.tier };
  circuits.parking.tier = 'off';
  if (circuits.cameras.tier === 'full') circuits.cameras.tier = 'dim';
  else circuits.cameras.tier = 'off';
  enforceBreakerBudget(state);
  bt.phase = 'blind';
  bt.blindOpened = true;
  bt.blindTurnsRemaining = 3;
  if (!state.shiftStats) state.shiftStats = {};
  state.shiftStats.borderBlindWindows = n(state.shiftStats.borderBlindWindows, 0) + 1;
  state.logs.push(
    '[Analog] Parking and camera draw shaved — a tactical blind opens on the asphalt. Staff know not to ask why.'
  );
  state.analogSurvival.analogNightLog.push('Breaker: deliberate parking/camera shave for outside handoff.');
  return { ok: true };
}

function restoreBorderCircuits(state) {
  normalizeBorderTransferState(state);
  normalizeAnalogSurvivalState(state);
  const snap = state.borderTransfer.circuitSnapshot;
  if (!snap) return;
  state.analogSurvival.circuits.parking.tier = snap.parking;
  state.analogSurvival.circuits.cameras.tier = snap.cameras;
  state.borderTransfer.circuitSnapshot = null;
  enforceBreakerBudget(state);
}

function finalizeTransferOutcome(state) {
  normalizeBorderTransferState(state);
  const bt = state.borderTransfer;
  const roll = Math.random();
  if (!state.shiftStats) state.shiftStats = {};
  state.shiftStats.borderDropEvents = n(state.shiftStats.borderDropEvents, 0) + 1;
  if (roll < 0.52) {
    bt.transferSucceeded = true;
    state.dirtyLedger = state.dirtyLedger || {};
    state.dirtyLedger.totalDirtyMoney = n(state.dirtyLedger.totalDirtyMoney, 0) + 22;
    state.shadowRep = n(state.shadowRep, 0) + 1;
    bumpRoadHeat(state, 0.45, 'The corridor used your blind — route heat remembers the favor.');
    if (Math.random() < 0.55) appendEvidence(state, 'border-transfer-slip', 'Fog lot');
    if (Math.random() < 0.28) appendEvidence(state, 'route-token-smudge', 'Pump island');
    if (Math.random() < 0.22) appendEvidence(state, 'cargo-tag-fragment', 'Asphalt');
    state.logs.push('[Border] Handoff completed in the blind — dirty cash landed, route memory thickened.');
    bt.lastOutcomeLine = 'Transfer cleared under fog.';
  } else if (roll < 0.78) {
    bumpRoadHeat(state, 0.65, 'Something spooked the second vehicle — tires, not taillights, leaving fast.');
    state.logs.push('[Border] Partial handoff — engines scatter; you still own the optics gap you opened.');
    bt.lastOutcomeLine = 'Transfer partial — heat rose.';
  } else {
    bumpRoadHeat(state, 0.9, 'A cruiser silhouette swept the off-ramp — wrong night to be clever.');
    if (state.townState) state.townState.townSuspicion = Math.min(10, n(state.townState.townSuspicion, 0) + 1);
    state.logs.push('[Border] Blind window bought heat without a clean payoff — outside eyes may have clocked the gap.');
    bt.lastOutcomeLine = 'Transfer messy — suspicion ticked.';
  }
  if (Math.random() < 0.26) {
    bt.phase = 'witness';
    bt.witnessPending = true;
    bt.witnessGuest = pickWitnessGuest(state);
    state.shiftStats.borderWitnessEvents = n(state.shiftStats.borderWitnessEvents, 0) + 1;
    state.logs.push(
      `[Witness] ${bt.witnessGuest} stepped into the fog strip while circuits were shaved — they saw shape, not story.`
    );
  } else {
    bt.phase = 'resolved';
  }
}

export function tickBorderTransferDuringShift(state, pushAlert) {
  normalizeBorderTransferState(state);
  const bt = state.borderTransfer;
  if (bt.phase === 'blind' && bt.blindTurnsRemaining > 0) {
    bt.blindTurnsRemaining -= 1;
    if (bt.blindTurnsRemaining === 2 && Math.random() < 0.14) {
      bumpRoadHeat(state, 0.25, 'Hallway spillover: someone upstairs heard the lot go too quiet.');
    }
    if (bt.blindTurnsRemaining <= 0) {
      restoreBorderCircuits(state);
      finalizeTransferOutcome(state);
      if (typeof pushAlert === 'function' && bt.phase === 'witness') {
        pushAlert({
          type: 'warning',
          message: `Witness pressure: ${bt.witnessGuest} caught the blind window.`,
          dedupeKey: `border-witness-${state.night}-${n(state.shiftElapsedMinutes, 0)}`
        });
      }
    }
  }
}

export function refuseBorderTransfer(state) {
  normalizeBorderTransferState(state);
  if (state.borderTransfer.phase !== 'staging') return { ok: false, reason: 'Nothing to refuse.' };
  state.borderTransfer.phase = 'resolved';
  state.borderTransfer.refusedHard = true;
  bumpRoadHeat(state, 0.85, 'Outside runners mark the refusal — the motel is not neutral anymore.');
  if (state.factions) state.factions.ownership = Math.max(-8, n(state.factions.ownership, 0) - 1);
  state.logs.push('[Border] You kept the lot lit. The convoy dissolves — ownership will hear about the hard no.');
  return { ok: true };
}

export function logBorderTransferHonest(state) {
  normalizeBorderTransferState(state);
  if (state.borderTransfer.phase !== 'staging') return { ok: false, reason: 'Nothing to log.' };
  state.borderTransfer.phase = 'resolved';
  state.reputation = Math.max(0, n(state.reputation, 50) + 1);
  if (state.townState) state.townState.townSuspicion = Math.min(10, n(state.townState.townSuspicion, 0) + 1);
  appendEvidence(state, 'witness-note-scribble', 'Scanner memo');
  state.logs.push('[Border] You logged a vague scanner memo — honest enough to hurt optics, loud enough to scare runners off tonight.');
  return { ok: true };
}

export function resolveBorderWitnessChoice(state, choiceId) {
  normalizeBorderTransferState(state);
  if (state.borderTransfer.phase !== 'witness' || !state.borderTransfer.witnessPending) {
    return { ok: false, reason: 'No witness complication active.' };
  }
  const g = state.borderTransfer.witnessGuest || 'Guest';

  if (choiceId === 'witness-hush') {
    const cost = 18;
    if (n(state.money, 0) < cost) return { ok: false, reason: 'Need $18 to hush quietly.' };
    state.money = Math.max(0, n(state.money, 0) - cost);
    state.logs.push(`[Witness] You bought ${g} a cab and silence — cheap compared to a statement.`);
  } else if (choiceId === 'witness-bribe-dirty') {
    if (n(state.dirtyLedger?.totalDirtyMoney, 0) < 14) return { ok: false, reason: 'Need $14 dirty to grease the witness pocket.' };
    state.dirtyLedger.totalDirtyMoney = Math.max(0, n(state.dirtyLedger.totalDirtyMoney, 0) - 14);
    state.shadowRep = n(state.shadowRep, 0) + 1;
    state.logs.push(`[Witness] ${g} took an envelope that did not come from the till — the network remembers favors.`);
  } else if (choiceId === 'witness-eject') {
    state.reputation = Math.max(0, n(state.reputation, 50) - 2);
    if (!state.shiftStats) state.shiftStats = {};
    state.shiftStats.harshDeskActions = n(state.shiftStats.harshDeskActions, 0) + 1;
    state.logs.push(`[Witness] ${g} was walked off property hard — the story does not die, it just moves off-site.`);
  } else if (choiceId === 'witness-log') {
    state.reputation = Math.max(0, n(state.reputation, 50) + 2);
    if (state.townState) state.townState.townSuspicion = Math.min(10, n(state.townState.townSuspicion, 0) + 1);
    appendEvidence(state, 'witness-note-scribble', g);
    state.logs.push(`[Witness] You filed ${g}'s statement clean — brave, and the town clipboard gets heavier.`);
  } else {
    return { ok: false, reason: 'Unknown witness choice.' };
  }

  state.borderTransfer.witnessPending = false;
  state.borderTransfer.phase = 'resolved';
  if (!state.shiftStats) state.shiftStats = {};
  state.shiftStats.borderWitnessResolutions = n(state.shiftStats.borderWitnessResolutions, 0) + 1;
  return { ok: true };
}

export function roomEligibleForShaftRouting(state, room) {
  if (!room?.serviceState?.pendingRequest) return false;
  if (!isDenseFogNight(state) && n(state.roadWorld?.roadHeat, 0) < 5) return false;
  const hall = n(state?.crisisEscalation?.hallwayThreatLevel, 0) >= 2;
  const chain = n(room.chainPressure, 0) >= 4;
  const staging = state.borderTransfer?.phase === 'blind' || state.borderTransfer?.phase === 'staging';
  return hall || chain || staging;
}

export function getShaftDispatchSpec(baseSpec) {
  return {
    ...baseSpec,
    moneyCost: n(baseSpec.moneyCost, 4) + 2,
    successChance: Math.min(0.9, n(baseSpec.successChance, 0.72) + 0.08),
    overreactionRisk: n(baseSpec.overreactionRisk, 0.14) + 0.06,
    powerCost: n(baseSpec.powerCost, 2)
  };
}

export function noteShaftDispatchOutcome(state, success) {
  if (!state.shiftStats) state.shiftStats = {};
  state.shiftStats.borderShaftDispatches = n(state.shiftStats.borderShaftDispatches, 0) + 1;
  state.logs.push(
    success
      ? '[Staff] Shaft route: dark service spine — faster, but the crew felt the squeeze.'
      : '[Staff] Shaft route went wrong in black air — morale took the hit before the guest did.'
  );
}

export function buildBorderTransferRenderModel(state) {
  normalizeBorderTransferState(state);
  const bt = state.borderTransfer;
  const fog = isDenseFogNight(state);
  return {
    phase: bt.phase,
    fogDense: fog,
    blindTurnsRemaining: bt.blindTurnsRemaining,
    witnessGuest: bt.witnessGuest,
    witnessPending: Boolean(bt.witnessPending),
    stagingActive: bt.phase === 'staging',
    blindActive: bt.phase === 'blind',
    blindWarning:
      bt.phase === 'blind'
        ? `Blind window active — ${bt.blindTurnsRemaining} tick(s) until circuits restore and the lot retells itself.`
        : '',
    outcomeEcho: bt.lastOutcomeLine || ''
  };
}

export function buildBorderTransferPrepLine(state) {
  normalizeBorderTransferState(state);
  if (!isDenseFogNight(state)) return '';
  if (n(state.roadWorld?.roadHeat, 0) >= 4) {
    return 'Fog + route heat: border drops are likelier tonight — only shave breakers if you mean the blind.';
  }
  if (n(state.campaign?.totals?.borderBlindWindows, 0) >= 2) {
    return 'Prior nights show you have opened blind windows before — the corridor may test you again under fog.';
  }
  return '';
}
