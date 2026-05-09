/**
 * Dead End Motel v0.60 — Motel memory, veil, evolving horror, guest narrative,
 * radio/booth extensions, collectibles. Defensive; save-safe; itch-safe.
 */

import { pushLiveAlert } from './presentation.js';
import { isV59DevEnabled } from './v59-paranoia.js';

const V60_VERSION = 60;

const ARCHETYPES = [
  'lost_driver',
  'quiet_nurse',
  'salesman',
  'runaway',
  'old_regular',
  'kind_guest',
  'wrong_name',
  'watcher_touched'
];

const WEIRD_REQUESTS = [
  { id: 'no_mirror', label: 'No mirror in the room', risk: 1, note: 'Glass behaves strangely on this route.' },
  { id: 'red_light', label: 'Red light only — no white bulbs', risk: 1, note: 'Easier to miss stains; harder to read faces on cams.' },
  { id: 'away_phones', label: 'As far from lobby phones as possible', risk: 1, note: 'Routing pressure if only high-traffic rooms are vacant.' },
  { id: 'no_neighbor', label: 'No adjacent occupied room', risk: 1, note: 'Limits assignment options during full nights.' },
  { id: 'no_housekeeping', label: 'Do not clean the room tonight', risk: 2, note: 'If something happens, evidence lingers.' }
];

const SECRET_SEEDS = [
  'They keep checking a name that is not on the ID.',
  'They know the basement stair count without being told.',
  'They flinch when the scanner mentions county plates.',
  'They ask if the neon still spells the same thing.',
  'They tip in old coins that feel too warm.',
  'They mention a checkout time that never existed on the ledger.'
];

const ANOMALIES = [
  {
    id: 'dead-birds',
    label: 'Dead birds under the sign',
    desc: 'The lot crew swept twice. The pile returns.',
    modifier: 'birds'
  },
  {
    id: 'clock-back',
    label: 'Clock runs backward',
    desc: 'The office wall clock ticks wrong. Time feels negotiable.',
    modifier: 'clock'
  },
  {
    id: 'phone-dials',
    label: 'Phone dials itself',
    desc: 'The handset lifts a fraction when nobody is touching it.',
    modifier: 'phone'
  },
  {
    id: 'vending-whisper',
    label: 'Vending machine whispers',
    desc: 'Change falls out with no purchase. The coil hums a vowel.',
    modifier: 'vending'
  },
  {
    id: 'neon-wrong',
    label: 'Neon says wrong word',
    desc: 'One letter refuses to light the way it used to.',
    modifier: 'neon'
  },
  {
    id: 'warm-key',
    label: 'Room key warm to touch',
    desc: 'Metal holds heat that should not be there.',
    modifier: 'warmkey'
  },
  {
    id: 'long-hall',
    label: 'Hallway longer than usual',
    desc: 'Pacing the same stretch adds steps on the pedometer.',
    modifier: 'hall'
  }
];

const NEON_POOL = [
  'DEAD END MOTEL',
  'DEAD INSIDE MOTEL',
  'NO VACANCY / NO EXIT',
  'ROOMS REMEMBER',
  'STAY UNTIL DAWN',
  'KEYS DO NOT RETURN',
  'THE DESK OWES YOU NOTHING'
];

const STAFF_NOTE_CATALOG = [
  {
    id: 'quiet-hall-3',
    text: 'Do not trust a quiet hallway after 3 AM.',
    unlock: (s) => Number(s?.night || 1) >= 2
  },
  {
    id: 'neon-no-exit',
    text: 'If the neon says NO EXIT, do not answer the outside phone.',
    unlock: (s) => getVeilValue(s) >= 40 || String(s?.v60?.nightEvolution?.neonMessage || '').includes('EXIT')
  },
  {
    id: 'room-04-plan',
    text: 'Room 04 was removed from the floor plan twice.',
    unlock: (s) => Number(s?.night || 1) >= 3 || (s?.v60?.motelMemory?.roomsHaunted || []).some((x) => Number(x) === 4)
  },
  {
    id: 'owner-handwriting',
    text: 'The owner never leaves notes in handwriting.',
    unlock: (s) => getVeilValue(s) >= 55
  },
  {
    id: 'fuse-kindness',
    text: 'Sometimes kindness is a fuse someone else already pulled.',
    unlock: (s) => Number(s?.v60?.motelMemory?.kindnessDebt || 0) >= 2
  },
  {
    id: 'scanner-plate',
    text: 'Police scanner lies less than the parking lot cameras.',
    unlock: (s) => (s?.v60?.radio?.foundSignals || []).includes('police')
  },
  {
    id: 'booth-curse',
    text: 'The outside booth remembers voices it never carried.',
    unlock: (s) => Boolean(s?.v60?.phoneBooth?.cursed)
  }
];

