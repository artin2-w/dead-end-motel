import {
  formatShiftTime,
  getShiftProgressPercent,
  evaluateNightObjectives
} from './nightCycle.js';
import { getRoomPresentationMeta } from './presentation.js';

function formatMoney(value) {
  return `$${value}`;
}

function formatFamilyLabel(value = 'stable') {
  const text = String(value || 'stable').replace(/[-_]+/g, ' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function getOverlayOpenState(state) {
  const specialGuestId = state?.activeSpecialEncounterGuestId;
  const specialGuest = (state?.guests || []).find((entry) => entry.id === specialGuestId);
  const specialOpen = Boolean(specialGuest?.specialEncounter && !specialGuest.specialEncounter.resolved);
  return {
    camera: Boolean(state?.cameraScene?.activeScene),
    nightEvent: Boolean(state?.activeNightEvent && state?.nightEventOverlayOpen),
    special: specialOpen,
    help: Boolean(state?.onboardingUi?.helpOverlayOpen),
    settings: Boolean(state?.settingsOverlayOpen)
  };
}

function setTabBadge(id, count = 0) {
  const badge = document.getElementById(id);
  if (!badge) return;
  const safeCount = Math.max(0, Number(count || 0));
  badge.textContent = String(safeCount);
  badge.hidden = safeCount <= 0;
}

function setPanelAttention(panelId, active = false) {
  const button = document.querySelector(`.tab-button[data-panel="${panelId}"]`);
  if (!button) return;
  button.classList.toggle('needs-attention', Boolean(active));
}

function renderTutorialSurfaces(state) {
  const onboardingUi = state?.onboardingUi || {};
  const hintCard = document.getElementById('tutorial-hint-card');
  const panelIntroChip = document.getElementById('panel-intro-chip');

  if (hintCard) {
    const hint = onboardingUi?.hintCard || null;
    const show = Boolean(hint);
    hintCard.hidden = !show;
    hintCard.classList.toggle('is-guided', Boolean(onboardingUi?.heavyGuidance));
    if (!show) {
      hintCard.innerHTML = '';
    } else {
      hintCard.innerHTML = `
        <div class="tutorial-hint-head">
          <p class="section-tag">${hint.stepLabel || 'Shift Tip'}</p>
          <div class="tutorial-hint-actions">
            <button id="tutorial-dismiss-btn" class="button button-secondary" type="button">Dismiss</button>
            ${onboardingUi?.tutorialEnabled
              ? '<button id="tutorial-disable-btn" class="button button-secondary" type="button">Disable Guidance</button>'
              : '<button id="tutorial-enable-btn" class="button button-secondary" type="button">Enable Guidance</button>'}
          </div>
        </div>
        <h4>${hint.title || ''}</h4>
        <p class="muted">${hint.body || ''}</p>
      `;

      const dismissBtn = hintCard.querySelector('#tutorial-dismiss-btn');
      if (dismissBtn) {
        dismissBtn.addEventListener('click', () => {
          if (typeof state?.onDismissTutorialHint === 'function') {
            state.onDismissTutorialHint(hint.key);
          }
        });
      }

      const disableBtn = hintCard.querySelector('#tutorial-disable-btn');
      if (disableBtn) {
        disableBtn.addEventListener('click', () => {
          if (typeof state?.onDisableTutorialGuidance === 'function') {
            state.onDisableTutorialGuidance();
          }
        });
      }

      const enableBtn = hintCard.querySelector('#tutorial-enable-btn');
      if (enableBtn) {
        enableBtn.addEventListener('click', () => {
          if (typeof state?.onEnableTutorialGuidance === 'function') {
            state.onEnableTutorialGuidance();
          }
        });
      }
    }
  }

  if (panelIntroChip) {
    const intro = onboardingUi?.panelIntro || null;
    const show = Boolean(intro);
    panelIntroChip.hidden = !show;
    if (!show) {
      panelIntroChip.innerHTML = '';
    } else {
      panelIntroChip.innerHTML = `
        <strong>${intro.title || 'Panel'}</strong>
        <span>${intro.body || ''}</span>
        <button id="panel-intro-dismiss-btn" class="button button-secondary" type="button">Got it</button>
      `;
      const dismissBtn = panelIntroChip.querySelector('#panel-intro-dismiss-btn');
      if (dismissBtn) {
        dismissBtn.addEventListener('click', () => {
          if (typeof state?.onDismissPanelIntro === 'function') {
            state.onDismissPanelIntro();
          }
        });
      }
    }
  }

  const highlightedPanel = onboardingUi?.highlightPanelId || null;
  document.querySelectorAll('.panel, .tab-button').forEach((el) => {
    const panelId = el.classList.contains('tab-button') ? el.dataset.panel : el.id;
    el.classList.toggle('tutorial-highlight', Boolean(highlightedPanel && panelId === highlightedPanel));
  });
}

function renderObjectiveList(container, objectives = []) {
  if (!container) return;

  container.innerHTML = '';
  objectives.forEach((objective) => {
    const item = document.createElement('div');
    item.className = `objective-item ${objective.complete ? 'is-complete' : 'is-failed'}`;
    item.innerHTML = `
      <span class="objective-mark">${objective.complete ? '✓' : '✗'}</span>
      <span>${objective.label}</span>
    `;
    container.appendChild(item);
  });
}

export function setActiveScreen(screenId) {
  document.querySelectorAll('.screen').forEach((screen) => {
    screen.classList.toggle('active', screen.id === screenId);
  });

  const appShell = document.getElementById('app');
  if (appShell) {
    appShell.classList.remove(
      'screen-main-menu',
      'screen-game-screen',
      'screen-summary-screen',
      'screen-night-prep-screen',
      'screen-failure-screen',
      'screen-run-ending-screen'
    );
    appShell.classList.add(`screen-${screenId}`);
  }
}

export function setActivePanel(panelId) {
  document.querySelectorAll('.panel').forEach((panel) => {
    panel.classList.toggle('active-panel', panel.id === panelId);
  });

  document.querySelectorAll('.tab-button').forEach((button) => {
    button.classList.toggle('active', button.dataset.panel === panelId);
    button.setAttribute('aria-pressed', button.dataset.panel === panelId ? 'true' : 'false');
  });
}

export function renderTopbar(state) {
  document.getElementById('night-display').textContent = state.night;
  const timeDisplay = document.getElementById('time-display');
  if (timeDisplay) {
    timeDisplay.textContent = formatShiftTime(state.shiftElapsedMinutes || 0);
  }
  document.getElementById('money-display').textContent = formatMoney(state.money);
  document.getElementById('power-display').textContent = `${state.power}%`;
  document.getElementById('reputation-display').textContent = state.reputation;
  document.getElementById('power-meter-label').textContent = `${state.power}%`;
  document.getElementById('power-meter-fill').style.width = `${state.power}%`;

  const powerEconomyMeta = document.getElementById('power-economy-meta');
  if (powerEconomyMeta) {
    const economy = state?.powerEconomy || {};
    const charges = Number(economy.restoreCharges ?? 0);
    const cooldown = Number(economy.restoreCooldown ?? 0);
    powerEconomyMeta.textContent = `Generator reserve: ${charges} • Restore cooldown: ${cooldown}`;
  }

  const powerDisplay = document.getElementById('power-display');
  if (powerDisplay) {
    powerDisplay.title = 'Power fuels scans, investigations, and emergency responses.';
  }
  const reputationDisplay = document.getElementById('reputation-display');
  if (reputationDisplay) {
    reputationDisplay.title = 'Reputation reflects public/operational confidence. Low values increase failure risk.';
  }

  const shiftProgressFill = document.getElementById('shift-progress-fill');
  if (shiftProgressFill) {
    shiftProgressFill.style.width = `${getShiftProgressPercent(state)}%`;
  }

  const objectiveContainer = document.getElementById('night-objective-list');
  renderObjectiveList(objectiveContainer, evaluateNightObjectives(state));

  const scenarioLabel = document.getElementById('scenario-label');
  if (scenarioLabel) {
    scenarioLabel.textContent = state?.activeScenario?.label || 'Standard Shift';
  }

  const scenarioDescription = document.getElementById('scenario-description');
  if (scenarioDescription) {
    scenarioDescription.textContent =
      state?.activeScenario?.description ||
      'A normal night on paper, but the motel still feels one bad decision away from trouble.';
  }

  const appShell = document.getElementById('app');
  if (appShell) {
    appShell.classList.remove('pressure-calm', 'pressure-tense', 'pressure-dire');
    appShell.classList.add(`pressure-${state?.uiPressureLevel || 'calm'}`);
    const finaleBand = String(state?.finaleUi?.pressureBand || '');
    const finaleActive = Boolean(state?.finaleUi?.active);
    appShell.classList.toggle('is-finale-night', finaleActive);
    appShell.classList.toggle('is-last-stand', finaleActive && (finaleBand === 'critical' || finaleBand === 'high'));
  }

  const warningFlags = state?.topbarWarningFlags || {};
  const powerStat = document.getElementById('power-stat-box');
  const repStat = document.getElementById('reputation-stat-box');
  const timeStat = document.getElementById('time-stat-box');

  if (powerStat) {
    powerStat.classList.toggle('is-warning', Boolean(warningFlags.lowPower));
    powerStat.classList.toggle('is-danger', Number(state?.power ?? 100) <= 20);
  }

  if (repStat) {
    repStat.classList.toggle('is-warning', Boolean(warningFlags.lowReputation));
    repStat.classList.toggle('is-danger', Number(state?.reputation ?? 50) <= 25);
  }

  if (timeStat) {
    timeStat.classList.toggle('is-highlight', Boolean(warningFlags.nearDawn));
  }

  const pressureLabel = document.getElementById('shift-pressure-label');
  if (pressureLabel) {
    const pressure = state?.uiPressureLevel || 'calm';
    pressureLabel.textContent = `Pressure: ${pressure.charAt(0).toUpperCase()}${pressure.slice(1)}`;
    pressureLabel.className = `shift-pressure-label pressure-${pressure}`;
  }

  const alertStrip = document.getElementById('live-alert-strip');
  if (alertStrip) {
    alertStrip.innerHTML = '';
    const priority = { danger: 4, warning: 3, success: 2, info: 1 };
    const alerts = (Array.isArray(state?.liveAlerts) ? state.liveAlerts.slice() : [])
      .sort((a, b) => {
        const typeDiff = (priority[b?.type] || 0) - (priority[a?.type] || 0);
        if (typeDiff !== 0) return typeDiff;
        return Number(b?.createdAt || 0) - Number(a?.createdAt || 0);
      })
      .slice(0, 4);

    alerts.forEach((alert) => {
      const item = document.createElement('div');
      const type = alert?.type || 'info';
      const isActionable = alert?.kind === 'actionable';
      item.className = `live-alert live-alert-${type} ${isActionable ? 'live-alert-actionable' : ''}`;
      item.innerHTML = `
        <strong class="live-alert-label">${isActionable ? 'Action' : type.toUpperCase()}</strong>
        <span>${alert?.message || ''}</span>
      `;
      alertStrip.appendChild(item);
    });

    const totalCount = Array.isArray(state?.liveAlerts) ? state.liveAlerts.length : 0;
    if (totalCount > alerts.length) {
      const overflow = document.createElement('div');
      overflow.className = 'live-alert live-alert-overflow';
      overflow.textContent = `+${totalCount - alerts.length} more alerts`;
      alertStrip.appendChild(overflow);
    }
  }

  const audioToggleBtn = document.getElementById('audio-toggle-btn');
  if (audioToggleBtn) {
    const muted = Boolean(state?.audioMuted);
    audioToggleBtn.textContent = muted ? 'Sound: Off' : 'Sound: On';
    audioToggleBtn.classList.toggle('is-muted', muted);
    audioToggleBtn.classList.toggle('is-active', !muted);
  }

  const activeUpgradesInline = document.getElementById('active-upgrades-inline');
  if (activeUpgradesInline) {
    const summary = state?.activeUpgradeSummary || 'No active upgrades yet.';
    activeUpgradesInline.textContent = `Active Upgrades: ${summary}`;
  }

  const storyBeatCard = document.getElementById('active-story-beat-card');
  if (storyBeatCard) {
    const beat = state?.activeStoryBeat || null;
    if (!beat) {
      storyBeatCard.classList.remove('is-active');
      storyBeatCard.innerHTML = '<p class="muted">No recurring story beat active tonight.</p>';
    } else {
      storyBeatCard.classList.add('is-active');
      storyBeatCard.innerHTML = `
        <div class="active-event-header">
          <p class="section-tag">Story Beat</p>
          <span class="active-event-severity severity-medium">STAGE ${Math.max(1, Number(beat.stage || 1))}</span>
        </div>
        <h4>${beat.title || 'Recurring Thread'}</h4>
        <p class="muted">${beat.note || 'A prior night consequence may surface during this shift.'}</p>
      `;
    }
  }

  const runIdentityStrip = document.getElementById('run-identity-strip');
  if (runIdentityStrip) {
    const doctrineTitle = state?.doctrineDisplay?.title || 'Stability Manager';
    const signal = state?.primaryFactionSignal || 'Faction climate remains mostly neutral tonight.';
    runIdentityStrip.innerHTML = `
      <p>Operating Doctrine: <strong>${doctrineTitle}</strong></p>
      <p class="muted">${signal}</p>
      ${state?.nightIdentityLine ? `<p class="muted">${state.nightIdentityLine}</p>` : ''}
      ${state?.crisisNight?.active && state?.crisisNight?.note ? `<p class="muted">${state.crisisNight.note}</p>` : ''}
    `;
    runIdentityStrip.title = 'Doctrine and faction climate shape subtle bonuses, pressure, and narrative tone.';
  }

  const shiftBranchHint = document.getElementById('shift-branch-hint');
  if (shiftBranchHint) {
    shiftBranchHint.textContent = state?.directorShiftHint || 'Outlook: Pressure is mixed tonight.';
  }

  const campaignShiftLine = document.getElementById('campaign-shift-line');
  if (campaignShiftLine) {
    const progress = state?.campaignProgress;
    const milestone = state?.campaignMilestone;
    const label = progress?.label || `Night ${state?.night || 1} of 5`;
    campaignShiftLine.textContent = milestone?.isFinale
      ? `Campaign: ${label} • Finale Night`
      : milestone?.isMilestone
        ? `Campaign: ${label} • ${milestone.label}`
        : `Campaign: ${label}`;
  }

  const motelCapacityLine = document.getElementById('motel-capacity-line');
  if (motelCapacityLine) {
    motelCapacityLine.textContent = state?.motelCapacityLine || '';
  }

  const frontdeskIntakeLine = document.getElementById('frontdesk-intake-line');
  if (frontdeskIntakeLine) {
    frontdeskIntakeLine.textContent = state?.intakeStatusLine || '';
  }

  const finaleBanner = document.getElementById('finale-banner');
  const finaleStateCard = document.getElementById('finale-state-card');
  const finalePressureLabel = document.getElementById('finale-pressure-label');
  const finaleChainLabel = document.getElementById('finale-chain-label');
  const finaleObjectivesWrap = document.getElementById('finale-objectives-wrap');
  const finaleObjectiveList = document.getElementById('finale-objective-list');
  const finaleCommandRow = document.getElementById('finale-command-row');
  const finaleUi = state?.finaleUi || null;
  const finaleActive = Boolean(finaleUi?.active);

  if (finaleBanner) {
    finaleBanner.hidden = !finaleActive;
    finaleBanner.textContent = finaleUi?.banner || 'Final Night';
  }

  if (finaleStateCard) {
    finaleStateCard.hidden = !finaleActive;
    finaleStateCard.classList.remove('band-contained', 'band-elevated', 'band-high', 'band-critical');
    if (finaleActive) {
      finaleStateCard.classList.add(`band-${finaleUi?.pressureBand || 'contained'}`);
    }
  }

  if (finalePressureLabel) {
    finalePressureLabel.textContent = finaleUi?.pressureLabel || 'Finale pressure: CONTAINED (0)';
  }

  if (finaleChainLabel) {
    if (!finaleActive) {
      finaleChainLabel.textContent = '';
    } else {
      const spillovers = Number(finaleUi?.chainSpilloversTriggered || 0);
      const contained = Number(finaleUi?.containmentMoments || 0);
      finaleChainLabel.textContent = `Cross-zone chains: ${spillovers} • Containment actions: ${contained}`;
    }
  }

  if (finaleObjectivesWrap) {
    const objectives = Array.isArray(state?.finaleObjectives) ? state.finaleObjectives : [];
    finaleObjectivesWrap.hidden = !finaleActive || objectives.length === 0;
    if (finaleObjectiveList) {
      renderObjectiveList(finaleObjectiveList, objectives);
    }
  }

  if (finaleCommandRow) {
    finaleCommandRow.innerHTML = '';
    if (finaleActive) {
      const commands = Array.isArray(state?.finaleCommandOptions) ? state.finaleCommandOptions : [];
      commands.slice(0, 4).forEach((command) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'button button-secondary finale-command-btn';
        button.disabled = !command?.available;
        button.innerHTML = `
          <span>${command?.label || 'Finale Command'}</span>
          <small>${command?.costLabel || ''}</small>
        `;
        button.addEventListener('click', () => {
          if (typeof state?.onFinaleCommandChoice === 'function' && command?.id) {
            state.onFinaleCommandChoice(command.id);
          }
        });
        finaleCommandRow.appendChild(button);
      });
    }
  }

  const unresolvedCameraCount = (state?.cameras || []).filter((camera) => {
    const activeEvent = (state.activeEvents || []).find(
      (event) => String(event?.cameraId) === String(camera.id)
    );
    const resolvedByScene = Boolean(state?.cameraScene?.resolvedZones?.[camera.id]);
    return Boolean(activeEvent && !resolvedByScene);
  }).length;

  const actionableAlerts = (state?.liveAlerts || []).filter((alert) => alert?.kind === 'actionable').length;
  const reportAttention = actionableAlerts + (state?.activeNightEvent ? 1 : 0);

  setTabBadge('frontdesk-tab-badge', state?.guests?.length || 0);
  setTabBadge('cameras-tab-badge', unresolvedCameraCount);
  setTabBadge('report-tab-badge', reportAttention);

  setPanelAttention('frontdesk-panel', (state?.guests?.length || 0) > 0);
  setPanelAttention('cameras-panel', unresolvedCameraCount > 0);
  setPanelAttention('report-panel', reportAttention > 0);

  if (appShell) {
    const overlays = getOverlayOpenState(state);
    appShell.classList.toggle(
      'overlay-open',
      overlays.camera || overlays.nightEvent || overlays.special || overlays.help || overlays.settings
    );
  }

  renderTutorialSurfaces(state);

  const openHelpBtn = document.getElementById('open-help-btn');
  if (openHelpBtn) {
    openHelpBtn.onclick = () => {
      if (typeof state?.onToggleHelpOverlay === 'function') {
        state.onToggleHelpOverlay(true);
      }
    };
  }

  const openSettingsBtn = document.getElementById('open-settings-btn');
  if (openSettingsBtn) {
    openSettingsBtn.onclick = () => {
      if (typeof state?.onToggleSettingsOverlay === 'function') {
        state.onToggleSettingsOverlay(true);
      }
    };
  }
}

