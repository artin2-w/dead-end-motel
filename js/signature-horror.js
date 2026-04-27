/**
 * Dead End Motel — Signature Horror Events (v0.54)
 * 5 signature events + guest risk decoration.
 * Self-contained. Communicates via window.* globals only.
 * Never touches PayPal keys, purchase keys, or campaign persistence.
 */

// ── Event catalog ─────────────────────────────────────────────────

const HORROR_EVENTS = {
  camera_blink: {
    id: 'camera_blink',
    label: 'CAMERA ANOMALY',
    title: 'Camera Blink',
    body: 'Feed 3 showed the hallway from the wrong angle. The timestamp is three minutes ahead.',
    minNight: 2,
    cooldownMs: 90_000,
    triggerOnce: false,
    choices: [
      { id: 'review', label: 'Review feed', tone: 'caution' },
      { id: 'ignore', label: 'Ignore it', tone: 'ghost' }
    ]
  },
  phone_call: {
    id: 'phone_call',
    label: 'FRONT DESK',
    title: 'Desk Phone Ringing',
    body: null, // drawn from pool at trigger time
    minNight: 1,
    cooldownMs: 120_000,
    triggerOnce: false,
    choices: [
      { id: 'answer', label: 'Answer', tone: 'caution' },
      { id: 'ignore', label: 'Let it ring', tone: 'ghost' },
      { id: 'trace', label: 'Trace the call', tone: 'secondary' }
    ]
  },
  mirror_guest: {
    id: 'mirror_guest',
    label: 'DESK ALERT',
    title: 'Mirror Guest',
    body: 'The guest at the counter has no reflection in the window behind the desk. Their ID is valid. Their expression has not changed.',
    minNight: 2,
    cooldownMs: 180_000,
    triggerOnce: false,
    choices: [
      { id: 'check_id', label: 'Check ID again', tone: 'caution' },
      { id: 'question', label: 'Ask follow-up', tone: 'secondary' },
      { id: 'flag', label: 'Flag guest', tone: 'caution' },
      { id: 'accept', label: 'Accept anyway', tone: 'ghost' }
    ]
  },
  power_flicker: {
    id: 'power_flicker',
    label: 'POWER GRID',
    title: 'Power Flicker',
    body: 'The hallway lights snapped off and came back on. Something drew from the main line.',
    minNight: 3,
    cooldownMs: 120_000,
    triggerOnce: false,
    choices: [
      { id: 'stabilize', label: 'Stabilize grid', tone: 'caution' },
      { id: 'cut_power', label: 'Cut nonessential power', tone: 'secondary' },
      { id: 'ignore', label: 'Ignore', tone: 'ghost' }
    ]
  },
  room_7: {
    id: 'room_7',
    label: 'ROOM ALERT',
    title: 'Room 7 Warning',
    body: 'The key for Room 7 is back on the desk. You did not put it there.',
    minNight: 3,
    cooldownMs: 86_400_000, // one per night (also enforced by triggerOnce)
    triggerOnce: true,
    choices: [
      { id: 'lock', label: 'Lock the drawer', tone: 'secondary' },
      { id: 'inspect', label: 'Inspect Room 7', tone: 'caution' },
      { id: 'give_key', label: 'Give key if requested', tone: 'ghost' }
    ]
  }
};

const PHONE_CALL_LINES = [
  'Room 204 never checked out.',
  'Do not look at Camera 3.',
  'The sign is not supposed to be on.',
  'If Room 7 calls, do not answer twice.',
  'The last clerk left something in the desk drawer.',
  'The hallway is not empty right now.'
];

const HIGH_RISK_TRAITS  = ['No luggage', 'Cash only', 'Asked for exit room', 'Avoids camera', 'Nervous energy', 'ID mismatch', 'Late arrival', 'Too calm'];
const MEDIUM_RISK_TRAITS = ['Paid cash', 'Minimal ID', 'Room preference unusual', 'Avoids eye contact', 'Contradictory details'];
const LOW_RISK_TRAITS   = ['Quiet arrival', 'Pre-booked', 'Standard ID'];

// ── In-memory horror state ────────────────────────────────────────

