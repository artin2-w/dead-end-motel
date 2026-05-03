/**
 * Dead End Motel v0.58 — Living motel layer (traits, shadow traces, weather,
 * night events, morality, legacy, voice intercept). Defensive; no external APIs.
 */

import { pushLiveAlert } from './presentation.js';

const TRAIT_POOL = ['calm', 'nervous', 'silent', 'talkative', 'evasive', 'watcher', 'echo', 'hound', 'strange', 'normal'];

const TRAIT_FLAVOR = {
  calm: 'Keeps their hands flat on the counter — steady breathing.',
  nervous: 'Keeps checking the parking lot.',
  silent: 'Answers with short nods.',
  talkative: 'Fills silence with small talk that almost lands.',
  evasive: 'Avoids direct questions.',
  watcher: 'Looks past the desk instead of at you.',
  echo: 'Repeats part of your last question.',
  hound: 'Reacts before the phone rings.',
  strange: 'Timing feels half a beat off.',
  normal: 'Nothing obvious — just another tired traveler.'
};

const WEATHER_TYPES = ['clear', 'rain', 'storm', 'fog', 'wind'];

const NIGHT_EVENTS = [
  {
    id: 'owner-audit',
    label: 'Owner Audit',
    log: 'Ownership is auditing tone tonight — margins and optics both.',
    repLossBonus: 1
  },
  {
    id: 'police-sweep',
    label: 'Police Sweep',
    log: 'Radio says cruisers are working the corridor — paperwork will be read twice.',
    policeSensitivity: 1
  },
  {
    id: 'power-surge',
    label: 'Power Surge',
    log: 'Grid telemetry flickers — breakers are arguing with the weather.'
  },
  {
    id: 'lost-traveler',
    label: 'Lost Traveler',
    log: 'Highway patrol mentions a walker who does not want to be found.'
  },
  {
    id: 'watcher-marking',
    label: 'Watcher Marking',
    log: 'Something in the glass feels like it remembers faces.'
  },
  {
    id: 'false-id-wave',
    label: 'False ID Wave',
    log: 'Scanner chatter: bad laminates circulating on this route tonight.'
  }
];

const VOICE_LINES = [
  '…did you hear that?',
  'He is still outside.',
  "Don't open it.",
  'Room 204 is not empty.',
  'The line clicks — no one answers.',
  'Static folds into a name you almost recognize.',
  'Someone breathes, then hangs up.'
];

const LEGACY_REMINDERS = [
  { key: 'unfairRejects', lines: ['A rejected guest left something under the office door.', 'Paperwork in the bin still smells like rain and anger.'] },
  { key: 'repeatedRoomIncidents', lines: ['Room 204 still feels occupied.', 'The hallway remembers an argument that never officially happened.'] },
  { key: 'excessiveLockdowns', lines: ['Guests whisper about the lobby doors sealing too fast.', 'The glass still vibrates from the last lockdown.'] },
  { key: 'suspiciousGuestApproved', lines: ['You approved someone the cameras never quite matched.', 'A key that should not exist still turns in your mind.'] },
  { key: 'policeSensitivity', lines: ['Police dispatch has your motel on a short list.', 'Blue lights reflect longer in the puddles than they used to.'] },
  { key: 'hauntedRooms', lines: ['A vacant room keeps requesting towels.', 'Housekeeping found the TV on — nobody checked in.'] }
];

function safeRand() {
  try {
    return Math.random();
  } catch {
    return 0.5;
  }
}

