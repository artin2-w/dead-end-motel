import { getNightEventTags, applyTagWeighting } from './branchingCatalog.js';

const NIGHT_EVENTS = [
  {
    id: 'noise-complaint-call',
    title: 'Noise Complaint Call',
    severity: 'medium',
    description: 'Multiple guests report shouting from an occupied wing.',
    weight: 9,
    scenarioAffinity: ['weekend-disturbance'],
    worsenEvery: 2,
    maxWorsenStages: 2,
    worseningEffects: {
      reputation: -1,
      chainPulse: 1,
      logs: ['Active event worsened: hallway arguments spread to nearby rooms.']
    },
    options: [
      {
        id: 'dispatch-floor-round',
        label: 'Dispatch floor round',
        preview: '-1% power • good containment chance',
        check: { type: 'dispatch', baseSuccess: 0.62 },
        effects: {
          power: -1,
          reputation: 1,
          chainPulse: -1,
          logs: ['Event response: staff dispersed the disturbance before escalation.'],
          stats: { cleanResponses: 1 }
        },
        onFailure: {
          effects: {
            reputation: -1,
            chainPulse: 1,
            logs: ['Staff response hesitated; disturbance remained active.'],
            stats: { forcedCompromises: 1, nightEventsMissed: 1 }
          }
        }
      },
      {
        id: 'warn-by-phone',
        label: 'Issue warning by room phone',
        preview: 'No direct cost • moderate risk of repeat',
        check: { type: 'investigation', baseSuccess: 0.54 },
        effects: {
          logs: ['Event response: verbal warning issued to the noisy room.']
        },
        onFailure: {
          effects: {
            reputation: -1,
            chainPulse: 1,
            logs: ['Phone warning failed; complaint volume increased.'],
            stats: { nightEventsMissed: 1 }
          }
        }
      }
    ]
  },
  {
    id: 'water-leak-report',
    title: 'Water Leak Report',
    severity: 'high',
    description: 'Maintenance reports water seeping near occupied rooms.',
    weight: 6,
    scenarioAffinity: ['storm-night'],
    worsenEvery: 2,
    maxWorsenStages: 2,
    worseningEffects: {
      money: -8,
      roomConditionDrop: true,
      logs: ['Active event worsened: leak spread into occupied hallway carpet.']
    },
    options: [
      {
        id: 'send-contractor',
        label: 'Authorize emergency contractor patch',
        preview: '-$16 • high success chance • room pressure down',
        check: { type: 'utility', baseSuccess: 0.74 },
        effects: {
          money: -16,
          chainPulse: -1,
          logs: ['Event response: emergency contractor stabilized the leak.'],
          stats: { cleanResponses: 1 }
        }
      },
      {
        id: 'delay-until-dawn',
        label: 'Delay full repair until dawn',
        preview: '-1 reputation • chance of worsening',
        effects: {
          reputation: -1,
          chainPulse: 1,
          logs: ['Event response: repair deferred, temporary containment only.'],
          stats: { forcedCompromises: 1, nightEventsMissed: 1 }
        }
      }
    ]
  },
  {
    id: 'parking-lot-standoff',
    title: 'Parking Lot Standoff',
    severity: 'high',
    description: 'Two groups are arguing beside vehicles near camera blind edge.',
    weight: 6,
    scenarioAffinity: ['weekend-disturbance', 'blackout-strain'],
    worsenEvery: 2,
    maxWorsenStages: 2,
    worseningEffects: {
      reputation: -1,
      chainPulse: 2,
      logs: ['Active event worsened: lot argument is drawing bystanders.']
    },
    options: [
      {
        id: 'call-police-presence',
        label: 'Request visible police presence',
        preview: '-1 reputation • high containment chance',
        check: { type: 'dispatch', baseSuccess: 0.71 },
        effects: {
          reputation: -1,
          chainPulse: -2,
          logs: ['Event response: police presence dispersed the lot standoff.']
        }
      },
      {
        id: 'staff-deescalation',
        label: 'Send staff to de-escalate',
        preview: '-2% power • moderate risk',
        check: { type: 'dispatch', baseSuccess: 0.55 },
        effects: {
          power: -2,
          reputation: 1,
          chainPulse: -1,
          logs: ['Event response: staff calmed lot tensions.'],
          stats: { cleanResponses: 1 }
        },
        onFailure: {
          effects: {
            reputation: -2,
            chainPulse: 2,
            logs: ['Staff approach failed; lot dispute intensified.'],
            stats: { nightEventsMissed: 1 }
          }
        }
      }
    ]
  },
  {
    id: 'flickering-utility-surge',
    title: 'Flickering Utility Surge',
    severity: 'medium',
    description: 'Power fluctuations are causing lights to pulse across two wings.',
    weight: 8,
    scenarioAffinity: ['blackout-strain'],
    worsenEvery: 3,
    maxWorsenStages: 2,
    worseningEffects: {
      power: -3,
      logs: ['Active event worsened: utility instability drained reserve power.']
    },
    options: [
      {
        id: 'reroute-load',
        label: 'Perform controlled load reroute',
        preview: '-4% power • lowers future surge risk',
        check: { type: 'utility', baseSuccess: 0.64 },
        effects: {
          power: -4,
          chainPulse: -1,
          logs: ['Event response: load reroute contained the flicker cycle.']
        }
      },
      {
        id: 'ride-it-out',
        label: 'Ride it out and monitor',
        preview: 'No immediate cost • possible reputation loss',
        effects: {
          logs: ['Event response: utility flicker was monitored without active reroute.']
        },
        onFailure: {
          effects: {
            reputation: -1,
            power: -2,
            stats: { nightEventsMissed: 1 },
            logs: ['Guests complained as flicker outages continued.']
          }
        },
        check: { type: 'utility', baseSuccess: 0.48 }
      }
    ]
  },
  {
    id: 'strange-knock-closed-room',
    title: 'Strange Knock at Closed Room',
    severity: 'medium',
    description: 'Repeated knocks reported at a room currently marked vacant.',
    weight: 7,
    scenarioAffinity: ['inspection-rumor'],
    worsenEvery: 2,
    maxWorsenStages: 2,
    worseningEffects: {
      chainPulse: 1,
      incidentBiasPulse: 1,
      logs: ['Active event worsened: reports spread about movement near closed room access.']
    },
    options: [
      {
        id: 'camera-verify-then-dispatch',
        label: 'Verify camera and dispatch quick check',
        preview: '-2% power • high containment chance',
        check: { type: 'investigation', baseSuccess: 0.67 },
        effects: {
          power: -2,
          chainPulse: -1,
          logs: ['Event response: closed-room noise source identified and neutralized.'],
          stats: { cleanResponses: 1 }
        }
      },
      {
        id: 'ignore-rumor',
        label: 'Treat as rumor and ignore',
        preview: 'No cost • high chance to worsen',
        check: { type: 'investigation', baseSuccess: 0.38 },
        effects: {
          logs: ['Event response: report dismissed as likely rumor.']
        },
        onFailure: {
          effects: {
            reputation: -1,
            chainPulse: 2,
            stats: { nightEventsMissed: 1 },
            logs: ['Dismissed report returned as a larger hallway disturbance.']
          }
        }
      }
    ]
  },
  {
    id: 'emergency-vehicle-outside',
    title: 'Emergency Vehicle Outside',
    severity: 'medium',
    description: 'An emergency vehicle idles outside, drawing guest attention and anxiety.',
    weight: 5,
    scenarioAffinity: ['storm-night', 'standard-shift'],
    worsenEvery: 3,
    maxWorsenStages: 1,
    worseningEffects: {
      reputation: -1,
      logs: ['Active event worsened: lobby speculation triggered false rumors.']
    },
    options: [
      {
        id: 'calm-public-brief',
        label: 'Issue calm public briefing to guests',
        preview: '+1 reputation • no direct cost',
        check: { type: 'dispatch', baseSuccess: 0.6 },
        effects: {
          reputation: 1,
          logs: ['Event response: guest briefing prevented panic spread.'],
          stats: { cleanResponses: 1 }
        }
      },
      {
        id: 'stay-silent',
        label: 'Stay silent and wait it out',
        preview: 'No cost • moderate rumor risk',
        effects: {
          logs: ['Event response: desk remained silent while emergency vehicle stayed outside.']
        },
        onFailure: {
          effects: {
            reputation: -2,
            stats: { nightEventsMissed: 1 },
            logs: ['Silence was read as concealment, damaging trust.']
          }
        },
        check: { type: 'dispatch', baseSuccess: 0.45 }
      }
    ]
  },
  {
    id: 'ice-machine-flood-risk',
    title: 'Ice Machine Flood Risk',
    severity: 'low',
    description: 'Overflow warning from the ice machine line near occupied units.',
    weight: 8,
    scenarioAffinity: ['storm-night', 'blackout-strain'],
    worsenEvery: 3,
    maxWorsenStages: 2,
    worseningEffects: {
      money: -5,
      roomConditionDrop: true,
      logs: ['Active event worsened: overflow reached carpet by occupied doors.']
    },
    options: [
      {
        id: 'shut-line-and-mop',
        label: 'Shut line and dispatch cleanup',
        preview: '-$7 • low risk afterward',
        effects: {
          money: -7,
          chainPulse: -1,
          logs: ['Event response: overflow source shut and hallway cleanup completed.']
        }
      },
      {
        id: 'postpone-maintenance',
        label: 'Postpone maintenance until later',
        preview: 'No immediate cost • small worsening chance',
        check: { type: 'utility', baseSuccess: 0.5 },
        effects: {
          logs: ['Event response: maintenance postponed under monitoring.']
        },
        onFailure: {
          effects: {
            money: -8,
            chainPulse: 1,
            stats: { nightEventsMissed: 1 },
            logs: ['Postponed maintenance failed; water spread unexpectedly.']
          }
        }
      }
    ]
  },
  {
    id: 'missing-key-conflict',
    title: 'Missing Key / Wrong Room Conflict',
    severity: 'medium',
    description: 'Two guests claim the same room key access and accuse desk error.',
    weight: 7,
    scenarioAffinity: ['bus-drop-arrival', 'weekend-disturbance'],
    worsenEvery: 2,
    maxWorsenStages: 2,
    worseningEffects: {
      reputation: -1,
      chainPulse: 1,
      logs: ['Active event worsened: key conflict spilled into hallway shouting.']
    },
    options: [
      {
        id: 'reconcile-and-rekey',
        label: 'Reconcile records and re-key both cards',
        preview: '-$6 • +1 reputation • lower chain pressure',
        check: { type: 'investigation', baseSuccess: 0.68 },
        effects: {
          money: -6,
          reputation: 1,
          chainPulse: -1,
          logs: ['Event response: key mismatch reconciled with re-key process.'],
          stats: { cleanResponses: 1 }
        }
      },
      {
        id: 'pick-side-fast',
        label: 'Pick a side quickly to clear the desk',
        preview: '+$4 time gain • high fairness risk',
        effects: {
          money: 4,
          logs: ['Event response: conflict settled quickly without full verification.']
        },
        onFailure: {
          effects: {
            reputation: -2,
            chainPulse: 1,
            stats: { forcedCompromises: 1, nightEventsMissed: 1 },
            logs: ['Quick ruling backfired and reignited the key dispute.']
          }
        },
        check: { type: 'investigation', baseSuccess: 0.43 }
      }
    ]
  },
  {
    id: 'press-inbox-flood',
    title: 'Press / Rumor Inbox Flood',
    severity: 'medium',
    description: 'Dozens of messages hit the desk asking for comment on motel rumors.',
    weight: 5,
    scenarioAffinity: ['inspection-rumor', 'weekend-disturbance'],
    minNight: 2,
    worsenEvery: 2,
    maxWorsenStages: 2,
    worseningEffects: {
      reputation: -1,
      chainPulse: 1,
      logs: ['Active event worsened: rumor traffic overwhelmed desk communication.']
    },
    options: [
      {
        id: 'press-issue-briefing',
        label: 'Issue concise public briefing',
        preview: '-$6 • +1 reputation • reduces panic spread',
        check: { type: 'dispatch', baseSuccess: 0.62 },
        effects: {
          money: -6,
          reputation: 1,
          chainPulse: -1,
          logs: ['Event response: briefing stabilized guest-facing narrative.'],
          stats: { cleanResponses: 1 }
        }
      },
      {
        id: 'press-ignore-cycle',
        label: 'Ignore and keep operations quiet',
        preview: 'No immediate cost • misinformation risk',
        check: { type: 'investigation', baseSuccess: 0.46 },
        effects: {
          logs: ['Event response: desk avoided comment while rumor cycle continued.']
        },
        onFailure: {
          effects: {
            reputation: -2,
            chainPulse: 1,
            stats: { nightEventsMissed: 1 },
            logs: ['Silence was framed as concealment and pressure intensified.']
          }
        }
      }
    ]
  },
  {
    id: 'union-fatigue-warning',
    title: 'Staff Fatigue Warning',
    severity: 'medium',
    description: 'Night staff report unsafe fatigue and ask for reduced response cadence.',
    weight: 5,
    scenarioAffinity: ['standard-shift', 'blackout-strain'],
    minNight: 2,
    worsenEvery: 3,
    maxWorsenStages: 2,
    worseningEffects: {
      chainPulse: 1,
      reputation: -1,
      logs: ['Active event worsened: staff strain reduced response confidence.']
    },
    options: [
      {
        id: 'fatigue-rotate-staff',
        label: 'Rotate duties and lighten patrol load',
        preview: '-$9 • slower coverage • better reliability',
        effects: {
          money: -9,
          chainPulse: -1,
          logs: ['Event response: emergency staff rotation prevented collapse in morale.'],
          stats: { cleanResponses: 1 }
        }
      },
      {
        id: 'fatigue-push-through',
        label: 'Push through and maintain full cadence',
        preview: '+$0 • immediate coverage • burnout risk',
        check: { type: 'dispatch', baseSuccess: 0.5 },
        effects: {
          logs: ['Event response: full cadence maintained despite fatigue signs.']
        },
        onFailure: {
          effects: {
            chainPulse: 2,
            reputation: -1,
            stats: { nightEventsMissed: 1, forcedCompromises: 1 },
            logs: ['Fatigue push failed; response quality dropped under pressure.']
          }
        }
      }
    ]
  },
  {
    id: 'boiler-pressure-rattle',
    title: 'Boiler Pressure Rattle',
    severity: 'high',
    description: 'Utility room pressure warnings indicate possible overnight cascade failure.',
    weight: 4,
    scenarioAffinity: ['storm-night', 'blackout-strain'],
    minNight: 3,
    worsenEvery: 2,
    maxWorsenStages: 2,
    worseningEffects: {
      power: -4,
      chainPulse: 1,
      logs: ['Active event worsened: boiler instability spread into occupied corridors.']
    },
    options: [
      {
        id: 'boiler-hard-isolation',
        label: 'Hard-isolate utility block and bleed pressure',
        preview: '-6% power • good containment odds',
        check: { type: 'utility', baseSuccess: 0.66 },
        effects: {
          power: -6,
          chainPulse: -1,
          logs: ['Event response: boiler pressure stabilized under hard isolation.'],
          stats: { cleanResponses: 1 }
        }
      },
      {
        id: 'boiler-watch-only',
        label: 'Watch gauges and avoid intervention',
        preview: 'No direct cost • high sudden-failure risk',
        check: { type: 'utility', baseSuccess: 0.41 },
        effects: {
          logs: ['Event response: boiler monitored passively to preserve reserves.']
        },
        onFailure: {
          effects: {
            power: -7,
            reputation: -1,
            chainPulse: 2,
            stats: { nightEventsMissed: 1 },
            logs: ['Passive watch failed; utility shock hit multiple zones.']
          }
        }
      }
    ]
  },
  {
    id: 'authority-visibility-walkthrough',
    title: 'Authority Visibility Walkthrough',
    severity: 'medium',
    description: 'Uniformed presence requests a visible walkthrough to calm lot and hallway tension.',
    weight: 4,
    scenarioAffinity: ['weekend-disturbance', 'inspection-rumor'],
    minNight: 3,
    worsenEvery: 3,
    maxWorsenStages: 1,
    worseningEffects: {
      reputation: -1,
      chainPulse: 1,
      logs: ['Active event worsened: visible authority indecision increased uncertainty.']
    },
    options: [
      {
        id: 'authority-guided-walkthrough',
        label: 'Coordinate guided walkthrough with boundaries',
        preview: '+1 reputation • lower outside pressure',
        check: { type: 'dispatch', baseSuccess: 0.63 },
        effects: {
          reputation: 1,
          chainPulse: -1,
          logs: ['Event response: guided walkthrough reduced visible tension.']
        }
      },
      {
        id: 'authority-decline-visibility',
        label: 'Decline visibility and keep internal control',
        preview: 'No cost • risk of perception backlash',
        check: { type: 'investigation', baseSuccess: 0.5 },
        effects: {
          logs: ['Event response: authority visibility request declined.']
        },
        onFailure: {
          effects: {
            reputation: -2,
            chainPulse: 1,
            stats: { nightEventsMissed: 1 },
            logs: ['Declined walkthrough was interpreted as loss of control.']
          }
        }
      }
    ]
  },
  {
    id: 'false-calm-shift',
    title: 'False Calm Window',
    severity: 'low',
    description: 'Everything looks briefly calm, but telemetry suggests hidden pressure movement.',
    weight: 3,
    scenarioAffinity: ['standard-shift', 'inspection-rumor'],
    minNight: 2,
    rare: true,
    worsenEvery: 2,
    maxWorsenStages: 1,
    worseningEffects: {
      chainPulse: 2,
      logs: ['Active event worsened: false calm collapsed into synchronized pressure spikes.']
    },
    options: [
      {
        id: 'false-calm-probe',
        label: 'Probe quietly before declaring all clear',
        preview: '-2% power • better hidden-risk read',
        check: { type: 'investigation', baseSuccess: 0.65 },
        effects: {
          power: -2,
          chainPulse: -1,
          logs: ['Event response: hidden pressure line was caught during calm probe.'],
          stats: { cleanResponses: 1 }
        }
      },
      {
        id: 'false-calm-declare',
        label: 'Declare all clear and reallocate attention',
        preview: '+$4 tempo gain • hidden spike risk',
        check: { type: 'investigation', baseSuccess: 0.4 },
        effects: {
          money: 4,
          logs: ['Event response: shift declared clear and attention shifted elsewhere.']
        },
        onFailure: {
          effects: {
            chainPulse: 2,
            reputation: -1,
            stats: { nightEventsMissed: 1 },
            logs: ['All-clear call backfired when hidden pressure surfaced abruptly.']
          }
        }
      }
    ]
  },
  {
    id: 'vip-corridor-argument',
    title: 'VIP Corridor Argument',
    severity: 'high',
    description: 'A privacy-sensitive guest is arguing with another party outside a monitored room.',
    weight: 3,
    scenarioAffinity: ['inspection-rumor', 'weekend-disturbance'],
    minNight: 3,
    worsenEvery: 2,
    maxWorsenStages: 2,
    worseningEffects: {
      reputation: -1,
      chainPulse: 2,
      logs: ['Active event worsened: corridor argument drew bystanders and camera attention.']
    },
    options: [
      {
        id: 'vip-private-separation',
        label: 'Separate parties into private channels',
        preview: '-$10 • +1 reputation • lower scandal risk',
        check: { type: 'dispatch', baseSuccess: 0.6 },
        effects: {
          money: -10,
          reputation: 1,
          chainPulse: -1,
          logs: ['Event response: corridor dispute separated before public spillover.'],
          stats: { cleanResponses: 1 }
        }
      },
      {
        id: 'vip-forceful-clear',
        label: 'Forcefully clear corridor now',
        preview: '+fast containment • trust backlash risk',
        check: { type: 'dispatch', baseSuccess: 0.52 },
        effects: {
          chainPulse: -1,
          logs: ['Event response: corridor cleared quickly through hardline posture.']
        },
        onFailure: {
          effects: {
            reputation: -2,
            chainPulse: 2,
            stats: { forcedCompromises: 1, nightEventsMissed: 1 },
            logs: ['Forceful corridor clear escalated into wider guest-facing backlash.']
          }
        }
      }
    ]
  },
  {
    id: 'ownership-midnight-call',
    title: 'Ownership Midnight Call',
    severity: 'medium',
    description: 'Ownership requests a live pressure report and immediate correction plan mid-shift.',
    weight: 4,
    scenarioAffinity: ['inspection-rumor', 'standard-shift'],
    minNight: 2,
    worsenEvery: 3,
    maxWorsenStages: 1,
    worseningEffects: {
      reputation: -1,
      logs: ['Active event worsened: delayed ownership response increased oversight strain.']
    },
    options: [
      {
        id: 'ownership-structured-brief',
        label: 'Provide structured report with containment plan',
        preview: '-$3 admin cost • +1 reputation',
        check: { type: 'investigation', baseSuccess: 0.64 },
        effects: {
          money: -3,
          reputation: 1,
          logs: ['Event response: ownership call satisfied by structured control briefing.']
        }
      },
      {
        id: 'ownership-delay-report',
        label: 'Delay until dawn and prioritize operations',
        preview: 'No immediate cost • scrutiny risk',
        effects: {
          logs: ['Event response: ownership report deferred in favor of active operations.']
        },
        check: { type: 'investigation', baseSuccess: 0.45 },
        onFailure: {
          effects: {
            reputation: -2,
            chainPulse: 1,
            stats: { nightEventsMissed: 1 },
            logs: ['Ownership interpreted delay as control drift and tightened oversight.']
          }
        }
      }
    ]
  }
];

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function pickWeighted(list, weightFn) {
  const weighted = list
    .map((entry) => ({ entry, weight: Math.max(0, Number(weightFn(entry) || 0)) }))
    .filter((entry) => entry.weight > 0);
  const total = weighted.reduce((sum, entry) => sum + entry.weight, 0);
  if (!total) return null;
  let roll = Math.random() * total;
  for (let i = 0; i < weighted.length; i += 1) {
    roll -= weighted[i].weight;
    if (roll <= 0) return weighted[i].entry;
  }
  return weighted[weighted.length - 1]?.entry || null;
}

