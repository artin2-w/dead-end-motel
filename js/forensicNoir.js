/**
 * v0.33 — Blacklight / UV lens, Lost & Found, tape backup vulnerability, forensic trace payoff.
 */

import { buildEvidenceItem } from './storyThreads.js';

const LOST_FOUND_MAX = 5;

function pushShiftLog(state, line) {
  if (!line || !state) return;
  state.forensicNoir = state.forensicNoir || {};
  const arr = Array.isArray(state.forensicNoir.shiftLog) ? state.forensicNoir.shiftLog : [];
  arr.push(String(line));
  state.forensicNoir.shiftLog = arr.slice(-16);
}

export function buildFreshForensicNoir() {
  return {
    uvDeskLensActive: false,
    uvConfirmationsThisShift: 0,
    lostFound: [],
    claimDebt: 0,
    tapeArchive: null,
    shiftLog: []
  };
}

export function normalizeForensicNoirState(state) {
  if (!state || typeof state !== 'object') return state;
  const base = buildFreshForensicNoir();
  const cur = state.forensicNoir && typeof state.forensicNoir === 'object' ? state.forensicNoir : {};
  state.forensicNoir = {
    ...base,
    ...cur,
    lostFound: Array.isArray(cur.lostFound) ? cur.lostFound.filter((x) => x && !x.resolved).slice(-LOST_FOUND_MAX) : [],
    shiftLog: Array.isArray(cur.shiftLog) ? cur.shiftLog.slice(-16) : []
  };
  if (state.forensicNoir.tapeArchive && typeof state.forensicNoir.tapeArchive !== 'object') {
    state.forensicNoir.tapeArchive = null;
  }
  return state;
}

export function toggleUvDeskLens(state) {
  normalizeForensicNoirState(state);
  state.forensicNoir.uvDeskLensActive = !state.forensicNoir.uvDeskLensActive;
  pushShiftLog(
    state,
    state.forensicNoir.uvDeskLensActive ? 'Blacklight desk lens engaged.' : 'Blacklight desk lens off.'
  );
  return state.forensicNoir.uvDeskLensActive;
}

/** Extra UV lines for cash / keys / notes / IDs at desk scale */
export function buildDeskUvObjectLines(guest) {
  if (!guest) return [];
  const lines = [];
  const risk = String(guest.riskLevel || '').toLowerCase();
  const forged = Boolean(guest?.forgeryProfile?.isForged);
  const faction = Boolean(guest?.factionProfile?.label);
  const deposit = Boolean(guest?.depositRequested);
  if (forged || risk === 'high') {
    lines.push('UV: bill edges show faint wash where bands sat — not fresh from a bank strap.');
  } else if (risk === 'medium') {
    lines.push('UV: one bill carries a small reactive fleck consistent with counted cash, not ATM-clean.');
  }
  if (guest?.vehicleProfile?.plateMismatch) {
    lines.push('UV: key fob plastic fluoresces unevenly — possible swap or duplicate shell.');
  }
  if (faction) {
    lines.push('UV: note paper fibers brighten along fold lines as if re-opened after sealing.');
  }
  if (deposit) {
    lines.push('UV: deposit envelope seal shows double-heat halo — handled twice before the desk.');
  }
  if (!lines.length && guest?.contradictoryClue) {
    lines.push('UV: ID laminate shows micro-scratch grid typical of reissued cards, not factory fresh.');
  }
  return lines.slice(0, 3);
}

export function applyUvInspectionCrossRef(state, guest) {
  normalizeForensicNoirState(state);
  state.forensicNoir.uvConfirmationsThisShift = (state.forensicNoir.uvConfirmationsThisShift || 0) + 1;
  const items = state?.evidenceLocker?.items || [];
  const night = Math.max(1, Number(state?.night || 1));
  let confirmed = 0;
  for (let i = items.length - 1; i >= 0 && confirmed < 1; i -= 1) {
    const it = items[i];
    if (!it?.uvReactive || it.uvConfirmed) continue;
    if (Number(it.night || 0) > night) continue;
    const cat = String(it.category || '');
    const guestHigh = String(guest?.riskLevel || '') === 'High' || Boolean(guest?.forgeryProfile?.isForged);
    if (
      guestHigh &&
      (cat === 'dirty' || cat === 'town' || cat === 'owner' || cat === 'mystery' || cat === 'faction')
    ) {
      it.uvConfirmed = true;
      it.desc = `${it.desc || ''} UV-confirmed reactive trace on this shift.`.trim();
      confirmed += 1;
      pushShiftLog(state, `UV tied locker item "${it.label}" to live desk pressure.`);
    }
  }
  const objectLines = buildDeskUvObjectLines(guest);
  if (objectLines.length) {
    pushShiftLog(state, objectLines[0]);
  }
}

