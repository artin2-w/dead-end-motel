/**
 * Dead End Motel v0.59 — Physical desk: lobby phone, switchboard, lobby view,
 * radio, printer, dispatch wait, contraband drawer. Defensive; itch-safe.
 */

import { pushLiveAlert } from './presentation.js';
import { attemptListenInRoom, ensureV57State } from './v57-suspicion-layer.js';
import { tryV58VoiceIntercept } from './v58-living-motel.js';
import { isV59DevEnabled, tickV59ParanoiaMaybe, forceParanoiaGlitch } from './v59-paranoia.js';
import { dispatchStaffResponse } from './response.js';
import { applyV60MemoryFromDecision, recordV60RadioListen } from './v60-motel-memory.js';

function v59PhoneDevLog(message) {
  if (!isV59DevEnabled()) return;
  try {
    console.info(`[v59 phone] ${message}`);
  } catch {
    /* ignore */
  }
}

const PHONE_RING_BUCKET = 22;
const PHONE_RING_P = 0.11;
const HOLD_MS = 3000;
const DISPATCH_WAIT_MS = 42000;

const CALL_LINES = {
  room: [
    '…there is someone standing by the bathroom door.',
    'The mirror is facing the wrong wall.',
    'I can hear the vent talking back.'
  ],
  front: ['…you left the glass unlocked.', 'The lobby light keeps strobing when no one is there.'],
  unknown: ['…do not send staff to room 2.', 'Do not look at the sign tonight.'],
  parking: ['The lights just went out by the last car.', 'Someone is pacing the white lines.'],
  booth: ['Do not answer the booth after two.', 'The handset is warm and nobody called.']
};

const RADIO_BANKS = {
  police: [
    'Dispatch reports black sedan with damaged plate heading toward county road.',
    'Suspect described as wearing a yellow jacket.',
    'Units request motel lot check — possible false registration.'
  ],
  dead: [
    '…Room 04 is not empty…',
    'Three knocks, then silence.',
    'If you hear your own voice, hang up.'
  ],
  motel: [
    'Utility line unstable near basement feed.',
    'Old clerk says never answer the booth after two.',
    'Housekeeping channel: we are one towel short on every floor.'
  ]
};

const CONTRA_ITEMS = [
  { id: 'wallet', label: 'Stolen wallet', heat: 1 },
  { id: 'passport', label: 'Forged passport', heat: 2 },
  { id: 'vhs', label: 'Unlabeled VHS tape', heat: 1 },
  { id: 'blood-key', label: 'Blood-marked room key', heat: 2 },
  { id: 'fuel', label: 'Black-market fuel card', heat: 2 },
  { id: 'envelope', label: 'Sealed envelope', heat: 1 },
  { id: 'master', label: 'Motel master key copy', heat: 3 }
];

export function ensureV59State(state) {
  if (!state || typeof state !== 'object') return;
  if (!state.v59 || typeof state.v59 !== 'object') state.v59 = {};
  const v = state.v59;
  if (!v.phone || typeof v.phone !== 'object') {
    v.phone = {
      activeCall: null,
      answeredCount: 0,
      missedCount: 0,
      lastCallMinute: -999,
      callLog: [],
      holdProgress: 0,
      holdArmed: false,
      ringBucket: -1,
      lastTranscript: null,
      devRingPulse: 0
    };
  }
  if (!Array.isArray(v.phone.callLog)) v.phone.callLog = [];
  if (v.phone.lastTranscript != null && typeof v.phone.lastTranscript !== 'object') v.phone.lastTranscript = null;
  if (typeof v.phone.devRingPulse !== 'number') v.phone.devRingPulse = 0;
  if (v.phone && typeof v.phone === 'object') {
    if (!('lastTranscript' in v.phone)) v.phone.lastTranscript = null;
    if (!('devRingPulse' in v.phone)) v.phone.devRingPulse = 0;
  }
  if (!v.switchboard || typeof v.switchboard !== 'object') {
    v.switchboard = {
      deskSelected: false,
      connectedRoomId: null,
      lastListenMinuteByRoom: {},
      listenCount: 0
    };
  }
  if (!v.switchboard.lastListenMinuteByRoom || typeof v.switchboard.lastListenMinuteByRoom !== 'object') {
    v.switchboard.lastListenMinuteByRoom = {};
  }
  if (!v.lobby || typeof v.lobby !== 'object') {
    v.lobby = {
      lastRaiseMinute: -999,
      lastOutcome: null,
      sightings: [],
      activeThreat: null,
      overlayOpen: false,
      overlayState: null
    };
  }
  if (!v.radio || typeof v.radio !== 'object') {
    v.radio = {
      frequency: 91.5,
      lastScanMinute: -999,
      discoveredSignals: [],
      listenCount: 0,
      lastLine: ''
    };
  }
  if (!Array.isArray(v.radio.discoveredSignals)) v.radio.discoveredSignals = [];
  if (!v.printer || typeof v.printer !== 'object') {
    v.printer = {
      jammed: false,
      smackCount: 0,
      lastJamMinute: -999,
      printedCount: 0,
      lines: [],
      modalOpen: false,
      printGeneration: 0
    };
  }
  if (typeof v.printer.printGeneration !== 'number') v.printer.printGeneration = 0;
  if (!v.contraband || typeof v.contraband !== 'object') {
    v.contraband = {
      items: [],
      heat: 0,
      reported: 0,
      confiscated: 0,
      ignored: 0,
      pendingChoice: null
    };
  }
  if (!Array.isArray(v.contraband.items)) v.contraband.items = [];
  if (!Array.isArray(v.dispatches)) v.dispatches = [];
  if (!v.dispatchWait || typeof v.dispatchWait !== 'object') {
    v.dispatchWait = { active: false, dueAt: 0, payload: null, signalLost: false, crisis: null };
  }
  if (typeof v.printer.jamClears !== 'number') v.printer.jamClears = 0;
  if (!v.paranoia || typeof v.paranoia !== 'object') {
    v.paranoia = { level: 'stable', lastGlitchMinute: -999, uiLieActiveUntil: 0, glitchCount: 0 };
  }
}

export function resetV59ForNewShift(state) {
  if (!state?.v59) return;
  try {
    if (state.v59._dispatchTimer) clearTimeout(state.v59._dispatchTimer);
  } catch {
    /* ignore */
  }
  state.v59._dispatchTimer = null;
  state.v59.dispatchWait = { active: false, dueAt: 0, payload: null, signalLost: false, crisis: null };
  state.v59.phone.activeCall = null;
  state.v59.phone.holdProgress = 0;
  state.v59.phone.holdArmed = false;
  state.v59.phone.ringBucket = -1;
  state.v59.phone.lastTranscript = null;
  state.v59.phone.devRingPulse = 0;
  state.v59.switchboard.deskSelected = false;
  state.v59.switchboard.connectedRoomId = null;
  state.v59.switchboard.lastListenMinuteByRoom = {};
  state.v59.lobby.overlayOpen = false;
  state.v59.lobby.overlayState = null;
  state.v59.printer.modalOpen = false;
  state.v59.printer.jammed = false;
  state.v59.printer.lines = [];
  state.v59.contraband.pendingChoice = null;
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)] || '';
}

