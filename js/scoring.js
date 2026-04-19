const DEFAULT_SHIFT_STATS = {
  checkedIn: 0,
  flagged: 0,
  rejected: 0,
  cameraScans: 0,
  investigationsPerformed: 0,
  locationInvestigations: 0,
  sceneResolved: 0,
  sceneFailed: 0,
  unresolvedLocationScenes: 0,
  escalatedLocationIssues: 0,
  strongContainmentActions: 0,
  weakSceneDecisions: 0,
  powerHeavyResponses: 0,
  locationPersistentReturns: 0,
  emergencyPowerRestores: 0,
  majorPowerIncidents: 0,
  manualReviews: 0,
  manualIncidents: 0,
  autoIncidents: 0,
  severeIncidents: 0,
  policyFollowed: 0,
  policyBroken: 0,
  specialGuestsHandled: 0,
  specialGuestsMissed: 0,
  nightEventsResolved: 0,
  nightEventsMissed: 0,
  cleanResponses: 0,
  forcedCompromises: 0,
  cleanGuestResolutions: 0,
  harshDeskActions: 0,
  policeReliance: 0,
  staffAssists: 0,
  policyBreaks: 0,
  publicPressureMoments: 0,
  recurringGuestsHandled: 0,
  recurringGuestsMissed: 0,
  threadsAdvancedCleanly: 0,
  threadsEscalated: 0,
  quietResolutions: 0,
  outsideIssueCount: 0,
  authorityAssistedMoments: 0,
  guestConflictMoments: 0,
  ownershipPressureMoments: 0,
  storyEscalations: 0,
  storyResolutions: 0,
  carryoverWarningsTriggered: 0,
  carryoverProblemsContained: 0,
  deskConsequencesQueued: 0,
  deskConsequencesTriggered: 0,
  deskConsequencesPrevented: 0,
  deskRareMoments: 0,
  evictions: 0,
  cameraPowerSpent: 0,
  investigationPowerSpent: 0,
  dispatchPowerSpent: 0,
  reportActionsUsed: 0,
  reportActionCosts: 0,
  panicSpendingMoments: 0,
  finaleCommandCosts: 0,
  roadIntelTipsShift: 0,
  roadIntelWrong: 0,
  houndSignalsShift: 0,
  houndSilenceShift: 0,
  drifterBurns: 0,
  switchboardListens: 0,
  switchboardUsefulIntel: 0,
  switchboardPartialIntel: 0,
  switchboardBadIntel: 0,
  switchboardLineNotices: 0,
  switchboardToneShifts: 0,
  operatorQuartersChecked: 0,
  operatorQuartersIgnored: 0,
  operatorQuartersFalseAlarms: 0,
  operatorQuartersFindings: 0,
  operatorHallucinationsTriggered: 0,
  borderBlindWindows: 0,
  borderDropEvents: 0,
  borderWitnessEvents: 0,
  borderWitnessResolutions: 0,
  borderShaftDispatches: 0,
  dawnShredderPasses: 0,
  dawnIncineratorRuns: 0,
  dawnAuditorBlackmails: 0,
  fourAmFixerInvoked: 0,
  room9FreezeSpikes: 0
};

function clampScore(value) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function getRating(score) {
  if (score >= 90) return { grade: 'A', label: 'Excellent Shift' };
  if (score >= 75) return { grade: 'B', label: 'Stable Shift' };
  if (score >= 60) return { grade: 'C', label: 'Uneasy Shift' };
  if (score >= 45) return { grade: 'D', label: 'Rough Shift' };
  return { grade: 'F', label: 'Disastrous Shift' };
}

export function createShiftStats() {
  return { ...DEFAULT_SHIFT_STATS };
}

export function normalizeShiftStats(stats = {}) {
  const normalized = createShiftStats();

  Object.keys(normalized).forEach((key) => {
    if (typeof stats[key] === 'number') {
      normalized[key] = stats[key];
    }
  });

  return normalized;
}

export function classifyPolicyAction(guest, action) {
  const recommendation = guest?.policyRecommendation || 'Approve';

  if (action === 'checkin') {
    if (recommendation === 'Approve') return 'followed';
    if (recommendation === 'Watch') return guest?.flagged ? 'followed' : 'broken';
    if (recommendation === 'Deny') return 'broken';
  }

  if (action === 'flag') {
    if (recommendation === 'Watch') return 'followed';
    if (recommendation === 'Deny') return 'neutral';
    return 'neutral';
  }

  if (action === 'reject') {
    if (recommendation === 'Deny') return 'followed';
    if (recommendation === 'Approve') return 'broken';
    return 'neutral';
  }

  return 'neutral';
}

