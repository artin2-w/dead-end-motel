/**
 * Dead End Motel v0.57 — Suspicion layer: phone warnings, field-manual clues,
 * listen-in, emergency lobby lockdown. Lightweight; no external APIs.
 */

import { pushLiveAlert } from './presentation.js';

const PHONE_BUCKET_MIN = 28;
const PHONE_MAX_PER_NIGHT = 2;
const PHONE_ROLL = 0.11;
const LISTEN_POWER = 3;
const LISTEN_COOLDOWN_MIN = 22;
const LOCKDOWN_POWER = 14;
const LOCKDOWN_REP = 5;
const LOCKDOWN_COOLDOWN_MIN = 95;

const PHONE_SCRIPTS = [
  {
    id: 'v57-phone-police-jacket',
    line: 'Police dispatch: suspect seen near the highway wearing a yellow jacket.',
    hint: 'Compare arrivals against bright outerwear and lone drivers.'
  },
  {
    id: 'v57-phone-neighbor-lot',
    line: 'Neighbor report: someone has been standing by the parking lot lights for ten minutes.',
    hint: 'Cross-check scanner chatter and rear cameras before assigning rear rooms.'
  },
  {
    id: 'v57-phone-room6',
    line: 'Unknown caller: don’t give Room 6 to anyone after midnight.',
    hint: 'If Room 6 is in play, treat late check-ins as higher risk.'
  },
  {
    id: 'v57-phone-breath',
    line: 'Line opens. Breathing only. Then disconnect.',
    hint: 'Expect a quiet arrival soon — verify ID calmly, watch UV edges.'
  },
  {
    id: 'v57-phone-motel-test',
    line: 'Motel systems: perimeter relay test — ignore unless lights flicker twice.',
    hint: 'If power dips right after, treat the lot as hot for one camera sweep.'
  },
  {
    id: 'v57-phone-plate',
    line: 'Highway patrol relay: watch for out-of-county plates pairing with walk-in guests.',
    hint: 'Run vehicle questions when the desk story mentions a short drive.'
  }
];

const LISTEN_LINES = [
  { text: 'Only static.', severity: 'low' },
  { text: 'Low whispering behind the wall.', severity: 'med' },
  { text: 'Dragging sound. Slow. Repeating.', severity: 'med' },
  { text: 'Paper tearing. Then silence.', severity: 'low' },
  { text: 'Two voices, but only one guest is registered.', severity: 'high' }
];

export function ensureV57State(state) {
  if (!state || typeof state !== 'object') return;
  if (!state.v57 || typeof state.v57 !== 'object') {
    state.v57 = {
      phoneCallLog: [],
      phoneLastBucket: -1,
      phoneCallsThisNight: 0,
      pendingPhoneToast: null,
      lobbyLockdownAvailableAtMinute: 0,
      listenCooldownUntil: {}
    };
  }
  if (!Array.isArray(state.v57.phoneCallLog)) state.v57.phoneCallLog = [];
  if (typeof state.v57.phoneLastBucket !== 'number') state.v57.phoneLastBucket = -1;
  if (typeof state.v57.phoneCallsThisNight !== 'number') state.v57.phoneCallsThisNight = 0;
  if (typeof state.v57.lobbyLockdownAvailableAtMinute !== 'number') state.v57.lobbyLockdownAvailableAtMinute = 0;
  if (!state.v57.listenCooldownUntil || typeof state.v57.listenCooldownUntil !== 'object') state.v57.listenCooldownUntil = {};
}

export function resetV57ForNewShift(state) {
  ensureV57State(state);
  state.v57.phoneLastBucket = -1;
  state.v57.phoneCallsThisNight = 0;
  state.v57.pendingPhoneToast = null;
  state.v57.listenCooldownUntil = {};
  state.v57.lobbyLockdownAvailableAtMinute = 0;
  state.v57.phoneCallLog = [];
}