export function ensureV58State(state) {
  if (!state || typeof state !== 'object') return;
  if (!state.v58 || typeof state.v58 !== 'object') {
    state.v58 = {};
  }
  const v = state.v58;
  if (!v.weather || typeof v.weather !== 'object') v.weather = { type: 'clear', label: 'Clear' };
  if (!WEATHER_TYPES.includes(String(v.weather.type))) v.weather = { type: 'clear', label: 'Clear' };
  if (!v.nightEvent || typeof v.nightEvent !== 'object') v.nightEvent = { id: 'none', label: 'Standard night', log: '' };
  if (!Array.isArray(v.shadowTraces)) v.shadowTraces = [];
  if (!v.morality || typeof v.morality !== 'object') {
    v.morality = { lockdowns: 0, policeCalls: 0, suspiciousApprovals: 0 };
  }
  ['lockdowns', 'policeCalls', 'suspiciousApprovals'].forEach((k) => {
    if (typeof v.morality[k] !== 'number') v.morality[k] = 0;
  });
  if (!v.legacy || typeof v.legacy !== 'object') {
    v.legacy = {
      unfairRejects: 0,
      repeatedRoomIncidents: 0,
      excessiveLockdowns: 0,
      suspiciousGuestApproved: 0,
      policeSensitivity: 0,
      hauntedRooms: []
    };
  }
  if (!Array.isArray(v.legacy.hauntedRooms)) v.legacy.hauntedRooms = [];
  if (!v.traitHistogram || typeof v.traitHistogram !== 'object') v.traitHistogram = {};
  if (typeof v.nightKey !== 'number') v.nightKey = -1;
  if (v.voiceIntercept != null && typeof v.voiceIntercept !== 'object') v.voiceIntercept = null;
  if (typeof v.lostTravelerBonusUsed !== 'boolean') v.lostTravelerBonusUsed = false;
  if (typeof v.powerSurgeFlickers !== 'number') v.powerSurgeFlickers = 0;
  if (typeof v.ownerAuditExtraRepApplied !== 'boolean') v.ownerAuditExtraRepApplied = false;
}

export function resetV58ForFreshRun(state) {
  ensureV58State(state);
  state.v58.nightKey = -1;
  state.v58.shadowTraces = [];
  state.v58.voiceIntercept = null;
  state.v58.traitHistogram = {};
  state.v58.lostTravelerBonusUsed = false;
  state.v58.powerSurgeFlickers = 0;
  state.v58.morality = { lockdowns: 0, policeCalls: 0, suspiciousApprovals: 0 };
}

function pickWeightedTraits(state) {
  const eventId = String(state?.v58?.nightEvent?.id || '');
  const weights = {};
  TRAIT_POOL.forEach((t) => {
    weights[t] = t === 'normal' ? 1.4 : 1;
  });
  if (eventId === 'watcher-marking') {
    weights.watcher += 1.1;
    weights.strange += 0.35;
  }
  if (eventId === 'false-id-wave') {
    weights.nervous += 0.5;
    weights.evasive += 0.5;
    weights.strange += 0.4;
  }
  const w = state?.v58?.weather?.type || 'clear';
  if (w === 'rain') {
    weights.nervous += 0.35;
    weights.silent += 0.2;
  }
  const pool = [];
  TRAIT_POOL.forEach((t) => {
    const n = Math.max(0.05, Number(weights[t] || 1));
    for (let i = 0; i < Math.ceil(n * 10); i += 1) pool.push(t);
  });
  const out = [];
  const used = new Set();
  const count = 2 + (safeRand() < 0.45 ? 1 : 0);
  let guard = 0;
  while (out.length < count && guard < 40) {
    guard += 1;
    const pick = pool[Math.floor(safeRand() * pool.length)] || 'normal';
    if (!used.has(pick)) {
      used.add(pick);
      out.push(pick);
    }
  }
  while (out.length < 2) {
    const fallback = TRAIT_POOL[Math.floor(safeRand() * TRAIT_POOL.length)];
    if (!used.has(fallback)) {
      used.add(fallback);
      out.push(fallback);
    }
  }
  return out.slice(0, 3);
}

