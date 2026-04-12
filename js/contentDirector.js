function clamp(value, min = 0, max = 10) {
  return Math.max(min, Math.min(max, Number(value || 0)));
}

function toList(value, limit = 6) {
  return Array.isArray(value) ? value.filter(Boolean).slice(-limit) : [];
}

function pushRecent(list, value, limit = 6) {
  const next = [...toList(list, limit), value].filter(Boolean);
  return next.slice(-limit);
}

function getDoctrineTendencies(state) {
  return state?.doctrine?.tendencies && typeof state.doctrine.tendencies === 'object'
    ? state.doctrine.tendencies
    : {};
}

export function normalizeContentDirectorState(state) {
  if (!state || typeof state !== 'object') return state;
  const currentDirector = state.contentDirector && typeof state.contentDirector === 'object'
    ? state.contentDirector
    : {};
  const currentHistory = state.contentHistory && typeof state.contentHistory === 'object'
    ? state.contentHistory
    : {};

  state.contentDirector = {
    lastNightProfile: currentDirector.lastNightProfile || null,
    lastSignals: currentDirector.lastSignals || null,
    lastShiftHint: currentDirector.lastShiftHint || '',
    lastPrepNotes: toList(currentDirector.lastPrepNotes, 4)
  };

  state.contentHistory = {
    recentSpecialEncounterIds: toList(currentHistory.recentSpecialEncounterIds, 5),
    recentNightEventIds: toList(currentHistory.recentNightEventIds, 5),
    recentLocationZones: toList(currentHistory.recentLocationZones, 8),
    recentAnomalyStatuses: toList(currentHistory.recentAnomalyStatuses, 8),
    seenSpecialEncounterIds: toList(currentHistory.seenSpecialEncounterIds, 140),
    seenNightEventIds: toList(currentHistory.seenNightEventIds, 140),
    seenAnomalyStatuses: toList(currentHistory.seenAnomalyStatuses, 80),
    seenThreadFamilies: toList(currentHistory.seenThreadFamilies, 80),
    rareMomentsSeen: toList(currentHistory.rareMomentsSeen, 80),
    recentGuestArchetypes: toList(currentHistory.recentGuestArchetypes, 8),
    recentGuestMoods: toList(currentHistory.recentGuestMoods, 8),
    authorityHeavyMoments: clamp(currentHistory.authorityHeavyMoments, 0, 12),
    outsideHeavyMoments: clamp(currentHistory.outsideHeavyMoments, 0, 12),
    adjacentEventOverlapCount: clamp(currentHistory.adjacentEventOverlapCount, 0, 18)
  };

  return state;
}

export function buildNightContextProfile(state) {
  normalizeContentDirectorState(state);
  const doctrine = getDoctrineTendencies(state);
  const factions = state?.factions || {};
  const stats = state?.shiftStats || {};
  const threadHeat = Array.isArray(state?.storyThreads)
    ? state.storyThreads.reduce((sum, thread) => sum + Math.max(0, Number(thread?.heat || 0)), 0)
    : 0;

  return {
    night: Math.max(1, Number(state?.night || 1)),
    scenarioKey: String(state?.activeScenario?.key || 'standard-shift'),
    doctrine,
    factions,
    carryover: Array.isArray(state?.carryover) ? state.carryover : [],
    stats,
    narrativeBias: state?.narrativeBias || {},
    upgrades: Array.isArray(state?.progression?.purchasedUpgradeIds)
      ? state.progression.purchasedUpgradeIds
      : [],
    threadHeat,
    activeStoryBeat: state?.activeStoryBeat || null,
    history: state.contentHistory
  };
}

