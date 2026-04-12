const DEFAULT_CAMPAIGN_LENGTH = 5;

const NIGHT_MILESTONES = Object.freeze({
  1: {
    key: 'opening-shift',
    label: 'Opening Shift',
    tier: 'baseline',
    atmosphere: 'Baseline motel pressure. Learn the room and keep operations steady.'
  },
  2: {
    key: 'rising-pressure',
    label: 'Rising Pressure',
    tier: 'rising',
    atmosphere: 'Patterns tighten and mistakes linger longer than they did on opening night.'
  },
  3: {
    key: 'milestone-shift',
    label: 'Milestone Shift',
    tier: 'milestone',
    atmosphere: 'Ownership and recurring pressures are paying closer attention to tonight’s handling.'
  },
  4: {
    key: 'pre-finale',
    label: 'Pre-Finale Pressure',
    tier: 'pre-finale',
    atmosphere: 'Outside tension and unresolved motel strain are likely to push inward.'
  },
  5: {
    key: 'finale-night',
    label: 'Finale Night',
    tier: 'finale',
    atmosphere: 'Tonight defines the motel’s identity. Containment, trust, and scrutiny all peak.'
  }
});

function toNumber(value, fallback = 0) {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function buildDefaultCampaignState() {
  return {
    length: DEFAULT_CAMPAIGN_LENGTH,
    campaignNightsCompleted: 0,
    milestoneNightsSurvived: 0,
    finaleReached: false,
    finaleSurvived: false,
    runComplete: false,
    runEndingKey: null,
    runEndingGrade: null,
    nights: [],
    totals: {}
  };
}

function rebuildTotals(campaign) {
  const totals = {};
  (Array.isArray(campaign?.nights) ? campaign.nights : []).forEach((entry) => {
    const stats = entry?.shiftStats || {};
    Object.entries(stats).forEach(([key, value]) => {
      if (typeof value !== 'number') return;
      totals[key] = (totals[key] || 0) + value;
    });
  });
  campaign.totals = totals;
}

export function getDefaultCampaignLength() {
  return DEFAULT_CAMPAIGN_LENGTH;
}

export function normalizeCampaignState(state) {
  const next = state && typeof state === 'object' ? state : {};
  const current = next.campaign && typeof next.campaign === 'object'
    ? next.campaign
    : buildDefaultCampaignState();

  const length = clamp(toNumber(current.length, DEFAULT_CAMPAIGN_LENGTH), 3, 12);
  const nights = Array.isArray(current.nights) ? current.nights.slice(0, length) : [];
  const completed = clamp(toNumber(current.campaignNightsCompleted, nights.length), 0, length);

  next.campaign = {
    ...buildDefaultCampaignState(),
    ...current,
    length,
    nights,
    campaignNightsCompleted: completed,
    milestoneNightsSurvived: Math.max(0, toNumber(current.milestoneNightsSurvived, 0)),
    finaleReached: Boolean(current.finaleReached),
    finaleSurvived: Boolean(current.finaleSurvived),
    runComplete: Boolean(current.runComplete),
    runEndingKey: current.runEndingKey || null,
    runEndingGrade: current.runEndingGrade || null
  };

  rebuildTotals(next.campaign);
  return next;
}

export function getMilestoneNightSet(campaign = {}) {
  const length = clamp(toNumber(campaign?.length, DEFAULT_CAMPAIGN_LENGTH), 3, 12);
  const nights = [];
  if (length >= 3) nights.push(3);
  if (length >= 4) nights.push(length - 1);
  nights.push(length);
  return Array.from(new Set(nights)).sort((a, b) => a - b);
}

export function getMilestoneMeta(night = 1, campaign = {}) {
  const length = clamp(toNumber(campaign?.length, DEFAULT_CAMPAIGN_LENGTH), 3, 12);
  const safeNight = clamp(toNumber(night, 1), 1, length);
  const seeded = NIGHT_MILESTONES[safeNight] || {
    key: safeNight >= length ? 'finale-night' : safeNight >= length - 1 ? 'pre-finale' : 'standard-shift',
    label: safeNight >= length ? 'Finale Night' : safeNight >= length - 1 ? 'Pre-Finale Pressure' : `Night ${safeNight}`,
    tier: safeNight >= length ? 'finale' : safeNight >= length - 1 ? 'pre-finale' : 'standard',
    atmosphere: 'Pressure profile remains dynamic tonight.'
  };

  return {
    ...seeded,
    night: safeNight,
    isMilestone: seeded.tier === 'milestone' || seeded.tier === 'pre-finale' || seeded.tier === 'finale',
    isFinale: seeded.tier === 'finale',
    isPreFinale: seeded.tier === 'pre-finale'
  };
}

export function getCampaignProgress(state) {
  const campaign = state?.campaign || {};
  const length = clamp(toNumber(campaign.length, DEFAULT_CAMPAIGN_LENGTH), 3, 12);
  const currentNight = clamp(toNumber(state?.night, 1), 1, length);
  const completed = clamp(toNumber(campaign.campaignNightsCompleted, 0), 0, length);
  return {
    currentNight,
    completed,
    totalNights: length,
    remaining: Math.max(0, length - completed),
    label: `Night ${currentNight} of ${length}`,
    completedLabel: `Campaign progress: ${completed} / ${length} nights completed`
  };
}

export function getPrepForecastNotes(state) {
  const progress = getCampaignProgress(state);
  const upcomingNight = clamp(progress.currentNight + 1, 1, progress.totalNights);
  const meta = getMilestoneMeta(upcomingNight, state?.campaign || {});
  const notes = [progress.completedLabel];

  if (meta.isFinale) {
    notes.push('Final night approaching: unresolved pressure may carry into the finale.');
    notes.push('Tonight’s handling will define the motel’s long-run posture.');
  } else if (meta.isPreFinale) {
    notes.push('Pre-finale warning: local retaliation and oversight pressure are likely to tighten.');
  } else if (meta.tier === 'milestone') {
    notes.push('Night 3 will be a heavier milestone shift with tighter tolerance for drift.');
  } else if (upcomingNight >= 2) {
    notes.push('Pressure is building gradually; carryover and recurring threads matter more now.');
  } else {
    notes.push('Opening shift expectations remain baseline.');
  }

  return notes;
}

export function getMilestoneGameplayModifiers(state, night = null) {
  const safeNight = toNumber(night, toNumber(state?.night, 1));
  const meta = getMilestoneMeta(safeNight, state?.campaign || {});

  const base = {
    riskBonus: 0,
    chainBonus: 0,
    incidentBonus: 0,
    eventChanceBonus: 0,
    specialEncounterChanceBonus: 0,
    anomalyChanceBonus: 0,
    directorSignalBoost: 0,
    recurringThreadEscalationBonus: 0,
    unresolvedTolerancePenalty: 0,
    earlyOverlapShield: 0,
    eventWorsenShield: 0,
    unresolvedReturnSmoothing: 0,
    pressureCadenceBonus: 0,
    finalePressureGrowthBonus: 0
  };

  if (safeNight <= 1) {
    return {
      ...base,
      earlyOverlapShield: 2,
      eventWorsenShield: 1,
      unresolvedReturnSmoothing: 1,
      pressureCadenceBonus: -1
    };
  }

  if (meta.tier === 'milestone') {
    return {
      ...base,
      riskBonus: 1,
      chainBonus: 1,
      eventChanceBonus: 0.015,
      specialEncounterChanceBonus: 0.012,
      anomalyChanceBonus: 0.008,
      directorSignalBoost: 1,
      recurringThreadEscalationBonus: 0.06,
      unresolvedTolerancePenalty: 1,
      pressureCadenceBonus: 1
    };
  }

  if (meta.tier === 'pre-finale') {
    return {
      ...base,
      riskBonus: 1,
      chainBonus: 1,
      incidentBonus: 1,
      eventChanceBonus: 0.02,
      specialEncounterChanceBonus: 0.015,
      anomalyChanceBonus: 0.012,
      directorSignalBoost: 1,
      recurringThreadEscalationBonus: 0.07,
      unresolvedTolerancePenalty: 1,
      pressureCadenceBonus: 2
    };
  }

  if (meta.tier === 'finale') {
    return {
      ...base,
      riskBonus: 1,
      chainBonus: 2,
      incidentBonus: 1,
      eventChanceBonus: 0.03,
      specialEncounterChanceBonus: 0.02,
      anomalyChanceBonus: 0.015,
      directorSignalBoost: 2,
      recurringThreadEscalationBonus: 0.1,
      unresolvedTolerancePenalty: 2,
      pressureCadenceBonus: 3,
      finalePressureGrowthBonus: 2
    };
  }

  if (meta.tier === 'rising') {
    return {
      ...base,
      chainBonus: 1,
      eventChanceBonus: 0.01,
      specialEncounterChanceBonus: 0.008,
      directorSignalBoost: 1,
      recurringThreadEscalationBonus: 0.03,
      pressureCadenceBonus: 1
    };
  }

  if (safeNight >= 6) {
    const extra = safeNight - 5;
    return {
      ...base,
      riskBonus: 1 + Math.min(2, Math.ceil(extra / 2)),
      chainBonus: 1 + Math.min(2, Math.floor(extra / 2)),
      incidentBonus: Math.min(2, Math.floor(extra / 2)),
      eventChanceBonus: 0.012 + extra * 0.006,
      specialEncounterChanceBonus: 0.01 + extra * 0.005,
      anomalyChanceBonus: 0.008 + extra * 0.004,
      directorSignalBoost: 1 + Math.min(2, Math.floor(extra / 3)),
      recurringThreadEscalationBonus: 0.05 + extra * 0.02,
      unresolvedTolerancePenalty: 1 + Math.min(2, Math.floor(extra / 2)),
      pressureCadenceBonus: 2 + Math.min(3, Math.floor(extra / 2)),
      earlyOverlapShield: Math.max(0, 2 - Math.ceil(extra / 2)),
      eventWorsenShield: Math.max(0, 1 - Math.floor(extra / 3)),
      unresolvedReturnSmoothing: Math.max(0, 1 - Math.floor(extra / 4))
    };
  }

  return base;
}

export function getMilestoneSupportNotes(state, night = null) {
  const safeNight = toNumber(night, toNumber(state?.night, 1));
  const meta = getMilestoneMeta(safeNight, state?.campaign || {});
  if (meta.isFinale) {
    return ['Finale support: tighter dispatch discipline and clean policy alignment reduce endgame volatility.'];
  }
  if (meta.isPreFinale) {
    return ['Support note: contain outside spillover early to prevent compound overnight pressure.'];
  }
  if (meta.tier === 'milestone') {
    return ['Milestone support: recurring threads are likely to surface; proactive scans and calm routing help.'];
  }
  return [];
}

export function shouldEndRunAfterSuccessfulNight(state, night = null) {
  const campaign = state?.campaign || {};
  const length = clamp(toNumber(campaign.length, DEFAULT_CAMPAIGN_LENGTH), 3, 12);
  const safeNight = clamp(toNumber(night, toNumber(state?.night, 1)), 1, length);
  return safeNight >= length;
}

export function registerCampaignNightSuccess(state, payload = {}) {
  normalizeCampaignState(state);
  const campaign = state.campaign;
  const progress = getCampaignProgress(state);
  const meta = getMilestoneMeta(progress.currentNight, campaign);

  const record = {
    night: progress.currentNight,
    milestoneKey: meta.key,
    tier: meta.tier,
    summaryScore: toNumber(payload?.summary?.score, 0),
    summaryGrade: payload?.summary?.grade || 'C',
    reputation: toNumber(state?.reputation, 0),
    money: toNumber(state?.money, 0),
    power: toNumber(state?.power, 0),
    shiftStats: { ...(state?.shiftStats || {}) }
  };

  const existingIndex = campaign.nights.findIndex((entry) => toNumber(entry?.night, -1) === record.night);
  if (existingIndex >= 0) {
    campaign.nights[existingIndex] = record;
  } else {
    campaign.nights.push(record);
  }
  campaign.nights = campaign.nights
    .slice(0, campaign.length)
    .sort((a, b) => toNumber(a?.night, 0) - toNumber(b?.night, 0));

  campaign.campaignNightsCompleted = campaign.nights.reduce(
    (max, entry) => Math.max(max, toNumber(entry?.night, 0)),
    0
  );
  campaign.milestoneNightsSurvived = campaign.nights.reduce((sum, entry) => {
    const tier = String(entry?.tier || '');
    return sum + (tier === 'milestone' || tier === 'pre-finale' || tier === 'finale' ? 1 : 0);
  }, 0);
  campaign.finaleReached = campaign.nights.some((entry) => String(entry?.tier || '') === 'finale');
  campaign.finaleSurvived = campaign.finaleReached;
  campaign.runComplete = campaign.finaleSurvived;

  rebuildTotals(campaign);
}
