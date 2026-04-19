import { getDarkContractById } from './endlessShift.js';

function n(value, fallback = 0) {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}

function pickVariant(list = [], seed = 0) {
  if (!Array.isArray(list) || !list.length) return '';
  const index = Math.abs(Math.floor(Number(seed || 0))) % list.length;
  return list[index] || list[0] || '';
}

const ENDING_TITLE_VARIANTS = Object.freeze({
  stable: ['Trusted Shelter', 'Morning With Margin', 'Open Sign, Steady Hands'],
  fragile: ['Fragile Survival', 'One More Night Bought', 'Held Together at Dawn'],
  cold: ['Silent Profit', 'House of Quiet Deals', 'Records Clean, Corridors Cold'],
  collapse: ['Cracking Under Pressure', 'Contained Chaos', 'Dawn Over Damage'],
  hostile: ['Hostile Ledger', 'Every Side Keeps Score', 'No Neutral Witnesses'],
  controlled: ['Order Through Control', 'Commanded Stability', 'No Drift Allowed']
});

const ENDING_TAGLINE_VARIANTS = Object.freeze({
  stable: [
    'Dawn finally feels earned.',
    'You made this place feel briefly safe.',
    'The sign stayed lit without hiding the cost.'
  ],
  fragile: [
    'Open at dawn, uncertain by sundown.',
    'You survived the week, not the strain.',
    'The walls held, barely.'
  ],
  cold: [
    'Control came quietly, and so did the fallout.',
    'The books balance. The mood does not.',
    'You kept order in whispers and omissions.'
  ],
  collapse: [
    'Pressure broke pattern before it broke the sign.',
    'The motel stands, but trust does not.',
    'You reached morning through damage control alone.'
  ],
  hostile: [
    'No faction left satisfied.',
    'Every corridor now remembers a grievance.',
    'You kept the doors open under mutual hostility.'
  ],
  controlled: [
    'Order was imposed room by room.',
    'Discipline held where goodwill failed.',
    'You replaced chaos with hard edges.'
  ]
});

function doctrineOutcome(doctrine = {}) {
  const title = doctrine?.title || 'Stability Manager';
  if (/hardline|enforcer|controller/i.test(title)) return 'Doctrine settled into rigid command discipline.';
  if (/guest-first|host|mercy|compassion/i.test(title)) return 'Doctrine leaned toward guest-facing restraint and care.';
  if (/shadow|quiet|secrecy|fixer/i.test(title)) return 'Doctrine favored discreet control and private containment.';
  if (/improviser|fractured/i.test(title)) return 'Doctrine relied on reactive pivots to keep the motel standing.';
  return `Doctrine remained ${title.toLowerCase()} by campaign close.`;
}

function climateOutcome(factions = {}) {
  const guests = n(factions.guests, 0);
  const locals = n(factions.locals, 0);
  const ownership = n(factions.ownership, 0);
  if (guests >= 4 && locals >= 0) return 'Guest trust rose and outside climate stayed manageable.';
  if (ownership >= 5 && guests <= 0) return 'Ownership confidence climbed while guest warmth cooled.';
  if (locals <= -5) return 'Local hostility remained a persistent perimeter risk.';
  if (ownership <= -5) return 'Ownership scrutiny hardened after repeated instability signals.';
  return 'Faction climate ended tense-but-operational across stakeholders.';
}

function postureOutcome(t = {}) {
  const control = n(t.control, 0);
  const compassion = n(t.compassion, 0);
  const secrecy = n(t.secrecy, 0);
  if (control >= compassion + 2 && control >= secrecy) return 'Posture: Control-heavy operations with strict boundaries.';
  if (compassion >= control + 2 && compassion >= secrecy) return 'Posture: Compassion-led handling under pressure.';
  if (secrecy >= control && secrecy >= compassion) return 'Posture: Quiet, discreet, low-visibility management.';
  return 'Posture: Mixed doctrine with adaptive tradeoffs.';
}