const GUEST_CARD_BLUEPRINTS = [
  {
    id: 'card-old-regular',
    title: 'Old Regular',
    rarity: 'common',
    passiveHint: 'Low-risk reads feel slightly steadier at the desk.',
    pick: (s) => Number(s?.shiftStats?.checkedIn || 0) >= 1 && (s?.v60?.motelMemory?.acceptedDangerousGuests || 0) === 0
  },
  {
    id: 'card-false-smile',
    title: 'False Smile',
    rarity: 'uncommon',
    passiveHint: 'Polite guests ping a little louder on your intuition.',
    pick: (s) => (s?.v60?.motelMemory?.rejectedInnocents || 0) >= 1
  },
  {
    id: 'card-room-knocked',
    title: 'The Room That Knocked Back',
    rarity: 'rare',
    passiveHint: 'Haunted units show their strain earlier on the board.',
    pick: (s) => (s?.v60?.motelMemory?.roomsHaunted || []).length >= 1
  },
  {
    id: 'card-no-mirror',
    title: 'No Mirror Request',
    rarity: 'uncommon',
    passiveHint: 'Mirror-adjacent oddities are easier to anticipate.',
    pick: (s) =>
      Array.isArray(s?.guests) &&
      s.guests.some((g) => g?.v60Story?.weirdRequest?.id === 'no_mirror')
  },
  {
    id: 'card-booth-line',
    title: 'Wet Dime Line',
    rarity: 'cursed',
    passiveHint: 'The booth line listens before it speaks.',
    pick: (s) => Number(s?.v60?.phoneBooth?.answered || 0) >= 1
  },
  {
    id: 'card-veil-thin',
    title: 'Thin Glass Clerk',
    rarity: 'rare',
    passiveHint: 'When the veil is thin, your first read costs less tension.',
    pick: (s) => getVeilValue(s) >= 50
  }
];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n));
}

export function ensureV60State(state) {
  if (!state || typeof state !== 'object') return;
  if (!state.v60 || typeof state.v60 !== 'object') {
    state.v60 = {};
  }
  const v = state.v60;
  if (v.version !== V60_VERSION) v.version = V60_VERSION;
  if (!v.motelMemory || typeof v.motelMemory !== 'object') {
    v.motelMemory = {
      acceptedDangerousGuests: 0,
      rejectedInnocents: 0,
      ignoredIncidents: 0,
      lockdownsUsed: 0,
      contrabandKept: 0,
      roomsHaunted: [],
      guestsRemembered: [],
      kindnessDebt: 0,
      syndicateHeatEcho: 0,
      policeAttentionEcho: 0
    };
  }
  const mm = v.motelMemory;
  [
    'acceptedDangerousGuests',
    'rejectedInnocents',
    'ignoredIncidents',
    'lockdownsUsed',
    'contrabandKept',
    'kindnessDebt',
    'syndicateHeatEcho',
    'policeAttentionEcho'
  ].forEach((k) => {
    if (typeof mm[k] !== 'number' || Number.isNaN(mm[k])) mm[k] = 0;
  });
  if (!Array.isArray(mm.roomsHaunted)) mm.roomsHaunted = [];
  if (!Array.isArray(mm.guestsRemembered)) mm.guestsRemembered = [];
  mm.roomsHaunted = mm.roomsHaunted.map((x) => Number(x)).filter((x) => !Number.isNaN(x));
  if (!v.veil || typeof v.veil !== 'object') {
    v.veil = { value: 0, label: 'stable', lastChangedBy: '' };
  }
  if (typeof v.veil.value !== 'number' || Number.isNaN(v.veil.value)) v.veil.value = 0;
  v.veil.value = clamp(Number(v.veil.value), 0, 100);
  if (!v.nightEvolution || typeof v.nightEvolution !== 'object') {
    v.nightEvolution = {
      stage: 1,
      visualTheme: 'tired',
      anomalyOfNight: null,
      neonMessage: 'DEAD END MOTEL',
      supernaturalWeather: null
    };
  }
  if (!v.collectibles || typeof v.collectibles !== 'object') {
    v.collectibles = { guestCards: [], newCardsTonight: [] };
  }
  if (!Array.isArray(v.collectibles.guestCards)) v.collectibles.guestCards = [];
  if (!Array.isArray(v.collectibles.newCardsTonight)) v.collectibles.newCardsTonight = [];
  if (!v.radio || typeof v.radio !== 'object') {
    v.radio = { lastStation: null, foundSignals: [], history: [] };
  }
  if (!Array.isArray(v.radio.foundSignals)) v.radio.foundSignals = [];
  if (!Array.isArray(v.radio.history)) v.radio.history = [];
  if (!v.phoneBooth || typeof v.phoneBooth !== 'object') {
    v.phoneBooth = {
      status: 'silent',
      answered: 0,
      ignored: 0,
      cursed: false,
      lastMessage: '',
      lastRingMinute: -999,
      pendingOffer: null
    };
  }
  if (!v.staffNotes || typeof v.staffNotes !== 'object') {
    v.staffNotes = { found: [] };
  }
  if (!Array.isArray(v.staffNotes.found)) v.staffNotes.found = [];
  if (typeof v.phoneBooth.answered !== 'number') v.phoneBooth.answered = 0;
  if (typeof v.phoneBooth.ignored !== 'number') v.phoneBooth.ignored = 0;
  if (typeof v.phoneBooth.cursed !== 'boolean') v.phoneBooth.cursed = false;
  if (typeof v.phoneBooth.lastMessage !== 'string') v.phoneBooth.lastMessage = '';
  if (typeof v.phoneBooth.status !== 'string') v.phoneBooth.status = 'silent';
  if (typeof v.phoneBooth.lastRingMinute !== 'number') v.phoneBooth.lastRingMinute = -999;
}

