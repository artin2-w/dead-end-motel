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

function getRiskPenalty(riskLevel) {
  if (riskLevel === 'High') return 0;
  if (riskLevel === 'Medium') return 1;
  return 2;
}

export function normalizeTacticalRooms(rooms = []) {
  return rooms.map((room) => ({
    ...room,
    lockedDown: Boolean(room.lockedDown),
    lockdownCooldown:
      typeof room.lockdownCooldown === 'number' ? room.lockdownCooldown : 0,
    powerCut: Boolean(room.powerCut),
    powerCutCooldown:
      typeof room.powerCutCooldown === 'number' ? room.powerCutCooldown : 0,
    policeCooldown:
      typeof room.policeCooldown === 'number' ? room.policeCooldown : 0
  }));
}

export function tickTacticalRooms(rooms = []) {
  return rooms.map((room) => {
    const lockdownCooldown = Math.max(0, (room.lockdownCooldown || 0) - 1);
    const powerCutCooldown = Math.max(0, (room.powerCutCooldown || 0) - 1);
    const policeCooldown = Math.max(0, (room.policeCooldown || 0) - 1);

    return {
      ...room,
      lockdownCooldown,
      powerCutCooldown,
      policeCooldown,
      lockedDown: lockdownCooldown > 0 ? Boolean(room.lockedDown) : false,
      powerCut: powerCutCooldown > 0 ? Boolean(room.powerCut) : false
    };
  });
}

export function applyLockdownToRoom(room) {
  if (!room?.occupiedBy) {
    return {
      room,
      logs: ['Lockdown could not be applied because no occupied room was selected.'],
      reputationDelta: 0,
      powerDelta: 0,
      success: false
    };
  }

  const roomLabel = buildRoomLabel(room);
  const updatedRoom = {
    ...room,
    lockedDown: true,
    lockdownCooldown: 3,
    condition: room.condition === 'Critical' ? 'Watch' : room.condition
  };

  const reputationDelta =
    room.riskLevel === 'Low' && !room.policyOverride ? -1 : 0;

  return {
    room: updatedRoom,
    logs: [
      `Front desk placed ${roomLabel} under temporary lockdown.`,
      `${roomLabel} will remain under controlled access for a short period.`
    ],
    reputationDelta,
    powerDelta: -1,
    success: true
  };
}

export function applyPoliceToRoom(room) {
  if (!room?.occupiedBy) {
    return {
      room,
      logs: ['Police response could not be requested for an unoccupied room.'],
      reputationDelta: 0,
      powerDelta: 0,
      success: false
    };
  }

  const roomLabel = buildRoomLabel(room);
  const updatedRoom = {
    ...room,
    policeCooldown: 3,
    condition: lowerCondition(room.condition || 'Stable')
  };

  const reputationDelta =
    room.riskLevel === 'High' || room.policyOverride
      ? 1
      : room.riskLevel === 'Medium'
      ? 0
      : -2;

  return {
    room: updatedRoom,
    logs: [
      `Police were called to respond near ${roomLabel}, assigned to ${room.occupiedBy}.`,
      `${roomLabel} was brought under external control after police intervention.`
    ],
    reputationDelta,
    powerDelta: -2,
    success: true
  };
}

export function applyPowerCutToRoom(room) {
  if (!room?.occupiedBy) {
    return {
      room,
      logs: ['Power cut could not be applied because no occupied room was selected.'],
      reputationDelta: 0,
      powerDelta: 0,
      success: false
    };
  }

  const roomLabel = buildRoomLabel(room);
  const updatedRoom = {
    ...room,
    powerCut: true,
    powerCutCooldown: 3
  };

  return {
    room: updatedRoom,
    logs: [
      `Power to ${roomLabel} was temporarily cut as an emergency containment measure.`,
      `${room.occupiedBy} is now under restricted room power conditions.`
    ],
    reputationDelta: -1 - getRiskPenalty(room.riskLevel || 'Low'),
    powerDelta: -5,
    success: true
  };
}