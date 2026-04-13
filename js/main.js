import { createInitialState } from './state.js';
import { createGuest } from './guests.js';
import {
  createDefaultRooms,
  getAvailableRoom,
  applyRoomUnlockFlags,
  applyStayDecrementBetweenNights,
  computeStayNightsForGuest,
  getUnlockedRoomCapForNight
} from './rooms.js';
import { createDefaultCameras } from './cameras.js';
import { clampPower } from './power.js';
import { generateCameraScanResult } from './anomalies.js';
import { reviewRoomIncidents, hasActionableIncidentReviewContext } from './incidents.js';
import {
  normalizeEscalationRooms,
  tickEscalationRooms,
  runAutoEscalation
} from './escalation.js';
import {
  normalizeResponseRooms,
  tickResponseCooldowns,
  dispatchStaffResponse,
  peekDispatchStaffTargetRoom
} from './response.js';
import {
  normalizeTacticalRooms,
  tickTacticalRooms,
  applyLockdownToRoom,
  applyPoliceToRoom,
  applyPowerCutToRoom
} from './tactics.js';
import { evictGuestFromRoom } from './eviction.js';
import {
  evaluateFailureState,
  normalizeFailureState
} from './failure.js';
import {
  enrichGuestProfile,
  deriveRoomConditionForGuest,
  buildGuestCheckInLogs
} from './guestRisk.js';
import {
  normalizeGuestFlags,
  applyFlagToGuest,
  buildFlagLogs,
  buildRejectOutcome,
  adjustRoomForDeskDecision,
  applyReputationDelta
} from './frontDesk.js';
import {
  applyPolicyToGuest,
  normalizePolicyGuests,
  evaluatePolicyDecision,
  applyPolicyToRoom,
  applyPolicyReputation
} from './policy.js';
import {
  createShiftStats,
  normalizeShiftStats,
  classifyPolicyAction
} from './scoring.js';
import {
  normalizeNightCycleState,
  advanceNightCycle,
  hasReachedDawn,
  SHIFT_DURATION_MINUTES
} from './nightCycle.js';
import {
  normalizePowerEconomyState,
  buildFreshPowerEconomy,
  getPowerActionCost,
  getPassiveDrainForAction,
  tickPowerEconomy,
  getLowPowerStage,
  canRestorePower,
  consumeRestorePower,
  canEmergencyReroute,
  consumeEmergencyReroute
} from './powerEconomy.js';
import {
  normalizeCameraSceneState,
  buildFreshCameraSceneState,
  clearCameraScene,
  openCameraScene,
  computeCameraSceneActionCosts,
  resolveCameraSceneAction,
  mergeCameraScanWithLocationState,
  registerUnresolvedCameraEvents,
  markActiveSceneIgnored
} from './cameraScenes.js';
import {
  normalizeLocationState,
  createLocationState,
  resetLocationStateForNight,
  tickLocationState
} from './locationState.js';
import { buildNightSummary } from './night.js';
import {
  normalizeGuestArchetype,
  assignArchetypeToGuest
} from './archetypes.js';
import {
  normalizeDeskConsequenceState,
  queueDeskFollowupForDecision,
  tickDeskConsequences
} from './deskConsequences.js';
import {
  normalizeChainState,
  registerChainSignal,
  applyChainPressureToRoom,
  calmChainForRoom,
  getVisibleChainPressureForRoom
} from './chains.js';
import {
  normalizeScenarioState,
  assignScenarioForNight
} from './scenarios.js';
import {
  buildOutcomeFlavor
} from './outcomes.js';
import {
  createAudioController,
  getPressureAudioLevel
} from './audio.js';
import {
  loadSettings,
  saveSettings,
  normalizeSettings,
  applySettingsToDocument
} from './settings.js';
import {
  normalizePresentationState,
  pushLiveAlert,
  pruneLiveAlerts,
  deriveUiPressureLevel,
  getTopbarWarningFlags
} from './presentation.js';
import {
  normalizeSpecialEncounterState,
  maybeAssignSpecialEncounterToGuest,
  openSpecialEncounterForGuest,
  closeSpecialEncounter,
  resolveSpecialEncounterChoice,
  recordSpecialEncounterMiss
} from './specialEncounters.js';
import {
  normalizeNightEventState,
  openNightEventOverlay,
  closeNightEventOverlay,
  tickNightEvents,
  resolveNightEventChoice
} from './nightEvents.js';
import {
  normalizeStoryThreadState,
  maybeGenerateNightStoryBeat,
  maybeGenerateReturningGuestVariant,
  markThreadOutcome,
  advanceStoryThreadsAfterNight,
  buildActiveRunThreadHighlights
} from './storyThreads.js';
import {
  normalizeCarryoverState,
  analyzeNightCarryover,
  applyCarryoverForNight,
  clearTemporaryCarryover,
  buildIncomingNightNotes,
  resetCarryoverMemory
} from './carryover.js';
import { saveState, loadState, clearSave } from './save.js';
import {
  normalizeProgressionState,
  getUpgradeCatalog,
  purchaseUpgrade,
  getProgressionModifiers,
  setNightPrepVisited,
  applyNightStartProgression,
  buildActiveUpgradeSummary
} from './progression.js';
import {
  normalizeDoctrineState,
  recordDoctrineInfluence,
  getDoctrineDisplay,
  getDoctrineModifiers,
  buildDoctrineShiftNotes,
  beginDoctrineNight
} from './doctrine.js';
import {
  normalizeFactionState,
  applyFactionDelta,
  getFactionClimateSummary,
  getFactionModifiers,
  buildPrepFactionNotes,
  buildFactionSummaryLines,
  getPrimaryFactionSignal
} from './factions.js';
import {
  normalizeContentDirectorState,
  getRunBranchingContext,
  applyDirectorGuestBias,
  applyReturningGuestBranchFlavor,
  registerContentExposure
} from './contentDirector.js';
import {
  normalizeCampaignState,
  getCampaignProgress,
  getMilestoneMeta,
  getPrepForecastNotes,
  getMilestoneGameplayModifiers,
  getMilestoneSupportNotes,
  registerCampaignNightSuccess,
  shouldEndRunAfterSuccessfulNight
} from './milestones.js';
import {
  isTrueFinalCampaignNight,
  normalizeFinaleDirectorState,
  activateFinaleDirector,
  tickFinaleDirector,
  registerFinaleContainment,
  buildFinaleObjectives,
  buildFinaleUiState,
  buildFinalePerformanceContext,
  buildFinaleForeshadowNotes
} from './finaleDirector.js';
import {
  maybeAttachFinaleEncounter,
  maybeOpenFinaleNightEvent,
  maybeEscalateFinaleAnomaly,
  getFinaleCommandCatalog,
  applyFinaleCommandDecision
} from './finaleEvents.js';
import { buildRunEndingPackage } from './runEndings.js';
import {
  normalizeMetaState,
  loadMetaState,
  saveMetaState,
  getMetaPerkCatalog,
  purchaseMetaPerk,
  setSelectedMetaPerk,
  applySelectedMetaPerkToRunState,
  consumeFirstNightReroll,
  applyRunCompletionMetaRewards,
  registerCampaignFailureMeta,
  buildMetaArchiveSummary
} from './metaProgression.js';
import {
  createDefaultRunSetup,
  getDifficultyCatalog,
  getCampaignModeCatalog,
  getContractCatalog,
  normalizeRunSetup,
  withRunDifficulty,
  withRunCampaignMode,
  toggleRunContract,
  lockRunSetup,
  markRunSetupModifiersApplied,
  buildRunSetupSummary,
  getRunSetupModifierProfile,
  getCampaignLengthFromRunSetup,
} from './runSetup.js';
import {
  loadOnboardingState,
  saveOnboardingState,
  normalizeOnboardingState,
  markTutorialEvent,
  markPanelVisited,
  dismissHint,
  setTutorialEnabled,
  setRunModePreference,
  setHelpOverlayOpen,
  clearPanelIntro,
  buildOnboardingUiModel,
  resetOnboardingState
} from './onboarding.js';
import {
  renderTopbar,
  renderGuests,
  renderRooms,
  renderCameras,
  renderNightEventCard,
  renderNightEventOverlay,
  renderCameraSceneOverlay,
  renderSpecialEncounterOverlay,
  renderLogs,
  renderFailure,
  renderSummary,
  renderNightPrep,
  renderRunEnding,
  renderMainMenuMetaSurface,
  renderHelpOverlay,
  renderSettingsOverlay,
  setActivePanel as setActivePanelUi,
  setActiveScreen as setActiveScreenUi
} from './ui.js';
import './tutorial.js';
import './guestUIEnhancer.js';
import './feedbackSystem.js';
import './pressureEnhancer.js';
import './replaySystem.js';
import './flavorSystem.js';
import './visualEnhancer.js';
import './onboardingGuide.js';
import './silhouetteSystem.js';
import './guestCardRefiner.js';
import './queueDensityManager.js';
import './decisionPresentation.js';
import './runSummaryEnhancer.js';
import './motelIdentityPass.js';
import './mobileUsabilityPass.js';

let state = null;
let metaState = null;
let guestIdCounter = 1;
const audioController = createAudioController();
let runtimeBranchContext = null;
let onboardingState = null;
let activePanelId = 'frontdesk-panel';
let activeScreenId = 'main-menu';
let settingsState = normalizeSettings(loadSettings());
let settingsOverlayOpen = false;
let isScreenTransitionInProgress = false;
const actionLocks = new Set();

// Dev helpers are intentionally isolated from normal release flow.
const DEV_HELPERS_ENABLED = Boolean(window?.__DEM_DEV__);

function persistSettings(nextSettings) {
  settingsState = saveSettings(nextSettings);
  applySettingsToDocument(settingsState);
  return settingsState;
}

function syncAudioWithSettings() {
  const wantsSoundOn = settingsState?.masterSound !== false;
  const isMuted = audioController.isMuted();
  if (wantsSoundOn && isMuted) {
    audioController.toggleMute();
  }
  if (!wantsSoundOn && !isMuted) {
    audioController.toggleMute();
  }
}

function setSettingsOverlayOpen(open) {
  settingsOverlayOpen = Boolean(open);
}

function toggleSettingsOverlay(forceOpen = null) {
  const nextOpen = forceOpen == null ? !settingsOverlayOpen : Boolean(forceOpen);
  if (nextOpen && onboardingState?.helpOverlayOpen) {
    updateOnboarding((current) => setHelpOverlayOpen(current, false));
  }
  setSettingsOverlayOpen(nextOpen);
  renderAll();
}

function updateSetting(key, value) {
  const next = {
    ...settingsState,
    [key]: value
  };
  persistSettings(next);

  if (key === 'tutorialGuidance') {
    updateOnboarding((current) => setTutorialEnabled(current, Boolean(value)));
  }

  if (key === 'masterSound') {
    syncAudioWithSettings();
  }

  renderAll();
}

function confirmIfNeeded(message) {
  if (settingsState?.confirmDestructiveActions === false) return true;
  return window.confirm(message);
}

function updateOnboarding(mutator) {
  const normalized = normalizeOnboardingState(onboardingState);
  const next = typeof mutator === 'function' ? mutator(normalized) : normalized;
  onboardingState = saveOnboardingState(next);
  return onboardingState;
}

function closePersistentOverlaysSilently() {
  if (onboardingState?.helpOverlayOpen) {
    onboardingState = saveOnboardingState(setHelpOverlayOpen(onboardingState, false));
  }
  if (settingsOverlayOpen) {
    setSettingsOverlayOpen(false);
  }
}

function isFinaleUiAllowed(targetState = state) {
  if (!targetState || typeof targetState !== 'object') return false;
  return Boolean(
    isTrueFinalCampaignNight(targetState)
    && targetState?.finaleDirector?.active
    && targetState?.finaleDirector?.trueFinalNight
    && targetState?.finaleUi?.active
  );
}

function clearFinaleUiLeak(targetState = state) {
  if (!targetState || typeof targetState !== 'object') return;
  if (isTrueFinalCampaignNight(targetState)) return;

  if (targetState?.finaleDirector && typeof targetState.finaleDirector === 'object') {
    targetState.finaleDirector.active = false;
    targetState.finaleDirector.trueFinalNight = false;
    targetState.finaleDirector.pressure = 0;
  }
  targetState.finaleUi = null;
  targetState.finaleObjectives = [];
}

function cleanupTransientUiState(reason = 'screen-transition') {
  if (!state || typeof state !== 'object') return;

  closePersistentOverlaysSilently();

  clearCameraScene(state);
  closeNightEventOverlay(state);
  closeSpecialEncounter(state);

  state.nightEventOverlayOpen = false;
  state.activeSpecialEncounterGuestId = null;

  // Finale UI should never leak into non-finale screens/runs.
  clearFinaleUiLeak(state);

  if (reason === 'hard-reset') {
    state.summaryBranchNotes = [];
  }
}

function setActiveScreen(screenId) {
  const nextScreenId = String(screenId || '').trim();
  if (!nextScreenId) return;
  if (isScreenTransitionInProgress && nextScreenId !== activeScreenId) return;

  if (nextScreenId !== activeScreenId) {
    isScreenTransitionInProgress = true;
    cleanupTransientUiState('screen-transition');
  }

  activeScreenId = nextScreenId;
  setActiveScreenUi(nextScreenId);
  isScreenTransitionInProgress = false;
}

function setActivePanel(panelId, options = {}) {
  activePanelId = panelId;
  updateOnboarding((current) => {
    let next = markPanelVisited(current, panelId);
    if (!options?.skipRoomReview && panelId === 'frontdesk-panel' && current?.progress?.deskDecision) {
      next = markTutorialEvent(next, 'room-reviewed');
    }
    return next;
  });
  setActivePanelUi(panelId);
}

function setTutorialMode(mode) {
  updateOnboarding((current) => {
    let next = setRunModePreference(current, mode);
    const allowTutorial = mode === 'guided' ? true : settingsState?.tutorialGuidance !== false;
    next = setTutorialEnabled(next, allowTutorial);
    return next;
  });
}

function toggleHelpOverlay(forceOpen = null) {
  updateOnboarding((current) => {
    const nextOpen = forceOpen == null ? !current.helpOverlayOpen : Boolean(forceOpen);
    return setHelpOverlayOpen(current, nextOpen);
  });
  if ((forceOpen == null ? !onboardingState?.helpOverlayOpen : Boolean(forceOpen)) && settingsOverlayOpen) {
    setSettingsOverlayOpen(false);
  }
  renderAll();
}

function dismissTutorialHint(hintKey) {
  updateOnboarding((current) => dismissHint(current, hintKey));
  renderAll();
}

function disableTutorialGuidance() {
  updateOnboarding((current) => setTutorialEnabled(current, false));
  renderAll();
}

function enableTutorialGuidance() {
  updateOnboarding((current) => setTutorialEnabled(current, true));
  renderAll();
}

function dismissPanelIntroChip() {
  updateOnboarding((current) => clearPanelIntro(current));
  renderAll();
}

function getSelectedMetaPerkLabel(meta = metaState) {
  const perks = getMetaPerkCatalog(meta);
  const selected = perks.find((perk) => perk.selected);
  return selected?.title || 'None';
}

function getMetaSurfaceState() {
  const archive = buildMetaArchiveSummary(metaState);
  const perks = getMetaPerkCatalog(metaState);
  const runSetup = normalizeRunSetup(state?.runSetup || createDefaultRunSetup());
  return {
    metaArchive: archive,
    metaPerks: perks,
    metaSelectedPerkLabel: getSelectedMetaPerkLabel(metaState),
    metaFirstNightRerollAvailable: Boolean(state?.metaRunState?.rerollAvailable && !state?.metaRunState?.rerollUsed),
    runSetup,
    runSetupSummary: buildRunSetupSummary(runSetup),
    runDifficultyCatalog: getDifficultyCatalog(),
    runContractCatalog: getContractCatalog(),
    runCampaignModeCatalog: getCampaignModeCatalog()
  };
}

function saveMetaSafe() {
  metaState = saveMetaState(metaState);
}

function tryRecordCampaignFailureMeta() {
  const result = registerCampaignFailureMeta(metaState, { state });
  metaState = result.meta;
  if (result.recorded) {
    saveMetaSafe();
  }
}

function applyMetaPerkAtRunStart() {
  const alreadyApplied = Boolean(state?.metaRunState?.metaPerkApplied);
  if (alreadyApplied) return;
  const result = applySelectedMetaPerkToRunState(state, metaState);
  state.metaRunState = state.metaRunState && typeof state.metaRunState === 'object' ? state.metaRunState : {};
  state.metaRunState.metaPerkApplied = true;
  if (Array.isArray(result.appliedEffects) && result.appliedEffects.length) {
    state.logs = Array.isArray(state.logs) ? [...state.logs, ...result.appliedEffects] : result.appliedEffects.slice();
  }
}

function clampReputation(value) {
  return Math.max(0, value);
}

function bumpRiskLevel(riskLevel) {
  if (riskLevel === 'Low') return 'Medium';
  if (riskLevel === 'Medium') return 'High';
  return riskLevel || 'Low';
}

function getScenarioModifiers() {
  ensureCrisisNightState(state);
  const scenario = state?.activeScenario || {
    incidentBonus: 0,
    riskBonus: 0,
    chainBonus: 0,
    powerScanPenalty: 0
  };
  const bias = state?.narrativeBias || {};
  const milestoneMods = getMilestoneGameplayModifiers(state);
  const runMods = state?.runModifiers || {};
  const crisis = state?.crisisNight || {};
  const crisisRisk = crisis.active && (crisis.kind === 'guest-surge' || crisis.kind === 'hostile-social-night') ? 1 : 0;
  const crisisChain = crisis.active && (crisis.kind === 'stacked-pressure' || crisis.kind === 'guest-surge') ? 1 : 0;
  const crisisPower = crisis.active && crisis.kind === 'utility-fragility' ? 1 : 0;
  return {
    ...scenario,
    incidentBonus: Math.max(0, Number(scenario.incidentBonus || 0) + Number(milestoneMods.incidentBonus || 0)),
    riskBonus: Math.max(
      0,
      Number(scenario.riskBonus || 0)
      + Number(bias.riskBonus || 0)
      + Number(milestoneMods.riskBonus || 0)
      + Number(runMods.guestRiskBonus || 0)
      + crisisRisk
    ),
    chainBonus: Math.max(0, Number(scenario.chainBonus || 0) + Number(bias.chainBonus || 0) + Number(milestoneMods.chainBonus || 0) + crisisChain),
    powerScanPenalty: Math.max(0, Number(scenario.powerScanPenalty || 0) + Number(bias.powerScanPenalty || 0) + crisisPower),
    eventTriggerBonus: Number(runMods.eventTriggerBonus || 0) + Number(state?.phase2Pressure?.eventFrequencyBoost || 0),
    anomalyChanceBonus: Number(runMods.anomalyChanceBonus || 0)
  };
}

function getRunActionCostMultiplier() {
  const base = Math.max(0.7, Number(state?.runModifiers?.actionCostMult || 1));
  const pressurePenalty = 1 + (Number(state?.phase2Pressure?.difficultyPulse || 0) * 0.06);
  return Math.max(0.7, base * pressurePenalty);
}

function scaleRunActionCost(cost) {
  return Math.max(1, Math.round(Number(cost || 0) * getRunActionCostMultiplier()));
}

function applyRunSetupStartModifiers() {
  const setup = normalizeRunSetup(state?.runSetup || createDefaultRunSetup());
  if (setup.modifiersApplied) return;
  const mods = state?.runModifiers || getRunSetupModifierProfile(setup);
  if (Number(mods.startMoneyDelta || 0) !== 0) {
    state.money = Math.max(0, Number(state.money || 0) + Number(mods.startMoneyDelta || 0));
  }
  if (Number(mods.restoreChargesDelta || 0) !== 0) {
    const nextCharges = Number(state?.powerEconomy?.restoreCharges || 0) + Number(mods.restoreChargesDelta || 0);
    state.powerEconomy.restoreCharges = Math.max(0, nextCharges);
  }
  state.runSetup = markRunSetupModifiersApplied(setup);
  state.runModifiers = getRunSetupModifierProfile(state.runSetup);
  state.runSetupSummary = buildRunSetupSummary(state.runSetup);
}

function setRunDifficultyFromMenu(difficultyId) {
  state.runSetup = withRunDifficulty(state?.runSetup || createDefaultRunSetup(), difficultyId);
  state.runModifiers = getRunSetupModifierProfile(state.runSetup);
  state.runSetupSummary = buildRunSetupSummary(state.runSetup);
  renderAll();
}