export function assignGuestV58Traits(guest, state) {
  if (!guest || typeof guest !== 'object') return guest;
  ensureV58State(state);
  if (Array.isArray(guest.v58Traits) && guest.v58Traits.length >= 2) return guest;
  const traits = pickWeightedTraits(state);
  const primary = traits[0];
  const flavor = TRAIT_FLAVOR[primary] || TRAIT_FLAVOR.normal;
  const next = {
    ...guest,
    v58Traits: traits,
    v58TraitFlavorLine: flavor
  };
  traits.forEach((t) => {
    state.v58.traitHistogram[t] = (state.v58.traitHistogram[t] || 0) + 1;
  });
  let inst = Number(next.instabilitySignal || 0);
  if (traits.includes('nervous') || traits.includes('hound')) inst += safeRand() < 0.35 ? 1 : 0;
  if (traits.includes('calm') || traits.includes('normal')) inst -= safeRand() < 0.25 ? 1 : 0;
  next.instabilitySignal = Math.max(0, Math.min(6, inst));
  const mem = [next.threadMemoryLine, flavor].filter(Boolean).join(' ');
  if (mem && mem !== next.threadMemoryLine) {
    next.threadMemoryLine = mem;
  }
  return next;
}

export function ensureAllGuestsHaveV58Traits(state) {
  if (!state || !Array.isArray(state.guests)) return;
  ensureV58State(state);
  state.guests = state.guests.map((g) => assignGuestV58Traits(g, state));
}

export function maybeRollV58NightIfNeeded(state) {
  if (!state) return;
  ensureV58State(state);
  if (Number(state.v58.nightKey) !== Number(state.night || 1)) {
    rollV58NightContext(state);
  }
}

export function rollV58NightContext(state) {
  if (!state) return;
  ensureV58State(state);
  const night = Math.max(1, Number(state.night || 1));
  state.v58.nightKey = night;
  state.v58.shadowTraces = [];
  state.v58.voiceIntercept = null;
  state.v58.lostTravelerBonusUsed = false;
  state.v58.powerSurgeFlickers = 0;
  state.v58.ownerAuditExtraRepApplied = false;
  state.v58.morality = { lockdowns: 0, policeCalls: 0, suspiciousApprovals: 0 };
  state.v58.traitHistogram = {};

  const w = WEATHER_TYPES[Math.floor(safeRand() * WEATHER_TYPES.length)];
  state.v58.weather = {
    type: w,
    label: w.charAt(0).toUpperCase() + w.slice(1)
  };

  const ev = NIGHT_EVENTS[Math.floor(safeRand() * NIGHT_EVENTS.length)];
  state.v58.nightEvent = { ...ev };

  const wxMsg = `Weather: ${state.v58.weather.label}. The motel takes the night as it comes.`;
  state.logs.push(wxMsg);
  pushLiveAlert(state, {
    type: 'info',
    kind: 'ambient',
    message: wxMsg,
    dedupeKey: `v58-weather-${night}-${w}`
  });

  if (ev.log) {
    state.logs.push(`Tonight's risk — ${ev.label}: ${ev.log}`);
    pushLiveAlert(state, {
      type: 'warning',
      kind: 'ambient',
      message: `Tonight's risk: ${ev.label} — ${ev.log}`,
      dedupeKey: `v58-event-${night}-${ev.id}`
    });
  }

  if (ev.id === 'lost-traveler' && state.intake && typeof state.intake.arrivalsRemaining === 'number') {
    state.intake.arrivalsRemaining = Math.max(0, Number(state.intake.arrivalsRemaining || 0)) + 1;
    state.logs.push('Lost Traveler rumor: one more arrival slot opens — someone may still be walking in.');
  }
}

export function surfaceV58LegacyReminder(state) {
  if (!state) return;
  ensureV58State(state);
  const leg = state.v58.legacy || {};
  const candidates = LEGACY_REMINDERS.map((block) => {
    const n = Number(leg[block.key] || 0);
    return n > 0 ? { block, n } : null;
  }).filter(Boolean);
  if (!candidates.length) return;
  candidates.sort((a, b) => b.n - a.n);
  const top = candidates[0];
  const lines = top.block.lines;
  const line = lines[Math.floor(safeRand() * lines.length)] || 'The building remembers last night.';
  state.logs.push(`Legacy: ${line}`);
  pushLiveAlert(state, {
    type: 'info',
    kind: 'ambient',
    message: line,
    dedupeKey: `v58-legacy-${state.night}-${top.block.key}`
  });
}

