const UPGRADE_DEFS = Object.freeze([
  {
    id: 'surv-efficient-scans',
    title: 'Efficient Scan Routines',
    category: 'Surveillance',
    cost: 70,
    description: 'Camera sweeps consume less power.',
    oneTime: true,
    effects: {
      cameraScanCostMult: 0.8
    }
  },
  {
    id: 'surv-pattern-mapping',
    title: 'Pattern Mapping',
    category: 'Surveillance',
    cost: 95,
    description: 'Unresolved location issues are less likely to return on scans.',
    oneTime: true,
    effects: {
      unresolvedReturnChanceMult: 0.78
    }
  },
  {
    id: 'surv-investigation-routines',
    title: 'Investigation Protocol Kit',
    category: 'Surveillance',
    cost: 90,
    description: 'Investigations resolve anomalies more reliably with less pressure growth.',
    oneTime: true,
    effects: {
      investigationSuccessBonus: 0.08,
      cameraChainPressureMult: 0.82
    }
  },
  {
    id: 'desk-clue-lens',
    title: 'Front Desk Clue Lens',
    category: 'Front Desk',
    cost: 60,
    description: 'Reveals stronger clue lines when evaluating guests.',
    oneTime: true,
    effects: {
      frontDeskClueReveal: true
    }
  },
  {
    id: 'desk-policy-guardrails',
    title: 'Policy Guardrails',
    category: 'Front Desk',
    cost: 85,
    description: 'Reduces policy-related reputation penalties from desk decisions.',
    oneTime: true,
    effects: {
      deskPolicyPenaltyReduction: 1
    }
  },
  {
    id: 'power-load-balancer',
    title: 'Load Balancer Retrofit',
    category: 'Maintenance / Power',
    cost: 100,
    description: 'Passive power drain grows more slowly over actions.',
    oneTime: true,
    effects: {
      passiveDrainMult: 0.85
    }
  },
  {
    id: 'power-aux-generator',
    title: 'Aux Generator Reserve',
    category: 'Maintenance / Power',
    cost: 80,
    description: 'Adds one extra emergency generator charge each night.',
    oneTime: true,
    effects: {
      extraRestoreCharges: 1
    }
  },
  {
    id: 'power-fast-relays',
    title: 'Fast Relay Rebuild',
    category: 'Maintenance / Power',
    cost: 75,
    description: 'Emergency restore is cheaper and returns faster.',
    oneTime: true,
    effects: {
      restoreCostDelta: -3,
      restoreCooldownDelta: -1
    }
  },
  {
    id: 'response-dispatch-drills',
    title: 'Dispatch Drills',
    category: 'Response / Security',
    cost: 95,
    description: 'Improves staff dispatch success odds.',
    oneTime: true,
    effects: {
      dispatchSuccessBonus: 0.1
    }
  },
  {
    id: 'response-stabilization-team',
    title: 'Stabilization Team SOP',
    category: 'Response / Security',
    cost: 90,
    description: 'Tactical actions are safer and more likely to calm pressure afterward.',
    oneTime: true,
    effects: {
      tacticalPenaltyMult: 0.72,
      tacticalStabilizeChance: 0.24,
      tacticalChainCalmBonus: 1
    }
  }
]);

const DEFAULT_PROGRESS = Object.freeze({
  upgrades: {},
  ownedUpgradeIds: [],
  spentThisRun: 0,
  nightPrepVisited: false,
  runStats: {
    purchases: 0
  }
});

const DEFAULT_MODIFIERS = Object.freeze({
  cameraScanCostMult: 1,
  unresolvedReturnChanceMult: 1,
  investigationSuccessBonus: 0,
  cameraChainPressureMult: 1,
  frontDeskClueReveal: false,
  deskPolicyPenaltyReduction: 0,
  passiveDrainMult: 1,
  extraRestoreCharges: 0,
  restoreCostDelta: 0,
  restoreCooldownDelta: 0,
  dispatchSuccessBonus: 0,
  tacticalPenaltyMult: 1,
  tacticalStabilizeChance: 0,
  tacticalChainCalmBonus: 0
});