function evaluateCategory(snapshot) {
  const t = snapshot.tendencies;
  const rep = snapshot.reputation;
  const unresolved = snapshot.unresolved;
  const policyBreaks = snapshot.policyBreaks;
  const force = snapshot.forceHeavy;
  const trustDelta = snapshot.guestTrust - snapshot.localHostility;
  const localHostility = snapshot.localHostility;
  const evidenceCount = n(snapshot.evidenceCount, 0);
  const mysteryComplete = Boolean(snapshot.mysteryComplete);
  const nemesisContained = snapshot.nemesisOutcome === 'contained';
  const nemesisEscaped = snapshot.nemesisOutcome === 'escaped';
  const huntWins = n(snapshot.huntWins, 0);
  const dirtyScore = n(snapshot.dirtyScore, 0);
  const offBookStays = n(snapshot.offBookStays, 0);
  const deadDrops = n(snapshot.deadDrops, 0);
  const shadowRep = n(snapshot.shadowRep, 0);
  const staffCompromised = Boolean(snapshot.staffCompromised);
  const mutinyFired = Boolean(snapshot.mutinyFired);
  const staffDismissed = Boolean(snapshot.staffDismissed);
  const avgStaffMorale = n(snapshot.avgStaffMorale, 0.56);
  const room9Level = n(snapshot.room9PressureLevel, 0);
  const room9Contained = Boolean(snapshot.room9Contained);
  const room9Attempts = n(snapshot.room9InvestigateAttempts, 0);
  const townSuspicion = n(snapshot.townSuspicion, 0);
  const bagmanPayoffs = n(snapshot.bagmanPayoffs, 0);
  const corruption = n(snapshot.corruption, 0);
  const bagmanFired = Boolean(snapshot.bagmanFired);
  const failSignals = n(snapshot.failSignals, 0);
  const convergencePeakTier = n(snapshot.convergencePeakTier, 0);
  const trueCrisisNightsSurvived = n(snapshot.trueCrisisNightsSurvived, 0);
  const uvConfirmedEvidenceCount = n(snapshot.uvConfirmedEvidenceCount, 0);

  // v0.31 town endings — checked first
  if (bagmanPayoffs >= 2 && dirtyScore >= 3) {
    return { key: 'bought-the-law', title: 'Bought the Law', subtitle: 'The Arrangement Was Made and Kept' };
  }
  if (townSuspicion <= 2 && corruption >= 3) {
    return { key: 'town-saw-nothing', title: 'Town Saw Nothing', subtitle: 'The Outside World Was Managed and Maintained' };
  }
  if (townSuspicion >= 6 && rep < 44) {
    return { key: 'notorious-motel', title: 'Notorious Motel', subtitle: 'The Town Remembers What Happened Here' };
  }

  // v0.30 Room 9 / contamination endings — checked first
  if (room9Level >= 3 && !room9Contained && rep >= 38) {
    return { key: 'motel-was-sick', title: 'The Motel Was Sick', subtitle: 'Something Has Been Wrong Here for a Long Time' };
  }
  if (room9Contained && room9Level >= 2 && rep >= 44) {
    return { key: 'contained-the-rot', title: 'Contained the Rot', subtitle: 'The Source Was Found and Sealed Off' };
  }
  if (room9Attempts >= 2 && rep < 44) {
    return { key: 'owners-machine', title: "Owner's Machine", subtitle: 'Every Door You Tried Was Already Locked' };
  }
  if (room9Level >= 1 && !room9Contained && rep >= 40) {
    return { key: 'lived-beside-wrong-room', title: 'Lived Beside the Wrong Room', subtitle: 'You Managed Around the Thing You Could Not Name' };
  }

  // v0.29 staff endings — checked before v0.28 dirty endings
  if (staffDismissed && !staffCompromised && rep >= 46) {
    return { key: 'last-honest-shift', title: 'Last Honest Shift', subtitle: 'The Rot Was Found and Removed' };
  }
  if (mutinyFired && avgStaffMorale < 0.30 && rep >= 36) {
    return { key: 'held-together-by-fear', title: 'Held Together by Fear', subtitle: 'The Team Stayed — At a Cost' };
  }
  if (avgStaffMorale < 0.25 && staffCompromised && rep < 44) {
    return { key: 'broken-team', title: 'Broken Team', subtitle: 'The Staff Fractured Before the Shift Ended' };
  }
  if (mutinyFired && dirtyScore < 3 && rep >= 42) {
    return { key: 'bought-loyalty', title: 'Bought Loyalty (Staff)', subtitle: 'The Crisis Was Resolved With a Payout' };
  }

  // v0.28 dirty endings — checked before v0.27
  if (offBookStays >= 2 && shadowRep >= 2 && rep >= 38) {
    return { key: 'protector-in-dark', title: 'Protector in the Dark', subtitle: 'Shelter Given Where No Record Exists' };
  }
  if (dirtyScore >= 8 && t.secrecy >= 5 && shadowRep >= 4) {
    return { key: 'motel-of-secrets', title: 'Motel of Secrets', subtitle: 'Nothing Here Is What It Appears to Be' };
  }
  if (dirtyScore >= 4 && deadDrops >= 1 && rep >= 44 && force <= 2) {
    return { key: 'bought-quiet', title: 'Bought Quiet', subtitle: 'Order Maintained Through Off-Book Arrangements' };
  }
  if (dirtyScore >= 6 && policyBreaks >= 2 && rep < 48) {
    return { key: 'compromised-operator', title: 'Compromised Operator', subtitle: 'The Ledger Shows More Than the System Recorded' };
  }
  if (dirtyScore >= 3 && rep >= 42 && failSignals <= 1) {
    return { key: 'dirty-but-untouched', title: 'Dirty But Untouched', subtitle: 'Off the Books, Out of Sight' };
  }

  // v0.34 convergence / collapse endings — specific combinations, checked before generic bases
  if (townSuspicion >= 5 && rep >= 48 && convergencePeakTier >= 3 && localHostility >= 3) {
    return {
      key: 'contained-desk-lost-strip',
      title: 'Held the Desk, Lost the Strip',
      subtitle: 'The Motel Survived the Week the Town Stopped Trusting It'
    };
  }
  if (uvConfirmedEvidenceCount >= 3 && rep < 44 && nemesisEscaped) {
    return {
      key: 'exposed-and-unmoored',
      title: 'Exposed and Unmoored',
      subtitle: 'The Physical Proof Outpaced What You Could Safely Control'
    };
  }
  if (trueCrisisNightsSurvived >= 2 && rep >= 42 && dirtyScore >= 4 && convergencePeakTier >= 3) {
    return {
      key: 'collapse-survivor',
      title: 'Collapse Survivor',
      subtitle: 'Multiple System Failures Stacked; Dawn Still Opened'
    };
  }

  // v0.27 endings — checked before base categories
  if (nemesisContained && huntWins >= 2 && evidenceCount >= 6) {
    return { key: 'nemesis-closed', title: 'The Pattern Was Broken', subtitle: 'Adversary Identified and Contained' };
  }
  if (mysteryComplete && evidenceCount >= 8) {
    return { key: 'evidence-trail', title: 'Evidence Trail', subtitle: 'The Previous Manager\'s Story, Finally Told' };
  }
  if (huntWins >= 3) {
    return { key: 'hunted-closed', title: 'Hunt Nights Survived', subtitle: 'Every Planted Arrival Turned Back' };
  }
  if (nemesisEscaped && rep <= 40) {
    return { key: 'nemesis-escaped', title: 'The Pattern Walked Away', subtitle: 'Adversary Withdrew Before Containment' };
  }

  if (rep >= 62 && t.control >= 6 && force >= 2) {
    return { key: 'order-through-control', title: 'Order Through Control', subtitle: 'Cold Stability Secured' };
  }
  if (rep >= 58 && t.control >= 5 && t.compassion >= 4 && unresolved <= 3) {
    return { key: 'controlled-manager', title: 'Controlled Manager', subtitle: 'Pressure Contained Without Losing the Floor' };
  }
  if (rep >= 60 && t.compassion >= 6 && trustDelta >= 3) {
    return { key: 'trusted-shelter', title: 'Trusted Shelter', subtitle: 'A Reputation for Safe Harbor' };
  }
  if (snapshot.money >= 220 && t.secrecy >= 6 && policyBreaks >= 1) {
    return { key: 'silent-profit', title: 'Silent Profit', subtitle: 'Quiet Revenue, Quiet Records' };
  }
  if (snapshot.money >= 200 && policyBreaks >= 1 && rep >= 42) {
    return { key: 'profitable-but-compromised', title: 'Profitable But Compromised', subtitle: 'Strong Ledger, Dirty Atmosphere' };
  }
  if (localHostility >= 5 && snapshot.guestTrust <= 0) {
    return { key: 'socially-poisoned-motel', title: 'Socially Poisoned Motel', subtitle: 'The Building Stays Open, The Mood Does Not' };
  }
  if (t.control >= 6 && t.compassion <= 1 && force >= 2) {
    return { key: 'harsh-survivor', title: 'Harsh Survivor', subtitle: 'Safety Held Through Hard Edges' };
  }
  if (snapshot.unresolved <= 4 && t.control >= 4 && t.compassion >= 3) {
    return { key: 'unstable-but-disciplined', title: 'Unstable But Disciplined', subtitle: 'The Motel Bent, Then Held' };
  }
  if (t.control >= 5 && t.compassion <= 1 && snapshot.guestTrust <= 0) {
    return { key: 'calm-but-morally-ugly', title: 'Calm But Morally Ugly', subtitle: 'The Floors Stayed Quiet for the Wrong Reasons' };
  }
  if (unresolved >= 6 && snapshot.finalePressurePeak >= 6) {
    return { key: 'contained-chaos', title: 'Contained Chaos', subtitle: 'Barely Held Behind Closed Doors' };
  }
  if (rep <= 34 || snapshot.failSignals >= 3) {
    return { key: 'cracking-under-pressure', title: 'Cracking Under Pressure', subtitle: 'The Motel Survived, But Fractured' };
  }
  if (t.secrecy >= 5 && snapshot.ownership >= 2 && snapshot.guestTrust <= 0) {
    return { key: 'house-of-quiet-deals', title: 'House of Quiet Deals', subtitle: 'Private Arrangements Defined the Run' };
  }
  if (t.control >= 5 && t.compassion <= 1 && policyBreaks === 0) {
    return { key: 'cold-efficiency', title: 'Cold Efficiency', subtitle: 'No Waste, No Warmth' };
  }
  if (t.compassion >= 5 && unresolved >= 3) {
    return { key: 'unsteady-mercy', title: 'Unsteady Mercy', subtitle: 'Humanity Preserved at a Cost' };
  }
  return { key: 'fragile-survival', title: 'Fragile Survival', subtitle: 'Open at Dawn, Uncertain by Dusk' };
}