export function maybeRollShadowTrace(state, source = 'ambient') {
  if (!state) return false;
  ensureV58State(state);
  const roll = safeRand();
  const base = source === 'camera' ? 0.055 : source === 'listen' ? 0.04 : 0.022;
  if (roll > base) return false;
  const traces = state.v58.shadowTraces;
  if (traces.length >= 4) return false;
  const templates = [
    { label: 'Figure in lot feed with no lobby match', pressure: 0.35 },
    { label: 'Desk bell rang — queue was empty', pressure: 0.4 },
    { label: 'Shared space air moved — no door opened', pressure: 0.3 },
    { label: 'Camera timestamp skipped one minute', pressure: 0.45 }
  ];
  const pick = templates[Math.floor(safeRand() * templates.length)];
  const entry = {
    id: `shadow-${Date.now()}-${Math.floor(safeRand() * 1e6)}`,
    source: String(source || 'ambient'),
    label: pick.label,
    minute: Number(state.shiftElapsedMinutes || 0),
    pressure: pick.pressure
  };
  traces.push(entry);
  state.logs.push(`Shadow trace (${source}): ${entry.label}.`);
  pushLiveAlert(state, {
    type: 'warning',
    kind: 'ambient',
    message: `Shadow trace: ${entry.label}`,
    dedupeKey: `v58-shadow-${entry.id}`
  });
  return true;
}

export function obfuscateCameraLogsForFog(state, logs) {
  if (!state || !Array.isArray(logs)) return logs || [];
  const w = String(state?.v58?.weather?.type || '');
  if (w !== 'fog') return logs;
  return logs.map((line) => {
    const s = String(line || '');
    if (!s || safeRand() > 0.42) return s;
    return `${s} (signal smears — moisture on the lens?)`;
  });
}

export function adjustPassiveDrainForV58(state, passiveDrain, skipPassiveDrain) {
  if (!state || skipPassiveDrain || !Number.isFinite(Number(passiveDrain)) || passiveDrain <= 0) return passiveDrain;
  ensureV58State(state);
  if (String(state?.v58?.weather?.type) === 'storm' && safeRand() < 0.28) {
    return passiveDrain + 1;
  }
  if (String(state?.v58?.nightEvent?.id) === 'power-surge' && safeRand() < 0.18) {
    state.v58.powerSurgeFlickers = (state.v58.powerSurgeFlickers || 0) + 1;
    return passiveDrain + 1;
  }
  return passiveDrain;
}

export function maybeStormCameraStatic(state, audioController) {
  if (!state) return;
  ensureV58State(state);
  const stormish =
    String(state?.v58?.weather?.type) === 'storm' || String(state?.v58?.nightEvent?.id) === 'power-surge';
  if (!stormish) return;
  if (safeRand() > 0.34) return;
  try {
    if (typeof audioController?.playStaticBurst === 'function') {
      audioController.playStaticBurst('light');
    }
  } catch {
    /* ignore */
  }
}

export function maybeWindFalseAmbient(state) {
  if (!state || String(state?.v58?.weather?.type) !== 'wind') return;
  if (safeRand() > 0.07) return;
  pushLiveAlert(state, {
    type: 'info',
    kind: 'ambient',
    message: 'Wind throws a false motion tag across the shared-space board.',
    dedupeKey: `v58-wind-${state.night}-${Math.floor(Number(state.shiftElapsedMinutes || 0) / 20)}`
  });
}

export function maybeRainFlavorAlert(state) {
  if (!state || String(state?.v58?.weather?.type) !== 'rain') return;
  if (safeRand() > 0.06) return;
  pushLiveAlert(state, {
    type: 'info',
    kind: 'ambient',
    message: 'Rain hammers the awning — every footstep outside sounds like hesitation.',
    dedupeKey: `v58-rain-${state.night}-${Math.floor(Number(state.shiftElapsedMinutes || 0) / 25)}`
  });
}

export function maybePoliceSweepDeskAlert(state) {
  if (!state || String(state?.v58?.nightEvent?.id) !== 'police-sweep') return;
  if (safeRand() > 0.16) return;
  pushLiveAlert(state, {
    type: 'info',
    kind: 'ambient',
    message: 'Sweep night: radios keep asking for names you have not written down yet.',
    dedupeKey: `v58-sweep-${state.night}-${Math.floor(Number(state.shiftElapsedMinutes || 0) / 30)}`
  });
}

