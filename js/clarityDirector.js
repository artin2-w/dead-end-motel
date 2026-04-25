/**
 * v0.51 — Clarity director: premium control-surface signals from existing simulation state only.
 * Presentation flags (drawer/tool toggles) are module-local — not persisted to save.
 */

let deskFocusGuestId = null;

/** Session UI toggles — safe defaults, no save keys */
let deskToolsOpen = false;
let sharedBoardUserOpen = false;
let quietRoomsCollapsed = true;
let menuRunSetupCollapsed = false;
let menuDestructiveCollapsed = true;

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

export function setDeskToolsOpen(open) {
  deskToolsOpen = Boolean(open);
}

export function setSharedBoardUserOpen(open) {
  sharedBoardUserOpen = Boolean(open);
}

export function setQuietRoomsCollapsed(collapsed) {
  quietRoomsCollapsed = Boolean(collapsed);
}

export function setMenuRunSetupCollapsed(collapsed) {
  menuRunSetupCollapsed = Boolean(collapsed);
}

export function setMenuDestructiveCollapsed(collapsed) {
  menuDestructiveCollapsed = Boolean(collapsed);
}

export function getQuietRoomsCollapsed() {
  return quietRoomsCollapsed;
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

/** Hot strip: tense / watch / unstable / chain / important / watched power */
export function isRoomPresentationHot(room) {
  if (!room || room.unlocked === false) return false;
  if (!room.occupied) return false;
  if (isRoomClarityImportant(room)) return true;
  const c = String(room.condition || '').toLowerCase();
  return c === 'watch' || c === 'unstable' || c === 'tense';
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

function modeLabel(mode) {
  const m = {
    intake: 'Intake mode',
    monitor: 'Monitor mode',
    crisis: 'Crisis mode',
    cleanup: 'Cleanup mode',
    dawn: 'Dawn mode'
  };
  return m[mode] || 'Monitor mode';
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
  const shiftElapsed = Number(state?.shiftElapsedMinutes || 0);
  const crisisNight = state?.crisisNight || {};
  const convergenceHot = Boolean(crisisNight.trueCrisisNight) || Number(crisisNight.convergenceTier || 0) >= 3;
  const da = state?.dawnAuditor || {};
  const dawnAuditorActive = Boolean(da.active);
  const dawnCleanupWindow = Boolean(da.cleanupWindow);
  const finaleTrue = Boolean(state?.finaleDirector?.trueFinalNight);
  const onboardingUi = context.onboardingUi || null;
  const hintPanelId = onboardingUi?.hintCard?.panelId || onboardingUi?.highlightPanelId || null;

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
  const powerCritical = power <= 25;
  const hostileRoom = importantRooms.some(
    (r) => String(r.condition || '') === 'Critical' || String(r.condition || '') === 'Hostile'
  );
  const crisisElevated =
    emergency ||
    powerCritical ||
    hostileRoom ||
    hotZones.length >= 3 ||
    notableCameras.length >= 4 ||
    convergenceHot;

  const roomHotIds = rooms.filter((r) => isRoomPresentationHot(r)).map((r) => r.id);
  const roomCalmIds = rooms
    .filter((r) => {
      if (!r) return false;
      if (r.unlocked === false) return true;
      if (!r.occupied) return true;
      return false;
    })
    .map((r) => r.id);

  const lateNightSurveillance = shiftElapsed >= 180;
  const blackoutCameraRelevant = blackout && blackout !== 'none';
  const onboardingNeedsCameraWall = Boolean(onboardingUi?.hintCard) && hintPanelId === 'cameras-panel';

  let type = 'systems';
  let urgency = 'low';
  let headline = 'Systems steady';
  let explain = 'No single subsystem is screaming — stay ahead of small drift.';
  let recommendedPanel = 'frontdesk-panel';
  let recommendedAction = 'Scan tabs when you are ready; the desk is home base.';
  let consequenceHint = 'Low immediate penalty for waiting, but time still advances.';
  let primaryCta = { label: 'Open Front Desk', panelId: 'frontdesk-panel' };
  let secondaryCta = null;
  let navigationCta = null;

  if (guests.length && !crisisElevated) {
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
    navigationCta = notableCameras.length ? { label: 'Skim cameras', panelId: 'cameras-panel' } : null;
  } else if (urgentPower || analogLoad) {
    type = 'systems';
    urgency = urgentPower ? 'high' : 'normal';
    headline = urgentPower ? 'Power reserve is thin' : 'Grid load is tight';
    explain = urgentPower
      ? 'Low reserve makes scans and interventions expensive — stabilize before stacking actions.'
      : 'Breaker load is brushing the safe budget; trim optional draws.';
    recommendedAction = urgentPower
      ? 'Open Power — consider Emergency Restore before another heavy spend.'
      : 'Open Power and ease breaker load or neon draw.';
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

  if (guests.length && crisisElevated) {
    type = 'desk';
    urgency = 'high';
    headline = `${guests.length} guest${guests.length > 1 ? 's' : ''} at glass — crisis pressure is co‑firing`;
    explain = 'Desk still needs a clean decision while wider systems are unstable.';
    recommendedAction = 'Stabilize the loudest crisis vector, then return to ID + policy before room release.';
    consequenceHint = 'Split attention raises miss-risk on both desk and floor.';
    if (urgentPower) {
      primaryCta = { label: 'Open Power', panelId: 'power-panel' };
      recommendedPanel = 'power-panel';
    } else {
      primaryCta = { label: 'Handle desk', panelId: 'frontdesk-panel' };
      recommendedPanel = 'frontdesk-panel';
    }
  }

  /* Modes: Dawn > Cleanup > Crisis > Intake > Monitor */
  let mode = 'monitor';
  if (finaleTrue || dawnAuditorActive || shiftElapsed >= 420) {
    mode = 'dawn';
  } else if (dawnCleanupWindow) {
    mode = 'cleanup';
  } else if (crisisElevated) {
    mode = 'crisis';
  } else if (guests.length) {
    mode = 'intake';
  }

  const cameraPrimary = type === 'camera' || recommendedPanel === 'cameras-panel';
  const cameraWallDefaultOpen =
    notableCameras.length > 0 ||
    blackoutCameraRelevant ||
    cameraPrimary ||
    Boolean(onboardingNeedsCameraWall) ||
    lateNightSurveillance;

  const zonesAllQuiet = hotZones.length === 0;
  const sharedBoardForceOpen = hotZones.length >= 3;
  const sharedBoardOpen = sharedBoardForceOpen || sharedBoardUserOpen;

  const breakerDefaultOpen = urgentPower || analogLoad || power <= 40;

  const compactSurfaceState = {
    cameraDigestIds: notableCameraIds,
    camerasCalm: notableCameras.length === 0,
    cameraWallDefaultOpen,
    roomImportantIds: importantRoomIds,
    roomHotIds,
    roomCalmIds,
    roomsShowQuietDefault: night >= 3,
    zoneHotIds: hotZoneIds,
    zoneQuietCount: quietZones.length,
    zonesAllQuiet,
    sharedBoardForceOpen,
    zoneHotCount: hotZones.length,
    softNight: night <= 2,
    breakerDefaultOpen,
    activePanelId
  };

  const whyItMatters = explain;

  return {
    mode,
    modeLabel: modeLabel(mode),
    currentPriority: {
      type,
      urgency,
      mode,
      modeLabel: modeLabel(mode),
      headline,
      explain,
      whyItMatters,
      recommendedAction,
      consequenceHint,
      primaryCta,
      secondaryCta,
      navigationCta,
      recommendedPanel,
      activePanelId
    },
    recommendedAction,
    recommendedPanel,
    deskFocusGuestId: resolvedFocus,
    stickyGuestId,
    deskToolsOpen,
    cameraWallOpen: cameraWallDefaultOpen,
    breakerDetailOpen: breakerDefaultOpen,
    sharedBoardOpen,
    sharedBoardUserOpen,
    sharedBoardForceOpen,
    roomHotIds,
    roomCalmIds,
    quietRoomsCollapsed,
    menuRunSetupCollapsed,
    menuDestructiveCollapsed,
    compactSurfaceState
  };
}