function getRiskBadgeClass(riskLevel = 'Low') {
  return `risk-badge-${riskLevel.toLowerCase()}`;
}

function getRoomConditionClass(condition = 'Stable') {
  return `room-condition-${condition.toLowerCase().replace(/\s+/g, '-')}`;
}

function getFlagBadgeMarkup(flagged) {
  if (!flagged) return '';
  return `<span class="desk-flag-badge">FLAGGED</span>`;
}

function getReturningBadgeMarkup(guest) {
  if (!guest?.isReturningGuest && !guest?.isKnownGuest) return '';
  return `<span class="guest-returning-badge">${guest?.isReturningGuest ? 'RETURNING GUEST' : 'KNOWN GUEST'}</span>`;
}

function getDeskFlagText(value) {
  return value ? 'Yes' : 'No';
}

function getPolicyBadgeClass(recommendation = 'Approve') {
  return `policy-badge-${recommendation.toLowerCase()}`;
}

function getSignalLevelClass(value = 0) {
  const numeric = Number(value || 0);
  if (numeric >= 2) return 'is-strong';
  if (numeric >= 1) return 'is-moderate';
  return 'is-low';
}

function buildSignalChips(guest) {
  const urgency = Number(guest?.urgencySignal || 0);
  const instability = Number(guest?.instabilitySignal || 0);
  const deception = Number(guest?.deceptionSignal || 0);
  const policyFit = String(guest?.policyAlignmentHint || 'aligned');
  const mismatch = policyFit === 'mismatch' ? 'Mismatch' : policyFit === 'borderline' ? 'Borderline' : 'Aligned';

  return [
    `<span class="guest-signal-chip ${getSignalLevelClass(urgency)}">Urgency ${urgency}</span>`,
    `<span class="guest-signal-chip ${getSignalLevelClass(instability)}">Stability ${Math.max(0, 2 - instability)}</span>`,
    `<span class="guest-signal-chip ${getSignalLevelClass(deception)}">Deception ${deception}</span>`,
    `<span class="guest-signal-chip ${policyFit === 'mismatch' ? 'is-strong' : policyFit === 'borderline' ? 'is-moderate' : 'is-low'}">Policy ${mismatch}</span>`
  ].join('');
}

function getPolicyOverrideText(value) {
  return value ? 'Yes' : 'No';
}

function getBooleanText(value) {
  return value ? 'Yes' : 'No';
}

function emphasizeClueText(text = '') {
  const safe = String(text || '');
  if (!safe) return '';
  return safe.replace(
    /(evasive|shifting|restless|reactive|tense|aggressive|desperate|exhausted|drained|calm|direct|controlling|manipulative|unstable)/gi,
    '<span class="guest-clue-emphasis">$1</span>'
  );
}

