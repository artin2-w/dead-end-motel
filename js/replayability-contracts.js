/**
 * Dead End Motel v0.55 — Shift Contracts (local-only replayability)
 *
 * Guardrails:
 * - Optional and non-blocking. Standard shift is always valid.
 * - Local-only personalization (no network, no personal data).
 * - Not pay-gated. Contracts are gameplay modifiers, not purchases.
 *
 * Storage:
 * - localStorage: dem.currentShiftContract
 */

import { demRecordContractTried } from './playstats.js';

const STORAGE_KEY = 'dem.currentShiftContract';

export const CONTRACTS = [
  {
    id: 'standard',
    title: 'Standard Shift',
    risk: 'Normal',
    bonusPct: 0,
    description: 'Baseline tuning. No extra modifiers.'
  },
  {
    id: 'weak_grid',
    title: 'Weak Grid',
    risk: 'Medium',
    bonusPct: 20,
    description: 'Power drains faster, but successful shift payout increases.'
  },
  {
    id: 'hostile_neighborhood',
    title: 'Hostile Neighborhood',
    risk: 'Medium',
    bonusPct: 25,
    description: 'More incidents and tense guests, but higher payout.'
  },
  {
    id: 'budget_cut',
    title: 'Budget Cut',
    risk: 'High',
    bonusPct: 30,
    description: 'Start with fewer resources, but earn more if you survive.'
  },
  {
    id: 'no_mistakes',
    title: 'No Mistakes',
    risk: 'High',
    bonusPct: 35,
    description: 'Mistakes hurt more, but survival rewards increase.'
  },
  {
    id: 'quiet_shift',
    title: 'Quiet Shift',
    risk: 'Low',
    bonusPct: -15,
    description: 'Lower pressure, lower payout. Good for learning.'
  }
];

function safeGet() {
  try {
    return String(localStorage.getItem(STORAGE_KEY) || 'standard');
  } catch {
    return 'standard';
  }
}

function safeSet(id) {
  try {
    localStorage.setItem(STORAGE_KEY, String(id || 'standard'));
  } catch {
    // ignore
  }
}

export function demGetActiveContract() {
  const id = safeGet();
  return CONTRACTS.find((c) => c.id === id) || CONTRACTS[0];
}

export function demSetShiftContract(contractId) {
  const next = CONTRACTS.some((c) => c.id === contractId) ? contractId : 'standard';
  safeSet(next);
  console.log('Shift contract selected', next);
  demRecordContractTried(next);
  return demGetActiveContract();
}

export function demClearShiftContract() {
  safeSet('standard');
  return demGetActiveContract();
}

export function demApplyContractStartEffects(state) {
  const c = demGetActiveContract();
  if (!state || !c) return;

  // Keep it gentle: modifiers are small and reversible.
  state.shiftContractId = c.id;
  state.shiftContractTitle = c.title;

  if (c.id === 'budget_cut') {
    // Safe: only touches money which already exists.
    state.money = Math.max(0, Number(state.money || 0) - 20);
  }

  // Quiet shift reduces early pressure by starting cleaner, not by removing threats.
  if (c.id === 'quiet_shift') {
    state.dirtyPressure = Math.max(0, Number(state.dirtyPressure || 0) - 1);
  }

  console.log('Contract start effects applied', c.id);
}

export function demApplyContractProgressEffects(state, delta = {}) {
  const c = demGetActiveContract();
  if (!state || !c) return;

  // Minimal non-destructive hooks: piggyback existing multipliers.
  state.runModifiers = state.runModifiers && typeof state.runModifiers === 'object' ? state.runModifiers : {};

  if (c.id === 'weak_grid') {
    state.runModifiers.passiveDrainMult = Math.max(0.75, Number(state.runModifiers.passiveDrainMult || 1) * 1.08);
  } else if (c.id === 'quiet_shift') {
    state.runModifiers.passiveDrainMult = Math.max(0.75, Number(state.runModifiers.passiveDrainMult || 1) * 0.94);
  }

  // No Mistakes: raise perceived consequence slightly via a small dirtyPressure nudge on some actions.
  if (c.id === 'no_mistakes') {
    const key = String(delta.actionKey || '');
    if (key && (key.includes('reject') || key.includes('checkin') || key.includes('flag'))) {
      if (Math.random() < 0.18) {
        state.dirtyPressure = Math.min(10, Number(state.dirtyPressure || 0) + 1);
      }
    }
  }

  // Hostile neighborhood: mild ambient dirt pressure in late shift only (doesn't spam events).
  if (c.id === 'hostile_neighborhood') {
    const elapsed = Number(state.shiftElapsedMinutes || 0);
    if (elapsed >= 180 && Math.random() < 0.08) {
      state.dirtyPressure = Math.min(10, Number(state.dirtyPressure || 0) + 1);
    }
  }

  console.log('Contract progress effect', c.id);
}

export function demApplyContractSuccessBonus(state, context = {}) {
  const c = demGetActiveContract();
  if (!state || !c) return [];
  if (c.id === 'standard') return [];

  // Money/economy is complex; apply a small, explicit, fixed adjustment that is easy to audit.
  // This avoids inventing hidden payout formulas.
  const base = Math.max(0, Number(context.baseMoney || state.money || 0));
  const bonus = c.bonusPct === 0 ? 0 : Math.round(Math.max(6, Math.min(30, (Math.abs(c.bonusPct) / 100) * 60)));
  const signed = c.bonusPct < 0 ? -bonus : bonus;

  state.money = Math.max(0, Number(state.money || 0) + signed);
  console.log('Contract success bonus applied', { contractId: c.id, bonus: signed });

  return [
    `Contract: ${c.title}`,
    `${c.bonusPct < 0 ? 'Quiet Shift adjustment' : 'Risk Bonus'}: ${signed >= 0 ? '+' : ''}CA$${signed}`
  ];
}

// Expose helpers globally (requested).
window.demGetActiveContract = demGetActiveContract;
window.demSetShiftContract = demSetShiftContract;
window.demClearShiftContract = demClearShiftContract;
window.demApplyContractStartEffects = demApplyContractStartEffects;
window.demApplyContractProgressEffects = demApplyContractProgressEffects;
window.demApplyContractSuccessBonus = demApplyContractSuccessBonus;