export function tryV59PhoneRing(state, audioController) {
  if (!state) return;
  ensureV59State(state);
  if (state.v59.phone.activeCall) return;
  const elapsed = Number(state.shiftElapsedMinutes || 0);
  const bucket = Math.floor(elapsed / PHONE_RING_BUCKET);
  if (bucket === state.v59.phone.ringBucket) return;
  state.v59.phone.ringBucket = bucket;
  if (elapsed - Number(state.v59.phone.lastCallMinute || -999) < 14) return;
  if (Math.random() > PHONE_RING_P) return;

  let chance = 0.12;
  const pressure = String(state?.uiPressureLevel || 'calm');
  if (pressure !== 'calm') chance += 0.06;
  const wx = String(state?.v58?.weather?.type || '');
  if (wx === 'storm' || wx === 'rain' || wx === 'fog') chance += 0.05;
  const occ = (state.rooms || []).filter((r) => r?.occupied).length;
  if (occ > 0) chance += 0.04;
  if ((state.v58?.shadowTraces || []).length) chance += 0.04;
  if (Math.random() > chance) return;

  const sources = ['room', 'front', 'unknown', 'parking', 'booth'];
  const weights = [occ > 0 ? 0.28 : 0.1, 0.18, 0.2, 0.18, 0.16];
  const r = Math.random() * weights.reduce((a, b) => a + b, 0);
  let acc = 0;
  let src = 'unknown';
  for (let i = 0; i < sources.length; i += 1) {
    acc += weights[i];
    if (r <= acc) {
      src = sources[i];
      break;
    }
  }
  const room =
    src === 'room' && occ > 0
      ? (state.rooms || []).filter((x) => x?.occupied)[Math.floor(Math.random() * occ)]
      : null;
  const label =
    src === 'room' && room
      ? String(room.label || `Room ${room.id}`)
      : src === 'front'
        ? 'FRONT LINE'
        : src === 'parking'
          ? 'PARKING LOT'
          : src === 'booth'
            ? 'PHONE BOOTH'
            : 'UNKNOWN';
  const line = pick(CALL_LINES[src] || CALL_LINES.unknown);
  state.v59.phone.activeCall = {
    id: `call-${Date.now()}`,
    source: src,
    label,
    line,
    ringAt: Date.now(),
    expiresAt: Date.now() + 38000,
    roomId: room?.id ?? null
  };
  state.v59.phone.lastCallMinute = elapsed;
  state.logs.push(`Lobby phone ringing — ${label}.`);
  pushLiveAlert(state, {
    type: 'warning',
    kind: 'ambient',
    message: `LOBBY PHONE · ${label}`,
    dedupeKey: `v59-phone-ring-${state.night}-${bucket}`
  });
  try {
    if (typeof audioController?.playStaticBurst === 'function') {
      audioController.playStaticBurst('light');
    } else if (typeof audioController?.playUiClick === 'function') {
      audioController.playUiClick();
    }
  } catch {
    /* ignore */
  }
}

export function tickV59PhoneExpire(state, now = Date.now()) {
  ensureV59State(state);
  const tr = state.v59.phone.lastTranscript;
  if (tr && typeof tr === 'object') {
    const ex = Number(tr.expiresAt || Number(tr.at || 0) + 18000);
    if (now > ex) state.v59.phone.lastTranscript = null;
  }
  if (!state?.v59?.phone?.activeCall) return;
  const c = state.v59.phone.activeCall;
  if (now < Number(c.expiresAt || 0)) return;
  state.v59.phone.missedCount = (state.v59.phone.missedCount || 0) + 1;
  state.v59.phone.callLog.push({ type: 'missed', label: c.label, at: now });
  state.logs.push(`Missed call from ${c.label}.`);
  pushLiveAlert(state, {
    type: 'warning',
    message: `Missed call — ${c.label}.`,
    dedupeKey: `v59-phone-miss-${c.id}`
  });
  if (c.source === 'room' && c.roomId != null) {
    state.reputation = Math.max(0, Number(state.reputation || 50) - 1);
  }
  state.v59.phone.activeCall = null;
  state.v59.phone.holdProgress = 0;
}

export function v59DismissPhoneTranscript(state) {
  if (!state?.v59?.phone) return;
  state.v59.phone.lastTranscript = null;
}

export function v59PhoneHoldStart(state) {
  if (!state?.v59?.phone?.activeCall) return;
  state.v59.phone.holdArmed = true;
  state.v59.phone.holdProgress = 0;
  state.v59.phone.holdStartTs = Date.now();
  v59PhoneDevLog('hold started');
}

export function v59PhoneHoldEnd(state) {
  if (!state?.v59?.phone) return;
  state.v59.phone.holdArmed = false;
  state.v59.phone.holdProgress = 0;
  state.v59.phone.holdStartTs = null;
}

export function v59PhoneHoldTick(state, now = Date.now()) {
  if (!state?.v59?.phone?.activeCall || !state.v59.phone.holdArmed) return 0;
  const t0 = Number(state.v59.phone.holdStartTs || now);
  const p = Math.min(1, (now - t0) / HOLD_MS);
  state.v59.phone.holdProgress = p;
  if (p >= 1) {
    const c = state.v59.phone.activeCall;
    state.v59.phone.answeredCount = (state.v59.phone.answeredCount || 0) + 1;
    state.v59.phone.callLog.push({ type: 'answered', label: c.label, at: now });
    state.logs.push(`${c.label}: "${c.line}"`);
    state.v59.phone.lastTranscript = {
      label: c.label,
      line: c.line,
      at: now,
      expiresAt: now + 18000
    };
    v59PhoneDevLog('answered');
    pushLiveAlert(state, {
      type: 'info',
      message: `${c.label}: ${c.line}`,
      dedupeKey: `v59-phone-ans-${c.id}`
    });
    if (c.roomId != null) {
      const ri = (state.rooms || []).findIndex((r) => Number(r.id) === Number(c.roomId));
      if (ri !== -1) {
        const rm = state.rooms[ri];
        state.rooms[ri] = { ...rm, condition: rm.condition === 'Stable' ? 'Watch' : rm.condition };
      }
    }
    state.v59.phone.activeCall = null;
    state.v59.phone.holdArmed = false;
    state.v59.phone.holdProgress = 0;
    return 1;
  }
  return p;
}

