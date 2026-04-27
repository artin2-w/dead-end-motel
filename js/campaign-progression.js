/**
 * Dead End Motel — Campaign Progression (v0.53)
 * Tracks night completion, unlocks, and motel files in localStorage.
 * Never touches PayPal, product IDs, or purchases.
 */

const CAMPAIGN_NIGHTS = [
  {
    night: 1,
    title: 'Quiet Desk',
    theme: 'Basic desk survival, guests, and simple incidents.',
    unlockId: 'incident_log',
    unlockLabel: 'Incident Log',
    fileId: 'file_001'
  },
  {
    night: 2,
    title: 'Strange Guests',
    theme: 'More suspicious guests and risk clues.',
    unlockId: 'guest_risk_notes',
    unlockLabel: 'Guest Risk Notes',
    fileId: 'file_002'
  },
  {
    night: 3,
    title: 'Grid Problems',
    theme: 'Power stress and potential outages.',
    unlockId: 'emergency_generator',
    unlockLabel: 'Emergency Generator',
    fileId: 'file_003'
  },
  {
    night: 4,
    title: 'Camera Blind Spots',
    theme: 'Camera anomalies and surveillance pressure.',
    unlockId: 'camera_archive',
    unlockLabel: 'Camera Archive',
    fileId: 'file_004'
  },
  {
    night: 5,
    title: 'The Last Dawn',
    theme: 'Final survival night with higher pressure.',
    unlockId: 'endless_mode',
    unlockLabel: 'Endless Mode',
    fileId: 'file_005'
  }
];

const MOTEL_FILES = [
  {
    id: 'file_001',
    night: 1,
    title: 'File 001: The First Clerk',
    text: 'The first clerk wrote that the motel was quiet only when no one checked the cameras.'
  },
  {
    id: 'file_002',
    night: 2,
    title: 'File 002: Power Incident',
    text: 'A maintenance report mentions repeated flickering before guest disappearances.'
  },
  {
    id: 'file_003',
    night: 3,
    title: 'File 003: Room 7 Notice',
    text: 'Room 7 was marked unavailable, but the key was never removed from the desk.'
  },
  {
    id: 'file_004',
    night: 4,
    title: 'File 004: Blind Feed',
    text: 'Camera feeds sometimes show the hallway from an angle no camera should have.'
  },
  {
    id: 'file_005',
    night: 5,
    title: 'File 005: Last Dawn',
    text: 'The motel does not end at dawn. It only resets.'
  }
];

// ── localStorage keys ─────────────────────────────────────────────
const LS_COMPLETED = 'dem.campaign.completedNights';
const LS_UNLOCKS   = 'dem.campaign.unlocks';
const LS_FILES     = 'dem.campaign.motelFiles';