function setRunCampaignModeFromMenu(modeId) {
  state.runSetup = withRunCampaignMode(state?.runSetup || createDefaultRunSetup(), modeId);
  state.runModifiers = getRunSetupModifierProfile(state.runSetup);
  state.runSetupSummary = buildRunSetupSummary(state.runSetup);
  state.campaign = state.campaign && typeof state.campaign === 'object' ? state.campaign : {};
  state.campaign.length = getCampaignLengthFromRunSetup(state.runSetup);
  state = normalizeCampaignState(state);
  renderAll();
}

function toggleRunContractFromMenu(contractId) {
  state.runSetup = toggleRunContract(state?.runSetup || createDefaultRunSetup(), contractId);
  state.runModifiers = getRunSetupModifierProfile(state.runSetup);
  state.runSetupSummary = buildRunSetupSummary(state.runSetup);
  renderAll();
}

function normalizeRunMemoryState() {
  state = normalizeStoryThreadState(state);
  state = normalizeCarryoverState(state);
  state = normalizeContentDirectorState(state);
  state.carryoverBriefing = buildIncomingNightNotes(state, Number(state?.night || 1));
}

function getBranchContext(refresh = false) {
  if (!state) return null;
  if (!runtimeBranchContext || refresh) {
    const context = getRunBranchingContext(state);
    const milestoneMods = getMilestoneGameplayModifiers(state);
    const signalBoost = Number(milestoneMods.directorSignalBoost || 0);
    const adjustedSignals = { ...(context?.signals || {}) };
    if (signalBoost > 0) {
      Object.keys(adjustedSignals).forEach((key) => {
        adjustedSignals[key] = Math.max(0, Math.min(10, Number(adjustedSignals[key] || 0) + signalBoost));
      });
    }
    runtimeBranchContext = {
      ...context,
      signals: adjustedSignals,
      eventChanceBonus: Number(context?.eventChanceBonus || 0) + Number(milestoneMods.eventChanceBonus || 0),
      specialEncounterChanceBonus:
        Number(context?.specialEncounterChanceBonus || 0) + Number(milestoneMods.specialEncounterChanceBonus || 0),
      anomalyChanceBonus: Number(context?.anomalyChanceBonus || 0) + Number(milestoneMods.anomalyChanceBonus || 0),
      prepNotes: [
        ...(Array.isArray(context?.prepNotes) ? context.prepNotes : []),
        ...getMilestoneSupportNotes(state)
      ].slice(0, 5)
    };
  }
  return runtimeBranchContext;
}

function normalizeCampaignSystems() {
  state.campaign = state.campaign && typeof state.campaign === 'object' ? state.campaign : {};
  state.campaign.length = getCampaignLengthFromRunSetup(state.runSetup);
  state = normalizeCampaignState(state);
  state = normalizeFinaleDirectorState(state);
  state.runEnding = state?.runEnding && typeof state.runEnding === 'object' ? state.runEnding : null;
  state.pendingRunCompletion = Boolean(state?.pendingRunCompletion);
  state.campaignSummaryNotes = Array.isArray(state?.campaignSummaryNotes) ? state.campaignSummaryNotes : [];
  state.finalePerformance = state?.finalePerformance && typeof state.finalePerformance === 'object'
    ? state.finalePerformance
    : null;
  state.metaRunState = state?.metaRunState && typeof state.metaRunState === 'object'
    ? state.metaRunState
    : {};
  state.metaRunState.metaPerkApplied = Boolean(state.metaRunState.metaPerkApplied);
  state.metaRunState.rerollAvailable = Boolean(state.metaRunState.rerollAvailable);
  state.metaRunState.rerollUsed = Boolean(state.metaRunState.rerollUsed);
  state.metaRunState.clueBoost = Boolean(state.metaRunState.clueBoost);
  state.runSetup = normalizeRunSetup(state?.runSetup || createDefaultRunSetup());
  state.runModifiers = getRunSetupModifierProfile(state.runSetup);
  state.runSetupSummary = buildRunSetupSummary(state.runSetup);
  state.finaleObjectives = Array.isArray(state?.finaleObjectives) ? state.finaleObjectives : [];
  state.finaleUi = state?.finaleUi && typeof state.finaleUi === 'object' ? state.finaleUi : null;
  clearFinaleUiLeak(state);
}

function syncFinaleStateForNight(options = {}) {
  state = normalizeFinaleDirectorState(state);
  const activated = activateFinaleDirector(state);
  if (activated?.active && Array.isArray(activated.logs)) {
    state.logs.push(...activated.logs);
  }
  if (activated?.active && Array.isArray(activated.alerts)) {
    activated.alerts.forEach((message, index) => {
      pushLiveAlert(state, {
        type: 'warning',
        kind: 'actionable',
        message,
        dedupeKey: `finale-activation-${state.night}-${index}`
      });
    });
  }
  state.finaleObjectives = buildFinaleObjectives(state);
  state.finaleUi = buildFinaleUiState(state);
  if (options?.refreshBranch) {
    runtimeBranchContext = null;
    getBranchContext(true);
  }
  ensureCrisisNightState(state);
}

function getCampaignContext() {
  normalizeCampaignSystems();
  ensureCrisisNightState(state);
  const progress = getCampaignProgress(state);
  const currentMilestone = getMilestoneMeta(progress.currentNight, state.campaign);
  const nextMilestone = getMilestoneMeta(Math.min(progress.currentNight + 1, progress.totalNights), state.campaign);
  return {
    progress,
    currentMilestone,
    nextMilestone,
    prepForecast: [
      ...getPrepForecastNotes(state),
      ...(state?.crisisNight?.active ? [state.crisisNight.note] : [])
    ].slice(0, 5)
  };
}

function showRunEndingScreen() {
  cleanupTransientUiState('run-ending');
  if (!state?.runEnding) {
    state.runEnding = buildRunEndingPackage(buildRenderState());
  }
  const metaSurface = getMetaSurfaceState();
  state.runEnding.metaArchive = metaSurface.metaArchive;
  if (!state.runEnding.metaReward && metaState?.lastRunReward) {
    state.runEnding.metaReward = metaState.lastRunReward;
  }
  renderRunEnding(state.runEnding);
  setActiveScreen('run-ending-screen');
}

function normalizeIdentitySystems() {
  state = normalizeDoctrineState(state);
  state = normalizeFactionState(state);
  state.summaryIdentityLines = Array.isArray(state.summaryIdentityLines) ? state.summaryIdentityLines : [];
}

function getIdentityContext() {
  normalizeIdentitySystems();
  return {
    doctrine: getDoctrineDisplay(state.doctrine),
    doctrineMods: getDoctrineModifiers(state.doctrine),
    factionClimate: getFactionClimateSummary(state.factions),
    factionMods: getFactionModifiers(state.factions),
    prepFactionNotes: buildPrepFactionNotes(state.factions, 3),
    primaryFactionSignal: getPrimaryFactionSignal(state.factions)
  };
}

function applyIdentityImpact({ doctrine = null, factions = null, stats = null, reason = '' } = {}) {
  if (doctrine) {
    recordDoctrineInfluence(state, { deltas: doctrine, reason });
  }
  if (factions) {
    applyFactionDelta(state, factions);
  }
  if (stats && typeof stats === 'object') {
    Object.entries(stats).forEach(([key, delta]) => {
      if (typeof delta !== 'number' || !delta) return;
      state.shiftStats[key] = (state.shiftStats[key] || 0) + delta;
    });
  }
}

function applyScenarioRiskToGuest(guest) {
  const scenario = getScenarioModifiers();
  const riskBonus = Number(scenario.riskBonus || 0);

  if (!riskBonus || !guest) {
    return guest;
  }

  let updatedGuest = { ...guest };
  for (let i = 0; i < riskBonus; i += 1) {
    if (updatedGuest.riskLevel === 'High') break;
    if (Math.random() < 0.22) {
      updatedGuest = {
        ...updatedGuest,
        riskLevel: bumpRiskLevel(updatedGuest.riskLevel)
      };
    }
  }

  return updatedGuest;
}

function getSeverityPoints(value) {
  if (typeof value === 'number') return value;
  if (value === 'high') return 3;
  if (value === 'medium') return 2;
  return 1;
}

function appendUniqueLogs(lines = []) {
  (Array.isArray(lines) ? lines : []).forEach((line) => {
    if (!line) return;
    if (!state.logs.includes(line)) {
      state.logs.push(line);
    }
  });
}

function cloneSerializable(value) {
  try {
    return JSON.parse(JSON.stringify(value));
  } catch (_) {
    return null;
  }
}

function captureNightStartSnapshot(reason = 'night-open') {
  if (!state || typeof state !== 'object') return;
  const snapshotBase = { ...state };
  delete snapshotBase.nightStartSnapshot;
  delete snapshotBase.nightStartSnapshotReason;
  const snapshotState = cloneSerializable(snapshotBase);
  if (!snapshotState) return;
  state.nightStartSnapshot = {
    night: Math.max(1, Number(state?.night || 1)),
    guestIdCounter: Math.max(1, Number(guestIdCounter || 1)),
    state: snapshotState
  };
  state.nightStartSnapshotReason = reason;
  state.logs.push(`Snapshot saved: opening state for Night ${state.night} captured (${reason}).`);
}

function restoreNightStartSnapshot(options = {}) {
  const snapshot = state?.nightStartSnapshot;
  if (!snapshot?.state) {
    pushLiveAlert(state, {
      type: 'warning',
      message: 'No opening-night snapshot is available for reset.',
      dedupeKey: `reset-missing-${state?.night || 1}`
    });
    renderAll();
    return false;
  }

  const restoredState = cloneSerializable(snapshot.state);
  if (!restoredState) {
    pushLiveAlert(state, {
      type: 'warning',
      message: 'Night reset failed safely because the restore snapshot was invalid.',
      dedupeKey: `reset-invalid-${state?.night || 1}`
    });
    renderAll();
    return false;
  }

  state = restoredState;
  guestIdCounter = Math.max(1, Number(snapshot.guestIdCounter || 1));
  state.failedState = null;
  state = normalizeRoomMemoryState(state);
  state.guests = Array.isArray(state.guests) ? state.guests : [];
  state.guests = normalizeGuestFlags(state.guests);
  state.guests = normalizePolicyGuests(state.guests, state.night);
  state.guests = state.guests.map((guest) => {
    const normalizedGuest = normalizeGuestArchetype(guest);
    const readyGuest = normalizedGuest.archetypeKey
      ? normalizedGuest
      : assignArchetypeToGuest(normalizedGuest, state);
    return Number(readyGuest?.expectedStayNights || 0) > 0
      ? readyGuest
      : { ...readyGuest, expectedStayNights: computeStayNightsForGuest(readyGuest) };
  });
  state.rooms = normalizeEscalationRooms(applyRoomUnlockFlags(state.rooms || [], state.night));
  state.rooms = normalizeResponseRooms(state.rooms);
  state.rooms = normalizeTacticalRooms(state.rooms);
  state.shiftStats = normalizeShiftStats(state.shiftStats);
  state = normalizeNightCycleState(state);
  state = normalizePowerEconomyState(state);
  state = normalizeCameraSceneState(state);
  state = normalizeLocationState(state);
  state = normalizePresentationState(state);
  state = normalizeSpecialEncounterState(state);
  state = normalizeNightEventState(state);
  state = normalizeDeskConsequenceState(state);
  normalizeIdentitySystems();
  normalizeRunMemoryState();
  normalizeCampaignSystems();
  refreshProgressionDerivedState();
  normalizeIntakeState(state);
  normalizeAdminSpamState(state);
  state.deferredShiftCosts = Array.isArray(state.deferredShiftCosts) ? state.deferredShiftCosts : [];
  runtimeBranchContext = null;
  syncFinaleStateForNight({ refreshBranch: true });
  cleanupTransientUiState('restart-night');
  pushLiveAlert(state, {
    type: 'info',
    message: options.message || `Night ${state.night} restored to opening conditions.`,
    dedupeKey: `reset-restored-${state.night}-${Date.now()}`
  });
  state.logs.push(`Night ${state.night} restored to opening-night state from snapshot.`);
  captureNightStartSnapshot('restored-opening');
  renderAll();
  setActiveScreen('game-screen');
  setActivePanel('frontdesk-panel');
  return true;
}

function pushOpeningTensionBeat(context = 'opening') {
  const night = Math.max(1, Number(state?.night || 1));
  const occupiedCarryovers = (state?.rooms || []).filter((room) => room?.occupiedBy).length;
  let alertMessage = '';
  let logLine = '';

  if (occupiedCarryovers > 0) {
    alertMessage = `${occupiedCarryovers} occupied room${occupiedCarryovers === 1 ? '' : 's'} carried over into tonight. Continuity pressure starts immediately.`;
    logLine = 'Opening tension: last night did not fully leave the property. Occupied rooms are carrying weight into this shift.';
  } else if (night <= 2) {
    alertMessage = 'Opening tension: the property feels wrong before the first arrival even reaches the desk.';
    logLine = 'Opening tension: the lobby hum sits a little too low and empty hallways already feel watched.';
  } else {
    alertMessage = 'Opening tension: early shift drift is already visible. Small mistakes are likely to echo farther tonight.';
    logLine = 'Opening tension: the motel opens under a thin layer of strain; early reads and first decisions will matter more than usual.';
  }

  state.logs.push(logLine);
  pushLiveAlert(state, {
    type: context === 'carryover' || occupiedCarryovers > 0 ? 'warning' : 'info',
    message: alertMessage,
    dedupeKey: `opening-tension-${state.night}-${context}`
  });
}

function normalizeRoomMemoryState(targetState = state) {
  if (!targetState || typeof targetState !== 'object') return targetState;
  const rooms = Array.isArray(targetState.rooms) ? targetState.rooms : [];
  targetState.rooms = rooms.map((room) => {
    const memory = room?.memory && typeof room.memory === 'object' ? room.memory : {};
    return {
      ...room,
      memory: {
        nightsOccupied: Math.max(0, Number(memory.nightsOccupied || 0)),
        incidentsSeen: Math.max(0, Number(memory.incidentsSeen || 0)),
        harshActions: Math.max(0, Number(memory.harshActions || 0)),
        returningGuestVisits: Math.max(0, Number(memory.returningGuestVisits || 0)),
        signatures: Array.isArray(memory.signatures) ? memory.signatures.slice(-4) : [],
        note: String(memory.note || '')
      }
    };
  });
  return targetState;
}

function markRoomMemory(roomId, payload = {}) {
  const idx = state.rooms.findIndex((room) => room.id === roomId);
  if (idx === -1) return;
  const room = state.rooms[idx];
  const memory = room?.memory && typeof room.memory === 'object'
    ? { ...room.memory }
    : { nightsOccupied: 0, incidentsSeen: 0, harshActions: 0, returningGuestVisits: 0, signatures: [], note: '' };
  memory.nightsOccupied = Math.max(0, Number(memory.nightsOccupied || 0) + Number(payload.nightsOccupied || 0));
  memory.incidentsSeen = Math.max(0, Number(memory.incidentsSeen || 0) + Number(payload.incidentsSeen || 0));
  memory.harshActions = Math.max(0, Number(memory.harshActions || 0) + Number(payload.harshActions || 0));
  memory.returningGuestVisits = Math.max(0, Number(memory.returningGuestVisits || 0) + Number(payload.returningGuestVisits || 0));
  if (payload.signature) {
    memory.signatures = [...(Array.isArray(memory.signatures) ? memory.signatures : []), String(payload.signature)].slice(-4);
  }
  if (payload.note) {
    memory.note = String(payload.note);
  }
  state.rooms[idx] = {
    ...room,
    memory
  };
}

function getRoomMemoryPressureBonus(room) {
  const memory = room?.memory || {};
  return Math.max(
    0,
    Number(memory.incidentsSeen || 0)
    + Number(memory.harshActions || 0)
    + Math.max(0, Number(memory.returningGuestVisits || 0) - 1)
  );
}

function ensureCrisisNightState(targetState = state) {
  if (!targetState || typeof targetState !== 'object') return targetState;
  const night = Math.max(1, Number(targetState?.night || 1));
  const existing = targetState.crisisNight && typeof targetState.crisisNight === 'object' ? targetState.crisisNight : {};
  if (existing.night === night && existing.kind) return targetState;
  const options = ['stacked-pressure', 'guest-surge', 'utility-fragility', 'hostile-social-night'];
  const chance = night >= 4 ? Math.min(0.35, 0.08 + (night - 3) * 0.045) : 0;
  const active = Math.random() < chance;
  const kind = active ? options[(night + Math.floor(Math.random() * options.length)) % options.length] : null;
  const title =
    kind === 'stacked-pressure'
      ? 'Crisis Night: Pressure Stack'
      : kind === 'guest-surge'
        ? 'Crisis Night: Guest Surge'
        : kind === 'utility-fragility'
          ? 'Crisis Night: Utility Fragility'
          : kind === 'hostile-social-night'
            ? 'Crisis Night: Hostile Social Atmosphere'
            : '';
  const note =
    kind === 'stacked-pressure'
      ? 'Multiple systems are likely to overlap tonight; mistakes will stack instead of staying local.'
      : kind === 'guest-surge'
        ? 'Desk pressure and room stress are likely to spike together.'
        : kind === 'utility-fragility'
          ? 'Small faults are more likely to spread across rooms and power decisions.'
          : kind === 'hostile-social-night'
            ? 'Guests are more reactive, rumors travel faster, and containment will read harsher.'
            : '';
  targetState.crisisNight = {
    active,
    night,
    kind,
    title,
    note
  };
  return targetState;
}

function buildNightIdentitySummary(targetState = state) {
  const scenario = targetState?.activeScenario || {};
  const crisis = targetState?.crisisNight || {};
  const tags = [];
  if (scenario.label) tags.push(`Scenario: ${scenario.label}`);
  if (crisis.active && crisis.title) tags.push(crisis.title);
  if (Number(targetState?.night || 1) <= 2) tags.push('Mood: quiet but wrong');
  if ((targetState?.rooms || []).some((room) => Number(room?.memory?.incidentsSeen || 0) >= 2)) {
    tags.push('Mood: remembered room pressure');
  }
  return tags.slice(0, 3).join(' • ');
}

function normalizeIntakeState(targetState = state) {
  if (!targetState || typeof targetState !== 'object') return targetState;
  if (!targetState.intake || typeof targetState.intake !== 'object') {
    targetState.intake = {};
  }
  targetState.intake.queueCap = Math.max(2, Number(targetState.intake.queueCap) || 3);
  if (typeof targetState.intake.arrivalsRemaining !== 'number' || Number.isNaN(targetState.intake.arrivalsRemaining)) {
    targetState.intake.arrivalsRemaining = computeArrivalBudgetForNight(targetState);
  }
  return targetState;
}

function computeArrivalBudgetForNight(s) {
  const night = Math.max(1, Number(s?.night || 1));
  const full = String(s?.runSetup?.campaignMode || '') === 'full';
  return Math.min(12, 3 + night + (full ? 2 : 0));
}

function refreshIntakeBudgetForNight(targetState = state) {
  if (!targetState || typeof targetState !== 'object') return targetState;
  targetState.intake = targetState.intake && typeof targetState.intake === 'object' ? targetState.intake : {};
  targetState.intake.arrivalsRemaining = computeArrivalBudgetForNight(targetState);
  targetState.intake.queueCap = 3;
  return targetState;
}

function normalizeAdminSpamState(targetState = state) {
  if (!targetState || typeof targetState !== 'object') return targetState;
  if (!targetState.adminSpam || typeof targetState.adminSpam !== 'object') {
    targetState.adminSpam = { reviewLowValueStreak: 0, dispatchEmptyStreak: 0 };
  }
  return targetState;
}

function tickDeferredShiftCosts() {
  if (!Array.isArray(state.deferredShiftCosts) || !state.deferredShiftCosts.length) return;
  const kept = [];
  state.deferredShiftCosts.forEach((entry) => {
    const turns = Math.max(0, Number(entry.turnsRemaining || 0) - 1);
    if (turns <= 0) {
      const dr = Number(entry.reputationDelta || 0);
      if (dr) state.reputation = clampReputation(state.reputation + dr);
      if (entry.logLine) state.logs.push(entry.logLine);
      if (dr < 0 || entry.logLine) {
        pushLiveAlert(state, {
          type: dr < 0 ? 'warning' : 'info',
          message: entry.logLine || 'A delayed operational consequence just landed.',
          dedupeKey: `deferred-cost-${entry.id || 'x'}-${state.night}-${state.shiftElapsedMinutes}`
        });
      }
    } else {
      kept.push({ ...entry, turnsRemaining: turns });
    }
  });
  state.deferredShiftCosts = kept;
}

function queueDeferredShiftCost(payload = {}) {
  state.deferredShiftCosts = Array.isArray(state.deferredShiftCosts) ? state.deferredShiftCosts : [];
  state.deferredShiftCosts.push({
    id: payload.id || `dfc-${Date.now()}-${Math.floor(Math.random() * 9999)}`,
    turnsRemaining: Math.max(1, Number(payload.turnsRemaining || 2)),
    reputationDelta: Number(payload.reputationDelta || 0),
    logLine: String(payload.logLine || '')
  });
}