export function v59SwitchboardSelectDesk(state) {
  ensureV59State(state);
  state.v59.switchboard.deskSelected = true;
  state.v59.switchboard.connectedRoomId = null;
}

export function v59SwitchboardSelectRoom(state, roomId) {
  ensureV59State(state);
  if (!state.v59.switchboard.deskSelected) return false;
  state.v59.switchboard.connectedRoomId = Number(roomId);
  return true;
}

export function v59SwitchboardClear(state) {
  ensureV59State(state);
  state.v59.switchboard.deskSelected = false;
  state.v59.switchboard.connectedRoomId = null;
}

const SB_LISTEN_POWER = 4;
const SB_COOLDOWN_MIN = 22;

const SB_LINES_EMPTY = [
  'Only static.',
  'A false echo — like someone repeating a word you never said.',
  'Line open on a vacant unit. Air moving through the handset.'
];
const SB_LINES_HAUNT = [
  'Low whispering behind the wall.',
  'Dragging sound. Slow. Repeating.',
  'Two voices, but the register says the room is empty.',
  'Breathing syncs with the fluorescent ballast.',
  'Paper tearing. Then silence.',
  'The guest is not speaking, but the line is open.'
];

export function v59SwitchboardListen(state, deps) {
  ensureV59State(state);
  const rid = state.v59.switchboard.connectedRoomId;
  if (rid == null || !state.v59.switchboard.deskSelected) return false;
  const room = (state.rooms || []).find((r) => Number(r.id) === Number(rid));
  if (!room) return false;
  try {
    ensureV57State(state);
  } catch {
    /* ignore */
  }
  const now = Number(state.shiftElapsedMinutes || 0);
  const until = Number(state.v57?.listenCooldownUntil?.[rid] || 0);
  if (now < until) {
    pushLiveAlert(state, {
      type: 'info',
      message: `Switchboard cooling down for ${room.label || `Unit ${rid}`} (~${until - now} min).`,
      dedupeKey: `v59-sb-cd-${rid}`
    });
    return false;
  }
  if (Number(state.power || 0) < SB_LISTEN_POWER) {
    pushLiveAlert(state, { type: 'warning', message: 'Not enough power for switchboard listen.', dedupeKey: 'v59-sb-power' });
    return false;
  }

  if (room.occupied) {
    const ok = attemptListenInRoom(state, rid, deps);
    if (ok) {
      state.v59.switchboard.listenCount = (state.v59.switchboard.listenCount || 0) + 1;
      try {
        tryV58VoiceIntercept(state, { audioController: deps?.audioController, source: 'switchboard', chance: 0.12 });
      } catch {
        /* ignore */
      }
    }
    return ok;
  }

  state.power = Math.max(0, Number(state.power || 0) - SB_LISTEN_POWER);
  if (state.v57 && state.v57.listenCooldownUntil) {
    state.v57.listenCooldownUntil[rid] = now + SB_COOLDOWN_MIN;
  }
  const wx = String(state?.v58?.weather?.type || '');
  const distort = wx === 'storm' || wx === 'fog';
  const crit = String(room.condition || '') === 'Critical' || String(room.condition || '') === 'Watch';
  const pool = crit || distort ? SB_LINES_HAUNT : SB_LINES_EMPTY;
  let line = pick(pool);
  if (distort && Math.random() < 0.35) line = `${line} (storm static tears the syllables.)`;
  state.logs.push(`Switchboard ${room.label || rid} (vacant line): ${line}`);
  pushLiveAlert(state, {
    type: 'warning',
    kind: 'ambient',
    message: `Switchboard · ${room.label || rid}: ${line}`,
    dedupeKey: `v59-sb-vac-${rid}-${now}`
  });
  state.v59.switchboard.listenCount = (state.v59.switchboard.listenCount || 0) + 1;
  try {
    tryV58VoiceIntercept(state, { audioController: deps?.audioController, source: 'switchboard-vacant', chance: 0.07 });
  } catch {
    /* ignore */
  }
  try {
    if (Math.random() < 0.12) tickV59ParanoiaMaybe(state);
  } catch {
    /* ignore */
  }
  try {
    if (typeof deps?.audioController?.playStaticBurst === 'function') {
      deps.audioController.playStaticBurst('light');
    }
  } catch {
    /* ignore */
  }
  if (typeof deps?.progressShift === 'function' && deps.progressShift('switchboard-listen', { timeScale: 0.32 })) {
    return true;
  }
  if (typeof deps?.renderAll === 'function') deps.renderAll();
  return true;
}

const LOBBY_SCENES = [
  'empty',
  'guest-glass',
  'shadow-outside',
  'figure-counter',
  'lot-fail',
  'reflection',
  'moved'
];

const LOBBY_SCENE_META = {
  empty: {
    title: 'Lobby view — empty',
    body: 'Rain ticks on the transom. The lot lamp holds steady. Nothing claims the glass — yet.',
    glassClass: 'v59-lobby-glass--scene-empty'
  },
  'guest-glass': {
    title: 'Lobby view — guest at glass',
    body: 'A figure stands too still behind the door. Breath fogs the pane once, then not again.',
    glassClass: 'v59-lobby-glass--scene-guest'
  },
  'shadow-outside': {
    title: 'Lobby view — shape behind glass',
    body: 'The outline does not match the light. It is too tall for the awning strip you remember installing.',
    glassClass: 'v59-lobby-glass--scene-shadow'
  },
  'figure-counter': {
    title: 'Lobby view — counter wrong',
    body: 'The silhouette behind the desk is not yours. The lobby phone cord hangs straight — nobody touched it.',
    glassClass: 'v59-lobby-glass--scene-counter'
  },
  'lot-fail': {
    title: 'Lobby view — parking light',
    body: 'The lot lamp strobes once, twice, then dies. Tire marks shine wet in nothing-at-all rain.',
    glassClass: 'v59-lobby-glass--scene-lot'
  },
  reflection: {
    title: 'Lobby view — reflection',
    body: 'The reflection in the glass turns a half-second before you do.',
    glassClass: 'v59-lobby-glass--scene-reflect'
  },
  moved: {
    title: 'Lobby view — something moved',
    body: 'You look down at the monitor. When you look up, the chair behind the glass is turned.',
    glassClass: 'v59-lobby-glass--scene-moved'
  }
};