export function deriveWeightedSignals(profile = {}) {
  const doctrine = profile.doctrine || {};
  const factions = profile.factions || {};
  const stats = profile.stats || {};
  const carryoverTypes = (profile.carryover || []).map((item) => String(item?.type || ''));
  const scenario = String(profile.scenarioKey || 'standard-shift');
  const history = profile.history || {};

  const signals = {
    outsideRisk: 3,
    authorityPresence: 3,
    guestDistrust: 3,
    quietOpportunity: 2,
    financialPressure: 2,
    maintenanceFragility: 3,
    staffFatigue: 2,
    localRetaliation: 2,
    privacyDemand: 2,
    controlBacklash: 2,
    ownershipScrutiny: 3,
    storyEscalation: 2
  };

  signals.outsideRisk += Number(factions.locals || 0) <= -4 ? 3 : 0;
  signals.outsideRisk += scenario === 'weekend-disturbance' ? 2 : 0;
  signals.outsideRisk += scenario === 'storm-night' ? 1 : 0;
  signals.outsideRisk += Number(history.outsideHeavyMoments || 0) >= 3 ? 1 : 0;

  signals.authorityPresence += Number(factions.authorities || 0) >= 3 ? 3 : 0;
  signals.authorityPresence += Number(doctrine.control || 0) >= 5 ? 1 : 0;
  signals.authorityPresence -= Number(factions.authorities || 0) <= -4 ? 2 : 0;

  signals.guestDistrust += Number(factions.guests || 0) <= -3 ? 3 : 0;
  signals.guestDistrust += Number(stats.harshDeskActions || 0) >= 1 ? 1 : 0;
  signals.guestDistrust += Number(doctrine.force || 0) >= 5 ? 1 : 0;

  signals.quietOpportunity += Number(doctrine.secrecy || 0) >= 4 ? 3 : 0;
  signals.quietOpportunity += Number(factions.staff || 0) >= 4 ? 1 : 0;
  signals.quietOpportunity -= Number(stats.publicPressureMoments || 0) >= 1 ? 1 : 0;

  signals.financialPressure += Number(factions.ownership || 0) <= -4 ? 3 : 0;
  signals.financialPressure += Number(stats.forcedCompromises || 0) >= 1 ? 1 : 0;

  signals.maintenanceFragility += scenario === 'blackout-strain' ? 3 : 0;
  signals.maintenanceFragility += carryoverTypes.includes('power-instability-risk') ? 2 : 0;
  signals.maintenanceFragility += carryoverTypes.includes('critical-room-tension') ? 1 : 0;

  signals.staffFatigue += Number(factions.staff || 0) <= -3 ? 3 : 0;
  signals.staffFatigue += Number(stats.dispatchCount || 0) >= 2 ? 1 : 0;

  signals.localRetaliation += Number(factions.locals || 0) <= -4 ? 4 : 0;
  signals.localRetaliation += Number(stats.evictions || 0) >= 1 ? 1 : 0;

  signals.privacyDemand += Number(doctrine.secrecy || 0) >= 5 ? 3 : 0;
  signals.privacyDemand += scenario === 'inspection-rumor' ? 1 : 0;

  signals.controlBacklash += Number(doctrine.force || 0) >= 5 ? 2 : 0;
  signals.controlBacklash += Number(stats.harshDeskActions || 0) >= 1 ? 1 : 0;
  signals.controlBacklash += Number(stats.policeReliance || 0) >= 1 ? 1 : 0;

  signals.ownershipScrutiny += Number(factions.ownership || 0) <= -4 ? 4 : 0;
  signals.ownershipScrutiny += scenario === 'inspection-rumor' ? 2 : 0;

  signals.storyEscalation += Number(profile.threadHeat || 0) >= 8 ? 3 : 0;
  signals.storyEscalation += profile.activeStoryBeat ? 1 : 0;
  signals.storyEscalation += Number(stats.threadsEscalated || 0) > Number(stats.threadsAdvancedCleanly || 0) ? 1 : 0;
  signals.storyEscalation += Number(history.adjacentEventOverlapCount || 0) >= 4 ? 1 : 0;

  Object.keys(signals).forEach((key) => {
    signals[key] = clamp(signals[key], 0, 10);
  });
  return signals;
}