function resolveEndingFamilyFromKey(key = '') {
  const value = String(key || '').toLowerCase();
  if (value.includes('bought-the-law')) return 'cold';
  if (value.includes('town-saw-nothing')) return 'cold';
  if (value.includes('notorious-motel')) return 'hostile';
  if (value.includes('motel-was-sick')) return 'hostile';
  if (value.includes('contained-the-rot')) return 'stable';
  if (value.includes('owners-machine')) return 'hostile';
  if (value.includes('lived-beside-wrong-room')) return 'fragile';
  if (value.includes('last-honest-shift')) return 'stable';
  if (value.includes('held-together-by-fear')) return 'fragile';
  if (value.includes('broken-team')) return 'hostile';
  if (value.includes('bought-loyalty') && value.includes('staff')) return 'cold';
  if (value.includes('protector-in-dark')) return 'stable';
  if (value.includes('motel-of-secrets') || value.includes('bought-quiet')) return 'cold';
  if (value.includes('compromised-operator')) return 'hostile';
  if (value.includes('dirty-but-untouched')) return 'fragile';
  if (value.includes('nemesis-closed') || value.includes('hunted-closed')) return 'controlled';
  if (value.includes('evidence-trail')) return 'stable';
  if (value.includes('nemesis-escaped')) return 'hostile';
  if (value.includes('controlled-manager')) return 'controlled';
  if (value.includes('trusted') || value.includes('shelter')) return 'stable';
  if (value.includes('fragile') || value.includes('unsteady')) return 'fragile';
  if (value.includes('cold') || value.includes('quiet') || value.includes('silent')) return 'cold';
  if (value.includes('cracking') || value.includes('chaos')) return 'collapse';
  if (value.includes('socially-poisoned')) return 'hostile';
  if (value.includes('harsh-survivor')) return 'controlled';
  if (value.includes('contained-desk-lost-strip')) return 'hostile';
  if (value.includes('exposed-and-unmoored')) return 'fragile';
  if (value.includes('collapse-survivor')) return 'controlled';
  if (value.includes('control') || value.includes('order')) return 'controlled';
  if (value.includes('hostile')) return 'hostile';
  return 'stable';
}