function registerRoomChainSignal(payload = {}) {
  const room = state.rooms.find((entry) => String(entry.id) === String(payload.roomId));
  if (!room?.occupiedBy) return null;

  const scenario = getScenarioModifiers();
  const severity =
    Math.max(1, getSeverityPoints(payload.severity || 1)) +
    Math.max(0, Number(scenario.chainBonus || 0)) +
    Math.max(0, Number(room.occupantChainBias || 0)) +
    Math.max(0, Number(payload.extraBias || 0));

  const chain = registerChainSignal(state, {
    roomId: room.id,
    guestName: payload.guestName || room.occupiedBy,
    type: payload.type,
    severity
  });

  if (!chain) return null;

  const roomPressureLogs = applyChainPressureToRoom(state, chain);
  appendUniqueLogs(roomPressureLogs);
  return chain;
}

function calmRoomChain(roomId, amount = 2) {
  if (roomId == null) return;
  calmChainForRoom(state, roomId, amount);
}

function buildRenderState() {
  const uiPressureLevel = deriveUiPressureLevel(state);
  const identity = getIdentityContext();
  const branchContext = getBranchContext(true);
  const campaign = getCampaignContext();
  const metaSurface = getMetaSurfaceState();
  const onboardingUi = buildOnboardingUiModel(state, onboardingState, {
    activePanelId,
    activeScreenId
  });

  const roomsWithChainPressure = (state.rooms || []).map((room) => ({
    ...room,
    chainPressure: getVisibleChainPressureForRoom(state, room.id)
  }));

  return {
    ...state,
    onInvestigateCamera: investigateCameraZone,
    onCameraSceneAction: handleCameraSceneAction,
    onCloseCameraScene: closeCameraScene,
    onRespondNightEvent: handleRespondNightEvent,
    onCloseNightEvent: handleCloseNightEvent,
    onNightEventChoice: handleNightEventChoice,
    onHandleSpecialEncounter: handleOpenSpecialEncounter,
    onCloseSpecialEncounter: handleCloseSpecialEncounter,
    onSpecialEncounterChoice: handleSpecialEncounterChoice,
    onFinaleCommandChoice: handleFinaleCommandChoice,
    onToggleHelpOverlay: toggleHelpOverlay,
    onDismissTutorialHint: dismissTutorialHint,
    onDisableTutorialGuidance: disableTutorialGuidance,
    onEnableTutorialGuidance: enableTutorialGuidance,
    onDismissPanelIntro: dismissPanelIntroChip,
    onSetTutorialMode: setTutorialMode,
    onToggleSettingsOverlay: toggleSettingsOverlay,
    onUpdateSetting: updateSetting,
    audioMuted: audioController.isMuted(),
    settings: settingsState,
    settingsOverlayOpen,
    settingsStorageHealthy: Boolean(settingsState?.__storageLoaded),
    activeUpgradeSummary: buildActiveUpgradeSummary(state),
    uiPressureLevel,
    topbarWarningFlags: getTopbarWarningFlags(state),
    rooms: roomsWithChainPressure,
    activeRunThreads: buildActiveRunThreadHighlights(state, 3),
    carryoverBriefingNotes: Array.isArray(state.carryoverBriefing) ? state.carryoverBriefing : [],
    doctrineDisplay: identity.doctrine,
    factionClimate: identity.factionClimate,
    prepFactionNotes: identity.prepFactionNotes,
    primaryFactionSignal: identity.primaryFactionSignal,
    summaryIdentityLines: Array.isArray(state.summaryIdentityLines) ? state.summaryIdentityLines : [],
    directorBriefingNotes: Array.isArray(branchContext?.prepNotes) ? branchContext.prepNotes : [],
    directorShiftHint: branchContext?.shiftHint || '',
    summaryBranchNotes: Array.isArray(state?.summaryBranchNotes) ? state.summaryBranchNotes : [],
    finaleUi: isFinaleUiAllowed(state) ? state.finaleUi : null,
    finaleObjectives: isFinaleUiAllowed(state) && Array.isArray(state?.finaleObjectives) ? state.finaleObjectives : [],
    finaleCommandOptions: isFinaleUiAllowed(state) ? getFinaleCommandCatalog(state) : [],
    campaignProgress: campaign.progress,
    campaignMilestone: campaign.currentMilestone,
    campaignNextMilestone: campaign.nextMilestone,
    campaignPrepForecast: [...(campaign.prepForecast || []), ...buildFinaleForeshadowNotes(state)].slice(0, 5),
    campaignSummaryNotes: Array.isArray(state?.campaignSummaryNotes) ? state.campaignSummaryNotes : [],
    crisisNight: state?.crisisNight || null,
    nightIdentityLine: buildNightIdentitySummary(state),
    motelCapacityLine: `Rooms licensed tonight: ${getUnlockedRoomCapForNight(state.night)} / 6`,
    intakeStatusLine: `Arrivals left: ${Math.max(0, Number(state?.intake?.arrivalsRemaining ?? 0))} • Desk queue cap: ${Math.max(0, Number(state?.intake?.queueCap ?? 3))} (${(state.guests || []).length} waiting)`,
    runEnding: state?.runEnding || null,
    onboardingUi,
    ...metaSurface
  };
}

function refreshProgressionDerivedState() {
  state = normalizeProgressionState(state);
  state.progressionModifiers = getProgressionModifiers(state);
}

function getRestoreConfig() {
  const mods = state?.progressionModifiers || {};
  const night = Math.max(1, Number(state?.night || 1));
  const finaleNight = Boolean(state?.finaleDirector?.trueFinalNight);
  const nightCostDelta = night <= 2 ? -2 : night >= 5 ? 3 : night >= 4 ? 1 : 0;
  const nightCooldownDelta = night <= 2 ? -1 : 0;
  const finaleCostDelta = finaleNight ? 1 : 0;
  return {
    restoreCost: Math.max(1, 15 + nightCostDelta + finaleCostDelta + Number(mods.restoreCostDelta || 0)),
    restoreCooldown: Math.max(0, 2 + nightCooldownDelta + Number(mods.restoreCooldownDelta || 0))
  };
}

function registerPanicSpend() {
  state.shiftStats.panicSpendingMoments = (state.shiftStats.panicSpendingMoments || 0) + 1;
}

function buildShiftPressureSnapshot(summary = null) {
  const stats = state?.shiftStats || {};
  const positives = [];
  const negatives = [];

  if (Number(stats.policyFollowed || 0) >= 2) positives.push('Policy discipline held under pressure');
  if (Number(stats.strongContainmentActions || 0) >= 2) positives.push('Containment calls prevented wider collapse');
  if (Number(stats.nightEventsResolved || 0) >= 1) positives.push('Active event responses landed cleanly');
  if (Number(stats.threadsAdvancedCleanly || 0) >= 1) positives.push('Recurring thread pressure was stabilized');
  if (Number(state?.power || 0) >= 55) positives.push('Power economy stayed workable');

  if (Number(stats.unresolvedLocationScenes || 0) >= 2) negatives.push('Too many unresolved location problems persisted');
  if (Number(stats.nightEventsMissed || 0) >= 2) negatives.push('Event misses created avoidable chain strain');
  if (Number(stats.policyBroken || 0) >= 2) negatives.push('Policy overrides drove costly instability');
  if (Number(state?.power || 0) <= 30) negatives.push('Power floor collapsed into danger range');
  if (Number(stats.panicSpendingMoments || 0) >= 2) negatives.push('Panic spending reduced late-shift options');

  const pressureScores = [
    {
      tag: 'Location chains',
      score: Number(stats.unresolvedLocationScenes || 0) * 2 + Number(stats.escalatedLocationIssues || 0)
    },
    {
      tag: 'Event volatility',
      score: Number(stats.nightEventsMissed || 0) * 2 + Number(stats.autoIncidents || 0)
    },
    {
      tag: 'Power strain',
      score: Math.max(0, 35 - Number(state?.power || 0)) * 0.08 + Number(stats.majorPowerIncidents || 0)
    },
    {
      tag: 'Policy drift',
      score: Number(stats.policyBroken || 0) * 1.6 + Number(stats.forcedCompromises || 0)
    },
    {
      tag: 'Finale surge',
      score: Number(state?.finaleDirector?.trueFinalNight ? state?.finaleDirector?.pressurePeak || 0 : 0)
    }
  ];

  const dominantPressureTag = pressureScores.sort((a, b) => b.score - a.score)[0]?.tag || 'Mixed pressure';

  return {
    score: Number(summary?.score || 0),
    grade: summary?.grade || 'C',
    positives: positives.slice(0, 3),
    negatives: negatives.slice(0, 3),
    dominantPressureTag
  };
}

function applyDeskPolicyPenaltyProtection(delta = 0) {
  if (delta >= 0) return delta;
  const reduction = Math.max(0, Number(state?.progressionModifiers?.deskPolicyPenaltyReduction || 0));
  return Math.min(0, delta + reduction);
}

function applyTacticalPenaltyAdjustments(delta = 0) {
  if (delta >= 0) return delta;
  const multiplier = Math.max(0.65, Number(state?.progressionModifiers?.tacticalPenaltyMult || 1));
  return Math.round(delta * multiplier);
}

function maybeApplyTacticalStabilization(roomId) {
  const stabilizeChance = Math.max(0, Number(state?.progressionModifiers?.tacticalStabilizeChance || 0));
  if (!roomId || stabilizeChance <= 0 || Math.random() > stabilizeChance) return;
  calmRoomChain(roomId, 1 + Math.max(0, Number(state?.progressionModifiers?.tacticalChainCalmBonus || 0)));
  const roomIndex = state.rooms.findIndex((room) => room.id === roomId);
  if (roomIndex >= 0 && state.rooms[roomIndex]?.condition === 'Critical') {
    state.rooms[roomIndex] = {
      ...state.rooms[roomIndex],
      condition: 'Watch'
    };
  }
  state.logs.push('Stabilization protocol reduced tactical fallout in the targeted zone.');
}

function applyNightEventPressureEffects(effects = {}, context = 'event') {
  const pulse = Number(effects.chainPulse || 0);
  const incidentPulse = Number(effects.incidentBiasPulse || 0);
  const totalPulse = Math.max(0, pulse + incidentPulse);

  if (totalPulse > 0) {
    const occupied = (state.rooms || []).filter((room) => room?.occupiedBy);
    occupied.slice(0, Math.max(1, Math.min(2, totalPulse))).forEach((room) => {
      registerRoomChainSignal({
        roomId: room.id,
        guestName: room.occupiedBy,
        type: `night-event-${context}`,
        severity: Math.max(1, totalPulse)
      });
    });
  }

  if (effects.roomConditionDrop) {
    const roomIndex = state.rooms.findIndex((room) => room?.occupiedBy && room?.condition !== 'Critical');
    if (roomIndex >= 0) {
      const room = state.rooms[roomIndex];
      state.rooms[roomIndex] = {
        ...room,
        condition: room.condition === 'Stable' ? 'Watch' : 'Critical'
      };
    }
  }
}

function applyFrontDeskClueUpgrade(guest) {
  if (!guest || (!state?.progressionModifiers?.frontDeskClueReveal && !state?.metaRunState?.clueBoost)) return guest;
  const clueSeed = guest.hiddenIntent || guest.policyRecommendation || guest.riskLevel || 'Unknown';
  const clueText = `Desk clue: subtle pattern suggests ${String(clueSeed).toLowerCase()} behavior.`;
  return {
    ...guest,
    riskNote: `${guest.riskNote || ''} ${clueText}`.trim()
  };
}

function applyQueuedDeskConsequences() {
  const tickResult = tickDeskConsequences(state);
  const triggered = Array.isArray(tickResult?.triggered) ? tickResult.triggered : [];
  if (!triggered.length) return;

  triggered.forEach((entry, index) => {
    if (entry?.logLine) {
      state.logs.push(entry.logLine);
    }
    if (entry?.teachLine) {
      state.logs.push(entry.teachLine);
    }

    const repDelta = Number(entry?.reputationDelta || 0);
    if (repDelta !== 0) {
      state.reputation = clampReputation(state.reputation + repDelta);
    }

    const chainSeverity = Number(entry?.chainSeverity || 0);
    if (chainSeverity > 0 && entry?.roomId != null) {
      state.logs.push(
        `Chain reaction: an earlier desk call added ${chainSeverity} pressure near ${entry.zoneLabel || `Room ${entry.roomId}`}.`
      );
      registerRoomChainSignal({
        roomId: entry.roomId,
        type: `desk-followup-${entry.type || 'thread'}`,
        severity: Math.max(1, chainSeverity)
      });
    }
    if (chainSeverity < 0 && entry?.roomId != null) {
      state.logs.push(
        `Chain reaction interrupted: earlier monitoring cooled ${entry.zoneLabel || `Room ${entry.roomId}`}.`
      );
      calmRoomChain(entry.roomId, Math.max(1, Math.abs(chainSeverity)));
    }

    if (entry?.alert) {
      pushLiveAlert(state, {
        type: chainSeverity > 0 ? 'warning' : 'info',
        message: entry.alert,
        dedupeKey: `desk-consequence-${state.night}-${state.shiftElapsedMinutes}-${index}-${entry.id || entry.type || 'x'}`
      });
    }

    const statKey = String(entry?.statKey || '').trim();
    if (statKey) {
      state.shiftStats[statKey] = Number(state.shiftStats[statKey] || 0) + 1;
    }
  });
}

function queueDeskConsequenceForAction(action, guest, room = null, policyResult = 'neutral') {
  const result = queueDeskFollowupForDecision(state, {
    action,
    guest,
    room,
    policyResult
  });
  if (!result?.queued) return;

  state.shiftStats.deskConsequencesQueued = Number(state.shiftStats.deskConsequencesQueued || 0) + 1;
}

function renderNightPrepScreen() {
  const upgrades = getUpgradeCatalog(state);
  renderNightPrep(buildRenderState(), upgrades, purchasePrepUpgrade);
}

function purchasePrepUpgrade(upgradeId) {
  onMeaningfulAction();
  audioController.playUiClick();
  const result = purchaseUpgrade(state, upgradeId);
  if (!result.ok) {
    pushLiveAlert(state, {
      type: 'warning',
      message: result.reason || 'Upgrade purchase failed.',
      dedupeKey: `prep-upgrade-failed-${upgradeId}-${state.night}`
    });
    renderNightPrepScreen();
    renderAll();
    return;
  }

  refreshProgressionDerivedState();
  state.logs.push(`Prep invested: ${result.upgrade.title} purchased for $${result.upgrade.cost}.`);
  pushLiveAlert(state, {
    type: 'success',
    message: `${result.upgrade.title} is now active for this run.`,
    dedupeKey: `prep-upgrade-owned-${result.upgrade.id}`
  });
  renderNightPrepScreen();
  renderAll();
}

function openNightPrepFromSummary() {
  if (activeScreenId !== 'summary-screen') return;
  onMeaningfulAction();
  audioController.playUiClick();
  if (state?.pendingRunCompletion) {
    showRunEndingScreen();
    return;
  }
  setNightPrepVisited(state, true);
  renderNightPrepScreen();
  renderAll();
  setActiveScreen('night-prep-screen');
}

function getRoomForCameraZone(zoneId) {
  return state.rooms.find((room) => String(room.id) === String(zoneId)) || null;
}

function applyZonePressure(zoneId, amount = 1, reason = 'camera-scene-pressure') {
  if (!zoneId || amount <= 0) return;
  const doctrineMods = getDoctrineModifiers(state?.doctrine || {});
  const effectiveAmount = Math.max(0, amount - Number(doctrineMods.chaosDampener || 0));
  if (effectiveAmount <= 0) return;
  const room = getRoomForCameraZone(zoneId);
  if (!room?.occupiedBy) return;
  registerRoomChainSignal({
    roomId: room.id,
    guestName: room.occupiedBy,
    type: reason,
    severity: effectiveAmount
  });
}

function downgradeZonePressure(zoneId, amount = 2) {
  if (!zoneId) return;
  calmRoomChain(zoneId, amount);
}

function setZoneCondition(zoneId, nextCondition) {
  const index = state.rooms.findIndex((room) => String(room.id) === String(zoneId));
  if (index === -1) return;
  const room = state.rooms[index];
  if (!room?.occupiedBy) return;
  state.rooms[index] = {
    ...room,
    condition: nextCondition
  };
}

function getCriticalOccupiedRoomCount() {
  return (state.rooms || []).filter(
    (room) => room?.occupiedBy && room?.condition === 'Critical'
  ).length;
}

function getTotalChainPressure() {
  if (!Array.isArray(state?.storyChains)) return 0;
  return state.storyChains.reduce((sum, chain) => sum + Math.max(0, Number(chain?.pressure || 0)), 0);
}

function evaluatePresentationState() {
  pruneLiveAlerts(state);

  if (window.DeadEndPhase2?.applyPressureEnhancements) {
    window.DeadEndPhase2.applyPressureEnhancements(state, (alert) => pushLiveAlert(state, alert));
  }

  const warningFlags = getTopbarWarningFlags(state);
  if (warningFlags.lowPower && !state.uiFlags.lowPowerWarned) {
    pushLiveAlert(state, {
      type: 'warning',
      message: 'Power reserve is low. A blackout is becoming likely.',
      dedupeKey: 'warn-low-power'
    });
    state.uiFlags.lowPowerWarned = true;
    audioController.playAlert('high');
  }
  if (!warningFlags.lowPower) state.uiFlags.lowPowerWarned = false;

  if (warningFlags.lowReputation && !state.uiFlags.lowReputationWarned) {
    pushLiveAlert(state, {
      type: 'warning',
      message: 'Reputation is slipping into dangerous territory.',
      dedupeKey: 'warn-low-reputation'
    });
    state.uiFlags.lowReputationWarned = true;
  }
  if (!warningFlags.lowReputation) state.uiFlags.lowReputationWarned = false;

  if (warningFlags.criticalPressure && !state.uiFlags.criticalPressureWarned) {
    pushLiveAlert(state, {
      type: 'danger',
      message: 'Multiple occupied rooms are in critical condition.',
      dedupeKey: 'warn-critical-pressure'
    });
    state.uiFlags.criticalPressureWarned = true;
    audioController.playAlert('dire');
  }
  if (!warningFlags.criticalPressure) state.uiFlags.criticalPressureWarned = false;

  if (warningFlags.nearDawn && !state.uiFlags.nearDawnWarned) {
    pushLiveAlert(state, {
      type: 'info',
      message: 'Dawn is approaching. Hold motel control a little longer.',
      dedupeKey: `warn-near-dawn-night-${state.night}`
    });
    state.uiFlags.nearDawnWarned = true;
  }
  if (!warningFlags.nearDawn) state.uiFlags.nearDawnWarned = false;

  const chainPressure = getTotalChainPressure();
  if (chainPressure >= 8 && !state.uiFlags.chainPressureWarned) {
    pushLiveAlert(state, {
      type: 'warning',
      message: 'Incident chain pressure is rising across occupied rooms.',
      dedupeKey: `warn-chain-pressure-${state.night}`
    });
    state.uiFlags.chainPressureWarned = true;
  }
  if (chainPressure < 5) state.uiFlags.chainPressureWarned = false;

  const criticalRooms = getCriticalOccupiedRoomCount();
  state.publicPressureStreak = criticalRooms >= 2 ? (state.publicPressureStreak || 0) + 1 : 0;
  if (state.publicPressureStreak >= 2) {
    applyIdentityImpact({
      doctrine: { stability: -1, improvisation: 1 },
      factions: { ownership: -1, locals: -1 },
      stats: { publicPressureMoments: 1 },
      reason: 'repeated critical pressure'
    });
    state.publicPressureStreak = 0;
  }

  const pressureAudioLevel = getPressureAudioLevel(state);
  audioController.updatePressureHum(pressureAudioLevel);
}

function onMeaningfulAction() {
  audioController.unlock();
}

function acquireActionLock(key) {
  const safeKey = String(key || '').trim();
  if (!safeKey) return true;
  if (actionLocks.has(safeKey)) return false;
  actionLocks.add(safeKey);
  return true;
}

function releaseActionLock(key) {
  const safeKey = String(key || '').trim();
  if (!safeKey) return;
  actionLocks.delete(safeKey);
}

function toggleAudio() {
  onMeaningfulAction();
  const muted = audioController.toggleMute();
  persistSettings({ ...settingsState, masterSound: !muted });
  state.audioMuted = muted;
  renderAll();
}

