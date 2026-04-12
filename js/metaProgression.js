const META_SAVE_KEY = 'dead-end-motel-meta-v1';

const GRADE_ORDER = ['E', 'D', 'C', 'B', 'A', 'S'];

const DEFAULT_META_STATE = Object.freeze({
  version: 1,
  points: 0,
  totalPointsEarned: 0,
  totalPointsSpent: 0,
  totalRunsCompleted: 0,
  campaignWins: 0,
  campaignFailures: 0,
  totalNightsSurvived: 0,
  bestEndingGrade: null,
  endingsDiscovered: [],
  endingFamiliesDiscovered: [],
  doctrinePathsDiscovered: [],
  factionClimatesDiscovered: [],
  specialEncountersSeen: [],
  nightEventsSeen: [],
  threadFamiliesSeen: [],
  rareMomentsSeen: [],
  runsByDifficulty: {
    casual: 0,
    standard: 0,
    hard: 0,
    nightmare: 0
  },
  winsByDifficulty: {
    casual: 0,
    standard: 0,
    hard: 0,
    nightmare: 0
  },
  bestGradeByDifficulty: {
    casual: null,
    standard: null,
    hard: null,
    nightmare: null
  },
  contractsCompleted: [],
  contractRunsById: {},
  endingConditionCombos: [],
  goalMilestones: [],
  bestCampaignScore: 0,
  currentWinStreak: 0,
  longestWinStreak: 0,
  purchasedPerkIds: [],
  selectedPerkId: null,
  bestCampaignStats: {
    reputation: 0,
    power: 0,
    money: 0
  },
  lastRunReward: null,
  lastUpdatedAt: 0
});

const META_PERK_CATALOG = Object.freeze([
  {
    id: 'emergency-float',
    title: 'Emergency Float',
    description: 'Start each fresh campaign run with extra operating cash.',
    effectLabel: '+$25 run-start money',
    cost: 16,
    unlock: { type: 'runs', value: 1 }
  },
  {
    id: 'reserve-cell',
    title: 'Reserve Cell',
    description: 'Start each campaign with one extra generator reserve charge.',
    effectLabel: '+1 generator reserve at Night 1 start',
    cost: 22,
    unlock: { type: 'runs', value: 2 }
  },
  {
    id: 'desk-whispers',
    title: 'Desk Whispers',
    description: 'Early shift clue visibility improves for front desk risk reads.',
    effectLabel: 'Slightly better clue visibility at campaign start',
    cost: 20,
    unlock: { type: 'endings', value: 2 }
  },
  {
    id: 'first-night-reroll',
    title: 'First Night Reroll',
    description: 'Unlock one reroll of the opening scenario before Night 1 starts.',
    effectLabel: '1x first-night scenario reroll per run',
    cost: 18,
    unlock: { type: 'wins', value: 1 }
  }
]);

function toUniqueList(value, limit = 200) {
  if (!Array.isArray(value)) return [];
  const unique = [];
  value.forEach((entry) => {
    const id = String(entry || '').trim();
    if (!id || unique.includes(id)) return;
    unique.push(id);
  });
  return unique.slice(0, Math.max(1, limit));
}

function toNumber(value, fallback = 0) {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}

function clamp(value, min = 0, max = 999999) {
  return Math.max(min, Math.min(max, toNumber(value, min)));
}

function normalizeBestStats(stats = {}) {
  return {
    reputation: Math.max(0, toNumber(stats.reputation, 0)),
    power: Math.max(0, toNumber(stats.power, 0)),
    money: Math.max(0, toNumber(stats.money, 0))
  };
}

function normalizeGrade(value) {
  const grade = String(value || '').trim().toUpperCase();
  return GRADE_ORDER.includes(grade) ? grade : null;
}

function getGradeRank(grade) {
  const normalized = normalizeGrade(grade);
  return normalized ? GRADE_ORDER.indexOf(normalized) : -1;
}

function detectFactionBand(score = 0) {
  if (score <= -6) return 'Hostile';
  if (score <= -2) return 'Wary';
  if (score < 3) return 'Neutral';
  if (score < 7) return 'Favorable';
  return 'Strong';
}

