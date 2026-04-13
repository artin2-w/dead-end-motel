const ARCHETYPES = [
  {
    key: 'weary-traveler',
    label: 'Weary Traveler',
    clue: 'Looked exhausted and focused only on getting a room quickly.',
    hiddenIntent: 'rest',
    incidentBias: 0,
    riskBias: 0,
    chainBias: 0,
    delayedRiskProfile: { approval: 0, flagged: 0, rejection: 1 },
    zoneTension: 'hallway'
  },
  {
    key: 'evasive-drifter',
    label: 'Evasive Drifter',
    clue: 'Avoided simple questions and kept shifting the conversation away.',
    hiddenIntent: 'uncertain',
    incidentBias: 1,
    riskBias: 1,
    chainBias: 1,
    delayedRiskProfile: { approval: 2, flagged: 1, rejection: 1 },
    zoneTension: 'rear-exit'
  },
  {
    key: 'runaway-couple',
    label: 'Runaway Couple',
    clue: 'Spoke in a rushed way and seemed anxious about being noticed.',
    hiddenIntent: 'hiding',
    incidentBias: 1,
    riskBias: 1,
    chainBias: 1,
    delayedRiskProfile: { approval: 1, flagged: 0, rejection: 2 },
    zoneTension: 'parking-lot'
  },
  {
    key: 'drunk-local',
    label: 'Drunk Local',
    clue: 'Moved unevenly and gave the impression they could become disruptive.',
    hiddenIntent: 'unstable',
    incidentBias: 2,
    riskBias: 2,
    chainBias: 2,
    delayedRiskProfile: { approval: 2, flagged: 1, rejection: 0 },
    zoneTension: 'hallway'
  },
  {
    key: 'silent-observer',
    label: 'Silent Observer',
    clue: 'Watched the lobby closely and spoke far less than expected.',
    hiddenIntent: 'watching',
    incidentBias: 1,
    riskBias: 1,
    chainBias: 2,
    delayedRiskProfile: { approval: 1, flagged: 0, rejection: 1 },
    zoneTension: 'lobby'
  },
  {
    key: 'desperate-sleeper',
    label: 'Desperate Sleeper',
    clue: 'Looked drained, impatient, and desperate for a room immediately.',
    hiddenIntent: 'rest',
    incidentBias: 1,
    riskBias: 0,
    chainBias: 0,
    delayedRiskProfile: { approval: 1, flagged: 0, rejection: 2 },
    zoneTension: 'ice-machine'
  },
  {
    key: 'manipulative-talker',
    label: 'Manipulative Talker',
    clue: 'Tried to control the tone of the interaction and charm past the desk.',
    hiddenIntent: 'control',
    incidentBias: 1,
    riskBias: 1,
    chainBias: 1,
    delayedRiskProfile: { approval: 2, flagged: 0, rejection: 2 },
    zoneTension: 'parking-lot'
  },
  {
    key: 'volatile-guest',
    label: 'Volatile Guest',
    clue: 'Felt tense, reactive, and difficult to predict under pressure.',
    hiddenIntent: 'volatile',
    incidentBias: 2,
    riskBias: 2,
    chainBias: 2,
    delayedRiskProfile: { approval: 2, flagged: 1, rejection: 0 },
    zoneTension: 'laundry'
  },
  {
    key: 'credit-floater',
    label: 'Credit Floater',
    clue: 'Spoke smoothly, but kept trying to slide past ordinary desk friction.',
    hiddenIntent: 'exploit',
    incidentBias: 1,
    riskBias: 1,
    chainBias: 1,
    delayedRiskProfile: { approval: 2, flagged: 1, rejection: 1 },
    zoneTension: 'lobby'
  },
  {
    key: 'false-contractor',
    label: 'False Contractor',
    clue: 'Looked like staff-adjacent maintenance, but details did not hold under follow-up.',
    hiddenIntent: 'access',
    incidentBias: 2,
    riskBias: 1,
    chainBias: 2,
    delayedRiskProfile: { approval: 2, flagged: 0, rejection: 2 },
    zoneTension: 'laundry'
  },
  {
    key: 'quiet-family-fracture',
    label: 'Quiet Family Fracture',
    clue: 'At first they looked ordinary, but the group dynamic felt strained and brittle.',
    hiddenIntent: 'domestic-strain',
    incidentBias: 1,
    riskBias: 1,
    chainBias: 1,
    delayedRiskProfile: { approval: 1, flagged: 1, rejection: 2 },
    zoneTension: 'hallway'
  },
  {
    key: 'night-shift-gambler',
    label: 'Night Shift Gambler',
    clue: 'Restless, charming, and always one beat too eager to stay in motion.',
    hiddenIntent: 'stimulation',
    incidentBias: 2,
    riskBias: 1,
    chainBias: 2,
    delayedRiskProfile: { approval: 2, flagged: 1, rejection: 1 },
    zoneTension: 'ice-machine'
  },
  {
    key: 'injured-runner',
    label: 'Injured Runner',
    clue: 'Tried to hide visible strain and gave the impression of needing shelter fast.',
    hiddenIntent: 'hiding',
    incidentBias: 1,
    riskBias: 2,
    chainBias: 1,
    delayedRiskProfile: { approval: 2, flagged: 1, rejection: 2 },
    zoneTension: 'rear-exit'
  }
];