function bootstrapState() {
  metaState = normalizeMetaState(loadMetaState());
  onboardingState = loadOnboardingState();
  persistSettings(settingsState);
  syncAudioWithSettings();
  if (settingsState?.tutorialGuidance === false) {
    updateOnboarding((current) => setTutorialEnabled(current, false));
  }
  const saved = loadState();
  state = saved || createInitialState();
  state = normalizeFailureState(state);
  state = normalizeScenarioState(state);
  state = normalizeChainState(state);
  if (!state.activeScenario) {
    state = assignScenarioForNight(state);
  }
  state.rooms = state.rooms?.length
    ? applyRoomUnlockFlags(state.rooms, state.night)
    : createDefaultRooms({ unlockedCap: getUnlockedRoomCapForNight(state.night) });
  state.rooms = normalizeEscalationRooms(state.rooms);
  state.rooms = normalizeResponseRooms(state.rooms);
  state.rooms = normalizeTacticalRooms(state.rooms);
  state.cameras = state.cameras?.length ? state.cameras : createDefaultCameras();
  state.guests = Array.isArray(state.guests) ? state.guests : [];
  state = normalizeRoomMemoryState(state);
  state.guests = normalizeGuestFlags(state.guests);
  state.guests = normalizePolicyGuests(state.guests, state.night);
  state.guests = state.guests.map((guest) => {
    const normalizedGuest = normalizeGuestArchetype(guest);
    const readyGuest = normalizedGuest.archetypeKey
      ? normalizedGuest
      : assignArchetypeToGuest(normalizedGuest, state);
    return Number(readyGuest?.expectedStayNights || 0) > 0
      ? readyGuest
      : { ...readyGuest, expectedStayNights: computeStayNightsForGuest(readyGuest) };
  });
  state.logs = Array.isArray(state.logs) ? state.logs : [];
  state.activeEvents = Array.isArray(state.activeEvents) ? state.activeEvents : [];
  state.incidents = Array.isArray(state.incidents) ? state.incidents : [];
  state.shiftStats = normalizeShiftStats(state.shiftStats);
  state = normalizeNightCycleState(state);
  state = normalizePowerEconomyState(state);
  state = normalizeCameraSceneState(state);
  state = normalizeLocationState(state);
  state = normalizePresentationState(state);
  state = normalizeSpecialEncounterState(state);
  state = normalizeNightEventState(state);
  state = normalizeDeskConsequenceState(state);
  normalizeIdentitySystems();
  normalizeRunMemoryState();
  normalizeCampaignSystems();
  refreshProgressionDerivedState();
  state.autoIncidentCooldown =
    typeof state.autoIncidentCooldown === 'number' ? state.autoIncidentCooldown : 0;
  state.escalationTick = typeof state.escalationTick === 'number' ? state.escalationTick : 0;
  if (!state.powerEconomy) {
    state.powerEconomy = buildFreshPowerEconomy();
  }
  if (!state.cameraScene) {
    state.cameraScene = buildFreshCameraSceneState();
  }
  if (!state.locationState) {
    state.locationState = createLocationState();
  }

  if (!saved) {
    applyMetaPerkAtRunStart();
    applyNightStartProgression(state);
  }

  if (window.DeadEndPhase2?.initVisualEnhancer) {
    window.DeadEndPhase2.initVisualEnhancer();
  }
  if (window.DeadEndPhase2?.tutorial?.initTutorialEnhancer) {
    window.DeadEndPhase2.tutorial.initTutorialEnhancer({
      onHelp: () => toggleHelpOverlay(true)
    });
  }

  guestIdCounter = Math.max(0, ...state.guests.map((guest) => guest.id || 0)) + 1;
  normalizeIntakeState(state);
  normalizeAdminSpamState(state);
  state.deferredShiftCosts = Array.isArray(state.deferredShiftCosts) ? state.deferredShiftCosts : [];
  if (!state?.nightStartSnapshot?.state) {
    captureNightStartSnapshot('bootstrap-fallback');
  }
}
function renderAll() {
  evaluatePresentationState();
  const renderState = buildRenderState();
  renderTopbar(renderState);
  renderNightEventCard(renderState);
  renderGuests(renderState, checkInGuest, flagGuest, rejectGuest, handleOpenSpecialEncounter);
  renderRooms(
    renderState,
    lockDownRoom,
    callPoliceForRoom,
    cutPowerToRoom,
    evictRoomGuest
  );
  renderCameras(renderState);
  renderNightEventOverlay(renderState);
  renderCameraSceneOverlay(renderState);
  renderSpecialEncounterOverlay(renderState);
  renderNightPrepScreen();
  renderMainMenuMetaSurface(renderState, {
    onBuyPerk: purchaseMetaPerkFromMenu,
    onSelectPerk: selectMetaPerkFromMenu,
    onToggleHelp: () => toggleHelpOverlay(true),
    onSetTutorialMode: setTutorialMode,
    onDisableTutorial: disableTutorialGuidance,
    onEnableTutorial: enableTutorialGuidance,
    onSetDifficulty: setRunDifficultyFromMenu,
    onSetCampaignMode: setRunCampaignModeFromMenu,
    onToggleContract: toggleRunContractFromMenu,
    onResetTutorial: () => {
      if (!confirmIfNeeded('Reset tutorial guidance state? This keeps run/meta progress but clears tutorial walkthrough flags.')) {
        return;
      }
      onboardingState = resetOnboardingState();
      window.DeadEndPhase3?.resetOnboardingGuideState?.();
      if (settingsState?.tutorialGuidance === false) {
        onboardingState = saveOnboardingState(setTutorialEnabled(onboardingState, false));
      }
      renderAll();
    }
  });
  renderHelpOverlay(renderState);
  renderSettingsOverlay(renderState);
  renderLogs(state);
  if (window.DeadEndPhase2?.decorateUi) {
    window.DeadEndPhase2.decorateUi();
  }
  if (window.DeadEndPhase2?.tutorial?.runTutorialTick) {
    window.DeadEndPhase2.tutorial.runTutorialTick({ activeScreenId, state });
  }

  try {
    window.DeadEndPhase3?.applyMotelIdentityPass?.(renderState);
    window.DeadEndPhase3?.applySilhouettesToGuestCards?.(renderState);
    window.DeadEndPhase3?.refineGuestCards?.(renderState);
    window.DeadEndPhase3?.applyQueueDensity?.(renderState);
    window.DeadEndPhase3?.applyDecisionPresentation?.(renderState);
    window.DeadEndPhase3?.enhanceRunSummary?.(state?.lastSummary || {}, renderState);
    window.DeadEndPhase3?.mountHelpTutorialControls?.({ overlay: document.getElementById('help-overlay') });
    window.DeadEndPhase3?.maybeStartOnboardingGuide?.({ activeScreenId });
    window.DeadEndPhase3?.applyMobileUsabilityPass?.();
  } catch (_) {
    // Phase 3 visuals are optional and must fail gracefully.
  }

  saveState(state);
}

function startFreshCampaignRun() {
  if (!confirmIfNeeded('Begin a fresh campaign from Night 1? Current run progress will be replaced. Archive progression and settings are kept.')) {
    return;
  }
  onMeaningfulAction();
  audioController.playUiClick();
  if (!state?.pendingRunCompletion) {
    tryRecordCampaignFailureMeta();
  }
  clearSave();
  cleanupTransientUiState('hard-reset');
  state = createInitialState();
  state = normalizeNightCycleState(state);
  state = normalizePowerEconomyState(state);
  state = normalizeCameraSceneState(state);
  state = normalizeScenarioState(state);
  state = normalizeChainState(state);
  state = assignScenarioForNight(state);
  state.failedState = null;
  state.rooms = normalizeEscalationRooms(createDefaultRooms({ unlockedCap: getUnlockedRoomCapForNight(1) }));
  state.rooms = normalizeResponseRooms(state.rooms);
  state.rooms = normalizeTacticalRooms(state.rooms);
  state.cameras = createDefaultCameras();
  state.guests = [];
  state.logs = ['New campaign initialized. Motel systems back online for Night 1.'];
  state.activeEvents = [];
  state.incidents = [];
  state.storyChains = [];
  state.shiftStats = createShiftStats();
  state.powerEconomy = buildFreshPowerEconomy();
  state.cameraScene = buildFreshCameraSceneState();
  resetLocationStateForNight(state);
  state = normalizePresentationState(state);
  state = normalizeSpecialEncounterState(state);
  state = normalizeNightEventState(state);
  resetCarryoverMemory(state);
  state.storyThreads = [];
  state.activeStoryBeat = null;
  state.returningGuestHistory = {};
  state.storyThreadMeta = { recentTemplateIds: [], lastBeatNight: 0 };
  state.storyMemory = { lastNightSummary: [] };
  state.carryoverBriefing = [];
  state.summaryIdentityLines = [];
  state.summaryBranchNotes = [];
  state.campaignSummaryNotes = [];
  state.contentDirector = {};
  state.contentHistory = {};
  state.pendingRunCompletion = false;
  state.runEnding = null;
  state.metaRunState = {
    metaPerkApplied: false,
    rerollAvailable: false,
    rerollUsed: false,
    clueBoost: false,
    selectedPerkId: null
  };
  state.runSetup = createDefaultRunSetup();
  state.runModifiers = getRunSetupModifierProfile(state.runSetup);
  state.runSetupSummary = buildRunSetupSummary(state.runSetup);
  refreshProgressionDerivedState();
  state.autoIncidentCooldown = 0;
  state.escalationTick = 0;
  normalizeIdentitySystems();
  normalizeRunMemoryState();
  normalizeCampaignSystems();
  applyMetaPerkAtRunStart();
  applyNightStartProgression(state);
  runtimeBranchContext = null;
  state.doctrine = beginDoctrineNight(state.doctrine);
  pushLiveAlert(state, {
    type: 'info',
    message: 'Fresh campaign prepared. Night 1 is ready.',
    dedupeKey: `new-campaign-${Date.now()}`
  });
  guestIdCounter = 1;
  renderAll();
  setActiveScreen('main-menu');
}

function resetNightState() {
  if (!confirmIfNeeded(`Reset Night ${Math.max(1, Number(state?.night || 1))} to its opening state? Progress made during the current night will be lost.`)) {
    return;
  }
  onMeaningfulAction();
  audioController.playUiClick();
  restoreNightStartSnapshot({
    message: `Night ${Math.max(1, Number(state?.night || 1))} reset to its opening state.`
  });
}

function purchaseMetaPerkFromMenu(perkId) {
  const result = purchaseMetaPerk(metaState, perkId);
  if (!result.ok) {
    pushLiveAlert(state, {
      type: 'warning',
      message: result.reason || 'Unable to unlock perk right now.',
      dedupeKey: `meta-buy-fail-${perkId}`
    });
    renderAll();
    return;
  }

  metaState = result.meta;
  saveMetaSafe();
  pushLiveAlert(state, {
    type: 'success',
    message: `Unlocked meta perk: ${result.perk.title}.`,
    dedupeKey: `meta-buy-success-${perkId}`
  });
  renderAll();
}

function selectMetaPerkFromMenu(perkId) {
  const result = setSelectedMetaPerk(metaState, perkId);
  if (!result.ok) {
    pushLiveAlert(state, {
      type: 'warning',
      message: result.reason || 'Unable to select perk.',
      dedupeKey: `meta-select-fail-${perkId}`
    });
    renderAll();
    return;
  }

  metaState = result.meta;
  saveMetaSafe();
  pushLiveAlert(state, {
    type: 'info',
    message: `Selected run-start perk: ${getSelectedMetaPerkLabel(metaState)}.`,
    dedupeKey: `meta-select-ok-${perkId}`
  });
  renderAll();
}

function rerollFirstNightScenario() {
  onMeaningfulAction();
  audioController.playUiClick();
  if (!state?.metaRunState?.rerollAvailable || state?.metaRunState?.rerollUsed || Number(state?.night || 1) !== 1) {
    pushLiveAlert(state, {
      type: 'warning',
      message: 'First-night reroll is not currently available.',
      dedupeKey: 'meta-reroll-unavailable'
    });
    renderAll();
    return;
  }

  const previousKey = String(state?.activeScenario?.key || '');
  let attempts = 0;
  while (attempts < 5) {
    state = assignScenarioForNight(state);
    if (String(state?.activeScenario?.key || '') !== previousKey) break;
    attempts += 1;
  }

  if (!consumeFirstNightReroll(state)) {
    renderAll();
    return;
  }

  state.logs.push(`Meta reroll applied. Night 1 scenario changed to ${state?.activeScenario?.label || 'Standard Shift'}.`);
  pushLiveAlert(state, {
    type: 'info',
    message: `Night 1 scenario rerolled: ${state?.activeScenario?.label || 'Standard Shift'}.`,
    dedupeKey: `meta-reroll-${Date.now()}`
  });
  renderAll();
}

function startShift() {
  if (activeScreenId !== 'main-menu') return;
  onMeaningfulAction();
  audioController.playUiClick();
  cleanupTransientUiState('shift-start');
  state.failedState = null;
  state.pendingRunCompletion = false;
  if (window.DeadEndPhase2?.applyNightModifier) {
    window.DeadEndPhase2.applyNightModifier(state);
  }
  state.runSetup = lockRunSetup(state?.runSetup || createDefaultRunSetup());
  state.runModifiers = getRunSetupModifierProfile(state.runSetup);
  state.runSetupSummary = buildRunSetupSummary(state.runSetup);
  applyRunSetupStartModifiers();
  state.doctrine = beginDoctrineNight(state.doctrine || {});
  if (!state.activeStoryBeat) {
    maybeGenerateNightStoryBeat(state, state.night);
  }
  syncFinaleStateForNight({ refreshBranch: true });
  state.rooms = applyRoomUnlockFlags(state.rooms || [], state.night);
  refreshIntakeBudgetForNight(state);
  normalizeIntakeState(state);
  state.deferredShiftCosts = [];
  pushLiveAlert(state, {
    type: 'info',
    message: `Shift started — Scenario: ${state?.activeScenario?.label || 'Standard Shift'}.`,
    dedupeKey: `scenario-start-${state.night}`
  });
  pushOpeningTensionBeat('shift-start');
  captureNightStartSnapshot('shift-start');
  setActiveScreen('game-screen');
  setActivePanel('frontdesk-panel');
  updateOnboarding((current) => markTutorialEvent(current, 'shift-started'));
  renderAll();
}

function checkFailureState() {
  const failure = evaluateFailureState(state);
  if (!failure) return false;

  if (!state.failedState) {
    applyIdentityImpact({
      doctrine: { force: 1, improvisation: 1, stability: -1 },
      factions: { ownership: -2, guests: -1, staff: -1 },
      reason: 'failure state reached'
    });
  }

  state.failedState = failure;
  cleanupTransientUiState('failure');
  pushLiveAlert(state, {
    type: 'danger',
    message: failure.reason || 'Motel control failed.',
    dedupeKey: `failure-${failure.code || 'unknown'}-${state.night}`
  });
  audioController.playFailure();
  renderFailure(failure);
  setActiveScreen('failure-screen');
  return true;
}

function progressShift(actionKey, options = {}) {
  tickDeferredShiftCosts();
  tickPowerEconomy(state);
  tickLocationState(state);
  const skipPassiveDrain = Boolean(options?.skipPassiveDrain);
  const passiveDrainBase = skipPassiveDrain
    ? 0
    : getPassiveDrainForAction(actionKey, state, getScenarioModifiers());
  const passiveMult =
    typeof options.passiveDrainScale === 'number' && Number.isFinite(options.passiveDrainScale)
      ? Math.max(0, options.passiveDrainScale)
      : 1;
  const passiveDrain = Math.max(
    0,
    Math.round(
      passiveDrainBase *
        passiveMult *
        Math.max(0.75, Number(state?.runModifiers?.passiveDrainMult || 1))
    )
  );
  if (passiveDrain > 0) {
    state.power = clampPower(state.power - passiveDrain);
    state.logs.push(`Power grid load drained ${passiveDrain}% during ongoing motel operations.`);
  }

  state = advanceNightCycle(state, actionKey, {
    timeScale: options.timeScale,
    minutesOverride: options.minutesOverride
  });

  const branchContext = getBranchContext(true);
  const eventTick = tickNightEvents(state, branchContext);
  if (Array.isArray(eventTick?.logs) && eventTick.logs.length) {
    state.logs = [...state.logs, ...eventTick.logs];
  }
  if (Array.isArray(eventTick?.effects) && eventTick.effects.length) {
    eventTick.effects.forEach((effects, index) => {
      applyNightEventPressureEffects(effects, `tick-${index}`);
    });
  }
  if (Array.isArray(eventTick?.alerts) && eventTick.alerts.length) {
    eventTick.alerts.forEach((message, index) => {
      pushLiveAlert(state, {
        type: 'warning',
        kind: 'actionable',
        message,
        dedupeKey: `night-event-tick-${state.night}-${state.shiftElapsedMinutes}-${index}`
      });
    });
  }

  if (state?.activeNightEvent?.id) {
    registerContentExposure(state, { kind: 'event', id: state.activeNightEvent.id });
  }

  if (window.DeadEndPhase2?.tickFlavor) {
    window.DeadEndPhase2.tickFlavor(state, (alert) => pushLiveAlert(state, alert));
  }

  const finaleTick = tickFinaleDirector(state);
  if (Array.isArray(finaleTick?.logs) && finaleTick.logs.length) {
    state.logs.push(...finaleTick.logs);
  }
  if (Array.isArray(finaleTick?.alerts) && finaleTick.alerts.length) {
    finaleTick.alerts.forEach((message, index) => {
      pushLiveAlert(state, {
        type: 'warning',
        kind: 'actionable',
        message,
        dedupeKey: `finale-tick-${state.night}-${state.shiftElapsedMinutes}-${index}`
      });
    });
  }

  if (Array.isArray(finaleTick?.spillovers) && finaleTick.spillovers.length) {
    finaleTick.spillovers.forEach((spill, index) => {
      const zones = state?.locationState?.zones || {};
      if (zones[spill?.targetZoneId]) {
        const currentFollowup = Number(zones[spill.targetZoneId].followupPressure || 0);
        zones[spill.targetZoneId].followupPressure = currentFollowup + Math.max(1, Number(spill.amount || 1));
      }
      registerRoomChainSignal({
        roomId: spill?.targetZoneId,
        type: `finale-spillover-${index}`,
        severity: Math.max(1, Number(spill?.amount || 1))
      });
    });
  }

  const finaleEvent = maybeOpenFinaleNightEvent(state, branchContext);
  if (finaleEvent) {
    state.activeNightEvent = finaleEvent;
    state.nightEventOverlayOpen = false;
    state.logs.push(`Finale event triggered: ${finaleEvent.title}.`);
    pushLiveAlert(state, {
      type: 'warning',
      kind: 'actionable',
      message: `Final Night escalation: ${finaleEvent.title}`,
      dedupeKey: `finale-event-open-${state.night}-${finaleEvent.id}-${state.shiftElapsedMinutes}`
    });
    registerContentExposure(state, { kind: 'event', id: finaleEvent.id });
  }

  const finaleAnomaly = maybeEscalateFinaleAnomaly(state);
  if (finaleAnomaly?.log) {
    state.logs.push(finaleAnomaly.log);
    pushLiveAlert(state, {
      type: 'warning',
      message: finaleAnomaly.log,
      dedupeKey: `finale-anomaly-${state.night}-${state.shiftElapsedMinutes}-${finaleAnomaly.contentLabel || 'x'}`
    });
    registerContentExposure(state, {
      kind: 'anomaly',
      status: finaleAnomaly?.event?.status
    });
  }

  state.finaleObjectives = buildFinaleObjectives(state);
  state.finaleUi = buildFinaleUiState(state);
  applyQueuedDeskConsequences();

  if (!state.dawnProcessed && hasReachedDawn(state)) {
    state.shiftElapsedMinutes = SHIFT_DURATION_MINUTES;
    state.dawnProcessed = true;
    const failureTriggered = checkFailureState?.() === true;
    if (!failureTriggered) {
      endNight({ force: true });
      return true;
    }
  }

  return false;
}

