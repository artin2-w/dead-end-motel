function classifyDecisionTone(button = null) {
  const text = String(button?.textContent || '').toLowerCase();
  if (text.includes('check in')) return 'checkin';
  if (text.includes('flag')) return 'flag';
  if (text.includes('reject')) return 'reject';
  if (text.includes('special')) return 'special';
  return 'neutral';
}

function applyDecisionPresentation() {
  const rows = Array.from(document.querySelectorAll('#guest-queue .guest-action-row'));
  rows.forEach((row) => {
    row.classList.add('phase3-decision-row');
    const buttons = Array.from(row.querySelectorAll('.button'));
    buttons.forEach((button) => {
      const tone = classifyDecisionTone(button);
      button.classList.add('phase3-decision-btn', `phase3-decision-${tone}`);

      if (button.dataset.phase3DecisionBound === 'true') return;
      button.dataset.phase3DecisionBound = 'true';

      button.addEventListener('pointerdown', () => {
        button.classList.add('phase3-pressed');
      });
      button.addEventListener('pointerup', () => {
        button.classList.remove('phase3-pressed');
      });
      button.addEventListener('pointerleave', () => {
        button.classList.remove('phase3-pressed');
      });
      button.addEventListener('click', () => {
        button.classList.add('phase3-selected-flash');
        window.setTimeout(() => {
          button.classList.remove('phase3-selected-flash');
        }, 280);
      });
    });
  });
}

const phase3 = (window.DeadEndPhase3 = window.DeadEndPhase3 || {});
phase3.applyDecisionPresentation = applyDecisionPresentation;
