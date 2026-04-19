const DEFAULT_SETUP = Object.freeze({
  difficultyId: 'standard',
  campaignMode: 'short',
  contractIds: [],
  locked: false,
  modifiersApplied: false
});

export function createDefaultRunSetup() {
  return {
    difficultyId: DEFAULT_SETUP.difficultyId,
    campaignMode: DEFAULT_SETUP.campaignMode,
    contractIds: [],
    locked: false,
    modifiersApplied: false
  };
}

const CAMPAIGN_MODE_PRESETS = Object.freeze([
  {
    id: 'short',
    label: 'Short (5 Nights)',
    campaignLength: 5,
    description: 'Classic campaign length with tighter pacing.',
    modifiers: {}
  },
  {
    id: 'full',
    label: 'Full (10 Nights)',
    campaignLength: 10,
    description: 'Long-run escalation with higher sustained pressure.',
    modifiers: {
      pressureScale: 1.08,
      passiveDrainMult: 1.06,
      eventTriggerBonus: 0.02,
      anomalyChanceBonus: 0.02,
      guestRiskBonus: 1,
      finalePressureScale: 1.1
    }
  },
  {
    id: 'endless',
    label: 'Endless Shift (Survival)',
    campaignLength: 999,
    description: 'Official survival mode: no campaign finale cadence. Waves, contracts, and scoring stack forever.',
    modifiers: {
      pressureScale: 1.05,
      passiveDrainMult: 1.04,
      eventTriggerBonus: 0.02,
      guestRiskBonus: 1
    }
  }
]);

const DIFFICULTY_PRESETS = Object.freeze([
  {
    id: 'casual',
    label: 'Casual',
    description: 'More forgiving pressure and economy for relaxed campaign clears.',
    archiveBonusPercent: 0,
    modifiers: {
      pressureScale: 0.88,
      moneyIncomeMult: 1.15,
      actionCostMult: 0.92,
      passiveDrainMult: 0.9,
      restoreCostDelta: -2,
      restoreGainMult: 1.1,
      eventTriggerBonus: -0.03,
      anomalyChanceBonus: -0.04,
      guestRiskBonus: -1,
      finalePressureScale: 0.88
    }
  },
  {
    id: 'standard',
    label: 'Standard',
    description: 'Baseline campaign tuning.',
    archiveBonusPercent: 0,
    modifiers: {}
  },
  {
    id: 'hard',
    label: 'Hard',
    description: 'Higher strain and tighter economy with stronger pressure recursion.',
    archiveBonusPercent: 20,
    modifiers: {
      pressureScale: 1.1,
      moneyIncomeMult: 0.93,
      actionCostMult: 1.08,
      passiveDrainMult: 1.1,
      restoreCostDelta: 2,
      restoreGainMult: 0.92,
      eventTriggerBonus: 0.03,
      anomalyChanceBonus: 0.04,
      guestRiskBonus: 1,
      finalePressureScale: 1.12
    }
  },
  {
    id: 'nightmare',
    label: 'Nightmare',
    description: 'Heavy long-run pressure with strict resource margins.',
    archiveBonusPercent: 45,
    modifiers: {
      pressureScale: 1.18,
      moneyIncomeMult: 0.86,
      actionCostMult: 1.14,
      passiveDrainMult: 1.2,
      restoreCostDelta: 4,
      restoreGainMult: 0.86,
      eventTriggerBonus: 0.06,
      anomalyChanceBonus: 0.07,
      guestRiskBonus: 2,
      finalePressureScale: 1.2
    }
  }
]);

