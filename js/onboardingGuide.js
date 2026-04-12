const PHASE3_ONBOARDING_KEY = 'dead-end-motel-phase3-onboarding-v1';

const GUIDE_STEPS = [
  {
    key: 'guest-queue',
    title: 'Guest Queue',
    body: 'This is your live desk line. New arrivals stack here and demand quick judgment.',
    selectors: ['#guest-queue', '#frontdesk-panel .card-list']
  },
  {
    key: 'risk-badges',
    title: 'Risk & Trait Signals',
    body: 'Risk, policy recommendation, mood, and trait chips are your first read before committing.',
    selectors: ['#guest-queue .guest-chip-row', '#guest-queue .risk-badge', '#guest-queue .guest-card']
  },
  {
    key: 'desk-actions',
    title: 'Desk Decisions',
    body: 'Check In, Flag, or Reject set the tone of your shift. Every click has a cost.',
    selectors: ['#guest-queue .guest-action-row', '#guest-queue .button']
  },
  {
    key: 'objectives-alerts',
    title: 'Objectives & Alerts',
    body: 'Track active objectives and warning alerts to avoid silent collapses.',
    selectors: ['#night-objective-list', '#live-alert-strip', '.shift-status-card']
  }
];

const guideState = {
  active: false,
  stepIndex: 0,
  overlay: null,
  panel: null,
  spotlight: null,
  title: null,
  body: null,
  counter: null,
  onResize: null,
  onScroll: null,
  onOrientationChange: null,
  onViewportResize: null,
  onViewportScroll: null,
  renderToken: 0,
  renderQueued: false
};