function buildFactionClimateSignature(state = {}) {
  const factions = state?.factions || {};
  const guestsBand = detectFactionBand(toNumber(factions.guests, 0));
  const localsBand = detectFactionBand(toNumber(factions.locals, 0));
  const ownershipBand = detectFactionBand(toNumber(factions.ownership, 0));
  return `Guests ${guestsBand} • Locals ${localsBand} • Ownership ${ownershipBand}`;
}

function resolveEndingFamily(ending = {}) {
  const explicit = String(ending?.family || '').trim().toLowerCase();
  if (explicit) return explicit;
  const key = String(ending?.key || '').trim().toLowerCase();
  if (key.includes('control')) return 'controlled';
  if (key.includes('cold') || key.includes('quiet') || key.includes('silent')) return 'cold';
  if (key.includes('cracking') || key.includes('chaos')) return 'collapse';
  if (key.includes('fragile') || key.includes('unsteady')) return 'fragile';
  return 'stable';
}

function getPerkUnlockStatus(metaState, perk) {
  const rule = perk?.unlock || {};
  const type = String(rule.type || 'none');
  const value = Math.max(0, toNumber(rule.value, 0));
  if (!value || type === 'none') {
    return { unlocked: true, requirementLabel: 'Available' };
  }

  if (type === 'runs') {
    const unlocked = toNumber(metaState.totalRunsCompleted, 0) >= value;
    return { unlocked, requirementLabel: `Reach ${value} completed run${value === 1 ? '' : 's'}` };
  }
  if (type === 'wins') {
    const unlocked = toNumber(metaState.campaignWins, 0) >= value;
    return { unlocked, requirementLabel: `Win ${value} campaign${value === 1 ? '' : 's'}` };
  }
  if (type === 'endings') {
    const discovered = Array.isArray(metaState.endingsDiscovered) ? metaState.endingsDiscovered.length : 0;
    const unlocked = discovered >= value;
    return { unlocked, requirementLabel: `Discover ${value} unique ending${value === 1 ? '' : 's'}` };
  }

  return { unlocked: true, requirementLabel: 'Available' };
}

function ensureObject(value, fallback = {}) {
  return value && typeof value === 'object' ? value : fallback;
}

function normalizeDifficultyId(value) {
  const id = String(value || 'standard').trim().toLowerCase();
  return ['casual', 'standard', 'hard', 'nightmare'].includes(id) ? id : 'standard';
}

function normalizeDifficultyCounterMap(raw = {}) {
  const source = ensureObject(raw, {});
  return {
    casual: Math.max(0, clamp(source.casual, 0)),
    standard: Math.max(0, clamp(source.standard, 0)),
    hard: Math.max(0, clamp(source.hard, 0)),
    nightmare: Math.max(0, clamp(source.nightmare, 0))
  };
}

function normalizeBestGradeByDifficulty(raw = {}) {
  const source = ensureObject(raw, {});
  return {
    casual: normalizeGrade(source.casual),
    standard: normalizeGrade(source.standard),
    hard: normalizeGrade(source.hard),
    nightmare: normalizeGrade(source.nightmare)
  };
}

function buildGoalMilestones({ difficultyId, contractIds, ending, state }) {
  const milestones = [];
  if (difficultyId === 'hard' || difficultyId === 'nightmare') {
    milestones.push('complete-hardline-run');
  }
  if (Array.isArray(contractIds) && contractIds.length > 0) {
    milestones.push('complete-contract-run');
  }
  if (Number(state?.factions?.guests || 0) >= 6) {
    milestones.push('high-guest-trust-finish');
  }
  if (Number(state?.factions?.ownership || 0) >= 6) {
    milestones.push('high-ownership-approval-finish');
  }
  if (difficultyId !== 'casual' && Number(state?.finalePressurePeak || 0) >= 5) {
    milestones.push('survive-high-finale-pressure');
  }
  if (String(ending?.family || '').toLowerCase()) {
    milestones.push(`ending-family-${String(ending.family).toLowerCase()}`);
  }
  return toUniqueList(milestones, 20);
}

