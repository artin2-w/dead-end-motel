function getPhase2() {
  window.DeadEndPhase2 = window.DeadEndPhase2 || {};
  return window.DeadEndPhase2;
}

const FLAVOR_LINES = [
  'Motel log: Room 6 phone rings, but no extension was dialed.',
  'Staff note: Lobby lights flickered exactly three times at 2:13 AM.',
  'Security memo: Rear exit camera catches movement that never enters frame.',
  'Front desk scrap: "Do not check in guests who avoid mirrors."',
  'Night audit: Vending machine stock changed without any sale registered.'
];

export function tickFlavor(state, pushAlert) {
  if (!state || Math.random() > 0.12) return;
  const line = FLAVOR_LINES[Math.floor(Math.random() * FLAVOR_LINES.length)];
  state.logs.push(line);
  if (typeof pushAlert === 'function') {
    pushAlert({
      type: 'info',
      message: line,
      dedupeKey: `phase2-flavor-${line.slice(0, 20)}`
    });
  }
}

const ns = getPhase2();
ns.flavorSystem = { tickFlavor };
ns.tickFlavor = tickFlavor;