export function resetV60ForNewShift(state) {
  ensureV60State(state);
  state.v60.collectibles.newCardsTonight = [];
  state.v60.phoneBooth.status = 'silent';
  state.v60.phoneBooth.pendingOffer = null;
  if (state.v60._visualOverrideUntil) state.v60._visualOverrideUntil = 0;
}

export function getVeilValue(state) {
  ensureV60State(state);
  return clamp(Number(state.v60.veil.value || 0), 0, 100);
}

export function veilLabelFromValue(val) {
  const v = clamp(Number(val || 0), 0, 100);
  if (v >= 75) return { key: 'open', label: 'OPEN' };
  if (v >= 50) return { key: 'fractured', label: 'FRACTURED' };
  if (v >= 25) return { key: 'thin', label: 'THIN' };
  return { key: 'stable', label: 'STABLE' };
}

function setVeil(state, next, reason) {
  ensureV60State(state);
  const prev = getVeilValue(state);
  const n = clamp(Math.round(Number(next)), 0, 100);
  state.v60.veil.value = n;
  const L = veilLabelFromValue(n);
  state.v60.veil.label = L.key;
  if (reason && n !== prev) state.v60.veil.lastChangedBy = String(reason).slice(0, 120);
}

export function adjustVeil(state, delta, reason) {
  ensureV60State(state);
  setVeil(state, getVeilValue(state) + Number(delta || 0), reason);
}

export function getV60NightStage(state) {
  const n = Math.max(1, Number(state?.night || 1));
  return clamp(n, 1, 5);
}

export function getV60MotelMood(state) {
  ensureV60State(state);
  const mm = state.v60.motelMemory;
  if (mm.rejectedInnocents >= 4) return 'ashamed';
  if (mm.acceptedDangerousGuests >= 5) return 'predatory';
  if (mm.ignoredIncidents >= 5) return 'neglectful';
  if (mm.kindnessDebt >= 3) return 'indebted';
  if (getVeilValue(state) >= 70) return 'fractured';
  if (mm.policeAttentionEcho >= 4) return 'watched';
  if (mm.syndicateHeatEcho >= 4) return 'compromised';
  return 'uneasy';
}

export function getV60ReputationGainMult(state) {
  ensureV60State(state);
  const rj = Number(state.v60.motelMemory.rejectedInnocents || 0);
  if (rj >= 6) return 0.72;
  if (rj >= 3) return 0.85;
  return 1;
}

export function rollV60NightEvolution(state) {
  ensureV60State(state);
  const stage = getV60NightStage(state);
  state.v60.nightEvolution.stage = stage;
  const themes = ['tired', 'stained', 'heavy', 'neon-sick', 'fractured'];
  state.v60.nightEvolution.visualTheme = themes[stage - 1] || 'fractured';
  const ano = pick(ANOMALIES);
  state.v60.nightEvolution.anomalyOfNight = { id: ano.id, label: ano.label, desc: ano.desc, modifier: ano.modifier };
  let neon = pick(NEON_POOL);
  if (stage <= 1) neon = 'DEAD END MOTEL';
  else if (Math.random() < 0.35) neon = pick(NEON_POOL);
  state.v60.nightEvolution.neonMessage = neon;
  const wx = String(state?.v58?.weather?.type || 'clear');
  const sup = rollSupernaturalWeather(wx, stage, getVeilValue(state));
  state.v60.nightEvolution.supernaturalWeather = sup;
  tryUnlockStaffNotes(state, 'night-roll');
  rollV60AnomalyRoomHook(state);
}

export function getV60SupernaturalWeatherLine(state) {
  ensureV60State(state);
  return state.v60.nightEvolution?.supernaturalWeather?.line || '';
}

function rollSupernaturalWeather(baseWx, stage, veil) {
  if (stage < 2 && veil < 40) return null;
  const roll = Math.random();
  if (roll > 0.42 + stage * 0.04) return null;
  if (baseWx === 'fog' && veil >= 30) return { key: 'fog-ghost', line: 'Fog — camera depth unreliable' };
  if (baseWx === 'storm' || baseWx === 'rain') return { key: 'storm-grid', line: 'Storm — grid unstable' };
  if (veil >= 70 && roll < 0.12) return { key: 'reverse-rain', line: 'Reverse rain — exterior cameras disagree' };
  if (veil >= 65 && roll < 0.18) return { key: 'blood-rain', line: 'Iron rain — sky tastes wrong; no wounds on glass' };
  if (baseWx === 'wind' || Math.random() < 0.2) return { key: 'silent-wind', line: 'Silent wind — sound drops between gusts' };
  return { key: 'pressure-weird', line: 'Air pressure lies — ears pop on still air' };
}