function buildEndingTagline(family = 'stable', grade = 'C') {
  const safeFamily = String(family || 'stable');
  const safeGrade = String(grade || 'C').toUpperCase();
  if (safeFamily === 'stable') {
    return safeGrade === 'S' || safeGrade === 'A'
      ? 'Dawn breaks over a motel that finally resembles a refuge.'
      : 'You held the line long enough for morning to feel earned.';
  }
  if (safeFamily === 'fragile') {
    return 'The sign still glows, but every hallway keeps tomorrow’s debt.';
  }
  if (safeFamily === 'cold') {
    return 'The books are clean. The silence is not.';
  }
  if (safeFamily === 'collapse') {
    return 'You survived the week, not the damage it carved into the building.';
  }
  if (safeFamily === 'hostile') {
    return 'Every side leaves with a grievance, and none forget your name.';
  }
  if (safeFamily === 'controlled') {
    return 'Order was imposed, room by room, cost by cost.';
  }
  return 'The campaign closes, but its consequences keep moving.';
}

function resolvePresentationFamily(family = 'stable', grade = 'C') {
  const safeFamily = String(family || 'stable');
  const safeGrade = String(grade || 'C').toUpperCase();
  if (safeFamily === 'stable') {
    return safeGrade === 'S' || safeGrade === 'A' ? 'good' : 'mixed';
  }
  if (safeFamily === 'controlled') return 'mixed';
  if (safeFamily === 'fragile') return 'fragile';
  if (safeFamily === 'cold') return 'cold';
  if (safeFamily === 'hostile') return 'hostile';
  if (safeFamily === 'collapse') return 'chaotic';
  return 'mixed';
}

function evaluateGrade(snapshot) {
  let score = 55;
  score += Math.max(-12, Math.min(16, (snapshot.reputation - 50) * 0.6));
  score += Math.max(-8, Math.min(10, (snapshot.powerAvg - 60) * 0.25));
  score += Math.max(-6, Math.min(8, (snapshot.money - 120) * 0.06));
  score -= Math.min(18, snapshot.unresolved * 2);
  score -= Math.min(12, snapshot.policyBreaks * 2);
  score += Math.min(10, snapshot.cleanResolutions);
  score += snapshot.finaleSurvived ? 6 : 0;
  // v0.31 town / corruption factors
  score -= Math.min(5, n(snapshot.townSuspicion, 0));
  score += Boolean(snapshot.policeCompromised) && n(snapshot.bagmanPayoffs, 0) === 0 ? 2 : 0;
  score -= n(snapshot.bagmanPayoffs, 0) >= 2 ? 3 : 0;
  // v0.30 Room 9 / contamination factors
  score -= Math.min(8, n(snapshot.room9PressureLevel, 0) * 2);
  score += Boolean(snapshot.room9Contained) ? 5 : 0;
  score -= n(snapshot.room9InvestigateAttempts, 0) >= 2 && !Boolean(snapshot.room9Contained) ? 3 : 0;
  // v0.29 staff factors
  score -= Boolean(snapshot.mutinyFired) && n(snapshot.avgStaffMorale, 0.56) < 0.30 ? 4 : 0;
  score += Boolean(snapshot.staffDismissed) && !Boolean(snapshot.staffCompromised) ? 3 : 0;
  score -= Boolean(snapshot.staffCompromised) && !Boolean(snapshot.staffDismissed) ? 3 : 0;
  // v0.28 dirty score factors
  score -= Math.min(6, n(snapshot.offBookStays, 0) * 2);
  score += Math.min(3, n(snapshot.deadDrops, 0));
  score += Math.min(4, Math.max(0, n(snapshot.shadowRep, 0)));
  score -= Math.min(5, Math.max(0, -n(snapshot.shadowRep, 0)));
  // v0.27 score factors
  score += Math.min(6, n(snapshot.evidenceCount, 0) * 0.75);
  score += snapshot.mysteryComplete ? 4 : 0;
  score += snapshot.nemesisOutcome === 'contained' ? 5 : 0;
  score -= snapshot.nemesisOutcome === 'escaped' ? 4 : 0;
  score += Math.min(6, n(snapshot.huntWins, 0) * 2);
  // v0.32 operator / grid toll
  if (n(snapshot.operatorFatigueEnd, 0) >= 78) score -= 2;
  else if (n(snapshot.operatorFatigueEnd, 0) <= 35) score += 2;
  if (n(snapshot.analogStrongStimUses, 0) >= 1) score -= 1;
  score += Math.min(3, n(snapshot.tapeSecuredCount, 0));
  if (n(snapshot.uvConfirmedEvidenceCount, 0) >= 3) score += 2;
  if (n(snapshot.forensicClaimDebt, 0) >= 2) score -= 2;
  // v0.34 convergence toll / survivor credit
  score -= Math.min(4, n(snapshot.trueCrisisNightsSurvived, 0) * 1.1);
  score += Math.min(3, n(snapshot.convergencePeakTier, 0) * 0.45);
  if (n(snapshot.trueCrisisNightsSurvived, 0) >= 2 && snapshot.reputation >= 46) score += 2;

  if (score >= 86) return { grade: 'S', label: 'Definitive Campaign Close' };
  if (score >= 75) return { grade: 'A', label: 'Strong Campaign Close' };
  if (score >= 64) return { grade: 'B', label: 'Stable Campaign Close' };
  if (score >= 52) return { grade: 'C', label: 'Uneasy Campaign Close' };
  if (score >= 40) return { grade: 'D', label: 'Strained Campaign Close' };
  return { grade: 'E', label: 'Damaged Campaign Close' };
}

