/**
 * Staff Terminal / Site Integration Foundation
 * Local-only motel staff computer UI; optional links to deadendmotel.site
 */

const SITE_ROOT = 'https://deadendmotel.site';
const SITE_EMPLOYEE_PORTAL = 'https://deadendmotel.site/employee-portal.html';
const SITE_FILES = 'https://deadendmotel.site/files.html';
const SITE_FLOOR = 'https://deadendmotel.site/floor-plan.html';
const SITE_MEDIA = 'https://deadendmotel.site/media.html';
const SITE_TRAINING = 'https://deadendmotel.site/training-manual.html';
const SITE_GUEST_DB = 'https://deadendmotel.site/guest-database.html';
const SITE_LOST_FOUND = 'https://deadendmotel.site/lost-and-found.html';
const SITE_GAZETTE = 'https://deadendmotel.site/local-gazette.html';
const SITE_VOICEMAIL = 'https://deadendmotel.site/voicemail.html';

const LS = {
  code204: 'deadEndMotel_code204Unlocked',
  code013: 'deadEndMotel_code013Unlocked',
  terminalCodes: 'deadEndMotel_terminalCodes',
  foundItems: 'deadEndMotel_foundItems',
  voicemailLog: 'deadEndMotel_voicemailLog'
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

/** Archive line shown in Code Entry after a Gazette code is verified (local-only). */
const GAZETTE_ARCHIVE_LINES = {
  'GAZ-204': 'GAZ-204: Room 204 clipping connected to INC-204 / LF-204.',
  'GAZ-118': 'GAZ-118: Room 118 clipping connected to LF-007 / LF-118.',
  'GAZ-404': 'GAZ-404: Missing file clipping connected to Staff Only drawer.',
  'GAZ-911': 'GAZ-911: Emergency routing clipping connected to switchboard notes.',
  'GAZ-013': 'GAZ-013: Quiet guest clipping connected to guest file G-013.',
  'GAZ-237': 'GAZ-237: Hallway noise clipping connected to Room 237.',
  'GAZ-000': 'GAZ-000: Signal interruption clipping marked incomplete.'
};

/** Same strings returned by Code Entry when a Gazette code is accepted. */
const GAZETTE_UNLOCK_MESSAGES = {
  'GAZ-204':
    'Gazette reference accepted. Room 204 clipping cross-linked with INC-204 and LF-204.',
  'GAZ-118':
    'Gazette reference accepted. Room 118 noise complaint linked to Silver Watch and key return.',
  'GAZ-404':
    'Gazette reference accepted. Missing file clipping linked to Staff Only records.',
  'GAZ-911': 'Gazette reference accepted. Emergency routing outage note unlocked.',
  'GAZ-013': 'Gazette reference accepted. Quiet guest sighting linked to G-013.',
  'GAZ-237': 'Gazette reference accepted. Hallway noise report linked to Room 237.',
  'GAZ-000':
    'Gazette reference accepted. Signal interruption clipping marked incomplete.'
};

export function getGazetteNoteForCode(gazetteId) {
  const id = String(gazetteId || '').trim().toUpperCase();
  return GAZETTE_ARCHIVE_LINES[id] || '';
}

function renderGazetteReferenceBlock(row) {
  if (!row || !row.gazetteId) return '';
  const url = row.gazetteUrl || SITE_GAZETTE;
  const idTitle = row.gazetteTitle
    ? `${escapeHtml(row.gazetteId)} — ${escapeHtml(row.gazetteTitle)}`
    : escapeHtml(row.gazetteId);
  const note = row.gazetteNote
    ? `<p class="dem-gazette-note">${escapeHtml(row.gazetteNote)}</p>`
    : '';
  const btn = `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" class="button button-secondary dem-terminal-ref-btn dem-gazette-open-btn">Open Local Gazette</a>`;
  return `
    <div class="dem-gazette-ref" role="region" aria-label="Local Gazette reference">
      <p class="dem-gazette-ref-label">Local Gazette</p>
      <p class="dem-gazette-id">${idTitle}</p>
      ${note}
      <div class="dem-terminal-card-actions dem-gazette-actions">${btn}</div>
      ${optionalUrlCopyLine(url)}
    </div>
  `;
}

function renderGazetteReferenceCompact(row) {
  if (!row || !row.gazetteId) return '';
  const url = row.gazetteUrl || SITE_GAZETTE;
  const titleBit = row.gazetteTitle ? ` — ${escapeHtml(row.gazetteTitle)}` : '';
  const btn = `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" class="button button-secondary dem-terminal-ref-btn dem-gazette-open-btn">Open Local Gazette</a>`;
  return `
    <div class="dem-gazette-ref dem-gazette-ref--compact" role="region" aria-label="Local Gazette reference">
      <div class="dem-gazette-compact-row">
        <p class="dem-gazette-compact-text"><span class="dem-gazette-id-inline">${escapeHtml(row.gazetteId)}</span>${titleBit}</p>
        ${btn}
      </div>
    </div>
  `;
}

export function renderUnlockedGazetteNotes(container) {
  if (!container) return;
  const u = loadTerminalUnlocks();
  const order = [
    'GAZ-204',
    'GAZ-118',
    'GAZ-404',
    'GAZ-911',
    'GAZ-013',
    'GAZ-237',
    'GAZ-000'
  ];
  const flags = {
    'GAZ-204': u.gaz204,
    'GAZ-118': u.gaz118,
    'GAZ-404': u.gaz404,
    'GAZ-911': u.gaz911,
    'GAZ-013': u.gaz013,
    'GAZ-237': u.gaz237,
    'GAZ-000': u.gaz000
  };
  const lines = order.filter((id) => flags[id]).map((id) => GAZETTE_ARCHIVE_LINES[id]);
  if (!lines.length) {
    container.innerHTML =
      '<p class="dem-terminal-muted dem-gazette-notes-empty">No Gazette clippings verified yet.</p>';
    return;
  }
  container.innerHTML = `<ul class="dem-gazette-archive-list">${lines
    .map((line) => `<li>${escapeHtml(line)}</li>`)
    .join('')}</ul>`;
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
    gaz204: codes.gaz204 === true || codes.gaz204Reserved === true,
    gaz118: codes.gaz118 === true,
    gaz404: codes.gaz404 === true,
    gaz911: codes.gaz911 === true,
    gaz013: codes.gaz013 === true,
    gaz237: codes.gaz237 === true,
    gaz000: codes.gaz000 === true,
    vm204: codes.vm204 === true || codes.vm204Reserved === true,
    vm013: codes.vm013 === true,
    vm237: codes.vm237 === true,
    vm911: codes.vm911 === true,
    vm118: codes.vm118 === true,
    vm404: codes.vm404 === true,
    vm000: codes.vm000 === true,
    vmFront7: codes.vmFront7 === true
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
    note: 'May correlate with weather — not always paranormal.',
    gazetteId: 'GAZ-000',
    gazetteTitle: 'Signal Lost During Local Broadcast',
    gazetteNote: 'Broadcast drift logged; cross-check DVR timestamps.',
    gazetteUrl: SITE_GAZETTE
  },
  {
    incidentId: 'INC-118',
    title: 'Guest Refuses Checkout',
    severity: 'Medium',
    location: 'Room 118',
    pressureImpact: '+9',
    possibleResponses: 'Manager callback, security standby, comp negotiation',
    siteReference: SITE_ROOT,
    note: 'Watch for repeated phrase usage in refusal script.',
    gazetteId: 'GAZ-118',
    gazetteTitle: 'Noise Complaints Before Checkout',
    gazetteNote: 'Prior noise complaints sometimes precede refusal patterns.',
    gazetteUrl: SITE_GAZETTE
  },
  {
    incidentId: 'INC-204',
    title: 'Lobby Camera Blackout',
    severity: 'High',
    location: 'Lobby / Room 204 Hallway',
    pressureImpact: '+18',
    possibleResponses: 'Dispatch staff, reset cameras, call police',
    siteReference: SITE_FILES,
    note: 'Previous records reference Room 204.',
    gazetteId: 'GAZ-204',
    gazetteTitle: 'Room Closed After Midnight Incident',
    gazetteNote: 'Gazette clipping ties blackout corridor to Room 204 policy.',
    gazetteUrl: SITE_GAZETTE
  },
  {
    incidentId: 'INC-237',
    title: 'Noise Complaint',
    severity: 'Low',
    location: 'Room 237 adjacent',
    pressureImpact: '+4',
    possibleResponses: 'Welfare check, volume warning, room move offer',
    siteReference: SITE_ROOT,
    note: 'Stacking complaints raises hallway threat.',
    gazetteId: 'GAZ-237',
    gazetteTitle: 'Hallway Noise Report Reopened',
    gazetteNote: 'Reopened reports may echo older 237 corridor chatter.',
    gazetteUrl: SITE_GAZETTE
  },
  {
    incidentId: 'INC-404',
    title: 'Missing File',
    severity: 'Medium',
    location: 'Front desk archive',
    pressureImpact: '+7',
    possibleResponses: 'Search dead storage, portal cross-reference, log gap',
    siteReference: SITE_FILES,
    note: 'Some archives moved to external staff portal.',
    gazetteId: 'GAZ-404',
    gazetteTitle: 'Missing Records at Roadside Motel',
    gazetteNote: 'Gazette mentions gaps that mirror desk archive holes.',
    gazetteUrl: SITE_GAZETTE
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
    siteReference: SITE_LOST_FOUND,
    gazetteId: 'GAZ-118',
    gazetteTitle: 'Noise Complaints Before Checkout',
    gazetteNote: 'Watch may tie to 118 noise / checkout chatter.'
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
    siteReference: SITE_LOST_FOUND,
    gazetteId: 'GAZ-118',
    gazetteTitle: 'Noise Complaints Before Checkout',
    gazetteNote: 'Key return stories sometimes surface in the same clipping.'
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
    siteReference: SITE_LOST_FOUND,
    gazetteId: 'GAZ-204',
    gazetteTitle: 'Room Closed After Midnight Incident',
    gazetteNote: 'Matchbook moisture matches corridor flood mentions.'
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
    siteReference: SITE_LOST_FOUND,
    gazetteId: 'GAZ-013',
    gazetteTitle: 'Quiet Guest Sighting',
    gazetteNote: 'Gazette quiet-guest column may reference G-013 patterns.'
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
    siteReference: SITE_LOST_FOUND,
    gazetteId: 'GAZ-404',
    gazetteTitle: 'Missing Records at Roadside Motel',
    gazetteNote: 'Receipt gaps echo missing-records bulletin.'
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
    siteReference: SITE_LOST_FOUND,
    gazetteId: 'GAZ-237',
    gazetteTitle: 'Hallway Noise Report Reopened',
    gazetteNote: '237 corridor noise line in gazette matches item location.'
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
    siteReference: SITE_LOST_FOUND,
    gazetteId: 'GAZ-911',
    gazetteTitle: 'Emergency Routing Notice',
    gazetteNote: 'Tape gear tied to switchboard outage stories.'
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
    siteReference: SITE_LOST_FOUND,
    gazetteId: 'GAZ-000',
    gazetteTitle: 'Signal Lost During Local Broadcast',
    gazetteNote: 'Blank tags sometimes appear in broadcast glitch footnotes.'
  }
];

