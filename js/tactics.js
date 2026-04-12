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
    lockdownCooldown: 4,
    condition: room.condition === 'Critical' ? 'Watch' : room.condition
  };

  const reputationDelta = room.riskLevel === 'Low' && !room.policyOverride ? -1 : 0;

  return {
    room: updatedRoom,
    logs: [
      `NOW — Hard lockdown on ${roomLabel}: corridor traffic and guest movement are frozen; incident spillover into shared space drops sharply.`,
      `NOW — Staff keys and access logs are aligned; ${room.occupiedBy} is contained while the situation is documented.`,
      `LATER — Forced access events draw ownership scrutiny: expect complaint traffic, paperwork, and reputation drag once the lock lifts.`
    ],
    reputationDelta,
    powerDelta: -3,
    deferredReputationDelta: -2,
    deferredLogLine: `LATER — Audit tail: the ${roomLabel} lockdown is cited in a guest complaint batch and slows the next managerial sign-off.`,
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
    powerCutCooldown: 4,
    condition: room.condition === 'Critical' ? 'Watch' : room.condition
  };

  return {
    room: updatedRoom,
    logs: [
      `NOW — Breaker pulled on ${roomLabel}: lights, climate, and outlets die; volatile activity inside loses momentum immediately.`,
      `NOW — Grid load shifts; the property eats a short operational cost, but the worst camera-linked spikes often flatten.`,
      `LATER — Guests remember “blackout rooms”; maintenance opens a damage ticket and ownership questions whether cuts were justified.`
    ],
    reputationDelta: -2 - getRiskPenalty(room.riskLevel || 'Low'),
    powerDelta: -8,
    deferredReputationDelta: -3,
    deferredLogLine: `LATER — Aftermath: ${roomLabel}'s hard cut is logged as a code-adjacent incident; expect a reputation hit when the story spreads.`,
    success: true
  };
}