export function tryV58VoiceIntercept(state, { audioController, source = 'ambient', chance = 0.034 } = {}) {
  if (!state) return false;
  ensureV58State(state);
  if (state.v58.voiceIntercept) return false;
  if (safeRand() > Number(chance || 0)) return false;
  const line = VOICE_LINES[Math.floor(safeRand() * VOICE_LINES.length)] || '…static…';
  state.v58.voiceIntercept = {
    line,
    source: String(source || 'intercept'),
    atMinute: Number(state.shiftElapsedMinutes || 0)
  };
  state.logs.push(`AUDIO INTERCEPT (${source}): ${line}`);
  pushLiveAlert(state, {
    type: 'danger',
    kind: 'ambient',
    message: `VOICE LINE — ${line}`,
    dedupeKey: `v58-voice-${state.night}-${state.v58.voiceIntercept.atMinute}`
  });
  try {
    if (typeof audioController?.playStaticBurst === 'function') {
      audioController.playStaticBurst('light');
    }
  } catch {
    /* ignore */
  }
  return true;
}

export function dismissV58VoiceIntercept(state) {
  if (!state) return;
  ensureV58State(state);
  state.v58.voiceIntercept = null;
}

export function recordV58Morality(state, key, amount = 1) {
  if (!state || !key) return;
  ensureV58State(state);
  const n = Math.max(0, Number(amount) || 0);
  if (!n) return;
  state.v58.morality[key] = (state.v58.morality[key] || 0) + n;
}

export function computeV58MoralityProfile(state) {
  const s = state?.shiftStats || {};
  const v = state?.v58?.morality || {};
  const checkIns = Number(s.checkedIn || 0);
  const rejects = Number(s.rejected || 0);
  const flags = Number(s.flagged || 0);
  const ignored = Number(s.realThreatsMissed || 0);
  const lockdowns = Number(v.lockdowns || 0);
  const police = Number(v.policeCalls || 0);
  const suspicious = Number(v.suspiciousApprovals || 0);

  const reckless = rejects + flags * 0.5 + lockdowns * 0.4 + suspicious * 1.2;
  const cautious = checkIns * 0.35 + (flags > 0 ? flags * 0.2 : 0) - rejects * 0.15;
  const harsh = rejects + police * 0.6;
  const compromised = suspicious * 1.5 + Number(state?.dirtyLedger?.dirtyScore || 0) * 0.2;

  let profile = 'balanced';
  if (compromised >= 2.5 && suspicious >= 1) profile = 'compromised';
  else if (harsh >= 4 && rejects >= 2) profile = 'harsh';
  else if (reckless >= 5 && rejects >= 3) profile = 'reckless';
  else if (cautious >= 3 && rejects <= 1 && checkIns >= 2) profile = 'cautious';

  return {
    profile,
    checkIns,
    rejects,
    flags,
    ignored,
    lockdowns,
    police,
    suspicious
  };
}

export function maybeLogMoralityExtreme(state) {
  const m = computeV58MoralityProfile(state);
  if (m.profile === 'balanced') return;
  const last = state?.v58?._lastMoralityLog;
  if (last === m.profile) return;
  ensureV58State(state);
  state.v58._lastMoralityLog = m.profile;
  state.logs.push(`Desk morality read shifts toward: ${m.profile}.`);
}

