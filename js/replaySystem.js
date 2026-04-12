function getPhase2() {
  window.DeadEndPhase2 = window.DeadEndPhase2 || {};
  return window.DeadEndPhase2;
}

const MODIFIERS = [
  { key: 'low-power', label: 'Low Power', startPowerDelta: -12, guestRiskBias: 0, eventBias: 0.08 },
  { key: 'high-risk', label: 'High Risk Guests', startPowerDelta: 0, guestRiskBias: 1, eventBias: 0.1 },
  { key: 'silent-night', label: 'Silent Night', startPowerDelta: 0, guestRiskBias: 0, eventBias: -0.05 }
];

function bumpRisk(risk) {
  if (risk === 'Low') return 'Medium';
  if (risk === 'Medium') return 'High';
  return risk;
}

export function applyNightModifier(state) {
  const idx = Math.floor(Math.random() * MODIFIERS.length);
  const modifier = MODIFIERS[idx];
  state.phase2NightModifier = modifier;
  if (modifier.startPowerDelta) {
    state.power = Math.max(0, Number(state.power || 0) + Number(modifier.startPowerDelta));
  }
  state.logs.push(`Night modifier active: ${modifier.label}.`);
}

export function applyGuestVariation(guest, state) {
  const mod = state?.phase2NightModifier;
  if (!mod || Number(mod.guestRiskBias || 0) <= 0) return guest;
  if (Math.random() < 0.35) {
    return { ...guest, riskLevel: bumpRisk(guest.riskLevel || 'Low') };
  }
  return guest;
}

export function buildReplaySummary(state, summary) {
  const score = Number(summary?.score || 0);
  if (state?.failedState) return 'Failed';
  if (score < 55) return 'Barely Survived';
  if (score < 85) return 'Stable Shift';
  return 'Perfect Run';
}

const ns = getPhase2();
ns.replaySystem = { applyNightModifier, applyGuestVariation, buildReplaySummary };
ns.applyNightModifier = applyNightModifier;
ns.applyGuestVariation = applyGuestVariation;
ns.buildReplaySummary = buildReplaySummary;
