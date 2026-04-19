/**
 * v0.36 — Drifter network, road heat, motel hound, outside intel (extends town / analog / lot).
 */

import { normalizeAnalogSurvivalState } from './analogSurvival.js';

function n(value, fallback = 0) {
  const x = Number(value);
  return Number.isFinite(x) ? x : fallback;
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

export function normalizeRoadWorldState(state) {
  if (!state || typeof state !== 'object') return state;
  const rw = state.roadWorld && typeof state.roadWorld === 'object' ? state.roadWorld : {};
  const h = rw.motelHound && typeof rw.motelHound === 'object' ? rw.motelHound : {};
  const d = rw.drifterNetwork && typeof rw.drifterNetwork === 'object' ? rw.drifterNetwork : {};
  state.roadWorld = {
    roadHeat: clamp(n(rw.roadHeat, 0), 0, 10),
    intelQueue: Array.isArray(rw.intelQueue) ? rw.intelQueue.slice(0, 5) : [],
    pendingArrivalSkew: rw.pendingArrivalSkew && typeof rw.pendingArrivalSkew === 'object' ? rw.pendingArrivalSkew : null,
    motelHound: {
      trust: clamp(n(h.trust, 0.42), 0.08, 1),
      fedThisShift: Boolean(h.fedThisShift),
      injured: Boolean(h.injured),
      trauma: clamp(n(h.trauma, 0), 0, 4),
      neglectShifts: clamp(n(h.neglectShifts, 0), 0, 20),
      lastSignal: String(h.lastSignal || ''),
      lastSignalMinute: n(h.lastSignalMinute, -1)
    },
    drifterNetwork: {
      tier: clamp(n(d.tier, 0), 0, 3),
      reliability: clamp(n(d.reliability, 0.55), 0.25, 1),
      burned: Boolean(d.burned),
      lastFundNight: n(d.lastFundNight, 0)
    },
    djCodedLinesThisRun: clamp(n(rw.djCodedLinesThisRun, 0), 0, 99),
    lastRoadHeadlineEcho: String(rw.lastRoadHeadlineEcho || '')
  };
  return state;
}

export function decayRoadWorldBetweenNights(state) {
  normalizeRoadWorldState(state);
  state.roadWorld.roadHeat = clamp(n(state.roadWorld.roadHeat, 0) * 0.92 - 0.15, 0, 10);
  const h = state.roadWorld.motelHound;
  if (!h.fedThisShift) {
    h.neglectShifts = clamp(h.neglectShifts + 1, 0, 20);
    h.trust = clamp(h.trust - 0.055, 0.08, 1);
  }
  h.fedThisShift = false;
  if (h.injured && Math.random() < 0.35) {
    h.injured = false;
    h.trauma = Math.max(0, h.trauma - 1);
  }
  state.roadWorld.intelQueue = [];
  state.roadWorld.pendingArrivalSkew = null;
}

export function markHoundInjury(state) {
  normalizeRoadWorldState(state);
  state.roadWorld.motelHound.injured = true;
  state.roadWorld.motelHound.trauma = clamp(state.roadWorld.motelHound.trauma + 1, 0, 5);
  state.roadWorld.motelHound.trust = clamp(state.roadWorld.motelHound.trust - 0.12, 0.08, 1);
}

export function consumeRoadIntelForArrival(state) {
  normalizeRoadWorldState(state);
  for (let i = state.roadWorld.intelQueue.length - 1; i >= 0; i--) {
    const q = state.roadWorld.intelQueue[i];
    if (q.consumed) continue;
    if (q.kind === 'arrival' || q.kind === 'vehicle' || q.kind === 'hunter') {
      q.consumed = true;
      break;
    }
  }
}

export function bumpRoadHeat(state, amount, reason = '') {
  normalizeRoadWorldState(state);
  const next = clamp(n(state.roadWorld.roadHeat, 0) + amount, 0, 10);
  state.roadWorld.roadHeat = next;
  if (reason && Math.random() < 0.35) {
    state.logs.push(`[Route] ${reason}`);
  }
}

function readWeatherPrimary(state) {
  const explicit = state?.nightWeather?.primary;
  if (explicit) return explicit;
  const scenario = String(state?.activeScenario?.label || '').toLowerCase();
  if (/storm|surge|volatile/.test(scenario)) return 'storm';
  if (/fog|mist/.test(scenario)) return 'fog';
  if (/cold|freeze/.test(scenario)) return 'cold';
  if (/rain|wet/.test(scenario)) return 'rain';
  return 'clear';
}

const INTEL_TEMPLATES = [
  { kind: 'police', text: 'Trucker text: blue lights pacing the off-ramp — not committing, just watching the corridor.', weight: 1.1 },
  { kind: 'vehicle', text: 'Drifter rumor: same sedan passed twice without stopping — vanity plate half seen.', weight: 1 },
  { kind: 'town', text: 'Gas-station clerk: "someone asked which motel still takes cash after midnight."', weight: 1 },
  { kind: 'hunter', text: 'Lookout whisper: two men asking for "a room facing the rear" at two different truck stops.', weight: 0.55 },
  { kind: 'arrival', text: 'CB skip: a group is "running late to a reservation" — vague, but the mile marker sounds like yours.', weight: 0.9 },
  {
    kind: 'transfer',
    text: 'Lot rumor: two rigs plan to "kiss bumpers" behind your pump island when the fog thickens — second unit carries the weight.',
    weight: 0.35
  },
  {
    kind: 'room9',
    text: 'Lot regular swears the rear wing "breathes wrong" when trucks downshift — superstitious, but it tracks your sealed line.',
    weight: 0.45
  }
];

export function maybeBurnDrifterNetwork(state) {
  normalizeRoadWorldState(state);
  const dn = state.roadWorld.drifterNetwork;
  if (!dn.tier || dn.burned) return false;
  const sus = n(state?.townState?.townSuspicion, 0);
  const raid = String(state?.raidStatus || '') === 'pending';
  if (raid || sus >= 8 || (state?.townState?.policeCompromised && sus >= 5)) {
    dn.burned = true;
    dn.tier = 0;
    dn.reliability = 0.3;
    state.shiftStats.drifterBurns = n(state.shiftStats.drifterBurns, 0) + 1;
    state.logs.push('[Drifter net] A watcher goes dark — police pressure or betrayal burned a line.');
    return true;
  }
  return false;
}

function pushIntel(state, template, accurate) {
  normalizeRoadWorldState(state);
  const minute = n(state?.shiftElapsedMinutes, 0);
  const id = `intel-${minute}-${Math.floor(Math.random() * 9999)}`;
  state.roadWorld.intelQueue.push({
    id,
    kind: template.kind,
    text: template.text,
    accurate: Boolean(accurate),
    minute,
    consumed: false
  });
  state.roadWorld.intelQueue = state.roadWorld.intelQueue.slice(-5);
  state.shiftStats.roadIntelTipsShift = n(state.shiftStats.roadIntelTipsShift, 0) + 1;
  state.logs.push(`[Road intel] ${template.text}`);
}

export function tickRoadWorldDuringShift(state, pushAlert) {
  normalizeRoadWorldState(state);
  maybeBurnDrifterNetwork(state);

  const minute = n(state?.shiftElapsedMinutes, 0);
  const dn = state.roadWorld.drifterNetwork;
  const heat = n(state.roadWorld.roadHeat, 0);
  const trust = n(state.roadWorld.motelHound.trust, 0.5);
  const r9 = n(state?.protectedRoom?.pressureLevel, 0);
  const fog = readWeatherPrimary(state) === 'fog';
  const hunt = Boolean(state?.huntNight?.active);
  const nem = Boolean(state?.nemesis?.active);

  bumpRoadHeat(
    state,
    (n(state?.townState?.townSuspicion, 0) * 0.04 + n(state?.dirtyLedger?.dirtyScore, 0) * 0.05 + r9 * 0.06) * 0.08,
    ''
  );

  if (dn.tier > 0 && !dn.burned && minute > 40 && minute < 470) {
    const baseChance = 0.006 + dn.tier * 0.004 + heat * 0.0015;
    const rel = dn.reliability * (0.85 + trust * 0.15);
    if (Math.random() < baseChance * rel) {
      const pool = INTEL_TEMPLATES.filter((t) => {
        if (t.kind === 'room9') return r9 >= 2;
        if (t.kind === 'transfer') return fog && heat >= 3;
        return true;
      });
      const pick = pool[Math.floor(Math.random() * Math.max(1, pool.length))];
      let accurate = Math.random() < clamp(rel * (dn.burned ? 0.3 : 0.72), 0.25, 0.88);
      if (fog && heat > 2 && Math.random() < 0.12) accurate = false;
      if (!accurate) state.shiftStats.roadIntelWrong = n(state.shiftStats.roadIntelWrong, 0) + 1;
      pushIntel(state, pick, accurate);
      if (typeof pushAlert === 'function') {
        pushAlert({
          type: 'info',
          message: 'Drifter line: thin rumor on the road — verify before you bet the desk on it.',
          dedupeKey: `road-intel-${minute}`
        });
      }
    }
  }

  // Motel hound — rare parking-lot read (eerie, not constant)
  const houndChance =
    (0.004 + (fog ? 0.004 : 0) + (r9 >= 2 ? 0.006 : 0) + (hunt || nem ? 0.005 : 0)) *
    (0.55 + trust * 0.55) *
    (state.roadWorld.motelHound.injured ? 0.45 : 1) *
    (state.roadWorld.motelHound.neglectShifts > 3 && !state.roadWorld.motelHound.fedThisShift ? 0.35 : 1);

  if (minute > 55 && minute < 500 && Math.random() < houndChance) {
    let signal = 'calm';
    if (nem && trust > 0.35 && Math.random() < 0.55) {
      signal = 'silent';
      state.shiftStats.houndSilenceShift = n(state.shiftStats.houndSilenceShift, 0) + 1;
      state.logs.push('[Motel hound] The dog is on the lot — completely still, ears forward, not making a sound.');
    } else if (r9 >= 3 && Math.random() < 0.5) {
      signal = 'bark';
      state.shiftStats.houndSignalsShift = n(state.shiftStats.houndSignalsShift, 0) + 1;
      state.logs.push('[Motel hound] Low barking at the sealed wing line — like it smells something the cameras do not name.');
    } else if (fog && Math.random() < 0.45) {
      signal = 'howl';
      state.shiftStats.houndSignalsShift = n(state.shiftStats.houndSignalsShift, 0) + 1;
      state.logs.push('[Motel hound] A single howl cuts through fog — directionless, wrong for the weather.');
    } else if (heat >= 6 && Math.random() < 0.4) {
      signal = 'howl';
      state.shiftStats.houndSignalsShift = n(state.shiftStats.houndSignalsShift, 0) + 1;
      state.logs.push('[Motel hound] The stray paces the yellow line, hackles up at headlights that never stop.');
    } else {
      signal = 'calm';
      state.logs.push('[Motel hound] The stray circles the island once, then vanishes under a trailer shadow.');
    }
    state.roadWorld.motelHound.lastSignal = signal;
    state.roadWorld.motelHound.lastSignalMinute = minute;
    if (typeof pushAlert === 'function' && (signal === 'silent' || signal === 'howl')) {
      pushAlert({
        type: signal === 'silent' ? 'warning' : 'info',
        message:
          signal === 'silent'
            ? 'Lot hound: unnerving silence — something predatory may be close.'
            : 'Lot hound: audible warning on the asphalt.',
        dedupeKey: `hound-${signal}-${minute}`
      });
    }
  }

  return state;
}

export function fundDrifterNetwork(state) {
  normalizeRoadWorldState(state);
  const dn = state.roadWorld.drifterNetwork;
  if (dn.burned) return { ok: false, reason: 'The road line is burned — too hot to rebuild tonight.' };
  if (dn.tier >= 3) return { ok: false, reason: 'Drifter coverage is already deep for this run.' };
  const dirty = n(state?.dirtyLedger?.totalDirtyMoney, 0);
  const costDirty = dn.tier === 0 ? 28 : dn.tier === 1 ? 40 : 55;
  const costClean = costDirty + 18;
  if (dirty >= costDirty) {
    state.dirtyLedger = state.dirtyLedger || {};
    state.dirtyLedger.totalDirtyMoney = Math.max(0, dirty - costDirty);
    if (typeof state.dirtyLedger.dirtyScore === 'number') {
      state.dirtyLedger.dirtyScore = Math.max(0, n(state.dirtyLedger.dirtyScore, 0) - 0.25);
    }
  } else if (n(state.money, 0) >= costClean) {
    state.money = Math.max(0, n(state.money, 0) - costClean);
  } else {
    return { ok: false, reason: `Need $${costDirty} dirty or $${costClean} clean to widen the network.` };
  }
  dn.tier = Math.min(3, dn.tier + 1);
  dn.reliability = clamp(dn.reliability + 0.12, 0.25, 1);
  dn.lastFundNight = n(state.night, 1);
  bumpRoadHeat(state, 0.35, 'Cash moved along the route — the motel name travels a little farther.');
  state.townState = state.townState || {};
  state.townState.townSuspicion = clamp(n(state.townState.townSuspicion, 0) + 0.35, 0, 10);
  state.logs.push('[Drifter net] Watchers paid — texts will find you first when the road turns.');
  return { ok: true };
}

export function feedMotelHound(state) {
  normalizeRoadWorldState(state);
  const cost = 7;
  if (n(state.money, 0) < cost) return { ok: false, reason: 'Need $7 for food and water at the lot edge.' };
  state.money = Math.max(0, n(state.money, 0) - cost);
  state.roadWorld.motelHound.trust = clamp(state.roadWorld.motelHound.trust + 0.08, 0.08, 1);
  state.roadWorld.motelHound.fedThisShift = true;
  state.roadWorld.motelHound.neglectShifts = 0;
  state.logs.push('[Motel hound] You leave cans by the pump island. Eyes meet yours once — gratitude without softness.');
  return { ok: true };
}

export function appendRoadPayphoneOptions(event, state) {
  normalizeRoadWorldState(state);
  const dn = state.roadWorld.drifterNetwork;
  const out = { ...event, options: [...(event.options || [])] };
  if (dn.tier >= 1 && !dn.burned) {
    out.options.push({
      id: 'payphone-drifter-callback',
      label: 'Signal the drifter callback code',
      preview: 'Uses network • may confirm intel or burn a favor',
      check: { type: 'dispatch', baseSuccess: 0.52 }
    });
  }
  if (n(state.roadWorld.roadHeat, 0) >= 4) {
    out.options.push({
      id: 'payphone-false-trail',
      label: 'Pay for a false trail (dirty rumor)',
      preview: '−$20 or −$12 dirty • lowers next arrival skew',
      check: { type: 'investigation', baseSuccess: 0.48 }
    });
  }
  return out;
}

export function resolveRoadPayphoneOption(state, optionId) {
  normalizeRoadWorldState(state);
  normalizeAnalogSurvivalState(state);
  const analog = state.analogSurvival;
  if (analog?.payphone) analog.payphone.resolvedThisShift = true;
  if (optionId === 'payphone-drifter-callback') {
    const roll = Math.random();
    const dn = state.roadWorld.drifterNetwork;
    if (roll < 0.22 / Math.max(0.4, dn.reliability)) {
      dn.burned = true;
      dn.tier = Math.max(0, dn.tier - 1);
      return {
        ok: true,
        success: false,
        logs: ['The callback clicks twice then goes dead — someone else was listening. A watcher stops answering.'],
        alerts: ['Drifter line compromised from the lot phone.'],
        effects: { chainPulse: 1 }
      };
    }
    pushIntel(
      state,
      { kind: 'vehicle', text: 'Callback confirms: unmarked SUV asked for your exit number at the diner.', weight: 1 },
      Math.random() < dn.reliability
    );
    return {
      ok: true,
      success: true,
      logs: ['A gravel voice reads a plate partial and a time window — enough to posture at the desk, not enough to arrest anyone.'],
      alerts: ['Drifter callback: partial confirmation on the wire.'],
      effects: {}
    };
  }
  if (optionId === 'payphone-false-trail') {
    const useDirty = n(state?.dirtyLedger?.totalDirtyMoney, 0) >= 12;
    if (useDirty) {
      state.dirtyLedger.totalDirtyMoney = Math.max(0, n(state.dirtyLedger.totalDirtyMoney, 0) - 12);
    } else {
      state.money = Math.max(0, n(state.money, 0) - 20);
    }
    state.roadWorld.pendingArrivalSkew = { kind: 'softer', untilMinute: n(state.shiftElapsedMinutes, 0) + 45 };
    bumpRoadHeat(state, 0.2, 'A lie about the motel circulates one county over — traffic thins for a while.');
    return {
      ok: true,
      success: true,
      logs: ['You buy a rumor that sends cruisers toward an old warehouse address. Cheap misdirection — it never holds forever.'],
      alerts: ['False trail purchased: arrivals may skew mild briefly.'],
      effects: {}
    };
  }
  return { ok: false, reason: 'Unknown road payphone branch.' };
}

export function applyArrivalRoadSkew(state, guest) {
  normalizeRoadWorldState(state);
  const skew = state.roadWorld.pendingArrivalSkew;
  const minute = n(state?.shiftElapsedMinutes, 0);
  if (!skew || minute > n(skew.untilMinute, 0)) {
    state.roadWorld.pendingArrivalSkew = null;
    return guest;
  }
  if (skew.kind === 'softer') {
    return {
      ...guest,
      chainBias: Math.max(0, n(guest.chainBias, 0) - 0.35),
      riskNote: `${guest.riskNote || ''} Road rumor cooled this arrival slightly.`.trim()
    };
  }
  return guest;
}

export function pickDjCodedAddon(state) {
  normalizeRoadWorldState(state);
  const w = readWeatherPrimary(state);
  const heat = n(state.roadWorld.roadHeat, 0);
  const rot = n(state?.townState?.corruption, 0) + n(state?.protectedRoom?.pressureLevel, 0) * 0.4;
  const lines = [];
  if (w === 'fog') lines.push('Fog advisory: if your lot lights look "thick," assume tires are closer than they sound.');
  if (w === 'storm') lines.push('Storm bridge: hydroplane reports eastbound — anything sliding tonight is not your friend.');
  if (heat >= 5) lines.push('Route gossip: this exit is getting a reputation — not the good kind.');
  if (rot >= 5) lines.push('Local color: some buildings rot from the inside first. The highway feels it before the town admits it.');
  if (n(state?.nemesis?.heat, 0) >= 4) lines.push('Travel advisory: wolves do not honk — they just show up in the mirror twice.');
  if (n(state?.huntNight?.active, 0)) lines.push('Night call: if you are hosting a chase, keep the lobby boring. Boring survives.');
  if (String(state?.borderTransfer?.phase || '') === 'staging') {
    lines.push('Coded aside: if two shadows trade weight without headlights, the highway counts it anyway.');
  }
  if (!lines.length) return '';
  state.roadWorld.djCodedLinesThisRun += 1;
  return lines[Math.floor(Math.random() * lines.length)];
}

export function buildRoadWorldRenderModel(state) {
  normalizeRoadWorldState(state);
  const rw = state.roadWorld;
  const h = rw.motelHound;
  const dn = rw.drifterNetwork;
  const tip = rw.intelQueue.filter((q) => !q.consumed).slice(-1)[0] || null;
  let houndLine = '';
  if (h.lastSignal === 'silent') houndLine = 'Hound: unnerving silence on the lot.';
  else if (h.lastSignal === 'howl') houndLine = 'Hound: howl heard — asphalt uneasy.';
  else if (h.lastSignal === 'bark') houndLine = 'Hound: fixed barking near the sealed line.';
  else if (h.trust >= 0.55) houndLine = 'Hound: present — trust holding.';
  else houndLine = 'Hound: distant — trust low.';

  return {
    roadHeat: rw.roadHeat,
    roadHeatLabel: rw.roadHeat >= 8 ? 'Hostile route' : rw.roadHeat >= 5 ? 'Heating up' : rw.roadHeat >= 2 ? 'Warm asphalt' : 'Quiet road',
    drifterTier: dn.tier,
    drifterBurned: dn.burned,
    drifterReliabilityPct: Math.round(dn.reliability * 100),
    latestIntel: tip,
    houndTrustPct: Math.round(h.trust * 100),
    houndLine,
    canFundDrifters: !dn.burned && dn.tier < 3,
    canFeedHound: n(state.money, 0) >= 7
  };
}