const hs = {
  activeEvent:      null,
  cooldowns:        {},     // { eventId: lastFiredTimestampMs }
  firedThisNight:   [],     // eventIds fired this session/night
  ignoredEvents:    [],     // { eventId, night } — for failure recap
  currentNight:     1,
  lastCheckMs:      0
};

// exposed for failure recap in main.js
window.demHorrorIgnoredEvents = hs.ignoredEvents;

// ── Helpers ───────────────────────────────────────────────────────

function canFire(def, state) {
  if (hs.activeEvent) return false;
  const night = Number(state?.night || 1);
  if (night < def.minNight) return false;
  if (def.triggerOnce && hs.firedThisNight.includes(def.id)) return false;
  const elapsed = Date.now() - (hs.cooldowns[def.id] || 0);
  if (elapsed < def.cooldownMs) return false;
  return true;
}

function hasCampaignUnlock(id) {
  try {
    const arr = JSON.parse(localStorage.getItem('dem.campaign.unlocks') || '[]');
    return Array.isArray(arr) && arr.includes(id);
  } catch { return false; }
}

function calmReduction() {
  return window.demCalmModeActive ? 0.5 : 1.0;
}

// ── Trigger conditions ────────────────────────────────────────────

function tryFireCameraBlink(state) {
  const def = HORROR_EVENTS.camera_blink;
  if (!canFire(def, state)) return false;
  const elapsed = Number(state?.shiftElapsedMinutes || 0);
  if (elapsed < 15) return false;
  const pressure = Number(state?.dirtyPressure || 0);
  const roll = hasCampaignUnlock('camera_archive') ? 0.35 : 0.22;
  if (pressure < 2 && Math.random() > roll * 0.5) return false;
  if (Math.random() > roll) return false;
  fireEvent('camera_blink', state);
  return true;
}

function tryFirePhoneCall(state) {
  const def = HORROR_EVENTS.phone_call;
  if (!canFire(def, state)) return false;
  const elapsed = Number(state?.shiftElapsedMinutes || 0);
  if (elapsed < 10) return false;
  const incidents = Array.isArray(state?.incidents) ? state.incidents.length : 0;
  const pressure = Number(state?.dirtyPressure || 0);
  const chance = 0.07 + (incidents * 0.03) + (pressure * 0.015);
  if (Math.random() > chance) return false;
  fireEvent('phone_call', state);
  return true;
}

function tryFireMirrorGuest(state) {
  const def = HORROR_EVENTS.mirror_guest;
  if (!canFire(def, state)) return false;
  const guests = Array.isArray(state?.guests) ? state.guests.filter(g => !g.checkedIn && !g.rejected) : [];
  if (guests.length === 0) return false;
  const hasHigh = guests.some(g => String(g?.riskLevel || '').toLowerCase() === 'high');
  const chance = hasHigh ? 0.22 : 0.10;
  if (Math.random() > chance) return false;
  fireEvent('mirror_guest', state);
  return true;
}

function tryFirePowerFlicker(state) {
  const def = HORROR_EVENTS.power_flicker;
  if (!canFire(def, state)) return false;
  const elapsed = Number(state?.shiftElapsedMinutes || 0);
  if (elapsed < 20) return false;
  const power = Number(state?.power || 100);
  const pressure = Number(state?.dirtyPressure || 0);
  let chance = 0.10;
  if (power <= 30 || pressure >= 6) chance = 0.40;
  else if (power <= 55 || pressure >= 4) chance = 0.20;
  if (Math.random() > chance) return false;
  fireEvent('power_flicker', state);
  return true;
}

function tryFireRoom7(state) {
  const def = HORROR_EVENTS.room_7;
  if (!canFire(def, state)) return false;
  const elapsed = Number(state?.shiftElapsedMinutes || 0);
  if (elapsed < 25) return false;
  if (Math.random() > 0.28) return false;
  fireEvent('room_7', state);
  return true;
}

// ── Fire ──────────────────────────────────────────────────────────