function mergeGuestTags(guest, patternIds) {
  const cur = Array.isArray(guest.v57ManualTags) ? guest.v57ManualTags.slice() : [];
  const set = new Set(cur);
  (patternIds || []).forEach((id) => {
    if (id) set.add(String(id));
  });
  return { ...guest, v57ManualTags: [...set] };
}

export function inferV57PatternsForGuest(guest, source) {
  const out = [];
  if (!guest) return out;
  if (source === 'id-inspect') {
    const forged = Boolean(guest?.forgeryProfile?.isForged);
    const bad =
      guest?.idProfile?.validity === 'Questionable' ||
      (Array.isArray(guest?.idProfile?.irregularities) && guest.idProfile.irregularities.length > 0);
    if (forged || bad) out.push('id-mismatch');
  }
  if (source === 'uv-inspect' && guest?.uvProfile?.suspicious) {
    out.push('wrong-reflection');
  }
  if (source === 'vehicle-question' && guest?.vehicleProfile) {
    if (guest.vehicleProfile.plateMismatch) out.push('vehicle-plate-mismatch');
  }
  if (source === 'secondary-verify') {
    const q = guest?.idProfile?.validity === 'Questionable';
    const uv = Boolean(guest?.uvProfile?.suspicious);
    if (q || uv) {
      if (!out.includes('id-mismatch') && q) out.push('id-mismatch');
      if (uv && !out.includes('wrong-reflection')) out.push('wrong-reflection');
    }
    const story = String(guest?.threadMemoryLine || '');
    if (/same phrase|repeated|again and again|echo/i.test(story)) out.push('repeated-phrase');
  }
  if (source === 'question-generic') {
    const story = String(guest?.threadMemoryLine || '');
    const sm = (guest?.scannerMatches || []).map((x) => String(x)).join(' ').toLowerCase();
    if (/shadow|no shadow|thin silhouette/i.test(story)) out.push('no-shadow');
    if (/repeat|repeated phrase|same wording/i.test(story) || /repeat|echo|pattern/i.test(sm)) {
      out.push('repeated-phrase');
    }
    if (/mismatch|plate|region|rental|county/i.test(sm)) out.push('vehicle-plate-mismatch');
  }
  return [...new Set(out)];
}

export function surfaceV57CluesAfterGuestAction(state, guestId, source) {
  ensureV57State(state);
  const idx = (state.guests || []).findIndex((g) => g.id === guestId);
  if (idx === -1) return;
  const guest = state.guests[idx];
  const patterns = inferV57PatternsForGuest(guest, source);
  if (!patterns.length) return;
  state.guests[idx] = mergeGuestTags(guest, patterns);
  const g2 = state.guests[idx];
  const label = patterns
    .map((p) =>
      p === 'id-mismatch'
        ? 'ID Mismatch'
        : p === 'wrong-reflection'
          ? 'Wrong Reflection'
          : p === 'repeated-phrase'
            ? 'Repeated Phrase'
            : p === 'no-shadow'
              ? 'No Shadow'
              : p === 'vehicle-plate-mismatch'
                ? 'Vehicle Plate Mismatch'
                : p
    )
    .join(' · ');
  state.logs.push(`Field Manual match (${g2.name}): ${label}.`);
  pushLiveAlert(state, {
    type: 'warning',
    kind: 'ambient',
    message: `Field Manual match: ${label} — ${g2.name}.`,
    dedupeKey: `v57-clue-${guestId}-${patterns.join('-')}-${source}`
  });
}

export function surfaceV57AfterDeskQuestion(state, guestId, questionId) {
  const guest = (state.guests || []).find((g) => g.id === guestId);
  if (!guest) return;
  if (questionId === 'vehicle' && guest.vehicleProfile) {
    surfaceV57CluesAfterGuestAction(state, guestId, 'vehicle-question');
    return;
  }
  if (questionId === 'scanner' || questionId === 'late-timing') {
    surfaceV57CluesAfterGuestAction(state, guestId, 'question-generic');
  }
}

