const THREAD_TEMPLATES = [
  {
    id: 'denied-guest-returns',
    title: 'Denied Guest Returns',
    category: 'front-desk',
    summary: 'A previously denied traveler keeps circling back with changing attitude.',
    zone: 'Lobby',
    baseWeight: 8
  },
  {
    id: 'flagged-guest-mask',
    title: 'Flagged Guest, New Mask',
    category: 'guest-risk',
    summary: 'Someone previously marked as risky returns calmer, but less readable.',
    zone: 'Hallway',
    baseWeight: 7
  },
  {
    id: 'vip-rumor-pressure',
    title: 'VIP Privacy Rumor',
    category: 'reputation',
    summary: 'A privacy request became a rumor channel that keeps resurfacing.',
    zone: 'Lobby',
    baseWeight: 6
  },
  {
    id: 'parking-anomaly-loop',
    title: 'Parking Lot Echo',
    category: 'surveillance',
    summary: 'Outside activity keeps reappearing around the lot perimeter.',
    zone: 'Parking Lot',
    baseWeight: 8
  },
  {
    id: 'staff-trust-friction',
    title: 'Staff Trust Friction',
    category: 'operations',
    summary: 'Repeated harsh calls created visible hesitation in support responses.',
    zone: 'Lobby',
    baseWeight: 6
  },
  {
    id: 'local-troublemakers',
    title: 'Local Troublemakers',
    category: 'outside',
    summary: 'A local group keeps testing motel boundaries night after night.',
    zone: 'Parking Lot',
    baseWeight: 7
  },
  {
    id: 'maintenance-creep',
    title: 'Maintenance Creep',
    category: 'utilities',
    summary: 'Small ignored maintenance issues started linking across zones.',
    zone: 'Laundry',
    baseWeight: 7
  },
  {
    id: 'silent-watcher',
    title: 'Silent Watcher',
    category: 'mystery',
    summary: 'An unnamed observer keeps appearing at the edges of camera coverage.',
    zone: 'Rear Exit',
    baseWeight: 5
  },
  {
    id: 'vip-protection-pressure',
    title: 'VIP Quiet Protection Pressure',
    category: 'vip-pressure',
    summary: 'Quiet-protection demands keep returning with higher consequences each night.',
    zone: 'Lobby',
    baseWeight: 5,
    minNight: 2
  },
  {
    id: 'authority-attention-build',
    title: 'Authority Attention Build-Up',
    category: 'authority',
    summary: 'Routine check-ins are becoming formal and more intrusive.',
    zone: 'Lobby',
    baseWeight: 6,
    minNight: 2
  },
  {
    id: 'ownership-oversight-pressure',
    title: 'Ownership Oversight Pressure',
    category: 'oversight',
    summary: 'Ownership asks sharper questions each morning and leaves less room for improvisation.',
    zone: 'Lobby',
    baseWeight: 6,
    minNight: 2
  },
  {
    id: 'reputation-fracture-loop',
    title: 'Reputation Fracture Loop',
    category: 'reputation',
    summary: 'Guest-facing confidence swings between reassurance and rumor-driven panic.',
    zone: 'Hallway',
    baseWeight: 6,
    minNight: 2
  },
  {
    id: 'utility-wear-spiral',
    title: 'Utility Wear Spiral',
    category: 'utilities',
    summary: 'Small utility faults are now chaining into one another.',
    zone: 'Laundry',
    baseWeight: 6,
    minNight: 2
  },
  {
    id: 'guest-linked-reprisal',
    title: 'Guest-Linked Reprisal',
    category: 'guest-risk',
    summary: 'A prior guest outcome is pulling new arrivals into old conflict lines.',
    zone: 'Parking Lot',
    baseWeight: 5,
    minNight: 3
  },
  {
    id: 'unknown-caller-interference',
    title: 'Unknown Caller Pattern',
    category: 'surveillance',
    summary: 'An unknown caller keeps returning — each message a little more specific than the last.',
    zone: 'Lobby',
    baseWeight: 5,
    minNight: 2
  },
  {
    id: 'faction-sabotage-cycle',
    title: 'Faction Sabotage Cycle',
    category: 'surveillance',
    summary: 'A faction network has been cycling sabotage attempts across camera zones.',
    zone: 'Rear Exit',
    baseWeight: 4,
    minNight: 2
  },
  {
    id: 'camera-trust-break',
    title: 'Camera Trust Break',
    category: 'surveillance',
    summary: 'You can\'t be sure which feeds are clean anymore. Something is being hidden.',
    zone: 'Hallway',
    baseWeight: 4,
    minNight: 3
  }
];

// --- v0.27 Evidence & Mystery ---