/** Voicemail Archive registry (matches site transcripts; optional second-screen). */
export const STAFF_TERMINAL_VOICEMAIL = [
  {
    voicemailId: 'VM-204',
    title: 'Room 204 Line',
    risk: 'Critical',
    relatedRoom: 'Room 204',
    relatedGuest: 'G-204',
    relatedIncident: 'INC-204',
    relatedItem: 'LF-204',
    relatedGazette: 'GAZ-204',
    manualRule: 'Rule 204',
    note: 'Do not give him that room. He asked before he saw the map.',
    siteReference: SITE_VOICEMAIL
  },
  {
    voicemailId: 'VM-013',
    title: 'Quiet Line',
    risk: 'Medium',
    relatedRoom: 'Lobby / Parking Lot',
    relatedGuest: 'G-013',
    relatedIncident: '—',
    relatedItem: 'LF-013',
    relatedGazette: 'GAZ-013',
    manualRule: 'Rule 13',
    note: 'Do not call quiet safe.',
    siteReference: SITE_VOICEMAIL
  },
  {
    voicemailId: 'VM-237',
    title: 'Hallway Callback',
    risk: 'High',
    relatedRoom: 'Room 237',
    relatedGuest: 'G-237',
    relatedIncident: 'INC-237',
    relatedItem: 'LF-237',
    relatedGazette: 'GAZ-237',
    manualRule: 'Rule 237',
    note: 'Do not move them without logging it.',
    siteReference: SITE_VOICEMAIL
  },
  {
    voicemailId: 'VM-911',
    title: 'Routing Failure',
    risk: 'High',
    relatedRoom: 'Office',
    relatedGuest: '—',
    relatedIncident: 'INC-000',
    relatedItem: 'LF-911',
    relatedGazette: 'GAZ-911',
    manualRule: 'Rule 911',
    note: 'Emergency routing unavailable. The motel switchboard is already listening.',
    siteReference: SITE_VOICEMAIL
  },
  {
    voicemailId: 'VM-118',
    title: 'Key Return Message',
    risk: 'Medium',
    relatedRoom: 'Room 118',
    relatedGuest: 'G-104',
    relatedIncident: 'INC-118',
    relatedItem: 'LF-007 / LF-118',
    relatedGazette: 'GAZ-118',
    manualRule: 'Rule 118',
    note: 'The key came back warm.',
    siteReference: SITE_VOICEMAIL
  },
  {
    voicemailId: 'VM-404',
    title: 'Missing Record Tone',
    risk: 'Unknown',
    relatedRoom: 'Staff Only',
    relatedGuest: '—',
    relatedIncident: 'INC-404',
    relatedItem: 'LF-404',
    relatedGazette: 'GAZ-404',
    manualRule: 'Rule 404',
    note: 'The record exists. Not here.',
    siteReference: SITE_VOICEMAIL
  },
  {
    voicemailId: 'VM-000',
    title: 'Dead Air Broadcast',
    risk: 'Unknown',
    relatedRoom: 'Camera Room',
    relatedGuest: '—',
    relatedIncident: 'INC-000',
    relatedItem: 'LF-000',
    relatedGazette: 'GAZ-000',
    manualRule: 'Rule 07 / Rule 404',
    note: 'Not enough signal to classify.',
    siteReference: SITE_VOICEMAIL
  },
  {
    voicemailId: 'VM-FRONT-7',
    title: 'Cash After Midnight',
    risk: 'Medium',
    relatedRoom: 'Front Desk / Far hallway',
    relatedGuest: 'G-027',
    relatedIncident: '—',
    relatedItem: '—',
    relatedGazette: 'GAZ-027',
    manualRule: 'Rule 04 / Rule 18',
    note: 'Cash after midnight is not a crime. It is also not nothing.',
    siteReference: SITE_VOICEMAIL
  }
];