function buildResponseOptionMarkup({ title, effectLine, description, note, notePrefix = '' }) {
  const safeTitle = title || 'Response Option';
  const safeEffectLine = effectLine || 'No direct cost';
  const safeDescription = description || '';
  const safeNote = note || '';

  return `
    <span class="camera-scene-action-stack">
      <span class="camera-scene-action-block camera-scene-action-block-title">
        <span class="camera-scene-action-title">${safeTitle}</span>
      </span>
      <span class="camera-scene-action-block camera-scene-action-block-cost">
        <span class="camera-scene-action-cost">${safeEffectLine}</span>
      </span>
      ${safeDescription
        ? `<span class="camera-scene-action-block camera-scene-action-block-desc"><small class="camera-scene-action-desc">${safeDescription}</small></span>`
        : ''}
      ${safeNote
        ? `<span class="camera-scene-action-block camera-scene-action-block-note"><small class="camera-scene-action-note">${notePrefix}${safeNote}</small></span>`
        : ''}
    </span>
  `;
}

function bindAtomicActionButton(button, handler, { groupRoot = null } = {}) {
  if (!button || typeof handler !== 'function') return;
  let fired = false;
  button.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (fired || button.disabled) return;
    fired = true;
    const root = groupRoot || button.closest('.camera-scene-actions, .guest-action-row, .room-tactical-row, .button-row, .report-panel-actions');
    if (root) {
      root.querySelectorAll('button').forEach((entry) => {
        entry.disabled = true;
        entry.classList.add('is-processing');
      });
    }
    button.disabled = true;
    button.classList.add('is-processing');
    button.setAttribute('aria-busy', 'true');
    handler();
  }, { passive: false });
}

export function renderGuests(state, onCheckIn, onFlagGuest, onRejectGuest, onHandleSpecialEncounter) {
  const queue = document.getElementById('guest-queue');
  queue.innerHTML = '';

  if (!state.guests.length) {
    queue.innerHTML =
      '<div class="log-item">No guests waiting. Use Call Next Arrival when you have intake slots and queue space.</div>';
    return;
  }

  state.guests.forEach((guest) => {
    const card = document.createElement('article');
    const emphasisClass = Number(guest?.deceptionSignal || 0) >= 2 || Number(guest?.instabilitySignal || 0) >= 2
      ? 'guest-card-elevated'
      : Number(guest?.urgencySignal || 0) >= 2
        ? 'guest-card-urgent'
        : '';
    card.className = `guest-card ${emphasisClass}`.trim();
    card.innerHTML = `
      <div class="guest-card-header">
        <h4>${guest.name}</h4>
        <div class="guest-critical-badges">
          ${getReturningBadgeMarkup(guest)}
          ${getFlagBadgeMarkup(guest.flagged)}
          ${guest?.specialEncounter && !guest.specialEncounter.resolved
            ? `<span class="special-badge">${guest.specialEncounter.badgeLabel || 'SPECIAL'}</span>`
            : ''}
        </div>
      </div>
      <div class="guest-chip-row guest-chip-row-primary">
        <span class="risk-badge ${getRiskBadgeClass(guest.riskLevel || 'Low')}" title="Risk estimates incident chance after check-in.">Risk: ${guest.riskLevel || 'Low'}</span>
        <span class="policy-badge ${getPolicyBadgeClass(guest.policyRecommendation || 'Approve')}" title="Policy is guidance, not a forced action.">${(guest.policyRecommendation || 'Approve').toUpperCase()}</span>
        <span class="guest-meta-chip">Mood: ${guest.mood}</span>
        <span class="guest-meta-chip guest-meta-chip-archetype">${guest.archetypeLabel || 'Unknown Pattern'}</span>
      </div>
      <div class="guest-chip-row guest-chip-row-secondary">
        ${buildSignalChips(guest)}
        ${guest?.contradictoryClue ? '<span class="guest-meta-chip guest-meta-chip-contradiction">Mixed Cues</span>' : ''}
        ${Number(guest?.expectedStayNights || 0) > 0 ? `<span class="guest-meta-chip guest-stay-chip" title="Expected stay length if approved.">Stay: ${guest.expectedStayNights}N</span>` : ''}
      </div>
      ${guest?.specialEncounter && !guest.specialEncounter.resolved
        ? `
          <div class="guest-special-row guest-detail-block">
            <span class="guest-special-title">${guest.specialEncounter.title || 'Special Encounter'}</span>
            <span class="guest-special-preview">${guest.specialEncounter.preview || ''}</span>
          </div>
          <p class="guest-special-clue">${guest.specialEncounter.clue || ''}</p>
        `
        : ''}
      <div class="guest-detail-block">
        ${guest.archetypeClue ? `<p class="guest-archetype-clue">${emphasizeClueText(guest.archetypeClue)}</p>` : ''}
        <p class="guest-policy-reason">${guest.policyAlignmentLine || guest.policyReason || 'No policy concerns detected.'}</p>
        <p class="guest-note">${guest.riskNote || ''}</p>
        ${(guest?.contextTag || guest?.visualHint)
          ? `<p class="guest-scan-line">${guest.contextTag ? `Context: ${guest.contextTag}. ` : ''}${guest.visualHint ? `Visual: ${guest.visualHint}.` : ''}</p>`
          : ''}
      </div>
      ${(guest.priorHistoryLine || guest.threadMemoryLine)
        ? `<div class="guest-history-block">
            ${guest.priorHistoryLine ? `<p class="guest-history-line">${guest.priorHistoryLine}</p>` : ''}
            ${guest.threadMemoryLine ? `<p class="guest-history-line">${guest.threadMemoryLine}</p>` : ''}
          </div>`
        : ''}
      <div class="guest-action-row"></div>
    `;

    const actions = card.querySelector('.guest-action-row');
    const checkInButton = document.createElement('button');
    checkInButton.className = 'button button-primary';
    checkInButton.textContent = 'Check In';
    checkInButton.title = 'Assign room now. Gains money, but may introduce pressure depending on guest risk.';
    bindAtomicActionButton(checkInButton, () => onCheckIn(guest.id), { groupRoot: actions });

    const flagButton = document.createElement('button');
    flagButton.className = 'button button-secondary';
    flagButton.textContent = 'Flag';
    flagButton.title = 'Mark for monitoring. Often safer than immediate approval.';
    bindAtomicActionButton(flagButton, () => onFlagGuest(guest.id), { groupRoot: actions });

    const rejectButton = document.createElement('button');
    rejectButton.className = 'button button-danger';
    rejectButton.textContent = 'Reject';
    rejectButton.title = 'Turn the guest away. May reduce immediate risk but can hurt reputation.';
    bindAtomicActionButton(rejectButton, () => onRejectGuest(guest.id), { groupRoot: actions });

    actions.appendChild(checkInButton);
    actions.appendChild(flagButton);
    actions.appendChild(rejectButton);

    if (guest?.specialEncounter && !guest.specialEncounter.resolved) {
      const specialButton = document.createElement('button');
      specialButton.className = 'button button-special';
      specialButton.textContent = 'Handle Special';
      specialButton.title = 'Resolve a special encounter with deeper long-term consequences.';
      bindAtomicActionButton(specialButton, () => {
        if (typeof onHandleSpecialEncounter === 'function') {
          onHandleSpecialEncounter(guest.id);
        }
      }, { groupRoot: actions });
      actions.appendChild(specialButton);
    }

    queue.appendChild(card);
  });
}

export function renderNightEventCard(state) {
  const card = document.getElementById('active-night-event-card');
  if (!card) return;

  const event = state?.activeNightEvent || null;
  if (!event) {
    card.classList.remove('is-active');
    card.innerHTML = '<p class="muted">No active shift events.</p>';
    return;
  }

  card.classList.add('is-active');
  card.innerHTML = `
    <div class="active-event-header">
      <p class="section-tag">Active Event</p>
      <span class="active-event-severity severity-${event.severity || 'low'}">${String(event.severity || 'low').toUpperCase()}</span>
    </div>
    <h4>${event.title}</h4>
    <p class="muted">${event.description}</p>
    <button id="respond-night-event-btn" class="button button-warning" type="button">Respond</button>
  `;

  const button = card.querySelector('#respond-night-event-btn');
  if (button) {
    button.addEventListener('click', () => {
      if (typeof state.onRespondNightEvent === 'function') {
        state.onRespondNightEvent();
      }
    });
  }
}

export function renderNightEventOverlay(state) {
  const overlay = document.getElementById('night-event-overlay');
  if (!overlay) return;
  const event = state?.activeNightEvent || null;
  const shouldShow = Boolean(event && state?.nightEventOverlayOpen);

  overlay.classList.toggle('is-open', shouldShow);
  overlay.setAttribute('aria-hidden', shouldShow ? 'false' : 'true');
  if (!shouldShow) {
    overlay.innerHTML = '';
    return;
  }

  const options = Array.isArray(event.options) ? event.options : [];
  overlay.innerHTML = `
    <div class="camera-scene-panel special-overlay-panel event-severity-${String(event.severity || 'low').toLowerCase()}" role="dialog" aria-modal="true" aria-label="Shift event response">
      <div class="camera-scene-header">
        <div>
          <p class="section-tag">Incident Response</p>
          <h3>${event.title}</h3>
          <p class="camera-scene-sublabel">Severity: ${(event.severity || 'low').toUpperCase()}</p>
        </div>
        <button id="night-event-close-btn" class="button button-secondary overlay-close-btn" type="button" aria-label="Close shift event overlay">Close</button>
      </div>
      <p class="camera-scene-description">${event.description || ''}</p>
      <p class="camera-scene-stage-note muted">Review costs and pick your response.</p>
      <div class="camera-scene-actions" id="night-event-actions"></div>
    </div>
  `;

  const actionRoot = overlay.querySelector('#night-event-actions');
  options.forEach((option) => {
    if (!option) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'button button-secondary camera-scene-action-btn';
    const title = option?.label || 'Response Option';
    const effectLine = option?.preview || option?.costLine || 'No direct cost';
    const description = option?.description || option?.summary || '';
    const note = option?.riskNote || option?.resultNote || option?.note || '';
    button.innerHTML = buildResponseOptionMarkup({
      title,
      effectLine,
      description,
      note
    });
    bindAtomicActionButton(button, () => {
      if (typeof state.onNightEventChoice === 'function' && option?.id != null) {
        state.onNightEventChoice(option.id);
      }
    }, { groupRoot: actionRoot });
    actionRoot.appendChild(button);
  });

  const closeButton = overlay.querySelector('#night-event-close-btn');
  if (closeButton) {
    closeButton.addEventListener('click', () => {
      if (typeof state.onCloseNightEvent === 'function') {
        state.onCloseNightEvent();
      }
    });
  }
}

