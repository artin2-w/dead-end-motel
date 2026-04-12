function applyMotelIdentityPass(state = {}) {
  const app = document.getElementById('app');
  if (app) {
    app.classList.add('phase3-motel-identity');
    app.classList.toggle('phase3-finale-night', Boolean(state?.finaleUi?.active));
  }

  const guestPanelHeader = document.querySelector('#frontdesk-panel .panel-header .section-tag');
  if (guestPanelHeader) {
    guestPanelHeader.textContent = 'Front Office';
  }

  const roomsHeader = document.querySelector('#frontdesk-panel .split-space .section-tag');
  if (roomsHeader) {
    roomsHeader.textContent = 'Occupied Rooms';
  }

  const reportHeader = document.querySelector('#report-panel .panel-header .section-tag');
  if (reportHeader) {
    reportHeader.textContent = 'Night Ledger';
  }

  const objectiveTag = document.querySelector('.shift-secondary-block .section-tag');
  if (objectiveTag) {
    objectiveTag.textContent = 'Shift Orders';
  }

  const queue = document.getElementById('guest-queue');
  if (queue) {
    queue.classList.add('phase3-queue-signage');
  }

  const alertStrip = document.getElementById('live-alert-strip');
  if (alertStrip) {
    alertStrip.classList.add('phase3-alert-signage');
  }

  const summaryTitle = document.querySelector('#summary-screen .section-tag');
  if (summaryTitle) {
    summaryTitle.textContent = 'Night Audit Complete';
  }
}

const phase3 = (window.DeadEndPhase3 = window.DeadEndPhase3 || {});
phase3.applyMotelIdentityPass = applyMotelIdentityPass;