const EVIDENCE_CATALOG = [
  { id: 'caller-log-entry',      type: 'caller',    category: 'surveillance', label: 'Logged Call',                desc: 'An unidentified voice made contact. The pattern is on record.' },
  { id: 'hunt-night-win',        type: 'hunt',      category: 'security',     label: 'Hunt Night Win',              desc: 'The caller\'s planted arrival was identified and turned back.' },
  { id: 'hunt-night-loss',       type: 'hunt',      category: 'security',     label: 'Hunt Night Failure',          desc: 'The planted arrival was admitted. The caller now has a room number.' },
  { id: 'sabotage-confirmed',    type: 'camera',    category: 'surveillance', label: 'Camera Sabotage Confirmed',   desc: 'A feed was confirmed compromised. Someone knows the system layout.' },
  { id: 'intercept-success',     type: 'intercept', category: 'surveillance', label: 'Radio Intercept',             desc: 'Partial transmission recovered from scanner band.' },
  { id: 'retaliation-flag',      type: 'desk',      category: 'guest',        label: 'Retaliation Pattern',         desc: 'A guest with prior rejection history appeared again with elevated risk.' },
  { id: 'named-figure-spotted',  type: 'desk',      category: 'faction',      label: 'Named Figure Confirmed',      desc: 'A recurring named figure was identified at the front desk.' },
  { id: 'faction-presence',      type: 'desk',      category: 'faction',      label: 'Faction Contact',             desc: 'A guest with a known network affiliation passed through the desk.' },
  { id: 'room-escalation',       type: 'room',      category: 'security',     label: 'Room Escalation',             desc: 'Room pressure climbed beyond what routine handling could contain.' },
  { id: 'breach-contained',      type: 'breach',    category: 'security',     label: 'Front Desk Breach',           desc: 'An unauthorized person breached the front desk area and was turned back.' },
  { id: 'dos-reboot-log',        type: 'system',    category: 'system',       label: 'System Reboot Event',         desc: 'The desk terminal rebooted unexpectedly. Prior session logs are missing.' },
  { id: 'mystery-object-found',  type: 'mystery',   category: 'mystery',      label: 'Previous Manager: Object',    desc: 'A personal item in Room 7 doesn\'t match any current or recent guest.' },
  { id: 'mystery-shift-log',     type: 'mystery',   category: 'mystery',      label: 'Previous Manager: Shift Log', desc: 'A partial shift log found inside the power board housing — not yours.' },
  { id: 'mystery-key-tag',       type: 'mystery',   category: 'mystery',      label: 'Previous Manager: Key Tag',   desc: 'A key tag printed with room "0". There is no Room 0 in this motel.' },
  { id: 'mystery-photo',         type: 'mystery',   category: 'mystery',      label: 'Previous Manager: Photo',     desc: 'A photo of the parking lot at night, taped under the desk. Timestamp: two months ago.' },
  { id: 'mystery-note',          type: 'mystery',   category: 'mystery',      label: 'Previous Manager: Note',      desc: '"Don\'t trust the scanner after midnight. It routes to a third address since April."', uvReactive: true, provenanceHint: 'mystery' },
  { id: 'mystery-badge',         type: 'mystery',   category: 'mystery',      label: 'Previous Manager: Badge',     desc: 'A faded employee badge. The name is scratched off. The photo shows this exact desk.' },
  // v0.28 dirty business evidence
  { id: 'stained-cash-band',       type: 'dirty',   category: 'dirty',    label: 'Stained Cash Band',           desc: 'A rubber-banded roll of bills with a brown stain. Not from the till.', uvReactive: true, provenanceHint: 'dirty' },
  { id: 'off-book-register-note',  type: 'dirty',   category: 'dirty',    label: 'Off-Book Register Note',      desc: 'A handwritten note with room number and initials — never entered into the system.' },
  { id: 'dead-drop-token',         type: 'dirty',   category: 'dirty',    label: 'Vending Drop Token',          desc: 'A coin-shaped token in the vending machine return slot. Not locally manufactured.' },
  { id: 'hunter-vehicle-note',     type: 'dirty',   category: 'security', label: 'Hunter Vehicle Note',         desc: 'Partial plate and description of the vehicle that stopped at the lot asking questions.' },
  { id: 'burner-instruction-slip', type: 'dirty',   category: 'dirty',    label: 'Burner Instruction Slip',     desc: 'A small folded paper. Dead drop instructions for the machine slot. Already used.' },
  { id: 'torn-ledger-fragment',    type: 'dirty',   category: 'dirty',    label: 'Torn Ledger Fragment',        desc: 'Part of an off-book log. More than one hand wrote on it.' },
  { id: 'hidden-guest-entry',      type: 'dirty',   category: 'dirty',    label: 'Hidden Guest Entry',          desc: 'An unlogged stay. Someone was here and the system has no record.' },
  // v0.29 staff paranoia evidence
  { id: 'staff-falsified-report',    type: 'staff', category: 'staff', label: 'Falsified Staff Report',    desc: 'A room marked clear by staff showed continued activity on camera within minutes of the log entry.' },
  { id: 'altered-repair-slip',       type: 'staff', category: 'staff', label: 'Altered Repair Slip',       desc: 'A maintenance ticket shows a cost higher than the work logged. The initials don\'t match shift records.' },
  { id: 'payroll-discrepancy',       type: 'staff', category: 'staff', label: 'Payroll Discrepancy',       desc: 'A staff ledger entry doesn\'t align with the hours logged. Small, deliberate.' },
  { id: 'overwritten-dispatch-note', type: 'staff', category: 'staff', label: 'Overwritten Dispatch Note', desc: 'A response log entry was crossed out and rewritten after it was filed. The original text shows a different room number.' },
  { id: 'staff-loyalty-record',      type: 'staff', category: 'staff', label: 'Staff Loyalty Record',      desc: 'Someone kept a private written note about what was said at the desk on a specific night. Not yours.' },
  { id: 'inside-job-note',           type: 'staff', category: 'staff', label: 'Inside Job Note',           desc: 'A folded slip found behind the desk board. A handwritten list of rooms with current guest names.' },
  // v0.30 contamination / Room 9 / owner-protected space
  { id: 'owner-access-slip',        type: 'contamination', category: 'owner', label: 'Owner Access Slip',             desc: 'A keycard authorization record. One room number appears outside the standard guest rotation. The access was logged at 2:40 AM.' },
  { id: 'sealed-housekeeping-memo', type: 'contamination', category: 'owner', label: 'Sealed Housekeeping Memo',      desc: 'An internal notice, still sealed. The room number is crossed out. "Do not service. Owner authorization only." No date.', uvReactive: true, provenanceHint: 'room9' },
  { id: 'stained-maintenance-note', type: 'contamination', category: 'owner', label: 'Stained Maintenance Note',      desc: 'Work order for a plumbing issue in a rear room. The room number in the header was scratched out and replaced. The stain on the corner is not coffee.' },
  { id: 'unsigned-expense-form',    type: 'contamination', category: 'owner', label: 'Unsigned Expense Form',         desc: 'A requisition for "specialized cleaning materials." No signatory. The room number field is blank but the amount is $340.' },
  { id: 'old-room-ledger',          type: 'contamination', category: 'owner', label: 'Old Room Ledger Fragment',      desc: 'A page from a prior-season log. One room entry spans 94 consecutive nights — under the same reservation name. No checkout was ever recorded.' },
  { id: 'do-not-enter-copy',        type: 'contamination', category: 'owner', label: '"Do Not Enter" Notice Copy',    desc: 'A duplicate of an internal management notice. Handwritten at the bottom: "Previous manager was told the same thing. He looked anyway."' },
  // v0.31 town corruption / bagman cop
  { id: 'police-payoff-receipt',  type: 'corruption', category: 'town', label: 'Police Payoff Receipt',    desc: 'A carbon-copy receipt folded into a desk drawer. A dollar amount. No signature, but the badge number in the memo field is real.' },
  { id: 'false-police-log',       type: 'corruption', category: 'town', label: 'False Police Log',         desc: 'A dispatch record that skips a 40-minute window during a night when you know something happened. The log shows a patrol car on the opposite end of town.', uvReactive: true, provenanceHint: 'town' },
  { id: 'informant-record',       type: 'corruption', category: 'town', label: 'Informant Record',         desc: 'A typed list of names, amounts, and dates. The motel appears twice. Someone has been reporting activity here for longer than you\'ve been working nights.' },
  { id: 'bagman-visit-note',      type: 'corruption', category: 'town', label: 'Bagman Visit Note',        desc: 'A single index card in the back of the desk. Two words: a name and a room number. Circled. Dated last Thursday.' },
  {
    id: 'operator-backroom-splinter',
    type: 'surveillance',
    category: 'surveillance',
    label: 'Backroom Frame Splinter',
    desc: 'Fresh wood fiber on the operator quarters door — pressure mark consistent with someone bracing from inside while you were forward.',
    uvReactive: true,
    provenanceHint: 'desk'
  },
  {
    id: 'lost-found-object',
    type: 'object',
    category: 'mystery',
    label: 'Lost & Found Chain Object',
    desc: 'An object moved from the informal bin into the evidence spine. Still smells like lobby carpet and indecision.',
    uvReactive: true,
    provenanceHint: 'desk'
  }
];