function safeIndex(value, length) {
  return Math.abs(value) % length;
}

export function normalizeGuestArchetype(guest) {
  if (!guest) return guest;

  return {
    ...guest,
    archetypeKey: guest.archetypeKey || null,
    archetypeLabel: guest.archetypeLabel || null,
    archetypeClue: guest.archetypeClue || '',
    hiddenIntent: guest.hiddenIntent || null,
    incidentBias: typeof guest.incidentBias === 'number' ? guest.incidentBias : 0,
    chainBias: typeof guest.chainBias === 'number' ? guest.chainBias : 0,
    zoneTension: guest.zoneTension || null,
    delayedRiskProfile:
      guest?.delayedRiskProfile && typeof guest.delayedRiskProfile === 'object'
        ? {
            approval: Number(guest.delayedRiskProfile.approval || 0),
            flagged: Number(guest.delayedRiskProfile.flagged || 0),
            rejection: Number(guest.delayedRiskProfile.rejection || 0)
          }
        : { approval: 0, flagged: 0, rejection: 0 }
  };
}

export function assignArchetypeToGuest(guest, state) {
  const scenarioKey = state?.activeScenario?.key || 'standard-shift';
  const night = state?.night || 1;
  const baseName = String(guest?.name || guest?.guestName || 'guest');
  const seed =
    [...baseName].reduce((sum, char) => sum + char.charCodeAt(0), 0) +
    night * 17 +
    scenarioKey.length * 13 +
    (guest?.risk === 'High' ? 5 : guest?.risk === 'Medium' ? 3 : 1);

  const template = ARCHETYPES[safeIndex(seed, ARCHETYPES.length)];
  const pressureNight = Math.max(1, Number(state?.night || 1));
  const scenarioKeyLower = String(scenarioKey || '').toLowerCase();
  let adjustedIncidentBias = Number(template.incidentBias || 0);
  let adjustedChainBias = Number(template.chainBias || 0);
  let varietyLine = '';

  if (pressureNight >= 4 && (template.key === 'false-contractor' || template.key === 'night-shift-gambler')) {
    adjustedIncidentBias += 1;
    adjustedChainBias += 1;
    varietyLine = 'Pattern note: this archetype becomes more volatile later in a run.';
  } else if (scenarioKeyLower.includes('inspection') && template.key === 'credit-floater') {
    adjustedChainBias += 1;
    varietyLine = 'Pattern note: scrutiny-heavy nights make smooth-talking guests more dangerous.';
  } else if (scenarioKeyLower.includes('storm') && template.key === 'injured-runner') {
    adjustedIncidentBias += 1;
    varietyLine = 'Pattern note: storm conditions make desperate shelter stories harder to read cleanly.';
  } else if (template.key === 'quiet-family-fracture') {
    varietyLine = 'Pattern note: this archetype often looks safer at the desk than it is in the room.';
  }

  return {
    ...guest,
    archetypeKey: template.key,
    archetypeLabel: template.label,
    archetypeClue: template.clue,
    hiddenIntent: template.hiddenIntent,
    incidentBias: adjustedIncidentBias,
    chainBias: adjustedChainBias,
    zoneTension: template.zoneTension,
    archetypeVarietyLine: varietyLine,
    delayedRiskProfile: {
      approval: Number(template?.delayedRiskProfile?.approval || 0),
      flagged: Number(template?.delayedRiskProfile?.flagged || 0),
      rejection: Number(template?.delayedRiskProfile?.rejection || 0)
    }
  };
}

export function getArchetypeBadgeLabel(guest) {
  return guest?.archetypeLabel || 'Unknown Pattern';
}