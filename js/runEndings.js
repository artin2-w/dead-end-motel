function n(value, fallback = 0) {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}

function pickVariant(list = [], seed = 0) {
  if (!Array.isArray(list) || !list.length) return '';
  const index = Math.abs(Math.floor(Number(seed || 0))) % list.length;
  return list[index] || list[0] || '';
}

const ENDING_TITLE_VARIANTS = Object.freeze({
  stable: ['Trusted Shelter', 'Morning With Margin', 'Open Sign, Steady Hands'],
  fragile: ['Fragile Survival', 'One More Night Bought', 'Held Together at Dawn'],
  cold: ['Silent Profit', 'House of Quiet Deals', 'Records Clean, Corridors Cold'],
  collapse: ['Cracking Under Pressure', 'Contained Chaos', 'Dawn Over Damage'],
  hostile: ['Hostile Ledger', 'Every Side Keeps Score', 'No Neutral Witnesses'],
  controlled: ['Order Through Control', 'Commanded Stability', 'No Drift Allowed']
});

const ENDING_TAGLINE_VARIANTS = Object.freeze({
  stable: [
    'Dawn finally feels earned.',
    'You made this place feel briefly safe.',
    'The sign stayed lit without hiding the cost.'
  ],
  fragile: [
    'Open at dawn, uncertain by sundown.',
    'You survived the week, not the strain.',
    'The walls held, barely.'
  ],
  cold: [
    'Control came quietly, and so did the fallout.',
    'The books balance. The mood does not.',
    'You kept order in whispers and omissions.'
  ],
  collapse: [
    'Pressure broke pattern before it broke the sign.',
    'The motel stands, but trust does not.',
    'You reached morning through damage control alone.'
  ],
  hostile: [
    'No faction left satisfied.',
    'Every corridor now remembers a grievance.',
    'You kept the doors open under mutual hostility.'
  ],
  controlled: [
    'Order was imposed room by room.',
    'Discipline held where goodwill failed.',
    'You replaced chaos with hard edges.'
  ]
});

function doctrineOutcome(doctrine = {}) {
  const title = doctrine?.title || 'Stability Manager';
  if (/hardline|enforcer|controller/i.test(title)) return 'Doctrine settled into rigid command discipline.';
  if (/guest-first|host|mercy|compassion/i.test(title)) return 'Doctrine leaned toward guest-facing restraint and care.';
  if (/shadow|quiet|secrecy|fixer/i.test(title)) return 'Doctrine favored discreet control and private containment.';
  if (/improviser|fractured/i.test(title)) return 'Doctrine relied on reactive pivots to keep the motel standing.';
  return `Doctrine remained ${title.toLowerCase()} by campaign close.`;
}

function climateOutcome(factions = {}) {
  const guests = n(factions.guests, 0);
  const locals = n(factions.locals, 0);
  const ownership = n(factions.ownership, 0);
  if (guests >= 4 && locals >= 0) return 'Guest trust rose and outside climate stayed manageable.';
  if (ownership >= 5 && guests <= 0) return 'Ownership confidence climbed while guest warmth cooled.';
  if (locals <= -5) return 'Local hostility remained a persistent perimeter risk.';
  if (ownership <= -5) return 'Ownership scrutiny hardened after repeated instability signals.';
  return 'Faction climate ended tense-but-operational across stakeholders.';
}

function postureOutcome(t = {}) {
  const control = n(t.control, 0);
  const compassion = n(t.compassion, 0);
  const secrecy = n(t.secrecy, 0);
  if (control >= compassion + 2 && control >= secrecy) return 'Posture: Control-heavy operations with strict boundaries.';
  if (compassion >= control + 2 && compassion >= secrecy) return 'Posture: Compassion-led handling under pressure.';
  if (secrecy >= control && secrecy >= compassion) return 'Posture: Quiet, discreet, low-visibility management.';
  return 'Posture: Mixed doctrine with adaptive tradeoffs.';
}