export function applyV60MemoryFromDecision(state, decision) {
  if (!state || !decision || typeof decision !== 'object') return;
  ensureV60State(state);
  const kind = String(decision.kind || '');
  const mm = state.v60.motelMemory;
  if (kind === 'checkin-dangerous') {
    mm.acceptedDangerousGuests += 1;
    adjustVeil(state, 4 + Math.min(4, mm.acceptedDangerousGuests), 'dangerous check-in');
    rememberGuestName(state, decision.guestName);
  } else if (kind === 'reject-innocent') {
    mm.rejectedInnocents += 1;
    adjustVeil(state, 2, 'policy reject innocent');
    rememberGuestName(state, decision.guestName);
    pushEchoLog(state, `[Memory] A rejected name lingers in the margin: ${decision.guestName || 'UNKNOWN'}.`);
  } else if (kind === 'ignore-incident') {
    mm.ignoredIncidents += 1;
    adjustVeil(state, 3, 'ignored incident');
  } else if (kind === 'lockdown') {
    mm.lockdownsUsed += 1;
    adjustVeil(state, 1.5, 'lockdown');
  } else if (kind === 'contraband-confiscate' || kind === 'contraband-ignore') {
    mm.contrabandKept += 1;
    mm.syndicateHeatEcho = Math.min(20, mm.syndicateHeatEcho + 1);
    adjustVeil(state, kind === 'contraband-ignore' ? 2 : 1, 'contraband');
  } else if (kind === 'contraband-report') {
    adjustVeil(state, -2, 'contraband reported');
    mm.kindnessDebt = Math.max(0, mm.kindnessDebt - 0.5);
  } else if (kind === 'police-heavy') {
    mm.policeAttentionEcho = Math.min(20, mm.policeAttentionEcho + 1);
    adjustVeil(state, 1, 'police call');
  } else if (kind === 'resolve-clean') {
    adjustVeil(state, -1.5, 'clean resolution');
    mm.kindnessDebt = Math.min(12, mm.kindnessDebt + 0.35);
  } else if (kind === 'shadow-trace') {
    adjustVeil(state, 2.5, 'shadow trace');
  } else if (kind === 'kindness-trap') {
    mm.kindnessDebt = Math.min(12, mm.kindnessDebt + 1);
    adjustVeil(state, 1, 'kind guest weight');
  }
  const L = veilLabelFromValue(getVeilValue(state));
  state.v60.veil.label = L.key;
  tryUnlockStaffNotes(state, 'memory');
}

function rememberGuestName(state, name) {
  const n = String(name || '').trim();
  if (!n) return;
  const arr = state.v60.motelMemory.guestsRemembered;
  if (!arr.includes(n)) arr.push(n);
  if (arr.length > 40) arr.splice(0, arr.length - 40);
}

function pushEchoLog(state, line) {
  state.logs.push(line);
}

export function maybeHauntRoomFromSevere(state, roomId, reason) {
  ensureV60State(state);
  const id = Number(roomId);
  if (!id || Number.isNaN(id)) return;
  if (Math.random() > 0.34) return;
  const arr = state.v60.motelMemory.roomsHaunted;
  if (!arr.includes(id)) arr.push(id);
  state.logs.push(`[Echo] ${reason || 'Pressure'} — ${state?.rooms?.find((r) => r.id === id)?.label || 'Room'} may remember tonight.`);
}

export function enrichGuestV60Story(guest, state) {
  if (!guest) return guest;
  ensureV60State(state);
  if (guest.v60Story && typeof guest.v60Story === 'object' && guest.v60Story.archetype) return guest;
  const archetype = pick(ARCHETYPES);
  const secret = pick(SECRET_SEEDS);
  const dangerHint =
    archetype === 'kind_guest'
      ? 'Too polite — the easy ones are not always safe.'
      : archetype === 'watcher_touched'
        ? 'Eyes track reflections you did not move.'
        : 'Small inconsistency in how tired they pretend to be.';
  const kindnessHint =
    archetype === 'kind_guest'
      ? 'Offers help before you ask — note the timing.'
      : 'They thank the building, not you.';
  let weirdRequest = null;
  if (Math.random() < 0.38) {
    weirdRequest = pick(WEIRD_REQUESTS);
  }
  guest.v60Story = {
    archetype,
    secret,
    revealed: [],
    threadId: `t-${guest.id}-${state.night}-${Math.floor(Math.random() * 9999)}`,
    canReturn: Math.random() < 0.55,
    dangerHint,
    kindnessHint,
    weirdRequest
  };
  return guest;
}

export function v60RevealGuestStoryClue(state, guestId, source) {
  ensureV60State(state);
  const gid = Number(guestId);
  const idx = (state.guests || []).findIndex((g) => Number(g.id) === gid);
  if (idx === -1) return;
  const g = state.guests[idx];
  if (!g?.v60Story) enrichGuestV60Story(g, state);
  const st = g.v60Story;
  if (!st.revealed) st.revealed = [];
  const tag = String(source || 'clue');
  if (st.revealed.includes(tag)) return;
  st.revealed.push(tag);
  if (tag === 'id' && Math.random() < 0.4) {
    st.revealed.push('ledger-echo');
    pushLiveAlert(state, {
      type: 'info',
      kind: 'ambient',
      message: 'The ledger prints a syllable before the guest finishes spelling it.',
      dedupeKey: `v60-ledger-${g.id}`
    });
  }
}

