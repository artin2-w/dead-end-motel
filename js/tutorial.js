const STORAGE_KEY = 'tutorialSeen';

function getPhase2() {
  window.DeadEndPhase2 = window.DeadEndPhase2 || {};
  return window.DeadEndPhase2;
}

function createOverlay() {
  const overlay = document.createElement('div');
  overlay.id = 'phase2-tutorial-overlay';
  overlay.className = 'phase2-tutorial-overlay';
  overlay.innerHTML = `
    <div class="phase2-tutorial-panel" role="dialog" aria-modal="true" aria-label="First shift tutorial">
      <p class="section-tag">Dead End Motel v0.2</p>
      <h3 id="phase2-tutorial-title">Welcome to your shift</h3>
      <p id="phase2-tutorial-body" class="muted"></p>
      <div class="phase2-tutorial-progress" id="phase2-tutorial-progress"></div>
      <div class="hero-actions">
        <button type="button" id="phase2-tutorial-next" class="button button-primary">Next</button>
        <button type="button" id="phase2-tutorial-skip" class="button button-secondary">Skip Tutorial</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  return overlay;
}

const STEPS = [
  { title: 'Review guest info', body: 'Check risk, traits, and policy clues before committing to a guest decision.' },
  { title: 'Make a decision', body: 'Use Approve, Flag, or Deny based on pressure, policy, and available room safety.' },
  { title: 'Survive the night', body: 'Rotate desk, cameras, and power actions to prevent chain pressure until dawn.' }
];

const tutorialState = {
  initialized: false,
  stepIndex: 0,
  overlay: null,
  lastInputAt: Date.now(),
  hintShownAt: 0
};

function setSeen() {
  try {
    localStorage.setItem(STORAGE_KEY, 'true');
  } catch (_) {
    // no-op
  }
}

function hasSeen() {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  } catch (_) {
    return false;
  }
}

function renderStep() {
  if (!tutorialState.overlay) return;
  const step = STEPS[tutorialState.stepIndex] || STEPS[0];
  const title = tutorialState.overlay.querySelector('#phase2-tutorial-title');
  const body = tutorialState.overlay.querySelector('#phase2-tutorial-body');
  const progress = tutorialState.overlay.querySelector('#phase2-tutorial-progress');
  const next = tutorialState.overlay.querySelector('#phase2-tutorial-next');
  if (title) title.textContent = step.title;
  if (body) body.textContent = step.body;
  if (progress) progress.textContent = `Step ${tutorialState.stepIndex + 1} of ${STEPS.length}`;
  if (next) next.textContent = tutorialState.stepIndex >= STEPS.length - 1 ? 'Start Shift' : 'Next';
}

function hideOverlay(markSeen = true) {
  if (!tutorialState.overlay) return;
  tutorialState.overlay.classList.remove('is-open');
  if (markSeen) setSeen();
}

function showOverlay(force = false) {
  if (!tutorialState.overlay) {
    tutorialState.overlay = createOverlay();
    tutorialState.overlay.querySelector('#phase2-tutorial-next')?.addEventListener('click', () => {
      if (tutorialState.stepIndex >= STEPS.length - 1) {
        hideOverlay(true);
        return;
      }
      tutorialState.stepIndex += 1;
      renderStep();
    });
    tutorialState.overlay.querySelector('#phase2-tutorial-skip')?.addEventListener('click', () => {
      hideOverlay(true);
    });
  }

  if (!force && hasSeen()) return;
  tutorialState.stepIndex = 0;
  renderStep();
  tutorialState.overlay.classList.add('is-open');
}

function installHelpAgainButton(onHelp) {
  if (document.getElementById('phase2-help-again-btn')) return;
  const host = document.querySelector('.topbar');
  if (!host) return;
  const btn = document.createElement('button');
  btn.id = 'phase2-help-again-btn';
  btn.type = 'button';
  btn.className = 'button button-secondary';
  btn.textContent = 'Show Help Again';
  btn.addEventListener('click', () => {
    showOverlay(true);
    if (typeof onHelp === 'function') onHelp();
  });
  host.appendChild(btn);
}

function applyTooltips() {
  document.querySelectorAll('.risk-badge').forEach((node) => {
    node.title = node.title || 'Risk estimates the chance of post-check-in trouble.';
  });
  document.querySelectorAll('.guest-meta-chip').forEach((node) => {
    if (String(node.textContent || '').toLowerCase().includes('trait')) {
      node.title = node.title || 'Traits hint at hidden behavior patterns.';
    }
  });
  document.querySelectorAll('.guest-action-row .button').forEach((button) => {
    const text = String(button.textContent || '').toLowerCase();
    if (text.includes('check in')) button.title = button.title || 'Approve this guest and assign a room.';
    if (text.includes('flag')) button.title = button.title || 'Flag for monitoring if uncertain.';
    if (text.includes('reject')) button.title = button.title || 'Deny entry; safer short-term, reputation risk long-term.';
  });
}

function showContextHint(message) {
  let el = document.getElementById('phase2-context-hint');
  if (!el) {
    el = document.createElement('div');
    el.id = 'phase2-context-hint';
    el.className = 'phase2-context-hint';
    document.body.appendChild(el);
  }
  el.textContent = message;
  el.classList.add('is-visible');
  window.setTimeout(() => el.classList.remove('is-visible'), 2200);
}

export function initTutorialEnhancer(options = {}) {
  if (tutorialState.initialized) return;
  tutorialState.initialized = true;
  installHelpAgainButton(options.onHelp);
  if (!hasSeen()) showOverlay(false);
  ['click', 'keydown', 'pointerdown', 'touchstart'].forEach((name) => {
    document.addEventListener(name, () => {
      tutorialState.lastInputAt = Date.now();
    }, { passive: true });
  });
}

export function runTutorialTick(context = {}) {
  applyTooltips();
  if (context.activeScreenId !== 'game-screen') return;
  const now = Date.now();
  if (now - tutorialState.lastInputAt > 5000 && now - tutorialState.hintShownAt > 5000) {
    tutorialState.hintShownAt = now;
    showContextHint('Hint: Review risk + traits, then decide quickly to control pressure.');
  }
}

export function markTutorialDecision() {
  tutorialState.lastInputAt = Date.now();
  if (tutorialState.overlay?.classList.contains('is-open') && tutorialState.stepIndex < 2) {
    tutorialState.stepIndex = 2;
    renderStep();
  }
}

const ns = getPhase2();
ns.tutorial = {
  initTutorialEnhancer,
  runTutorialTick,
  markTutorialDecision,
  showTutorial: () => showOverlay(true)
};