export function v59OpenLobbyView(state, forceThreat = false) {
  ensureV59State(state);
  const elapsed = Number(state.shiftElapsedMinutes || 0);
  if (!forceThreat && elapsed - Number(state.v59.lobby.lastRaiseMinute || -999) < 25) return false;
  state.v59.lobby.lastRaiseMinute = elapsed;
  let threat = forceThreat;
  if (!threat) {
    let p = 0.12;
    if (String(state?.uiPressureLevel || '') !== 'calm') p += 0.1;
    if ((state.v58?.shadowTraces || []).length) p += 0.08;
    const wx = String(state?.v58?.weather?.type || '');
    if (wx === 'storm' || wx === 'fog' || wx === 'wind') p += 0.06;
    if (Number(state?.v59?.phone?.missedCount || 0) > 0) p += 0.05;
    threat = Math.random() < p;
  }
  const scene = LOBBY_SCENES[Math.floor(Math.random() * LOBBY_SCENES.length)];
  state.v59.lobby.overlayOpen = true;
  state.v59.lobby.overlayState = { scene, threat: Boolean(threat) };
  state.v59.lobby.sightings.push({ scene, threat, minute: elapsed });
  return true;
}

export function v59CloseLobbyView(state) {
  if (!state?.v59?.lobby) return;
  state.v59.lobby.overlayOpen = false;
}

export function v59LobbyResolve(state, choiceId) {
  ensureV59State(state);
  const st = state.v59.lobby.overlayState;
  state.v59.lobby.overlayOpen = false;
  state.v59.lobby.lastOutcome = choiceId;
  if (!st?.threat) {
    state.logs.push('Lobby view: nothing answers your stare — only glass and rain.');
    return;
  }
  if (choiceId === 'lock') {
    state.power = Math.max(0, Number(state.power || 0) - 4);
    state.reputation = Math.max(0, Number(state.reputation || 50) - 1);
    state.logs.push('You throw the front lock — the lobby goes quiet, too quiet.');
    pushLiveAlert(state, {
      type: 'info',
      message: 'LOCK FRONT DOOR: −4% power, −1 rep. Outside voices go dull — immediate threat drops.',
      dedupeKey: `v59-lobby-lock-${state.night}`
    });
  } else if (choiceId === 'callout') {
    if (Math.random() < 0.45) {
      state.logs.push('You call out — only your voice returns.');
      pushLiveAlert(state, {
        type: 'warning',
        message: 'CALL OUT: Something answered. Desk pressure tightens — watch the board.',
        dedupeKey: `v59-lobby-call-bad`
      });
    } else {
      state.logs.push('You call out — the shape thins and walks away.');
      pushLiveAlert(state, {
        type: 'info',
        message: 'CALL OUT: The lobby thins out — a little air returns to the shift.',
        dedupeKey: `v59-lobby-call-ok`
      });
    }
  } else {
    state.logs.push('You look down. The monitor reflects something that was not there before.');
    pushLiveAlert(state, {
      type: 'warning',
      message: 'IGNORE: Unease stays in the building — dirty pressure +1, watch for spillover.',
      dedupeKey: `v59-lobby-ignore`
    });
    if (typeof state.dirtyPressure === 'number') {
      state.dirtyPressure = Math.min(12, Number(state.dirtyPressure || 0) + 1);
    }
  }
}

export function v59RadioTune(state, freq) {
  ensureV59State(state);
  state.v59.radio.frequency = Math.max(88, Math.min(108, Number(freq) || 91.5));
}

export function v59RadioListen(state) {
  ensureV59State(state);
  const f = Number(state.v59.radio.frequency || 91.5);
  state.v59.radio.listenCount = (state.v59.radio.listenCount || 0) + 1;
  const wx = String(state?.v58?.weather?.type || '');
  const blur = wx === 'storm' || wx === 'fog' ? 0.45 : 0.2;
  let band = 'static';
  if (Math.abs(f - 91.5) <= blur) band = 'police';
  else if (Math.abs(f - 98.3) <= blur) band = 'dead';
  else if (Math.abs(f - 103.7) <= blur) band = 'motel';

  let line = '…static…';
  if (band === 'police') line = pick(RADIO_BANKS.police);
  else if (band === 'dead') line = pick(RADIO_BANKS.dead);
  else if (band === 'motel') line = pick(RADIO_BANKS.motel);

  state.v59.radio.lastLine = line;
  if (band !== 'static') {
    if (!state.v59.radio.discoveredSignals.includes(band)) state.v59.radio.discoveredSignals.push(band);
    state.logs.push(`Radio (${f.toFixed(1)} FM): ${line}`);
    pushLiveAlert(state, {
      type: 'info',
      kind: 'ambient',
      message: `Radio ${f.toFixed(1)}: ${line}`,
      dedupeKey: `v59-radio-${band}-${state.night}-${Math.floor(f * 10)}`
    });
  }
  if (Math.random() < 0.08) {
    try {
      tickV59ParanoiaMaybe(state);
    } catch {
      /* ignore */
    }
  }
  try {
    recordV60RadioListen(state, { band, line, f });
  } catch {
    /* ignore */
  }
  return { band, line };
}

export function v59PrinterOpenSample(state) {
  ensureV59State(state);
  const logs = (state.logs || []).slice(-6);
  state.v59.printer.modalOpen = true;
  state.v59.printer.printGeneration = (state.v59.printer.printGeneration || 0) + 1;
  state.v59.printer.lines = logs.length
    ? logs.map((l) => String(l))
    : ['No shift log lines yet.', 'Printer idle.', 'Awaiting incidents…'];
}

export function v59PrinterJam(state) {
  ensureV59State(state);
  state.v59.printer.jammed = true;
  state.v59.printer.smackCount = 0;
}

export function v59PrinterSmack(state) {
  ensureV59State(state);
  if (!state.v59.printer.jammed) return false;
  state.v59.printer.smackCount = (state.v59.printer.smackCount || 0) + 1;
  if (state.v59.printer.smackCount >= 5) {
    state.v59.printer.jammed = false;
    state.v59.printer.smackCount = 0;
    state.v59.printer.printedCount = (state.v59.printer.printedCount || 0) + 1;
    state.v59.printer.jamClears = (state.v59.printer.jamClears || 0) + 1;
    return true;
  }
  return false;
}

export function v59PrinterClose(state) {
  ensureV59State(state);
  state.v59.printer.modalOpen = false;
  state.v59.printer.jammed = false;
}

export function rollDispatchSignalLost(state) {
  let p = 0.06;
  if (String(state?.uiPressureLevel || '') === 'dire' || String(state?.uiPressureLevel || '') === 'emergency') p += 0.08;
  if (String(state?.v58?.weather?.type || '') === 'storm') p += 0.05;
  if ((state.v58?.shadowTraces || []).length) p += 0.05;
  return Math.random() < p;
}