const CONTRACT_CATALOG = Object.freeze([
  {
    id: 'tight-budget',
    label: 'Tight Budget',
    description: 'Run starts with less operating cash.',
    rewardBonusPercent: 12,
    modifiers: { startMoneyDelta: -30 }
  },
  {
    id: 'weak-grid',
    label: 'Weak Grid',
    description: 'Power systems are less stable and more expensive to stabilize.',
    rewardBonusPercent: 14,
    modifiers: { passiveDrainMult: 1.12, actionCostMult: 1.08, restoreGainMult: 0.9 }
  },
  {
    id: 'hostile-neighborhood',
    label: 'Hostile Neighborhood',
    description: 'Outside pressure and event intensity spike sooner.',
    rewardBonusPercent: 14,
    modifiers: { eventTriggerBonus: 0.03, guestRiskBonus: 1, pressureScale: 1.08 }
  },
  {
    id: 'quiet-handling-only',
    label: 'Quiet Handling Only',
    description: 'Forceful tactics carry a stronger reputation and trust penalty.',
    rewardBonusPercent: 11,
    modifiers: { harshActionPenaltyMult: 1.35 }
  },
  {
    id: 'strict-ownership-audit',
    label: 'Strict Ownership Audit',
    description: 'Ownership confidence drops faster from instability and overrides.',
    rewardBonusPercent: 13,
    modifiers: { ownershipPressureMult: 1.2, policyPenaltyMult: 1.2 }
  },
  {
    id: 'no-easy-restores',
    label: 'No Easy Restores',
    description: 'Backup generation tools are reduced and pricier.',
    rewardBonusPercent: 16,
    modifiers: { restoreChargesDelta: -1, restoreCostDelta: 4, restoreCooldownDelta: 1 }
  },
  {
    id: 'hardline-reputation-risk',
    label: 'Hardline Reputation Risk',
    description: 'Negative reputation swings hit harder throughout the run.',
    rewardBonusPercent: 12,
    modifiers: { reputationPenaltyMult: 1.22 }
  },
  {
    id: 'calm-shift-bonus',
    label: 'Calm Shift Bonus',
    description: 'Minimal direct penalties, but rewards are strongest with clean containment.',
    rewardBonusPercent: 8,
    modifiers: { calmShiftRewardBonus: 6 }
  },
  {
    id: 'limited-command-authority',
    label: 'Limited Command Authority',
    description: 'Final-night command responses are less efficient.',
    rewardBonusPercent: 13,
    modifiers: { finalePressureScale: 1.1, finaleCommandCostMult: 1.3 }
  }
]);

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Number(value) || 0));
}

function toUniqueList(value, limit = 2) {
  if (!Array.isArray(value)) return [];
  const unique = [];
  value.forEach((entry) => {
    const id = String(entry || '').trim();
    if (!id || unique.includes(id)) return;
    unique.push(id);
  });
  return unique.slice(0, limit);
}

export function getDifficultyCatalog() {
  return DIFFICULTY_PRESETS.map((entry) => ({ ...entry }));
}

export function getCampaignModeCatalog() {
  return CAMPAIGN_MODE_PRESETS.map((entry) => ({ ...entry }));
}

export function getCampaignLengthFromRunSetup(runSetup = {}) {
  const normalized = normalizeRunSetup(runSetup);
  const campaignMode =
    CAMPAIGN_MODE_PRESETS.find((entry) => entry.id === normalized.campaignMode) || CAMPAIGN_MODE_PRESETS[0];
  const raw = Number(campaignMode.campaignLength || 5);
  if (normalized.campaignMode === 'endless') return clamp(raw, 12, 999);
  return clamp(raw, 3, 12);
}

export function getContractCatalog() {
  return CONTRACT_CATALOG.map((entry) => ({ ...entry }));
}

export function normalizeRunSetup(runSetup = {}) {
  const difficultyIds = DIFFICULTY_PRESETS.map((entry) => entry.id);
  const campaignModeIds = CAMPAIGN_MODE_PRESETS.map((entry) => entry.id);
  const difficultyId = difficultyIds.includes(String(runSetup?.difficultyId || ''))
    ? String(runSetup.difficultyId)
    : DEFAULT_SETUP.difficultyId;
  const campaignMode = campaignModeIds.includes(String(runSetup?.campaignMode || ''))
    ? String(runSetup.campaignMode)
    : DEFAULT_SETUP.campaignMode;
  const contractIds = toUniqueList(runSetup?.contractIds, 2)
    .filter((id) => CONTRACT_CATALOG.some((entry) => entry.id === id));
  return {
    difficultyId,
    campaignMode,
    contractIds,
    locked: Boolean(runSetup?.locked),
    modifiersApplied: Boolean(runSetup?.modifiersApplied)
  };
}

export function withRunDifficulty(runSetup, difficultyId) {
  const next = normalizeRunSetup(runSetup);
  if (next.locked) return next;
  if (!DIFFICULTY_PRESETS.some((entry) => entry.id === difficultyId)) return next;
  return { ...next, difficultyId };
}

export function withRunCampaignMode(runSetup, campaignMode) {
  const next = normalizeRunSetup(runSetup);
  if (next.locked) return next;
  if (!CAMPAIGN_MODE_PRESETS.some((entry) => entry.id === campaignMode)) return next;
  return { ...next, campaignMode };
}