const MYSTERY_FRAGMENTS = [
  { index: 0, id: 'mystery-object-found',  nightMin: 1, triggerChance: 0.55 },
  { index: 1, id: 'mystery-shift-log',     nightMin: 2, triggerChance: 0.50 },
  { index: 2, id: 'mystery-key-tag',       nightMin: 2, triggerChance: 0.45 },
  { index: 3, id: 'mystery-photo',         nightMin: 3, triggerChance: 0.45 },
  { index: 4, id: 'mystery-note',          nightMin: 4, triggerChance: 0.42 },
  { index: 5, id: 'mystery-badge',         nightMin: 5, triggerChance: 0.40 }
];

const NAMED_RECURRING_CATALOG = [
  {
    id: 'the-adjuster',
    label: 'The Adjuster',
    archetypeKeys: ['contractor', 'service-worker', 'maintenance', 'inspector'],
    factionId: 'service-ring',
    recognition: 'Carries a clipboard. Too calm about delays. Never quite matches their stated job.',
    escalationNote: 'Each return feels like an inspection — but for whom?'
  },
  {
    id: 'caller-seven',
    label: 'Caller 7',
    archetypeKeys: ['drifter', 'traveler', 'observer', 'loner', 'quiet'],
    factionId: 'watcher-circle',
    recognition: 'Uses a new alias each time. The handwriting is the same. The eyes aren\'t.',
    escalationNote: 'Third return — they know your shift pattern by now.'
  },
  {
    id: 'r-vance',
    label: 'R. Vance',
    archetypeKeys: ['family', 'family-lead', 'cover', 'domestic'],
    factionId: 'false-family-route',
    recognition: 'Always part of a pair. The family story changes. The luggage tags don\'t match.',
    escalationNote: 'The follow hasn\'t shown yet this time. That\'s new.'
  },
  {
    id: 'night-surveyor',
    label: 'The Night Surveyor',
    archetypeKeys: ['observer', 'watcher', 'quiet-traveler', 'loner'],
    factionId: 'watcher-circle',
    recognition: 'Never causes trouble. You catch them in places they shouldn\'t be.',
    escalationNote: 'Third appearance. They\'re not here for a room.'
  },
  {
    id: 'county-runner',
    label: 'The County Runner',
    archetypeKeys: ['drifter', 'vagrant', 'transient', 'local'],
    factionId: 'county-drifters',
    recognition: 'Knows the lot layout better than guests should. Check-in pattern is too fast.',
    escalationNote: 'Fourth appearance at this specific motel. That isn\'t coincidence.'
  }
];

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function pickWeighted(list, weightFn) {
  const weighted = list
    .map((entry) => ({ entry, weight: Math.max(0, Number(weightFn(entry) || 0)) }))
    .filter((entry) => entry.weight > 0);
  const total = weighted.reduce((sum, entry) => sum + entry.weight, 0);
  if (!total) return null;
  let roll = Math.random() * total;
  for (let i = 0; i < weighted.length; i += 1) {
    roll -= weighted[i].weight;
    if (roll <= 0) return weighted[i].entry;
  }
  return weighted[weighted.length - 1]?.entry || null;
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function ensureHistoryRecord(history, guestName) {
  if (!guestName) return null;
  if (!history[guestName]) {
    history[guestName] = {
      name: guestName,
      encounters: 0,
      returns: 0,
      lastNight: null,
      lastOutcome: null,
      lastRiskLevel: null,
      lastMood: null,
      wasHarshlyRejected: false,
      wasHandledCleanly: false,
      linkedThreads: [],
      lastRoomId: null,
      lastArchetype: null,
      roomMemoryWeight: 0,
      returnModifier: 'neutral',
      lastFactionId: null,
      lastFactionLabel: null,
      lastFactionMark: null,
      lastForgeryState: null,
      lastLinkedArrivalKind: null,
      storyFlags: [],
      lastDeskTreatment: null
    };
  }
  return history[guestName];
}

function checkForNamedPresence(guest, history) {
  const archetypeKey = String(guest?.archetypeKey || guest?.archetypeLabel || '').toLowerCase();
  const factionId = String(guest?.factionProfile?.id || '').toLowerCase();
  const record = history[guest?.name] || null;
  const encounters = Number(record?.encounters || 0);
  if (encounters < 2) return null;
  for (const entry of NAMED_RECURRING_CATALOG) {
    const archetypeMatch = entry.archetypeKeys.some((k) => archetypeKey.includes(k));
    const factionMatch = entry.factionId && factionId === entry.factionId;
    const strongMatch = archetypeMatch && factionMatch;
    const weakMatch = (factionMatch && encounters >= 3) || (archetypeMatch && encounters >= 4);
    if (strongMatch || weakMatch) {
      return {
        id: entry.id,
        label: entry.label,
        recognition: entry.recognition,
        escalationNote: encounters >= 3 ? entry.escalationNote : null
      };
    }
  }
  return null;
}

function buildThreadId(templateId, night) {
  return `${templateId}-n${night}-${Math.floor(Math.random() * 10000)}`;
}

function pushSeenHistory(state, key, value, limit = 80) {
  if (!state?.contentHistory || !value) return;
  const current = Array.isArray(state.contentHistory[key]) ? state.contentHistory[key] : [];
  if (current.includes(value)) {
    state.contentHistory[key] = current.slice(-limit);
    return;
  }
  state.contentHistory[key] = [...current, value].slice(-limit);
}

function normalizeThread(thread = {}) {
  return {
    id: thread.id || `thread-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    templateId: thread.templateId || thread.id || 'custom-thread',
    title: thread.title || 'Unresolved Pattern',
    category: thread.category || 'general',
    stage: Math.max(1, Number(thread.stage || 1)),
    heat: clamp(Number(thread.heat || 1), 0, 10),
    status: thread.status || 'active',
    summary: thread.summary || '',
    nightIntroduced: Math.max(1, Number(thread.nightIntroduced || 1)),
    lastUpdatedNight: Math.max(1, Number(thread.lastUpdatedNight || thread.nightIntroduced || 1)),
    linkedGuestName: thread.linkedGuestName || null,
    linkedArchetype: thread.linkedArchetype || null,
    linkedZone: thread.linkedZone || null,
    futureEffects: thread.futureEffects && typeof thread.futureEffects === 'object' ? { ...thread.futureEffects } : {}
  };
}

function buildReturningGuestVariant(baseGuest, history, activeStoryBeat) {
  const variant = { ...baseGuest };
  variant.name = history.name;
  variant.isReturningGuest = true;
  variant.isKnownGuest = true;

  const priorLine =
    history.wasHarshlyRejected
      ? 'Prior history: previously rejected under tension; demeanor appears more defensive tonight.'
      : history.wasHandledCleanly
        ? 'Prior history: previous handling stayed calm; guest appears more cooperative tonight.'
        : 'Prior history: guest has appeared in a previous shift.';

  let mood = variant.mood;
  let riskLevel = variant.riskLevel;
  let riskNote = variant.riskNote || '';

  if (history.wasHarshlyRejected) {
    mood = Math.random() < 0.7 ? 'Agitated' : 'Nervous';
    if (riskLevel === 'Low') riskLevel = 'Medium';
    riskNote = `${riskNote} Returning agitated after earlier rejection.`.trim();
  } else if (history.wasHandledCleanly) {
    mood = Math.random() < 0.6 ? 'Calm' : mood;
    if (riskLevel === 'High') riskLevel = 'Medium';
    riskNote = `${riskNote} Returning calmer after prior clean handling.`.trim();
  } else if (history.lastOutcome === 'flagged') {
    mood = Math.random() < 0.5 ? 'Silent' : mood;
    riskNote = `${riskNote} Previous flag history suggests deceptive compliance.`.trim();
  }

  variant.mood = mood;
  variant.riskLevel = riskLevel;
  variant.risk = riskLevel;
  variant.riskNote = riskNote;
  variant.priorHistoryLine = priorLine;
  variant.returnModifier = history.returnModifier || 'neutral';
  variant.returningGuestNote =
    history.returnModifier === 'hostile-return'
      ? 'Returning after eviction: expects conflict and may escalate faster.'
      : history.returnModifier === 'resentful'
        ? 'Returning after rejection: tone is defensive and old friction is still active.'
        : history.returnModifier === 'knows-you-watched'
          ? 'Returning after a prior flag: calmer on the surface, less trustworthy underneath.'
          : history.returnModifier === 'recognizes-you'
            ? 'Returning guest remembers prior handling and reacts to it.'
            : 'Returning guest with prior motel history.';
  variant.assignedRoomMemoryId = history.lastRoomId || null;
  variant.archetypeMemoryLine = history.lastArchetype ? `Prior pattern on file: ${history.lastArchetype}.` : '';
  variant.policyHistoryPressure = history.wasHarshlyRejected ? 'Management expects controlled handling.' : null;
  variant.extraEncounterNote = history.wasHarshlyRejected
    ? 'Desk tone may escalate quickly if rejected again.'
    : 'Known guest: de-escalation may produce cleaner outcomes.';
  variant.factionMemoryLine = history.lastFactionLabel
    ? `Prior network sign: ${history.lastFactionLabel}${history.lastFactionMark ? ` (${history.lastFactionMark})` : ''}.`
    : '';
  variant.documentMemoryLine = history.lastForgeryState
    ? `Document history: ${history.lastForgeryState}.`
    : '';
  variant.linkedArrivalMemoryLine = history.lastLinkedArrivalKind
    ? `Previous linked-arrival pattern: ${history.lastLinkedArrivalKind}.`
    : '';

  if (activeStoryBeat?.title) {
    variant.threadMemoryLine = `Thread clue: ${activeStoryBeat.title} remains unresolved.`;
  }

  if (Array.isArray(history.storyFlags) && history.storyFlags.includes('turned-away')) {
    variant.returningGuestNote = `${variant.returningGuestNote} Prior rejection still colors this return.`;
  }
  if (Array.isArray(history.storyFlags) && history.storyFlags.includes('was-housed')) {
    variant.returningGuestNote = `${variant.returningGuestNote} Prior housing bought familiarity, which may be real trust or practiced manipulation.`;
  }
  if (Array.isArray(history.storyFlags) && history.storyFlags.includes('desk-watch')) {
    variant.returningGuestNote = `${variant.returningGuestNote} The guest remembers being watched and may now over-correct their behavior.`;
  }
  if (history.lastRoomId) {
    variant.extraEncounterNote = `${variant.extraEncounterNote} Prior room trouble is still attached to their file.`;
  }

  variant.threadMemoryLine = [
    variant.threadMemoryLine,
    variant.factionMemoryLine,
    variant.documentMemoryLine,
    variant.linkedArrivalMemoryLine
  ].filter(Boolean).join(' ');

  // --- v0.26 extensions ---

  // Retaliation risk: guest rejected harshly 2+ times or evicted and returning
  const isEvictedReturn = history.returnModifier === 'hostile-return';
  const isMultiReject = history.wasHarshlyRejected && Number(history.encounters || 0) >= 2;
  variant.retaliationRisk = isEvictedReturn || isMultiReject;
  if (variant.retaliationRisk) {
    variant.retaliationNote = isEvictedReturn
      ? 'Eviction history: previous forced removal. Increased escalation risk on any friction.'
      : 'Multiple rejection history: old resentment is still active and may trigger faster.';
    if (riskLevel !== 'High') {
      variant.riskLevel = 'High';
      variant.risk = 'High';
      variant.riskNote = `${riskNote} Retaliation risk elevated from prior handling history.`.trim();
    }
  }

  // Trust score: cleanly handled multiple times → deception signal softened
  const cleanCount = (Array.isArray(history.storyFlags) ? history.storyFlags.filter((f) => f === 'was-housed').length : 0) +
    (history.wasHandledCleanly ? 1 : 0);
  variant.trustScore = clamp(cleanCount, 0, 3);
  if (variant.trustScore >= 2) {
    variant.trustNote = 'Multiple clean interactions: pattern suggests genuine low-risk profile.';
    const currentDec = Number(variant.deceptionSignal || 0);
    if (currentDec > 0) variant.deceptionSignal = Math.max(0, currentDec - 1);
  }

  // Watched/flagged → deception goes up
  if (history.returnModifier === 'knows-you-watched') {
    const currentDec = Number(variant.deceptionSignal || 0);
    variant.deceptionSignal = Math.min(3, currentDec + 1);
    variant.deceptionNote = 'Prior flag history: surface behavior may be more controlled than usual.';
  }

  // Named presence detection
  variant.namedPresence = checkForNamedPresence(variant, { [variant.name]: history });

  // Group memory: if they had a linked arrival last time and are back
  if (history.lastLinkedArrivalKind) {
    variant.groupMemoryLine = `Prior group pattern: ${history.lastLinkedArrivalKind}. Watch for a second arrival tonight.`;
  }

  return variant;
}

export function normalizeStoryThreadState(state) {
  const currentThreads = safeArray(state?.storyThreads).map((thread) => normalizeThread(thread));
  const history = state?.returningGuestHistory && typeof state.returningGuestHistory === 'object'
    ? { ...state.returningGuestHistory }
    : {};
  return {
    ...state,
    storyThreads: currentThreads,
    activeStoryBeat: state?.activeStoryBeat || null,
    returningGuestHistory: history,
    storyThreadMeta: {
      recentTemplateIds: safeArray(state?.storyThreadMeta?.recentTemplateIds).slice(-4),
      lastBeatNight: Number(state?.storyThreadMeta?.lastBeatNight || 0)
    },
    storyMemory: {
      lastNightSummary: safeArray(state?.storyMemory?.lastNightSummary).slice(-5)
    }
  };
}

export function markThreadOutcome(state, payload = {}) {
  if (!state) return;
  const guestName = payload.guestName || payload?.guest?.name;
  const action = payload.action || 'observed';
  const night = Math.max(1, Number(payload.night || state.night || 1));
  const riskLevel = payload.riskLevel || payload?.guest?.riskLevel || null;
  const mood = payload.mood || payload?.guest?.mood || null;

  const record = ensureHistoryRecord(state.returningGuestHistory || (state.returningGuestHistory = {}), guestName);
  if (record) {
    record.encounters = Math.max(0, Number(record.encounters || 0)) + 1;
    record.lastNight = night;
    record.lastRiskLevel = riskLevel;
    record.lastMood = mood;
    record.lastRoomId = payload?.guest?.assignedRoomId || payload?.linkedRoomId || payload?.roomId || record.lastRoomId || null;
    record.lastArchetype = payload?.guest?.archetypeKey || payload?.guest?.archetypeLabel || record.lastArchetype || null;
    record.lastFactionId = payload?.guest?.factionProfile?.id || record.lastFactionId || null;
    record.lastFactionLabel = payload?.guest?.factionProfile?.label || record.lastFactionLabel || null;
    record.lastFactionMark = payload?.guest?.factionProfile?.visibleMark || payload?.guest?.factionProfile?.hiddenMark || record.lastFactionMark || null;
    record.lastForgeryState = payload?.guest?.forgeryProfile?.isForged
      ? payload?.guest?.uvProfile?.suspicious || payload?.guest?.idProfile?.validity === 'Questionable'
        ? 'prior desk checks exposed suspicious document tampering'
        : 'prior file carries unresolved forgery risk'
      : record.lastForgeryState || null;
    record.lastLinkedArrivalKind = payload?.guest?.linkedArrival?.kind || record.lastLinkedArrivalKind || null;
    record.lastDeskTreatment = action;
    record.storyFlags = Array.isArray(record.storyFlags) ? record.storyFlags : [];

    if (action === 'reject') {
      record.lastOutcome = 'rejected';
      record.wasHarshlyRejected = riskLevel !== 'High';
      record.wasHandledCleanly = false;
      record.returnModifier = record.wasHarshlyRejected ? 'resentful' : 'deflecting';
      if (!record.storyFlags.includes('turned-away')) record.storyFlags.push('turned-away');
    } else if (action === 'checkin') {
      record.lastOutcome = 'checkedIn';
      record.wasHandledCleanly = true;
      record.wasHarshlyRejected = false;
      record.returnModifier = 'recognizes-you';
      if (!record.storyFlags.includes('was-housed')) record.storyFlags.push('was-housed');
    } else if (action === 'flag') {
      record.lastOutcome = 'flagged';
      record.returnModifier = 'knows-you-watched';
      if (!record.storyFlags.includes('desk-watch')) record.storyFlags.push('desk-watch');
    } else if (action === 'evicted') {
      record.lastOutcome = 'evicted';
      record.wasHandledCleanly = false;
      record.returnModifier = 'hostile-return';
      if (!record.storyFlags.includes('forced-out')) record.storyFlags.push('forced-out');
    }
    if (payload?.roomId || payload?.guest?.assignedRoomId) {
      if (!record.storyFlags.includes('room-trouble')) record.storyFlags.push('room-trouble');
    }
    record.storyFlags = record.storyFlags.slice(-6);
  }

  // v0.26 social reputation tracking
  if (!state.socialReputation) {
    state.socialReputation = { harshHandlings: 0, cleanHandlings: 0, evictions: 0 };
  }
  if (action === 'reject' && record?.wasHarshlyRejected) state.socialReputation.harshHandlings += 1;
  if (action === 'checkin') state.socialReputation.cleanHandlings += 1;
  if (action === 'evicted') state.socialReputation.evictions += 1;

  const linked = safeArray(state.storyThreads).find(
    (thread) => thread.status !== 'contained' && (thread.linkedGuestName === guestName || thread.linkedZone === payload.linkedZone)
  );
  if (!linked) return;

  if (action === 'checkin' || action === 'flag') {
    linked.heat = clamp(linked.heat - 1, 0, 10);
    if (linked.heat <= 1) linked.status = 'contained';
  } else if (action === 'reject' || action === 'evicted') {
    linked.heat = clamp(linked.heat + 1.2, 0, 10);
    linked.stage = clamp(linked.stage + 1, 1, 4);
    linked.status = linked.stage >= 4 ? 'escalating' : linked.status;
  }
  linked.lastUpdatedNight = night;
}

export function maybeGenerateNightStoryBeat(state, night = 1) {
  if (!state) return null;
  const currentNight = Math.max(1, Number(night || 1));
  const meta = state.storyThreadMeta || (state.storyThreadMeta = { recentTemplateIds: [], lastBeatNight: 0 });
  const existingActive = safeArray(state.storyThreads).filter((thread) => thread.status !== 'contained');

  const chance = clamp(0.14 + existingActive.length * 0.05 + Math.max(0, currentNight - 1) * 0.02, 0.14, 0.42);
  if (Math.random() > chance) {
    state.activeStoryBeat = null;
    return null;
  }

  const pickExisting = existingActive.length > 0 && Math.random() < 0.56;
  if (pickExisting) {
    const picked = pickWeighted(existingActive, (thread) => {
      let weight = Number(thread.heat || 1) + Number(thread.stage || 1);
      if (thread.lastUpdatedNight === currentNight - 1) weight *= 0.75;
      return weight;
    });
    if (picked) {
      picked.lastUpdatedNight = currentNight;
      state.activeStoryBeat = {
        id: picked.id,
        threadId: picked.id,
        title: picked.title,
        category: picked.category,
        stage: picked.stage,
        note: picked.summary,
        zone: picked.linkedZone || null
      };
      meta.lastBeatNight = currentNight;
      return state.activeStoryBeat;
    }
  }

  const recent = safeArray(meta.recentTemplateIds);
  const seenFamilies = safeArray(state?.contentHistory?.seenThreadFamilies);
  const template = pickWeighted(THREAD_TEMPLATES, (entry) => {
    if (entry.minNight && currentNight < Number(entry.minNight || 1)) return 0;
    if (entry.maxNight && currentNight > Number(entry.maxNight || 99)) return 0;
    let weight = Number(entry.baseWeight || 1);
    if (recent.includes(entry.id)) weight *= 0.42;
    if (!seenFamilies.includes(entry.id)) {
      weight += 1.3;
    } else {
      weight *= 0.86;
    }
    if (entry.category === 'authority' && Number(state?.factions?.authorities || 0) >= 3) {
      weight += 1.1;
    }
    if (entry.category === 'oversight' && Number(state?.factions?.ownership || 0) <= -3) {
      weight += 1.15;
    }
    if (entry.category === 'vip-pressure' && Number(state?.doctrine?.tendencies?.secrecy || 0) >= 4) {
      weight += 1.05;
    }
    return weight;
  });
  if (!template) return null;

  const newThread = normalizeThread({
    id: buildThreadId(template.id, currentNight),
    templateId: template.id,
    title: template.title,
    category: template.category,
    stage: 1,
    heat: 2,
    status: 'active',
    summary: template.summary,
    nightIntroduced: currentNight,
    lastUpdatedNight: currentNight,
    linkedZone: template.zone,
    futureEffects: {}
  });

  state.storyThreads = [...safeArray(state.storyThreads), newThread];
  state.activeStoryBeat = {
    id: newThread.id,
    threadId: newThread.id,
    title: newThread.title,
    category: newThread.category,
    stage: newThread.stage,
    note: newThread.summary,
    zone: newThread.linkedZone
  };
  meta.recentTemplateIds = [...recent, template.id].slice(-4);
  meta.lastBeatNight = currentNight;
  pushSeenHistory(state, 'seenThreadFamilies', template.id);
  return state.activeStoryBeat;
}

export function advanceStoryThreadsAfterNight(state, night = 1) {
  const lines = [];
  let escalated = 0;
  let stabilized = 0;
  if (!state) return { lines };
  const stats = state.shiftStats || {};
  const pressure = Number(stats.sceneFailed || 0) + Number(stats.nightEventsMissed || 0) + Number(stats.policyBroken || 0);
  const containment = Number(stats.sceneResolved || 0) + Number(stats.cleanResponses || 0) + Number(stats.policyFollowed || 0);

  state.storyThreads = safeArray(state.storyThreads).map((rawThread) => {
    const thread = normalizeThread(rawThread);
    if (thread.status === 'contained') return thread;

    if (pressure > containment) {
      thread.heat = clamp(thread.heat + 0.8, 0, 10);
      if (thread.heat >= 4.5 && Math.random() < 0.5) {
        thread.stage = clamp(thread.stage + 1, 1, 4);
        escalated += 1;
      }
      if (thread.stage >= 4) thread.status = 'escalating';
      lines.push(`Thread advanced: ${thread.title} reached stage ${thread.stage}.`);
    } else {
      thread.heat = clamp(thread.heat - 0.7, 0, 10);
      if (thread.heat <= 1.2 && thread.stage > 1 && Math.random() < 0.45) {
        thread.stage = clamp(thread.stage - 1, 1, 4);
        lines.push(`Thread stabilized: ${thread.title} cooled to stage ${thread.stage}.`);
        stabilized += 1;
      }
      if (thread.heat <= 0.8) {
        thread.status = 'contained';
        lines.push(`Thread contained: ${thread.title}.`);
        stabilized += 1;
      }
    }

    thread.lastUpdatedNight = Math.max(1, Number(night || state.night || 1));
    return thread;
  });

  state.storyMemory = state.storyMemory || { lastNightSummary: [] };
  state.storyMemory.lastNightSummary = lines.slice(0, 3);
  return { lines: lines.slice(0, 3), escalated, stabilized };
}

export function maybeGenerateReturningGuestVariant(baseGuest, state, night = 1) {
  if (!baseGuest || !state) return baseGuest;
  const historyEntries = Object.values(state.returningGuestHistory || {}).filter((entry) => {
    const lastNight = Number(entry?.lastNight || 0);
    return entry?.name && lastNight > 0 && lastNight < Number(night || 1);
  });

  const returnChance = clamp(0.12 + historyEntries.length * 0.05, 0.12, 0.4);
  if (!historyEntries.length || Math.random() > returnChance) {
    if (state.activeStoryBeat && Math.random() < 0.22) {
      return {
        ...baseGuest,
        threadMemoryLine: `Thread clue: ${state.activeStoryBeat.title} (${state.activeStoryBeat.category}).`
      };
    }
    return baseGuest;
  }

  const picked = pickWeighted(historyEntries, (entry) => {
    let weight = 1 + Math.min(3, Number(entry.encounters || 0) * 0.45);
    if (entry.wasHarshlyRejected || entry.lastOutcome === 'evicted') weight += 1.4;
    if (entry.wasHandledCleanly) weight += 0.5;
    return weight;
  });
  if (!picked) return baseGuest;

  picked.returns = Math.max(0, Number(picked.returns || 0)) + 1;
  picked.lastNight = Math.max(1, Number(night || 1));
  return buildReturningGuestVariant(baseGuest, picked, state.activeStoryBeat);
}

export function buildSocialMemoryNote(state) {
  const rep = state?.socialReputation || {};
  const harsh = Number(rep.harshHandlings || 0);
  const clean = Number(rep.cleanHandlings || 0);
  const evictions = Number(rep.evictions || 0);
  const total = harsh + clean;
  if (!total) return null;
  const harshRatio = total > 0 ? harsh / total : 0;
  if (evictions >= 2) {
    return { tone: 'harsh', label: 'Tense', note: `${evictions} evictions on record — guests arrive with prior warnings. Expect faster escalation.` };
  }
  if (harshRatio >= 0.6) {
    return { tone: 'harsh', label: 'Harsh', note: `High rejection rate (${harsh} harsh). Arrivals are reading you as difficult.` };
  }
  if (harshRatio <= 0.25 && clean >= 3) {
    return { tone: 'fair', label: 'Fair', note: `Clean record (${clean} handled well). Guests arrive with reduced tension.` };
  }
  return { tone: 'balanced', label: 'Balanced', note: `Mixed handling history (${clean} clean, ${harsh} harsh). Reputation is neutral.` };
}

// --- v0.27 Evidence locker exports ---

export function buildEvidenceItem(triggerId, night = 1, contextLabel = '') {
  const template = EVIDENCE_CATALOG.find((e) => e.id === triggerId);
  if (!template) return null;
  return {
    id: `${triggerId}-n${night}-${Math.floor(Math.random() * 9999)}`,
    templateId: triggerId,
    type: template.type,
    category: template.category,
    label: contextLabel ? `${template.label}: ${contextLabel}` : template.label,
    desc: template.desc,
    night,
    uvReactive: Boolean(template.uvReactive),
    provenanceHint: template.provenanceHint || null,
    uvConfirmed: false,
    tapeSecured: false
  };
}

export function checkMysteryFragmentUnlock(state) {
  const night = Math.max(1, Number(state?.night || 1));
  const locker = state?.evidenceLocker || {};
  const found = Number(locker.mysteryFragmentsFound || 0);
  const next = MYSTERY_FRAGMENTS[found];
  if (!next) return null;
  if (night < next.nightMin) return null;
  if (Math.random() > next.triggerChance) return null;
  return EVIDENCE_CATALOG.find((e) => e.id === next.id) || null;
}

export function buildEvidenceLockerSummary(state) {
  const locker = state?.evidenceLocker || {};
  const items = Array.isArray(locker.items) ? locker.items : [];
  return {
    items,
    count: items.length,
    mysteryFragmentsFound: Number(locker.mysteryFragmentsFound || 0),
    mysteryComplete: Number(locker.mysteryFragmentsFound || 0) >= MYSTERY_FRAGMENTS.length,
    byCategoryCount: items.reduce((acc, item) => {
      const cat = item.category || 'other';
      acc[cat] = (acc[cat] || 0) + 1;
      return acc;
    }, {})
  };
}

// --- v0.28 Dirty systems exports ---

export function buildDirtyLedgerSummary(state) {
  const ledger = state?.dirtyLedger || {};
  const shadowRep = Number(state?.shadowRep || 0);
  const total = Number(ledger.totalDirtyMoney || 0);
  const offBook = Number(ledger.offBookStays || 0);
  const drops = Number(ledger.deadDrops || 0);
  const favors = Number(ledger.favorsAccepted || 0);
  const actions = offBook + drops + favors + (Number(ledger.hiddenPayments || 0));
  return {
    hasDirty: actions > 0 || total > 0,
    totalDirtyMoney: total,
    offBookStays: offBook,
    deadDrops: drops,
    favorsAccepted: favors,
    hiddenPayments: Number(ledger.hiddenPayments || 0),
    actions,
    shadowRep
  };
}

export function buildShadowRepNote(state) {
  const rep = Number(state?.shadowRep || 0);
  if (rep === 0) return null;
  if (rep >= 5) return { level: 'high', polarity: 'positive', label: 'Network Trusted', note: 'Dangerous networks regard you as a reliable contact. Certain guests arrive more cooperative.' };
  if (rep >= 2) return { level: 'low', polarity: 'positive', label: 'Known to the Network', note: 'Off-book activity has earned quiet recognition. A few extra doors stay open.' };
  if (rep <= -5) return { level: 'high', polarity: 'negative', label: 'Marked', note: 'You betrayed the network at least once. Expect pressure, not cooperation. Hunt nights are targeting you.' };
  if (rep <= -2) return { level: 'low', polarity: 'negative', label: 'Mistrusted', note: 'Prior betrayal is on record. Dangerous contacts are less forgiving and more aggressive.' };
  return null;
}

// --- v0.29 Staff Intel export ---

export function buildStaffIntelSummary(state) {
  const intel = state?.staffIntel;
  const roster = Array.isArray(state?.dayShift?.staff?.roster) ? state.dayShift.staff.roster : [];
  const active = roster.filter((m) => m.active);
  const avgMorale = active.length
    ? active.reduce((s, m) => s + Number(m.morale || 0.56), 0) / active.length
    : 0.56;
  const avgFear = active.length
    ? active.reduce((s, m) => s + Number(m.fear || 0), 0) / active.length
    : 0;
  const compromisedId = intel?.compromisedId || null;
  const mutinyFired = Boolean(intel?.mutinyFired);
  const hasDismissed = Boolean(intel?.dismissedId);
  const suspectCount = roster.filter((m) => Number(m.suspicionScore || 0) >= 3).length;
  return {
    hasIntel: compromisedId !== null || mutinyFired || suspectCount > 0,
    compromisedId,
    mutinyFired,
    hasDismissed,
    avgMorale,
    avgFear,
    suspectCount
  };
}

export function buildRoom9IntelSummary(state) {
  const pr = state?.protectedRoom;
  if (!pr) return { active: false };
  return {
    active: true,
    label: pr.label || 'Room 9',
    knownToPlayer: Boolean(pr.knownToPlayer),
    pressureLevel: Number(pr.pressureLevel || 0),
    contaminationCount: Number(pr.contaminationCount || 0),
    investigateAttempts: Number(pr.investigateAttempts || 0),
    ownerWarningFired: Boolean(pr.ownerWarningFired),
    evidenceFoundCount: Array.isArray(pr.evidenceFound) ? pr.evidenceFound.length : 0
  };
}

// --- v0.31 Town Pressure export ---

export function buildTownPressureSummary(state) {
  const t = state?.townState;
  if (!t) return { active: false };
  return {
    active: true,
    townSuspicion: Number(t.townSuspicion || 0),
    corruption: Number(t.corruption || 0),
    bagmanFired: Boolean(t.bagmanFired),
    bagmanPayoffs: Number(t.bagmanPayoffs || 0),
    bagmanName: t.bagmanName || 'Carver',
    policeCompromised: Boolean(t.policeCompromised),
    lastHeadline: t.headlineArchive?.length
      ? t.headlineArchive[t.headlineArchive.length - 1]
      : null,
    headlineCount: Array.isArray(t.headlineArchive) ? t.headlineArchive.length : 0,
    lastDjBroadcast: t.lastDjBroadcast || null
  };
}

export function buildActiveRunThreadHighlights(state, limit = 3) {
  const threads = safeArray(state?.storyThreads)
    .filter((thread) => thread.status !== 'contained')
    .sort((a, b) => Number(b.heat || 0) - Number(a.heat || 0))
    .slice(0, Math.max(1, Math.min(3, Number(limit || 3))));

  return threads.map((thread) => ({
    id: thread.id,
    title: thread.title,
    stage: thread.stage,
    note: thread.summary,
    status: thread.status
  }));
}