export function tryV57PhoneCallEvent(state, { audioController } = {}) {
  ensureV57State(state);
  const night = Math.max(1, Number(state.night || 1));
  const elapsed = Number(state.shiftElapsedMinutes || 0);
  if (elapsed < 12) return;
  if (state.v57.phoneCallsThisNight >= PHONE_MAX_PER_NIGHT) return;
  const bucket = Math.floor(elapsed / PHONE_BUCKET_MIN);
  if (bucket === state.v57.phoneLastBucket) return;
  state.v57.phoneLastBucket = bucket;
  if (Math.random() > PHONE_ROLL) return;
  const pick = PHONE_SCRIPTS[Math.floor(Math.random() * PHONE_SCRIPTS.length)];
  state.v57.phoneCallsThisNight += 1;
  const entry = {
    id: pick.id,
    night,
    minute: elapsed,
    line: pick.line,
    hint: pick.hint
  };
  state.v57.phoneCallLog.push(entry);
  state.v57.pendingPhoneToast = { ...entry };
  state.logs.push(`Phone: ${pick.line}`);
  pushLiveAlert(state, {
    type: 'warning',
    kind: 'ambient',
    message: `Incoming call: ${pick.line}`,
    dedupeKey: `${pick.id}-${night}-${bucket}`
  });
  try {
    if (audioController?.playStaticBurst) audioController.playStaticBurst('light');
    else if (audioController?.playUiClick) audioController.playUiClick();
  } catch {
    /* ignore */
  }
}

export function dismissV57PhoneToast(state) {
  ensureV57State(state);
  state.v57.pendingPhoneToast = null;
}

export function attemptListenInRoom(state, roomId, { progressShift, renderAll, audioController } = {}) {
  ensureV57State(state);
  const rid = Number(roomId);
  const room = (state.rooms || []).find((r) => Number(r.id) === rid);
  if (!room?.occupied) {
    pushLiveAlert(state, { type: 'info', message: 'Listen-in needs an occupied room.', dedupeKey: 'v57-listen-empty' });
    return false;
  }
  const now = Number(state.shiftElapsedMinutes || 0);
  const until = Number(state.v57.listenCooldownUntil[rid] || 0);
  if (now < until) {
    pushLiveAlert(state, {
      type: 'info',
      message: `Listen-in cooling down for ${room.label} (~${until - now} min).`,
      dedupeKey: `v57-listen-cd-${rid}`
    });
    return false;
  }
  if (Number(state.power || 0) < LISTEN_POWER) {
    pushLiveAlert(state, { type: 'warning', message: 'Not enough power for listen-in.', dedupeKey: 'v57-listen-power' });
    return false;
  }
  state.power = Math.max(0, Number(state.power) - LISTEN_POWER);
  const line = LISTEN_LINES[Math.floor(Math.random() * LISTEN_LINES.length)];
  state.v57.listenCooldownUntil[rid] = now + LISTEN_COOLDOWN_MIN;
  const who = room.guestName || room.occupiedBy || 'Guest';
  state.logs.push(`Listen-in ${room.label} (${who}): ${line.text}`);
  pushLiveAlert(state, {
    type: line.severity === 'high' ? 'danger' : 'warning',
    message: `Listen-in · ${room.label}: ${line.text}`,
    dedupeKey: `v57-listen-${rid}-${now}`
  });
  if (line.severity === 'high') {
    state.reputation = Math.max(0, Number(state.reputation || 50) - 1);
  }
  try {
    if (typeof audioController?.playStaticBurst === 'function') {
      audioController.playStaticBurst(line.severity === 'high' ? 'light' : 'light');
    }
  } catch {
    /* ignore */
  }
  const guestIdx = (state.guests || []).findIndex((g) => g.name === who);
  if (guestIdx !== -1 && line.severity === 'high') {
    state.guests[guestIdx] = mergeGuestTags(state.guests[guestIdx], ['repeated-phrase']);
  }
  if (typeof progressShift === 'function' && progressShift('v57-listen', { timeScale: 0.35, skipPassiveDrain: true })) {
    return true;
  }
  if (typeof renderAll === 'function') renderAll();
  return true;
}