function pressureScore(state) {
  const criticalRooms = (state?.rooms || []).filter((room) => room?.occupiedBy && room?.condition === 'Critical').length;
  const activeCameraEvents = Array.isArray(state?.activeEvents) ? state.activeEvents.length : 0;
  const chainPressure = Array.isArray(state?.storyChains)
    ? state.storyChains.reduce((sum, chain) => sum + Math.max(0, Number(chain?.pressure || 0)), 0)
    : 0;
  return criticalRooms * 1.8 + activeCameraEvents * 1.5 + chainPressure * 0.22;
}

function resolveCheck(option, state) {
  const check = option?.check;
  if (!check) return true;
  const mods = state?.progressionModifiers || {};
  let bonus = 0;
  if (check.type === 'dispatch') {
    bonus += Number(mods.dispatchSuccessBonus || 0);
    bonus += Number(mods.tacticalStabilizeChance || 0) > 0 ? 0.04 : 0;
  }
  if (check.type === 'investigation') {
    bonus += Number(mods.investigationSuccessBonus || 0);
  }
  if (check.type === 'utility') {
    bonus += Number(mods.passiveDrainMult || 1) < 1 ? 0.07 : 0;
  }
  const threshold = clamp01(Number(check.baseSuccess || 0.5) + bonus);
  return Math.random() <= threshold;
}