function callNextArrival() {
  if (activeScreenId !== 'game-screen') return;
  onMeaningfulAction();
  audioController.playUiClick();
  normalizeIntakeState(state);
  const cap = Math.max(1, Number(state.intake.queueCap || 3));
  if ((state.guests || []).length >= cap) {
    pushLiveAlert(state, {
      type: 'warning',
      message: `Front desk queue is full (${cap}). Check in, flag, or reject before calling another arrival.`,
      dedupeKey: `intake-queue-full-${state.night}`
    });
    renderAll();
    return;
  }
  if (Number(state.intake.arrivalsRemaining || 0) <= 0) {
    pushLiveAlert(state, {
      type: 'warning',
      message: 'No further arrivals are scheduled for tonight without overtime intake (not authorized).',
      dedupeKey: `intake-budget-empty-${state.night}`
    });
    renderAll();
    return;
  }
  state.intake.arrivalsRemaining = Math.max(0, Number(state.intake.arrivalsRemaining || 0) - 1);
  const branchContext = getBranchContext(true);
  const visibleGuestNames = [
    ...((state?.guests || []).map((guest) => guest?.name).filter(Boolean)),
    ...((state?.rooms || []).map((room) => room?.occupiedBy || room?.guestName).filter(Boolean))
  ];
  const baseGuest = createGuest(guestIdCounter, { activeNames: visibleGuestNames });
  const enrichedGuest = enrichGuestProfile(baseGuest, state.night);
  const normalizedGuest = normalizeGuestFlags([enrichedGuest])[0];
  const scenarioGuest = applyScenarioRiskToGuest(normalizedGuest);
  const policyGuest = applyPolicyToGuest(scenarioGuest, state.night);
  const clueGuest = applyFrontDeskClueUpgrade(policyGuest);
  const archetypedGuest = assignArchetypeToGuest(
    {
      ...clueGuest,
      risk: clueGuest.riskLevel || clueGuest.risk || 'Low'
    },
    state
  );
  const recurringGuest = maybeGenerateReturningGuestVariant(archetypedGuest, state, state.night);
  const branchedRecurringGuest = applyReturningGuestBranchFlavor(recurringGuest, branchContext);
  const directedGuest = applyDirectorGuestBias(branchedRecurringGuest, branchContext);
  const variedGuest = window.DeadEndPhase2?.applyGuestVariation
    ? window.DeadEndPhase2.applyGuestVariation(directedGuest, state)
    : directedGuest;
  const withSpecialEncounter = maybeAssignSpecialEncounterToGuest(variedGuest, state, branchContext);
  const finaleAdjustedGuest = maybeAttachFinaleEncounter(withSpecialEncounter, state, branchContext);
  const guestWithStay = {
    ...finaleAdjustedGuest,
    expectedStayNights: Math.max(
      1,
      Number(finaleAdjustedGuest?.expectedStayNights || computeStayNightsForGuest(finaleAdjustedGuest))
    )
  };
  if (guestWithStay.isReturningGuest) {
    const preferredRoom = state.rooms.find((room) => room.id === guestWithStay.assignedRoomMemoryId);
    if (preferredRoom?.memory?.note) {
      guestWithStay.priorHistoryLine = `${guestWithStay.priorHistoryLine || ''} Room memory: ${preferredRoom.memory.note}`.trim();
    }
    if (guestWithStay.returningGuestNote) {
      guestWithStay.threadMemoryLine = [guestWithStay.threadMemoryLine, guestWithStay.returningGuestNote].filter(Boolean).join(' ');
    }
  }

  state.guests.push(guestWithStay);
  registerContentExposure(state, {
    kind: 'guest',
    archetype: guestWithStay?.archetypeKey,
    outsideHeavy: Number(branchContext?.signals?.outsideRisk || 0) >= 6
  });
  registerContentExposure(state, { kind: 'guestMood', mood: guestWithStay?.mood });
  if (guestWithStay?.specialEncounter?.id) {
    registerContentExposure(state, { kind: 'special', id: guestWithStay.specialEncounter.id });
  }
  guestIdCounter += 1;
  state.logs.push('A new arrival reached the front desk (intake slot consumed).');
  state.logs.push(
    `${guestWithStay.name} looks booked for roughly ${guestWithStay.expectedStayNights} night${guestWithStay.expectedStayNights === 1 ? '' : 's'} if approved.`
  );
  if (guestWithStay?.specialEncounter?.id) {
    pushLiveAlert(state, {
      type: 'warning',
      kind: 'actionable',
      message: `${guestWithStay.name} presents a special encounter.`,
      dedupeKey: `special-guest-${guestWithStay.id}-${guestWithStay.specialEncounter.id}`
    });
  }
  pushLiveAlert(state, {
    type: 'info',
    message: `${guestWithStay.name} arrived at reception for a likely ${guestWithStay.expectedStayNights}-night stay.`,
    dedupeKey: `guest-arrival-${guestWithStay.id}`
  });
  updateOnboarding((current) => markTutorialEvent(current, 'guest-spawned'));
  if (checkFailureState()) return;
  if (progressShift('callArrival')) return;
  renderAll();
}

function handleFinaleCommandChoice(commandId) {
  onMeaningfulAction();
  audioController.playUiClick();
  const result = applyFinaleCommandDecision(state, commandId);
  if (!result?.ok) {
    pushLiveAlert(state, {
      type: 'warning',
      message: result?.reason || 'Unable to issue final-night command.',
      dedupeKey: `finale-command-fail-${state.night}-${commandId}`
    });
    renderAll();
    return;
  }

  if (Array.isArray(result.logs) && result.logs.length) {
    state.logs.push(...result.logs);
  }
  const commandResourceLoad = Math.max(0, Number(result?.pressureDelta < 0 ? Math.abs(result.pressureDelta) : 0));
  state.shiftStats.finaleCommandCosts = (state.shiftStats.finaleCommandCosts || 0) + commandResourceLoad;

  if (Array.isArray(result.alerts) && result.alerts.length) {
    result.alerts.forEach((message, index) => {
      pushLiveAlert(state, {
        type: 'info',
        message,
        dedupeKey: `finale-command-ok-${state.night}-${commandId}-${index}`
      });
    });
  }
  if (result.identity) {
    applyIdentityImpact({
      doctrine: result.identity?.doctrine || null,
      factions: result.identity?.factions || null,
      reason: `finale command ${commandId}`
    });
  }

  registerFinaleContainment(state, 1);
  state.finaleObjectives = buildFinaleObjectives(state);
  state.finaleUi = buildFinaleUiState(state);
  if (checkFailureState()) return;
  if (progressShift('dispatch')) return;
  renderAll();
}

function flagGuest(guestId) {
  const actionKey = `desk-flag-${guestId}`;
  if (!acquireActionLock(actionKey)) return;
  try {
  onMeaningfulAction();
  audioController.playUiClick();
  const guest = state.guests.find((entry) => entry.id === guestId);
  if (!guest) return;
  const wasFlagged = Boolean(guest.flagged);

  const flaggedGuest = applyFlagToGuest(guest);
  const updatedGuest = applyPolicyToGuest(flaggedGuest, state.night);

  state.guests = state.guests.map((entry) =>
    entry.id === guestId ? updatedGuest : entry
  );

  const outcome = buildFlagLogs(updatedGuest);
  markThreadOutcome(state, {
    action: 'flag',
    guest: updatedGuest,
    guestName: updatedGuest.name,
    riskLevel: updatedGuest.riskLevel,
    mood: updatedGuest.mood,
    night: state.night
  });
  if (updatedGuest.isReturningGuest) {
    state.shiftStats.recurringGuestsHandled = (state.shiftStats.recurringGuestsHandled || 0) + 1;
  }

  state.logs = [...state.logs, ...outcome.logs];
  state.reputation = applyReputationDelta(state.reputation, outcome.reputationDelta);

  if (!wasFlagged) {
    state.shiftStats.flagged += 1;
    pushLiveAlert(state, {
      type: 'warning',
      message: `${updatedGuest.name} was flagged for monitoring.`,
      dedupeKey: `guest-flagged-${updatedGuest.id}`
    });
    audioController.playAlert('normal');
  }

  const policyOutcome = evaluatePolicyDecision({
    guest: updatedGuest,
    action: 'flag',
    night: state.night
  });
  state.logs = [...state.logs, ...policyOutcome.logs];
  state.reputation = applyPolicyReputation(
    state.reputation,
    applyDeskPolicyPenaltyProtection(policyOutcome.reputationDelta)
  );

  if (window.DeadEndPhase2?.pushDecisionFeedback) {
    window.DeadEndPhase2.pushDecisionFeedback({
      repDelta: Number(outcome.reputationDelta || 0) + Number(policyOutcome.reputationDelta || 0),
      pressureDelta: 1,
      message: `${updatedGuest.name} flagged.`,
      consequence: 'Monitoring burden increases.'
    });
  }
  if (window.DeadEndPhase2?.tutorial?.markTutorialDecision) {
    window.DeadEndPhase2.tutorial.markTutorialDecision();
  }

  const policyResult = classifyPolicyAction(updatedGuest, 'flag');
  if (policyResult === 'followed') {
    state.shiftStats.policyFollowed += 1;
    applyIdentityImpact({
      doctrine: { control: 1, stability: 1 },
      factions: { ownership: 1, authorities: 1 },
      reason: 'policy follow at desk'
    });
  }
  if (policyResult === 'broken') {
    state.shiftStats.policyBroken += 1;
    applyIdentityImpact({
      doctrine: { improvisation: 1, stability: -1 },
      factions: { ownership: -1 },
      stats: { policyBreaks: 1 },
      reason: 'policy override at desk'
    });
  }

  queueDeskConsequenceForAction('flag', updatedGuest, null, policyResult);

  if (checkFailureState()) return;
  if (progressShift('flag')) return;
  updateOnboarding((current) => markTutorialEvent(current, 'desk-action'));
  renderAll();
  } finally {
    releaseActionLock(actionKey);
  }
}

function rejectGuest(guestId) {
  const actionKey = `desk-reject-${guestId}`;
  if (!acquireActionLock(actionKey)) return;
  try {
  onMeaningfulAction();
  audioController.playUiClick();
  const guest = state.guests.find((entry) => entry.id === guestId);
  if (!guest) return;

  state.shiftStats.rejected += 1;
  applyIdentityImpact({
    doctrine: { control: 1, force: 1, compassion: -1 },
    factions: { guests: -1, locals: -1, authorities: 1 },
    stats: { harshDeskActions: 1 },
    reason: 'guest rejected'
  });

  const policyResult = classifyPolicyAction(guest, 'reject');
  if (policyResult === 'followed') {
    state.shiftStats.policyFollowed += 1;
    applyIdentityImpact({ doctrine: { stability: 1 }, factions: { ownership: 1 }, reason: 'policy follow on reject' });
  }
  if (policyResult === 'broken') {
    state.shiftStats.policyBroken += 1;
    applyIdentityImpact({
      doctrine: { improvisation: 1, stability: -1 },
      factions: { ownership: -1, guests: -1 },
      stats: { policyBreaks: 1 },
      reason: 'policy break on reject'
    });
  }

  queueDeskConsequenceForAction('reject', guest, null, policyResult);

  const policyOutcome = evaluatePolicyDecision({
    guest,
    action: 'reject',
    night: state.night
  });

  const outcome = buildRejectOutcome(guest);

  markThreadOutcome(state, {
    action: 'reject',
    guest,
    guestName: guest.name,
    riskLevel: guest.riskLevel,
    mood: guest.mood,
    night: state.night
  });
  if (guest.isReturningGuest) {
    state.shiftStats.recurringGuestsMissed = (state.shiftStats.recurringGuestsMissed || 0) + 1;
  }

  recordSpecialEncounterMiss(state, guest);

  state.guests = state.guests.filter((entry) => entry.id !== guestId);
  state.logs = [...state.logs, ...outcome.logs];
  state.reputation = applyReputationDelta(state.reputation, outcome.reputationDelta);
  state.logs = [...state.logs, ...policyOutcome.logs];
  state.reputation = applyPolicyReputation(
    state.reputation,
    applyDeskPolicyPenaltyProtection(policyOutcome.reputationDelta)
  );
  if (window.DeadEndPhase2?.pushDecisionFeedback) {
    window.DeadEndPhase2.pushDecisionFeedback({
      repDelta: Number(outcome.reputationDelta || 0) + Number(policyOutcome.reputationDelta || 0),
      pressureDelta: -1,
      message: `${guest.name} rejected.`,
      consequence: 'Short-term risk lowered.'
    });
  }
  if (window.DeadEndPhase2?.tutorial?.markTutorialDecision) {
    window.DeadEndPhase2.tutorial.markTutorialDecision();
  }
  audioController.playAlert('normal');

  if (checkFailureState()) return;
  if (progressShift('reject')) return;
  updateOnboarding((current) => markTutorialEvent(current, 'desk-action'));
  renderAll();
  } finally {
    releaseActionLock(actionKey);
  }
}

function checkInGuest(guestId) {
  const actionKey = `desk-checkin-${guestId}`;
  if (!acquireActionLock(actionKey)) return;
  try {
  onMeaningfulAction();
  audioController.playUiClick();
  const guest = state.guests.find((entry) => entry.id === guestId);
  let room = getAvailableRoom(state.rooms);

  if (!guest || !room) {
    state.logs.push('Check-in failed. No vacant room available.');
    pushLiveAlert(state, {
      type: 'warning',
      message: 'Check-in failed: no vacant room available.',
      dedupeKey: 'checkin-no-room'
    });
    audioController.playAlert('normal');
    renderAll();
    return;
  }

  room = adjustRoomForDeskDecision(room, guest);
  const policyOutcome = evaluatePolicyDecision({
    guest,
    action: 'checkin',
    night: state.night
  });
  room = applyPolicyToRoom(room, guest, policyOutcome);

  room.occupied = true;
  room.occupiedBy = guest.name;
  room.guestName = guest.name;
  room.condition = guest.specialRoomCondition || deriveRoomConditionForGuest(guest);
  room.riskLevel = guest.riskLevel || 'Low';
  room.trait = guest.trait || 'Quiet';
  room.deskFlagged = Boolean(guest.flagged);
  room.policyRecommendation = guest.policyRecommendation || 'Approve';
  room.policyOverride = Boolean(policyOutcome.policyOverride);
  room.occupantArchetypeLabel = guest.archetypeLabel || null;
  room.occupantHiddenIntent = guest.hiddenIntent || null;
  room.occupantChainBias =
    typeof guest.chainBias === 'number' ? guest.chainBias : 0;
  room.escalationCooldown = typeof room.escalationCooldown === 'number' ? room.escalationCooldown : 0;
  room.stayNightsRemaining = Math.max(1, Number(guest.expectedStayNights || computeStayNightsForGuest(guest)));
  room.memory = room?.memory && typeof room.memory === 'object'
    ? { ...room.memory }
    : { nightsOccupied: 0, incidentsSeen: 0, harshActions: 0, returningGuestVisits: 0, signatures: [], note: '' };
  room.memory.nightsOccupied = Math.max(0, Number(room.memory.nightsOccupied || 0) + 1);
  if (guest.isReturningGuest) {
    room.memory.returningGuestVisits = Math.max(0, Number(room.memory.returningGuestVisits || 0) + 1);
    room.memory.note = `${guest.name} returned to the property with prior history attached.`;
  } else if (guest.archetypeLabel) {
    room.memory.note = `${guest.archetypeLabel} pressure has touched this room before.`;
  }

  if (room.deskFlagged && room.condition === 'Stable') {
    room.condition = 'Watch';
  }

  if (policyOutcome.forceWatch && room.condition === 'Stable') {
    room.condition = 'Watch';
  }

  state.rooms = state.rooms.map((entry) => (entry.id === room.id ? room : entry));

  guest.checkedIn = true;
  guest.assignedRoomId = room.id;
  state.shiftStats.checkedIn += 1;

  const policyResult = classifyPolicyAction(guest, 'checkin');
  if (policyResult === 'followed') {
    state.shiftStats.policyFollowed += 1;
    applyIdentityImpact({
      doctrine: { stability: 1, compassion: 1 },
      factions: { guests: 1, ownership: 1 },
      stats: { cleanGuestResolutions: 1 },
      reason: 'guest check-in followed policy'
    });
  }
  if (policyResult === 'broken') {
    state.shiftStats.policyBroken += 1;
    applyIdentityImpact({
      doctrine: { improvisation: 1, secrecy: 1, stability: -1 },
      factions: { ownership: -1, guests: -1 },
      stats: { policyBreaks: 1 },
      reason: 'guest check-in policy override'
    });
  }

  queueDeskConsequenceForAction('checkin', guest, room, policyResult);

  const incomeMult = Math.max(0.7, Number(state?.runModifiers?.moneyIncomeMult || 1));
  state.money += Math.max(1, Math.round(20 * incomeMult));
  const identityMods = getIdentityContext();
  state.reputation += 1 + Number(identityMods.doctrineMods.guestCalmBonus || 0) + Number(identityMods.factionMods.guestDeskCalm || 0);
  if (Number(identityMods.doctrineMods.guestPenalty || 0) < 0) {
    state.reputation = clampReputation(state.reputation + Number(identityMods.doctrineMods.guestPenalty || 0));
  }
  const checkInLogs = buildGuestCheckInLogs(guest, room);
  state.logs = [...state.logs, ...checkInLogs];
  state.logs.push(
    `${guest.name} is booked for ${room.stayNightsRemaining} night${room.stayNightsRemaining === 1 ? '' : 's'} (auto-checkout when nights remaining hit zero).`
  );
  markThreadOutcome(state, {
    action: 'checkin',
    guest,
    guestName: guest.name,
    riskLevel: guest.riskLevel,
    mood: guest.mood,
    linkedZone: room?.label,
    night: state.night
  });
  if (guest.isReturningGuest) {
    state.shiftStats.recurringGuestsHandled = (state.shiftStats.recurringGuestsHandled || 0) + 1;
  }

  state.logs = [...state.logs, ...policyOutcome.logs];
  state.reputation = applyPolicyReputation(
    state.reputation,
    applyDeskPolicyPenaltyProtection(policyOutcome.reputationDelta)
  );
  state.guests = state.guests.filter((entry) => entry.id !== guestId);
  recordSpecialEncounterMiss(state, guest);

  if (policyOutcome.policyOverride) {
    state.shiftStats.policyOverrides = (state.shiftStats.policyOverrides || 0) + 1;
    pushLiveAlert(state, {
      type: 'warning',
      message: `${room.label} check-in overrode policy guidance.`,
      dedupeKey: `policy-override-room-${room.id}`
    });
  }

  if (room.condition === 'Stable' || room.condition === 'Watch') {
    applyIdentityImpact({
      doctrine: { compassion: 1, stability: 1 },
      factions: { guests: 1, staff: 1 },
      reason: 'calm guest handling'
    });
  }

  const shouldSeedChain =
    guest.riskLevel === 'High' ||
    guest.riskLevel === 'Medium' ||
    guest.flagged ||
    policyOutcome.policyOverride ||
    (guest.incidentBias || 0) > 0;

  if (shouldSeedChain) {
    registerRoomChainSignal({
      roomId: room.id,
      guestName: guest.name,
      type: 'check-in-pressure',
      severity: 1,
      extraBias: guest.incidentBias || 0
    });
    state.logs.push(
      `Chain reaction: desk approval seeded pressure in ${room.label}. If that room slides, incidents and rep loss will follow.`
    );
    pushLiveAlert(state, {
      type: 'warning',
      message: `${room.label} now carries elevated pressure from this check-in. Watch chain growth before it becomes incidents.`,
      dedupeKey: `checkin-chain-${room.id}-${guest.id}`
    });
  }

  if (window.DeadEndPhase2?.pushDecisionFeedback) {
    window.DeadEndPhase2.pushDecisionFeedback({
      repDelta: 1 + Number(policyOutcome.reputationDelta || 0),
      pressureDelta: shouldSeedChain ? 1 : 0,
      message: `${guest.name} accepted.`,
      consequence: shouldSeedChain ? 'Suspicion rises.' : 'Desk flow remains stable.'
    });
  }
  if (window.DeadEndPhase2?.tutorial?.markTutorialDecision) {
    window.DeadEndPhase2.tutorial.markTutorialDecision();
  }

  if (checkFailureState()) return;
  if (progressShift('checkIn')) return;
  updateOnboarding((current) => markTutorialEvent(current, 'desk-action'));
  audioController.playSuccess();
  renderAll();
  } finally {
    releaseActionLock(actionKey);
  }
}

