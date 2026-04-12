import { getSpecialEncounterTags, applyTagWeighting } from './branchingCatalog.js';

const SPECIAL_ENCOUNTERS = [
  {
    id: 'insurance-investigator',
    title: 'Insurance Investigator',
    badgeLabel: 'SPECIAL',
    clue: 'Keeps checking exit routes and asking for prior incident logs.',
    deepClue: 'Carries a claims folder and probes for inconsistencies in room condition statements.',
    description:
      'An investigator claims they are verifying a prior claim tied to the property and wants to stay where damage was reported.',
    weight: 5,
    scenarioAffinity: ['inspection-rumor'],
    policyBias: 'Watch',
    options: [
      {
        id: 'verify-and-document',
        label: 'Verify credentials and document every request',
        preview: '-2% power • +1 reputation • lower desk uncertainty',
        effects: {
          power: -2,
          reputation: 1,
          riskDelta: -1,
          forceFlag: true,
          logs: ['Special encounter: investigator credentials verified and logged.'],
          alerts: ['Investigator admitted under monitored access.'],
          stats: { cleanResponses: 1 }
        }
      },
      {
        id: 'fast-track',
        label: 'Fast-track check-in to avoid friction',
        preview: '+$10 • policy pressure ↑ • possible reputation hit',
        effects: {
          money: 10,
          policyRecommendation: 'Watch',
          riskDelta: 1,
          logs: ['Special encounter: investigator was rushed through check-in procedures.']
        },
        check: { type: 'investigation', baseSuccess: 0.56 },
        onFailure: {
          effects: {
            reputation: -2,
            incidentBias: 1,
            logs: ['Investigator noted procedural gaps and filed a concerning note.'],
            alerts: ['Documentation discrepancy increased oversight pressure.'],
            stats: { forcedCompromises: 1 }
          }
        }
      }
    ]
  },
  {
    id: 'long-haul-driver',
    title: 'Exhausted Long-Haul Driver',
    badgeLabel: 'SPECIAL',
    clue: 'Hands are shaking; asks for the quietest corner room.',
    deepClue: 'Microsleeps at the desk and keeps losing train of thought mid-sentence.',
    description:
      'A highway driver is near collapse and insists they cannot continue driving. They are polite, but unstable from fatigue.',
    weight: 8,
    scenarioAffinity: ['storm-night', 'bus-drop-arrival'],
    policyBias: 'Approve',
    options: [
      {
        id: 'quiet-room-and-note',
        label: 'Assign quiet room and notify rounds for welfare check',
        preview: '-$5 • +1 reputation • reduced risk',
        effects: {
          money: -5,
          reputation: 1,
          riskDelta: -1,
          roomConditionOnCheckIn: 'Watch',
          logs: ['Special encounter: fatigued driver placed under low-disturbance watch.'],
          stats: { cleanResponses: 1 }
        }
      },
      {
        id: 'reject-for-liability',
        label: 'Reject due to liability concerns',
        preview: '-1 reputation • incident pressure risk',
        effects: {
          reputation: -1,
          incidentBias: 1,
          logs: ['Special encounter: fatigued traveler turned away over liability concerns.'],
          stats: { forcedCompromises: 1 }
        }
      }
    ]
  },
  {
    id: 'off-duty-officer',
    title: 'Off-Duty Officer',
    badgeLabel: 'SPECIAL',
    clue: 'Watches everyone entering the lobby and asks about recent disturbances.',
    deepClue: 'Requests a room facing parking lot sightlines and asks if any units are currently flagged.',
    description:
      'An off-duty officer asks for privacy but makes clear they may intervene if they hear a disturbance.',
    weight: 6,
    scenarioAffinity: ['weekend-disturbance', 'inspection-rumor'],
    policyBias: 'Watch',
    options: [
      {
        id: 'cooperate-discreetly',
        label: 'Cooperate discreetly with boundaries',
        preview: '+1 reputation • risk down • desk flagged',
        effects: {
          reputation: 1,
          riskDelta: -1,
          forceFlag: true,
          logs: ['Special encounter: off-duty officer coordinated under discreet desk protocol.']
        }
      },
      {
        id: 'keep-distance',
        label: 'Keep strict distance from any cooperation',
        preview: '+$5 • potential escalation if conflict appears',
        effects: {
          money: 5,
          riskDelta: 1,
          chainBias: 1,
          logs: ['Special encounter: off-duty officer received minimal cooperation at the desk.']
        }
      }
    ]
  },
  {
    id: 'missing-reservation',
    title: 'Missing Reservation Guest',
    badgeLabel: 'SPECIAL',
    clue: 'Shows a confirmation number that does not match your system.',
    deepClue: 'Timestamp appears legitimate, but issuer domain looks recently spoofed.',
    description:
      'A guest insists they prepaid online, but no booking appears in system records.',
    weight: 9,
    scenarioAffinity: ['bus-drop-arrival', 'standard-shift'],
    policyBias: 'Watch',
    options: [
      {
        id: 'manual-verify',
        label: 'Run manual verification and temporary hold',
        preview: '-$8 • +1 reputation • lower fraud risk',
        effects: {
          money: -8,
          reputation: 1,
          riskDelta: -1,
          forceFlag: true,
          logs: ['Special encounter: reservation discrepancy entered manual verification queue.']
        },
        check: { type: 'investigation', baseSuccess: 0.64 },
        onFailure: {
          effects: {
            power: -2,
            incidentBias: 1,
            logs: ['Manual verification failed cleanly; desk tension increased.']
          }
        }
      },
      {
        id: 'honor-rate',
        label: 'Honor booking at reduced emergency rate',
        preview: '-$10 • goodwill up • policy pressure',
        effects: {
          money: -10,
          reputation: 2,
          policyRecommendation: 'Watch',
          logs: ['Special encounter: missing reservation honored at emergency desk rate.'],
          stats: { forcedCompromises: 1 }
        }
      },
      {
        id: 'deny-immediately',
        label: 'Deny immediately and refer to booking platform',
        preview: '+$0 • reputation risk • possible agitation',
        effects: {
          reputation: -2,
          incidentBias: 1,
          logs: ['Special encounter: reservation dispute denied at desk.']
        }
      }
    ]
  },
  {
    id: 'local-agitator',
    title: 'Local Agitator',
    badgeLabel: 'SPECIAL',
    clue: 'Keeps fishing for room numbers and who is staying tonight.',
    deepClue: 'Asks leading questions about specific vehicles in the lot.',
    description:
      'A local arrival appears less interested in a room than in who else is on-site.',
    weight: 5,
    scenarioAffinity: ['weekend-disturbance'],
    policyBias: 'Deny',
    options: [
      {
        id: 'firm-policy-boundary',
        label: 'Set firm privacy boundary and require ID hold',
        preview: '+1 reputation • risk down • flagged',
        effects: {
          reputation: 1,
          riskDelta: -1,
          forceFlag: true,
          policyRecommendation: 'Deny',
          logs: ['Special encounter: local agitator constrained under privacy-first protocol.'],
          stats: { cleanResponses: 1 }
        }
      },
      {
        id: 'appease-with-room',
        label: 'Appease with quick room assignment',
        preview: '+$12 • chain pressure risk ↑',
        effects: {
          money: 12,
          riskDelta: 1,
          chainBias: 2,
          incidentBias: 1,
          logs: ['Special encounter: agitator granted a room despite warning signals.'],
          stats: { forcedCompromises: 1 }
        }
      }
    ]
  },
  {
    id: 'vip-privacy',
    title: 'VIP Privacy Guest',
    badgeLabel: 'SPECIAL',
    clue: 'Arrives with tinted vehicle and requests no name in visible logbooks.',
    deepClue: 'Manager hotline confirms value but warns of severe backlash if leaked.',
    description:
      'A high-value guest offers premium cash for strict privacy arrangements and minimal staff contact.',
    weight: 4,
    scenarioAffinity: ['inspection-rumor', 'standard-shift'],
    policyBias: 'Watch',
    options: [
      {
        id: 'privacy-protocol',
        label: 'Apply strict privacy protocol and controlled access',
        preview: '+$18 • -3% power • +1 reputation',
        effects: {
          money: 18,
          power: -3,
          reputation: 1,
          forceFlag: true,
          roomConditionOnCheckIn: 'Watch',
          logs: ['Special encounter: VIP privacy protocol activated with limited staff corridor access.']
        }
      },
      {
        id: 'decline-special-treatment',
        label: 'Decline special treatment and keep normal process',
        preview: '-$10 opportunity • lower systemic risk',
        effects: {
          money: -10,
          riskDelta: -1,
          logs: ['Special encounter: VIP request denied; standard process maintained.']
        }
      }
    ]
  },
  {
    id: 'injured-traveler',
    title: 'Injured Traveler',
    badgeLabel: 'SPECIAL',
    clue: 'Bandaged shoulder, refuses ambulance, asks for first-floor room.',
    deepClue: 'Injury appears old but reopened; stress spikes when asked about police reports.',
    description:
      'A traveler with visible injury requests minimal questions and immediate check-in.',
    weight: 7,
    scenarioAffinity: ['storm-night', 'blackout-strain'],
    policyBias: 'Watch',
    options: [
      {
        id: 'medical-welfare-check',
        label: 'Offer first aid call and welfare notation',
        preview: '-$6 • +2 reputation • lower incident risk',
        effects: {
          money: -6,
          reputation: 2,
          riskDelta: -1,
          forceFlag: true,
          roomConditionOnCheckIn: 'Watch',
          logs: ['Special encounter: injured traveler accepted with welfare notation and staff watch.'],
          stats: { cleanResponses: 1 }
        }
      },
      {
        id: 'no-questions-cash',
        label: 'Accept cash and avoid questions',
        preview: '+$15 • reputation risk • higher follow-up pressure',
        effects: {
          money: 15,
          reputation: -1,
          chainBias: 1,
          incidentBias: 1,
          logs: ['Special encounter: injured guest accepted under no-questions cash arrangement.'],
          stats: { forcedCompromises: 1 }
        }
      }
    ]
  },
  {
    id: 'paranoid-prepper',
    title: 'Paranoid Prepper',
    badgeLabel: 'SPECIAL',
    clue: 'Asks about camera blind spots and emergency exits before price.',
    deepClue: 'Insists on top-floor line-of-sight and asks if utility outages are frequent.',
    description:
      'A suspicious guest appears prepared for confrontation and reacts strongly to uncertainty.',
    weight: 6,
    scenarioAffinity: ['blackout-strain', 'storm-night'],
    policyBias: 'Watch',
    options: [
      {
        id: 'de-escalate-briefing',
        label: 'Give calm security briefing and set strict quiet rules',
        preview: '-2% power • risk down • reputation +1',
        effects: {
          power: -2,
          reputation: 1,
          riskDelta: -1,
          forceFlag: true,
          logs: ['Special encounter: prepper guest de-escalated through structured security briefing.']
        }
      },
      {
        id: 'challenge-demands',
        label: 'Challenge demands and enforce normal process',
        preview: 'No cost • chance to escalate hostility',
        effects: {
          riskDelta: 1,
          logs: ['Special encounter: prepper demands were denied at the desk.']
        },
        check: { type: 'dispatch', baseSuccess: 0.52 },
        onFailure: {
          effects: {
            reputation: -2,
            incidentBias: 2,
            alerts: ['Confrontational guest posture increased incident pressure.'],
            stats: { forcedCompromises: 1 }
          }
        }
      }
    ]
  },
  {
    id: 'county-health-auditor',
    title: 'County Health Auditor',
    badgeLabel: 'SPECIAL',
    clue: 'Presents a temporary badge, asks if complaints were logged under other names.',
    deepClue: 'References rumors already circulating online and asks for utility maintenance timestamps.',
    description:
      'A county auditor requests a room and claims to be "observing operations in live conditions" for a dawn report.',
    weight: 4,
    scenarioAffinity: ['inspection-rumor', 'blackout-strain'],
    policyBias: 'Watch',
    minNight: 2,
    options: [
      {
        id: 'audit-controlled-escort',
        label: 'Allow under controlled escort and documentation',
        preview: '-3% power • +1 reputation • oversight softened',
        effects: {
          power: -3,
          reputation: 1,
          riskDelta: -1,
          forceFlag: true,
          logs: ['Special encounter: county auditor routed under escorted audit protocol.'],
          stats: { cleanResponses: 1 }
        }
      },
      {
        id: 'audit-limit-access',
        label: 'Limit access to public areas only',
        preview: '+$6 • chance of backlash note',
        check: { type: 'investigation', baseSuccess: 0.55 },
        effects: {
          money: 6,
          logs: ['Special encounter: auditor access narrowed to public-facing records.']
        },
        onFailure: {
          effects: {
            reputation: -2,
            chainBias: 1,
            incidentBias: 1,
            logs: ['Auditor filed a pointed note about restricted cooperation.'],
            alerts: ['Oversight pressure increased after audit friction.'],
            stats: { forcedCompromises: 1 }
          }
        }
      }
    ]
  },
  {
    id: 'corporate-compliance-rep',
    title: 'Corporate Compliance Rep',
    badgeLabel: 'SPECIAL',
    clue: 'Asks for your shift notes before asking for a room key.',
    deepClue: 'Mentions ownership dissatisfaction with "creative handling" in prior closes.',
    description:
      'A corporate compliance representative arrives unannounced and asks to "experience process integrity firsthand."',
    weight: 4,
    scenarioAffinity: ['inspection-rumor', 'standard-shift'],
    policyBias: 'Watch',
    minNight: 3,
    options: [
      {
        id: 'compliance-open-books',
        label: 'Provide clean logs and formal desk process',
        preview: '-$5 • +1 reputation • lower risk',
        effects: {
          money: -5,
          reputation: 1,
          riskDelta: -1,
          forceFlag: true,
          logs: ['Special encounter: compliance rep briefed through formal desk workflow.']
        }
      },
      {
        id: 'compliance-quiet-arrangement',
        label: 'Offer quiet arrangement and skip detail',
        preview: '+$16 • ownership backlash risk',
        check: { type: 'investigation', baseSuccess: 0.47 },
        effects: {
          money: 16,
          reputation: -1,
          logs: ['Special encounter: compliance rep accepted a quiet off-ledger accommodation.'],
          stats: { forcedCompromises: 1 }
        },
        onFailure: {
          effects: {
            reputation: -2,
            incidentBias: 1,
            chainBias: 1,
            logs: ['Quiet arrangement was treated as procedural drift and escalated.'],
            alerts: ['Ownership-adjacent pressure worsened after compliance conflict.'],
            stats: { forcedCompromises: 1 }
          }
        }
      }
    ]
  },
  {
    id: 'quiet-protection-ask',
    title: 'Quiet Protection Ask',
    badgeLabel: 'SPECIAL',
    clue: 'Requests a room away from lot cameras and asks if names are ever shared.',
    deepClue: 'Has no luggage, offers cash upfront, and checks exits repeatedly.',
    description:
      'A desperate guest claims they are being followed and asks for one hidden night with no paper trail attention.',
    weight: 5,
    scenarioAffinity: ['weekend-disturbance', 'storm-night'],
    policyBias: 'Watch',
    minNight: 2,
    options: [
      {
        id: 'protection-monitored-checkin',
        label: 'Admit with monitored quiet protocol',
        preview: '-$8 • +2 reputation • moderate chain risk',
        effects: {
          money: -8,
          reputation: 2,
          riskDelta: -1,
          forceFlag: true,
          roomConditionOnCheckIn: 'Watch',
          chainBias: 1,
          logs: ['Special encounter: vulnerable guest admitted under quiet-protection watch.'],
          stats: { cleanResponses: 1 }
        }
      },
      {
        id: 'protection-refuse-liability',
        label: 'Refuse and direct to authorities',
        preview: '+$0 • authority alignment • guest trust risk',
        effects: {
          reputation: -1,
          incidentBias: 1,
          logs: ['Special encounter: protection request denied and redirected to authorities.']
        }
      }
    ]
  },
  {
    id: 'rumor-podcaster',
    title: 'After-Hours Rumor Podcaster',
    badgeLabel: 'SPECIAL',
    clue: 'Claims to be "just passing through" while recording voice notes in the lobby.',
    deepClue: 'Knows specific room numbers tied to prior incidents and asks loaded yes/no questions.',
    description:
      'A local rumor podcaster checks in and seems more interested in content than sleep.',
    weight: 4,
    scenarioAffinity: ['weekend-disturbance', 'inspection-rumor'],
    policyBias: 'Watch',
    minNight: 2,
    options: [
      {
        id: 'podcaster-boundary-brief',
        label: 'Set strict media boundary terms at check-in',
        preview: '+1 reputation • lower rumor spread chance',
        effects: {
          reputation: 1,
          riskDelta: -1,
          forceFlag: true,
          logs: ['Special encounter: rumor podcaster admitted under strict recording boundaries.']
        }
      },
      {
        id: 'podcaster-incentivize-silence',
        label: 'Offer discount for silence and quick check-in',
        preview: '-$10 • chance to suppress rumors',
        check: { type: 'investigation', baseSuccess: 0.49 },
        effects: {
          money: -10,
          logs: ['Special encounter: podcaster accepted a quiet-stay incentive.']
        },
        onFailure: {
          effects: {
            reputation: -2,
            incidentBias: 1,
            logs: ['Incentive attempt leaked and intensified rumor pressure.'],
            alerts: ['Rumor pressure spike: guest-facing narrative worsened.'],
            stats: { forcedCompromises: 1 }
          }
        }
      }
    ]
  },
  {
    id: 'deputy-cousin-local',
    title: 'Deputy’s Cousin (Local)',
    badgeLabel: 'SPECIAL',
    clue: 'Name-drops authority contacts and asks for “normal courtesy” beyond policy.',
    deepClue: 'Pushes for lot view room and asks whether locals were removed recently.',
    description:
      'A local guest claims family ties to county deputies and expects preferential handling.',
    weight: 4,
    scenarioAffinity: ['weekend-disturbance', 'standard-shift'],
    policyBias: 'Watch',
    minNight: 2,
    options: [
      {
        id: 'deputy-courtesy-with-logs',
        label: 'Offer basic courtesy, but keep full logs',
        preview: '+1 reputation • mild authority goodwill',
        effects: {
          reputation: 1,
          riskDelta: -1,
          forceFlag: true,
          logs: ['Special encounter: local authority-adjacent guest handled with documented courtesy.']
        }
      },
      {
        id: 'deputy-special-favor',
        label: 'Grant broad favor to avoid friction',
        preview: '+$12 • local retaliation risk later',
        effects: {
          money: 12,
          chainBias: 1,
          incidentBias: 1,
          logs: ['Special encounter: broad favor granted under authority-adjacent pressure.'],
          stats: { forcedCompromises: 1 }
        }
      }
    ]
  },
  {
    id: 'finale-clean-fixer',
    title: 'Clean Fixer Offer',
    badgeLabel: 'RARE',
    clue: 'Arrives late, offers to quietly settle a brewing dispute if allowed one night free of questions.',
    deepClue: 'Knows the names from your most active thread and asks for exactly one corridor key route.',
    description:
      'A morally gray fixer offers a rare clean resolution to a known thread — if you accept a discreet arrangement.',
    weight: 2,
    scenarioAffinity: ['inspection-rumor', 'weekend-disturbance'],
    policyBias: 'Watch',
    minNight: 4,
    rare: true,
    finaleSensitive: true,
    options: [
      {
        id: 'fixer-accept-quiet',
        label: 'Accept discreet deal and monitor tightly',
        preview: '+2 reputation • -$6 • rare clean thread relief',
        check: { type: 'investigation', baseSuccess: 0.58 },
        effects: {
          reputation: 2,
          money: -6,
          riskDelta: -1,
          forceFlag: true,
          logs: ['Special encounter: fixer arrangement produced a rare clean de-escalation window.'],
          alerts: ['Signature moment: a volatile thread cooled unexpectedly.'],
          stats: { cleanResponses: 1 }
        },
        onFailure: {
          effects: {
            reputation: -2,
            chainBias: 2,
            incidentBias: 1,
            logs: ['Fixer deal collapsed into competing pressure claims.'],
            alerts: ['Signature moment failed: pressure rebounded harder.'],
            stats: { forcedCompromises: 1 }
          }
        }
      },
      {
        id: 'fixer-refuse-clean',
        label: 'Refuse and preserve formal process',
        preview: '+policy integrity • no immediate gain',
        effects: {
          riskDelta: -1,
          logs: ['Special encounter: fixer offer refused; formal process maintained.']
        }
      }
    ]
  }
];

