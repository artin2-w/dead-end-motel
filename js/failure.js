function countCriticalOccupiedRooms(rooms = []) {
  return rooms.filter(
    (room) => room?.occupiedBy && room?.condition === 'Critical'
  ).length;
}

function countActiveIncidentPressure(state) {
  const incidentsCount = Array.isArray(state?.incidents) ? state.incidents.length : 0;
  const activeEventsCount = Array.isArray(state?.activeEvents) ? state.activeEvents.length : 0;

  return {
    incidentsCount,
    activeEventsCount
  };
}

export function evaluateFailureState(state) {
  if (!state) return null;

  if ((state.power ?? 0) <= 0) {
    return {
      code: 'power-collapse',
      title: 'Motel Blackout',
      reason: 'Power Collapse',
      text: 'The motel lost all usable power and operations failed across the property.'
    };
  }

  if ((state.reputation ?? 0) < 20) {
    return {
      code: 'reputation-collapse',
      title: 'Public Breakdown',
      reason: 'Reputation Collapse',
      text: 'The motel reputation fell too low to maintain control of the night shift.'
    };
  }

  const criticalRooms = countCriticalOccupiedRooms(state.rooms || []);
  if (criticalRooms >= 3) {
    return {
      code: 'critical-overload',
      title: 'Critical Room Overload',
      reason: 'Too Many Critical Rooms',
      text: `Too many occupied rooms escalated into critical instability at the same time (${criticalRooms}).`
    };
  }

  const pressure = countActiveIncidentPressure(state);
  if (pressure.incidentsCount >= 5 || pressure.activeEventsCount >= 6) {
    return {
      code: 'incident-overload',
      title: 'Incident Overload',
      reason: 'Escalation Spiral',
      text: 'Too many incident systems became active at once, and motel control was lost.'
    };
  }

  return null;
}

export function normalizeFailureState(state) {
  return {
    ...state,
    failedState: state?.failedState || null
  };
}