function scanCameraSystem() {
  onMeaningfulAction();
  audioController.playUiClick();
  audioController.playScan();
  const branchContext = getBranchContext(true);
  const beforeCriticalRooms = getCriticalOccupiedRoomCount();
  const unresolvedCarry = registerUnresolvedCameraEvents(state);
  const result = generateCameraScanResult(
    state.cameras,
    state.night,
    state?.narrativeBias || {},
    branchContext,
    state
  );
  state.shiftStats.cameraScans += 1;
  clearCameraScene(state);
  state.cameraScene.resolvedZones = {};

  const mergedScan = mergeCameraScanWithLocationState(state, result);
  state.cameras = mergedScan.cameras;
  state.activeEvents = mergedScan.activeEvents;
  const scanPenalty = Math.max(0, Number(getScenarioModifiers().powerScanPenalty || 0));
  const scanMultiplier = Math.max(0.7, Number(state?.progressionModifiers?.cameraScanCostMult || 1));
  const night = Math.max(1, Number(state?.night || 1));
  let scanCost = Math.max(1, Math.round((getPowerActionCost('scan') + scanPenalty) * scanMultiplier));
  scanCost = scaleRunActionCost(scanCost);
  if (night <= 2 && Number(state?.shiftElapsedMinutes || 0) < 45) scanCost = Math.max(1, scanCost - 1);
  if (night >= 4 && state.activeEvents.length >= 2) scanCost += 1;
  state.power = clampPower(state.power - scanCost);
  state.shiftStats.cameraPowerSpent = (state.shiftStats.cameraPowerSpent || 0) + scanCost;
  state.logs.push(`Camera sweep consumed ${scanCost}% power.`);
  if (getLowPowerStage(state) !== 'normal') {
    pushLiveAlert(state, {
      type: 'warning',
      message: 'Low power is limiting surveillance reliability.',
      dedupeKey: `low-power-scan-${state.night}`
    });
  }
  state.logs = [...state.logs, ...mergedScan.logs];

  if (unresolvedCarry > 0) {
    state.shiftStats.unresolvedLocationScenes =
      (state.shiftStats.unresolvedLocationScenes || 0) + unresolvedCarry;
    state.logs.push(`Unresolved location pressure carried over in ${unresolvedCarry} zone(s).`);
  }

  if (mergedScan.persistentReturns > 0) {
    state.shiftStats.locationPersistentReturns =
      (state.shiftStats.locationPersistentReturns || 0) + mergedScan.persistentReturns;
    const reasonPreview = Array.isArray(mergedScan.returnReasonLines)
      ? mergedScan.returnReasonLines.slice(0, 2).join(' • ')
      : '';
    pushLiveAlert(state, {
      type: 'warning',
      message: `${mergedScan.persistentReturns} location issue(s) resurfaced. ${reasonPreview}`.trim(),
      dedupeKey: `location-return-${state.night}-${state.shiftStats.locationPersistentReturns}`
    });
  }

  if (mergedScan.preEscalations > 0) {
    state.shiftStats.escalatedLocationIssues =
      (state.shiftStats.escalatedLocationIssues || 0) + mergedScan.preEscalations;
  }

  if (getFactionModifiers(state.factions).localOutsideRisk && state.activeEvents.length) {
    applyZonePressure(state.activeEvents[0]?.cameraId, 1, 'local-pressure-spike');
  }

  if (state.activeEvents.length) {
    pushLiveAlert(state, {
      type: 'warning',
      kind: 'actionable',
      message: `Anomaly requires response in ${state.activeEvents[0]?.cameraName || 'camera zone'}.`,
      dedupeKey: `camera-action-needed-${state.night}-${state.activeEvents[0]?.cameraId || 'x'}`
    });
  }

  state.activeEvents.forEach((event) => {
    registerContentExposure(state, {
      kind: 'zone',
      zone: event?.cameraName,
      outsideHeavy: String(event?.cameraName || '').includes('Parking') || String(event?.cameraName || '').includes('Rear')
    });
    registerContentExposure(state, { kind: 'anomaly', status: event?.status });
    const linkedRoomId = event?.cameraId;
    registerRoomChainSignal({
      roomId: linkedRoomId,
      type: `camera-${String(event?.status || 'anomaly').toLowerCase().replace(/\s+/g, '-')}`,
      severity: getSeverityPoints(event?.severity || 'low')
    });
  });

  advanceEscalationState();

  const escalationResult = runAutoEscalation({
    rooms: state.rooms,
    activeEvents: state.activeEvents,
    night: state.night,
    autoIncidentCooldown: state.autoIncidentCooldown
  });

  applyEscalationResult(escalationResult);

  if (escalationResult.generated) {
    state.shiftStats.autoIncidents += 1;
  }

  const highAutoIncidents = Array.isArray(escalationResult.incidents)
    ? escalationResult.incidents.filter((incident) => incident.severity === 'high').length
    : 0;

  if (highAutoIncidents > 0) {
    state.shiftStats.severeIncidents += highAutoIncidents;
  }

  const afterCriticalRooms = getCriticalOccupiedRoomCount();
  if (afterCriticalRooms > beforeCriticalRooms) {
    pushLiveAlert(state, {
      type: 'danger',
      message: 'Camera scan confirms escalating room instability.',
      dedupeKey: `critical-rise-scan-${state.night}-${afterCriticalRooms}`
    });
  }

  if (checkFailureState()) return;
  if (progressShift('scan')) return;
  updateOnboarding((current) => markTutorialEvent(current, 'camera-action'));
  renderAll();
}

function restorePower() {
  onMeaningfulAction();
  audioController.playUiClick();
  const restoreConfig = getRestoreConfig();
  const restoreCheck = canRestorePower(state, restoreConfig);
  if (!restoreCheck.ok) {
    state.logs.push(`Backup restore failed: ${restoreCheck.reason}`);
    pushLiveAlert(state, {
      type: 'warning',
      message: restoreCheck.reason,
      dedupeKey: `restore-blocked-${state.night}-${restoreCheck.reason}`
    });
    renderAll();
    return;
  }

  const previousPower = state.power;
  consumeRestorePower(state, restoreConfig);
  const doctrineMods = getDoctrineModifiers(state?.doctrine || {});
  const night = Math.max(1, Number(state?.night || 1));
  const restoreBase = night <= 2 ? 20 : night >= 5 ? 16 : 18;
  const restoreMult = Math.max(0.7, Number(state?.runModifiers?.restoreGainMult || 1));
  state.power = clampPower(state.power + Math.round(restoreBase * restoreMult) + Number(doctrineMods.emergencyPowerBonus || 0));
  if (state.money <= 18 || state.power <= 30) {
    registerPanicSpend();
  }
  if (Number(doctrineMods.emergencyVolatility || 0) > 0 && Math.random() < 0.35) {
    state.reputation = clampReputation(state.reputation - 1);
    state.logs.push('Emergency overclock introduced visible instability despite restored power.');
  }
  state.shiftStats.emergencyPowerRestores = (state.shiftStats.emergencyPowerRestores || 0) + 1;
  applyIdentityImpact({
    doctrine: { improvisation: 1, stability: -1 },
    factions: { ownership: -1, staff: -1 },
    reason: 'emergency restore used'
  });
  state.logs.push(
    `Emergency generator restored ${restoreBase}% power for $${restoreConfig.restoreCost}. Reserves left: ${state.powerEconomy.restoreCharges}.`
  );
  pushLiveAlert(state, {
    type: 'info',
    message: 'Emergency power restore engaged. Generator reserves reduced.',
    dedupeKey: `restore-used-${state.night}-${state.shiftStats.emergencyPowerRestores}`
  });
  audioController.playPowerAction('restore');
  if (checkFailureState()) return;
  if (state.power !== previousPower && progressShift('restorePower')) return;
  updateOnboarding((current) => markTutorialEvent(current, 'power-action'));
  renderAll();
}

function drainPower() {
  onMeaningfulAction();
  audioController.playUiClick();
  const rerouteCheck = canEmergencyReroute(state);
  if (!rerouteCheck.ok) {
    state.logs.push(`Emergency reroute unavailable: ${rerouteCheck.reason}`);
    renderAll();
    return;
  }

  consumeEmergencyReroute(state);
  const night = Math.max(1, Number(state?.night || 1));
  const rerouteGain = night <= 2 ? 7 : night >= 5 ? 5 : 6;
  state.power = clampPower(state.power + rerouteGain);
  state.reputation = clampReputation(state.reputation - 1);
  if (state.power <= 28 || state.reputation <= 28) {
    registerPanicSpend();
  }
  state.shiftStats.majorPowerIncidents = (state.shiftStats.majorPowerIncidents || 0) + 1;
  applyIdentityImpact({
    doctrine: { improvisation: 1, force: 1, stability: -1 },
    factions: { ownership: -1, guests: -1, locals: -1 },
    reason: 'emergency reroute used'
  });
  applyZonePressure((state.activeEvents[0] || {}).cameraId, 1, 'power-reroute-instability');
  state.logs.push(`Emergency reroute gained ${rerouteGain}% power but destabilized systems and hurt reputation.`);
  pushLiveAlert(state, {
    type: 'warning',
    message: 'Emergency reroute triggered: short power gain, higher instability risk.',
    dedupeKey: `reroute-${state.night}-${state.shiftStats.majorPowerIncidents}`
  });
  audioController.playPowerAction('drain');
  if (checkFailureState()) return;
  if (progressShift('drainPower')) return;
  updateOnboarding((current) => markTutorialEvent(current, 'power-action'));
  renderAll();
}

function closeCameraScene() {
  const ignored = markActiveSceneIgnored(state);
  if (ignored) {
    state.shiftStats.weakSceneDecisions = (state.shiftStats.weakSceneDecisions || 0) + 1;
    pushLiveAlert(state, {
      type: 'warning',
      message: 'Investigation closed without containment. Location pressure rose.',
      dedupeKey: `scene-ignored-${state.night}`
    });
  }
  clearCameraScene(state);
  renderAll();
}

function handleOpenSpecialEncounter(guestId) {
  onMeaningfulAction();
  audioController.playUiClick();
  openSpecialEncounterForGuest(state, guestId);
  renderAll();
}

function handleCloseSpecialEncounter() {
  onMeaningfulAction();
  audioController.playUiClick();
  closeSpecialEncounter(state);
  renderAll();
}

function handleSpecialEncounterChoice(guestId, optionId) {
  const actionKey = `special-choice-${guestId}`;
  if (!acquireActionLock(actionKey)) return;
  try {
  onMeaningfulAction();
  audioController.playUiClick();
  const result = resolveSpecialEncounterChoice(state, guestId, optionId);
  if (!result?.ok) {
    renderAll();
    return;
  }

  if (Array.isArray(result.logs) && result.logs.length) {
    state.logs = [...state.logs, ...result.logs];
  }
  if (Array.isArray(result.alerts) && result.alerts.length) {
    result.alerts.forEach((message, index) => {
      pushLiveAlert(state, {
        type: result.success ? 'success' : 'warning',
        message,
        dedupeKey: `special-encounter-alert-${guestId}-${optionId}-${index}-${state.night}`
      });
    });
  }
  pushLiveAlert(state, {
    type: result.success ? 'success' : 'warning',
    message: result.success
      ? 'Incident contained.'
      : 'Containment partial. New escalation may occur later.',
    dedupeKey: `special-choice-outcome-${guestId}-${optionId}-${state.night}`
  });

  closeSpecialEncounter(state);
  const guest = (state?.guests || []).find((entry) => entry.id === guestId);
  const encounterId = guest?.specialEncounter?.id;
  if (encounterId) {
    registerContentExposure(state, {
      kind: 'special',
      id: encounterId,
      authorityHeavy: String(encounterId).includes('investigator') || String(encounterId).includes('off-duty')
    });
  }
  const optionKey = String(optionId || '').toLowerCase();
  if (optionKey.includes('privacy') || optionKey.includes('discreet')) {
    applyIdentityImpact({
      doctrine: { secrecy: 2, stability: 1 },
      factions: { guests: 1, authorities: 1 },
      reason: 'discreet special handling'
    });
  } else if (optionKey.includes('deny') || optionKey.includes('reject') || optionKey.includes('challenge')) {
    applyIdentityImpact({
      doctrine: { control: 1, force: 1, compassion: -1 },
      factions: { guests: -1, locals: -1 },
      stats: { harshDeskActions: 1 },
      reason: 'harsh special handling'
    });
  } else {
    applyIdentityImpact({
      doctrine: { compassion: 1, stability: 1 },
      factions: { guests: 1, staff: 1 },
      reason: 'balanced special handling'
    });
  }
  if (checkFailureState()) return;
  renderAll();
  } finally {
    releaseActionLock(actionKey);
  }
}

function handleRespondNightEvent() {
  onMeaningfulAction();
  audioController.playUiClick();
  openNightEventOverlay(state);
  renderAll();
}

function handleCloseNightEvent() {
  onMeaningfulAction();
  audioController.playUiClick();
  closeNightEventOverlay(state);
  renderAll();
}

function closeTopOverlayIfOpen() {
  if (settingsOverlayOpen) {
    toggleSettingsOverlay(false);
    return true;
  }

  if (onboardingState?.helpOverlayOpen) {
    toggleHelpOverlay(false);
    return true;
  }

  if (state?.cameraScene?.activeScene) {
    closeCameraScene();
    return true;
  }

  const specialGuestId = state?.activeSpecialEncounterGuestId;
  const specialGuest = (state?.guests || []).find((entry) => entry.id === specialGuestId);
  const specialOpen = Boolean(specialGuest?.specialEncounter && !specialGuest.specialEncounter.resolved);
  if (specialOpen) {
    handleCloseSpecialEncounter();
    return true;
  }

  if (state?.activeNightEvent && state?.nightEventOverlayOpen) {
    handleCloseNightEvent();
    return true;
  }

  return false;
}

function handleNightEventChoice(optionId) {
  const activeEventId = state?.activeNightEvent?.id || 'none';
  const actionKey = `night-event-choice-${activeEventId}`;
  if (!acquireActionLock(actionKey)) return;
  try {
  onMeaningfulAction();
  audioController.playUiClick();
  const trackedEventId = state?.activeNightEvent?.id || null;
  const result = resolveNightEventChoice(state, optionId);
  if (trackedEventId) {
    registerContentExposure(state, { kind: 'event', id: trackedEventId });
  }
  if (!result?.ok) {
    renderAll();
    return;
  }

  applyNightEventPressureEffects(result.effects || {}, optionId);
  if (Array.isArray(result.logs) && result.logs.length) {
    state.logs = [...state.logs, ...result.logs];
  }
  if (Array.isArray(result.alerts) && result.alerts.length) {
    result.alerts.forEach((message, index) => {
      pushLiveAlert(state, {
        type: result.success ? 'success' : 'warning',
        message,
        dedupeKey: `night-event-choice-${state.night}-${optionId}-${index}`
      });
    });
  }
  pushLiveAlert(state, {
    type: result.success ? 'success' : 'warning',
    message: result.success
      ? 'Incident contained.'
      : 'Pressure reduced, but follow-up risk remains.',
    dedupeKey: `night-event-outcome-${state.night}-${optionId}`
  });

  if (result.success) {
    state.shiftStats.nightEventsResolved = (state.shiftStats.nightEventsResolved || 0) + 1;
    registerFinaleContainment(state, 1);
    applyIdentityImpact({
      doctrine: { stability: 1, control: 1 },
      factions: { ownership: 1, staff: 1 },
      reason: 'night event resolved'
    });
  } else {
    applyIdentityImpact({
      doctrine: { improvisation: 1, stability: -1 },
      factions: { ownership: -1, locals: -1 },
      reason: 'night event unstable response'
    });
  }

  if (checkFailureState()) return;
  if (progressShift('dispatch')) return;
  renderAll();
  } finally {
    releaseActionLock(actionKey);
  }
}

function investigateCameraZone(cameraId) {
  onMeaningfulAction();
  audioController.playUiClick();
  const scene = openCameraScene(state, cameraId);
  if (!scene) {
    state.logs.push('No actionable anomaly in that camera zone.');
    renderAll();
    return;
  }

  state.logs.push(`Investigation uplink opened for ${scene.zoneName}. Choose one response.`);
  registerContentExposure(state, {
    kind: 'zone',
    zone: scene.zoneName,
    outsideHeavy: scene.zoneName === 'Parking Lot' || scene.zoneName === 'Rear Exit'
  });
  state.shiftStats.investigationsPerformed = (state.shiftStats.investigationsPerformed || 0) + 1;
  state.shiftStats.locationInvestigations = (state.shiftStats.locationInvestigations || 0) + 1;
  applyIdentityImpact({
    doctrine: { control: 1, secrecy: 1 },
    factions: { staff: 1, authorities: 1 },
    reason: 'camera investigation opened'
  });
  if (checkFailureState()) return;
  updateOnboarding((current) => markTutorialEvent(current, 'camera-action'));
  renderAll();
}