export function buildBranchWeights(signals = {}) {
  const tagWeights = {
    authority: Number(signals.authorityPresence || 0) * 0.35,
    inspection: Number(signals.ownershipScrutiny || 0) * 0.32,
    ownership: Number(signals.ownershipScrutiny || 0) * 0.3,
    'guest-relations': Number(signals.guestDistrust || 0) * 0.28,
    'local-pressure': Number(signals.localRetaliation || 0) * 0.34,
    retaliation: Number(signals.localRetaliation || 0) * 0.36,
    privacy: Number(signals.privacyDemand || 0) * 0.34,
    maintenance: Number(signals.maintenanceFragility || 0) * 0.34,
    security: Number(signals.controlBacklash || 0) * 0.2,
    quiet: Number(signals.quietOpportunity || 0) * 0.32,
    chaotic: (Number(signals.controlBacklash || 0) + Number(signals.outsideRisk || 0)) * 0.2,
    public: Number(signals.guestDistrust || 0) * 0.18,
    contained: Number(signals.quietOpportunity || 0) * 0.24,
    coverup: Number(signals.privacyDemand || 0) * 0.24,
    disruption: Number(signals.storyEscalation || 0) * 0.22,
    outside: Number(signals.outsideRisk || 0) * 0.35
  };

  const suppressedTags = {
    quiet: Number(signals.controlBacklash || 0) >= 7 ? 0.25 : 0,
    authority: Number(signals.authorityPresence || 0) <= 2 ? 0.22 : 0,
    public: Number(signals.quietOpportunity || 0) >= 7 ? 0.18 : 0,
    chaotic: Number(signals.quietOpportunity || 0) >= 6 ? 0.16 : 0
  };

  if (Number(signals.storyEscalation || 0) >= 7) {
    suppressedTags.contained = Math.max(Number(suppressedTags.contained || 0), 0.12);
  }

  return { tagWeights, suppressedTags };
}

export function buildDirectorBriefing(signals = {}) {
  const notes = [];
  if (Number(signals.localRetaliation || 0) >= 6 || Number(signals.outsideRisk || 0) >= 6) {
    notes.push('Local tension may spill into parking and rear access tonight.');
  }
  if (Number(signals.guestDistrust || 0) >= 6) {
    notes.push('Guest-facing trust is weak; front desk handling may be less forgiving.');
  }
  if (Number(signals.ownershipScrutiny || 0) >= 6) {
    notes.push('Ownership scrutiny is rising after recent unstable closes.');
  }
  if (Number(signals.staffFatigue || 0) >= 6) {
    notes.push('Staff fatigue is visible; dispatch reliability may slip under pressure.');
  }
  if (Number(signals.quietOpportunity || 0) >= 6 || Number(signals.privacyDemand || 0) >= 6) {
    notes.push('Quiet/private handling opportunities are more likely this shift.');
  }
  if (Number(signals.authorityPresence || 0) >= 6) {
    notes.push('Authority visibility is elevated across this night cycle.');
  }
  return notes.slice(0, 4);
}

export function buildShiftHint(signals = {}) {
  if (Number(signals.outsideRisk || 0) >= 7) {
    return 'Outlook: Outside zones are volatile; early containment may prevent deep spillover.';
  }
  if (Number(signals.privacyDemand || 0) >= 7) {
    return 'Outlook: Discreet handling is likely to pay off more than public confrontation.';
  }
  if (Number(signals.ownershipScrutiny || 0) >= 7) {
    return 'Outlook: Policy-sensitive decisions may carry heavier consequences tonight.';
  }
  return 'Outlook: Pressure is mixed tonight; adaptive handling should outperform rigid routines.';
}