export function normalizeMetaState(rawMeta = {}) {
  const base = ensureObject(rawMeta, {});
  const normalized = {
    ...DEFAULT_META_STATE,
    ...base,
    version: 1,
    points: Math.max(0, clamp(base.points, 0)),
    totalPointsEarned: Math.max(0, clamp(base.totalPointsEarned, 0)),
    totalPointsSpent: Math.max(0, clamp(base.totalPointsSpent, 0)),
    totalRunsCompleted: Math.max(0, clamp(base.totalRunsCompleted, 0)),
    campaignWins: Math.max(0, clamp(base.campaignWins, 0)),
    campaignFailures: Math.max(0, clamp(base.campaignFailures, 0)),
    totalNightsSurvived: Math.max(0, clamp(base.totalNightsSurvived, 0)),
    bestEndingGrade: normalizeGrade(base.bestEndingGrade),
    endingsDiscovered: toUniqueList(base.endingsDiscovered, 240),
    endingFamiliesDiscovered: toUniqueList(base.endingFamiliesDiscovered, 40),
    doctrinePathsDiscovered: toUniqueList(base.doctrinePathsDiscovered, 80),
    factionClimatesDiscovered: toUniqueList(base.factionClimatesDiscovered, 80),
    specialEncountersSeen: toUniqueList(base.specialEncountersSeen, 300),
    nightEventsSeen: toUniqueList(base.nightEventsSeen, 300),
    threadFamiliesSeen: toUniqueList(base.threadFamiliesSeen, 300),
    rareMomentsSeen: toUniqueList(base.rareMomentsSeen, 300),
    runsByDifficulty: normalizeDifficultyCounterMap(base.runsByDifficulty),
    winsByDifficulty: normalizeDifficultyCounterMap(base.winsByDifficulty),
    bestGradeByDifficulty: normalizeBestGradeByDifficulty(base.bestGradeByDifficulty),
    contractsCompleted: toUniqueList(base.contractsCompleted, 200),
    contractRunsById: ensureObject(base.contractRunsById, {}),
    endingConditionCombos: toUniqueList(base.endingConditionCombos, 500),
    goalMilestones: toUniqueList(base.goalMilestones, 80),
    bestCampaignScore: Math.max(0, clamp(base.bestCampaignScore, 0)),
    currentWinStreak: Math.max(0, clamp(base.currentWinStreak, 0)),
    longestWinStreak: Math.max(0, clamp(base.longestWinStreak, 0)),
    purchasedPerkIds: toUniqueList(base.purchasedPerkIds, 30),
    selectedPerkId: base.selectedPerkId ? String(base.selectedPerkId) : null,
    bestCampaignStats: normalizeBestStats(base.bestCampaignStats),
    lastRunReward: base.lastRunReward && typeof base.lastRunReward === 'object' ? base.lastRunReward : null,
    lastUpdatedAt: Math.max(0, clamp(base.lastUpdatedAt, 0))
  };

  if (normalized.selectedPerkId && !normalized.purchasedPerkIds.includes(normalized.selectedPerkId)) {
    normalized.selectedPerkId = null;
  }

  return normalized;
}

export function loadMetaState() {
  try {
    const raw = localStorage.getItem(META_SAVE_KEY);
    if (!raw) return normalizeMetaState();
    return normalizeMetaState(JSON.parse(raw));
  } catch (error) {
    console.warn('[metaProgression] Failed to load meta state safely:', error?.message || error);
    return normalizeMetaState();
  }
}

export function saveMetaState(metaState) {
  const normalized = normalizeMetaState(metaState);
  normalized.lastUpdatedAt = Date.now();
  try {
    localStorage.setItem(META_SAVE_KEY, JSON.stringify(normalized));
  } catch (error) {
    // Release safety: never break gameplay flow if persistent storage is unavailable.
    console.warn('[metaProgression] Failed to save meta state safely:', error?.message || error);
  }
  return normalized;
}

