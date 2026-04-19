import { buildShiftOutcome } from './scoring.js';
import { getDarkContractById, isEndlessMode, darkWebContractsEnabled } from './endlessShift.js';

export function buildNightSummary(state) {
  const base = buildShiftOutcome({
    night: state.night,
    money: state.money,
    power: state.power,
    reputation: state.reputation,
    logs: state.logs,
    incidents: state.incidents,
    shiftStats: state.shiftStats
  });
  const crisis = state?.crisisNight || {};
  const blackoutLevel = String(state?.crisisEscalation?.blackoutLevel || 'none');
  const hallwayThreat = Number(state?.crisisEscalation?.hallwayThreatLevel || 0);
  const overlapPressure = Number(state?.crisisEscalation?.overlapPressureLevel || 0);
  const signature = state?.signatureNight || {};
  const identity = [];
  const carriedRooms = (state?.rooms || []).filter((room) => room?.occupiedBy).length;
  const rememberedRooms = (state?.rooms || []).filter((room) => Number(room?.memory?.incidentsSeen || 0) >= 2).length;
  if (crisis.active && crisis.title) {
    identity.push(`The night developed under ${crisis.title.toLowerCase()}, which made small errors spread faster than usual.`);
  }
  if (crisis.trueCrisisNight) {
    identity.push(
      `Collapse-class convergence: ${crisis.collapseReadout || 'multiple motel systems overlapped until the desk could not pretend the building was still partitioned.'}`
    );
  } else if (Number(crisis.convergenceTier || 0) >= 3 && crisis.active) {
    identity.push(
      `Late-campaign convergence (tier ${crisis.convergenceTier}) threaded separate hazards into one readable strain.`
    );
  }
  if (signature?.active && signature?.title) {
    identity.push(`${signature.title} gave the shift a boss-like structure, with pressure advancing in readable turns instead of one isolated spike.`);
  }
  if (crisis.kind === 'partial-blackout' || crisis.kind === 'utility-fragility') {
    identity.push('Infrastructure fragility shaped the whole shift, with power confidence and room control repeatedly threatening to collapse together.');
  }
  if (blackoutLevel === 'full') {
    identity.push('Blackout pressure reached a full hostile state, dragging cameras, shared-space confidence, and occupied-room control down at the same time.');
  } else if (blackoutLevel === 'partial') {
    identity.push('Partial blackout pressure strained the motel throughout the night and made every active room feel less reliable.');
  }
  if (Array.isArray(state?.incidents) && state.incidents.some((incident) => String(incident?.type || '').toLowerCase().includes('hallway') || String(incident?.type || '').toLowerCase().includes('breaker') || String(incident?.type || '').toLowerCase().includes('parking'))) {
    identity.push('At least one signature incident turned routine pressure into a memorable motel-wide rupture.');
  }
  if (hallwayThreat >= 2 || overlapPressure >= 2) {
    identity.push('Threat started moving through shared spaces, making the motel feel connected and hostile instead of room-by-room isolated.');
  }
  if (carriedRooms > 0) {
    identity.push(`${carriedRooms} occupied room${carriedRooms === 1 ? '' : 's'} were carried forward, so the shift began with continuity pressure already active.`);
  }
  if (rememberedRooms > 0) {
    identity.push(`${rememberedRooms} room${rememberedRooms === 1 ? '' : 's'} carried remembered pressure, making the property feel less reset and more haunted by prior decisions.`);
  }
  if (Number(state?.shiftStats?.recurringGuestsHandled || 0) > 0 || Number(state?.shiftStats?.recurringGuestsMissed || 0) > 0) {
    identity.push('Returning guest history shaped the tone of the shift more directly than a clean first-time desk flow.');
  }
  if (Number(state?.shiftStats?.roomCallsTriggered || 0) > 0) {
    identity.push(`Occupied rooms stayed active: ${state.shiftStats.roomCallsTriggered} room call${state.shiftStats.roomCallsTriggered === 1 ? '' : 's'} reached the desk during the shift.`);
  }
  if (Number(state?.shiftStats?.roomReassignments || 0) > 0) {
    identity.push('Room reassignment changed the flow of the night, buying control in one place at the cost of visible disruption elsewhere.');
  }
  if (Number(state?.shiftStats?.roomCallsMissed || 0) > 0) {
    identity.push('At least one occupied-room service failure fed back into the motel’s wider pressure instead of staying contained.');
  }
  if (Number(state?.shiftStats?.overManagementPenalties || 0) > 0) {
    identity.push('Over-management hurt the shift: unnecessary interventions irritated guests and created social fallout instead of safety.');
  }
  if (Number(state?.shiftStats?.smartRestraintMoments || 0) > 0) {
    identity.push('Smart restraint mattered: some rooms improved because the desk resisted the urge to escalate them unnecessarily.');
  }
  if (Number(state?.shiftStats?.falseAlarmReads || 0) > 0) {
    identity.push('The desk correctly read at least one false alarm and avoided turning anxiety into a bigger problem.');
  }
  if (Number(state?.shiftStats?.realThreatsMissed || 0) > 0) {
    identity.push('At least one real threat was handled too softly or too late, and the consequences spread outward.');
  }
  if (Number(state?.shiftStats?.socialFalloutEvents || 0) > 0) {
    identity.push('Social fallout spread beyond one room, proving the motel reacts to judgment mistakes as a shared environment.');
  }
  if (Number(state?.shiftStats?.roomCallsHandled || 0) > 0) {
    identity.push('Occupied-room calls became part of the night rhythm instead of staying as background pressure.');
  }
  const analogLog = Array.isArray(state?.analogSurvival?.analogNightLog) ? state.analogSurvival.analogNightLog.filter(Boolean) : [];
  if (analogLog.length) {
    identity.push(`Physical grid choices mattered: ${analogLog.slice(-2).join(' · ')}`);
  }
  const fatigueEnd = Number(state?.analogSurvival?.operatorFatigue || 0);
  if (fatigueEnd >= 55) {
    identity.push('Operator fatigue stacked high enough that the shift felt personally costly, not just strategically tense.');
  }
  const forensicLog = Array.isArray(state?.forensicNoir?.shiftLog) ? state.forensicNoir.shiftLog.filter(Boolean) : [];
  if (forensicLog.length) {
    identity.push(`Forensic trace: ${forensicLog.slice(-2).join(' · ')}`);
  }
  const uvN = Number(state?.forensicNoir?.uvConfirmationsThisShift || 0);
  if (uvN >= 2) {
    identity.push('UV/blacklight work tied multiple physical threads together — the desk stopped pretending everything was routine paper.');
  }
  const sb = Number(state?.shiftStats?.switchboardListens || 0);
  if (sb > 0) {
    const sour = Number(state?.shiftStats?.switchboardBadIntel || 0) + Number(state?.shiftStats?.switchboardLineNotices || 0);
    identity.push(
      `Switchboard listens: ${sb} tap${sb === 1 ? '' : 's'} tonight — intel had weight${sour > 0 ? ', and at least one line fought back' : ''}.`
    );
  }
  if (sb >= 2 && uvN >= 1) {
    identity.push('UV reads and trunk-line work crossed tonight — the desk treated voices and reactive paper as one investigation.');
  }
  if (Number(state?.shiftStats?.operatorHallucinationsTriggered || 0) > 0) {
    identity.push('Peak strain bent perception once — the log shows a corrected misread, not a lasting lie in the systems.');
  }
  if (Number(state?.shiftStats?.operatorQuartersFindings || 0) > 0) {
    identity.push('The operator quarters monitor delivered a physical strip, not just dread in an empty feed.');
  }
  const lockerItems = Array.isArray(state?.evidenceLocker?.items) ? state.evidenceLocker.items : [];
  const uvEvidence = lockerItems.filter((it) => it?.uvConfirmed).length;
  const tapeEvidence = lockerItems.filter((it) => it?.tapeSecured).length;
  if (uvEvidence >= 2 || tapeEvidence >= 2) {
    identity.push(
      'The evidence spine is no longer abstract: UV-confirmed and tape-backed strips mean outside actors can feel how much you actually know.'
    );
  }
  if (state?.emergencyNight?.active || Number(state?.emergencyState?.commandHistory?.length || 0) > 0) {
    identity.push('The shift crossed into command-state management, where containment choices mattered as much as basic desk reads.');
  }

  const darkC = darkWebContractsEnabled(state) ? getDarkContractById(state?.endlessRun?.selectedDarkContractId) : null;
  if (darkC?.codename) {
    identity.push(`Anonymous contract ${darkC.codename} framed the economy: ${darkC.headline}.`);
  }
  if (isEndlessMode(state)) {
    identity.push(
      `Endless shift ledger: endurance ${Math.round(Number(state?.endlessRun?.survivalScore || 0))} • auditor passes ${Number(state?.endlessRun?.auditorPasses || 0)} / partials ${Number(state?.endlessRun?.auditorPartials || 0)} / severe ${Number(state?.endlessRun?.auditorFails || 0)}.`
    );
  }
  const audBand = String(state?.dawnAuditor?.outcomeBand || '');
  if (audBand === 'clean') {
    identity.push('Dawn inspection: outside clipboard walk closed clean — visible exposure stayed under their threshold.');
  } else if (audBand === 'partial') {
    identity.push('Dawn inspection: partial outside hit — fines and town memory, but not a full breach narrative.');
  } else if (audBand === 'severe') {
    identity.push('Dawn inspection: severe read — traces, optics, or paperwork looked too compromised to hand-wave.');
  }

  const rw = state?.roadWorld;
  if (rw && typeof rw === 'object') {
    const heat = Number(rw.roadHeat || 0);
    if (heat >= 4) {
      identity.push(`Route heat held around ${heat}/10 — the road outside is learning this motel's silhouette.`);
    }
    const tips = Number(state?.shiftStats?.roadIntelTipsShift || 0);
    const wrong = Number(state?.shiftStats?.roadIntelWrong || 0);
    if (tips > 0) {
      identity.push(
        `Drifter wire surfaced ${tips} lead${tips === 1 ? '' : 's'} tonight${wrong > 0 ? `; ${wrong} read cold under scrutiny` : ''}.`
      );
    }
    if (Number(state?.shiftStats?.houndSilenceShift || 0) > 0) {
      identity.push('The lot hound went unnervingly quiet — a predator-quiet read, not comfort.');
    } else if (Number(state?.shiftStats?.houndSignalsShift || 0) > 0) {
      identity.push('The stray on the asphalt carried warnings the glass could not quite decode.');
    }
    if (Number(state?.shiftStats?.drifterBurns || 0) > 0) {
      identity.push('A road watcher line burned — police pressure or betrayal snapped outside intelligence.');
    }
  }

  let branchOutcome = 'Contained, but ordinary.';
  if (Number(state?.shiftStats?.policyBroken || 0) >= 2 && Number(state?.money || 0) >= 150) {
    branchOutcome = 'Profitable, but socially poisoned.';
  } else if (Number(state?.factions?.ownership || 0) >= 4 && Number(state?.shiftStats?.harshDeskActions || 0) >= 2) {
    branchOutcome = 'Calm, but morally ugly.';
  } else if (Number(state?.shiftStats?.policyBroken || 0) >= 1 && Number(state?.money || 0) >= 210) {
    branchOutcome = 'Profitable, but compromised.';
  } else if (Number(state?.shiftStats?.harshDeskActions || 0) >= 2 && Number(state?.shiftStats?.policyFollowed || 0) >= 1) {
    branchOutcome = 'Calm, but harsh.';
  } else if (Number(state?.factions?.locals || 0) <= -4 || Number(state?.shiftStats?.socialFalloutEvents || 0) >= 2) {
    branchOutcome = 'Socially poisoned motel.';
  } else if (Number(state?.shiftStats?.smartRestraintMoments || 0) >= 2 && Number(state?.shiftStats?.strongContainmentActions || 0) >= 1) {
    branchOutcome = 'Unstable, but disciplined.';
  } else if (Number(state?.shiftStats?.realThreatsMissed || 0) >= 1) {
    branchOutcome = 'Wrong guest contained too late.';
  } else if (blackoutLevel === 'full' || overlapPressure >= 3) {
    branchOutcome = 'Unstable, but survived.';
  } else if (Number(state?.shiftStats?.smartRestraintMoments || 0) >= 2 && Number(state?.shiftStats?.overManagementPenalties || 0) === 0) {
    branchOutcome = 'Barely contained, but disciplined.';
  }

  return {
    ...base,
    text: [
      base.text,
      ...(identity.length ? [identity[0]] : [])
    ].filter(Boolean).join(' '),
    breakdown: [
      ...(Array.isArray(base.breakdown) ? base.breakdown : []),
      ...identity.slice(0, 2),
      `Night outcome: ${branchOutcome}`
    ],
    branchOutcome
  };
}
