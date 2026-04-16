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
    logs: [],
    systemOverride: {
      active: false,
      source: '',
      corruptionLevel: 0,
      scannerCompromised: false,
      boardCompromised: false,
      cameraCompromised: false,
      alertsCompromised: false,
      isolatedFeed: false,
      falseEntries: [],
      phreakerPressure: 0,
      manualOps: {
        verifies: 0,
        purges: 0,
        analogChecks: 0,
        trustedAnyway: 0,
        falseCaught: 0,
        falseMissed: 0
      }
    },
    callerThread: {
      callHistory: [],
      lastNightCalled: 0,
      styleMemory: {
        harshControl: 0,
        hospitality: 0,
        patternHunter: 0,
        greed: 0,
        overreaction: 0,
        fear: 0
      },
      huntNightWins: 0,
      huntNightLosses: 0
    },
    huntNight: {
      active: false,
      night: 0,
      callerTargetId: null,
      decoyId: null,
      resolved: false,
      outcome: '',
      cluesCaught: 0,
      wrongEjects: 0
    }
  };
}
