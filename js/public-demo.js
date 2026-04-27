/**
 * Dead End Motel v0.56 — Public demo polish (tutorial, sharing, daily shift, crash safety)
 *
 * Guardrails:
 * - Never auto-open the store.
 * - Never touch PayPal secrets or backend URLs.
 * - No tracking; any data is localStorage only.
 */

const TUTORIAL_KEY = 'dem.tutorialSeen';
const DAILY_LAST_DATE_KEY = 'dem.daily.lastPlayedDate';
const DAILY_STREAK_KEY = 'dem.dailyStreak';
const DAILY_ACTIVE_KEY = 'dem.daily.active';
const DAILY_ID_KEY = 'dem.daily.challengeId';

function $(id) {
  return document.getElementById(id);
}

function todayKey() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function safeGet(key, fallback = '') {
  try {
    const v = localStorage.getItem(key);
    return v == null ? fallback : String(v);
  } catch {
    return fallback;
  }
}

function safeSet(key, value) {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    // ignore
  }
}

function safeRemove(key) {
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

function showToast(message, actions = []) {
  const toast = $('dem-toast');
  if (!toast) return;
  toast.hidden = false;
  toast.innerHTML = `
    <div class="dem-toast-card">
      <div class="dem-toast-msg">${String(message || '')}</div>
      <div class="dem-toast-actions">
        ${actions
          .map(
            (a, i) =>
              `<button type="button" class="button button-secondary dem-toast-btn" data-dem-toast-action="${i}">${a.label}</button>`
          )
          .join('')}
        <button type="button" class="button button-secondary dem-toast-btn" data-dem-toast-close>Close</button>
      </div>
    </div>
  `;
  toast.querySelector('[data-dem-toast-close]')?.addEventListener('click', () => {
    toast.hidden = true;
    toast.innerHTML = '';
  });
  toast.querySelectorAll('[data-dem-toast-action]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const idx = Number(btn.getAttribute('data-dem-toast-action') || '0');
      const fn = actions[idx]?.onClick;
      try {
        fn?.();
      } catch {
        // ignore
      }
    });
  });
}

window.demSafeReturnToMenu = function demSafeReturnToMenu() {
  // Prefer existing buttons (keeps state transitions consistent).
  const failureMenu = $('failure-menu-btn');
  const summaryMenu = $('back-menu-btn');
  const prepMenu = $('prep-menu-btn');
  const settingsMenu = $('menu-settings-btn');

  if (failureMenu && !failureMenu.disabled) return failureMenu.click();
  if (summaryMenu && !summaryMenu.disabled) return summaryMenu.click();
  if (prepMenu && !prepMenu.disabled) return prepMenu.click();
  if (settingsMenu && !settingsMenu.disabled) return settingsMenu.click();

  // Last-resort fallback.
  window.location.reload();
};

window.addEventListener('error', (ev) => {
  console.warn('[DEM] Runtime error', { message: ev?.message || 'error' });
  showToast('Something went wrong. You can refresh or return to menu.', [
    { label: 'Return to Main Menu', onClick: () => window.demSafeReturnToMenu?.() }
  ]);
});

window.addEventListener('unhandledrejection', (ev) => {
  console.warn('[DEM] Unhandled rejection', { reason: String(ev?.reason || 'promise rejection') });
  showToast('Something went wrong. You can refresh or return to menu.', [
    { label: 'Return to Main Menu', onClick: () => window.demSafeReturnToMenu?.() }
  ]);
});

function buildTutorialSteps() {
  return [
    {
      title: 'Welcome to Dead End Motel',
      body: 'You are the night clerk. Keep the motel stable until dawn.'
    },
    {
      title: 'Watch the pressure',
      body: 'Guests, incidents, power, and strange events can push the motel toward collapse.'
    },
    {
      title: 'Make decisions',
      body: 'Check guests, monitor cameras, handle incidents, and protect your shift.'
    },
    {
      title: 'Survive nights',
      body: 'Each night unlocks new files and tools.'
    },
    {
      title: 'Purchases are optional',
      body: 'Continue Credits and upgrades can protect progress, but every night can be retried for free.'
    }
  ];
}