function loadGuideState() {
  try {
    const raw = localStorage.getItem(PHASE3_ONBOARDING_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return {
      seen: Boolean(parsed?.seen),
      completed: Boolean(parsed?.completed),
      skipped: Boolean(parsed?.skipped)
    };
  } catch (_) {
    return { seen: false, completed: false, skipped: false };
  }
}

function saveGuideState(next = {}) {
  const normalized = {
    seen: Boolean(next?.seen),
    completed: Boolean(next?.completed),
    skipped: Boolean(next?.skipped)
  };
  try {
    localStorage.setItem(PHASE3_ONBOARDING_KEY, JSON.stringify(normalized));
  } catch (_) {
    // Never block gameplay on storage issues.
  }
  return normalized;
}

function findTargetElement(step) {
  const selectors = Array.isArray(step?.selectors) ? step.selectors : [];
  for (let i = 0; i < selectors.length; i += 1) {
    const found = document.querySelector(selectors[i]);
    if (found && found.getClientRects().length > 0) return found;
  }
  return null;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function ensureGuideDom() {
  if (guideState.overlay && document.body.contains(guideState.overlay)) return;

  const overlay = document.createElement('div');
  overlay.id = 'phase3-onboarding-overlay';
  overlay.className = 'phase3-onboarding-overlay';
  overlay.innerHTML = `
    <div class="phase3-onboarding-backdrop"></div>
    <div class="phase3-onboarding-spotlight"></div>
    <div class="phase3-onboarding-panel" role="dialog" aria-live="polite" aria-label="Guided onboarding">
      <p class="section-tag">Night Clerk Walkthrough</p>
      <h4 id="phase3-onboarding-title"></h4>
      <p id="phase3-onboarding-body" class="muted"></p>
      <p id="phase3-onboarding-counter" class="phase3-onboarding-counter muted"></p>
      <div class="phase3-onboarding-actions">
        <button id="phase3-onboarding-next" class="button button-primary" type="button">Next</button>
        <button id="phase3-onboarding-skip" class="button button-secondary" type="button">Skip</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  guideState.overlay = overlay;
  guideState.panel = overlay.querySelector('.phase3-onboarding-panel');
  guideState.spotlight = overlay.querySelector('.phase3-onboarding-spotlight');
  guideState.title = overlay.querySelector('#phase3-onboarding-title');
  guideState.body = overlay.querySelector('#phase3-onboarding-body');
  guideState.counter = overlay.querySelector('#phase3-onboarding-counter');

  const nextButton = overlay.querySelector('#phase3-onboarding-next');
  const skipButton = overlay.querySelector('#phase3-onboarding-skip');

  nextButton?.addEventListener('click', () => {
    const isFinalStep = guideState.stepIndex >= GUIDE_STEPS.length - 1;
    if (isFinalStep) {
      finishGuide({ completed: true });
      return;
    }
    guideState.stepIndex += 1;
    queueGuideRender();
  });

  skipButton?.addEventListener('click', () => {
    finishGuide({ skipped: true });
  });
}

function getVisualViewportOffset() {
  const viewport = window.visualViewport;
  return {
    offsetLeft: Number(viewport?.offsetLeft || 0),
    offsetTop: Number(viewport?.offsetTop || 0)
  };
}

function getTargetRect(targetEl) {
  if (!targetEl || targetEl.getClientRects().length === 0) {
    return null;
  }

  const rawRect = targetEl.getBoundingClientRect();
  if (!rawRect || rawRect.width <= 0 || rawRect.height <= 0) {
    return null;
  }

  const viewport = getVisualViewportOffset();
  const rect = {
    left: rawRect.left + viewport.offsetLeft,
    top: rawRect.top + viewport.offsetTop,
    width: rawRect.width,
    height: rawRect.height
  };
  const pad = 10;
  return {
    left: clamp(rect.left - pad, 8, window.innerWidth - 18),
    top: clamp(rect.top - pad, 8, window.innerHeight - 18),
    width: Math.max(44, Math.min(window.innerWidth - 16, rect.width + pad * 2)),
    height: Math.max(40, Math.min(window.innerHeight - 16, rect.height + pad * 2))
  };
}

function positionGuidePanel(targetRect) {
  if (!guideState.panel) return;

  const panelWidth = Math.min(420, window.innerWidth - 24);
  const panelHeight = guideState.panel.offsetHeight || 220;
  let left = targetRect.left;
  let top = targetRect.top + targetRect.height + 12;

  if (top + panelHeight > window.innerHeight - 12) {
    top = targetRect.top - panelHeight - 12;
  }
  if (top < 12) {
    top = window.innerHeight - panelHeight - 12;
  }
  if (top < 12) top = 12;

  left = clamp(left, 12, window.innerWidth - panelWidth - 12);

  guideState.panel.style.left = `${left}px`;
  guideState.panel.style.top = `${top}px`;
}

function queueGuideRender() {
  if (!guideState.active) return;
  if (guideState.renderQueued) return;
  guideState.renderQueued = true;
  window.requestAnimationFrame(() => {
    guideState.renderQueued = false;
    renderGuideStep();
  });
}

function waitForLayoutSettle() {
  return new Promise((resolve) => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(resolve);
    });
  });
}

function closeHelpOverlayIfOpen() {
  const overlay = document.getElementById('help-overlay');
  if (!overlay || !overlay.classList.contains('is-open')) return false;
  const closeBtn = overlay.querySelector('#help-overlay-close-btn');
  if (closeBtn) {
    closeBtn.click();
    return true;
  }
  overlay.classList.remove('is-open');
  return true;
}

async function ensureTargetInView(target) {
  if (!target || typeof target.scrollIntoView !== 'function') return;
  try {
    target.scrollIntoView({
      block: 'center',
      inline: 'nearest',
      behavior: 'auto'
    });
  } catch (_) {
    target.scrollIntoView();
  }
  await waitForLayoutSettle();
}

async function renderGuideStep() {
  if (!guideState.active) return;
  ensureGuideDom();

  const renderToken = (guideState.renderToken += 1);

  const step = GUIDE_STEPS[guideState.stepIndex] || GUIDE_STEPS[0];
  const target = findTargetElement(step);
  if (target) {
    await ensureTargetInView(target);
  } else {
    await waitForLayoutSettle();
  }
  if (!guideState.active || renderToken !== guideState.renderToken) return;

  const rect = getTargetRect(target);

  if (guideState.title) {
    guideState.title.textContent = step?.title || 'Walkthrough';
  }
  if (guideState.body) {
    const fallbackNote = target
      ? ''
      : ' (Target area is not currently visible. You can continue and revisit this step anytime.)';
    guideState.body.textContent = `${step?.body || ''}${fallbackNote}`;
  }
  if (guideState.counter) {
    guideState.counter.textContent = `Step ${guideState.stepIndex + 1} of ${GUIDE_STEPS.length}`;
  }

  if (guideState.spotlight && rect) {
    guideState.spotlight.classList.remove('is-hidden');
    guideState.spotlight.style.left = `${rect.left}px`;
    guideState.spotlight.style.top = `${rect.top}px`;
    guideState.spotlight.style.width = `${rect.width}px`;
    guideState.spotlight.style.height = `${rect.height}px`;
  } else if (guideState.spotlight) {
    guideState.spotlight.classList.add('is-hidden');
  }

  const panelRect = rect || {
    left: Math.max(12, (window.innerWidth - Math.min(420, window.innerWidth - 24)) * 0.5),
    top: Math.max(12, window.innerHeight * 0.5),
    width: 280,
    height: 110
  };
  positionGuidePanel(panelRect);
}

function detachGuideListeners() {
  if (guideState.onResize) {
    window.removeEventListener('resize', guideState.onResize);
    guideState.onResize = null;
  }
  if (guideState.onScroll) {
    window.removeEventListener('scroll', guideState.onScroll, true);
    guideState.onScroll = null;
  }
  if (guideState.onOrientationChange) {
    window.removeEventListener('orientationchange', guideState.onOrientationChange);
    guideState.onOrientationChange = null;
  }
  if (guideState.onViewportResize && window.visualViewport) {
    window.visualViewport.removeEventListener('resize', guideState.onViewportResize);
    guideState.onViewportResize = null;
  }
  if (guideState.onViewportScroll && window.visualViewport) {
    window.visualViewport.removeEventListener('scroll', guideState.onViewportScroll);
    guideState.onViewportScroll = null;
  }
}

function attachGuideListeners() {
  if (guideState.onResize || guideState.onScroll) return;

  guideState.onResize = () => {
    queueGuideRender();
  };
  guideState.onScroll = () => {
    queueGuideRender();
  };
  guideState.onOrientationChange = () => {
    queueGuideRender();
  };
  guideState.onViewportResize = () => {
    queueGuideRender();
  };
  guideState.onViewportScroll = () => {
    queueGuideRender();
  };

  window.addEventListener('resize', guideState.onResize);
  window.addEventListener('scroll', guideState.onScroll, true);
  window.addEventListener('orientationchange', guideState.onOrientationChange);
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', guideState.onViewportResize);
    window.visualViewport.addEventListener('scroll', guideState.onViewportScroll);
  }
}

function finishGuide({ completed = false, skipped = false } = {}) {
  guideState.active = false;
  guideState.stepIndex = 0;
  guideState.renderToken += 1;
  if (guideState.overlay) {
    guideState.overlay.classList.remove('is-open');
  }
  detachGuideListeners();
  saveGuideState({ seen: true, completed, skipped });
}

function showOnboardingGuide(options = {}) {
  const force = Boolean(options?.force);
  const storage = loadGuideState();
  if (storage.seen && !force) return false;

  const closedHelp = closeHelpOverlayIfOpen();
  if (closedHelp && !options?.__afterHelpClose) {
    waitForLayoutSettle()
      .then(() => waitForLayoutSettle())
      .then(() => {
        showOnboardingGuide({ ...options, __afterHelpClose: true });
      });
    return true;
  }

  ensureGuideDom();
  guideState.active = true;
  guideState.stepIndex = 0;
  guideState.renderToken += 1;
  guideState.overlay?.classList.add('is-open');
  attachGuideListeners();
  queueGuideRender();
  return true;
}

function maybeStartOnboardingGuide(context = {}) {
  if (String(context?.activeScreenId || '') !== 'game-screen') return;
  if (guideState.active) {
    queueGuideRender();
    return;
  }
  const storage = loadGuideState();
  if (!storage.seen) {
    showOnboardingGuide({ force: false });
  }
}

function mountHelpTutorialControls(context = {}) {
  const overlay = context?.overlay || document.getElementById('help-overlay');
  if (!overlay || !overlay.classList.contains('is-open')) return;

  const panel = overlay.querySelector('.help-overlay-panel');
  if (!panel) return;

  let controls = panel.querySelector('.phase3-help-tutorial-controls');
  if (!controls) {
    controls = document.createElement('div');
    controls.className = 'phase3-help-tutorial-controls';
    controls.innerHTML = `
      <p class="section-tag">Guided Tour</p>
      <button id="phase3-replay-guide-btn" class="button button-secondary" type="button">Show Tutorial Again</button>
    `;
    panel.appendChild(controls);
  }

  const replayButton = controls.querySelector('#phase3-replay-guide-btn');
  if (replayButton && replayButton.dataset.phase3Bound !== 'true') {
    replayButton.dataset.phase3Bound = 'true';
    replayButton.addEventListener('click', () => {
      showOnboardingGuide({ force: true });
    });
  }
}

function resetOnboardingGuideState() {
  saveGuideState({ seen: false, completed: false, skipped: false });
}

const phase3 = (window.DeadEndPhase3 = window.DeadEndPhase3 || {});
phase3.initOnboardingGuide = ensureGuideDom;
phase3.showOnboardingGuide = showOnboardingGuide;
phase3.maybeStartOnboardingGuide = maybeStartOnboardingGuide;
phase3.mountHelpTutorialControls = mountHelpTutorialControls;
phase3.resetOnboardingGuideState = resetOnboardingGuideState;
