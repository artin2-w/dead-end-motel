export const DEFAULT_STATE = Object.freeze({
  money: 120,
  night: 1,
  reputation: 50,
  power: 100,
  guests: [],
  rooms: [],
  cameras: [],
  activeEvents: [],
  logs: []
});

export function createInitialState() {
  return {
    money: DEFAULT_STATE.money,
    night: DEFAULT_STATE.night,
    reputation: DEFAULT_STATE.reputation,
    power: DEFAULT_STATE.power,
    guests: [],
    rooms: [],
    cameras: [],
    activeEvents: [],
    logs: []
  };
}
