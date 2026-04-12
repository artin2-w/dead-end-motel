import { getActionTimeCost } from './nightCycle.js';

const DEFAULT_POWER_ECONOMY = Object.freeze({
  restoreCooldown: 0,
  emergencyCooldown: 0,
  restoreCharges: 3,
  emergencyRestoresUsed: 0,
  majorPowerIncidents: 0
});

function clampCooldown(value) {
  return Math.max(0, Number(value) || 0);
}

export function normalizePowerEconomyState(state) {
  const existing = state?.powerEconomy || {};
  return {
    ...state,
    powerEconomy: {
      restoreCooldown: clampCooldown(existing.restoreCooldown),
      emergencyCooldown: clampCooldown(existing.emergencyCooldown),
      restoreCharges:
        typeof existing.restoreCharges === 'number'
          ? Math.max(0, existing.restoreCharges)
          : DEFAULT_POWER_ECONOMY.restoreCharges,
      emergencyRestoresUsed:
        typeof existing.emergencyRestoresUsed === 'number'
          ? Math.max(0, existing.emergencyRestoresUsed)
          : DEFAULT_POWER_ECONOMY.emergencyRestoresUsed,
      majorPowerIncidents:
        typeof existing.majorPowerIncidents === 'number'
          ? Math.max(0, existing.majorPowerIncidents)
          : DEFAULT_POWER_ECONOMY.majorPowerIncidents
    }
  };
}

export function buildFreshPowerEconomy() {
  return { ...DEFAULT_POWER_ECONOMY };
}

export function getPowerActionCost(actionKey) {
  const costs = {
    scan: 4,
    investigate: 3,
    investigateHighDraw: 4
  };
  return costs[actionKey] ?? 0;
}

export function tickPowerEconomy(state) {
  if (!state?.powerEconomy) return;
  state.powerEconomy.restoreCooldown = Math.max(0, (state.powerEconomy.restoreCooldown || 0) - 1);
  state.powerEconomy.emergencyCooldown = Math.max(0, (state.powerEconomy.emergencyCooldown || 0) - 1);
}

export function getPassiveDrainForAction(actionKey, state, scenarioModifiers = {}) {
  const minutes = getActionTimeCost(actionKey);
  if (!minutes) return 0;

  let drain = Math.max(1, Math.round(minutes / 18));
  const scenarioPenalty = Math.max(0, Number(scenarioModifiers.powerScanPenalty || 0));

  if (scenarioPenalty >= 2 && Math.random() < 0.5) {
    drain += 1;
  }

  const activeEventsCount = (state?.activeEvents || []).length;
  if (activeEventsCount >= 3) {
    drain += 1;
  }

  const night = Math.max(1, Number(state?.night || 1));
  if (night <= 2 && activeEventsCount <= 1) {
    drain = Math.max(1, drain - 1);
  }
  if (night >= 4 && activeEventsCount >= 2) {
    drain += 1;
  }

  const progressionDrainMult = Number(state?.progressionModifiers?.passiveDrainMult || 1);
  if (progressionDrainMult > 0 && progressionDrainMult !== 1) {
    drain = Math.max(1, Math.round(drain * progressionDrainMult));
  }

  return Math.max(0, drain);
}

export function getLowPowerStage(state) {
  const power = Number(state?.power ?? 100);
  if (power <= 12) return 'critical';
  if (power <= 25) return 'low';
  return 'normal';
}

export function canRestorePower(state, config = {}) {
  const economy = state?.powerEconomy || DEFAULT_POWER_ECONOMY;
  const restoreCost = Math.max(1, Number(config.restoreCost ?? 15));
  if ((state?.money || 0) < restoreCost) {
    return { ok: false, reason: 'Insufficient funds for generator fuel.' };
  }
  if ((economy.restoreCharges || 0) <= 0) {
    return { ok: false, reason: 'Backup generator reserve is empty for this night.' };
  }
  if ((economy.restoreCooldown || 0) > 0) {
    return { ok: false, reason: `Generator cycling cooldown: ${economy.restoreCooldown} action(s) remaining.` };
  }
  return { ok: true, reason: null };
}

export function consumeRestorePower(state, config = {}) {
  if (!state?.powerEconomy) return;
  const restoreCost = Math.max(1, Number(config.restoreCost ?? 15));
  const restoreCooldown = Math.max(0, Number(config.restoreCooldown ?? 2));
  state.money = Math.max(0, (state.money || 0) - restoreCost);
  state.powerEconomy.restoreCharges = Math.max(0, (state.powerEconomy.restoreCharges || 0) - 1);
  state.powerEconomy.restoreCooldown = restoreCooldown;
  state.powerEconomy.emergencyRestoresUsed =
    Math.max(0, state.powerEconomy.emergencyRestoresUsed || 0) + 1;
}

export function canEmergencyReroute(state) {
  const economy = state?.powerEconomy || DEFAULT_POWER_ECONOMY;
  if ((economy.emergencyCooldown || 0) > 0) {
    return {
      ok: false,
      reason: `Reroute relays are stabilizing (${economy.emergencyCooldown} action(s) remaining).`
    };
  }
  return { ok: true, reason: null };
}

export function consumeEmergencyReroute(state) {
  if (!state?.powerEconomy) return;
  state.powerEconomy.emergencyCooldown = 3;
  state.powerEconomy.majorPowerIncidents =
    Math.max(0, state.powerEconomy.majorPowerIncidents || 0) + 1;
}