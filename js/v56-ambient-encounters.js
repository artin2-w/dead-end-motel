/**
 * v0.56 — Lightweight ambient suspense (text + optional static burst).
 * No new game mechanics; uses pushLiveAlert only.
 */

const POOL = [
  {
    key: 'v56-phone-breath',
    text: 'The desk phone clicks — dead air, then one slow exhale on the line before it cuts.',
    weight: 1
  },
  {
    key: 'v56-lot-lights',
    text: 'Parking lamps stutter twice, then hold. The lot looks the same. It should not feel different.',
    weight: 1.1
  },
  {
    key: 'v56-hall-drip',
    text: 'Hallway PA carries a sound you cannot file: not drip, not footsteps — something brushing vinyl.',
    weight: 1
  },
  {
    key: 'v56-scanner-ghost',
    text: 'Scanner feed prints a line that vanishes on refresh. You only caught the shape of a plate.',
    weight: 1.2
  },
  {
    key: 'v56-voltage',
    text: 'Breakers hum in a chord you do not remember teaching the building. Voltage feels… opinionated.',
    weight: 0.9
  }
];

let lastBucket = -1;
let nightKey = '';
let firstNightPingSent = false;

export function resetV56AmbientForNewRun() {
  lastBucket = -1;
  nightKey = '';
  firstNightPingSent = false;
}

function pickWeighted(rng) {
  const w = POOL.reduce((s, e) => s + e.weight, 0);
  let t = rng() * w;
  for (const e of POOL) {
    t -= e.weight;
    if (t <= 0) return e;
  }
  return POOL[0];
}

/**
 * One-time Night 1 ping so ambient channel is confirmable without a 20+ minute wait.
 */
export function tryV56AmbientEncounterEarlyPing(state, { pushLiveAlert }) {
  if (!state || typeof pushLiveAlert !== 'function') return;
  if (firstNightPingSent) return;
  const night = Math.max(1, Number(state.night || 1));
  if (night !== 1) return;
  const elapsed = Number(state.shiftElapsedMinutes || 0);
  if (elapsed < 5 || elapsed > 48) return;
  firstNightPingSent = true;
  pushLiveAlert(state, {
    type: 'warning',
    kind: 'ambient',
    message:
      'Ambient trace: the desk relay ticks — no inbound call, but the handset cooling feels like someone just let go.',
    dedupeKey: `v56-ambient-night1-ping-${night}`
  });
}

/** Dev / test: fire a single ambient line immediately (no bucket gate). */
export function fireV56AmbientEncounterNow(state, { pushLiveAlert, playStaticBurst }) {
  if (!state || typeof pushLiveAlert !== 'function') return;
  const entry = pickWeighted(() => Math.random());
  const night = Math.max(1, Number(state.night || 1));
  pushLiveAlert(state, {
    type: 'warning',
    kind: 'ambient',
    message: entry.text,
    dedupeKey: `${entry.key}-now-${night}-${Date.now()}`
  });
  if (typeof playStaticBurst === 'function' && Math.random() < 0.55) {
    try {
      playStaticBurst();
    } catch {
      /* ignore */
    }
  }
}

/**
 * Call from progressShift tail. Low frequency: at most one roll per 20-minute bucket per night.
 */
export function tryV56AmbientEncounter(state, { pushLiveAlert, playStaticBurst }) {
  if (!state || typeof pushLiveAlert !== 'function') return;
  const night = Math.max(1, Number(state.night || 1));
  const nk = `${night}`;
  if (nightKey !== nk) {
    nightKey = nk;
    lastBucket = -1;
  }
  const elapsed = Number(state.shiftElapsedMinutes || 0);
  if (elapsed < 20) return;
  const bucket = Math.floor(elapsed / 20);
  if (bucket === lastBucket) return;
  lastBucket = bucket;
  if (Math.random() > 0.17) return;
  const entry = pickWeighted(() => Math.random());
  pushLiveAlert(state, {
    type: 'warning',
    kind: 'ambient',
    message: entry.text,
    dedupeKey: `${entry.key}-${night}-${bucket}`
  });
  if (typeof playStaticBurst === 'function' && Math.random() < 0.45) {
    try {
      playStaticBurst();
    } catch {
      /* ignore */
    }
  }
}
