function clampReputationValue(value) {
  return Math.max(0, value);
}

export function normalizeGuestFlags(guests = []) {
  return guests.map((guest) => ({
    ...guest,
    flagged: Boolean(guest.flagged),
    flaggedCount: typeof guest.flaggedCount === 'number' ? guest.flaggedCount : 0
  }));
}

export function applyFlagToGuest(guest) {
  if (!guest) return guest;

  const alreadyFlagged = Boolean(guest.flagged);
  const nextCount = (guest.flaggedCount || 0) + 1;

  return {
    ...guest,
    flagged: true,
    flaggedCount: nextCount,
    riskNote: alreadyFlagged
      ? guest.riskNote
      : `${guest.riskNote || ''} Front desk marked this guest for extra observation.`.trim()
  };
}

export function buildFlagLogs(guest) {
  const logs = [];

  if (!guest) {
    return {
      logs,
      reputationDelta: 0
    };
  }

  if (guest.flagged && (guest.flaggedCount || 0) > 1) {
    logs.push(`Front desk reviewed ${guest.name} again and kept the guest under observation.`);
    return {
      logs,
      reputationDelta: 0
    };
  }

  logs.push(`Front desk flagged ${guest.name} for extra observation before room assignment.`);

  if (guest.riskLevel === 'High') {
    logs.push(`${guest.name} was considered high concern and marked for closer review.`);
    return {
      logs,
      reputationDelta: 1
    };
  }

  if (guest.riskLevel === 'Medium') {
    logs.push(`${guest.name} was marked for observation due to uncertain behavior at reception.`);
    return {
      logs,
      reputationDelta: 0
    };
  }

  logs.push(`${guest.name} was flagged cautiously despite appearing low-risk.`);
  return {
    logs,
    reputationDelta: 0
  };
}

export function buildRejectOutcome(guest) {
  if (!guest) {
    return {
      logs: ['Front desk rejected a guest entry request.'],
      reputationDelta: 0
    };
  }

  if (guest.riskLevel === 'High') {
    return {
      logs: [
        `${guest.name} was denied a room due to high-risk behavior at the front desk.`,
        `Front desk decision: rejecting ${guest.name} likely prevented a dangerous stay.`
      ],
      reputationDelta: 1
    };
  }

  if (guest.riskLevel === 'Medium') {
    return {
      logs: [
        `${guest.name} was denied a room after a cautious front desk review.`
      ],
      reputationDelta: 0
    };
  }

  return {
    logs: [
      `${guest.name} was denied a room despite appearing low-risk.`,
      `Front desk decision may have frustrated a legitimate guest.`
    ],
    reputationDelta: -1
  };
}

export function adjustRoomForDeskDecision(room, guest) {
  if (!room || !guest) return room;

  const updatedRoom = { ...room };

  if (guest.flagged) {
    updatedRoom.deskFlagged = true;

    if (updatedRoom.condition === 'Stable') {
      updatedRoom.condition = 'Watch';
    }
  } else {
    updatedRoom.deskFlagged = false;
  }

  return updatedRoom;
}

export function applyReputationDelta(currentValue, delta) {
  return clampReputationValue(currentValue + delta);
}