const ONBOARDING_STORAGE_KEY = 'dead-end-motel-onboarding-v1';

const PANEL_INTRO_COPY = {
  'frontdesk-panel': {
    title: 'Front Desk',
    body: 'Assess guests and make your first call: Check In, Flag, or Reject.'
  },
  'cameras-panel': {
    title: 'Cameras',
    body: 'Scan for anomalies, then investigate risky zones before pressure spikes.'
  },
  'power-panel': {
    title: 'Power',
    body: 'Power keeps every system alive. Restore is safer, reroute is riskier.'
  },
  'report-panel': {
    title: 'Report',
    body: 'Review incidents, dispatch staff, and close the shift once dawn arrives.'
  },
  'night-prep-screen': {
    title: 'Prep',
    body: 'Spend run money between nights on upgrades that shape future shifts.'
  }
};

const GLOSSARY_TERMS = [
  { term: 'Risk', meaning: 'How likely a guest is to trigger trouble once checked in.' },
  { term: 'Policy', meaning: 'Recommended desk action for this guest profile.' },
  { term: 'Flagged', meaning: 'Guest marked for monitoring; safer than blind check-in.' },
  { term: 'Room Condition', meaning: 'Stability of occupied rooms: Stable, Watch, or Critical.' },
  { term: 'Chain Pressure', meaning: 'Hidden pressure linking incidents across rooms.' },
  { term: 'Reputation', meaning: 'Public confidence in your shift decisions.' },
  { term: 'Power', meaning: 'Shared reserve consumed by scans, investigations, and emergency actions.' },
  { term: 'Special Guests', meaning: 'Guests with encounter choices and long-tail consequences.' },
  { term: 'Night Events', meaning: 'Shift-wide incidents requiring a response choice.' },
  { term: 'Doctrine', meaning: 'Your evolving management identity; it changes pressure flavor and response texture.' },
  { term: 'Faction Climate', meaning: 'How guests, staff, locals, authorities, and ownership currently view your motel.' },
  { term: 'Story Thread', meaning: 'Recurring run tension that can escalate, stabilize, or carry into later nights.' },
  { term: 'False Calm', meaning: 'A low-noise window that can hide synchronized pressure movement.' },
  { term: 'Rare Moment', meaning: 'Uncommon content beat intended to make a run feel uniquely memorable.' },
  { term: 'Finale Night', meaning: 'Late-run pressure spike where containment decisions matter most.' },
  { term: 'Archive Points', meaning: 'Meta currency earned across runs.' },
  { term: 'Meta Perks', meaning: 'Optional run-start boosts unlocked from archive progression.' }
];

function createDefaultProgress() {
  return {
    welcome: false,
    spawnGuest: false,
    deskDecision: false,
    roomStatus: false,
    cameraVisit: false,
    powerVisit: false,
    reportVisit: false,
    surviveDawn: false
  };
}

export function createDefaultOnboardingState() {
  return {
    version: 1,
    tutorialEnabled: true,
    firstRunStarted: false,
    firstRunCompleted: false,
    runModePreference: 'guided',
    seenPanelIntro: {},
    dismissedHints: {},
    progress: createDefaultProgress(),
    helpOverlayOpen: false,
    activePanelIntro: null
  };
}

export function normalizeOnboardingState(raw) {
  const base = createDefaultOnboardingState();
  const next = raw && typeof raw === 'object' ? { ...base, ...raw } : base;
  next.seenPanelIntro = next.seenPanelIntro && typeof next.seenPanelIntro === 'object' ? next.seenPanelIntro : {};
  next.dismissedHints = next.dismissedHints && typeof next.dismissedHints === 'object' ? next.dismissedHints : {};
  next.progress = next.progress && typeof next.progress === 'object'
    ? { ...createDefaultProgress(), ...next.progress }
    : createDefaultProgress();
  next.runModePreference = next.runModePreference === 'standard' ? 'standard' : 'guided';
  next.helpOverlayOpen = Boolean(next.helpOverlayOpen);
  next.activePanelIntro = next.activePanelIntro && typeof next.activePanelIntro === 'object' ? next.activePanelIntro : null;
  next.tutorialEnabled = next.tutorialEnabled !== false;
  next.firstRunStarted = Boolean(next.firstRunStarted);
  next.firstRunCompleted = Boolean(next.firstRunCompleted);
  return next;
}

export function loadOnboardingState() {
  try {
    const raw = localStorage.getItem(ONBOARDING_STORAGE_KEY);
    return normalizeOnboardingState(raw ? JSON.parse(raw) : null);
  } catch (_) {
    return createDefaultOnboardingState();
  }
}

export function saveOnboardingState(state) {
  const normalized = normalizeOnboardingState(state);
  try {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(normalized));
  } catch (_) {
    // fail-safe: never block gameplay on storage errors
  }
  return normalized;
}

export function resetOnboardingState() {
  const next = createDefaultOnboardingState();
  return saveOnboardingState(next);
}

