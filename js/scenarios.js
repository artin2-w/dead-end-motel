const SCENARIOS = [
  {
    key: 'standard-shift',
    label: 'Standard Shift',
    description: 'A normal night on paper, but the motel still feels one bad decision away from trouble.',
    incidentBonus: 0,
    riskBonus: 0,
    chainBonus: 0,
    powerScanPenalty: 0
  },
  {
    key: 'storm-night',
    label: 'Storm Night',
    description: 'Bad weather is pushing unstable guests inside and making the property feel tense.',
    incidentBonus: 1,
    riskBonus: 0,
    chainBonus: 1,
    powerScanPenalty: 2
  },
  {
    key: 'bus-drop-arrival',
    label: 'Bus Drop Arrival',
    description: 'A late arrival wave is feeding the desk faster than the motel can comfortably absorb.',
    incidentBonus: 1,
    riskBonus: 1,
    chainBonus: 0,
    powerScanPenalty: 0
  },
  {
    key: 'inspection-rumor',
    label: 'Inspection Rumor',
    description: 'Whispers of outside scrutiny are making every incident feel more dangerous to the motel reputation.',
    incidentBonus: 0,
    riskBonus: 1,
    chainBonus: 1,
    powerScanPenalty: 0
  },
  {
    key: 'blackout-strain',
    label: 'Blackout Strain',
    description: 'The electrical system feels fragile tonight, and every power decision carries more weight.',
    incidentBonus: 0,
    riskBonus: 0,
    chainBonus: 1,
    powerScanPenalty: 3
  },
  {
    key: 'weekend-disturbance',
    label: 'Weekend Disturbance',
    description: 'The motel is louder, rowdier, and more likely to produce linked disturbances.',
    incidentBonus: 2,
    riskBonus: 1,
    chainBonus: 2,
    powerScanPenalty: 0
  }
];

export function getScenarioForNight(night = 1) {
  const index = Math.abs((night - 1) % SCENARIOS.length);
  return SCENARIOS[index];
}

export function normalizeScenarioState(state) {
  return {
    ...state,
    activeScenario: state?.activeScenario || null
  };
}

export function assignScenarioForNight(state) {
  return {
    ...state,
    activeScenario: getScenarioForNight(state?.night || 1)
  };
}