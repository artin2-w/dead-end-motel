/**
 * v0.40 — Manager dead drop: one-slot meta persistence across failed runs.
 */

import { normalizeMetaState } from './metaProgression.js';
import { buildEvidenceItem } from './storyThreads.js';
import { isEndlessMode } from './endlessShift.js';

function n(v, d = 0) {
  const x = Number(v);
  return Number.isFinite(x) ? x : d;
}

export function buildDeadDropFailureOffer(metaState, state) {
  const meta = normalizeMetaState(metaState);
  if (meta.managerDeadDrop) {
    return { eligible: false, reason: 'Vent already holds a sealed drop — survive long enough to inherit it.' };
  }
  const night = Math.max(1, n(state?.night, 1));
  const meaningful =
    night > 1 ||
    n(state?.dirtyLedger?.totalDirtyMoney, 0) >= 20 ||
    (Array.isArray(state?.evidenceLocker?.items) && state.evidenceLocker.items.length >= 1);
  if (!meaningful) {
    return { eligible: false, reason: 'Nothing worth stashing yet.' };
  }
  const choices = [
    { id: 'stash-cash', label: 'Stash bent clean bills (~18–28)' },
    { id: 'stash-note', label: 'Stash a bitter warning note' },
    { id: 'stash-evidence', label: 'Stash one locker trace (paper-class)' }
  ];
  return { eligible: true, choices };
}

export function sealManagerDeadDrop(metaState, choiceId, state) {
  let meta = normalizeMetaState(metaState);
  const gate = buildDeadDropFailureOffer(meta, state);
  if (!gate.eligible) return { ok: false, reason: gate.reason || 'Cannot seal.', meta };

  const night = Math.max(1, n(state?.night, 1));
  let payload = {
    kind: 'note',
    cash: 0,
    evidenceTemplateId: null,
    noteLine: 'Next manager: the basement counts receipts the desk never sees.',
    sourceNight: night,
    bagmanTagged: Math.random() < 0.22
  };

  if (choiceId === 'stash-cash') {
    const take = Math.min(28, Math.max(12, Math.floor(n(state.money, 0) * 0.18)));
    if (n(state.money, 0) < take) return { ok: false, reason: 'Not enough clean cash to stash meaningfully.', meta };
    state.money = Math.max(0, n(state.money, 0) - take);
    payload = { ...payload, kind: 'cash', cash: take, noteLine: '' };
  } else if (choiceId === 'stash-note') {
    payload = { ...payload, kind: 'note' };
  } else if (choiceId === 'stash-evidence') {
    const items = Array.isArray(state?.evidenceLocker?.items) ? state.evidenceLocker.items : [];
    if (!items.length) return { ok: false, reason: 'Locker empty — nothing to hide for the next body.', meta };
    const paper =
      items.find((it) => /desk|dirty|staff|corruption/.test(String(it.category || it.type || ''))) || items[items.length - 1];
    const tid = String(paper.templateId || '').replace(/-n\d+-\d+$/, '') || 'torn-ledger-fragment';
    state.evidenceLocker.items = items.filter((it) => it.id !== paper.id);
    payload = {
      ...payload,
      kind: 'evidence',
      evidenceTemplateId: tid,
      noteLine: `Prior desk: ${String(paper.label || 'trace').slice(0, 80)}`
    };
  } else {
    return { ok: false, reason: 'Unknown stash choice.', meta };
  }

  meta = { ...meta, managerDeadDrop: payload };
  if (!state.shiftStats) state.shiftStats = {};
  state.shiftStats.deadDropSealed = n(state.shiftStats.deadDropSealed, 0) + 1;
  state.logs.push('[Dead drop] You folded something into the desk vent — the next shift inherits your silence.');
  return { ok: true, meta };
}

export function tryRevealManagerDeadDrop(metaState, state) {
  let meta = normalizeMetaState(metaState);
  const drop = meta.managerDeadDrop;
  if (!drop || typeof drop !== 'object') return { revealed: false, meta };

  const night = Math.max(1, n(state?.night, 1));
  if (night < 2) return { revealed: false, meta };
  if (n(state?.deadDropRevealRolledNight, -1) === night) return { revealed: false, meta };
  state.deadDropRevealRolledNight = night;

  const baseChance = isEndlessMode(state) ? 0.52 : 0.38;
  if (Math.random() > baseChance) return { revealed: false, meta };

  if (drop.bagmanTagged && Math.random() < 0.35) {
    state.townState = state.townState || {};
    state.townState.townSuspicion = Math.min(10, n(state.townState.townSuspicion, 0) + 1);
    state.logs.push(
      '[Dead drop] The vent was already fingered — bagman handwriting on your inheritance. You recover scraps, not safety.'
    );
    if (!state.shiftStats) state.shiftStats = {};
    state.shiftStats.deadDropCompromised = n(state.shiftStats.deadDropCompromised, 0) + 1;
    meta = { ...meta, managerDeadDrop: null };
    return { revealed: true, compromised: true, meta };
  }

  if (drop.kind === 'cash' && n(drop.cash, 0) > 0) {
    state.money = Math.max(0, n(state.money, 0) + Math.floor(n(drop.cash, 0) * 0.85));
    state.logs.push('[Dead drop] Bent bills in the vent — a last manager bought you one quiet cushion.');
  } else if (drop.kind === 'evidence' && drop.evidenceTemplateId) {
    if (!state.evidenceLocker || typeof state.evidenceLocker !== 'object') state.evidenceLocker = { items: [], mysteryFragmentsFound: 0 };
    if (!Array.isArray(state.evidenceLocker.items)) state.evidenceLocker.items = [];
    const item = buildEvidenceItem(String(drop.evidenceTemplateId), night, 'Vent inheritance');
    if (item) state.evidenceLocker.items = [...state.evidenceLocker.items, item].slice(-32);
    state.logs.push('[Dead drop] Inherited proof — the prior desk wanted you to carry their weight.');
  } else {
    state.logs.push(`[Dead drop] Note only: ${String(drop.noteLine || 'No signature. Just teeth.').slice(0, 160)}`);
    if (Math.random() < 0.4) {
      if (!state.evidenceLocker || typeof state.evidenceLocker !== 'object') state.evidenceLocker = { items: [], mysteryFragmentsFound: 0 };
      if (!Array.isArray(state.evidenceLocker.items)) state.evidenceLocker.items = [];
      const slip = buildEvidenceItem('prior-manager-vent-slip', night, 'Prior self echo');
      if (slip) state.evidenceLocker.items = [...state.evidenceLocker.items, slip].slice(-32);
    }
  }
  if (!state.shiftStats) state.shiftStats = {};
  state.shiftStats.deadDropFound = n(state.shiftStats.deadDropFound, 0) + 1;
  meta = { ...meta, managerDeadDrop: null };
  return { revealed: true, compromised: false, meta };
}
