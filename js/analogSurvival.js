/**
 * v0.32 — Analog survival layer: breaker circuits, neon facade, lot payphone, operator fatigue.
 * Keeps logic data-driven and small; main.js owns game hooks.
 */

const CIRCUIT_IDS = ['lobby', 'parking', 'cameras', 'heating', 'neon', 'utility'];

const DEFAULT_CIRCUITS = () => ({
  lobby: { tier: 'full' },
  parking: { tier: 'full' },
  cameras: { tier: 'full' },
  heating: { tier: 'full' },
  neon: { tier: 'dim' },
  utility: { tier: 'dim' }
});

function readWeatherPrimary(state) {
  const explicit = state?.nightWeather?.primary;
  if (explicit) return explicit;
  const scenario = String(state?.activeScenario?.label || '').toLowerCase();
  const crisis = String(state?.crisisNight?.kind || '').toLowerCase();
  if (/storm|surge|volatile/.test(scenario) || /storm/.test(crisis)) return 'storm';
  if (/fog|mist|low.vis/.test(scenario)) return 'fog';
  if (/cold|freeze|winter/.test(scenario)) return 'cold';
  if (/rain|wet|drizzle/.test(scenario)) return 'rain';
  return 'clear';
}

function blackoutStrainLevel(state) {
  const lvl = String(state?.crisisEscalation?.blackoutLevel || state?.blackoutState?.level || 'none');
  if (lvl === 'full') return 3;
  if (lvl === 'partial') return 2;
  if (lvl === 'risk' || state?.crisisNight?.blackoutRisk) return 1;
  return 0;
}

function tierNumericLoad(circuitId, tier) {
  const t = tier === 'full' || tier === 'dim' || tier === 'off' ? tier : 'dim';
  if (t === 'off') return 0;
  if (circuitId === 'neon') {
    if (t === 'full') return 3;
    return 1;
  }
  return t === 'full' ? 2 : 1;
}

export function buildFreshAnalogSurvival() {
  return {
    circuits: DEFAULT_CIRCUITS(),
    /** Player intent for facade: bright | flicker | dark */
    neonPlayerWish: 'bright',
    payphone: {
      offeredThisShift: false,
      resolvedThisShift: false,
      lastResultTag: null
    },
    operatorFatigue: 8,
    fatigueReboundTurns: 0,
    stimUses: { coffee: 0, strong: 0 },
    coffeeCooldown: 0,
    /** Short lines for summary / night identity */
    analogNightLog: []
  };
}

export function normalizeAnalogSurvivalState(state) {
  if (!state || typeof state !== 'object') return state;
  const base = buildFreshAnalogSurvival();
  const cur = state.analogSurvival && typeof state.analogSurvival === 'object' ? state.analogSurvival : {};
  const circuits = { ...base.circuits };
  CIRCUIT_IDS.forEach((id) => {
    const t = cur.circuits?.[id]?.tier;
    circuits[id] = { tier: t === 'full' || t === 'dim' || t === 'off' ? t : base.circuits[id].tier };
  });
  state.analogSurvival = {
    ...base,
    ...cur,
    circuits,
    neonPlayerWish: ['bright', 'flicker', 'dark'].includes(cur.neonPlayerWish) ? cur.neonPlayerWish : base.neonPlayerWish,
    payphone: { ...base.payphone, ...(cur.payphone || {}) },
    stimUses: { ...base.stimUses, ...(cur.stimUses || {}) },
    analogNightLog: Array.isArray(cur.analogNightLog) ? cur.analogNightLog.slice(-24) : []
  };
  return state;
}

export function getBreakerBudget(state) {
  let b = 11;
  const power = Number(state?.power ?? 100);
  if (power > 78) b += 1;
  if (power < 45) b -= 1;
  if (power < 30) b -= 2;
  if (power < 18) b -= 2;
  const w = readWeatherPrimary(state);
  if (w === 'storm') b -= 2;
  if (w === 'cold') b -= 1;
  if (w === 'fog') b -= 1;
  const boil = Number(state?.finalWinter?.boilerStrain || 0);
  if (boil >= 8) b -= 1;
  const bs = state?.basementSyndicate;
  if (bs && typeof bs === 'object' && bs.unlockedEver) {
    const bh = Number(bs.heat || 0);
    b -= Math.min(2, Math.floor(bh / 3) + (bs.incident ? 1 : 0));
  }
  b -= blackoutStrainLevel(state);
  const pressure = state?.uiPressureLevel || 'calm';
  if (pressure === 'emergency' || pressure === 'dire') b -= 1;
  b -= Math.max(0, Number(state?.contractRuntime?.breakerBudgetPenalty || 0));
  return Math.max(5, b);
}

