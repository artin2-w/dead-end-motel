import { getMilestoneMeta } from './milestones.js';

function n(value, fallback = 0) {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}

function clamp(value, min = 0, max = 999) {
  return Math.max(min, Math.min(max, n(value, min)));
}

const DEFAULT_FINALE_STATE = Object.freeze({
  active: false,
  trueFinalNight: false,
  pacingBand: 'opening-tension',
  pressure: 0,
  pressurePeak: 0,
  commandShieldTicks: 0,
  gridIsolationTicks: 0,
  commandDecisionsUsed: 0,
  commandLastUsedAt: -999,
  containmentMoments: 0,
  signatureIncidentsTriggered: 0,
  signatureEventsSeen: [],
  signatureEncountersSeen: [],
  chainSpilloversTriggered: 0,
  incidentsContained: 0,
  unresolvedAtStart: 0,
  objectiveFailures: 0,
  stageAlerted: {},
  nextSignatureEventMinute: 110,
  performance: null
});

export function isTrueFinalCampaignNight(state) {
  const campaign = state?.campaign || {};
  const length = Math.max(3, n(campaign.length, 5));
  const night = Math.max(1, n(state?.night, 1));
  const milestone = getMilestoneMeta(night, campaign);
  return night >= length && Boolean(milestone?.isFinale);
}

export function normalizeFinaleDirectorState(state) {
  if (!state || typeof state !== 'object') return state;
  const current = state.finaleDirector && typeof state.finaleDirector === 'object'
    ? state.finaleDirector
    : {};
  state.finaleDirector = {
    ...DEFAULT_FINALE_STATE,
    ...current,
    active: Boolean(current.active),
    trueFinalNight: Boolean(current.trueFinalNight),
    pacingBand: String(current.pacingBand || DEFAULT_FINALE_STATE.pacingBand),
    pressure: clamp(current.pressure, 0, 20),
    pressurePeak: clamp(current.pressurePeak, 0, 40),
    commandShieldTicks: clamp(current.commandShieldTicks, 0, 8),
    gridIsolationTicks: clamp(current.gridIsolationTicks, 0, 8),
    commandDecisionsUsed: clamp(current.commandDecisionsUsed, 0, 99),
    commandLastUsedAt: n(current.commandLastUsedAt, -999),
    containmentMoments: clamp(current.containmentMoments, 0, 99),
    signatureIncidentsTriggered: clamp(current.signatureIncidentsTriggered, 0, 99),
    signatureEventsSeen: Array.isArray(current.signatureEventsSeen) ? current.signatureEventsSeen.slice(-8) : [],
    signatureEncountersSeen: Array.isArray(current.signatureEncountersSeen) ? current.signatureEncountersSeen.slice(-8) : [],
    chainSpilloversTriggered: clamp(current.chainSpilloversTriggered, 0, 99),
    incidentsContained: clamp(current.incidentsContained, 0, 99),
    unresolvedAtStart: clamp(current.unresolvedAtStart, 0, 40),
    objectiveFailures: clamp(current.objectiveFailures, 0, 10),
    stageAlerted: current.stageAlerted && typeof current.stageAlerted === 'object' ? current.stageAlerted : {},
    nextSignatureEventMinute: clamp(current.nextSignatureEventMinute, 30, 460),
    performance: current.performance && typeof current.performance === 'object' ? current.performance : null
  };
  return state;
}

function getBandForMinute(minute = 0) {
  const m = clamp(minute, 0, 480);
  if (m < 120) return 'opening-tension';
  if (m < 260) return 'midpoint-strain';
  if (m < 390) return 'late-night-cascade';
  return 'pre-dawn-last-stand';
}

function countUnresolved(state) {
  const zones = Object.values(state?.locationState?.zones || {});
  return zones.filter((zone) =>
    Boolean(zone?.pendingIssue)
    || n(zone?.followupPressure, 0) > 0
    || n(zone?.unresolvedCount, 0) > 0
  ).length;
}

function computePressure(state) {
  const unresolvedZones = countUnresolved(state);
  const severeIncidents = n(state?.shiftStats?.severeIncidents, 0);
  const activeEvents = n(state?.activeEvents?.length, 0);
  const chainPressure = Array.isArray(state?.storyChains)
    ? state.storyChains.reduce((sum, chain) => sum + Math.max(0, n(chain?.pressure, 0)), 0)
    : 0;
  const locals = n(state?.factions?.locals, 0) < -3 ? 1 : 0;
  const ownership = n(state?.factions?.ownership, 0) < -3 ? 1 : 0;
  const carryover = Array.isArray(state?.carryover) ? Math.min(3, state.carryover.length) : 0;
  const doctrineForce = n(state?.doctrine?.tendencies?.force, 0) >= 6 ? 1 : 0;
  const raw =
    unresolvedZones * 0.9
    + severeIncidents * 1.2
    + activeEvents * 0.8
    + chainPressure * 0.12
    + locals
    + ownership
    + carryover * 0.45
    + doctrineForce;
  return clamp(Math.round(raw), 0, 20);
}