function normalizeDirector(state) {
  const current = state?.nightEventDirector || {};
  state.nightEventDirector = {
    cooldownTicks: Math.max(0, Number(current.cooldownTicks || 0)),
    recentEventIds: Array.isArray(current.recentEventIds) ? current.recentEventIds.slice(-4) : [],
    nextEligibleMinute: Math.max(10, Number(current.nextEligibleMinute || 24))
  };
}

function pushHistory(state, key, value, limit = 80) {
  if (!state || !value) return;
  const history = state.contentHistory && typeof state.contentHistory === 'object'
    ? state.contentHistory
    : (state.contentHistory = {});
  const list = Array.isArray(history[key]) ? history[key] : [];
  history[key] = list.includes(value)
    ? list.slice(-limit)
    : [...list, value].slice(-limit);
}

function applyBaseEffects(state, effects = {}) {
  state.money = Math.max(0, Number(state.money || 0) + Number(effects.money || 0));
  state.power = Math.max(0, Math.min(100, Number(state.power || 0) + Number(effects.power || 0)));
  state.reputation = Math.max(0, Number(state.reputation || 0) + Number(effects.reputation || 0));
  state.shiftStats.cleanResponses =
    (state.shiftStats.cleanResponses || 0) + Number(effects?.stats?.cleanResponses || 0);
  state.shiftStats.forcedCompromises =
    (state.shiftStats.forcedCompromises || 0) + Number(effects?.stats?.forcedCompromises || 0);
  state.shiftStats.nightEventsMissed =
    (state.shiftStats.nightEventsMissed || 0) + Number(effects?.stats?.nightEventsMissed || 0);
}