function totalCircuitLoad(analog) {
  return CIRCUIT_IDS.reduce(
    (sum, id) => sum + tierNumericLoad(id, analog.circuits[id]?.tier || 'dim'),
    0
  );
}

export function getBreakerBoardSummary(state) {
  normalizeAnalogSurvivalState(state);
  const f = Math.round(Number(state.analogSurvival.operatorFatigue || 0));
  let fatigueTier = 'steady';
  if (f >= 78) fatigueTier = 'severe';
  else if (f >= 48) fatigueTier = 'moderate';
  else if (f >= 22) fatigueTier = 'light';
  return {
    load: totalCircuitLoad(state.analogSurvival),
    budget: getBreakerBudget(state),
    circuits: state.analogSurvival.circuits,
    neon: effectiveNeonPresentation(state),
    fatigueTier,
    fatigue: f
  };
}

/**
 * When load exceeds budget, shed in priority order (keep cameras/heating longer if possible).
 */
export function enforceBreakerBudget(state) {
  if (!state?.analogSurvival?.circuits) return;
  const analog = state.analogSurvival;
  const budget = getBreakerBudget(state);
  let total = totalCircuitLoad(analog);
  const shedOrder = ['utility', 'parking', 'neon', 'lobby', 'cameras', 'heating'];
  let guard = 0;
  const trimmed = [];
  while (total > budget && guard < 24) {
    guard += 1;
    const victim = shedOrder.find((id) => analog.circuits[id]?.tier !== 'off');
    if (!victim) break;
    const t = analog.circuits[victim].tier;
    if (t === 'full') analog.circuits[victim].tier = 'dim';
    else if (t === 'dim') analog.circuits[victim].tier = 'off';
    trimmed.push(victim);
    total = totalCircuitLoad(analog);
  }
  if (trimmed.length && Number(analog._shedLogCount || 0) < 2) {
    analog._shedLogCount = Number(analog._shedLogCount || 0) + 1;
    state.logs.push(
      `Breaker auto-shave: ${trimmed.slice(0, 3).join(', ')}${
        trimmed.length > 3 ? '…' : ''
      } pulled down to keep the grid inside safe load (${budget}).`
    );
    analog.analogNightLog.push(`Grid shed circuits to stay ≤${budget} load units.`);
  }
}

function syncNeonCircuitToWish(state) {
  const analog = state.analogSurvival;
  const eff = effectiveNeonPresentation(state);
  if (eff.mode === 'dark') analog.circuits.neon.tier = 'off';
  else if (eff.mode === 'flicker' || eff.mode === 'unstable') analog.circuits.neon.tier = 'dim';
  else analog.circuits.neon.tier = 'full';
}

export function effectiveNeonPresentation(state) {
  normalizeAnalogSurvivalState(state);
  const wish = state.analogSurvival.neonPlayerWish;
  const power = Number(state?.power ?? 100);
  if (power < 16) {
    return { mode: 'unstable', wish, forced: true };
  }
  if (power < 32 && wish === 'bright') {
    return { mode: 'flicker', wish, forced: true };
  }
  if (wish === 'flicker') return { mode: 'flicker', wish, forced: false };
  if (wish === 'dark') return { mode: 'dark', wish, forced: false };
  return { mode: 'bright', wish, forced: false };
}

export function cycleNeonPlayerWish(state) {
  normalizeAnalogSurvivalState(state);
  const order = ['bright', 'flicker', 'dark'];
  const i = order.indexOf(state.analogSurvival.neonPlayerWish);
  state.analogSurvival.neonPlayerWish = order[(i + 1) % order.length];
  syncNeonCircuitToWish(state);
  enforceBreakerBudget(state);
  state.analogSurvival.analogNightLog.push(`Neon set to ${state.analogSurvival.neonPlayerWish}.`);
  state.logs.push(`Neon facade mode: ${state.analogSurvival.neonPlayerWish}.`);
}

