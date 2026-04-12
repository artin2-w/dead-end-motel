function clamp01(value) {
  return Math.max(0, Math.min(1, Number(value || 0)));
}

function pickWeighted(entries = []) {
  const weighted = entries
    .map((entry) => ({ ...entry, weight: Math.max(0, Number(entry?.weight || 0)) }))
    .filter((entry) => entry.weight > 0);
  if (!weighted.length) return null;
  const total = weighted.reduce((sum, entry) => sum + entry.weight, 0);
  let roll = Math.random() * total;
  for (let i = 0; i < weighted.length; i += 1) {
    roll -= weighted[i].weight;
    if (roll <= 0) return weighted[i];
  }
  return weighted[weighted.length - 1] || null;
}

const FINALE_SPECIAL_ENCOUNTERS = [
  {
    id: 'finale-authority-sweep',
    weight: 6,
    title: 'Unscheduled Authority Sweep',
    badgeLabel: 'FINALE',
    clue: 'Two plainclothes officers ask for immediate corridor access and occupancy posture.',
    description: 'An unscheduled authority sweep arrives and requests rapid cooperation while guests are awake.',
    options: [
      {
        id: 'finale-cooperate-limited',
        label: 'Cooperate with limited escorted access',
        preview: '-2% power • +1 reputation • lower chain pressure',
        effects: {
          power: -2,
          reputation: 1,
          riskDelta: -1,
          forceFlag: true,
          logs: ['Finale encounter: authority sweep was routed through controlled escorted access.']
        }
      },
      {
        id: 'finale-delay-access',
        label: 'Delay access pending desk verification',
        preview: '+$6 • oversight tension risk',
        check: { type: 'investigation', baseSuccess: 0.52 },
        effects: {
          money: 6,
          logs: ['Finale encounter: authority request delayed for verification.']
        },
        onFailure: {
          effects: {
            reputation: -2,
            incidentBias: 1,
            chainBias: 1,
            logs: ['Delay was read as obstruction and oversight pressure increased.'],
            stats: { forcedCompromises: 1 }
          }
        }
      }
    ]
  },
  {
    id: 'finale-thread-returnee',
    weight: 5,
    title: 'Returning Problem Guest',
    badgeLabel: 'FINALE',
    clue: 'A known guest returns with companions and a direct grievance from earlier nights.',
    description: 'A recurring thread returns with friends and demands immediate correction in public view.',
    options: [
      {
        id: 'finale-private-resolution',
        label: 'Offer private rapid resolution with monitored room',
        preview: '-$10 • +2 reputation • quieter containment',
        effects: {
          money: -10,
          reputation: 2,
          riskDelta: -1,
          forceFlag: true,
          roomConditionOnCheckIn: 'Watch',
          logs: ['Finale encounter: returning grievance moved into private monitored resolution.'],
          stats: { cleanResponses: 1 }
        }
      },
      {
        id: 'finale-hard-denial',
        label: 'Issue hard denial and remove from queue',
        preview: '+$5 • high backlash risk',
        effects: {
          money: 5,
          reputation: -1,
          incidentBias: 2,
          chainBias: 1,
          logs: ['Finale encounter: returning grievance denied at desk under pressure.'],
          stats: { forcedCompromises: 1 }
        }
      }
    ]
  }
];