function evaluateCategory(snapshot) {
  const t = snapshot.tendencies;
  const rep = snapshot.reputation;
  const unresolved = snapshot.unresolved;
  const policyBreaks = snapshot.policyBreaks;
  const force = snapshot.forceHeavy;
  const trustDelta = snapshot.guestTrust - snapshot.localHostility;
  const localHostility = snapshot.localHostility;

  if (rep >= 62 && t.control >= 6 && force >= 2) {
    return { key: 'order-through-control', title: 'Order Through Control', subtitle: 'Cold Stability Secured' };
  }
  if (rep >= 58 && t.control >= 5 && t.compassion >= 4 && unresolved <= 3) {
    return { key: 'controlled-manager', title: 'Controlled Manager', subtitle: 'Pressure Contained Without Losing the Floor' };
  }
  if (rep >= 60 && t.compassion >= 6 && trustDelta >= 3) {
    return { key: 'trusted-shelter', title: 'Trusted Shelter', subtitle: 'A Reputation for Safe Harbor' };
  }
  if (snapshot.money >= 220 && t.secrecy >= 6 && policyBreaks >= 1) {
    return { key: 'silent-profit', title: 'Silent Profit', subtitle: 'Quiet Revenue, Quiet Records' };
  }
  if (snapshot.money >= 200 && policyBreaks >= 1 && rep >= 42) {
    return { key: 'profitable-but-compromised', title: 'Profitable But Compromised', subtitle: 'Strong Ledger, Dirty Atmosphere' };
  }
  if (localHostility >= 5 && snapshot.guestTrust <= 0) {
    return { key: 'socially-poisoned-motel', title: 'Socially Poisoned Motel', subtitle: 'The Building Stays Open, The Mood Does Not' };
  }
  if (t.control >= 6 && t.compassion <= 1 && force >= 2) {
    return { key: 'harsh-survivor', title: 'Harsh Survivor', subtitle: 'Safety Held Through Hard Edges' };
  }
  if (snapshot.unresolved <= 4 && t.control >= 4 && t.compassion >= 3) {
    return { key: 'unstable-but-disciplined', title: 'Unstable But Disciplined', subtitle: 'The Motel Bent, Then Held' };
  }
  if (t.control >= 5 && t.compassion <= 1 && snapshot.guestTrust <= 0) {
    return { key: 'calm-but-morally-ugly', title: 'Calm But Morally Ugly', subtitle: 'The Floors Stayed Quiet for the Wrong Reasons' };
  }
  if (unresolved >= 6 && snapshot.finalePressurePeak >= 6) {
    return { key: 'contained-chaos', title: 'Contained Chaos', subtitle: 'Barely Held Behind Closed Doors' };
  }
  if (rep <= 34 || snapshot.failSignals >= 3) {
    return { key: 'cracking-under-pressure', title: 'Cracking Under Pressure', subtitle: 'The Motel Survived, But Fractured' };
  }
  if (t.secrecy >= 5 && snapshot.ownership >= 2 && snapshot.guestTrust <= 0) {
    return { key: 'house-of-quiet-deals', title: 'House of Quiet Deals', subtitle: 'Private Arrangements Defined the Run' };
  }
  if (t.control >= 5 && t.compassion <= 1 && policyBreaks === 0) {
    return { key: 'cold-efficiency', title: 'Cold Efficiency', subtitle: 'No Waste, No Warmth' };
  }
  if (t.compassion >= 5 && unresolved >= 3) {
    return { key: 'unsteady-mercy', title: 'Unsteady Mercy', subtitle: 'Humanity Preserved at a Cost' };
  }
  return { key: 'fragile-survival', title: 'Fragile Survival', subtitle: 'Open at Dawn, Uncertain by Dusk' };
}

function resolveEndingFamilyFromKey(key = '') {
  const value = String(key || '').toLowerCase();
  if (value.includes('controlled-manager')) return 'controlled';
  if (value.includes('trusted') || value.includes('shelter')) return 'stable';
  if (value.includes('fragile') || value.includes('unsteady')) return 'fragile';
  if (value.includes('cold') || value.includes('quiet') || value.includes('silent')) return 'cold';
  if (value.includes('cracking') || value.includes('chaos')) return 'collapse';
  if (value.includes('socially-poisoned')) return 'hostile';
  if (value.includes('harsh-survivor')) return 'controlled';
  if (value.includes('control') || value.includes('order')) return 'controlled';
  if (value.includes('hostile')) return 'hostile';
  return 'stable';
}

function buildEndingTagline(family = 'stable', grade = 'C') {
  const safeFamily = String(family || 'stable');
  const safeGrade = String(grade || 'C').toUpperCase();
  if (safeFamily === 'stable') {
    return safeGrade === 'S' || safeGrade === 'A'
      ? 'Dawn breaks over a motel that finally resembles a refuge.'
      : 'You held the line long enough for morning to feel earned.';
  }
  if (safeFamily === 'fragile') {
    return 'The sign still glows, but every hallway keeps tomorrow’s debt.';
  }
  if (safeFamily === 'cold') {
    return 'The books are clean. The silence is not.';
  }
  if (safeFamily === 'collapse') {
    return 'You survived the week, not the damage it carved into the building.';
  }
  if (safeFamily === 'hostile') {
    return 'Every side leaves with a grievance, and none forget your name.';
  }
  if (safeFamily === 'controlled') {
    return 'Order was imposed, room by room, cost by cost.';
  }
  return 'The campaign closes, but its consequences keep moving.';
}