export function buildRunEndingPackage(state) {
  const tendencies = state?.doctrine?.tendencies || {};
  const doctrineDisplay = state?.doctrineDisplay || {};
  const factions = state?.factions || {};
  const campaign = state?.campaign || {};
  const totals = campaign?.totals || {};
  const nights = Array.isArray(campaign?.nights) ? campaign.nights : [];
  const runSetupSummary = state?.runSetupSummary || null;
  const difficultyLabel = String(runSetupSummary?.difficultyLabel || 'Standard');
  const contractLabels = Array.isArray(runSetupSummary?.contractLabels) ? runSetupSummary.contractLabels : [];

  const locker = state?.evidenceLocker || {};
  const nemesis = state?.nemesis || {};
  const callerThread = state?.callerThread || {};
  const dirtyLedger = state?.dirtyLedger || {};

  const snapshot = {
    tendencies,
    reputation: n(state?.reputation, 50),
    money: n(state?.money, 0),
    powerAvg: nights.length
      ? nights.reduce((sum, entry) => sum + n(entry?.power, 0), 0) / nights.length
      : n(state?.power, 0),
    unresolved: n(totals.unresolvedLocationScenes, 0) + n(totals.nightEventsMissed, 0),
    policyBreaks: n(totals.policyBreaks, 0) + n(totals.policyBroken, 0),
    cleanResolutions: n(totals.sceneResolved, 0) + n(totals.nightEventsResolved, 0),
    forceHeavy: n(totals.policeReliance, 0) + n(totals.harshDeskActions, 0) + n(totals.evictions, 0),
    guestTrust: n(factions.guests, 0),
    localHostility: Math.max(0, -n(factions.locals, 0)),
    ownership: n(factions.ownership, 0),
    failSignals: n(totals.severeIncidents, 0) + n(totals.storyEscalations, 0),
    finaleSurvived: Boolean(campaign?.finaleSurvived),
    finalePressurePeak: n(state?.finalePressurePeak, 0),
    finalePerformanceKey: String(state?.finalePerformance?.key || ''),
    finalePerformanceLabel: String(state?.finalePerformance?.label || ''),
    finalePerformanceLine: String(state?.finalePerformance?.line || ''),
    endingMood: Array.isArray(state?.summaryIdentityLines) ? String(state.summaryIdentityLines[0] || '') : '',
    // v0.31
    townSuspicion: n(state?.townState?.townSuspicion, 0),
    corruption: n(state?.townState?.corruption, 0),
    bagmanFired: Boolean(state?.townState?.bagmanFired),
    bagmanPayoffs: n(state?.townState?.bagmanPayoffs, 0),
    policeCompromised: Boolean(state?.townState?.policeCompromised),
    bagmanName: state?.townState?.bagmanName || 'Carver',
    // v0.30
    room9PressureLevel: n(state?.protectedRoom?.pressureLevel, 0),
    room9Contained: Boolean(state?.protectedRoom?.investigateAttempts >= 2 && !state?.protectedRoom?.ownerWarningFired),
    room9InvestigateAttempts: n(state?.protectedRoom?.investigateAttempts, 0),
    room9ContaminationCount: n(state?.protectedRoom?.contaminationCount, 0),
    room9EvidenceFound: Array.isArray(state?.protectedRoom?.evidenceFound) ? state.protectedRoom.evidenceFound.length : 0,
    // v0.29
    staffCompromised: Boolean(state?.staffIntel?.compromisedId || state?.staffIntel?.dismissedId),
    mutinyFired: Boolean(state?.staffIntel?.mutinyFired),
    staffDismissed: Boolean(state?.staffIntel?.dismissedId),
    avgStaffMorale: (() => {
      const roster = Array.isArray(state?.dayShift?.staff?.roster) ? state.dayShift.staff.roster : [];
      const active = roster.filter(m => m.active !== false);
      return active.length ? active.reduce((s, m) => s + Number(m.morale || 0.56), 0) / active.length : 0.56;
    })(),
    // v0.28
    dirtyScore: Math.min(10, n(dirtyLedger.totalDirtyMoney, 0) / 20),
    offBookStays: n(dirtyLedger.offBookStays, 0),
    deadDrops: n(dirtyLedger.deadDrops, 0),
    shadowRep: n(state?.shadowRep, 0),
    totalDirtyMoney: n(dirtyLedger.totalDirtyMoney, 0),
    // v0.27
    evidenceCount: Array.isArray(locker.items) ? locker.items.length : 0,
    mysteryComplete: n(locker.mysteryFragmentsFound, 0) >= 6,
    mysteryFragmentsFound: n(locker.mysteryFragmentsFound, 0),
    nemesisOutcome: String(nemesis.resolvedOutcome || (nemesis.active ? 'active' : '')),
    nemesisStyleKey: String(nemesis.styleKey || ''),
    huntWins: n(callerThread.huntNightWins, 0),
    huntLosses: n(callerThread.huntNightLosses, 0),
    operatorFatigueEnd: n(state?.analogSurvival?.operatorFatigue, 0),
    analogStrongStimUses: n(state?.analogSurvival?.stimUses?.strong, 0),
    tapeSecuredCount: Array.isArray(state?.evidenceLocker?.items)
      ? state.evidenceLocker.items.filter((it) => it?.tapeSecured).length
      : 0,
    uvConfirmedEvidenceCount: Array.isArray(state?.evidenceLocker?.items)
      ? state.evidenceLocker.items.filter((it) => it?.uvConfirmed).length
      : 0,
    forensicClaimDebt: n(state?.forensicNoir?.claimDebt, 0),
    convergencePeakTier: n(state?.campaignCollapseStats?.peakConvergenceTier, 0),
    trueCrisisNightsSurvived: n(state?.campaignCollapseStats?.trueCrisisNights, 0),
    totalVectorHits: n(state?.campaignCollapseStats?.totalVectorHits, 0),
    endlessSurvivalScore: n(state?.endlessRun?.survivalScore, 0),
    endlessAuditorPasses: n(state?.endlessRun?.auditorPasses, 0),
    endlessAuditorFails: n(state?.endlessRun?.auditorFails, 0),
    endlessCleanupPasses: n(state?.endlessRun?.cleanupPasses, 0),
    darkWebContractCodename: String(getDarkContractById(state?.endlessRun?.selectedDarkContractId)?.codename || ''),
    roadHeatEnd: n(state?.roadWorld?.roadHeat, 0),
    drifterTierEnd: n(state?.roadWorld?.drifterNetwork?.tier, 0),
    drifterBurnedEnd: Boolean(state?.roadWorld?.drifterNetwork?.burned),
    houndTrustEndPct: Math.round(n(state?.roadWorld?.motelHound?.trust, 0) * 100),
    roadIntelTipsLastShift: n(state?.shiftStats?.roadIntelTipsShift, 0),
    houndSilenceLastShift: n(state?.shiftStats?.houndSilenceShift, 0)
  };

  const ending = evaluateCategory(snapshot);
  const grade = evaluateGrade(snapshot);
  const family = resolveEndingFamilyFromKey(ending.key);
  const seed =
    n(snapshot.reputation, 0)
    + n(snapshot.money, 0)
    + n(snapshot.unresolved, 0) * 3
    + n(snapshot.finalePressurePeak, 0) * 7;
  const title = pickVariant(ENDING_TITLE_VARIANTS[family] || [], seed + n(snapshot.forceHeavy, 0)) || ending.title;
  const taglineVariant = pickVariant(ENDING_TAGLINE_VARIANTS[family] || [], seed + n(snapshot.cleanResolutions, 0));
  const tagline = taglineVariant || buildEndingTagline(family, grade.grade);
  const presentationFamily = resolvePresentationFamily(family, grade.grade);

  const summary = `Across ${Math.max(1, nights.length)} nights, the motel settled into ${ending.title.toLowerCase()}. `
    + `You closed with reputation ${snapshot.reputation}, $${snapshot.money}, and an average power stability of ${Math.round(snapshot.powerAvg)}%.`;

  const dramaticSummary = `By the end of the campaign, ${title.toLowerCase()} defined the property. `
    + `The final ledger closed at Reputation ${snapshot.reputation}, $${snapshot.money}, and ${Math.round(snapshot.powerAvg)}% average grid stability — `
    + `enough to keep the sign lit, but not enough to erase what the week demanded.`;

  const rareMoments = Array.isArray(state?.contentHistory?.rareMomentsSeen)
    ? state.contentHistory.rareMomentsSeen.length
    : 0;

  const finaleIntegrationLine = snapshot.finalePerformanceLabel
    ? `Finale integration: ${snapshot.finalePerformanceLabel}.`
    : 'Finale integration: pressure peaked without a distinct finale profile.';

  const dirtyLine = snapshot.totalDirtyMoney > 0
    ? `Off-book: $${snapshot.totalDirtyMoney} dirty cash earned, ${snapshot.offBookStays} unlogged stay${snapshot.offBookStays !== 1 ? 's' : ''}, ${snapshot.deadDrops} dead drop${snapshot.deadDrops !== 1 ? 's' : ''}.${snapshot.shadowRep !== 0 ? ` Shadow rep: ${snapshot.shadowRep > 0 ? '+' : ''}${snapshot.shadowRep}.` : ''}`
    : '';

  const evidenceLine = snapshot.evidenceCount >= 6
    ? `Evidence locker: ${snapshot.evidenceCount} items recovered${snapshot.mysteryComplete ? ' — Previous manager mystery resolved' : ''}.`
    : snapshot.evidenceCount > 0
      ? `Evidence locker: ${snapshot.evidenceCount} item${snapshot.evidenceCount !== 1 ? 's' : ''} recovered${snapshot.mysteryFragmentsFound > 0 ? ` — ${snapshot.mysteryFragmentsFound}/6 mystery fragments found` : ''}.`
      : '';

  const nemesisLine = snapshot.nemesisOutcome === 'contained'
    ? `Nemesis: pattern identified and contained after ${snapshot.huntWins} hunt night win${snapshot.huntWins !== 1 ? 's' : ''}.`
    : snapshot.nemesisOutcome === 'escaped'
      ? 'Nemesis: recurring adversary withdrew without resolution.'
      : snapshot.nemesisOutcome === 'active'
        ? 'Nemesis: the recurring presence was never fully identified.'
        : '';

  const huntLine = snapshot.huntWins > 0 || snapshot.huntLosses > 0
    ? `Hunt nights: ${snapshot.huntWins} win${snapshot.huntWins !== 1 ? 's' : ''}, ${snapshot.huntLosses} miss${snapshot.huntLosses !== 1 ? 'es' : ''}.`
    : '';

  const analogFoot = (state?.analogSurvival?.analogNightLog || []).filter(Boolean).slice(-1)[0];
  const forensicFoot = (state?.forensicNoir?.shiftLog || []).filter(Boolean).slice(-1)[0];
  const notes = [
    snapshot.endingMood ? `Late-run identity: ${snapshot.endingMood}` : '',
    snapshot.finalePerformanceLabel ? `Finale assessment: ${snapshot.finalePerformanceLabel}` : '',
    `Milestone nights survived: ${n(campaign?.milestoneNightsSurvived, 0)}`,
    `Policy overrides recorded: ${snapshot.policyBreaks}`,
    `Unresolved pressure events: ${snapshot.unresolved}`,
    `Special + event containment wins: ${snapshot.cleanResolutions}`,
    rareMoments > 0 ? `Rare run moments surfaced: ${rareMoments}` : '',
    analogFoot ? `Physical desk toll: ${analogFoot}` : '',
    forensicFoot ? `Forensic trace: ${forensicFoot}` : '',
    n(snapshot.convergencePeakTier, 0) >= 2
      ? `Convergence arc: peak tier ${snapshot.convergencePeakTier}, ${n(snapshot.trueCrisisNightsSurvived, 0)} collapse-class night(s).`
      : '',
    String(state?.runSetup?.campaignMode || '') === 'endless' && n(snapshot.endlessSurvivalScore, 0) > 0
      ? `Endless ledger: endurance ${Math.round(snapshot.endlessSurvivalScore)}, dawn passes ${snapshot.endlessAuditorPasses}, severe hits ${snapshot.endlessAuditorFails}, concealment passes ${snapshot.endlessCleanupPasses}.`
      : '',
    n(snapshot.roadHeatEnd, 0) >= 4
      ? `Outside layer: route heat finished near ${snapshot.roadHeatEnd}/10; watchers ended tier ${snapshot.drifterTierEnd}${snapshot.drifterBurnedEnd ? ' (line burned)' : ''}; hound trust about ${snapshot.houndTrustEndPct}%.`
      : '',
    finaleIntegrationLine
  ].slice(0, 9);

  const tags = [
    `Difficulty: ${difficultyLabel}`,
    contractLabels.length ? `Contracts: ${contractLabels.join(', ')}` : 'Contracts: None',
    snapshot.finalePerformanceKey.includes('stabilized') ? 'Finale Stabilized' : '',
    snapshot.finalePerformanceKey.includes('barely-contained') ? 'Finale Barely Contained' : '',
    snapshot.finalePerformanceKey.includes('lost-control') ? 'Finale Control Lost' : '',
    tendencies.control >= 5 ? 'Control-Heavy' : '',
    tendencies.compassion >= 5 ? 'Guest-Facing' : '',
    tendencies.secrecy >= 5 ? 'Discreet' : '',
    snapshot.forceHeavy >= 4 ? 'Force-Driven' : '',
    snapshot.unresolved >= 5 ? 'High Carryover' : '',
    // v0.27 tags
    snapshot.nemesisOutcome === 'contained' ? 'Nemesis Identified' : '',
    snapshot.mysteryComplete ? 'Manager Mystery' : '',
    snapshot.huntWins >= 2 ? 'Hunt Nights Survived' : '',
    snapshot.evidenceCount >= 8 ? 'Evidence Trail' : '',
    // v0.28 tags
    snapshot.totalDirtyMoney >= 100 ? 'Off-Book Cash' : '',
    snapshot.shadowRep >= 4 ? 'Network Standing' : '',
    snapshot.offBookStays >= 2 ? 'Unlogged Stays' : '',
    // v0.31 tags
    snapshot.bagmanPayoffs >= 2 ? 'Bought the Law' : '',
    snapshot.townSuspicion >= 6 ? 'Town Heat' : '',
    snapshot.policeCompromised && !snapshot.bagmanPayoffs ? 'Silent Arrangement' : '',
    // v0.30 tags
    snapshot.room9PressureLevel >= 3 ? 'Spatial Contamination' : '',
    snapshot.room9Contained ? 'Rot Contained' : '',
    snapshot.room9InvestigateAttempts >= 2 ? 'Owner Override' : '',
    // v0.29 tags
    snapshot.staffCompromised && !snapshot.staffDismissed ? 'Compromised Operator' : '',
    snapshot.staffDismissed && !snapshot.staffCompromised ? 'Last Honest Shift' : '',
    snapshot.mutinyFired && snapshot.avgStaffMorale < 0.30 ? 'Fear Management' : '',
    snapshot.operatorFatigueEnd >= 75 ? 'Operator Exhausted' : '',
    snapshot.analogStrongStimUses >= 1 ? 'Chemically Stabilized' : '',
    snapshot.tapeSecuredCount >= 2 ? 'Tape Discipline' : '',
    snapshot.uvConfirmedEvidenceCount >= 2 ? 'UV-Confirmed Chain' : '',
    snapshot.forensicClaimDebt >= 1 ? 'Trace Debt' : '',
    n(snapshot.trueCrisisNightsSurvived, 0) >= 2 ? 'Collapse Veteran' : '',
    n(snapshot.convergencePeakTier, 0) >= 4 ? 'Peak Convergence' : '',
    snapshot.darkWebContractCodename ? `Contract ${snapshot.darkWebContractCodename}` : '',
    String(state?.runSetup?.campaignMode || '') === 'endless' ? 'Endless Shift' : '',
    n(snapshot.endlessSurvivalScore, 0) >= 120 ? 'Endurance Class' : '',
    n(snapshot.endlessAuditorFails, 0) >= 2 ? 'Dawn Liability' : '',
    n(snapshot.endlessAuditorPasses, 0) >= 3 ? 'Clean Dawns' : '',
    n(snapshot.roadHeatEnd, 0) >= 7 ? 'Hostile Highway' : '',
    n(snapshot.roadHeatEnd, 0) >= 4 && n(snapshot.roadIntelTipsLastShift, 0) >= 1 ? 'Read the Road' : '',
    snapshot.drifterBurnedEnd ? 'Burned Watchers' : '',
    n(snapshot.houndSilenceLastShift, 0) >= 1 ? 'Hound Went Quiet' : '',
    n(snapshot.houndTrustEndPct, 0) >= 72 ? 'Lot Stray Loyal' : ''
  ].filter(Boolean).slice(0, 10);

  return {
    key: ending.key,
    family,
    presentationFamily,
    title,
    subtitle: ending.subtitle,
    tagline,
    grade: grade.grade,
    gradeLabel: grade.label,
    campaignLine: `Campaign complete — ${Math.max(1, nights.length)} / ${Math.max(1, n(campaign?.length, nights.length || 1))} nights cleared.`,
    setupLine: runSetupSummary?.setupLine || `Difficulty: ${difficultyLabel} • Contracts: ${contractLabels.length ? contractLabels.join(', ') : 'None'}`,
    runSetupSummary,
    summary,
    dramaticSummary,
    finaleContextLine: snapshot.finalePerformanceLine || 'Final-night context unavailable for this campaign close.',
    doctrineLine: doctrineOutcome({ ...doctrineDisplay, tendencies }),
    climateLine: climateOutcome(factions),
    pressureLine: `Trust / Hostility / Oversight: ${n(factions.guests, 0)} / ${Math.max(0, -n(factions.locals, 0))} / ${Math.max(0, -n(factions.ownership, 0))}`,
    postureLine: postureOutcome(tendencies),
    notes,
    tags,
    stats: {
      reputation: snapshot.reputation,
      money: snapshot.money,
      avgPower: Math.round(snapshot.powerAvg),
      unresolved: snapshot.unresolved,
      milestoneNights: n(campaign?.milestoneNightsSurvived, 0)
    },
    // v0.31
    townLine: snapshot.bagmanFired
      ? `Town: Officer ${snapshot.bagmanName} made contact.${snapshot.bagmanPayoffs > 0 ? ` ${snapshot.bagmanPayoffs} payoff${snapshot.bagmanPayoffs !== 1 ? 's' : ''} accepted.` : ' Turned away.'}${snapshot.townSuspicion >= 4 ? ` Town heat: ${snapshot.townSuspicion}/10.` : ''}`
      : snapshot.townSuspicion >= 3
        ? `Town: suspicion at ${snapshot.townSuspicion}/10 without direct police contact.`
        : '',
    townSuspicion: snapshot.townSuspicion,
    bagmanFired: snapshot.bagmanFired,
    bagmanPayoffs: snapshot.bagmanPayoffs,
    policeCompromised: snapshot.policeCompromised,
    // v0.30
    room9Line: snapshot.room9PressureLevel >= 1
      ? `Room 9: pressure level ${snapshot.room9PressureLevel}/4, ${snapshot.room9ContaminationCount} contamination event${snapshot.room9ContaminationCount !== 1 ? 's' : ''}${snapshot.room9EvidenceFound > 0 ? `, ${snapshot.room9EvidenceFound} item${snapshot.room9EvidenceFound !== 1 ? 's' : ''} documented` : ''}.${snapshot.room9Contained ? ' Contained.' : ''}`
      : '',
    room9PressureLevel: snapshot.room9PressureLevel,
    room9Contained: snapshot.room9Contained,
    room9InvestigateAttempts: snapshot.room9InvestigateAttempts,
    // v0.29
    staffLine: snapshot.staffCompromised
      ? `Staff: ${snapshot.staffDismissed ? 'compromised member identified and dismissed' : 'compromised member active at close'}.${snapshot.mutinyFired ? ' Mutiny occurred this run.' : ''}`
      : snapshot.mutinyFired
        ? 'Staff: mutiny event occurred and was resolved.'
        : '',
    staffCompromised: snapshot.staffCompromised,
    staffDismissed: snapshot.staffDismissed,
    mutinyFired: snapshot.mutinyFired,
    avgStaffMorale: snapshot.avgStaffMorale,
    // v0.28
    dirtyLine: dirtyLine || '',
    dirtyScore: snapshot.dirtyScore,
    offBookStays: snapshot.offBookStays,
    deadDrops: snapshot.deadDrops,
    shadowRep: snapshot.shadowRep,
    totalDirtyMoney: snapshot.totalDirtyMoney,
    // v0.27
    evidenceLine: evidenceLine || '',
    nemesisLine: nemesisLine || '',
    huntLine: huntLine || '',
    evidenceCount: snapshot.evidenceCount,
    mysteryComplete: snapshot.mysteryComplete,
    mysteryFragmentsFound: snapshot.mysteryFragmentsFound,
    nemesisOutcome: snapshot.nemesisOutcome,
    huntWins: snapshot.huntWins,
    huntLosses: snapshot.huntLosses
  };
}