export function attemptLobbyLockdown(state, { progressShift, renderAll } = {}) {
  ensureV57State(state);
  const now = Number(state.shiftElapsedMinutes || 0);
  if (now < Number(state.v57.lobbyLockdownAvailableAtMinute || 0)) {
    const left = Math.ceil(Number(state.v57.lobbyLockdownAvailableAtMinute) - now);
    pushLiveAlert(state, {
      type: 'info',
      message: `Lobby lockdown recharges in ~${left} shift minutes.`,
      dedupeKey: 'v57-lockdown-cd'
    });
    return false;
  }
  if (Number(state.power || 0) < LOCKDOWN_POWER) {
    pushLiveAlert(state, {
      type: 'warning',
      message: 'Not enough power for emergency lobby lockdown.',
      dedupeKey: 'v57-lockdown-power'
    });
    return false;
  }
  state.power = Math.max(0, Number(state.power) - LOCKDOWN_POWER);
  state.reputation = Math.max(0, Number(state.reputation || 50) - LOCKDOWN_REP);
  state.v57.lobbyLockdownAvailableAtMinute = now + LOCKDOWN_COOLDOWN_MIN;
  (state.guests || []).forEach((g, i) => {
    if (!g) return;
    state.guests[i] = {
      ...g,
      instabilitySignal: Math.min(6, Number(g.instabilitySignal || 0) + 1)
    };
  });
  state.logs.push('Emergency lobby lockdown engaged — doors sealed, lobby intake slowed.');
  pushLiveAlert(state, {
    type: 'warning',
    message: 'Lobby lockdown engaged.',
    dedupeKey: `v57-lockdown-${now}`
  });
  pushLiveAlert(state, {
    type: 'warning',
    message: 'Guests outside are agitated.',
    dedupeKey: `v57-lockdown-ag-${now}`
  });
  pushLiveAlert(state, {
    type: 'warning',
    message: 'Power draw spike detected.',
    dedupeKey: `v57-lockdown-pw-${now}`
  });
  if (typeof progressShift === 'function' && progressShift('v57-lockdown', { timeScale: 0.55 })) {
    return true;
  }
  if (typeof renderAll === 'function') renderAll();
  return true;
}

export function getV57LockdownButtonLabel(state) {
  ensureV57State(state);
  const now = Number(state.shiftElapsedMinutes || 0);
  const until = Number(state.v57.lobbyLockdownAvailableAtMinute || 0);
  if (now < until) return `Lockdown (${Math.max(1, Math.ceil(until - now))}m)`;
  return 'Emergency Lobby Lockdown';
}

export function surfaceV57CameraScanHint(state, mergedScan) {
  ensureV57State(state);
  const logs = Array.isArray(mergedScan?.logs) ? mergedScan.logs.join(' ').toLowerCase() : '';
  if (!logs || logs.length < 8) return;
  if (/shadow|reflection|glass|mirror|lot\s+line|parking/i.test(logs)) {
    state.logs.push('Field Manual note: camera sweep flagged lighting or glass behavior — worth a UV pass on matching guests.');
    pushLiveAlert(state, {
      type: 'info',
      kind: 'ambient',
      message: 'Possible Type: Wrong Reflection — camera sweep hints at glass/light behavior.',
      dedupeKey: `v57-cam-hint-${state.night}-${Math.floor(Number(state.shiftElapsedMinutes || 0) / 8)}`
    });
  }
}

export function surfaceV57AfterIncidentReview(state, meaningful, generated) {
  if (!meaningful || !generated) return;
  ensureV57State(state);
  state.logs.push('Incident review: paperwork aligns with Field Manual stress patterns.');
  pushLiveAlert(state, {
    type: 'warning',
    kind: 'ambient',
    message: 'Field Manual: incident review surfaced a recurring stress pattern.',
    dedupeKey: `v57-review-${state.night}-${state.shiftElapsedMinutes}`
  });
}
