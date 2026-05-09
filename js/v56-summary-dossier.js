/**
 * v0.56 — End-of-shift dossier strip (charts + incident highlight + CCTV card).
 */

import { buildV58DossierHtml } from './v58-living-motel.js';
import { buildV59SummaryHtml } from './v59-physical-desk.js';
import { buildV60SummaryHtml } from './v60-motel-memory.js';

function barRow(label, startPct, endPct) {
  const a = Math.max(0, Math.min(100, Math.round(Number(startPct) || 0)));
  const b = Math.max(0, Math.min(100, Math.round(Number(endPct) || 0)));
  const lo = Math.min(a, b);
  const hi = Math.max(a, b);
  const drift = b < a ? 'is-drain' : b > a ? 'is-gain' : 'is-flat';
  return `
    <div class="v56-dossier-row">
      <span class="v56-dossier-label">${label}</span>
      <div class="v56-dossier-bar" role="img" aria-label="${label} ${a} to ${b} percent">
        <span class="v56-dossier-bar-mid" style="left:${lo}%;width:${Math.max(2, hi - lo)}%"></span>
        <span class="v56-dossier-bar-dot" style="left:${a}%"></span>
        <span class="v56-dossier-bar-dot v56-dossier-bar-dot-end ${drift}" style="left:${b}%"></span>
      </div>
      <span class="v56-dossier-vals">${a}% → ${b}%</span>
    </div>
  `;
}

function pickIncidentOfNight(state) {
  const stats = state?.shiftStats || {};
  const candidates = [
    { label: 'Severe incidents', n: Number(stats.severeIncidents || 0) },
    { label: 'Night events missed', n: Number(stats.nightEventsMissed || 0) },
    { label: 'Room calls missed', n: Number(stats.roomCallsMissed || 0) },
    { label: 'Major power incidents', n: Number(stats.majorPowerIncidents || 0) },
    { label: 'Desk consequences queued', n: Number(stats.deskConsequencesQueued || 0) }
  ];
  const best = candidates.reduce((m, c) => (c.n > m.n ? c : m), { label: 'Quiet paperwork', n: 0 });
  if (best.n <= 0) {
    return {
      title: 'Incident of the night',
      detail: 'No single crisis owned the board — pressure stayed diffuse. That can be its own warning.'
    };
  }
  return {
    title: 'Incident of the night',
    detail: `${best.label} peaked at ${best.n} — that is the thread the report will remember.`
  };
}

function choiceDigest(state) {
  const stats = state?.shiftStats || {};
  const parts = [];
  const ci = Number(stats.checkedIn || 0);
  const rj = Number(stats.rejected || 0);
  const fg = Number(stats.flagged || 0);
  if (ci + rj + fg > 0) {
    parts.push(`Desk: ${ci} check-ins · ${fg} flagged · ${rj} turned away`);
  }
  const rs = Number(stats.roomCallsResolved || 0);
  const rm = Number(stats.roomCallsMissed || 0);
  if (rs + rm > 0) parts.push(`Rooms: ${rs} calls handled · ${rm} missed`);
  const scans = Number(stats.cameraScans || 0);
  if (scans > 0) parts.push(`Cameras scanned ×${scans}`);
  const repUsed = Number(stats.reportActionsUsed || 0);
  if (repUsed > 0) parts.push(`Report actions ×${repUsed}`);
  if (!parts.length) return 'Major choices: you kept the shift moving without leaving obvious fingerprints.';
  return `Major choices: ${parts.join(' · ')}`;
}

export function mountV56SummaryDossier(summary, state, rootOverride = null) {
  const root = rootOverride || document.getElementById('v56-summary-dossier');
  if (!root) return;

  const snap = state?.nightStartSnapshot?.state;
  const startPower = snap ? Number(snap.power ?? 100) : null;
  const endPower = Number(state?.power ?? 100);
  const p0 = startPower != null && Number.isFinite(startPower) ? startPower : endPower;

  const startRep = snap ? Number(snap.reputation ?? 50) : null;
  const endRep = Number(state?.reputation ?? 50);
  const r0 = startRep != null && Number.isFinite(startRep) ? startRep : endRep;

  const inc = pickIncidentOfNight(state);
  const digest = choiceDigest(state);
  const grade = summary?.grade || '—';

  let v58DossierHtml = '';
  try {
    v58DossierHtml = buildV58DossierHtml(state);
  } catch {
    v58DossierHtml = '';
  }

  let v59DossierHtml = '';
  try {
    v59DossierHtml = buildV59SummaryHtml(state);
  } catch {
    v59DossierHtml = '';
  }

  let v60DossierHtml = '';
  try {
    v60DossierHtml = buildV60SummaryHtml(state);
  } catch {
    v60DossierHtml = '';
  }

  root.innerHTML = `
    <div class="v56-dossier-strip-intro" role="region" aria-label="Night dossier">
      <span class="v56-dossier-strip-kicker">Shift archive</span>
      <h3 class="v56-dossier-strip-title">Night dossier</h3>
    </div>
    <div class="v56-dossier-grid">
      <div class="v56-dossier-panel v56-dossier-charts">
        <h4 class="v56-dossier-heading">Shift traces</h4>
        ${barRow('Power reserve', p0, endPower)}
        ${barRow('Reputation', r0, endRep)}
        <p class="v56-dossier-foot muted">End grade <strong>${grade}</strong> — trends are from night open vs close.</p>
      </div>
      <div class="v56-dossier-panel v56-dossier-incident">
        <h4 class="v56-dossier-heading">${inc.title}</h4>
        <p class="v56-dossier-incident-detail">${inc.detail}</p>
      </div>
      <div class="v56-dossier-panel v56-dossier-cctv" aria-hidden="true">
        <h4 class="v56-dossier-heading">CCTV pull (noisy)</h4>
        <div class="v56-cctv-frame">
          <div class="v56-cctv-snow"></div>
          <div class="v56-cctv-caption">CAM_02 · LOT · ${String(state?.night || 1).padStart(2, '0')}:XX</div>
        </div>
        <p class="muted v56-cctv-note">Archive artifact — not a live feed.</p>
      </div>
      <div class="v56-dossier-panel v56-dossier-choices">
        <h4 class="v56-dossier-heading">Operator choices</h4>
        <p>${digest}</p>
      </div>
      ${v58DossierHtml}
      ${v59DossierHtml}
      ${v60DossierHtml}
    </div>
  `;
}