export function toggleRunContract(runSetup, contractId) {
  const next = normalizeRunSetup(runSetup);
  if (next.locked) return next;
  if (!CONTRACT_CATALOG.some((entry) => entry.id === contractId)) return next;
  const has = next.contractIds.includes(contractId);
  const contractIds = has
    ? next.contractIds.filter((id) => id !== contractId)
    : [...next.contractIds, contractId].slice(0, 2);
  return { ...next, contractIds };
}

export function lockRunSetup(runSetup) {
  return { ...normalizeRunSetup(runSetup), locked: true };
}

export function markRunSetupModifiersApplied(runSetup) {
  return { ...normalizeRunSetup(runSetup), modifiersApplied: true };
}

export function buildRunSetupSummary(runSetup = {}) {
  const normalized = normalizeRunSetup(runSetup);
  const difficulty = DIFFICULTY_PRESETS.find((entry) => entry.id === normalized.difficultyId) || DIFFICULTY_PRESETS[1];
  const campaignMode = CAMPAIGN_MODE_PRESETS.find((entry) => entry.id === normalized.campaignMode) || CAMPAIGN_MODE_PRESETS[0];
  const contracts = normalized.contractIds
    .map((id) => CONTRACT_CATALOG.find((entry) => entry.id === id))
    .filter(Boolean);
  return {
    difficultyId: difficulty.id,
    difficultyLabel: difficulty.label,
    campaignModeId: campaignMode.id,
    campaignModeLabel: campaignMode.label,
    campaignLength: Number(campaignMode.campaignLength || 5),
    contractIds: contracts.map((entry) => entry.id),
    contractLabels: contracts.map((entry) => entry.label),
    contractCount: contracts.length,
    setupLine: contracts.length
      ? `Mode: ${campaignMode.label} • Difficulty: ${difficulty.label} • Contracts: ${contracts.map((entry) => entry.label).join(', ')}`
      : `Mode: ${campaignMode.label} • Difficulty: ${difficulty.label} • Contracts: None`,
    rewardBonusPercent: getRunSetupModifierProfile(normalized).archiveBonusPercent
  };
}

export function getRunSetupModifierProfile(runSetup = {}) {
  const normalized = normalizeRunSetup(runSetup);
  const difficulty = DIFFICULTY_PRESETS.find((entry) => entry.id === normalized.difficultyId) || DIFFICULTY_PRESETS[1];
  const campaignMode = CAMPAIGN_MODE_PRESETS.find((entry) => entry.id === normalized.campaignMode) || CAMPAIGN_MODE_PRESETS[0];
  const contracts = normalized.contractIds
    .map((id) => CONTRACT_CATALOG.find((entry) => entry.id === id))
    .filter(Boolean);

  const profile = {
    pressureScale: 1,
    moneyIncomeMult: 1,
    actionCostMult: 1,
    passiveDrainMult: 1,
    restoreCostDelta: 0,
    restoreCooldownDelta: 0,
    restoreChargesDelta: 0,
    restoreGainMult: 1,
    eventTriggerBonus: 0,
    anomalyChanceBonus: 0,
    guestRiskBonus: 0,
    reputationPenaltyMult: 1,
    harshActionPenaltyMult: 1,
    policyPenaltyMult: 1,
    ownershipPressureMult: 1,
    finalePressureScale: 1,
    finaleCommandCostMult: 1,
    startMoneyDelta: 0,
    calmShiftRewardBonus: 0,
    archiveBonusPercent: clamp(difficulty.archiveBonusPercent, 0, 300)
  };

  const mergeModifiers = (mods = {}) => {
    Object.entries(mods).forEach(([key, value]) => {
      if (typeof value !== 'number') return;
      if (key.endsWith('Mult') || key.endsWith('Scale')) {
        profile[key] = clamp((profile[key] || 1) * value, 0.5, 3);
      } else {
        profile[key] = Number(profile[key] || 0) + value;
      }
    });
  };

  mergeModifiers(campaignMode.modifiers || {});
  mergeModifiers(difficulty.modifiers || {});
  contracts.forEach((contract) => {
    mergeModifiers(contract.modifiers || {});
    profile.archiveBonusPercent += clamp(contract.rewardBonusPercent, 0, 200);
  });

  profile.archiveBonusPercent = clamp(profile.archiveBonusPercent, 0, 400);
  return profile;
}