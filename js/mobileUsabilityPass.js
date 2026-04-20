function applyMobileUsabilityPass() {
  const app = document.getElementById('app');
  if (!app) return;

  const isNarrow = window.matchMedia('(max-width: 720px)').matches;
  app.classList.toggle('phase3-mobile', isNarrow);

  const guestQueue = document.getElementById('guest-queue');
  if (guestQueue) {
    guestQueue.classList.toggle('phase3-mobile-queue', isNarrow);
  }

  const isStickyRail = window.matchMedia('(max-width: 900px)').matches;
  if (isNarrow) {
    document.querySelectorAll(
      '#guest-queue .guest-action-row .button, #guest-queue .guest-action-row-secondary .button, #guest-queue .v50-inv-primary-row .button'
    ).forEach((button) => {
      button.classList.add('phase3-tap-button');
    });
  }
  if (isStickyRail) {
    document.querySelectorAll('#v43-guest-sticky-rail .v43-sticky-rail-actions .button').forEach((button) => {
      button.classList.add('phase3-tap-button');
    });
  }

  const onboardingPanel = document.querySelector('#phase3-onboarding-overlay .phase3-onboarding-panel');
  if (onboardingPanel) {
    onboardingPanel.classList.toggle('phase3-mobile-panel', isNarrow);
  }

  const summaryStats = document.getElementById('phase3-summary-stats-grid');
  if (summaryStats) {
    summaryStats.classList.toggle('phase3-mobile-summary-grid', isNarrow);
  }

  if (!window.__deadEndTapGuardBound) {
    const isTouchLike = window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
    if (isTouchLike) {
      let lastTapAt = 0;
      let lastTapTarget = null;
      document.addEventListener('touchend', (event) => {
        const target = event.target;
        if (!(target instanceof Element)) return;
        const actionable = target.closest(
          '.button, .tab-button, .camera-scene-action-btn, .guest-action-row button, .guest-action-row-secondary button, .v50-inv-primary-row button, .v43-sticky-rail-actions button, .v50-cam-digest-btn, .report-panel-actions button, .room-service-row button, .room-tactical-row button'
        );
        if (!actionable) return;
        const now = Date.now();
        const delta = now - lastTapAt;
        if (lastTapTarget === actionable && delta > 0 && delta < 320) {
          event.preventDefault();
        }
        lastTapAt = now;
        lastTapTarget = actionable;
      }, { passive: false });
    }
    window.__deadEndTapGuardBound = true;
  }
}

const phase3 = (window.DeadEndPhase3 = window.DeadEndPhase3 || {});
phase3.applyMobileUsabilityPass = applyMobileUsabilityPass;
