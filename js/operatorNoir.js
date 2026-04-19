/**
 * v0.37 — Switchboard eavesdrop, operator quarters monitor, earned hallucinations, desk UV traces.
 */

import { buildEvidenceItem } from './storyThreads.js';

function n(v, d = 0) {
  const x = Number(v);
  return Number.isFinite(x) ? x : d;
}

export function buildFreshOperatorNoir() {
  return {
    listensThisShift: 0,
    lastListenMinute: -1,
    lineSuspicion: 0,
    lineNoticeThisShift: 0,
    toneShiftActive: false,
    quartersUnease: 0,
    quartersOfferedThisShift: 0,
    pendingQuarters: null,
    hallucinationsThisShift: 0,
    hallucinationRevealTicks: 0,
    hallucinationRevealLog: '',
    activeHallucinationCue: '',
    strainPeak: 0,
    overheardUseful: 0,
    overheardPartial: 0,
    overheardMisinfo: 0,
    quartersFalseAlarms: 0,
    quartersRealFindings: 0,
    lastQuartersOutcome: ''
  };
}

export function normalizeOperatorNoirState(state) {
  if (!state || typeof state !== 'object') return state;
  const base = buildFreshOperatorNoir();
  const cur = state.operatorNoir && typeof state.operatorNoir === 'object' ? state.operatorNoir : {};
  state.operatorNoir = {
    ...base,
    ...cur,
    lineSuspicion: Math.max(0, Math.min(12, n(cur.lineSuspicion, 0))),
    quartersUnease: Math.max(0, Math.min(8, n(cur.quartersUnease, 0))),
    pendingQuarters:
      cur.pendingQuarters && typeof cur.pendingQuarters === 'object'
        ? {
            kind: String(cur.pendingQuarters.kind || 'shadow'),
            label: String(cur.pendingQuarters.label || ''),
            offeredMinute: n(cur.pendingQuarters.offeredMinute, -1)
          }
        : null
  };
  return state;
}