const DEFAULT_SPECIAL_DIRECTOR = Object.freeze({
  recentEncounterIds: []
});

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function normalizeRiskLevel(value = 'Low') {
  const level = String(value || 'Low').toLowerCase();
  if (level === 'high') return 'High';
  if (level === 'medium') return 'Medium';
  return 'Low';
}

function shiftRisk(riskLevel = 'Low', delta = 0) {
  const ladder = ['Low', 'Medium', 'High'];
  const start = ladder.indexOf(normalizeRiskLevel(riskLevel));
  const next = Math.max(0, Math.min(ladder.length - 1, start + Number(delta || 0)));
  return ladder[next];
}

function derivePressureScore(state) {
  const criticalRooms = (state?.rooms || []).filter((room) => room?.occupiedBy && room?.condition === 'Critical').length;
  const watchRooms = (state?.rooms || []).filter((room) => room?.occupiedBy && room?.condition === 'Watch').length;
  const chainPressure = Array.isArray(state?.storyChains)
    ? state.storyChains.reduce((sum, chain) => sum + Math.max(0, Number(chain?.pressure || 0)), 0)
    : 0;
  return criticalRooms * 2 + watchRooms * 0.75 + chainPressure * 0.18;
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

function getScenarioKey(state) {
  return String(state?.activeScenario?.key || 'standard-shift');
}

function resolveCheck(option, state) {
  const check = option?.check;
  if (!check) return true;

  let bonus = 0;
  const mods = state?.progressionModifiers || {};
  if (check.type === 'investigation') {
    bonus += Number(mods.investigationSuccessBonus || 0);
  }
  if (check.type === 'dispatch') {
    bonus += Number(mods.dispatchSuccessBonus || 0);
  }
  if (check.type === 'utility' && Number(mods.passiveDrainMult || 1) < 1) {
    bonus += 0.07;
  }
  if (Number(mods.tacticalStabilizeChance || 0) > 0 && check.type === 'dispatch') {
    bonus += 0.04;
  }

  const threshold = clamp01(Number(check.baseSuccess || 0.5) + bonus);
  return Math.random() <= threshold;
}

function normalizeSpecialDirector(state) {
  const current = state?.specialEncounterDirector || DEFAULT_SPECIAL_DIRECTOR;
  const recent = Array.isArray(current.recentEncounterIds)
    ? current.recentEncounterIds.filter(Boolean).slice(-4)
    : [];
  state.specialEncounterDirector = {
    recentEncounterIds: recent
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

function applyEffectBlock(guest, effects = {}) {
  if (effects.riskDelta) {
    guest.riskLevel = shiftRisk(guest.riskLevel || guest.risk || 'Low', effects.riskDelta);
    guest.risk = guest.riskLevel;
  }
  if (effects.forceFlag) {
    guest.flagged = true;
  }
  if (effects.policyRecommendation) {
    guest.policyRecommendation = effects.policyRecommendation;
  }
  if (effects.roomConditionOnCheckIn) {
    guest.specialRoomCondition = effects.roomConditionOnCheckIn;
  }
  if (typeof effects.chainBias === 'number') {
    guest.chainBias = Number(guest.chainBias || 0) + effects.chainBias;
  }
  if (typeof effects.incidentBias === 'number') {
    guest.incidentBias = Number(guest.incidentBias || 0) + effects.incidentBias;
  }
}

export function normalizeSpecialEncounterState(state) {
  normalizeSpecialDirector(state);
  state.activeSpecialEncounterGuestId =
    typeof state?.activeSpecialEncounterGuestId === 'number' ? state.activeSpecialEncounterGuestId : null;
  return state;
}

export function maybeAssignSpecialEncounterToGuest(guest, state, branchContext = null) {
  if (!guest || guest?.specialEncounter?.id) return guest;
  normalizeSpecialDirector(state);

  const pressure = derivePressureScore(state);
  const night = Math.max(1, Number(state?.night || 1));
  const scenarioKey = getScenarioKey(state);
  const safeNight = Math.max(1, Number(state?.night || 1));
  const isFinaleSensitiveNight = Boolean(state?.finaleDirector?.active) || safeNight >= Math.max(4, Number(state?.campaign?.length || 5));
  let chance = 0.11 + night * 0.012 + Math.min(0.15, pressure * 0.01);
  if (night === 1) chance *= 0.74;
  else if (night === 2) chance *= 0.88;
  else if (night >= 4) chance *= 1.06;
  if (scenarioKey === 'inspection-rumor') chance += 0.05;
  if (scenarioKey === 'weekend-disturbance') chance += 0.04;
  if (isFinaleSensitiveNight) chance += 0.03;
  if ((guest.riskLevel || guest.risk) === 'High') chance += 0.05;
  chance += Number(branchContext?.specialEncounterChanceBonus || 0);
  chance = clamp01(Math.min(0.45, chance));

  if (Math.random() > chance) return guest;

  const recent = state.specialEncounterDirector.recentEncounterIds || [];
  const history = state?.contentHistory || {};
  const seenIds = Array.isArray(history.seenSpecialEncounterIds) ? history.seenSpecialEncounterIds : [];
  const signals = branchContext?.signals || {};
  const doctrine = state?.doctrine?.tendencies || {};
  const factions = state?.factions || {};
  const selected = pickWeighted(SPECIAL_ENCOUNTERS, (template) => {
    if (template.minNight && safeNight < Number(template.minNight || 1)) return 0;
    if (template.maxNight && safeNight > Number(template.maxNight || 99)) return 0;
    let weight = Number(template.weight || 1);
    if (Array.isArray(template.scenarioAffinity) && template.scenarioAffinity.includes(scenarioKey)) {
      weight += 2.5;
    }
    if (template.policyBias && template.policyBias === guest.policyRecommendation) {
      weight += 0.8;
    }
    if (template.finaleSensitive && isFinaleSensitiveNight) {
      weight += 1.8;
    }
    if (template.rare) {
      weight *= safeNight >= 4 ? 0.7 : 0.35;
      if (isFinaleSensitiveNight) weight += 0.5;
    }
    if (template.id === 'county-health-auditor' && Number(signals.ownershipScrutiny || 0) >= 6) {
      weight += 1.6;
    }
    if (template.id === 'quiet-protection-ask' && Number(doctrine.compassion || 0) >= 5) {
      weight += 1.2;
    }
    if (template.id === 'deputy-cousin-local' && Number(factions.authorities || 0) >= 3) {
      weight += 1.2;
    }
    if (template.id === 'corporate-compliance-rep' && Number(factions.ownership || 0) <= -3) {
      weight += 1.3;
    }
    if (template.id === 'rumor-podcaster' && Number(signals.guestDistrust || 0) >= 6) {
      weight += 1.2;
    }
    if (recent.includes(template.id)) {
      weight *= Number(state?.progressionModifiers?.unresolvedReturnChanceMult || 1) < 1 ? 0.25 : 0.4;
    }
    if (Array.isArray(state?.contentHistory?.recentSpecialEncounterIds) && state.contentHistory.recentSpecialEncounterIds.includes(template.id)) {
      weight *= 0.45;
    }
    if (!seenIds.includes(template.id)) {
      weight += 1.25;
    } else {
      weight *= 0.82;
    }
    weight = applyTagWeighting(
      weight,
      getSpecialEncounterTags(template.id),
      branchContext?.tagWeights || {},
      branchContext?.suppressedTags || {}
    );
    return weight;
  });

  if (!selected) return guest;

  const clueBoost = Boolean(state?.progressionModifiers?.frontDeskClueReveal);
  const clue = clueBoost && selected.deepClue
    ? `${selected.clue} ${selected.deepClue}`
    : selected.clue;

  state.specialEncounterDirector.recentEncounterIds = [...recent, selected.id].slice(-4);
  if (selected.rare) {
    pushHistory(state, 'rareMomentsSeen', `special:${selected.id}`, 80);
  }

  return {
    ...guest,
    specialEncounter: {
      id: selected.id,
      title: selected.title,
      badgeLabel: selected.badgeLabel || 'SPECIAL',
      clue,
      description: selected.description,
      preview: selected.preview || selected.options?.[0]?.preview || '',
      options: selected.options,
      resolved: false
    }
  };
}

export function openSpecialEncounterForGuest(state, guestId) {
  const guest = (state?.guests || []).find((entry) => entry.id === guestId);
  if (!guest?.specialEncounter || guest.specialEncounter.resolved) return false;
  state.activeSpecialEncounterGuestId = guestId;
  return true;
}

export function closeSpecialEncounter(state) {
  state.activeSpecialEncounterGuestId = null;
}

export function resolveSpecialEncounterChoice(state, guestId, optionId) {
  const guest = (state?.guests || []).find((entry) => entry.id === guestId);
  const encounter = guest?.specialEncounter;
  if (!guest || !encounter || encounter.resolved) {
    return { ok: false, reason: 'Special encounter unavailable.' };
  }

  const option = (encounter.options || []).find((entry) => entry.id === optionId);
  if (!option) {
    return { ok: false, reason: 'Unknown response option.' };
  }

  const success = resolveCheck(option, state);
  const chosenEffects = success ? option.effects || {} : (option.onFailure?.effects || option.effects || {});

  applyEffectBlock(guest, chosenEffects);

  state.money = Math.max(0, Number(state.money || 0) + Number(chosenEffects.money || 0));
  state.power = Math.max(0, Math.min(100, Number(state.power || 0) + Number(chosenEffects.power || 0)));
  state.reputation = Math.max(0, Number(state.reputation || 0) + Number(chosenEffects.reputation || 0));

  guest.specialEncounter = {
    ...encounter,
    resolved: true,
    resolvedOptionId: option.id,
    resolvedAs: success ? 'success' : 'failure'
  };

  state.shiftStats.specialGuestsHandled = (state.shiftStats.specialGuestsHandled || 0) + 1;
  state.shiftStats.cleanResponses =
    (state.shiftStats.cleanResponses || 0) + Number(chosenEffects?.stats?.cleanResponses || 0);
  state.shiftStats.forcedCompromises =
    (state.shiftStats.forcedCompromises || 0) + Number(chosenEffects?.stats?.forcedCompromises || 0);

  return {
    ok: true,
    success,
    logs: chosenEffects.logs || [],
    alerts: chosenEffects.alerts || []
  };
}

export function recordSpecialEncounterMiss(state, guest) {
  if (!guest?.specialEncounter || guest.specialEncounter.resolved) return;
  guest.specialEncounter = {
    ...guest.specialEncounter,
    resolved: true,
    resolvedAs: 'missed'
  };
  state.shiftStats.specialGuestsMissed = (state.shiftStats.specialGuestsMissed || 0) + 1;
}