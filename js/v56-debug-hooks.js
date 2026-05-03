/**
 * v0.56 — Dev-only shortcuts to exercise cinematic / ambient / dossier features.
 * Enabled when `?demDebug=1`, localhost, or `window.__DEM_DEV__`.
 */

import { fireV56AmbientEncounterNow } from './v56-ambient-encounters.js';
import { mountV56SummaryDossier } from './v56-summary-dossier.js';

const EFFECT_MS = 8000;

let atmosphereOverride = null; // { until, pressureBand?, camGlitch?, powerLow?, powerCrit? }

let dossierPreviewEl = null;

export function isV56DebugUiEnabled() {
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

export function peekV56AtmosphereDebugOverride() {
  if (!atmosphereOverride || Date.now() > atmosphereOverride.until) {
    atmosphereOverride = null;
    return null;
  }
  const patch = { ...atmosphereOverride };
  delete patch.until;
  return Object.keys(patch).length ? patch : null;
}

function armAtmosphereOverride(patch) {
  atmosphereOverride = {
    until: Date.now() + EFFECT_MS,
    ...patch
  };
}

function ensureDossierPreviewMount() {
  if (dossierPreviewEl?.isConnected) return dossierPreviewEl;
  const el = document.createElement('aside');
  el.id = 'v56-dossier-dev-preview';
  el.className = 'v56-dossier-dev-preview';
  el.setAttribute('aria-label', 'v56 dossier dev preview');
  el.hidden = true;
  el.innerHTML = `
    <div class="v56-dossier-dev-preview-head">
      <span>v56 dossier preview</span>
      <button type="button" class="v56-dossier-dev-preview-close" aria-label="Close preview">&times;</button>
    </div>
    <div id="v56-dossier-dev-preview-root"></div>
  `;
  document.body.appendChild(el);
  el.querySelector('.v56-dossier-dev-preview-close')?.addEventListener('click', () => {
    el.hidden = true;
  });
  dossierPreviewEl = el;
  return el;
}

function ensureDevHud() {
  let hud = document.getElementById('v56-dev-shortcuts-hud');
  if (hud) return hud;
  hud = document.createElement('div');
  hud.id = 'v56-dev-shortcuts-hud';
  hud.className = 'v56-dev-shortcuts-hud';
  hud.innerHTML = `
    <button type="button" class="v56-dev-shortcuts-toggle" aria-expanded="false" title="v56 dev shortcuts">v56</button>
    <div class="v56-dev-shortcuts-panel" hidden>
      <p class="v56-dev-shortcuts-title">v56 test (dev)</p>
      <ul class="v56-dev-shortcuts-list">
        <li><kbd>G</kbd> camera glitch 8s</li>
        <li><kbd>P</kbd> high pressure 8s</li>
        <li><kbd>L</kbd> low power 8s</li>
        <li><kbd>E</kbd> ambient encounter</li>
        <li><kbd>D</kbd> dossier preview</li>
      </ul>
      <p class="v56-dev-shortcuts-note">?demDebug=1 or localhost</p>
    </div>
  `;
  document.body.appendChild(hud);
  const btn = hud.querySelector('.v56-dev-shortcuts-toggle');
  const panel = hud.querySelector('.v56-dev-shortcuts-panel');
  btn?.addEventListener('click', () => {
    const open = panel?.hidden;
    if (panel) panel.hidden = !open;
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
  return hud;
}

function isTypingTarget(el) {
  if (!el || typeof el !== 'object') return false;
  const t = String(el.tagName || '').toUpperCase();
  if (t === 'INPUT' || t === 'TEXTAREA' || t === 'SELECT') return true;
  try {
    if (el.isContentEditable) return true;
  } catch {
    /* ignore */
  }
  return false;
}

/**
 * @param {object} deps
 * @param {() => string} deps.getActiveScreenId
 * @param {() => object|null} deps.getState
 * @param {() => void} deps.renderAll
 * @param {{ playStaticBurst?: (kind?: string) => void }} deps.audioController
 * @param {(s: object, p: object) => void} deps.pushLiveAlert
 */
export function initV56DebugKeyboard(deps) {
  if (!isV56DebugUiEnabled()) return;

  ensureDevHud();

  try {
    console.info(
      '[v56 debug] Active — keyboard G / P / L / E / D (8s for P/L/G). itch.io: add ?demDebug=1 to enable; normal players see no v56 dev UI.'
    );
  } catch {
    /* ignore */
  }

  document.addEventListener(
    'keydown',
    (event) => {
      if (!deps?.getState || !deps?.renderAll) return;
      if (isTypingTarget(event.target)) return;
      if (event.repeat) return;
      if (!event.ctrlKey && !event.metaKey && !event.altKey) {
        // reserved: do not steal plain typing elsewhere
      }
      if (event.ctrlKey || event.metaKey || event.altKey) return;

      const screen = deps.getActiveScreenId();
      const state = deps.getState();

      const code = event.code;
      if (code === 'KeyG' && screen === 'game-screen') {
        event.preventDefault();
        armAtmosphereOverride({ camGlitch: '1' });
        deps.renderAll();
        return;
      }
      if (code === 'KeyP' && screen === 'game-screen') {
        event.preventDefault();
        armAtmosphereOverride({ pressureBand: 'high' });
        deps.renderAll();
        return;
      }
      if (code === 'KeyL' && screen === 'game-screen') {
        event.preventDefault();
        armAtmosphereOverride({ powerLow: '1', powerCrit: '0' });
        deps.renderAll();
        return;
      }
      if (code === 'KeyE' && screen === 'game-screen' && state) {
        event.preventDefault();
        fireV56AmbientEncounterNow(state, {
          pushLiveAlert: deps.pushLiveAlert,
          playStaticBurst: () => {
            try {
              deps.audioController?.playStaticBurst?.('light');
            } catch {
              /* ignore */
            }
          }
        });
        deps.renderAll();
        return;
      }
      if (code === 'KeyD' && state) {
        event.preventDefault();
        const shell = ensureDossierPreviewMount();
        const inner = document.getElementById('v56-dossier-dev-preview-root');
        if (inner) {
          inner.innerHTML = '';
          const mount = document.createElement('div');
          mount.className = 'v56-summary-dossier';
          inner.appendChild(mount);
          mountV56SummaryDossier(
            { grade: state?.lastSummary?.grade || state?.summaryGrade || 'B', summaryLine: 'Dev preview' },
            state,
            mount
          );
        }
        shell.hidden = false;
        return;
      }
    },
    true
  );
}