export function renderRooms(
  state,
  onLockDownRoom,
  onCallPoliceForRoom,
  onCutPowerToRoom,
  onEvictRoomGuest
) {
  const roomList = document.getElementById('room-list');
  roomList.innerHTML = '';

  state.rooms.forEach((room) => {
    const presentation = getRoomPresentationMeta(room);
    const card = document.createElement('article');
    const lockedOut = room?.unlocked === false;
    card.className = `room-card ${getRoomConditionClass(room.condition || 'Stable')} room-tone-${presentation.tone} ${presentation.shouldPulse ? 'is-critical-pulse' : ''} ${room.occupied ? 'room-card-occupied' : 'room-card-vacant'} ${lockedOut ? 'room-card-locked' : ''}`;
    if (lockedOut) {
      card.innerHTML = `
        <div class="room-card-header">
          <h4>${room.label}</h4>
          <span class="room-condition-pill">Locked</span>
        </div>
        <p class="room-meta muted">Not licensed for occupancy yet — unlocks as the campaign expands.</p>
      `;
      roomList.appendChild(card);
      return;
    }
    card.innerHTML = room.occupied
      ? `
        <div class="room-card-header">
          <h4>${room.label}</h4>
          <span class="room-condition-pill">${room.condition || 'Stable'}</span>
        </div>
        <div class="room-occupant-block">
          <p class="room-meta">Occupied by <strong>${room.guestName || room.occupiedBy}</strong></p>
          ${Number(room.stayNightsRemaining) > 0 ? `<p class="room-stay-line muted">Stay remaining: ${room.stayNightsRemaining} night${Number(room.stayNightsRemaining) === 1 ? '' : 's'} incl. tonight${Number(room.stayNightsRemaining) === 1 ? ' • checkout at dawn' : ''}</p>` : ''}
          ${room.occupantArchetypeLabel ? `<p class="room-archetype-line">Archetype: ${room.occupantArchetypeLabel}</p>` : ''}
          ${room?.memory?.note ? `<p class="room-memory-line muted">${room.memory.note}</p>` : ''}
        </div>
        <div class="room-pressure-row">
          ${typeof room.chainPressure === 'number' && room.chainPressure > 0 ? `<p class="room-chain-line ${room.chainPressure >= 6 ? 'is-high' : ''}" title="Chain pressure tracks linked incident momentum across rooms.">Chain Pressure: ${room.chainPressure}</p>` : '<p class="room-chain-line" title="Chain pressure tracks linked incident momentum across rooms.">Chain Pressure: Low</p>'}
          <span class="room-state-chip">Locked: ${getBooleanText(room.lockedDown)}</span>
          <span class="room-state-chip">Power Cut: ${getBooleanText(room.powerCut)}</span>
        </div>
        <div class="room-meta-grid room-meta-grid-compact">
          ${presentation.compactMetaRows
            .map((row) => `<p class="room-meta-line"><span>${row.label}</span><strong>${row.value}</strong></p>`)
            .join('')}
        </div>
        <div class="room-tactical-row"></div>
      `
      : `
        <div class="room-card-header">
          <h4>${room.label}</h4>
          <span class="room-condition-pill">Vacant</span>
        </div>
        <p class="room-meta">Vacant and available for check-in.</p>
      `;

    if (room.occupied) {
      const actions = card.querySelector('.room-tactical-row');

      const lockDownButton = document.createElement('button');
      lockDownButton.className = 'button button-warning';
      lockDownButton.textContent = 'Lock Down';
      lockDownButton.title =
        'NOW: hard containment and calmer chains. LATER: guest complaints and audit/reputation tail once it lifts.';
      bindAtomicActionButton(lockDownButton, () => onLockDownRoom(room.id), { groupRoot: actions });

      const callPoliceButton = document.createElement('button');
      callPoliceButton.className = 'button button-police';
      callPoliceButton.textContent = 'Call Police';
      callPoliceButton.title = 'Strong intervention with faction and reputation implications.';
      bindAtomicActionButton(callPoliceButton, () => onCallPoliceForRoom(room.id), { groupRoot: actions });

      const cutPowerButton = document.createElement('button');
      cutPowerButton.className = 'button button-danger';
      cutPowerButton.textContent = 'Cut Power';
      cutPowerButton.title =
        'NOW: kills room activity and can blunt spikes. LATER: maintenance backlash and harsher reputation fallout.';
      bindAtomicActionButton(cutPowerButton, () => onCutPowerToRoom(room.id), { groupRoot: actions });

      const evictButton = document.createElement('button');
      evictButton.className = 'button button-evict';
      evictButton.textContent = 'Evict Guest';
      evictButton.title = 'Force guest removal. Immediate relief, often high social cost.';
      bindAtomicActionButton(evictButton, () => onEvictRoomGuest(room.id), { groupRoot: actions });

      actions.appendChild(lockDownButton);
      actions.appendChild(callPoliceButton);
      actions.appendChild(cutPowerButton);
      actions.appendChild(evictButton);
    }

    roomList.appendChild(card);
  });
}

function getCameraStatusClass(status) {
  return `camera-status-${status.toLowerCase().replace(/\s+/g, '-')}`;
}

export function renderCameras(state) {
  const grid = document.getElementById('camera-grid');
  grid.innerHTML = '';

  state.cameras.forEach((camera) => {
    const activeEvent = (state.activeEvents || []).find(
      (event) => String(event?.cameraId) === String(camera.id)
    );
    const resolvedByScene = Boolean(state?.cameraScene?.resolvedZones?.[camera.id]);
    const actionable = Boolean(activeEvent && !resolvedByScene);
    const zoneState = state?.locationState?.zones?.[camera.id] || state?.locationState?.zones?.[String(camera.id)] || null;
    const zoneStatusText = zoneState?.stabilityStatus
      ? String(zoneState.stabilityStatus).replace(/-/g, ' ')
      : 'clear';
    const containmentText = zoneState?.containmentTier
      ? String(zoneState.containmentTier).replace(/-/g, ' ')
      : 'none';

    const card = document.createElement('article');
    card.className = `camera-card ${getCameraStatusClass(camera.status)} ${actionable ? 'is-actionable' : ''}`;
    const statusClass = camera.status === 'Clear' ? 'is-clear' : 'is-alert';
    card.innerHTML = `
      <div class="camera-preview"></div>
      <h4>${camera.name}</h4>
      <p class="camera-meta">Status: <span class="camera-status-badge ${statusClass}">${camera.status}</span></p>
      <p class="camera-meta">Zone: ${zoneStatusText} • ${containmentText}</p>
      ${actionable ? '<p class="camera-alert-line">Anomaly requires response.</p>' : ''}
    `;

    if (actionable) {
      const button = document.createElement('button');
      button.className = 'button button-warning camera-investigate-btn';
      button.textContent = 'Investigate';
      button.title = 'Open scene response options for this anomaly.';
      button.addEventListener('click', (event) => {
        event.stopPropagation();
        if (typeof state.onInvestigateCamera === 'function') {
          state.onInvestigateCamera(camera.id);
        }
      });
      card.appendChild(button);

      card.addEventListener('click', () => {
        if (typeof state.onInvestigateCamera === 'function') {
          state.onInvestigateCamera(camera.id);
        }
      });
    }

    grid.appendChild(card);
  });
}

export function renderCameraSceneOverlay(state) {
  const overlay = document.getElementById('camera-scene-overlay');
  if (!overlay) return;

  const scene = state?.cameraScene?.activeScene || null;
  const shouldShow = Boolean(scene);
  overlay.classList.toggle('is-open', shouldShow);
  overlay.setAttribute('aria-hidden', shouldShow ? 'false' : 'true');

  if (!shouldShow) {
    overlay.innerHTML = '';
    return;
  }

  const actions = Array.isArray(scene.actions) ? scene.actions : [];
  overlay.innerHTML = `
    <div class="camera-scene-panel camera-scene-tone-${String(scene.severity || 'low').toLowerCase()}" role="dialog" aria-modal="true" aria-label="Camera incident scene">
      <div class="camera-scene-header">
        <div>
          <p class="section-tag">Location Incident</p>
          <h3>${scene.zoneName}</h3>
          <p class="camera-scene-sublabel">${scene.subLabel || ''}</p>
        </div>
        <button id="camera-scene-close-btn" class="button button-secondary overlay-close-btn" type="button" aria-label="Close camera scene overlay">Close</button>
      </div>
      <p class="camera-scene-title">${scene.title}</p>
      <p class="camera-scene-description">${scene.description}</p>
      <p class="camera-scene-flavor">${scene.atmosphere || ''}</p>
      ${Array.isArray(scene.reactiveOverlay) && scene.reactiveOverlay.length
        ? `<div class="camera-scene-stage"><ul class="prep-notes-list">${scene.reactiveOverlay
            .slice(0, 2)
            .map((line) => `<li><span>${line}</span></li>`)
            .join('')}</ul></div>`
        : ''}
      <div class="camera-scene-meta">
        <span class="camera-scene-severity camera-scene-severity-${scene.severity || 'low'}">${(scene.severity || 'low').toUpperCase()} severity</span>
        <span>Pressure ${scene.pressure || 1}</span>
      </div>
      ${scene.zoneStatusLine ? `<div class="camera-scene-stage"><p>${scene.zoneStatusLine}</p></div>` : ''}
      ${scene.statusNote ? `<p class="camera-scene-stage-note muted">${scene.statusNote}</p>` : ''}
      ${Array.isArray(scene.modifiers) && scene.modifiers.length
        ? `<div class="camera-scene-modifiers">${scene.modifiers
            .map(
              (modifier) =>
                `<span class="camera-scene-modifier">${modifier.label} (${modifier.turns})</span>`
            )
            .join('')}</div>`
        : ''}
      <div class="camera-scene-stage">
        <p>Choose one response: one cost, one immediate outcome. If unresolved, the incident state will update clearly.</p>
      </div>
      <div class="camera-scene-actions" id="camera-scene-actions"></div>
    </div>
  `;

  const actionRoot = overlay.querySelector('#camera-scene-actions');
  actions.forEach((action) => {
    if (!action) return;
    const button = document.createElement('button');
    button.type = 'button';
    const actionIntentText = `${action?.label || ''} ${action?.hint || ''} ${action?.likelyEffect || ''}`.toLowerCase();
    const actionIntentClass =
      actionIntentText.includes('stabil') || actionIntentText.includes('reduce') || actionIntentText.includes('safer')
        ? 'is-safer'
        : actionIntentText.includes('risk') || actionIntentText.includes('volatile') || actionIntentText.includes('aggressive')
          ? 'is-risky'
          : '';
    button.className = `button button-secondary camera-scene-action-btn ${actionIntentClass}`.trim();
    button.disabled = Boolean(action.disabled);
    const costBits = [];
    const shownPowerCost = Number(action.displayPowerCost ?? action.powerCost ?? 0);
    const shownMoneyCost = Number(action.displayMoneyCost ?? action.moneyCost ?? 0);
    if (shownPowerCost > 0) costBits.push(`-${shownPowerCost}% power`);
    if (shownMoneyCost > 0) costBits.push(`-$${shownMoneyCost}`);
    const title = action?.label || 'Response Option';
    const effectLine = action.disabled ? action.disabledReason || 'Unavailable' : costBits.join(' • ') || 'No direct cost';
    const description = !action.disabled ? action.hint || '' : '';
    const note = !action.disabled ? action.likelyEffect || '' : '';
    button.innerHTML = buildResponseOptionMarkup({
      title,
      effectLine,
      description,
      note,
      notePrefix: 'Likely: '
    });
    bindAtomicActionButton(button, () => {
      if (typeof state.onCameraSceneAction === 'function' && action?.id != null) {
        state.onCameraSceneAction(scene.zoneId, action.id);
      }
    }, { groupRoot: actionRoot });
    actionRoot.appendChild(button);
  });

  const closeButton = overlay.querySelector('#camera-scene-close-btn');
  if (closeButton) {
    closeButton.addEventListener('click', () => {
      if (typeof state.onCloseCameraScene === 'function') {
        state.onCloseCameraScene();
      }
    });
  }
}

