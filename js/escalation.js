const AUTO_ESCALATION_LIBRARY = {
  Low: [
    {
      type: 'Late Footsteps',
      severity: 'low',
      effect: 'watch',
      reputationDelta: 0,
      powerDelta: 0,
      buildLog: (guestName, roomLabel) =>
        `Staff heard late footsteps and brief pacing outside ${roomLabel}, possibly linked to ${guestName}.`
    },
    {
      type: 'Restless Movement',
      severity: 'low',
      effect: 'none',
      reputationDelta: 0,
      powerDelta: 0,
      buildLog: (guestName, roomLabel) =>
        `${guestName} was seen making restless movement around ${roomLabel}, but the situation settled on its own.`
    }
  ],
  Medium: [
    {
      type: 'Repeated Door Check',
      severity: 'medium',
      effect: 'watch',
      reputationDelta: -1,
      powerDelta: 0,
      buildLog: (guestName, roomLabel) =>
        `${guestName} repeatedly checked the door of ${roomLabel}, drawing renewed attention from the front desk.`
    },
    {
      type: 'Hallway Disturbance',
      severity: 'medium',
      effect: 'watch',
      reputationDelta: -1,
      powerDelta: 0,
      buildLog: (guestName, roomLabel) =>
        `A hallway disturbance briefly formed near ${roomLabel}, where ${guestName} is staying.`
    },
    {
      type: 'Unverified Knock',
      severity: 'medium',
      effect: 'critical',
      reputationDelta: -1,
      powerDelta: -2,
      buildLog: (guestName, roomLabel) =>
        `Repeated unanswered knocking was reported at ${roomLabel}, assigned to ${guestName}.`
    }
  ],
  High: [
    {
      type: 'Violent Outburst',
      severity: 'high',
      effect: 'critical',
      reputationDelta: -2,
      powerDelta: -5,
      buildLog: (guestName, roomLabel) =>
        `A violent outburst was reported near ${roomLabel}, strongly associated with ${guestName}.`
    },
    {
      type: 'Emergency Call',
      severity: 'high',
      effect: 'critical',
      reputationDelta: -2,
      powerDelta: -4,
      buildLog: (guestName, roomLabel) =>
        `A frantic emergency call was placed from the vicinity of ${roomLabel}, where ${guestName} is staying.`
    },
    {
      type: 'Missing Occupant',
      severity: 'high',
      effect: 'critical',
      reputationDelta: -2,
      powerDelta: -3,
      buildLog: (guestName, roomLabel) =>
        `${guestName} could no longer be confirmed in or around ${roomLabel} after escalating overnight activity.`
    }
  ]
};

