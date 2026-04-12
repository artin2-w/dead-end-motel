const RISK_LEVELS = [
  {
    level: 'Low',
    weight: (night) => {
      const n = Math.max(1, Number(night || 1));
      if (n === 1) return 68;
      if (n === 2) return 60;
      if (n === 3) return 52;
      if (n === 4) return 44;
      return 38;
    }
  },
  {
    level: 'Medium',
    weight: (night) => {
      const n = Math.max(1, Number(night || 1));
      if (n === 1) return 24;
      if (n === 2) return 30;
      if (n === 3) return 34;
      if (n === 4) return 38;
      return 40;
    }
  },
  {
    level: 'High',
    weight: (night) => {
      const n = Math.max(1, Number(night || 1));
      if (n === 1) return 8;
      if (n === 2) return 10;
      if (n === 3) return 14;
      if (n === 4) return 18;
      return 22;
    }
  }
];

const TRAITS_BY_RISK = {
  Low: [
    {
      name: 'Quiet',
      demeanor: 'Calm',
      note: 'Spoke softly and kept the conversation brief.',
      log: (guestName) => `${guestName} remained quiet during check-in and avoided unnecessary conversation.`
    },
    {
      name: 'Exhausted',
      demeanor: 'Worn',
      note: 'Looked drained and focused on sleep more than conflict.',
      log: (guestName) => `${guestName} looked exhausted and asked for a room as quickly as possible.`
    }
  ],
  Medium: [
    {
      name: 'Nervous',
      demeanor: 'Tense',
      note: 'Kept glancing around the lobby and reacted sharply to small delays.',
      log: (guestName) => `${guestName} seemed unusually nervous during check-in.`
    },
    {
      name: 'Evasive',
      demeanor: 'Shifting',
      note: 'Avoided simple questions and kept shifting details.',
      log: (guestName) => `${guestName} avoided direct answers to routine front desk questions.`
    }
  ],
  High: [
    {
      name: 'Aggressive',
      demeanor: 'Hostile',
      note: 'Displayed irritation and posture escalation when process slowed down.',
      log: (guestName) => `${guestName} became visibly aggressive when asked to wait during check-in.`
    },
    {
      name: 'Unstable',
      demeanor: 'Erratic',
      note: 'Behavior felt erratic and difficult to read under pressure.',
      log: (guestName) => `${guestName} behaved unpredictably and left the front desk uneasy.`
    }
  ]
};

const CONTEXT_TAG_POOL = [
  'vehicle linger',
  'late check-in rush',
  'maintenance claim',
  'hallway complaint',
  'rear-exit mention',
  'laundry detour',
  'ice machine stop'
];

const VISUAL_HINTS = [
  'scuffed suitcase',
  'wet boots',
  'service jacket',
  'unmarked duffel',
  'shaking hands',
  'dark visor cap'
];