function fireEvent(eventId, state) {
  const def = HORROR_EVENTS[eventId];
  if (!def) return;
  hs.cooldowns[eventId] = Date.now();
  if (!hs.firedThisNight.includes(eventId)) hs.firedThisNight.push(eventId);

  let body = def.body;
  if (eventId === 'phone_call') {
    body = PHONE_CALL_LINES[Math.floor(Math.random() * PHONE_CALL_LINES.length)];
  }

  // Build choices, optionally injecting campaign-unlocked options
  let choices = def.choices.slice();
  if (eventId === 'power_flicker' && hasCampaignUnlock('emergency_generator')) {
    choices = [
      choices.find(c => c.id === 'stabilize'),
      { id: 'generator', label: 'Use Emergency Generator', tone: 'primary' },
      choices.find(c => c.id === 'cut_power'),
      choices.find(c => c.id === 'ignore')
    ].filter(Boolean);
  }

  hs.activeEvent = { id: eventId, def, body, choices, night: Number(state?.night || 1) };
  console.log('Signature horror event triggered', eventId);

  renderHorrorPanel();
  if (eventId === 'camera_blink') flashCameraEffect();
  if (eventId === 'power_flicker') flickerPowerEffect();
}

// ── Outcomes ──────────────────────────────────────────────────────

function getOutcome(eventId, choiceId) {
  const mult = calmReduction();
  switch (eventId) {
    case 'camera_blink':
      return choiceId === 'review'
        ? { dp: Math.round(1 * mult), pw: -3, msg: 'Feed reviewed. Timestamp gap logged. Pressure contained for now.', tone: 'info' }
        : { dp: Math.round(2 * mult), pw: 0,  msg: 'Anomaly ignored. The hallway felt different after.', tone: 'warning' };

    case 'phone_call':
      if (choiceId === 'answer') return { dp: Math.round(1 * mult), pw: 0,  money: 0,  msg: 'Call disconnected immediately. A clue, maybe.', tone: 'info' };
      if (choiceId === 'trace')  return { dp: 0, pw: -4, money: -5,   msg: 'Trace ran cold. Line routed through a disconnected room.', tone: 'info' };
      return                            { dp: Math.round(2 * mult), pw: 0,  msg: 'The phone stopped. The silence felt louder.', tone: 'warning' };

    case 'mirror_guest':
      if (choiceId === 'check_id') return { dp: 0, pw: 0,  rep: -1, msg: 'Second check found a subtle inconsistency. Flagged internally.', tone: 'info' };
      if (choiceId === 'question')  return { dp: 0, pw: 0,  rep: 0,  msg: 'Follow-up noted. The guest gave identical answers, word for word.', tone: 'info' };
      if (choiceId === 'flag')      return { dp: -1, pw: 0, rep: -2, msg: 'Guest flagged. Reputation takes a small hit — flagging has a cost.', tone: 'info' };
      return                               { dp: Math.round(3 * mult), pw: 0, msg: 'Guest accepted. Something in the motel shifted.', tone: 'warning' };

    case 'power_flicker':
      if (choiceId === 'stabilize')  return { dp: 0, pw: -8,  money: -10, msg: 'Grid stabilized. Cost: power draw and emergency funds.', tone: 'info' };
      if (choiceId === 'generator')  return { dp: -1, pw: 12, money: -8,  msg: 'Emergency generator engaged. Grid holding steady.', tone: 'info' };
      if (choiceId === 'cut_power')  return { dp: Math.round(1 * mult), pw: 5, rep: -1, msg: 'Nonessential power cut. Grid holding but guests noticed.', tone: 'info' };
      return                                { dp: Math.round(3 * mult), pw: -5, msg: 'Flicker ignored. Power drained further. Pressure rose.', tone: 'warning' };

    case 'room_7':
      if (choiceId === 'lock')     return { dp: 0,  pw: 0,  rep: -1, msg: 'Drawer locked. Whatever it means, it stays contained.', tone: 'info' };
      if (choiceId === 'inspect')  return { dp: Math.round(2 * mult), pw: -3, msg: 'Room 7 inspection revealed nothing — but the pressure lingers.', tone: 'warning' };
      return                              { dp: Math.round(4 * mult), pw: -5, msg: 'The key was given. Room 7 is open. Something shifted.', tone: 'danger' };

    default:
      return { dp: 0, pw: 0, msg: '', tone: 'info' };
  }
}

function applyOutcome(out, state) {
  if (!state) return;
  try {
    if (out.dp) state.dirtyPressure = Math.max(0, Math.min(10, Number(state.dirtyPressure || 0) + out.dp));
    if (out.pw) state.power         = Math.max(0, Math.min(100, Number(state.power || 0) + out.pw));
    if (out.money) state.money      = Math.max(0, Number(state.money || 0) + out.money);
    if (out.rep) state.reputation   = Math.max(0, Math.min(100, Number(state.reputation || 0) + out.rep));
  } catch { /* ignore */ }
}