function pickRandom(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function buildRoomLabel(room) {
  if (!room) return 'the assigned room';
  if (room.label) return room.label;
  if (room.name) return room.name;
  if (room.number !== undefined) return `Room ${room.number}`;
  if (room.id !== undefined) return `Room ${room.id}`;
  return 'the assigned room';
}

function getRiskWeight(riskLevel) {
  if (riskLevel === 'High') return 0.38;
  if (riskLevel === 'Medium') return 0.2;
  return 0.08;
}

function getConditionWeight(condition) {
  if (condition === 'Critical') return 0.32;
  if (condition === 'Watch') return 0.18;
  return 0;
}

function getTacticalSuppression(room) {
  let suppression = 0;

  if (room?.lockedDown) suppression += 0.08;
  if (room?.powerCut) suppression += 0.1;
  if ((room?.policeCooldown || 0) > 0) suppression += 0.14;

  return suppression;
}

function getAnomalyPressure(activeEvents = []) {
  if (!Array.isArray(activeEvents) || !activeEvents.length) return 0;

  const hasHigh = activeEvents.some((event) => event?.severity === 'high');
  const hasMedium = activeEvents.some((event) => event?.severity === 'medium');

  if (hasHigh) return 0.2;
  if (hasMedium) return 0.12;
  return 0.06;
}

function upgradeCondition(currentCondition, effect) {
  if (effect === 'none') return currentCondition || 'Stable';

  if (effect === 'watch') {
    if (currentCondition === 'Critical') return 'Critical';
    if (currentCondition === 'Watch') return 'Watch';
    return 'Watch';
  }

  if (effect === 'critical') {
    return 'Critical';
  }

  return currentCondition || 'Stable';
}

function chooseCandidateRoom(rooms) {
  const weighted = rooms
    .filter((room) => room.occupiedBy && (room.escalationCooldown || 0) <= 0)
    .map((room) => {
      const suppression = getTacticalSuppression(room);
      const score =
        Math.max(0.4, 1 +
        getRiskWeight(room.riskLevel || 'Low') * 10 +
        getConditionWeight(room.condition || 'Stable') * 10 -
        suppression * 10);

      return { room, score };
    });

  if (!weighted.length) return null;

  const total = weighted.reduce((sum, entry) => sum + entry.score, 0);
  let roll = Math.random() * total;

  for (const entry of weighted) {
    roll -= entry.score;
    if (roll <= 0) return entry.room;
  }

  return weighted[0].room;
}

export function normalizeEscalationRooms(rooms) {
  return rooms.map((room) => ({
    ...room,
    escalationCooldown:
      typeof room.escalationCooldown === 'number' ? room.escalationCooldown : 0
  }));
}

export function tickEscalationRooms(rooms) {
  return rooms.map((room) => ({
    ...room,
    escalationCooldown: Math.max(0, (room.escalationCooldown || 0) - 1)
  }));
}

export function runAutoEscalation({
  rooms,
  activeEvents = [],
  night = 1,
  autoIncidentCooldown = 0
}) {
  const updatedRooms = normalizeEscalationRooms(rooms);

  if (autoIncidentCooldown > 0) {
    return {
      rooms: updatedRooms,
      logs: [],
      incidents: [],
      reputationDelta: 0,
      powerDelta: 0,
      autoIncidentCooldown: Math.max(0, autoIncidentCooldown - 1),
      generated: false
    };
  }

  const occupiedRooms = updatedRooms.filter((room) => room.occupiedBy);
  if (!occupiedRooms.length) {
    return {
      rooms: updatedRooms,
      logs: [],
      incidents: [],
      reputationDelta: 0,
      powerDelta: 0,
      autoIncidentCooldown: 0,
      generated: false
    };
  }

  const safeNight = Math.max(1, Number(night || 1));
  const pressure =
    0.05 +
    getAnomalyPressure(activeEvents) +
    Math.min((safeNight - 1) * 0.03, 0.18);

  const candidate = chooseCandidateRoom(updatedRooms);
  if (!candidate) {
    return {
      rooms: updatedRooms,
      logs: [],
      incidents: [],
      reputationDelta: 0,
      powerDelta: 0,
      autoIncidentCooldown: 0,
      generated: false
    };
  }

  const roomChance = Math.min(
    pressure +
      getRiskWeight(candidate.riskLevel || 'Low') +
      getConditionWeight(candidate.condition || 'Stable') -
      getTacticalSuppression(candidate),
    0.82
  );

  let finalRoomChance = Math.max(0.04, roomChance);
  if (safeNight === 1) finalRoomChance *= 0.72;
  else if (safeNight === 2) finalRoomChance *= 0.84;
  else if (safeNight >= 4) finalRoomChance *= 1.06;

  if (safeNight <= 2 && activeEvents.length >= 2) {
    finalRoomChance *= 0.58;
  }

  finalRoomChance = Math.max(0.04, Math.min(0.88, finalRoomChance));

  if (Math.random() > finalRoomChance) {
    return {
      rooms: updatedRooms,
      logs: [],
      incidents: [],
      reputationDelta: 0,
      powerDelta: 0,
      autoIncidentCooldown: 0,
      generated: false
    };
  }

  const riskLevel = candidate.riskLevel || 'Low';
  const pool = AUTO_ESCALATION_LIBRARY[riskLevel] || AUTO_ESCALATION_LIBRARY.Low;
  const incident = pickRandom(pool);
  const roomLabel = buildRoomLabel(candidate);

  const roomIndex = updatedRooms.findIndex((room) => room.id === candidate.id);
  if (roomIndex >= 0) {
    updatedRooms[roomIndex] = {
      ...updatedRooms[roomIndex],
      condition: upgradeCondition(updatedRooms[roomIndex].condition, incident.effect),
      escalationCooldown:
        incident.severity === 'high' ? 3 : 2
    };
  }

  const finalRoom = updatedRooms[roomIndex] || candidate;

  const logs = [incident.buildLog(candidate.occupiedBy, roomLabel)];
  const incidents = [
    {
      roomId: finalRoom.id,
      guestName: candidate.occupiedBy,
      riskLevel: candidate.riskLevel || 'Low',
      condition: finalRoom.condition,
      type: incident.type,
      severity: incident.severity,
      source: 'auto'
    }
  ];

  return {
    rooms: updatedRooms,
    logs,
    incidents,
    reputationDelta: incident.reputationDelta,
    powerDelta: incident.powerDelta,
    autoIncidentCooldown: (incident.severity === 'high' ? 2 : 1) + (safeNight <= 2 ? 1 : 0),
    generated: true
  };
}