export function getMetaPerkCatalog(metaState) {
  const meta = normalizeMetaState(metaState);
  return META_PERK_CATALOG.map((perk) => {
    const unlock = getPerkUnlockStatus(meta, perk);
    const owned = meta.purchasedPerkIds.includes(perk.id);
    return {
      ...perk,
      unlocked: unlock.unlocked,
      requirementLabel: unlock.requirementLabel,
      owned,
      canBuy: unlock.unlocked && !owned && meta.points >= perk.cost,
      selected: meta.selectedPerkId === perk.id
    };
  });
}

export function purchaseMetaPerk(metaState, perkId) {
  const meta = normalizeMetaState(metaState);
  const perk = META_PERK_CATALOG.find((entry) => entry.id === perkId);
  if (!perk) {
    return { ok: false, reason: 'Unknown perk.' };
  }

  const unlock = getPerkUnlockStatus(meta, perk);
  if (!unlock.unlocked) {
    return { ok: false, reason: unlock.requirementLabel };
  }
  if (meta.purchasedPerkIds.includes(perk.id)) {
    return { ok: false, reason: 'Perk already unlocked.' };
  }
  if (meta.points < perk.cost) {
    return { ok: false, reason: 'Not enough Archive Points.' };
  }

  meta.points = Math.max(0, meta.points - perk.cost);
  meta.totalPointsSpent = Math.max(0, toNumber(meta.totalPointsSpent, 0) + perk.cost);
  meta.purchasedPerkIds = [...meta.purchasedPerkIds, perk.id];
  if (!meta.selectedPerkId) {
    meta.selectedPerkId = perk.id;
  }

  return {
    ok: true,
    meta,
    perk,
    pointsRemaining: meta.points
  };
}

export function setSelectedMetaPerk(metaState, perkId = null) {
  const meta = normalizeMetaState(metaState);
  const safePerkId = perkId ? String(perkId) : null;
  if (!safePerkId) {
    meta.selectedPerkId = null;
    return { ok: true, meta };
  }
  if (!meta.purchasedPerkIds.includes(safePerkId)) {
    return { ok: false, reason: 'Perk is not unlocked yet.' };
  }
  meta.selectedPerkId = safePerkId;
  return { ok: true, meta };
}

export function applySelectedMetaPerkToRunState(state, metaState) {
  if (!state || typeof state !== 'object') {
    return { state, selectedPerkId: null, appliedEffects: [], rerollAvailable: false };
  }

  const meta = normalizeMetaState(metaState);
  const selectedPerkId = String(meta.selectedPerkId || '');
  const appliedEffects = [];
  let rerollAvailable = false;

  state.metaRunState = state.metaRunState && typeof state.metaRunState === 'object'
    ? state.metaRunState
    : {};
  state.metaRunState.selectedPerkId = selectedPerkId || null;
  state.metaRunState.rerollAvailable = false;
  state.metaRunState.rerollUsed = Boolean(state.metaRunState.rerollUsed);
  state.metaRunState.clueBoost = false;

  if (!selectedPerkId || !meta.purchasedPerkIds.includes(selectedPerkId)) {
    return { state, selectedPerkId: null, appliedEffects, rerollAvailable: false };
  }

  if (selectedPerkId === 'emergency-float') {
    state.money = Math.max(0, toNumber(state.money, 0) + 25);
    appliedEffects.push('Meta Perk: Emergency Float granted +$25 starting funds.');
  }

  if (selectedPerkId === 'reserve-cell') {
    const powerEconomy = state.powerEconomy && typeof state.powerEconomy === 'object' ? state.powerEconomy : {};
    powerEconomy.restoreCharges = Math.max(0, toNumber(powerEconomy.restoreCharges, 0) + 1);
    state.powerEconomy = powerEconomy;
    appliedEffects.push('Meta Perk: Reserve Cell added +1 generator reserve charge.');
  }

  if (selectedPerkId === 'desk-whispers') {
    state.metaRunState.clueBoost = true;
    appliedEffects.push('Meta Perk: Desk Whispers sharpened front desk clue visibility.');
  }

  if (selectedPerkId === 'first-night-reroll') {
    rerollAvailable = !state.metaRunState.rerollUsed;
    state.metaRunState.rerollAvailable = rerollAvailable;
    appliedEffects.push('Meta Perk: First Night Reroll is available before shift start.');
  }

  return {
    state,
    selectedPerkId,
    appliedEffects,
    rerollAvailable
  };
}