function makeLostFoundId() {
  return `lf-${Date.now()}-${Math.floor(Math.random() * 9999)}`;
}

export function maybeSpawnLostFoundOnReject(state, guest) {
  normalizeForensicNoirState(state);
  if ((state.forensicNoir.lostFound || []).length >= LOST_FOUND_MAX) return;
  if (!guest || Math.random() > 0.38) return;
  const kinds = ['wallet', 'usb', 'envelope', 'keycard', 'jewelry'];
  const kind = kinds[Math.floor(Math.random() * kinds.length)];
  const suspicious = guest.flagged || String(guest.riskLevel) === 'High';
  const item = {
    id: makeLostFoundId(),
    kind,
    label: `${guest.name}'s ${kind === 'keycard' ? 'keycard sleeve' : kind}`,
    short: suspicious ? 'Tagged fibers react under UV — not tourist-random.' : 'Ordinary left-behind. Still a liability if mishandled.',
    risk: suspicious ? 'suspicious' : 'ordinary',
    sourceGuest: guest.name,
    roomHint: null,
    resolved: false,
    disposition: null,
    traceTags: suspicious ? ['uv-hot', guest?.factionProfile?.id ? 'faction' : 'desk'] : ['ordinary']
  };
  if (state?.protectedRoom?.knownToPlayer && Math.random() < 0.18) {
    item.traceTags.push('room9-echo');
    item.short += ' A faint "9" ghost-reacts under blacklight on the corner.';
  }
  state.forensicNoir.lostFound.push(item);
  state.logs.push(`Lost & Found: ${item.label} turned up after the guest was turned away.`);
  pushLiveAlert(state, {
    type: 'info',
    message: 'Lost & Found: something was left at the desk edge.',
    dedupeKey: `lost-found-${item.id}`
  });
}

export function maybeSpawnLostFoundOnEvict(state, guestName, roomLabel, riskLevel) {
  normalizeForensicNoirState(state);
  if ((state.forensicNoir.lostFound || []).length >= LOST_FOUND_MAX) return;
  if (!guestName || Math.random() > 0.42) return;
  const item = {
    id: makeLostFoundId(),
    kind: 'bag-tag',
    label: `Luggage tag — ${guestName}`,
    short: 'Torn strap. UV shows second initials scratched under the printed ones.',
    risk: String(riskLevel) === 'High' ? 'incriminating' : 'suspicious',
    sourceGuest: guestName,
    roomHint: roomLabel || null,
    resolved: false,
    disposition: null,
    traceTags: ['eviction', 'uv-hot']
  };
  state.forensicNoir.lostFound.push(item);
  state.logs.push(`Lost & Found: ${item.label} from ${roomLabel || 'a room'} after eviction.`);
  pushLiveAlert(state, {
    type: 'warning',
    message: 'Lost & Found: eviction left a tagged object behind.',
    dedupeKey: `lost-found-evict-${item.id}`
  });
}

const LOST_ACTIONS = ['hold', 'log', 'sell', 'evidence', 'return', 'stash'];