function openTutorial() {
  const root = $('dem-overlay-root');
  if (!root) return;
  root.setAttribute('aria-hidden', 'false');
  root.className = 'dem-overlay-root is-open';

  const steps = buildTutorialSteps();
  let idx = 0;

  function render() {
    const step = steps[idx];
    root.innerHTML = `
      <div class="dem-overlay-backdrop"></div>
      <div class="dem-overlay-card" role="dialog" aria-modal="true" aria-label="Tutorial">
        <p class="section-tag">Quick tutorial</p>
        <h2 class="dem-overlay-title">${step.title}</h2>
        <p class="dem-overlay-body muted">${step.body}</p>
        <div class="dem-overlay-progress muted">Step ${idx + 1} / ${steps.length}</div>
        <div class="dem-overlay-actions">
          <button type="button" class="button button-secondary" id="dem-tut-skip">Skip</button>
          ${idx > 0 ? '<button type="button" class="button button-secondary" id="dem-tut-back">Back</button>' : ''}
          <button type="button" class="button button-primary" id="dem-tut-next">${idx === steps.length - 1 ? 'Got it' : 'Next'}</button>
        </div>
      </div>
    `;
    $('dem-tut-skip')?.addEventListener('click', () => close(true));
    $('dem-tut-back')?.addEventListener('click', () => {
      idx = Math.max(0, idx - 1);
      render();
    });
    $('dem-tut-next')?.addEventListener('click', () => {
      if (idx >= steps.length - 1) return close(true);
      idx += 1;
      render();
    });
  }

  function close(markSeen) {
    if (markSeen) safeSet(TUTORIAL_KEY, 'true');
    root.className = 'dem-overlay-root';
    root.setAttribute('aria-hidden', 'true');
    root.innerHTML = '';
  }

  render();
}

function maybeShowTutorialOnFirstStart() {
  const seen = safeGet(TUTORIAL_KEY, '') === 'true';
  if (seen) return;
  // Show tutorial immediately on first visit to reduce friction for viral traffic.
  openTutorial();
}

function seedHash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

window.demGetDailyChallenge = function demGetDailyChallenge() {
  const key = todayKey();
  const h = seedHash(key);
  const list = [
    { id: 'storm_night', title: 'Storm Night', note: 'More power stress (lightweight modifier).' },
    { id: 'late_arrivals', title: 'Late Arrivals', note: 'More guests late in shift (placeholder).' },
    { id: 'bad_wiring', title: 'Bad Wiring', note: 'Power flickers more often (placeholder).' },
    { id: 'quiet_curse', title: 'Quiet Curse', note: 'Fewer incidents but higher anomaly pressure (placeholder).' }
  ];
  const pick = list[h % list.length];
  return { dateKey: key, ...pick };
};

window.demApplyDailyStartEffects = function demApplyDailyStartEffects(state) {
  const active = safeGet(DAILY_ACTIVE_KEY, '') === todayKey();
  if (!active) return;
  const ch = safeGet(DAILY_ID_KEY, '');
  state.runModifiers = state.runModifiers && typeof state.runModifiers === 'object' ? state.runModifiers : {};
  // Keep modifiers tiny to avoid breaking progression.
  if (ch === 'storm_night') {
    state.runModifiers.passiveDrainMult = Math.max(0.75, Number(state.runModifiers.passiveDrainMult || 1) * 1.04);
  }
  state.dailyChallengeId = ch || null;
  state.dailyChallengeDate = todayKey();
};

function updateDailyStreakOnStart() {
  const key = todayKey();
  const last = safeGet(DAILY_LAST_DATE_KEY, '');
  if (last === key) return;
  const prev = Number(safeGet(DAILY_STREAK_KEY, '0') || 0) || 0;
  const next = prev + 1;
  safeSet(DAILY_LAST_DATE_KEY, key);
  safeSet(DAILY_STREAK_KEY, String(next));
}