function handleCameraSceneAction(zoneId, actionId) {
  const actionKey = `camera-scene-choice-${zoneId}`;
  if (!acquireActionLock(actionKey)) return;
  try {
  onMeaningfulAction();
  audioController.playUiClick();
  const selectedAction = state?.cameraScene?.activeScene?.actions?.find((entry) => entry?.id === actionId) || null;
  const precheckCosts = computeCameraSceneActionCosts(state, selectedAction || {});
  const precheckMoneyCost = Math.max(0, Number(precheckCosts.moneyCost || 0));
  const precheckPowerCost = Math.max(0, Number(precheckCosts.powerCost || 0));

  if (precheckMoneyCost > 0 && state.money < precheckMoneyCost) {
    state.logs.push('Response cancelled: insufficient funds for this location action.');
    pushLiveAlert(state, {
      type: 'warning',
      message: 'Insufficient funds for this investigation response.',
      dedupeKey: `scene-no-money-${zoneId}-${state.night}`
    });
    renderAll();
    return;
  }

  if (precheckPowerCost > 0 && state.power < precheckPowerCost) {
    state.logs.push('Response cancelled: insufficient power for this location action.');
    pushLiveAlert(state, {
      type: 'warning',
      message: 'Insufficient power for this investigation response.',
      dedupeKey: `scene-no-power-${zoneId}-${state.night}`
    });
    renderAll();
    return;
  }

  const result = resolveCameraSceneAction(state, zoneId, actionId);
  const sceneZone = state?.cameraScene?.activeScene?.zoneName;
  if (sceneZone) {
    registerContentExposure(state, {
      kind: 'zone',
      zone: sceneZone,
      outsideHeavy: sceneZone === 'Parking Lot' || sceneZone === 'Rear Exit'
    });
    if (sceneZone === 'Parking Lot' || sceneZone === 'Rear Exit') {
      state.shiftStats.outsideIssueCount = (state.shiftStats.outsideIssueCount || 0) + 1;
    }
  }
  if (!result) return;

  if (Array.isArray(result.logs) && result.logs.length) {
    state.logs = [...state.logs, ...result.logs];
  }

  if (result.blocked) {
    if (result.alert?.message) {
      pushLiveAlert(state, {
        type: result.alert.type || 'warning',
        message: result.alert.message,
        dedupeKey: `scene-blocked-${zoneId}-${state.night}`
      });
    }
    renderAll();
    return;
  }

  const adjustedMoneyCost = Math.max(0, Number(result.appliedMoneyCost || precheckMoneyCost || 0));
  const adjustedPowerCost = Math.max(0, Number(result.appliedPowerCost || precheckPowerCost || 0));

  if (adjustedMoneyCost > 0) {
    state.money = Math.max(0, state.money - adjustedMoneyCost);
  }
  if (adjustedPowerCost > 0) {
    state.power = clampPower(state.power - adjustedPowerCost);
    state.shiftStats.investigationPowerSpent =
      (state.shiftStats.investigationPowerSpent || 0) + adjustedPowerCost;
    state.logs.push(`Scene response consumed ${adjustedPowerCost}% power.`);
  }
  if ((adjustedMoneyCost >= 10 || adjustedPowerCost >= 6) && (state.money <= 24 || state.power <= 32)) {
    registerPanicSpend();
  }
  if ((result.reputationDelta || 0) !== 0) {
    state.reputation = clampReputation(state.reputation + result.reputationDelta);
  }

  if (result.strongContainment) {
    state.shiftStats.strongContainmentActions = (state.shiftStats.strongContainmentActions || 0) + 1;
  }
  if (result.weakDecision) {
    state.shiftStats.weakSceneDecisions = (state.shiftStats.weakSceneDecisions || 0) + 1;
  }
  if (result.heavyResponse) {
    state.shiftStats.powerHeavyResponses = (state.shiftStats.powerHeavyResponses || 0) + 1;
  }
  if (result.escalatedIssue) {
    state.shiftStats.escalatedLocationIssues = (state.shiftStats.escalatedLocationIssues || 0) + 1;
  }
  if (result.unresolvedPersists) {
    state.shiftStats.unresolvedLocationScenes = (state.shiftStats.unresolvedLocationScenes || 0) + 1;
  }

  if (result.outcomeKey === 'resolved' || result.outcomeKey === 'falseAlarm') {
    state.activeEvents = state.activeEvents.filter(
      (event) => String(event.cameraId) !== String(zoneId)
    );
    state.cameras = state.cameras.map((camera) =>
      String(camera.id) === String(zoneId)
        ? {
            ...camera,
            status: 'Clear'
          }
        : camera
    );
    state.cameraScene.resolvedZones[zoneId] = true;
    downgradeZonePressure(zoneId, result.outcomeKey === 'falseAlarm' ? 1 : 2);
    if (result.outcomeKey === 'resolved') {
      setZoneCondition(zoneId, 'Watch');
      state.shiftStats.sceneResolved = (state.shiftStats.sceneResolved || 0) + 1;
      state.shiftStats.quietResolutions = (state.shiftStats.quietResolutions || 0) + 1;
      state.shiftStats.storyResolutions = (state.shiftStats.storyResolutions || 0) + 1;
      applyIdentityImpact({
        doctrine: { stability: 1, control: 1 },
        factions: { staff: 1, ownership: 1 },
        reason: 'camera scene resolved'
      });
      registerFinaleContainment(state, 1);
    }
  } else if (result.outcomeKey === 'moved') {
    state.activeEvents = state.activeEvents.map((event) =>
      String(event.cameraId) === String(zoneId)
        ? {
            ...event,
            severity: result.nextSeverity || event.severity,
            status: result.nextStatus || event.status
          }
        : event
    );
    if (result.nextStatus) {
      state.cameras = state.cameras.map((camera) =>
        String(camera.id) === String(zoneId)
          ? {
              ...camera,
              status: result.nextStatus
            }
          : camera
      );
    }
    state.logs.push(
      `Containment partial in zone ${zoneId}: threat remains active at ${result.nextStageLabel || 'updated stage'}.`
    );
    applyZonePressure(zoneId, Math.max(1, Number(result.chainPressure || 1)), 'scene-moved');
    const fallback = state.rooms.find((room) => room.occupiedBy && String(room.id) !== String(zoneId));
    if (fallback) {
      applyZonePressure(fallback.id, Math.max(1, Number(result.spilloverPressure || 1)), 'scene-spillover');
      state.logs.push(`Spillover pressure now threatens ${fallback.label}.`);
    }
  } else if (result.outcomeKey === 'escalated') {
    state.activeEvents = state.activeEvents.map((event) =>
      String(event.cameraId) === String(zoneId)
        ? {
            ...event,
            severity: result.nextSeverity || event.severity,
            status: result.nextStatus || event.status
          }
        : event
    );
    if (result.nextStatus) {
      state.cameras = state.cameras.map((camera) =>
        String(camera.id) === String(zoneId)
          ? {
              ...camera,
              status: result.nextStatus
            }
          : camera
      );
    }
    state.logs.push(
      `Response failed in zone ${zoneId}: incident escalated to ${result.nextStageLabel || 'higher stage'}.`
    );
    applyZonePressure(zoneId, Math.max(2, Number(result.chainPressure || 2)), 'scene-escalated');
    setZoneCondition(zoneId, result.setCondition || 'Critical');
    state.shiftStats.sceneFailed = (state.shiftStats.sceneFailed || 0) + 1;
    state.shiftStats.storyEscalations = (state.shiftStats.storyEscalations || 0) + 1;
    applyIdentityImpact({
      doctrine: { force: 1, improvisation: 1, stability: -1 },
      factions: { guests: -1, ownership: -1, locals: -1 },
      reason: 'camera scene escalated'
    });
  }

  if (result.alert?.message) {
    pushLiveAlert(state, {
      type: result.alert.type || 'info',
      message: result.alert.message,
      dedupeKey: `scene-${zoneId}-${result.outcomeKey}-${state.night}`
    });
  }

  const responseSummary =
    result.outcomeKey === 'resolved'
      ? `Containment successful. ${result.containmentTierLabel || 'Containment'} applied.`
      : result.outcomeKey === 'falseAlarm'
        ? `Low-confidence containment. Zone is now ${String(result.stabilityStatusLabel || 'under watch').toLowerCase()}.`
        : result.outcomeKey === 'moved'
          ? `Temporary deterrence applied. Threat remains active at ${result.nextStageLabel || 'an updated stage'}. Stronger follow-up may be required.`
          : `Response failed to secure the area. Incident escalated to ${result.nextStageLabel || 'a higher threat stage'}.`;
  const stateTransitionSummary =
    result.outcomeKey === 'resolved' || result.outcomeKey === 'falseAlarm'
      ? ''
      : ` State: ${result.previousStageLabel || 'Current stage'} (${String(result.previousSeverity || 'low').toUpperCase()}) → ${result.nextStageLabel || 'Updated stage'} (${String(result.nextSeverity || 'medium').toUpperCase()}).`;
  const resourceCost = [];
  if (adjustedPowerCost > 0) resourceCost.push(`-${adjustedPowerCost}% power`);
  if (adjustedMoneyCost > 0) resourceCost.push(`-$${adjustedMoneyCost}`);
  const costSuffix = resourceCost.length ? ` Final cost: ${resourceCost.join(' • ')}.` : '';
  const durabilitySuffix = result.outcomeKey === 'escalated'
    ? ''
    : ` Zone status: ${result.stabilityStatusLabel || 'Under watch'} • ${result.containmentTierLabel || 'Containment'}${
      Number(result.protectedScansRemaining || 0) > 0
        ? ` • Protected scans: ${result.protectedScansRemaining}`
        : ''
    }${
      Number(result.recurrenceSuppression || 0) > 0
        ? ` • Recurrence suppression: ${Math.round(Number(result.recurrenceSuppression || 0) * 100)}%`
        : ''
    }.`;
  const guidanceSuffix = result.durabilityGuidance ? ` ${result.durabilityGuidance}` : '';
  const reasonSuffix = result.statusNote ? ` ${result.statusNote}` : '';

  const debugAudit = {
    night: Number(state?.night || 1),
    zoneId: String(zoneId),
    actionId: String(actionId),
    displayedPowerCost: precheckPowerCost,
    displayedMoneyCost: precheckMoneyCost,
    deductedPowerCost: adjustedPowerCost,
    deductedMoneyCost: adjustedMoneyCost,
    outcomeKey: result.outcomeKey,
    incidentClosed: result.outcomeKey === 'resolved' || result.outcomeKey === 'falseAlarm',
    nextStage: result.nextStageLabel || null,
    nextSeverity: result.nextSeverity || null
  };
  state.debugIncidentAudit = Array.isArray(state.debugIncidentAudit)
    ? [...state.debugIncidentAudit.slice(-23), debugAudit]
    : [debugAudit];

  pushLiveAlert(state, {
    type: result.outcomeKey === 'resolved' || result.outcomeKey === 'falseAlarm' ? 'success' : 'warning',
    message: `${responseSummary}${stateTransitionSummary}${costSuffix}${durabilitySuffix}${guidanceSuffix}${reasonSuffix}`,
    dedupeKey: `camera-scene-outcome-${zoneId}-${actionId}-${state.night}`
  });

  clearCameraScene(state);
  if (checkFailureState()) return;
  if (progressShift('dispatch', { skipPassiveDrain: true })) return;
  renderAll();
  } finally {
    releaseActionLock(actionKey);
  }
}

function endNight(options = {}) {
  if (activeScreenId !== 'game-screen' && !options.force) {
    return false;
  }
  onMeaningfulAction();
  audioController.playUiClick();
  if (!options.force && !hasReachedDawn(state)) {
    state.logs.push('You cannot end the shift early. Hold the motel until dawn.');
    pushLiveAlert(state, {
      type: 'warning',
      message: 'Ending early denied — survive until dawn.',
      dedupeKey: `end-early-denied-night-${state.night}`
    });
    audioController.playAlert('normal');
    renderAll();
    return false;
  }

  if (options.force) {
    state.shiftElapsedMinutes = SHIFT_DURATION_MINUTES;
    state.lastAdvanceReason = state.lastAdvanceReason || 'dawn';
  }

  const unresolvedZones = Object.values(state?.locationState?.zones || {}).filter(
    (zone) => zone?.pendingIssue || Number(zone?.followupPressure || 0) > 0 || Number(zone?.unresolvedCount || 0) > 0
  ).length;
  const escalatedZones = Object.values(state?.locationState?.zones || {}).filter(
    (zone) => Number(zone?.issueStage || 0) >= 3
  ).length;
  state.shiftStats.unresolvedLocationScenes = Math.max(
    state.shiftStats.unresolvedLocationScenes || 0,
    unresolvedZones
  );
  state.shiftStats.escalatedLocationIssues = Math.max(
    state.shiftStats.escalatedLocationIssues || 0,
    escalatedZones
  );

  if (state.activeNightEvent) {
    state.shiftStats.nightEventsMissed = (state.shiftStats.nightEventsMissed || 0) + 1;
    state.logs.push(`Shift ended with unresolved active event: ${state.activeNightEvent.title}.`);
    state.activeNightEvent = null;
    state.nightEventOverlayOpen = false;
  }

  state.guests.forEach((guest) => recordSpecialEncounterMiss(state, guest));

  analyzeNightCarryover(state, state.night);
  const threadUpdate = advanceStoryThreadsAfterNight(state, state.night);
  state.shiftStats.threadsEscalated = (state.shiftStats.threadsEscalated || 0) + Number(threadUpdate?.escalated || 0);
  state.shiftStats.threadsAdvancedCleanly =
    (state.shiftStats.threadsAdvancedCleanly || 0) + Number(threadUpdate?.stabilized || 0);
  if ((state.shiftStats.nightEventsMissed || 0) === 0 && (state.shiftStats.unresolvedLocationScenes || 0) === 0) {
    state.shiftStats.carryoverProblemsContained = (state.shiftStats.carryoverProblemsContained || 0) + 1;
  }
  const nextNightIndex = Number(state.night || 1) + 1;
  state.carryoverBriefing = buildIncomingNightNotes(state, nextNightIndex);

  renderTopbar(buildRenderState());

  const summary = buildNightSummary(state);
  state.lastSummary = summary;
  state.finalePerformance = buildFinalePerformanceContext(state);
  registerCampaignNightSuccess(state, { summary });
  const campaignContext = getCampaignContext();
  const shouldEndRun = shouldEndRunAfterSuccessfulNight(state, state.night);
  state.pendingRunCompletion = shouldEndRun;
  if (shouldEndRun) {
    state.finalePressurePeak = Math.max(Number(state.finalePressurePeak || 0), Number(state?.finaleDirector?.pressurePeak || 0));
    state.campaign.finaleSurvived = Boolean(state?.finaleDirector?.trueFinalNight);
    state.runEnding = buildRunEndingPackage(buildRenderState());
    const alreadyGranted = Boolean(state?.campaign?.metaRewardGranted);
    if (!alreadyGranted) {
      const metaRewardResult = applyRunCompletionMetaRewards(metaState, {
        ending: state.runEnding,
        state
      });
      metaState = metaRewardResult.meta;
      saveMetaSafe();
      state.runEnding.metaReward = metaRewardResult.reward;
      state.campaign.metaRewardGranted = true;
    } else if (metaState?.lastRunReward) {
      state.runEnding.metaReward = metaState.lastRunReward;
    }
    state.runEnding.metaArchive = buildMetaArchiveSummary(metaState);
    state.campaign.runEndingKey = state.runEnding?.key || null;
    state.campaign.runEndingGrade = state.runEnding?.grade || null;
  }

  state.campaignSummaryNotes = [
    campaignContext.progress.completedLabel,
    state?.finalePerformance?.line || '',
    shouldEndRun
      ? 'Final campaign night complete. The motel legacy is ready for review.'
      : campaignContext.nextMilestone.isFinale
        ? 'Final night approaching: tomorrow decides the motel’s long-run posture.'
        : campaignContext.nextMilestone.isMilestone
          ? `Night ${campaignContext.nextMilestone.night} will be a heavier ${campaignContext.nextMilestone.label.toLowerCase()} shift.`
          : `Night ${campaignContext.nextMilestone.night} outlook: ${campaignContext.nextMilestone.atmosphere}`
  ].slice(0, 3);

  const branchContext = getBranchContext(true);
  const doctrineNotes = buildDoctrineShiftNotes(state.doctrine, 2);
  const factionLines = buildFactionSummaryLines(state.factions, 3);
  const branchLines = Array.isArray(branchContext?.summaryNotes) ? branchContext.summaryNotes : [];
  state.summaryBranchNotes = [
    ...(state?.finalePerformance?.label ? [`Finale result: ${state.finalePerformance.label}`] : []),
    ...branchLines
  ].slice(0, 4);
  state.summaryIdentityLines = [...doctrineNotes, ...factionLines].slice(0, 4);
  if ((state.shiftStats.nightEventsMissed || 0) === 0 && (state.shiftStats.unresolvedLocationScenes || 0) === 0) {
    applyIdentityImpact({
      doctrine: { stability: 1, compassion: 1 },
      factions: { ownership: 1, staff: 1, guests: 1 },
      reason: 'calm night close'
    });
  }
  const outcomeFlavor = buildOutcomeFlavor(state, summary);
  const phase2ResultLabel = window.DeadEndPhase2?.buildReplaySummary
    ? window.DeadEndPhase2.buildReplaySummary(state, summary)
    : '';
  if (phase2ResultLabel) {
    outcomeFlavor.note = `${outcomeFlavor.note || ''}${outcomeFlavor.note ? ' • ' : ''}Run Result: ${phase2ResultLabel}`;
    state.campaignSummaryNotes = [`Run Result: ${phase2ResultLabel}`, ...(state.campaignSummaryNotes || [])].slice(0, 3);
  }
  state.shiftPressureSnapshot = buildShiftPressureSnapshot(summary);
  if (options.force) {
    audioController.playDawn();
  } else {
    audioController.playSummary();
  }
  renderSummary(summary, state, outcomeFlavor);
  updateOnboarding((current) => markTutorialEvent(current, 'night-complete', { night: state.night }));
  setActiveScreen('summary-screen');
  const nextNightButton = document.getElementById('next-night-btn');
  if (nextNightButton) {
    nextNightButton.textContent = shouldEndRun ? 'View Run Ending' : 'Next Night';
  }
  return true;
}

function reviewIncidents() {
  onMeaningfulAction();
  audioController.playUiClick();
  normalizeAdminSpamState(state);
  const preActionable = hasActionableIncidentReviewContext(state.rooms);
  const occupiedCount = (state.rooms || []).filter((r) => r?.occupiedBy).length;
  if (!occupiedCount) {
    state.shiftStats.manualReviews = (state.shiftStats.manualReviews || 0) + 1;
    state.logs.push('Incident review: no occupied rooms — paperwork only.');
    state.adminSpam.reviewLowValueStreak = (state.adminSpam.reviewLowValueStreak || 0) + 1;
    const streak = Math.min(8, Number(state.adminSpam.reviewLowValueStreak || 0));
    const scale = Math.max(0.08, 0.14 - streak * 0.012);
    if (streak >= 4) {
      state.reputation = clampReputation(state.reputation - 1);
      state.logs.push('Repeated empty incident reviews are irritating ownership.');
    }
    if (checkFailureState()) return;
    if (
      progressShift('review', {
        timeScale: scale,
        passiveDrainScale: 0.35,
        minutesOverride: Math.round(15 * scale)
      })
    ) {
      return;
    }
    updateOnboarding((current) => markTutorialEvent(current, 'report-action'));
    renderAll();
    return;
  }

  const result = reviewRoomIncidents(state.rooms, state.night);
  const scenarioIncidentBonus = Math.max(0, Number(getScenarioModifiers().incidentBonus || 0));
  const night = Math.max(1, Number(state?.night || 1));
  const reportPowerCost = night <= 2 ? 1 : night >= 4 ? 2 : 1;
  const meaningful = preActionable || Number(result.generated || 0) > 0;
  const streak = meaningful ? 0 : Math.min(8, Number(state.adminSpam.reviewLowValueStreak || 0) + 1);
  state.adminSpam.reviewLowValueStreak = meaningful ? 0 : streak;
  const lowValueScale = meaningful
    ? 1
    : Math.max(0.12, 0.55 - streak * 0.06);
  const powerCost = meaningful ? reportPowerCost : Math.max(0, reportPowerCost - 1);
  state.power = clampPower(state.power - powerCost);
  state.shiftStats.manualReviews += 1;
  state.shiftStats.incidentReviewCount = (state.shiftStats.incidentReviewCount || 0) + 1;
  state.shiftStats.reportActionsUsed = (state.shiftStats.reportActionsUsed || 0) + 1;
  state.shiftStats.reportActionCosts = (state.shiftStats.reportActionCosts || 0) + powerCost;

  state.rooms = result.rooms;
  state.logs = [...state.logs, ...result.logs];
  state.incidents = Array.isArray(result.incidents)
    ? [...state.incidents, ...result.incidents]
    : state.incidents;

  const reviewIncidents = Array.isArray(result.incidents) ? result.incidents : [];
  reviewIncidents.forEach((incident) => {
    markRoomMemory(incident.roomId, {
      incidentsSeen: 1,
      signature: incident.type,
      note: `${incident.type} was previously logged here.`
    });
    registerRoomChainSignal({
      roomId: incident.roomId,
      guestName: incident.guestName,
      type: `review-${incident.type || 'incident'}`,
      severity: getSeverityPoints(incident.severity) + scenarioIncidentBonus
    });
  });

  if (meaningful && Math.random() < (state?.crisisNight?.active ? 0.22 : 0.08)) {
    const target = (state.rooms || []).find((room) => room?.occupiedBy && room?.condition !== 'Critical');
    if (target) {
      target.condition = target.condition === 'Stable' ? 'Watch' : 'Critical';
      state.logs.push(`Signature incident: a hallway-wide knock pattern converged on ${target.label}, turning scattered pressure into a property-wide warning.`);
      pushLiveAlert(state, {
        type: 'warning',
        message: `Signature incident: ${target.label} just became the center of a motel-wide pressure spike.`,
        dedupeKey: `signature-incident-${target.id}-${state.night}-${state.shiftElapsedMinutes}`
      });
      markRoomMemory(target.id, {
        incidentsSeen: 1,
        harshActions: 0,
        signature: 'hallway-knock-pattern',
        note: 'A signature hallway knock pattern has been logged here.'
      });
      state.shiftStats.severeIncidents = (state.shiftStats.severeIncidents || 0) + 1;
    }
  }

  if (typeof result.reputationDelta === 'number') {
    state.reputation = clampReputation(state.reputation + result.reputationDelta);
  }

  if (typeof result.powerDelta === 'number' && result.powerDelta !== 0) {
    state.power = clampPower(state.power + result.powerDelta);
  }

  if (state.power <= 30 && reportPowerCost >= 2) {
    registerPanicSpend();
  }

  if (typeof result.generated === 'number' && result.generated > 0) {
    state.shiftStats.manualIncidents += result.generated;
  }

  const highManualIncidents = Array.isArray(result.incidents)
    ? result.incidents.filter((incident) => incident.severity === 'high').length
    : 0;

  if (highManualIncidents > 0) {
    state.shiftStats.severeIncidents += highManualIncidents;
  }

  if (meaningful) {
    state.autoIncidentCooldown = Math.max(state.autoIncidentCooldown, 1);
    applyIdentityImpact({
      doctrine: { control: 1, stability: 1 },
      factions: { authorities: 1, ownership: 1 },
      reason: 'manual incident review'
    });
  } else {
    state.logs.push('Incident review found no new confirmations; time cost is minimal.');
    if (streak >= 3) {
      state.reputation = clampReputation(state.reputation - 1);
    }
  }

  if (checkFailureState()) return;
  if (
    progressShift('review', {
      timeScale: lowValueScale,
      passiveDrainScale: meaningful ? 1 : 0.4,
      minutesOverride: meaningful ? undefined : Math.round(15 * lowValueScale)
    })
  ) {
    return;
  }
  updateOnboarding((current) => markTutorialEvent(current, 'report-action'));
  renderAll();
}