function pickRandom(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function pickWeightedRisk(night = 1) {
  const weighted = RISK_LEVELS.map((entry) => ({
    level: entry.level,
    weight: entry.weight(night)
  }));

  const total = weighted.reduce((sum, entry) => sum + entry.weight, 0);
  let roll = Math.random() * total;

  for (const entry of weighted) {
    roll -= entry.weight;
    if (roll <= 0) return entry.level;
  }

  return 'Low';
}

function clampSignal(value) {
  return Math.max(0, Math.min(2, Number(value || 0)));
}

function buildSignalModel(riskLevel, trait) {
  const riskSeed = riskLevel === 'High' ? 2 : riskLevel === 'Medium' ? 1 : 0;
  const traitName = String(trait?.name || '').toLowerCase();

  let urgency = riskSeed;
  let instability = riskSeed;
  let deception = riskSeed;

  if (traitName.includes('quiet') || traitName.includes('exhausted')) {
    urgency -= 1;
    instability -= 1;
  }
  if (traitName.includes('evasive')) deception += 1;
  if (traitName.includes('nervous')) urgency += 1;
  if (traitName.includes('aggressive') || traitName.includes('unstable')) instability += 1;

  const contradictoryClue = Math.random() < (riskLevel === 'Medium' ? 0.42 : 0.2);
  if (contradictoryClue) {
    if (riskLevel === 'Low') {
      deception += 1;
      urgency += 1;
    } else if (riskLevel === 'High') {
      urgency -= 1;
    } else {
      deception += Math.random() < 0.5 ? 1 : 0;
      instability -= Math.random() < 0.5 ? 1 : 0;
    }
  }

  return {
    urgencySignal: clampSignal(urgency),
    instabilitySignal: clampSignal(instability),
    deceptionSignal: clampSignal(deception),
    contradictoryClue
  };
}

function buildPolicyAlignmentHint(signals = {}) {
  const combined = Number(signals.deceptionSignal || 0) + Number(signals.instabilitySignal || 0);
  if (combined >= 3) return { alignment: 'mismatch', note: 'Desk policy fit looked weak once details shifted.' };
  if (combined >= 2 || Number(signals.urgencySignal || 0) >= 2) {
    return { alignment: 'borderline', note: 'Policy fit was uncertain and depended on handling tone.' };
  }
  return { alignment: 'aligned', note: 'Policy fit looked clean at first read.' };
}

function buildReadableRiskNote(guest) {
  const lines = [];
  const demeanor = String(guest?.surfaceDemeanor || 'Neutral').toLowerCase();
  const contradiction = Boolean(guest?.contradictoryClue);
  const alignment = String(guest?.policyAlignmentHint || 'aligned');
  const urgency = Number(guest?.urgencySignal || 0);
  const instability = Number(guest?.instabilitySignal || 0);
  const deception = Number(guest?.deceptionSignal || 0);

  lines.push(`Read: ${demeanor} tone, ${guest.trait?.toLowerCase?.() || 'unclear'} presentation.`);

  if (alignment === 'mismatch') {
    lines.push('Policy read: mismatch signs appeared during routine questions.');
  } else if (alignment === 'borderline') {
    lines.push('Policy read: borderline fit, likely to depend on desk handling.');
  } else {
    lines.push('Policy read: generally aligned with expected check-in behavior.');
  }

  if (deception >= 2) {
    lines.push('Signal: details felt rehearsed or strategically incomplete.');
  } else if (instability >= 2) {
    lines.push('Signal: emotional control looked fragile under pressure.');
  } else if (urgency >= 2) {
    lines.push('Signal: urgency was high and could spill into conflict if delayed.');
  }

  if (contradiction) {
    lines.push('Contradiction: one cue suggested safety while another did not.');
  }

  return lines.slice(0, 3).join(' ');
}

function buildRoomLabel(room) {
  if (!room) return 'assigned room';
  if (room.label) return room.label;
  if (room.name) return room.name;
  if (room.number !== undefined) return `Room ${room.number}`;
  if (room.id !== undefined) return `Room ${room.id}`;
  return 'assigned room';
}

export function enrichGuestProfile(guest, night = 1) {
  const riskLevel = pickWeightedRisk(night);
  const traitPool = TRAITS_BY_RISK[riskLevel] || TRAITS_BY_RISK.Low;
  const trait = pickRandom(traitPool);
  const signals = buildSignalModel(riskLevel, trait);
  const policyHint = buildPolicyAlignmentHint(signals);

  const draft = {
    ...guest,
    riskLevel,
    trait: trait.name,
    surfaceDemeanor: trait.demeanor,
    contextTag: pickRandom(CONTEXT_TAG_POOL),
    visualHint: pickRandom(VISUAL_HINTS),
    urgencySignal: signals.urgencySignal,
    instabilitySignal: signals.instabilitySignal,
    deceptionSignal: signals.deceptionSignal,
    contradictoryClue: signals.contradictoryClue,
    policyAlignmentHint: policyHint.alignment,
    policyAlignmentLine: policyHint.note,
    delayedRiskProfile: {
      approval: clampSignal(signals.deceptionSignal + signals.instabilitySignal - 1),
      flagged: clampSignal(signals.instabilitySignal - 1),
      rejection: clampSignal(signals.urgencySignal + signals.deceptionSignal - 1)
    }
  };

  return {
    ...draft,
    riskNote: buildReadableRiskNote({ ...draft, riskNote: trait.note })
  };
}

export function deriveRoomConditionForGuest(guest) {
  if (!guest) return 'Stable';
  if (guest.riskLevel === 'High') return 'Watch';
  if (guest.riskLevel === 'Medium' && Math.random() < 0.36) return 'Watch';
  return 'Stable';
}

export function buildGuestCheckInLogs(guest, room) {
  const roomLabel = buildRoomLabel(room);
  const logs = [`${guest.name} checked into ${roomLabel}.`];

  const traitPool = TRAITS_BY_RISK[guest.riskLevel] || [];
  const matchedTrait = traitPool.find((entry) => entry.name === guest.trait);

  if (matchedTrait?.log) {
    logs.push(matchedTrait.log(guest.name));
  }

  const trait = String(guest?.trait || '').toLowerCase();
  if (trait.includes('evasive') || Number(guest?.deceptionSignal || 0) >= 2) {
    logs.push('Readback: deceptive presentation increased delayed disruption risk after approval.');
  } else if (trait.includes('exhausted')) {
    logs.push('Readback: exhaustion lowered immediate desk conflict but can flip if disturbed.');
  } else if (trait.includes('nervous') || Number(guest?.urgencySignal || 0) >= 2) {
    logs.push('Readback: high urgency profile can escalate if waits or noise increase.');
  } else if (trait.includes('quiet')) {
    logs.push('Readback: calm presentation aligned with lower-friction occupancy behavior.');
  } else if (trait.includes('aggressive') || trait.includes('unstable') || Number(guest?.instabilitySignal || 0) >= 2) {
    logs.push('Readback: instability signs were visible at desk and carried into room risk.');
  }

  if (guest?.contradictoryClue) {
    logs.push('Readback: contradictory cues were present — this guest required interpretation, not a single signal.');
  }

  if (guest?.contextTag) {
    logs.push(`Context cue tracked: ${guest.contextTag}.`);
  }

  if (guest.riskLevel === 'Medium') {
    logs.push(`Front desk note: ${guest.name} was flagged for light observation after check-in.`);
  }

  if (guest.riskLevel === 'High') {
    logs.push(`Front desk alert: ${guest.name} was marked high-risk and assigned under watch.`);
  }

  return logs;
}