function toActiveEvent(template, state) {
  return {
    id: template.id,
    title: template.title,
    severity: template.severity,
    description: template.description,
    options: template.options || [],
    worsenEvery: Math.max(1, Number(template.worsenEvery || 2)),
    maxWorsenStages: Math.max(0, Number(template.maxWorsenStages || 0)),
    worseningEffects: template.worseningEffects || {},
    ageTicks: 0,
    worsenStage: 0,
    startedAtNightMinute: Number(state?.shiftElapsedMinutes || 0)
  };
}

export function normalizeNightEventState(state) {
  normalizeDirector(state);
  state.activeNightEvent = state?.activeNightEvent || null;
  state.nightEventOverlayOpen = Boolean(state?.nightEventOverlayOpen);
  return state;
}

export function closeNightEventOverlay(state) {
  state.nightEventOverlayOpen = false;
}

export function openNightEventOverlay(state) {
  if (!state?.activeNightEvent) return false;
  state.nightEventOverlayOpen = true;
  return true;
}

export function tickNightEvents(state, branchContext = null) {
  normalizeNightEventState(state);
  const payload = { logs: [], alerts: [], effects: [] };

  if (state.nightEventDirector.cooldownTicks > 0) {
    state.nightEventDirector.cooldownTicks -= 1;
  }

  if (state.activeNightEvent) {
    const event = state.activeNightEvent;
    const skipDirectorTimeout = ['police-raid', 'lot-payphone', 'unknown-caller', 'burner-phone', 'hunters'].includes(
      String(event?.id || '')
    );
    event.ageTicks += 1;
    const safeNight = Math.max(1, Number(state?.night || 1));

    const patternShield = Number(state?.progressionModifiers?.unresolvedReturnChanceMult || 1) < 1 ? 0.75 : 1;
    const worsenShield =
      safeNight <= 1 ? 0.45
        : safeNight === 2 ? 0.58
          : safeNight === 3 ? 0.72
            : safeNight === 4 ? 0.82
              : 0.9;
    const shouldWorsen =
      !skipDirectorTimeout &&
      event.worsenStage < event.maxWorsenStages &&
      event.ageTicks > 0 &&
      event.ageTicks % event.worsenEvery === 0 &&
      Math.random() <= 0.8 * patternShield * worsenShield;

    if (shouldWorsen) {
      event.worsenStage += 1;
      applyBaseEffects(state, event.worseningEffects || {});
      state.shiftStats.nightEventsMissed = (state.shiftStats.nightEventsMissed || 0) + 1;
      payload.logs.push(...(event.worseningEffects?.logs || []));
      payload.effects.push(event.worseningEffects || {});
      payload.alerts.push(`${event.title} worsened under delay.`);
    }

    const timeoutTicks =
      6 +
      Math.max(0, event.maxWorsenStages - event.worsenStage) +
      (safeNight <= 2 ? 1 : 0);
    if (!skipDirectorTimeout && event.ageTicks >= timeoutTicks) {
      state.shiftStats.nightEventsMissed = (state.shiftStats.nightEventsMissed || 0) + 1;
      payload.logs.push(`Active event timed out unresolved: ${event.title}.`);
      payload.alerts.push(`${event.title} caused unresolved shift pressure.`);
      state.activeNightEvent = null;
      state.nightEventOverlayOpen = false;
      state.nightEventDirector.cooldownTicks = 4;
    }

    return payload;
  }

  const minute = Number(state?.shiftElapsedMinutes || 0);
  if (minute < state.nightEventDirector.nextEligibleMinute) {
    return payload;
  }
  if (state.nightEventDirector.cooldownTicks > 0) {
    return payload;
  }

  const scenarioKey = String(state?.activeScenario?.key || 'standard-shift');
  const pressure = pressureScore(state);
  const night = Math.max(1, Number(state?.night || 1));
  let triggerChance = 0.09 + Math.min(0.16, pressure * 0.012) + Math.min(0.09, night * 0.011);
  triggerChance += Number(state?.narrativeBias?.eventTriggerBonus || 0);
  triggerChance += Number(branchContext?.eventChanceBonus || 0);
  if (scenarioKey === 'weekend-disturbance') triggerChance += 0.05;
  if (scenarioKey === 'storm-night') triggerChance += 0.03;
  if (minute < 35 && night <= 2) triggerChance *= 0.55;
  else if (minute < 35 && night === 3) triggerChance *= 0.78;
  if (night <= 2) triggerChance *= 0.88;
  if (night >= 4) triggerChance *= 1.06;
  triggerChance = clamp01(Math.min(0.46, triggerChance));

  if (Math.random() > triggerChance) {
    return payload;
  }

  const recent = state.nightEventDirector.recentEventIds || [];
  const safeNight = Math.max(1, Number(state?.night || 1));
  const history = state?.contentHistory || {};
  const seenIds = Array.isArray(history.seenNightEventIds) ? history.seenNightEventIds : [];
  const isFinalePressure = Boolean(state?.finaleDirector?.active) || safeNight >= Math.max(4, Number(state?.campaign?.length || 5));
  const event = pickWeighted(NIGHT_EVENTS, (template) => {
    if (template.minNight && safeNight < Number(template.minNight || 1)) return 0;
    if (template.maxNight && safeNight > Number(template.maxNight || 99)) return 0;
    let weight = Number(template.weight || 1);
    if (Array.isArray(template.scenarioAffinity) && template.scenarioAffinity.includes(scenarioKey)) {
      weight += 2;
    }
    if (recent.includes(template.id)) {
      weight *= Number(state?.progressionModifiers?.unresolvedReturnChanceMult || 1) < 1 ? 0.22 : 0.38;
    }
    if (Array.isArray(state?.contentHistory?.recentNightEventIds) && state.contentHistory.recentNightEventIds.includes(template.id)) {
      weight *= 0.4;
    }
    if (!seenIds.includes(template.id)) {
      weight += 1.2;
    } else {
      weight *= 0.85;
    }
    if (template.rare) {
      weight *= isFinalePressure ? 0.8 : 0.5;
    }
    weight = applyTagWeighting(
      weight,
      getNightEventTags(template.id),
      branchContext?.tagWeights || {},
      branchContext?.suppressedTags || {}
    );
    return weight;
  });

  if (!event) return payload;

  state.activeNightEvent = toActiveEvent(event, state);
  if (event.rare) {
    pushHistory(state, 'rareMomentsSeen', `event:${event.id}`, 80);
  }
  state.nightEventOverlayOpen = false;
  state.nightEventDirector.recentEventIds = [...recent, event.id].slice(-4);
  state.nightEventDirector.cooldownTicks = 5;
  state.nightEventDirector.nextEligibleMinute = minute + 18;
  payload.logs.push(`Shift event triggered: ${event.title}.`);
  payload.alerts.push(`Active Event: ${event.title}`);
  return payload;
}

export function resolveNightEventChoice(state, optionId) {
  normalizeNightEventState(state);
  const active = state.activeNightEvent;
  if (!active) return { ok: false, reason: 'No active event.' };
  const option = (active.options || []).find((entry) => entry.id === optionId);
  if (!option) return { ok: false, reason: 'Unknown event option.' };

  const success = resolveCheck(option, state);
  const effects = success ? option.effects || {} : (option.onFailure?.effects || option.effects || {});
  applyBaseEffects(state, effects);

  state.shiftStats.nightEventsResolved = (state.shiftStats.nightEventsResolved || 0) + 1;
  state.activeNightEvent = null;
  state.nightEventOverlayOpen = false;
  state.nightEventDirector.cooldownTicks = 4;

  return {
    ok: true,
    success,
    effects,
    logs: effects.logs || [],
    alerts: effects.alerts || []
  };
}