export function renderSpecialEncounterOverlay(state) {
  const overlay = document.getElementById('special-encounter-overlay');
  if (!overlay) return;

  const guestId = state?.activeSpecialEncounterGuestId;
  const guest = (state?.guests || []).find((entry) => entry.id === guestId);
  const encounter = guest?.specialEncounter;
  const shouldShow = Boolean(encounter && !encounter.resolved);

  overlay.classList.toggle('is-open', shouldShow);
  overlay.setAttribute('aria-hidden', shouldShow ? 'false' : 'true');
  if (!shouldShow) {
    overlay.innerHTML = '';
    return;
  }

  const options = Array.isArray(encounter.options) ? encounter.options : [];
  overlay.innerHTML = `
    <div class="camera-scene-panel special-overlay-panel special-encounter-tone" role="dialog" aria-modal="true" aria-label="Special encounter response">
      <div class="camera-scene-header">
        <div>
          <p class="section-tag">Special Encounter</p>
          <h3>${encounter.title || 'Special'}</h3>
          <p class="camera-scene-sublabel">${encounter.badgeLabel || 'SPECIAL'} • ${guest?.name || ''}</p>
        </div>
        <button id="special-encounter-close-btn" class="button button-secondary overlay-close-btn" type="button" aria-label="Close special encounter overlay">Close</button>
      </div>
      <p class="camera-scene-description">${encounter.description || ''}</p>
      ${encounter.clue ? `<p class="camera-scene-flavor">${encounter.clue}</p>` : ''}
      <p class="camera-scene-stage-note muted">Choose a response based on risk and long-term consequences.</p>
      <div class="camera-scene-actions" id="special-encounter-actions"></div>
    </div>
  `;

  const actionRoot = overlay.querySelector('#special-encounter-actions');
  options.forEach((option) => {
    if (!option) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'button button-secondary camera-scene-action-btn';
    const title = option?.label || 'Response Option';
    const effectLine = option?.preview || option?.costLine || 'No direct cost';
    const description = option?.description || option?.summary || '';
    const note = option?.riskNote || option?.resultNote || option?.note || '';
    button.innerHTML = buildResponseOptionMarkup({
      title,
      effectLine,
      description,
      note
    });
    bindAtomicActionButton(button, () => {
      if (typeof state.onSpecialEncounterChoice === 'function' && guest?.id != null && option?.id != null) {
        state.onSpecialEncounterChoice(guest.id, option.id);
      }
    }, { groupRoot: actionRoot });
    actionRoot.appendChild(button);
  });

  const closeButton = overlay.querySelector('#special-encounter-close-btn');
  if (closeButton) {
    closeButton.addEventListener('click', () => {
      if (typeof state.onCloseSpecialEncounter === 'function') {
        state.onCloseSpecialEncounter();
      }
    });
  }
}

export function renderLogs(state) {
  const list = document.getElementById('incident-log');
  list.innerHTML = '';

  if (!state.logs.length) {
    list.innerHTML = '<div class="log-item">No incidents yet.</div>';
    return;
  }

  const classifyLogLine = (line = '') => {
    const value = String(line).toLowerCase();
    if (/(failed|collapse|critical|blackout|evict|danger|breach|slipping)/.test(value)) return 'danger';
    if (/(warning|low|flagged|blocked|unstable|risk|pressure|incident)/.test(value)) return 'warning';
    if (/(success|stabilized|restored|owned|resolved|complete|back online)/.test(value)) return 'success';
    return 'info';
  };

  const reversed = state.logs.slice().reverse();
  const grouped = [];
  reversed.forEach((line) => {
    const normalized = String(line || '').trim();
    if (!normalized) return;
    const previous = grouped[grouped.length - 1];
    if (previous && previous.text === normalized) {
      previous.count += 1;
    } else {
      grouped.push({ text: normalized, count: 1 });
    }
  });

  grouped.forEach((entry) => {
    const tone = classifyLogLine(entry.text);
    const item = document.createElement('div');
    item.className = `log-item log-item-${tone}`;

    const pill = document.createElement('span');
    pill.className = `log-pill log-pill-${tone}`;
    pill.textContent = tone.toUpperCase();

    const text = document.createElement('span');
    text.className = 'log-text';
    text.textContent = entry.text;

    item.appendChild(pill);
    item.appendChild(text);

    if (entry.count > 1) {
      const repeat = document.createElement('span');
      repeat.className = 'log-repeat-count';
      repeat.textContent = `×${entry.count}`;
      item.appendChild(repeat);
    }

    list.appendChild(item);
  });
}

export function renderFailure(failure) {
  const failureCard = document.querySelector('#failure-screen .hero-card');
  if (failureCard) {
    failureCard.classList.add('failure-polish-card');
  }
  document.getElementById('failure-title').textContent = failure?.title || 'Shift Failed';
  document.getElementById('failure-reason').textContent = failure?.reason || 'Motel Failure';
  document.getElementById('failure-text').textContent =
    failure?.text || 'The motel could not sustain operations for the rest of the night.';
}

function getSummaryGradeClass(grade = 'C') {
  return `summary-grade-${String(grade).toLowerCase()}`;
}

export function renderSummary(summary, state, outcomeFlavor = null) {
  const summaryCard = document.querySelector('#summary-screen .hero-card');
  if (summaryCard) {
    summaryCard.classList.add('summary-polish-card');
  }
  document.getElementById('summary-title').textContent = summary.title;
  document.getElementById('summary-text').textContent = summary.text;

  const scenarioLabel = document.getElementById('summary-scenario-label');
  const campaignProgressLabel = document.getElementById('summary-campaign-progress');
  const runSetupLabel = document.getElementById('summary-run-setup');
  const runBonusLabel = document.getElementById('summary-run-reward-bonus');
  if (scenarioLabel) {
    const label = outcomeFlavor?.scenarioLabel || state?.activeScenario?.label || 'Unknown Shift';
    scenarioLabel.textContent = `Scenario: ${label}`;
  }
  if (campaignProgressLabel) {
    campaignProgressLabel.textContent = state?.campaignProgress?.completedLabel || '';
  }
  if (runSetupLabel) {
    runSetupLabel.textContent = state?.runSetupSummary?.setupLine || 'Difficulty: Standard • Contracts: None';
  }
  if (runBonusLabel) {
    const bonus = Number(state?.runSetupSummary?.rewardBonusPercent || 0);
    runBonusLabel.textContent = bonus > 0
      ? `Archive bonus active: +${bonus}%`
      : 'Archive bonus active: None';
  }

  const outcomeTitle = document.getElementById('summary-outcome-title');
  if (outcomeTitle) {
    outcomeTitle.textContent = outcomeFlavor?.title || '';
  }

  const outcomeNote = document.getElementById('summary-outcome-note');
  if (outcomeNote) {
    outcomeNote.textContent = outcomeFlavor?.note || '';
  }

  const rating = document.getElementById('summary-rating');
  const breakdown = document.getElementById('summary-breakdown');
  const threadFlavor = document.getElementById('summary-thread-flavor');
  const campaignFlavor = document.getElementById('summary-campaign-flavor');
  const identityFlavor = document.getElementById('summary-identity-flavor');
  const branchFlavor = document.getElementById('summary-branch-flavor');

  if (rating) {
    rating.innerHTML = `
      <span class="summary-grade ${getSummaryGradeClass(summary.grade || 'C')}">${summary.grade || 'C'}</span>
      <span>${summary.summaryLine || ''}</span>
    `;
  }

  if (breakdown) {
    breakdown.innerHTML = '';
    (Array.isArray(summary.breakdown) ? summary.breakdown : []).forEach((line) => {
      const item = document.createElement('li');
      item.textContent = line;
      breakdown.appendChild(item);
    });

    const snapshot = state?.shiftPressureSnapshot || null;
    if (snapshot) {
      const positiveLine = Array.isArray(snapshot.positives) ? snapshot.positives.slice(0, 2).join(' • ') : '';
      const negativeLine = Array.isArray(snapshot.negatives) ? snapshot.negatives.slice(0, 2).join(' • ') : '';

      if (positiveLine) {
        const item = document.createElement('li');
        item.textContent = `What went right: ${positiveLine}`;
        breakdown.appendChild(item);
      }
      if (negativeLine) {
        const item = document.createElement('li');
        item.textContent = `What hurt most: ${negativeLine}`;
        breakdown.appendChild(item);
      }
      if (snapshot?.dominantPressureTag) {
        const item = document.createElement('li');
        item.textContent = `Dominant pressure: ${snapshot.dominantPressureTag}`;
        breakdown.appendChild(item);
      }
    }
  }

  if (threadFlavor) {
    threadFlavor.innerHTML = '';
    const lines = Array.isArray(outcomeFlavor?.threadLines)
      ? outcomeFlavor.threadLines
      : (Array.isArray(state?.storyMemory?.lastNightSummary) ? state.storyMemory.lastNightSummary : []);
    lines.slice(0, 3).forEach((line) => {
      const item = document.createElement('li');
      item.textContent = line;
      threadFlavor.appendChild(item);
    });
  }

  if (campaignFlavor) {
    campaignFlavor.innerHTML = '';
    const lines = Array.isArray(state?.campaignSummaryNotes) ? state.campaignSummaryNotes : [];
    lines.slice(0, 3).forEach((line) => {
      const item = document.createElement('li');
      item.textContent = line;
      campaignFlavor.appendChild(item);
    });
  }

  if (identityFlavor) {
    identityFlavor.innerHTML = '';
    const lines = Array.isArray(state?.summaryIdentityLines) ? state.summaryIdentityLines : [];
    lines.slice(0, 4).forEach((line) => {
      const item = document.createElement('li');
      item.textContent = line;
      identityFlavor.appendChild(item);
    });
  }

  if (branchFlavor) {
    branchFlavor.innerHTML = '';
    const lines = Array.isArray(state?.summaryBranchNotes) ? state.summaryBranchNotes : [];
    lines.slice(0, 3).forEach((line) => {
      const item = document.createElement('li');
      item.textContent = line;
      branchFlavor.appendChild(item);
    });
  }

  const objectiveContainer = document.getElementById('summary-objective-list');
  renderObjectiveList(objectiveContainer, evaluateNightObjectives(state));
}

