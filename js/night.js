import { buildShiftOutcome } from './scoring.js';

export function buildNightSummary(state) {
  return buildShiftOutcome({
    night: state.night,
    money: state.money,
    power: state.power,
    reputation: state.reputation,
    logs: state.logs,
    incidents: state.incidents,
    shiftStats: state.shiftStats
  });
}
