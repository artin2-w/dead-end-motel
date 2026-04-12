const INCIDENT_LIBRARY = {
  Low: [
    {
      type: 'Noise Complaint',
      severity: 'low',
      effect: 'watch',
      buildLog: (guestName, roomLabel) =>
        `A minor noise complaint was reported near ${roomLabel}, possibly linked to ${guestName}.`
    },
    {
      type: 'Late Movement',
      severity: 'low',
      effect: 'none',
      buildLog: (guestName, roomLabel) =>
        `${guestName} was seen moving in and out of ${roomLabel} unusually late, but nothing further was confirmed.`
    }
  ],
  Medium: [
    {
      type: 'Disturbance',
      severity: 'medium',
      effect: 'watch',
      buildLog: (guestName, roomLabel) =>
        `Front desk received a disturbance report connected to ${guestName} in ${roomLabel}.`
    },
    {
      type: 'Unverified Visitor',
      severity: 'medium',
      effect: 'watch',
      buildLog: (guestName, roomLabel) =>
        `An unverified visitor was seen approaching ${roomLabel}, which had been assigned to ${guestName}.`
    },
    {
      type: 'Door Check',
      severity: 'medium',
      effect: 'critical',
      buildLog: (guestName, roomLabel) =>
        `${guestName} repeatedly opened and checked the door of ${roomLabel}, drawing staff attention.`
    }
  ],
  High: [
    {
      type: 'Violent Argument',
      severity: 'high',
      effect: 'critical',
      buildLog: (guestName, roomLabel) =>
        `Raised voices and signs of a violent argument were reported around ${roomLabel}, associated with ${guestName}.`
    },
    {
      type: 'Damaged Property',
      severity: 'high',
      effect: 'critical',
      buildLog: (guestName, roomLabel) =>
        `Possible property damage was reported inside or near ${roomLabel}, where ${guestName} is staying.`
    },
    {
      type: 'Missing Guest',
      severity: 'high',
      effect: 'critical',
      buildLog: (guestName, roomLabel) =>
        `${guestName} could not be accounted for after unusual activity was reported around ${roomLabel}.`
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

function getBaseRiskChance(riskLevel) {
  if (riskLevel === 'High') return 0.58;
  if (riskLevel === 'Medium') return 0.34;
  return 0.16;
}

function getConditionModifier(condition) {
  if (condition === 'Critical') return 0.28;
  if (condition === 'Watch') return 0.18;
  return 0;
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

export function hasActionableIncidentReviewContext(rooms = []) {
  const occupied = (rooms || []).filter((room) => room?.occupiedBy);
  if (!occupied.length) return false;
  if (occupied.some((room) => (room.condition || 'Stable') !== 'Stable')) return true;
  if (occupied.some((room) => Number(room.chainPressure || 0) >= 4)) return true;
  if (occupied.some((room) => Boolean(room.deskFlagged) || Boolean(room.policyOverride))) return true;
  return false;
}

export function reviewRoomIncidents(rooms, night = 1) {
  const updatedRooms = rooms.map((room) => ({ ...room }));
  const logs = [];
  const incidentSummaries = [];

  const occupiedRooms = updatedRooms.filter((room) => room.occupiedBy);

  if (!occupiedRooms.length) {
    logs.push('Incident review complete. No occupied rooms required attention.');
    return {
      rooms: updatedRooms,
      logs,
      reputationDelta: 0,
      powerDelta: 0,
      generated: 0
    };
  }

  let reputationDelta = 0;
  let powerDelta = 0;
  let generated = 0;
  const safeNight = Math.max(1, Number(night || 1));

  occupiedRooms.forEach((room) => {
    const guestName = room.occupiedBy || 'Unknown Guest';
    const riskLevel = room.riskLevel || 'Low';
    const condition = room.condition || 'Stable';

    let chance =
      Math.min(
        getBaseRiskChance(riskLevel) +
          getConditionModifier(condition) +
          (night - 1) * 0.04,
        0.9
      );

    if (safeNight === 1) chance *= 0.68;
    else if (safeNight === 2) chance *= 0.82;
    else if (safeNight >= 4) chance *= 1.05;
    if (safeNight >= 6) chance *= 1.06 + Math.min(0.12, (safeNight - 5) * 0.018);

    if (safeNight <= 2 && generated >= 1) {
      chance *= 0.62;
    } else if (safeNight <= 4 && generated >= 2) {
      chance *= 0.8;
    }

    chance = Math.max(0.05, Math.min(0.92, chance));

    if (Math.random() > chance) return;

    const pool = INCIDENT_LIBRARY[riskLevel] || INCIDENT_LIBRARY.Low;
    const incident = pickRandom(pool);
    const roomLabel = buildRoomLabel(room);

    room.condition = upgradeCondition(condition, incident.effect);

    logs.push(incident.buildLog(guestName, roomLabel));

    incidentSummaries.push({
      roomId: room.id,
      guestName,
      riskLevel,
      condition: room.condition,
      type: incident.type,
      severity: incident.severity
    });

    generated += 1;

    if (incident.severity === 'medium') {
      reputationDelta -= 1;
    }

    if (incident.severity === 'high') {
      reputationDelta -= 2;
      powerDelta -= 5;
    }
  });

  if (!generated) {
    logs.push('Incident review complete. No new room incidents were confirmed.');
  }

  return {
    rooms: updatedRooms,
    logs,
    reputationDelta,
    powerDelta,
    generated,
    incidents: incidentSummaries
  };
}