export function armDispatchWait(state, payload) {
  ensureV59State(state);
  try {
    if (state.v59._dispatchTimer) clearTimeout(state.v59._dispatchTimer);
  } catch {
    /* ignore */
  }
  const signalLost = Boolean(payload?.forceSignalLost) || rollDispatchSignalLost(state);
  state.v59.dispatchWait = {
    active: true,
    dueAt: Date.now() + DISPATCH_WAIT_MS,
    payload,
    signalLost,
    crisis: null
  };
  state.v59._dispatchTimer = setTimeout(() => {
    try {
      if (state.v59.dispatchWait.signalLost) {
        state.v59.dispatchWait.crisis = { open: true, resolved: false };
        state.v59.dispatchWait.active = true;
        window.__demV59DispatchComplete?.('crisis', state.v59.dispatchWait.payload);
      } else {
        state.v59.dispatchWait.active = false;
        window.__demV59DispatchComplete?.('apply', state.v59.dispatchWait.payload);
      }
    } catch {
      /* ignore */
    }
  }, DISPATCH_WAIT_MS);
}

export function resolveDispatchCrisis(state, choice, deps) {
  ensureV59State(state);
  const w = state.v59.dispatchWait;
  if (!w?.crisis?.open) return;
  w.crisis.resolved = true;
  w.crisis.open = false;
  if (choice === 'lockdown') {
    const now = Number(state.shiftElapsedMinutes || 0);
    try {
      ensureV57State(state);
      if (state.v57 && typeof state.v57.lobbyLockdownAvailableAtMinute === 'number') {
        state.power = Math.max(0, Number(state.power || 0) - 14);
        state.reputation = Math.max(0, Number(state.reputation || 50) - 5);
        state.v57.lobbyLockdownAvailableAtMinute = now + 95;
        (state.guests || []).forEach((g, i) => {
          if (!g) return;
          state.guests[i] = {
            ...g,
            instabilitySignal: Math.min(6, Number(g.instabilitySignal || 0) + 1)
          };
        });
        state.logs.push('Dispatch crisis: you sealed the lobby while the field team was blind.');
        pushLiveAlert(state, {
          type: 'warning',
          message: 'Crisis lockdown — doors sealed, guests agitated, power spiked.',
          dedupeKey: `v59-dispatch-crisis-lock-${state.night}`
        });
      }
    } catch {
      /* ignore */
    }
  } else if (choice === 'second') {
    state.money = Math.max(0, Number(state.money || 0) - 25);
    state.power = Math.max(0, Number(state.power || 0) - 6);
    state.logs.push('Second team scrambled — expensive, loud, effective enough.');
  } else {
    state.logs.push('Zone abandoned on the radio — pressure spills back toward the desk.');
    pushLiveAlert(state, { type: 'danger', message: 'Dispatch signal lost — you pulled back.', dedupeKey: 'v59-dispatch-abandon' });
  }
  w.active = false;
  w.signalLost = false;
  w.crisis = null;
  window.__demV59DispatchComplete?.('apply', w.payload);
}

export function tryV59ContrabandDiscovery(state, source) {
  if (!state) return false;
  ensureV59State(state);
  if (state.v59.contraband.pendingChoice) return false;
  let p = 0.04;
  if (source === 'uv-inspect') p += 0.03;
  if (source === 'id-inspect') p += 0.03;
  if (source === 'vehicle') p += 0.025;
  if (source === 'review') p += 0.035;
  if (Math.random() > p) return false;
  const item = CONTRA_ITEMS[Math.floor(Math.random() * CONTRA_ITEMS.length)];
  state.v59.contraband.pendingChoice = { ...item, source };
  pushLiveAlert(state, {
    type: 'warning',
    kind: 'actionable',
    message: `Contraband found: ${item.label} — REPORT, CONFISCATE, or IGNORE.`,
    dedupeKey: `v59-contra-${item.id}-${state.night}`
  });
  return true;
}

export function v59ContrabandResolve(state, choice) {
  ensureV59State(state);
  const p = state.v59.contraband.pendingChoice;
  if (!p) return;
  state.v59.contraband.pendingChoice = null;
  if (choice === 'report') {
    state.v59.contraband.reported += 1;
    state.reputation = Math.min(100, Number(state.reputation || 50) + 1);
    state.logs.push(`Contraband reported: ${p.label}.`);
    try {
      applyV60MemoryFromDecision(state, { kind: 'contraband-report' });
    } catch {
      /* ignore */
    }
  } else if (choice === 'confiscate') {
    state.v59.contraband.confiscated += 1;
    state.v59.contraband.items.push({ ...p, at: state.shiftElapsedMinutes });
    state.v59.contraband.heat = Math.min(20, Number(state.v59.contraband.heat || 0) + Number(p.heat || 1));
    state.logs.push(`Contraband seized to drawer: ${p.label}.`);
    try {
      applyV60MemoryFromDecision(state, { kind: 'contraband-confiscate' });
    } catch {
      /* ignore */
    }
  } else {
    state.v59.contraband.ignored += 1;
    state.logs.push(`Contraband overlooked: ${p.label} — filed as unease.`);
    try {
      applyV60MemoryFromDecision(state, { kind: 'contraband-ignore' });
    } catch {
      /* ignore */
    }
  }
}

export function buildV59SummaryHtml(state) {
  ensureV59State(state);
  const ph = state.v59.phone;
  const sw = state.v59.switchboard;
  const ra = state.v59.radio;
  const pr = state.v59.printer;
  const cb = state.v59.contraband;
  const par = state.v59.paranoia || {};
  const disp = Array.isArray(state.v59.dispatches) ? state.v59.dispatches : [];
  const dispLine =
    disp.length === 0
      ? '—'
      : disp
          .slice(-4)
          .map((d) => `${d.status || '?'}`)
          .join(' · ');
  return `
    <div class="v59-dossier-panel" role="region" aria-label="Physical desk v0.59">
      <h4 class="v56-dossier-heading">Physical desk (v0.59)</h4>
      <ul class="v59-dossier-list muted">
        <li><strong>Phone:</strong> answered ${Number(ph?.answeredCount || 0)} · missed ${Number(ph?.missedCount || 0)}</li>
        <li><strong>Switchboard listens:</strong> ${Number(sw?.listenCount || 0)}</li>
        <li><strong>Radio bands:</strong> ${(ra?.discoveredSignals || []).join(', ') || '—'} · listens ${Number(ra?.listenCount || 0)}</li>
        <li><strong>Lobby sightings:</strong> ${Number(state.v59.lobby?.sightings?.length || 0)}</li>
        <li><strong>Printer:</strong> jobs ${Number(pr?.printedCount || 0)} · jam clears ${Number(pr?.jamClears || 0)}</li>
        <li><strong>Field dispatches:</strong> ${dispLine}</li>
        <li><strong>Contraband:</strong> held ${(cb?.items || []).length} · heat ${Number(cb?.heat || 0)} · R/C/I ${Number(cb?.reported)}/${Number(cb?.confiscated)}/${Number(cb?.ignored)}</li>
        <li><strong>Paranoia glitches:</strong> ${Number(par?.glitchCount || 0)}</li>
      </ul>
    </div>
  `;
}