export function setCircuitTier(state, circuitId, tier) {
  if (!CIRCUIT_IDS.includes(circuitId)) return { ok: false, reason: 'Unknown circuit.' };
  if (tier !== 'full' && tier !== 'dim' && tier !== 'off') return { ok: false, reason: 'Invalid tier.' };
  normalizeAnalogSurvivalState(state);
  if (circuitId === 'neon') {
    state.analogSurvival.neonPlayerWish = tier === 'off' ? 'dark' : tier === 'dim' ? 'flicker' : 'bright';
    syncNeonCircuitToWish(state);
  } else {
    state.analogSurvival.circuits[circuitId] = { tier };
  }
  enforceBreakerBudget(state);
  syncNeonCircuitToWish(state);
  state.analogSurvival.analogNightLog.push(`Breaker ${circuitId} → ${tier}.`);
  return { ok: true };
}

export function cycleCircuitTier(state, circuitId) {
  normalizeAnalogSurvivalState(state);
  if (circuitId === 'neon') {
    cycleNeonPlayerWish(state);
    return { ok: true };
  }
  const t = state.analogSurvival.circuits[circuitId]?.tier || 'dim';
  const next = t === 'full' ? 'dim' : t === 'dim' ? 'off' : 'full';
  return setCircuitTier(state, circuitId, next);
}

/** Extra passive power drain units (added before rounding in caller). */
export function getAnalogPassiveDrainBonus(state) {
  normalizeAnalogSurvivalState(state);
  const analog = state.analogSurvival;
  let bonus = 0;
  CIRCUIT_IDS.forEach((id) => {
    const tier = analog.circuits[id]?.tier;
    if (tier === 'full') bonus += id === 'heating' || id === 'cameras' ? 1 : 0.35;
    else if (tier === 'dim') bonus += id === 'heating' ? 0.5 : 0.2;
  });
  const neon = effectiveNeonPresentation(state);
  if (neon.mode === 'bright') bonus += 0.75;
  if (neon.mode === 'flicker' || neon.mode === 'unstable') bonus += 0.35;
  const w = readWeatherPrimary(state);
  if (w === 'cold' && analog.circuits.heating?.tier === 'full') bonus += 0.75;
  if (w === 'storm') bonus += 0.5;
  return Math.round(bonus * 10) / 10;
}

export function getCameraAnalogPenalty(state) {
  normalizeAnalogSurvivalState(state);
  const t = state.analogSurvival.circuits.cameras?.tier;
  if (t === 'off') return 2;
  if (t === 'dim') return 1;
  return 0;
}

export function tickOperatorFatigue(state, actionKey) {
  normalizeAnalogSurvivalState(state);
  const analog = state.analogSurvival;
  if (analog.fatigueReboundTurns > 0) {
    analog.fatigueReboundTurns -= 1;
    analog.operatorFatigue = Math.min(100, analog.operatorFatigue + 2.5);
  }
  let delta = 0.55;
  const pressure = state?.uiPressureLevel || 'calm';
  if (pressure === 'dire' || pressure === 'emergency') delta += 1.1;
  if (readWeatherPrimary(state) === 'storm') delta += 0.45;
  if (Number(state?.power ?? 100) < 38) delta += 0.5;
  if (Number(state?.shiftElapsedMinutes || 0) > 200) delta += 0.25;
  if (['scan', 'investigate', 'dispatch', 'restorePower', 'drainPower'].includes(actionKey)) delta += 0.15;
  analog.operatorFatigue = Math.min(100, analog.operatorFatigue + delta);
  if (analog.coffeeCooldown > 0) analog.coffeeCooldown -= 1;
}

export function getFatigueTier(state) {
  normalizeAnalogSurvivalState(state);
  const f = Number(state.analogSurvival.operatorFatigue || 0);
  if (f >= 78) return 'severe';
  if (f >= 48) return 'moderate';
  if (f >= 22) return 'light';
  return 'steady';
}

export function shouldFatigueBlurNames(state) {
  return getFatigueTier(state) === 'severe';
}

