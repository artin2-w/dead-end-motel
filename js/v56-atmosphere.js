/**
 * v0.56 — Cinematic atmosphere: data attributes on #app for CSS (pressure, power, camera read).
 * Read-only; safe if called every renderAll.
 */

import { peekV56AtmosphereDebugOverride } from './v56-debug-hooks.js';

export function applyV56Atmosphere(renderState) {
  const app = document.getElementById('app');
  if (!app || !app.classList.contains('screen-game-screen')) {
    if (app) {
      app.removeAttribute('data-v56-pressure');
      app.removeAttribute('data-v56-power-low');
      app.removeAttribute('data-v56-power-crit');
      app.removeAttribute('data-v56-cam-glitch');
    }
    return;
  }

  const pressure = String(renderState?.uiPressureLevel || 'calm').toLowerCase();
  let band = 'low';
  if (pressure === 'dire' || pressure === 'emergency') band = 'high';
  else if (pressure === 'tense' || pressure === 'watched' || pressure === 'elevated') band = 'mid';

  const power = Number(renderState?.power ?? 100);
  const powerLow = power <= 38 ? '1' : '0';
  const powerCrit = power <= 22 ? '1' : '0';

  const cams = Array.isArray(renderState?.cameras) ? renderState.cameras : [];
  let glitch =
    cams.some((c) => {
      const blind = Boolean(c?.blindMode);
      const st = String(c?.status || '').toLowerCase();
      return blind || st === 'noise' || st === 'interference' || st === 'static';
    }) ? '1'
    : '0';

  const ovr = peekV56AtmosphereDebugOverride();
  if (ovr) {
    if (ovr.pressureBand) {
      const pb = String(ovr.pressureBand).toLowerCase();
      if (pb === 'high' || pb === 'mid' || pb === 'low') band = pb;
    }
    if (ovr.camGlitch === '1' || ovr.camGlitch === '0') glitch = ovr.camGlitch;
    if (ovr.powerLow === '1' || ovr.powerLow === '0') powerLow = ovr.powerLow;
    if (ovr.powerCrit === '1' || ovr.powerCrit === '0') powerCrit = ovr.powerCrit;
  }

  app.dataset.v56Pressure = band;
  app.dataset.v56PowerLow = powerLow;
  app.dataset.v56PowerCrit = powerCrit;
  app.dataset.v56CamGlitch = glitch;
}
