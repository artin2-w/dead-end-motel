/**
 * Dead End Motel — Local PlayStats (v0.55)
 *
 * Purpose:
 * - Store lightweight, non-sensitive gameplay patterns locally to personalize store recommendations.
 * - No network calls. No personal data. No payment secrets.
 *
 * Storage:
 * - localStorage: dem.playStats
 *
 * IMPORTANT:
 * - Resetting play stats must NOT delete purchases/receipts/no_ads/credits/campaign progress.
 */

const KEY = 'dem.playStats';
const RECO_OVERRIDE_KEY = 'dem.recoOverride';

const DEFAULTS = Object.freeze({
  failuresTotal: 0,
  failuresByReason: {},
  recentFailureReasons: [],
  nearWins: 0,
  powerFailures: 0,
  pressureFailures: 0,
  incidentFailures: 0,
  riskyGuestFailures: 0,
  savedContinueUses: 0,
  paidContinueUses: 0,
  storeOpens: 0,
  contractsTried: []
});

function safeParse(raw) {
  try {
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function demGetPlayStats() {
  const raw = (() => {
    try {
      return localStorage.getItem(KEY);
    } catch {
      return null;
    }
  })();
  const parsed = safeParse(raw);
  const base = parsed && typeof parsed === 'object' ? parsed : {};

  return {
    ...DEFAULTS,
    ...base,
    failuresByReason: base.failuresByReason && typeof base.failuresByReason === 'object' ? base.failuresByReason : {},
    recentFailureReasons: Array.isArray(base.recentFailureReasons) ? base.recentFailureReasons.slice(-10) : [],
    contractsTried: Array.isArray(base.contractsTried) ? base.contractsTried.slice(-12) : []
  };
}

export function demWritePlayStats(next) {
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
}

export function demUpdatePlayStats(mutator) {
  const curr = demGetPlayStats();
  const next = typeof mutator === 'function' ? mutator({ ...curr }) : curr;
  demWritePlayStats(next);
  return next;
}

export function demBumpCounter(field, by = 1) {
  demUpdatePlayStats((s) => {
    s[field] = Math.max(0, Number(s[field] || 0) + Number(by || 0));
    return s;
  });
}

export function demRecordFailure({ reasonCode = 'unknown', nearWin = false } = {}) {
  demUpdatePlayStats((s) => {
    s.failuresTotal = Math.max(0, Number(s.failuresTotal || 0) + 1);
    s.failuresByReason = s.failuresByReason && typeof s.failuresByReason === 'object' ? s.failuresByReason : {};
    s.failuresByReason[reasonCode] = Math.max(0, Number(s.failuresByReason[reasonCode] || 0) + 1);
    s.recentFailureReasons = Array.isArray(s.recentFailureReasons) ? s.recentFailureReasons : [];
    s.recentFailureReasons.push(String(reasonCode || 'unknown'));
    s.recentFailureReasons = s.recentFailureReasons.slice(-10);

    if (nearWin) s.nearWins = Math.max(0, Number(s.nearWins || 0) + 1);

    if (reasonCode === 'power-collapse') s.powerFailures = Math.max(0, Number(s.powerFailures || 0) + 1);
    if (reasonCode === 'reputation-collapse' || reasonCode === 'critical-overload') {
      s.pressureFailures = Math.max(0, Number(s.pressureFailures || 0) + 1);
    }
    if (reasonCode === 'incident-overload') s.incidentFailures = Math.max(0, Number(s.incidentFailures || 0) + 1);

    return s;
  });
}

export function demRecordContractTried(contractId) {
  const id = String(contractId || '').trim();
  if (!id || id === 'standard') return;
  demUpdatePlayStats((s) => {
    s.contractsTried = Array.isArray(s.contractsTried) ? s.contractsTried : [];
    if (!s.contractsTried.includes(id)) s.contractsTried.push(id);
    s.contractsTried = s.contractsTried.slice(-12);
    return s;
  });
}

export function demGetRecommendationOverride() {
  try {
    return String(localStorage.getItem(RECO_OVERRIDE_KEY) || '');
  } catch {
    return '';
  }
}

export function demForceRecommendation(productId) {
  try {
    localStorage.setItem(RECO_OVERRIDE_KEY, String(productId || ''));
  } catch {
    // ignore
  }
}

export function demClearRecommendationOverride() {
  try {
    localStorage.removeItem(RECO_OVERRIDE_KEY);
  } catch {
    // ignore
  }
}

// Debug helpers (requested)
window.demDebugPlayStats = function demDebugPlayStats() {
  return demGetPlayStats();
};
window.demResetPlayStats = function demResetPlayStats() {
  // IMPORTANT: does NOT touch purchases, receipts, credits, no_ads, or campaign save.
  demWritePlayStats({ ...DEFAULTS });
  try { localStorage.removeItem('dem.recoShownThisRun'); } catch { /* ignore */ }
  try { localStorage.removeItem(RECO_OVERRIDE_KEY); } catch { /* ignore */ }
  return demGetPlayStats();
};
window.demForceRecommendation = demForceRecommendation;
window.demClearRecommendationOverride = demClearRecommendationOverride;

