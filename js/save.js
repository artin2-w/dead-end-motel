const SAVE_KEY = 'dead-end-motel-save';

export function saveState(state) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    return true;
  } catch (_) {
    // fail-safe: run should continue even if storage is unavailable
    return false;
  }
}

export function loadState() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch (_) {
    // Corrupt/legacy run payloads should not block startup.
    try {
      localStorage.removeItem(SAVE_KEY);
    } catch (_) {
      // ignore cleanup failure
    }
    return null;
  }
}

export function clearSave() {
  try {
    localStorage.removeItem(SAVE_KEY);
    return true;
  } catch (_) {
    return false;
  }
}