export function surfaceV60MemoryReminder(state) {
  ensureV60State(state);
  const mm = state.v60.motelMemory;
  const haunted = mm.roomsHaunted || [];
  const lines = [];
  if (haunted.length) {
    const rid = pick(haunted);
    const lab = state?.rooms?.find((r) => Number(r.id) === Number(rid))?.label || `Room ${rid}`;
    lines.push(`The motel remembers ${lab}.`);
  }
  if (mm.rejectedInnocents >= 2 && Math.random() < 0.5) {
    lines.push("A rejected guest's name appears in the ledger margin.");
  }
  if (getVeilValue(state) >= 45 && Math.random() < 0.45) {
    lines.push('The neon sign buzzes in a pattern you recognize.');
  }
  if (mm.guestsRemembered.length && Math.random() < 0.35) {
    const nm = pick(mm.guestsRemembered);
    lines.push(`You swear you saw ${nm} in the key rack reflection.`);
  }
  if (!lines.length) return;
  const msg = pick(lines);
  pushLiveAlert(state, {
    type: 'warning',
    kind: 'ambient',
    message: msg,
    dedupeKey: `v60-memory-open-${state.night}-${msg.slice(0, 24)}`
  });
  state.logs.push(`[Memory] ${msg}`);
}

export function tryUnlockStaffNotes(state, reason) {
  ensureV60State(state);
  const found = state.v60.staffNotes.found;
  STAFF_NOTE_CATALOG.forEach((def) => {
    if (found.some((f) => f.id === def.id)) return;
    try {
      if (def.unlock(state)) {
        found.push({ id: def.id, text: def.text, atNight: state.night, reason: String(reason || '') });
        state.logs.push(`Staff note unlocked: ${def.text}`);
        pushLiveAlert(state, {
          type: 'info',
          message: `Staff note — ${def.text}`,
          dedupeKey: `v60-note-${def.id}`
        });
      }
    } catch {
      /* ignore */
    }
  });
}

export function v60AwardGuestCardsEndNight(state) {
  ensureV60State(state);
  state.v60.collectibles.newCardsTonight = [];
  const awarded = [];
  GUEST_CARD_BLUEPRINTS.forEach((bp) => {
    try {
      if (bp.pick(state) && !state.v60.collectibles.guestCards.some((c) => c.id === bp.id) && awarded.length < 2) {
        if (Math.random() < 0.55) {
          const card = {
            id: bp.id,
            title: bp.title,
            rarity: bp.rarity,
            guestName: '—',
            description: `Filed after night ${state.night}.`,
            passiveHint: bp.passiveHint,
            unlockedAtNight: state.night
          };
          state.v60.collectibles.guestCards.push(card);
          state.v60.collectibles.newCardsTonight.push(card.id);
          awarded.push(card);
        }
      }
    } catch {
      /* ignore */
    }
  });
}

export function getV60EndingTrajectory(state) {
  ensureV60State(state);
  const v = getVeilValue(state);
  const mm = state.v60.motelMemory;
  if (v >= 88 && mm.acceptedDangerousGuests >= 6) return { line: 'Trajectory: The motel may consume what is left of you.', key: 'consumed' };
  if (v >= 82) return { line: 'Trajectory: The owner is watching you become part of the property.', key: 'owner' };
  if (mm.rejectedInnocents >= 7 && mm.kindnessDebt <= 0.5) return { line: 'Trajectory: You are fading from the outside world’s records.', key: 'disappear' };
  if (mm.kindnessDebt >= 5 && v < 40) return { line: 'Trajectory: The motel may survive — if you keep paying its debts.', key: 'survive' };
  if ((mm.guestsRemembered || []).length >= 12) return { line: 'Trajectory: The watchers already know your shift patterns.', key: 'watchers' };
  return { line: 'Trajectory: The ledger still balances — barely.', key: 'balanced' };
}

export function buildV60GuestCardsSummaryHtml(state) {
  ensureV60State(state);
  const cards = state.v60.collectibles?.guestCards || [];
  const newC = state.v60.collectibles?.newCardsTonight || [];
  if (!cards.length) {
    return '<p class="muted">No guest cards catalogued this run yet.</p>';
  }
  return cards
    .slice(-6)
    .map(
      (c) => `
    <div class="v60-guest-card v60-guest-card--${c.rarity}${newC.includes(c.id) ? ' is-new' : ''}">
      <span class="v60-guest-card-rarity">${c.rarity}</span>
      <strong class="v60-guest-card-title">${escapeHtml(c.title)}</strong>
      <p class="v60-guest-card-hint">${escapeHtml(c.passiveHint)}</p>
    </div>`
    )
    .join('');
}