export function finalizeV58EndNight(state) {
  if (!state) return;
  ensureV58State(state);
  const s = state.shiftStats || {};
  const leg = state.v58.legacy;

  if (Number(s.rejected || 0) >= 2 && Number(s.policyBroken || 0) >= 1) {
    leg.unfairRejects = Math.min(10, (leg.unfairRejects || 0) + 1);
  }
  if (Number(s.roomCallsMissed || 0) >= 2 || Number(s.severeIncidents || 0) >= 1) {
    leg.repeatedRoomIncidents = Math.min(10, (leg.repeatedRoomIncidents || 0) + 1);
  }
  if (Number(state.v58.morality?.lockdowns || 0) >= 2) {
    leg.excessiveLockdowns = Math.min(10, (leg.excessiveLockdowns || 0) + 1);
  }
  if (Number(state.v58.morality?.suspiciousApprovals || 0) >= 1) {
    leg.suspiciousGuestApproved = Math.min(10, (leg.suspiciousGuestApproved || 0) + 1);
  }
  if (Number(state.v58.morality?.policeCalls || 0) >= 2) {
    leg.policeSensitivity = Math.min(10, (leg.policeSensitivity || 0) + 1);
  }
  const hauntedBump =
    (state.v58.shadowTraces || []).length >= 2 || Number(s.falseAlarmReads || 0) >= 2;
  if (hauntedBump) {
    leg.hauntedRooms = Array.isArray(leg.hauntedRooms) ? leg.hauntedRooms : [];
    if (leg.hauntedRooms.length < 6) {
      leg.hauntedRooms.push(`Night ${state.night}: traces lingered in empty frames.`);
    }
  }

  const traces = state.v58.shadowTraces || [];
  const strongest = traces.reduce(
    (best, t) => (Number(t.pressure || 0) > Number(best?.pressure || 0) ? t : best),
    null
  );
  const traits = state.v58.traitHistogram || {};
  let topTrait = '—';
  let topN = 0;
  Object.keys(traits).forEach((k) => {
    if (traits[k] > topN) {
      topN = traits[k];
      topTrait = k;
    }
  });

  const moral = computeV58MoralityProfile(state);
  state.v58.lastNightClose = {
    weather: state.v58.weather,
    nightEvent: state.v58.nightEvent,
    moralityProfile: moral.profile,
    dominantTrait: topTrait,
    shadowCount: traces.length,
    shadowStrongest: strongest?.label || '',
    narrative: buildV58NightNarrative(state, moral, traces.length)
  };
}

function buildV58NightNarrative(state, moral, shadowCount) {
  const wx = String(state?.v58?.weather?.type || 'clear');
  const ev = String(state?.v58?.nightEvent?.label || 'Standard');
  const parts = [`${wx} air`, `${ev} pressure`, `operator read: ${moral.profile}`];
  if (shadowCount > 0) parts.push(`${shadowCount} shadow trace(s) on record`);
  return `The night closed as ${parts.join(' · ')}.`;
}

