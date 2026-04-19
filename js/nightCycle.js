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
    inspectId: 4,
    deepInspect: 6,
    deposit: 6,
    secondaryVerify: 8,
    holdScreening: 8,
    drainPower: 5,
    restorePower: 5,
    callArrival: 18,
    'switchboard-listen': 11,
    'operator-quarters-check': 15,
    'operator-quarters-ignore': 4,
    'border-blind-open': 12,
    'border-refuse': 8,
    'border-log': 7,
    'border-witness-resolve': 5,
    'dawn-shredder': 6,
    'dawn-incinerator': 11,
    'dawn-blackmail': 8,
    'four-am-fixer': 4,
    'basement-skim': 10,
    'basement-resolve': 8
  };

  return costs[actionKey] ?? 0;
}

export function advanceNightCycle(state, actionKey, options = {}) {
  const base = getActionTimeCost(actionKey);
  const scale =
    typeof options.timeScale === 'number' && Number.isFinite(options.timeScale)
      ? Math.max(0, options.timeScale)
      : 1;
  const override =
    typeof options.minutesOverride === 'number' && Number.isFinite(options.minutesOverride)
      ? Math.max(0, options.minutesOverride)
      : null;
  const minutesToAdd =
    override != null ? clampElapsedMinutes(override) : Math.round(base * scale);
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
  const night = Math.max(1, Number(state?.night || 1));
  const powerReq = night >= 8 ? 30 : night >= 5 ? 28 : night >= 3 ? 26 : 25;
  const repReq = night >= 8 ? 44 : night >= 5 ? 42 : night >= 3 ? 41 : 40;

  return [
    {
      id: 'survive-dawn',
      label: 'Survive until 6:00 AM',
      complete: hasReachedDawn(state) && !state?.failedState,
      primary: true
    },
    {
      id: 'power-buffer',
      label: `Finish with at least ${powerReq}% power`,
      complete: (state?.power ?? 0) >= powerReq
    },
    {
      id: 'reputation-buffer',
      label: `Finish with at least ${repReq} reputation`,
      complete: (state?.reputation ?? 0) >= repReq
    },
    {
      id: 'critical-control',
      label: night >= 5 ? 'Keep critical occupied rooms at 0' : 'Keep critical occupied rooms below 2',
      complete: night >= 5 ? criticalRooms < 1 : criticalRooms < 2
    }
  ];
}