const FINALE_NIGHT_EVENTS = [
  {
    id: 'finale-grid-cascade-warning',
    weight: 7,
    title: 'Grid Cascade Warning',
    severity: 'high',
    description: 'Utility fluctuations are cascading through lobby, laundry, and rear access controls.',
    options: [
      {
        id: 'finale-grid-isolate',
        label: 'Isolate non-critical circuits now',
        preview: '-7% power • contain cascade chance',
        check: { type: 'utility', baseSuccess: 0.68 },
        effects: {
          power: -7,
          chainPulse: -1,
          logs: ['Finale event response: emergency isolation prevented full grid cascade.'],
          stats: { cleanResponses: 1 }
        },
        onFailure: {
          effects: {
            power: -10,
            reputation: -1,
            chainPulse: 2,
            logs: ['Isolation timing slipped and blackout ripples hit multiple wings.'],
            stats: { nightEventsMissed: 1 }
          }
        }
      },
      {
        id: 'finale-hold-grid',
        label: 'Hold configuration and ride surge window',
        preview: 'No immediate cost • high volatility',
        check: { type: 'utility', baseSuccess: 0.42 },
        effects: {
          logs: ['Finale event response: grid held steady by narrow margin.']
        },
        onFailure: {
          effects: {
            power: -8,
            reputation: -2,
            chainPulse: 2,
            logs: ['Grid hold failed and instability spread property-wide.'],
            stats: { nightEventsMissed: 1 }
          }
        }
      }
    ]
  },
  {
    id: 'finale-public-rumor-surge',
    weight: 6,
    title: 'Public Rumor Surge',
    severity: 'high',
    description: 'A hallway recording is circulating outside and guests demand reassurance immediately.',
    options: [
      {
        id: 'finale-calm-broadcast',
        label: 'Issue coordinated calm broadcast',
        preview: '-$8 • +2 reputation • lower panic',
        check: { type: 'dispatch', baseSuccess: 0.63 },
        effects: {
          money: -8,
          reputation: 2,
          chainPulse: -1,
          logs: ['Finale event response: calm broadcast stabilized guest perception.'],
          stats: { cleanResponses: 1 }
        }
      },
      {
        id: 'finale-suppress-rumor',
        label: 'Suppress discussion and lock channels',
        preview: '+$5 now • trust risk',
        check: { type: 'investigation', baseSuccess: 0.48 },
        effects: {
          money: 5,
          logs: ['Finale event response: rumor channels were temporarily suppressed.']
        },
        onFailure: {
          effects: {
            reputation: -3,
            chainPulse: 2,
            logs: ['Suppression backfired and public breakdown pressure intensified.'],
            stats: { nightEventsMissed: 1, forcedCompromises: 1 }
          }
        }
      }
    ]
  }
];

const FINALE_CAMERA_STATUSES = [
  {
    status: 'Signal Storm',
    severity: 'high',
    label: 'camera-signal-storm'
  },
  {
    status: 'Coordinated Movement',
    severity: 'high',
    label: 'camera-coordinated-movement'
  },
  {
    status: 'Blackout Pocket',
    severity: 'high',
    label: 'camera-blackout-pocket'
  }
];

export function maybeAttachFinaleEncounter(guest, state, branchContext = null) {
  if (!guest || guest?.specialEncounter?.id) return guest;
  if (!state?.finaleDirector?.active) return guest;
  const chanceBase = 0.2 + Math.min(0.2, Number(state?.finaleDirector?.pressure || 0) * 0.03);
  const chance = clamp01(chanceBase + Number(branchContext?.specialEncounterChanceBonus || 0));
  if (Math.random() > chance) return guest;

  const selected = pickWeighted(
    FINALE_SPECIAL_ENCOUNTERS.map((entry) => ({
      ...entry,
      weight: Number(entry.weight || 1) + Math.max(0, Number(branchContext?.signals?.storyEscalation || 0) * 0.25)
    }))
  );
  if (!selected) return guest;

  state.finaleDirector.signatureEncountersSeen = Array.isArray(state?.finaleDirector?.signatureEncountersSeen)
    ? [...state.finaleDirector.signatureEncountersSeen, selected.id].slice(-6)
    : [selected.id];

  return {
    ...guest,
    specialEncounter: {
      id: selected.id,
      title: selected.title,
      badgeLabel: selected.badgeLabel || 'FINALE',
      clue: selected.clue,
      description: selected.description,
      options: selected.options,
      resolved: false
    }
  };
}

