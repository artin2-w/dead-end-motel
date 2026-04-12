const SETTINGS_STORAGE_KEY = 'dead-end-motel-settings-v1';

const DEFAULT_SETTINGS = Object.freeze({
  version: 2,
  masterSound: true,
  uiScale: 'normal',
  reducedMotion: false,
  tutorialGuidance: true,
  confirmDestructiveActions: true,
  advancedHelperText: true,
  highContrast: false
});

function normalizeUiScale(value, sourceVersion = 2) {
  const safe = String(value || 'normal').toLowerCase();

  // v1 migration:
  // old small -> new normal (default baseline)
  // old normal -> new large
  // old large -> new large (repurposed, no oversized mode)
  if (Number(sourceVersion || 0) < 2) {
    if (safe === 'small') return 'normal';
    if (safe === 'normal' || safe === 'large') return 'large';
  }

  return ['compact', 'normal', 'large'].includes(safe) ? safe : 'normal';
}

export function normalizeSettings(raw = {}) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const sourceVersion = Number(source.version || 1);
  return {
    version: 2,
    masterSound: source.masterSound !== false,
    uiScale: normalizeUiScale(source.uiScale, sourceVersion),
    reducedMotion: Boolean(source.reducedMotion),
    tutorialGuidance: source.tutorialGuidance !== false,
    confirmDestructiveActions: source.confirmDestructiveActions !== false,
    advancedHelperText: source.advancedHelperText !== false,
    highContrast: Boolean(source.highContrast)
  };
}

export function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) {
      return { ...DEFAULT_SETTINGS, __storageLoaded: true };
    }
    return { ...normalizeSettings(JSON.parse(raw)), __storageLoaded: true };
  } catch (_) {
    return { ...DEFAULT_SETTINGS, __storageLoaded: false };
  }
}

export function saveSettings(settings) {
  const normalized = normalizeSettings(settings);
  let storageHealthy = true;
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(normalized));
  } catch (_) {
    // fail-safe: never block gameplay/UI on storage errors
    storageHealthy = false;
  }
  return {
    ...normalized,
    __storageLoaded: storageHealthy
  };
}

export function applySettingsToDocument(settings) {
  const normalized = normalizeSettings(settings);
  const root = document.documentElement;
  const body = document.body;
  if (!root || !body) return normalized;

  root.setAttribute('data-ui-scale', normalized.uiScale);
  body.classList.toggle('reduced-motion', normalized.reducedMotion);
  body.classList.toggle('helpers-advanced-off', !normalized.advancedHelperText);
  body.classList.toggle('high-contrast', normalized.highContrast);
  return normalized;
}
