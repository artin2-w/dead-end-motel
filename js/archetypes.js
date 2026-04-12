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

  return {
    ...guest,
    archetypeKey: template.key,
    archetypeLabel: template.label,
    archetypeClue: template.clue,
    hiddenIntent: template.hiddenIntent,
    incidentBias: template.incidentBias,
    chainBias: template.chainBias,
    zoneTension: template.zoneTension,
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