export function setTutorialEnabled(onboardingState, enabled) {
  return normalizeOnboardingState({ ...onboardingState, tutorialEnabled: Boolean(enabled) });
}

export function setRunModePreference(onboardingState, mode = 'guided') {
  const nextMode = mode === 'standard' ? 'standard' : 'guided';
  return normalizeOnboardingState({ ...onboardingState, runModePreference: nextMode });
}

export function setHelpOverlayOpen(onboardingState, open) {
  return normalizeOnboardingState({ ...onboardingState, helpOverlayOpen: Boolean(open) });
}

export function dismissHint(onboardingState, hintKey) {
  if (!hintKey) return normalizeOnboardingState(onboardingState);
  const dismissedHints = {
    ...(onboardingState?.dismissedHints || {}),
    [hintKey]: true
  };
  return normalizeOnboardingState({ ...onboardingState, dismissedHints });
}

export function markPanelVisited(onboardingState, panelId) {
  if (!panelId) return normalizeOnboardingState(onboardingState);
  const next = normalizeOnboardingState(onboardingState);
  const hasSeenPanel = Boolean(next.seenPanelIntro[panelId]);
  next.seenPanelIntro[panelId] = true;

  if (panelId === 'cameras-panel') next.progress.cameraVisit = true;
  if (panelId === 'power-panel') next.progress.powerVisit = true;
  if (panelId === 'report-panel') next.progress.reportVisit = true;
  if (panelId === 'frontdesk-panel' && next.progress.deskDecision) next.progress.roomStatus = true;

  next.activePanelIntro = !hasSeenPanel && PANEL_INTRO_COPY[panelId]
    ? { panelId, ...PANEL_INTRO_COPY[panelId] }
    : null;
  return next;
}

export function clearPanelIntro(onboardingState) {
  return normalizeOnboardingState({ ...onboardingState, activePanelIntro: null });
}

export function markTutorialEvent(onboardingState, eventKey, payload = {}) {
  const next = normalizeOnboardingState(onboardingState);
  const event = String(eventKey || '').toLowerCase();

  if (event === 'shift-started') {
    next.firstRunStarted = true;
    next.progress.welcome = true;
  }
  if (event === 'guest-spawned') {
    next.progress.spawnGuest = true;
  }
  if (event === 'desk-action') {
    next.progress.deskDecision = true;
  }
  if (event === 'room-reviewed') {
    next.progress.roomStatus = true;
  }
  if (event === 'camera-action') {
    next.progress.cameraVisit = true;
  }
  if (event === 'power-action') {
    next.progress.powerVisit = true;
  }
  if (event === 'report-action') {
    next.progress.reportVisit = true;
  }
  if (event === 'night-complete' && Number(payload.night || 0) === 1) {
    next.progress.surviveDawn = true;
    next.firstRunCompleted = true;
  }

  return next;
}

function getGuidedHintModel(renderState) {
  const { onboarding, guests, occupiedRooms, unresolvedCameraCount, activePanelId } = renderState;
  const progress = onboarding.progress || createDefaultProgress();

  if (!progress.welcome) {
    return {
      key: 'tutorial-welcome',
      title: 'Welcome to your first shift',
      body: 'You run the desk, monitor cameras, and keep power online until dawn.',
      panelId: 'frontdesk-panel'
    };
  }
  if (!progress.spawnGuest) {
    return {
      key: 'tutorial-spawn',
      title: 'Step 1: Bring in your first guest',
      body: 'Use Call Next Arrival at Front Desk (intake slots are limited). Then assess Risk + Policy before deciding.',
      panelId: 'frontdesk-panel'
    };
  }
  if (!progress.deskDecision) {
    return {
      key: 'tutorial-desk-decision',
      title: 'Step 2: Make a desk call',
      body: 'Use Check In, Flag, or Reject. Any real desk action advances tutorial flow.',
      panelId: 'frontdesk-panel'
    };
  }
  if (!progress.roomStatus) {
    return {
      key: 'tutorial-room-status',
      title: 'Step 3: Check room status',
      body: occupiedRooms > 0
        ? 'Watch Room Condition and Chain Pressure so small risks do not snowball.'
        : 'No occupied rooms yet. Front Desk room status updates once guests are checked in.',
      panelId: 'frontdesk-panel'
    };
  }
  if (!progress.cameraVisit) {
    return {
      key: 'tutorial-cameras',
      title: 'Step 4: Use Cameras',
      body: unresolvedCameraCount > 0
        ? 'An anomaly is active. Investigate from Cameras to contain pressure.'
        : 'Run a camera scan to look for anomalies before they escalate.',
      panelId: 'cameras-panel'
    };
  }
  if (!progress.powerVisit) {
    return {
      key: 'tutorial-power',
      title: 'Step 5: Learn power tools',
      body: 'Emergency Restore is safer; Emergency Reroute is faster but more destabilizing.',
      panelId: 'power-panel'
    };
  }
  if (!progress.reportVisit) {
    return {
      key: 'tutorial-report',
      title: 'Step 6: Use Report actions',
      body: guests > 0
        ? 'Dispatch Staff and Review Incidents help prevent chain spikes before dawn.'
        : 'Report is where you review incidents and dispatch support when pressure rises.',
      panelId: 'report-panel'
    };
  }

  return {
    key: 'tutorial-survive',
    title: 'Final step: hold until dawn',
    body: 'Keep power and room pressure stable. End Night becomes available at dawn.',
    panelId: activePanelId || 'report-panel'
  };
}