export function buildSummaryBranchNotes(signals = {}, state = {}) {
  const lines = [];
  if (Number(signals.controlBacklash || 0) >= 7) {
    lines.push('Force-heavy pressure created additional backlash across the property.');
  }
  if (Number(signals.quietOpportunity || 0) >= 7) {
    lines.push('Quiet handling preserved control despite rising suspicion.');
  }
  if (Number(signals.outsideRisk || 0) >= 7) {
    lines.push('Outside pressure spilled deeper into motel operations.');
  }
  if (Number(signals.ownershipScrutiny || 0) >= 7) {
    lines.push('Ownership oversight narrowed room for risky improvisation.');
  }
  if (Number(state?.shiftStats?.threadsEscalated || 0) > Number(state?.shiftStats?.threadsAdvancedCleanly || 0)) {
    lines.push('Recurring thread pressure escalated under tonight’s handling climate.');
  }
  return lines.slice(0, 3);
}

export function getRunBranchingContext(state) {
  normalizeContentDirectorState(state);
  const profile = buildNightContextProfile(state);
  const signals = deriveWeightedSignals(profile);
  const { tagWeights, suppressedTags } = buildBranchWeights(signals);
  const prepNotes = buildDirectorBriefing(signals);
  const shiftHint = buildShiftHint(signals);
  const summaryNotes = buildSummaryBranchNotes(signals, state);

  state.contentDirector.lastNightProfile = profile;
  state.contentDirector.lastSignals = signals;
  state.contentDirector.lastPrepNotes = prepNotes;
  state.contentDirector.lastShiftHint = shiftHint;

  return {
    profile,
    signals,
    tagWeights,
    suppressedTags,
    prepNotes,
    shiftHint,
    summaryNotes,
    specialEncounterChanceBonus:
      (Number(signals.privacyDemand || 0) + Number(signals.authorityPresence || 0) + Number(signals.storyEscalation || 0)) * 0.008,
    eventChanceBonus:
      (Number(signals.outsideRisk || 0) + Number(signals.storyEscalation || 0) + Number(signals.maintenanceFragility || 0)) * 0.006,
    anomalyChanceBonus:
      (Number(signals.outsideRisk || 0) + Number(signals.maintenanceFragility || 0)) * 0.005,
    zoneWeights: {
      'Parking Lot': Number(signals.outsideRisk || 0) * 0.45 + Number(signals.localRetaliation || 0) * 0.4,
      'Rear Exit': Number(signals.outsideRisk || 0) * 0.42 + Number(signals.localRetaliation || 0) * 0.3,
      Lobby: Number(signals.ownershipScrutiny || 0) * 0.35 + Number(signals.guestDistrust || 0) * 0.22,
      Hallway: Number(signals.guestDistrust || 0) * 0.25 + Number(signals.privacyDemand || 0) * 0.22,
      Laundry: Number(signals.maintenanceFragility || 0) * 0.45,
      'Ice Machine': Number(signals.maintenanceFragility || 0) * 0.4
    }
  };
}

export function applyDirectorGuestBias(guest, context = {}) {
  if (!guest || !context?.signals) return guest;
  const signals = context.signals;
  const next = { ...guest };

  if (Number(signals.guestDistrust || 0) >= 6 && Math.random() < 0.45) {
    next.mood = Math.random() < 0.55 ? 'Nervous' : 'Agitated';
    next.riskLevel = next.riskLevel === 'Low' ? 'Medium' : next.riskLevel;
    next.risk = next.riskLevel;
    next.riskNote = `${next.riskNote || ''} Desk trust is thin tonight; guest appears guarded.`.trim();
  }

  if (Number(signals.quietOpportunity || 0) >= 6 && Math.random() < 0.38) {
    next.mood = Math.random() < 0.6 ? 'Silent' : next.mood;
    next.trait = Math.random() < 0.5 ? 'Quiet' : next.trait;
  }

  if (Number(signals.authorityPresence || 0) >= 6 && Math.random() < 0.35) {
    next.policyRecommendation = next.policyRecommendation === 'Approve' ? 'Watch' : next.policyRecommendation;
    next.riskNote = `${next.riskNote || ''} Behavior suggests compliance sensitivity under current oversight.`.trim();
  }

  if (Number(signals.localRetaliation || 0) >= 6 && Math.random() < 0.33) {
    next.chainBias = Number(next.chainBias || 0) + 1;
    next.incidentBias = Number(next.incidentBias || 0) + 1;
  }

  if (Number(signals.privacyDemand || 0) >= 6 && Math.random() < 0.35) {
    next.riskNote = `${next.riskNote || ''} Requests discreet handling and minimal visibility.`.trim();
  }

  return next;
}

