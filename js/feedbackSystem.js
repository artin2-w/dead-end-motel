function getPhase2() {
  window.DeadEndPhase2 = window.DeadEndPhase2 || {};
  return window.DeadEndPhase2;
}

const recentActions = [];

function ensureLogPanel() {
  const reportPanel = document.getElementById('report-panel');
  if (!reportPanel) return null;
  let panel = document.getElementById('phase2-recent-actions');
  if (!panel) {
    panel = document.createElement('div');
    panel.id = 'phase2-recent-actions';
    panel.className = 'phase2-recent-actions';
    reportPanel.insertBefore(panel, reportPanel.querySelector('#incident-log'));
  }
  return panel;
}

function renderRecentActions() {
  const panel = ensureLogPanel();
  if (!panel) return;
  panel.innerHTML = `
    <p class="section-tag">Recent Actions</p>
    <ul>${recentActions.slice(0, 6).map((line) => `<li>${line}</li>`).join('')}</ul>
  `;
}

function showFloat(text, tone = 'info') {
  const root = document.getElementById('game-screen');
  if (!root) return;
  const item = document.createElement('div');
  item.className = `phase2-float phase2-float-${tone}`;
  item.textContent = text;
  root.appendChild(item);
  window.setTimeout(() => item.remove(), 1200);
}

export function pushDecisionFeedback(payload = {}) {
  const repDelta = Number(payload.repDelta || 0);
  const pressureDelta = Number(payload.pressureDelta || 0);
  const message = payload.message || 'Decision made.';
  const consequence = payload.consequence || '';

  const repText = repDelta === 0 ? 'Rep ±0' : repDelta > 0 ? `Rep +${repDelta}` : `Rep ${repDelta}`;
  const pressureText = pressureDelta === 0 ? 'Pressure ±0' : pressureDelta > 0 ? `Pressure +${pressureDelta}` : `Pressure ${pressureDelta}`;
  const line = `${message} (${repText}, ${pressureText})${consequence ? ` — ${consequence}` : ''}`;

  recentActions.unshift(line);
  while (recentActions.length > 8) recentActions.pop();
  renderRecentActions();

  showFloat(repText, repDelta < 0 ? 'danger' : 'safe');
  showFloat(pressureText, pressureDelta > 0 ? 'danger' : 'warn');
}

const ns = getPhase2();
ns.feedbackSystem = { pushDecisionFeedback };
ns.pushDecisionFeedback = pushDecisionFeedback;