export function buildV60SummaryHtml(state) {
  ensureV60State(state);
  const v = getVeilValue(state);
  const L = veilLabelFromValue(v);
  const neo = String(state.v60.nightEvolution?.neonMessage || 'DEAD END MOTEL');
  const ano = state.v60.nightEvolution?.anomalyOfNight;
  const haunted = (state.v60.motelMemory?.roomsHaunted || [])
    .map((id) => state?.rooms?.find((r) => Number(r.id) === Number(id))?.label || String(id))
    .join(', ');
  const cards = state.v60.collectibles?.guestCards || [];
  const newC = state.v60.collectibles?.newCardsTonight || [];
  const notes = state.v60.staffNotes?.found || [];
  const traj = getV60EndingTrajectory(state);
  const mood = getV60MotelMood(state);
  const cardHtml =
    cards.length === 0
      ? '<p class="muted">No guest cards catalogued yet.</p>'
      : cards
          .slice(-8)
          .map(
            (c) => `
    <div class="v60-guest-card v60-guest-card--${c.rarity}${newC.includes(c.id) ? ' is-new' : ''}">
      <span class="v60-guest-card-rarity">${c.rarity}</span>
      <strong class="v60-guest-card-title">${escapeHtml(c.title)}</strong>
      <p class="v60-guest-card-desc muted">${escapeHtml(c.description)}</p>
      <p class="v60-guest-card-hint">${escapeHtml(c.passiveHint)}</p>
    </div>`
          )
          .join('');
  return `
    <div class="v56-dossier-panel v60-dossier-panel" role="region" aria-label="Living Motel v0.60">
      <h4 class="v56-dossier-heading">Living Motel (v0.60)</h4>
      <p class="v60-dossier-lead"><strong>Veil:</strong> ${L.label} (${Math.round(v)}) · <strong>Mood:</strong> ${mood}</p>
      <p class="muted"><strong>Neon:</strong> ${escapeHtml(neo)}</p>
      <p class="muted"><strong>Anomaly of the Night:</strong> ${ano ? escapeHtml(ano.label) : '—'}${ano ? ` — <em>${escapeHtml(ano.desc)}</em>` : ''}</p>
      <p class="muted"><strong>Haunted rooms:</strong> ${haunted ? escapeHtml(haunted) : 'None filed'}</p>
      <p class="v60-trajectory">${escapeHtml(traj.line)}</p>
      <div class="v60-dossier-cards">${cardHtml}</div>
      <p class="muted"><strong>Staff notes found:</strong> ${notes.length ? notes.map((n) => escapeHtml(n.text)).join(' · ') : '—'}</p>
    </div>
  `;
}

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function recordV60RadioListen(state, payload) {
  ensureV60State(state);
  const band = String(payload?.band || '');
  const line = String(payload?.line || '');
  const f = Number(payload?.f || 0);
  state.v60.radio.lastStation = band;
  if (band && band !== 'static' && !state.v60.radio.foundSignals.includes(band)) {
    state.v60.radio.foundSignals.push(band);
    tryUnlockStaffNotes(state, 'radio');
  }
  const hist = state.v60.radio.history;
  hist.push({ band, line: line.slice(0, 220), f, at: state.shiftElapsedMinutes || 0 });
  while (hist.length > 14) hist.shift();
  const veil = getVeilValue(state);
  if (veil >= 62 && Math.random() < 0.07) {
    adjustVeil(state, 3, 'backwards band');
    pushLiveAlert(state, {
      type: 'warning',
      kind: 'ambient',
      message: 'Dead band: syllables arrive backwards — one clue locks in, veil tightens.',
      dedupeKey: `v60-radio-back-${state.night}`
    });
    state.logs.push('Radio: backwards bleed — you hold one clean fact, and the static likes you less.');
  }
  if (band === 'police' && line) {
    pushLiveAlert(state, {
      type: 'info',
      kind: 'ambient',
      message: `Scanner color: ${line.slice(0, 120)}`,
      dedupeKey: `v60-scanner-hint-${state.night}-${Math.floor(state.shiftElapsedMinutes || 0)}`
    });
  }
}

export function tryV60PhoneBoothRing(state) {
  ensureV60State(state);
  const pb = state.v60.phoneBooth;
  if (pb.status === 'ringing' || pb.pendingOffer) return;
  const minute = Number(state.shiftElapsedMinutes || 0);
  const wx = String(state?.v58?.weather?.type || '');
  const veil = getVeilValue(state);
  const ano = String(state?.v60?.nightEvolution?.anomalyOfNight?.modifier || '');
  let p = 0.012;
  if (wx === 'fog') p += 0.028;
  if (veil >= 40) p += 0.022;
  if (Number(state.v60.motelMemory?.ignoredIncidents || 0) >= 3) p += 0.018;
  if (ano === 'phone') p += 0.06;
  if (minute - Number(pb.lastRingMinute || -999) < 55) return;
  if (Math.random() > p) return;
  pb.status = 'ringing';
  pb.lastRingMinute = minute;
  pb.pendingOffer = pick([
    {
      type: 'clue',
      msg: 'A cruiser asks about a black sedan — rear plate unreadable, southbound.',
      veil: 1
    },
    {
      type: 'owner',
      msg: 'Dry voice: "Leave one light wrong tonight. The sign likes honesty."',
      veil: 2
    },
    { type: 'curse', msg: 'Wet static promises you a name you should not keep.', veil: 5, curse: true },
    { type: 'warn', msg: 'Guest in the lot is standing too still beside a running engine.', veil: 1 },
    { type: 'police', msg: 'County patch-through: warrant chatter mentions this exit number.', veil: 1 }
  ]);
  pushLiveAlert(state, {
    type: 'warning',
    kind: 'actionable',
    message: 'Outside phone booth — wet ring from the lot island.',
    dedupeKey: `v60-booth-ring-${state.night}-${minute}`
  });
  state.logs.push('Outside booth: a ring cuts across rain memory.');
}