const VOICEMAIL_CODE_MESSAGES = {
  'VM-204':
    'Voicemail reference accepted. Room 204 transcript connected to G-204, LF-204, GAZ-204, and Rule 204.',
  'VM-013':
    'Voicemail reference accepted. Quiet Line connected to G-013, LF-013, GAZ-013, and Rule 13.',
  'VM-237':
    'Voicemail reference accepted. Hallway Callback connected to Room 237, GAZ-237, and Rule 237.',
  'VM-911':
    'Voicemail reference accepted. Emergency routing transcript connected to GAZ-911 and Rule 911.',
  'VM-118':
    'Voicemail reference accepted. Key Return Message connected to LF-007, LF-118, GAZ-118, and Rule 118.',
  'VM-404':
    'Voicemail reference accepted. Missing Record Tone connected to INC-404, LF-404, GAZ-404, and Rule 404.',
  'VM-000': 'Voicemail reference accepted. Dead Air Broadcast marked incomplete.',
  'VM-FRONT-7':
    'Voicemail reference accepted. Cash after midnight note connected to G-027 and Rule 04.'
};

const VOICEMAIL_ARCHIVE_LINES = {
  'VM-204': 'VM-204: Room 204 transcript connected to G-204 / LF-204 / GAZ-204.',
  'VM-013': 'VM-013: Quiet Line connected to G-013 / Rule 13.',
  'VM-237': 'VM-237: Hallway Callback connected to Room 237 / GAZ-237 / Rule 237.',
  'VM-911': 'VM-911: Emergency routing transcript connected to Rule 911.',
  'VM-118': 'VM-118: Key Return Message connected to LF-007 / LF-118 / GAZ-118.',
  'VM-404': 'VM-404: Missing Record Tone connected to INC-404 / LF-404 / GAZ-404.',
  'VM-000': 'VM-000: Dead Air Broadcast marked incomplete.',
  'VM-FRONT-7': 'VM-FRONT-7: Cash after midnight note connected to G-027 / Rule 04.'
};