function getPacingAlertLine(band) {
  if (band === 'opening-tension') return 'Final Night: opening tension is building across the property.';
  if (band === 'midpoint-strain') return 'Final Night: midpoint strain is spreading between zones.';
  if (band === 'late-night-cascade') return 'Final Night: cascade window active. Containment decisions are compounding.';
  return 'Final Night: pre-dawn last stand. Hold operational control until daylight.';
}

export function activateFinaleDirector(state) {
  normalizeFinaleDirectorState(state);
  const active = isTrueFinalCampaignNight(state);
  if (!active) {
    state.finaleDirector.active = false;
    state.finaleDirector.trueFinalNight = false;
    return { active: false, logs: [], alerts: [] };
  }

  const unresolvedAtStart = countUnresolved(state);
  state.finaleDirector = {
    ...state.finaleDirector,
    active: true,
    trueFinalNight: true,
    pacingBand: 'opening-tension',
    pressure: computePressure(state),
    pressurePeak: Math.max(n(state.finaleDirector.pressurePeak, 0), computePressure(state)),
    unresolvedAtStart,
    stageAlerted: {},
    performance: null,
    nextSignatureEventMinute: 95
  };

  return {
    active: true,
    logs: ['Finale director online: the closing shift is now under full-campaign pressure conditions.'],
    alerts: ['Final Night active — command-level containment decisions unlocked.']
  };
}

export function tickFinaleDirector(state) {
  normalizeFinaleDirectorState(state);
  if (!state?.finaleDirector?.active) {
    return { active: false, logs: [], alerts: [], spillovers: [] };
  }
  const director = state.finaleDirector;
  const logs = [];
  const alerts = [];
  const spillovers = [];
  const elapsed = n(state?.shiftElapsedMinutes, 0);

  if (director.commandShieldTicks > 0) director.commandShieldTicks -= 1;
  if (director.gridIsolationTicks > 0) director.gridIsolationTicks -= 1;

  const band = getBandForMinute(elapsed);
  if (band !== director.pacingBand) {
    director.pacingBand = band;
  }

  if (!director.stageAlerted[band]) {
    director.stageAlerted[band] = true;
    logs.push(getPacingAlertLine(band));
    alerts.push(getPacingAlertLine(band));
  }

  const pressure = Math.max(0, computePressure(state) - n(director.commandShieldTicks, 0));
  director.pressure = pressure;
  director.pressurePeak = Math.max(n(director.pressurePeak, 0), pressure);

  const unresolved = countUnresolved(state);
  const zones = Object.values(state?.locationState?.zones || {})
    .filter((zone) => zone?.key || zone?.label)
    .sort((a, b) => n(b?.followupPressure, 0) - n(a?.followupPressure, 0));

  const shouldSpill =
    pressure >= (band === 'late-night-cascade' || band === 'pre-dawn-last-stand' ? 6 : 8)
    && unresolved >= 1
    && Math.random() <= 0.38;

  if (shouldSpill && zones.length >= 1) {
    const source = zones[0];
    const target = zones.find((entry) => String(entry?.key || '') !== String(source?.key || '')) || null;
    if (target?.key) {
      spillovers.push({
        sourceZoneId: source.key,
        targetZoneId: target.key,
        sourceLabel: source.label || source.key,
        targetLabel: target.label || target.key,
        amount: 1 + (band === 'pre-dawn-last-stand' ? 1 : 0)
      });
      director.chainSpilloversTriggered = n(director.chainSpilloversTriggered, 0) + 1;
      logs.push(`Finale spillover: ${source.label || source.key} pressure is bleeding into ${target.label || target.key}.`);
      alerts.push(`Cross-zone crisis: ${target.label || target.key} now affected by a linked incident chain.`);
    }
  }

  return {
    active: true,
    logs,
    alerts,
    spillovers,
    pressure,
    pacingBand: director.pacingBand
  };
}

export function registerFinaleContainment(state, amount = 1) {
  normalizeFinaleDirectorState(state);
  if (!state?.finaleDirector?.active) return;
  state.finaleDirector.incidentsContained = n(state.finaleDirector.incidentsContained, 0) + Math.max(0, n(amount, 0));
  state.finaleDirector.containmentMoments = n(state.finaleDirector.containmentMoments, 0) + 1;
}