export function renderNightPrep(state, upgrades = [], onPurchaseUpgrade = null) {
  const title = document.getElementById('night-prep-title');
  const meta = document.getElementById('night-prep-meta');
  const money = document.getElementById('night-prep-money');
  const spent = document.getElementById('night-prep-spent');
  const campaign = document.getElementById('night-prep-campaign');
  const active = document.getElementById('night-prep-active-upgrades');
  const campaignForecast = document.getElementById('night-prep-campaign-forecast');
  const doctrine = document.getElementById('night-prep-doctrine');
  const factions = document.getElementById('night-prep-factions');
  const director = document.getElementById('night-prep-director');
  const carryover = document.getElementById('night-prep-carryover');
  const threads = document.getElementById('night-prep-threads');
  const grid = document.getElementById('night-prep-upgrade-grid');

  if (title) title.textContent = 'Night Prep';
  if (meta) {
    const nextNight = Math.max(1, Number(state?.night || 1) + 1);
    const nextMilestone = state?.campaignNextMilestone;
    const milestoneText = nextMilestone?.isFinale
      ? ' • Finale Night'
      : nextMilestone?.isMilestone
        ? ` • ${nextMilestone.label}`
        : '';
    meta.textContent = `Prepare for Night ${nextNight}${milestoneText}`;
  }
  if (campaign) {
    campaign.textContent = state?.campaignProgress?.completedLabel || 'Campaign progress: 0 / 5 nights completed';
  }
  if (money) {
    money.textContent = `Available Money: ${formatMoney(Number(state?.money || 0))}`;
  }
  if (spent) {
    spent.textContent = `Run Spending: ${formatMoney(Number(state?.progression?.spentThisRun || 0))}`;
  }
  if (active) {
    active.textContent = state?.activeUpgradeSummary || 'No active upgrades yet.';
  }

  if (campaignForecast) {
    const notes = Array.isArray(state?.campaignPrepForecast) ? state.campaignPrepForecast.slice(0, 4) : [];
    campaignForecast.innerHTML = `
      <p class="section-tag">Campaign Forecast</p>
      ${notes.length
        ? `<ul class="prep-notes-list">${notes.map((line) => `<li><span>${line}</span></li>`).join('')}</ul>`
        : '<p class="muted">No special campaign warnings.</p>'}
    `;
  }

  if (doctrine) {
    const doctrineTitle = state?.doctrineDisplay?.title || 'Stability Manager';
    const doctrineSummary = state?.doctrineDisplay?.summary || 'Low-chaos continuity is prioritized over dramatic responses.';
    const doctrineHints = Array.isArray(state?.doctrineDisplay?.hints) ? state.doctrineDisplay.hints.slice(0, 2) : [];
    doctrine.innerHTML = `
      <p class="section-tag">Run Identity</p>
      <p><strong>${doctrineTitle}</strong></p>
      <p class="muted">${doctrineSummary}</p>
      ${doctrineHints.length
        ? `<ul class="prep-notes-list">${doctrineHints.map((line) => `<li><span>${line}</span></li>`).join('')}</ul>`
        : ''}
    `;
  }

  if (factions) {
    const climate = Array.isArray(state?.factionClimate) ? state.factionClimate : [];
    const notes = Array.isArray(state?.prepFactionNotes) ? state.prepFactionNotes : [];
    factions.innerHTML = `
      <p class="section-tag">Faction Climate</p>
      <div class="prep-faction-chip-row">
        ${climate.map((entry) => `<span class="prep-faction-chip">${entry.id}: ${entry.band}</span>`).join('')}
      </div>
      ${notes.length
        ? `<ul class="prep-notes-list">${notes
            .slice(0, 3)
            .map((line) => `<li><span>${line}</span></li>`)
            .join('')}</ul>`
        : '<p class="muted">No notable faction pressure shifts.</p>'}
    `;
  }

  if (director) {
    const notes = Array.isArray(state?.directorBriefingNotes) ? state.directorBriefingNotes.slice(0, 4) : [];
    const shiftHint = state?.directorShiftHint || '';
    director.innerHTML = `
      <p class="section-tag">Tonight’s Outlook</p>
      ${shiftHint ? `<p class="muted">${shiftHint}</p>` : ''}
      ${notes.length
        ? `<ul class="prep-notes-list">${notes.map((line) => `<li><span>${line}</span></li>`).join('')}</ul>`
        : '<p class="muted">No unusual directional pressure forecast for this shift.</p>'}
    `;
  }

  if (carryover) {
    const notes = Array.isArray(state?.carryoverBriefingNotes) ? state.carryoverBriefingNotes.slice(0, 4) : [];
    carryover.innerHTML = `
      <p class="section-tag">Incoming Night Notes</p>
      ${notes.length
        ? `<ul class="prep-notes-list">${notes
            .map((entry) => `<li><strong>${entry.title}</strong><span>${entry.note || ''}</span></li>`)
            .join('')}</ul>`
        : '<p class="muted">No major carryover warnings detected.</p>'}
    `;
  }

  if (threads) {
    const activeThreads = Array.isArray(state?.activeRunThreads) ? state.activeRunThreads.slice(0, 3) : [];
    threads.innerHTML = `
      <p class="section-tag">Active Run Threads</p>
      ${activeThreads.length
        ? `<ul class="prep-notes-list">${activeThreads
            .map((entry) => `<li><strong>${entry.title} (Stage ${entry.stage})</strong><span>${entry.note || ''}</span></li>`)
            .join('')}</ul>`
        : '<p class="muted">No active long-running thread pressure.</p>'}
    `;
  }

  if (!grid) return;

  grid.innerHTML = '';
  upgrades.forEach((upgrade) => {
    const card = document.createElement('article');
    card.className = `prep-upgrade-card ${upgrade.owned ? 'is-owned' : ''}`;
    const cannotAfford = !upgrade.owned && Number(state?.money || 0) < Number(upgrade.cost || 0);

    card.innerHTML = `
      <div class="prep-upgrade-header">
        <h4>${upgrade.title}</h4>
        <span class="prep-upgrade-category">${upgrade.category}</span>
      </div>
      <p class="prep-upgrade-description">${upgrade.description}</p>
      <p class="prep-upgrade-cost">Cost: ${formatMoney(upgrade.cost)}</p>
      <button class="button button-secondary prep-upgrade-buy-btn" ${upgrade.owned || cannotAfford ? 'disabled' : ''}>
        ${upgrade.owned ? 'Owned' : cannotAfford ? 'Insufficient Funds' : 'Purchase'}
      </button>
    `;

    const button = card.querySelector('.prep-upgrade-buy-btn');
    if (button && !upgrade.owned && !cannotAfford && typeof onPurchaseUpgrade === 'function') {
      button.addEventListener('click', () => onPurchaseUpgrade(upgrade.id));
    }

    grid.appendChild(card);
  });
}

export function renderRunEnding(ending = {}) {
  const card = document.querySelector('#run-ending-screen .run-ending-card');
  const title = document.getElementById('run-ending-title');
  const subtitle = document.getElementById('run-ending-subtitle');
  const tagline = document.getElementById('run-ending-tagline');
  const toneBadge = document.getElementById('run-ending-tone-badge');
  const grade = document.getElementById('run-ending-grade');
  const campaignLine = document.getElementById('run-ending-campaign-line');
  const setupLine = document.getElementById('run-ending-setup-line');
  const summary = document.getElementById('run-ending-summary');
  const dramaticSummary = document.getElementById('run-ending-dramatic-summary');
  const finaleContext = document.getElementById('run-ending-finale-context');
  const doctrine = document.getElementById('run-ending-doctrine');
  const climate = document.getElementById('run-ending-climate');
  const pressure = document.getElementById('run-ending-pressure');
  const posture = document.getElementById('run-ending-posture');
  const notes = document.getElementById('run-ending-notes');
  const tags = document.getElementById('run-ending-tags');
  const stats = document.getElementById('run-ending-stats');
  const rewardPoints = document.getElementById('run-ending-reward-points');
  const rewardBreakdown = document.getElementById('run-ending-reward-breakdown');
  const rewardDiscoveries = document.getElementById('run-ending-reward-discoveries');
  const rewardUnlocks = document.getElementById('run-ending-reward-unlocks');
  const archiveProgress = document.getElementById('run-ending-archive-progress');

  const family = String(ending?.family || 'stable');
  const presentationFamily = String(ending?.presentationFamily || 'mixed');
  if (card) {
    card.classList.remove(
      'ending-tone-stable',
      'ending-tone-fragile',
      'ending-tone-cold',
      'ending-tone-collapse',
      'ending-tone-hostile',
      'ending-tone-controlled'
    );
    card.classList.add(`ending-tone-${family}`);
    card.classList.remove(
      'ending-family-good',
      'ending-family-mixed',
      'ending-family-fragile',
      'ending-family-cold',
      'ending-family-hostile',
      'ending-family-chaotic'
    );
    card.classList.add(`ending-family-${presentationFamily}`);
    card.classList.remove('ending-cinematic-reveal');
    window.requestAnimationFrame(() => {
      card.classList.add('ending-cinematic-reveal');
    });
  }

  if (title) title.textContent = ending?.title || 'Campaign Complete';
  if (subtitle) subtitle.textContent = ending?.subtitle || '';
  if (tagline) tagline.textContent = ending?.tagline || '';
  if (toneBadge) toneBadge.textContent = formatFamilyLabel(presentationFamily);
  if (grade) grade.textContent = ending?.grade ? `Grade ${ending.grade}` : 'Grade C';
  if (campaignLine) campaignLine.textContent = ending?.campaignLine || '';
  if (setupLine) {
    setupLine.textContent = ending?.setupLine || ending?.runSetupSummary?.setupLine || '';
  }
  if (summary) summary.textContent = ending?.summary || '';
  if (dramaticSummary) dramaticSummary.textContent = ending?.dramaticSummary || '';
  if (finaleContext) {
    const line = ending?.finaleContextLine || '';
    finaleContext.textContent = line;
    finaleContext.classList.toggle('is-active', Boolean(line));
  }
  if (doctrine) doctrine.textContent = ending?.doctrineLine || '';
  if (climate) climate.textContent = ending?.climateLine || '';
  if (pressure) pressure.textContent = ending?.pressureLine || '';
  if (posture) posture.textContent = ending?.postureLine || '';

  if (notes) {
    notes.innerHTML = '';
    (Array.isArray(ending?.notes) ? ending.notes : []).slice(0, 4).forEach((line) => {
      const item = document.createElement('li');
      item.textContent = line;
      notes.appendChild(item);
    });
  }

  if (tags) {
    tags.innerHTML = '';
    (Array.isArray(ending?.tags) ? ending.tags : []).slice(0, 4).forEach((line) => {
      const chip = document.createElement('span');
      chip.className = 'run-ending-tag';
      chip.textContent = line;
      tags.appendChild(chip);
    });
  }

  if (stats) {
    const statData = ending?.stats || {};
    stats.textContent = `Final stats — Reputation ${statData.reputation ?? '-'} • $${statData.money ?? '-'} • Avg Power ${statData.avgPower ?? '-'}% • Unresolved ${statData.unresolved ?? '-'}`;
  }

  const reward = ending?.metaReward || null;
  if (rewardPoints) {
    const totalAwarded = Number(reward?.totalAwarded || reward?.pointsEarned || 0);
    const baseAwarded = Number(reward?.pointsEarned || 0);
    const setupBonus = Number(reward?.setupBonusPoints || 0);
    rewardPoints.textContent = reward
      ? `Archive Points Earned: +${totalAwarded} (Base ${baseAwarded}${setupBonus > 0 ? ` + Setup ${setupBonus}` : ''}) • Total: ${Number(reward.totalPoints || 0)}`
      : 'Archive Points Earned: 0';
  }
  if (rewardBreakdown) {
    const breakdown = reward?.breakdown || {};
    const setupBonusPoints = Number(reward?.setupBonusPoints || 0);
    const setupBonusPercent = Number(reward?.setupBonusPercent || 0);
    const totalAwarded = Number(reward?.totalAwarded || reward?.pointsEarned || 0);
    rewardBreakdown.textContent = reward
      ? `Breakdown — Grade ${Number(breakdown.gradeBonus || 0)} • Nights ${Number(breakdown.nightBonus || 0)} • Success ${Number(breakdown.successBonus || 0)} • Quality ${Number(breakdown.qualityBonus || 0)} • Setup Bonus +${setupBonusPoints} (${setupBonusPercent}%) • Total +${totalAwarded}`
      : '';
  }
  if (rewardDiscoveries) {
    rewardDiscoveries.innerHTML = '';
    const discoveries = reward?.newDiscoveries || {};
    const rows = [
      (Array.isArray(discoveries.endings) && discoveries.endings.length)
        ? `New ending recorded: ${discoveries.endings[0]}`
        : '',
      (Array.isArray(discoveries.endingFamilies) && discoveries.endingFamilies.length)
        ? `Ending family archived: ${discoveries.endingFamilies[0]}`
        : '',
      (Array.isArray(discoveries.doctrinePaths) && discoveries.doctrinePaths.length)
        ? `Doctrine route discovered: ${discoveries.doctrinePaths[0]}`
        : '',
      (Array.isArray(discoveries.factionClimates) && discoveries.factionClimates.length)
        ? `Faction climate logged: ${discoveries.factionClimates[0]}`
        : '',
      (Array.isArray(discoveries.specialEncounters) && discoveries.specialEncounters.length)
        ? `Special encounters newly archived: +${discoveries.specialEncounters.length}`
        : '',
      (Array.isArray(discoveries.nightEvents) && discoveries.nightEvents.length)
        ? `Night events newly archived: +${discoveries.nightEvents.length}`
        : '',
      (Array.isArray(discoveries.threadFamilies) && discoveries.threadFamilies.length)
        ? `Thread families newly surfaced: +${discoveries.threadFamilies.length}`
        : '',
      (Array.isArray(discoveries.rareMoments) && discoveries.rareMoments.length)
        ? `Rare moments newly discovered: +${discoveries.rareMoments.length}`
        : '',
      (Array.isArray(discoveries.contracts) && discoveries.contracts.length)
        ? `Contracts archived as complete: +${discoveries.contracts.length}`
        : '',
      (Array.isArray(discoveries.goals) && discoveries.goals.length)
        ? `Goal milestones reached: +${discoveries.goals.length}`
        : ''
    ].filter(Boolean);

    if (!rows.length) {
      const item = document.createElement('li');
      item.textContent = 'No new archive discoveries this run.';
      rewardDiscoveries.appendChild(item);
    } else {
      rows.slice(0, 6).forEach((line) => {
        const item = document.createElement('li');
        item.textContent = line;
        rewardDiscoveries.appendChild(item);
      });
    }
  }
  if (rewardUnlocks) {
    rewardUnlocks.innerHTML = '';
    const unlocks = Array.isArray(reward?.newlyAvailablePerks) ? reward.newlyAvailablePerks : [];
    if (!unlocks.length) {
      const item = document.createElement('li');
      item.textContent = 'No new perk unlock milestones reached this run.';
      rewardUnlocks.appendChild(item);
    } else {
      unlocks.forEach((unlockId) => {
        const item = document.createElement('li');
        item.textContent = `New perk available: ${unlockId}`;
        rewardUnlocks.appendChild(item);
      });
    }
  }
  if (archiveProgress) {
    const archive = ending?.metaArchive || {};
    archiveProgress.textContent = `Archive — Runs ${Number(archive.totalRunsCompleted || 0)} • Endings ${Number(archive.endingsDiscoveredCount || 0)} • Best Grade ${archive.bestEndingGrade || '-'}`;
  }
}

