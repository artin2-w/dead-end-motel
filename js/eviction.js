function buildRoomLabel(room) {
  if (!room) return 'the assigned room';
  if (room.label) return room.label;
  if (room.name) return room.name;
  if (room.number !== undefined) return `Room ${room.number}`;
  if (room.id !== undefined) return `Room ${room.id}`;
  return 'the assigned room';
}

function isDangerousEviction(room) {
  return (
    room?.riskLevel === 'High' ||
    room?.policyOverride === true ||
    room?.condition === 'Critical'
  );
}

function isQuestionableEviction(room) {
  return (
    room?.riskLevel === 'Medium' ||
    room?.policyRecommendation === 'Watch' ||
    room?.condition === 'Watch'
  );
}

export function clearRoomAfterEviction(room) {
  return {
    ...room,
    occupiedBy: null,
    guestName: null,
    stayNightsRemaining: 0,
    riskLevel: null,
    deskFlagged: false,
    policyRecommendation: null,
    policyOverride: false,
    lockedDown: false,
    lockdownCooldown: 0,
    powerCut: false,
    powerCutCooldown: 0,
    policeCooldown: 0,
    responseCooldown: 0,
    escalationCooldown: 0,
    condition: 'Stable'
  };
}

export function evictGuestFromRoom(room) {
  if (!room?.occupiedBy) {
    return {
      room,
      logs: ['Eviction could not proceed because the selected room is already vacant.'],
      reputationDelta: 0,
      moneyDelta: 0,
      success: false
    };
  }

  const roomLabel = buildRoomLabel(room);
  const guestName = room.occupiedBy;
  const clearedRoom = clearRoomAfterEviction(room);

  if (isDangerousEviction(room)) {
    return {
      room: clearedRoom,
      logs: [
        `${guestName} was forcibly removed from ${roomLabel} after motel control measures escalated.`,
        `${roomLabel} was cleared and reset after the removal of ${guestName}.`
      ],
      reputationDelta: 2,
      moneyDelta: -10,
      success: true
    };
  }

  if (isQuestionableEviction(room)) {
    return {
      room: clearedRoom,
      logs: [
        `${guestName} was removed from ${roomLabel} after front desk decided the stay was no longer manageable.`,
        `${roomLabel} was cleared after the guest removal.`
      ],
      reputationDelta: 0,
      moneyDelta: -12,
      success: true
    };
  }

  return {
    room: clearedRoom,
    logs: [
      `${guestName} was removed from ${roomLabel} despite no clear severe threat being recorded.`,
      `The forced checkout from ${roomLabel} may be seen as unfair treatment by other guests.`
    ],
    reputationDelta: -3,
    moneyDelta: -15,
    success: true
  };
}