function resolvePresentationFamily(family = 'stable', grade = 'C') {
  const safeFamily = String(family || 'stable');
  const safeGrade = String(grade || 'C').toUpperCase();
  if (safeFamily === 'stable') {
    return safeGrade === 'S' || safeGrade === 'A' ? 'good' : 'mixed';
  }
  if (safeFamily === 'controlled') return 'mixed';
  if (safeFamily === 'fragile') return 'fragile';
  if (safeFamily === 'cold') return 'cold';
  if (safeFamily === 'hostile') return 'hostile';
  if (safeFamily === 'collapse') return 'chaotic';
  return 'mixed';
}

function evaluateGrade(snapshot) {
  let score = 55;
  score += Math.max(-12, Math.min(16, (snapshot.reputation - 50) * 0.6));
  score += Math.max(-8, Math.min(10, (snapshot.powerAvg - 60) * 0.25));
  score += Math.max(-6, Math.min(8, (snapshot.money - 120) * 0.06));
  score -= Math.min(18, snapshot.unresolved * 2);
  score -= Math.min(12, snapshot.policyBreaks * 2);
  score += Math.min(10, snapshot.cleanResolutions);
  score += snapshot.finaleSurvived ? 6 : 0;

  if (score >= 86) return { grade: 'S', label: 'Definitive Campaign Close' };
  if (score >= 75) return { grade: 'A', label: 'Strong Campaign Close' };
  if (score >= 64) return { grade: 'B', label: 'Stable Campaign Close' };
  if (score >= 52) return { grade: 'C', label: 'Uneasy Campaign Close' };
  if (score >= 40) return { grade: 'D', label: 'Strained Campaign Close' };
  return { grade: 'E', label: 'Damaged Campaign Close' };
}