export function buildShiftOutcome({
  night = 1,
  money = 0,
  power = 100,
  reputation = 50,
  logs = [],
  incidents = [],
  shiftStats = {}
}) {
  const stats = normalizeShiftStats(shiftStats);

  let score = 50;
  const breakdown = [];

  if (stats.checkedIn >= 3) {
    score += 6;
    breakdown.push(`Handled ${stats.checkedIn} guest check-in(s).`);
  } else if (stats.checkedIn === 0) {
    score -= 4;
    breakdown.push('No guests were successfully checked in.');
  }

  if (stats.flagged > 0) {
    score += Math.min(stats.flagged * 2, 6);
    breakdown.push(`Used observation flags ${stats.flagged} time(s).`);
  }

  if (stats.rejected > 0) {
    breakdown.push(`Rejected ${stats.rejected} guest(s) at the desk.`);
  }

  if (stats.policyFollowed > 0) {
    score += Math.min(stats.policyFollowed * 4, 12);
    breakdown.push(`Policy was followed ${stats.policyFollowed} time(s).`);
  }

  if (stats.policyBroken > 0) {
    score -= Math.min(stats.policyBroken * 6, 18);
    breakdown.push(`Policy was overridden ${stats.policyBroken} time(s).`);
  }

  if (stats.manualReviews > 0) {
    score += Math.min(stats.manualReviews, 3);
    breakdown.push(`Incident review was used ${stats.manualReviews} time(s).`);
  }

  if (stats.investigationsPerformed > 0) {
    score += Math.min(stats.investigationsPerformed, 4);
    breakdown.push(`Ran ${stats.investigationsPerformed} camera investigation response(s).`);
  }

  if (stats.locationInvestigations > 0) {
    score += Math.min(stats.locationInvestigations, 4);
    breakdown.push(`Investigated ${stats.locationInvestigations} location scene(s).`);
  }

  if (stats.sceneResolved > 0) {
    score += Math.min(stats.sceneResolved * 2, 8);
    breakdown.push(`Resolved ${stats.sceneResolved} location scene(s).`);
  }

  if (stats.sceneFailed > 0) {
    score -= Math.min(stats.sceneFailed * 3, 12);
    breakdown.push(`${stats.sceneFailed} scene response(s) failed under pressure.`);
  }

  if (stats.unresolvedLocationScenes > 0) {
    score -= Math.min(stats.unresolvedLocationScenes * 2, 10);
    breakdown.push(`${stats.unresolvedLocationScenes} location issue(s) remained unresolved.`);
  }

  if (stats.escalatedLocationIssues > 0) {
    score -= Math.min(stats.escalatedLocationIssues * 2, 10);
    breakdown.push(`${stats.escalatedLocationIssues} location chain(s) escalated during the shift.`);
  }

  if (stats.strongContainmentActions > 0) {
    score += Math.min(stats.strongContainmentActions, 5);
    breakdown.push(`Strong containment actions used: ${stats.strongContainmentActions}.`);
  }

  if (stats.weakSceneDecisions > 0) {
    score -= Math.min(stats.weakSceneDecisions, 6);
    breakdown.push(`Weak scene decisions increased risk ${stats.weakSceneDecisions} time(s).`);
  }

  if (stats.powerHeavyResponses > 0) {
    breakdown.push(`Power-heavy emergency responses used: ${stats.powerHeavyResponses}.`);
  }

  if (stats.panicSpendingMoments > 0) {
    score -= Math.min(stats.panicSpendingMoments * 2, 6);
    breakdown.push(`Panic spending moments: ${stats.panicSpendingMoments}.`);
  }

  if (stats.locationPersistentReturns > 0) {
    score -= Math.min(stats.locationPersistentReturns, 6);
    breakdown.push(`Persistent location issues resurfaced ${stats.locationPersistentReturns} time(s).`);
  }

  if (stats.emergencyPowerRestores > 0) {
    breakdown.push(`Emergency generator restores used: ${stats.emergencyPowerRestores}.`);
  }

  if (stats.majorPowerIncidents > 0) {
    score -= Math.min(stats.majorPowerIncidents * 2, 8);
    breakdown.push(`Emergency reroutes triggered ${stats.majorPowerIncidents} instability event(s).`);
  }

  if (stats.manualIncidents > 0) {
    score -= Math.min(stats.manualIncidents * 2, 8);
    breakdown.push(`${stats.manualIncidents} manual incident(s) were confirmed.`);
  }

  if (stats.autoIncidents > 0) {
    score -= Math.min(stats.autoIncidents * 3, 12);
    breakdown.push(`${stats.autoIncidents} automatic escalation incident(s) occurred.`);
  }

  if (stats.severeIncidents > 0) {
    score -= Math.min(stats.severeIncidents * 5, 20);
    breakdown.push(`${stats.severeIncidents} severe incident(s) destabilized the shift.`);
  }

  if (stats.specialGuestsHandled > 0) {
    score += Math.min(stats.specialGuestsHandled * 2, 8);
    breakdown.push(`Handled ${stats.specialGuestsHandled} special encounter(s).`);
  }

  if (stats.specialGuestsMissed > 0) {
    score -= Math.min(stats.specialGuestsMissed * 2, 8);
    breakdown.push(`${stats.specialGuestsMissed} special encounter(s) were left unresolved.`);
  }

  if (stats.nightEventsResolved > 0) {
    score += Math.min(stats.nightEventsResolved * 2, 8);
    breakdown.push(`Resolved ${stats.nightEventsResolved} active shift event(s).`);
  }

  if (stats.nightEventsMissed > 0) {
    score -= Math.min(stats.nightEventsMissed * 2, 10);
    breakdown.push(`Unresolved event pressure hit ${stats.nightEventsMissed} time(s).`);
  }

  if (stats.recurringGuestsHandled > 0) {
    score += Math.min(stats.recurringGuestsHandled * 2, 6);
    breakdown.push(`Handled ${stats.recurringGuestsHandled} returning guest encounter(s).`);
  }

  if (stats.recurringGuestsMissed > 0) {
    score -= Math.min(stats.recurringGuestsMissed * 2, 6);
    breakdown.push(`${stats.recurringGuestsMissed} returning guest(s) escalated unresolved.`);
  }

  if (stats.threadsAdvancedCleanly > 0) {
    score += Math.min(stats.threadsAdvancedCleanly, 4);
    breakdown.push(`Recurring threads stabilized: ${stats.threadsAdvancedCleanly}.`);
  }

  if (stats.threadsEscalated > 0) {
    score -= Math.min(stats.threadsEscalated, 5);
    breakdown.push(`Run-history threads escalated: ${stats.threadsEscalated}.`);
  }

  if (stats.carryoverWarningsTriggered > 0) {
    breakdown.push(`Carryover warnings triggered this night: ${stats.carryoverWarningsTriggered}.`);
  }

  if (stats.finaleCommandCosts > 0) {
    breakdown.push(`Finale command resource strain: ${stats.finaleCommandCosts}.`);
  }

  if (stats.carryoverProblemsContained > 0) {
    score += Math.min(stats.carryoverProblemsContained, 3);
  }

  if (stats.deskConsequencesQueued > 0) {
    breakdown.push(`Queued ${stats.deskConsequencesQueued} delayed desk consequence thread(s).`);
  }

  if (stats.deskConsequencesTriggered > 0) {
    score -= Math.min(stats.deskConsequencesTriggered * 2, 8);
    breakdown.push(`${stats.deskConsequencesTriggered} delayed desk consequence(s) surfaced later in-shift.`);
  }

  if (stats.deskConsequencesPrevented > 0) {
    score += Math.min(stats.deskConsequencesPrevented * 2, 8);
    breakdown.push(`Flag monitoring prevented ${stats.deskConsequencesPrevented} delayed escalation(s).`);
  }

  if (stats.deskRareMoments > 0) {
    breakdown.push(`Rare surveillance anomalies surfaced: ${stats.deskRareMoments}.`);
  }

  if (stats.cleanResponses > 0) {
    breakdown.push(`Clean response calls: ${stats.cleanResponses}.`);
  }

  if (stats.forcedCompromises > 0) {
    score -= Math.min(stats.forcedCompromises, 6);
    breakdown.push(`Forced compromises under pressure: ${stats.forcedCompromises}.`);
  }

  if (power >= 85) {
    score += 8;
    breakdown.push(`Power held strong at ${power}%.`);
  } else if (power >= 60) {
    score += 2;
    breakdown.push(`Power remained workable at ${power}%.`);
  } else {
    score -= 8;
    breakdown.push(`Power dropped dangerously low to ${power}%.`);
  }

  if (reputation >= 60) {
    score += 10;
    breakdown.push(`Reputation ended high at ${reputation}.`);
  } else if (reputation >= 50) {
    score += 4;
    breakdown.push(`Reputation stayed steady at ${reputation}.`);
  } else if (reputation >= 40) {
    score -= 2;
    breakdown.push(`Reputation slipped to ${reputation}.`);
  } else {
    score -= 10;
    breakdown.push(`Reputation fell hard to ${reputation}.`);
  }

  if (logs.length > 20 || incidents.length > 8) {
    score -= 4;
    breakdown.push('The shift generated heavy incident pressure.');
  }

  const finalScore = clampScore(score);
  const rating = getRating(finalScore);

  return {
    title: `Night ${night} Complete`,
    text: `You ended Night ${night} with $${money}, ${power}% power, and a reputation of ${reputation}.`,
    summaryLine: `${rating.label} — Score ${finalScore}/100`,
    grade: rating.grade,
    rating: rating.label,
    score: finalScore,
    breakdown: breakdown.slice(0, 8)
  };
}