// ── Resolve ───────────────────────────────────────────────────────

function resolveEvent(eventId, choiceId) {
  const ev = hs.activeEvent;
  if (!ev || ev.id !== eventId) return;
  const state = window.__demHorrorGameState__;
  const out = getOutcome(eventId, choiceId);

  hs.activeEvent = null;
  console.log('Signature horror event resolved', { eventId, choice: choiceId, outcome: out.msg });

  applyOutcome(out, state);

  if (choiceId === 'ignore' || choiceId === 'accept' || choiceId === 'give_key') {
    hs.ignoredEvents.push({ eventId, night: Number(state?.night || 1) });
  }

  closeHorrorPanel();

  if (out.msg) {
    try { window.demHorrorPushAlert?.(out.msg, out.tone); } catch { /* ignore */ }
  }
}
window.demHorrorResolveEvent = resolveEvent;

// ── Panel rendering ───────────────────────────────────────────────

function renderHorrorPanel() {
  const panel = document.getElementById('dem-horror-panel');
  if (!panel) return;
  const ev = hs.activeEvent;
  if (!ev) { panel.hidden = true; return; }

  const esc = (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const btns = ev.choices.map(c =>
    `<button type="button" class="dem-horror-btn dem-horror-btn--${c.tone}" data-horror-key="${esc(ev.id)}|${esc(c.id)}">${esc(c.label)}</button>`
  ).join('');

  panel.innerHTML = `<div class="dem-horror-inner">
    <p class="dem-horror-tag">${esc(ev.def.label)}</p>
    <h3 class="dem-horror-title">${esc(ev.def.title)}</h3>
    <p class="dem-horror-body">${esc(ev.body || '')}</p>
    <div class="dem-horror-choices">${btns}</div>
  </div>`;

  panel.hidden = false;
  panel.setAttribute('aria-hidden', 'false');

  panel.querySelectorAll('[data-horror-key]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.disabled) return;
      btn.disabled = true;
      const [eid, cid] = String(btn.dataset.horrorKey || '').split('|');
      if (eid && cid) resolveEvent(eid, cid);
    });
  });
}

function closeHorrorPanel() {
  const panel = document.getElementById('dem-horror-panel');
  if (!panel) return;
  panel.classList.add('dem-horror-panel--out');
  setTimeout(() => {
    panel.hidden = true;
    panel.setAttribute('aria-hidden', 'true');
    panel.innerHTML = '';
    panel.classList.remove('dem-horror-panel--out');
  }, 280);
}

// ── Visual effects ────────────────────────────────────────────────

function flashCameraEffect() {
  const el = document.getElementById('v51-camera-digest');
  if (!el) return;
  el.classList.add('dem-camera-blink');
  setTimeout(() => el.classList.remove('dem-camera-blink'), 2800);
}

function flickerPowerEffect() {
  const el = document.getElementById('app');
  if (!el) return;
  el.classList.add('dem-power-flicker');
  setTimeout(() => el.classList.remove('dem-power-flicker'), 3200);
}

// ── Guest risk trait decoration ───────────────────────────────────

function decorateGuestCards(guests) {
  if (!Array.isArray(guests)) return;
  const queue = document.getElementById('guest-queue');
  if (!queue) return;
  guests.forEach(g => {
    if (!g?.id) return;
    const card = queue.querySelector(`[data-guestid="${g.id}"]`);
    if (!card || card.querySelector('.dem-risk-traits')) return;
    const risk = String(g?.riskLevel || '').toLowerCase();
    const traits = pickTraits(g, risk);
    if (traits.length === 0) return;
    const chips = traits.map(t => `<span class="dem-risk-chip">${t}</span>`).join('');
    const row = document.createElement('div');
    row.className = 'dem-risk-traits';
    row.innerHTML = `<span class="dem-risk-level dem-risk-level--${risk}">${riskLabel(risk)}</span>${chips}`;
    const hdr = card.querySelector('.guest-card-header');
    hdr ? hdr.after(row) : card.prepend(row);
  });
}