export function v60PhoneBoothAnswer(state, audioController) {
  ensureV60State(state);
  const pb = state.v60.phoneBooth;
  if (pb.status !== 'ringing' && !pb.pendingOffer) return;
  const off = pb.pendingOffer || { type: 'clue', msg: 'Line opens — nothing but measured breathing.', veil: 1 };
  pb.status = 'dead';
  pb.pendingOffer = null;
  pb.answered += 1;
  pb.lastMessage = off.msg;
  if (off.curse) pb.cursed = true;
  adjustVeil(state, Number(off.veil || 1), 'booth answer');
  state.logs.push(`Booth answered: ${off.msg}`);
  pushLiveAlert(state, {
    type: off.curse ? 'danger' : 'info',
    message: off.msg,
    dedupeKey: `v60-booth-ans-${state.night}-${pb.answered}`
  });
  try {
    audioController?.playStaticBurst?.('light');
  } catch {
    /* ignore */
  }
  tryUnlockStaffNotes(state, 'booth');
  window.setTimeout(() => {
    try {
      pb.status = 'silent';
    } catch {
      /* ignore */
    }
  }, 8000);
}

export function v60PhoneBoothIgnore(state) {
  ensureV60State(state);
  const pb = state.v60.phoneBooth;
  if (pb.status !== 'ringing') return;
  pb.status = 'silent';
  pb.ignored += 1;
  pb.pendingOffer = null;
  pb.lastMessage = '';
  state.logs.push('Outside booth: you let it ring out.');
  pushLiveAlert(state, {
    type: 'info',
    message: 'Booth ignored — the lot pretends nothing wanted you.',
    dedupeKey: `v60-booth-ignore-${state.night}`
  });
}

export function syncV60Ui(state) {
  ensureV60State(state);
  const app = document.getElementById('app');
  if (!app) return;
  const stage = getV60NightStage(state);
  const L = veilLabelFromValue(getVeilValue(state));
  app.dataset.v60Stage = String(stage);
  app.dataset.v60Veil = L.key;
  const ano = state.v60.nightEvolution?.anomalyOfNight;
  app.dataset.v60Anomaly = ano?.id || '';
  app.classList.remove('v60-stage-1', 'v60-stage-2', 'v60-stage-3', 'v60-stage-4', 'v60-stage-5');
  app.classList.add(`v60-stage-${stage}`);
  app.classList.remove('v60-veil-stable', 'v60-veil-thin', 'v60-veil-fractured', 'v60-veil-open');
  app.classList.add(`v60-veil-${L.key}`);
  const until = Number(state.v60?._visualOverrideUntil || 0);
  app.classList.toggle('v60-dev-stage5-flash', Boolean(until && Date.now() < until));

  const veilBar = document.getElementById('v60-veil-fill');
  const veilLabel = document.getElementById('v60-veil-label');
  const veilTrack = veilBar?.parentElement;
  const vv = getVeilValue(state);
  if (veilBar) veilBar.style.width = `${vv}%`;
  if (veilTrack && veilTrack.setAttribute) {
    veilTrack.setAttribute('aria-valuenow', String(Math.round(vv)));
  }
  if (veilLabel) {
    veilLabel.textContent = `Veil: ${L.label.charAt(0) + L.label.slice(1).toLowerCase()}`;
    veilLabel.title = 'Reality integrity inside the motel.';
  }

  const neonEl = document.getElementById('v60-neon-readout');
  if (neonEl) neonEl.textContent = String(state.v60.nightEvolution?.neonMessage || 'DEAD END MOTEL');

  const anoEl = document.getElementById('v60-anomaly-readout');
  if (anoEl) {
    const a = state.v60.nightEvolution?.anomalyOfNight;
    anoEl.textContent = a ? `Anomaly of the Night: ${a.label}` : '';
  }
  const wx2 = document.getElementById('v60-supernatural-weather');
  if (wx2) {
    const sw = state.v60.nightEvolution?.supernaturalWeather;
    wx2.textContent = sw?.line ? `Weather note: ${sw.line}` : '';
    wx2.hidden = !sw?.line;
  }

  const boothStatus = document.getElementById('v60-booth-status');
  const boothMsg = document.getElementById('v60-booth-message');
  if (boothStatus) {
    const pb = state.v60.phoneBooth;
    boothStatus.textContent =
      pb.status === 'ringing'
        ? 'Ringing'
        : pb.status === 'dead'
          ? 'Line open / dead air'
          : 'Silent';
  }
  if (boothMsg) {
    boothMsg.textContent = state.v60.phoneBooth.lastMessage || (state.v60.phoneBooth.status === 'ringing' ? 'The booth demands a choice.' : '');
  }

  const histEl = document.getElementById('v60-radio-history');
  if (histEl) {
    const lines = (state.v60.radio.history || []).slice(-5).map((h) => `${Number(h.f).toFixed(1)}: ${h.line}`);
    histEl.textContent = lines.length ? lines.join(' · ') : '—';
  }
  const sigChips = document.getElementById('v60-radio-signals');
  if (sigChips) {
    const chips = (state.v60.radio.foundSignals || []).map((s) => `<span class="v60-sig-chip">${s}</span>`).join(' ');
    sigChips.innerHTML = chips || '<span class="muted">No locked bands yet</span>';
  }

  const notesMount = document.getElementById('v60-staff-notes-body');
  if (notesMount) {
    const notes = state.v60.staffNotes.found || [];
    notesMount.innerHTML = notes.length
      ? `<ul class="v60-notes-list">${notes.map((n) => `<li>${escapeHtml(n.text)}</li>`).join('')}</ul>`
      : '<p class="muted">No staff notes filed. Keep the shift; the building talks back eventually.</p>';
  }

  const dev = document.getElementById('v60-dev-helper');
  if (dev) dev.hidden = !isV59DevEnabled();
}