function lsGet(key) {
  try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; }
}
function lsSave(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch { /* ignore */ }
}
function loadProg() {
  return {
    completedNights: lsGet(LS_COMPLETED) || [],
    unlocks: lsGet(LS_UNLOCKS) || [],
    motelFiles: lsGet(LS_FILES) || []
  };
}
function getNightData(n) {
  return CAMPAIGN_NIGHTS.find(x => x.night === n) || null;
}
function getCurrentCampaignNight(prog) {
  for (let i = 1; i <= 5; i++) {
    if (!prog.completedNights.includes(i)) return i;
  }
  return null;
}
function esc(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ── Mark night completed and grant unlocks ────────────────────────
function markNightCompleted(nightNum) {
  const n = Number(nightNum);
  if (!n || n < 1 || n > 99) return;
  const prog = loadProg();

  let isNew = false;
  if (!prog.completedNights.includes(n)) {
    prog.completedNights.push(n);
    lsSave(LS_COMPLETED, prog.completedNights);
    console.log('Campaign: night completed', n);
    isNew = true;
  }

  const nd = getNightData(n);
  if (nd) {
    if (!prog.unlocks.includes(nd.unlockId)) {
      prog.unlocks.push(nd.unlockId);
      lsSave(LS_UNLOCKS, prog.unlocks);
      console.log('Campaign: feature unlocked', nd.unlockId);
    }
    if (nd.fileId && !prog.motelFiles.includes(nd.fileId)) {
      prog.motelFiles.push(nd.fileId);
      lsSave(LS_FILES, prog.motelFiles);
      console.log('Campaign: motel file unlocked', nd.fileId);
    }
    if (isNew) showUnlockToast(nd);
  }
}

// ── Unlock toast ──────────────────────────────────────────────────
let _toastTimer = null;
function showUnlockToast(nd) {
  const toast = document.getElementById('dem-unlock-toast');
  if (!toast) return;
  clearTimeout(_toastTimer);
  toast.innerHTML = `<strong class="dem-toast-title">Unlocked: ${esc(nd.unlockLabel)}</strong>
    <span class="dem-toast-sub">New tool available for future shifts.</span>`;
  toast.hidden = false;
  toast.setAttribute('aria-hidden', 'false');
  toast.classList.add('dem-toast--visible');
  _toastTimer = setTimeout(() => {
    toast.classList.remove('dem-toast--visible');
    setTimeout(() => {
      toast.hidden = true;
      toast.setAttribute('aria-hidden', 'true');
    }, 400);
  }, 3500);
}

// ── Campaign progress map (main menu) ─────────────────────────────
function renderCampaignProgressMap() {
  const mount = document.getElementById('dem-campaign-map-mount');
  if (!mount) return;
  const prog = loadProg();
  const currentNight = getCurrentCampaignNight(prog);
  const campaignComplete = prog.completedNights.includes(5);

  const rows = CAMPAIGN_NIGHTS.map(nd => {
    const done = prog.completedNights.includes(nd.night);
    const isCurrent = nd.night === currentNight;
    const icon = done ? '✓' : isCurrent ? '▶' : '🔒';
    const cls = done ? 'dem-cprow--done' : isCurrent ? 'dem-cprow--current' : 'dem-cprow--locked';
    const unlockBadge = done
      ? `<span class="dem-cprow-badge">${esc(nd.unlockLabel)}</span>` : '';
    return `<li class="dem-cprow ${cls}">
      <span class="dem-cprow-icon" aria-hidden="true">${icon}</span>
      <span class="dem-cprow-label">Night ${nd.night}: ${esc(nd.title)}</span>
      ${unlockBadge}
    </li>`;
  }).join('');

  const completeNote = campaignComplete
    ? `<p class="dem-cp-complete">Campaign survived. Endless Mode unlocked.</p>` : '';

  mount.innerHTML = `<div class="dem-campaign-map">
    <p class="dem-cp-heading">Campaign Progress</p>
    <ul class="dem-cp-list">${rows}</ul>
    ${completeNote}
    <button type="button" class="dem-cp-reset-btn" id="dem-cpmap-reset-btn">Reset campaign progress</button>
  </div>`;

  const btn = document.getElementById('dem-cpmap-reset-btn');
  if (btn) {
    btn.addEventListener('click', () => {
      if (confirm('Reset campaign progress? Purchases will not be affected.')) {
        resetCampaignProgress();
      }
    });
  }
}

// ── Motel Files panel ─────────────────────────────────────────────
function renderMotelFilesPanel() {
  const mount = document.getElementById('dem-motel-files-mount');
  if (!mount) return;
  const prog = loadProg();
  const items = MOTEL_FILES.map(f => {
    if (prog.motelFiles.includes(f.id)) {
      return `<li class="dem-file dem-file--unlocked">
        <strong class="dem-file-title">${esc(f.title)}</strong>
        <p class="dem-file-text">${esc(f.text)}</p>
      </li>`;
    }
    return `<li class="dem-file dem-file--locked">
      <span class="dem-file-lock">Locked — survive more nights</span>
    </li>`;
  }).join('');
  mount.innerHTML = `<ul class="dem-files-list">${items}</ul>`;
}

// ── Failure screen campaign strip ─────────────────────────────────
function refreshDemCampaignFailureStrip(currentNight) {
  const strip = document.getElementById('dem-failure-campaign-strip');
  if (!strip) return;
  const n = Number(currentNight) || 1;
  const prog = loadProg();
  const nd = getNightData(n);

  if (prog.completedNights.includes(5)) {
    strip.hidden = false;
    strip.innerHTML = '<p class="dem-fail-cp-line">Campaign survived. Endless Mode unlocked.</p>';
    return;
  }

  const unlockLabel = nd?.unlockLabel || null;
  strip.hidden = false;
  strip.innerHTML = `<div class="dem-fail-cp">
    <p class="dem-fail-cp-line">Campaign: Night ${n} / 5</p>
    ${unlockLabel
      ? `<p class="dem-fail-cp-next">Next unlock: ${esc(unlockLabel)}</p>
         <p class="dem-fail-cp-hint">If you continue and survive, you can still unlock <strong>${esc(unlockLabel)}</strong>.</p>`
      : ''}
  </div>`;
}
window.refreshDemCampaignFailureStrip = refreshDemCampaignFailureStrip;

// ── Game screen: next unlock line ─────────────────────────────────
function refreshDemNextUnlockLine(currentNight) {
  const el = document.getElementById('dem-next-unlock-line');
  if (!el) return;
  const n = Number(currentNight) || 1;
  const prog = loadProg();
  const nd = getNightData(n);
  if (!nd || prog.unlocks.includes(nd.unlockId)) {
    el.hidden = true;
    el.textContent = '';
    return;
  }
  el.hidden = false;
  el.textContent = `Next unlock: ${nd.unlockLabel} — survive Night ${n}.`;
}

// ── Reset (never touches purchases) ──────────────────────────────
function resetCampaignProgress() {
  try {
    localStorage.removeItem(LS_COMPLETED);
    localStorage.removeItem(LS_UNLOCKS);
    localStorage.removeItem(LS_FILES);
    console.log('Campaign progress reset. Purchases unaffected.');
  } catch { /* ignore */ }
  renderCampaignProgressMap();
  renderMotelFilesPanel();
  const strip = document.getElementById('dem-failure-campaign-strip');
  if (strip) { strip.hidden = true; strip.innerHTML = ''; }
  refreshDemNextUnlockLine(1);
}

// ── Window API ────────────────────────────────────────────────────

window.deadEndMotelGetCampaignInfo = function(currentNight) {
  const n = Number(currentNight) || 1;
  const prog = loadProg();
  const nd = getNightData(n);
  const nextNd = getNightData(n + 1);
  const info = {
    currentNight: n,
    title: nd?.title || `Night ${n}`,
    theme: nd?.theme || '',
    currentUnlock: nd?.unlockLabel || null,
    currentUnlockId: nd?.unlockId || null,
    nextUnlock: nextNd?.unlockLabel || null,
    nextUnlockId: nextNd?.unlockId || null,
    completedNights: prog.completedNights.slice(),
    unlockedFeatures: prog.unlocks.slice(),
    unlockedFiles: prog.motelFiles.slice(),
    campaignComplete: prog.completedNights.includes(5)
  };
  console.log('Campaign info', info);
  return info;
};

// Called from main.js after a successful night ends
window.demCampaignOnNightCompleted = function(nightNum) {
  markNightCompleted(Number(nightNum));
  renderCampaignProgressMap();
  renderMotelFilesPanel();
};

// Called from main.js renderAll()
window.demCampaignRenderAll = function(currentNight) {
  renderCampaignProgressMap();
  renderMotelFilesPanel();
  refreshDemNextUnlockLine(currentNight);
};

// Initial render when this module loads (covers the first renderAll() race)
renderCampaignProgressMap();
renderMotelFilesPanel();