function getLightContextHint(renderState) {
  const { guests, unresolvedCameraCount, power, activePanelId, night } = renderState;
  if (night >= 5) return null;
  if (unresolvedCameraCount > 0 && activePanelId !== 'cameras-panel') {
    return {
      key: 'light-camera-context',
      title: 'Camera priority',
      body: 'An unresolved anomaly can cascade into room pressure. Check Cameras soon.',
      panelId: 'cameras-panel'
    };
  }
  if (power <= 35 && activePanelId !== 'power-panel') {
    return {
      key: 'light-power-context',
      title: 'Power caution',
      body: 'Low reserve reduces room for mistakes. Consider Power actions before another heavy scan.',
      panelId: 'power-panel'
    };
  }
  if (guests > 0 && activePanelId !== 'frontdesk-panel') {
    return {
      key: 'light-desk-context',
      title: 'Desk queue waiting',
      body: 'Guests are queued at Front Desk. Decisions there drive most shift momentum.',
      panelId: 'frontdesk-panel'
    };
  }
  return null;
}

export function buildOnboardingUiModel(gameState, onboardingState, context = {}) {
  const onboarding = normalizeOnboardingState(onboardingState);
  const guests = Array.isArray(gameState?.guests) ? gameState.guests.length : 0;
  const rooms = Array.isArray(gameState?.rooms) ? gameState.rooms : [];
  const occupiedRooms = rooms.filter((room) => room?.occupied).length;
  const cameras = Array.isArray(gameState?.cameras) ? gameState.cameras : [];
  const events = Array.isArray(gameState?.activeEvents) ? gameState.activeEvents : [];
  const unresolvedCameraCount = cameras.filter((camera) =>
    events.some((event) => String(event?.cameraId) === String(camera.id))
  ).length;

  const activePanelId = context.activePanelId || 'frontdesk-panel';
  const activeScreenId = context.activeScreenId || 'main-menu';
  const isNightOne = Number(gameState?.night || 1) === 1;
  const firstRunActive = onboarding.tutorialEnabled && !onboarding.firstRunCompleted && isNightOne;
  const heavyGuidance = firstRunActive && onboarding.runModePreference !== 'standard';

  const guidedHint = heavyGuidance
    ? getGuidedHintModel({ onboarding, guests, occupiedRooms, unresolvedCameraCount, activePanelId })
    : null;
  const contextualHint = onboarding.tutorialEnabled ? getLightContextHint({
    guests,
    unresolvedCameraCount,
    power: Number(gameState?.power || 100),
    activePanelId,
    night: Number(gameState?.night || 1)
  }) : null;

  const hint = guidedHint || contextualHint;
  const hintDismissed = hint?.key ? Boolean(onboarding.dismissedHints?.[hint.key]) : false;
  const showHintCard = activeScreenId === 'game-screen' && Boolean(hint) && !hintDismissed;

  const activePanelIntro = activeScreenId === 'game-screen' ? onboarding.activePanelIntro : null;

  const mainMenuSummary = {
    show: activeScreenId === 'main-menu',
    firstRunPending: !onboarding.firstRunCompleted,
    tutorialEnabled: onboarding.tutorialEnabled,
    tutorialActiveStartFlow: activeScreenId === 'main-menu' && onboarding.tutorialEnabled && !onboarding.firstRunCompleted,
    runModePreference: onboarding.runModePreference,
    blurb: 'A tense management sim: assess guests, contain incidents, and survive each night until dawn.',
    tips: [
      'Use Risk + Policy together before check-in decisions.',
      'Scan cameras often enough to catch anomalies early.',
      'Power is your safety budget—avoid panic spending.',
      'Dispatch and tactical actions trade safety for cost, reputation, or instability.'
    ]
  };

  return {
    tutorialEnabled: onboarding.tutorialEnabled,
    firstRunActive,
    heavyGuidance,
    highlightPanelId: showHintCard ? hint?.panelId || null : null,
    hintCard: showHintCard
      ? {
          key: hint.key,
          title: hint.title,
          body: hint.body,
          stepLabel: heavyGuidance ? 'Guided First Shift' : 'Shift Tip',
          modeLabel: heavyGuidance ? 'Guided' : 'Light',
          panelId: hint.panelId || null
        }
      : null,
    panelIntro: activePanelIntro,
    helpOverlayOpen: onboarding.helpOverlayOpen,
    glossaryTerms: GLOSSARY_TERMS,
    mainMenuSummary
  };
}