export function maybeOpenFinaleNightEvent(state, branchContext = null) {
  if (!state?.finaleDirector?.active || state?.activeNightEvent) return null;
  const director = state.finaleDirector;
  const elapsed = Number(state?.shiftElapsedMinutes || 0);
  if (elapsed < 80 || elapsed < Number(director.nextSignatureEventMinute || 0)) return null;

  const pressureBoost = Math.max(0, Number(director.pressure || 0) * 0.025);
  const chance = clamp01(0.14 + pressureBoost + Number(branchContext?.eventChanceBonus || 0) * 0.8);
  if (Math.random() > chance) return null;

  const recentIds = Array.isArray(director.signatureEventsSeen) ? director.signatureEventsSeen : [];
  const selected = pickWeighted(
    FINALE_NIGHT_EVENTS.map((entry) => ({
      ...entry,
      weight: recentIds.includes(entry.id) ? entry.weight * 0.4 : entry.weight
    }))
  );
  if (!selected) return null;

  const event = {
    id: selected.id,
    title: selected.title,
    severity: selected.severity,
    description: selected.description,
    options: selected.options,
    worsenEvery: 2,
    maxWorsenStages: 2,
    worseningEffects: {
      reputation: -1,
      chainPulse: 2,
      logs: [`Finale event worsened: ${selected.title} spread across multiple zones.`]
    },
    ageTicks: 0,
    worsenStage: 0,
    startedAtNightMinute: elapsed
  };

  director.signatureEventsSeen = [...recentIds, selected.id].slice(-6);
  director.nextSignatureEventMinute = elapsed + 65;
  director.signatureIncidentsTriggered = Number(director.signatureIncidentsTriggered || 0) + 1;
  return event;
}

export function maybeEscalateFinaleAnomaly(state) {
  if (!state?.finaleDirector?.active) return null;
  if (!Array.isArray(state?.cameras) || !Array.isArray(state?.activeEvents)) return null;
  const director = state.finaleDirector;
  const chance = clamp01(0.2 + Math.max(0, Number(director.pressure || 0) * 0.03));
  if (Math.random() > chance) return null;

  const available = state.cameras
    .filter((camera) => !state.activeEvents.some((event) => String(event?.cameraId) === String(camera.id)));
  const camera = available[Math.floor(Math.random() * available.length)] || null;
  if (!camera) return null;

  const anomaly = FINALE_CAMERA_STATUSES[Math.floor(Math.random() * FINALE_CAMERA_STATUSES.length)];
  camera.status = anomaly.status;
  const event = {
    cameraId: camera.id,
    cameraName: camera.name,
    status: anomaly.status,
    severity: anomaly.severity
  };
  state.activeEvents.push(event);
  director.signatureIncidentsTriggered = Number(director.signatureIncidentsTriggered || 0) + 1;
  return {
    event,
    log: `Finale anomaly: ${camera.name} entered ${anomaly.status.toLowerCase()} state.`,
    contentLabel: anomaly.label
  };
}

export function getFinaleCommandCatalog(state) {
  if (!state?.finaleDirector?.active) return [];
  return [
    {
      id: 'property-lockdown',
      label: 'Property Lockdown',
      costLabel: '-$20 • -2 rep • strongest cross-zone dampening',
      available: Number(state?.money || 0) >= 20
    },
    {
      id: 'grid-isolation',
      label: 'Emergency Grid Isolation',
      costLabel: '-7% power • +1 containment • anti-spike floor',
      available: Number(state?.power || 0) >= 9
    },
    {
      id: 'calm-broadcast',
      label: 'Public Calm Broadcast',
      costLabel: '-$12 • +2 rep on success window',
      available: Number(state?.money || 0) >= 12
    },
    {
      id: 'authority-coordination',
      label: 'External Authority Coordination',
      costLabel: '-1 rep • consistent pressure dampening',
      available: true
    }
  ];
}