export function consumeFirstNightReroll(state) {
  if (!state?.metaRunState) return false;
  if (!state.metaRunState.rerollAvailable || state.metaRunState.rerollUsed) return false;
  state.metaRunState.rerollUsed = true;
  state.metaRunState.rerollAvailable = false;
  return true;
}

export function applyRunCompletionMetaRewards(metaState, payload = {}) {
  const meta = normalizeMetaState(metaState);
  const ending = ensureObject(payload.ending, {});
  const state = ensureObject(payload.state, {});
  const campaign = ensureObject(state.campaign, {});
  const totals = ensureObject(campaign.totals, {});
  const nightsCleared = Math.max(1, toNumber(campaign.campaignNightsCompleted, state.night || 1));
  const grade = normalizeGrade(ending.grade) || 'C';
  const gradeBonusMap = { S: 18, A: 14, B: 11, C: 8, D: 5, E: 3 };
  const gradeBonus = gradeBonusMap[grade] || 6;
  const nightBonus = Math.max(2, Math.min(8, nightsCleared + 1));
  const successBonus = Boolean(campaign.finaleSurvived) ? 6 : 2;
  const qualityBonus = Math.max(
    -2,
    Math.min(
      5,
      toNumber(totals.sceneResolved, 0)
      + toNumber(totals.nightEventsResolved, 0)
      - toNumber(totals.policyBreaks, 0)
      - toNumber(totals.nightEventsMissed, 0)
    )
  );
  const pointsEarned = Math.max(3, gradeBonus + nightBonus + successBonus + qualityBonus);
  const difficultyId = normalizeDifficultyId(state?.runSetup?.difficultyId || 'standard');
  const contractIds = toUniqueList(state?.runSetup?.contractIds, 3);
  const setupBonusPercent = Math.max(0, clamp(state?.runSetupSummary?.rewardBonusPercent ?? state?.runModifiers?.archiveBonusPercent ?? 0, 0, 400));
  const setupBonusPoints = Math.max(0, Math.round(pointsEarned * (setupBonusPercent / 100)));
  const totalPointsEarnedThisRun = Math.max(1, pointsEarned + setupBonusPoints);

  const endingFamily = resolveEndingFamily(ending);
  const doctrinePath = String(
    state?.doctrineDisplay?.id
    || state?.doctrine?.profileId
    || state?.doctrine?.baselineProfileId
    || 'unknown-doctrine'
  );
  const factionClimateSignature = buildFactionClimateSignature(state);
  const specialIds = toUniqueList(state?.contentHistory?.recentSpecialEncounterIds, 100);
  const nightEventIds = toUniqueList(state?.contentHistory?.recentNightEventIds, 100);
  const threadFamilyIds = toUniqueList(state?.contentHistory?.seenThreadFamilies, 120);
  const rareMomentIds = toUniqueList(state?.contentHistory?.rareMomentsSeen, 120);

  const availableBefore = getMetaPerkCatalog(meta)
    .filter((entry) => entry.unlocked)
    .map((entry) => entry.id);

  const newDiscoveries = {
    endings: [],
    endingFamilies: [],
    doctrinePaths: [],
    factionClimates: [],
    specialEncounters: [],
    nightEvents: [],
    threadFamilies: [],
    rareMoments: [],
    difficulties: [],
    contracts: [],
    endingConditions: [],
    goals: []
  };

  const pushDiscovery = (key, targetList, value) => {
    const normalizedValue = String(value || '').trim();
    if (!normalizedValue) return;
    if (targetList.includes(normalizedValue)) return;
    targetList.push(normalizedValue);
    newDiscoveries[key].push(normalizedValue);
  };

  meta.points = Math.max(0, toNumber(meta.points, 0) + totalPointsEarnedThisRun);
  meta.totalPointsEarned = Math.max(0, toNumber(meta.totalPointsEarned, 0) + totalPointsEarnedThisRun);
  meta.totalRunsCompleted = Math.max(0, toNumber(meta.totalRunsCompleted, 0) + 1);
  meta.campaignWins = Math.max(0, toNumber(meta.campaignWins, 0) + 1);
  meta.totalNightsSurvived = Math.max(0, toNumber(meta.totalNightsSurvived, 0) + nightsCleared);
  meta.runsByDifficulty = normalizeDifficultyCounterMap(meta.runsByDifficulty);
  meta.winsByDifficulty = normalizeDifficultyCounterMap(meta.winsByDifficulty);
  meta.bestGradeByDifficulty = normalizeBestGradeByDifficulty(meta.bestGradeByDifficulty);
  meta.runsByDifficulty[difficultyId] = Math.max(0, toNumber(meta.runsByDifficulty[difficultyId], 0) + 1);
  meta.winsByDifficulty[difficultyId] = Math.max(0, toNumber(meta.winsByDifficulty[difficultyId], 0) + 1);
  pushDiscovery('difficulties', meta.endingConditionCombos, `difficulty-${difficultyId}`);
  contractIds.forEach((id) => {
    pushDiscovery('contracts', meta.contractsCompleted, id);
  });
  meta.contractRunsById = ensureObject(meta.contractRunsById, {});
  contractIds.forEach((id) => {
    meta.contractRunsById[id] = Math.max(0, toNumber(meta.contractRunsById[id], 0) + 1);
  });
  const endingComboSignature = [
    `ending:${String(ending?.key || 'unknown')}`,
    `difficulty:${difficultyId}`,
    contractIds.length ? `contracts:${contractIds.sort().join('+')}` : 'contracts:none'
  ].join('|');
  pushDiscovery('endingConditions', meta.endingConditionCombos, endingComboSignature);

  const scoreNow = Math.max(0, toNumber(state?.campaign?.totals?.score, 0));
  meta.bestCampaignScore = Math.max(toNumber(meta.bestCampaignScore, 0), scoreNow);
  meta.currentWinStreak = Math.max(0, toNumber(meta.currentWinStreak, 0) + 1);
  meta.longestWinStreak = Math.max(toNumber(meta.longestWinStreak, 0), toNumber(meta.currentWinStreak, 0));

  const unlockedGoals = buildGoalMilestones({ difficultyId, contractIds, ending, state });
  unlockedGoals.forEach((goalId) => pushDiscovery('goals', meta.goalMilestones, goalId));

  const bestGrade = normalizeGrade(meta.bestEndingGrade);
  if (!bestGrade || getGradeRank(grade) > getGradeRank(bestGrade)) {
    meta.bestEndingGrade = grade;
  }
  const bestDifficultyGrade = normalizeGrade(meta.bestGradeByDifficulty[difficultyId]);
  if (!bestDifficultyGrade || getGradeRank(grade) > getGradeRank(bestDifficultyGrade)) {
    meta.bestGradeByDifficulty[difficultyId] = grade;
  }

  pushDiscovery('endings', meta.endingsDiscovered, ending.key || ending.title || 'unknown-ending');
  pushDiscovery('endingFamilies', meta.endingFamiliesDiscovered, endingFamily);
  pushDiscovery('doctrinePaths', meta.doctrinePathsDiscovered, doctrinePath);
  pushDiscovery('factionClimates', meta.factionClimatesDiscovered, factionClimateSignature);
  specialIds.forEach((id) => pushDiscovery('specialEncounters', meta.specialEncountersSeen, id));
  nightEventIds.forEach((id) => pushDiscovery('nightEvents', meta.nightEventsSeen, id));
  threadFamilyIds.forEach((id) => pushDiscovery('threadFamilies', meta.threadFamiliesSeen, id));
  rareMomentIds.forEach((id) => pushDiscovery('rareMoments', meta.rareMomentsSeen, id));

  const finalReputation = Math.max(0, toNumber(ending?.stats?.reputation, state?.reputation || 0));
  const finalPower = Math.max(0, toNumber(state?.power, ending?.stats?.avgPower || 0));
  const finalMoney = Math.max(0, toNumber(ending?.stats?.money, state?.money || 0));
  meta.bestCampaignStats = {
    reputation: Math.max(toNumber(meta?.bestCampaignStats?.reputation, 0), finalReputation),
    power: Math.max(toNumber(meta?.bestCampaignStats?.power, 0), finalPower),
    money: Math.max(toNumber(meta?.bestCampaignStats?.money, 0), finalMoney)
  };

  const availableAfter = getMetaPerkCatalog(meta)
    .filter((entry) => entry.unlocked)
    .map((entry) => entry.id);
  const newlyAvailablePerks = availableAfter.filter((id) => !availableBefore.includes(id));

  const reward = {
    pointsEarned,
    setupBonusPoints,
    totalAwarded: totalPointsEarnedThisRun,
    difficultyId,
    contractIds,
    setupBonusPercent,
    totalPoints: meta.points,
    breakdown: {
      gradeBonus,
      nightBonus,
      successBonus,
      qualityBonus
    },
    newlyAvailablePerks,
    newDiscoveries,
    nightsCleared,
    grade,
    endingKey: ending?.key || null,
    awardedAt: Date.now()
  };

  meta.lastRunReward = reward;
  meta.lastUpdatedAt = Date.now();

  return {
    meta,
    reward
  };
}

