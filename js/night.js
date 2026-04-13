import { buildShiftOutcome } from './scoring.js';

export function buildNightSummary(state) {
  const base = buildShiftOutcome({
    night: state.night,
    money: state.money,
    power: state.power,
    reputation: state.reputation,
    logs: state.logs,
    incidents: state.incidents,
    shiftStats: state.shiftStats
  });
  const crisis = state?.crisisNight || {};
  const identity = [];
  const carriedRooms = (state?.rooms || []).filter((room) => room?.occupiedBy).length;
  const rememberedRooms = (state?.rooms || []).filter((room) => Number(room?.memory?.incidentsSeen || 0) >= 2).length;
  if (crisis.active && crisis.title) {
    identity.push(`The night developed under ${crisis.title.toLowerCase()}, which made small errors spread faster than usual.`);
  }
  if (carriedRooms > 0) {
    identity.push(`${carriedRooms} occupied room${carriedRooms === 1 ? '' : 's'} were carried forward, so the shift began with continuity pressure already active.`);
  }
  if (rememberedRooms > 0) {
    identity.push(`${rememberedRooms} room${rememberedRooms === 1 ? '' : 's'} carried remembered pressure, making the property feel less reset and more haunted by prior decisions.`);
  }
  if (Number(state?.shiftStats?.recurringGuestsHandled || 0) > 0 || Number(state?.shiftStats?.recurringGuestsMissed || 0) > 0) {
    identity.push('Returning guest history shaped the tone of the shift more directly than a clean first-time desk flow.');
  }

  return {
    ...base,
    text: [
      base.text,
      ...(identity.length ? [identity[0]] : [])
    ].filter(Boolean).join(' '),
    breakdown: [
      ...(Array.isArray(base.breakdown) ? base.breakdown : []),
      ...identity.slice(0, 2)
    ]
  };
}