export function resetOperatorNoirForNewNight(state) {
  normalizeOperatorNoirState(state);
  const carry = Math.floor(n(state.operatorNoir.quartersUnease, 0) * 0.35);
  state.operatorNoir = {
    ...buildFreshOperatorNoir(),
    quartersUnease: Math.min(4, carry)
  };
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

export function computeOperatorStrainScore(state) {
  normalizeOperatorNoirState(state);
  const analog = state.analogSurvival || {};
  const fatigue = n(analog.operatorFatigue, 0);
  const rebound = n(analog.fatigueReboundTurns, 0) > 0 ? 18 : 0;
  const strongStim = n(analog.stimUses?.strong, 0) > 0 ? 6 : 0;
  const pr = state.protectedRoom || {};
  const r9 = n(pr.pressureLevel, 0) * 7 + (pr.knownToPlayer ? 4 : 0);
  const nem = state.nemesis?.active ? 10 + n(state.nemesis.pressureLevel, 0) * 3 : 0;
  const hunt = Boolean(state.huntNight?.active && !state.huntNight?.resolved) ? 12 : 0;
  const blackout =
    String(state?.blackoutState?.level || '') === 'full'
      ? 14
      : String(state?.blackoutState?.level || '') === 'partial'
        ? 7
        : 0;
  const stormish =
    /storm|wind|black/i.test(String(state?.weather?.headline || state?.weather?.summary || '')) ? 8 : 0;
  const lineSus = n(state.operatorNoir.lineSuspicion, 0) * 2.2;
  const town = n(state.townState?.corruption, 0) + n(state.townState?.townSuspicion, 0) * 0.4;
  let score =
    fatigue * 0.42 + rebound + strongStim + r9 + nem + hunt + blackout + stormish + lineSus + town * 0.35;
  score += n(state.operatorNoir.quartersUnease, 0) * 1.5;
  return Math.min(120, Math.round(score));
}

export function canListenSwitchboard(state) {
  normalizeOperatorNoirState(state);
  const on = state.operatorNoir;
  if (on.listensThisShift >= 3) {
    return { ok: false, reason: 'Switchboard taps are maxed for this shift — further listens risk a hard trace.' };
  }
  const elapsed = n(state.shiftElapsedMinutes, 0);
  if (on.lastListenMinute >= 0 && elapsed - on.lastListenMinute < 9) {
    return { ok: false, reason: 'Line still ringing in your head — wait a few minutes before another tap.' };
  }
  return { ok: true };
}

function pickOccupiedRoom(state) {
  const rooms = Array.isArray(state.rooms) ? state.rooms : [];
  const occ = rooms.filter((r) => r?.occupiedBy);
  if (!occ.length) return null;
  return occ[Math.floor(Math.random() * occ.length)];
}

function rollListenOutcome(state, lineKey) {
  const strain = computeOperatorStrainScore(state);
  const sus = n(state.operatorNoir.lineSuspicion, 0);
  const r = Math.random();
  const misinfoBias =
    (strain >= 78 ? 0.08 : 0) + (sus >= 4 ? 0.06 : 0) + (String(state?.blackoutState?.level || '') === 'full' ? 0.05 : 0);
  if (r < 0.1 + misinfoBias) return 'misinfo';
  if (r < 0.22 + misinfoBias * 0.5) return 'partial';
  if (r < 0.34 + sus * 0.02) return 'noisy';
  if (r < 0.44 + sus * 0.025) return 'notice';
  if (r < 0.52 + (state.operatorNoir.toneShiftActive ? 0.04 : 0)) return 'tone';
  return 'good';
}

function buildLineIntel(state, lineKey, outcome) {
  const room = pickOccupiedRoom(state);
  const roomLabel = room?.label || (room ? `Room ${room.id}` : 'empty house lines');
  const guestName = room?.occupiedBy ? String(room.occupiedBy) : 'an empty line';
  const town = state.townState || {};
  const bagman = String(town.bagmanName || 'the bagman');
  const r9 = state.protectedRoom || {};

  const truths = {
    house: () => {
      if (!room?.occupiedBy) return 'House wire: hollow air — no live room pressure on that pair.';
      const forged = room?.guestSnapshot?.forgeryProfile?.isForged || room?.guestSnapshot?.forged;
      if (forged) {
        return `House wire on ${roomLabel}: two voices compare papers — one says the name on file is a convenience, not a birth name.`;
      }
      return `House wire on ${roomLabel}: low argument about money held "off the desk" — not in the safe, they say, "in the wall."`;
    },
    trunk: () =>
      `Trunk line: clipped coordination — someone names a pickup window near dawn and a rear door, not the lobby.`,
    town: () =>
      n(town.corruption, 0) > 0 || town.bagmanPayoffs > 0
        ? `Town trunk: two voices trade a badge tail number and "${bagman}" without using a name twice the same way.`
        : `Town trunk: nothing but carrier hum — corruption may be real, but this route is dead tonight.`,
    owner: () =>
      r9.knownToPlayer || n(r9.pressureLevel, 0) > 0
        ? `Owner-route static: buried under hash, you catch "do not reroute nine" — then dead air.`
        : `Owner-route: clean dial tone pretending to be innocent — which is its own kind of answer.`
  };

  const partials = {
    house: () =>
      room?.occupiedBy
        ? `House wire (${roomLabel}): fragments only — something about a bag, maybe a vehicle. Nothing you can log clean.`
        : 'House wire: static spikes — you almost had a read, then the pair goes whisper-quiet.',
    trunk: () => 'Trunk line: half of a time — "three" something — then a truck passes on the mic.',
    town: () => 'Town trunk: laughter that does not match the words — could be a joke, could be a code.',
    owner: () => 'Owner-route: a stuttered room digit — could be real, could be a mis-dial ghost.'
  };

  const misinfos = {
    house: () =>
      `House wire: a confident voice claims ${guestName} already checked out — your board says otherwise. (Unverified.)`,
    trunk: () => 'Trunk line: urgent meet at the lobby in ten — sounds staged; nothing shows on cameras.',
    town: () => `Town trunk: someone insists ${bagman} is "out of rotation" — contradicts what the lot already told you.`,
    owner: () => 'Owner-route: a calm voice reads a false room count — does not match your unlocked cap.'
  };

  const key =
    lineKey === 'trunk'
      ? 'trunk'
      : lineKey === 'town'
        ? 'town'
        : lineKey === 'owner'
          ? 'owner'
          : 'house';

  if (outcome === 'misinfo') return { text: misinfos[key](), tag: 'misinfo' };
  if (outcome === 'partial') return { text: partials[key](), tag: 'partial' };
  if (outcome === 'good') return { text: truths[key](), tag: 'good' };
  if (outcome === 'noisy') return { text: `${key === 'house' ? 'House' : key === 'trunk' ? 'Trunk' : key === 'town' ? 'Town' : 'Owner'} line: hash and breathing — almost nothing usable.`, tag: 'noisy' };
  if (outcome === 'notice') {
    return {
      text: 'The pair goes dead-quiet — then a deliberate tap on glass far from the phone. Someone may know the wire is live.',
      tag: 'notice'
    };
  }
  return {
    text: 'Tone shift on the open line: voices flatten into politeness — the kind that follows a warning.',
    tag: 'tone'
  };
}

export function performSwitchboardListen(state, lineKey) {
  normalizeOperatorNoirState(state);
  const gate = canListenSwitchboard(state);
  if (!gate.ok) return { ok: false, reason: gate.reason };

  const safeKey = ['house', 'trunk', 'town', 'owner'].includes(lineKey) ? lineKey : 'house';
  if (safeKey === 'town') {
    const corrupt = n(state?.townState?.corruption, 0) >= 1;
    const bag = n(state?.townState?.bagmanPayoffs, 0) > 0;
    const police = Boolean(state?.townState?.policeCompromised);
    if (!corrupt && !bag && !police) {
      return { ok: false, reason: 'Town trunk is cold until outside corruption leaves a mark on the wires.' };
    }
  }

  const outcome = rollListenOutcome(state, safeKey);
  const intel = buildLineIntel(state, safeKey, outcome);

  const on = state.operatorNoir;
  on.listensThisShift += 1;
  on.lastListenMinute = n(state.shiftElapsedMinutes, 0);
  if (outcome === 'notice' || outcome === 'tone') {
    on.lineSuspicion = Math.min(12, on.lineSuspicion + (outcome === 'notice' ? 3 : 2));
  } else if (outcome === 'noisy') {
    on.lineSuspicion = Math.min(12, on.lineSuspicion + 1);
  } else {
    on.lineSuspicion = Math.max(0, on.lineSuspicion - 0.25);
  }

  if (!state.shiftStats) state.shiftStats = {};
  state.shiftStats.switchboardListens = n(state.shiftStats.switchboardListens, 0) + 1;

  if (intel.tag === 'good') {
    on.overheardUseful += 1;
    state.shiftStats.switchboardUsefulIntel = n(state.shiftStats.switchboardUsefulIntel, 0) + 1;
  } else if (intel.tag === 'partial' || intel.tag === 'noisy') {
    on.overheardPartial += 1;
    state.shiftStats.switchboardPartialIntel = n(state.shiftStats.switchboardPartialIntel, 0) + 1;
  } else if (intel.tag === 'misinfo') {
    on.overheardMisinfo += 1;
    state.shiftStats.switchboardBadIntel = n(state.shiftStats.switchboardBadIntel, 0) + 1;
  }

  if (outcome === 'notice') {
    on.lineNoticeThisShift += 1;
    state.shiftStats.switchboardLineNotices = n(state.shiftStats.switchboardLineNotices, 0) + 1;
    if (on.lineNoticeThisShift === 1) {
      state.reputation = Math.max(0, n(state.reputation, 50) - 1);
      state.logs.push('Switchboard: a guest-side hush suggests someone felt the listen — small reputation nick.');
    }
  }
  if (outcome === 'tone') {
    on.toneShiftActive = true;
    state.shiftStats.switchboardToneShifts = n(state.shiftStats.switchboardToneShifts, 0) + 1;
    if (state.factions && typeof state.factions.guests === 'number') {
      state.factions.guests = Math.max(-8, n(state.factions.guests, 0) - 1);
    }
  }

  state.logs.push(`Switchboard (${safeKey}): ${intel.text}`);

  return { ok: true, lineKey: safeKey, outcome, text: intel.text, tag: intel.tag };
}

export function maybeOfferQuartersAnomaly(state) {
  normalizeOperatorNoirState(state);
  const on = state.operatorNoir;
  if (on.pendingQuarters) return false;
  if (on.quartersOfferedThisShift >= 1) return false;
  const strain = computeOperatorStrainScore(state);
  if (strain < 52 && on.quartersUnease < 3) return false;
  const roll = Math.random();
  const threshold = 0.008 + Math.max(0, strain - 52) * 0.00035 + on.quartersUnease * 0.004;
  if (roll > threshold) return false;

  const kinds = ['closet', 'shadow', 'stillness'];
  const kind = kinds[Math.floor(Math.random() * kinds.length)];
  const labels = {
    closet: 'Back-room closet: edge cracked — no recall of leaving it that way.',
    shadow: 'Quarters cam: a shape crosses too smooth, too slow for staff timing.',
    stillness: 'Quarters feed: nothing moves for too long — even dust feels staged.'
  };
  on.pendingQuarters = {
    kind,
    label: labels[kind],
    offeredMinute: n(state.shiftElapsedMinutes, 0)
  };
  on.quartersOfferedThisShift += 1;
  on.quartersUnease = Math.min(8, on.quartersUnease + 1);
  state.logs.push(`Operator quarters monitor: ${labels[kind]}`);
  return true;
}

export function resolveQuartersChoice(state, choice) {
  normalizeOperatorNoirState(state);
  if (!state.operatorNoir.pendingQuarters) return { ok: false, reason: 'No quarters anomaly pending.' };
  const on = state.operatorNoir;
  const kind = on.pendingQuarters.kind;
  on.pendingQuarters = null;

  if (!state.shiftStats) state.shiftStats = {};
  if (choice === 'check') {
    state.shiftStats.operatorQuartersChecked = n(state.shiftStats.operatorQuartersChecked, 0) + 1;
    const r = Math.random();
    if (r < 0.42) {
      on.quartersFalseAlarms += 1;
      state.shiftStats.operatorQuartersFalseAlarms = n(state.shiftStats.operatorQuartersFalseAlarms, 0) + 1;
      on.lastQuartersOutcome = 'false_alarm';
      return {
        ok: true,
        outcome: 'false_alarm',
        log: 'You clear the back room yourself — closet latch was vibration, nothing staged. False alarm, but the lobby went unwatched.'
      };
    }
    if (r < 0.54) {
      const analog = state.analogSurvival || (state.analogSurvival = {});
      analog.operatorFatigue = Math.max(0, n(analog.operatorFatigue, 0) - 5);
      on.lastQuartersOutcome = 'steady';
      return {
        ok: true,
        outcome: 'steady',
        log: 'Hands on the frame, breath steady — the quarters are empty, and proving it calms your read for a beat.'
      };
    }
    if (r < 0.72) {
      state.reputation = Math.max(0, n(state.reputation, 50) - 1);
      on.lastQuartersOutcome = 'exposed_lobby';
      return {
        ok: true,
        outcome: 'exposed_lobby',
        log: 'Time away from glass cost a visible gap — someone noted the desk was empty too long.'
      };
    }
    if (r < 0.86) {
      on.quartersRealFindings += 1;
      state.shiftStats.operatorQuartersFindings = n(state.shiftStats.operatorQuartersFindings, 0) + 1;
      appendEvidence(state, 'operator-backroom-splinter', kind);
      on.lastQuartersOutcome = 'tamper';
      return {
        ok: true,
        outcome: 'tamper',
        log: 'Not paranoia — fresh splinter on the back-room frame. You bag a physical strip for the locker.'
      };
    }
    if (!state.analogSurvival) state.analogSurvival = {};
    state.analogSurvival.operatorFatigue = Math.min(
      100,
      n(state.analogSurvival.operatorFatigue, 0) + 4
    );
    on.lastQuartersOutcome = 'fear';
    return {
      ok: true,
      outcome: 'fear',
      log: 'The space is wrong in a way you cannot file — nerves spike anyway.'
    };
  }

  state.shiftStats.operatorQuartersIgnored = n(state.shiftStats.operatorQuartersIgnored, 0) + 1;
  const haunt = Math.random() < 0.1 && (kind === 'shadow' || kind === 'stillness');
  if (haunt) {
    state.reputation = Math.max(0, n(state.reputation, 50) - 1);
    on.lastQuartersOutcome = 'ignored_cost';
    return {
      ok: true,
      outcome: 'ignored_cost',
      log: 'You stayed at the desk — later, housekeeping reports the back-room door was ajar anyway. Small optics hit.'
    };
  }
  on.lastQuartersOutcome = 'ignored_ok';
  return { ok: true, outcome: 'ignored_ok', log: 'You keep eyes forward — the feed settles without proof either way.' };
}

export function maybeTriggerHallucination(state, opts = {}) {
  normalizeOperatorNoirState(state);
  const on = state.operatorNoir;
  if (on.hallucinationsThisShift >= 1) return null;
  if (opts.skipPassiveDrain) return null;
  const strain = computeOperatorStrainScore(state);
  if (strain < 70) return null;
  const chance = 0.012 + Math.max(0, strain - 70) * 0.00045;
  if (Math.random() > chance) return null;

  on.hallucinationsThisShift += 1;
  if (!state.shiftStats) state.shiftStats = {};
  state.shiftStats.operatorHallucinationsTriggered = n(state.shiftStats.operatorHallucinationsTriggered, 0) + 1;

  const variants = [
    {
      cue: 'Camera skim: a figure in hall 2 — second pass shows empty tile.',
      reveal: 'You blink and re-rack the feed — the corridor matches your notes. Earlier read may have been strain.'
    },
    {
      cue: 'Desk card flickers wrong name for a heartbeat — the plastic is still the same guest.',
      reveal: 'You rub your eyes and the spell breaks — the name on file never changed.'
    },
    {
      cue: 'Urgent gut: "raid inbound" — radios stay quiet; nothing hits the lot.',
      reveal: 'No corroboration lands. You file it as a false nervous spike, not intel.'
    }
  ];
  const pick = variants[Math.floor(Math.random() * variants.length)];
  on.activeHallucinationCue = pick.cue;
  on.hallucinationRevealTicks = 2;
  on.hallucinationRevealLog = pick.reveal;
  state.logs.push(`Strain read (possible false): ${pick.cue}`);
  return { alert: { type: 'warning', message: pick.cue, dedupeKey: `hallucination-${state.night}-${n(state.shiftElapsedMinutes, 0)}` } };
}

export function tickOperatorNoirAfterAdvance(state, ctx = {}) {
  normalizeOperatorNoirState(state);
  const on = state.operatorNoir;
  on.strainPeak = Math.max(on.strainPeak, computeOperatorStrainScore(state));

  const fatigue = n(state.analogSurvival?.operatorFatigue, 0);
  if (fatigue >= 62) on.quartersUnease = Math.min(8, on.quartersUnease + 0.08);
  if (state.protectedRoom?.knownToPlayer && n(state.protectedRoom.pressureLevel, 0) >= 2) {
    on.quartersUnease = Math.min(8, on.quartersUnease + 0.05);
  }
  if (state.nemesis?.active) on.quartersUnease = Math.min(8, on.quartersUnease + 0.04);

  on.lineSuspicion = Math.max(0, on.lineSuspicion - 0.04);

  if (on.hallucinationRevealTicks > 0) {
    on.hallucinationRevealTicks -= 1;
    if (on.hallucinationRevealTicks <= 0 && on.hallucinationRevealLog) {
      state.logs.push(on.hallucinationRevealLog);
      on.hallucinationRevealLog = '';
      on.activeHallucinationCue = '';
    }
  }

  if (!on.pendingQuarters) {
    maybeOfferQuartersAnomaly(state);
  }
}

export function buildOperatorUvTraceLines(state) {
  normalizeOperatorNoirState(state);
  if (!state.forensicNoir?.uvDeskLensActive) return [];
  const lines = [];
  const strain = computeOperatorStrainScore(state);
  const on = state.operatorNoir;
  if (n(on.listensThisShift, 0) > 0) {
    lines.push('UV: switchboard bakelite shows wiped numerals — older routing ghosts under reactive ink.');
  }
  if (strain >= 58) {
    lines.push('UV: desk laminate holds palm oils in a crescent where someone leaned through a long listen.');
  }
  if (on.quartersUnease >= 3 || on.quartersRealFindings > 0) {
    lines.push('UV: quarters door jamb fluoresces along fresh fiber — not housekeeping soap.');
  }
  const r9 = state.protectedRoom || {};
  if (r9.knownToPlayer && n(r9.pressureLevel, 0) >= 2) {
    lines.push('UV: tape edge on the trunk line card carries a faint "9" etch — owner routing, not guest.');
  }
  const town = state.townState || {};
  if (n(town.corruption, 0) >= 2) {
    lines.push('UV: carbon smudge on a police memo slip — someone copied a badge number then erased it.');
  }
  return lines.slice(0, 4);
}

export function buildOperatorNoirRenderModel(state) {
  normalizeOperatorNoirState(state);
  const strain = computeOperatorStrainScore(state);
  const gate = canListenSwitchboard(state);
  const townOpen =
    n(state?.townState?.corruption, 0) >= 1 ||
    n(state?.townState?.bagmanPayoffs, 0) > 0 ||
    Boolean(state?.townState?.policeCompromised);
  const lines = [
    { id: 'house', label: 'House pair', hint: 'Occupied-room pressure', disabled: false },
    { id: 'trunk', label: 'Trunk out', hint: 'Outbound coordination', disabled: false },
    {
      id: 'town',
      label: 'Town trunk',
      hint: townOpen ? 'Corruption / bagman bleed' : 'Cold until town corruption marks the wire',
      disabled: !townOpen
    },
    { id: 'owner', label: 'Owner route', hint: 'Sealed routing — static tells', disabled: false }
  ];
  return {
    strain,
    strainLabel:
      strain >= 86 ? 'Perception risk: severe' : strain >= 64 ? 'Perception risk: elevated' : strain >= 48 ? 'Strain: building' : 'Strain: steady',
    lineSuspicion: Math.round(n(state.operatorNoir.lineSuspicion, 0) * 10) / 10,
    listensUsed: n(state.operatorNoir.listensThisShift, 0),
    listensMax: 3,
    canListen: gate.ok,
    listenBlockReason: gate.reason || '',
    lines,
    quartersPending: state.operatorNoir.pendingQuarters,
    hallucinationCue: state.operatorNoir.activeHallucinationCue || '',
    toneShift: Boolean(state.operatorNoir.toneShiftActive)
  };
}