export function useCoffee(state) {
  normalizeAnalogSurvivalState(state);
  const analog = state.analogSurvival;
  if (analog.coffeeCooldown > 0) {
    return { ok: false, reason: `Coffee cooling down (${analog.coffeeCooldown} action(s)).` };
  }
  const cost = 4;
  if ((state.money || 0) < cost) return { ok: false, reason: 'Not enough cash for staff coffee run.' };
  state.money = Math.max(0, (state.money || 0) - cost);
  analog.operatorFatigue = Math.max(0, analog.operatorFatigue - 22);
  analog.stimUses.coffee = (analog.stimUses.coffee || 0) + 1;
  analog.coffeeCooldown = 2;
  analog.analogNightLog.push('Operator recovery: coffee.');
  state.logs.push('Desk coffee: sharpness returns for a short stretch.');
  return { ok: true };
}

export function useStrongStim(state) {
  normalizeAnalogSurvivalState(state);
  const analog = state.analogSurvival;
  if ((analog.stimUses.strong || 0) >= 1) {
    return { ok: false, reason: 'No more off-book stims tonight.' };
  }
  const cost = 14;
  if ((state.money || 0) < cost) return { ok: false, reason: 'Cash too low for risky pickup.' };
  state.money = Math.max(0, (state.money || 0) - cost);
  analog.operatorFatigue = Math.max(0, analog.operatorFatigue - 48);
  analog.stimUses.strong = 1;
  analog.fatigueReboundTurns = Math.max(analog.fatigueReboundTurns, 4);
  state.dirtyPressure = Math.max(0, Number(state.dirtyPressure || 0) + 1);
  analog.analogNightLog.push('Operator recovery: strong stim (dirty rebound).');
  state.logs.push('Strong stimulant: nerves steady now, dirty exposure ticked up — rebound queued.');
  return { ok: true };
}

export function maybeRollLotPayphoneOffer(state) {
  normalizeAnalogSurvivalState(state);
  const p = state.analogSurvival.payphone;
  if (p.offeredThisShift || p.resolvedThisShift) return false;
  const night = Math.max(1, Number(state?.night || 1));
  if (night < 2) return false;
  const elapsed = Number(state?.shiftElapsedMinutes || 0);
  if (elapsed < 95 || elapsed > 430) return false;
  if (state.activeNightEvent) return false;
  let chance = 0.022;
  const w = readWeatherPrimary(state);
  if (w === 'storm') chance += 0.038;
  if (w === 'fog') chance += 0.028;
  const pres = state?.uiPressureLevel || 'calm';
  if (pres === 'dire' || pres === 'emergency') chance += 0.03;
  if (Number(state?.huntNight?.active || 0)) chance += 0.02;
  if (Math.random() >= chance) return false;
  p.offeredThisShift = true;
  return true;
}

export function buildLotPayphoneNightEvent() {
  return {
    id: 'lot-payphone',
    title: 'Lot Payphone — Wet Line',
    severity: 'high',
    ageTicks: 0,
    worsenStage: 0,
    maxWorsenStages: 0,
    worsenEvery: 2,
    worseningEffects: {},
    description:
      'The old payphone in the parking island starts ringing. You cannot pick it up from the desk. Someone has to walk the lot — or you let it scream into the weather.',
    options: [
      {
        id: 'send-runner',
        label: 'Send a runner to answer',
        preview: 'Intel or trap • lot + morale risk',
        check: { type: 'dispatch', baseSuccess: 0.58 }
      },
      {
        id: 'lobby-watch',
        label: 'Watch from the lobby glass only',
        preview: 'Lower risk • thin intel',
        check: { type: 'investigation', baseSuccess: 0.5 }
      },
      {
        id: 'ignore-payphone',
        label: 'Log noise and ignore',
        preview: 'Pressure may rise • unknown stays unknown'
      }
    ]
  };
}