export function buildV58DossierHtml(state) {
  if (!state) return '';
  ensureV58State(state);
  const snap = state.v58.lastNightClose || {};
  const wx = snap.weather?.label || state.v58.weather?.label || '—';
  const ev = snap.nightEvent?.label || state.v58.nightEvent?.label || '—';
  const moral = snap.moralityProfile || computeV58MoralityProfile(state).profile;
  const trait = snap.dominantTrait || '—';
  const sc = Number(snap.shadowCount ?? (state.v58.shadowTraces || []).length);
  const strong = snap.shadowStrongest || '';
  const leg = state.v58.legacy || {};
  const legLine =
    Number(leg.unfairRejects || 0) +
      Number(leg.policeSensitivity || 0) +
      Number(leg.hauntedRooms?.length || 0) >
    0
      ? 'Legacy pressure lingers for the next shift.'
      : 'No strong legacy echo — yet.';
  const story = snap.narrative || buildV58NightNarrative(state, computeV58MoralityProfile(state), sc);

  const safe = (x) =>
    String(x ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/"/g, '&quot;');

  return `
    <div class="v58-dossier-panel" role="region" aria-label="Living motel v0.58">
      <h4 class="v56-dossier-heading">Living motel (v0.58)</h4>
      <ul class="v58-dossier-list muted">
        <li><strong>Weather:</strong> ${safe(wx)}</li>
        <li><strong>Night event:</strong> ${safe(ev)}</li>
        <li><strong>Morality profile:</strong> ${safe(moral)}</li>
        <li><strong>Common guest trait:</strong> ${safe(trait)}${topTraitCount(state, trait)}</li>
        <li><strong>Shadow traces:</strong> ${sc}${strong ? ` — strongest: ${safe(strong)}` : ''}</li>
        <li><strong>Legacy:</strong> ${safe(legLine)}</li>
      </ul>
      <p class="v58-dossier-narrative">${safe(story)}</p>
    </div>
  `;
}

function topTraitCount(state, trait) {
  if (!trait || trait === '—') return '';
  const h = state?.v58?.traitHistogram || {};
  const n = h[trait];
  return n ? ` (×${n})` : '';
}

export function applyOwnerAuditRepExtra(state, delta) {
  if (!state || typeof delta !== 'number' || delta >= 0) return delta;
  ensureV58State(state);
  if (String(state?.v58?.nightEvent?.id) !== 'owner-audit') return delta;
  if (state.v58.ownerAuditExtraRepApplied) return delta;
  if (safeRand() > 0.4) return delta;
  state.v58.ownerAuditExtraRepApplied = true;
  return delta - 1;
}

function escapeAttr(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/"/g, '&quot;');
}

export function syncV58ShiftStatusDom(state) {
  const el = document.getElementById('v58-shift-status');
  if (!el) return;
  ensureV58State(state);
  const wx = escapeAttr(state.v58.weather?.label || 'Clear');
  const ev = escapeAttr(state.v58.nightEvent?.label || 'Standard');
  const wt = String(state.v58.weather?.type || 'clear').replace(/[^a-z-]/gi, '') || 'clear';
  el.innerHTML = `<span class="v58-status-chip v58-weather-${wt}">Weather: ${wx}</span><span class="v58-status-chip v58-night-event">Tonight's risk: ${ev}</span>`;
}

export function syncV58VoiceToastDom(state) {
  const el = document.getElementById('v58-voice-intercept');
  if (!el) return;
  ensureV58State(state);
  const v = state.v58.voiceIntercept;
  if (!v || !v.line) {
    el.hidden = true;
    el.innerHTML = '';
    return;
  }
  el.hidden = false;
  const safe = (s) =>
    String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/"/g, '&quot;');
  el.innerHTML = `
    <div class="v58-voice-inner">
      <div class="v58-voice-wave" aria-hidden="true"></div>
      <div class="v58-voice-body">
        <span class="v58-voice-kicker">Audio intercept</span>
        <p class="v58-voice-line">${safe(v.line)}</p>
        <span class="v58-voice-meta">${safe(v.source)} · ${Number(v.atMinute || 0)}m</span>
      </div>
      <button type="button" class="button button-utility" data-v58-dismiss-voice="1">Dismiss</button>
    </div>
  `;
}

export function syncV58AtmosphereClasses(state) {
  const app = document.getElementById('app');
  if (!app) return;
  ensureV58State(state);
  ['v58-wx-clear', 'v58-wx-rain', 'v58-wx-storm', 'v58-wx-fog', 'v58-wx-wind', 'v58-ui-shake', 'v58-static-pulse', 'v58-cam-heavy'].forEach((c) =>
    app.classList.remove(c)
  );
  const w = String(state.v58.weather?.type || 'clear');
  if (WEATHER_TYPES.includes(w)) app.classList.add(`v58-wx-${w}`);
  const pressure = String(state?.uiPressureLevel || 'calm');
  app.dataset.v58Weather = w;
  app.dataset.v58NightEvent = String(state?.v58?.nightEvent?.id || 'none');
  if (pressure === 'dire' || pressure === 'emergency') {
    app.classList.add('v58-ui-shake');
  }
  if ((state.v58.shadowTraces || []).length > 0 || w === 'storm') {
    app.classList.add('v58-static-pulse');
  }
  if (w === 'storm' || w === 'fog' || (state.v58.shadowTraces || []).length >= 2) {
    app.classList.add('v58-cam-heavy');
  }
}

export function buildV58TraitChipsHtml(guest) {
  const traits = Array.isArray(guest?.v58Traits) ? guest.v58Traits : [];
  if (!traits.length) return '';
  return traits
    .map(
      (t) =>
        `<span class="v58-trait-chip" title="${String(TRAIT_FLAVOR[t] || t).replace(/"/g, '&quot;')}">${String(
          t || ''
        )}</span>`
    )
    .join('');
}