export function applyFinaleCommandDecision(state, commandId) {
  if (!state?.finaleDirector?.active) {
    return { ok: false, reason: 'Final-night command options are unavailable.' };
  }
  const director = state.finaleDirector;
  const now = Number(state?.shiftElapsedMinutes || 0);
  const lastUsed = Number(director.commandLastUsedAt || -999);
  if (now - lastUsed < 25) {
    return { ok: false, reason: 'Command channel cooling down. Wait before issuing another property-wide order.' };
  }

  const effects = {
    logs: [],
    alerts: [],
    pressureDelta: -1,
    identity: null
  };

  if (commandId === 'property-lockdown') {
    if (Number(state.money || 0) < 20) return { ok: false, reason: 'Insufficient funds for lockdown mobilization.' };
    state.money = Math.max(0, Number(state.money || 0) - 20);
    state.reputation = Math.max(0, Number(state.reputation || 0) - 2);
    state.shiftStats.ownershipPressureMoments = (state.shiftStats.ownershipPressureMoments || 0) + 1;
    director.commandShieldTicks = Math.max(Number(director.commandShieldTicks || 0), 3);
    effects.logs.push('Final command: temporary property lockdown activated across all access points.');
    effects.alerts.push('Property lockdown active. Cross-zone movement pressure reduced for a short window.');
    effects.pressureDelta = -2;
    effects.identity = { doctrine: { control: 2, force: 1 }, factions: { ownership: 1, guests: -1, locals: -1 } };
  } else if (commandId === 'grid-isolation') {
    if (Number(state.power || 0) < 9) return { ok: false, reason: 'Power reserve too low to isolate grid safely.' };
    state.power = Math.max(0, Number(state.power || 0) - 7);
    director.gridIsolationTicks = Math.max(Number(director.gridIsolationTicks || 0), 3);
    director.containmentMoments = Number(director.containmentMoments || 0) + 1;
    state.power = Math.max(12, Number(state.power || 0));
    effects.logs.push('Final command: emergency grid isolation rerouted load away from volatile zones.');
    effects.alerts.push('Grid isolation active. Camera/power volatility dampened briefly.');
    effects.pressureDelta = -2;
    effects.identity = { doctrine: { secrecy: 1, control: 1 }, factions: { ownership: 1, staff: 1 } };
  } else if (commandId === 'calm-broadcast') {
    if (Number(state.money || 0) < 12) return { ok: false, reason: 'Insufficient funds to execute broadcast operations.' };
    state.money = Math.max(0, Number(state.money || 0) - 12);
    const success = Math.random() <= 0.62;
    if (success) {
      state.reputation = Math.max(0, Number(state.reputation || 0) + 2);
      director.containmentMoments = Number(director.containmentMoments || 0) + 1;
      effects.pressureDelta = -2;
      effects.logs.push('Final command: calm broadcast landed and prevented public panic spread.');
      effects.alerts.push('Broadcast successful. Public-facing pressure eased.');
      effects.identity = { doctrine: { compassion: 1, stability: 1 }, factions: { guests: 1, locals: 1 } };
    } else {
      state.reputation = Math.max(0, Number(state.reputation || 0) - 1);
      effects.pressureDelta = 1;
      effects.logs.push('Final command: broadcast was challenged, creating mixed public reaction.');
      effects.alerts.push('Broadcast underperformed. Rumor pressure remains active.');
      effects.identity = { doctrine: { improvisation: 1 }, factions: { guests: -1 } };
    }
  } else if (commandId === 'authority-coordination') {
    state.reputation = Math.max(0, Number(state.reputation || 0) - 1);
    director.commandShieldTicks = Math.max(Number(director.commandShieldTicks || 0), 2);
    director.containmentMoments = Number(director.containmentMoments || 0) + 1;
    state.shiftStats.authorityAssistedMoments = (state.shiftStats.authorityAssistedMoments || 0) + 1;
    effects.logs.push('Final command: external authority coordination established rapid-response corridor support.');
    effects.alerts.push('Authority coordination in effect. Escalation windows reduced.');
    effects.pressureDelta = -2;
    effects.identity = { doctrine: { control: 1, secrecy: 1 }, factions: { authorities: 2, ownership: 1, guests: -1 } };
  } else {
    return { ok: false, reason: 'Unknown final-night command option.' };
  }

  director.commandDecisionsUsed = Number(director.commandDecisionsUsed || 0) + 1;
  director.commandLastUsedAt = now;
  director.pressure = Math.max(0, Number(director.pressure || 0) + Number(effects.pressureDelta || 0));
  return { ok: true, ...effects };
}