export function resolveLotPayphoneChoice(state, optionId) {
  normalizeAnalogSurvivalState(state);
  const analog = state.analogSurvival;
  analog.resolvedThisShift = true;
  analog.payphone.lastResultTag = optionId;

  if (optionId === 'ignore-payphone') {
    state.shiftStats.outsideIssueCount = (state.shiftStats.outsideIssueCount || 0) + 1;
    analog.analogNightLog.push('Lot payphone ignored.');
    return {
      ok: true,
      success: false,
      logs: [
        'The payphone rings itself out. Whatever wanted the motel stayed outside — but the silence feels like a debt.'
      ],
      alerts: ['Lot line unanswered: outside pressure ticked in the logbook.'],
      effects: { chainPulse: 1 }
    };
  }

  if (optionId === 'lobby-watch') {
    const intelRoll = Math.random();
    analog.analogNightLog.push('Lot payphone watched from lobby.');
    if (intelRoll < 0.45) {
      return {
        ok: true,
        success: true,
        logs: [
          'From the lobby you catch a silhouette hanging up — tail light pattern matches a cruiser that has been circling the highway feed.'
        ],
        alerts: ['Thin intel: police interest near the lot tonight.'],
        effects: { reputation: 0 }
      };
    }
    return {
      ok: true,
      success: true,
      logs: ['Glass fogged too fast; you only confirm the line was live, not who was on it.'],
      alerts: ['Payphone: no usable voice, but the lot stayed quiet.'],
      effects: {}
    };
  }

  if (optionId === 'send-runner') {
    const roll = Math.random();
    state.power = Math.max(0, Number(state.power || 0) - 2);
    if (roll < 0.18) {
      state.reputation = Math.max(0, Number(state.reputation || 0) - 2);
      analog.analogNightLog.push('Lot payphone runner: ambush scare.');
      return {
        ok: true,
        success: false,
        logs: [
          'Runner reaches the handset — breath on the line, then a laugh and a click. They come back shaken; something watched from the tree line.'
        ],
        alerts: ['Lot contact hostile: morale hit, power dipped with floodlights.'],
        effects: { chainPulse: 2 }
      };
    }
    if (roll < 0.42) {
      state.logs.push('[Radio bleed] DJ tagline matches the cadence on the payphone — someone is bridging highway chatter to the lot.');
      return {
        ok: true,
        success: true,
        logs: ['Runner gets a clipped warning: "wrong night to keep every light honest."'],
        alerts: ['Intel: midnight radio / lot crossover confirmed.'],
        effects: {}
      };
    }
    if (roll < 0.62) {
      return {
        ok: true,
        success: true,
        logs: [
          'Runner reports a calm voice asking for "Room Nine housekeeping code" then hangs up — wrong number or bait.'
        ],
        alerts: ['Payphone intel: possible hunter/faction probe.'],
        effects: { chainPulse: 1 }
      };
    }
    return {
      ok: true,
      success: true,
      logs: ['Coast clear: coin box empty, line dead — maybe kids, maybe a test.'],
      alerts: ['Payphone: false trail, but the lot is checked.'],
      effects: {}
    };
  }

  return { ok: false, reason: 'Unknown payphone option.' };
}

export function applyNeonArrivalBias(guest, state) {
  if (!guest) return guest;
  const neon = effectiveNeonPresentation(state);
  const next = { ...guest };
  const bias = Number(next.chainBias || 0);
  if (neon.mode === 'bright') {
    next.chainBias = Math.max(0, bias - 0.35);
    next.instabilitySignal = Math.max(0, Number(next.instabilitySignal || 0) - 0.5);
  } else if (neon.mode === 'flicker' || neon.mode === 'unstable') {
    next.chainBias = bias + 0.9;
    next.instabilitySignal = Math.min(10, Number(next.instabilitySignal || 0) + 1.2);
  } else if (neon.mode === 'dark') {
    next.chainBias = Math.max(0, bias - 0.15);
    next.urgencySignal = Math.max(0, Number(next.urgencySignal || 0) - 0.5);
  }
  return next;
}

/** @returns {{ alert: object } | null} */
export function tickColdWithoutHeating(state) {
  normalizeAnalogSurvivalState(state);
  if (readWeatherPrimary(state) !== 'cold') return null;
  if (state.analogSurvival.circuits.heating?.tier !== 'off') return null;
  if (Math.random() > 0.14) return null;
  state.reputation = Math.max(0, Number(state.reputation || 0) - 1);
  state.logs.push('Cold bite with heating cut: guests complain in the lobby.');
  return {
    alert: {
      type: 'warning',
      message: 'Heating circuit is cut during a cold night — reputation chipped from visible discomfort.',
      dedupeKey: `cold-no-heat-${state.night}-${state.shiftElapsedMinutes}`
    }
  };
}

export function finalizeAnalogSurvivalState(state) {
  normalizeAnalogSurvivalState(state);
  syncNeonCircuitToWish(state);
  enforceBreakerBudget(state);
  syncNeonCircuitToWish(state);
}

export function resetAnalogForNewShift(state) {
  state.analogSurvival = buildFreshAnalogSurvival();
  finalizeAnalogSurvivalState(state);
}