export function buildFinaleObjectives(state) {
  normalizeFinaleDirectorState(state);
  const director = state?.finaleDirector;
  if (!director?.active) return [];

  const unresolved = countUnresolved(state);
  const pressure = n(director.pressure, 0);
  const rep = n(state?.reputation, 0);
  const power = n(state?.power, 0);
  const contained = n(director.incidentsContained, 0) + n(director.containmentMoments, 0);
  const publicBreakdown = n(state?.shiftStats?.nightEventsMissed, 0) + n(state?.shiftStats?.publicPressureMoments, 0);
  const elapsed = n(state?.shiftElapsedMinutes, 0);

  return [
    {
      id: 'finale-operational-until-dawn',
      label: 'Finale: Keep property operational through last stand',
      complete: elapsed < 390 ? true : (power > 0 && rep > 0),
      finalOnly: true
    },
    {
      id: 'finale-zone-collapse-control',
      label: 'Finale: Prevent total zone collapse (unresolved zones under 3)',
      complete: unresolved < 3,
      finalOnly: true
    },
    {
      id: 'finale-containment-target',
      label: 'Finale: Contain at least 3 signature incidents',
      complete: contained >= 3,
      finalOnly: true
    },
    {
      id: 'finale-public-breakdown',
      label: 'Finale: Avoid full public breakdown during climax window',
      complete: publicBreakdown <= 2 && pressure <= 10,
      finalOnly: true
    },
    {
      id: 'finale-power-floor',
      label: 'Finale: Protect power reserve above 18% by dawn',
      complete: power >= 18,
      finalOnly: true
    }
  ];
}

export function buildFinaleUiState(state) {
  normalizeFinaleDirectorState(state);
  const director = state?.finaleDirector;
  if (!director?.active) return null;

  const pressure = n(director.pressure, 0);
  const pressureBand = pressure >= 12 ? 'critical' : pressure >= 8 ? 'high' : pressure >= 4 ? 'elevated' : 'contained';
  return {
    active: true,
    banner: `Final Night • ${String(director.pacingBand || '').replace(/-/g, ' ')}`,
    pressureLabel: `Finale pressure: ${pressureBand.toUpperCase()} (${pressure})`,
    pressureBand,
    chainSpilloversTriggered: n(director.chainSpilloversTriggered, 0),
    signatureIncidentsTriggered: n(director.signatureIncidentsTriggered, 0),
    containmentMoments: n(director.containmentMoments, 0),
    commandDecisionsUsed: n(director.commandDecisionsUsed, 0)
  };
}

export function buildFinalePerformanceContext(state) {
  normalizeFinaleDirectorState(state);
  const director = state?.finaleDirector;
  if (!director?.trueFinalNight) {
    return {
      key: 'not-finale',
      label: 'No finale context',
      line: 'Final-night context unavailable for this run.'
    };
  }

  const unresolved = countUnresolved(state) + n(state?.shiftStats?.nightEventsMissed, 0);
  const contained = n(director.incidentsContained, 0) + n(director.containmentMoments, 0);
  const peak = n(director.pressurePeak, 0);
  const power = n(state?.power, 0);
  const rep = n(state?.reputation, 0);

  if (peak <= 7 && unresolved <= 2 && contained >= 3 && power >= 25 && rep >= 42) {
    return {
      key: 'stabilized-finale',
      label: 'Finale stabilized',
      line: 'You stabilized the closing night and kept the property coherent under maximum scrutiny.'
    };
  }
  if (peak <= 12 && unresolved <= 5 && contained >= 2) {
    return {
      key: 'barely-contained-finale',
      label: 'Finale barely contained',
      line: 'You held the line through dawn, but only by absorbing heavy late-night instability.'
    };
  }
  return {
    key: 'lost-control-finale',
    label: 'Finale control lost',
    line: 'The closing night slipped beyond stable control, leaving visible fallout at daybreak.'
  };
}

export function buildFinaleForeshadowNotes(state) {
  const night = n(state?.night, 1);
  const milestone = getMilestoneMeta(night, state?.campaign || {});
  if (milestone?.isFinale) return [];
  if (night === 3) {
    return [
      'Foreshadowing: staff chatter suggests unresolved issues are starting to align across zones.',
      'Foreshadowing: ownership requested a full-closing-night readiness report after tonight.'
    ];
  }
  if (night === 4 || milestone?.isPreFinale) {
    return [
      'Foreshadowing: multiple factions are signaling that the next night will be decisive.',
      'Foreshadowing: camera technicians warned that small anomalies may sync into property-wide cascades.'
    ];
  }
  return [];
}
