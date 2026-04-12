function mapGradeToShiftLabel(grade = 'C') {
  const value = String(grade || 'C').toUpperCase();
  if (value === 'A' || value === 'A+') return 'Perfect Control';
  if (value === 'B') return 'Controlled Shift';
  if (value === 'C') return 'Stable Night';
  if (value === 'D') return 'Barely Survived';
  return 'Failed Shift';
}

function buildFlavorLines(summary = {}, state = {}) {
  const lines = [];
  const snapshot = state?.shiftPressureSnapshot || {};
  const negatives = Array.isArray(snapshot?.negatives) ? snapshot.negatives : [];
  const positives = Array.isArray(snapshot?.positives) ? snapshot.positives : [];

  if (Number(state?.power || 0) <= 24) {
    lines.push('The motel survived, but barely. The grid spent most of the night on the edge.');
  }
  if (Number(state?.reputation || 0) <= 25) {
    lines.push('Trust around the motel dropped hard after tonight’s calls.');
  }
  if (negatives.some((line) => String(line).toLowerCase().includes('unresolved'))) {
    lines.push('Too many unstable guests slipped through without clean containment.');
  }
  if (positives.length >= 2 && Number(summary?.score || 0) >= 72) {
    lines.push('You held the line under pressure and prevented a wider cascade.');
  }
  if (!lines.length) {
    lines.push('A tense but manageable shift. The sign stayed lit until dawn.');
  }

  return lines.slice(0, 2);
}

function enhanceRunSummary(summary = {}, state = {}) {
  const rating = document.getElementById('summary-rating');
  const breakdown = document.getElementById('summary-breakdown');
  if (!rating || !breakdown) return;

  const gradeLabel = mapGradeToShiftLabel(summary?.grade || 'C');
  rating.classList.add('phase3-summary-rating');

  let gradeLine = rating.querySelector('.phase3-shift-grade-line');
  if (!gradeLine) {
    gradeLine = document.createElement('p');
    gradeLine.className = 'phase3-shift-grade-line';
    rating.appendChild(gradeLine);
  }
  gradeLine.textContent = gradeLabel;

  let statsList = document.getElementById('phase3-summary-stats-grid');
  if (!statsList) {
    statsList = document.createElement('div');
    statsList.id = 'phase3-summary-stats-grid';
    statsList.className = 'phase3-summary-stats-grid';
    breakdown.parentNode?.insertBefore(statsList, breakdown.nextSibling);
  }

  const objectives = Array.isArray(state?.finaleObjectives) ? state.finaleObjectives : [];
  const completedObjectives = objectives.filter((entry) => entry?.complete).length;
  statsList.innerHTML = `
    <div class="phase3-summary-stat"><span>Survival</span><strong>${summary?.grade === 'F' ? 'Failed' : 'Reached Dawn'}</strong></div>
    <div class="phase3-summary-stat"><span>Reputation</span><strong>${Number(state?.reputation || 0)}</strong></div>
    <div class="phase3-summary-stat"><span>Power</span><strong>${Number(state?.power || 0)}%</strong></div>
    <div class="phase3-summary-stat"><span>Guest Handling</span><strong>${Number(summary?.score || 0)} score</strong></div>
    <div class="phase3-summary-stat"><span>Objectives</span><strong>${completedObjectives}/${objectives.length || 0}</strong></div>
    <div class="phase3-summary-stat"><span>Final Grade</span><strong>${gradeLabel}</strong></div>
  `;

  let flavorBlock = document.getElementById('phase3-summary-flavor-lines');
  if (!flavorBlock) {
    flavorBlock = document.createElement('div');
    flavorBlock.id = 'phase3-summary-flavor-lines';
    flavorBlock.className = 'phase3-summary-flavor-lines';
    statsList.parentNode?.insertBefore(flavorBlock, statsList.nextSibling);
  }
  const flavorLines = buildFlavorLines(summary, state);
  flavorBlock.innerHTML = flavorLines.map((line) => `<p>${line}</p>`).join('');

  let replayRow = document.getElementById('phase3-summary-replay-row');
  if (!replayRow) {
    replayRow = document.createElement('div');
    replayRow.id = 'phase3-summary-replay-row';
    replayRow.className = 'phase3-summary-replay-row';
    replayRow.innerHTML = `
      <p class="section-tag">Next Shift</p>
      <p class="muted">Retry for a cleaner grade or push a harder contract to test your control.</p>
    `;
    flavorBlock.parentNode?.insertBefore(replayRow, flavorBlock.nextSibling);
  }
}

const phase3 = (window.DeadEndPhase3 = window.DeadEndPhase3 || {});
phase3.enhanceRunSummary = enhanceRunSummary;
