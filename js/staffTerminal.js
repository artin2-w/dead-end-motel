/**
 * Staff Terminal / Site Integration Foundation
 * Local-only motel staff computer UI; optional links to deadendmotel.site
 */

const SITE_ROOT = 'https://deadendmotel.site';
const SITE_FILES = 'https://deadendmotel.site/files.html';
const SITE_FLOOR = 'https://deadendmotel.site/floor-plan.html';
const SITE_MEDIA = 'https://deadendmotel.site/media.html';
const SITE_TRAINING = 'https://deadendmotel.site/training-manual.html';
const SITE_GUEST_DB = 'https://deadendmotel.site/guest-database.html';
const SITE_LOST_FOUND = 'https://deadendmotel.site/lost-and-found.html';

const LS = {
  code204: 'deadEndMotel_code204Unlocked',
  code013: 'deadEndMotel_code013Unlocked',
  terminalCodes: 'deadEndMotel_terminalCodes',
  foundItems: 'deadEndMotel_foundItems'
};

function safeGetItem(key) {
  try {
    if (typeof localStorage === 'undefined' || !localStorage) return null;
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSetItem(key, value) {
  try {
    if (typeof localStorage === 'undefined' || !localStorage) return false;
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

function parseTerminalCodes() {
  const raw = safeGetItem(LS.terminalCodes);
  if (!raw) return {};
  try {
    const o = JSON.parse(raw);
    return o && typeof o === 'object' ? o : {};
  } catch {
    return {};
  }
}

function saveTerminalCodes(obj) {
  try {
    safeSetItem(LS.terminalCodes, JSON.stringify(obj));
  } catch {
    /* ignore */
  }
}

export function loadTerminalUnlocks() {
  const codes = parseTerminalCodes();
  return {
    room204Note: safeGetItem(LS.code204) === '1' || codes.room204Note === true,
    guest013Addendum: safeGetItem(LS.code013) === '1' || codes.guest013Addendum === true,
    missing404: codes.missing404 === true,
    cameraResetPlaceholder: codes.cameraResetPlaceholder === true,
    lf204Ref: codes.lf204Ref === true,
    lf007Ref: codes.lf007Ref === true,
    watch118Note: codes.watch118Note === true,
    gaz204Reserved: codes.gaz204Reserved === true,
    vm204Reserved: codes.vm204Reserved === true
  };
}

function persistUnlocksFromCodeResult(result) {
  if (result.unlock204) {
    safeSetItem(LS.code204, '1');
  }
  if (result.unlock013) {
    safeSetItem(LS.code013, '1');
  }
  if (result.patchCodes && Object.keys(result.patchCodes).length) {
    const cur = parseTerminalCodes();
    saveTerminalCodes({ ...cur, ...result.patchCodes });
  }
}

export const STAFF_TERMINAL_GUESTS = [
  {
    fileId: 'G-013',
    codename: 'The Quiet Guest',
    displayName: 'Unknown Guest',
    riskCategory: 'Medium',
    redFlags: ['minimal speech', 'always faces the exits', 'pays in exact change'],
    preferredRoom: '118',
    siteReference: SITE_FILES,
    recommendedAction: 'Keep line of sight on lobby cameras after check-in.'
  },
  {
    fileId: 'G-027',
    codename: 'The Late Arrival',
    displayName: 'Unknown Guest',
    riskCategory: 'High',
    redFlags: ['late arrival', 'cash payment', 'no luggage'],
    preferredRoom: '204',
    siteReference: SITE_FILES,
    recommendedAction: 'Check ID and flag for camera watch.'
  },
  {
    fileId: 'G-041',
    codename: 'The Smiling Man',
    displayName: 'Unknown Guest',
    riskCategory: 'High',
    redFlags: ['overly calm', 'asks about staff schedules', 'wrong name on folio scratch'],
    preferredRoom: '237',
    siteReference: SITE_FILES,
    recommendedAction: 'Do not confirm internal details; log time of contact.'
  },
  {
    fileId: 'G-104',
    codename: 'The Warm Key',
    displayName: 'Unknown Guest',
    riskCategory: 'Low',
    redFlags: ['key fob reads warm', 'insists on ground floor'],
    preferredRoom: '104',
    siteReference: SITE_FILES,
    recommendedAction: 'Standard assignment with routine key audit.'
  },
  {
    fileId: 'G-204',
    codename: 'The Room Request',
    displayName: 'Unknown Guest',
    riskCategory: 'Critical',
    redFlags: ['asks for 204 by number', 'references old registry', 'no prior reservation'],
    preferredRoom: '204',
    siteReference: SITE_FILES,
    recommendedAction: 'Do not assign 204 after midnight; escalate to night lead.'
  }
];

export const STAFF_TERMINAL_ROOMS = [
  {
    roomId: '104',
    status: 'Available',
    riskLevel: 'Low',
    cameraCoverage: 'Hallway active',
    specialRule: 'Standard assignment',
    lastNote: 'Last turnover uneventful.',
    siteReference: SITE_FLOOR
  },
  {
    roomId: '118',
    status: 'Available',
    riskLevel: 'Medium',
    cameraCoverage: 'Hallway active',
    specialRule: 'Pair arrivals need ID match',
    lastNote: 'Noise spike cleared before 11 PM.',
    siteReference: SITE_FILES
  },
  {
    roomId: '204',
    status: 'Restricted after midnight',
    riskLevel: 'Critical',
    cameraCoverage: 'Signal loss at 1:43 AM',
    specialRule: 'Do not assign Room 204 after midnight',
    lastNote: 'Staff Desk / Room Notes — cross-check external portal.',
    siteReference: SITE_FILES,
    restricted204: true
  },
  {
    roomId: '237',
    status: 'Watching',
    riskLevel: 'High',
    cameraCoverage: 'Weak hallway signal',
    specialRule: 'Review noise complaints before assignment',
    lastNote: 'Complaint pattern may precede escalation.',
    siteReference: SITE_FILES
  },
  {
    roomId: 'Staff Only',
    status: 'Restricted',
    riskLevel: 'Unknown',
    cameraCoverage: 'No camera inside',
    specialRule: 'Staff access only',
    lastNote: 'Housekeeping lockout after 2 AM.',
    siteReference: SITE_ROOT
  },
  {
    roomId: 'Camera Room',
    status: 'Maintenance window',
    riskLevel: 'Medium',
    cameraCoverage: 'Local loop only',
    specialRule: 'Technician escort required',
    lastNote: 'DVR drift flagged on prior shift.',
    siteReference: SITE_ROOT
  },
  {
    roomId: 'Storage',
    status: 'Secured',
    riskLevel: 'Low',
    cameraCoverage: 'Corridor only',
    specialRule: 'Inventory sign-out required',
    lastNote: 'Linens count mismatch (minor).',
    siteReference: SITE_FILES
  }
];

export const STAFF_TERMINAL_INCIDENTS = [
  {
    incidentId: 'INC-000',
    title: 'Signal Lost',
    severity: 'Medium',
    location: 'East hallway DVR',
    pressureImpact: '+6',
    possibleResponses: 'Reroute feed, note timestamp, avoid duplicate dispatch',
    siteReference: SITE_FILES,
    note: 'May correlate with weather — not always paranormal.'
  },
  {
    incidentId: 'INC-118',
    title: 'Guest Refuses Checkout',
    severity: 'Medium',
    location: 'Room 118',
    pressureImpact: '+9',
    possibleResponses: 'Manager callback, security standby, comp negotiation',
    siteReference: SITE_ROOT,
    note: 'Watch for repeated phrase usage in refusal script.'
  },
  {
    incidentId: 'INC-204',
    title: 'Lobby Camera Blackout',
    severity: 'High',
    location: 'Lobby / Room 204 Hallway',
    pressureImpact: '+18',
    possibleResponses: 'Dispatch staff, reset cameras, call police',
    siteReference: SITE_FILES,
    note: 'Previous records reference Room 204.'
  },
  {
    incidentId: 'INC-237',
    title: 'Noise Complaint',
    severity: 'Low',
    location: 'Room 237 adjacent',
    pressureImpact: '+4',
    possibleResponses: 'Welfare check, volume warning, room move offer',
    siteReference: SITE_ROOT,
    note: 'Stacking complaints raises hallway threat.'
  },
  {
    incidentId: 'INC-404',
    title: 'Missing File',
    severity: 'Medium',
    location: 'Front desk archive',
    pressureImpact: '+7',
    possibleResponses: 'Search dead storage, portal cross-reference, log gap',
    siteReference: SITE_FILES,
    note: 'Some archives moved to external staff portal.'
  }
];

export const STAFF_TERMINAL_FOUND_ITEMS = [
  {
    itemId: 'LF-007',
    title: 'Silver Watch',
    foundLocation: 'Laundry bin — back hall',
    linkedGuest: '—',
    linkedRoom: '118',
    linkedIncident: 'INC-237',
    risk: 'Medium',
    note: 'The second hand moves like it is listening for a cue.',
    siteReference: SITE_LOST_FOUND
  },
  {
    itemId: 'LF-118',
    title: 'Room 118 Key',
    foundLocation: 'Front desk drawer lip',
    linkedGuest: '—',
    linkedRoom: '118',
    linkedIncident: 'INC-118',
    risk: 'Low',
    note: 'Tag is clean. The cut is old.',
    siteReference: SITE_LOST_FOUND
  },
  {
    itemId: 'LF-204',
    title: 'Wet Matchbook',
    foundLocation: 'Lobby rug edge — hallway line',
    linkedGuest: '—',
    linkedRoom: '204',
    linkedIncident: 'INC-204',
    risk: 'High',
    note: 'Soaked through. Still warm.',
    siteReference: SITE_LOST_FOUND
  },
  {
    itemId: 'LF-013',
    title: 'Torn Photo',
    foundLocation: 'Trash can under the phone',
    linkedGuest: 'G-013',
    linkedRoom: '118',
    linkedIncident: 'INC-000',
    risk: 'Medium',
    note: 'The faces were removed carefully, not ripped in panic.',
    siteReference: SITE_LOST_FOUND
  },
  {
    itemId: 'LF-404',
    title: 'Missing Receipt',
    foundLocation: 'Archive shelf gap',
    linkedGuest: '—',
    linkedRoom: '—',
    linkedIncident: 'INC-404',
    risk: 'Medium',
    note: 'The paper is blank until you stop looking directly at it.',
    siteReference: SITE_LOST_FOUND
  },
  {
    itemId: 'LF-237',
    title: 'Cracked Sunglasses',
    foundLocation: 'Stairwell landing',
    linkedGuest: '—',
    linkedRoom: '237',
    linkedIncident: 'INC-237',
    risk: 'Low',
    note: 'The crack pattern resembles a hallway map.',
    siteReference: SITE_LOST_FOUND
  },
  {
    itemId: 'LF-911',
    title: 'Broken Tape Recorder',
    foundLocation: 'Switchboard shelf',
    linkedGuest: '—',
    linkedRoom: '—',
    linkedIncident: 'INC-000',
    risk: 'High',
    note: 'Rewinds by itself when the line goes quiet.',
    siteReference: SITE_LOST_FOUND
  },
  {
    itemId: 'LF-000',
    title: 'Blank Key Tag',
    foundLocation: 'Under the counter mat',
    linkedGuest: '—',
    linkedRoom: '—',
    linkedIncident: 'INC-000',
    risk: 'Low',
    note: 'No number. No scratches. Like it never touched a lock.',
    siteReference: SITE_LOST_FOUND
  }
];

function el(id) {
  return typeof document !== 'undefined' ? document.getElementById(id) : null;
}

function normalizeCodeInput(raw) {
  return String(raw || '').trim();
}

export function handleVerificationCode(raw) {
  const code = normalizeCodeInput(raw);
  const lower = code.toLowerCase();
  const empty = !code.length;

  const result = {
    ok: false,
    message: empty ? 'Enter a verification code.' : 'Code not recognized.',
    unlock204: false,
    unlock013: false,
    patchCodes: {}
  };

  if (empty) return result;

  if (lower === '204') {
    result.ok = true;
    result.message =
      'Room 204 staff note unlocked. Do not assign after midnight.';
    result.unlock204 = true;
    return result;
  }
  if (lower === '204-13') {
    result.ok = true;
    result.message =
      'Verification accepted. Camera reset protocol marked for future build.';
    result.patchCodes.cameraResetPlaceholder = true;
    return result;
  }
  if (lower === 'dem-204') {
    result.ok = true;
    result.message =
      'Employee portal reference confirmed. Room 204 remains restricted.';
    result.unlock204 = true;
    return result;
  }
  if (lower === '013') {
    result.ok = true;
    result.message = 'Guest File G-013 cross-reference unlocked.';
    result.unlock013 = true;
    return result;
  }
  if (lower === '404') {
    result.ok = true;
    result.message =
      'Missing file response: the record exists, but not here.';
    result.patchCodes.missing404 = true;
    return result;
  }
  if (lower === '911') {
    result.ok = true;
    result.message =
      'Emergency line unavailable. The motel switchboard is already listening.';
    return result;
  }

  // Site clue hooks (local-only unlock notes)
  if (lower === 'lf-204') {
    result.ok = true;
    result.message = 'Lost item reference accepted. Wet Matchbook record linked to Room 204.';
    result.patchCodes.lf204Ref = true;
    return result;
  }
  if (lower === 'lf-007') {
    result.ok = true;
    result.message = 'Lost item reference accepted. Silver Watch record linked to Room 118.';
    result.patchCodes.lf007Ref = true;
    return result;
  }
  if (lower === 'watch-118') {
    result.ok = true;
    result.message = 'Item note unlocked. The watch was ticking at the wrong time.';
    result.patchCodes.watch118Note = true;
    return result;
  }
  if (lower === 'gaz-204') {
    result.ok = true;
    result.message = 'Gazette reference reserved for future archive.';
    result.patchCodes.gaz204Reserved = true;
    return result;
  }
  if (lower === 'vm-204') {
    result.ok = true;
    result.message = 'Voicemail reference reserved for future archive.';
    result.patchCodes.vm204Reserved = true;
    return result;
  }

  return result;
}

export function renderUnlockedNotes(container) {
  if (!container) return;
  const u = loadTerminalUnlocks();
  const items = [];

  if (u.room204Note) {
    items.push({
      title: 'Room 204 Staff Note',
      body: 'Room 204 was unavailable before the night started. Someone requested it anyway.'
    });
  }
  if (u.guest013Addendum) {
    items.push({
      title: 'Guest File G-013 Addendum',
      body: 'The Quiet Guest watches exits before speaking.'
    });
  }
  if (u.missing404) {
    items.push({
      title: 'Missing File 404 Note',
      body: 'Some records were moved to the external staff portal.'
    });
  }
  if (u.cameraResetPlaceholder) {
    items.push({
      title: 'Camera Reset Protocol Placeholder',
      body: 'Future build: camera reset checklist will tie to verified codes and maintenance windows.'
    });
  }
  if (u.lf204Ref) {
    items.push({
      title: 'Lost & Found — LF-204 Reference',
      body: 'Lost item reference accepted. Wet Matchbook record linked to Room 204.'
    });
  }
  if (u.lf007Ref) {
    items.push({
      title: 'Lost & Found — LF-007 Reference',
      body: 'Lost item reference accepted. Silver Watch record linked to Room 118.'
    });
  }
  if (u.watch118Note) {
    items.push({
      title: 'WATCH-118 Addendum',
      body: 'Item note unlocked. The watch was ticking at the wrong time.'
    });
  }
  if (u.gaz204Reserved) {
    items.push({
      title: 'GAZ-204 Placeholder',
      body: 'Gazette reference reserved for future archive.'
    });
  }
  if (u.vm204Reserved) {
    items.push({
      title: 'VM-204 Placeholder',
      body: 'Voicemail reference reserved for future archive.'
    });
  }

  if (!items.length) {
    container.innerHTML =
      '<p class="dem-terminal-muted">No staff notes unlocked yet.</p>';
    return;
  }

  container.innerHTML = items
    .map(
      (it) =>
        `<article class="dem-terminal-note-card"><h4 class="dem-terminal-note-title">${escapeHtml(it.title)}</h4><p class="dem-terminal-note-body">${escapeHtml(it.body)}</p></article>`
    )
    .join('');
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function referenceLinkMeta(url) {
  const u = String(url);
  if (u === SITE_FILES) return { label: 'Open Motel Files', href: SITE_FILES };
  if (u === SITE_FLOOR) return { label: 'Open Floor Plan', href: SITE_FLOOR };
  if (u === SITE_MEDIA) return { label: 'Open Media Hub', href: SITE_MEDIA };
  if (u === SITE_TRAINING) return { label: 'Open Training Manual', href: SITE_TRAINING };
  if (u === SITE_GUEST_DB) return { label: 'Open Guest Database', href: SITE_GUEST_DB };
  if (u === SITE_LOST_FOUND) return { label: 'Open Lost & Found', href: SITE_LOST_FOUND };
  if (u === SITE_ROOT) return { label: 'Open Official Site', href: SITE_ROOT };
  return { label: 'Open link', href: u };
}

function referenceLinkButton(url) {
  const m = referenceLinkMeta(url);
  return `<a href="${escapeHtml(m.href)}" target="_blank" rel="noopener noreferrer" class="button button-secondary dem-terminal-ref-btn">${escapeHtml(m.label)}</a>`;
}

function optionalUrlCopyLine(url) {
  return `<p class="dem-terminal-url-copy dem-terminal-muted"><span class="dem-terminal-url-copy-label">Copy-safe</span> <code class="dem-terminal-url-code">${escapeHtml(url)}</code></p>`;
}

function riskPillClass(level) {
  const r = String(level || '').toLowerCase();
  if (r === 'low') return 'dem-pill dem-pill-risk dem-pill-risk--low';
  if (r === 'medium') return 'dem-pill dem-pill-risk dem-pill-risk--med';
  if (r === 'high') return 'dem-pill dem-pill-risk dem-pill-risk--high';
  if (r === 'critical') return 'dem-pill dem-pill-risk dem-pill-risk--crit';
  return 'dem-pill dem-pill-risk dem-pill-risk--unk';
}

function severityPillClass(sev) {
  const r = String(sev || '').toLowerCase();
  if (r === 'low') return 'dem-pill dem-pill-sev dem-pill-sev--low';
  if (r === 'medium') return 'dem-pill dem-pill-sev dem-pill-sev--med';
  if (r === 'high') return 'dem-pill dem-pill-sev dem-pill-sev--high';
  return 'dem-pill dem-pill-sev dem-pill-sev--med';
}

function terminalCodeStatusLine(raw, res) {
  const trimmed = normalizeCodeInput(raw);
  if (!trimmed.length) return 'NEED INPUT';
  if (!res.ok) return 'CODE NOT RECOGNIZED';
  if (trimmed.toLowerCase() === '911') return 'ACCESS NOTICE';
  return 'ACCESS PARTIAL';
}

function buildCodeResponseHtml(raw, res) {
  const trimmed = normalizeCodeInput(raw);
  const status = terminalCodeStatusLine(raw, res);
  const echoInner =
    trimmed.length > 0 ? `&gt; ${escapeHtml(trimmed)}` : '&gt;';
  const tone = !trimmed.length ? 'is-neutral' : res.ok ? 'is-ok' : 'is-bad';
  return (
    `<div class="dem-terminal-response-block" role="status">` +
    `<div class="dem-terminal-response-echo">${echoInner}</div>` +
    `<div class="dem-terminal-response-status ${tone}">${escapeHtml(status)}</div>` +
    `<div class="dem-terminal-response-msg">${escapeHtml(res.message)}</div>` +
    `</div>`
  );
}

function buildManualRuleBadges(flags = {}) {
  const items = [];
  if (flags.cash) {
    items.push({ id: '04', text: 'Cash after midnight needs a second look.' });
  }
  if (flags.quiet) {
    items.push({ id: '13', text: 'Quiet guests are not automatically safe.' });
  }
  if (flags.room204) {
    items.push({ id: '204', text: 'Do not assign Room 204 after midnight.' });
  }
  if (flags.missingFile) {
    items.push({ id: '404', text: 'Missing files are not always missing.' });
  }
  if (flags.emergencyLine) {
    items.push({ id: '911', text: 'Emergency calls are not guaranteed to route.' });
  }
  if (!items.length) return '';

  return `
    <div class="dem-terminal-manual-box" aria-label="Training manual reminders">
      <p class="dem-terminal-manual-title">Manual reminders</p>
      <ul class="dem-terminal-manual-list">
        ${items.map((it) => `<li><strong>${escapeHtml(it.id)}</strong> ${escapeHtml(it.text)}</li>`).join('')}
      </ul>
      <div class="dem-terminal-card-actions">${referenceLinkButton(SITE_TRAINING)}</div>
    </div>
  `;
}

function renderGuestLookup(root) {
  if (!root) return;
  const guests = STAFF_TERMINAL_GUESTS;
  const firstId = guests[0]?.fileId || '';
  const buttonsHtml = guests
    .map((g) => {
      const pressed = g.fileId === firstId;
      return `<button type="button" class="dem-guest-file-btn${pressed ? ' is-active' : ''}" data-guest-file="${escapeHtml(g.fileId)}" aria-pressed="${pressed ? 'true' : 'false'}">${escapeHtml(g.fileId)} — ${escapeHtml(g.codename)}</button>`;
    })
    .join('');

  root.innerHTML = `
    <p class="dem-terminal-muted">Full external guest database support planned for a future update.</p>
    <p class="dem-terminal-hint">External staff portal: deadendmotel.site — some archived files may appear there.</p>
    <p class="dem-terminal-label" id="dem-guest-file-list-label">Guest file</p>
    <div class="dem-guest-file-list" role="group" aria-labelledby="dem-guest-file-list-label">
      ${buttonsHtml}
    </div>
    <div id="dem-terminal-guest-detail" class="dem-terminal-guest-detail"></div>
  `;

  const detail = el('dem-terminal-guest-detail');
  const showDetail = (fileId) => {
    const g = guests.find((x) => x.fileId === fileId);
    if (!g || !detail) return;
    const flags = (g.redFlags || []).map((f) => `<li>${escapeHtml(f)}</li>`).join('');
    const refBtn = referenceLinkButton(g.siteReference);
    const dbBtn = referenceLinkButton(SITE_GUEST_DB);
    const rules = buildManualRuleBadges({
      cash: (g.redFlags || []).some((f) => /cash/i.test(String(f))),
      quiet: (g.redFlags || []).some((f) => /minimal speech|quiet|silent/i.test(String(f))),
      room204: String(g.preferredRoom || '') === '204'
    });
    detail.innerHTML = `
      <div class="dem-terminal-card dem-terminal-guest-card">
        <dl class="dem-kv">
          <div class="dem-kv-row"><dt>File</dt><dd>${escapeHtml(g.fileId)}</dd></div>
          <div class="dem-kv-row"><dt>Codename</dt><dd>${escapeHtml(g.codename)}</dd></div>
          <div class="dem-kv-row"><dt>Display</dt><dd>${escapeHtml(g.displayName)}</dd></div>
          <div class="dem-kv-row"><dt>Risk</dt><dd>${escapeHtml(g.riskCategory)}</dd></div>
          <div class="dem-kv-row"><dt>Preferred room</dt><dd>${escapeHtml(g.preferredRoom)}</dd></div>
          <div class="dem-kv-row dem-kv-row--wide"><dt>Recommended</dt><dd>${escapeHtml(g.recommendedAction)}</dd></div>
          <div class="dem-kv-row dem-kv-row--wide"><dt>Red flags</dt><dd><ul class="dem-terminal-flags">${flags}</ul></dd></div>
        </dl>
        ${rules}
        <div class="dem-terminal-card-actions">${dbBtn}${refBtn}</div>
        ${optionalUrlCopyLine(SITE_GUEST_DB)}
        ${optionalUrlCopyLine(g.siteReference)}
      </div>
    `;
  };

  root.querySelectorAll('.dem-guest-file-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const fid = btn.getAttribute('data-guest-file');
      root.querySelectorAll('.dem-guest-file-btn').forEach((b) => {
        const on = b === btn;
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      showDetail(fid);
    });
  });

  showDetail(firstId);
}

function renderRoomRecords(root) {
  if (!root) return;
  root.innerHTML = `
    <p class="dem-terminal-hint">Verification codes may update outside the terminal. Training manual support planned.</p>
    <div class="dem-terminal-room-grid">
      ${STAFF_TERMINAL_ROOMS.map((r) => {
        const restricted = Boolean(r.restricted204);
        const title =
          /^\d+$/.test(String(r.roomId)) ? `Room ${r.roomId}` : String(r.roomId);
        const riskPill = riskPillClass(r.riskLevel);
        const refBtn = referenceLinkButton(r.siteReference);
        const rules = buildManualRuleBadges({ room204: restricted });
        return `
        <article class="dem-terminal-card dem-terminal-room-card ${restricted ? 'dem-terminal-room-card--204' : ''}">
          <header class="dem-room-card-head">
            <div class="dem-room-card-title-row">
              <h4 class="dem-terminal-room-title">${escapeHtml(title)}</h4>
              ${restricted ? '<span class="dem-terminal-warn-tag">RESTRICTED</span>' : ''}
            </div>
            <div class="dem-room-card-pills">
              <span class="${riskPill}" aria-label="Risk level">${escapeHtml(r.riskLevel)}</span>
              <span class="dem-pill dem-pill-status">${escapeHtml(r.status)}</span>
            </div>
          </header>
          <dl class="dem-kv">
            <div class="dem-kv-row dem-kv-row--wide"><dt>Camera</dt><dd>${escapeHtml(r.cameraCoverage)}</dd></div>
            <div class="dem-kv-row dem-kv-row--wide"><dt>Rule</dt><dd>${escapeHtml(r.specialRule)}</dd></div>
            <div class="dem-kv-row dem-kv-row--wide"><dt>Last note</dt><dd>${escapeHtml(r.lastNote)}</dd></div>
          </dl>
          ${restricted ? '<div class="dem-terminal-warn" role="alert">Staff warning: Room 204 is restricted after midnight. Do not rely on this terminal alone for assignment policy.</div>' : ''}
          ${rules}
          <div class="dem-terminal-card-actions">${refBtn}</div>
          ${optionalUrlCopyLine(r.siteReference)}
        </article>`;
      }).join('')}
    </div>
  `;
}

function renderIncidentLog(root) {
  if (!root) return;
  root.innerHTML = `
    <p class="dem-terminal-muted">Archive prepares connection to website Incident Archive (optional).</p>
    <div id="dem-terminal-active-incidents" class="dem-terminal-active-incidents dem-terminal-active-card"></div>
    <div class="dem-terminal-incident-archive">
      ${STAFF_TERMINAL_INCIDENTS.map((inc) => {
        const sevPill = severityPillClass(inc.severity);
        const refBtn = referenceLinkButton(inc.siteReference);
        const rules = buildManualRuleBadges({
          missingFile: inc.incidentId === 'INC-404',
          room204: inc.incidentId === 'INC-204'
        });
        return `
        <article class="dem-terminal-card dem-terminal-incident-card">
          <header class="dem-incident-head">
            <h4 class="dem-terminal-incident-title"><span class="dem-incident-id">${escapeHtml(inc.incidentId)}</span> — ${escapeHtml(inc.title)}</h4>
            <span class="${sevPill}">${escapeHtml(inc.severity)}</span>
          </header>
          <dl class="dem-kv">
            <div class="dem-kv-row dem-kv-row--wide"><dt>Location</dt><dd>${escapeHtml(inc.location)}</dd></div>
            <div class="dem-kv-row"><dt>Pressure</dt><dd>${escapeHtml(inc.pressureImpact)}</dd></div>
            <div class="dem-kv-row dem-kv-row--wide"><dt>Responses</dt><dd>${escapeHtml(inc.possibleResponses)}</dd></div>
            <div class="dem-kv-row dem-kv-row--wide"><dt>Note</dt><dd>${escapeHtml(inc.note)}</dd></div>
          </dl>
          ${rules}
          <div class="dem-terminal-card-actions">${refBtn}</div>
          ${optionalUrlCopyLine(inc.siteReference)}
        </article>`;
      }).join('')}
    </div>
  `;
}

let foundItemsMemory = [];

function parseFoundItems() {
  const raw = safeGetItem(LS.foundItems);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function loadFoundItems() {
  const stored = parseFoundItems();
  if (stored) return stored;
  return Array.isArray(foundItemsMemory) ? foundItemsMemory : [];
}

function saveFoundItems(items) {
  const next = Array.isArray(items) ? items : [];
  foundItemsMemory = next;
  try {
    safeSetItem(LS.foundItems, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

function addFoundItem(item) {
  if (!item || !item.itemId) return;
  const current = loadFoundItems();
  const exists = current.some((x) => String(x?.itemId) === String(item.itemId));
  const next = exists ? current : [...current, item];
  saveFoundItems(next);
}

function clearFoundItems() {
  saveFoundItems([]);
}

function pickRandomFoundItemNotLogged() {
  const current = loadFoundItems();
  const logged = new Set(current.map((x) => String(x?.itemId)));
  const pool = STAFF_TERMINAL_FOUND_ITEMS.filter((x) => !logged.has(String(x.itemId)));
  if (!pool.length) {
    return STAFF_TERMINAL_FOUND_ITEMS[Math.floor(Math.random() * STAFF_TERMINAL_FOUND_ITEMS.length)];
  }
  return pool[Math.floor(Math.random() * pool.length)];
}

function renderFoundItemsTab(root) {
  if (!root) return;
  const items = loadFoundItems();

  const listHtml = !items.length
    ? '<p class="dem-terminal-muted">No found items logged yet.</p>'
    : `<div class="dem-found-grid">${
      items.slice().reverse().map((it) => {
        const riskPill = riskPillClass(it.risk);
        const refBtn = referenceLinkButton(it.siteReference || SITE_LOST_FOUND);
        return `
          <article class="dem-terminal-card dem-found-card">
            <header class="dem-found-head">
              <h4 class="dem-found-title"><span class="dem-found-id">${escapeHtml(it.itemId)}</span> — ${escapeHtml(it.title)}</h4>
              <span class="${riskPill}">${escapeHtml(it.risk || 'Unknown')}</span>
            </header>
            <dl class="dem-kv">
              <div class="dem-kv-row dem-kv-row--wide"><dt>Found</dt><dd>${escapeHtml(it.foundLocation || '—')}</dd></div>
              <div class="dem-kv-row"><dt>Guest</dt><dd>${escapeHtml(it.linkedGuest || '—')}</dd></div>
              <div class="dem-kv-row"><dt>Room</dt><dd>${escapeHtml(it.linkedRoom || '—')}</dd></div>
              <div class="dem-kv-row"><dt>Incident</dt><dd>${escapeHtml(it.linkedIncident || '—')}</dd></div>
              <div class="dem-kv-row dem-kv-row--wide"><dt>Note</dt><dd>${escapeHtml(it.note || '')}</dd></div>
            </dl>
            <div class="dem-terminal-card-actions">${refBtn}</div>
            ${optionalUrlCopyLine(it.siteReference || SITE_LOST_FOUND)}
          </article>`;
      }).join('')
    }</div>`;

  root.innerHTML = `
    <p class="dem-terminal-muted">Found Item Log is local-only. Website Lost &amp; Found provides optional cross-reference.</p>
    <div class="dem-terminal-card-actions">
      <button type="button" class="button button-secondary dem-terminal-ref-btn" id="dem-found-log-sample">Log sample item</button>
      <button type="button" class="button button-secondary dem-terminal-ref-btn" id="dem-found-clear">Clear found item log</button>
      ${referenceLinkButton(SITE_LOST_FOUND)}
    </div>
    ${optionalUrlCopyLine(SITE_LOST_FOUND)}
    ${listHtml}
  `;

  el('dem-found-log-sample')?.addEventListener('click', (e) => {
    e.preventDefault();
    const picked = pickRandomFoundItemNotLogged();
    addFoundItem({ ...picked, loggedAt: Date.now() });
    renderFoundItemsTab(root);
  });

  el('dem-found-clear')?.addEventListener('click', (e) => {
    e.preventDefault();
    clearFoundItems();
    renderFoundItemsTab(root);
  });
}

function renderStaffPortalTab(root) {
  if (!root) return;
  root.innerHTML = `
    <p class="dem-terminal-hint">External staff portal: deadendmotel.site — verification codes may appear outside this build.</p>
    <div class="dem-terminal-card dem-portal-board-card">
      <p class="dem-portal-board-title">Portal link status</p>
      <div class="dem-portal-board" role="list">
        <div class="dem-portal-row" role="listitem">
          <span class="dem-portal-row-name">Employee Portal</span>
          <span class="dem-pill dem-pill-ok">Available</span>
          <span class="dem-portal-row-action"><a href="${SITE_ROOT}" target="_blank" rel="noopener noreferrer" class="button button-secondary dem-terminal-ref-btn">Open Employee Portal</a></span>
        </div>
        <div class="dem-portal-row dem-portal-row--available" role="listitem">
          <span class="dem-portal-row-name">Motel Files</span>
          <span class="dem-pill dem-pill-ok">Available</span>
          <span class="dem-portal-row-action"><a href="${SITE_FILES}" target="_blank" rel="noopener noreferrer" class="button button-secondary dem-terminal-ref-btn">Open Motel Files</a></span>
        </div>
        <div class="dem-portal-row dem-portal-row--available" role="listitem">
          <span class="dem-portal-row-name">Floor Plan</span>
          <span class="dem-pill dem-pill-ok">Available</span>
          <span class="dem-portal-row-action"><a href="${SITE_FLOOR}" target="_blank" rel="noopener noreferrer" class="button button-secondary dem-terminal-ref-btn">Open Floor Plan</a></span>
        </div>
        <div class="dem-portal-row dem-portal-row--available" role="listitem">
          <span class="dem-portal-row-name">Media Hub</span>
          <span class="dem-pill dem-pill-ok">Available</span>
          <span class="dem-portal-row-action"><a href="${SITE_MEDIA}" target="_blank" rel="noopener noreferrer" class="button button-secondary dem-terminal-ref-btn">Open Media Hub</a></span>
        </div>
        <div class="dem-portal-row dem-portal-row--available" role="listitem">
          <span class="dem-portal-row-name">Training Manual</span>
          <span class="dem-pill dem-pill-ok">Available</span>
          <span class="dem-portal-row-action"><a href="${SITE_TRAINING}" target="_blank" rel="noopener noreferrer" class="button button-secondary dem-terminal-ref-btn">Open Training Manual</a></span>
        </div>
        <div class="dem-portal-row dem-portal-row--available" role="listitem">
          <span class="dem-portal-row-name">Guest Database</span>
          <span class="dem-pill dem-pill-ok">Available</span>
          <span class="dem-portal-row-action"><a href="${SITE_GUEST_DB}" target="_blank" rel="noopener noreferrer" class="button button-secondary dem-terminal-ref-btn">Open Guest Database</a></span>
        </div>
        <div class="dem-portal-row dem-portal-row--available" role="listitem">
          <span class="dem-portal-row-name">Lost &amp; Found</span>
          <span class="dem-pill dem-pill-ok">Available</span>
          <span class="dem-portal-row-action"><a href="${SITE_LOST_FOUND}" target="_blank" rel="noopener noreferrer" class="button button-secondary dem-terminal-ref-btn">Open Lost &amp; Found</a></span>
        </div>
      </div>
      <div class="dem-portal-quick-actions">
        <a href="${SITE_ROOT}" target="_blank" rel="noopener noreferrer" class="button button-primary dem-terminal-ref-btn">Open Official Site</a>
        <p class="dem-terminal-muted dem-portal-quick-hint">Opens deadendmotel.site in a new tab.</p>
      </div>
      <p class="dem-terminal-url-copy dem-terminal-muted"><span class="dem-terminal-url-copy-label">Copy-safe</span> <code class="dem-terminal-url-code">${escapeHtml(SITE_ROOT)}</code> · <code class="dem-terminal-url-code">${escapeHtml(SITE_TRAINING)}</code> · <code class="dem-terminal-url-code">${escapeHtml(SITE_GUEST_DB)}</code> · <code class="dem-terminal-url-code">${escapeHtml(SITE_LOST_FOUND)}</code> · <code class="dem-terminal-url-code">${escapeHtml(SITE_FILES)}</code> · <code class="dem-terminal-url-code">${escapeHtml(SITE_FLOOR)}</code> · <code class="dem-terminal-url-code">${escapeHtml(SITE_MEDIA)}</code></p>
    </div>
  `;
}

function renderReferencesTab(root) {
  if (!root) return;
  root.innerHTML = `
    <p class="dem-terminal-muted">Archive links are optional second-screen tools. The shift remains playable offline.</p>
    <div class="dem-terminal-card dem-portal-board-card">
      <p class="dem-portal-board-title">References</p>
      <div class="dem-portal-board" role="list">
        <div class="dem-portal-row dem-portal-row--available" role="listitem">
          <span class="dem-portal-row-name">Employee Portal</span>
          <span class="dem-pill dem-pill-ok">Available</span>
          <span class="dem-portal-row-action">${referenceLinkButton(SITE_ROOT)}</span>
        </div>
        <div class="dem-portal-row dem-portal-row--available" role="listitem">
          <span class="dem-portal-row-name">Training Manual</span>
          <span class="dem-pill dem-pill-ok">Available</span>
          <span class="dem-portal-row-action">${referenceLinkButton(SITE_TRAINING)}</span>
        </div>
        <div class="dem-portal-row dem-portal-row--available" role="listitem">
          <span class="dem-portal-row-name">Guest Database</span>
          <span class="dem-pill dem-pill-ok">Available</span>
          <span class="dem-portal-row-action">${referenceLinkButton(SITE_GUEST_DB)}</span>
        </div>
        <div class="dem-portal-row dem-portal-row--available" role="listitem">
          <span class="dem-portal-row-name">Lost &amp; Found</span>
          <span class="dem-pill dem-pill-ok">Available</span>
          <span class="dem-portal-row-action">${referenceLinkButton(SITE_LOST_FOUND)}</span>
        </div>
        <div class="dem-portal-row dem-portal-row--available" role="listitem">
          <span class="dem-portal-row-name">Motel Files</span>
          <span class="dem-pill dem-pill-ok">Available</span>
          <span class="dem-portal-row-action">${referenceLinkButton(SITE_FILES)}</span>
        </div>
        <div class="dem-portal-row dem-portal-row--available" role="listitem">
          <span class="dem-portal-row-name">Floor Plan</span>
          <span class="dem-pill dem-pill-ok">Available</span>
          <span class="dem-portal-row-action">${referenceLinkButton(SITE_FLOOR)}</span>
        </div>
        <div class="dem-portal-row dem-portal-row--available" role="listitem">
          <span class="dem-portal-row-name">Media Hub</span>
          <span class="dem-pill dem-pill-ok">Available</span>
          <span class="dem-portal-row-action">${referenceLinkButton(SITE_MEDIA)}</span>
        </div>
      </div>
    </div>
  `;
}

function renderOverview(root, renderState) {
  if (!root) return;
  const night = renderState?.night ?? '—';
  const pressure = renderState?.uiPressureLevel || 'calm';
  const pressureLabel = `Pressure: ${String(pressure).charAt(0).toUpperCase()}${String(pressure).slice(1)}`;
  const checkedIn =
    Array.isArray(renderState?.guests) &&
    renderState.guests.filter((g) => g?.checkedIn).length;
  const inQueue =
    Array.isArray(renderState?.guests) &&
    renderState.guests.filter((g) => !g?.checkedIn).length;
  const incN = Array.isArray(renderState?.incidents) ? renderState.incidents.length : 0;

  root.innerHTML = `
    <div class="dem-terminal-card dem-terminal-overview-card">
      <p>Dead End Motel internal terminal. Some staff records are incomplete. External staff portal references may appear during development.</p>
      <p class="dem-terminal-hint">Verification codes may update outside the terminal.</p>
      <ul class="dem-terminal-overview-stats">
        <li><span class="dem-terminal-k">Current night</span> ${escapeHtml(String(night))}</li>
        <li><span class="dem-terminal-k">Shift pressure</span> ${escapeHtml(pressureLabel)}</li>
        <li><span class="dem-terminal-k">Guests checked in</span> ${escapeHtml(String(checkedIn))}</li>
        <li><span class="dem-terminal-k">Queue (not checked in)</span> ${escapeHtml(String(inQueue))}</li>
        <li><span class="dem-terminal-k">Incident log entries (shift)</span> ${escapeHtml(String(incN))}</li>
      </ul>
      <p><span class="dem-terminal-k">Official Staff Portal</span></p>
      <div class="dem-terminal-card-actions">
        <a href="${SITE_ROOT}" target="_blank" rel="noopener noreferrer" class="button button-secondary dem-terminal-ref-btn">Open Staff Portal</a>
      </div>
      <p class="dem-terminal-muted dem-portal-quick-hint">Opens in a new tab. Optional — not required to play.</p>
      ${optionalUrlCopyLine(SITE_ROOT)}
    </div>
    <div class="dem-terminal-card">
      <p><span class="dem-terminal-k">Employee ID</span></p>
      <p class="dem-terminal-muted">Employee ID personalization will be supported in a future build.</p>
    </div>
    <div class="dem-terminal-card dem-terminal-manual-box">
      <p class="dem-terminal-manual-title">Training Manual quick rules</p>
      <ul class="dem-terminal-manual-list">
        <li><strong>04</strong> Cash after midnight needs a second look.</li>
        <li><strong>13</strong> Quiet guests are not automatically safe.</li>
        <li><strong>204</strong> Do not assign Room 204 after midnight.</li>
        <li><strong>404</strong> Missing files are not always missing.</li>
        <li><strong>911</strong> Emergency calls are not guaranteed to route.</li>
      </ul>
      <div class="dem-terminal-card-actions">${referenceLinkButton(SITE_TRAINING)}</div>
      ${optionalUrlCopyLine(SITE_TRAINING)}
    </div>
  `;
}

function fillActiveIncidents(renderState) {
  const host = el('dem-terminal-active-incidents');
  if (!host) return;
  const list = Array.isArray(renderState?.incidents) ? renderState.incidents : [];
  if (!list.length) {
    host.innerHTML =
      '<p class="dem-terminal-muted">No active incidents recorded on this shift yet.</p>';
    return;
  }
  const tail = list.slice(-6);
  host.innerHTML = `
    <p class="dem-terminal-k">Recent shift incidents</p>
    <ul class="dem-terminal-mini-list">
      ${tail
        .map((i) => {
          const label = i?.type || i?.title || 'Incident';
          const sev = i?.severity || '—';
          const loc = i?.location || (i?.roomId != null ? `Room id ${i.roomId}` : '—');
          const who = i?.guestName ? ` — Guest: ${escapeHtml(String(i.guestName))}` : '';
          return `<li><strong>${escapeHtml(String(label))}</strong> — ${escapeHtml(String(sev))} — ${escapeHtml(String(loc))}${who}</li>`;
        })
        .join('')}
    </ul>
  `;
}

let activeTab = 'overview';
let overlayOpen = false;

function setTab(tabId) {
  activeTab = tabId;
  document.querySelectorAll('[data-dem-terminal-tab]').forEach((btn) => {
    const on = btn.getAttribute('data-dem-terminal-tab') === tabId;
    btn.classList.toggle('is-active', on);
    btn.setAttribute('aria-selected', on ? 'true' : 'false');
  });
  document.querySelectorAll('[data-dem-terminal-panel]').forEach((panel) => {
    const on = panel.getAttribute('data-dem-terminal-panel') === tabId;
    panel.hidden = !on;
  });
}

function openOverlay() {
  const ov = el('dem-staff-terminal-overlay');
  if (!ov) return;
  overlayOpen = true;
  ov.hidden = false;
  ov.setAttribute('aria-hidden', 'false');
  document.body.classList.add('dem-staff-terminal-open');
  const closeBtn = el('dem-staff-terminal-close');
  closeBtn?.focus();
}

function closeOverlay() {
  const ov = el('dem-staff-terminal-overlay');
  if (!ov) return;
  overlayOpen = false;
  ov.hidden = true;
  ov.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('dem-staff-terminal-open');
}

function refreshTerminalContent(renderState) {
  if (!overlayOpen) return;
  renderOverview(el('dem-terminal-panel-overview'), renderState);
  fillActiveIncidents(renderState);
  renderUnlockedNotes(el('dem-terminal-unlocked-notes'));
}

function submitCode() {
  const input = el('dem-terminal-code-input');
  const feedback = el('dem-terminal-code-feedback');
  if (!input || !feedback) return;
  const raw = input.value;
  const res = handleVerificationCode(raw);
  if (res.ok) {
    persistUnlocksFromCodeResult(res);
  }
  feedback.className = 'dem-terminal-code-feedback';
  feedback.innerHTML = buildCodeResponseHtml(raw, res);
  renderUnlockedNotes(el('dem-terminal-unlocked-notes'));
}

export function initStaffTerminal() {
  const openBtn = el('dem-open-staff-terminal-btn');
  const overlay = el('dem-staff-terminal-overlay');
  if (!openBtn || !overlay) return;

  openBtn.addEventListener('click', (e) => {
    e.preventDefault();
    openOverlay();
    try {
      const rs = window.__demStaffTerminalLastRenderState || {};
      renderOverview(el('dem-terminal-panel-overview'), rs);
      renderGuestLookup(el('dem-terminal-panel-guest'));
      renderRoomRecords(el('dem-terminal-panel-rooms'));
      renderIncidentLog(el('dem-terminal-panel-incidents'));
      renderFoundItemsTab(el('dem-terminal-panel-found'));
      fillActiveIncidents(rs);
      renderStaffPortalTab(el('dem-terminal-panel-portal'));
      renderReferencesTab(el('dem-terminal-panel-refs'));
      setTab(activeTab);
      renderUnlockedNotes(el('dem-terminal-unlocked-notes'));
    } catch {
      /* ignore */
    }
  });

  el('dem-staff-terminal-close')?.addEventListener('click', (e) => {
    e.preventDefault();
    closeOverlay();
  });

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeOverlay();
  });

  document.querySelectorAll('[data-dem-terminal-tab]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const id = btn.getAttribute('data-dem-terminal-tab');
      if (id) setTab(id);
    });
  });

  el('dem-terminal-code-submit')?.addEventListener('click', (e) => {
    e.preventDefault();
    submitCode();
  });

  el('dem-terminal-code-input')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      submitCode();
    }
  });

  window.demRefreshStaffTerminal = function (renderState) {
    try {
      window.__demStaffTerminalLastRenderState = renderState;
      refreshTerminalContent(renderState);
    } catch {
      /* ignore */
    }
  };

  window.demCloseStaffTerminalIfOpen = function () {
    if (overlayOpen) {
      closeOverlay();
      return true;
    }
    return false;
  };

  window.demForceCloseStaffTerminal = function () {
    closeOverlay();
  };
}
