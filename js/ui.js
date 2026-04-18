import {
  formatShiftTime,
  getShiftProgressPercent,
  evaluateNightObjectives
} from './nightCycle.js';
import { getRoomPresentationMeta } from './presentation.js';

let _v21SelectedRoomId = null;

function formatMoney(value) {
  return `$${value}`;
}

function formatFamilyLabel(value = 'stable') {
  const text = String(value || 'stable').replace(/[-_]+/g, ' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function formatCaseLabel(value = '') {
  const text = String(value || '').replace(/[-_]+/g, ' ').trim();
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : '';
}

function getZoneHintLabel(zoneId) {
  const numeric = Number(zoneId || 0);
  if (numeric === 1) return 'Lobby';
  if (numeric === 2) return 'Parking Lot';
  if (numeric === 3) return 'Hallway';
  if (numeric === 4) return 'Utility / Breaker';
  if (numeric === 6) return 'Rear Exit';
  return 'Shared Space';
}

function getScannerToneLabel(entry = {}) {
  if (entry?.planted) return 'Planted';
  const tone = String(entry?.tone || 'ambient').toLowerCase();
  const text = String(entry?.text || '').toLowerCase();
  if (tone === 'vehicle') {
    return /plate|region|route/.test(text) ? 'Route' : 'Vehicle';
  }
  if (tone === 'warning') {
    if (/family|group|paired|staggered/.test(text)) return 'Group';
    if (/blackout|utility|emergency|rear access|flicker/.test(text)) return 'Emergency';
    return 'Warning';
  }
  if (tone === 'desk') {
    if (/altered|paper|document|family|cover story/.test(text)) return 'Desk Read';
    return 'Desk';
  }
  return 'Band';
}

function getSharedSpaceRouteLabel(zoneId) {
  const numeric = Number(zoneId || 0);
  if (numeric === 1) return 'Desk edge ↔ Lobby floor ↔ Hallway';
  if (numeric === 2) return 'Parking line ↔ Lobby sightline ↔ Rear lane';
  if (numeric === 3) return 'Hallway centerline ↔ Active rooms ↔ Rear exit';
  if (numeric === 4) return 'Breaker room ↔ Dark rooms ↔ Camera strain';
  if (numeric === 6) return 'Rear access ↔ Hallway flank ↔ Outside lane';
  return 'Pressure route unknown';
}

function prepSurface(slug, title, innerHtml) {
  return `<section class="prep-surface prep-surface-${slug}" aria-label="${title}"><h3 class="prep-surface-title">${title}</h3><div class="prep-surface-body">${innerHtml}</div></section>`;
}

function buildUpgradeEffectSummary(upgrade = {}) {
  const effects = upgrade?.effects || {};
  const lines = [];
  if (effects.uvClueBonus) lines.push('sharper UV clue reads');
  if (effects.followupInsightBonus) lines.push('better follow-up contradiction reads');
  if (effects.scannerFeedDensity) lines.push('denser scanner traffic and cross-check support');
  if (effects.blackoutVisibilityBonus) lines.push('safer blackout visibility / stronger lantern response');
  if (effects.parkingIntelBonus) lines.push('stronger lot, vehicle, and repeat-car intel');
  if (effects.sharedSpaceIntelBonus) lines.push('clearer shared-space pressure reads');
  if (effects.serviceResponseClarity) lines.push('cleaner room-service response outcomes');
  if (effects.staffFatigueSoftener) lines.push('less staff fatigue during surges');
  if (effects.panicHidePenaltySoftener) lines.push('reduced long-tail panic survival penalty');
  if (effects.powerBlackoutSoftener) lines.push('softer blackout escalation');
  if (effects.cameraScanCostMult && Number(effects.cameraScanCostMult) < 1) lines.push('cheaper camera scans');
  if (effects.dispatchSuccessBonus) lines.push('more reliable dispatch responses');
  if (effects.roomSecurityBonus) lines.push('safer room releases and lock integrity');
  if (effects.ownerGrace) lines.push('more ownership patience after rough nights');
  if (effects.frontDeskClueReveal) lines.push('stronger case-read clue surfacing');
  return lines.slice(0, 3).join(' • ');
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
          ${hint?.modeLabel ? `<span class="tutorial-mode-badge">${hint.modeLabel}</span>` : ''}
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

function deriveWeatherState(state) {
  const explicit = state?.nightWeather;
  if (explicit?.primary) return explicit;
  const scenario = String(state?.activeScenario?.label || '').toLowerCase();
  const crisis = String(state?.crisisNight?.kind || '').toLowerCase();
  const pressure = state?.uiPressureLevel || 'calm';
  const power = Number(state?.power ?? 100);
  const camInterference = Number(state?.cameraInterferenceLevel || 0);
  const blackout = state?.blackoutState?.level || 'none';
  const night = Number(state?.night || 1);
  let primary = 'clear';
  let intensity = 'mild';
  const effects = [];
  if (/storm|surge|volatile/.test(scenario) || /storm/.test(crisis)) {
    primary = 'storm'; intensity = 'severe';
    effects.push({ domain: 'Power', text: 'Blackout risk elevated', severity: 'danger' });
    effects.push({ domain: 'Cameras', text: 'Feed instability expected', severity: 'warn' });
  } else if (/fog|mist|low.vis/.test(scenario) || camInterference >= 2) {
    primary = 'fog'; intensity = 'moderate';
    effects.push({ domain: 'Visibility', text: 'Outdoor zones reduced', severity: 'warn' });
    effects.push({ domain: 'Cameras', text: 'Lot and rear feeds degraded', severity: 'warn' });
  } else if (/cold|freeze|winter/.test(scenario)) {
    primary = 'cold'; intensity = 'moderate';
    effects.push({ domain: 'Power', text: 'Higher drain overnight', severity: 'warn' });
    effects.push({ domain: 'Outdoor', text: 'Rear and parking more volatile', severity: 'warn' });
  } else if (/rain|wet|drizzle/.test(scenario)) {
    primary = 'rain'; intensity = 'mild';
    effects.push({ domain: 'Outdoor', text: 'Lot uncertainty higher', severity: 'warn' });
  } else if ((pressure === 'emergency' || pressure === 'dire') && blackout !== 'none') {
    primary = 'storm'; intensity = 'severe';
    effects.push({ domain: 'Power', text: 'Grid unstable — blackout likely', severity: 'danger' });
  } else if (power <= 35 || blackout === 'partial' || blackout === 'full') {
    primary = 'storm'; intensity = 'moderate';
    effects.push({ domain: 'Power', text: 'Grid under strain', severity: 'warn' });
  } else if (night >= 4 && pressure !== 'calm') {
    primary = 'fog'; intensity = 'mild';
    effects.push({ domain: 'Visibility', text: 'Late-campaign haze', severity: 'neutral' });
  }
  if (!effects.length) effects.push({ domain: 'Conditions', text: 'No notable weather impact', severity: 'ok' });
  return { primary, intensity, effects };
}

function deriveMotelCondition(state) {
  const explicit = state?.motelCondition;
  if (explicit?.overall) return explicit;
  const money = Number(state?.money || 0);
  const rep = Number(state?.reputation || 50);
  const power = Number(state?.power ?? 100);
  const upgradeCount = Number(state?.progression?.ownedUpgradeIds?.length || 0);
  const pressure = state?.uiPressureLevel || 'calm';
  let score = 50;
  if (money >= 600) score += 15;
  else if (money >= 300) score += 8;
  else if (money <= 80) score -= 18;
  else if (money <= 150) score -= 8;
  if (rep >= 70) score += 10;
  else if (rep >= 50) score += 4;
  else if (rep <= 25) score -= 20;
  else if (rep <= 35) score -= 10;
  if (power >= 80) score += 6;
  else if (power <= 35) score -= 14;
  else if (power <= 50) score -= 6;
  if (upgradeCount >= 4) score += 12;
  else if (upgradeCount >= 2) score += 6;
  if (pressure === 'emergency') score -= 12;
  else if (pressure === 'dire') score -= 8;
  score = Math.max(0, Math.min(100, score));
  let overall = 'maintained';
  if (score >= 80) overall = 'upgraded';
  else if (score >= 58) overall = 'maintained';
  else if (score >= 40) overall = 'strained';
  else if (score >= 22) overall = 'neglected';
  else overall = 'deteriorating';
  const signals = [];
  if (money >= 400) signals.push({ text: 'Finances solid', polarity: 'positive' });
  else if (money <= 100) signals.push({ text: 'Cash flow critical', polarity: 'negative' });
  if (rep >= 65) signals.push({ text: 'Reputation strong', polarity: 'positive' });
  else if (rep <= 30) signals.push({ text: 'Reputation at risk', polarity: 'negative' });
  if (power <= 40) signals.push({ text: 'Power strained', polarity: 'negative' });
  if (upgradeCount >= 3) signals.push({ text: `${upgradeCount} upgrades active`, polarity: 'positive' });
  if (pressure === 'emergency' || pressure === 'dire') signals.push({ text: 'Under heavy pressure', polarity: 'negative' });
  if (!signals.length) signals.push({ text: 'Operations normal', polarity: 'neutral' });
  return { overall, score, signals };
}

function renderMotelCommandBoard(state) {
  const board = document.getElementById('motel-command-board');
  if (!board) return;

  const rooms = Array.isArray(state?.rooms) ? state.rooms : [];
  const spaces = Array.isArray(state?.sharedSpaces) ? state.sharedSpaces : [];
  if (!rooms.length && !spaces.length) { board.innerHTML = ''; return; }

  const zoneById = {};
  spaces.forEach((sp) => { if (sp) zoneById[Number(sp.zoneId || 0)] = sp; });

  const getPressureClass = (zoneId) => {
    const sp = zoneById[zoneId];
    if (!sp) return '';
    const score = Number(sp.pressureScore || 0);
    if (sp.severity === 'high' || score >= 5) return 'mcb-danger';
    if (sp.severity === 'medium' || score >= 3) return 'mcb-elevated';
    if (score >= 1) return 'mcb-watch';
    return '';
  };

  const getScore = (zoneId) => Number(zoneById[zoneId]?.pressureScore || 0);
  const getPct = (zoneId) => Math.min(100, (getScore(zoneId) / 6) * 100).toFixed(0);

  const blackoutLevel = state?.blackoutState?.level || 'none';
  const huntActive = Boolean(state?.huntNight?.active);
  const overrideActive = Boolean(state?.systemOverride?.active);
  const finaleActive = Boolean(state?.finaleUi?.active);

  let badgeClass = 'mcb-badge-live';
  let badgeText = 'Live';
  if (finaleActive)             { badgeClass = 'mcb-badge-finale';   badgeText = 'FINALE'; }
  else if (blackoutLevel !== 'none') { badgeClass = 'mcb-badge-blackout'; badgeText = 'BLACKOUT'; }
  else if (overrideActive)      { badgeClass = 'mcb-badge-override'; badgeText = 'OVERRIDE'; }
  else if (huntActive)          { badgeClass = 'mcb-badge-hunt';     badgeText = 'HUNT'; }

  const unlocked = rooms.filter((r) => r.unlocked !== false);
  const occupiedCount = unlocked.filter((r) => r.occupied).length;
  const callCount    = unlocked.filter((r) => r.occupied && Boolean(r?.serviceState?.pendingRequest)).length;
  const tenseCount   = unlocked.filter((r) => r.occupied && (r.condition === 'Tense' || r.condition === 'Hostile')).length;

  const zoneHtml = (zoneId, slug, name) => {
    const pClass = getPressureClass(zoneId);
    return '<div class="mcb-zone mcb-zone-' + slug + ' ' + pClass + '" title="' + name + ' \u2014 Pressure: ' + getScore(zoneId) + '">' +
      '<span class="mcb-zone-name">' + name + '</span>' +
      '<span class="mcb-zone-bar" style="--zp:' + getPct(zoneId) + '%"></span>' +
    '</div>';
  };

  const roomTilesHtml = unlocked.slice(0, 8).map((room) => {
    const num = String(room.label || '').replace(/\D/g, '') || '?';
    if (!room.occupied) {
      return '<div class="mcb-room mcb-room-vacant" title="' + room.label + ' \u2014 Vacant"><span class="mcb-room-num">' + num + '</span></div>';
    }
    const cond = room.condition || 'Stable';
    const hasPending = Boolean(room?.serviceState?.pendingRequest);
    const condClass = cond === 'Hostile' ? 'mcb-room-hostile' : cond === 'Tense' ? 'mcb-room-tense' : 'mcb-room-occupied';
    const initial = (room.guestName || '?').charAt(0).toUpperCase();
    return '<div class="mcb-room ' + condClass + (hasPending ? ' mcb-room-call' : '') + '" title="' + room.label + ' \u2014 ' + (room.guestName || 'Guest') + ' \u2014 ' + cond + '">' +
      '<span class="mcb-room-num">' + num + '</span>' +
      '<span class="mcb-room-initial">' + initial + '</span>' +
      (hasPending ? '<span class="mcb-call-dot"></span>' : '') +
    '</div>';
  }).join('');

  const weather = deriveWeatherState(state);
  const condition = deriveMotelCondition(state);

  board.innerHTML =
    '<div class="mcb-inner">' +
      '<div class="mcb-top-strip">' +
        '<span class="mcb-title">Command</span>' +
        '<span class="mcb-badge ' + badgeClass + '">' + badgeText + '</span>' +
      '</div>' +
      '<div class="mcb-env-strip">' +
        '<span class="mcb-env-label">Env</span>' +
        '<span class="mcb-weather-chip is-' + weather.primary + '">' + weather.primary.charAt(0).toUpperCase() + weather.primary.slice(1) + '</span>' +
        '<span class="mcb-condition-chip is-' + condition.overall + '">' + condition.overall.charAt(0).toUpperCase() + condition.overall.slice(1) + '</span>' +
      '</div>' +
      '<div class="mcb-layout">' +
        '<div class="mcb-zone-col">' + zoneHtml(2, 'park', 'Park') + zoneHtml(1, 'lobby', 'Lobby') + '</div>' +
        '<div class="mcb-connector"></div>' +
        zoneHtml(3, 'hall', 'Hall') +
        '<div class="mcb-connector"></div>' +
        '<div class="mcb-rooms-block"><div class="mcb-rooms-strip">' + roomTilesHtml + '</div></div>' +
        '<div class="mcb-zone-col">' + zoneHtml(4, 'util', 'Util') + zoneHtml(6, 'rear', 'Rear') + '</div>' +
      '</div>' +
      '<div class="mcb-stats">' +
        '<span class="mcb-stat">Rooms <strong>' + occupiedCount + '/' + unlocked.length + '</strong></span>' +
        (callCount > 0 ? '<span class="mcb-stat mcb-stat-alert">Calls <strong>' + callCount + '</strong></span>' : '') +
        (tenseCount > 0 ? '<span class="mcb-stat mcb-stat-warn">Tense <strong>' + tenseCount + '</strong></span>' : '') +
      '</div>' +
    '</div>';
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
    appShell.classList.remove(
      'pressure-calm',
      'pressure-tense',
      'pressure-dire',
      'pressure-emergency',
      'atmosphere-blackout-risk',
      'atmosphere-blackout-partial',
      'atmosphere-blackout-full',
      'atmosphere-hostile-night',
      'atmosphere-hallway-threat',
      'atmosphere-visibility-reduced',
      'atmosphere-flashlight',
      'atmosphere-emergency-lanterns',
      'atmosphere-hide-survival',
      'atmosphere-system-override',
      'atmosphere-scanner-compromised',
      'atmosphere-hunt-night',
      'atmosphere-alerts-compromised'
    );
    appShell.classList.add(`pressure-${state?.uiPressureLevel || 'calm'}`);
    const finaleBand = String(state?.finaleUi?.pressureBand || '');
    const finaleActive = Boolean(state?.finaleUi?.active);
    appShell.classList.toggle('is-finale-night', finaleActive);
    appShell.classList.toggle('is-last-stand', finaleActive && (finaleBand === 'critical' || finaleBand === 'high'));
    const blackoutLevel = state?.blackoutState?.level || 'none';
    appShell.classList.toggle('atmosphere-blackout-risk', blackoutLevel === 'risk');
    appShell.classList.toggle('atmosphere-blackout-partial', blackoutLevel === 'partial');
    appShell.classList.toggle('atmosphere-blackout-full', blackoutLevel === 'full');
    appShell.classList.toggle('atmosphere-hostile-night', state?.crisisNight?.kind === 'hostile-social-night');
    appShell.classList.toggle('atmosphere-hallway-threat', Number(state?.crisisEscalation?.hallwayThreatLevel || 0) >= 2);
    appShell.classList.toggle('atmosphere-visibility-reduced', blackoutLevel === 'partial' || blackoutLevel === 'full');
    appShell.classList.toggle('atmosphere-flashlight', Boolean(state?.blackoutState?.flashlightMode));
    appShell.classList.toggle('atmosphere-emergency-lanterns', String(state?.blackoutState?.visibilityBand || '') === 'emergency-lanterns');
    appShell.classList.toggle('atmosphere-hide-survival', Boolean(state?.emergencyState?.hideSurvivalActive));
    const override = state?.systemOverride || {};
    const huntNight = state?.huntNight || {};
    appShell.classList.toggle('atmosphere-system-override', Boolean(override.active));
    appShell.classList.toggle('atmosphere-scanner-compromised', Boolean(override.active && override.scannerCompromised));
    appShell.classList.toggle('atmosphere-hunt-night', Boolean(huntNight.active));
    appShell.classList.toggle('atmosphere-alerts-compromised', Boolean(override.active && override.alertsCompromised));
    const _topbarWeather = deriveWeatherState(state);
    const _topbarCondition = deriveMotelCondition(state);
    appShell.dataset.weather = _topbarWeather.primary;
    appShell.dataset.motelCondition = _topbarCondition.overall;
  }

  const radioBtn = document.getElementById('radio-intercept-btn');
  if (radioBtn) {
    const scannerCount = Array.isArray(state?.localScannerFeed) ? state.localScannerFeed.length : 0;
    const hasFactionGuest = Array.isArray(state?.guests) && state.guests.some((g) => g?.factionProfile?.id);
    const pressure = state?.uiPressureLevel || 'calm';
    const interceptEligible = scannerCount >= 2 || hasFactionGuest || pressure !== 'calm';
    const interceptUsed = Boolean(state?.radioInterceptionUsed);
    radioBtn.disabled = interceptUsed || !interceptEligible;
    radioBtn.classList.toggle('is-used', interceptUsed);
    radioBtn.hidden = false;
    const hintEl = document.getElementById('radio-intercept-hint');
    if (hintEl) {
      hintEl.textContent = interceptUsed ? 'Used this shift' : interceptEligible ? '−5 power • once per shift' : 'Available when scanner is active';
    }
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
      const emphasis = Number(alert?.message?.length || 0) >= 96 || type === 'danger';
      item.className = `live-alert live-alert-${type} ${isActionable ? 'live-alert-actionable' : ''} ${emphasis ? 'is-emphasis' : ''}`;
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

  const contextStrip = document.getElementById('topbar-context-strip');
  if (contextStrip) {
    const pressure = state?.uiPressureLevel || 'calm';
    const scenario = state?.activeScenario?.label || 'Standard Shift';
    const identity = state?.nightIdentityLine ? String(state.nightIdentityLine).slice(0, 88) : '';
    const emergency = state?.emergencyNight?.active ? String(state.emergencyNight.label || 'Emergency').slice(0, 56) : '';
    const hunt = state?.huntNight?.active ? 'Hunt night' : '';
    const blackout = state?.blackoutState?.level && state.blackoutState.level !== 'none' ? `Lights: ${state.blackoutState.level}` : '';
    const elapsed = Number(state?.shiftElapsedMinutes || 0);
    const dawnStatus = elapsed >= 480 ? '6:00 AM — DAWN' : elapsed >= 465 ? '5:45 AM — Shift ending soon' : '';
    const raidStatus = state?.raidStatus === 'pending' ? 'RAID INCOMING' : '';
    contextStrip.textContent = [scenario, `${pressure} pressure`, identity, emergency, hunt, blackout, dawnStatus, raidStatus]
      .filter(Boolean)
      .join(' · ')
      .slice(0, 260);
    contextStrip.classList.toggle('is-dawn', elapsed >= 480);
    contextStrip.classList.toggle('is-raid', state?.raidStatus === 'pending');
  }

  const storyBeatCard = document.getElementById('active-story-beat-card');
  if (storyBeatCard) {
    const beat = state?.activeStoryBeat || null;
    const signature = state?.signatureNight || null;
    const emergency = state?.emergencyNight || null;
    if (!beat) {
      storyBeatCard.classList.remove('is-active');
      storyBeatCard.innerHTML = emergency?.active
        ? `
          <div class="active-event-header">
            <p class="section-tag">Emergency Night</p>
            <span class="active-event-severity severity-high">TIER ${Math.max(1, Number(emergency.commandTier || 1))}</span>
          </div>
          <h4>${emergency.label || 'Emergency Night'}</h4>
          <p class="muted">${emergency.note || 'Command choices are now part of survival.'}</p>
        `
        : signature?.active
        ? `
          <div class="active-event-header">
            <p class="section-tag">Signature Night</p>
            <span class="active-event-severity severity-high">STAGE ${Math.max(1, Number(signature.stage || 1))}</span>
          </div>
          <h4>${signature.title || 'Signature Night'}</h4>
          <p class="muted">${signature.note || 'A distinctive night structure is active.'}</p>
        `
        : '<p class="muted">No recurring story beat active tonight.</p>';
    } else {
      storyBeatCard.classList.add('is-active');
      storyBeatCard.innerHTML = `
        <div class="active-event-header">
          <p class="section-tag">Story Beat</p>
          <span class="active-event-severity severity-medium">STAGE ${Math.max(1, Number(beat.stage || 1))}</span>
        </div>
        <h4>${beat.title || 'Recurring Thread'}</h4>
        <p class="muted">${beat.note || 'A prior night consequence may surface during this shift.'}</p>
        ${signature?.active ? `<p class="muted">${signature.title} is also active at stage ${Math.max(1, Number(signature.stage || 1))}.</p>` : ''}
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
      ${state?.nightMoodLine ? `<p class="night-mood-line">${state.nightMoodLine}</p>` : ''}
      ${state?.nightIdentityLine ? `<p class="muted">${state.nightIdentityLine}</p>` : ''}
      ${state?.crisisNight?.active && state?.crisisNight?.note ? `<p class="muted">${state.crisisNight.note}</p>` : ''}
    `;
    runIdentityStrip.title = 'Doctrine and faction climate shape subtle bonuses, pressure, and narrative tone.';
  }

  const shiftBranchHint = document.getElementById('shift-branch-hint');
  if (shiftBranchHint) {
    const blackoutLine = state?.blackoutState?.level === 'full'
      ? 'Outlook: full blackout pressure is distorting cameras, service confidence, and room urgency.'
      : state?.blackoutState?.level === 'partial'
        ? 'Outlook: partial blackout pressure is dragging shared-space confidence down.'
        : state?.directorShiftHint || 'Outlook: Pressure is mixed tonight.';
    shiftBranchHint.textContent = blackoutLine;
  }

  const hallwayThreatLine = document.getElementById('hallway-threat-line');
  if (hallwayThreatLine) {
    hallwayThreatLine.textContent = state?.hallwayThreatLine || 'Hallway feel: the shared spaces still seem quiet, but not trustworthy.';
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

  const calStrip = document.getElementById('shift-cal-strip');
  if (calStrip) {
    const nightNum = Number(state?.night || 1);
    const totalNights = Number(state?.campaignProgress?.totalNights || state?.totalNights || 5);
    const isFinale = Boolean(state?.campaignMilestone?.isFinale || state?.finaleUi?.active);
    const getNightPhaseLabel = (n, total) => {
      if (n === 1) return { label: 'Opening Night', cls: 'is-opening' };
      if (isFinale) return { label: 'Final Night', cls: 'is-finale' };
      const pct = total > 1 ? n / total : 0.5;
      if (pct <= 0.35) return { label: 'Early Campaign', cls: 'is-early' };
      if (pct <= 0.65) return { label: 'Mid-Campaign', cls: 'is-mid' };
      return { label: 'Final Stretch', cls: 'is-stretch' };
    };
    const phase = getNightPhaseLabel(nightNum, totalNights);
    const scenarioName = state?.activeScenario?.label || '';
    const _calWeather = deriveWeatherState(state);
    calStrip.innerHTML =
      `<span class="shift-cal-night-label">Night ${nightNum}</span>` +
      `<span class="shift-cal-phase-chip ${phase.cls}">${phase.label}</span>` +
      (_calWeather.primary !== 'clear' ? `<span class="shift-cal-weather-chip is-${_calWeather.primary}">${_calWeather.primary.charAt(0).toUpperCase() + _calWeather.primary.slice(1)}</span>` : '') +
      (scenarioName ? `<span class="shift-cal-scenario-label">${scenarioName}</span>` : '');
  }

  const motelCapacityLine = document.getElementById('motel-capacity-line');
  if (motelCapacityLine) {
    motelCapacityLine.textContent = state?.motelCapacityLine || '';
  }

  const frontdeskIntakeLine = document.getElementById('frontdesk-intake-line');
  if (frontdeskIntakeLine) {
    frontdeskIntakeLine.textContent = state?.intakeStatusLine || '';
  }

  const scannerFeed = document.getElementById('desk-scanner-feed');
  if (scannerFeed) {
    const items = Array.isArray(state?.localScannerFeed) ? state.localScannerFeed : [];
    scannerFeed.innerHTML = items.length
      ? items
        .map((entry) => {
          const planted = Boolean(entry?.planted);
          return `
          <div class="scanner-feed-item scanner-tone-${entry?.tone || 'ambient'}${planted ? ' scanner-feed-planted' : ''}">
            <span class="scanner-feed-label">${getScannerToneLabel(entry)}</span>
            <div class="scanner-feed-copy">
              <span class="scanner-feed-text">${entry?.text || ''}</span>
            </div>
          </div>
        `;
        })
        .join('')
      : '<div class="scanner-feed-item">Scanner quiet. No local traffic worth calling out yet.</div>';
    const scannerCard = scannerFeed.closest('.desk-scanner-card');
    if (scannerCard) {
      const ov = state?.systemOverride || {};
      scannerCard.classList.toggle('is-system-override', Boolean(ov.active));
      scannerCard.classList.toggle('is-scanner-compromised', Boolean(ov.active && ov.scannerCompromised));
      scannerCard.classList.toggle('is-feed-isolated', Boolean(ov.active && ov.isolatedFeed));
    }
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
  const emergencyCommands = state?.emergencyCommands || null;
  const emergencyActive = Boolean(emergencyCommands?.active) && !finaleActive;

  if (finaleBanner) {
    finaleBanner.hidden = !finaleActive;
    finaleBanner.textContent = finaleUi?.banner || 'Final Night';
  }

  if (finaleStateCard) {
    finaleStateCard.hidden = !finaleActive && !emergencyActive;
    finaleStateCard.classList.remove('band-contained', 'band-elevated', 'band-high', 'band-critical');
    if (finaleActive) {
      finaleStateCard.classList.add(`band-${finaleUi?.pressureBand || 'contained'}`);
    }
  }

  if (finalePressureLabel) {
    finalePressureLabel.textContent = emergencyActive
      ? `Emergency pressure: ${String(emergencyCommands?.type || 'active').replace(/-/g, ' ').toUpperCase()} (${emergencyCommands?.severity || 0})`
      : finaleUi?.pressureLabel || 'Finale pressure: CONTAINED (0)';
  }

  if (finaleChainLabel) {
    if (emergencyActive) {
      finaleChainLabel.textContent = emergencyCommands?.note || 'Emergency command choices are live.';
    } else if (!finaleActive) {
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
    if (emergencyActive) {
      (emergencyCommands?.commands || []).slice(0, 4).forEach((command) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'button button-warning';
        button.textContent = command?.label || 'Emergency Command';
        button.title = command?.note || '';
        button.addEventListener('click', () => {
          if (typeof state?.onEmergencyCommand === 'function' && command?.id) {
            state.onEmergencyCommand(command.id);
          }
        });
        finaleCommandRow.appendChild(button);
      });
    } else if (finaleActive) {
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
  const sharedSpaceAttention = (Array.isArray(state?.sharedSpaces) ? state.sharedSpaces : []).filter(
    (space) => (space?.pressureScore || 0) >= 3 || space?.severity === 'high'
  ).length;

  setTabBadge('frontdesk-tab-badge', state?.guests?.length || 0);
  setTabBadge('cameras-tab-badge', unresolvedCameraCount);
  setTabBadge('spaces-tab-badge', sharedSpaceAttention);
  setTabBadge('report-tab-badge', reportAttention);

  setPanelAttention('frontdesk-panel', (state?.guests?.length || 0) > 0);
  setPanelAttention('cameras-panel', unresolvedCameraCount > 0);
  setPanelAttention('spaces-panel', sharedSpaceAttention > 0);
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

  renderMotelCommandBoard(state);
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

export function renderGuests(
  state,
  onCheckIn,
  onFlagGuest,
  onRejectGuest,
  onInspectId,
  onDeepInspect,
  onDeposit,
  onSecondaryVerify,
  onHoldScreening,
  onHandleSpecialEncounter,
  onQuestionGuest
) {
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
    card.className = `guest-card guest-card-v20 ${emphasisClass}`.trim();
    card.dataset.risk = (guest.riskLevel || 'Low').toLowerCase();
    card.dataset.archetype = (guest.archetypeKey || 'unknown').toLowerCase().replace(/[^a-z0-9]/g, '-');
    const contradictionLines = Array.isArray(guest?.contradictionLines) ? guest.contradictionLines.slice(0, 3) : [];
    const scannerFriction = (guest?.scannerMatches || []).some((line) => /mismatch|planted/i.test(String(line)));
    const recommendedQuestions = Array.isArray(guest?.recommendedQuestionLabels) ? guest.recommendedQuestionLabels.slice(0, 3) : [];
    const supportLines = [
      state?.progressionModifiers?.uvClueBonus ? 'UV Reference active' : '',
      state?.progressionModifiers?.followupInsightBonus ? 'Cross-check support active' : '',
      state?.progressionModifiers?.scannerFeedDensity ? 'Heavy scanner indexing active' : ''
    ].filter(Boolean);
    const linkedCaseLabel = guest?.linkedArrival?.kind ? formatCaseLabel(guest.linkedArrival.kind) : '';
    const policyLead = String(guest.policyAlignmentLine || guest.policyReason || '').trim();
    const strapline = (guest?.inspectionHeadline || policyLead.split('.')[0] || 'Scan chips and case read before releasing a room.').trim();
    const riskLower = (guest.riskLevel || 'Low').toLowerCase();
    const policyLower = (guest.policyRecommendation || 'Approve').toLowerCase();
    const archetypeInitial = (guest.archetypeLabel || 'G').charAt(0).toUpperCase();
    const decSig = Number(guest?.deceptionSignal || 0);
    const contCount = contradictionLines.length;
    const decChipClass = decSig >= 2 ? 'dec-high' : decSig >= 1 ? 'dec-medium' : 'dec-low';
    const contChipClass = contCount >= 2 ? 'cont-high' : contCount >= 1 ? 'cont-low' : 'cont-none';
    // v0.26 — named presence, memory echo, group role, faction tag
    const namedPresence = guest?.namedPresence || null;
    const linkedRole = guest?.linkedArrival?.role || null;
    const linkedKind = guest?.linkedArrival?.kind || null;
    const roleChipClass = linkedRole === 'lead' ? 'is-lead' : linkedRole === 'follow' ? 'is-follow' : linkedRole === 'lookout' ? 'is-lookout' : 'is-pair';
    const roleChipLabel = linkedRole === 'lead' ? 'Lead Arrival' : linkedRole === 'follow' ? 'Follow' : linkedRole === 'lookout' ? 'Lookout' : linkedKind ? formatCaseLabel(linkedKind) : '';
    const factionId = guest?.factionProfile?.id || '';
    const factionFmtId = factionId.replace(/[^a-z0-9-]/g, '-');
    const factionVisibleMark = guest?.factionProfile?.visibleMark || '';

    const namedPresenceHtml = namedPresence
      ? `<div class="v26-named-presence-strip">
          <span class="v26-named-presence-badge">${namedPresence.label}</span>
          <div>
            <span class="v26-named-presence-recognition">${namedPresence.recognition}</span>
            ${namedPresence.escalationNote ? `<div class="v26-named-escalation-note">${namedPresence.escalationNote}</div>` : ''}
          </div>
        </div>`
      : '';

    const memoryChips = [];
    if (guest?.retaliationRisk) memoryChips.push(`<span class="v26-memory-chip is-retaliation" title="${guest.retaliationNote || ''}">Retaliation Risk</span>`);
    if (guest?.trustScore >= 2) memoryChips.push(`<span class="v26-memory-chip is-trust" title="${guest.trustNote || ''}">Trust ×${guest.trustScore}</span>`);
    if (guest?.returnModifier === 'hostile-return') memoryChips.push('<span class="v26-memory-chip is-hostile">Prior Eviction</span>');
    if (guest?.returnModifier === 'resentful') memoryChips.push('<span class="v26-memory-chip is-hostile">Resentful Return</span>');
    if (guest?.returnModifier === 'knows-you-watched') memoryChips.push('<span class="v26-memory-chip is-watched">Was Watched</span>');
    if (guest?.groupMemoryLine) memoryChips.push('<span class="v26-memory-chip is-neutral">Group Pattern</span>');
    const memoryEchoHtml = (guest?.isReturningGuest && memoryChips.length)
      ? `<div class="v26-memory-echo-strip"><span class="v26-memory-echo-label">Memory</span>${memoryChips.join('')}</div>`
      : '';

    card.innerHTML = `
      <div class="guest-card-header">
        <div class="guest-arch-avatar guest-arch-risk-${riskLower}" title="${guest.archetypeLabel || 'Unknown Pattern'}">${archetypeInitial}</div>
        <h4>${guest.name}</h4>
        <div class="guest-critical-badges">
          ${getReturningBadgeMarkup(guest)}
          ${getFlagBadgeMarkup(guest.flagged)}
          ${guest?.specialEncounter && !guest.specialEncounter.resolved
            ? `<span class="special-badge">${guest.specialEncounter.badgeLabel || 'SPECIAL'}</span>`
            : ''}
        </div>
      </div>
      ${namedPresenceHtml}
      ${memoryEchoHtml}
      <div class="guest-chip-row guest-chip-row-primary">
        <span class="risk-badge ${getRiskBadgeClass(guest.riskLevel || 'Low')}" title="Risk estimates incident chance after check-in.">Risk: ${guest.riskLevel || 'Low'}</span>
        <span class="policy-badge ${getPolicyBadgeClass(guest.policyRecommendation || 'Approve')}" title="Policy is guidance, not a forced action.">${(guest.policyRecommendation || 'Approve').toUpperCase()}</span>
        <span class="guest-meta-chip">Mood: ${guest.mood}</span>
        <span class="guest-meta-chip guest-meta-chip-archetype">${guest.archetypeLabel || 'Unknown Pattern'}</span>
      </div>
      <div class="v24-verdict-strip">
        <span class="v24-verdict-chip v24-verdict-chip-risk-${riskLower}" title="Risk level">Risk ${guest.riskLevel || 'Low'}</span>
        <span class="v24-verdict-chip v24-verdict-chip-policy-${policyLower}" title="Policy recommendation">${(guest.policyRecommendation || 'APPROVE').toUpperCase()}</span>
        ${decSig > 0 ? `<span class="v24-verdict-chip v24-verdict-chip-${decChipClass}" title="Deception signal">Deception ×${decSig}</span>` : ''}
        ${contCount > 0 ? `<span class="v24-verdict-chip v24-verdict-chip-${contChipClass}" title="Contradictions found">${contCount} Contradiction${contCount > 1 ? 's' : ''}</span>` : ''}
        ${guest?.forgeryProfile?.isForged ? '<span class="v24-verdict-chip v24-verdict-chip-dec-high" title="Forgery risk detected">Forgery Risk</span>' : ''}
      </div>
      <div class="guest-chip-row guest-chip-row-secondary">
        ${buildSignalChips(guest)}
        ${guest?.contradictoryClue ? '<span class="guest-meta-chip guest-meta-chip-contradiction">Mixed Cues</span>' : ''}
        ${Number(guest?.expectedStayNights || 0) > 0 ? `<span class="guest-meta-chip guest-stay-chip" title="Expected stay length if approved.">Stay: ${guest.expectedStayNights}N</span>` : ''}
        ${guest?.scannerMatches?.length ? '<span class="guest-meta-chip guest-meta-chip-scanner">Scanner Link</span>' : ''}
        ${guest?.forgeryProfile?.isForged ? '<span class="guest-meta-chip guest-meta-chip-contradiction">Forgery Risk</span>' : ''}
        ${factionId ? `<span class="v26-faction-tag faction-${factionFmtId}" title="${factionVisibleMark}">${guest.factionProfile.label}${factionVisibleMark ? `<span class="v26-faction-mark"> • ${factionVisibleMark.slice(0, 28)}</span>` : ''}</span>` : ''}
        ${(linkedRole || linkedKind) ? `<span class="v26-group-role-chip ${roleChipClass}">${roleChipLabel}</span>` : ''}
        ${guest?.vehicleProfile ? '<span class="guest-meta-chip guest-meta-chip-scanner">Vehicle Read</span>' : ''}
        ${guest?.idInspected ? '<span class="guest-meta-chip guest-meta-chip-verified">ID Read</span>' : ''}
        ${guest?.uvInspected ? '<span class="guest-meta-chip guest-meta-chip-uv">UV Used</span>' : ''}
      </div>
      <p class="guest-case-strapline">${strapline}</p>
      ${(guest?.inspectionHeadline || contradictionLines.length || recommendedQuestions.length)
        ? `<div class="guest-case-read ${[contradictionLines.length >= 3 ? 'is-hot' : '', scannerFriction ? 'has-scanner-friction' : ''].filter(Boolean).join(' ')}">
            <div class="guest-case-read-header">
              <p class="section-tag">Case Read</p>
              ${linkedCaseLabel ? `<span class="guest-case-pill">${linkedCaseLabel}</span>` : ''}
            </div>
            ${guest?.inspectionHeadline ? `<p class="guest-case-headline">${guest.inspectionHeadline}</p>` : ''}
            ${contradictionLines.length
              ? `<ul class="guest-contradiction-list">${contradictionLines.map((line) => `<li class="guest-contradiction-item">${line}</li>`).join('')}</ul>`
              : ''}
            ${recommendedQuestions.length ? `<p class="guest-followup-line">Ask Follow-Up: <strong>${recommendedQuestions.join(' • ')}</strong></p>` : ''}
            ${supportLines.length ? `<p class="guest-support-line muted">Desk support: ${supportLines.join(' • ')}.</p>` : ''}
          </div>`
        : ''}
      ${guest?.specialEncounter && !guest.specialEncounter.resolved
        ? `
          <div class="guest-special-row guest-detail-block">
            <span class="guest-special-title">${guest.specialEncounter.title || 'Special Encounter'}</span>
            <span class="guest-special-preview">${guest.specialEncounter.preview || ''}</span>
          </div>
          <p class="guest-special-clue">${guest.specialEncounter.clue || ''}</p>
        `
        : ''}
      <details class="guest-notes-drawer">
        <summary>Supporting notes &amp; tie-ins</summary>
        <div class="guest-notes-drawer-body">
          ${guest.archetypeClue ? `<p class="guest-archetype-clue">${emphasizeClueText(guest.archetypeClue)}</p>` : ''}
          <p class="guest-policy-reason">${guest.policyAlignmentLine || guest.policyReason || 'No policy concerns detected.'}</p>
          <p class="guest-note">${guest.riskNote || ''}</p>
          ${(guest?.contextTag || guest?.visualHint)
            ? `<p class="guest-scan-line">${guest.contextTag ? `Context: ${guest.contextTag}. ` : ''}${guest.visualHint ? `Visual: ${guest.visualHint}.` : ''}</p>`
            : ''}
          ${guest?.vehicleProfile?.summary ? `<p class="guest-scan-line guest-scan-line-warning">Vehicle: ${guest.vehicleProfile.summary}</p>` : ''}
          ${guest?.linkedArrival?.note ? `<p class="guest-scan-line guest-scan-line-warning">${guest.linkedArrival.note}</p>` : ''}
          ${guest?.groupMemoryLine ? `<p class="guest-scan-line guest-scan-line-warning">${guest.groupMemoryLine}</p>` : ''}
          ${guest?.retaliationNote ? `<p class="guest-scan-line guest-scan-line-warning">${guest.retaliationNote}</p>` : ''}
          ${guest?.deceptionNote ? `<p class="guest-scan-line">${guest.deceptionNote}</p>` : ''}
          ${guest?.trustNote ? `<p class="guest-scan-line">${guest.trustNote}</p>` : ''}
          ${guest?.scannerMatches?.length
            ? `<p class="guest-scan-line guest-scan-line-warning${scannerFriction ? ' guest-scan-friction' : ''}">${guest.scannerMatches.join(' ')}</p>`
            : ''}
        </div>
      </details>
      <details class="guest-inspection-drawer">
        <summary>Desk Inspection</summary>
        <div class="guest-inspection-grid">
          <div class="guest-detail-block guest-id-block">
            <p class="guest-id-line"><strong>ID:</strong> ${guest?.idProfile?.cardName || guest.name}</p>
            <p class="guest-id-line"><strong>Status:</strong> ${guest?.idProfile?.validity || 'Unknown'}</p>
            <p class="guest-id-line"><strong>Reason:</strong> ${guest?.idProfile?.visitReason || 'Not provided'}</p>
            <p class="guest-id-line"><strong>Region:</strong> ${guest?.idProfile?.issuingRegion || 'Unknown'}</p>
            <p class="guest-id-line muted">${guest?.idProfile?.irregularities?.length ? `Irregularities: ${guest.idProfile.irregularities.join('; ')}` : 'No visible document irregularities yet.'}</p>
          </div>
          <div class="guest-detail-block guest-uv-block">
            <p class="guest-id-line"><strong>UV Read:</strong> ${guest?.uvInspected ? (guest?.uvProfile?.suspicious ? 'Suspicious' : 'Clear') : 'Not used yet'}</p>
            <p class="guest-id-line muted">${guest?.uvInspected ? (guest?.uvProfile?.markers || []).join('; ') : 'Use UV only when the desk read feels off or scanner chatter lines up.'}</p>
          </div>
          <div class="guest-detail-block guest-uv-block">
            <p class="guest-id-line"><strong>Pattern:</strong> ${guest?.factionProfile?.label || 'No strong local-network sign yet'}</p>
            <p class="guest-id-line muted">${guest?.factionProfile?.clue || guest?.linkedArrival?.note || 'No linked traveler or faction pattern surfaced yet.'}</p>
          </div>
          <div class="guest-detail-block guest-uv-block">
            <p class="guest-id-line"><strong>Vehicle:</strong> ${guest?.vehicleProfile?.type || 'No strong vehicle read yet'}</p>
            <p class="guest-id-line muted">${guest?.vehicleProfile ? `${guest.vehicleProfile.parkedPosition}; ${guest.vehicleProfile.clues.join('; ')}` : 'Parking and pickup patterns can expose linked groups or watcher behavior.'}</p>
          </div>
        </div>
      </details>
      <div class="guest-detail-block guest-room-choice-block">
        <p class="guest-room-choice-label">Room release matters tonight.</p>
        <div class="guest-room-choice-row">
          <select class="guest-room-select" aria-label="Recommended room for ${guest.name}">
            ${(guest?.roomAssignmentOptions?.length
              ? guest.roomAssignmentOptions
              : [{ roomId: '', label: 'Auto assign first vacant room', reasons: ['standard fit'] }])
              .map((option) => `<option value="${option.roomId}">${option.label}${option?.reasons?.length ? ` • ${option.reasons.join(', ')}` : ''}</option>`)
              .join('')}
          </select>
          <p class="guest-room-choice-hint muted">${guest?.roomAssignmentOptions?.[0] ? `Best fit: ${guest.roomAssignmentOptions[0].label} (${guest.roomAssignmentOptions[0].reasons.join(', ')}).` : 'Auto assignment will use the first vacant room.'}</p>
        </div>
      </div>
      ${(guest.priorHistoryLine || guest.threadMemoryLine)
        ? `<div class="guest-history-block">
            ${guest.priorHistoryLine ? `<p class="guest-history-line">${guest.priorHistoryLine}</p>` : ''}
            ${guest.threadMemoryLine ? `<p class="guest-history-line">${guest.threadMemoryLine}</p>` : ''}
          </div>`
        : ''}
      <div class="guest-action-stack">
        <div class="action-group action-group-decide">
          <p class="action-group-label">Desk decision</p>
          <div class="action-group-body guest-action-row"></div>
        </div>
        <div class="action-group action-group-investigate">
          <p class="action-group-label">Investigation</p>
          <div class="action-group-body guest-action-row-secondary"></div>
        </div>
      </div>
    `;

    const actions = card.querySelector('.guest-action-row');
    const secondaryActions = card.querySelector('.guest-action-row-secondary');
    const roomSelect = card.querySelector('.guest-room-select');
    const checkInButton = document.createElement('button');
    checkInButton.className = 'button button-primary';
    checkInButton.textContent = 'Check In';
    checkInButton.title = 'Assign room now. Gains money, but may introduce pressure depending on guest risk.';
    bindAtomicActionButton(checkInButton, () => onCheckIn(guest.id, roomSelect?.value || null), { groupRoot: actions });

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

    const inspectIdButton = document.createElement('button');
    inspectIdButton.className = 'button button-secondary';
    inspectIdButton.textContent = guest?.idInspected ? 'ID Checked' : 'Inspect ID';
    inspectIdButton.title = 'Read the guest ID for expiry, validity, and mismatch clues.';
    inspectIdButton.disabled = Boolean(guest?.idInspected);
    bindAtomicActionButton(inspectIdButton, () => onInspectId(guest.id), { groupRoot: secondaryActions });

    const uvButton = document.createElement('button');
    uvButton.className = 'button button-utility';
    uvButton.textContent = guest?.uvInspected ? 'UV Done' : 'Use UV';
    uvButton.title = 'Optional deep inspection for hidden marks and forged details.';
    uvButton.disabled = Boolean(guest?.uvInspected);
    bindAtomicActionButton(uvButton, () => onDeepInspect(guest.id), { groupRoot: secondaryActions });

    const depositButton = document.createElement('button');
    depositButton.className = 'button button-utility';
    depositButton.textContent = guest?.depositRequested ? 'Deposit Taken' : 'Request Deposit';
    depositButton.title = 'Safer but colder desk handling. Can calm risk or drive off good guests.';
    depositButton.disabled = Boolean(guest?.depositRequested);
    bindAtomicActionButton(depositButton, () => onDeposit(guest.id), { groupRoot: secondaryActions });

    const verifyButton = document.createElement('button');
    verifyButton.className = 'button button-warning';
    verifyButton.textContent = guest?.secondaryVerified ? 'Verified' : 'Secondary Check';
    verifyButton.title = 'Ask follow-up questions and compare details before room release.';
    verifyButton.disabled = Boolean(guest?.secondaryVerified);
    bindAtomicActionButton(verifyButton, () => onSecondaryVerify(guest.id), { groupRoot: secondaryActions });

    const holdButton = document.createElement('button');
    holdButton.className = 'button button-warning';
    holdButton.textContent = guest?.heldForScreening ? 'Held' : 'Hold Screening';
    holdButton.title = 'Hold the guest aside. Safer, slower, and reputation-sensitive.';
    holdButton.disabled = Boolean(guest?.heldForScreening);
    bindAtomicActionButton(holdButton, () => onHoldScreening(guest.id), { groupRoot: secondaryActions });

    secondaryActions.appendChild(inspectIdButton);
    secondaryActions.appendChild(uvButton);
    secondaryActions.appendChild(depositButton);
    secondaryActions.appendChild(verifyButton);
    secondaryActions.appendChild(holdButton);

    const questionButton = document.createElement('button');
    questionButton.className = 'button button-utility';
    questionButton.textContent = 'Ask Follow-Up';
    questionButton.title = 'Push on vehicle, timing, relationship, or identity details for a sharper read.';
    bindAtomicActionButton(questionButton, () => {
      if (typeof onQuestionGuest === 'function') {
        onQuestionGuest(
          guest.id,
          guest?.vehicleProfile ? 'vehicle' : guest?.linkedArrival ? 'relationship' : guest?.forgeryProfile?.isForged ? 'inconsistency' : 'late-timing'
        );
      }
    }, { groupRoot: secondaryActions });
    secondaryActions.appendChild(questionButton);

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
  onRoomServiceAction,
  onReassignRoomGuest,
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
    const systemNoise = Boolean(state?.systemOverride?.active) && Boolean(room?.serviceState?.pendingRequest);
    const roomHasPendingRequest = Boolean(room?.serviceState?.pendingRequest);
    const roomChainHigh = Number(room?.chainPressure || 0) >= 4;
    const isSelectedRoom = _v21SelectedRoomId === room.id;
    card.className = `room-card ${getRoomConditionClass(room.condition || 'Stable')} room-tone-${presentation.tone} ${presentation.shouldPulse ? 'is-critical-pulse' : ''} ${room.occupied ? 'room-card-occupied' : 'room-card-vacant'} ${lockedOut ? 'room-card-locked' : ''} ${systemNoise ? 'room-card-system-noise' : ''} ${isSelectedRoom ? 'room-card-focused' : ''}`.trim();
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
        <div class="room-card-v20-surface">
          <div class="room-card-header">
            <h4>${room.label}</h4>
            <span class="room-condition-pill">${room.condition || 'Stable'}</span>
          </div>
          <p class="room-occupant-summary">Occupied by <strong>${room.guestName || room.occupiedBy}</strong>${room.occupantArchetypeLabel ? ` · ${room.occupantArchetypeLabel}` : ''}</p>
          ${Number(room.stayNightsRemaining) > 0 ? `<p class="room-stay-line muted">Stay: ${room.stayNightsRemaining} night${Number(room.stayNightsRemaining) === 1 ? '' : 's'} incl. tonight${Number(room.stayNightsRemaining) === 1 ? ' · checkout dawn' : ''}</p>` : ''}
          ${room?.memory?.note ? `<p class="room-memory-line muted">${room.memory.note}</p>` : ''}
          <div class="room-pressure-row">
            ${typeof room.chainPressure === 'number' && room.chainPressure > 0 ? `<p class="room-chain-line ${room.chainPressure >= 6 ? 'is-high' : ''}" title="Chain pressure tracks linked incident momentum across rooms.">Chain: ${room.chainPressure}</p>` : '<p class="room-chain-line" title="Chain pressure tracks linked incident momentum across rooms.">Chain: Low</p>'}
            <span class="room-state-chip">Locked: ${getBooleanText(room.lockedDown)}</span>
            <span class="room-state-chip">Power: ${getBooleanText(room.powerCut)}</span>
            <span class="room-state-chip">Mood: ${room?.serviceState?.mood || 'steady'}</span>
            <span class="room-state-chip">Attitude: ${room?.serviceState?.attitudeLabel || 'Guarded'}</span>
          </div>
          ${room?.serviceState?.pendingRequest
            ? `<div class="room-service-alert room-service-alert-${room.serviceState.pendingRequest.urgency || 'low'} room-service-kind-${String(room.serviceState.pendingRequest.kind || 'generic').replace(/[^a-z0-9-]/gi, '-').toLowerCase()}">
                <div class="room-service-head">
                  <p class="room-service-title">Active call: ${room.serviceState.pendingRequest.title}</p>
                  <span class="room-service-pill">${String(room.serviceState.pendingRequest.urgency || 'low').toUpperCase()} • ${getZoneHintLabel(room.serviceState.pendingRequest.zoneHint)}</span>
                </div>
                <p class="room-service-detail">${room.serviceState.pendingRequest.detail || ''}</p>
                ${room.serviceState.pendingRequest.routeLine ? `<p class="room-service-route">${room.serviceState.pendingRequest.routeLine}</p>` : ''}
                ${(() => {
                  const spillSpace = (Array.isArray(state?.sharedSpaces) ? state.sharedSpaces : []).find((space) => Number(space?.zoneId || 0) === Number(room?.serviceState?.pendingRequest?.zoneHint || 0));
                  return spillSpace
                    ? `<p class="room-service-spill ${spillSpace?.severity === 'high' ? 'is-hot' : ''}">Spill: ${spillSpace.label} · pressure ${spillSpace.pressureScore || 0}${spillSpace?.activeIssue ? ` · ${spillSpace.activeIssue}` : ''}</p>`
                    : '';
                })()}
              </div>`
            : ''}
          <details class="room-meta-drawer">
            <summary>Figures &amp; service log</summary>
            <div class="room-meta-drawer-body">
              <div class="room-meta-grid room-meta-grid-compact">
                ${presentation.compactMetaRows
                  .map((row) => `<p class="room-meta-line"><span>${row.label}</span><strong>${row.value}</strong></p>`)
                  .join('')}
                <p class="room-meta-line"><span>Open issues</span><strong>${Number(room?.serviceState?.unresolvedIssues || 0)}</strong></p>
                <p class="room-meta-line"><span>Service desk</span><strong>${room?.serviceState?.responseStatus || 'Quiet'}</strong></p>
              </div>
              ${room?.serviceState?.lastCheckLine ? `<p class="room-service-note muted">${room.serviceState.lastCheckLine}</p>` : ''}
              ${room?.serviceState?.attitudeNote ? `<p class="room-service-note muted">${room.serviceState.attitudeNote}</p>` : ''}
              ${room?.serviceState?.serviceHistory?.length
                ? `<p class="room-service-note muted">Recent: ${room.serviceState.serviceHistory[0]}</p>`
                : ''}
            </div>
          </details>
          <div class="room-action-stack">
            <div class="action-group">
              <p class="action-group-label">Service response</p>
              <div class="action-group-body room-service-row"></div>
            </div>
            <div class="action-group action-group-control">
              <p class="action-group-label">Room control</p>
              <div class="action-group-body room-tactical-row"></div>
            </div>
          </div>
        </div>
      `
      : `
        <div class="room-card-header">
          <h4>${room.label}</h4>
          <span class="room-condition-pill">Vacant</span>
        </div>
        <p class="room-meta">Vacant and available for check-in.</p>
      `;

    if (room.occupied) {
      const v20Surface = card.querySelector('.room-card-v20-surface');
      if (v20Surface) {
        const detailPanel = document.createElement('div');
        detailPanel.className = 'room-detail-panel';
        card.replaceChild(detailPanel, v20Surface);
        detailPanel.appendChild(v20Surface);

        const overviewRow = document.createElement('div');
        overviewRow.className = 'room-overview-row';
        overviewRow.innerHTML =
          '<div class="room-overview-identity">' +
            '<h4>' + room.label + '</h4>' +
            '<span class="room-condition-pill">' + (room.condition || 'Stable') + '</span>' +
            (roomHasPendingRequest ? '<span class="room-urgency-chip is-call">Call</span>' : '') +
            (roomChainHigh ? '<span class="room-urgency-chip is-chain">Chain&nbsp;' + Number(room.chainPressure) + '</span>' : '') +
          '</div>' +
          '<span class="room-overview-guest">' + (room.guestName || room.occupiedBy || '') + (room.occupantArchetypeLabel ? ' &middot; ' + room.occupantArchetypeLabel : '') + '</span>' +
          '<button class="button button-secondary room-focus-btn" type="button">' + (isSelectedRoom ? 'Close &times;' : 'Manage &rsaquo;') + '</button>';
        card.insertBefore(overviewRow, detailPanel);

        const focusBtn = overviewRow.querySelector('.room-focus-btn');
        if (focusBtn) {
          focusBtn.addEventListener('click', () => {
            const wasSelected = card.classList.contains('room-card-focused');
            roomList.querySelectorAll('.room-card-focused').forEach((c) => {
              c.classList.remove('room-card-focused');
              const btn = c.querySelector('.room-focus-btn');
              if (btn) btn.textContent = 'Manage \u203a';
            });
            if (!wasSelected) {
              _v21SelectedRoomId = room.id;
              card.classList.add('room-card-focused');
              focusBtn.textContent = 'Close \u00d7';
            } else {
              _v21SelectedRoomId = null;
            }
          });
        }
      }

      const serviceActions = card.querySelector('.room-service-row');
      const actions = card.querySelector('.room-tactical-row');
      const hasPendingRequest = Boolean(room?.serviceState?.pendingRequest);
      const hallwayLabel = hasPendingRequest ? 'Hallway Check' : 'Quiet Check';
      const deskLabel = hasPendingRequest ? 'Handle Desk' : 'Courtesy Call';
      const securityLabel = hasPendingRequest ? 'Send Security' : 'Mark Watch';
      const ignoreLabel = hasPendingRequest ? 'Delay' : 'Leave Alone';

      const hallwayButton = document.createElement('button');
      hallwayButton.className = 'button button-secondary';
      hallwayButton.textContent = hallwayLabel;
      hallwayButton.title = hasPendingRequest
        ? 'Quick verification action that clarifies the room call before committing staff.'
        : 'Low-intensity quiet check for a room that is not actively calling the desk.';
      bindAtomicActionButton(hallwayButton, () => onRoomServiceAction(room.id, 'hallway'), { groupRoot: serviceActions });

      const deskButton = document.createElement('button');
      deskButton.className = 'button button-utility';
      deskButton.textContent = deskLabel;
      deskButton.title = hasPendingRequest
        ? 'Try to settle the request from the desk. Fast, but not always enough.'
        : 'A light courtesy call that can build trust if the room only needs reassurance.';
      bindAtomicActionButton(deskButton, () => onRoomServiceAction(room.id, 'desk'), { groupRoot: serviceActions });

      const maintenanceButton = document.createElement('button');
      maintenanceButton.className = 'button button-utility';
      maintenanceButton.textContent = 'Send Maint.';
      maintenanceButton.title = 'Send maintenance for locks, water, and power complaints.';
      maintenanceButton.disabled = !hasPendingRequest;
      bindAtomicActionButton(maintenanceButton, () => onRoomServiceAction(room.id, 'maintenance'), { groupRoot: serviceActions });

      const securityButton = document.createElement('button');
      securityButton.className = 'button button-warning';
      securityButton.textContent = securityLabel;
      securityButton.title = hasPendingRequest
        ? 'Best for door-side tension and disturbance calls, but socially risky.'
        : 'Mark the room for extra watch. Useful rarely, invasive when overused.';
      bindAtomicActionButton(securityButton, () => onRoomServiceAction(room.id, 'security'), { groupRoot: serviceActions });

      const runnerButton = document.createElement('button');
      runnerButton.className = 'button button-secondary';
      runnerButton.textContent = 'Send Runner';
      runnerButton.title = 'Light service response for complaints and room-calming support.';
      runnerButton.disabled = !hasPendingRequest;
      bindAtomicActionButton(runnerButton, () => onRoomServiceAction(room.id, 'runner'), { groupRoot: serviceActions });

      const ignoreButton = document.createElement('button');
      ignoreButton.className = 'button button-danger';
      ignoreButton.textContent = ignoreLabel;
      ignoreButton.title = hasPendingRequest
        ? 'Delay or ignore the call. Fast, but often dangerous.'
        : 'Deliberately leave a quiet room alone instead of escalating it.';
      bindAtomicActionButton(ignoreButton, () => onRoomServiceAction(room.id, 'ignore'), { groupRoot: serviceActions });

      const reassignButton = document.createElement('button');
      reassignButton.className = 'button button-warning';
      reassignButton.textContent = 'Reassign Room';
      reassignButton.title = 'Move the guest to a cleaner vacant room when pressure or complaints justify it.';
      bindAtomicActionButton(reassignButton, () => onReassignRoomGuest(room.id), { groupRoot: serviceActions });

      serviceActions.appendChild(hallwayButton);
      serviceActions.appendChild(deskButton);
      serviceActions.appendChild(maintenanceButton);
      serviceActions.appendChild(securityButton);
      serviceActions.appendChild(runnerButton);
      serviceActions.appendChild(ignoreButton);
      serviceActions.appendChild(reassignButton);

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

export function renderSharedSpaces(state) {
  const grid = document.getElementById('shared-space-grid');
  if (!grid) return;
  grid.innerHTML = '';

  const _ssWeather = deriveWeatherState(state);
  const OUTDOOR_ZONE_IDS = [2, 6];
  const WEATHER_HINT_TEXT = {
    fog: { 2: 'Lot visibility reduced — head counts uncertain', 6: 'Rear exit obscured — movement harder to track' },
    cold: { 2: 'Cold snap — outdoor wait times shorter', 6: 'Rear access icy — entries may spike' },
    rain: { 2: 'Rain in lot — vehicle reads less reliable', 6: 'Rear exit wet — pattern disrupted' },
    storm: { 2: 'Storm conditions — lot is volatile', 6: 'Rear access hazardous — threat risk up' }
  };

  const spaces = Array.isArray(state?.sharedSpaces) ? state.sharedSpaces : [];
  spaces.forEach((space) => {
    const card = document.createElement('article');
    const emergencyPriority = Boolean(state?.emergencyNight?.active) && Number(space?.pressureScore || 0) >= 4;
    const linkedRoomCalls = (Array.isArray(state?.rooms) ? state.rooms : []).filter((room) => Number(room?.serviceState?.pendingRequest?.zoneHint || 0) === Number(space?.zoneId || 0)).length;
    const scannerHot = (Array.isArray(state?.localScannerFeed) ? state.localScannerFeed : []).some((entry) => {
      const text = String(entry?.text || '').toLowerCase();
      if (Number(space?.zoneId || 0) === 2) return /vehicle|lot|drop-off|pickup|waiting car/.test(text);
      if (Number(space?.zoneId || 0) === 4) return /utility|blackout|flicker|breaker/.test(text);
      if (Number(space?.zoneId || 0) === 6) return /rear access|rear exit|outside lane/.test(text);
      if (Number(space?.zoneId || 0) === 3) return /hallway|paired|movement|corridor/.test(text);
      return /desk|lobby|complaint|traveler/.test(text);
    });
    const systemNoise = Boolean(state?.systemOverride?.active) && scannerHot;
    const linkedScanner = linkedRoomCalls > 0 && scannerHot;
    const zoneNumeric = Number(space?.zoneId || 0);
    const isOutdoor = OUTDOOR_ZONE_IDS.includes(zoneNumeric);
    const weatherHintText = isOutdoor && _ssWeather.primary !== 'clear'
      ? (WEATHER_HINT_TEXT[_ssWeather.primary]?.[zoneNumeric] || null)
      : null;
    card.className = `room-card shared-space-card ${space?.severity === 'high' ? 'room-tone-hostile' : space?.severity === 'medium' ? 'room-tone-strained' : 'room-tone-steady'} ${emergencyPriority ? 'is-emergency-priority' : ''} ${systemNoise ? 'shared-space-system-noise' : ''} ${linkedScanner ? 'has-linked-scanner' : ''}`.trim();
    card.dataset.zoneId = String(space.zoneId || 0);
    card.innerHTML = `
      <div class="shared-space-zones">
        <div class="room-card-header shared-space-head">
          <h4>${space.label}</h4>
          <span class="room-condition-pill">${space.statusLine || 'Clear'}</span>
        </div>
        <div class="room-pressure-row">
          <span class="room-state-chip">Pressure ${space.pressureScore || 0}</span>
          <span class="room-state-chip">Stage ${space.issueStage || 0}</span>
          <span class="room-state-chip">Follow-up ${space.followupPressure || 0}</span>
          <span class="room-state-chip">Open ${space.unresolvedCount || 0}</span>
          ${linkedRoomCalls > 0 ? `<span class="room-state-chip">Room calls ${linkedRoomCalls}</span>` : ''}
          ${scannerHot ? '<span class="room-state-chip">Scanner</span>' : ''}
        </div>
        <p class="shared-space-headline">${space.activeIssue || 'No active issue'}</p>
        <p class="shared-space-why muted">${space.note || 'No extra zone read tonight.'}</p>
        <p class="shared-space-route-line muted">${getSharedSpaceRouteLabel(space.zoneId)}</p>
        ${(linkedRoomCalls > 0 || scannerHot)
          ? `<p class="shared-space-connection-line${linkedScanner ? ' is-linked-scanner' : ''}">${linkedRoomCalls > 0 ? `${linkedRoomCalls} room-call line${linkedRoomCalls === 1 ? '' : 's'}` : 'No room-call line'}${scannerHot ? ' · scanner agrees' : ''}</p>`
          : ''}
        ${emergencyPriority ? '<p class="room-service-note room-service-note-priority">Emergency priority zone.</p>' : ''}
        ${weatherHintText ? `<div class="v25-weather-context-hint is-${_ssWeather.primary}"><span class="v25-weather-context-hint-label">Weather</span><span class="v25-weather-context-hint-text">${weatherHintText}</span></div>` : ''}
        ${space?.modifiers?.length
          ? `<details class="shared-space-modifiers-drawer"><summary>Zone modifiers</summary><div class="shared-space-modifiers-body">${space.modifiers.join(' · ')}</div></details>`
          : ''}
        <div class="action-group shared-space-actions">
          <p class="action-group-label">Zone response</p>
          <div class="action-group-body room-service-row"></div>
        </div>
      </div>
    `;

    const spaceWhyEl = card.querySelector('.shared-space-why');
    const spaceRouteEl = card.querySelector('.shared-space-route-line');
    const spaceConnEl = card.querySelector('.shared-space-connection-line');
    const spaceModDrawer = card.querySelector('.shared-space-modifiers-drawer');
    const spaceZonesEl = card.querySelector('.shared-space-zones');
    const spaceActionGroup = card.querySelector('.shared-space-actions');
    if (spaceZonesEl && spaceActionGroup && (spaceWhyEl || spaceRouteEl || spaceConnEl || spaceModDrawer)) {
      const detailDrawer = document.createElement('details');
      detailDrawer.className = 'shared-space-detail-drawer';
      const detailSummary = document.createElement('summary');
      detailSummary.textContent = 'Zone detail & route';
      detailDrawer.appendChild(detailSummary);
      const detailBody = document.createElement('div');
      detailBody.className = 'shared-space-detail-body';
      detailDrawer.appendChild(detailBody);
      [spaceWhyEl, spaceRouteEl, spaceConnEl, spaceModDrawer].forEach((el) => {
        if (el) detailBody.appendChild(el);
      });
      spaceZonesEl.insertBefore(detailDrawer, spaceActionGroup);
    }

    const actions = card.querySelector('.room-service-row');
    const openButton = document.createElement('button');
    openButton.className = 'button button-primary';
    openButton.textContent = 'Open Feed';
    openButton.title = 'Open the camera-style response overlay for this shared space.';
    bindAtomicActionButton(openButton, () => state?.onOpenSharedSpace?.(space.zoneId), { groupRoot: actions });

    const quickButton = document.createElement('button');
    quickButton.className = 'button button-secondary';
    quickButton.textContent = space.quickActionLabel || 'Act';
    quickButton.title = 'Use the zone’s fast shared-space action.';
    bindAtomicActionButton(quickButton, () => state?.onSharedSpaceQuickAction?.(space.zoneId, space.quickActionId), { groupRoot: actions });

    const controlButton = document.createElement('button');
    controlButton.className = 'button button-warning';
    controlButton.textContent = space.controlActionLabel || 'Control';
    controlButton.title = 'Apply a stronger containment action to this zone.';
    bindAtomicActionButton(controlButton, () => state?.onSharedSpaceQuickAction?.(space.zoneId, space.controlActionId), { groupRoot: actions });

    const delayButton = document.createElement('button');
    delayButton.className = 'button button-danger';
    delayButton.textContent = space.delayLabel || 'Delay';
    delayButton.title = 'Leave the space alone for now. Faster, but often increases spread pressure.';
    bindAtomicActionButton(delayButton, () => state?.onSharedSpaceDelay?.(space.zoneId), { groupRoot: actions });

    actions.appendChild(openButton);
    actions.appendChild(quickButton);
    actions.appendChild(controlButton);
    actions.appendChild(delayButton);
    grid.appendChild(card);
  });
}

function getCameraStatusClass(status) {
  return `camera-status-${status.toLowerCase().replace(/\s+/g, '-')}`;
}

export function renderCameras(state) {
  const grid = document.getElementById('camera-grid');
  grid.innerHTML = '';
  grid.classList.remove('camera-grid-glitch-light', 'camera-grid-glitch-heavy', 'camera-grid-scanline',
    'weather-clear', 'weather-fog', 'weather-cold', 'weather-rain', 'weather-storm');
  const cameraInterference = Number(state?.cameraInterferenceLevel || 0);
  if (cameraInterference >= 1) grid.classList.add('camera-grid-scanline');
  if (cameraInterference >= 2) grid.classList.add('camera-grid-glitch-light');
  if (cameraInterference >= 3) grid.classList.add('camera-grid-glitch-heavy');
  const _camWeather = deriveWeatherState(state);
  grid.classList.add(`weather-${_camWeather.primary}`);

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

    const isBlind = Boolean(camera.blindMode);
    const blindMode = camera.blindMode || null;
    const blindCooldown = Number(camera.blindCooldown || 0);
    const blindLabel = blindMode === 'sabotage' ? 'SABOTAGED' : blindMode === 'blackout' ? ('BLACKOUT ' + (blindCooldown > 0 ? blindCooldown + ' left' : '')) : null;

    const camStatusNorm = isBlind
      ? (blindMode || 'blackout')
      : (camera.status || 'clear').toLowerCase().replace(/\s+/g, '-');

    const getCameraPreviewText = () => {
      if (isBlind) return blindMode === 'sabotage' ? 'SABOTAGED' : 'BLACKOUT';
      const s = camStatusNorm;
      if (s === 'clear') return 'LIVE';
      if (s.includes('motion')) return 'MOTION';
      if (s.includes('blocked')) return 'BLOCKED';
      if (s.includes('static')) return 'STATIC';
      if (s.includes('signal')) return 'NO SIGNAL';
      if (s.includes('loop')) return 'LOOP';
      if (s.includes('door')) return 'DOOR AJAR';
      if (s.includes('false') || s.includes('calm')) return 'SUSPICIOUS';
      return String(camera.status || '').toUpperCase().slice(0, 14);
    };
    const cameraPreviewText = getCameraPreviewText();

    const getAnomalyChipLabel = () => {
      if (isBlind) return blindMode === 'sabotage' ? 'Sabotage' : 'Blackout';
      const s = camStatusNorm;
      if (s === 'clear') return null;
      if (s.includes('motion')) return 'Motion';
      if (s.includes('blocked')) return 'Blocked';
      if (s.includes('static')) return 'Static';
      if (s.includes('signal')) return 'Signal Lost';
      if (s.includes('loop')) return 'Looping Feed';
      if (s.includes('door')) return 'Door Ajar';
      if (s.includes('false') || s.includes('calm')) return 'False Calm';
      return null;
    };
    const anomalyChipLabel = getAnomalyChipLabel();

    const card = document.createElement('article');
    card.className = `camera-card ${getCameraStatusClass(camera.status)} ${actionable ? 'is-actionable' : ''} ${isBlind ? 'camera-card-blind' : ''} ${cameraInterference >= 2 ? 'camera-card-glitch' : ''} ${cameraInterference >= 3 ? 'camera-card-flicker' : ''} ${camera.contaminationMark ? 'v30-cam-contaminated' : ''}`.trim();
    card.dataset.camStatus = camStatusNorm;
    const sabotageType = camera.sabotageType || null;
    if (sabotageType) card.dataset.sabotageType = sabotageType;
    const sabotageTypeChipHtml = (() => {
      if (!isBlind || !sabotageType) return '';
      const STYPE_LABELS = { 'feed-loop': 'Loop', 'planted-calm': 'Planted Calm', 'delayed-frame': 'Delayed', 'blind-zone': 'Blind Zone' };
      const label = STYPE_LABELS[sabotageType] || 'Compromised';
      return `<span class="camera-sabotage-type-chip type-${sabotageType}">${label}</span>`;
    })();
    const statusClass = isBlind ? 'is-alert' : camera.status === 'Clear' ? 'is-clear' : 'is-alert';
    const displayStatus = blindLabel || camera.status;
    card.innerHTML = `
      <div class="camera-preview ${isBlind ? 'camera-preview-blind' : ''}" data-preview-text="${cameraPreviewText}"></div>
      <h4>${camera.name}</h4>
      <p class="camera-meta">Status: <span class="camera-status-badge ${statusClass}">${displayStatus}</span>${anomalyChipLabel ? `<span class="camera-anomaly-chip">${anomalyChipLabel}</span>` : ''}${sabotageTypeChipHtml}</p>
      <p class="camera-meta">Zone: ${zoneStatusText} • ${containmentText}</p>
      ${camera.contaminationMark ? '<p class="v30-cam-taint-line">◈ Area interference — sealed corridor</p>' : ''}
      ${isBlind ? '<p class="camera-alert-line">Feed offline. Zone dark.</p>' : (actionable ? '<p class="camera-alert-line">Anomaly requires response.</p>' : '')}
    `;

    if (isBlind && typeof state.onRepairBlindCamera === 'function') {
      const repairBtn = document.createElement('button');
      repairBtn.className = 'button button-warning camera-investigate-btn';
      repairBtn.textContent = blindMode === 'blackout' ? 'Restore Early (−8 power)' : 'Repair Camera (−8 power)';
      repairBtn.title = 'Restore this camera feed. Costs 8% power.';
      repairBtn.addEventListener('click', (event) => {
        event.stopPropagation();
        state.onRepairBlindCamera(camera.id);
      });
      card.appendChild(repairBtn);
    } else if (!isBlind && actionable) {
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

    if (!isBlind && !actionable && typeof state.onTriggerZoneBlackout === 'function') {
      const blackoutBtn = document.createElement('button');
      blackoutBtn.className = 'button button-secondary camera-investigate-btn';
      blackoutBtn.textContent = 'Zone Blackout';
      blackoutBtn.title = 'Cut power to this zone (tactical). Camera goes dark for ~3 turns. Reduces hostile pressure.';
      blackoutBtn.addEventListener('click', (event) => {
        event.stopPropagation();
        state.onTriggerZoneBlackout(camera.id);
      });
      card.appendChild(blackoutBtn);
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
    <div class="camera-scene-panel camera-scene-tone-${String(scene.severity || 'low').toLowerCase()} ${Number(state?.cameraInterferenceLevel || 0) >= 2 ? 'camera-scene-glitch' : ''} ${state?.blackoutState?.level === 'full' ? 'camera-scene-blackout' : ''}" role="dialog" aria-modal="true" aria-label="Camera incident scene">
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

function buildReportPriorityStrip(state) {
  const rooms = Array.isArray(state?.rooms) ? state.rooms : [];
  const cameras = Array.isArray(state?.cameras) ? state.cameras : [];
  const spaces = Array.isArray(state?.sharedSpaces) ? state.sharedSpaces : [];

  const hostileRooms = rooms.filter((r) => r.occupied && r.condition === 'Hostile').length;
  const tenseRooms   = rooms.filter((r) => r.occupied && r.condition === 'Tense').length;
  const pendingCalls = rooms.filter((r) => r.occupied && Boolean(r?.serviceState?.pendingRequest)).length;
  const unresolvedCams = cameras.filter((cam) => {
    const ev = (state.activeEvents || []).find((e) => String(e?.cameraId) === String(cam.id));
    return Boolean(ev && !state?.cameraScene?.resolvedZones?.[cam.id]);
  }).length;
  const hotZones = spaces.filter((s) => s.severity === 'high').length;
  const powerCritical = Number(state?.power ?? 100) <= 30;

  const hasIssues = hostileRooms > 0 || unresolvedCams > 0 || hotZones > 0 || powerCritical || tenseRooms >= 2 || pendingCalls >= 2;

  const strip = document.createElement('div');
  strip.className = `report-priority-strip ${hasIssues ? '' : 'is-all-clear'}`.trim();

  const titleEl = document.createElement('div');
  titleEl.className = 'report-priority-title';
  titleEl.textContent = hasIssues ? 'What Needs Attention' : 'Shift Status: Under Control';
  strip.appendChild(titleEl);

  const chips = document.createElement('div');
  chips.className = 'report-priority-chips';

  const addChip = (text, cls) => {
    const chip = document.createElement('span');
    chip.className = `report-priority-chip report-priority-chip-${cls}`;
    chip.textContent = text;
    chips.appendChild(chip);
  };

  if (!hasIssues) {
    addChip('No critical threats', 'ok');
    if (tenseRooms > 0) addChip(`${tenseRooms} tense room${tenseRooms > 1 ? 's' : ''} — monitor`, 'info');
  } else {
    if (hostileRooms > 0) addChip(`${hostileRooms} hostile room${hostileRooms > 1 ? 's' : ''}`, 'danger');
    if (tenseRooms > 0)   addChip(`${tenseRooms} tense room${tenseRooms > 1 ? 's' : ''}`, 'warning');
    if (pendingCalls > 0) addChip(`${pendingCalls} room call${pendingCalls > 1 ? 's' : ''} pending`, 'warning');
    if (unresolvedCams > 0) addChip(`${unresolvedCams} camera alert${unresolvedCams > 1 ? 's' : ''}`, 'warning');
    if (hotZones > 0)     addChip(`${hotZones} hot zone${hotZones > 1 ? 's' : ''}`, 'danger');
    if (powerCritical)    addChip(`Power critical (${state.power}%)`, 'danger');
  }

  strip.appendChild(chips);
  return strip;
}

function buildLogItem(entry) {
  const classifyTone = (line = '') => {
    const v = String(line).toLowerCase();
    if (/(failed|collapse|critical|blackout|evict|danger|breach|slipping|sabotage|hostile.*escalat)/.test(v)) return 'danger';
    if (/(warning|low|flagged|blocked|unstable|risk|pressure|incident)/.test(v)) return 'warning';
    if (/(success|stabilized|restored|owned|resolved|complete|back online|secured)/.test(v)) return 'success';
    return 'info';
  };
  const tone = classifyTone(entry.text);
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
  return item;
}

export function renderLogs(state) {
  const list = document.getElementById('incident-log');
  list.innerHTML = '';
  list.className = 'log-list log-list-v20 log-list-v24';

  list.appendChild(buildReportPriorityStrip(state));

  if (!state.logs.length) {
    const empty = document.createElement('div');
    empty.className = 'log-item';
    empty.textContent = 'No incidents yet.';
    list.appendChild(empty);
    return;
  }

  const categorizeEntry = (line = '') => {
    const v = String(line).toLowerCase();
    if (/(failed|collapse|critical|evict|breach|slipping|raid|sabotage|override.*active|system.*compromised)/.test(v)) return 'key';
    if (/(success|stabilized|resolved|restored|secured|back online|complete)/.test(v)) return 'success';
    if (/(unknown caller|caller contact|anonymous contact|burner|radio intercept|interception|partial intercept)/.test(v)) return 'caller';
    if (/(camera|feed|monitor|anomaly|signal.*lost|motion.*detect|blind|surveillance|cam\b|feed loop|planted calm|delayed frame|blind zone)/.test(v)) return 'camera';
    if (/(room \d|guest.*room|occupant|lockdown|evict|service.*call|hallway check|maintenance sent|security sent)/.test(v)) return 'room';
    if (/(lobby|hallway|parking|utility|rear exit|shared space|zone.*pressure|spill)/.test(v)) return 'zone';
    if (/(power|electric|blackout|generator|restore|reroute|emergency power|outage)/.test(v)) return 'power';
    if (/(\[highway radio\]|\[midnight dj\]|highway companion|route 9|roadside|night shift.*dj|broadcasting from)/.test(v)) return 'radio';
    if (/(\[police\]|\[town\]|officer [a-z]+.*visit|bagman|town.*suspicion|corrupt.*law|police.*payoff|false.*police|informant.*record|town.*saw|bought.*law)/.test(v)) return 'town';
    if (/(room 9|sealed corridor|sealed room|contamination|owner.*authorization|owner.*protected|owner.*override|do not enter|heat.*sensor.*corridor|housekeeping.*sealed|maintenance.*room.*scratched|rear.*sealed|feed.*flicker.*sealed|key.*room.*(no|not).*registered|prior shift.*do not)/.test(v)) return 'contamination';
    if (/(staff.*refused|mutiny|inside.*job|inside.*leak|compromised.*staff|staff.*falsif|dispatch.*inconsistency|internal.*irregularity|staff walkout|forced back.*work|staff.*bonus|dismissed.*shift|log entry.*crossed|repair ticket exceeded|dispatch timing.*slow|zone clear.*camera|filed as resolved.*room pressure)/.test(v)) return 'staff';
    if (/(off-book|unlogged stay|hidden payment|walk-in|dead drop|vending drop|hunters.*desk|hunters arrived|sheltered|shadow reputation|dirty cash|off-book stay|torn ledger|stained cash|hidden guest)/.test(v)) return 'dirty';
    if (/(suspicious|forged|planted|fake|illegal|contraband|dirty|mismatch|forgery|flagged.*guest)/.test(v)) return 'suspicious';
    return 'archive';
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
      grouped.push({ text: normalized, count: 1, category: categorizeEntry(normalized) });
    }
  });

  const SECTIONS = [
    { key: 'key',        title: 'Key Events Tonight',         limit: 6,        collapsed: false },
    { key: 'success',    title: 'Resolved & Secured',         limit: 4,        collapsed: false },
    { key: 'caller',     title: 'Caller & Intercept',         limit: 4,        collapsed: false },
    { key: 'room',       title: 'Room Incidents',             limit: 5,        collapsed: false },
    { key: 'camera',     title: 'Camera & Surveillance',      limit: 5,        collapsed: false },
    { key: 'zone',       title: 'Shared Space Escalations',   limit: 4,        collapsed: false },
    { key: 'power',      title: 'Power & Emergency',          limit: 4,        collapsed: false },
    { key: 'suspicious', title: 'Suspicious Activity',        limit: 6,        collapsed: false },
    { key: 'contamination', title: 'Room 9 / Protected Space',  limit: 5,        collapsed: false },
    { key: 'staff',      title: 'Staff & Internal Activity',   limit: 5,        collapsed: false },
    { key: 'dirty',      title: 'Off-Book Activity',          limit: 5,        collapsed: false },
    { key: 'radio',      title: 'Highway Radio',              limit: 3,        collapsed: false },
    { key: 'town',       title: 'Town & Local Pressure',      limit: 5,        collapsed: false },
    { key: 'archive',    title: 'Full Night Log',             limit: Infinity, collapsed: true  }
  ];

  SECTIONS.forEach(({ key, title, limit, collapsed }) => {
    const items = grouped.filter((e) => e.category === key);
    if (!items.length) return;

    const section = document.createElement('div');
    section.className = `report-section report-section-${key}`;
    section.dataset.section = key;

    const header = document.createElement('div');
    header.className = 'report-section-header';
    header.innerHTML = `<span class="report-section-title">${title}</span><span class="report-section-count">${items.length}</span>`;
    section.appendChild(header);

    const toShow = collapsed ? [] : items.slice(0, limit);
    const overflow = collapsed ? items : items.slice(limit);

    toShow.forEach((entry) => section.appendChild(buildLogItem(entry)));

    if (overflow.length > 0 || (collapsed && items.length > 0)) {
      const drawer = document.createElement('details');
      drawer.className = 'report-archive-drawer';
      const summary = document.createElement('summary');
      summary.textContent = collapsed
        ? `Show all ${items.length} entries`
        : `${overflow.length} more`;
      drawer.appendChild(summary);
      (collapsed ? items : overflow).forEach((entry) => drawer.appendChild(buildLogItem(entry)));
      section.appendChild(drawer);
    }

    list.appendChild(section);
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
  const retryBtn = document.getElementById('restart-night-btn');
  if (retryBtn) {
    retryBtn.title = 'Restore the exact frozen opening state of the current night.';
  }
  const restartCampaignBtn = document.getElementById('restart-campaign-btn');
  if (restartCampaignBtn) {
    restartCampaignBtn.title = 'Start a full new campaign from Night 1.';
  }
}

function getSummaryGradeClass(grade = 'C') {
  return `summary-grade-${String(grade).toLowerCase()}`;
}

function getSummaryBreakdownLineClass(line = '') {
  const s = String(line);
  if (/^What went right/i.test(s)) return 'aar-line aar-line-good';
  if (/^What hurt/i.test(s)) return 'aar-line aar-line-bad';
  if (/^Dominant pressure/i.test(s)) return 'aar-line aar-line-pressure';
  if (/^Dawn read/i.test(s)) return 'aar-line aar-line-dawn';
  return 'aar-line';
}

export function renderSummary(summary, state, outcomeFlavor = null) {
  const summaryCard = document.querySelector('#summary-screen .hero-card');
  if (summaryCard) {
    summaryCard.classList.add('summary-polish-card', 'summary-hero-v20');
  }
  document.getElementById('summary-title').textContent = summary.title;
  document.getElementById('summary-text').textContent = summary.text;

  const scenarioLabel = document.getElementById('summary-scenario-label');
  const campaignProgressLabel = document.getElementById('summary-campaign-progress');
  const runSetupLabel = document.getElementById('summary-run-setup');
  const runBonusLabel = document.getElementById('summary-run-reward-bonus');
  if (scenarioLabel) {
    const label = state?.signatureNight?.active
      ? `${state.signatureNight.title}`
      : outcomeFlavor?.scenarioLabel || state?.activeScenario?.label || 'Unknown Shift';
    scenarioLabel.textContent = `Scenario: ${label}`;
  }
  if (campaignProgressLabel) {
    const moodLine = Array.isArray(state?.summaryIdentityLines) ? state.summaryIdentityLines[0] : '';
    campaignProgressLabel.textContent = [state?.campaignProgress?.completedLabel || '', moodLine].filter(Boolean).join(' • ');
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
      item.className = getSummaryBreakdownLineClass(line);
      breakdown.appendChild(item);
    });

    const snapshot = state?.shiftPressureSnapshot || null;
    if (snapshot) {
      const positiveLine = Array.isArray(snapshot.positives) ? snapshot.positives.slice(0, 2).join(' • ') : '';
      const negativeLine = Array.isArray(snapshot.negatives) ? snapshot.negatives.slice(0, 2).join(' • ') : '';

      if (positiveLine) {
        const item = document.createElement('li');
        const text = `What went right: ${positiveLine}`;
        item.textContent = text;
        item.className = getSummaryBreakdownLineClass(text);
        breakdown.appendChild(item);
      }
      if (negativeLine) {
        const item = document.createElement('li');
        const text = `What hurt most: ${negativeLine}`;
        item.textContent = text;
        item.className = getSummaryBreakdownLineClass(text);
        breakdown.appendChild(item);
      }
      if (snapshot?.dominantPressureTag) {
        const item = document.createElement('li');
        const text = `Dominant pressure: ${snapshot.dominantPressureTag}`;
        item.textContent = text;
        item.className = getSummaryBreakdownLineClass(text);
        breakdown.appendChild(item);
      }
      if (state?.lastSummary?.branchOutcome) {
        const item = document.createElement('li');
        const text = `Dawn read: ${state.lastSummary.branchOutcome}`;
        item.textContent = text;
        item.className = getSummaryBreakdownLineClass(text);
        breakdown.appendChild(item);
      }
    }
  }

  const summaryWeatherSlot = document.getElementById('summary-weather-condition');
  if (summaryWeatherSlot) {
    const sw = deriveWeatherState(state);
    const sc = deriveMotelCondition(state);
    const weatherLabels = { clear: 'Clear', fog: 'Fog', cold: 'Cold', rain: 'Rain', storm: 'Storm' };
    const weatherLabel = weatherLabels[sw.primary] || sw.primary;
    const weatherNote = sw.primary === 'clear'
      ? 'Conditions were clear tonight.'
      : `Shift ran under <span class="highlight-weather">${weatherLabel}</span> conditions — ${sw.effects[0]?.text || 'weather impacted operations'}.`;
    const condNote = sc.overall === 'upgraded' || sc.overall === 'maintained'
      ? `Motel held <span class="highlight-ok">${sc.overall}</span> condition through the shift.`
      : `Motel ended the shift <span class="highlight-${sc.overall === 'deteriorating' ? 'danger' : 'warn'}">${sc.overall}</span> — address before next night.`;
    summaryWeatherSlot.innerHTML =
      `<div class="v25-summary-weather-section">
        <div class="v25-summary-weather-header">Conditions & State</div>
        <div class="v25-summary-weather-body">${weatherNote} ${condNote}</div>
        <div class="v25-summary-condition-row">
          <span class="v25-summary-condition-label">Motel</span>
          <span class="mcb-condition-chip is-${sc.overall}">${sc.overall.charAt(0).toUpperCase() + sc.overall.slice(1)}</span>
        </div>
      </div>`;
  }

  if (threadFlavor) {
    threadFlavor.className = 'summary-thread-flavor summary-thread-v20';
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
    campaignFlavor.className = 'summary-thread-flavor summary-campaign-flavor summary-thread-v20';
    campaignFlavor.innerHTML = '';
    const lines = Array.isArray(state?.campaignSummaryNotes) ? state.campaignSummaryNotes : [];
    lines.slice(0, 3).forEach((line) => {
      const item = document.createElement('li');
      item.textContent = line;
      campaignFlavor.appendChild(item);
    });
  }

  if (identityFlavor) {
    identityFlavor.className = 'summary-thread-flavor summary-identity-flavor summary-thread-v20';
    identityFlavor.innerHTML = '';
    const lines = Array.isArray(state?.summaryIdentityLines) ? state.summaryIdentityLines : [];
    lines.slice(0, 4).forEach((line) => {
      const item = document.createElement('li');
      item.textContent = line;
      identityFlavor.appendChild(item);
    });
  }

  if (branchFlavor) {
    branchFlavor.className = 'summary-thread-flavor summary-branch-flavor summary-thread-v20';
    branchFlavor.innerHTML = '';
    const lines = [
      ...(state?.signatureNight?.active && state?.signatureNight?.namedThread
        ? [`Named thread: ${state.signatureNight.namedThread}${state?.signatureNight?.branchOutcome ? ` • ${state.signatureNight.branchOutcome}` : ''}`]
        : []),
      ...(Array.isArray(state?.summaryBranchNotes) ? state.summaryBranchNotes : [])
    ];
    lines.slice(0, 3).forEach((line) => {
      const item = document.createElement('li');
      item.textContent = line;
      branchFlavor.appendChild(item);
    });
  }

  const objectiveContainer = document.getElementById('summary-objective-list');
  renderObjectiveList(objectiveContainer, evaluateNightObjectives(state));

  // v0.28 dirty summary
  const summaryDirtySlot = document.getElementById('summary-dirty-section');
  if (summaryDirtySlot) {
    const dls = state?.dirtyLedgerSummary || {};
    if (dls.hasDirty) {
      const rows = [
        dls.totalDirtyMoney > 0 ? `+$${dls.totalDirtyMoney} in off-book cash this shift` : '',
        dls.offBookStays > 0    ? `${dls.offBookStays} off-book stay${dls.offBookStays !== 1 ? 's' : ''} accepted` : '',
        dls.deadDrops > 0       ? `${dls.deadDrops} dead drop${dls.deadDrops !== 1 ? 's' : ''} completed` : '',
        dls.shadowRep !== 0     ? `Shadow reputation: ${dls.shadowRep > 0 ? '+' : ''}${dls.shadowRep}` : ''
      ].filter(Boolean);
      summaryDirtySlot.innerHTML = `<div class="v28-summary-dirty-section">
        <div class="v28-summary-dirty-header">Off-Book Activity</div>
        <div class="v28-summary-dirty-rows">${rows.map((r) =>
          `<div class="v28-summary-dirty-row"><span class="v28-summary-dirty-dot"></span><span>${r}</span></div>`
        ).join('')}</div>
      </div>`;
    } else {
      summaryDirtySlot.innerHTML = '';
    }
  }

  // v0.30 Room 9 summary
  const summaryRoom9Slot = document.getElementById('summary-room9-section');
  if (summaryRoom9Slot) {
    const r9i = state?.room9Intel || {};
    summaryRoom9Slot.innerHTML = r9i.active && (r9i.contaminationCount > 0 || r9i.pressureLevel > 0 || r9i.evidenceFoundCount > 0)
      ? buildRoom9SummaryHtml(r9i)
      : '';
  }

  // v0.29 staff intel summary
  const summaryStaffSlot = document.getElementById('summary-staff-section');
  if (summaryStaffSlot) {
    const si = state?.staffIntelSummary || {};
    if (si.hasIntel || si.suspectCount > 0 || si.mutinyFired || si.hasDismissed) {
      const rows = [];
      if (si.compromisedId) rows.push({ label: `Compromised staff identified (${si.compromisedId})`, cls: 'is-compromised' });
      if (si.mutinyFired) rows.push({ label: 'Staff mutiny occurred this run', cls: 'is-compromised' });
      if (si.hasDismissed) rows.push({ label: 'Suspected staff dismissed', cls: 'is-ok' });
      if (si.suspectCount > 0) rows.push({ label: `${si.suspectCount} staff member${si.suspectCount !== 1 ? 's' : ''} flagged with inconsistencies`, cls: '' });
      const moraleLabel = si.avgMorale < 0.30 ? 'Critical' : si.avgMorale < 0.45 ? 'Low' : si.avgMorale < 0.65 ? 'Moderate' : 'Stable';
      rows.push({ label: `Average staff morale: ${moraleLabel} (${Math.round(si.avgMorale * 100)}%)`, cls: si.avgMorale < 0.30 ? 'is-compromised' : '' });
      summaryStaffSlot.innerHTML = `<div class="v29-summary-staff-section">
        <div class="v29-summary-staff-header">Staff & Internal State</div>
        ${rows.map(r => `<div class="v29-summary-staff-row"><span class="v29-summary-staff-dot${r.cls ? ' ' + r.cls : ''}"></span><span>${r.label}</span></div>`).join('')}
      </div>`;
    } else {
      summaryStaffSlot.innerHTML = '';
    }
  }

  // v0.31 town summary
  const summaryTownSlot = document.getElementById('summary-town-section');
  if (summaryTownSlot) {
    const tp = state?.townPressureSummary || {};
    if (tp.active && (tp.townSuspicion > 0 || tp.corruption > 0 || tp.bagmanFired || tp.headlineCount > 0)) {
      const rows = [];
      if (tp.bagmanFired) rows.push({ label: `Officer ${tp.bagmanName} made contact — unofficial visit`, cls: tp.bagmanPayoffs > 0 ? 'is-corrupt' : '' });
      if (tp.bagmanPayoffs > 0) rows.push({ label: `${tp.bagmanPayoffs} payoff${tp.bagmanPayoffs !== 1 ? 's' : ''} accepted`, cls: 'is-corrupt' });
      if (tp.policeCompromised) rows.push({ label: 'Local law enforcement arrangement active', cls: 'is-corrupt' });
      if (tp.townSuspicion > 0) rows.push({ label: `Town heat: ${tp.townSuspicion}/10`, cls: tp.townSuspicion >= 6 ? 'is-corrupt' : '' });
      if (tp.headlineCount > 0 && tp.lastHeadline) rows.push({ label: `Press coverage: ${tp.lastHeadline.headline}`, cls: '' });
      summaryTownSlot.innerHTML = `<div class="v31-summary-town-section">
        <div class="v31-summary-town-header">Town & Outside Pressure</div>
        ${rows.map(r => `<div class="v31-summary-town-row"><span class="v31-summary-town-dot${r.cls ? ' ' + r.cls : ''}"></span><span>${r.label}</span></div>`).join('')}
      </div>`;
    } else {
      summaryTownSlot.innerHTML = '';
    }
  }

  // v0.27 evidence section in summary
  const summaryEvidenceSlot = document.getElementById('summary-evidence-section');
  if (summaryEvidenceSlot) {
    const locker = state?.evidenceLockerSummary || state?.evidenceLocker || {};
    const items = Array.isArray(locker.items) ? locker.items : [];
    const nemesis = state?.nemesis || {};
    if (items.length > 0 || nemesis.active || nemesis.resolvedOutcome) {
      const recentItems = items.slice(-5);
      const rowsHtml = recentItems.map((item) => {
        const cat = String(item.category || 'other');
        return `<div class="v27-summary-evidence-row">
          <span class="v27-summary-evidence-dot category-${cat}"></span>
          <span>${item.label || 'Evidence'} — Night ${item.night || '?'}</span>
        </div>`;
      }).join('');
      const mysteryReveal = locker.mysteryFragmentsFound >= 6
        ? `<div class="v27-summary-mystery-reveal">Previous Manager Mystery resolved — all fragments recovered.</div>`
        : locker.mysteryFragmentsFound > 0
          ? `<div class="v27-summary-mystery-reveal">${locker.mysteryFragmentsFound} / 6 previous manager fragments recovered.</div>`
          : '';
      const nemesisHtml = buildNemesisAlertHtml(nemesis);
      summaryEvidenceSlot.innerHTML = `<div class="v27-summary-evidence-section">
        <div class="v27-summary-evidence-header">Evidence &amp; Surveillance</div>
        ${nemesisHtml}
        ${rowsHtml ? `<div class="v27-summary-evidence-list">${rowsHtml}</div>` : ''}
        ${mysteryReveal}
      </div>`;
    } else {
      summaryEvidenceSlot.innerHTML = '';
    }
  }
}

function buildDirtyLedgerHtml(summary = {}) {
  if (!summary.hasDirty) return '';
  const rows = [
    summary.totalDirtyMoney > 0 ? { label: 'Dirty cash earned', value: `$${summary.totalDirtyMoney}` } : null,
    summary.offBookStays > 0    ? { label: 'Off-book stays',     value: summary.offBookStays }           : null,
    summary.deadDrops > 0       ? { label: 'Dead drops',         value: summary.deadDrops }              : null,
    summary.favorsAccepted > 0  ? { label: 'Favors accepted',    value: summary.favorsAccepted }         : null
  ].filter(Boolean);

  const shadowHtml = buildShadowRepHtml(summary.shadowRep);
  const rowsHtml = rows.map((r) =>
    `<div class="v28-dirty-ledger-row"><span class="v28-dlr-label">${r.label}</span><span class="v28-dlr-value">${r.value}</span></div>`
  ).join('');

  return `<div class="v28-dirty-ledger">
    <div class="v28-dirty-ledger-header">
      <span class="v28-dirty-ledger-title">Dirty Ledger</span>
      <span class="v28-dirty-count-chip">${summary.actions}</span>
    </div>
    <div class="v28-dirty-ledger-rows">${rowsHtml || '<span class="v28-dirty-ledger-empty">No dirty actions this shift.</span>'}</div>
    ${shadowHtml}
  </div>`;
}

function buildShadowRepHtml(rep = 0) {
  if (rep === 0) return '';
  const pct = Math.round((Math.abs(rep) / 10) * 50);
  const polarity = rep > 0 ? 'positive' : 'negative';
  const label = rep >= 5 ? 'Network Trusted' : rep >= 2 ? 'Known' : rep <= -5 ? 'Marked' : 'Mistrusted';
  const note = rep > 0
    ? 'Off-book activity has earned quiet recognition in dangerous networks.'
    : 'A betrayal is on record. Dangerous contacts are more aggressive.';
  const fillStyle = polarity === 'positive'
    ? `style="width:${pct}%; left:50%"`
    : `style="width:${pct}%; right:50%; left:auto"`;
  return `<div class="v28-shadow-rep-strip">
    <div class="v28-shadow-rep-header">
      <span class="v28-shadow-rep-title">Shadow Reputation</span>
      <span class="v28-shadow-rep-level is-${polarity}">${rep > 0 ? '+' : ''}${rep} — ${label}</span>
    </div>
    <div class="v28-shadow-rep-track"><div class="v28-shadow-rep-fill is-${polarity}" ${fillStyle}></div></div>
    <p class="v28-shadow-rep-note">${note}</p>
  </div>`;
}

function buildStaffParanoiaHtml(paranoia = {}, callbacks = {}) {
  if (!paranoia || !Array.isArray(paranoia.members) || paranoia.members.length === 0) return '';
  const moodClass = paranoia.moodClass || 'stable';
  const moodLabel = paranoia.moodLabel || 'Stable';
  const chipClass = moodClass === 'critical' || moodClass === 'tense' ? 'is-suspect' : moodClass === 'strained' ? 'is-strained' : 'is-reliable';

  const rows = paranoia.members.map((m) => {
    const relClass = m.reliability === 'suspect' ? 'is-suspect' : m.reliability === 'strained' ? 'is-strained' : 'is-reliable';
    const relLabel = m.reliability === 'suspect' ? 'SUSPECT' : m.reliability === 'strained' ? 'Strained' : 'Reliable';
    const moraleW = Math.round(Number(m.morale || 0) * 100);
    const fearW    = Math.round(Number(m.fear || 0) * 100);
    const suspMarker = m.suspicionScore >= 3
      ? `<span class="v29-suspicion-marker">⚠ ${m.suspicionScore} flags</span>`
      : '';
    return `<div class="v29-staff-row">
      <span class="v29-staff-name">${m.name}</span>
      <span class="v29-staff-role">${m.role}</span>
      <div class="v29-staff-gauges">
        <span class="v29-gauge-label">MOR</span>
        <div class="v29-gauge-track"><div class="v29-gauge-fill is-morale" style="width:${moraleW}%"></div></div>
        <span class="v29-gauge-label">FEAR</span>
        <div class="v29-gauge-track"><div class="v29-gauge-fill is-fear" style="width:${fearW}%"></div></div>
      </div>
      <span class="v29-reliability-chip ${relClass}">${relLabel}</span>
      ${suspMarker}
    </div>`;
  }).join('');

  const warningHtml = paranoia.hasSuspect
    ? `<div class="v29-paranoia-warning">One or more staff members show repeated inconsistencies. Dismiss or confront before conditions worsen.</div>`
    : '';

  const hasSuspectMember = paranoia.members.some(m => m.suspicionScore >= 3 && m.active !== false);
  const actionsHtml = `<div class="v29-staff-actions">
    <button class="v29-staff-action-btn is-bonus" data-action="pay-staff-bonus">Pay Bonus ($20)</button>
    ${hasSuspectMember ? `<button class="v29-staff-action-btn is-dismiss" data-action="dismiss-staff">Dismiss Suspect ($30)</button>` : ''}
  </div>`;

  return `<div class="v29-staff-paranoia">
    <div class="v29-staff-paranoia-header">
      <span class="v29-staff-paranoia-title">Staff Reliability</span>
      <span class="v29-staff-paranoia-chip ${chipClass}">${moodLabel}</span>
    </div>
    ${rows}
    ${warningHtml}
    ${actionsHtml}
  </div>`;
}

function buildProtectedRoomHtml(model = {}) {
  if (!model || !model.active) return '';
  const levelDots = Array.from({ length: 4 }, (_, i) =>
    `<span class="v30-pressure-dot${i < model.pressureLevel ? ' is-active' : ''}"></span>`
  ).join('');
  const accessBadge = model.ownerWarningFired
    ? `<span class="v30-owner-badge">OWNER PROTECTED</span>`
    : model.knownToPlayer
      ? `<span class="v30-owner-badge">OWNER AUTH ONLY</span>`
      : `<span class="v30-seal-badge">SEALED</span>`;
  const evidenceLine = model.evidenceFoundCount > 0
    ? `<div class="v30-evidence-count">${model.evidenceFoundCount} item${model.evidenceFoundCount !== 1 ? 's' : ''} documented from outside.</div>`
    : '';
  const contaminationLine = model.contaminationCount > 0
    ? `<div class="v30-contamination-note">${model.contaminationCount} contamination event${model.contaminationCount !== 1 ? 's' : ''} logged. Adjacent rooms affected.</div>`
    : '';
  const ownerWarning = model.ownerWarningFired
    ? `<div class="v30-owner-warning">Owner override on record. Access attempts logged.</div>`
    : '';
  return `<div class="v30-protected-room">
    <div class="v30-protected-room-header">
      <span class="v30-protected-room-label">Room 9</span>
      ${accessBadge}
      <div class="v30-pressure-dots">${levelDots}</div>
    </div>
    <div class="v30-protected-room-status">
      <span class="v30-status-chip ${model.pressureClass}">${model.pressureLabel}</span>
      <span class="v30-protected-room-note muted">No guest registered. Owner access only.</span>
    </div>
    ${evidenceLine}${contaminationLine}${ownerWarning}
  </div>`;
}

function buildRoom9SummaryHtml(intel = {}) {
  if (!intel || !intel.active) return '';
  const rows = [];
  const level = Number(intel.pressureLevel || 0);
  const levelLabel = level === 0 ? 'Sealed — no events' : level === 1 ? 'Active — disturbances logged' : level === 2 ? 'Contaminating — adjacent pressure' : level === 3 ? 'Spreading — hallway affected' : 'Critical — full corridor bleed';
  rows.push({ text: `Room 9 pressure: ${levelLabel}`, cls: level >= 3 ? 'is-high' : '' });
  if (intel.contaminationCount > 0) rows.push({ text: `${intel.contaminationCount} contamination event${intel.contaminationCount !== 1 ? 's' : ''} this run`, cls: '' });
  if (intel.investigateAttempts > 0) rows.push({ text: `${intel.investigateAttempts} blocked access attempt${intel.investigateAttempts !== 1 ? 's' : ''} — owner override`, cls: 'is-high' });
  if (intel.evidenceFoundCount > 0) rows.push({ text: `${intel.evidenceFoundCount} item${intel.evidenceFoundCount !== 1 ? 's' : ''} documented from outside`, cls: 'is-ok' });
  return `<div class="v30-summary-room9-section">
    <div class="v30-summary-room9-header">Room 9 &amp; Protected Space</div>
    ${rows.map(r => `<div class="v30-summary-room9-row"><span class="v30-summary-room9-dot${r.cls ? ' ' + r.cls : ''}"></span><span>${r.text}</span></div>`).join('')}
  </div>`;
}

// ── v0.31 town builders ──────────────────────────────────────

function buildNewspaperClipHtml(headline = {}) {
  if (!headline?.headline) return '';
  const cat = headline.category || 'quiet';
  return `<div class="v31-newspaper-clip">
    <div class="v31-newspaper-header">
      <span class="v31-newspaper-label">Local Paper</span>
      <span class="v31-newspaper-night">Night ${headline.night || '?'}</span>
    </div>
    <div class="v31-newspaper-headline">${headline.headline}</div>
    <div class="v31-newspaper-tagline">${cat === 'raid' ? 'Multi-agency activity reported in the area.' : cat === 'police' ? 'Sheriff\'s office statement reported.' : cat === 'dirty' ? 'Financial irregularities under scrutiny.' : cat === 'room9' ? 'Extended tenancy dispute ongoing.' : cat === 'nemesis' ? 'Law enforcement expand area search.' : cat === 'disturbance' ? 'Incident under local review.' : 'No major incidents reported overnight.'}</div>
  </div>`;
}

function buildDJStripHtml(broadcast = '') {
  if (!broadcast) return '';
  return `<div class="v31-dj-strip">
    <div class="v31-dj-header">
      <span class="v31-dj-label">Highway Radio</span>
    </div>
    <div class="v31-dj-text">${broadcast}</div>
  </div>`;
}

function buildDayShiftNoteHtml(note = {}, onRespond = null) {
  if (!note?.text) return '';
  const stage = Number(note.stage || 0);
  const stageClass = stage === 0 ? 'stage-early' : stage === 1 ? 'stage-early' : stage === 2 ? 'stage-mid' : 'stage-critical';
  const stageLabel = stage === 0 ? 'Early' : stage === 1 ? 'Mid' : stage === 2 ? 'Late' : 'Critical';
  const responded = note.playerResponse !== null;
  const responseHtml = responded
    ? `<div class="v31-note-responded">You responded: ${note.playerResponse}.</div>`
    : `<div class="v31-note-response-strip">
        <button class="v31-note-response-btn" data-response="acknowledge">Acknowledge</button>
        <button class="v31-note-response-btn" data-response="deflect">Deflect</button>
        <button class="v31-note-response-btn" data-response="ignore">Ignore</button>
      </div>`;
  return `<div class="v31-dayshift-note">
    <div class="v31-note-header">
      <span class="v31-note-label">Day Shift Note</span>
      <span class="v31-note-stage-chip ${stageClass}">${stageLabel}</span>
    </div>
    <div class="v31-note-text">"${note.text}"</div>
    ${responseHtml}
  </div>`;
}

function buildTownSuspicionHtml(town = {}) {
  const suspicion = Math.max(0, Math.min(10, Number(town.townSuspicion || 0)));
  const pct = Math.round(suspicion * 10);
  return `<div class="v31-town-suspicion">
    <span class="v31-suspicion-label">Town Heat</span>
    <div class="v31-suspicion-track"><div class="v31-suspicion-fill" style="width:${pct}%"></div></div>
    <span class="v31-suspicion-value">${suspicion}/10</span>
  </div>`;
}

function buildEvidenceLockerHtml(locker = {}, compact = false) {
  const items = Array.isArray(locker.items) ? locker.items : [];
  const found = Number(locker.mysteryFragmentsFound || 0);
  const mysteryComplete = found >= 6;
  const TOTAL_MYSTERY = 6;

  const countChip = `<span class="v27-evidence-count-chip">${items.length}</span>`;
  const header = `<div class="v27-evidence-locker-header"><span class="v27-evidence-locker-title">Evidence Locker</span>${countChip}</div>`;

  let listHtml = '';
  if (!items.length) {
    listHtml = '<p class="v27-evidence-empty">No evidence collected yet.</p>';
  } else {
    const displayItems = compact ? items.slice(-6) : items;
    listHtml = `<div class="v27-evidence-list">${displayItems.map((item) => {
      const cat = String(item.category || 'other');
      return `<div class="v27-evidence-item category-${cat}">
        <span class="v27-evidence-item-label">${item.label || 'Evidence'}</span>
        <span class="v27-evidence-item-desc">${item.desc || ''}</span>
        <span class="v27-evidence-item-night">Night ${item.night || '?'}</span>
      </div>`;
    }).join('')}</div>`;
  }

  // Mystery strip
  const pips = Array.from({ length: TOTAL_MYSTERY }, (_, i) =>
    `<span class="v27-mystery-pip${i < found ? ' is-found' : ''}"></span>`
  ).join('');
  const mysteryLatest = found > 0 && !compact
    ? (() => {
        const lastMysteryItem = [...items].reverse().find((it) => it.category === 'mystery');
        return lastMysteryItem
          ? `<p class="v27-mystery-latest-note">${lastMysteryItem.desc}</p>`
          : '';
      })()
    : '';
  const mysteryBanner = mysteryComplete
    ? '<div class="v27-mystery-complete-banner">Previous Manager Mystery — Resolved</div>'
    : '';
  const mysteryStrip = found > 0
    ? `<div class="v27-mystery-strip">
        <div class="v27-mystery-strip-header"><span class="v27-mystery-strip-title">Previous Manager</span></div>
        <div class="v27-mystery-progress-row">${pips}<span class="v27-mystery-progress-label">${found} / ${TOTAL_MYSTERY}</span></div>
        ${mysteryLatest}${mysteryBanner}
      </div>`
    : '';

  return `<div class="v27-evidence-locker">${header}${listHtml}${mysteryStrip}</div>`;
}

function buildNemesisAlertHtml(nemesis = {}) {
  if (!nemesis.active && !nemesis.resolvedOutcome) return '';
  const isIdentified = Boolean(nemesis.identified);
  const pressureLevel = Math.min(3, Math.max(0, Number(nemesis.pressureLevel || 0)));
  const pressurePct = Math.round((pressureLevel / 3) * 100);
  const STYLE_LABELS = {
    harshControl: 'Control-First',
    hospitality: 'Over-Hospitable',
    patternHunter: 'Pattern Obsessive',
    greed: 'Money-Driven',
    overreaction: 'Over-Reactive',
    fearBased: 'Fear-Driven'
  };
  const styleLabel = STYLE_LABELS[nemesis.styleKey] || nemesis.styleKey || 'Unknown Style';
  const outcomeMap = {
    contained: 'Contained — adversary repelled',
    escaped: 'Escaped — unresolved',
    missing: 'Status unclear'
  };

  if (nemesis.resolvedOutcome) {
    const outcomeText = outcomeMap[nemesis.resolvedOutcome] || nemesis.resolvedOutcome;
    return `<div class="v27-nemesis-alert${isIdentified ? ' v27-nemesis-identified' : ''}">
      <div class="v27-nemesis-alert-header"><span class="v27-nemesis-alert-title">Nemesis — ${outcomeText}</span></div>
      <p class="v27-nemesis-note">Adversary exploited your <em>${styleLabel}</em> tendencies. Outcome logged.</p>
    </div>`;
  }

  return `<div class="v27-nemesis-alert${isIdentified ? ' v27-nemesis-identified' : ''}">
    <div class="v27-nemesis-alert-header"><span class="v27-nemesis-alert-title">Nemesis — Active</span></div>
    <span class="v27-nemesis-style-chip">${styleLabel}</span>
    <div class="v27-nemesis-pressure-row">
      <div class="v27-nemesis-pressure-track"><div class="v27-nemesis-pressure-fill" style="width:${pressurePct}%"></div></div>
      <span class="v27-nemesis-pressure-label">Pressure ${pressureLevel}/3</span>
    </div>
    <p class="v27-nemesis-note">A recurring adversary is profiling your patterns. Hunt night containment may identify them.</p>
  </div>`;
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
  const owner = document.getElementById('night-prep-owner');
  const staff = document.getElementById('night-prep-staff');
  const budget = document.getElementById('night-prep-budget');
  const suspectBoard = document.getElementById('night-prep-suspect-board');
  const plans = document.getElementById('night-prep-plan-grid');
  const staffFocusGrid = document.getElementById('night-prep-staff-focus-grid');
  const upgradeCategories = document.getElementById('night-prep-upgrade-categories');
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
    meta.textContent = `Prepare for Night ${nextNight}${milestoneText}${state?.nightMoodLine ? ` • ${state.nightMoodLine}` : ''}${state?.nightIdentityLine ? ` • ${state.nightIdentityLine}` : ''}`;
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
    campaignForecast.innerHTML = prepSurface(
      'forecast',
      'Campaign outlook',
      notes.length
        ? `<ul class="prep-notes-list">${notes.map((line) => `<li><span>${line}</span></li>`).join('')}</ul>`
        : '<p class="muted">No special campaign warnings.</p>'
    );
  }

  const forecastStrip = document.getElementById('night-prep-forecast');
  if (forecastStrip) {
    const fw = deriveWeatherState(state);
    const nextNight = Math.max(1, Number(state?.night || 1) + 1);

    const conditions = [];
    const explicit = Array.isArray(state?.nightForecast?.conditions) ? state.nightForecast.conditions : [];
    if (explicit.length) {
      explicit.forEach((c) => conditions.push(String(c).toLowerCase().replace(/\s+/g, '-')));
    } else {
      const _pw = Number(state?.power ?? 100);
      const _bk = state?.blackoutState?.level;
      const _sc = String(state?.activeScenario?.label || '').toLowerCase();
      const _pr = state?.uiPressureLevel || 'calm';
      if (fw.primary !== 'clear') conditions.push(fw.primary);
      if (_pw <= 40 || _bk === 'partial' || _bk === 'full') conditions.push('unstable-grid');
      if (_bk === 'partial' || _bk === 'full') conditions.push('poor-visibility');
      if (_pr === 'emergency' || _pr === 'dire') conditions.push('pressure-rising');
      if (/storm|surge|volatile/.test(_sc) && !conditions.includes('storm')) conditions.push('storm-risk');
      if (!conditions.length) conditions.push('calm');
    }
    const COND_LABELS = {
      'clear': 'Clear', 'calm': 'Calm', 'fog': 'Fog', 'cold': 'Cold', 'rain': 'Rain', 'storm': 'Storm',
      'fog-prone': 'Fog-Prone', 'storm-risk': 'Storm Risk', 'unstable-grid': 'Unstable Grid',
      'poor-visibility': 'Poor Visibility', 'pressure-rising': 'Pressure Rising'
    };
    const chipsHtml = conditions.slice(0, 4).map((c) => {
      const label = COND_LABELS[c] || c.replace(/-/g, ' ').replace(/\b\w/g, (ch) => ch.toUpperCase());
      return `<span class="v25-condition-chip is-${c}">${label}</span>`;
    }).join('');

    const effectsHtml = fw.effects.map((e) =>
      `<div class="v25-effect-row">
        <span class="v25-effect-domain">${e.domain}</span>
        <span class="v25-effect-text severity-${e.severity}">${e.text}</span>
      </div>`
    ).join('');

    const PLANNING_HINTS = {
      fog:   ['Check lot and rear camera feeds before opening', 'Visibility-dependent calls take longer to resolve'],
      cold:  ['Power drain will be higher — consider generator reserve', 'Outdoor zone entries may spike unexpectedly'],
      rain:  ['Lot intel less reliable — cross-check scanner', 'Expect more rear-exit uncertainty'],
      storm: ['Pre-stage blackout response before guests arrive', 'Scanner and cameras may lose stability mid-shift']
    };
    const hints = PLANNING_HINTS[fw.primary] || [];
    const hintsHtml = hints.length
      ? `<div class="v25-planning-hints">
          <div class="v25-planning-hints-header">Planning</div>
          ${hints.map((h) => `<div class="v25-planning-hint">${h}</div>`).join('')}
        </div>`
      : '';

    forecastStrip.innerHTML = prepSurface(
      'forecast-v25',
      `Night ${nextNight} — Shift Forecast`,
      `<div class="v25-forecast-panel">
        <div class="v25-conditions-row">
          <span class="v25-conditions-label">Conditions</span>
          ${chipsHtml}
        </div>
        <div class="v25-effects-block">
          <div class="v25-effects-header">Gameplay Impact</div>
          ${effectsHtml}
        </div>
        ${hintsHtml}
      </div>`
    );
  }

  const conditionSlot = document.getElementById('night-prep-condition');
  if (conditionSlot) {
    const fc = deriveMotelCondition(state);
    const ownedUpgrades = Array.isArray(state?.progression?.ownedUpgradeIds) ? state.progression.ownedUpgradeIds : [];
    const upgradeList = Array.isArray(upgrades) ? upgrades : [];
    const upgradeItemsHtml = upgradeList.length
      ? `<div class="v25-upgrade-list">
          ${upgradeList.slice(0, 5).map((u) => {
            const isOwned = ownedUpgrades.includes(u.id);
            const effectSummary = buildUpgradeEffectSummary(u);
            return `<div class="v25-upgrade-item${isOwned ? ' is-owned' : ''}">
              <span class="v25-upgrade-item-name">${u.name || u.id}</span>
              ${isOwned ? `<span class="v25-upgrade-item-effect">${effectSummary || 'Active'}</span>` : ''}
            </div>`;
          }).join('')}
        </div>`
      : '';
    const signalsHtml = fc.signals.map((s) =>
      `<div class="v25-condition-signal-row is-${s.polarity}">
        <span class="v25-signal-dot"></span>
        <span>${s.text}</span>
      </div>`
    ).join('');
    const barWidth = Math.round(fc.score);
    conditionSlot.innerHTML = prepSurface(
      'condition-v25',
      'Motel Condition',
      `<div class="v25-condition-surface">
        <div class="v25-condition-score-bar-wrap">
          <div class="v25-condition-score-bar-track">
            <div class="v25-condition-score-bar-fill is-${fc.overall}" style="width:${barWidth}%"></div>
          </div>
          <span class="v25-condition-score-label is-${fc.overall}">${fc.overall.charAt(0).toUpperCase() + fc.overall.slice(1)}</span>
        </div>
        <div class="v25-condition-signals">${signalsHtml}</div>
        ${upgradeItemsHtml}
      </div>`
    );
  }

  const socialMemSlot = document.getElementById('night-prep-social-memory');
  if (socialMemSlot) {
    const smn = state?.socialMemoryNote || null;
    if (smn) {
      const barWidth = smn.tone === 'fair' ? 75 : smn.tone === 'harsh' ? 80 : 50;
      socialMemSlot.innerHTML = prepSurface(
        'social-memory-v26',
        'Motel Social Reputation',
        `<div class="v26-social-rep-strip">
          <div class="v26-social-rep-bar-wrap">
            <div class="v26-social-rep-bar-track">
              <div class="v26-social-rep-bar-fill is-${smn.tone}" style="width:${barWidth}%"></div>
            </div>
            <span class="v26-social-rep-label is-${smn.tone}">${smn.label}</span>
          </div>
          <div class="v26-social-rep-note">${smn.note}</div>
        </div>`
      );
    } else {
      socialMemSlot.innerHTML = '';
    }
  }

  // v0.27 evidence locker + nemesis in night prep
  const evidenceSlot = document.getElementById('night-prep-evidence');
  if (evidenceSlot) {
    const locker = state?.evidenceLockerSummary || state?.evidenceLocker || {};
    const nemesis = state?.nemesis || {};
    const nemesisHtml = buildNemesisAlertHtml(nemesis);
    evidenceSlot.innerHTML = nemesisHtml + buildEvidenceLockerHtml(locker, true);
  }

  // v0.28 dirty ledger in night prep
  const dirtySlot = document.getElementById('night-prep-dirty-ledger');
  if (dirtySlot) {
    const dls = state?.dirtyLedgerSummary || {};
    dirtySlot.innerHTML = dls.hasDirty ? buildDirtyLedgerHtml(dls) : '';
  }

  // v0.29 staff paranoia in night prep
  const staffParanoiaSlot = document.getElementById('night-prep-staff-paranoia');
  if (staffParanoiaSlot) {
    const sp = state?.staffParanoiaModel || {};
    staffParanoiaSlot.innerHTML = buildStaffParanoiaHtml(sp);
    staffParanoiaSlot.querySelectorAll('[data-action]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.action;
        if (action === 'pay-staff-bonus' && typeof state?.onPayStaffBonus === 'function') state.onPayStaffBonus();
        if (action === 'dismiss-staff' && typeof state?.onDismissSuspectedStaff === 'function') state.onDismissSuspectedStaff();
      });
    });
  }

  // v0.30 Room 9 / protected room in night prep
  const room9Slot = document.getElementById('night-prep-room9');
  if (room9Slot) {
    const r9 = state?.room9Model || {};
    room9Slot.innerHTML = buildProtectedRoomHtml(r9);
  }

  // v0.31 town signals in night prep
  const townSignalsSlot = document.getElementById('night-prep-town-signals');
  if (townSignalsSlot) {
    const tm = state?.townModel || {};
    const parts = [];
    if (tm.lastHeadline) parts.push(buildNewspaperClipHtml(tm.lastHeadline));
    if (tm.lastDjBroadcast) parts.push(buildDJStripHtml(tm.lastDjBroadcast));
    if (tm.townSuspicion > 0 || tm.corruption > 0) parts.push(buildTownSuspicionHtml(tm));
    townSignalsSlot.innerHTML = parts.join('') || '';
  }

  // v0.31 day shift note in night prep
  const dayshiftSlot = document.getElementById('night-prep-dayshift-note');
  if (dayshiftSlot) {
    const note = state?.currentDayShiftNote || null;
    dayshiftSlot.innerHTML = note ? buildDayShiftNoteHtml(note) : '';
    dayshiftSlot.querySelectorAll('.v31-note-response-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const response = btn.dataset.response;
        if (response && typeof state?.onRespondToNote === 'function') state.onRespondToNote(response);
      });
    });
  }

  if (doctrine) {
    const doctrineTitle = state?.doctrineDisplay?.title || 'Stability Manager';
    const doctrineSummary = state?.doctrineDisplay?.summary || 'Low-chaos continuity is prioritized over dramatic responses.';
    const doctrineHints = Array.isArray(state?.doctrineDisplay?.hints) ? state.doctrineDisplay.hints.slice(0, 2) : [];
    const doctrineTrack = state?.doctrineTrack?.title || 'Pattern Hunter';
    const doctrineTrackNotes = Array.isArray(state?.doctrineTrack?.notes) ? state.doctrineTrack.notes.slice(0, 1) : [];
    doctrine.innerHTML = prepSurface(
      'doctrine',
      'Doctrine & management track',
      `<p><strong>${doctrineTitle}</strong></p>
      <p class="muted">${doctrineSummary}</p>
      <p class="muted"><strong>Management track:</strong> ${doctrineTrack}</p>
      ${doctrineHints.length
        ? `<ul class="prep-notes-list">${doctrineHints.map((line) => `<li><span>${line}</span></li>`).join('')}</ul>`
        : ''}
      ${doctrineTrackNotes.length ? `<p class="muted">${doctrineTrackNotes[0]}</p>` : ''}
    `
    );
  }

  if (staff) {
    const roster = Array.isArray(state?.staffRoster) ? state.staffRoster : [];
    const profile = state?.staffProfile || {};
    staff.innerHTML = prepSurface(
      'staff',
      'Staff roster',
      `<p><strong>${(profile?.focus || 'balanced').replaceAll('-', ' ')}</strong> staffing • Active payroll: ${formatMoney(Number(profile?.activePayroll || 0))}</p>
      <div class="prep-staff-grid">
        ${roster.map((member) => `
          <button class="prep-staff-card ${member.active ? 'is-active' : member.onCall ? 'is-oncall' : ''}" data-staff-id="${member.id}">
            <div class="prep-staff-header">
              <strong>${member.name}</strong>
              <span class="prep-staff-role">${member.role}</span>
            </div>
            <p class="muted">${member.specialty} • ${member.active ? 'Active' : member.onCall ? 'On-call' : 'Off'}</p>
            <p class="muted">Reliability ${member.effectiveReliability}% • Fatigue ${member.fatigue}% • Cost ${formatMoney(member.nightlyCost)}</p>
            ${member.recentNote ? `<p class="muted">${member.recentNote}</p>` : ''}
          </button>
        `).join('')}
      </div>
    `
    );
    if (typeof state?.onCycleStaffAssignment === 'function') {
      staff.querySelectorAll('[data-staff-id]').forEach((button) => {
        button.addEventListener('click', () => state.onCycleStaffAssignment(button.dataset.staffId));
      });
    }
  }

  if (budget) {
    const summary = state?.budgetSummary || {};
    const lines = Array.isArray(summary?.lines) ? summary.lines.slice(0, 4) : [];
    budget.innerHTML = prepSurface(
      'budget',
      'Budget & settlement',
      `<p><strong>Projected net:</strong> ${formatMoney(Number(summary?.net || 0))}</p>
      <p class="muted">Income ${formatMoney(Number(summary?.income || 0))} • Costs ${formatMoney(Number(summary?.costs || 0))}</p>
      <p class="muted">Payroll ${formatMoney(Number(summary?.payroll || 0))} • Repairs ${formatMoney(Number(summary?.repairs || 0))} • Refunds ${formatMoney(Number(summary?.refunds || 0) + Number(summary?.compensationPaid || 0))}</p>
      <p class="muted">Emergency ${formatMoney(Number(summary?.emergencies || 0))} • Utility ${formatMoney(Number(summary?.utilities || 0))} • Owner ${formatMoney(Number(summary?.ownerDeductions || 0))}</p>
      ${lines.length
        ? `<ul class="prep-notes-list">${lines.map((line) => `<li><span>${line}</span></li>`).join('')}</ul>`
        : '<p class="muted">No budget notes yet.</p>'}
    `
    );
  }

  if (factions) {
    const climate = Array.isArray(state?.factionClimate) ? state.factionClimate : [];
    const notes = Array.isArray(state?.prepFactionNotes) ? state.prepFactionNotes : [];
    factions.innerHTML = prepSurface(
      'factions',
      'Faction climate',
      `<div class="prep-faction-chip-row">
        ${climate.map((entry) => `<span class="prep-faction-chip">${entry.id}: ${entry.band}</span>`).join('')}
      </div>
      ${notes.length
        ? `<ul class="prep-notes-list">${notes
            .slice(0, 3)
            .map((line) => `<li><span>${line}</span></li>`)
            .join('')}</ul>`
        : '<p class="muted">No notable faction pressure shifts.</p>'}
    `
    );
  }

  if (director) {
    const notes = Array.isArray(state?.directorBriefingNotes) ? state.directorBriefingNotes.slice(0, 4) : [];
    const shiftHint = state?.directorShiftHint || '';
    director.innerHTML = prepSurface(
      'director',
      'Tonight’s outlook',
      `${state?.nightMoodLine ? `<p><strong>${state.nightMoodLine}</strong></p>` : ''}
      ${state?.nightIdentityLine ? `<p class="muted">${state.nightIdentityLine}</p>` : ''}
      ${shiftHint ? `<p class="muted">${shiftHint}</p>` : ''}
      ${notes.length
        ? `<ul class="prep-notes-list">${notes.map((line) => `<li><span>${line}</span></li>`).join('')}</ul>`
        : '<p class="muted">No unusual directional pressure forecast for this shift.</p>'}
    `
    );
  }

  if (carryover) {
    const notes = Array.isArray(state?.carryoverBriefingNotes) ? state.carryoverBriefingNotes.slice(0, 4) : [];
    carryover.innerHTML = prepSurface(
      'carryover',
      'Incoming night notes',
      notes.length
        ? `<ul class="prep-notes-list">${notes
            .map((entry) => `<li><strong>${entry.title}</strong><span>${entry.note || ''}</span></li>`)
            .join('')}</ul>`
        : '<p class="muted">No major carryover warnings detected.</p>'
    );
  }

  if (threads) {
    const activeThreads = Array.isArray(state?.activeRunThreads) ? state.activeRunThreads.slice(0, 3) : [];
    threads.innerHTML = prepSurface(
      'threads',
      'Active run threads',
      activeThreads.length
        ? `<ul class="prep-notes-list">${activeThreads
            .map((entry) => `<li><strong>${entry.title} (Stage ${entry.stage})</strong><span>${entry.note || ''}</span></li>`)
            .join('')}</ul>`
        : '<p class="muted">No active long-running thread pressure.</p>'
    );
  }

  if (owner) {
    const brief = state?.ownerPressureBrief || {};
    const lines = Array.isArray(brief?.lines) ? brief.lines.slice(0, 4) : [];
    owner.innerHTML = prepSurface(
      'owner',
      'Owner memo',
      `<p><strong>${brief?.mood || 'Watchful'}</strong> oversight • Last settlement: ${formatMoney(Number(brief?.settlement || 0))}</p>
      <p class="muted">${brief?.memo || 'Ownership has not issued a new morning memo.'}</p>
      ${state?.nightMoodLine ? `<p class="muted">${state.nightMoodLine}</p>` : ''}
      <p class="muted">Demand: ${(brief?.ownerDemand || 'margin-watch').replaceAll('-', ' ')} • Doctrine read: ${brief?.doctrineTrack || 'Stability Manager'} • Staffing cost: ${formatMoney(Number(brief?.staffingCost || 0))}</p>
      ${lines.length
        ? `<ul class="prep-notes-list">${lines.map((line) => `<li><span>${line}</span></li>`).join('')}</ul>`
        : '<p class="muted">No additional owner notes.</p>'}
    `
    );
  }

  if (suspectBoard) {
    const board = state?.suspectBoard || {};
    const entries = Array.isArray(board?.entries) ? board.entries.slice(0, 4) : [];
    suspectBoard.innerHTML = prepSurface(
      'suspect',
      'Evidence / suspect board',
      `${entries.length
        ? `<ul class="prep-notes-list">${entries
            .map((entry) => `<li><strong>${entry.label}</strong><span>${entry.detail || ''}</span></li>`)
            .join('')}</ul>`
        : '<p class="muted">No durable suspect patterns on the board yet.</p>'}
      <details class="prep-suspect-extras"><summary>Index lines</summary>
        <div class="prep-suspect-extras-body">
          <p class="muted">Names: ${(board?.namesSeen || []).join(' • ') || 'none yet'}</p>
          <p class="muted">Marks: ${(board?.marksSeen || []).join(' • ') || 'none yet'}</p>
          <p class="muted">Vehicles: ${(board?.vehiclesSeen || []).join(' • ') || 'none yet'}</p>
          <p class="muted">Groups: ${(board?.groupLabels || []).join(' • ') || 'none yet'}</p>
          <p class="muted">Documents: ${(board?.documentPatterns || []).join(' • ') || 'none yet'}</p>
          <p class="muted">Cross-links: ${(board?.crossLinks || []).join(' • ') || 'none yet'}</p>
        </div>
      </details>`
    );
  }

  if (plans) {
    const ownerBrief = state?.ownerPressureBrief || {};
    const planOptions = Array.isArray(ownerBrief?.plans) ? ownerBrief.plans : [];
    plans.innerHTML = '';
    planOptions.forEach((plan) => {
      const button = document.createElement('button');
      button.className = `button button-secondary prep-plan-btn ${ownerBrief?.selectedPlanId === plan.id ? 'is-active' : ''}`.trim();
      button.textContent = plan.title;
      button.title = plan.summary || '';
      if (typeof state?.onSetDayShiftPlan === 'function') {
        button.addEventListener('click', () => state.onSetDayShiftPlan(plan.id));
      }
      plans.appendChild(button);
    });
  }

  if (staffFocusGrid) {
    const focusOptions = [
      { id: 'balanced', title: 'Balanced Shift' },
      { id: 'security-heavy', title: 'Security Heavy' },
      { id: 'service-heavy', title: 'Service Heavy' },
      { id: 'cost-saving', title: 'Cost Saving' }
    ];
    staffFocusGrid.innerHTML = '';
    focusOptions.forEach((focus) => {
      const button = document.createElement('button');
      button.className = `button button-secondary prep-plan-btn ${state?.staffFocus === focus.id ? 'is-active' : ''}`.trim();
      button.textContent = focus.title;
      if (typeof state?.onSetStaffFocus === 'function') {
        button.addEventListener('click', () => state.onSetStaffFocus(focus.id));
      }
      staffFocusGrid.appendChild(button);
    });
  }

  if (upgradeCategories) {
    const categories = ['All', 'Desk', 'Security', 'Power', 'Rooms', 'Service', 'Surveillance', 'Operations'];
    const selected = String(state?.dayShift?.management?.selectedUpgradeCategory || 'All');
    upgradeCategories.innerHTML = '';
    categories.forEach((category) => {
      const button = document.createElement('button');
      button.className = `button button-secondary prep-plan-btn ${selected === category ? 'is-active' : ''}`.trim();
      button.textContent = category;
      if (typeof state?.onSetUpgradeCategory === 'function') {
        button.addEventListener('click', () => state.onSetUpgradeCategory(category));
      }
      upgradeCategories.appendChild(button);
    });
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
      ${buildUpgradeEffectSummary(upgrade) ? `<p class="prep-upgrade-effects">Effect: ${buildUpgradeEffectSummary(upgrade)}</p>` : ''}
      <p class="prep-upgrade-cost">Cost: ${formatMoney(upgrade.cost)}</p>
      <button class="button button-secondary prep-upgrade-buy-btn" ${upgrade.owned || cannotAfford ? 'disabled' : ''}>
        ${upgrade.owned ? 'Active This Run' : cannotAfford ? 'Insufficient Funds' : 'Purchase'}
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
  if (toneBadge) {
    toneBadge.title = ending?.family ? `Ending family: ${formatFamilyLabel(ending.family)}` : '';
  }
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

  // v0.28 dirty ending lines
  const dirtyLine = document.getElementById('run-ending-dirty-line');
  const v28Tags = document.getElementById('run-ending-v28-tags');
  if (dirtyLine) dirtyLine.textContent = ending?.dirtyLine || '';
  if (v28Tags) {
    v28Tags.innerHTML = '';
    const v28TagData = [
      ending?.dirtyScore >= 6 ? { label: 'Compromised Operator', cls: '' } : null,
      ending?.offBookStays >= 2 && ending?.shadowRep >= 2 ? { label: 'Protector in the Dark', cls: 'tag-protector' } : null,
      ending?.shadowRep >= 4 ? { label: 'Network Standing', cls: 'tag-shadow' } : null,
      ending?.dirtyScore >= 3 && ending?.deadDrops >= 1 ? { label: 'Bought Quiet', cls: '' } : null
    ].filter(Boolean);
    v28TagData.forEach(({ label, cls }) => {
      const chip = document.createElement('span');
      chip.className = `v28-ending-tag${cls ? ' ' + cls : ''}`;
      chip.textContent = label;
      v28Tags.appendChild(chip);
    });
  }

  // v0.30 Room 9 / contamination ending lines
  const room9Line = document.getElementById('run-ending-room9-line');
  const v30Tags = document.getElementById('run-ending-v30-tags');
  if (room9Line) room9Line.textContent = ending?.room9Line || '';
  if (v30Tags) {
    v30Tags.innerHTML = '';
    const v30TagData = [
      (ending?.room9PressureLevel || 0) >= 3 ? { label: 'The Motel Was Sick', cls: '' } : null,
      ending?.room9Contained ? { label: 'Contained the Rot', cls: 'tag-contained' } : null,
      (ending?.room9InvestigateAttempts || 0) >= 2 ? { label: "Owner's Machine", cls: 'tag-owner' } : null,
      (ending?.room9PressureLevel || 0) >= 1 && !(ending?.room9Contained) ? { label: 'Lived Beside the Wrong Room', cls: '' } : null
    ].filter(Boolean);
    v30TagData.forEach(({ label, cls }) => {
      const chip = document.createElement('span');
      chip.className = `v30-ending-tag${cls ? ' ' + cls : ''}`;
      chip.textContent = label;
      v30Tags.appendChild(chip);
    });
  }

  // v0.29 staff ending lines
  const staffLine = document.getElementById('run-ending-staff-line');
  const v29Tags = document.getElementById('run-ending-v29-tags');
  if (staffLine) staffLine.textContent = ending?.staffLine || '';
  if (v29Tags) {
    v29Tags.innerHTML = '';
    const v29TagData = [
      ending?.staffCompromised ? { label: 'Compromised Operator', cls: 'tag-fear' } : null,
      ending?.staffDismissed && !ending?.staffCompromised ? { label: 'Last Honest Shift', cls: 'tag-loyalty' } : null,
      ending?.mutinyFired && ending?.avgStaffMorale < 0.30 ? { label: 'Fear Management', cls: 'tag-fear' } : null,
      ending?.mutinyFired && !ending?.staffCompromised ? { label: 'Held Together', cls: 'tag-loyalty' } : null
    ].filter(Boolean);
    v29TagData.forEach(({ label, cls }) => {
      const chip = document.createElement('span');
      chip.className = `v29-ending-tag${cls ? ' ' + cls : ''}`;
      chip.textContent = label;
      v29Tags.appendChild(chip);
    });
  }

  // v0.31 town ending lines
  const townLine = document.getElementById('run-ending-town-line');
  const v31Tags = document.getElementById('run-ending-v31-tags');
  if (townLine) townLine.textContent = ending?.townLine || '';
  if (v31Tags) {
    v31Tags.innerHTML = '';
    const v31TagData = [
      (ending?.bagmanPayoffs || 0) >= 2 ? { label: 'Bought the Law', cls: 'tag-corrupt' } : null,
      ending?.policeCompromised && !(ending?.bagmanPayoffs) ? { label: 'Town Saw Nothing', cls: 'tag-clean' } : null,
      (ending?.townSuspicion || 0) >= 6 ? { label: 'Notorious Motel', cls: 'tag-corrupt' } : null,
      ending?.bagmanFired && !(ending?.bagmanPayoffs) ? { label: 'Turned Away the Law', cls: 'tag-clean' } : null
    ].filter(Boolean);
    v31TagData.forEach(({ label, cls }) => {
      const chip = document.createElement('span');
      chip.className = `v31-ending-tag${cls ? ' ' + cls : ''}`;
      chip.textContent = label;
      v31Tags.appendChild(chip);
    });
  }

  // v0.27 evidence / nemesis / hunt lines
  const evidenceLine = document.getElementById('run-ending-evidence-line');
  const nemesisLine = document.getElementById('run-ending-nemesis-line');
  const huntLine = document.getElementById('run-ending-hunt-line');
  const v27Tags = document.getElementById('run-ending-v27-tags');
  if (evidenceLine) evidenceLine.textContent = ending?.evidenceLine || '';
  if (nemesisLine) nemesisLine.textContent = ending?.nemesisLine || '';
  if (huntLine) huntLine.textContent = ending?.huntLine || '';
  if (v27Tags) {
    v27Tags.innerHTML = '';
    const v27TagData = [
      ending?.nemesisOutcome === 'contained' ? { label: 'Nemesis Identified', cls: 'tag-nemesis' } : null,
      ending?.mysteryComplete ? { label: 'Manager Mystery', cls: 'tag-mystery' } : null,
      (ending?.huntWins || 0) >= 2 ? { label: 'Hunt Nights Survived', cls: 'tag-hunt' } : null,
      (ending?.evidenceCount || 0) >= 8 ? { label: 'Evidence Trail', cls: '' } : null
    ].filter(Boolean);
    v27TagData.forEach(({ label, cls }) => {
      const chip = document.createElement('span');
      chip.className = `v27-ending-tag${cls ? ' ' + cls : ''}`;
      chip.textContent = label;
      v27Tags.appendChild(chip);
    });
  }

  if (tags) {
    tags.innerHTML = '';
    (Array.isArray(ending?.tags) ? ending.tags : []).slice(0, 6).forEach((line) => {
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
          <p class="muted">${tutorialActiveStartFlow ? 'Guided mode keeps first-night teaching progressive and light.' : 'Standard mode keeps hints lighter while preserving the full system depth.'}</p>
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
