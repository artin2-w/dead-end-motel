function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function findRoomById(rooms = [], roomId) {
  return rooms.find((room) => String(room.id) === String(roomId));
}

export function normalizeChainState(state) {
  return {
    ...state,
    storyChains: ensureArray(state?.storyChains).map((chain) => ({
      id: chain.id,
      roomId: chain.roomId ?? null,
      guestName: chain.guestName ?? null,
      pressure: typeof chain.pressure === 'number' ? chain.pressure : 0,
      stage: typeof chain.stage === 'number' ? chain.stage : 0,
      resolved: Boolean(chain.resolved),
      lastType: chain.lastType || null
    }))
  };
}

export function registerChainSignal(state, payload = {}) {
  const roomId = payload.roomId ?? null;
  if (roomId == null) return null;

  if (!Array.isArray(state.storyChains)) {
    state.storyChains = [];
  }

  let chain = state.storyChains.find(
    (entry) => String(entry.roomId) === String(roomId) && !entry.resolved
  );

  if (!chain) {
    chain = {
      id: `chain-${roomId}-${Date.now()}`,
      roomId,
      guestName: payload.guestName || null,
      pressure: 0,
      stage: 0,
      resolved: false,
      lastType: null
    };
    state.storyChains.push(chain);
  }

  chain.guestName = payload.guestName || chain.guestName || null;
  chain.pressure += Math.max(1, payload.severity || 1);
  chain.lastType = payload.type || chain.lastType;

  if (chain.pressure >= 3) chain.stage = Math.max(chain.stage, 1);
  if (chain.pressure >= 6) chain.stage = Math.max(chain.stage, 2);
  if (chain.pressure >= 9) chain.stage = Math.max(chain.stage, 3);

  return chain;
}

export function applyChainPressureToRoom(state, chain) {
  if (!chain || chain.roomId == null) return null;

  const room = findRoomById(state.rooms || [], chain.roomId);
  if (!room || !room.occupiedBy) return null;

  const logs = [];

  if (chain.stage >= 2 && room.condition === 'Stable') {
    room.condition = 'Watch';
    logs.push(
      `${room.label || `Room ${room.id}`} developed a linked pattern of concern after repeated warning signs.`
    );
  }

  if (chain.stage >= 3 && room.condition !== 'Critical') {
    room.condition = 'Critical';
    logs.push(
      `${room.label || `Room ${room.id}`} crossed into critical instability after a chain of connected incidents.`
    );
  }

  return logs;
}

export function calmChainForRoom(state, roomId, amount = 2) {
  if (!Array.isArray(state.storyChains)) return null;

  const chain = state.storyChains.find(
    (entry) => String(entry.roomId) === String(roomId) && !entry.resolved
  );

  if (!chain) return null;

  chain.pressure = Math.max(0, chain.pressure - amount);

  if (chain.pressure <= 1) {
    chain.resolved = true;
  }

  return chain;
}

export function getVisibleChainPressureForRoom(state, roomId) {
  const chain = ensureArray(state?.storyChains).find(
    (entry) => String(entry.roomId) === String(roomId) && !entry.resolved
  );

  if (!chain) return 0;
  return chain.pressure;
}