export function syncV59PhysicalDom(state, audioController) {
  ensureV59State(state);
  const devStrip = document.getElementById('v59-dev-helper');
  if (devStrip) {
    devStrip.hidden = !isV59DevEnabled();
  }

  const phone = document.getElementById('v59-lobby-phone');
  if (phone) {
    const c = state.v59.phone.activeCall;
    const pulse = Number(state.v59.phone.devRingPulse || 0);
    const pulseFresh = pulse && Date.now() - pulse < 900;
    phone.classList.toggle('is-ringing', Boolean(c));
    phone.classList.toggle('is-dev-pulse', Boolean(pulseFresh));
    const lamp = phone.querySelector('.v59-phone-lamp');
    if (lamp) lamp.classList.toggle('is-blink', Boolean(c));
    const incoming = phone.querySelector('[data-v59-phone-incoming]');
    if (incoming) incoming.textContent = c ? 'INCOMING LINE' : '';
    const srcEl = phone.querySelector('[data-v59-phone-source]');
    if (srcEl) srcEl.textContent = c ? c.label : '—';
    const hint = phone.querySelector('[data-v59-phone-hold-hint]');
    if (hint) hint.textContent = c ? 'Hold 3 seconds to answer' : 'No active line';
    const prog = phone.querySelector('[data-v59-phone-progress]');
    if (prog) prog.style.width = `${Math.round((state.v59.phone.holdProgress || 0) * 100)}%`;
    const counts = phone.querySelector('[data-v59-phone-counts]');
    if (counts) {
      counts.textContent = `Ans ${state.v59.phone.answeredCount || 0} · Miss ${state.v59.phone.missedCount || 0}`;
    }
    const tr = state.v59.phone.lastTranscript;
    const trEl = phone.querySelector('[data-v59-phone-transcript]');
    const trLine = phone.querySelector('[data-v59-phone-transcript-line]');
    if (trEl && trLine) {
      const show = Boolean(tr && tr.label);
      trEl.hidden = !show;
      if (show) {
        trLine.textContent = `${tr.label}: “${tr.line}”`;
      }
    }
  }
  const sb = document.getElementById('v59-switchboard');
  if (sb) {
    const conn = sb.querySelector('[data-v59-sb-status]');
    if (conn) {
      const r = state.v59.switchboard.connectedRoomId;
      const desk = state.v59.switchboard.deskSelected;
      conn.textContent = desk && r != null ? `DESK → UNIT ${r}` : desk ? 'DESK selected — pick a room port' : 'Select DESK JACK first';
    }
    const ports = sb.querySelector('[data-v59-sb-ports]');
    if (ports) {
      const rooms = Array.isArray(state.rooms) ? state.rooms : [];
      const desk = state.v59.switchboard.deskSelected;
      const connR = state.v59.switchboard.connectedRoomId;
      ports.innerHTML = rooms
        .map((room) => {
          const id = Number(room.id);
          const active = desk && connR != null && Number(connR) === id;
          return `<button type="button" class="v59-sb-port${active ? ' is-plugged' : ''}" data-v59-sb-room="${id}" aria-label="Unit ${id}">${String(room.label || `UNIT ${id}`).replace(/</g, '')}</button>`;
        })
        .join('');
      const deskBtn = sb.querySelector('[data-v59-sb-desk]');
      if (deskBtn) deskBtn.classList.toggle('is-selected', Boolean(desk));
      const cable = sb.querySelector('[data-v59-sb-cable]');
      if (cable) cable.classList.toggle('is-live', Boolean(desk && state.v59.switchboard.connectedRoomId != null));
    }
  }
  const disp = document.getElementById('v59-dispatch-strip');
  if (disp) {
    const w = state.v59.dispatchWait;
    const lineEl = disp.querySelector('[data-v59-dispatch-line]');
    const crisisEl = disp.querySelector('[data-v59-dispatch-crisis]');
    if (w?.active) {
      disp.hidden = false;
      const left = Math.max(0, Math.ceil((Number(w.dueAt || 0) - Date.now()) / 1000));
      if (lineEl) {
        lineEl.textContent = w.crisis?.open
          ? 'DISPATCH — SIGNAL LOST — choose response'
          : `STAFF DEPLOYED — ETA ~${left}s`;
      }
      if (crisisEl) crisisEl.hidden = !w.crisis?.open;
    } else {
      disp.hidden = true;
      if (lineEl) lineEl.textContent = '';
      if (crisisEl) crisisEl.hidden = true;
    }
  }
  const rad = document.getElementById('v59-analog-radio');
  if (rad) {
    const f = Number(state.v59.radio.frequency || 91.5);
    const ro = rad.querySelector('[data-v59-radio-freq-readout]');
    if (ro) ro.textContent = f.toFixed(1);
    const sl = rad.querySelector('[data-v59-radio-slider]');
    if (sl && document.activeElement !== sl) sl.value = String(f);
    const last = rad.querySelector('[data-v59-radio-last]');
    if (last) last.textContent = state.v59.radio.lastLine || '—';
    const sig = rad.querySelector('[data-v59-radio-signal]');
    if (sig) {
      const near = [91.5, 98.3, 103.7].some((x) => Math.abs(f - x) <= 0.35);
      sig.style.setProperty('--v59-sig', near ? '0.85' : '0.25');
    }
    const bandEl = rad.querySelector('[data-v59-radio-band]');
    if (bandEl) {
      let band = 'Scanning…';
      if (Math.abs(f - 91.5) <= 0.35) band = '91.5 — Police Scanner';
      else if (Math.abs(f - 98.3) <= 0.35) band = '98.3 — Dead Air';
      else if (Math.abs(f - 103.7) <= 0.35) band = '103.7 — Motel Band';
      bandEl.textContent = band;
    }
  }
  const lobby = document.getElementById('v59-lobby-modal');
  if (lobby) {
    const open = Boolean(state.v59.lobby?.overlayOpen);
    lobby.hidden = !open;
    lobby.classList.toggle('is-open', open);
    const st = state.v59.lobby?.overlayState;
    const title = lobby.querySelector('[data-v59-lobby-title]');
    const kicker = lobby.querySelector('[data-v59-lobby-kicker]');
    const body = lobby.querySelector('[data-v59-lobby-body]');
    const choices = lobby.querySelector('[data-v59-lobby-choices]');
    const glass = lobby.querySelector('.v59-lobby-glass');
    if (kicker) kicker.textContent = 'LOBBY VIEW';
    if (st && title && body) {
      const sceneKey = String(st.scene || 'empty');
      const meta = LOBBY_SCENE_META[sceneKey] || LOBBY_SCENE_META.empty;
      if (glass) {
        glass.className = `v59-lobby-glass ${meta.glassClass || ''}`.trim();
        glass.classList.toggle('v59-lobby-glass--threat', Boolean(st.threat));
      }
      if (st.threat) {
        title.textContent = meta.title;
        body.textContent = meta.body;
      } else {
        title.textContent = LOBBY_SCENE_META.empty.title;
        body.textContent = LOBBY_SCENE_META.empty.body;
      }
      if (choices) choices.hidden = !st.threat;
    }
  }
  const prEl = document.getElementById('v59-printer-modal');
  if (prEl) {
    const open = Boolean(state.v59.printer?.modalOpen);
    prEl.hidden = !open;
    prEl.classList.toggle('is-open', open);
    const body = prEl.querySelector('[data-v59-printer-body]');
    if (body) {
      const esc = (s) =>
        String(s ?? '')
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');
      const gen = Number(state.v59.printer.printGeneration || 0);
      body.dataset.printGen = String(gen);
      const lines = state.v59.printer.lines || [];
      body.innerHTML = lines
        .map((ln, i) => `<div class="v59-printer-line" style="animation-delay:${i * 0.09}s">${esc(ln)}</div>`)
        .join('');
    }
    const jam = prEl.querySelector('[data-v59-printer-jam]');
    if (jam) jam.hidden = !state.v59.printer.jammed;
    const smack = prEl.querySelector('[data-v59-printer-smack-count]');
    if (smack) smack.textContent = String(state.v59.printer.smackCount || 0);
  }
  const cd = document.getElementById('v59-contraband-strip');
  if (cd) {
    const heat = Number(state.v59.contraband?.heat || 0);
    const hi = cd.querySelector('[data-v59-contra-heat]');
    if (hi) hi.style.width = `${Math.min(100, heat * 5)}%`;
    const chips = cd.querySelector('[data-v59-contra-chips]');
    if (chips) {
      const items = state.v59.contraband?.items || [];
      chips.innerHTML = items
        .slice(-8)
        .map((it) => `<span class="v59-contra-chip">${String(it.label || it.id).replace(/</g, '')}</span>`)
        .join('') || '<span class="muted">Drawer empty</span>';
    }
    const pend = cd.querySelector('[data-v59-contra-pending]');
    if (pend) {
      const p = state.v59.contraband?.pendingChoice;
      pend.hidden = !p;
      if (p) {
        pend.innerHTML = `<div class="v59-contra-find-card">
          <p class="v59-contra-find-label">Seized from investigation</p>
          <p class="v59-contra-prompt">${String(p.label).replace(/</g, '')}</p>
          <div class="v59-contra-actions">
            <button type="button" class="button button-secondary" data-v59-contra="report">Report</button>
            <button type="button" class="button button-utility" data-v59-contra="confiscate">Confiscate</button>
            <button type="button" class="button" data-v59-contra="ignore">Ignore</button>
          </div>
        </div>`;
      } else {
        pend.innerHTML = '';
      }
    }
  }
}