const VOICEMAIL_UNLOCK_FLAG_ORDER = [
  ['vm204', 'VM-204'],
  ['vm013', 'VM-013'],
  ['vm237', 'VM-237'],
  ['vm911', 'VM-911'],
  ['vm118', 'VM-118'],
  ['vm404', 'VM-404'],
  ['vm000', 'VM-000'],
  ['vmFront7', 'VM-FRONT-7']
];

let voicemailLogMemory = [];

function parseVoicemailLog() {
  const raw = safeGetItem(LS.voicemailLog);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function loadVoicemailLog() {
  const stored = parseVoicemailLog();
  if (stored) return stored;
  return Array.isArray(voicemailLogMemory) ? voicemailLogMemory : [];
}

function saveVoicemailLog(entries) {
  const next = Array.isArray(entries) ? entries : [];
  voicemailLogMemory = next;
  try {
    safeSetItem(LS.voicemailLog, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

function clearVoicemailLog() {
  saveVoicemailLog([]);
}

function findVoicemailDef(vmId) {
  const want = String(vmId || '').trim();
  if (!want) return null;
  return (
    STAFF_TERMINAL_VOICEMAIL.find(
      (v) =>
        v.voicemailId === want ||
        v.voicemailId.toLowerCase() === want.toLowerCase()
    ) || null
  );
}

export function logVoicemailMessage(vmId) {
  const def = findVoicemailDef(vmId);
  if (!def) return false;
  const cur = loadVoicemailLog();
  if (cur.some((x) => String(x?.voicemailId) === def.voicemailId)) return false;
  saveVoicemailLog([...cur, { voicemailId: def.voicemailId, loggedAt: Date.now() }]);
  return true;
}

function pickRandomVoicemailNotLogged() {
  const current = loadVoicemailLog();
  const logged = new Set(current.map((x) => String(x?.voicemailId)));
  const pool = STAFF_TERMINAL_VOICEMAIL.filter((v) => !logged.has(v.voicemailId));
  if (!pool.length) {
    return STAFF_TERMINAL_VOICEMAIL[
      Math.floor(Math.random() * STAFF_TERMINAL_VOICEMAIL.length)
    ];
  }
  return pool[Math.floor(Math.random() * pool.length)];
}

export function getVoicemailNoteForCode(vmId) {
  const id = String(vmId || '').trim();
  const def = findVoicemailDef(id);
  const key = def ? def.voicemailId : id.toUpperCase();
  return VOICEMAIL_ARCHIVE_LINES[key] || '';
}

export function renderUnlockedVoicemailNotes(container) {
  if (!container) return;
  const u = loadTerminalUnlocks();
  const flags = {
    'VM-204': u.vm204,
    'VM-013': u.vm013,
    'VM-237': u.vm237,
    'VM-911': u.vm911,
    'VM-118': u.vm118,
    'VM-404': u.vm404,
    'VM-000': u.vm000,
    'VM-FRONT-7': u.vmFront7
  };
  const order = [
    'VM-204',
    'VM-013',
    'VM-237',
    'VM-911',
    'VM-118',
    'VM-404',
    'VM-000',
    'VM-FRONT-7'
  ];
  const lines = order.filter((id) => flags[id]).map((id) => VOICEMAIL_ARCHIVE_LINES[id]);
  if (!lines.length) {
    container.innerHTML =
      '<p class="dem-terminal-muted dem-voicemail-notes-empty">No voicemail transcripts verified yet.</p>';
    return;
  }
  container.innerHTML = `<ul class="dem-voicemail-archive-list">${lines
    .map((line) => `<li><span class="dem-voicemail-archive-card">${escapeHtml(line)}</span></li>`)
    .join('')}</ul>`;
}

function showStaffTerminalToast(message) {
  const t = el('dem-staff-terminal-toast');
  if (!t || !message) return;
  t.textContent = message;
  t.hidden = false;
  try {
    clearTimeout(window.__demStaffTerminalToastTimer);
    window.__demStaffTerminalToastTimer = setTimeout(() => {
      t.hidden = true;
    }, 4200);
  } catch {
    /* ignore */
  }
}

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
    result.message =
      'Gazette reference accepted. Room 204 clipping cross-linked with INC-204 and LF-204.';
    result.patchCodes.gaz204 = true;
    return result;
  }
  if (lower === 'gaz-118') {
    result.ok = true;
    result.message =
      'Gazette reference accepted. Room 118 noise complaint linked to Silver Watch and key return.';
    result.patchCodes.gaz118 = true;
    return result;
  }
  if (lower === 'gaz-404') {
    result.ok = true;
    result.message =
      'Gazette reference accepted. Missing file clipping linked to Staff Only records.';
    result.patchCodes.gaz404 = true;
    return result;
  }
  if (lower === 'gaz-911') {
    result.ok = true;
    result.message = 'Gazette reference accepted. Emergency routing outage note unlocked.';
    result.patchCodes.gaz911 = true;
    return result;
  }
  if (lower === 'gaz-013') {
    result.ok = true;
    result.message = 'Gazette reference accepted. Quiet guest sighting linked to G-013.';
    result.patchCodes.gaz013 = true;
    return result;
  }
  if (lower === 'gaz-237') {
    result.ok = true;
    result.message = 'Gazette reference accepted. Hallway noise report linked to Room 237.';
    result.patchCodes.gaz237 = true;
    return result;
  }
  if (lower === 'gaz-000') {
    result.ok = true;
    result.message =
      'Gazette reference accepted. Signal interruption clipping marked incomplete.';
    result.patchCodes.gaz000 = true;
    return result;
  }
  if (lower === 'vm-204') {
    result.ok = true;
    result.message =
      'Voicemail reference accepted. Room 204 transcript connected to G-204, LF-204, GAZ-204, and Rule 204.';
    result.patchCodes.vm204 = true;
    return result;
  }
  if (lower === 'vm-013') {
    result.ok = true;
    result.message =
      'Voicemail reference accepted. Quiet Line connected to G-013, LF-013, GAZ-013, and Rule 13.';
    result.patchCodes.vm013 = true;
    return result;
  }
  if (lower === 'vm-237') {
    result.ok = true;
    result.message =
      'Voicemail reference accepted. Hallway Callback connected to Room 237, GAZ-237, and Rule 237.';
    result.patchCodes.vm237 = true;
    return result;
  }
  if (lower === 'vm-911') {
    result.ok = true;
    result.message =
      'Voicemail reference accepted. Emergency routing transcript connected to GAZ-911 and Rule 911.';
    result.patchCodes.vm911 = true;
    return result;
  }
  if (lower === 'vm-118') {
    result.ok = true;
    result.message =
      'Voicemail reference accepted. Key Return Message connected to LF-007, LF-118, GAZ-118, and Rule 118.';
    result.patchCodes.vm118 = true;
    return result;
  }
  if (lower === 'vm-404') {
    result.ok = true;
    result.message =
      'Voicemail reference accepted. Missing Record Tone connected to INC-404, LF-404, GAZ-404, and Rule 404.';
    result.patchCodes.vm404 = true;
    return result;
  }
  if (lower === 'vm-000') {
    result.ok = true;
    result.message = 'Voicemail reference accepted. Dead Air Broadcast marked incomplete.';
    result.patchCodes.vm000 = true;
    return result;
  }
  if (lower === 'vm-front-7') {
    result.ok = true;
    result.message =
      'Voicemail reference accepted. Cash after midnight note connected to G-027 and Rule 04.';
    result.patchCodes.vmFront7 = true;
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
  const gazetteUnlockPairs = [
    ['gaz204', 'GAZ-204'],
    ['gaz118', 'GAZ-118'],
    ['gaz404', 'GAZ-404'],
    ['gaz911', 'GAZ-911'],
    ['gaz013', 'GAZ-013'],
    ['gaz237', 'GAZ-237'],
    ['gaz000', 'GAZ-000']
  ];
  gazetteUnlockPairs.forEach(([flag, id]) => {
    if (u[flag] && GAZETTE_UNLOCK_MESSAGES[id]) {
      items.push({
        title: `${id} note`,
        body: GAZETTE_UNLOCK_MESSAGES[id]
      });
    }
  });
  VOICEMAIL_UNLOCK_FLAG_ORDER.forEach(([flag, id]) => {
    if (u[flag] && VOICEMAIL_CODE_MESSAGES[id]) {
      items.push({
        title: `${id} note`,
        body: VOICEMAIL_CODE_MESSAGES[id]
      });
    }
  });

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
  if (u === SITE_GAZETTE) return { label: 'Open Local Gazette', href: SITE_GAZETTE };
  if (u === SITE_VOICEMAIL) return { label: 'Open Voicemail Archive', href: SITE_VOICEMAIL };
  if (u === SITE_EMPLOYEE_PORTAL)
    return { label: 'Open Employee Portal', href: SITE_EMPLOYEE_PORTAL };
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
          ${renderGazetteReferenceBlock(inc)}
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

function renderVoicemailTab(root) {
  if (!root) return;
  const log = loadVoicemailLog();
  const archiveBtn = referenceLinkButton(SITE_VOICEMAIL);
  const listHtml = !log.length
    ? '<p class="dem-terminal-muted">No voicemail messages logged yet.</p>'
    : `<div class="dem-voicemail-grid">${log
        .slice()
        .reverse()
        .map((entry) => {
          const def = findVoicemailDef(entry.voicemailId);
          if (!def) return '';
          const riskPill = riskPillClass(def.risk);
          const giParts = [];
          if (def.relatedGuest && def.relatedGuest !== '—') giParts.push(def.relatedGuest);
          if (def.relatedIncident && def.relatedIncident !== '—') giParts.push(def.relatedIncident);
          const guestInc = giParts.length ? giParts.join(' · ') : '—';
          const vmBtn = referenceLinkButton(def.siteReference || SITE_VOICEMAIL);
          return `
          <article class="dem-terminal-card dem-voicemail-card">
            <header class="dem-voicemail-head">
              <h4 class="dem-voicemail-title"><span class="dem-voicemail-id">${escapeHtml(def.voicemailId)}</span> — ${escapeHtml(def.title)}</h4>
              <span class="${riskPill}">${escapeHtml(def.risk)}</span>
            </header>
            <dl class="dem-kv">
              <div class="dem-kv-row"><dt>Room</dt><dd>${escapeHtml(def.relatedRoom || '—')}</dd></div>
              <div class="dem-kv-row dem-kv-row--wide"><dt>Guest / incident</dt><dd>${escapeHtml(guestInc)}</dd></div>
              <div class="dem-kv-row dem-kv-row--wide"><dt>Note</dt><dd>${escapeHtml(def.note || '')}</dd></div>
            </dl>
            <div class="dem-terminal-card-actions">${vmBtn}</div>
            ${optionalUrlCopyLine(def.siteReference || SITE_VOICEMAIL)}
          </article>`;
        })
        .join('')}</div>`;

  root.innerHTML = `
    <p class="dem-terminal-muted">Switchboard log is local-only. The site Voicemail Archive has optional transcripts.</p>
    <div class="dem-terminal-card-actions">
      <button type="button" class="button button-secondary dem-terminal-ref-btn" id="dem-voicemail-log-sample">Log sample voicemail</button>
      <button type="button" class="button button-secondary dem-terminal-ref-btn" id="dem-voicemail-clear">Clear voicemail log</button>
      ${archiveBtn}
    </div>
    ${optionalUrlCopyLine(SITE_VOICEMAIL)}
    <section class="dem-terminal-notes-section dem-voicemail-inline-notes" aria-label="Archived Voicemail Notes">
      <h3 class="dem-terminal-subhead">Archived Voicemail Notes</h3>
      <div id="dem-terminal-voicemail-notes-inline"></div>
    </section>
    ${listHtml}
  `;

  renderUnlockedVoicemailNotes(el('dem-terminal-voicemail-notes-inline'));

  el('dem-voicemail-log-sample')?.addEventListener('click', (e) => {
    e.preventDefault();
    const picked = pickRandomVoicemailNotLogged();
    if (picked) logVoicemailMessage(picked.voicemailId);
    renderVoicemailTab(root);
    const rs = window.__demStaffTerminalLastRenderState || {};
    renderOverview(el('dem-terminal-panel-overview'), rs);
  });

  el('dem-voicemail-clear')?.addEventListener('click', (e) => {
    e.preventDefault();
    clearVoicemailLog();
    renderVoicemailTab(root);
    const rs = window.__demStaffTerminalLastRenderState || {};
    renderOverview(el('dem-terminal-panel-overview'), rs);
  });
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
            ${renderGazetteReferenceCompact(it)}
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
    if (Math.random() < 0.07) {
      const vmPick = pickRandomVoicemailNotLogged();
      if (vmPick && logVoicemailMessage(vmPick.voicemailId)) {
        showStaffTerminalToast(`Switchboard message logged: ${vmPick.voicemailId}`);
        const vmRoot = el('dem-terminal-panel-voicemail');
        if (vmRoot) renderVoicemailTab(vmRoot);
        const rs = window.__demStaffTerminalLastRenderState || {};
        renderOverview(el('dem-terminal-panel-overview'), rs);
      }
    }
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
        <div class="dem-portal-row dem-portal-row--available" role="listitem">
          <span class="dem-portal-row-name">Employee Portal</span>
          <span class="dem-pill dem-pill-ok">Available</span>
          <span class="dem-portal-row-action"><a href="${SITE_EMPLOYEE_PORTAL}" target="_blank" rel="noopener noreferrer" class="button button-secondary dem-terminal-ref-btn">Open Employee Portal</a></span>
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
        <div class="dem-portal-row dem-portal-row--available" role="listitem">
          <span class="dem-portal-row-name">Local Gazette</span>
          <span class="dem-pill dem-pill-ok">Available</span>
          <span class="dem-portal-row-action"><a href="${SITE_GAZETTE}" target="_blank" rel="noopener noreferrer" class="button button-secondary dem-terminal-ref-btn">Open Local Gazette</a></span>
        </div>
        <div class="dem-portal-row dem-portal-row--available" role="listitem">
          <span class="dem-portal-row-name">Voicemail Archive</span>
          <span class="dem-pill dem-pill-ok">Available</span>
          <span class="dem-portal-row-action"><a href="${SITE_VOICEMAIL}" target="_blank" rel="noopener noreferrer" class="button button-secondary dem-terminal-ref-btn">Open Voicemail Archive</a></span>
        </div>
      </div>
      <div class="dem-portal-quick-actions">
        <a href="${SITE_ROOT}" target="_blank" rel="noopener noreferrer" class="button button-primary dem-terminal-ref-btn">Open Official Site</a>
        <p class="dem-terminal-muted dem-portal-quick-hint">Opens deadendmotel.site in a new tab.</p>
      </div>
      <p class="dem-terminal-url-copy dem-terminal-muted"><span class="dem-terminal-url-copy-label">Copy-safe</span> <code class="dem-terminal-url-code">${escapeHtml(SITE_ROOT)}</code> · <code class="dem-terminal-url-code">${escapeHtml(SITE_EMPLOYEE_PORTAL)}</code> · <code class="dem-terminal-url-code">${escapeHtml(SITE_TRAINING)}</code> · <code class="dem-terminal-url-code">${escapeHtml(SITE_GUEST_DB)}</code> · <code class="dem-terminal-url-code">${escapeHtml(SITE_LOST_FOUND)}</code> · <code class="dem-terminal-url-code">${escapeHtml(SITE_GAZETTE)}</code> · <code class="dem-terminal-url-code">${escapeHtml(SITE_VOICEMAIL)}</code> · <code class="dem-terminal-url-code">${escapeHtml(SITE_FILES)}</code> · <code class="dem-terminal-url-code">${escapeHtml(SITE_FLOOR)}</code> · <code class="dem-terminal-url-code">${escapeHtml(SITE_MEDIA)}</code></p>
    </div>
  `;
}

function buildSwitchboardOverviewCardHtml() {
  const log = loadVoicemailLog();
  const archiveBtn = referenceLinkButton(SITE_VOICEMAIL);
  const tabBtn = `<button type="button" class="button button-secondary dem-terminal-ref-btn" id="dem-overview-open-voicemail-tab">Open Voicemail tab</button>`;
  if (!log.length) {
    return `
    <div class="dem-terminal-card dem-switchboard-overview-card">
      <p class="dem-switchboard-overview-title">Switchboard Messages</p>
      <p class="dem-terminal-muted dem-switchboard-overview-body">No phone messages logged this shift.</p>
      <div class="dem-terminal-card-actions dem-switchboard-overview-actions">
        ${tabBtn}
        ${archiveBtn}
      </div>
    </div>`;
  }
  const latest = log[log.length - 1];
  const def = findVoicemailDef(latest?.voicemailId);
  const line = def
    ? `Latest: ${def.voicemailId} — ${def.title}`
    : `Latest: ${String(latest?.voicemailId || '')}`;
  return `
    <div class="dem-terminal-card dem-switchboard-overview-card">
      <p class="dem-switchboard-overview-title">Switchboard Messages</p>
      <p class="dem-switchboard-latest">${escapeHtml(line)}</p>
      <div class="dem-terminal-card-actions dem-switchboard-overview-actions">
        ${tabBtn}
        ${archiveBtn}
      </div>
    </div>`;
}

function renderReferencesTab(root) {
  if (!root) return;
  root.innerHTML = `
    <p class="dem-terminal-muted">Archive links are optional second-screen tools. The shift remains playable offline.</p>
    <div class="dem-terminal-card dem-portal-board-card">
      <p class="dem-portal-board-title">References</p>
      <div class="dem-portal-board" role="list">
        <div class="dem-portal-row dem-portal-row--available" role="listitem">
          <span class="dem-portal-row-name">Voicemail Archive</span>
          <span class="dem-pill dem-pill-ok">Available</span>
          <span class="dem-portal-row-action">${referenceLinkButton(SITE_VOICEMAIL)}</span>
        </div>
        <div class="dem-portal-row dem-portal-row--available" role="listitem">
          <span class="dem-portal-row-name">Employee Portal</span>
          <span class="dem-pill dem-pill-ok">Available</span>
          <span class="dem-portal-row-action">${referenceLinkButton(SITE_EMPLOYEE_PORTAL)}</span>
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
          <span class="dem-portal-row-name">Local Gazette</span>
          <span class="dem-pill dem-pill-ok">Available</span>
          <span class="dem-portal-row-action">${referenceLinkButton(SITE_GAZETTE)}</span>
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
      <div class="dem-terminal-card-actions">${referenceLinkButton(SITE_ROOT)}</div>
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
        <a href="${SITE_EMPLOYEE_PORTAL}" target="_blank" rel="noopener noreferrer" class="button button-secondary dem-terminal-ref-btn">Open Employee Portal</a>
        <a href="${SITE_ROOT}" target="_blank" rel="noopener noreferrer" class="button button-secondary dem-terminal-ref-btn">Open Official Site</a>
      </div>
      <p class="dem-terminal-muted dem-portal-quick-hint">Opens in a new tab. Optional — not required to play.</p>
      ${optionalUrlCopyLine(SITE_ROOT)}
    </div>
    <div class="dem-terminal-card dem-gazette-reminder-card">
      <p class="dem-gazette-reminder-title">Archived Clipping Reminder</p>
      <p class="dem-terminal-muted dem-gazette-reminder-body">Some incident IDs now have Local Gazette references. If a report mentions GAZ-204, check the Local Gazette archive before assuming the incident is new.</p>
      <div class="dem-terminal-card-actions">
        <a href="${SITE_GAZETTE}" target="_blank" rel="noopener noreferrer" class="button button-secondary dem-terminal-ref-btn dem-gazette-open-btn">Open Local Gazette</a>
      </div>
    </div>
    ${buildSwitchboardOverviewCardHtml()}
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

function syncVoicemailArchivePanels() {
  renderUnlockedVoicemailNotes(el('dem-terminal-voicemail-notes'));
  renderUnlockedVoicemailNotes(el('dem-terminal-voicemail-notes-inline'));
}

function refreshTerminalContent(renderState) {
  if (!overlayOpen) return;
  renderOverview(el('dem-terminal-panel-overview'), renderState);
  fillActiveIncidents(renderState);
  renderUnlockedNotes(el('dem-terminal-unlocked-notes'));
  renderUnlockedGazetteNotes(el('dem-terminal-gazette-notes'));
  syncVoicemailArchivePanels();
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
  renderUnlockedGazetteNotes(el('dem-terminal-gazette-notes'));
  syncVoicemailArchivePanels();
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
      renderVoicemailTab(el('dem-terminal-panel-voicemail'));
      fillActiveIncidents(rs);
      renderStaffPortalTab(el('dem-terminal-panel-portal'));
      renderReferencesTab(el('dem-terminal-panel-refs'));
      setTab(activeTab);
      renderUnlockedNotes(el('dem-terminal-unlocked-notes'));
      renderUnlockedGazetteNotes(el('dem-terminal-gazette-notes'));
      syncVoicemailArchivePanels();
    } catch {
      /* ignore */
    }
  });

  el('dem-staff-terminal-close')?.addEventListener('click', (e) => {
    e.preventDefault();
    closeOverlay();
  });

  overlay.addEventListener('click', (e) => {
    if (e.target.closest('#dem-overview-open-voicemail-tab')) {
      e.preventDefault();
      setTab('voicemail');
      return;
    }
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

  window.demOpenStaffTerminalToTab = function (tabId) {
    if (!tabId || typeof tabId !== 'string') return;
    if (overlay.hidden) {
      openBtn.click();
    }
    try {
      setTab(tabId);
      syncVoicemailArchivePanels();
    } catch {
      /* ignore */
    }
  };
}
