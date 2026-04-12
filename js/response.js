const CONDITION_PRIORITY = {
  Stable: 0,
  Watch: 2,
  Critical: 4
};

function getRiskWeight(riskLevel) {
  if (riskLevel === 'High') return 2;
  if (riskLevel === 'Medium') return 1;
  return 0;
}

function buildRoomLabel(room) {
  if (!room) return 'the assigned room';
  if (room.label) return room.label;
  if (room.name) return room.name;
  if (room.number !== undefined) return `Room ${room.number}`;
  if (room.id !== undefined) return `Room ${room.id}`;
  return 'the assigned room';
}

function lowerCondition(condition) {
  if (condition === 'Critical') return 'Watch';
  if (condition === 'Watch') return 'Stable';
  return 'Stable';
}

function getResponsePriority(room) {
  if (!room?.occupiedBy) return 0;

  return (
    (CONDITION_PRIORITY[room.condition || 'Stable'] || 0) +
    getRiskWeight(room.riskLevel || 'Low') +
    (room.deskFlagged ? 1 : 0) +
    (room.policyOverride ? 2 : 0)
  );
}

function pickTargetRoom(rooms) {
  const candidates = rooms
    .filter(
      (room) =>
        room.occupiedBy &&
        (room.responseCooldown || 0) <= 0 &&
        getResponsePriority(room) > 0
    )
    .sort((a, b) => getResponsePriority(b) - getResponsePriority(a));

  return candidates[0] || null;
}

export function peekDispatchStaffTargetRoom(rooms = []) {
  return pickTargetRoom(normalizeResponseRooms(rooms));
}

export function normalizeResponseRooms(rooms = []) {
  return rooms.map((room) => ({
    ...room,
    responseCooldown:
      typeof room.responseCooldown === 'number' ? room.responseCooldown : 0
  }));
}

export function tickResponseCooldowns(rooms = []) {
  return rooms.map((room) => ({
    ...room,
    responseCooldown: Math.max(0, (room.responseCooldown || 0) - 1)
  }));
}

export function dispatchStaffResponse(rooms = [], night = 1, options = {}) {
  const updatedRooms = normalizeResponseRooms(rooms);
  const target = pickTargetRoom(updatedRooms);
  const safeNight = Math.max(1, Number(night || 1));

  if (!target) {
    return {
      rooms: updatedRooms,
      logs: ['Staff response found no occupied room requiring immediate intervention.'],
      reputationDelta: 0,
      powerDelta: 0,
      responded: false,
      success: false
    };
  }

  const roomIndex = updatedRooms.findIndex((room) => room.id === target.id);
  if (roomIndex === -1) {
    return {
      rooms: updatedRooms,
      logs: ['Staff response could not resolve a valid room target.'],
      reputationDelta: 0,
      powerDelta: 0,
      responded: false,
      success: false
    };
  }

  const roomLabel = buildRoomLabel(target);
  const previousCondition = target.condition || 'Stable';

  let successChance =
    0.78 -
    (target.riskLevel === 'High' ? 0.18 : target.riskLevel === 'Medium' ? 0.08 : 0) -
    (previousCondition === 'Critical' ? 0.14 : previousCondition === 'Watch' ? 0.05 : 0) -
    (target.policyOverride ? 0.08 : 0) -
    Math.min((safeNight - 1) * 0.02, 0.12);

  if (safeNight === 1) successChance += 0.08;
  else if (safeNight === 2) successChance += 0.04;
  else if (safeNight >= 5) successChance -= 0.03;

  successChance += Number(options.dispatchSuccessBonus || 0);

  successChance = Math.max(0.24, Math.min(0.8, successChance));

  if (Math.random() <= successChance) {
    const newCondition = lowerCondition(previousCondition);

    updatedRooms[roomIndex] = {
      ...updatedRooms[roomIndex],
      condition: newCondition,
      responseCooldown: 2
    };

    const logs = [
      `Staff response entered ${roomLabel} and attempted to stabilize the situation around ${target.occupiedBy}.`,
      previousCondition !== newCondition
        ? `${roomLabel} was reduced from ${previousCondition} to ${newCondition} after staff intervention.`
        : `${roomLabel} remained stable after a precautionary staff check.`
    ];

    return {
      rooms: updatedRooms,
      logs,
      reputationDelta: previousCondition === 'Critical' ? 2 : 1,
      powerDelta: safeNight <= 2 ? -2 : safeNight >= 5 ? -4 : -3,
      responded: true,
      success: true,
      roomId: updatedRooms[roomIndex].id,
      previousCondition,
      currentCondition: updatedRooms[roomIndex].condition
    };
  }

  let failedCondition = previousCondition;

  if (
    previousCondition === 'Watch' &&
    (target.riskLevel === 'High' || target.policyOverride)
  ) {
    if (safeNight <= 2) {
      failedCondition = 'Watch';
    } else {
      failedCondition = 'Critical';
    }
  }

  updatedRooms[roomIndex] = {
    ...updatedRooms[roomIndex],
    condition: failedCondition,
    responseCooldown: 2
  };

  const logs = [
    `Staff response met resistance near ${roomLabel}, where ${target.occupiedBy} is staying.`,
    failedCondition !== previousCondition
      ? `${roomLabel} escalated from ${previousCondition} to ${failedCondition} after the failed response.`
      : `${roomLabel} could not be stabilized by the staff response attempt.`
  ];

  return {
    rooms: updatedRooms,
    logs,
    reputationDelta: safeNight <= 2 ? 0 : -1,
    powerDelta: safeNight <= 2 ? -3 : -4,
    responded: true,
    success: false,
    roomId: updatedRooms[roomIndex].id,
    previousCondition,
    currentCondition: updatedRooms[roomIndex].condition
  };
}