export function bindV59DeskUi(root, getApi) {
  if (!root || root.dataset.v59DeskUiBound) return;
  root.dataset.v59DeskUiBound = '1';

  let phoneHoldRaf = 0;

  const run = (fn) => {
    try {
      const api = typeof getApi === 'function' ? getApi() : null;
      if (!api?.state) return;
      fn(api);
    } catch {
      /* ignore */
    }
  };

  const stopPhoneHold = () => {
    if (phoneHoldRaf) {
      cancelAnimationFrame(phoneHoldRaf);
      phoneHoldRaf = 0;
    }
  };

  const tickHold = (api) => {
    const r = v59PhoneHoldTick(api.state, Date.now());
    if (r >= 1) {
      stopPhoneHold();
      try {
        api.audioController?.playUiClick?.();
      } catch {
        /* ignore */
      }
      api.renderAll?.();
      return;
    }
    api.renderAll?.();
    phoneHoldRaf = requestAnimationFrame(() => tickHold(api));
  };

  root.addEventListener('click', (e) => {
    const t = e.target;
    if (t.closest('[data-v59-phone-dismiss-transcript]')) {
      run(({ state, renderAll }) => {
        v59DismissPhoneTranscript(state);
        renderAll?.();
      });
      e.preventDefault();
      return;
    }
    if (t.closest('[data-v59-sb-desk]')) {
      run(({ state, renderAll }) => {
        v59SwitchboardSelectDesk(state);
        renderAll?.();
      });
      e.preventDefault();
      return;
    }
    const roomBtn = t.closest('[data-v59-sb-room]');
    if (roomBtn) {
      const rid = roomBtn.getAttribute('data-v59-sb-room');
      run(({ state, renderAll }) => {
        v59SwitchboardSelectRoom(state, rid);
        renderAll?.();
      });
      e.preventDefault();
      return;
    }
    if (t.closest('[data-v59-sb-clear]')) {
      run(({ state, renderAll }) => {
        v59SwitchboardClear(state);
        renderAll?.();
      });
      e.preventDefault();
      return;
    }
    if (t.closest('[data-v59-sb-listen]')) {
      run(({ state, renderAll, progressShift, audioController, activeScreenId }) => {
        if (activeScreenId && activeScreenId !== 'game-screen') return;
        v59SwitchboardListen(state, { progressShift, renderAll, audioController });
      });
      e.preventDefault();
      return;
    }
    if (t.closest('[data-v59-raise-head]')) {
      run(({ state, renderAll }) => {
        const ok = v59OpenLobbyView(state, false);
        if (!ok) {
          pushLiveAlert(state, {
            type: 'info',
            kind: 'ambient',
            message: 'You glance up — nothing pulls you from the screen yet.',
            dedupeKey: 'v59-lobby-cooldown'
          });
        }
        renderAll?.();
      });
      e.preventDefault();
      return;
    }
    const lobbyPick = t.closest('[data-v59-lobby-pick]');
    if (lobbyPick) {
      const pick = lobbyPick.getAttribute('data-v59-lobby-pick');
      run(({ state, renderAll }) => {
        v59LobbyResolve(state, pick);
        renderAll?.();
      });
      e.preventDefault();
      return;
    }
    if (t.closest('[data-v59-lobby-close]')) {
      run(({ state, renderAll }) => {
        v59CloseLobbyView(state);
        renderAll?.();
      });
      e.preventDefault();
      return;
    }
    if (t.closest('[data-v59-radio-listen]')) {
      run(({ state, renderAll, audioController }) => {
        v59RadioListen(state);
        try {
          audioController?.playStaticBurst?.('light');
        } catch {
          /* ignore */
        }
        renderAll?.();
      });
      e.preventDefault();
      return;
    }
    if (t.closest('[data-v59-printer-open]')) {
      run(({ state, renderAll }) => {
        v59PrinterOpenSample(state);
        renderAll?.();
      });
      e.preventDefault();
      return;
    }
    if (t.closest('[data-v59-printer-smack]')) {
      run(({ state, renderAll }) => {
        v59PrinterSmack(state);
        const sm = document.querySelector('[data-v59-printer-smack]');
        if (sm) {
          sm.classList.add('is-smack-pulse');
          window.setTimeout(() => sm.classList.remove('is-smack-pulse'), 200);
        }
        renderAll?.();
      });
      e.preventDefault();
      return;
    }
    if (t.closest('[data-v59-printer-close]')) {
      run(({ state, renderAll }) => {
        v59PrinterClose(state);
        renderAll?.();
      });
      e.preventDefault();
      return;
    }
    const crisis = t.closest('[data-v59-dispatch-crisis-pick]');
    if (crisis) {
      const pick = crisis.getAttribute('data-v59-dispatch-crisis-pick');
      run(({ state, renderAll }) => {
        resolveDispatchCrisis(state, pick, {});
        renderAll?.();
      });
      e.preventDefault();
      return;
    }
    const contra = t.closest('[data-v59-contra]');
    if (contra) {
      const ch = contra.getAttribute('data-v59-contra');
      run(({ state, renderAll }) => {
        v59ContrabandResolve(state, ch);
        renderAll?.();
      });
      e.preventDefault();
    }
  });

  root.addEventListener(
    'input',
    (e) => {
      const sl = e.target.closest?.('[data-v59-radio-slider]');
      if (!sl) return;
      run(({ state, renderAll }) => {
        v59RadioTune(state, sl.value);
        renderAll?.();
      });
    },
    true
  );

  const holdStart = (e) => {
    if (!e.target.closest?.('[data-v59-phone-hold]')) return;
    e.preventDefault();
    run(({ state, renderAll, audioController }) => {
      v59PhoneHoldStart(state);
      try {
        audioController?.playUiClick?.();
      } catch {
        /* ignore */
      }
      stopPhoneHold();
      phoneHoldRaf = requestAnimationFrame(() => tickHold({ state, renderAll, audioController }));
    });
  };
  const holdEnd = () => {
    run(({ state, renderAll }) => {
      if (!state?.v59?.phone?.holdArmed) return;
      const prog = Number(state.v59.phone.holdProgress || 0);
      const hadCall = Boolean(state.v59.phone.activeCall);
      v59PhoneHoldEnd(state);
      stopPhoneHold();
      if (isV59DevEnabled() && hadCall && prog < 1) {
        v59PhoneDevLog('hold cancelled');
      }
      renderAll?.();
    });
  };
  root.addEventListener('pointerdown', holdStart, true);
  root.addEventListener('pointerup', holdEnd, true);
  root.addEventListener('pointercancel', holdEnd, true);
  root.addEventListener('touchstart', holdStart, { capture: true, passive: false });
  root.addEventListener('touchend', holdEnd, { capture: true });
}