function dispatchStaff() {
  onMeaningfulAction();
  audioController.playUiClick();
  audioController.playDispatch();
  normalizeAdminSpamState(state);
  const identity = getIdentityContext();
  const previewTarget = peekDispatchStaffTargetRoom(state.rooms);
  if (!previewTarget) {
    state.shiftStats.reportActionsUsed = (state.shiftStats.reportActionsUsed || 0) + 1;
    state.adminSpam.dispatchEmptyStreak = (state.adminSpam.dispatchEmptyStreak || 0) + 1;
    const streak = Math.min(8, Number(state.adminSpam.dispatchEmptyStreak || 0));
    state.logs.push('Staff dispatch: no occupied room currently warrants a priority response.');
    if (streak >= 3) {
      state.reputation = clampReputation(state.reputation - 1);
      state.logs.push('Ownership notes unnecessary staff callouts when nothing is actionable.');
    }
    const scale = Math.max(0.09, 0.15 - streak * 0.014);
    if (checkFailureState()) return;
    if (
      progressShift('dispatch', {
        timeScale: scale,
        passiveDrainScale: 0.3,
        minutesOverride: Math.round(20 * scale)
      })
    ) {
      return;
    }
    updateOnboarding((current) => markTutorialEvent(current, 'report-action'));
    renderAll();
    return;
  }

  const result = dispatchStaffResponse(state.rooms, state.night, {
    dispatchSuccessBonus:
      Number(state?.progressionModifiers?.dispatchSuccessBonus || 0) +
      Number(identity.doctrineMods.dispatchBonus || 0) +
      Number(identity.factionMods.staffDispatchBonus || 0)
  });

  state.rooms = result.rooms;

  const night = Math.max(1, Number(state?.night || 1));
  const dispatchFee = night <= 2 ? 2 : night >= 5 ? 6 : night >= 4 ? 4 : 3;
  if (state.money < dispatchFee) {
    pushLiveAlert(state, {
      type: 'warning',
      message: 'Dispatch unavailable: insufficient funds for staff mobilization.',
      dedupeKey: `dispatch-no-funds-${state.night}`
    });
    renderAll();
    return;
  }
  state.money = Math.max(0, state.money - dispatchFee);
  state.shiftStats.reportActionsUsed = (state.shiftStats.reportActionsUsed || 0) + 1;
  state.shiftStats.reportActionCosts = (state.shiftStats.reportActionCosts || 0) + dispatchFee;
  state.adminSpam.dispatchEmptyStreak = 0;

  if (Array.isArray(result.logs) && result.logs.length) {
    state.logs = [...state.logs, ...result.logs];
  }

  if (typeof result.reputationDelta === 'number' && result.reputationDelta !== 0) {
    state.reputation = Math.max(0, state.reputation + result.reputationDelta);
  }

  if (typeof result.powerDelta === 'number' && result.powerDelta !== 0) {
    state.power = clampPower(state.power + result.powerDelta);
    if (result.powerDelta < 0) {
      state.shiftStats.dispatchPowerSpent =
        (state.shiftStats.dispatchPowerSpent || 0) + Math.abs(result.powerDelta);
    }
  }

  if ((dispatchFee >= 4 || Math.abs(Number(result.powerDelta || 0)) >= 4) && (state.money <= 26 || state.power <= 32)) {
    registerPanicSpend();
  }

  if (result.roomId != null) {
    calmRoomChain(result.roomId, 2);
  }

  if (result.responded && result.success) {
    registerFinaleContainment(state, 1);
    applyIdentityImpact({
      doctrine: { stability: 1, compassion: 1 },
      factions: { staff: 1, ownership: 1 },
      stats: { staffAssists: 1 },
      reason: 'staff dispatch success'
    });
  }

  if (result.responded && result.success === false) {
    pushLiveAlert(state, {
      type: 'warning',
      message: 'Staff response failed to stabilize the target room.',
      dedupeKey: `staff-failed-${result.roomId || 'none'}-${state.night}`
    });
    audioController.playAlert('high');
    applyIdentityImpact({
      doctrine: { improvisation: 1, stability: -1 },
      factions: { staff: -1, ownership: -1 },
      reason: 'staff dispatch failed'
    });
  }

  if (checkFailureState()) return;
  if (progressShift('dispatch')) return;
  updateOnboarding((current) => markTutorialEvent(current, 'report-action'));
  renderAll();
}

function lockDownRoom(roomId) {
  onMeaningfulAction();
  audioController.playUiClick();
  const roomIndex = state.rooms.findIndex((room) => room.id === roomId);
  if (roomIndex === -1) return;

  const result = applyLockdownToRoom(state.rooms[roomIndex]);
  state.rooms[roomIndex] = result.room;

  if (Array.isArray(result.logs) && result.logs.length) {
    state.logs = [...state.logs, ...result.logs];
  }

  if (typeof result.reputationDelta === 'number' && result.reputationDelta !== 0) {
    state.reputation = Math.max(0, state.reputation + applyTacticalPenaltyAdjustments(result.reputationDelta));
  }

  if (typeof result.powerDelta === 'number' && result.powerDelta !== 0) {
    state.power = clampPower(state.power + result.powerDelta);
  }

  calmRoomChain(roomId, 3);
  const doctrineMods = getDoctrineModifiers(state?.doctrine || {});
  if (Number(doctrineMods.policeRepBonus || 0) > 0) {
    calmRoomChain(roomId, 1);
  }
  maybeApplyTacticalStabilization(roomId);
  applyIdentityImpact({
    doctrine: { control: 1, force: 1 },
    factions: { authorities: 1, guests: -1, locals: -1 },
    reason: 'lockdown used'
  });

  if (result.success && Number(result.deferredReputationDelta || 0)) {
    queueDeferredShiftCost({
      turnsRemaining: 2,
      reputationDelta: result.deferredReputationDelta,
      logLine: result.deferredLogLine || 'Deferred lockdown audit pressure lands on the desk.'
    });
  }
  markRoomMemory(roomId, {
    harshActions: 1,
    signature: 'lockdown',
    note: 'Lockdown history remains attached to this room.'
  });
  if (result.success) {
    pushLiveAlert(state, {
      type: 'warning',
      message: `${state.rooms[roomIndex].label} locked down. Immediate spillover is lower, but delayed complaint pressure is now pending.`,
      dedupeKey: `lockdown-now-later-${roomId}-${state.night}`
    });
  }

  if (checkFailureState()) return;
  if (progressShift('lockdown')) return;
  renderAll();
}

function callPoliceForRoom(roomId) {
  onMeaningfulAction();
  audioController.playUiClick();
  audioController.playPolice();
  const roomIndex = state.rooms.findIndex((room) => room.id === roomId);
  if (roomIndex === -1) return;

  const result = applyPoliceToRoom(state.rooms[roomIndex]);
  state.rooms[roomIndex] = result.room;

  if (Array.isArray(result.logs) && result.logs.length) {
    state.logs = [...state.logs, ...result.logs];
  }

  if (typeof result.reputationDelta === 'number' && result.reputationDelta !== 0) {
    const factionMods = getFactionModifiers(state.factions || {});
    state.reputation = Math.max(
      0,
      state.reputation + applyTacticalPenaltyAdjustments(result.reputationDelta) + Number(factionMods.authorityPoliceBonus || 0)
    );
  }

  if (typeof result.powerDelta === 'number' && result.powerDelta !== 0) {
    state.power = clampPower(state.power + result.powerDelta);
  }

  calmRoomChain(roomId, 3);
  maybeApplyTacticalStabilization(roomId);
  applyIdentityImpact({
    doctrine: { control: 1, force: 1 },
    factions: { authorities: 2, guests: -1, locals: -1 },
    stats: { policeReliance: 1 },
    reason: 'police called'
  });
  pushLiveAlert(state, {
    type: 'info',
    message: `${state.rooms[roomIndex].label || `Room ${roomId}`} police response dispatched.`,
    dedupeKey: `police-dispatch-room-${roomId}-${state.night}`
  });

  if (checkFailureState()) return;
  if (progressShift('police')) return;
  renderAll();
}

function cutPowerToRoom(roomId) {
  onMeaningfulAction();
  audioController.playUiClick();
  audioController.playPowerAction('cut-room');
  const roomIndex = state.rooms.findIndex((room) => room.id === roomId);
  if (roomIndex === -1) return;

  const result = applyPowerCutToRoom(state.rooms[roomIndex]);
  state.rooms[roomIndex] = result.room;

  if (Array.isArray(result.logs) && result.logs.length) {
    state.logs = [...state.logs, ...result.logs];
  }

  if (typeof result.reputationDelta === 'number' && result.reputationDelta !== 0) {
    state.reputation = Math.max(0, state.reputation + applyTacticalPenaltyAdjustments(result.reputationDelta));
  }

  if (typeof result.powerDelta === 'number' && result.powerDelta !== 0) {
    state.power = clampPower(state.power + result.powerDelta);
  }

  calmRoomChain(roomId, 3);
  maybeApplyTacticalStabilization(roomId);
  applyIdentityImpact({
    doctrine: { force: 1, secrecy: 1, compassion: -1 },
    factions: { guests: -1, locals: -1, ownership: -1 },
    reason: 'room power cut'
  });

  if (result.success && Number(result.deferredReputationDelta || 0)) {
    queueDeferredShiftCost({
      turnsRemaining: 2,
      reputationDelta: result.deferredReputationDelta,
      logLine: result.deferredLogLine || 'Deferred maintenance and guest backlash from the hard power cut arrives.'
    });
  }
  markRoomMemory(roomId, {
    harshActions: 1,
    signature: 'power-cut',
    note: 'A hard power cut was previously used in this room.'
  });
  if (result.success) {
    pushLiveAlert(state, {
      type: 'warning',
      message: `${state.rooms[roomIndex].label} went dark. Immediate activity drops, but maintenance and guest backlash are now queued.`,
      dedupeKey: `cutpower-now-later-${roomId}-${state.night}`
    });
  }

  if (checkFailureState()) return;
  if (progressShift('cutPower')) return;
  renderAll();
}

function evictRoomGuest(roomId) {
  onMeaningfulAction();
  audioController.playUiClick();
  audioController.playEvict();
  const roomIndex = state.rooms.findIndex((room) => room.id === roomId);
  if (roomIndex === -1) return;

  const result = evictGuestFromRoom(state.rooms[roomIndex]);
  state.rooms[roomIndex] = {
    ...result.room,
    occupied: false,
    guestName: null
  };

  if (Array.isArray(result.logs) && result.logs.length) {
    state.logs = [...state.logs, ...result.logs];
  }

  if (typeof result.reputationDelta === 'number' && result.reputationDelta !== 0) {
    state.reputation = Math.max(0, state.reputation + result.reputationDelta);
  }

  if (typeof result.moneyDelta === 'number' && result.moneyDelta !== 0) {
    state.money = Math.max(0, state.money + result.moneyDelta);
  }

  markThreadOutcome(state, {
    action: 'evicted',
    guestName: result?.room?.occupiedBy,
    riskLevel: result?.room?.riskLevel,
    mood: null,
    night: state.night,
    linkedZone: state.rooms?.[roomIndex]?.label
  });
  state.shiftStats.evictions = (state.shiftStats.evictions || 0) + 1;
  applyIdentityImpact({
    doctrine: { force: 1, control: 1, compassion: -1 },
    factions: { guests: -2, locals: -1, authorities: 1, ownership: -1 },
    stats: { harshDeskActions: 1 },
    reason: 'guest evicted'
  });

  calmRoomChain(roomId, 4);

  if (checkFailureState()) return;
  if (progressShift('evict')) return;
  renderAll();
}

function restartCurrentNight() {
  if (activeScreenId !== 'failure-screen') return;
  if (!confirmIfNeeded(`Restart Night ${Math.max(1, Number(state?.night || 1))}? This resets current night state only.`)) {
    return;
  }
  onMeaningfulAction();
  audioController.playUiClick();
  restoreNightStartSnapshot({
    message: `Night ${Math.max(1, Number(state?.night || 1))} restarted from failure to its opening state.`
  });
}

function applyEscalationResult(result) {
  state.rooms = result.rooms;

  if (Array.isArray(result.logs) && result.logs.length) {
    state.logs = [...state.logs, ...result.logs];
  }

  if (Array.isArray(result.incidents) && result.incidents.length) {
    state.incidents = [...state.incidents, ...result.incidents];
    result.incidents.forEach((incident) => {
      registerRoomChainSignal({
        roomId: incident.roomId,
        guestName: incident.guestName,
        type: `auto-${incident.type || 'incident'}`,
        severity: getSeverityPoints(incident.severity)
      });
    });
  }

  if (typeof result.reputationDelta === 'number' && result.reputationDelta !== 0) {
    state.reputation = clampReputation(state.reputation + result.reputationDelta);
  }

  if (typeof result.powerDelta === 'number' && result.powerDelta !== 0) {
    state.power = clampPower(state.power + result.powerDelta);
  }

  if (typeof result.autoIncidentCooldown === 'number') {
    state.autoIncidentCooldown = result.autoIncidentCooldown;
  }
}

function advanceEscalationState() {
  state.escalationTick += 1;
  state.rooms = tickEscalationRooms(state.rooms);
  state.rooms = tickResponseCooldowns(state.rooms);
  state.rooms = tickTacticalRooms(state.rooms);

  state.rooms = state.rooms.map((room) => {
    const memoryPressure = getRoomMemoryPressureBonus(room);
    if (!room?.occupiedBy || memoryPressure <= 0) return room;
    if (Math.random() < Math.min(0.18, memoryPressure * 0.035)) {
      return {
        ...room,
        condition: room.condition === 'Stable' ? 'Watch' : room.condition
      };
    }
    return room;
  });

  if (state.autoIncidentCooldown > 0) {
    state.autoIncidentCooldown -= 1;
  }
}

function nextNight() {
  if (activeScreenId !== 'night-prep-screen') return;
  onMeaningfulAction();
  audioController.playUiClick();
  cleanupTransientUiState('next-night');
  state.night += 1;
  state.failedState = null;
  state.pendingRunCompletion = false;
  state.power = 100;
  if (window.DeadEndPhase2?.applyNightModifier) {
    window.DeadEndPhase2.applyNightModifier(state);
  }
  state.guests = [];
  state.deferredShiftCosts = [];
  const previousRooms = Array.isArray(state.rooms) ? state.rooms.map((room) => ({ ...room })) : [];
  let nextRooms = applyStayDecrementBetweenNights(state.rooms || []);
  nextRooms = applyRoomUnlockFlags(nextRooms, state.night);
  state.rooms = normalizeEscalationRooms(nextRooms);
  state.rooms = normalizeResponseRooms(state.rooms);
  state.rooms = normalizeTacticalRooms(state.rooms);
  state.cameras = createDefaultCameras();
  state.logs = [`Night ${state.night} started. Carrying forward room ledger, unlocked capacity, and outstanding stays.`];
  previousRooms.forEach((room) => {
    const nextRoom = state.rooms.find((entry) => entry.id === room.id);
    if (!room?.occupiedBy) return;
    if (!nextRoom?.occupiedBy) {
      state.logs.push(`${room.label || `Room ${room.id}`} checked out at dawn. The stay counter reached zero.`);
      return;
    }
    if (Number(nextRoom.stayNightsRemaining || 0) !== Number(room.stayNightsRemaining || 0)) {
      state.logs.push(
        `${nextRoom.label || `Room ${nextRoom.id}`} carried ${nextRoom.occupiedBy} into the next night with ${nextRoom.stayNightsRemaining} night${nextRoom.stayNightsRemaining === 1 ? '' : 's'} remaining.`
      );
    }
  });
  refreshIntakeBudgetForNight(state);
  normalizeIntakeState(state);
  ensureCrisisNightState(state);
  state.activeEvents = [];
  state.incidents = [];
  state.storyChains = [];
  state.shiftStats = createShiftStats();
  state.powerEconomy = buildFreshPowerEconomy();
  applyNightStartProgression(state);
  state.cameraScene = buildFreshCameraSceneState();
  resetLocationStateForNight(state);
  state.autoIncidentCooldown = 0;
  state.escalationTick = 0;
  state.shiftElapsedMinutes = 0;
  state.dawnProcessed = false;
  state.lastAdvanceReason = null;
  state.summaryBranchNotes = [];
  state.campaignSummaryNotes = [];
  state = assignScenarioForNight(state);
  state = normalizePresentationState(state);
  state = normalizeSpecialEncounterState(state);
  state = normalizeNightEventState(state);
  state = normalizeDeskConsequenceState(state);
  normalizeIdentitySystems();
  normalizeCampaignSystems();
  syncFinaleStateForNight({ refreshBranch: true });
  const ownershipBonus = Number(getFactionModifiers(state.factions).ownershipPrepBonus || 0);
  if (ownershipBonus > 0) {
    state.money += ownershipBonus;
    state.logs.push(`Ownership confidence released a ${ownershipBonus}$ operational reserve.`);
  }
  state.doctrine = beginDoctrineNight(state.doctrine || {});
  normalizeRunMemoryState();
  runtimeBranchContext = null;
  const carryoverResult = applyCarryoverForNight(state, state.night, { allowReplay: false });
  state.shiftStats.carryoverWarningsTriggered =
    (state.shiftStats.carryoverWarningsTriggered || 0) + Number(carryoverResult?.appliedNotes?.length || 0);
  maybeGenerateNightStoryBeat(state, state.night);
  state.carryoverBriefing = buildIncomingNightNotes(state, state.night + 1);
  clearTemporaryCarryover(state);
  refreshProgressionDerivedState();
  setNightPrepVisited(state, false);
  pushLiveAlert(state, {
    type: 'info',
    message: `Night ${state.night} started — ${state?.activeScenario?.label || 'Standard Shift'}.`,
    dedupeKey: `scenario-start-${state.night}`
  });
  pushOpeningTensionBeat('carryover');
  captureNightStartSnapshot('next-night-open');

  renderAll();
  setActiveScreen('game-screen');
  setActivePanel('frontdesk-panel');
}

function bindEvents() {
  const moveToMainMenuSafely = () => {
    const riskyScreens = new Set(['game-screen', 'summary-screen', 'night-prep-screen']);
    if (!riskyScreens.has(activeScreenId)) {
      setActiveScreen('main-menu');
      return;
    }
    const message = activeScreenId === 'game-screen'
      ? 'Return to Main Menu? In-progress night decisions may be lost.'
      : activeScreenId === 'night-prep-screen'
        ? 'Return to Main Menu from Night Prep? You can continue this run later.'
        : 'Return to Main Menu?';
    if (!confirmIfNeeded(message)) {
      return;
    }
    setActiveScreen('main-menu');
  };

  document.getElementById('start-game-btn').addEventListener('click', startShift);
  document.getElementById('start-guided-btn').addEventListener('click', () => {
    setTutorialMode('guided');
    startShift();
  });
  document.getElementById('start-standard-btn').addEventListener('click', () => {
    setTutorialMode('standard');
    startShift();
  });
  document.getElementById('new-night-btn').addEventListener('click', resetNightState);
  document.getElementById('menu-settings-btn')?.addEventListener('click', () => toggleSettingsOverlay(true));
  document.getElementById('open-settings-btn')?.addEventListener('click', () => toggleSettingsOverlay(true));
  document.getElementById('spawn-guest-btn').addEventListener('click', callNextArrival);
  document.getElementById('scan-cameras-btn').addEventListener('click', scanCameraSystem);
  document.getElementById('restore-power-btn').addEventListener('click', restorePower);
  document.getElementById('drain-power-btn').addEventListener('click', drainPower);
  document.getElementById('review-incidents-btn').addEventListener('click', reviewIncidents);
  document.getElementById('dispatch-staff-btn').addEventListener('click', dispatchStaff);
  document.getElementById('end-night-btn').addEventListener('click', endNight);
  document.getElementById('next-night-btn').addEventListener('click', openNightPrepFromSummary);
  document.getElementById('start-prepped-night-btn').addEventListener('click', nextNight);
  document.getElementById('prep-menu-btn').addEventListener('click', moveToMainMenuSafely);
  document.getElementById('back-menu-btn').addEventListener('click', moveToMainMenuSafely);
  document.getElementById('run-ending-menu-btn').addEventListener('click', moveToMainMenuSafely);
  document.getElementById('run-ending-new-run-btn').addEventListener('click', startFreshCampaignRun);
  document.getElementById('restart-night-btn').addEventListener('click', restartCurrentNight);
  document.getElementById('failure-menu-btn').addEventListener('click', moveToMainMenuSafely);
  document.getElementById('audio-toggle-btn').addEventListener('click', toggleAudio);
  document.getElementById('open-help-btn').addEventListener('click', () => toggleHelpOverlay(true));
  document.getElementById('main-menu-reroll-btn').addEventListener('click', rerollFirstNightScenario);

  document.querySelectorAll('.tab-button').forEach((button) => {
    button.addEventListener('click', () => setActivePanel(button.dataset.panel));
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    const closed = closeTopOverlayIfOpen();
    if (closed) {
      event.preventDefault();
    }
  });
}

bootstrapState();
bindEvents();
renderAll();

// Temporary dev helpers (Phase 15X verification), opt-in only.
if (DEV_HELPERS_ENABLED) {
  window.devSkipToNight = function devSkipToNight(n = 5) {
    try {
      if (!state || typeof nextNight !== 'function') {
        console.log('[devSkipToNight] unavailable: state or nextNight missing.');
        return;
      }

      const targetNight = Math.max(1, Number.isFinite(Number(n)) ? Math.floor(Number(n)) : 5);
      const safeTargetNight = Math.min(targetNight, Number(state?.campaign?.length || targetNight));

      state.night = Math.max(1, safeTargetNight - 1);

      if (state.campaign && typeof state.campaign === 'object') {
        state.campaign.length = Math.max(Number(state.campaign.length || 5), safeTargetNight);
        state.campaign.campaignNightsCompleted = Math.max(0, safeTargetNight - 1);
      }

      nextNight();
    } catch (error) {
      console.log('[devSkipToNight] failed safely:', error?.message || error);
    }
  };

  window.devShowFinaleEnding = function devShowFinaleEnding() {
    try {
      if (!state) {
        console.log('[devShowFinaleEnding] unavailable: state missing.');
        return;
      }

      if (typeof showRunEndingScreen === 'function') {
        state.pendingRunCompletion = true;
        showRunEndingScreen();
        return;
      }

      console.log('[devShowFinaleEnding] unavailable: showRunEndingScreen missing.');
    } catch (error) {
      console.log('[devShowFinaleEnding] failed safely:', error?.message || error);
    }
  };
}