function renderDailyCard() {
  const host = $('dem-daily-card');
  if (!host) return;
  const ch = window.demGetDailyChallenge?.();
  const streak = Number(safeGet(DAILY_STREAK_KEY, '0') || 0) || 0;
  host.innerHTML = `
    <div class="dem-daily-shell">
      <p class="section-tag">Daily Shift</p>
      <p class="dem-daily-title">Today's challenge: <strong>${ch?.title || 'Daily Shift'}</strong></p>
      <p class="muted dem-daily-note">${ch?.note || 'A small daily modifier for replay.'}</p>
      <p class="muted dem-daily-streak">Daily streak: ${streak}</p>
      <div class="dem-daily-actions">
        <button type="button" class="button button-secondary" id="dem-start-daily-btn">Start Daily Shift</button>
      </div>
      <p class="muted dem-daily-hint">New Daily Shift available each day.</p>
    </div>
  `;
  $('dem-start-daily-btn')?.addEventListener('click', () => {
    const date = todayKey();
    safeSet(DAILY_ACTIVE_KEY, date);
    safeSet(DAILY_ID_KEY, String(ch?.id || ''));
    updateDailyStreakOnStart();
    // Start a normal shift; daily modifier applies at shift start through main.js hook.
    $('start-game-btn')?.click();
  });
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    showToast('Copied result to clipboard.');
    return true;
  } catch {
    return false;
  }
}

function buildShareText(kind) {
  const night = $('summary-title')?.textContent || $('night-display')?.textContent || '';
  const grade = $('summary-rating')?.textContent?.match(/[A-F][+-]?/g)?.[0] || '';
  const cause = $('failure-reason')?.textContent || '';
  const title = 'Dead End Motel';
  const url = 'https://artin2-w.github.io/';
  const time = $('time-display')?.textContent || '';
  const daily = safeGet(DAILY_ACTIVE_KEY, '') === todayKey() ? window.demGetDailyChallenge?.()?.title : '';
  const dailyLine = daily ? `Daily Shift: ${daily}` : '';

  if (kind === 'failure') {
    return [
      title,
      String(night || '').trim(),
      `Result: Failed at ${time || 'unknown time'}`,
      grade ? `Grade: ${grade}` : '',
      cause ? `Cause: ${cause}` : '',
      dailyLine,
      `Play: ${url}`
    ]
      .filter(Boolean)
      .join('\n');
  }
  return [
    title,
    String(night || '').trim(),
    `Result: Shift complete`,
    grade ? `Grade: ${grade}` : '',
    dailyLine,
    `Play: ${url}`
  ]
    .filter(Boolean)
    .join('\n');
}

function bindShareButtons() {
  $('dem-copy-failure-result-btn')?.addEventListener('click', async () => {
    const text = buildShareText('failure');
    const ok = await copyText(text);
    if (!ok) showToast('Copy failed. You can select and copy the result text manually.');
  });
  $('dem-copy-summary-result-btn')?.addEventListener('click', async () => {
    const text = buildShareText('summary');
    const ok = await copyText(text);
    if (!ok) showToast('Copy failed. You can select and copy the result text manually.');
  });
}

function bindMenuButtons() {
  $('dem-replay-tutorial-btn')?.addEventListener('click', () => openTutorial());
  $('dem-feedback-btn')?.addEventListener('click', () => {
    window.location.href = 'mailto:deadendmotelgame@gmail.com?subject=Dead%20End%20Motel%20Feedback';
  });
}

function bootstrap() {
  renderDailyCard();
  bindShareButtons();
  bindMenuButtons();
  maybeShowTutorialOnFirstStart();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}

// Trailer helper (dev-only)
window.demTrailerMode = function demTrailerMode() {
  console.log('Trailer mode prepared');
  // Non-destructive: just opens the game screen if possible.
  $('start-game-btn')?.click();
};