function pickTraits(guest, risk) {
  const seed = String(guest?.id || '0').split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const pseudo = (n) => ((seed * 31 + n * 17) % 97) / 97;
  const deception   = Number(guest?.deceptionSignal   || 0);
  const instability = Number(guest?.instabilitySignal || 0);
  const traits = [];
  if (risk === 'high') {
    const pool = HIGH_RISK_TRAITS;
    const count = 2 + (deception >= 2 || instability >= 2 ? 1 : 0);
    for (let i = 0; i < count && traits.length < 4; i++) {
      const t = pool[Math.floor(pseudo(i * 7) * pool.length)];
      if (!traits.includes(t)) traits.push(t);
    }
  } else if (risk === 'medium') {
    if (pseudo(3) < 0.65) {
      const pool = MEDIUM_RISK_TRAITS;
      const t1 = pool[Math.floor(pseudo(11) * pool.length)];
      traits.push(t1);
      if (pseudo(19) < 0.5) {
        const t2 = pool[Math.floor(pseudo(23) * pool.length)];
        if (t2 !== t1) traits.push(t2);
      }
    }
  } else if (pseudo(5) < 0.18) {
    traits.push(LOW_RISK_TRAITS[seed % LOW_RISK_TRAITS.length]);
  }
  return traits;
}

function riskLabel(risk) {
  if (risk === 'high')    return 'Risk: High';
  if (risk === 'medium')  return 'Risk: Medium';
  if (risk === 'low')     return 'Risk: Low';
  return 'Risk: Unknown';
}

// ── Failure recap strip ───────────────────────────────────────────

function renderFailureHorrorFactors() {
  const el = document.getElementById('dem-failure-horror-factors');
  if (!el) return;
  const LABELS = {
    camera_blink:  'Camera anomaly ignored',
    phone_call:    'Phone warning unanswered',
    mirror_guest:  'Mirror Guest accepted without scrutiny',
    power_flicker: 'Power flicker ignored',
    room_7:        'Room 7 key mishandled'
  };
  const relevant = hs.ignoredEvents.filter(e => LABELS[e.eventId]);
  if (relevant.length === 0) { el.hidden = true; return; }
  const items = relevant.map(e => `<li>${LABELS[e.eventId]}</li>`).join('');
  el.innerHTML = `<p class="dem-fail-horror-head">Contributing factors:</p><ul class="dem-fail-horror-list">${items}</ul>`;
  el.hidden = false;
}
window.demHorrorRenderFailureFactors = renderFailureHorrorFactors;

// ── Public window API ─────────────────────────────────────────────

window.demHorrorMaybeTrigger = function demHorrorMaybeTrigger(state) {
  if (!state) return;
  window.__demHorrorGameState__ = state;

  // Throttle: check at most every ~8s of real time
  if (Date.now() - hs.lastCheckMs < 8000) return;
  hs.lastCheckMs = Date.now();

  const night = Number(state?.night || 1);
  if (night !== hs.currentNight) {
    hs.currentNight = night;
    hs.firedThisNight = [];
  }

  // Priority order — most consequential first
  if (tryFireRoom7(state))        return;
  if (tryFirePowerFlicker(state)) return;
  if (tryFireCameraBlink(state))  return;
  if (tryFireMirrorGuest(state))  return;
  if (tryFirePhoneCall(state))    return;
};

window.demHorrorRender = function demHorrorRender(guests) {
  if (hs.activeEvent) renderHorrorPanel();
  if (guests) decorateGuestCards(guests);
};

window.demHorrorGetActiveEvents = function demHorrorGetActiveEvents() {
  return hs.activeEvent ? [{ id: hs.activeEvent.id, title: hs.activeEvent.def.title }] : [];
};

// Manual dev trigger (for testing only — not exposed in UI)
window.demTriggerHorrorEvent = function demTriggerHorrorEvent(eventId) {
  const s = window.__demHorrorGameState__ || { night: 3, dirtyPressure: 5, power: 50, shiftElapsedMinutes: 30, guests: [] };
  // Clear cooldown and once-flag so it can always re-fire for testing
  delete hs.cooldowns[eventId];
  hs.firedThisNight = hs.firedThisNight.filter(id => id !== eventId);
  hs.activeEvent = null;
  fireEvent(eventId, s);
};
