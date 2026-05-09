/**
 * Dead End Motel v0.59 — Paranoia / sanity glitch layer (visual-first, time-limited).
 */

import { pushLiveAlert } from './presentation.js';

export function isV59DevEnabled() {
  try {
    if (typeof window !== 'undefined' && window.__DEM_DEV__) return true;
    const h = String(window.location?.hostname || '');
    if (h === 'localhost' || h === '127.0.0.1') return true;
    const q = new URLSearchParams(window.location.search).get('demDebug');
    if (q === '1' || q === 'true') return true;
  } catch {
    /* ignore */
  }
  return false;
}

export function ensureV59Paranoia(state) {
  if (!state?.v59 || typeof state.v59 !== 'object') return;
  const p = state.v59.paranoia;
  if (!p || typeof p !== 'object') {
    state.v59.paranoia = {
      level: 'stable',
      lastGlitchMinute: -999,
      uiLieActiveUntil: 0,
      glitchCount: 0
    };
    return;
  }
  if (typeof p.level !== 'string') p.level = 'stable';
  if (typeof p.lastGlitchMinute !== 'number') p.lastGlitchMinute = -999;
  if (typeof p.uiLieActiveUntil !== 'number') p.uiLieActiveUntil = 0;
  if (typeof p.glitchCount !== 'number') p.glitchCount = 0;
}

function scoreParanoia(state) {
  if (!state) return 0;
  let s = 0;
  const pressure = String(state?.uiPressureLevel || 'calm');
  if (pressure === 'tense') s += 1.5;
  if (pressure === 'dire') s += 2.5;
  if (pressure === 'emergency') s += 3.5;
  const power = Number(state?.power ?? 100);
  if (power <= 35) s += 1.5;
  if (power <= 18) s += 1.5;
  const ph = state?.v59?.phone;
  s += Math.min(3, Number(ph?.missedCount || 0) * 0.7);
  const shadows = (state?.v58?.shadowTraces || []).length;
  s += Math.min(2.5, shadows * 0.6);
  const moral = state?.v58?.morality || {};
  s += Math.min(2, Number(moral.suspiciousApprovals || 0) * 0.5);
  const wx = String(state?.v58?.weather?.type || '');
  if (wx === 'storm' || wx === 'fog') s += 1;
  if (wx === 'wind' || wx === 'rain') s += 0.5;
  if (Number(state?.v58?.morality?.lockdowns || 0) >= 1) s += 0.4;
  return s;
}

export function deriveParanoiaLevel(state) {
  const s = scoreParanoia(state);
  if (s >= 8) return 'breaking';
  if (s >= 5.5) return 'frayed';
  if (s >= 3) return 'uneasy';
  return 'stable';
}

export function tickV59ParanoiaMaybe(state, nowMs = Date.now()) {
  if (!state?.v59) return;
  ensureV59Paranoia(state);
  const p = state.v59.paranoia;
  const level = deriveParanoiaLevel(state);
  p.level = level;
  if (nowMs < Number(p.uiLieActiveUntil || 0)) return;
  const elapsed = Number(state.shiftElapsedMinutes || 0);
  if (level === 'stable') return;
  const roll =
    level === 'breaking' ? 0.09 : level === 'frayed' ? 0.055 : level === 'uneasy' ? 0.032 : 0;
  if (roll <= 0 || Math.random() > roll) return;
  if (elapsed - Number(p.lastGlitchMinute || -999) < 12) return;
  p.lastGlitchMinute = elapsed;
  p.glitchCount = (p.glitchCount || 0) + 1;
  const duration =
    level === 'breaking' ? 22000 : level === 'frayed' ? 16000 : 12000;
  p.uiLieActiveUntil = nowMs + duration;
  if (Array.isArray(state.logs)) {
    state.logs.push('Desk readout flickers — the UI lies for a breath.');
  }
  try {
    pushLiveAlert(state, {
      type: 'warning',
      kind: 'ambient',
      message: 'The monitor ghosts: labels do not match what you remember.',
      dedupeKey: `v59-paranoia-${state.night}-${elapsed}`
    });
  } catch {
    /* ignore */
  }
}

export function forceParanoiaGlitch(state, durationMs = 14000) {
  if (!state?.v59) return;
  ensureV59Paranoia(state);
  const p = state.v59.paranoia;
  p.uiLieActiveUntil = Date.now() + durationMs;
  p.glitchCount = (p.glitchCount || 0) + 1;
  p.level = 'frayed';
}

const V59_LABEL_GLITCH_MAP = [
  ['scan-cameras-btn', 'Scan Cameras', 'Look closer'],
  ['review-incidents-btn', 'Review Incidents', 'Confess'],
  ['dispatch-staff-btn', 'Dispatch Staff', 'Call it in']
];

export function syncV59ParanoiaDom(state) {
  const app = document.getElementById('app');
  if (!app || !state?.v59) return;
  ensureV59Paranoia(state);
  const now = Date.now();
  const active = now < Number(state.v59.paranoia.uiLieActiveUntil || 0);
  const level = deriveParanoiaLevel(state);
  app.classList.toggle('v59-paranoia-active', active);
  app.dataset.v59Paranoia = active ? 'glitch' : level;
  const game = document.getElementById('game-screen');
  if (game) {
    game.classList.toggle('v59-paranoia-room-lie', active);
  }
  V59_LABEL_GLITCH_MAP.forEach(([id, def, lie]) => {
    if (!def || !lie) return;
    const el = document.getElementById(id);
    if (!el) return;
    if (!el.dataset.v59LabelDefaultStored) {
      el.dataset.v59LabelDefaultStored = el.textContent?.trim() || def;
    }
    const base = el.dataset.v59LabelDefaultStored || def;
    el.textContent = active ? lie : base;
  });
  document.querySelectorAll('[data-v59-label-default][data-v59-label-lie]').forEach((el) => {
    const def = el.getAttribute('data-v59-label-default') || '';
    const lie = el.getAttribute('data-v59-label-lie') || '';
    if (!def || !lie) return;
    el.textContent = active ? lie : def;
  });
}
