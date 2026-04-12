export const MOTEL_ROOM_COUNT = 6;

export function getUnlockedRoomCapForNight(night = 1) {
  const n = Math.max(1, Number(night || 1));
  return Math.min(MOTEL_ROOM_COUNT, 2 + (n - 1));
}

export function createDefaultRooms(options = {}) {
  const cap =
    options.unlockedCap != null
      ? Math.min(MOTEL_ROOM_COUNT, Math.max(1, Number(options.unlockedCap)))
      : MOTEL_ROOM_COUNT;
  return Array.from({ length: MOTEL_ROOM_COUNT }, (_, index) => ({
    id: index + 1,
    label: `Room ${index + 1}`,
    unlocked: index + 1 <= cap,
    occupied: false,
    guestName: null,
    condition: 'Stable'
  }));
}

export function applyRoomUnlockFlags(rooms = [], night = 1) {
  const cap = getUnlockedRoomCapForNight(night);
  return (rooms || []).map((room) => {
    const id = Number(room.id);
    const occupied = Boolean(room.occupied || room.occupiedBy);
    return {
      ...room,
      unlocked: id <= cap || occupied
    };
  });
}

export function computeStayNightsForGuest(guest) {
  if (!guest) return 1;
  const arch = String(guest.archetypeKey || guest.archetypeLabel || '').toLowerCase();
  let p1 = 0.38;
  let p2 = 0.42;
  let p3 = 0.2;
  if (guest.isReturningGuest) {
    p1 = 0.18;
    p2 = 0.44;
    p3 = 0.38;
  }
  if (arch.includes('transient') || arch.includes('drifter')) {
    p1 = 0.52;
    p2 = 0.38;
    p3 = 0.1;
  }
  if (arch.includes('professional') || arch.includes('contractor')) {
    p1 = 0.22;
    p2 = 0.48;
    p3 = 0.3;
  }
  if (guest.riskLevel === 'High') {
    p1 += 0.08;
    p3 -= 0.05;
  }
  if (guest.riskLevel === 'Low') {
    p1 -= 0.06;
    p3 += 0.06;
  }
  const t = p1 + p2 + p3;
  p1 /= t;
  p2 /= t;
  p3 /= t;
  const r = Math.random();
  if (r < p1) return 1;
  if (r < p1 + p2) return 2;
  return 3;
}

export function checkoutVacatedRoom(room) {
  return {
    ...room,
    occupied: false,
    occupiedBy: null,
    guestName: null,
    stayNightsRemaining: 0,
    condition: 'Stable',
    riskLevel: undefined,
    trait: undefined,
    deskFlagged: false,
    policyRecommendation: undefined,
    policyOverride: false,
    occupantArchetypeLabel: null,
    occupantHiddenIntent: null,
    occupantChainBias: undefined,
    escalationCooldown: 0,
    responseCooldown: 0,
    chainPressure: 0,
    lockedDown: false,
    lockdownCooldown: 0,
    powerCut: false,
    powerCutCooldown: 0,
    policeCooldown: 0
  };
}

export function applyStayDecrementBetweenNights(rooms = []) {
  return (rooms || []).map((room) => {
    if (!room?.occupiedBy) return room;
    const left = Math.max(0, Number(room.stayNightsRemaining ?? 1) - 1);
    if (left <= 0) {
      return checkoutVacatedRoom(room);
    }
    return {
      ...room,
      stayNightsRemaining: left
    };
  });
}

export function getAvailableRoom(rooms) {
  return (
    rooms.find((room) => room?.unlocked !== false && !room.occupied && room?.occupiedBy == null) || null
  );
}
