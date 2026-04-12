const SHIFT_START_HOUR = 22;
export const SHIFT_DURATION_MINUTES = 8 * 60;

function clampElapsedMinutes(value) {
  if (typeof value !== 'number' || Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(SHIFT_DURATION_MINUTES, value));
}

function toClockParts(elapsedMinutes = 0) {
  const totalMinutes =
    (SHIFT_START_HOUR * 60 + clampElapsedMinutes(elapsedMinutes)) % (24 * 60);

  const hour24 = Math.floor(totalMinutes / 60);
  const minute = totalMinutes % 60;
  const displayHour = hour24 % 12 || 12;
  const meridiem = hour24 >= 12 ? 'PM' : 'AM';

  return {
    hour24,
    minute,
    displayHour,
    meridiem
  };
}

function formatMinute(minute) {
  return String(minute).padStart(2, '0');
}

export function formatShiftTime(elapsedMinutes = 0) {
  const clock = toClockParts(elapsedMinutes);
  return `${clock.displayHour}:${formatMinute(clock.minute)} ${clock.meridiem}`;
}

export function normalizeNightCycleState(state) {
  return {
    ...state,
    shiftElapsedMinutes: clampElapsedMinutes(state?.shiftElapsedMinutes),
    dawnProcessed: Boolean(state?.dawnProcessed),
    lastAdvanceReason: state?.lastAdvanceReason || null
  };
}

export function getActionTimeCost(actionKey) {
  const costs = {
    scan: 20,
    review: 15,
    dispatch: 20,
    lockdown: 10,
    police: 20,
    cutPower: 10,
    evict: 15,
    checkIn: 10,
    reject: 5,
    flag: 5,
    drainPower: 5,
    restorePower: 5
  };

  return costs[actionKey] ?? 0;
}

export function advanceNightCycle(state, actionKey) {
  const minutesToAdd = getActionTimeCost(actionKey);
  const nextElapsed = clampElapsedMinutes(
    (state?.shiftElapsedMinutes || 0) + minutesToAdd
  );

  return {
    ...state,
    shiftElapsedMinutes: nextElapsed,
    lastAdvanceReason: actionKey || null
  };
}

export function hasReachedDawn(state) {
  return clampElapsedMinutes(state?.shiftElapsedMinutes || 0) >= SHIFT_DURATION_MINUTES;
}

export function getShiftProgressPercent(state) {
  return Math.round(
    (clampElapsedMinutes(state?.shiftElapsedMinutes || 0) / SHIFT_DURATION_MINUTES) * 100
  );
}

export function evaluateNightObjectives(state) {
  const criticalRooms = (state?.rooms || []).filter(
    (room) => room?.occupiedBy && room?.condition === 'Critical'
  ).length;

  return [
    {
      id: 'survive-dawn',
      label: 'Survive until 6:00 AM',
      complete: hasReachedDawn(state) && !state?.failedState,
      primary: true
    },
    {
      id: 'power-buffer',
      label: 'Finish with at least 25% power',
      complete: (state?.power ?? 0) >= 25
    },
    {
      id: 'reputation-buffer',
      label: 'Finish with at least 40 reputation',
      complete: (state?.reputation ?? 0) >= 40
    },
    {
      id: 'critical-control',
      label: 'Keep critical occupied rooms below 2',
      complete: criticalRooms < 2
    }
  ];
}