/**
 * v0.50 — Clarity director: task-first priority from existing simulation state only.
 */

let deskFocusGuestId = null;

export function setDeskFocusGuestId(id) {
  if (id == null || id === '') {
    deskFocusGuestId = null;
    return;
  }
  const n = Number(id);
  deskFocusGuestId = Number.isFinite(n) ? n : null;
}

export function getDeskFocusGuestId() {
  return deskFocusGuestId;
}

/** Returns resolved focus id for queue (null if 2+ guests and none focused). */
export function normalizeDeskFocusGuestIds(guests) {
  const list = Array.isArray(guests) ? guests : [];
  if (!list.length) {
    deskFocusGuestId = null;
    return null;
  }
  const ids = new Set(list.map((g) => g.id));
  if (deskFocusGuestId != null && ids.has(deskFocusGuestId)) {
    return deskFocusGuestId;
  }
  if (list.length === 1) {
    deskFocusGuestId = list[0].id;
    return deskFocusGuestId;
  }
  deskFocusGuestId = null;
  return null;
}

function cameraNeedsAttention(cam, state) {
  const blind = Boolean(cam?.blindMode);
  const status = String(cam?.status || '').toLowerCase();
  const clear = status === 'clear' || status === '';
  const activeEvent = (Array.isArray(state?.activeEvents) ? state.activeEvents : []).some(
    (e) => String(e?.cameraId) === String(cam?.id)
  );
  return blind || activeEvent || !clear;
}

export function isRoomClarityImportant(room) {
  if (!room || room.unlocked === false) return false;
  if (!room.occupied) return false;
  const cond = String(room.condition || '');
  const pending = Boolean(room?.serviceState?.pendingRequest);
  const chain = Number(room?.chainPressure || 0) >= 2;
  const watched = Boolean(room?.lockedDown) || Boolean(room?.powerCut);
  return pending || chain || watched || cond === 'Critical' || cond === 'Hostile' || cond === 'Tense';
}

function zoneIsHot(space) {
  const score = Number(space?.pressureScore || 0);
  const sev = String(space?.severity || '').toLowerCase();
  return score >= 2 || sev === 'high' || sev === 'medium';
}

function simpleRecFromGuest(guest) {
  const pol = String(guest?.policyRecommendation || 'Approve').toLowerCase();
  if (pol.includes('reject') || pol.includes('deny')) return { band: 'reject', label: 'Reject lean' };
  if (pol.includes('flag') || pol.includes('caution') || String(guest?.riskLevel || '').toLowerCase() === 'high') {
    return { band: 'caution', label: 'Caution' };
  }
  return { band: 'approve', label: 'Approve lean' };
}

