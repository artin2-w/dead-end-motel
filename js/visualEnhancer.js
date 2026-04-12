function getPhase2() {
  window.DeadEndPhase2 = window.DeadEndPhase2 || {};
  return window.DeadEndPhase2;
}

export function initVisualEnhancer() {
  const app = document.getElementById('app');
  if (!app || app.dataset.phase2VisualReady === 'true') return;
  app.dataset.phase2VisualReady = 'true';
  app.classList.add('phase2-visual-ready');
}

export function decorateUi() {
  const objectiveTitle = document.querySelector('.shift-status-title');
  if (objectiveTitle && !objectiveTitle.textContent.includes('🕘')) {
    objectiveTitle.textContent = `🕘 ${objectiveTitle.textContent}`;
  }

  const pressureLabel = document.getElementById('shift-pressure-label');
  if (pressureLabel && !pressureLabel.textContent.includes('⚠')) {
    pressureLabel.textContent = `⚠ ${pressureLabel.textContent}`;
  }
}

const ns = getPhase2();
ns.visualEnhancer = { initVisualEnhancer, decorateUi };
ns.initVisualEnhancer = initVisualEnhancer;
ns.decorateUi = decorateUi;