export function resolveLostFoundAction(state, itemId, action) {
  normalizeForensicNoirState(state);
  const idx = (state.forensicNoir.lostFound || []).findIndex((x) => String(x.id) === String(itemId));
  if (idx === -1) return { ok: false, reason: 'Item not found.' };
  const item = state.forensicNoir.lostFound[idx];
  if (item.resolved) return { ok: false, reason: 'Already handled.' };
  if (!LOST_ACTIONS.includes(action)) return { ok: false, reason: 'Unknown action.' };

  item.resolved = true;
  item.disposition = action;
  let money = 0;
  let rep = 0;
  let dirty = 0;

  if (action === 'hold') {
    pushShiftLog(state, `Held ${item.label} unofficially.`);
  } else if (action === 'log') {
    rep += 1;
    pushShiftLog(state, `Logged ${item.label} properly.`);
  } else if (action === 'sell') {
    money += item.risk === 'ordinary' ? 12 : 22;
    dirty += item.risk === 'incriminating' || item.risk === 'suspicious' ? 1 : 0;
    state.forensicNoir.claimDebt = (state.forensicNoir.claimDebt || 0) + 1;
    pushShiftLog(state, `Quietly sold ${item.label}. Paper trail thin.`);
  } else if (action === 'evidence') {
    appendEvidenceFromTemplate(state, 'lost-found-object', state.night, item.label);
    rep -= item.risk === 'ordinary' ? 0 : 1;
    pushShiftLog(state, `Filed ${item.label} into evidence chain.`);
  } else if (action === 'return') {
    money -= 5;
    rep += 2;
    pushShiftLog(state, `Returned ${item.label} through carrier — cost absorbed.`);
  } else if (action === 'stash') {
    dirty += 1;
    state.forensicNoir.claimDebt = (state.forensicNoir.claimDebt || 0) + 1;
    pushShiftLog(state, `Stashed ${item.label} off-books.`);
  }

  state.money = Math.max(0, (state.money || 0) + money);
  state.reputation = Math.max(0, Math.min(100, (state.reputation || 50) + rep));
  state.dirtyPressure = Math.max(0, Number(state.dirtyPressure || 0) + dirty);

  state.forensicNoir.lostFound.splice(idx, 1);
  return { ok: true, money, rep, dirty, logs: [`Lost & Found resolved (${action}): ${item.label}.`] };
}

function appendEvidenceFromTemplate(state, triggerId, night, contextLabel) {
  if (!state.evidenceLocker || typeof state.evidenceLocker !== 'object') {
    state.evidenceLocker = { items: [], mysteryFragmentsFound: 0 };
  }
  if (!Array.isArray(state.evidenceLocker.items)) state.evidenceLocker.items = [];
  const item = buildEvidenceItem(triggerId, night, contextLabel);
  if (!item) return;
  const dup = state.evidenceLocker.items.some(
    (e) =>
      e.templateId === triggerId &&
      e.night === item.night &&
      (!contextLabel || String(e.label || '') === String(item.label || ''))
  );
  if (dup) return;
  state.evidenceLocker.items = [...state.evidenceLocker.items, item].slice(-32);
}

export function tapeBackupEligible(item) {
  if (!item) return false;
  const cat = String(item.category || '');
  return cat === 'mystery' || cat === 'town' || cat === 'owner' || cat === 'dirty' || item.uvConfirmed;
}

export function startTapeBackupForEvidenceItem(state, evidenceItemId) {
  normalizeForensicNoirState(state);
  if (state.forensicNoir.tapeArchive?.turnsLeft > 0) {
    return { ok: false, reason: 'Tape deck already running.' };
  }
  const items = state?.evidenceLocker?.items || [];
  const it = items.find((x) => String(x.id) === String(evidenceItemId));
  if (!it) return { ok: false, reason: 'Evidence not found.' };
  if (it.tapeSecured) return { ok: false, reason: 'Already archived to tape.' };
  if (!tapeBackupEligible(it)) return { ok: false, reason: 'Not worth a fragile tape pass — pick hotter material.' };
  state.forensicNoir.tapeArchive = {
    evidenceItemId: String(evidenceItemId),
    turnsLeft: 2
  };
  pushShiftLog(state, `Tape backup started on "${it.label}" — attention split briefly.`);
  return { ok: true };
}