export function deriveClarityModel(state, context = {}) {
  const activePanelId = String(context.activePanelId || 'frontdesk-panel');
  const night = Math.max(1, Number(state?.night || 1));
  const guests = Array.isArray(state?.guests) ? state.guests : [];
  const rooms = Array.isArray(state?.rooms) ? state.rooms : [];
  const cameras = Array.isArray(state?.cameras) ? state.cameras : [];
  const sharedSpaces = Array.isArray(state?.sharedSpaces) ? state.sharedSpaces : [];
  const power = Number(state?.power ?? 100);
  const analog = state?.analog || null;
  const blackout = state?.blackoutState?.level || 'none';
  const emergency = Boolean(state?.emergencyNight?.active);

  const resolvedFocus = normalizeDeskFocusGuestIds(guests);
  const stickyGuestId = guests.length >= 2 && resolvedFocus == null ? null : resolvedFocus;

  const notableCameras = cameras.filter((c) => cameraNeedsAttention(c, state));
  const notableCameraIds = notableCameras.map((c) => c.id);
  const importantRooms = rooms.filter(isRoomClarityImportant);
  const importantRoomIds = importantRooms.map((r) => r.id);
  const hotZones = sharedSpaces.filter(zoneIsHot);
  const hotZoneIds = hotZones.map((z) => z.zoneId);
  const quietZones = sharedSpaces.filter((z) => !zoneIsHot(z));

  const urgentPower = power <= 32 || (blackout && blackout !== 'none') || emergency;
  const analogLoad = analog ? Number(analog.load || 0) > Number(analog.budget || 1) : false;

  let type = 'systems';
  let urgency = 'low';
  let headline = 'Systems steady';
  let explain = 'No single subsystem is screaming — stay ahead of small drift.';
  let recommendedPanel = 'frontdesk-panel';
  let recommendedAction = 'Scan tabs when you are ready; the desk is home base.';
  let consequenceHint = 'Low immediate penalty for waiting, but time still advances.';
  let primaryCta = { label: 'Open Front Desk', panelId: 'frontdesk-panel' };
  let secondaryCta = null;

  if (guests.length) {
    type = 'desk';
    const hotGuest = guests.find((g) => String(g?.riskLevel || '').toLowerCase() === 'high') || guests[0];
    const rec = simpleRecFromGuest(hotGuest);
    urgency =
      String(hotGuest?.riskLevel || '').toLowerCase() === 'high' || Number(hotGuest?.deceptionSignal || 0) >= 2
        ? 'high'
        : 'normal';
    headline = `${guests.length} guest${guests.length > 1 ? 's' : ''} waiting`;
    explain = `${hotGuest?.name || 'Guest'} reads ${rec.label.toLowerCase()} — verify ID before releasing a room.`;
    recommendedAction = 'Inspect ID if unread, then choose check-in, flag, or reject.';
    consequenceHint = 'Wrong release raises room pressure; over-rejecting costs reputation.';
    primaryCta = { label: 'Handle desk', panelId: 'frontdesk-panel' };
    if (importantRooms.length) {
      secondaryCta = { label: `Rooms need care (${importantRooms.length})`, panelId: 'frontdesk-panel' };
    }
    recommendedPanel = 'frontdesk-panel';
  } else if (urgentPower || analogLoad) {
    type = 'systems';
    urgency = urgentPower ? 'high' : 'normal';
    headline = urgentPower ? 'Power reserve is thin' : 'Grid load is tight';
    explain = urgentPower
      ? 'Low reserve makes scans and interventions expensive — stabilize before stacking actions.'
      : 'Breaker load is brushing the safe budget; trim optional draws.';
    recommendedAction = urgentPower ? 'Open Power — consider Emergency Restore before another heavy spend.' : 'Open Power and ease breaker load or neon draw.';
    consequenceHint = 'Blackouts and blind cameras spike chain pressure when power collapses.';
    primaryCta = { label: 'Open Power', panelId: 'power-panel' };
    recommendedPanel = 'power-panel';
    if (notableCameras.length) {
      secondaryCta = { label: 'Check hot feeds', panelId: 'cameras-panel' };
    }
  } else if (importantRooms.length) {
    type = 'room';
    urgency = importantRooms.some((r) => String(r.condition || '') === 'Critical' || String(r.condition || '') === 'Hostile')
      ? 'high'
      : 'normal';
    headline = `${importantRooms.length} occupied room${importantRooms.length > 1 ? 's' : ''} need attention`;
    explain = 'Service calls, tension, or chain pressure are louder than a quiet floor.';
    recommendedAction = 'Open Front Desk room list or respond to the highest urgency call first.';
    consequenceHint = 'Ignored calls spread into shared-space and camera strain.';
    primaryCta = { label: 'Review rooms', panelId: 'frontdesk-panel' };
    recommendedPanel = 'frontdesk-panel';
  } else if (hotZones.length) {
    type = 'zone';
    urgency = hotZones.some((z) => Number(z.pressureScore || 0) >= 4) ? 'high' : 'normal';
    headline = `${hotZones.length} shared zone${hotZones.length > 1 ? 's' : ''} under pressure`;
    explain = hotZones[0]?.activeIssue || 'Hallway and lot pressure can route into rooms.';
    recommendedAction = 'Contain the hottest zone before it couples with desk or room crises.';
    consequenceHint = 'Delaying zone response often raises night-wide spill.';
    primaryCta = { label: 'Open Shared Spaces', panelId: 'spaces-panel' };
    recommendedPanel = 'spaces-panel';
  } else if (notableCameras.length) {
    type = 'camera';
    urgency = notableCameras.some((c) => Boolean(c?.blindMode)) ? 'high' : 'normal';
    headline = `${notableCameras.length} camera feed${notableCameras.length > 1 ? 's' : ''} need eyes`;
    explain = 'Unresolved anomalies or blind feeds can cascade into room incidents.';
    recommendedAction = 'Investigate the flagged feed or restore blind hardware if sabotaged.';
    consequenceHint = 'Each unresolved tick risks spillover into reputation and room control.';
    primaryCta = { label: 'Open Cameras', panelId: 'cameras-panel' };
    recommendedPanel = 'cameras-panel';
  } else {
    headline = 'Calm surface, fragile clock';
    explain = 'Nothing is flashing — use the window to prep power, skim feeds, or end segments early if safe.';
    recommendedAction = 'Advance prep: light scan, room courtesy checks, or hold until the next arrival.';
    primaryCta = { label: 'Call next arrival', panelId: 'frontdesk-panel' };
    recommendedPanel = 'frontdesk-panel';
  }

  if (emergency && type !== 'zone') {
    secondaryCta = secondaryCta || { label: 'Emergency board', panelId: 'spaces-panel' };
  }

  const compactSurfaceState = {
    cameraDigestIds: notableCameraIds,
    camerasCalm: notableCameras.length === 0,
    cameraWallDefaultOpen: night >= 3 || notableCameras.length > 0,
    roomImportantIds: importantRoomIds,
    roomsShowQuietDefault: night >= 3,
    zoneHotIds: hotZoneIds,
    zoneQuietCount: quietZones.length,
    /* Reserved: true would hide non-hot cards; only enable when a summary row exists. */
    zonesAllQuiet: false,
    softNight: night <= 2,
    breakerDefaultOpen: night >= 3 || urgentPower || analogLoad,
    activePanelId
  };

  return {
    currentPriority: {
      type,
      urgency,
      headline,
      explain,
      recommendedAction,
      consequenceHint,
      primaryCta,
      secondaryCta,
      activePanelId
    },
    recommendedAction,
    recommendedPanel,
    deskFocusGuestId: resolvedFocus,
    stickyGuestId,
    compactSurfaceState
  };
}