export function initV59DebugShortcuts(handlers) {
  if (!isV59DevEnabled()) return;
  if (typeof window !== 'undefined' && window.__v59DbgKeys) return;
  if (typeof window !== 'undefined') window.__v59DbgKeys = true;
  try {
    console.info('[v59 debug] Active — H phone, S switchboard, R lobby, Y sanity, T radio, J printer, X dispatch, C contraband.');
  } catch {
    /* ignore */
  }
  const onKey = (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
    const k = e.key?.toLowerCase();
    if (k === 'h') {
      e.preventDefault();
      handlers?.forcePhone?.();
    } else if (k === 's') {
      e.preventDefault();
      handlers?.forceSwitchboard?.();
    } else if (k === 'r') {
      e.preventDefault();
      handlers?.forceLobby?.();
    } else if (k === 'y') {
      e.preventDefault();
      handlers?.forceSanity?.();
    } else if (k === 't') {
      e.preventDefault();
      handlers?.forceRadio?.();
    } else if (k === 'j') {
      e.preventDefault();
      handlers?.forcePrinterJam?.();
    } else if (k === 'x') {
      e.preventDefault();
      handlers?.forceDispatchLost?.();
    } else if (k === 'c') {
      e.preventDefault();
      handlers?.forceContraband?.();
    }
  };
  window.addEventListener('keydown', onKey);
}

export function forceV59PhoneCall(state) {
  ensureV59State(state);
  if (state.v59.phone.activeCall) {
    state.v59.phone.devRingPulse = Date.now();
    state.v59.phone.activeCall.expiresAt = Date.now() + 120000;
    state.v59.phone.activeCall.ringAt = Date.now();
    v59PhoneDevLog('incoming line refreshed (call already active)');
    state.logs.push('[Dev] Lobby phone line pulsed — call still active. Hold to answer or wait for expiry.');
    pushLiveAlert(state, {
      type: 'warning',
      kind: 'ambient',
      message: 'Phone: line refreshed (dev) — incoming call still live.',
      dedupeKey: 'v59-phone-dev-pulse'
    });
    return;
  }
  v59PhoneDevLog('forced ring');
  state.v59.phone.activeCall = {
    id: 'dev-call',
    source: 'room',
    label: 'ROOM 04',
    line: pick(CALL_LINES.room),
    ringAt: Date.now(),
    expiresAt: Date.now() + 120000,
    roomId: 4
  };
}

export function forceV59SwitchboardToFirstOccupied(state) {
  ensureV59State(state);
  v59SwitchboardSelectDesk(state);
  const occ = (state.rooms || []).find((r) => r?.occupied);
  if (occ) v59SwitchboardSelectRoom(state, occ.id);
}

export function forceV59LobbyThreat(state) {
  ensureV59State(state);
  v59OpenLobbyView(state, true);
}

export function forceV59RadioMeaningful(state) {
  ensureV59State(state);
  state.v59.radio.frequency = 91.5;
  v59RadioListen(state);
}

export function forceV59PrinterJamDev(state) {
  ensureV59State(state);
  state.v59.printer.modalOpen = true;
  v59PrinterJam(state);
}

export function forceV59DispatchSignalLostDev(state) {
  ensureV59State(state);
  try {
    if (state.v59._dispatchTimer) clearTimeout(state.v59._dispatchTimer);
  } catch {
    /* ignore */
  }
  const result = dispatchStaffResponse(state.rooms || [], state.night, {});
  state.v59.dispatchWait = {
    active: true,
    dueAt: Date.now(),
    payload: { result, dispatchFee: 0 },
    signalLost: true,
    crisis: { open: true, resolved: false }
  };
}

export function forceV59ContrabandDev(state) {
  ensureV59State(state);
  state.v59.contraband.pendingChoice = { ...CONTRA_ITEMS[0], source: 'dev' };
}

export function forceV59SanityGlitchDev(state) {
  forceParanoiaGlitch(state, 16000);
}