export function tickForensicTape(state) {
  normalizeForensicNoirState(state);
  const ta = state.forensicNoir.tapeArchive;
  if (!ta || !ta.turnsLeft) return null;
  ta.turnsLeft -= 1;
  if (ta.turnsLeft > 0) {
    return {
      alert: {
        type: 'warning',
        message: 'Tape deck archiving — peripheral monitoring feels thin for a moment.',
        dedupeKey: `tape-archive-${state.night}-${state.shiftElapsedMinutes}`
      }
    };
  }
  const items = state?.evidenceLocker?.items || [];
  const target = items.find((x) => String(x.id) === String(ta.evidenceItemId));
  if (target) {
    target.tapeSecured = true;
    target.desc = `${target.desc || ''} Secured to magnetic tape this shift.`.trim();
  }
  state.forensicNoir.tapeArchive = null;
  pushShiftLog(state, 'Tape backup completed.');
  return {
    alert: {
      type: 'info',
      message: 'Tape backup complete — critical strip is now physically redundant.',
      dedupeKey: `tape-done-${state.night}-${state.shiftElapsedMinutes}`
    }
  };
}

export function isTapeArchiveVulnerable(state) {
  normalizeForensicNoirState(state);
  return Boolean(state.forensicNoir.tapeArchive?.turnsLeft > 0);
}

export function buildLostFoundClaimNightEvent(itemHint = 'property') {
  return {
    id: 'lost-found-claim',
    title: 'Lost Property — Someone Asks',
    severity: 'medium',
    description: `Someone is at the desk insisting about ${itemHint} that never sat in your official log. Their story almost lines up — enough to be dangerous.`,
    options: [
      {
        id: 'claim-verify-log',
        label: 'Show the logged chain',
        preview: 'Reputation-safe if you logged honestly',
        check: { type: 'investigation', baseSuccess: 0.62 }
      },
      {
        id: 'claim-bluff',
        label: 'Bluff — deny possession',
        preview: 'Risky if you sold or stashed',
        check: { type: 'dispatch', baseSuccess: 0.48 }
      },
      {
        id: 'claim-pay-quiet',
        label: 'Pay them off quietly',
        preview: '−$18 • reduces heat',
        check: { type: 'utility', baseSuccess: 0.72 }
      }
    ]
  };
}

export function maybeRollLostFoundClaimEvent(state) {
  normalizeForensicNoirState(state);
  if (state.activeNightEvent) return false;
  const debt = Number(state.forensicNoir.claimDebt || 0);
  if (debt < 1) return false;
  const chance = Math.min(0.14, 0.04 + debt * 0.035);
  if (Math.random() > chance) return false;
  state.forensicNoir.claimDebt = Math.max(0, debt - 1);
  return true;
}

export function resolveLostFoundClaimChoice(state, choiceId) {
  let rep = 0;
  let money = 0;
  const logs = [];
  if (choiceId === 'claim-verify-log') {
    const honest = (state.forensicNoir.shiftLog || []).some((l) => /Logged .* properly/i.test(l));
    if (honest) {
      rep += 1;
      logs.push('You produced the log spine. The claimant deflated.');
    } else {
      rep -= 2;
      logs.push('Your log is thin. They smell the gap.');
    }
  } else if (choiceId === 'claim-bluff') {
    if (Math.random() < 0.45) {
      rep -= 3;
      logs.push('Bluff failed — they had a witness photo from the lot.');
    } else {
      logs.push('Bluff held. They left angry but empty-handed.');
    }
  } else if (choiceId === 'claim-pay-quiet') {
    money = -18;
    logs.push('Small envelope changed hands. The desk buys quiet.');
  }
  state.money = Math.max(0, (state.money || 0) + money);
  state.reputation = Math.max(0, Math.min(100, (state.reputation || 50) + rep));
  return { ok: true, logs, rep, money };
}

export function getForensicRenderModel(state) {
  normalizeForensicNoirState(state);
  return {
    uvDeskLensActive: Boolean(state.forensicNoir.uvDeskLensActive),
    lostFound: (state.forensicNoir.lostFound || []).slice(),
    tapeActive: Boolean(state.forensicNoir.tapeArchive?.turnsLeft > 0),
    tapeTurnsLeft: Number(state.forensicNoir.tapeArchive?.turnsLeft || 0),
    uvConfirmationsThisShift: Number(state.forensicNoir.uvConfirmationsThisShift || 0),
    claimDebt: Number(state.forensicNoir.claimDebt || 0)
  };
}

export function resetForensicForNewNight(state) {
  state.forensicNoir = buildFreshForensicNoir();
}