export function buildRunEndingPackage(state) {
  const tendencies = state?.doctrine?.tendencies || {};
  const doctrineDisplay = state?.doctrineDisplay || {};
  const factions = state?.factions || {};
  const campaign = state?.campaign || {};
  const totals = campaign?.totals || {};
  const nights = Array.isArray(campaign?.nights) ? campaign.nights : [];
  const runSetupSummary = state?.runSetupSummary || null;
  const difficultyLabel = String(runSetupSummary?.difficultyLabel || 'Standard');
  const contractLabels = Array.isArray(runSetupSummary?.contractLabels) ? runSetupSummary.contractLabels : [];

  const snapshot = {
    tendencies,
    reputation: n(state?.reputation, 50),
    money: n(state?.money, 0),
    powerAvg: nights.length
      ? nights.reduce((sum, entry) => sum + n(entry?.power, 0), 0) / nights.length
      : n(state?.power, 0),
    unresolved: n(totals.unresolvedLocationScenes, 0) + n(totals.nightEventsMissed, 0),
    policyBreaks: n(totals.policyBreaks, 0) + n(totals.policyBroken, 0),
    cleanResolutions: n(totals.sceneResolved, 0) + n(totals.nightEventsResolved, 0),
    forceHeavy: n(totals.policeReliance, 0) + n(totals.harshDeskActions, 0) + n(totals.evictions, 0),
    guestTrust: n(factions.guests, 0),
    localHostility: Math.max(0, -n(factions.locals, 0)),
    ownership: n(factions.ownership, 0),
    failSignals: n(totals.severeIncidents, 0) + n(totals.storyEscalations, 0),
    finaleSurvived: Boolean(campaign?.finaleSurvived),
    finalePressurePeak: n(state?.finalePressurePeak, 0),
    finalePerformanceKey: String(state?.finalePerformance?.key || ''),
    finalePerformanceLabel: String(state?.finalePerformance?.label || ''),
    finalePerformanceLine: String(state?.finalePerformance?.line || ''),
    endingMood: Array.isArray(state?.summaryIdentityLines) ? String(state.summaryIdentityLines[0] || '') : ''
  };

  const ending = evaluateCategory(snapshot);
  const grade = evaluateGrade(snapshot);
  const family = resolveEndingFamilyFromKey(ending.key);
  const seed =
    n(snapshot.reputation, 0)
    + n(snapshot.money, 0)
    + n(snapshot.unresolved, 0) * 3
    + n(snapshot.finalePressurePeak, 0) * 7;
  const title = pickVariant(ENDING_TITLE_VARIANTS[family] || [], seed + n(snapshot.forceHeavy, 0)) || ending.title;
  const taglineVariant = pickVariant(ENDING_TAGLINE_VARIANTS[family] || [], seed + n(snapshot.cleanResolutions, 0));
  const tagline = taglineVariant || buildEndingTagline(family, grade.grade);
  const presentationFamily = resolvePresentationFamily(family, grade.grade);

  const summary = `Across ${Math.max(1, nights.length)} nights, the motel settled into ${ending.title.toLowerCase()}. `
    + `You closed with reputation ${snapshot.reputation}, $${snapshot.money}, and an average power stability of ${Math.round(snapshot.powerAvg)}%.`;

  const dramaticSummary = `By the end of the campaign, ${title.toLowerCase()} defined the property. `
    + `The final ledger closed at Reputation ${snapshot.reputation}, $${snapshot.money}, and ${Math.round(snapshot.powerAvg)}% average grid stability — `
    + `enough to keep the sign lit, but not enough to erase what the week demanded.`;

  const rareMoments = Array.isArray(state?.contentHistory?.rareMomentsSeen)
    ? state.contentHistory.rareMomentsSeen.length
    : 0;

  const finaleIntegrationLine = snapshot.finalePerformanceLabel
    ? `Finale integration: ${snapshot.finalePerformanceLabel}.`
    : 'Finale integration: pressure peaked without a distinct finale profile.';

  const notes = [
    snapshot.endingMood ? `Late-run identity: ${snapshot.endingMood}` : '',
    snapshot.finalePerformanceLabel ? `Finale assessment: ${snapshot.finalePerformanceLabel}` : '',
    `Milestone nights survived: ${n(campaign?.milestoneNightsSurvived, 0)}`,
    `Policy overrides recorded: ${snapshot.policyBreaks}`,
    `Unresolved pressure events: ${snapshot.unresolved}`,
    `Special + event containment wins: ${snapshot.cleanResolutions}`,
    rareMoments > 0 ? `Rare run moments surfaced: ${rareMoments}` : '',
    finaleIntegrationLine
  ].slice(0, 4);

  const tags = [
    `Difficulty: ${difficultyLabel}`,
    contractLabels.length ? `Contracts: ${contractLabels.join(', ')}` : 'Contracts: None',
    snapshot.finalePerformanceKey.includes('stabilized') ? 'Finale Stabilized' : '',
    snapshot.finalePerformanceKey.includes('barely-contained') ? 'Finale Barely Contained' : '',
    snapshot.finalePerformanceKey.includes('lost-control') ? 'Finale Control Lost' : '',
    tendencies.control >= 5 ? 'Control-Heavy' : '',
    tendencies.compassion >= 5 ? 'Guest-Facing' : '',
    tendencies.secrecy >= 5 ? 'Discreet' : '',
    snapshot.forceHeavy >= 4 ? 'Force-Driven' : '',
    snapshot.unresolved >= 5 ? 'High Carryover' : ''
  ].filter(Boolean).slice(0, 4);

  return {
    key: ending.key,
    family,
    presentationFamily,
    title,
    subtitle: ending.subtitle,
    tagline,
    grade: grade.grade,
    gradeLabel: grade.label,
    campaignLine: `Campaign complete — ${Math.max(1, nights.length)} / ${Math.max(1, n(campaign?.length, nights.length || 1))} nights cleared.`,
    setupLine: runSetupSummary?.setupLine || `Difficulty: ${difficultyLabel} • Contracts: ${contractLabels.length ? contractLabels.join(', ') : 'None'}`,
    runSetupSummary,
    summary,
    dramaticSummary,
    finaleContextLine: snapshot.finalePerformanceLine || 'Final-night context unavailable for this campaign close.',
    doctrineLine: doctrineOutcome({ ...doctrineDisplay, tendencies }),
    climateLine: climateOutcome(factions),
    pressureLine: `Trust / Hostility / Oversight: ${n(factions.guests, 0)} / ${Math.max(0, -n(factions.locals, 0))} / ${Math.max(0, -n(factions.ownership, 0))}`,
    postureLine: postureOutcome(tendencies),
    notes,
    tags,
    stats: {
      reputation: snapshot.reputation,
      money: snapshot.money,
      avgPower: Math.round(snapshot.powerAvg),
      unresolved: snapshot.unresolved,
      milestoneNights: n(campaign?.milestoneNightsSurvived, 0)
    }
  };
}