export function renderMainMenuMetaSurface(state, handlers = {}) {
  const points = document.getElementById('main-menu-meta-points');
  const runs = document.getElementById('main-menu-meta-runs');
  const endings = document.getElementById('main-menu-meta-endings');
  const bestGrade = document.getElementById('main-menu-meta-best-grade');
  const selectedPerk = document.getElementById('main-menu-meta-selected-perk');
  const perkList = document.getElementById('main-menu-perk-list');
  const archiveList = document.getElementById('main-menu-archive-list');
  const rerollButton = document.getElementById('main-menu-reroll-btn');
  const menuOnboarding = document.getElementById('main-menu-onboarding');
  const startGameButton = document.getElementById('start-game-btn');
  const startGuidedButton = document.getElementById('start-guided-btn');
  const startStandardButton = document.getElementById('start-standard-btn');
  const difficultySelect = document.getElementById('main-menu-difficulty-select');
  const campaignModeSelect = document.getElementById('main-menu-campaign-mode-select');
  const contractList = document.getElementById('main-menu-contract-list');
  const runSetupSummary = document.getElementById('main-menu-run-setup-summary');

  const archive = state?.metaArchive || {};
  const perks = Array.isArray(state?.metaPerks) ? state.metaPerks : [];
  const runSetup = state?.runSetup || { difficultyId: 'standard', contractIds: [] };
  const setupSummary = state?.runSetupSummary || null;
  const difficultyCatalog = Array.isArray(state?.runDifficultyCatalog) ? state.runDifficultyCatalog : [];
  const contractCatalog = Array.isArray(state?.runContractCatalog) ? state.runContractCatalog : [];
  const campaignModeCatalog = Array.isArray(state?.runCampaignModeCatalog) ? state.runCampaignModeCatalog : [];

  if (points) {
    points.textContent = `Archive Points: ${Number(archive.points || 0)}`;
    points.title = 'Archive Points are your persistent currency for meta perks.';
  }
  if (runs) {
    runs.textContent = `Runs Completed: ${Number(archive.totalRunsCompleted || 0)} (Wins ${Number(archive.campaignWins || 0)} / Failures ${Number(archive.campaignFailures || 0)})`;
  }
  if (endings) {
    endings.textContent = `Endings Discovered: ${Number(archive.endingsDiscoveredCount || 0)}`;
  }
  if (bestGrade) {
    bestGrade.textContent = `Best Grade: ${archive.bestEndingGrade || '-'}`;
  }
  if (selectedPerk) {
    selectedPerk.textContent = `Selected Perk: ${state?.metaSelectedPerkLabel || 'None'}`;
    selectedPerk.title = 'Selected perk applies at run start.';
  }

  if (difficultySelect) {
    difficultySelect.innerHTML = '';
    difficultyCatalog.forEach((entry) => {
      const option = document.createElement('option');
      option.value = entry.id;
      option.textContent = `${entry.label}${Number(entry.archiveBonusPercent || 0) > 0 ? ` (+${entry.archiveBonusPercent}% AP)` : ''}`;
      option.selected = entry.id === runSetup.difficultyId;
      difficultySelect.appendChild(option);
    });
    difficultySelect.onchange = (event) => {
      if (typeof handlers.onSetDifficulty === 'function') {
        handlers.onSetDifficulty(event.target.value);
      }
    };
  }

  if (campaignModeSelect) {
    campaignModeSelect.innerHTML = '';
    campaignModeCatalog.forEach((entry) => {
      const option = document.createElement('option');
      option.value = entry.id;
      option.textContent = entry.label || entry.id;
      option.selected = entry.id === runSetup.campaignMode;
      campaignModeSelect.appendChild(option);
    });
    campaignModeSelect.disabled = Boolean(runSetup.locked);
    campaignModeSelect.onchange = (event) => {
      if (typeof handlers.onSetCampaignMode === 'function') {
        handlers.onSetCampaignMode(event.target.value);
      }
    };
  }

  if (contractList) {
    contractList.innerHTML = '';
    contractCatalog.forEach((contract) => {
      const row = document.createElement('label');
      row.className = 'main-menu-contract-item';
      const checked = Array.isArray(runSetup.contractIds) && runSetup.contractIds.includes(contract.id);
      row.innerHTML = `
        <input type="checkbox" ${checked ? 'checked' : ''} />
        <span>${contract.label}</span>
        <small class="muted">+${Number(contract.rewardBonusPercent || 0)}% AP</small>
      `;
      const input = row.querySelector('input');
      if (input) {
        input.addEventListener('change', () => {
          if (typeof handlers.onToggleContract === 'function') {
            handlers.onToggleContract(contract.id);
          }
        });
      }
      contractList.appendChild(row);
    });
  }

  if (runSetupSummary) {
    const setupLine = setupSummary?.setupLine || 'Difficulty: Standard • Contracts: None';
    const bonus = Number(setupSummary?.rewardBonusPercent || 0);
    runSetupSummary.textContent = bonus > 0 ? `${setupLine} • Bonus +${bonus}% AP` : setupLine;
  }

  if (menuOnboarding) {
    const onboardingUi = state?.onboardingUi || {};
    const menu = onboardingUi?.mainMenuSummary || {};
    const tutorialActiveStartFlow = Boolean(menu?.tutorialActiveStartFlow);

    if (startGameButton) {
      startGameButton.hidden = tutorialActiveStartFlow;
    }
    if (startGuidedButton) {
      startGuidedButton.hidden = !tutorialActiveStartFlow;
    }
    if (startStandardButton) {
      startStandardButton.hidden = !tutorialActiveStartFlow;
    }

    if (!menu.show) {
      menuOnboarding.innerHTML = '';
    } else {
      menuOnboarding.innerHTML = `
        <div class="main-menu-onboarding-card">
          <p class="section-tag">First Shift Briefing</p>
          <p>${menu.blurb || ''}</p>
          <ul class="main-menu-onboarding-list">
            ${(Array.isArray(menu.tips) ? menu.tips.slice(0, 4) : []).map((tip) => `<li>${tip}</li>`).join('')}
          </ul>
          <div class="hero-actions">
            <button id="menu-open-help-btn" class="button button-secondary" type="button">Open Quick Guide</button>
            ${menu.tutorialEnabled
              ? '<button id="menu-disable-tutorial-btn" class="button button-secondary" type="button">Disable Guidance</button>'
              : '<button id="menu-enable-tutorial-btn" class="button button-secondary" type="button">Enable Guidance</button>'}
            <button id="menu-reset-tutorial-btn" class="button button-secondary" type="button">Reset Tutorial State</button>
          </div>
        </div>
      `;

      const openHelp = menuOnboarding.querySelector('#menu-open-help-btn');
      if (openHelp) {
        openHelp.addEventListener('click', () => {
          if (typeof handlers.onToggleHelp === 'function') {
            handlers.onToggleHelp();
          }
        });
      }

      const disableTutorial = menuOnboarding.querySelector('#menu-disable-tutorial-btn');
      if (disableTutorial) {
        disableTutorial.addEventListener('click', () => {
          if (typeof handlers.onDisableTutorial === 'function') {
            handlers.onDisableTutorial();
          }
        });
      }

      const enableTutorial = menuOnboarding.querySelector('#menu-enable-tutorial-btn');
      if (enableTutorial) {
        enableTutorial.addEventListener('click', () => {
          if (typeof handlers.onEnableTutorial === 'function') {
            handlers.onEnableTutorial();
          }
        });
      }

      const resetTutorial = menuOnboarding.querySelector('#menu-reset-tutorial-btn');
      if (resetTutorial) {
        resetTutorial.addEventListener('click', () => {
          if (typeof handlers.onResetTutorial === 'function') {
            handlers.onResetTutorial();
          }
        });
      }
    }
  }

  if (perkList) {
    perkList.innerHTML = '';
    perks.slice(0, 6).forEach((perk) => {
      const item = document.createElement('article');
      item.className = `meta-perk-card ${perk.owned ? 'is-owned' : ''} ${perk.selected ? 'is-selected' : ''}`;
      const perkStateLabel = perk.selected
        ? 'Selected'
        : perk.owned
          ? 'Unlocked'
          : perk.canBuy
            ? 'Affordable'
            : perk.unlocked
              ? 'Insufficient AP'
              : 'Locked';
      item.innerHTML = `
        <div class="meta-perk-head">
          <h4>${perk.title}</h4>
          <span>${perk.owned ? 'Owned' : `${perk.cost} AP`}</span>
        </div>
        <p class="meta-perk-effect">${perk.effectLabel || perk.description || ''}</p>
        <p class="meta-perk-requirement muted">${perk.unlocked ? 'Unlocked' : perk.requirementLabel || 'Locked'}</p>
        <p class="meta-perk-requirement">State: <strong>${perkStateLabel}</strong></p>
        <div class="meta-perk-actions"></div>
      `;

      const actionRoot = item.querySelector('.meta-perk-actions');
      if (perk.owned) {
        const selectButton = document.createElement('button');
        selectButton.className = 'button button-secondary';
        selectButton.textContent = perk.selected ? 'Selected' : 'Select';
        selectButton.disabled = perk.selected;
        if (perk.selected) {
          selectButton.title = 'This perk will apply at run start.';
        }
        selectButton.addEventListener('click', () => {
          if (typeof handlers.onSelectPerk === 'function') {
            handlers.onSelectPerk(perk.id);
          }
        });
        actionRoot.appendChild(selectButton);
      } else {
        const buyButton = document.createElement('button');
        buyButton.className = 'button button-secondary';
        buyButton.textContent = perk.canBuy ? 'Unlock' : 'Locked';
        buyButton.disabled = !perk.canBuy;
        buyButton.title = perk.canBuy
          ? `Spend ${perk.cost} Archive Points to unlock this run-start perk.`
          : perk.unlocked
            ? 'You need more Archive Points to unlock this perk.'
            : perk.requirementLabel || 'Locked until milestone is reached.';
        buyButton.addEventListener('click', () => {
          if (typeof handlers.onBuyPerk === 'function') {
            handlers.onBuyPerk(perk.id);
          }
        });
        actionRoot.appendChild(buyButton);
      }

      perkList.appendChild(item);
    });
  }

  if (archiveList) {
    archiveList.innerHTML = '';
    [
      `Total nights survived: ${Number(archive.totalNightsSurvived || 0)}`,
      `Doctrine paths discovered: ${Number(archive.doctrinePathCount || 0)}`,
      `Faction climates discovered: ${Number(archive.factionClimateCount || 0)}`,
      `Runs by difficulty — Casual ${Number(archive?.runsByDifficulty?.casual || 0)} • Standard ${Number(archive?.runsByDifficulty?.standard || 0)} • Hard ${Number(archive?.runsByDifficulty?.hard || 0)} • Nightmare ${Number(archive?.runsByDifficulty?.nightmare || 0)}`,
      `Best grade by difficulty — Csl ${archive?.bestGradeByDifficulty?.casual || '-'} • Std ${archive?.bestGradeByDifficulty?.standard || '-'} • Hard ${archive?.bestGradeByDifficulty?.hard || '-'} • Ngt ${archive?.bestGradeByDifficulty?.nightmare || '-'}`,
      `Contracts completed: ${Number(archive.contractsCompletedCount || 0)} • Ending condition combos: ${Number(archive.endingConditionComboCount || 0)}`,
      `Goal milestones: ${Number(archive.goalMilestoneCount || 0)} • Best campaign score: ${Number(archive.bestCampaignScore || 0)}`,
      `Win streak: ${Number(archive.currentWinStreak || 0)} (Best ${Number(archive.longestWinStreak || 0)})`,
      `Special encounters seen: ${Number(archive.specialEncounterCount || 0)}`,
      `Night events seen: ${Number(archive.nightEventCount || 0)}`,
      `Thread families seen: ${Number(archive.threadFamilyCount || 0)} • Rare moments: ${Number(archive.rareMomentCount || 0)}`,
      `Best campaign close — Rep ${Number(archive?.bestCampaignStats?.reputation || 0)} • Power ${Number(archive?.bestCampaignStats?.power || 0)} • $${Number(archive?.bestCampaignStats?.money || 0)}`
    ].forEach((line) => {
      const item = document.createElement('li');
      item.textContent = line;
      archiveList.appendChild(item);
    });
  }

  if (rerollButton) {
    const canReroll = Boolean(state?.metaFirstNightRerollAvailable) && Number(state?.night || 1) === 1;
    rerollButton.disabled = !canReroll;
    rerollButton.textContent = canReroll ? 'Reroll Night 1 Scenario' : 'Reroll Unavailable';
    rerollButton.title = canReroll
      ? 'Consumes your First Night Reroll perk charge for this run.'
      : 'Available only on Night 1 with the First Night Reroll perk selected.';
  }
}