export function registerCampaignFailureMeta(metaState, payload = {}) {
  const meta = normalizeMetaState(metaState);
  const state = ensureObject(payload.state, {});
  const hadMeaningfulProgress =
    Boolean(state?.failedState)
    || toNumber(state?.night, 1) > 1
    || toNumber(state?.campaign?.campaignNightsCompleted, 0) > 0;

  if (!hadMeaningfulProgress) {
    return { meta, recorded: false };
  }

  meta.totalRunsCompleted = Math.max(0, toNumber(meta.totalRunsCompleted, 0) + 1);
  meta.campaignFailures = Math.max(0, toNumber(meta.campaignFailures, 0) + 1);
  meta.currentWinStreak = 0;
  meta.totalNightsSurvived = Math.max(
    0,
    toNumber(meta.totalNightsSurvived, 0) + Math.max(1, toNumber(state?.campaign?.campaignNightsCompleted, state?.night || 1))
  );
  meta.lastUpdatedAt = Date.now();

  return {
    meta,
    recorded: true
  };
}

export function buildMetaArchiveSummary(metaState) {
  const meta = normalizeMetaState(metaState);
  const contractsCompleted = Array.isArray(meta.contractsCompleted) ? meta.contractsCompleted : [];
  const runsByDifficulty = normalizeDifficultyCounterMap(meta.runsByDifficulty);
  const winsByDifficulty = normalizeDifficultyCounterMap(meta.winsByDifficulty);
  const bestGradeByDifficulty = normalizeBestGradeByDifficulty(meta.bestGradeByDifficulty);
  return {
    points: meta.points,
    totalRunsCompleted: meta.totalRunsCompleted,
    campaignWins: meta.campaignWins,
    campaignFailures: meta.campaignFailures,
    totalNightsSurvived: meta.totalNightsSurvived,
    bestEndingGrade: meta.bestEndingGrade || '-',
    endingsDiscoveredCount: meta.endingsDiscovered.length,
    specialEncounterCount: meta.specialEncountersSeen.length,
    nightEventCount: meta.nightEventsSeen.length,
    threadFamilyCount: meta.threadFamiliesSeen.length,
    rareMomentCount: meta.rareMomentsSeen.length,
    doctrinePathCount: meta.doctrinePathsDiscovered.length,
    factionClimateCount: meta.factionClimatesDiscovered.length,
    bestCampaignStats: { ...meta.bestCampaignStats },
    runsByDifficulty,
    winsByDifficulty,
    bestGradeByDifficulty,
    contractsCompletedCount: contractsCompleted.filter((id) => !String(id).startsWith('difficulty-')).length,
    contractRunsById: { ...ensureObject(meta.contractRunsById, {}) },
    endingConditionComboCount: meta.endingConditionCombos.length,
    goalMilestoneCount: meta.goalMilestones.length,
    bestCampaignScore: Math.max(0, toNumber(meta.bestCampaignScore, 0)),
    currentWinStreak: Math.max(0, toNumber(meta.currentWinStreak, 0)),
    longestWinStreak: Math.max(0, toNumber(meta.longestWinStreak, 0))
  };
}
