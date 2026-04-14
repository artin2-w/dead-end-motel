import { buildShiftOutcome } from './scoring.js';

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
  const identity = [];
  const carriedRooms = (state?.rooms || []).filter((room) => room?.occupiedBy).length;
  const rememberedRooms = (state?.rooms || []).filter((room) => Number(room?.memory?.incidentsSeen || 0) >= 2).length;
  if (crisis.active && crisis.title) {
    identity.push(`The night developed under ${crisis.title.toLowerCase()}, which made small errors spread faster than usual.`);
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

  return {
    ...base,
    text: [
      base.text,
      ...(identity.length ? [identity[0]] : [])
    ].filter(Boolean).join(' '),
    breakdown: [
      ...(Array.isArray(base.breakdown) ? base.breakdown : []),
      ...identity.slice(0, 2)
    ]
  };
}