export function applyReturningGuestBranchFlavor(guest, context = {}) {
  if (!guest?.isReturningGuest || !context?.signals) return guest;
  const next = { ...guest };
  const signals = context.signals;

  if (Number(signals.guestDistrust || 0) >= 6) {
    next.threadMemoryLine = `${next.threadMemoryLine || ''} Returning under a hostile guest climate; posture is defensive.`.trim();
  }
  if (Number(signals.privacyDemand || 0) >= 6) {
    next.priorHistoryLine = `${next.priorHistoryLine || ''} Returning guest requests tighter discretion this time.`.trim();
  }
  if (Number(signals.authorityPresence || 0) >= 6) {
    next.policyHistoryPressure = 'Returning guest is wary of documentation and formal reporting.';
  }

  return next;
}

export function registerContentExposure(state, payload = {}) {
  normalizeContentDirectorState(state);
  const history = state.contentHistory;
  const kind = String(payload.kind || '');

  if (kind === 'special' && payload.id) {
    history.recentSpecialEncounterIds = pushRecent(history.recentSpecialEncounterIds, payload.id, 5);
    history.seenSpecialEncounterIds = pushRecent(history.seenSpecialEncounterIds, payload.id, 140);
  }
  if (kind === 'event' && payload.id) {
    history.recentNightEventIds = pushRecent(history.recentNightEventIds, payload.id, 5);
    history.seenNightEventIds = pushRecent(history.seenNightEventIds, payload.id, 140);
    if (history.recentNightEventIds.length >= 2) {
      const last = history.recentNightEventIds[history.recentNightEventIds.length - 1];
      const prev = history.recentNightEventIds[history.recentNightEventIds.length - 2];
      if (last && prev && last !== prev) {
        history.adjacentEventOverlapCount = clamp(Number(history.adjacentEventOverlapCount || 0) + 0.2, 0, 18);
      }
    }
  }
  if (kind === 'zone' && payload.zone) {
    history.recentLocationZones = pushRecent(history.recentLocationZones, payload.zone, 8);
  }
  if (kind === 'anomaly' && payload.status) {
    history.recentAnomalyStatuses = pushRecent(history.recentAnomalyStatuses, payload.status, 8);
    history.seenAnomalyStatuses = pushRecent(history.seenAnomalyStatuses, payload.status, 80);
  }
  if (kind === 'threadFamily' && payload.id) {
    history.seenThreadFamilies = pushRecent(history.seenThreadFamilies, payload.id, 80);
  }
  if (kind === 'rareMoment' && payload.id) {
    history.rareMomentsSeen = pushRecent(history.rareMomentsSeen, payload.id, 80);
  }
  if (kind === 'guest' && payload.archetype) {
    history.recentGuestArchetypes = pushRecent(history.recentGuestArchetypes, payload.archetype, 8);
  }
  if (kind === 'guestMood' && payload.mood) {
    history.recentGuestMoods = pushRecent(history.recentGuestMoods, payload.mood, 8);
  }
  if (payload.authorityHeavy) {
    history.authorityHeavyMoments = clamp(Number(history.authorityHeavyMoments || 0) + 1, 0, 12);
  }
  if (payload.outsideHeavy) {
    history.outsideHeavyMoments = clamp(Number(history.outsideHeavyMoments || 0) + 1, 0, 12);
  }
}