function toOwnedIds(progression) {
  const fromIds = Array.isArray(progression?.ownedUpgradeIds) ? progression.ownedUpgradeIds : [];
  const fromMap = Object.entries(progression?.upgrades || {})
    .filter(([, owned]) => Boolean(owned))
    .map(([id]) => id);
  return Array.from(new Set([...fromIds, ...fromMap]));
}

function buildOwnedMap(ownedIds) {
  return ownedIds.reduce((acc, id) => {
    acc[id] = true;
    return acc;
  }, {});
}

export function normalizeProgressionState(state) {
  const current = state?.progression || DEFAULT_PROGRESS;
  const ownedUpgradeIds = toOwnedIds(current).filter((id) => UPGRADE_DEFS.some((upgrade) => upgrade.id === id));

  return {
    ...state,
    progression: {
      upgrades: buildOwnedMap(ownedUpgradeIds),
      ownedUpgradeIds,
      spentThisRun: Math.max(0, Number(current.spentThisRun || 0)),
      nightPrepVisited: Boolean(current.nightPrepVisited),
      runStats: {
        purchases: Math.max(0, Number(current?.runStats?.purchases || 0))
      }
    }
  };
}

export function getUpgradeCatalog(state) {
  const owned = new Set(state?.progression?.ownedUpgradeIds || []);
  return UPGRADE_DEFS.map((upgrade) => ({
    ...upgrade,
    owned: owned.has(upgrade.id)
  }));
}

export function getOwnedUpgrades(state) {
  const owned = new Set(state?.progression?.ownedUpgradeIds || []);
  return UPGRADE_DEFS.filter((upgrade) => owned.has(upgrade.id));
}

export function getProgressionModifiers(state) {
  return getOwnedUpgrades(state).reduce((mods, upgrade) => {
    const effects = upgrade.effects || {};
    return {
      ...mods,
      ...Object.keys(effects).reduce((next, key) => {
        const value = effects[key];
        if (typeof value === 'boolean') {
          next[key] = Boolean(next[key]) || value;
        } else if (typeof value === 'number') {
          const base = Number(next[key]);
          if (key.endsWith('Mult')) {
            next[key] = base * value;
          } else {
            next[key] = base + value;
          }
        }
        return next;
      }, { ...mods })
    };
  }, { ...DEFAULT_MODIFIERS });
}

export function purchaseUpgrade(state, upgradeId) {
  const upgrade = UPGRADE_DEFS.find((entry) => entry.id === upgradeId);
  if (!upgrade) {
    return { ok: false, reason: 'Unknown upgrade.' };
  }
  const owned = new Set(state?.progression?.ownedUpgradeIds || []);
  if (owned.has(upgradeId)) {
    return { ok: false, reason: 'Upgrade already owned.' };
  }
  if ((state?.money || 0) < upgrade.cost) {
    return { ok: false, reason: 'Not enough money.' };
  }

  state.money = Math.max(0, Number(state.money || 0) - upgrade.cost);
  state.progression.ownedUpgradeIds = [...state.progression.ownedUpgradeIds, upgrade.id];
  state.progression.upgrades[upgrade.id] = true;
  state.progression.spentThisRun = Math.max(0, Number(state.progression.spentThisRun || 0)) + upgrade.cost;
  state.progression.runStats.purchases = Math.max(0, Number(state.progression?.runStats?.purchases || 0)) + 1;

  return { ok: true, upgrade };
}

export function setNightPrepVisited(state, visited = true) {
  if (!state?.progression) return;
  state.progression.nightPrepVisited = Boolean(visited);
}

export function applyNightStartProgression(state) {
  if (!state?.powerEconomy) return;
  const mods = getProgressionModifiers(state);
  if (mods.extraRestoreCharges > 0) {
    state.powerEconomy.restoreCharges = Math.max(
      0,
      Number(state.powerEconomy.restoreCharges || 0) + Math.floor(mods.extraRestoreCharges)
    );
  }
}

export function buildActiveUpgradeSummary(state) {
  const owned = getOwnedUpgrades(state);
  if (!owned.length) {
    return 'No active upgrades yet.';
  }
  return owned.map((entry) => entry.title).join(' • ');
}