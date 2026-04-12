function getPhase2() {
  window.DeadEndPhase2 = window.DeadEndPhase2 || {};
  return window.DeadEndPhase2;
}

let lastTier = 'low';

function scorePressure(state) {
  const activeEvents = Number(state?.activeEvents?.length || 0);
  const criticalRooms = Number((state?.rooms || []).filter((room) => room?.occupiedBy && room?.condition === 'Critical').length);
  const powerPenalty = Math.max(0, (45 - Number(state?.power || 100)) / 10);
  const chain = Number((state?.storyChains || []).reduce((sum, chainItem) => sum + Number(chainItem?.pressure || 0), 0));
  return activeEvents * 2 + criticalRooms * 3 + powerPenalty + chain * 0.25;
}

function tierFromScore(score) {
  if (score >= 12) return 'critical';
  if (score >= 8) return 'severe';
  if (score >= 4) return 'elevated';
  return 'low';
}

export function applyPressureEnhancements(state, pushAlert) {
  const score = scorePressure(state);
  const tier = tierFromScore(score);
  const eventFrequencyBoost = tier === 'critical' ? 0.22 : tier === 'severe' ? 0.12 : tier === 'elevated' ? 0.06 : 0;
  const difficultyPulse = tier === 'critical' ? 2 : tier === 'severe' ? 1 : 0;
  state.phase2Pressure = { score, tier, eventFrequencyBoost, difficultyPulse };

  const app = document.getElementById('app');
  if (app) {
    app.classList.remove('phase2-pressure-low', 'phase2-pressure-elevated', 'phase2-pressure-severe', 'phase2-pressure-critical');
    app.classList.add(`phase2-pressure-${tier}`);
  }

  if (tier !== lastTier && typeof pushAlert === 'function') {
    pushAlert({
      type: tier === 'critical' ? 'danger' : tier === 'severe' ? 'warning' : 'info',
      message: `Pressure level now ${tier.toUpperCase()}.`,
      dedupeKey: `phase2-pressure-${tier}`
    });
  }
  lastTier = tier;

  return { tier, eventFrequencyBoost, difficultyPulse };
}

const ns = getPhase2();
ns.pressureEnhancer = { applyPressureEnhancements };
ns.applyPressureEnhancements = applyPressureEnhancements;