export function v60IncidentChanceMultiplier(state, roomId) {
  ensureV60State(state);
  let m = 1;
  const id = Number(roomId);
  if ((state.v60.motelMemory.roomsHaunted || []).includes(id)) m += 0.12;
  const mod = String(state?.v60?.nightEvolution?.anomalyOfNight?.modifier || '');
  if (mod === 'warmkey' && id === Number(state?.v60?._warmKeyRoomId || 0)) m += 0.15;
  if (mod === 'clock') m += 0.04;
  return m;
}

export function rollV60AnomalyRoomHook(state) {
  ensureV60State(state);
  const rooms = (state.rooms || []).filter((r) => r?.occupied && r?.unlocked !== false);
  if (!rooms.length) return;
  const pickR = pick(rooms);
  state.v60._warmKeyRoomId = pickR.id;
}

export function forceV60PhoneBoothRingDev(state) {
  ensureV60State(state);
  state.v60.phoneBooth.status = 'ringing';
  state.v60.phoneBooth.pendingOffer = {
    type: 'clue',
    msg: 'Dev line: cruiser asks about a sedan with a taped plate — southbound drift.',
    veil: 0
  };
  state.v60.phoneBooth.lastRingMinute = Number(state.shiftElapsedMinutes || 0);
}

export function forceV60GuestCardDev(state) {
  ensureV60State(state);
  const card = {
    id: 'card-dev-forced',
    title: 'Ledger Echo',
    rarity: 'uncommon',
    guestName: '—',
    description: 'Forced unlock (dev).',
    passiveHint: 'Names repeat one night late.',
    unlockedAtNight: state.night
  };
  if (!state.v60.collectibles.guestCards.some((c) => c.id === card.id)) {
    state.v60.collectibles.guestCards.push(card);
    state.v60.collectibles.newCardsTonight.push(card.id);
  }
}

export function grantV60StaffNoteDev(state) {
  ensureV60State(state);
  const hard = 'If the neon says NO EXIT, do not answer the outside phone.';
  if (!state.v60.staffNotes.found.some((n) => n.text === hard)) {
    state.v60.staffNotes.found.push({ id: 'dev-force', text: hard, atNight: state.night, reason: 'dev' });
    state.logs.push(`[Dev] Staff note pinned: ${hard}`);
  }
}

export function initV60DebugShortcuts(handlers) {
  if (!isV59DevEnabled()) return;
  if (typeof window !== 'undefined' && window.__v60DbgKeys) return;
  if (typeof window !== 'undefined') window.__v60DbgKeys = true;
  try {
    console.info('[v60 debug] M reminder · V veil+20 · N anomaly · O booth · B card · K note · Z stage5 flash');
  } catch {
    /* ignore */
  }
  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
    const k = e.key?.toLowerCase();
    if (k === 'm') {
      e.preventDefault();
      handlers?.memoryReminder?.();
    } else if (k === 'v') {
      e.preventDefault();
      handlers?.veilBump?.();
    } else if (k === 'n') {
      e.preventDefault();
      handlers?.anomalyReroll?.();
    } else if (k === 'o') {
      e.preventDefault();
      handlers?.boothRing?.();
    } else if (k === 'b') {
      e.preventDefault();
      handlers?.cardUnlock?.();
    } else if (k === 'k') {
      e.preventDefault();
      handlers?.staffNote?.();
    } else if (k === 'z') {
      e.preventDefault();
      handlers?.stageFlash?.();
    }
  });
}