export function renderHelpOverlay(state) {
  const overlay = document.getElementById('help-overlay');
  if (!overlay) return;

  const onboardingUi = state?.onboardingUi || {};
  const show = Boolean(onboardingUi?.helpOverlayOpen);
  overlay.classList.toggle('is-open', show);
  overlay.setAttribute('aria-hidden', show ? 'false' : 'true');

  if (!show) {
    overlay.innerHTML = '';
    return;
  }

  const terms = Array.isArray(onboardingUi?.glossaryTerms) ? onboardingUi.glossaryTerms : [];
  overlay.innerHTML = `
    <div class="camera-scene-panel help-overlay-panel" role="dialog" aria-modal="true" aria-label="Quick survival guide">
      <div class="camera-scene-header">
        <div>
          <p class="section-tag">Quick Guide</p>
          <h3>Night Desk Survival Guide</h3>
          <p class="camera-scene-sublabel">Short reference — always available</p>
        </div>
        <button id="help-overlay-close-btn" class="button button-secondary overlay-close-btn" type="button" aria-label="Close help overlay">Close</button>
      </div>
      <div class="help-glossary-grid">
        ${terms.map((entry) => `
          <article class="help-term-card">
            <h4>${entry.term}</h4>
            <p class="muted">${entry.meaning}</p>
          </article>
        `).join('')}
      </div>
      <div class="help-persistence-note">
        <p class="section-tag">Save Clarity</p>
        <p class="muted">Run state is saved between sessions. Archive points, endings, and unlocked perks persist across runs. Reset Night / New Run restarts the current run state.</p>
      </div>
    </div>
  `;

  const closeBtn = overlay.querySelector('#help-overlay-close-btn');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      if (typeof state?.onToggleHelpOverlay === 'function') {
        state.onToggleHelpOverlay(false);
      }
    });
  }

  overlay.onclick = (event) => {
    if (event.target === overlay && typeof state?.onToggleHelpOverlay === 'function') {
      state.onToggleHelpOverlay(false);
    }
  };
}

export function renderSettingsOverlay(state) {
  const overlay = document.getElementById('settings-overlay');
  if (!overlay) return;

  const show = Boolean(state?.settingsOverlayOpen);
  const settings = state?.settings || {};
  overlay.classList.toggle('is-open', show);
  overlay.setAttribute('aria-hidden', show ? 'false' : 'true');

  if (!show) {
    overlay.innerHTML = '';
    return;
  }

  const storageHealthy = state?.settingsStorageHealthy !== false;
  overlay.innerHTML = `
    <div class="camera-scene-panel help-overlay-panel settings-overlay-panel" role="dialog" aria-modal="true" aria-label="Game settings">
      <div class="camera-scene-header">
        <div>
          <p class="section-tag">Settings</p>
          <h3>Comfort, Clarity & Accessibility</h3>
          <p class="camera-scene-sublabel">Changes apply instantly and save locally</p>
        </div>
        <button id="settings-overlay-close-btn" class="button button-secondary overlay-close-btn" type="button" aria-label="Close settings">Close</button>
      </div>
      <div class="settings-grid" id="settings-grid">
        <label class="settings-item"><span>Master Sound</span><input type="checkbox" data-setting="masterSound" ${settings.masterSound ? 'checked' : ''} /></label>
        <label class="settings-item"><span>Reduced Motion</span><input type="checkbox" data-setting="reducedMotion" ${settings.reducedMotion ? 'checked' : ''} /></label>
        <label class="settings-item"><span>Tutorial Guidance</span><input type="checkbox" data-setting="tutorialGuidance" ${settings.tutorialGuidance ? 'checked' : ''} /></label>
        <label class="settings-item"><span>Confirm Destructive Actions</span><input type="checkbox" data-setting="confirmDestructiveActions" ${settings.confirmDestructiveActions ? 'checked' : ''} /></label>
        <label class="settings-item"><span>Advanced Helper Text</span><input type="checkbox" data-setting="advancedHelperText" ${settings.advancedHelperText ? 'checked' : ''} /></label>
        <label class="settings-item"><span>High Contrast Mode</span><input type="checkbox" data-setting="highContrast" ${settings.highContrast ? 'checked' : ''} /></label>
        <label class="settings-item settings-item-select"><span>UI Scale</span>
          <select data-setting="uiScale" aria-label="UI Scale">
            <option value="compact" ${settings.uiScale === 'compact' ? 'selected' : ''}>Compact</option>
            <option value="normal" ${settings.uiScale === 'normal' ? 'selected' : ''}>Normal</option>
            <option value="large" ${settings.uiScale === 'large' ? 'selected' : ''}>Large</option>
          </select>
        </label>
      </div>
      <p class="muted settings-footnote">${storageHealthy ? 'Settings are saved for this browser.' : 'Settings storage unavailable: using safe temporary defaults for this session.'}</p>
    </div>
  `;

  const closeBtn = overlay.querySelector('#settings-overlay-close-btn');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      if (typeof state?.onToggleSettingsOverlay === 'function') {
        state.onToggleSettingsOverlay(false);
      }
    });
  }

  overlay.querySelectorAll('[data-setting]').forEach((control) => {
    control.addEventListener('change', (event) => {
      if (typeof state?.onUpdateSetting !== 'function') return;
      const key = event.currentTarget.getAttribute('data-setting');
      const value = event.currentTarget.type === 'checkbox'
        ? Boolean(event.currentTarget.checked)
        : event.currentTarget.value;
      state.onUpdateSetting(key, value);
    });
  });

  overlay.onclick = (event) => {
    if (event.target === overlay && typeof state?.onToggleSettingsOverlay === 'function') {
      state.onToggleSettingsOverlay(false);
    }
  };
}
