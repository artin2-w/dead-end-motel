export function buildOutcomeFlavor(state, summary) {
  const score = summary?.score ?? 0;
  const scenarioLabel = state?.activeScenario?.label || 'Unknown Shift';
  const overrides =
    state?.shiftStats?.policyOverrides ??
    state?.shiftStats?.policyOverrideCount ??
    0;
  const incidents =
    state?.shiftStats?.incidentReviewCount ??
    state?.shiftStats?.incidentReviews ??
    0;
  const unresolvedScenes = state?.shiftStats?.unresolvedLocationScenes ?? 0;
  const escalatedScenes = state?.shiftStats?.escalatedLocationIssues ?? 0;
  const strongContainment = state?.shiftStats?.strongContainmentActions ?? 0;
  const weakSceneDecisions = state?.shiftStats?.weakSceneDecisions ?? 0;
  const powerHeavyResponses = state?.shiftStats?.powerHeavyResponses ?? 0;
  const specialHandled = state?.shiftStats?.specialGuestsHandled ?? 0;
  const specialMissed = state?.shiftStats?.specialGuestsMissed ?? 0;
  const nightEventsResolved = state?.shiftStats?.nightEventsResolved ?? 0;
  const nightEventsMissed = state?.shiftStats?.nightEventsMissed ?? 0;
  const threadsEscalated = state?.shiftStats?.threadsEscalated ?? 0;
  const threadsAdvancedCleanly = state?.shiftStats?.threadsAdvancedCleanly ?? 0;
  const carryoverContained = state?.shiftStats?.carryoverProblemsContained ?? 0;
  const carryoverWarnings = state?.shiftStats?.carryoverWarningsTriggered ?? 0;
  const deskQueued = state?.shiftStats?.deskConsequencesQueued ?? 0;
  const deskTriggered = state?.shiftStats?.deskConsequencesTriggered ?? 0;
  const deskPrevented = state?.shiftStats?.deskConsequencesPrevented ?? 0;
  const deskRare = state?.shiftStats?.deskRareMoments ?? 0;
  const checkedIn = state?.shiftStats?.checkedIn ?? 0;
  const flagged = state?.shiftStats?.flagged ?? 0;
  const rejected = state?.shiftStats?.rejected ?? 0;
  const reputation = Number(state?.reputation ?? 50);
  const threadLines = [];

  let title = 'Uneasy Survival';
  let note =
    'The motel stayed open, but the night left behind more tension than comfort.';

  if (score >= 90) {
    title = 'Controlled Dawn';
    note =
      'The shift was held together with unusual precision, leaving very little room for chaos.';
  } else if (score >= 75) {
    title = 'Hard-Fought Dawn';
    note =
      'The motel made it to morning through active control, pressure management, and a few difficult calls.';
  } else if (score >= 60) {
    title = 'Uneasy Survival';
    note =
      'The shift was survivable, but several parts of the motel never felt fully under control.';
  } else {
    title = 'Barely Held Together';
    note =
      'The motel reached dawn in unstable condition, and another hour could have pushed it over the edge.';
  }

  if (overrides >= 2) {
    note += ' Policy overrides played a visible role in how the night unfolded.';
  }

  if (incidents >= 2) {
    note += ' Incident pressure remained a defining part of the shift.';
  }

  if (strongContainment >= 3) {
    note += ' Strong location containment choices kept key motel zones under control.';
  }

  if (unresolvedScenes >= 2 || escalatedScenes >= 2) {
    note += ' Several location issues carried through the night and left lingering risk.';
  }

  if (weakSceneDecisions >= 2) {
    note += ' Delayed or weak scene responses noticeably amplified surveillance pressure.';
  }

  if (powerHeavyResponses >= 3) {
    note += ' Crisis management leaned heavily on high-draw power responses.';
  }

  if (deskQueued > 0) {
    note += ` Desk decisions created ${deskQueued} delayed thread${deskQueued === 1 ? '' : 's'} that had to be managed later.`;
  }

  if (deskTriggered > 0) {
    note += ` ${deskTriggered} delayed desk consequence${deskTriggered === 1 ? '' : 's'} surfaced during the same night.`;
  }

  if (deskPrevented > 0) {
    note += ` Early flag calls prevented ${deskPrevented} delayed escalation${deskPrevented === 1 ? '' : 's'}.`;
  }

  if (deskRare > 0) {
    note += ` Rare repeating surveillance moment${deskRare === 1 ? '' : 's'} added story pressure.`;
  }

  if (checkedIn >= 4 && flagged === 0 && deskTriggered >= 1) {
    note += ' Operator pattern: too trusting at the desk, with avoidable follow-up strain.';
  } else if (flagged >= Math.max(2, Math.floor(checkedIn / 2)) && deskPrevented >= deskTriggered) {
    note += ' Operator pattern: cautious and observant, often containing risk before it spread.';
  } else if (rejected >= 3 && reputation < 50) {
    note += ' Operator pattern: hardline and defensive, safer in spots but costly to public confidence.';
  }

  if (specialHandled > 0) {
    note += ` Handled ${specialHandled} special guest encounter${specialHandled === 1 ? '' : 's'} before escalation.`;
  }

  if (nightEventsResolved > 0) {
    note += ` Resolved ${nightEventsResolved} active shift event${nightEventsResolved === 1 ? '' : 's'} mid-night.`;
  }

  if (specialMissed > 0 || nightEventsMissed > 0) {
    note += ' Unresolved late-shift pressure carried into final reporting.';
  }

  if (threadsEscalated > 0) {
    threadLines.push(`Ongoing thread pressure worsened in ${threadsEscalated} channel(s).`);
  }
  if (threadsAdvancedCleanly > 0) {
    threadLines.push(`You stabilized ${threadsAdvancedCleanly} recurring thread(s) tonight.`);
  }
  if (carryoverContained > 0) {
    threadLines.push('Existing carryover pressure was contained before dawn.');
  }
  if (carryoverWarnings > 0) {
    threadLines.push(`Carryover alerts remained active: ${carryoverWarnings} warning cue(s).`);
  }
  if (!threadLines.length && Array.isArray(state?.storyMemory?.lastNightSummary)) {
    threadLines.push(...state.storyMemory.lastNightSummary.slice(0, 3));
  }

  return {
    title,
    note,
    scenarioLabel,
    threadLines: threadLines.slice(0, 3)
  };
}