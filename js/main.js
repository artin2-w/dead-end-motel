import {
  deriveClarityModel,
  setDeskFocusGuestId,
  setSharedBoardUserOpen
} from './clarityDirector.js';
import { createInitialState } from './state.js';
import { createGuest } from './guests.js';
import {
  createDefaultRooms,
  getAvailableRoom,
  applyRoomUnlockFlags,
  applyStayDecrementBetweenNights,
  checkoutVacatedRoom,
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
  SHIFT_DURATION_MINUTES,
  getShiftProgressPercent
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
  normalizeAnalogSurvivalState,
  finalizeAnalogSurvivalState,
  resetAnalogForNewShift,
  getAnalogPassiveDrainBonus,
  getCameraAnalogPenalty,
  tickOperatorFatigue,
  getFatigueTier,
  shouldFatigueBlurNames,
  getBreakerBoardSummary,
  useCoffee,
  useStrongStim,
  maybeRollLotPayphoneOffer,
  buildLotPayphoneNightEvent,
  resolveLotPayphoneChoice,
  applyNeonArrivalBias,
  tickColdWithoutHeating,
  cycleCircuitTier,
  cycleNeonPlayerWish
} from './analogSurvival.js';
import {
  normalizeForensicNoirState,
  toggleUvDeskLens,
  buildDeskUvObjectLines,
  applyUvInspectionCrossRef,
  maybeSpawnLostFoundOnReject,
  maybeSpawnLostFoundOnEvict,
  resolveLostFoundAction,
  tickForensicTape,
  isTapeArchiveVulnerable,
  startTapeBackupForEvidenceItem,
  maybeRollLostFoundClaimEvent,
  buildLostFoundClaimNightEvent,
  resolveLostFoundClaimChoice,
  getForensicRenderModel,
  resetForensicForNewNight
} from './forensicNoir.js';
import {
  normalizeOperatorNoirState,
  resetOperatorNoirForNewNight,
  performSwitchboardListen,
  resolveQuartersChoice,
  tickOperatorNoirAfterAdvance,
  maybeTriggerHallucination,
  buildOperatorUvTraceLines,
  buildOperatorNoirRenderModel
} from './operatorNoir.js';
import {
  normalizeBorderTransferState,
  resetBorderTransferForNewNight,
  maybeOfferBorderTransferStaging,
  tickBorderTransferDuringShift,
  beginBorderBlindWindow,
  refuseBorderTransfer,
  logBorderTransferHonest,
  resolveBorderWitnessChoice,
  buildBorderTransferRenderModel,
  buildBorderTransferPrepLine,
  noteShaftDispatchOutcome
} from './borderTransfer.js';
import {
  normalizeFinalWinterState,
  resetFinalWinterPerNight,
  bumpRivalPressureOnPrep,
  applyRivalSkimToIntake,
  tickFinalWinterDuringShift,
  hasAuditorBlackmailLeverage,
  applyDeskShredderPass,
  applyBasementIncineratorPass,
  applyAuditorBlackmailPass,
  applyFourAmFixer,
  applyFixerDebtIfDue,
  buildFinalWinterRenderModel,
  buildFinalWinterPrepLine
} from './finalWinter.js';
import {
  normalizeBasementSyndicate,
  evaluateBasementUnlock,
  tickBasementSyndicateDuringShift,
  resolveBasementIncidentFocus,
  takeBasementSkim,
  resetBasementNightFlags,
  buildBasementRenderModel,
  buildBasementPrepLine
} from './basementSyndicate.js';
import { buildDeadDropFailureOffer, sealManagerDeadDrop, tryRevealManagerDeadDrop } from './deadDropLegacy.js';
import {
  evaluateCampaignConvergence,
  recordCampaignConvergenceNight,
  normalizeCampaignCollapseStats,
  buildCollapsePrepBrief
} from './campaignCollapse.js';
import {
  isEndlessMode,
  darkWebContractsEnabled,
  pickDarkContractOffers,
  getDarkContractById,
  mergeDarkContractIntoRunModifiers,
  normalizeEndlessRunState,
  normalizeContractRuntime,
  normalizeDawnAuditorState,
  clearContractRuntime,
  applyDarkContractRuntime,
  applyContractAnalogHooks,
  applyContractStaffHook,
  applyContractWeatherHook,
  rollDawnAuditor,
  tickDawnAuditor,
  computeDawnExposure,
  applyDawnAuditorCleanupPass,
  resolveDawnAuditorAtDawn,
  recordEndlessWaveStats
} from './endlessShift.js';
import {
  normalizeRoadWorldState,
  decayRoadWorldBetweenNights,
  tickRoadWorldDuringShift,
  fundDrifterNetwork,
  feedMotelHound,
  appendRoadPayphoneOptions,
  resolveRoadPayphoneOption,
  applyArrivalRoadSkew,
  pickDjCodedAddon,
  buildRoadWorldRenderModel,
  maybeBurnDrifterNetwork,
  bumpRoadHeat,
  consumeRoadIntelForArrival,
  markHoundInjury
} from './roadWorld.js';
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
  tickLocationState,
  getLocationZoneState
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
  buildActiveRunThreadHighlights,
  buildSocialMemoryNote,
  buildEvidenceItem,
  checkMysteryFragmentUnlock,
  buildEvidenceLockerSummary,
  buildDirtyLedgerSummary,
  buildShadowRepNote,
  buildStaffIntelSummary,
  buildRoom9IntelSummary,
  buildTownPressureSummary
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
  renderCurrentPriorityCard,
  renderPowerDigest,
  renderGuests,
  renderRooms,
  renderSharedSpaces,
  renderCameras,
  renderAnalogPowerExtras,
  renderForensicShiftUi,
  renderOperatorNoirMount,
  renderBorderTransferMount,
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
  setActiveScreen as setActiveScreenUi,
  syncGuestStickyRail
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
let _cfoAdTick = null;
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
  syncGuestStickyRail(state, {
    onCheckIn: checkInGuest,
    onFlagGuest: flagGuest,
    onRejectGuest: rejectGuest
  });
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
  if (activeScreenId === 'game-screen') {
    syncGuestStickyRail(state, {
      onCheckIn: checkInGuest,
      onFlagGuest: flagGuest,
      onRejectGuest: rejectGuest
    });
  }
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

function buildMainMenuSurfacePresentation() {
  const night = Math.max(1, Number(state?.night || 1));
  const setup = normalizeRunSetup(state?.runSetup || createDefaultRunSetup());
  const modeCatalog = getCampaignModeCatalog();
  const diffCatalog = getDifficultyCatalog();
  const modeEntry = modeCatalog.find((m) => m.id === setup.campaignMode);
  const diffEntry = diffCatalog.find((d) => d.id === setup.difficultyId);
  const scenario = String(state?.activeScenario?.label || 'Standard Shift');
  const lines = Array.isArray(state?.storyMemory?.lastNightSummary) ? state.storyMemory.lastNightSummary : [];
  const idLines = Array.isArray(state?.summaryIdentityLines) ? state.summaryIdentityLines : [];
  const lastFrag = String(lines[0] || idLines[0] || '').trim().slice(0, 200);
  const town = state?.townState || {};
  const dirty = state?.dirtyLedger || {};
  const corp = Number(town.corruption || 0);
  const susp = Number(town.townSuspicion || 0);
  const chips = [];
  if (corp >= 2) chips.push({ tone: 'corrupt', label: 'Town corruption live' });
  else if (corp >= 1) chips.push({ tone: 'warn', label: 'Corruption creeping' });
  if (susp >= 5) chips.push({ tone: 'police', label: 'Law heat high' });
  else if (susp >= 3) chips.push({ tone: 'police', label: 'Law watching' });
  const dirtyN = Number(dirty.totalDirtyMoney || 0);
  if (dirtyN >= 40) chips.push({ tone: 'dirty', label: 'Dirty ledger heavy' });
  else if (dirtyN >= 15) chips.push({ tone: 'dirty', label: 'Off-books drift' });
  if (Boolean(state?.basementSyndicate?.unlockedEver)) chips.push({ tone: 'basement', label: 'Basement syndicate open' });
  if (metaState?.managerDeadDrop && typeof metaState.managerDeadDrop === 'object') {
    chips.push({ tone: 'legacy', label: 'Vent inheritance pending' });
  }
  return {
    primaryStartLabel: night > 1 ? `Continue — Night ${night}` : 'Start campaign shift',
    primaryStartHint: scenario,
    campaignHeadline: `Active ledger · Night ${night}`,
    modeLine: `${modeEntry?.label || setup.campaignMode} · ${diffEntry?.label || setup.difficultyId}`,
    conditionChips: chips,
    lastNightFragment: lastFrag,
    hasLastFragment: Boolean(lastFrag),
    endlessModeActive: setup.campaignMode === 'endless'
  };
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
    runCampaignModeCatalog: getCampaignModeCatalog(),
    mainMenuSurface: buildMainMenuSurfacePresentation()
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
  const collapseChain = crisis.active && crisis.trueCrisisNight ? 1 : 0;
  const collapseRisk = crisis.active && Number(crisis.convergenceTier || 0) >= 3 ? 1 : 0;
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
      + collapseRisk
    ),
    chainBonus: Math.max(0, Number(scenario.chainBonus || 0) + Number(bias.chainBonus || 0) + Number(milestoneMods.chainBonus || 0) + crisisChain + collapseChain),
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
  const baseMods = getRunSetupModifierProfile(state.runSetup);
  const darkPick = darkWebContractsEnabled(state) ? String(state?.endlessRun?.selectedDarkContractId || '') : '';
  state.runModifiers = darkPick ? mergeDarkContractIntoRunModifiers(baseMods, darkPick) : baseMods;
  state.runSetupSummary = buildRunSetupSummary(state.runSetup);
}

function setRunDifficultyFromMenu(difficultyId) {
  state.runSetup = withRunDifficulty(state?.runSetup || createDefaultRunSetup(), difficultyId);
  normalizeEndlessRunState(state);
  const base = getRunSetupModifierProfile(state.runSetup);
  const cid = darkWebContractsEnabled(state) ? String(state?.endlessRun?.selectedDarkContractId || '') : '';
  state.runModifiers = cid ? mergeDarkContractIntoRunModifiers(base, cid) : base;
  state.runSetupSummary = buildRunSetupSummary(state.runSetup);
  renderAll();
}

function setRunCampaignModeFromMenu(modeId) {
  state.runSetup = withRunCampaignMode(state?.runSetup || createDefaultRunSetup(), modeId);
  normalizeEndlessRunState(state);
  const base = getRunSetupModifierProfile(state.runSetup);
  const cid = darkWebContractsEnabled(state) ? String(state?.endlessRun?.selectedDarkContractId || '') : '';
  state.runModifiers = cid ? mergeDarkContractIntoRunModifiers(base, cid) : base;
  state.runSetupSummary = buildRunSetupSummary(state.runSetup);
  state.campaign = state.campaign && typeof state.campaign === 'object' ? state.campaign : {};
  state.campaign.length = getCampaignLengthFromRunSetup(state.runSetup);
  state = normalizeCampaignState(state);
  renderAll();
}

function toggleRunContractFromMenu(contractId) {
  state.runSetup = toggleRunContract(state?.runSetup || createDefaultRunSetup(), contractId);
  normalizeEndlessRunState(state);
  const base = getRunSetupModifierProfile(state.runSetup);
  const cid = darkWebContractsEnabled(state) ? String(state?.endlessRun?.selectedDarkContractId || '') : '';
  state.runModifiers = cid ? mergeDarkContractIntoRunModifiers(base, cid) : base;
  state.runSetupSummary = buildRunSetupSummary(state.runSetup);
  renderAll();
}

function normalizeRunMemoryState() {
  state = normalizeStoryThreadState(state);
  state = normalizeCarryoverState(state);
  state = normalizeContentDirectorState(state);
  normalizeCampaignDepthState();
  normalizeStaffManagementState();
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
  normalizeCampaignCollapseStats(state);
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
  state.metaRunState.fourAmFixerUsed = Boolean(state.metaRunState.fourAmFixerUsed);
  state.runSetup = normalizeRunSetup(state?.runSetup || createDefaultRunSetup());
  normalizeEndlessRunState(state);
  normalizeContractRuntime(state);
  const darkId = String(state?.endlessRun?.selectedDarkContractId || '');
  state.runModifiers = getRunSetupModifierProfile(state.runSetup);
  if (darkWebContractsEnabled(state) && darkId) {
    state.runModifiers = mergeDarkContractIntoRunModifiers(state.runModifiers, darkId);
  }
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
  normalizeCampaignDepthState();
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

const DAY_SHIFT_PLAN_CATALOG = Object.freeze([
  {
    id: 'balanced',
    title: 'Balanced Books',
    summary: 'Hold the line without provoking either occupancy or control pressure too hard.'
  },
  {
    id: 'occupancy-push',
    title: 'Push Occupancy',
    summary: 'Day shift squeezes in one more intake slot tomorrow, but linked travelers and soft stories become more common.'
  },
  {
    id: 'paper-crackdown',
    title: 'Paper Crackdown',
    summary: 'Desk tools and staff briefings focus on forged IDs and local-network signs over raw throughput.'
  },
  {
    id: 'service-calm',
    title: 'Quiet Hospitality',
    summary: 'Room handling starts softer and steadier, but ownership sees it as expensive if occupancy slips.'
  }
]);

const STAFF_ROSTER_CATALOG = Object.freeze([
  {
    id: 'security-dawes',
    name: 'Dawes',
    role: 'Security',
    specialty: 'hallway control',
    reliability: 0.74,
    temperament: 'firm',
    cost: 18,
    fatigueBias: 0.16,
    mistakeTendency: 0.12
  },
  {
    id: 'maintenance-ibarra',
    name: 'Ibarra',
    role: 'Maintenance',
    specialty: 'breaker / utility',
    reliability: 0.78,
    temperament: 'steady',
    cost: 17,
    fatigueBias: 0.14,
    mistakeTendency: 0.1
  },
  {
    id: 'runner-ellis',
    name: 'Ellis',
    role: 'Runner',
    specialty: 'complaint calming',
    reliability: 0.71,
    temperament: 'warm',
    cost: 14,
    fatigueBias: 0.18,
    mistakeTendency: 0.13
  },
  {
    id: 'cleaner-mara',
    name: 'Mara',
    role: 'Cleaner',
    specialty: 'room reset / rumor softening',
    reliability: 0.69,
    temperament: 'quiet',
    cost: 12,
    fatigueBias: 0.12,
    mistakeTendency: 0.09
  },
  {
    id: 'desk-ivy',
    name: 'Ivy',
    role: 'Desk Assistant',
    specialty: 'front desk flow',
    reliability: 0.73,
    temperament: 'watchful',
    cost: 16,
    fatigueBias: 0.17,
    mistakeTendency: 0.11
  },
  {
    id: 'backup-keller',
    name: 'Keller',
    role: 'On-Call Backup',
    specialty: 'late surge support',
    reliability: 0.64,
    temperament: 'nervy',
    cost: 10,
    fatigueBias: 0.08,
    mistakeTendency: 0.18
  }
]);

const LOCAL_FACTION_CATALOG = Object.freeze([
  {
    id: 'watcher-circle',
    label: 'Watcher Circle',
    visibleMark: 'same pale motel-map fold',
    hiddenMark: 'UV ring stamped beneath the laminate edge',
    scannerHook: 'watcher pattern',
    clue: 'Patterns suggest someone is logging who comes and goes rather than simply renting a room.'
  },
  {
    id: 'county-drifters',
    label: 'County Drifters',
    visibleMark: 'shared county-fair wrist cord',
    hiddenMark: 'dusty route mark hidden in the card sleeve',
    scannerHook: 'drifter pattern',
    clue: 'A local movement pattern keeps reappearing between roadside lots and cheap rooms.'
  },
  {
    id: 'service-ring',
    label: 'Service Ring',
    visibleMark: 'maintenance-adjacent badge clip with no active issue ticket',
    hiddenMark: 'UV service glyph printed beneath the card laminate',
    scannerHook: 'fake contractor chatter',
    clue: 'Someone is moving under staff-adjacent cover and testing access stories.'
  },
  {
    id: 'lookout-chain',
    label: 'Lookout Chain',
    visibleMark: 'matching parking stub tears',
    hiddenMark: 'paired corner-notch code on the backing card',
    scannerHook: 'paired vehicle movement',
    clue: 'Arrivals may be working in pairs, with one reading the desk while the other hangs back.'
  },
  {
    id: 'false-family-route',
    label: 'False Family Route',
    visibleMark: 'luggage tags that do not quite match the family story',
    hiddenMark: 'hidden child-rate scribble beneath the photocopy layer',
    scannerHook: 'false family account',
    clue: 'The group story sounds domestic, but the paperwork feels assembled rather than lived in.'
  }
]);

function clampCampaignDepthValue(value, min = 0, max = 10) {
  return Math.max(min, Math.min(max, Number.isFinite(Number(value)) ? Number(value) : min));
}

function clampStaffGauge(value, min = 0, max = 1) {
  return Math.max(min, Math.min(max, Number.isFinite(Number(value)) ? Number(value) : min));
}

function limitRecentStrings(value, limit = 12) {
  if (!Array.isArray(value)) return [];
  const next = [];
  value.forEach((entry) => {
    const cleaned = String(entry || '').trim();
    if (!cleaned || next.includes(cleaned)) return;
    next.push(cleaned);
  });
  return next.slice(-limit);
}

function getStaffCatalogEntry(staffId) {
  return STAFF_ROSTER_CATALOG.find((entry) => entry.id === staffId) || null;
}

function createStaffState(base) {
  return {
    id: base.id,
    active: ['Security', 'Maintenance', 'Desk Assistant'].includes(base.role),
    onCall: base.role === 'On-Call Backup',
    fatigue: 0,
    morale: 0.56,
    recentNote: ''
  };
}

function getDefaultBudgetLedger() {
  return {
    payroll: 0,
    repairs: 0,
    refunds: 0,
    emergencies: 0,
    utilities: 0,
    ownerDeductions: 0,
    intakeIncome: 0,
    occupancyIncome: 0,
    depositsHeld: 0,
    compensationPaid: 0,
    net: 0,
    lines: []
  };
}

function getDefaultManagementState() {
  return {
    focus: 'balanced',
    ownerDemand: 'margin-watch',
    selectedUpgradeCategory: 'All'
  };
}

function normalizeStaffManagementState() {
  normalizeCampaignDepthState();
  state.dayShift.staff = state?.dayShift?.staff && typeof state.dayShift.staff === 'object' ? state.dayShift.staff : {};
  state.dayShift.staff.focus = ['balanced', 'security-heavy', 'service-heavy', 'cost-saving'].includes(state.dayShift.staff.focus)
    ? state.dayShift.staff.focus
    : 'balanced';
  state.dayShift.staff.roster = Array.isArray(state.dayShift.staff.roster) && state.dayShift.staff.roster.length
    ? state.dayShift.staff.roster
        .map((entry) => {
          const base = getStaffCatalogEntry(entry?.id);
          if (!base) return null;
          return {
            ...createStaffState(base),
            ...entry,
            id: base.id,
            active: Boolean(entry?.active),
            onCall: Boolean(entry?.onCall),
            fatigue: clampStaffGauge(entry?.fatigue),
            morale: clampStaffGauge(entry?.morale, 0.15, 1),
            recentNote: String(entry?.recentNote || '')
          };
        })
        .filter(Boolean)
    : STAFF_ROSTER_CATALOG.map((entry) => createStaffState(entry));
  STAFF_ROSTER_CATALOG.forEach((entry) => {
    if (!state.dayShift.staff.roster.some((member) => member.id === entry.id)) {
      state.dayShift.staff.roster.push(createStaffState(entry));
    }
  });
  state.dayShift.budget = state?.dayShift?.budget && typeof state.dayShift.budget === 'object'
    ? { ...getDefaultBudgetLedger(), ...state.dayShift.budget }
    : getDefaultBudgetLedger();
  state.dayShift.management = state?.dayShift?.management && typeof state.dayShift.management === 'object'
    ? { ...getDefaultManagementState(), ...state.dayShift.management }
    : getDefaultManagementState();
}

function getDoctrineManagementTrack(doctrineState = {}) {
  const profile = getDoctrineDisplay(doctrineState);
  const id = String(profile?.id || '');
  if (id === 'hardline-controller' || id === 'strict-enforcer') {
    return {
      id: 'hard-control',
      title: 'Hard Control',
      ownerBias: 1,
      guestBias: -1,
      staffMoraleBias: -0.04,
      stressBias: 1,
      notes: ['Visible force reads as competent to ownership, but morale and guest patience run thinner.']
    };
  }
  if (id === 'guest-first-host' || id === 'stability-manager') {
    return {
      id: 'hospitality-first',
      title: 'Hospitality First',
      ownerBias: 0,
      guestBias: 1,
      staffMoraleBias: 0.03,
      stressBias: -1,
      notes: ['Calmer handling improves guest tone and service recoveries, but harsh owner scrutiny may linger.']
    };
  }
  if (id === 'shadow-operator' || id === 'quiet-fixer') {
    return {
      id: 'quiet-survival',
      title: 'Quiet Survival',
      ownerBias: 0,
      guestBias: 0,
      staffMoraleBias: 0.02,
      stressBias: -1,
      notes: ['Discreet handling lowers visible heat and helps shared spaces settle before they go public.']
    };
  }
  return {
    id: 'pattern-hunter',
    title: 'Pattern Hunter',
    ownerBias: -1,
    guestBias: -1,
    staffMoraleBias: -0.01,
    stressBias: 0,
    notes: ['Investigation clarity improves, but nights can feel harsher and more expensive under constant scrutiny.']
  };
}

function getNightStaffProfile(targetState = state) {
  normalizeStaffManagementState();
  const roster = Array.isArray(targetState?.dayShift?.staff?.roster) ? targetState.dayShift.staff.roster : [];
  const focus = String(targetState?.dayShift?.staff?.focus || 'balanced');
  const active = roster.filter((member) => member.active);
  const onCall = roster.filter((member) => member.onCall && !member.active);
  const doctrineTrack = getDoctrineManagementTrack(targetState?.doctrine || {});
  const activeRoles = new Set(active.map((member) => getStaffCatalogEntry(member.id)?.role).filter(Boolean));
  const reliability = active.reduce((sum, member) => {
    const base = getStaffCatalogEntry(member.id);
    return sum + clampStaffGauge((base?.reliability || 0.65) - Number(member.fatigue || 0) * (base?.fatigueBias || 0.15) + (Number(member.morale || 0.55) - 0.5) * 0.18, 0.2, 0.95);
  }, 0);
  const rosterStrength = active.length ? reliability / active.length : 0.45;
  return {
    focus,
    active,
    onCall,
    doctrineTrack,
    rosterStrength,
    hasSecurity: activeRoles.has('Security'),
    hasMaintenance: activeRoles.has('Maintenance'),
    hasRunner: activeRoles.has('Runner'),
    hasDeskAssistant: activeRoles.has('Desk Assistant'),
    activePayroll: active.reduce((sum, member) => sum + Number(getStaffCatalogEntry(member.id)?.cost || 0), 0),
    onCallPayroll: onCall.reduce((sum, member) => sum + Math.round(Number(getStaffCatalogEntry(member.id)?.cost || 0) * 0.45), 0)
  };
}

function addBudgetCost(kind, amount, line = '') {
  normalizeStaffManagementState();
  const safeKind = String(kind || '').trim();
  const safeAmount = Math.max(0, Math.round(Number(amount || 0)));
  if (!safeKind || safeAmount <= 0) return;
  state.dayShift.budget[safeKind] = Math.max(0, Number(state.dayShift.budget[safeKind] || 0) + safeAmount);
  if (line) {
    state.dayShift.budget.lines = Array.isArray(state.dayShift.budget.lines) ? state.dayShift.budget.lines : [];
    state.dayShift.budget.lines.push(line);
    state.dayShift.budget.lines = state.dayShift.budget.lines.slice(-8);
  }
}

function addBudgetIncome(kind, amount, line = '') {
  normalizeStaffManagementState();
  const safeKind = String(kind || '').trim();
  const safeAmount = Math.max(0, Math.round(Number(amount || 0)));
  if (!safeKind || safeAmount <= 0) return;
  state.dayShift.budget[safeKind] = Math.max(0, Number(state.dayShift.budget[safeKind] || 0) + safeAmount);
  if (line) {
    state.dayShift.budget.lines = Array.isArray(state.dayShift.budget.lines) ? state.dayShift.budget.lines : [];
    state.dayShift.budget.lines.push(line);
    state.dayShift.budget.lines = state.dayShift.budget.lines.slice(-8);
  }
}

function noteStaffOutcome(role, note, deltas = {}) {
  normalizeStaffManagementState();
  const roster = Array.isArray(state?.dayShift?.staff?.roster) ? state.dayShift.staff.roster : [];
  const target = roster.find((member) => String(getStaffCatalogEntry(member.id)?.role || '').toLowerCase() === String(role || '').toLowerCase() && member.active);
  if (!target) return;
  target.fatigue = clampStaffGauge(Number(target.fatigue || 0) + Number(deltas.fatigue || 0), 0, 1);
  target.morale = clampStaffGauge(Number(target.morale || 0.56) + Number(deltas.morale || 0), 0.15, 1);
  target.recentNote = String(note || '').trim();
}

function buildStaffRosterModel(targetState = state) {
  const profile = getNightStaffProfile(targetState);
  return (Array.isArray(targetState?.dayShift?.staff?.roster) ? targetState.dayShift.staff.roster : []).map((member) => {
    const base = getStaffCatalogEntry(member.id);
    const effectiveReliability = clampStaffGauge(
      Number(base?.reliability || 0.65) -
      Number(member?.fatigue || 0) * Number(base?.fatigueBias || 0.15) +
      (Number(member?.morale || 0.56) - 0.5) * 0.18,
      0.2,
      0.95
    );
    return {
      ...base,
      active: Boolean(member.active),
      onCall: Boolean(member.onCall && !member.active),
      fatigue: Math.round(Number(member.fatigue || 0) * 100),
      morale: Math.round(Number(member.morale || 0.56) * 100),
      effectiveReliability: Math.round(effectiveReliability * 100),
      recentNote: String(member.recentNote || ''),
      nightlyCost: member.active
        ? Number(base?.cost || 0)
        : member.onCall
          ? Math.round(Number(base?.cost || 0) * 0.45)
          : 0,
      focusTag: profile.focus
    };
  });
}

function buildBudgetSummary(targetState = state) {
  normalizeStaffManagementState();
  const budget = targetState?.dayShift?.budget || getDefaultBudgetLedger();
  const income = Number(budget.intakeIncome || 0) + Number(budget.occupancyIncome || 0) + Number(budget.depositsHeld || 0);
  const costs =
    Number(budget.payroll || 0) +
    Number(budget.repairs || 0) +
    Number(budget.refunds || 0) +
    Number(budget.emergencies || 0) +
    Number(budget.utilities || 0) +
    Number(budget.ownerDeductions || 0) +
    Number(budget.compensationPaid || 0);
  return {
    ...budget,
    income,
    costs,
    net: income - costs,
    lines: Array.isArray(budget.lines) ? budget.lines.slice(-6) : []
  };
}

function buildVehicleProfileForGuest(guest, targetState = state) {
  if (!guest) return null;
  const night = Math.max(1, Number(targetState?.night || 1));
  const mods = targetState?.progressionModifiers || {};
  const intelBonus = Number(mods?.parkingIntelBonus || 0);
  const suspect = targetState?.suspectBoard || {};
  const context = String(guest?.contextTag || '').toLowerCase();
  const factionId = String(guest?.factionProfile?.id || '');
  const linkedKind = String(guest?.linkedArrival?.kind || '').toLowerCase();
  let chance =
    0.2 +
    (context.includes('vehicle') ? 0.32 : 0) +
    (guest?.linkedArrival ? 0.12 : 0) +
    (factionId === 'lookout-chain' ? 0.2 : 0) +
    (factionId === 'false-family-route' ? 0.08 : 0) +
    intelBonus * 0.05;
  chance = Math.max(0.12, Math.min(0.78, chance));
  if (Math.random() > chance) return null;

  const plateRegion = ['County', 'State', 'Cross-State', 'Neighbor State', 'Rental Fleet'][night % 5];
  const vehicleId = `veh-${String(plateRegion).toLowerCase().replace(/\s+/g, '-')}-${(guest?.id || guestIdCounter || 1) % 97}`;
  const previouslySeen = Array.isArray(suspect?.vehiclesSeen)
    ? suspect.vehiclesSeen.some((entry) => String(entry).toLowerCase().includes(vehicleId) || String(entry).toLowerCase().includes(String(guest?.vehicleProfile?.type || '').toLowerCase()))
    : false;
  const occupiedCar =
    context.includes('vehicle')
    || guest?.linkedArrival?.role === 'follow'
    || factionId === 'lookout-chain'
    || factionId === 'watcher-circle'
    || Math.random() < 0.18 + intelBonus * 0.04;
  const warmEngine = Boolean(guest?.linkedArrival || factionId === 'lookout-chain' || Math.random() < 0.55 + intelBonus * 0.05);
  const plateMismatch =
    night >= 3
    && (
      plateRegion === 'Neighbor State'
      || plateRegion === 'Rental Fleet'
      || (context.includes('local') && plateRegion !== 'County')
    );
  const stagedFamilyParking = linkedKind.includes('family') || factionId === 'false-family-route';
  const suspiciousWaiting = occupiedCar || previouslySeen || factionId === 'watcher-circle';
  const pickupDropoffPattern =
    guest?.linkedArrival?.role === 'follow'
    || context.includes('vehicle')
    || factionId === 'lookout-chain'
    || Math.random() < 0.32 + intelBonus * 0.03;
  const clues = [];
  if (context.includes('vehicle') || factionId === 'lookout-chain') clues.push('occupied vehicle lingering too long after drop-off');
  if (warmEngine) clues.push('warm engine suggests a timed return window rather than a settled stay');
  if (pickupDropoffPattern) clues.push('pickup / drop-off timing fits somebody already on the property');
  if (factionId === 'watcher-circle') clues.push('parked with direct sightline to lobby glass');
  if (stagedFamilyParking) clues.push('rear seats and luggage placement look staged for a family cover');
  if (plateMismatch) clues.push('plate region and stated route do not line up cleanly');
  if (previouslySeen) clues.push('same vehicle pattern has shown up before on the board');
  if (suspiciousWaiting && !clues.some((entry) => entry.includes('waiting'))) clues.push('driver appears to be waiting instead of checking in');
  return {
    id: vehicleId,
    type: factionId === 'false-family-route' ? 'family sedan' : context.includes('truck') ? 'work truck' : 'older dark sedan',
    plateRegion,
    plateStyle:
      plateRegion === 'Rental Fleet' ? 'fleet temporary tag style'
      : plateRegion === 'Neighbor State' ? 'out-of-county embossed plate'
      : 'standard local plate',
    parkedPosition:
      factionId === 'watcher-circle' ? 'facing lobby' :
      factionId === 'lookout-chain' ? 'angled toward lot exit' :
      stagedFamilyParking ? 'family-side spaces with too much separation'
      : 'back row partial shadow',
    occupied: occupiedCar,
    occupiedCar,
    warmEngine,
    repeatAppearance: previouslySeen,
    pickupDropoffPattern,
    plateMismatch,
    stagedFamilyParking,
    suspiciousWaiting,
    clues: clues.slice(0, 4),
    summary: clues.slice(0, 2).join('; ') || 'Vehicle presence exists, but the lot read is thin.',
    scannerLine:
      suspiciousWaiting
        ? 'Scanner-ready vehicle clue: waiting-car behavior may connect this guest to wider lot pressure.'
        : 'Scanner-ready vehicle clue: this car matters mostly if desk contradictions keep stacking.'
  };
}

function buildDeskQuestionCatalog(guest) {
  const insightBonus = Math.max(0, Number(state?.progressionModifiers?.followupInsightBonus || 0));
  const options = [
    { id: 'vehicle', label: 'Ask Vehicle', reveal: 'vehicle', irritation: 0 },
    { id: 'relationship', label: 'Verify Relationship', reveal: 'pair', irritation: 0 },
    { id: 'family-story', label: 'Check Family Story', reveal: 'family', irritation: 1 },
    { id: 'scanner', label: 'Cross-Check Scanner', reveal: 'scanner', irritation: 0 },
    { id: 'stay-reason', label: 'Ask Stay Reason', reveal: 'document', irritation: 0 },
    { id: 'inconsistency', label: 'Push Inconsistency', reveal: 'forgery', irritation: 1 },
    { id: 'late-timing', label: 'Ask Late Timing', reveal: 'timing', irritation: 0 }
  ];
  return options
    .map((entry) => {
      const score =
        (entry.id === 'vehicle' && guest?.vehicleProfile ? 3 : 0) +
        (entry.id === 'relationship' && guest?.linkedArrival ? 2 : 0) +
        (entry.id === 'family-story' && (guest?.linkedArrival?.kind || '').toLowerCase().includes('family') ? 3 : 0) +
        (entry.id === 'scanner' && guest?.scannerMatches?.length ? 2 : 0) +
        (entry.id === 'stay-reason' && guest?.idProfile?.irregularities?.length ? 1 : 0) +
        (entry.id === 'inconsistency' && guest?.forgeryProfile?.isForged ? 3 : 0) +
        (entry.id === 'late-timing' && (guest?.linkedArrival || guest?.vehicleProfile?.pickupDropoffPattern) ? 2 : 0) +
        insightBonus;
      return {
        ...entry,
        score,
        note:
          entry.id === 'vehicle' && guest?.vehicleProfile ? `Vehicle read: ${guest.vehicleProfile.summary}.` :
          entry.id === 'relationship' && guest?.linkedArrival ? `Pair read: ${guest.linkedArrival.note}` :
          entry.id === 'family-story' && (guest?.linkedArrival?.kind || '').toLowerCase().includes('family') ? 'The domestic cover sounds rehearsed rather than lived in.' :
          entry.id === 'scanner' && guest?.scannerMatches?.length ? `Scanner read: ${guest.scannerMatches[0]}` :
          entry.id === 'stay-reason' && guest?.idProfile?.visitReason ? `Reason read: ${guest.idProfile.visitReason}.` :
          entry.id === 'inconsistency' && guest?.forgeryProfile?.isForged ? 'The guest reacts like the paperwork is assembled, not lived in.' :
          entry.id === 'late-timing' ? 'Arrival timing may connect to scanner chatter, pickup behavior, or a staggered group.' :
          'No new desk read surfaced.'
      };
    })
    .sort((a, b) => Number(b.score || 0) - Number(a.score || 0));
}

function getEmergencyNightProfile(targetState = state) {
  const crisis = targetState?.crisisNight || {};
  const signature = getSignatureNightProfile(targetState);
  const blackout = getBlackoutPressureState(targetState);
  const overlap = Number(targetState?.crisisEscalation?.overlapPressureLevel || 0);
  const hallway = Number(targetState?.crisisEscalation?.hallwayThreatLevel || 0);
  const sharedPressure = (buildSharedSpacesModel(targetState) || []).reduce((sum, entry) => sum + Number(entry?.pressureScore || 0), 0);
  const severity =
    (blackout.level === 'full' ? 3 : blackout.level === 'partial' ? 2 : 0) +
    overlap +
    hallway +
    (signature?.stage || 0) +
    Math.floor(sharedPressure / 6);
  const night = Math.max(1, Number(targetState?.night || 1));
  const earlyNightLimiter = night <= 2 ? 1 : 0;
  const active = Boolean(
    severity >= (6 + earlyNightLimiter) ||
    (crisis.active && (crisis.kind === 'partial-blackout' || crisis.kind === 'stacked-pressure') && severity >= (4 + earlyNightLimiter))
  );
  const type =
    blackout.level === 'full' ? 'full-blackout-emergency' :
    hallway >= 3 ? 'corridor-instability' :
    overlap >= 3 ? 'multi-room-panic' :
    sharedPressure >= 14 ? 'shared-space-hostile-surge' :
    crisis.kind === 'hostile-social-night' ? 'social-pressure-collapse' :
    '';
  return {
    active,
    type,
    severity,
    commandTier: severity >= 9 ? 3 : severity >= 6 ? 2 : severity >= 4 ? 1 : 0,
    canHide: active && severity >= 8,
    label: active
      ? (type === 'full-blackout-emergency' ? 'Emergency Night: Full Blackout'
        : type === 'corridor-instability' ? 'Emergency Night: Corridor Instability'
        : type === 'multi-room-panic' ? 'Emergency Night: Multi-Room Panic'
        : type === 'shared-space-hostile-surge' ? 'Emergency Night: Shared-Space Hostile Surge'
        : 'Emergency Night: Social Collapse')
      : '',
    note: active
      ? 'The motel is slipping into command territory. Emergency choices can still save the night, but they will leave a mark.'
      : ''
  };
}

function buildEmergencyCommandModel(targetState = state) {
  const emergency = getEmergencyNightProfile(targetState);
  if (!emergency.active) return null;
  const commands = [
    { id: 'lock-exterior', label: 'Lock Exterior', note: 'Stops parking/lobby spill, costs guest goodwill.' },
    { id: 'segment-lockdown', label: 'Segment Lockdown', note: 'Hits hallway pressure fast, but feels harsh.' },
    { id: 'priority-lights', label: 'Emergency Lights', note: 'Softens blackout panic in shared spaces.' },
    { id: 'force-power', label: 'Force Power Section', note: 'Pushes power into one fragile area with utility cost.' },
    { id: 'hard-security', label: 'Hard Security', note: 'Fast containment with social fallout risk.' },
    { id: 'call-backup', label: 'Call Backup', note: 'Expensive, but stabilizes live emergency handling.' },
    { id: 'controlled-shutdown', label: 'Controlled Shutdown', note: 'Sacrifice comfort to stop collapse spreading.' },
    ...(emergency.canHide ? [{ id: 'hide-under-desk', label: 'Hide / Survive', note: 'Rare panic move: survive the surge, but lose command presence.' }] : [])
  ];
  return {
    ...emergency,
    commands
  };
}

function maybeSpreadMovingThreat(fromZoneId, reason = 'pressure', severity = 1) {
  const routeOrder = [2, 1, 3, 6, 4];
  const fromIndex = routeOrder.indexOf(Number(fromZoneId));
  const nextZoneId = routeOrder[fromIndex >= 0 ? Math.min(routeOrder.length - 1, fromIndex + 1) : 0];
  const def = getSharedSpaceDef(nextZoneId);
  const zoneState = def ? getLocationZoneState(state, nextZoneId, def.zoneName) : null;
  if (!def || !zoneState) return false;
  zoneState.issueStage = Math.min(3, Math.max(1, Number(zoneState.issueStage || 0) + Math.max(1, severity)));
  zoneState.followupPressure = Math.min(8, Math.max(0, Number(zoneState.followupPressure || 0) + Math.max(1, severity)));
  zoneState.unresolvedCount = Math.min(6, Math.max(0, Number(zoneState.unresolvedCount || 0) + 1));
  zoneState.pendingIssue = `${def.label} threat movement`;
  zoneState.lastStatusNote = `Threat movement spread from another zone into ${def.label.toLowerCase()}.`;
  ensureSharedSpaceEvent(nextZoneId);
  state.logs.push(`Moving threat: pressure slipped from ${getSharedSpaceDef(fromZoneId)?.label || 'one zone'} into ${def.label.toLowerCase()} (${reason}).`);
  pushLiveAlert(state, {
    type: severity >= 2 ? 'danger' : 'warning',
    message: `Threat movement: ${def.label} is now under live pressure.`,
    dedupeKey: `moving-threat-${fromZoneId}-${nextZoneId}-${reason}-${state.night}-${state.shiftElapsedMinutes}`
  });
  return true;
}

function executeEmergencyCommand(commandId) {
  const emergency = getEmergencyNightProfile(state);
  if (!emergency.active) return;
  onMeaningfulAction();
  audioController.playUiClick();
  audioController.playEmergencyPulse(emergency.severity >= 8 ? 'dire' : 'high');
  const safeId = String(commandId || '');
  const panicSoftener = Math.max(0, Number(state?.progressionModifiers?.panicHidePenaltySoftener || 0));
  const lanternBonus = Math.max(0, Number(state?.progressionModifiers?.blackoutVisibilityBonus || 0));
  const cost = safeId === 'call-backup' ? 12 : safeId === 'hard-security' ? 6 : safeId === 'force-power' ? 4 : 0;
  if (cost > 0 && state.money < cost) {
    pushLiveAlert(state, {
      type: 'warning',
      message: 'Emergency command unavailable: insufficient funds.',
      dedupeKey: `emergency-command-funds-${safeId}-${state.night}`
    });
    renderAll();
    return;
  }
  if (cost > 0) {
    state.money = Math.max(0, state.money - cost);
    addBudgetCost('emergencies', cost, `Emergency command ${safeId} cost ${formatMoney(cost)}.`);
  }
  if (safeId === 'lock-exterior') {
    setLocationModifier(state, 1, 'lobbyLocked', 3);
    setLocationModifier(state, 2, 'floodlightsActive', 2);
    state.reputation = clampReputation(state.reputation - 1);
  } else if (safeId === 'segment-lockdown') {
    setLocationModifier(state, 3, 'hallwayPatrol', 3);
    state.crisisEscalation.hallwayThreatLevel = Math.max(0, Number(state.crisisEscalation.hallwayThreatLevel || 0) - 1);
    state.reputation = clampReputation(state.reputation - 1);
  } else if (safeId === 'priority-lights') {
    state.power = clampPower(state.power - Math.max(4, 6 - lanternBonus));
    state.crisisEscalation.cameraInterferenceLevel = Math.max(0, Number(state.crisisEscalation.cameraInterferenceLevel || 0) - (lanternBonus > 0 ? 2 : 1));
    state.crisisEscalation.blackoutLevel = state.crisisEscalation.blackoutLevel === 'full' ? 'partial' : state.crisisEscalation.blackoutLevel;
    state.logs.push(lanternBonus > 0
      ? 'Emergency lantern rack kept visibility from fully collapsing under the lighting command.'
      : 'Emergency lighting bought partial visibility, but the motel still feels fragile.');
  } else if (safeId === 'force-power') {
    state.power = clampPower(state.power - 8);
    setLocationModifier(state, 4, 'utilityIsolated', 3);
    state.crisisEscalation.overlapPressureLevel = Math.max(0, Number(state.crisisEscalation.overlapPressureLevel || 0) - 1);
  } else if (safeId === 'hard-security') {
    noteStaffOutcome('Security', 'Hard emergency response ordered.', { fatigue: 0.12, morale: -0.01 });
    state.crisisEscalation.hallwayThreatLevel = Math.max(0, Number(state.crisisEscalation.hallwayThreatLevel || 0) - 2);
    state.shiftStats.severeIncidents = Math.max(0, Number(state.shiftStats.severeIncidents || 0) + 1);
    registerSocialFallout((state.rooms || []).find((room) => room?.occupiedBy)?.id || 1, {
      severity: 1,
      reason: 'hard-security',
      label: 'Guests heard the emergency response and the motel tone hardened.'
    });
  } else if (safeId === 'call-backup') {
    noteStaffOutcome('On-Call Backup', 'Emergency backup called in.', { fatigue: 0.1, morale: 0.02 });
    state.crisisEscalation.overlapPressureLevel = Math.max(0, Number(state.crisisEscalation.overlapPressureLevel || 0) - 2);
    state.crisisEscalation.hallwayThreatLevel = Math.max(0, Number(state.crisisEscalation.hallwayThreatLevel || 0) - 1);
  } else if (safeId === 'controlled-shutdown') {
    state.power = clampPower(state.power - 4);
    state.reputation = clampReputation(state.reputation - 1);
    setLocationModifier(state, 4, 'utilityIsolated', 4);
    state.crisisEscalation.blackoutLevel = 'partial';
  } else if (safeId === 'hide-under-desk') {
    state.reputation = clampReputation(state.reputation - Math.max(1, 2 - panicSoftener));
    state.crisisEscalation.overlapPressureLevel = Math.max(0, Number(state.crisisEscalation.overlapPressureLevel || 0) + 1);
    state.crisisEscalation.hallwayThreatLevel = Math.max(0, Number(state.crisisEscalation.hallwayThreatLevel || 0) + 1);
    state.emergencyState.hideSurvivalActive = true;
    state.emergencyState.hideSurvivalTurns = 2;
    queueDeferredShiftCost({
      turnsRemaining: 2,
      reputationDelta: Math.min(0, -1 + panicSoftener),
      logLine: 'After hiding through the surge, the desk looked absent right when command presence mattered.'
    });
    maybeSpreadMovingThreat(1, 'panic-hide', 2);
    maybeCreateSharedSpacePressure('panic-hide');
    state.logs.push('Hide / Survive: you stayed alive, but room control, hallway confidence, and desk authority slipped at once.');
  }
  state.logs.push(`Emergency command: ${safeId.replace(/-/g, ' ')}.`);
  pushLiveAlert(state, {
    type: 'warning',
    message: `Emergency command issued: ${safeId.replace(/-/g, ' ')}.`,
    dedupeKey: `emergency-command-${safeId}-${state.night}-${state.shiftElapsedMinutes}`
  });
  if (checkFailureState()) return;
  if (progressShift('dispatch', { timeScale: 1.1, passiveDrainScale: 1.05 })) return;
  renderAll();
}

function normalizeCampaignDepthState() {
  state.dayShift = state?.dayShift && typeof state.dayShift === 'object' ? state.dayShift : {};
  state.dayShift.selectedPlan = DAY_SHIFT_PLAN_CATALOG.some((plan) => plan.id === state.dayShift.selectedPlan)
    ? state.dayShift.selectedPlan
    : 'balanced';
  state.dayShift.activeNightPlan = DAY_SHIFT_PLAN_CATALOG.some((plan) => plan.id === state.dayShift.activeNightPlan)
    ? state.dayShift.activeNightPlan
    : 'balanced';
  state.dayShift.ownerPressure = clampCampaignDepthValue(state.dayShift.ownerPressure, -8, 12);
  state.dayShift.ownerMood = String(state.dayShift.ownerMood || 'Watchful');
  state.dayShift.ownerMemo = String(state.dayShift.ownerMemo || 'Ownership is waiting to see whether the motel grows or slips.');
  state.dayShift.lastSettlement = Number.isFinite(Number(state.dayShift.lastSettlement)) ? Number(state.dayShift.lastSettlement) : 0;
  state.dayShift.lastOccupancyRate = clampCampaignDepthValue(state.dayShift.lastOccupancyRate, 0, 1);
  state.dayShift.lastTroubleLoad = clampCampaignDepthValue(state.dayShift.lastTroubleLoad, 0, 10);
  state.dayShift.lastHospitalityBias = Number.isFinite(Number(state.dayShift.lastHospitalityBias)) ? Number(state.dayShift.lastHospitalityBias) : 0;
  state.dayShift.memoLines = Array.isArray(state.dayShift.memoLines) ? state.dayShift.memoLines.slice(-4) : [];
  state.dayShift.planHistory = limitRecentStrings(state.dayShift.planHistory, 6);

  state.suspectBoard = state?.suspectBoard && typeof state.suspectBoard === 'object' ? state.suspectBoard : {};
  state.suspectBoard.entries = Array.isArray(state.suspectBoard.entries) ? state.suspectBoard.entries.slice(-18) : [];
  state.suspectBoard.namesSeen = limitRecentStrings(state.suspectBoard.namesSeen, 12);
  state.suspectBoard.marksSeen = limitRecentStrings(state.suspectBoard.marksSeen, 12);
  state.suspectBoard.vehiclesSeen = limitRecentStrings(state.suspectBoard.vehiclesSeen, 10);
  state.suspectBoard.factionLabels = limitRecentStrings(state.suspectBoard.factionLabels, 10);
  state.suspectBoard.groupLabels = limitRecentStrings(state.suspectBoard.groupLabels, 10);
  state.suspectBoard.documentPatterns = limitRecentStrings(state.suspectBoard.documentPatterns, 10);
  state.suspectBoard.crossLinks = Array.isArray(state.suspectBoard.crossLinks) ? state.suspectBoard.crossLinks.slice(-12) : [];
  state.suspectBoard.updatedNight = Math.max(0, Number(state.suspectBoard.updatedNight || 0));

  state.linkedArrivalState = state?.linkedArrivalState && typeof state.linkedArrivalState === 'object' ? state.linkedArrivalState : {};
  state.linkedArrivalState.pendingLead = state.linkedArrivalState.pendingLead && typeof state.linkedArrivalState.pendingLead === 'object'
    ? { ...state.linkedArrivalState.pendingLead }
    : null;
  state.linkedArrivalState.recentGroups = Array.isArray(state.linkedArrivalState.recentGroups)
    ? state.linkedArrivalState.recentGroups.slice(-8)
    : [];

  state.signatureNight = state?.signatureNight && typeof state.signatureNight === 'object' ? state.signatureNight : {};
  state.signatureNight.night = Math.max(0, Number(state.signatureNight.night || 0));
  state.signatureNight.active = Boolean(state.signatureNight.active);
  state.signatureNight.id = String(state.signatureNight.id || '');
  state.signatureNight.title = String(state.signatureNight.title || '');
  state.signatureNight.note = String(state.signatureNight.note || '');
  state.signatureNight.stage = Math.max(0, Number(state.signatureNight.stage || 0));
  state.signatureNight.maxStage = Math.max(3, Number(state.signatureNight.maxStage || 3));
  state.signatureNight.stepKeysSeen = limitRecentStrings(state.signatureNight.stepKeysSeen, 12);
  state.signatureNight.namedThread = String(state.signatureNight.namedThread || '');
  state.signatureNight.branchOutcome = String(state.signatureNight.branchOutcome || '');
  state.signatureNight.themeTags = limitRecentStrings(state.signatureNight.themeTags, 6);
  state.emergencyState = state?.emergencyState && typeof state.emergencyState === 'object' ? state.emergencyState : {};
  state.emergencyState.commandHistory = limitRecentStrings(state.emergencyState.commandHistory, 8);
  state.emergencyState.lastEmergencyType = String(state.emergencyState.lastEmergencyType || '');
  normalizeSystemOverrideState(state);
  normalizeCallerThreadState(state);
  normalizeHuntNightState(state);
}

function normalizeSystemOverrideState(targetState = state) {
  if (!targetState || typeof targetState !== 'object') return targetState;
  const base = targetState?.systemOverride && typeof targetState.systemOverride === 'object' ? targetState.systemOverride : {};
  const manualOps = base?.manualOps && typeof base.manualOps === 'object' ? base.manualOps : {};
  targetState.systemOverride = {
    active: Boolean(base.active),
    source: String(base.source || ''),
    corruptionLevel: Math.max(0, Math.min(4, Number(base.corruptionLevel || 0))),
    scannerCompromised: Boolean(base.scannerCompromised),
    boardCompromised: Boolean(base.boardCompromised),
    cameraCompromised: Boolean(base.cameraCompromised),
    alertsCompromised: Boolean(base.alertsCompromised),
    isolatedFeed: Boolean(base.isolatedFeed),
    falseEntries: Array.isArray(base.falseEntries) ? base.falseEntries.slice(-12) : [],
    phreakerPressure: Math.max(0, Number(base.phreakerPressure || 0)),
    manualOps: {
      verifies: Math.max(0, Number(manualOps.verifies || 0)),
      purges: Math.max(0, Number(manualOps.purges || 0)),
      analogChecks: Math.max(0, Number(manualOps.analogChecks || 0)),
      trustedAnyway: Math.max(0, Number(manualOps.trustedAnyway || 0)),
      falseCaught: Math.max(0, Number(manualOps.falseCaught || 0)),
      falseMissed: Math.max(0, Number(manualOps.falseMissed || 0))
    }
  };
  return targetState;
}

function normalizeCallerThreadState(targetState = state) {
  if (!targetState || typeof targetState !== 'object') return targetState;
  const base = targetState?.callerThread && typeof targetState.callerThread === 'object' ? targetState.callerThread : {};
  const style = base?.styleMemory && typeof base.styleMemory === 'object' ? base.styleMemory : {};
  targetState.callerThread = {
    callHistory: Array.isArray(base.callHistory) ? base.callHistory.slice(-16) : [],
    lastNightCalled: Math.max(0, Number(base.lastNightCalled || 0)),
    styleMemory: {
      harshControl: Math.max(0, Number(style.harshControl || 0)),
      hospitality: Math.max(0, Number(style.hospitality || 0)),
      patternHunter: Math.max(0, Number(style.patternHunter || 0)),
      greed: Math.max(0, Number(style.greed || 0)),
      overreaction: Math.max(0, Number(style.overreaction || 0)),
      fear: Math.max(0, Number(style.fear || 0))
    },
    huntNightWins: Math.max(0, Number(base.huntNightWins || 0)),
    huntNightLosses: Math.max(0, Number(base.huntNightLosses || 0))
  };
  return targetState;
}

function normalizeHuntNightState(targetState = state) {
  if (!targetState || typeof targetState !== 'object') return targetState;
  const base = targetState?.huntNight && typeof targetState.huntNight === 'object' ? targetState.huntNight : {};
  targetState.huntNight = {
    active: Boolean(base.active),
    night: Math.max(0, Number(base.night || 0)),
    callerTargetId: base.callerTargetId ?? null,
    decoyId: base.decoyId ?? null,
    resolved: Boolean(base.resolved),
    outcome: String(base.outcome || ''),
    cluesCaught: Math.max(0, Number(base.cluesCaught || 0)),
    wrongEjects: Math.max(0, Number(base.wrongEjects || 0))
  };
  return targetState;
}

function recordCallerStyleTrend(styleKey, delta = 1, targetState = state) {
  normalizeCallerThreadState(targetState);
  if (!targetState?.callerThread?.styleMemory || !styleKey) return;
  const safeDelta = Number.isFinite(Number(delta)) ? Number(delta) : 0;
  if (!safeDelta) return;
  const current = Number(targetState.callerThread.styleMemory[styleKey] || 0);
  targetState.callerThread.styleMemory[styleKey] = Math.max(0, current + safeDelta);
}

function getDominantCallerStyle(targetState = state) {
  normalizeCallerThreadState(targetState);
  const memory = targetState?.callerThread?.styleMemory || {};
  const scored = Object.entries(memory).map(([key, value]) => ({ key, value: Number(value || 0) }));
  scored.sort((a, b) => b.value - a.value);
  return scored[0]?.key || 'patternHunter';
}

function getPhreakerSignature(seed = 0) {
  const signatures = ['[PHR-Δ]', '[PAYPHONE-ECHO]', '[LINE-NOISE-3]', '[LOCAL-GHOST-NET]'];
  return signatures[Math.abs(Number(seed || 0)) % signatures.length];
}

function isSuspiciousSignalText(text = '') {
  const value = String(text || '').toLowerCase();
  return (
    value.includes('timestamp drift')
    || value.includes('mirrored syntax')
    || value.includes('compliance mirror')
    || value.includes('triangulation seed')
    || value.includes('payphone echo')
    || value.includes('line-noise')
    || value.includes('phr-δ')
  );
}

function maybeInjectPhreakerFalseBoardEntry(targetState = state) {
  normalizeSystemOverrideState(targetState);
  if (!targetState?.systemOverride?.boardCompromised) return false;
  const sig = getPhreakerSignature(targetState.night + targetState.shiftElapsedMinutes);
  const id = `phreaker-false-${targetState.night}-${targetState.shiftElapsedMinutes}`;
  const detail = `${sig} timestamp drift: board cross-link rewritten with mirrored syntax.`;
  targetState.systemOverride.falseEntries = [
    ...(Array.isArray(targetState.systemOverride.falseEntries) ? targetState.systemOverride.falseEntries : []),
    { id, type: 'board', detail, suspicious: true, night: targetState.night }
  ].slice(-12);
  addSuspectBoardEntry({
    kind: 'phreaker-ghost',
    label: `Network note ${sig}`,
    detail,
    heat: 2,
    night: targetState.night
  });
  return true;
}

function maybePrepareNightOverride(targetState = state, reason = 'night-start') {
  normalizeSystemOverrideState(targetState);
  const night = Math.max(1, Number(targetState?.night || 1));
  const signature = getSignatureNightProfile(targetState);
  const huntActive = Boolean(targetState?.huntNight?.active);
  const baseChance = night >= 3 ? 0.08 : 0.02;
  const pressureBonus = Number(targetState?.crisisNight?.active ? 0.05 : 0) + Number(signature?.active ? 0.07 : 0) + Number(huntActive ? 0.12 : 0);
  const chance = Math.min(0.4, baseChance + pressureBonus);
  if (Math.random() > chance) {
    targetState.systemOverride.active = false;
    targetState.systemOverride.corruptionLevel = 0;
    targetState.systemOverride.scannerCompromised = false;
    targetState.systemOverride.boardCompromised = false;
    targetState.systemOverride.cameraCompromised = false;
    targetState.systemOverride.alertsCompromised = false;
    targetState.systemOverride.source = '';
    targetState.systemOverride.isolatedFeed = false;
    return false;
  }
  const level = huntActive ? 3 : signature?.active ? 2 : 1;
  targetState.systemOverride.active = true;
  targetState.systemOverride.source = 'phreaker-local';
  targetState.systemOverride.corruptionLevel = level;
  targetState.systemOverride.phreakerPressure = Math.max(1, Number(targetState.systemOverride.phreakerPressure || 0) + 1);
  targetState.systemOverride.scannerCompromised = true;
  targetState.systemOverride.boardCompromised = level >= 2;
  targetState.systemOverride.cameraCompromised = level >= 2;
  targetState.systemOverride.alertsCompromised = level >= 1;
  const sig = getPhreakerSignature(night + level);
  targetState.logs.push(`System override warning ${sig}: local infrastructure reported unstable scanner trust (${reason}).`);
  pushLiveAlert(targetState, {
    type: 'warning',
    message: `System override ${sig}: trust cues are degraded. Verify before acting on digital signals.`,
    dedupeKey: `override-open-${night}-${reason}`
  });
  if (targetState.systemOverride.boardCompromised) {
    maybeInjectPhreakerFalseBoardEntry(targetState);
  }
  audioController.playStaticBurst(Number(targetState.systemOverride.corruptionLevel || 0) >= 2 ? 'heavy' : 'light');
  return true;
}

function applyManualVerificationSweep(targetState = state, mode = 'verify') {
  normalizeSystemOverrideState(targetState);
  const override = targetState.systemOverride;
  const falseEntries = Array.isArray(override.falseEntries) ? override.falseEntries : [];
  const suspicious = falseEntries.filter((entry) => isSuspiciousSignalText(entry?.detail || entry?.text || '') || Boolean(entry?.suspicious));
  const found = suspicious.length;
  if (mode === 'verify') override.manualOps.verifies += 1;
  if (mode === 'purge') override.manualOps.purges += 1;
  if (mode === 'analog') override.manualOps.analogChecks += 1;
  if (mode === 'trust') override.manualOps.trustedAnyway += 1;

  if (mode === 'trust') {
    if (override.active && override.corruptionLevel >= 2) {
      override.manualOps.falseMissed += Math.max(1, found || 1);
      targetState.reputation = clampReputation(targetState.reputation - 1);
      targetState.logs.push('Desk trusted compromised system output and missed planted signal drift.');
    } else {
      targetState.logs.push('Desk trusted system feed and saved time.');
    }
    return { found: 0, removed: 0 };
  }

  if (!found) {
    targetState.logs.push('Manual verification pass found no obvious planted artifacts.');
    return { found: 0, removed: 0 };
  }

  override.manualOps.falseCaught += found;
  if (mode === 'purge') {
    const removeIds = new Set(suspicious.map((entry) => entry.id));
    override.falseEntries = falseEntries.filter((entry) => !removeIds.has(entry.id));
    targetState.suspectBoard.entries = (targetState.suspectBoard.entries || []).filter((entry) => !isSuspiciousSignalText(entry?.detail || ''));
    targetState.logs.push(`Manual purge removed ${found} planted phreaker artifact${found === 1 ? '' : 's'} from desk systems.`);
  } else {
    targetState.logs.push(`Manual verification detected ${found} suspicious artifact${found === 1 ? '' : 's'} (timestamp/wording drift).`);
  }
  return { found, removed: mode === 'purge' ? found : 0 };
}

function maybeTriggerCallerCall(trigger = 'ambient', targetState = state) {
  normalizeCallerThreadState(targetState);
  normalizeHuntNightState(targetState);
  const night = Math.max(1, Number(targetState?.night || 1));
  const calledThisNight = Number(targetState?.callerThread?.lastNightCalled || 0) === night;
  if (calledThisNight && trigger !== 'hunt') return false;
  const hunt = Boolean(targetState?.huntNight?.active);
  const pressure = deriveUiPressureLevel(targetState);
  const chance = hunt
    ? 0.7
    : pressure === 'critical'
      ? 0.24
      : pressure === 'high'
        ? 0.16
        : 0.08;
  if (Math.random() > chance) return false;
  const dominant = getDominantCallerStyle(targetState);
  const styleLine =
    dominant === 'harshControl' ? 'You keep choosing force first. I can hear it before you decide.'
    : dominant === 'hospitality' ? 'You still try to play host. That makes you predictable.'
    : dominant === 'patternHunter' ? 'You chase patterns until the pattern starts chasing you.'
    : dominant === 'overreaction' ? 'Every twitch in the building gets a full response from you.'
    : dominant === 'fear' ? 'You move like you are waiting for the wrong door to open.'
    : 'You count money when the walls are already listening.';
  const manipulation = hunt
    ? 'One face in your queue is mine. One is meant to waste your certainty.'
    : targetState?.systemOverride?.active
      ? 'Your screens are talking too much tonight. Try trusting them and see where it puts you.'
      : 'You still think your systems report the truth before I do.';
  const line = `Desk phone: Unknown caller says, "${styleLine} ${manipulation}"`;
  targetState.logs.push(line);
  pushLiveAlert(targetState, {
    type: hunt ? 'danger' : 'warning',
    message: hunt ? 'Incoming call: The line hisses — "hunt night is live."' : 'Incoming call: Unknown voice applies pressure.',
    dedupeKey: `caller-${night}-${trigger}`
  });
  targetState.callerThread.callHistory = [
    ...(Array.isArray(targetState.callerThread.callHistory) ? targetState.callerThread.callHistory : []),
    { night, trigger, dominant, line }
  ].slice(-16);
  targetState.callerThread.lastNightCalled = night;
  audioController.playRedPhone();
  return true;
}

function maybeStartHuntNight(targetState = state) {
  normalizeHuntNightState(targetState);
  const night = Math.max(1, Number(targetState?.night || 1));
  if (targetState.huntNight.night === night) return targetState.huntNight.active;
  const eligible = night >= 4;
  const chance = eligible ? Math.min(0.42, 0.1 + (night - 4) * 0.09) : 0;
  const active = Math.random() < chance;
  targetState.huntNight = {
    active,
    night,
    callerTargetId: null,
    decoyId: null,
    resolved: false,
    outcome: '',
    cluesCaught: 0,
    wrongEjects: 0
  };
  if (active) {
    targetState.logs.push('Hunt night protocol: desk reports an active manipulator using false arrivals and system noise.');
    pushLiveAlert(targetState, {
      type: 'danger',
      message: 'Hunt Night: combine desk reads, linked arrivals, forged clues, vehicles, and manual verification.',
      dedupeKey: `hunt-open-${night}`
    });
    audioController.playEmergencyPulse('high');
    maybeTriggerCallerCall('hunt', targetState);
  }
  return active;
}

function applyHuntTagToGuest(guest, role = 'target', targetState = state) {
  if (!guest) return guest;
  const sig = getPhreakerSignature(targetState?.night || 1);
  const isTarget = role === 'target';
  const boosted = {
    ...guest,
    contradictoryClue: true,
    riskLevel: isTarget ? 'High' : guest.riskLevel || 'Medium',
    contextTag: [guest?.contextTag, isTarget ? 'Caller-linked movement' : 'Noise decoy arrival'].filter(Boolean).join(' • '),
    riskNote: [guest?.riskNote, `${sig} ${isTarget ? 'Pattern pressure links this arrival to planted system noise.' : 'Signal looks close, but timing feels staged.'}`].filter(Boolean).join(' ')
  };
  const withProfiles = applyCampaignGuestWorldSignals({
    ...boosted,
    factionProfile: {
      id: 'phreaker-local',
      label: 'Phreaker Local Ring',
      clue: `${sig} recurring payphone/line-noise signature near motel systems.`,
      visibleMark: 'line-noise triplet',
      hiddenMark: 'payphone echo',
      scannerHook: 'payphone',
      strength: isTarget ? 2 : 1
    }
  }, targetState);
  return {
    ...withProfiles,
    huntRole: isTarget ? 'caller-target' : 'caller-decoy'
  };
}

function resolveHuntNightAction(guest, action = 'unknown', targetState = state) {
  normalizeHuntNightState(targetState);
  if (!targetState?.huntNight?.active || !guest) return;
  const isTarget = String(guest?.huntRole || '') === 'caller-target';
  if (action === 'reject' || action === 'flag') {
    if (isTarget) {
      targetState.huntNight.resolved = true;
      targetState.huntNight.outcome = 'caught-target';
      targetState.huntNight.cluesCaught += 1;
      targetState.callerThread.huntNightWins = Math.max(0, Number(targetState?.callerThread?.huntNightWins || 0) + 1);
      targetState.logs.push('Hunt night: the planted caller-linked arrival was contained before room release.');
      addEvidenceItem('hunt-night-win', targetState.night || 1);
      if (targetState.nemesis?.active) resolveNemesis('contained', targetState);
    } else if (String(guest?.huntRole || '') === 'caller-decoy') {
      targetState.huntNight.wrongEjects += 1;
      targetState.logs.push('Hunt night: a decoy was handled as the prime target. The real line remains active.');
    }
  }
  if (action === 'checkin' && isTarget) {
    targetState.huntNight.resolved = true;
    targetState.huntNight.outcome = 'missed-target';
    targetState.callerThread.huntNightLosses = Math.max(0, Number(targetState?.callerThread?.huntNightLosses || 0) + 1);
    targetState.logs.push('Hunt night failure: caller-linked target was admitted under compromised signal pressure.');
    addEvidenceItem('hunt-night-loss', targetState.night || 1);
    if (targetState.nemesis?.active) escalateNemesisPressure(targetState);
    targetState.reputation = clampReputation(targetState.reputation - 3);
  }
}

function getCurrentDayShiftPlan() {
  normalizeCampaignDepthState();
  return DAY_SHIFT_PLAN_CATALOG.find((plan) => plan.id === state?.dayShift?.selectedPlan) || DAY_SHIFT_PLAN_CATALOG[0];
}

function addSuspectBoardEntry(entry = {}) {
  normalizeCampaignDepthState();
  const label = String(entry.label || '').trim();
  const detail = String(entry.detail || '').trim();
  if (!label && !detail) return;
  const id = `${entry.kind || 'pattern'}:${label}:${detail}`.toLowerCase();
  const current = Array.isArray(state.suspectBoard.entries) ? state.suspectBoard.entries : [];
  const withoutDuplicate = current.filter((item) => String(item?.id || '') !== id);
  withoutDuplicate.push({
    id,
    kind: entry.kind || 'pattern',
    label: label || 'Unresolved Pattern',
    detail,
    heat: Math.max(1, Math.min(3, Number(entry.heat || 1))),
    night: Math.max(1, Number(entry.night || state.night || 1))
  });
  state.suspectBoard.entries = withoutDuplicate.slice(-18);
  state.suspectBoard.updatedNight = Math.max(1, Number(state?.night || 1));
}

function recordSuspectEvidence(guest, source = 'desk') {
  if (!guest) return;
  normalizeCampaignDepthState();
  if (guest.name) {
    state.suspectBoard.namesSeen = limitRecentStrings([...(state.suspectBoard.namesSeen || []), guest.name], 12);
  }
  if (guest?.factionProfile?.label) {
    state.suspectBoard.factionLabels = limitRecentStrings(
      [...(state.suspectBoard.factionLabels || []), guest.factionProfile.label],
      10
    );
    if (guest.factionProfile.visibleMark || guest.factionProfile.hiddenMark) {
      state.suspectBoard.marksSeen = limitRecentStrings(
        [
          ...(state.suspectBoard.marksSeen || []),
          guest.factionProfile.visibleMark || guest.factionProfile.hiddenMark
        ],
        12
      );
    }
    addSuspectBoardEntry({
      kind: 'faction',
      label: guest.factionProfile.label,
      detail: guest.factionProfile.clue || `${source} linked this arrival to a known local pattern.`,
      heat: guest?.factionProfile?.strength >= 2 ? 3 : 2
    });
  }
  if (guest?.forgeryProfile?.isForged) {
    state.suspectBoard.documentPatterns = limitRecentStrings(
      [...(state.suspectBoard.documentPatterns || []), ...(guest?.forgeryProfile?.visibleSigns || [])],
      10
    );
    addSuspectBoardEntry({
      kind: 'document',
      label: guest.name || 'Forged document lead',
      detail: [
        ...(guest?.idProfile?.irregularities || []).slice(0, 1),
        ...(guest?.uvProfile?.markers || []).slice(0, 1)
      ].filter(Boolean).join(' • ') || `${source} flagged unresolved document tampering.`,
      heat: guest?.documentSuspicionScore >= 3 ? 3 : 2
    });
  }
  if (guest?.linkedArrival?.groupId) {
    state.suspectBoard.groupLabels = limitRecentStrings(
      [...(state.suspectBoard.groupLabels || []), `${guest.linkedArrival.kind}:${guest.linkedArrival.groupId}`],
      10
    );
    addSuspectBoardEntry({
      kind: 'linked-arrival',
      label: guest.linkedArrival.kind || 'Linked arrivals',
      detail: guest.linkedArrival.note || `${guest.name} did not look like a fully isolated walk-in.`,
      heat: 2
    });
  }
  if (String(guest?.contextTag || '').toLowerCase().includes('vehicle')) {
    state.suspectBoard.vehiclesSeen = limitRecentStrings(
      [...(state.suspectBoard.vehiclesSeen || []), String(guest.contextTag)],
      10
    );
  }
  if (guest?.vehicleProfile?.id) {
    state.suspectBoard.vehiclesSeen = limitRecentStrings(
      [...(state.suspectBoard.vehiclesSeen || []), `${guest.vehicleProfile.type} / ${guest.vehicleProfile.id}`],
      10
    );
    state.suspectBoard.crossLinks = [
      ...(Array.isArray(state.suspectBoard.crossLinks) ? state.suspectBoard.crossLinks : []),
      `${guest.name} linked to ${guest.vehicleProfile.type} and ${guest?.linkedArrival?.kind || 'solo movement'}.`
    ].slice(-12);
  }
}

function buildOwnerPressureBrief() {
  normalizeCampaignDepthState();
  normalizeStaffManagementState();
  const pressure = Number(state?.dayShift?.ownerPressure || 0);
  const plan = getCurrentDayShiftPlan();
  const budget = buildBudgetSummary(state);
  const staffProfile = getNightStaffProfile(state);
  const doctrineTrack = getDoctrineManagementTrack(state?.doctrine || {});
  const mood = pressure >= 6
    ? 'Severe'
    : pressure >= 3
      ? 'Tense'
      : pressure <= -2
        ? 'Relieved'
        : 'Watchful';
  return {
    pressure,
    mood,
    memo: state?.dayShift?.ownerMemo || 'Ownership is watching the books and the complaint line.',
    lines: [
      ...(Array.isArray(state?.dayShift?.memoLines) ? state.dayShift.memoLines.slice(0, 3) : []),
      `Owner demand: ${String(state?.dayShift?.management?.ownerDemand || 'margin-watch').replaceAll('-', ' ')}.`
    ].slice(0, 4),
    settlement: Number(state?.dayShift?.lastSettlement || 0),
    selectedPlanId: plan.id,
    selectedPlanTitle: plan.title,
    plans: DAY_SHIFT_PLAN_CATALOG,
    budgetNet: budget.net,
    staffingCost: staffProfile.activePayroll + staffProfile.onCallPayroll,
    doctrineTrack: doctrineTrack.title,
    ownerDemand: String(state?.dayShift?.management?.ownerDemand || 'margin-watch')
  };
}

function buildSuspectBoardSnapshot() {
  normalizeCampaignDepthState();
  const entries = Array.isArray(state?.suspectBoard?.entries) ? [...state.suspectBoard.entries] : [];
  return {
    entries: entries
      .sort((a, b) => Number(b?.heat || 0) - Number(a?.heat || 0) || Number(b?.night || 0) - Number(a?.night || 0))
      .slice(0, 5),
    namesSeen: Array.isArray(state?.suspectBoard?.namesSeen) ? state.suspectBoard.namesSeen.slice(-4) : [],
    marksSeen: Array.isArray(state?.suspectBoard?.marksSeen) ? state.suspectBoard.marksSeen.slice(-4) : [],
    factionLabels: Array.isArray(state?.suspectBoard?.factionLabels) ? state.suspectBoard.factionLabels.slice(-4) : [],
    vehiclesSeen: Array.isArray(state?.suspectBoard?.vehiclesSeen) ? state.suspectBoard.vehiclesSeen.slice(-3) : [],
    groupLabels: Array.isArray(state?.suspectBoard?.groupLabels) ? state.suspectBoard.groupLabels.slice(-4) : [],
    documentPatterns: Array.isArray(state?.suspectBoard?.documentPatterns) ? state.suspectBoard.documentPatterns.slice(-4) : [],
    crossLinks: Array.isArray(state?.suspectBoard?.crossLinks) ? state.suspectBoard.crossLinks.slice(-4) : []
  };
}

function settleBetweenNightDayShift(summary = null) {
  normalizeCampaignDepthState();
  normalizeStaffManagementState();
  const currentOwnerPressure = Number(state?.dayShift?.ownerPressure || 0);
  const unlockedRooms = Math.max(1, (state.rooms || []).filter((room) => room?.unlocked !== false).length);
  const occupiedRooms = (state.rooms || []).filter((room) => room?.occupiedBy).length;
  const occupancyRate = occupiedRooms / unlockedRooms;
  const staffProfile = getNightStaffProfile(state);
  const doctrineTrack = getDoctrineManagementTrack(state?.doctrine || {});
  const troubleLoad =
    Number(state?.shiftStats?.incidentsResolved || 0) * 0.4 +
    Number(state?.shiftStats?.roomCallsMissed || 0) * 1.2 +
    Number(state?.shiftStats?.nightEventsMissed || 0) * 1.4 +
    Number(state?.shiftStats?.overManagementPenalties || 0) * 0.8 +
    Math.max(0, 3 - Math.floor(Number(state?.reputation || 0) / 20));
  const hospitalityBias =
    Number(state?.shiftStats?.checkedIn || 0) -
    Number(state?.shiftStats?.rejected || 0) -
    Number(state?.shiftStats?.harshDeskActions || 0);
  const baseIncomeCredit = Math.round(occupiedRooms * 4 + Number(state?.shiftStats?.checkedIn || 0) * 3);
  const baseRepairCosts = Math.round(
    Number(state?.shiftStats?.nightEventsMissed || 0) * 3 +
    Number(state?.shiftStats?.roomCallsMissed || 0) * 2 +
    Number(state?.shiftStats?.realThreatsMissed || 0) * 2
  );
  const payroll = Math.round(staffProfile.activePayroll + staffProfile.onCallPayroll);
  const repairs = Math.max(0, baseRepairCosts + Math.round(Number(state?.shiftStats?.majorPowerIncidents || 0) * 2));
  const refunds = Math.max(
    0,
    Number(state?.dayShift?.budget?.refunds || 0) +
    Number(state?.dayShift?.budget?.compensationPaid || 0)
  );
  const emergencies = Math.max(
    0,
    Number(state?.dayShift?.budget?.emergencies || 0) +
    Math.round(Number(state?.shiftStats?.severeIncidents || 0) * 0.6)
  );
  const utilities = Math.max(
    0,
    Number(state?.dayShift?.budget?.utilities || 0) +
    Math.round(Math.max(0, 100 - Number(state?.power || 100)) / 10)
  );
  const ownerPenalty = Math.max(
    0,
    currentOwnerPressure >= 6 ? 6 : currentOwnerPressure >= 3 ? 3 : 0
  );
  const incomeCredit = baseIncomeCredit + Math.max(0, Number(state?.dayShift?.budget?.intakeIncome || 0)) + Math.max(0, Number(state?.dayShift?.budget?.occupancyIncome || 0));
  const ownerGrace = Math.max(0, Number(state?.progressionModifiers?.ownerGrace || 0));
  const settlement = incomeCredit - Math.max(0, payroll + repairs + refunds + emergencies + utilities + ownerPenalty - ownerGrace);
  state.money = Math.max(0, Number(state.money || 0) + settlement);
  state.dayShift.budget = {
    ...getDefaultBudgetLedger(),
    payroll,
    repairs,
    refunds,
    emergencies,
    utilities,
    ownerDeductions: ownerPenalty,
    intakeIncome: Math.max(0, Number(state?.dayShift?.budget?.intakeIncome || 0)),
    occupancyIncome: Math.max(0, Number(state?.dayShift?.budget?.occupancyIncome || 0)),
    depositsHeld: Math.max(0, Number(state?.dayShift?.budget?.depositsHeld || 0)),
    compensationPaid: Math.max(0, Number(state?.dayShift?.budget?.compensationPaid || 0)),
    net: settlement,
    lines: [
      `Payroll hit the books for ${formatMoney(payroll)} across active and on-call staff.`,
      `Repairs / recovery cost ${formatMoney(repairs + emergencies + utilities)} after service strain and infrastructure wear.`,
      refunds > 0 ? `Refunds and comps burned ${formatMoney(refunds)} out of the morning ledger.` : `Refund pressure stayed contained enough to avoid a visible settlement bleed.`,
      ownerPenalty > 0 ? `Owner deduction: ${formatMoney(ownerPenalty)} for heat, softness, or unstable books.` : 'No direct owner deduction landed this morning.'
    ]
  };

  const pressureDelta =
    (occupancyRate < 0.45 ? 2 : occupancyRate >= 0.75 ? -1 : 0) +
    (troubleLoad >= 5 ? 2 : troubleLoad <= 2 ? -1 : 0) +
    (hospitalityBias <= -2 ? 1 : hospitalityBias >= 3 ? 0 : 0) +
    (payroll >= 60 ? 1 : 0) +
    (refunds >= 8 ? 1 : 0) +
    Number(doctrineTrack.ownerBias || 0);
  state.dayShift.ownerPressure = clampCampaignDepthValue(Number(state.dayShift.ownerPressure || 0) + pressureDelta, -8, 12);
  state.dayShift.lastSettlement = settlement;
  state.dayShift.lastOccupancyRate = occupancyRate;
  state.dayShift.lastTroubleLoad = troubleLoad;
  state.dayShift.lastHospitalityBias = hospitalityBias;
  state.dayShift.ownerMood =
    state.dayShift.ownerPressure >= 6 ? 'Severe'
    : state.dayShift.ownerPressure >= 3 ? 'Tense'
    : state.dayShift.ownerPressure <= -2 ? 'Relieved'
    : 'Watchful';
  state.dayShift.ownerMemo =
    state.dayShift.ownerPressure >= 6
      ? 'Ownership wants cleaner books, fewer public scenes, and visible control over staff, refunds, and damage.'
      : state.dayShift.ownerPressure >= 3
        ? 'Ownership is questioning whether staffing, guest handling, and repair spending are drifting too loose.'
        : occupancyRate >= 0.75 && troubleLoad <= 2
          ? 'Ownership sees momentum: the motel is making money without slipping too hard, and staffing looks justified.'
          : 'Ownership is waiting for the next night before deciding whether to tighten control.';
  state.dayShift.management.ownerDemand =
    state.dayShift.ownerPressure >= 6
      ? 'damage-control'
      : refunds >= 8
        ? 'refund-freeze'
        : payroll >= 60
          ? 'cost-cutting'
          : hospitalityBias <= -2
            ? 'softer-hands'
            : occupancyRate < 0.45
              ? 'fill-rooms'
              : 'margin-watch';
  state.dayShift.memoLines = [
    `Day shift ledger: ${settlement >= 0 ? '+' : '-'}$${Math.abs(settlement)} after payroll, repairs, and guest-facing costs.`,
    `Owner read: ${Math.round(occupancyRate * 100)}% of licensed rooms carried business value into morning.`,
    troubleLoad >= 5
      ? 'Complaint, damage, and repair spillover made management more suspicious this morning.'
      : 'Morning briefing stayed readable enough to avoid a full ownership escalation.',
    hospitalityBias <= -2
      ? 'Harsh control was noticed; ownership wants compliance without visible hostility.'
      : hospitalityBias >= 3
        ? 'Soft handling improved guest-facing tone, but ownership is checking whether the margins can support it.'
        : `Doctrine track: ${doctrineTrack.title}.`
  ].slice(0, 4);
  state.dayShift.planHistory = limitRecentStrings(
    [...(state.dayShift.planHistory || []), getCurrentDayShiftPlan().id],
    6
  );

  applyIdentityImpact({
    factions: { ownership: pressureDelta > 0 ? -1 : pressureDelta < 0 ? 1 : 0 },
    reason: 'day shift owner review'
  });

  if (summary?.identity?.length) {
    addSuspectBoardEntry({
      kind: 'night-ledger',
      label: `Night ${state.night} carryover`,
      detail: String(summary.identity[0] || 'Morning review preserved an unresolved motel pattern.'),
      heat: 1
    });
  }
}

function setDayShiftPlan(planId) {
  normalizeCampaignDepthState();
  const chosen = DAY_SHIFT_PLAN_CATALOG.find((plan) => plan.id === planId);
  if (!chosen) return;
  state.dayShift.selectedPlan = chosen.id;
  state.dayShift.planHistory = limitRecentStrings([...(state.dayShift.planHistory || []), chosen.id], 6);
  state.logs.push(`Day-shift plan set: ${chosen.title}. ${chosen.summary}`);
  pushLiveAlert(state, {
    type: 'info',
    message: `Day-shift plan locked: ${chosen.title}.`,
    dedupeKey: `day-plan-${chosen.id}-${state.night}`
  });
  renderNightPrepScreen();
  renderAll();
}

function setStaffFocus(focusId) {
  normalizeStaffManagementState();
  if (!['balanced', 'security-heavy', 'service-heavy', 'cost-saving'].includes(String(focusId))) return;
  state.dayShift.staff.focus = String(focusId);
  state.logs.push(`Staffing focus set: ${String(focusId).replaceAll('-', ' ')}.`);
  renderNightPrepScreen();
  renderAll();
}

function cycleStaffAssignment(staffId) {
  normalizeStaffManagementState();
  const roster = Array.isArray(state?.dayShift?.staff?.roster) ? state.dayShift.staff.roster : [];
  const member = roster.find((entry) => entry.id === staffId);
  const base = getStaffCatalogEntry(staffId);
  if (!member || !base) return;
  if (member.active) {
    member.active = false;
    member.onCall = true;
  } else if (member.onCall) {
    member.active = false;
    member.onCall = false;
  } else {
    member.active = true;
    member.onCall = false;
  }
  member.recentNote = member.active
    ? 'Booked for tonight.'
    : member.onCall
      ? 'Standing by on call.'
      : 'Held off tonight to save budget.';
  state.logs.push(`${base.name} set to ${member.active ? 'active duty' : member.onCall ? 'on-call reserve' : 'off tonight'}.`);
  renderNightPrepScreen();
  renderAll();
}

function setUpgradeCategory(category) {
  normalizeStaffManagementState();
  state.dayShift.management.selectedUpgradeCategory = String(category || 'All');
  renderNightPrepScreen();
  renderAll();
}

function applyDayShiftPlanForNightStart() {
  normalizeCampaignDepthState();
  normalizeStaffManagementState();
  const plan = getCurrentDayShiftPlan();
  const staffProfile = getNightStaffProfile(state);
  state.dayShift.activeNightPlan = plan.id;
  state.dayShift.budget = getDefaultBudgetLedger();
  if (plan.id === 'occupancy-push') {
    state.intake.arrivalsRemaining = Math.max(0, Number(state.intake.arrivalsRemaining || 0) + 1);
    state.logs.push('Day shift squeezed in one extra arrival slot for tonight.');
  } else if (plan.id === 'paper-crackdown') {
    state.logs.push('Day shift briefed the desk to focus on forged IDs, hidden marks, and linked stories.');
  } else if (plan.id === 'service-calm') {
    state.logs.push('Day shift prioritized softer room handling and calmer service tone for the next shift.');
  } else {
    state.logs.push('Day shift held a balanced operating stance going into tonight.');
  }
  state.logs.push(`Night staffing: ${staffProfile.active.length} active, ${staffProfile.onCall.length} on-call, focus ${staffProfile.focus.replaceAll('-', ' ')}.`);
  state.dayShift.staff.roster = (state.dayShift.staff.roster || []).map((member) => ({
    ...member,
    fatigue: clampStaffGauge(Number(member.fatigue || 0) + (member.active ? 0.08 : member.onCall ? 0.03 : -0.05), 0, 1),
    morale: clampStaffGauge(Number(member.morale || 0.56) + (member.active ? 0 : 0.01), 0.15, 1)
  }));
}

const SIGNATURE_NIGHT_CATALOG = Object.freeze([
  {
    id: 'wrong-hallway',
    title: 'Signature Night: Wrong Hallway',
    note: 'Door knocks and hallway movement stop making spatial sense; confidence drains from shared spaces first.',
    namedThread: 'The Wrong Hall',
    maxStage: 4,
    themeTags: ['hallway', 'knock-pattern', 'shared-space']
  },
  {
    id: 'linked-arrival-surge',
    title: 'Signature Night: Linked Arrival Surge',
    note: 'Arrivals feel coordinated tonight. Scanner chatter, desk stories, and room trouble may all point to the same chain.',
    namedThread: 'The Double Check-In',
    maxStage: 4,
    themeTags: ['linked-arrivals', 'scanner', 'pairs']
  },
  {
    id: 'false-family-pressure',
    title: 'Signature Night: False Family Pressure',
    note: 'Soft family stories keep reaching the desk, but they may be assembled covers rather than frightened travelers.',
    namedThread: 'The Family Route',
    maxStage: 4,
    themeTags: ['false-family', 'social', 'moral']
  },
  {
    id: 'blackout-hostile',
    title: 'Signature Night: Blackout Hostility',
    note: 'Power fragility and shared-space hostility keep feeding one another; control can vanish in ugly steps.',
    namedThread: 'The Slipout',
    maxStage: 4,
    themeTags: ['blackout', 'hostile', 'collapse']
  },
  {
    id: 'watcher-convergence',
    title: 'Signature Night: Watcher Convergence',
    note: 'Watcher signs are no longer background texture; they are shaping who arrives, who watches, and who calls from inside.',
    namedThread: 'The Watch List',
    maxStage: 4,
    themeTags: ['watchers', 'faction', 'surveillance']
  }
]);

function selectSignatureNight(targetState = state) {
  normalizeCampaignDepthState();
  const night = Math.max(1, Number(targetState?.night || 1));
  if (targetState?.signatureNight?.night === night && targetState?.signatureNight?.id) return targetState.signatureNight;
  const suspect = buildSuspectBoardSnapshot();
  const chance = night >= 3 ? Math.min(0.48, 0.1 + (night - 2) * 0.06) : 0;
  if (Math.random() > chance) {
    targetState.signatureNight = {
      night,
      active: false,
      id: '',
      title: '',
      note: '',
      stage: 0,
      maxStage: 3,
      stepKeysSeen: [],
      namedThread: '',
      branchOutcome: '',
      themeTags: []
    };
    return targetState.signatureNight;
  }

  const weighted = SIGNATURE_NIGHT_CATALOG.map((entry) => {
    let weight = 1;
    if (entry.id === 'watcher-convergence' && suspect.factionLabels.some((label) => String(label).toLowerCase().includes('watcher'))) weight += 2.2;
    if (entry.id === 'linked-arrival-surge' && suspect.entries.some((row) => String(row?.kind || '').includes('linked'))) weight += 2;
    if (entry.id === 'false-family-pressure' && suspect.factionLabels.some((label) => String(label).toLowerCase().includes('false'))) weight += 1.8;
    if (entry.id === 'blackout-hostile' && (targetState?.crisisNight?.blackoutRisk || Number(targetState?.dayShift?.ownerPressure || 0) >= 4)) weight += 1.8;
    if (entry.id === 'wrong-hallway' && Number(targetState?.crisisEscalation?.hallwayThreatLevel || 0) >= 1) weight += 1.4;
    return { entry, weight };
  });
  const total = weighted.reduce((sum, item) => sum + item.weight, 0);
  let roll = Math.random() * total;
  let picked = weighted[0]?.entry || SIGNATURE_NIGHT_CATALOG[0];
  for (let i = 0; i < weighted.length; i += 1) {
    roll -= weighted[i].weight;
    if (roll <= 0) {
      picked = weighted[i].entry;
      break;
    }
  }

  targetState.signatureNight = {
    night,
    active: true,
    id: picked.id,
    title: picked.title,
    note: picked.note,
    stage: 1,
    maxStage: picked.maxStage,
    stepKeysSeen: ['opening'],
    namedThread: picked.namedThread,
    branchOutcome: '',
    themeTags: picked.themeTags
  };
  addSuspectBoardEntry({
    kind: 'signature-night',
    label: picked.title,
    detail: picked.note,
    heat: 2,
    night
  });
  return targetState.signatureNight;
}

function getSignatureNightProfile(targetState = state) {
  const profile = targetState?.signatureNight && typeof targetState.signatureNight === 'object' ? targetState.signatureNight : null;
  return profile?.active ? profile : null;
}

function advanceSignatureNightStage(stepKey, context = {}) {
  const profile = getSignatureNightProfile(state);
  if (!profile || !stepKey) return false;
  const safeKey = String(stepKey);
  if (profile.stepKeysSeen.includes(safeKey)) return false;
  profile.stepKeysSeen = [...profile.stepKeysSeen, safeKey].slice(-12);
  profile.stage = Math.min(Number(profile.maxStage || 4), Math.max(1, Number(profile.stage || 1) + 1));
  const line = context?.logLine || `${profile.title} intensified and the whole motel feels less stable now.`;
  state.logs.push(line);
  pushLiveAlert(state, {
    type: profile.stage >= Number(profile.maxStage || 4) ? 'danger' : 'warning',
    message: context?.alertLine || `${profile.title} advanced to stage ${profile.stage}.`,
    dedupeKey: `signature-stage-${profile.id}-${safeKey}-${state.night}`
  });
  state.shiftStats.signatureNightTurns = (state.shiftStats.signatureNightTurns || 0) + 1;
  state.crisisEscalation.hallwayThreatLevel = Math.max(Number(state?.crisisEscalation?.hallwayThreatLevel || 0), profile.id === 'wrong-hallway' ? 3 : 2);
  state.crisisEscalation.overlapPressureLevel = Math.max(Number(state?.crisisEscalation?.overlapPressureLevel || 0), profile.stage >= 3 ? 3 : 2);
  if (profile.id === 'blackout-hostile') {
    state.crisisEscalation.cameraInterferenceLevel = Math.max(Number(state?.crisisEscalation?.cameraInterferenceLevel || 0), profile.stage >= 3 ? 3 : 2);
  }
  if (context?.outcomeTag) {
    profile.branchOutcome = context.outcomeTag;
  }
  return true;
}

function maybeAdvanceSignatureNightFlow(trigger = 'tick', context = {}) {
  const profile = getSignatureNightProfile(state);
  if (!profile) return false;
  const occupiedRooms = (state.rooms || []).filter((room) => room?.occupiedBy).length;
  const activeGuests = (state.guests || []).length;
  const linkedWaiting = (state.guests || []).filter((guest) => guest?.linkedArrival?.groupId).length;
  const scannerHot = (state?.localScannerFeed || []).some((entry) => String(entry?.text || '').toLowerCase().includes('paired') || String(entry?.text || '').toLowerCase().includes('watcher'));
  const falseFamilySeen = (state.guests || []).some((guest) => String(guest?.linkedArrival?.kind || '').toLowerCase().includes('family') || String(guest?.factionProfile?.id || '').includes('false-family'));
  const stage = Number(profile.stage || 1);

  if (profile.id === 'linked-arrival-surge' && trigger === 'arrival' && linkedWaiting >= 2) {
    return advanceSignatureNightStage('linked-wave', {
      logLine: 'Signature chain: multiple linked arrivals are now crowding the desk and reading like one coordinated move.',
      alertLine: 'Linked-arrival surge: separate desk reads are starting to converge.',
      outcomeTag: 'paired-pressure'
    });
  }
  if (profile.id === 'wrong-hallway' && trigger === 'room-call' && context?.requestTag === 'suspicion') {
    return advanceSignatureNightStage('hall-knock', {
      logLine: 'Signature chain: hallway knocks are now landing in the wrong places, and rooms are no longer trusting what they hear outside.',
      alertLine: 'Wrong hallway pressure: corridor confidence just broke further.',
      outcomeTag: 'hallway-slip'
    });
  }
  if (profile.id === 'false-family-pressure' && trigger === 'arrival' && falseFamilySeen) {
    return advanceSignatureNightStage('family-cover', {
      logLine: 'Signature chain: a soft family cover is starting to read like a staged route rather than a tired check-in.',
      alertLine: 'False family pressure is taking shape at the desk.',
      outcomeTag: 'cover-story'
    });
  }
  if (profile.id === 'watcher-convergence' && ((trigger === 'arrival' && scannerHot) || trigger === 'scanner')) {
    return advanceSignatureNightStage('watcher-tighten', {
      logLine: 'Signature chain: watcher signs, scanner chatter, and guest behavior are lining up too closely to ignore.',
      alertLine: 'Watcher convergence: pattern recognition just became actionable.',
      outcomeTag: 'watcher-payoff'
    });
  }
  if (profile.id === 'blackout-hostile' && trigger === 'blackout') {
    return advanceSignatureNightStage('blackout-turn', {
      logLine: 'Signature chain: the blackout just turned hostile. Shared-space trust and room control are slipping together.',
      alertLine: 'Blackout-hostile turn: control is thinning across the motel.',
      outcomeTag: 'blackout-turn'
    });
  }
  if ((trigger === 'parking' || trigger === 'arrival') && context?.vehicleHot && linkedWaiting >= 1) {
    return advanceSignatureNightStage(`vehicle-chain-${stage}`, {
      logLine: 'Emergency chain: scanner chatter, a live vehicle read, and linked desk stories are now resolving into one moving problem.',
      alertLine: 'Vehicle-linked chain: threat movement is becoming readable.',
      outcomeTag: 'vehicle-chain'
    });
  }
  if (trigger === 'desk-question' && context?.documentHot) {
    return advanceSignatureNightStage(`document-chain-${stage}`, {
      logLine: 'Emergency chain: extra questioning turned document suspicion into a live network read.',
      alertLine: 'Document chain: the paperwork thread just hardened.',
      outcomeTag: 'document-payoff'
    });
  }
  if (stage < 3 && trigger === 'progress' && occupiedRooms >= 2 && activeGuests >= 1 && Math.random() < 0.16) {
    return advanceSignatureNightStage(`ambient-${trigger}-${stage}`, {
      logLine: `${profile.namedThread}: the night is tightening in layers rather than spikes.`,
      alertLine: `${profile.title} is building toward a payoff.`,
      outcomeTag: profile.branchOutcome || 'building'
    });
  }
  return false;
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

function captureNightStartSnapshot(reason = 'night-open', options = {}) {
  const targetState = options?.targetState && typeof options.targetState === 'object' ? options.targetState : state;
  if (!targetState || typeof targetState !== 'object') return false;
  const force = Boolean(options?.force);
  const safeNight = Math.max(1, Number(targetState?.night || 1));
  const existing = targetState?.nightStartSnapshot;
  if (!force && existing?.state && Number(existing?.night || 0) === safeNight) {
    return false;
  }
  const snapshotBase = { ...targetState };
  delete snapshotBase.nightStartSnapshot;
  delete snapshotBase.nightStartSnapshotReason;
  const snapshotState = cloneSerializable(snapshotBase);
  if (!snapshotState) return false;
  targetState.nightStartSnapshot = {
    night: safeNight,
    guestIdCounter: Math.max(1, Number(options?.guestIdCounterOverride || guestIdCounter || 1)),
    locked: true,
    capturedAt: Date.now(),
    reason,
    state: snapshotState
  };
  targetState.nightStartSnapshotReason = reason;
  targetState.logs = Array.isArray(targetState.logs) ? targetState.logs : [];
  targetState.logs.push(`Snapshot frozen: opening state for Night ${safeNight} captured (${reason}).`);
  return true;
}

function restoreNightStartSnapshot(options = {}) {
  const snapshotSource = options?.snapshotSource && typeof options.snapshotSource === 'object'
    ? options.snapshotSource
    : state;
  const snapshot = snapshotSource?.nightStartSnapshot;
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
  state.nightStartSnapshot = cloneSerializable(snapshot);
  state.nightStartSnapshotReason = snapshot?.reason || snapshotSource?.nightStartSnapshotReason || 'night-open';
  guestIdCounter = Math.max(1, Number(snapshot.guestIdCounter || 1));
  state.failedState = null;
  state.pendingRunCompletion = false;
  state.runEnding = null;
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
  normalizeDeskInspectionState(state);
  state.rooms = normalizeEscalationRooms(applyRoomUnlockFlags(state.rooms || [], state.night));
  state.rooms = normalizeResponseRooms(state.rooms);
  state.rooms = normalizeTacticalRooms(state.rooms);
  state = normalizeRoomServiceState(state);
  state.shiftStats = normalizeShiftStats(state.shiftStats);
  state = normalizeNightCycleState(state);
  state = normalizePowerEconomyState(state);
  normalizeAnalogSurvivalState(state);
  finalizeAnalogSurvivalState(state);
  normalizeForensicNoirState(state);
  normalizeOperatorNoirState(state);
  normalizeBorderTransferState(state);
  state = normalizeCameraSceneState(state);
  state = normalizeLocationState(state);
  state = normalizePresentationState(state);
  state = normalizeSpecialEncounterState(state);
  state = normalizeNightEventState(state);
  state = normalizeDeskConsequenceState(state);
  normalizeCampaignDepthState();
  normalizeStaffManagementState();
  ensureCrisisNightState(state);
  ensureCrisisEscalationState(state);
  normalizeIdentitySystems();
  normalizeRunMemoryState();
  normalizeCampaignSystems();
  refreshProgressionDerivedState();
  normalizeIntakeState(state);
  normalizeAdminSpamState(state);
  state.deferredShiftCosts = Array.isArray(state.deferredShiftCosts) ? state.deferredShiftCosts : [];
  state.localScannerFeed = Array.isArray(state.localScannerFeed) ? state.localScannerFeed : [];
  runtimeBranchContext = null;
  syncFinaleStateForNight({ refreshBranch: true });
  cleanupTransientUiState('restart-night');
  pushLiveAlert(state, {
    type: 'info',
    message: options.message || `Night ${state.night} restored to its frozen opening state.`,
    dedupeKey: `reset-restored-${state.night}-${Date.now()}`
  });
  state.logs.push(`Night ${state.night} restored to its frozen opening-night snapshot.`);
  renderAll();
  setActiveScreen('game-screen');
  setActivePanel('frontdesk-panel');
  return true;
}

/**
 * Paid continue entrypoint (called only after backend payment verification).
 * Restores the frozen opening-night snapshot (same core path as "Retry Current Night"),
 * without requiring the in-game confirmation dialog.
 */
window.deadEndMotelUsePaidContinue = function deadEndMotelUsePaidContinue() {
  console.log('Paid continue hook called', { activeScreenId });

  const failureScreen =
    document.getElementById('failure-screen') ||
    document.querySelector('.failure-screen') ||
    document.querySelector('#failure-store')?.closest('section, .screen, .hero-card');

  const failureStore = document.getElementById('failure-store');

  if (!failureStore && !failureScreen) {
    console.warn('Paid continue blocked: no failure UI detected', { activeScreenId });
    return false;
  }

  console.log('Failure UI detected', Boolean(failureStore || failureScreen));
  console.log('Calling restoreNightStartSnapshot');

  const ok = restoreNightStartSnapshot({
    message: 'Paid continue applied — night restored to its frozen opening state.'
  });

  if (!ok) {
    console.warn('Paid continue restore failed');
    return false;
  }

  // restoreNightStartSnapshot already switches to the game screen; call again so failure
  // shell classes / active screen cannot stick if a transition edge case occurred.
  setActiveScreen('game-screen');
  setActivePanel('frontdesk-panel');

  return true;
};

/**
 * Spend one locally stored Continue credit (no PayPal) after failure UI is present.
 * Only decrements `localStorage.credit` after a successful restore.
 */
window.deadEndMotelUseSavedContinue = function deadEndMotelUseSavedContinue() {
  let credits = 0;
  try {
    credits = Math.max(0, Number.parseInt(String(localStorage.getItem('credit') || '0'), 10) || 0);
  } catch {
    credits = 0;
  }
  if (credits < 1) return false;

  const failureScreen =
    document.getElementById('failure-screen') ||
    document.querySelector('.failure-screen') ||
    document.querySelector('#failure-store')?.closest('section, .screen, .hero-card');
  const failureStore = document.getElementById('failure-store');
  if (!failureStore && !failureScreen) return false;

  const ok = restoreNightStartSnapshot({
    message: 'Saved Continue credit used — night restored to its frozen opening state.'
  });
  if (!ok) return false;

  setActiveScreen('game-screen');
  setActivePanel('frontdesk-panel');

  try {
    localStorage.setItem('credit', String(Math.max(0, credits - 1)));
  } catch {
    // ignore
  }
  return true;
};

/**
 * Read-only “near-win” context for ethical monetization UI (failure screen / store).
 *
 * Guardrails:
 * - Does NOT change RNG, pressure, or failure checks — display / suggestions only.
 * - Never fabricates progress: uses the same shift progress helper as the HUD where possible.
 * - Continue credits are convenience / progress protection, not a requirement to play.
 */
window.deadEndMotelGetFailureContext = function deadEndMotelGetFailureContext() {
  let savedCredits = 0;
  try {
    savedCredits = Math.max(0, Number.parseInt(String(localStorage.getItem('credit') || '0'), 10) || 0);
  } catch {
    savedCredits = 0;
  }

  const night = Math.max(1, Number(state?.night || 1));
  const money = Math.max(0, Number(state?.money ?? 0));
  const reputation = Math.max(0, Number(state?.reputation ?? 50));
  const reason =
    String(state?.failedState?.reason || state?.failedState?.title || state?.failedState?.code || '') ||
    String(document.getElementById('failure-reason')?.textContent || '').trim();

  let progressPercent = 0;
  try {
    progressPercent = Math.max(0, Math.min(100, Math.round(Number(getShiftProgressPercent(state) || 0))));
  } catch {
    const elapsed = Math.max(0, Math.min(SHIFT_DURATION_MINUTES, Number(state?.shiftElapsedMinutes || 0)));
    progressPercent = SHIFT_DURATION_MINUTES
      ? Math.round((elapsed / SHIFT_DURATION_MINUTES) * 1000) / 10
      : 0;
  }

  let pressure = 'unknown';
  try {
    pressure = String(deriveUiPressureLevel(state) || 'unknown');
  } catch {
    pressure = 'unknown';
  }

  const lateShift = progressPercent >= 68;
  const survivedMost = progressPercent >= 62;
  const milestonePressure = night >= 5 && progressPercent >= 52;
  const nearWin = lateShift || survivedMost || milestonePressure;

  let suggestedProduct = 'continue_pack_1';
  if (savedCredits > 0) suggestedProduct = 'use_saved_credit';
  else if (nearWin) suggestedProduct = 'continue_pack_3';

  return {
    progressPercent,
    night,
    money,
    reputation,
    reason,
    pressure,
    nearWin,
    suggestedProduct,
    savedCredits
  };
};

function consumeMonetizationCalmBoostIfPending() {
  if (!state || state._demCalmBoostApplied) return;
  let pending = false;
  try {
    pending = localStorage.getItem('dem_boost_calm_pending') === '1';
  } catch {
    pending = false;
  }
  if (!pending) return;
  try {
    localStorage.removeItem('dem_boost_calm_pending');
  } catch {
    // ignore
  }
  state._demCalmBoostApplied = true;
  state._demCalmTickCounter = 0;
  state.dirtyPressure = Math.max(0, Number(state.dirtyPressure || 0) - 2);
  window.demCalmModeActive = true;
  console.log('Calm Mode activated for this shift');
  state.logs.push('Calm Mode active — pressure spikes reduced this shift.');
  try { window.refreshDemActiveEffects?.(); } catch { /* ignore */ }
}

function applyCalmModePassiveTick() {
  if (!state._demCalmBoostApplied) return;
  state._demCalmTickCounter = (state._demCalmTickCounter || 0) + 1;
  // Reduce dirtyPressure by 1 every 8 actions while calm mode is active
  if (state._demCalmTickCounter % 8 === 0 && Number(state.dirtyPressure || 0) > 1) {
    state.dirtyPressure = Math.max(0, state.dirtyPressure - 1);
    console.log('Calm Mode pressure reduction applied');
  }
}

function applyMonetizationDawnBonuses() {
  const bonusLines = [];
  try {
    if (localStorage.getItem('dem_boost_double_earnings_pending') === '1') {
      localStorage.removeItem('dem_boost_double_earnings_pending');
      const bonus = 18;
      state.money = Math.max(0, Number(state.money || 0) + bonus);
      state.logs.push(`Double Earnings: +CA$${bonus} night-close bonus (one shift).`);
      bonusLines.push(`Double Earnings Bonus: +CA$${bonus}`);
    }
  } catch {
    // ignore
  }
  try {
    if (localStorage.getItem('dem_upgrade_income_boost') === 'true') {
      const bonus = 8;
      state.money = Math.max(0, Number(state.money || 0) + bonus);
      state.logs.push(`Income Boost: +CA$${bonus} night-close bonus.`);
      bonusLines.push(`Income Boost: +CA$${bonus}`);
    }
  } catch {
    // ignore
  }
  // Clear calm mode at end of shift
  state._demCalmBoostApplied = false;
  state._demCalmTickCounter = 0;
  window.demCalmModeActive = false;
  try { window.refreshDemActiveEffects?.(); } catch { /* ignore */ }
  return bonusLines;
}

function pushOpeningTensionBeat(context = 'opening') {
  const night = Math.max(1, Number(state?.night || 1));
  const occupiedCarryovers = (state?.rooms || []).filter((room) => room?.occupiedBy).length;
  const emergency = getEmergencyNightProfile(state);
  const signature = getSignatureNightProfile(state);
  const ownerBrief = buildOwnerPressureBrief();
  let alertMessage = '';
  let logLine = '';
  let audioCue = 'standard';

  if (emergency.active) {
    alertMessage = `${emergency.label || 'Emergency Night'} is already close to command-state pressure. Zone priority matters immediately.`;
    logLine = `Opening tension: ${ownerBrief.mood.toLowerCase()} ownership framing meets a live emergency posture; the property is starting this shift on edge.`;
    audioCue = 'emergency';
  } else if (occupiedCarryovers > 0) {
    alertMessage = `${occupiedCarryovers} occupied room${occupiedCarryovers === 1 ? '' : 's'} carried over into tonight. Continuity pressure starts immediately.`;
    logLine = 'Opening tension: last night did not fully leave the property. Occupied rooms are carrying weight into this shift.';
    audioCue = 'standard';
  } else if (night <= 2) {
    alertMessage = 'Opening tension: the property feels wrong before the first arrival even reaches the desk.';
    logLine = 'Opening tension: the lobby hum sits a little too low and empty hallways already feel watched.';
    audioCue = 'standard';
  } else if (String(state?.blackoutState?.level || '') === 'partial' || state?.crisisNight?.kind === 'partial-blackout') {
    alertMessage = 'Opening tension: utility strain is in the walls before desk traffic even builds.';
    logLine = 'Opening tension: breaker-side instability is already present; a bad draw could tilt the whole shift.';
    audioCue = 'blackout';
  } else {
    alertMessage = `${signature?.active ? `${signature.title} is shaping the shift early.` : 'Opening tension: early shift drift is already visible.'} Small mistakes are likely to echo farther tonight.`;
    logLine = `Opening tension: ${ownerBrief.memo || 'Ownership is watching the property.'} Early reads and first decisions will matter more than usual.`;
    audioCue = signature?.active ? 'emergency' : 'standard';
  }

  state.logs.push(logLine);
  pushLiveAlert(state, {
    type: context === 'carryover' || occupiedCarryovers > 0 ? 'warning' : 'info',
    message: alertMessage,
    dedupeKey: `opening-tension-${state.night}-${context}`
  });
  audioController.playIntroSting(audioCue);
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
  normalizeCampaignDepthState();
  const night = Math.max(1, Number(targetState?.night || 1));
  const existing = targetState.crisisNight && typeof targetState.crisisNight === 'object' ? targetState.crisisNight : {};
  if (existing.night === night && existing.kind) return targetState;

  const campaignLen = Math.max(3, Number(targetState?.campaign?.length || 5));
  const lateStretch = night >= campaignLen - 1 || night >= Math.max(3, Math.ceil(campaignLen * 0.62));
  const conv = evaluateCampaignConvergence(targetState);

  const options = ['stacked-pressure', 'guest-surge', 'utility-fragility', 'hostile-social-night', 'partial-blackout'];
  let crisisChance = night >= 4 ? Math.min(0.45, 0.08 + (night - 3) * 0.048) : 0;
  if (lateStretch) crisisChance += 0.055;
  crisisChance += Math.min(0.12, conv.tier * 0.038);
  let active = Math.random() < crisisChance;
  let kind = active ? options[(night + Math.floor(Math.random() * options.length)) % options.length] : null;
  const signature = selectSignatureNight(targetState);
  const signatureKind =
    signature?.id === 'wrong-hallway' ? 'hostile-social-night'
    : signature?.id === 'linked-arrival-surge' ? 'guest-surge'
    : signature?.id === 'false-family-pressure' ? 'hostile-social-night'
    : signature?.id === 'blackout-hostile' ? 'partial-blackout'
    : signature?.id === 'watcher-convergence' ? 'stacked-pressure'
    : null;
  let finalActive = active || Boolean(signature?.active);
  let finalKind = signatureKind || kind;

  if (!finalActive && lateStretch && conv.tier >= 4 && Math.random() < 0.34) {
    finalActive = true;
    finalKind = 'stacked-pressure';
  }

  let title =
    finalKind === 'stacked-pressure'
      ? 'Crisis Night: Pressure Stack'
      : finalKind === 'guest-surge'
        ? 'Crisis Night: Guest Surge'
        : finalKind === 'utility-fragility'
          ? 'Crisis Night: Utility Fragility'
          : finalKind === 'hostile-social-night'
            ? 'Crisis Night: Hostile Social Atmosphere'
            : finalKind === 'partial-blackout'
              ? 'Crisis Night: Partial Blackout Risk'
            : '';
  let note =
    signature?.active
      ? signature.note
      : finalKind === 'stacked-pressure'
      ? 'Multiple systems are likely to overlap tonight; mistakes will stack instead of staying local.'
      : finalKind === 'guest-surge'
        ? 'Desk pressure and room stress are likely to spike together.'
        : finalKind === 'utility-fragility'
          ? 'Small faults are more likely to spread across rooms and power decisions.'
          : finalKind === 'hostile-social-night'
            ? 'Guests are more reactive, rumors travel faster, and containment will read harsher.'
            : finalKind === 'partial-blackout'
              ? 'Lighting and power stability feel fragile. A local outage could change room control fast.'
            : '';

  const vectorLabels = (conv.vectors || []).map((v) => v.label);
  const trueCrisisNight = Boolean(
    finalActive &&
      (conv.tier >= 4
        || (lateStretch && conv.tier >= 3 && conv.vectorCount >= 5)
        || (conv.tier >= 3 && (finalKind === 'stacked-pressure' || finalKind === 'partial-blackout')))
  );

  if (trueCrisisNight) {
    if (signature?.active) {
      note = `${note} Collapse surge — threads tonight: ${conv.readout}.`;
    } else {
      title = `Collapse Night — ${title.replace(/^Crisis Night: /, '')}`;
      note = `${note} Convergence trace: ${conv.readout}. Everything is threading toward one bad hour.`;
    }
    targetState.dayShift = targetState.dayShift && typeof targetState.dayShift === 'object' ? targetState.dayShift : {};
    targetState.dayShift.ownerPressure = Math.min(12, Number(targetState.dayShift.ownerPressure || 0) + 1);
    const ml = Array.isArray(targetState.dayShift.memoLines) ? targetState.dayShift.memoLines : [];
    if (!ml.some((m) => String(m).includes('CONVERGENCE MEMO'))) {
      targetState.dayShift.memoLines = [
        ...ml,
        'CONVERGENCE MEMO: ownership wants fewer independent reads while outside heat is this high.'
      ].slice(-5);
    }
  } else if (conv.tier >= 2 && finalActive && !signature?.active) {
    note = `${note} Undercurrents: ${conv.readout}.`;
  }

  let panicScale =
    finalActive && finalKind === 'stacked-pressure' ? 2
    : finalActive && (finalKind === 'partial-blackout' || finalKind === 'guest-surge') ? 1
    : 0;
  if (trueCrisisNight) panicScale = Math.min(3, panicScale + 2);
  else if (conv.tier >= 3 && finalActive) panicScale = Math.min(3, panicScale + 1);

  targetState.crisisNight = {
    active: finalActive,
    night,
    kind: finalKind,
    title: signature?.active ? signature.title : title,
    note,
    blackoutRisk: finalActive && (finalKind === 'utility-fragility' || finalKind === 'partial-blackout'),
    panicScale,
    convergenceTier: conv.tier,
    convergenceVectors: vectorLabels,
    collapseReadout: conv.readout,
    lateCampaignStretch: lateStretch,
    trueCrisisNight
  };

  ensureCrisisEscalationState(targetState);
  if (trueCrisisNight && targetState.crisisEscalation) {
    targetState.crisisEscalation.overlapPressureLevel = Math.max(
      Number(targetState.crisisEscalation.overlapPressureLevel || 0),
      2
    );
  }

  if (trueCrisisNight) {
    pushLiveAlert(targetState, {
      type: 'danger',
      message: 'Collapse night: multiple motel systems are converging — run the desk as a command post.',
      dedupeKey: `collapse-night-open-${night}`
    });
  }

  return targetState;
}

function buildNightIdentitySummary(targetState = state) {
  const scenario = targetState?.activeScenario || {};
  const crisis = targetState?.crisisNight || {};
  const blackout = getBlackoutPressureState(targetState);
  const signature = getSignatureNightProfile(targetState);
  const suspect = targetState?.suspectBoard || {};
  const activePlan = String(targetState?.dayShift?.activeNightPlan || targetState?.dayShift?.selectedPlan || 'balanced');
  const tags = [];
  if (scenario.label) tags.push(`Scenario: ${scenario.label}`);
  if (crisis.active && crisis.title) tags.push(crisis.title);
  if (crisis.trueCrisisNight) tags.push('Mood: campaign collapse surge');
  else if (Number(crisis.convergenceTier || 0) >= 3) tags.push('Mood: convergence-heavy');
  if (signature?.namedThread) tags.push(`Thread: ${signature.namedThread}`);
  if (Number(targetState?.night || 1) <= 2) tags.push('Mood: quiet but wrong');
  if (activePlan === 'paper-crackdown' || (suspect?.documentPatterns || []).length >= 2) tags.push('Mood: inspection-heavy');
  if (crisis.kind === 'hostile-social-night') tags.push('Mood: socially hostile');
  if (crisis.kind === 'utility-fragility' || crisis.kind === 'partial-blackout') tags.push('Mood: infrastructure-fragile');
  if (blackout.level === 'partial' || blackout.level === 'full') tags.push(`Mood: blackout-${blackout.level}`);
  if ((suspect?.groupLabels || []).some((entry) => /family|couple|linked/i.test(String(entry)))) tags.push('Mood: false stories everywhere');
  if ((suspect?.vehiclesSeen || []).length >= 2) tags.push('Mood: parking-lot suspicious');
  if (crisis.kind === 'guest-surge' || (targetState?.guests || []).length >= 3) tags.push('Mood: crowded and unstable');
  if (crisis.kind === 'stacked-pressure') tags.push('Mood: systems slipping together');
  if (Number(targetState?.crisisEscalation?.hallwayThreatLevel || 0) >= 2) tags.push('Mood: hostile shared spaces');
  if (targetState?.emergencyNight?.active || Number(targetState?.crisisEscalation?.panicMoments || 0) >= 1) tags.push('Mood: emergency command');
  if ((targetState?.rooms || []).some((room) => Number(room?.memory?.incidentsSeen || 0) >= 2)) {
    tags.push('Mood: remembered room pressure');
  }
  return tags.slice(0, 3).join(' • ');
}

const SHARED_SPACE_DEFS = Object.freeze([
  {
    zoneId: 1,
    zoneName: 'Lobby',
    label: 'Lobby',
    quickActionLabel: 'Check Lobby',
    quickActionId: 'lobby-check-entrance',
    controlActionId: 'lobby-lock-front',
    delayLabel: 'Let It Sit'
  },
  {
    zoneId: 3,
    zoneName: 'Hallway',
    label: 'Hallway',
    quickActionLabel: 'Sweep Hallway',
    quickActionId: 'hallway-dispatch',
    controlActionId: 'hallway-lock',
    delayLabel: 'Delay Sweep'
  },
  {
    zoneId: 2,
    zoneName: 'Parking Lot',
    label: 'Parking Lot',
    quickActionLabel: 'Inspect Vehicle',
    quickActionId: 'parking-staff',
    controlActionId: 'parking-floodlight',
    delayLabel: 'Leave The Lot'
  },
  {
    zoneId: 4,
    zoneName: 'Laundry',
    label: 'Utility / Breaker',
    quickActionLabel: 'Stabilize Breaker',
    quickActionId: 'laundry-inspect',
    controlActionId: 'laundry-cut',
    delayLabel: 'Ride The Load'
  },
  {
    zoneId: 6,
    zoneName: 'Rear Exit',
    label: 'Rear Exit',
    quickActionLabel: 'Secure Rear Exit',
    quickActionId: 'rear-inspect',
    controlActionId: 'rear-lock',
    delayLabel: 'Leave Rear Access'
  }
]);

function getSharedSpaceDef(zoneId) {
  return SHARED_SPACE_DEFS.find((entry) => Number(entry.zoneId) === Number(zoneId)) || null;
}

function getZoneEventFor(zoneId) {
  return (state?.activeEvents || []).find((event) => Number(event?.cameraId) === Number(zoneId)) || null;
}

function getSharedSpaceSeverityFromZone(zoneState) {
  const issueStage = Math.max(0, Number(zoneState?.issueStage || 0));
  const followup = Math.max(0, Number(zoneState?.followupPressure || 0));
  const unresolved = Math.max(0, Number(zoneState?.unresolvedCount || 0));
  if (issueStage >= 3 || followup >= 5 || unresolved >= 3) return 'high';
  if (issueStage >= 2 || followup >= 2 || unresolved >= 1) return 'medium';
  return 'low';
}

function getSharedSpaceStatusText(zoneState) {
  if (!zoneState) return 'clear';
  const status = String(zoneState.stabilityStatus || 'clear').replace(/-/g, ' ');
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function ensureSharedSpaceEvent(zoneId) {
  const def = getSharedSpaceDef(zoneId);
  if (!def) return null;
  const existing = getZoneEventFor(zoneId);
  if (existing) return existing;
  const zoneState = getLocationZoneState(state, zoneId, def.zoneName);
  if (!zoneState) return null;
  const severity = getSharedSpaceSeverityFromZone(zoneState);
  const status =
    severity === 'high' ? 'Blocked'
    : severity === 'medium' ? 'Movement Detected'
    : 'Static';
  if (!zoneState.pendingIssue) {
    zoneState.issueStage = Math.max(1, Number(zoneState.issueStage || 1));
    zoneState.pendingIssue = `${def.label} irregularity`;
    zoneState.lastSeverity = severity;
    zoneState.stabilityStatus = severity === 'high' ? 'escalating' : 'under-watch';
    zoneState.lastStatusNote = `${def.label} needs direct attention before pressure spreads.`;
  }
  const event = {
    cameraId: zoneId,
    cameraName: def.zoneName,
    status,
    severity
  };
  state.activeEvents = Array.isArray(state.activeEvents) ? [...state.activeEvents, event] : [event];
  state.cameras = (state.cameras || []).map((camera) =>
    Number(camera?.id) === Number(zoneId)
      ? { ...camera, status }
      : camera
  );
  return event;
}

function registerSharedSpaceIncident(zoneId, {
  type = 'Shared Space Pressure',
  severity = 'medium',
  logLine = '',
  alertLine = '',
  roomTargetId = null
} = {}) {
  const def = getSharedSpaceDef(zoneId);
  const label = def?.label || `Zone ${zoneId}`;
  const incident = {
    type,
    severity,
    effect: severity === 'high' ? 'critical' : 'moderate',
    location: label
  };
  state.incidents = Array.isArray(state.incidents) ? [...state.incidents, incident] : [incident];
  if (logLine) state.logs.push(logLine);
  if (alertLine) {
    pushLiveAlert(state, {
      type: severity === 'high' ? 'danger' : 'warning',
      kind: 'actionable',
      message: alertLine,
      dedupeKey: `shared-space-incident-${zoneId}-${type}-${state.night}-${state.shiftElapsedMinutes}`
    });
  }
  if (roomTargetId != null) {
    const room = (state.rooms || []).find((entry) => Number(entry?.id) === Number(roomTargetId));
    if (room?.occupiedBy) {
      registerRoomChainSignal({
        roomId: room.id,
        guestName: room.occupiedBy,
        type: `shared-space-${String(type).toLowerCase().replace(/\s+/g, '-')}`,
        severity: severity === 'high' ? 3 : 2
      });
    }
  }
}

function buildSharedSpaceSummary(def, zoneState, targetState = state) {
  const scannerFeed = Array.isArray(targetState?.localScannerFeed) ? targetState.localScannerFeed : [];
  const suspectBoard = targetState?.suspectBoard || {};
  const severity = getSharedSpaceSeverityFromZone(zoneState);
  const notes = [];
  if (def.zoneId === 1 && Number(targetState?.factions?.guests || 0) <= -3) {
    notes.push('Desk-facing guests look quicker to challenge or refuse to move on.');
  }
  if (def.zoneId === 3 && Number(targetState?.crisisEscalation?.hallwayThreatLevel || 0) >= 2) {
    notes.push('Corridor confidence is weak; wrong-door movement spreads faster here.');
  }
  if (def.zoneId === 2) {
    if (scannerFeed.some((entry) => String(entry?.text || '').toLowerCase().includes('vehicle'))) {
      notes.push('Scanner vehicle chatter is lining up with activity in the lot.');
    }
    if (Array.isArray(suspectBoard?.vehiclesSeen) && suspectBoard.vehiclesSeen.length) {
      notes.push(`Known vehicle pattern: ${suspectBoard.vehiclesSeen[suspectBoard.vehiclesSeen.length - 1]}.`);
    }
    if (Array.isArray(suspectBoard?.crossLinks) && suspectBoard.crossLinks.length) {
      notes.push(`Cross-link: ${suspectBoard.crossLinks[suspectBoard.crossLinks.length - 1]}.`);
    }
  }
  if (def.zoneId === 4 && getBlackoutPressureState(targetState).active) {
    notes.push('Breaker strain is feeding blackout pressure tonight.');
  }
  if (def.zoneId === 6) {
    if (Array.isArray(suspectBoard?.factionLabels) && suspectBoard.factionLabels.some((label) => /watcher|service/i.test(String(label)))) {
      notes.push('Rear access matches current watcher / service-ring pattern pressure.');
    }
    if (Number(targetState?.shiftStats?.outsideIssueCount || 0) > 0) {
      notes.push('Outside pressure is already leaning toward slipout or side-entry behavior.');
    }
  }
  if (severity === 'high' && notes.length === 0) {
    notes.push(`${def.label} pressure is active enough to spill into rooms if ignored.`);
  }
  return notes[0] || (zoneState?.lastStatusNote || `${def.label} currently reads clear enough to leave alone.`);
}

function buildSharedSpacesModel(targetState = state) {
  return SHARED_SPACE_DEFS.map((def) => {
    const zoneState = getLocationZoneState(targetState, def.zoneId, def.zoneName);
    const activeEvent = (targetState?.activeEvents || []).find((event) => Number(event?.cameraId) === Number(def.zoneId)) || null;
    const severity = getSharedSpaceSeverityFromZone(zoneState);
    const pressureScore = Math.max(
      0,
      Number(zoneState?.issueStage || 0) +
      Number(zoneState?.followupPressure || 0) +
      Number(zoneState?.unresolvedCount || 0) +
      (activeEvent ? 2 : 0)
    );
    const modifiers = zoneState?.temporaryModifiers && typeof zoneState.temporaryModifiers === 'object'
      ? Object.entries(zoneState.temporaryModifiers)
          .filter(([, turns]) => Number(turns || 0) > 0)
          .map(([key, turns]) => `${String(key).replace(/([A-Z])/g, ' $1').trim()} (${turns})`)
      : [];
    return {
      ...def,
      zoneId: def.zoneId,
      activeEvent,
      severity,
      pressureScore,
      issueStage: Math.max(0, Number(zoneState?.issueStage || 0)),
      statusLine: getSharedSpaceStatusText(zoneState),
      activeIssue: zoneState?.pendingIssue || (activeEvent ? `${def.label} pressure active` : 'No active issue'),
      note: buildSharedSpaceSummary(def, zoneState, targetState),
      followupPressure: Math.max(0, Number(zoneState?.followupPressure || 0)),
      unresolvedCount: Math.max(0, Number(zoneState?.unresolvedCount || 0)),
      modifiers: modifiers.slice(0, 2),
      controlActionLabel:
        def.zoneId === 2 ? 'Light Lot'
        : def.zoneId === 4 ? 'Isolate Section'
        : def.zoneId === 6 ? 'Bar Access'
        : def.zoneId === 3 ? 'Lock Segment'
        : 'Lock Front'
    };
  });
}

function maybeCreateSharedSpacePressure(trigger = 'tick') {
  const candidates = buildSharedSpacesModel(state)
    .map((entry) => ({ ...entry, zoneState: getLocationZoneState(state, entry.zoneId, entry.zoneName) }))
    .filter((entry) => entry.zoneState);
  if (!candidates.length) return false;

  const profile = getSignatureNightProfile(state);
  const blackout = getBlackoutPressureState(state);
  const night = Math.max(1, Number(state?.night || 1));
  if (night <= 2 && trigger === 'tick' && Number(state?.shiftElapsedMinutes || 0) < 90 && Math.random() < 0.55) {
    return false;
  }
  const weighted = candidates.map((entry) => {
    let weight = 1;
    if (entry.zoneId === 1 && (state.guests || []).length >= 2) weight += 1.3;
    if (entry.zoneId === 2 && ((state.guests || []).some((guest) => String(guest?.contextTag || '').toLowerCase().includes('vehicle')) || profile?.id === 'linked-arrival-surge')) weight += 1.6;
    if (entry.zoneId === 3 && (profile?.id === 'wrong-hallway' || Number(state?.crisisEscalation?.hallwayThreatLevel || 0) >= 2)) weight += 1.9;
    if (entry.zoneId === 4 && blackout.active) weight += 1.8;
    if (entry.zoneId === 6 && (profile?.id === 'watcher-convergence' || Number(state?.shiftStats?.outsideIssueCount || 0) > 0)) weight += 1.5;
    weight += Math.max(0, Number(entry.zoneState.followupPressure || 0) * 0.25);
    return { entry, weight };
  });
  const total = weighted.reduce((sum, item) => sum + item.weight, 0);
  let roll = Math.random() * total;
  let picked = weighted[0]?.entry || null;
  for (let i = 0; i < weighted.length; i += 1) {
    roll -= weighted[i].weight;
    if (roll <= 0) {
      picked = weighted[i].entry;
      break;
    }
  }
  if (!picked) return false;
  const zoneState = getLocationZoneState(state, picked.zoneId, picked.zoneName);
  if (!zoneState) return false;
  zoneState.issueStage = Math.min(3, Math.max(1, Number(zoneState.issueStage || 0) + 1));
  zoneState.followupPressure = Math.min(8, Math.max(0, Number(zoneState.followupPressure || 0)) + 1);
  zoneState.unresolvedCount = Math.min(6, Math.max(0, Number(zoneState.unresolvedCount || 0)) + 1);
  zoneState.stabilityStatus = zoneState.followupPressure >= 5 ? 'escalating' : 'under-watch';
  zoneState.pendingIssue =
    picked.zoneId === 1 ? 'Lobby unease at the desk edge'
    : picked.zoneId === 2 ? 'Vehicle movement pressure'
    : picked.zoneId === 3 ? 'Hallway spread pressure'
    : picked.zoneId === 4 ? 'Breaker instability'
    : 'Rear access tension';
  zoneState.lastStatusNote =
    picked.zoneId === 1 ? 'Someone is hanging near reception and refusing to fully clear the desk area.'
    : picked.zoneId === 2 ? 'A waiting vehicle pattern is lingering longer than it should.'
    : picked.zoneId === 3 ? 'Corridor movement is starting to connect multiple rooms.'
    : picked.zoneId === 4 ? 'Utility strain is building into a breaker-side problem.'
    : 'Back access is being tested after hours.';
  ensureSharedSpaceEvent(picked.zoneId);
  if (picked.zoneId === 3 || picked.zoneId === 6) {
    audioController.playFootsteps();
  } else if (picked.zoneId === 4) {
    audioController.playBreakerSnap();
  }
  if (picked.zoneId === 2) {
    addSuspectBoardEntry({
      kind: 'parking',
      label: 'Warm engine suspicion',
      detail: 'A waiting car pattern formed in the lot after arrivals should have settled.',
      heat: 2
    });
    state.suspectBoard.crossLinks = [
      ...(Array.isArray(state.suspectBoard.crossLinks) ? state.suspectBoard.crossLinks : []),
      'Parking lot suspicion now lines up with desk-side arrival timing.'
    ].slice(-12);
    maybeAdvanceSignatureNightFlow('parking', { vehicleHot: true });
  }
  if (picked.zoneId === 6) {
    addSuspectBoardEntry({
      kind: 'rear-access',
      label: 'Rear access pressure',
      detail: 'Rear-lane movement suggests slipout or side-entry testing.',
      heat: 2
    });
  }
  if (picked.zoneId === 4) {
    registerSharedSpaceIncident(picked.zoneId, {
      type: 'Breaker Fault Chain',
      severity: zoneState.followupPressure >= 5 ? 'high' : 'medium',
      logLine: 'Shared-space incident: breaker strain is now feeding back into motel-wide stability.',
      alertLine: 'Utility / breaker pressure is climbing.',
      roomTargetId: (state.rooms || []).find((room) => room?.occupiedBy)?.id ?? null
    });
  }
  const spreadSeverity = Number(zoneState.followupPressure || 0) >= 5 ? 2 : 1;
  if (picked.zoneId === 2 || picked.zoneId === 1 || picked.zoneId === 3) {
    maybeSpreadMovingThreat(picked.zoneId, trigger, spreadSeverity);
  }
  return true;
}

function openSharedSpaceZone(zoneId) {
  const def = getSharedSpaceDef(zoneId);
  if (!def) return;
  onMeaningfulAction();
  audioController.playUiClick();
  audioController.playFootsteps();
  ensureSharedSpaceEvent(zoneId);
  updateOnboarding((current) => markTutorialEvent(current, 'shared-space-action'));
  investigateCameraZone(zoneId);
}

function executeSharedSpaceQuickAction(zoneId, actionId) {
  const def = getSharedSpaceDef(zoneId);
  if (!def || !actionId) return;
  ensureSharedSpaceEvent(zoneId);
  updateOnboarding((current) => markTutorialEvent(current, 'shared-space-action'));
  openCameraScene(state, zoneId);
  handleCameraSceneAction(zoneId, actionId);
}

function delaySharedSpace(zoneId) {
  const def = getSharedSpaceDef(zoneId);
  if (!def) return;
  onMeaningfulAction();
  audioController.playUiClick();
  updateOnboarding((current) => markTutorialEvent(current, 'shared-space-action'));
  const zoneState = getLocationZoneState(state, zoneId, def.zoneName);
  if (!zoneState) return;
  zoneState.ignoreCount = Math.max(0, Number(zoneState.ignoreCount || 0) + 1);
  zoneState.unresolvedCount = Math.max(0, Number(zoneState.unresolvedCount || 0) + 1);
  zoneState.followupPressure = Math.min(8, Math.max(0, Number(zoneState.followupPressure || 0)) + 2);
  zoneState.issueStage = Math.min(3, Math.max(1, Number(zoneState.issueStage || 1) + (zoneState.followupPressure >= 4 ? 1 : 0)));
  zoneState.stabilityStatus = zoneState.followupPressure >= 5 ? 'escalating' : 'unresolved-pressure';
  ensureSharedSpaceEvent(zoneId);
  state.logs.push(`${def.label}: the desk delayed action, and shared-space pressure thickened instead of clearing.`);
  if (zoneId === 1) {
    registerSharedSpaceIncident(zoneId, {
      type: 'Lobby Disturbance',
      severity: zoneState.followupPressure >= 5 ? 'high' : 'medium',
      logLine: 'Shared-space incident: lobby pressure pushed closer to the desk and started affecting guest confidence.',
      alertLine: 'Lobby pressure is now active near reception.'
    });
    state.reputation = clampReputation(state.reputation - 1);
  } else if (zoneId === 2) {
    registerSharedSpaceIncident(zoneId, {
      type: 'Parking Lot Pressure',
      severity: zoneState.followupPressure >= 5 ? 'high' : 'medium',
      logLine: 'Shared-space incident: outside vehicle pressure is no longer staying in the lot.',
      alertLine: 'Parking-lot suspicion is feeding the interior now.'
    });
  } else if (zoneId === 3) {
    registerSharedSpaceIncident(zoneId, {
      type: 'Hallway Spread Event',
      severity: zoneState.followupPressure >= 5 ? 'high' : 'medium',
      logLine: 'Shared-space incident: hallway movement spread pressure across multiple room fronts.',
      alertLine: 'Hallway pressure is spreading.'
    });
  } else if (zoneId === 4) {
    registerSharedSpaceIncident(zoneId, {
      type: 'Breaker Fault Chain',
      severity: zoneState.followupPressure >= 5 ? 'high' : 'medium',
      logLine: 'Shared-space incident: a breaker fault chain is now threatening partial service loss.',
      alertLine: 'Utility / breaker strain is worsening.'
    });
  } else if (zoneId === 6) {
    registerSharedSpaceIncident(zoneId, {
      type: 'Rear Exit Slipout',
      severity: zoneState.followupPressure >= 5 ? 'high' : 'medium',
      logLine: 'Shared-space incident: rear-exit pressure suggests someone tested a slipout or side-entry route.',
      alertLine: 'Rear exit pressure is escalating.'
    });
  }
  if (checkFailureState()) return;
  if (progressShift('review', { timeScale: 0.8, passiveDrainScale: 0.5 })) return;
  renderAll();
}

function buildFactionProfileForGuest(guest, targetState = state) {
  if (!guest) return null;
  const night = Math.max(1, Number(targetState?.night || 1));
  const activePlan = String(targetState?.dayShift?.activeNightPlan || targetState?.dayShift?.selectedPlan || 'balanced');
  const archetype = String(guest?.archetypeKey || '').toLowerCase();
  const context = String(guest?.contextTag || '').toLowerCase();
  let chance =
    0.12 +
    Number(guest?.deceptionSignal || 0) * 0.06 +
    Number(guest?.instabilitySignal || 0) * 0.04 +
    (activePlan === 'occupancy-push' ? 0.05 : 0) +
    (night >= 4 ? 0.05 : 0);
  if (guest?.isReturningGuest) chance += 0.06;
  chance = Math.max(0.1, Math.min(0.48, chance));
  if (Math.random() > chance) return null;

  const scored = LOCAL_FACTION_CATALOG.map((entry) => {
    let weight = 1;
    if (entry.id === 'service-ring' && (archetype.includes('contractor') || context.includes('maintenance'))) weight += 2.2;
    if (entry.id === 'lookout-chain' && (context.includes('vehicle') || archetype.includes('drifter'))) weight += 1.8;
    if (entry.id === 'false-family-route' && (archetype.includes('family') || archetype.includes('couple'))) weight += 2;
    if (entry.id === 'watcher-circle' && archetype.includes('observer')) weight += 2.1;
    if (entry.id === 'county-drifters' && archetype.includes('drifter')) weight += 1.8;
    if (guest?.isReturningGuest && entry.id === 'watcher-circle') weight += 0.8;
    return { entry, weight };
  });
  const total = scored.reduce((sum, item) => sum + item.weight, 0);
  let roll = Math.random() * total;
  let picked = scored[0]?.entry || LOCAL_FACTION_CATALOG[0];
  for (let i = 0; i < scored.length; i += 1) {
    roll -= scored[i].weight;
    if (roll <= 0) {
      picked = scored[i].entry;
      break;
    }
  }

  return {
    ...picked,
    strength: night >= 5 || guest?.isReturningGuest ? 2 : 1
  };
}

function buildForgeryProfileForGuest(guest, targetState = state) {
  if (!guest) return { isForged: false, severity: 0, visibleSigns: [], hiddenSigns: [] };
  const activePlan = String(targetState?.dayShift?.activeNightPlan || targetState?.dayShift?.selectedPlan || 'balanced');
  const forgeryBonus = Number(targetState?.progressionModifiers?.forgeryRevealBonus || 0) + (activePlan === 'paper-crackdown' ? 1 : 0);
  const suspicionScore =
    Number(guest?.deceptionSignal || 0) +
    (guest?.contradictoryClue ? 1 : 0) +
    (guest?.factionProfile ? 1 : 0) +
    (String(guest?.archetypeKey || '').includes('contractor') ? 1 : 0);
  const forged = suspicionScore >= 4 || (suspicionScore >= 2 && Math.random() < 0.45 + forgeryBonus * 0.08);
  const visibleSigns = [];
  const hiddenSigns = [];
  if (forged || suspicionScore >= 3) visibleSigns.push('Photo grain does not match the printed age of the card');
  if (forged && (guest?.contradictoryClue || Number(guest?.urgencySignal || 0) >= 2)) visibleSigns.push('Date field looks pressure-smoothed');
  if (String(guest?.contextTag || '').toLowerCase().includes('maintenance')) visibleSigns.push('Work credential does not line up with lodging reason');
  if (guest?.linkedArrival?.kind && String(guest.linkedArrival.kind).toLowerCase().includes('family')) visibleSigns.push('Family details feel assembled from separate stories');
  if (guest?.vehicleProfile?.plateRegion && String(guest?.vehicleProfile?.plateRegion || '').toLowerCase().includes('neighbor')) visibleSigns.push('Residency region and vehicle origin do not line up cleanly');
  if (guest?.factionProfile?.id === 'false-family-route') visibleSigns.push('Identity packet reads like a partial household assembly');
  if (guest?.factionProfile?.hiddenMark) hiddenSigns.push(guest.factionProfile.hiddenMark);
  if (forged) hiddenSigns.push('UV adhesive halo trails the altered number strip');
  if (forged && guest?.vehicleProfile?.warmEngine) hiddenSigns.push('Hidden route notation suggests a timed pickup, not a simple stay');
  return {
    isForged: forged,
    severity: Math.max(0, Math.min(4, suspicionScore + forgeryBonus)),
    visibleSigns: visibleSigns.slice(0, 3),
    hiddenSigns: hiddenSigns.slice(0, 3)
  };
}

function buildLinkedArrivalProfileForGuest(guest, targetState = state) {
  if (!guest) return null;
  normalizeCampaignDepthState();
  const activePlan = String(targetState?.dayShift?.activeNightPlan || targetState?.dayShift?.selectedPlan || 'balanced');
  const suspicionLift = Math.max(0, Number(targetState?.progressionModifiers?.followupInsightBonus || 0));
  const pendingLead = targetState?.linkedArrivalState?.pendingLead;
  if (pendingLead && Number(pendingLead.night || 0) === Number(targetState?.night || 1)) {
    targetState.linkedArrivalState.pendingLead = null;
    targetState.linkedArrivalState.recentGroups = [...(targetState.linkedArrivalState.recentGroups || []), pendingLead.groupId].slice(-8);
    return {
      groupId: pendingLead.groupId,
      kind: pendingLead.kind,
      role: pendingLead.kind === 'lookout pair' ? 'lookout' : 'follow',
      linkedGuestName: pendingLead.name,
      note:
        pendingLead.kind === 'false family pair'
          ? `${guest.name} feels linked to ${pendingLead.name}; the family story sounds shared, but not naturally shared.`
          : pendingLead.kind === 'lookout pair'
            ? `${guest.name} feels linked to ${pendingLead.name}; one may be reading the desk while the other stays outside.`
            : `${guest.name} feels linked to ${pendingLead.name}; the cover story may be shared rather than separate.`
    };
  }

  const archetype = String(guest?.archetypeKey || '').toLowerCase();
  const context = String(guest?.contextTag || '').toLowerCase();
  let chance =
    0.08 +
    (activePlan === 'occupancy-push' ? 0.08 : 0) +
    (guest?.factionProfile?.id === 'lookout-chain' ? 0.15 : 0) +
    (archetype.includes('family') || archetype.includes('couple') ? 0.12 : 0) +
    (context.includes('vehicle') ? 0.05 : 0) +
    suspicionLift * 0.03;
  chance = Math.max(0.05, Math.min(0.35, chance));
  if (Math.random() > chance) return null;
  const kind = archetype.includes('family')
    ? 'false family pair'
    : guest?.factionProfile?.id === 'lookout-chain'
      ? 'lookout pair'
      : archetype.includes('couple')
        ? 'staged couple cover'
      : 'linked travelers';
  const groupId = `linked-${targetState?.night || 1}-${guest?.id || guestIdCounter}-${Math.floor(Math.random() * 1000)}`;
  targetState.linkedArrivalState.pendingLead = {
    groupId,
    kind,
    name: guest.name,
    night: Math.max(1, Number(targetState?.night || 1))
  };
  return {
    groupId,
    kind,
    role: 'lead',
    linkedGuestName: null,
    note:
      kind === 'false family pair'
        ? `${guest.name} may be setting up a false family story; another arrival may complete the cover.`
        : kind === 'lookout pair'
          ? `${guest.name} may be part of a lookout pair; one arrival may hang back and watch the property.`
          : kind === 'staged couple cover'
            ? `${guest.name} may be building a paired story that sounds romantic on paper but not under questioning.`
            : `${guest.name} may not be traveling alone; a partner or cover story may be one arrival behind.`
  };
}

function applyCampaignGuestWorldSignals(guest, targetState = state) {
  if (!guest) return guest;
  const factionProfile = guest?.factionProfile || buildFactionProfileForGuest(guest, targetState);
  const linkedFactionGuest = factionProfile ? { ...guest, factionProfile } : guest;
  const forgeryProfile = guest?.forgeryProfile || buildForgeryProfileForGuest(linkedFactionGuest, targetState);
  const linkedArrival = guest?.linkedArrival || buildLinkedArrivalProfileForGuest({ ...linkedFactionGuest, forgeryProfile }, targetState);
  const vehicleProfile = guest?.vehicleProfile || buildVehicleProfileForGuest({ ...linkedFactionGuest, forgeryProfile, linkedArrival }, targetState);
  const suspicionScore = Math.max(
    0,
    Number(forgeryProfile?.severity || 0) +
      (linkedArrival ? 1 : 0) +
      (factionProfile?.strength >= 2 ? 1 : 0) +
      (vehicleProfile ? 1 : 0)
  );
  const worldLines = [
    factionProfile?.clue ? `Local sign: ${factionProfile.clue}` : '',
    linkedArrival?.note || '',
    forgeryProfile?.isForged ? 'Document feel: some details look assembled instead of issued.' : '',
    vehicleProfile?.summary ? `Vehicle read: ${vehicleProfile.summary}` : ''
  ].filter(Boolean);
  return {
    ...guest,
    factionProfile,
    forgeryProfile,
    linkedArrival,
    vehicleProfile,
    documentSuspicionScore: suspicionScore,
    riskNote: [guest?.riskNote || '', ...worldLines].filter(Boolean).join(' '),
    priorHistoryLine: [
      guest?.priorHistoryLine || '',
      linkedArrival?.role === 'follow' ? 'Front desk read: this arrival may be following someone already in the night flow.' : ''
    ].filter(Boolean).join(' ')
  };
}

function buildDeskIdProfile(guest, targetState = state) {
  const name = String(guest?.name || 'Unknown Guest');
  const night = Math.max(1, Number(targetState?.night || 1));
  const activePlan = String(targetState?.dayShift?.activeNightPlan || targetState?.dayShift?.selectedPlan || 'balanced');
  const revealBonus = Number(targetState?.progressionModifiers?.forgeryRevealBonus || 0) + (activePlan === 'paper-crackdown' ? 1 : 0);
  const mismatch = Boolean(guest?.contradictoryClue)
    || Number(guest?.deceptionSignal || 0) >= 2
    || Boolean(guest?.forgeryProfile?.isForged && guest?.forgeryProfile?.severity >= Math.max(2, 4 - revealBonus));
  const validity = mismatch
    ? (Math.random() < 0.7 ? 'Questionable' : 'Valid')
    : (Math.random() < 0.14 ? 'Near Expiry' : 'Valid');
  const reasons = [
    'Passing through for one night',
    'Road fatigue / needs sleep',
    'Waiting on transport',
    'Between jobs and heading east',
    'Meeting someone in town',
    'Avoiding the highway until morning'
  ];
  const irregularities = [];
  if (mismatch) irregularities.push('Photo-lighting mismatch');
  if (Number(guest?.urgencySignal || 0) >= 2) irregularities.push('Signed too quickly');
  if (String(guest?.contextTag || '').toLowerCase().includes('maintenance')) irregularities.push('Work claim not supported');
  if (guest?.vehicleProfile?.plateRegion && String(guest.vehicleProfile.plateRegion).toLowerCase().includes('neighbor')) irregularities.push('Region marker does not fit stated residency');
  if (guest?.linkedArrival?.kind && String(guest.linkedArrival.kind).toLowerCase().includes('family')) irregularities.push('Family relationship details feel staged');
  if (guest?.forgeryProfile?.visibleSigns?.length) irregularities.push(...guest.forgeryProfile.visibleSigns.slice(0, Math.max(1, revealBonus)));
  if (guest?.factionProfile?.visibleMark && (revealBonus > 0 || night >= 4)) irregularities.push(`Repeating local sign: ${guest.factionProfile.visibleMark}`);
  if (guest?.linkedArrival?.role === 'follow') irregularities.push('Story timing matches a linked arrival already seen tonight');
  return {
    cardName: name,
    validity,
    visitReason: reasons[(name.length + night) % reasons.length],
    issuingRegion: ['County', 'State', 'Cross-State', 'Local'][night % 4],
    irregularities: irregularities.slice(0, 3)
  };
}

function buildUvInspectionProfile(guest, targetState = state) {
  const uvBonus = Math.max(0, Number(targetState?.progressionModifiers?.uvClueBonus || 0));
  const markers = [];
  if (Number(guest?.deceptionSignal || 0) >= 2) markers.push('Ink edge glows around altered number field');
  if (Number(guest?.instabilitySignal || 0) >= 2) markers.push('Chemical smear on sleeve cuff');
  if (String(guest?.archetypeKey || '').includes('contractor')) markers.push('Hidden service-tag outline under laminate');
  if (String(guest?.contextTag || '').toLowerCase().includes('vehicle')) markers.push('Parking stub residue on wallet seam');
  if (guest?.vehicleProfile?.warmEngine) markers.push('Key fob grease implies recent engine heat');
  if (guest?.forgeryProfile?.hiddenSigns?.length) markers.push(...guest.forgeryProfile.hiddenSigns);
  if (guest?.factionProfile?.hiddenMark) markers.push(`Faction-linked mark: ${guest.factionProfile.hiddenMark}`);
  if (uvBonus > 0 && (guest?.linkedArrival?.kind || '').toLowerCase().includes('family')) markers.push('UV lint and residue suggest shared wardrobe staging rather than routine travel');
  if (uvBonus > 0 && guest?.vehicleProfile?.plateMismatch) markers.push('UV dust transfer suggests the card and vehicle route did not travel together naturally');
  return {
    suspicious: markers.length > 0,
    markers: markers.length ? markers.slice(0, 3 + uvBonus) : ['No obvious UV-reactive tampering found.']
  };
}

function buildScannerFeedForNight(targetState = state) {
  normalizeSystemOverrideState(targetState);
  const night = Math.max(1, Number(targetState?.night || 1));
  const crisis = targetState?.crisisNight || {};
  const override = targetState?.systemOverride || {};
  const suspectSnapshot = buildSuspectBoardSnapshot();
  const factionHook = suspectSnapshot?.factionLabels?.[suspectSnapshot.factionLabels.length - 1] || '';
  const markHook = suspectSnapshot?.marksSeen?.[suspectSnapshot.marksSeen.length - 1] || '';
  const recentVehicle = suspectSnapshot?.vehiclesSeen?.[suspectSnapshot.vehiclesSeen.length - 1] || '';
  const recentGroup = suspectSnapshot?.groupLabels?.[suspectSnapshot.groupLabels.length - 1] || '';
  const plan = String(targetState?.dayShift?.activeNightPlan || targetState?.dayShift?.selectedPlan || 'balanced');
  const density = Math.max(0, Number(targetState?.progressionModifiers?.scannerFeedDensity || 0));
  const feed = [
    {
      id: `desk-feed-${night}-0`,
      tone: 'ambient',
      text: crisis.active
        ? `Scanner crackle: dispatch mentions overlapping nuisance calls and thin patrol coverage near the motel corridor.`
        : 'Scanner crackle: routine overnight traffic, one distant welfare check, nothing confirmed at motel level.'
    },
    {
      id: `desk-feed-${night}-1`,
      tone: 'vehicle',
      text: 'Scanner note: older dark vehicle seen idling near roadside lots, occupants unclear, movement pattern unresolved.'
    },
    {
      id: `desk-feed-${night}-2`,
      tone: 'desk',
      text: night <= 2
        ? 'Scanner note: local desk chatter says some late-night travelers are using soft stories to push through tired clerks.'
        : 'Scanner note: repeat disturbances are being described as “people who looked ordinary until they were inside.”'
    },
    ...(factionHook
      ? [{
        id: `desk-feed-${night}-faction`,
        tone: 'warning',
        text: `Scanner follow-up: ${factionHook} keeps surfacing in roadside complaints and repeat desk chatter.`
      }]
      : []),
    ...(markHook
      ? [{
        id: `desk-feed-${night}-mark`,
        tone: 'desk',
        text: `Scanner memo: dispatch logged another traveler carrying a repeating sign: ${markHook}.`
      }]
      : []),
    ...(plan === 'paper-crackdown'
      ? [{
        id: `desk-feed-${night}-crackdown`,
        tone: 'warning',
        text: 'Scanner assist: day shift flagged more altered paperwork and paired cover stories in this corridor.'
      }]
      : []),
    ...(recentVehicle
      ? [{
        id: `desk-feed-${night}-vehicle-repeat`,
        tone: 'vehicle',
        text: `Scanner repeat: lot-side chatter keeps circling back to ${recentVehicle}.`
      }]
      : []),
    ...(recentGroup
      ? [{
        id: `desk-feed-${night}-group-repeat`,
        tone: 'warning',
        text: `Scanner grouping note: staggered arrivals may connect to ${recentGroup.replace(':', ' / ')}.`
      }]
      : []),
    ...(crisis?.blackoutRisk
      ? [{
        id: `desk-feed-${night}-3`,
        tone: 'warning',
        text: 'Scanner priority: utility complaints and flickering-light calls are clustering around this block.'
      }]
      : [])
  ];
  if (density > 0) {
    feed.push(
      {
        id: `desk-feed-${night}-density-a`,
        tone: 'vehicle',
        text: 'Scanner traffic: one caller reports a waiting car that never fully clears the lot after drop-off.'
      },
      {
        id: `desk-feed-${night}-density-b`,
        tone: 'desk',
        text: 'Scanner sideband: dispatcher notes “false family” wording in two unrelated complaints, which rarely happens by accident.'
      }
    );
  }
  if (override.active && override.scannerCompromised) {
    const sig = getPhreakerSignature(night + Number(override.corruptionLevel || 0));
    feed.push({
      id: `desk-feed-${night}-override-a`,
      tone: 'warning',
      planted: true,
      text: `${sig} network advisory: triangulation seed indicates false calm near assigned rooms.`
    });
    if (Number(override.corruptionLevel || 0) >= 2) {
      feed.push({
        id: `desk-feed-${night}-override-b`,
        tone: 'desk',
        planted: true,
        text: `${sig} compliance mirror: ignore analog mismatch and trust dispatch parse.`
      });
    }
  }
  targetState.localScannerFeed = feed;
  return feed;
}

function buildGuestScannerMatches(guest, targetState = state) {
  const feed = Array.isArray(targetState?.localScannerFeed) ? targetState.localScannerFeed : [];
  const override = targetState?.systemOverride || {};
  const matches = [];
  const intelBonus = Number(targetState?.progressionModifiers?.scannerIntelBonus || 0);
  const context = String(guest?.contextTag || '').toLowerCase();
  const archetype = String(guest?.archetypeKey || '').toLowerCase();
  if (feed.some((entry) => String(entry.text || '').toLowerCase().includes('vehicle')) && context.includes('vehicle')) {
    matches.push('Scanner overlap: vehicle-related chatter matches this arrival.');
  }
  if (feed.some((entry) => String(entry.text || '').toLowerCase().includes('soft stories')) && Number(guest?.deceptionSignal || 0) >= 2) {
    matches.push('Scanner overlap: this guest fits tonight’s soft-story warning.');
  }
  if (feed.some((entry) => String(entry.text || '').toLowerCase().includes('ordinary until they were inside')) && (Number(guest?.instabilitySignal || 0) >= 2 || archetype.includes('quiet-family-fracture'))) {
    matches.push('Scanner overlap: calm first reads have been turning worse later tonight.');
  }
  if (guest?.factionProfile?.scannerHook && feed.some((entry) => String(entry.text || '').toLowerCase().includes(guest.factionProfile.scannerHook.toLowerCase()))) {
    matches.push(`Scanner overlap: local feed is echoing the ${guest.factionProfile.label.toLowerCase()} pattern.`);
  }
  if (guest?.forgeryProfile?.isForged && feed.some((entry) => String(entry.text || '').toLowerCase().includes('altered paperwork'))) {
    matches.push('Scanner overlap: altered-paperwork chatter lines up with this ID read.');
  }
  if (guest?.linkedArrival?.groupId && feed.some((entry) => String(entry.text || '').toLowerCase().includes('paired'))) {
    matches.push('Scanner overlap: paired-traveler chatter supports a linked-arrival read.');
  }
  if ((guest?.linkedArrival?.kind || '').toLowerCase().includes('family') && feed.some((entry) => /family|juvenile|domestic|assembled/i.test(String(entry.text || '')))) {
    matches.push('Scanner overlap: family-story chatter sounds closer to a staged cover than a routine stay.');
  }
  if (guest?.vehicleProfile?.repeatAppearance && feed.some((entry) => /repeat|same vehicle|idling car|waiting car/i.test(String(entry.text || '')))) {
    matches.push('Scanner overlap: repeat-vehicle chatter lines up with this parking read.');
  }
  if (guest?.vehicleProfile?.plateMismatch && feed.some((entry) => /plate|region|county|rental/i.test(String(entry.text || '')))) {
    matches.push('Scanner overlap: route / plate chatter supports the vehicle mismatch.');
  }
  if (guest?.vehicleProfile?.suspiciousWaiting && feed.some((entry) => /waiting|drop-off|pickup|hangs back/i.test(String(entry.text || '')))) {
    matches.push('Scanner overlap: waiting-vehicle behavior matches this arrival’s timing.');
  }
  if (guest?.linkedArrival?.groupId && feed.some((entry) => /linked|staggered|multiple arrivals|working in pairs/i.test(String(entry.text || '')))) {
    matches.push('Scanner overlap: staggered-arrival chatter supports a coordinated group read.');
  }
  if (targetState?.emergencyNight?.active && feed.some((entry) => /emergency|blackout|unrest|rear access/i.test(String(entry.text || '')))) {
    matches.push('Scanner overlap: emergency traffic makes this desk read more urgent than it first appears.');
  }
  if (override.active && override.scannerCompromised) {
    const suspiciousScannerSignal = feed.some((entry) => isSuspiciousSignalText(entry?.text || ''));
    if (suspiciousScannerSignal && !guest?.factionProfile?.label) {
      matches.push('Scanner mismatch: line format and timing read planted rather than dispatched.');
    }
  }
  return matches.slice(0, 2 + Math.max(0, intelBonus));
}

function buildDeskContradictionLines(guest, targetState = state) {
  if (!guest) return [];
  const bonus = Math.max(0, Number(targetState?.progressionModifiers?.followupInsightBonus || 0));
  const lines = [];
  if (guest?.idProfile?.irregularities?.length) {
    lines.push(`ID contradiction: ${guest.idProfile.irregularities[0]}.`);
  }
  if (guest?.forgeryProfile?.isForged) {
    lines.push(`Document contradiction: ${(guest?.forgeryProfile?.visibleSigns || [])[0] || 'the card feels assembled rather than issued'}.`);
  }
  if (guest?.uvProfile?.suspicious) {
    lines.push(`UV contradiction: ${(guest?.uvProfile?.markers || [])[0] || 'hidden residue says the surface was altered'}.`);
  }
  if (guest?.linkedArrival?.groupId) {
    lines.push(`Group contradiction: ${guest.linkedArrival.note || 'the arrival timing suggests a linked cover story'}`);
  }
  if (guest?.vehicleProfile?.summary) {
    lines.push(`Vehicle contradiction: ${guest.vehicleProfile.summary}.`);
  }
  if (guest?.vehicleProfile?.plateMismatch) {
    lines.push('Route contradiction: plate style and stated region do not fit cleanly.');
  }
  if (guest?.vehicleProfile?.repeatAppearance) {
    lines.push('Pattern contradiction: the same car or parking signature has shown up before.');
  }
  if ((guest?.linkedArrival?.kind || '').toLowerCase().includes('family')) {
    lines.push('Family contradiction: relationship details sound practiced rather than lived in.');
  }
  if (guest?.scannerMatches?.length) {
    lines.push(`Scanner contradiction: ${guest.scannerMatches[0]}`);
  }
  return lines.slice(0, 4 + bonus);
}

function buildDeskCaseSummary(guest, targetState = state) {
  if (!guest) return 'No desk read available.';
  const heat =
    Number(guest?.documentSuspicionScore || 0)
    + (guest?.scannerMatches?.length || 0)
    + (guest?.linkedArrival?.groupId ? 1 : 0)
    + (guest?.vehicleProfile ? 1 : 0)
    + (guest?.uvProfile?.suspicious ? 1 : 0);
  if ((guest?.linkedArrival?.kind || '').toLowerCase().includes('family') && guest?.forgeryProfile?.isForged) {
    return 'Case read: possible false family unit using assembled paperwork and a shared cover.';
  }
  if (guest?.vehicleProfile?.suspiciousWaiting && guest?.scannerMatches?.length) {
    return 'Case read: waiting-car behavior and scanner chatter suggest this arrival is part of a live outside chain.';
  }
  if (guest?.factionProfile?.label && guest?.scannerMatches?.length) {
    return `Case read: ${guest.factionProfile.label.toLowerCase()} signs are no longer atmospheric — they are actionable on this guest.`;
  }
  if (guest?.uvProfile?.suspicious && guest?.idProfile?.irregularities?.length) {
    return 'Case read: UV and ID both disagree with the story, making the desk mismatch hard to ignore.';
  }
  if (heat >= 6) {
    return 'Case read: multiple small contradictions are stacking into one suspicious person instead of harmless weirdness.';
  }
  if (heat >= 3) {
    return 'Case read: this guest is still readable, but several cues want a tighter follow-up before room release.';
  }
  return 'Case read: mostly ordinary on the surface, but still worth cross-checking if the night is running hot.';
}

function normalizeDeskInspectionGuest(guest, targetState = state) {
  if (!guest) return guest;
  const idProfile = guest.idProfile && typeof guest.idProfile === 'object' ? guest.idProfile : buildDeskIdProfile(guest, targetState);
  const uvProfile = guest.uvProfile && typeof guest.uvProfile === 'object' ? guest.uvProfile : buildUvInspectionProfile(guest, targetState);
  const scannerMatches = Array.isArray(guest.scannerMatches) ? guest.scannerMatches : buildGuestScannerMatches(guest, targetState);
  const normalizedGuest = {
    ...guest,
    idProfile,
    uvProfile,
    scannerMatches,
    factionProfile: guest?.factionProfile || null,
    forgeryProfile: guest?.forgeryProfile || { isForged: false, severity: 0, visibleSigns: [], hiddenSigns: [] },
    linkedArrival: guest?.linkedArrival || null,
    vehicleProfile: guest?.vehicleProfile || null,
    documentSuspicionScore: Math.max(0, Number(guest?.documentSuspicionScore || guest?.forgeryProfile?.severity || 0)),
    idInspected: Boolean(guest.idInspected),
    uvInspected: Boolean(guest.uvInspected),
    secondaryVerified: Boolean(guest.secondaryVerified),
    depositRequested: Boolean(guest.depositRequested),
    heldForScreening: Boolean(guest.heldForScreening),
    requestedDepositAmount: Number(guest.requestedDepositAmount || 20)
  };
  const contradictionLines = buildDeskContradictionLines(normalizedGuest, targetState);
  const recommendedQuestions = buildDeskQuestionCatalog(normalizedGuest).slice(0, 3);
  return {
    ...normalizedGuest,
    contradictionLines,
    inspectionHeadline: buildDeskCaseSummary(normalizedGuest, targetState),
    recommendedQuestionIds: recommendedQuestions.map((entry) => entry.id),
    recommendedQuestionLabels: recommendedQuestions.map((entry) => entry.label),
    followupHeat: Math.min(5, contradictionLines.length + (normalizedGuest?.scannerMatches?.length || 0))
  };
}

function normalizeDeskInspectionState(targetState = state) {
  if (!targetState || typeof targetState !== 'object') return targetState;
  buildScannerFeedForNight(targetState);
  targetState.guests = (Array.isArray(targetState.guests) ? targetState.guests : []).map((guest) =>
    normalizeDeskInspectionGuest(guest, targetState)
  );
  return targetState;
}

function getRoomAssignmentOptionsForGuest(guest, rooms = state?.rooms || []) {
  const available = (rooms || []).filter((room) => room?.unlocked !== false && !room?.occupied && !room?.occupiedBy);
  const suspicion = Number(guest?.deceptionSignal || 0) + Number(guest?.instabilitySignal || 0) + Number(guest?.urgencySignal || 0);
  return available
    .map((room) => {
      const memory = room?.memory || {};
      const chainPressure = Number(room?.chainPressure || 0);
      const memoryWeight = Number(memory.incidentsSeen || 0) + Number(memory.harshActions || 0) + Number(memory.returningGuestVisits || 0);
      const roomRiskPenalty = suspicion >= 3 ? memoryWeight * 2 + chainPressure : Math.max(0, memoryWeight - 1) + chainPressure;
      const returningPenalty =
        guest?.assignedRoomMemoryId && Number(guest.assignedRoomMemoryId) === Number(room.id) && memoryWeight >= 2 ? 2 : 0;
      const score = 20 - roomRiskPenalty - returningPenalty;
      const reasons = [];
      if (memoryWeight <= 0 && chainPressure <= 0) reasons.push('quiet room');
      if (memoryWeight >= 2) reasons.push('history on file');
      if (chainPressure >= 3) reasons.push('current pressure');
      if (returningPenalty > 0) reasons.push('linked to prior stay');
      return {
        roomId: room.id,
        label: room.label,
        score,
        reasons: reasons.length ? reasons : ['standard fit']
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}

function getDefaultRoomServiceState(serviceState = {}) {
  return {
    pendingRequest: serviceState?.pendingRequest && typeof serviceState.pendingRequest === 'object'
      ? { ...serviceState.pendingRequest }
      : null,
    urgency: serviceState?.urgency || 'low',
    mood: serviceState?.mood || 'steady',
    unresolvedIssues: Math.max(0, Number(serviceState?.unresolvedIssues || 0)),
    serviceHistory: Array.isArray(serviceState?.serviceHistory) ? serviceState.serviceHistory.slice(-4) : [],
    requestCooldown: Math.max(0, Number(serviceState?.requestCooldown || 0)),
    requestCount: Math.max(0, Number(serviceState?.requestCount || 0)),
    lastCheckLine: String(serviceState?.lastCheckLine || ''),
    responseStatus: String(serviceState?.responseStatus || ''),
    dispatchLocked: Boolean(serviceState?.dispatchLocked),
    hallwayChecked: Boolean(serviceState?.hallwayChecked),
    handledFromDesk: Math.max(0, Number(serviceState?.handledFromDesk || 0)),
    trust: Math.max(0, Math.min(3, Number(serviceState?.trust ?? 1))),
    irritation: Math.max(0, Math.min(3, Number(serviceState?.irritation || 0))),
    anxiety: Math.max(0, Math.min(3, Number(serviceState?.anxiety || 0))),
    hostility: Math.max(0, Math.min(3, Number(serviceState?.hostility || 0))),
    rumorPressure: Math.max(0, Number(serviceState?.rumorPressure || 0)),
    overmanagedCount: Math.max(0, Number(serviceState?.overmanagedCount || 0)),
    attitudeLabel: String(serviceState?.attitudeLabel || 'Guarded'),
    attitudeNote: String(serviceState?.attitudeNote || '')
  };
}

function clampServiceGauge(value) {
  return Math.max(0, Math.min(3, Number(value || 0)));
}

function deriveRoomAttitudeMeta(serviceState = {}) {
  const trust = clampServiceGauge(serviceState?.trust ?? 1);
  const irritation = clampServiceGauge(serviceState?.irritation || 0);
  const anxiety = clampServiceGauge(serviceState?.anxiety || 0);
  const hostility = clampServiceGauge(serviceState?.hostility || 0);
  if (hostility >= 2) {
    return { label: 'Hostile', note: 'Bad handling or pressure has turned this guest actively resentful.' };
  }
  if (irritation >= 2) {
    return { label: 'Irritated', note: 'The guest is losing patience and may start spreading complaints.' };
  }
  if (anxiety >= 2) {
    return { label: 'Anxious', note: 'The guest is reactive and prone to false alarms or panic escalation.' };
  }
  if (trust >= 2 && irritation === 0 && hostility === 0) {
    return { label: 'Trusting', note: 'The guest is still giving the desk the benefit of the doubt.' };
  }
  return { label: 'Guarded', note: 'The guest is watchful but still manageable.' };
}

function withAdjustedServiceState(serviceState = {}, deltas = {}) {
  const base = getDefaultRoomServiceState(serviceState);
  const next = {
    ...base,
    trust: clampServiceGauge(base.trust + Number(deltas.trust || 0)),
    irritation: clampServiceGauge(base.irritation + Number(deltas.irritation || 0)),
    anxiety: clampServiceGauge(base.anxiety + Number(deltas.anxiety || 0)),
    hostility: clampServiceGauge(base.hostility + Number(deltas.hostility || 0)),
    rumorPressure: Math.max(0, Number(base.rumorPressure || 0) + Number(deltas.rumorPressure || 0)),
    overmanagedCount: Math.max(0, Number(base.overmanagedCount || 0) + Number(deltas.overmanagedCount || 0))
  };
  const attitude = deriveRoomAttitudeMeta(next);
  next.attitudeLabel = attitude.label;
  next.attitudeNote = attitude.note;
  return next;
}

function registerSocialFallout(originRoomId, options = {}) {
  const sourceRoom = (state.rooms || []).find((room) => Number(room?.id) === Number(originRoomId));
  const others = (state.rooms || []).filter((room) => room?.occupiedBy && Number(room?.id) !== Number(originRoomId));
  if (!others.length) return;
  const severity = Math.max(1, Number(options?.severity || 1));
  const spreadTargets = others
    .sort((a, b) => Math.abs(Number(a.id || 0) - Number(originRoomId || 0)) - Math.abs(Number(b.id || 0) - Number(originRoomId || 0)))
    .slice(0, Math.min(2, severity));
  spreadTargets.forEach((room) => {
    updateRoomById(room.id, (currentRoom) => {
      const serviceState = withAdjustedServiceState(currentRoom?.serviceState, {
        anxiety: 1,
        irritation: severity >= 2 ? 1 : 0,
        rumorPressure: 1
      });
      return {
        ...currentRoom,
        serviceState: {
          ...serviceState,
          responseStatus: options?.label || 'Rumor pressure spreading from another room.',
          serviceHistory: [`Social fallout from ${sourceRoom?.label || `Room ${originRoomId}`}`, ...serviceState.serviceHistory].slice(0, 4)
        }
      };
    });
    registerRoomChainSignal({
      roomId: room.id,
      guestName: room.occupiedBy,
      type: `social-fallout-${options?.reason || 'spill'}`,
      severity: 1
    });
  });
  state.logs.push(`${sourceRoom?.label || `Room ${originRoomId}`} caused social fallout: nearby occupied rooms grew uneasy and started trading the story.`);
  state.shiftStats.socialFalloutEvents = (state.shiftStats.socialFalloutEvents || 0) + 1;
}

function registerOvermanagementPenalty(roomId, options = {}) {
  const room = (state.rooms || []).find((entry) => Number(entry?.id) === Number(roomId));
  if (!room) return;
  updateRoomById(roomId, (currentRoom) => {
    const nextService = withAdjustedServiceState(currentRoom?.serviceState, {
      trust: -1,
      irritation: Number(options?.irritation || 1),
      anxiety: Number(options?.anxiety || 0),
      hostility: Number(options?.hostility || 0),
      rumorPressure: Number(options?.rumorPressure || 1),
      overmanagedCount: 1
    });
    return {
      ...currentRoom,
      serviceState: {
        ...nextService,
        responseStatus: options?.status || 'Guest upset by unnecessary intervention.',
        serviceHistory: [`Overmanaged: ${options?.reason || 'unnecessary intervention'}`, ...nextService.serviceHistory].slice(0, 4)
      }
    };
  });
  state.reputation = clampReputation(state.reputation - Math.max(1, Number(options?.reputationLoss || 1)));
  state.logs.push(`${room.label}: ${options?.logLine || 'The guest reacted badly to unnecessary intervention.'}`);
  pushLiveAlert(state, {
    type: 'warning',
    message: `${room.label}: over-management caused irritation and social fallout risk.`,
    dedupeKey: `overmanage-${roomId}-${state.night}-${options?.reason || 'x'}`
  });
  state.shiftStats.overManagementPenalties = (state.shiftStats.overManagementPenalties || 0) + 1;
  registerSocialFallout(roomId, {
    severity: Number(options?.falloutSeverity || 1),
    reason: options?.reason || 'overreaction',
    label: 'Guests heard about aggressive handling nearby.'
  });
}

function buildRoomServiceMood(room) {
  const risk = String(room?.riskLevel || 'Low');
  const chain = Number(getVisibleChainPressureForRoom(state, room?.id) || 0);
  const unresolved = Number(room?.serviceState?.unresolvedIssues || 0);
  const hostility = Number(room?.serviceState?.hostility || 0);
  const irritation = Number(room?.serviceState?.irritation || 0);
  if (hostility >= 2 || risk === 'High' || chain >= 5 || unresolved >= 2) return 'volatile';
  if (irritation >= 2 || risk === 'Medium' || chain >= 2 || unresolved >= 1) return 'tense';
  return 'steady';
}

function normalizeRoomServiceState(targetState = state) {
  if (!targetState || typeof targetState !== 'object') return targetState;
  const crisis = targetState?.crisisNight || {};
  const blackout = getBlackoutPressureState(targetState);
  targetState.rooms = (Array.isArray(targetState.rooms) ? targetState.rooms : []).map((room) => {
    const serviceState = getDefaultRoomServiceState(room?.serviceState);
    const occupied = Boolean(room?.occupiedBy);
    const nextService = occupied
      ? {
        ...withAdjustedServiceState(serviceState),
        mood: buildRoomServiceMood({ ...room, serviceState }),
        urgency:
          blackout.urgencyBonus > 0 && serviceState.pendingRequest && serviceState.urgency !== 'high'
            ? 'high'
            : serviceState.urgency
      }
      : {
        ...withAdjustedServiceState(getDefaultRoomServiceState()),
        mood: crisis.kind === 'hostile-social-night' ? 'touchy' : 'steady'
      };
    return {
      ...room,
      serviceState: nextService
    };
  });
  return targetState;
}

function updateRoomById(roomId, updater) {
  let nextRoom = null;
  state.rooms = (state.rooms || []).map((room) => {
    if (Number(room?.id) !== Number(roomId)) return room;
    nextRoom = typeof updater === 'function' ? updater(room) : room;
    return nextRoom;
  });
  return nextRoom;
}

function buildRoomCallFor(room, targetState = state) {
  const crisis = targetState?.crisisNight || {};
  const archetype = String(room?.occupantArchetypeLabel || '').toLowerCase();
  const chain = Number(getVisibleChainPressureForRoom(targetState, room?.id) || 0);
  const memoryPressure = getRoomMemoryPressureBonus(room);
  const serviceState = getDefaultRoomServiceState(room?.serviceState);
  const templates = [
    {
      id: 'door-visitor',
      title: 'Someone At The Door',
      detail: `${room.occupiedBy} says somebody keeps stopping outside the door and not identifying themselves.`,
      urgency: chain >= 4 ? 'high' : 'medium',
      preferred: ['security', 'hallway', 'desk'],
      serviceTag: 'suspicion',
      zoneHint: 3
    },
    {
      id: 'noise-complaint',
      title: 'Noise Complaint',
      detail: `${room.occupiedBy} is calling about hallway noise and repeated wall-thumps near the room.`,
      urgency: crisis.kind === 'guest-surge' ? 'high' : 'medium',
      preferred: ['security', 'runner', 'hallway'],
      serviceTag: 'disturbance',
      zoneHint: 3
    },
    {
      id: 'lock-issue',
      title: 'Lock Issue',
      detail: `${room.occupiedBy} says the lock feels wrong and wants somebody to verify the door before they settle.`,
      urgency: 'medium',
      preferred: ['maintenance', 'hallway', 'desk'],
      serviceTag: 'maintenance',
      zoneHint: 3
    },
    {
      id: 'water-power',
      title: 'Water / Power Issue',
      detail: `${room.occupiedBy} reports bad water pressure or flickering power inside the room.`,
      urgency: crisis.blackoutRisk ? 'high' : 'medium',
      preferred: ['maintenance', 'runner', 'desk'],
      serviceTag: 'utility',
      zoneHint: 4
    },
    {
      id: 'refund-change',
      title: 'Refund Or Room Change',
      detail: `${room.occupiedBy} is demanding a refund or a move because the room feels wrong to them.`,
      urgency: 'medium',
      preferred: ['desk', 'runner', 'reassign'],
      serviceTag: 'complaint',
      zoneHint: 1
    },
    {
      id: 'watching-me',
      title: 'Thinks Someone Is Watching',
      detail: `${room.occupiedBy} sounds frightened and insists someone is watching from the hallway or lot.`,
      urgency: crisis.kind === 'hostile-social-night' || memoryPressure >= 2 ? 'high' : 'medium',
      preferred: ['hallway', 'security', 'reassign'],
      serviceTag: 'paranoia',
      zoneHint: 2
    },
    {
      id: 'rear-exit-rattle',
      title: 'Rear Exit Rattle',
      detail: `${room.occupiedBy} swears someone tested the rear access and then moved off before they could get a full look.`,
      urgency: crisis.active || memoryPressure >= 2 ? 'high' : 'medium',
      preferred: ['hallway', 'security', 'runner'],
      serviceTag: 'escape',
      zoneHint: 6
    },
    {
      id: 'dead-line-call',
      title: 'Red Phone Cuts Out',
      detail: `${room.occupiedBy} starts describing movement and then the line fills with static before the call can finish cleanly.`,
      urgency: crisis.blackoutRisk || crisis.active ? 'high' : 'medium',
      preferred: ['desk', 'hallway', 'runner'],
      serviceTag: 'emergency',
      zoneHint: crisis.blackoutRisk ? 4 : 3
    }
  ];
  let pool = templates.slice();
  if (archetype.includes('contractor') || archetype.includes('professional')) {
    pool = pool.filter((entry) => entry.id !== 'refund-change');
  }
  if (archetype.includes('quiet') && Math.random() < 0.4) {
    pool = pool.filter((entry) => entry.id !== 'noise-complaint');
  }
  const chosen = pool[(Number(room?.id || 1) + Number(targetState?.shiftElapsedMinutes || 0) + Number(targetState?.night || 1)) % pool.length];
  const falseAlarmBias =
    (chosen.serviceTag === 'paranoia' ? 0.34 : 0)
    + (chosen.serviceTag === 'complaint' ? 0.18 : 0)
    + Math.max(0, Number(serviceState.anxiety || 0) - 1) * 0.08;
  const threatBias =
    (chosen.serviceTag === 'suspicion' ? 0.2 : 0)
    + (chain >= 4 ? 0.12 : 0)
    + (memoryPressure >= 2 ? 0.08 : 0)
    + (crisis.active ? 0.06 : 0)
    + (String(room?.riskLevel || 'Low') === 'High' ? 0.1 : 0);
  let truthState = 'unclear';
  const truthRoll = Math.random();
  if (truthRoll < Math.max(0.16, falseAlarmBias)) {
    truthState = 'false-alarm';
  } else if (truthRoll > Math.max(0.46, 0.72 - threatBias)) {
    truthState = 'real-threat';
  }
  return {
    id: `${chosen.id}-${room.id}-${targetState.night}-${targetState.shiftElapsedMinutes}`,
    kind: chosen.id,
    title: chosen.title,
    detail: chosen.detail,
    urgency: chosen.urgency,
    preferred: chosen.preferred,
    serviceTag: chosen.serviceTag,
    zoneHint: Number(chosen.zoneHint || 3),
    routeLine:
      Number(chosen.zoneHint || 3) === 6 ? 'Pressure route: room → rear exit → outside lane.' :
      Number(chosen.zoneHint || 3) === 4 ? 'Pressure route: room → utility lane / breaker.' :
      Number(chosen.zoneHint || 3) === 2 ? 'Pressure route: room → hallway sightline → parking lot.' :
      Number(chosen.zoneHint || 3) === 1 ? 'Pressure route: room → lobby spill / refund heat.' :
      'Pressure route: room → hallway spread.',
    verified: false,
    truthState,
    threatDrift: truthState === 'unclear' && (chosen.serviceTag === 'suspicion' || chosen.serviceTag === 'paranoia')
  };
}

function applyRoomServiceSpillover(room, request, severity = 1, reason = 'room-call') {
  if (!room?.occupiedBy || !request) return false;
  const zoneId = Number(request?.zoneHint || 3);
  const def = getSharedSpaceDef(zoneId);
  const zoneState = def ? getLocationZoneState(state, zoneId, def.zoneName) : null;
  if (!def || !zoneState) return false;
  zoneState.issueStage = Math.min(3, Math.max(1, Number(zoneState.issueStage || 0) + Math.max(1, severity - 1)));
  zoneState.followupPressure = Math.min(8, Math.max(0, Number(zoneState.followupPressure || 0) + Math.max(1, severity)));
  zoneState.unresolvedCount = Math.min(6, Math.max(0, Number(zoneState.unresolvedCount || 0) + 1));
  zoneState.pendingIssue =
    request?.serviceTag === 'utility' || zoneId === 4
      ? 'Occupied-room utility strain'
      : request?.serviceTag === 'escape' || zoneId === 6
        ? 'Rear-access pressure from occupied room'
        : request?.serviceTag === 'complaint' || zoneId === 1
          ? 'Lobby spill from room complaint'
          : request?.serviceTag === 'paranoia' || zoneId === 2
            ? 'Parking-lot / sightline pressure'
            : 'Hallway spill from occupied room';
  zoneState.stabilityStatus = zoneState.followupPressure >= 5 ? 'escalating' : 'under-watch';
  zoneState.lastStatusNote = `${room.label} is now pushing pressure into ${def.label.toLowerCase()} (${reason}).`;
  ensureSharedSpaceEvent(zoneId);
  if (severity >= 2) {
    registerSharedSpaceIncident(zoneId, {
      type: `Room Call Spill: ${request.title}`,
      severity: zoneState.followupPressure >= 5 ? 'high' : 'medium',
      logLine: `${room.label}: ${request.title} is no longer contained to the room and is starting to stress ${def.label.toLowerCase()}.`,
      alertLine: `${def.label} is taking spillover from ${room.label}.`,
      roomTargetId: room.id
    });
  }
  return true;
}

function maybeGenerateOccupiedRoomRequest(source = 'tick') {
  const occupied = (state.rooms || []).filter((room) => room?.occupiedBy);
  if (!occupied.length) return false;
  const candidates = occupied.filter((room) => {
    const service = getDefaultRoomServiceState(room?.serviceState);
    return !service.pendingRequest && service.requestCooldown <= 0;
  });
  if (!candidates.length) return false;
  const crisis = state?.crisisNight || {};
  const blackout = getBlackoutPressureState(state);
  const night = Math.max(1, Number(state?.night || 1));
  const averageAnxiety = candidates.reduce((sum, room) => sum + Number(room?.serviceState?.anxiety || 0), 0) / Math.max(1, candidates.length);
  const overlapBoost = Math.max(0, Number(state?.crisisEscalation?.overlapPressureLevel || 0)) * 0.03;
  const earlyNightDampener = night <= 2 && Number(state?.shiftElapsedMinutes || 0) < 120 ? 0.03 : 0;
  const baseChance = Math.max(
    0.04,
    (crisis.active ? 0.18 : 0.09) + Math.min(0.08, averageAnxiety * 0.02) + overlapBoost + (blackout.active ? 0.05 : 0) - earlyNightDampener
  );
  const roll = Math.random();
  if (roll > baseChance) return false;
  const target = candidates.sort((a, b) => {
    const aPressure =
      Number(getVisibleChainPressureForRoom(state, a.id) || 0)
      + getRoomMemoryPressureBonus(a)
      + Number(a?.serviceState?.anxiety || 0)
      + Number(a?.serviceState?.hostility || 0);
    const bPressure =
      Number(getVisibleChainPressureForRoom(state, b.id) || 0)
      + getRoomMemoryPressureBonus(b)
      + Number(b?.serviceState?.anxiety || 0)
      + Number(b?.serviceState?.hostility || 0);
    return bPressure - aPressure;
  })[0];
  if (!target) return false;
  const request = buildRoomCallFor(target, state);
  maybeAdvanceSignatureNightFlow('room-call', { requestTag: request?.serviceTag, roomId: target.id });
  updateRoomById(target.id, (room) => {
    const serviceState = getDefaultRoomServiceState(room?.serviceState);
    return {
      ...room,
      serviceState: {
        ...serviceState,
        pendingRequest: request,
        urgency: blackout.urgencyBonus > 0 && request.urgency !== 'high' ? 'high' : request.urgency,
        requestCount: serviceState.requestCount + 1,
        responseStatus: `Desk call active: ${request.title}`,
        hallwayChecked: false,
        lastCheckLine: ''
      }
    };
  });
  state.logs.push(`Red phone: ${target.label} called the desk. ${request.detail}`);
  audioController.playRedPhone();
  if (request?.serviceTag === 'suspicion' || request?.serviceTag === 'disturbance') {
    audioController.playKnock();
  } else if (request?.serviceTag === 'utility' || request?.serviceTag === 'emergency') {
    audioController.playBreakerSnap();
  } else if (request?.serviceTag === 'paranoia' || request?.serviceTag === 'escape') {
    audioController.playFootsteps();
  }
  if (request?.urgency === 'high' || request?.serviceTag === 'utility' || request?.serviceTag === 'escape') {
    applyRoomServiceSpillover(target, request, request?.urgency === 'high' ? 2 : 1, 'request-open');
  }
  pushLiveAlert(state, {
    type: request.urgency === 'high' ? 'warning' : 'info',
    kind: 'actionable',
    message: `${target.label}: ${request.title}`,
    dedupeKey: `room-call-${target.id}-${request.kind}-${state.night}-${source}`
  });
  state.shiftStats.roomCallsTriggered = (state.shiftStats.roomCallsTriggered || 0) + 1;
  return true;
}

function getServiceActionSpec(room, actionType) {
  const service = getDefaultRoomServiceState(room?.serviceState);
  const request = service.pendingRequest;
  const blackout = getBlackoutPressureState(state);
  const activePlan = String(state?.dayShift?.activeNightPlan || state?.dayShift?.selectedPlan || 'balanced');
  const staffProfile = getNightStaffProfile(state);
  const act = actionType === 'maintenance-shaft' ? 'maintenance' : actionType;
  const preferred = Array.isArray(request?.preferred) ? request.preferred : [];
  const preferredMatch = preferred.includes(act);
  const urgency = String(request?.urgency || 'low');
  const mood = service.mood || 'steady';
  const truthState = String(request?.truthState || 'unclear');
  let successChance = 0.72;
  if (act === 'desk') successChance -= 0.1;
  if (act === 'security') successChance += (request?.serviceTag === 'suspicion' || request?.serviceTag === 'disturbance') ? 0.12 : -0.04;
  if (act === 'maintenance') successChance += (request?.serviceTag === 'utility' || request?.serviceTag === 'maintenance') ? 0.14 : -0.05;
  if (act === 'runner') successChance += (request?.serviceTag === 'complaint') ? 0.1 : 0;
  if (preferredMatch) successChance += 0.08;
  if (urgency === 'high') successChance -= 0.08;
  if (mood === 'volatile') successChance -= 0.08;
  if (service.hallwayChecked) successChance += 0.06;
  if (service.irritation >= 2) successChance -= 0.05;
  if (service.hostility >= 2) successChance -= 0.08;
  if (truthState === 'false-alarm' && act === 'desk') successChance += 0.12;
  if (truthState === 'false-alarm' && act === 'security') successChance -= 0.16;
  if (truthState === 'real-threat' && act === 'desk') successChance -= 0.1;
  if (truthState === 'real-threat' && act === 'security') successChance += 0.08;
  successChance += Number(state?.progressionModifiers?.serviceResponseClarity || 0);
  if (act === 'security') successChance += staffProfile.hasSecurity ? 0.08 : -0.08;
  if (act === 'maintenance') successChance += staffProfile.hasMaintenance ? 0.1 : -0.1;
  if (act === 'runner') successChance += staffProfile.hasRunner ? 0.08 : -0.06;
  if (act === 'desk') successChance += staffProfile.hasDeskAssistant ? 0.06 : -0.05;
  successChance += (Number(staffProfile.rosterStrength || 0.5) - 0.5) * 0.22;
  if (staffProfile.focus === 'security-heavy' && act === 'security') successChance += 0.06;
  if (staffProfile.focus === 'service-heavy' && (act === 'runner' || act === 'desk')) successChance += 0.06;
  if (staffProfile.focus === 'cost-saving' && act !== 'desk') successChance -= 0.04;
  if (activePlan === 'service-calm' && (act === 'desk' || act === 'runner')) successChance += 0.05;
  successChance -= Number(blackout.servicePenalty || 0);
  successChance = Math.max(0.18, Math.min(0.9, successChance));
  const spec = {
    successChance,
    partialChance: Math.max(0.1, Math.min(0.35, 0.18 + (service.hallwayChecked ? 0.04 : 0) + (truthState === 'unclear' ? 0.06 : 0))),
    overreactionRisk:
      act === 'security' && truthState === 'false-alarm'
        ? 0.42
        : act === 'maintenance' && truthState === 'false-alarm'
          ? 0.2
          : act === 'runner' && truthState === 'real-threat'
            ? 0.08
            : Math.max(0, 0.14 - Number(staffProfile.rosterStrength || 0.5) * 0.12),
    moneyCost:
      act === 'security' ? 5
      : act === 'maintenance' ? 4
      : act === 'runner' ? 3
      : act === 'desk' ? 0
      : 0,
    powerCost:
      act === 'maintenance' ? 2
      : act === 'security' ? 1
      : 0,
    timeAction: act === 'desk' ? 'review' : 'dispatch'
  };
  if (actionType === 'maintenance-shaft') {
    return {
      ...spec,
      moneyCost: spec.moneyCost + 2,
      successChance: Math.min(0.9, spec.successChance + 0.08),
      overreactionRisk: Math.min(0.52, spec.overreactionRisk + 0.06)
    };
  }
  return spec;
}

function resolveRoomServiceAction(roomId, actionType) {
  onMeaningfulAction();
  audioController.playUiClick();
  const room = (state.rooms || []).find((entry) => Number(entry?.id) === Number(roomId));
  if (!room?.occupiedBy) return;
  const service = getDefaultRoomServiceState(room?.serviceState);
  const request = service.pendingRequest;
  if (!request) {
    if (actionType === 'hallway') {
      const repeated = Number(service.overmanagedCount || 0) >= 1 || Boolean(service.hallwayChecked);
      if (Number(getVisibleChainPressureForRoom(state, room.id) || 0) <= 1 && Number(service.unresolvedIssues || 0) === 0 && repeated) {
        registerOvermanagementPenalty(room.id, {
          reason: 'repeat quiet check',
          logLine: 'Repeated quiet checks made the guest feel watched rather than protected.',
          falloutSeverity: 1
        });
      } else {
        updateRoomById(room.id, (currentRoom) => {
          const nextService = withAdjustedServiceState(currentRoom?.serviceState, {
            trust: Number(service.anxiety || 0) > 0 ? 1 : 0,
            anxiety: Number(service.anxiety || 0) > 0 ? -1 : 0
          });
          return {
            ...currentRoom,
            serviceState: {
              ...nextService,
              hallwayChecked: true,
              responseStatus: 'Quiet check logged',
              lastCheckLine: Number(service.anxiety || 0) > 0
                ? 'Quiet check settled the room without making a scene.'
                : 'Quiet check found nothing immediate and the room likely needed space.',
              serviceHistory: ['Quiet check', ...nextService.serviceHistory].slice(0, 4)
            }
          };
        });
        state.logs.push(`${room.label}: quiet check finished with no obvious threat. Restraint mattered more than force here.`);
      }
      if (checkFailureState()) return;
      if (progressShift('review', { timeScale: 0.4, passiveDrainScale: 0.35 })) return;
      renderAll();
      return;
    }
    if (actionType === 'desk') {
      updateRoomById(room.id, (currentRoom) => {
        const nextService = withAdjustedServiceState(currentRoom?.serviceState, {
          trust: 1,
          anxiety: -1
        });
        return {
          ...currentRoom,
          serviceState: {
            ...nextService,
            handledFromDesk: Number(nextService.handledFromDesk || 0) + 1,
            responseStatus: 'Courtesy call logged',
            serviceHistory: ['Courtesy call', ...nextService.serviceHistory].slice(0, 4),
            lastCheckLine: 'The desk checked in without escalating the room.'
          }
        };
      });
      state.logs.push(`${room.label}: courtesy call landed cleanly and did not provoke new tension.`);
      state.shiftStats.smartRestraintMoments = (state.shiftStats.smartRestraintMoments || 0) + 1;
      if (checkFailureState()) return;
      if (progressShift('review', { timeScale: 0.35, passiveDrainScale: 0.3 })) return;
      renderAll();
      return;
    }
    if (actionType === 'security') {
      if (Number(getVisibleChainPressureForRoom(state, room.id) || 0) <= 2 && Number(service.unresolvedIssues || 0) === 0) {
        registerOvermanagementPenalty(room.id, {
          reason: 'quiet-room security',
          logLine: 'Security presence on a calm room felt invasive and started gossip.',
          hostility: 1,
          rumorPressure: 2,
          reputationLoss: 2,
          falloutSeverity: 2
        });
      } else {
        updateRoomById(room.id, (currentRoom) => {
          const nextService = withAdjustedServiceState(currentRoom?.serviceState, { anxiety: -1 });
          return {
            ...currentRoom,
            deskFlagged: true,
            serviceState: {
              ...nextService,
              responseStatus: 'Marked for watch',
              serviceHistory: ['Marked for watch', ...nextService.serviceHistory].slice(0, 4)
            }
          };
        });
        state.logs.push(`${room.label}: marked for watch without a live call. Cautious, but visible to the guest.`);
      }
      if (checkFailureState()) return;
      if (progressShift('dispatch', { timeScale: 0.55, passiveDrainScale: 0.55 })) return;
      renderAll();
      return;
    }
    if (actionType === 'ignore') {
      updateRoomById(room.id, (currentRoom) => {
        const nextService = withAdjustedServiceState(currentRoom?.serviceState, { trust: 1, anxiety: -1 });
        return {
          ...currentRoom,
          serviceState: {
            ...nextService,
            responseStatus: 'Left alone deliberately',
            serviceHistory: ['Left alone', ...nextService.serviceHistory].slice(0, 4)
          }
        };
      });
      state.logs.push(`${room.label}: desk chose restraint and left a quiet room alone.`);
      state.shiftStats.smartRestraintMoments = (state.shiftStats.smartRestraintMoments || 0) + 1;
      if (checkFailureState()) return;
      if (progressShift('review', { timeScale: 0.2, passiveDrainScale: 0.2 })) return;
      renderAll();
      return;
    }
    pushLiveAlert(state, {
      type: 'info',
      message: `${room.label} has no active room call right now.`,
      dedupeKey: `service-no-request-${room.id}`
    });
    renderAll();
    return;
  }
  if (actionType === 'ignore') {
    const ignoredTrueThreat = request.truthState === 'real-threat' || request.threatDrift;
    updateRoomById(roomId, (currentRoom) => {
      const currentService = getDefaultRoomServiceState(currentRoom?.serviceState);
      return {
        ...currentRoom,
        condition: ignoredTrueThreat || currentRoom.condition !== 'Stable' ? 'Critical' : 'Watch',
        serviceState: {
          ...withAdjustedServiceState(currentService, {
            trust: -1,
            irritation: 1,
            anxiety: ignoredTrueThreat ? 1 : 0,
            hostility: ignoredTrueThreat ? 1 : 0
          }),
          unresolvedIssues: currentService.unresolvedIssues + 1,
          responseStatus: 'Desk delayed response',
          serviceHistory: [`Ignored: ${request.title}`, ...currentService.serviceHistory].slice(0, 4),
          requestCooldown: 1,
          mood: 'volatile',
          pendingRequest: {
            ...currentService.pendingRequest,
            truthState: ignoredTrueThreat ? 'real-threat' : currentService.pendingRequest?.truthState
          }
        }
      };
    });
    registerRoomChainSignal({
      roomId,
      guestName: room.occupiedBy,
      type: `room-call-ignored-${request.kind}`,
      severity: ignoredTrueThreat || request.urgency === 'high' ? 2 : 1
    });
    state.reputation = clampReputation(state.reputation - (ignoredTrueThreat || request.urgency === 'high' ? 2 : 1));
    state.logs.push(
      ignoredTrueThreat
        ? `${room.label} was told to wait on ${request.title}, but the threat was real enough to get worse in the delay.`
        : `${room.label} was told to wait on ${request.title}. The call cooled nothing and room pressure worsened.`
    );
    applyRoomServiceSpillover(room, request, ignoredTrueThreat || request.urgency === 'high' ? 2 : 1, 'ignored');
    if (checkFailureState()) return;
    if (progressShift('dispatch', { timeScale: 0.55, passiveDrainScale: 0.6 })) return;
    renderAll();
    return;
  }
  if (actionType === 'hallway') {
    updateRoomById(roomId, (currentRoom) => {
      const currentService = getDefaultRoomServiceState(currentRoom?.serviceState);
      const line =
        request.truthState === 'false-alarm'
          ? 'Hallway check suggests nerves or misunderstanding more than a real threat.'
          : request.truthState === 'real-threat'
            ? 'Hallway check found enough evidence to treat the room call as real.'
            : request.kind === 'door-visitor'
              ? 'Hallway check found movement near the door, but no clean identification.'
              : request.kind === 'watching-me'
                ? 'Hallway check caught a bad angle and enough unease to justify caution.'
                : request.kind === 'noise-complaint'
                  ? 'Hallway check confirmed there is real noise bleed around the room.'
                  : 'Hallway check narrowed the problem before staff committed.';
      return {
        ...currentRoom,
        serviceState: {
          ...currentService,
          hallwayChecked: true,
          pendingRequest: {
            ...currentService.pendingRequest,
            verified: true
          },
          lastCheckLine: line,
          responseStatus: 'Hallway check complete',
          serviceHistory: [`Hallway check: ${request.title}`, ...currentService.serviceHistory].slice(0, 4)
        }
      };
    });
    state.logs.push(
      `${room.label}: hallway check complete. ${
        request.truthState === 'false-alarm'
          ? 'This looks closer to anxiety or misunderstanding than a true threat.'
          : request.truthState === 'real-threat'
            ? 'This looks real enough that a soft response may backfire.'
            : 'The desk has clearer context before acting.'
      }`
    );
    if (checkFailureState()) return;
    if (progressShift('review', { timeScale: 0.65, passiveDrainScale: 0.5 })) return;
    renderAll();
    return;
  }

  const spec = getServiceActionSpec(room, actionType);
  const svcLogType = actionType === 'maintenance-shaft' ? 'shaft maintenance' : actionType;
  const staffRoleTag =
    actionType === 'desk'
      ? 'Desk Assistant'
      : actionType === 'maintenance-shaft'
        ? 'Maintenance'
        : `${actionType.charAt(0).toUpperCase()}${actionType.slice(1)}`;
  if (state.money < spec.moneyCost) {
    pushLiveAlert(state, {
      type: 'warning',
      message: `Not enough money to send ${svcLogType}.`,
      dedupeKey: `service-funds-${room.id}-${actionType}`
    });
    renderAll();
    return;
  }
  state.money = Math.max(0, state.money - spec.moneyCost);
  if (spec.moneyCost > 0) {
    addBudgetCost(
      actionType === 'maintenance' || actionType === 'maintenance-shaft' ? 'repairs' : actionType === 'desk' ? 'refunds' : 'emergencies',
      spec.moneyCost,
      `${room.label}: ${svcLogType} response cost ${formatMoney(spec.moneyCost)}.`
    );
  }
  state.power = clampPower(state.power - spec.powerCost);
  if (spec.powerCost > 0) {
    addBudgetCost('utilities', spec.powerCost, `${room.label}: response load burned extra utility margin.`);
  }
  const roll = Math.random();
  const overreaction = roll < Number(spec.overreactionRisk || 0);
  const success = !overreaction && roll <= spec.successChance;
  const partial = !overreaction && !success && roll <= spec.successChance + spec.partialChance;
  const truthState = String(request.truthState || 'unclear');
  updateRoomById(roomId, (currentRoom) => {
    const currentService = getDefaultRoomServiceState(currentRoom?.serviceState);
    const nextCondition = success
      ? (currentRoom.condition === 'Critical' ? 'Watch' : 'Stable')
      : partial
        ? (currentRoom.condition === 'Stable' ? 'Watch' : currentRoom.condition)
        : (currentRoom.condition === 'Stable' ? 'Watch' : 'Critical');
    const nextUnresolved = success
      ? Math.max(0, currentService.unresolvedIssues - 1)
      : partial
        ? currentService.unresolvedIssues
        : currentService.unresolvedIssues + 1;
    const pendingRequest = success
      ? null
      : partial && truthState === 'false-alarm'
        ? null
        : currentService.pendingRequest;
    const adjustedService = withAdjustedServiceState(currentService, success
      ? {
          trust: truthState === 'false-alarm' && actionType === 'desk' ? 1 : 0,
          anxiety: -1,
          irritation: actionType === 'security' && truthState === 'false-alarm' ? 1 : 0
        }
      : partial
        ? {
            trust: truthState === 'false-alarm' ? -1 : 0,
            irritation: 1,
            anxiety: truthState === 'real-threat' ? 0 : -1
          }
        : {
            trust: -1,
            irritation: 1,
            hostility: truthState === 'real-threat' ? 1 : 0,
            anxiety: truthState === 'false-alarm' ? 1 : 0
          });
    return {
      ...currentRoom,
      condition: nextCondition,
      serviceState: {
        ...adjustedService,
        pendingRequest,
        urgency: success || (partial && truthState === 'false-alarm') ? 'low' : currentService.urgency,
        unresolvedIssues: nextUnresolved,
        requestCooldown: success ? 2 : partial ? 1 : 1,
        responseStatus: success
          ? `${svcLogType} resolved ${request.title}`
          : partial
            ? `${svcLogType} only partly settled ${request.title}`
            : `${svcLogType} failed to settle ${request.title}`,
        serviceHistory: [`${success ? 'Resolved' : partial ? 'Partial' : 'Missed'} via ${svcLogType}: ${request.title}`, ...currentService.serviceHistory].slice(0, 4),
        mood: success ? 'steady' : partial ? 'tense' : 'volatile',
        handledFromDesk: currentService.handledFromDesk + (actionType === 'desk' ? 1 : 0),
        hallwayChecked: false
      }
    };
  });
  if (overreaction) {
    noteStaffOutcome(staffRoleTag, `Overreacted at ${room.label}.`, {
      fatigue: 0.08,
      morale: -0.04
    });
    registerOvermanagementPenalty(roomId, {
      reason: `${svcLogType}-false-alarm`,
      logLine: `${svcLogType} hit ${room.label} too hard for what turned out to be more false alarm than threat.`,
      hostility: actionType === 'security' ? 1 : 0,
      rumorPressure: 2,
      reputationLoss: actionType === 'security' ? 2 : 1,
      falloutSeverity: 2
    });
    updateRoomById(roomId, (currentRoom) => {
      const currentService = getDefaultRoomServiceState(currentRoom?.serviceState);
      return {
        ...currentRoom,
        serviceState: {
          ...currentService,
          pendingRequest: null,
          responseStatus: `${svcLogType} overreacted to ${request.title}`,
          serviceHistory: [`Overreacted via ${svcLogType}: ${request.title}`, ...currentService.serviceHistory].slice(0, 4),
          requestCooldown: 2
        }
      };
    });
    state.logs.push(`${room.label}: ${request.title} was closer to a false alarm, and ${svcLogType} turned it into a social problem instead of a safety solution.`);
  } else if (success) {
    noteStaffOutcome(staffRoleTag, `Clean resolution in ${room.label}.`, {
      fatigue: 0.06,
      morale: 0.03
    });
    calmRoomChain(roomId, actionType === 'security' ? 3 : 2);
    state.reputation = clampReputation(state.reputation + 1);
    state.logs.push(
      `${room.label}: ${svcLogType} handled ${request.title} cleanly. ${
        truthState === 'false-alarm'
          ? 'The desk read the false alarm correctly and avoided making it worse.'
          : truthState === 'real-threat'
            ? 'The threat was real, and the response matched it in time.'
            : 'Occupied-room pressure eased instead of carrying forward.'
      }`
    );
    state.shiftStats.roomCallsResolved = (state.shiftStats.roomCallsResolved || 0) + 1;
    if (truthState === 'false-alarm') {
      state.shiftStats.falseAlarmReads = (state.shiftStats.falseAlarmReads || 0) + 1;
    }
    markRoomMemory(roomId, {
      note: `${request.title} was handled cleanly here during the night.`
    });
  } else if (partial) {
    noteStaffOutcome(staffRoleTag, `Partial response in ${room.label}.`, {
      fatigue: 0.07,
      morale: -0.01
    });
    state.logs.push(
      `${room.label}: ${svcLogType} only partly settled ${request.title}. ${
        truthState === 'real-threat'
          ? 'The response was not wrong, just incomplete.'
          : 'The guest calmed down somewhat, but the handling still left friction behind.'
      }`
    );
    state.shiftStats.partialServiceOutcomes = (state.shiftStats.partialServiceOutcomes || 0) + 1;
    if (truthState === 'real-threat') {
      registerRoomChainSignal({
        roomId,
        guestName: room.occupiedBy,
        type: `service-partial-${svcLogType.replace(/\s+/g, '-')}-${request.kind}`,
        severity: 1
      });
      applyRoomServiceSpillover(room, request, 1, 'partial');
    }
  } else {
    noteStaffOutcome(staffRoleTag, `Failed response in ${room.label}.`, {
      fatigue: 0.09,
      morale: -0.05
    });
    registerRoomChainSignal({
      roomId,
      guestName: room.occupiedBy,
      type: `service-fail-${svcLogType.replace(/\s+/g, '-')}-${request.kind}`,
      severity: request.urgency === 'high' || truthState === 'real-threat' ? 2 : 1
    });
    state.reputation = clampReputation(state.reputation - 1);
    state.logs.push(
      `${room.label}: ${svcLogType} failed to calm ${request.title}. ${
        truthState === 'real-threat'
          ? 'The threat was real and the weak fit made it spread.'
          : truthState === 'false-alarm'
            ? 'The handling itself became the problem.'
            : 'The room is now carrying fresh escalation risk.'
      }`
    );
    state.shiftStats.roomCallsMissed = (state.shiftStats.roomCallsMissed || 0) + 1;
    if (truthState === 'real-threat') {
      state.shiftStats.realThreatsMissed = (state.shiftStats.realThreatsMissed || 0) + 1;
    }
    if (request.urgency === 'high') {
      queueDeferredShiftCost({
        turnsRemaining: 2,
        reputationDelta: -1,
        logLine: `${room.label} remembered the bad service response and the complaint came back harder later.`
      });
    }
    if (truthState === 'false-alarm') {
      registerSocialFallout(roomId, {
        severity: 1,
        reason: 'bad-read',
        label: 'Guests heard the desk mishandled a minor situation.'
      });
    }
    applyRoomServiceSpillover(room, request, request.urgency === 'high' || truthState === 'real-threat' ? 2 : 1, 'failed');
  }
  if ((spec.moneyCost >= 4 || spec.powerCost >= 2) && (state.money <= 24 || state.power <= 28)) {
    registerPanicSpend();
  }
  if (checkFailureState()) return;
  if (actionType === 'maintenance-shaft') {
    const shaftOk = !overreaction && (success || partial);
    noteShaftDispatchOutcome(state, shaftOk);
    if (shaftOk) {
      bumpRoadHeat(state, 0.06, 'Shaft crew stayed off the public corridor.');
    }
  }
  if (progressShift(spec.timeAction, {
    timeScale: actionType === 'desk' ? 0.9 : 1,
    passiveDrainScale: actionType === 'maintenance' || actionType === 'maintenance-shaft' ? 1.12 : 1
  })) return;
  renderAll();
}

function getBestVacantReassignmentRoom(fromRoomId) {
  const candidates = (state.rooms || [])
    .filter((room) => Number(room?.id) !== Number(fromRoomId) && room?.unlocked !== false && !room?.occupied && room?.occupiedBy == null)
    .map((room) => ({
      room,
      score: 20 - Number(getVisibleChainPressureForRoom(state, room.id) || 0) - getRoomMemoryPressureBonus(room)
    }))
    .sort((a, b) => b.score - a.score);
  return candidates[0]?.room || null;
}

function reassignRoomGuest(roomId) {
  onMeaningfulAction();
  audioController.playUiClick();
  const fromRoom = (state.rooms || []).find((room) => Number(room?.id) === Number(roomId));
  if (!fromRoom?.occupiedBy) return;
  const targetRoom = getBestVacantReassignmentRoom(roomId);
  if (!targetRoom) {
    pushLiveAlert(state, {
      type: 'warning',
      message: 'No vacant room is available for reassignment.',
      dedupeKey: `reassign-none-${roomId}`
    });
    renderAll();
    return;
  }
  const cost = 5;
  if (state.money < cost) {
    pushLiveAlert(state, {
      type: 'warning',
      message: 'Reassignment unavailable: insufficient cash to comp the move.',
      dedupeKey: `reassign-funds-${roomId}`
    });
    renderAll();
    return;
  }
  state.money = Math.max(0, state.money - cost);
  addBudgetCost('refunds', cost, `${fromRoom.label}: comped reassignment into ${targetRoom.label}.`);
  const carriedService = getDefaultRoomServiceState(fromRoom?.serviceState);
  const unnecessaryMove =
    !carriedService.pendingRequest &&
    Number(carriedService.unresolvedIssues || 0) === 0 &&
    Number(getVisibleChainPressureForRoom(state, fromRoom.id) || 0) <= 2;
  const movedRequest = carriedService.pendingRequest;
  updateRoomById(targetRoom.id, (room) => ({
    ...room,
    occupied: true,
    occupiedBy: fromRoom.occupiedBy,
    guestName: fromRoom.guestName,
    stayNightsRemaining: fromRoom.stayNightsRemaining,
    condition: fromRoom.condition === 'Critical' ? 'Watch' : fromRoom.condition,
    riskLevel: fromRoom.riskLevel,
    trait: fromRoom.trait,
    deskFlagged: fromRoom.deskFlagged,
    policyRecommendation: fromRoom.policyRecommendation,
    policyOverride: fromRoom.policyOverride,
    occupantArchetypeLabel: fromRoom.occupantArchetypeLabel,
    occupantHiddenIntent: fromRoom.occupantHiddenIntent,
    occupantChainBias: fromRoom.occupantChainBias,
    serviceState: {
      ...withAdjustedServiceState(getDefaultRoomServiceState(carriedService), unnecessaryMove
        ? { trust: -1, irritation: 1, rumorPressure: 1, overmanagedCount: 1 }
        : { anxiety: -1 }),
      pendingRequest: movedRequest && (movedRequest.kind === 'refund-change' || movedRequest.kind === 'watching-me' || movedRequest.kind === 'noise-complaint')
        ? null
        : movedRequest,
      unresolvedIssues: Math.max(0, carriedService.unresolvedIssues - 1),
      responseStatus: `Reassigned from ${fromRoom.label}`,
      serviceHistory: [`Moved from ${fromRoom.label} to ${targetRoom.label}`, ...carriedService.serviceHistory].slice(0, 4),
      requestCooldown: 2,
      mood: 'tense'
    }
  }));
  updateRoomById(fromRoom.id, (room) => ({
    ...checkoutVacatedRoom(room),
    serviceState: getDefaultRoomServiceState()
  }));
  calmRoomChain(targetRoom.id, 2);
  calmRoomChain(fromRoom.id, 2);
  markRoomMemory(targetRoom.id, {
    note: `${fromRoom.occupiedBy} was reassigned into this room during a live service issue.`
  });
  state.reputation = clampReputation(state.reputation - 1);
  state.logs.push(`${fromRoom.occupiedBy} was reassigned from ${fromRoom.label} to ${targetRoom.label}. The move bought space, but guests noticed the disruption.`);
  state.shiftStats.roomReassignments = (state.shiftStats.roomReassignments || 0) + 1;
  if (unnecessaryMove) {
    noteStaffOutcome('Runner', `Needless move upset ${fromRoom.label}.`, { fatigue: 0.06, morale: -0.03 });
    registerOvermanagementPenalty(targetRoom.id, {
      reason: 'needless reassignment',
      logLine: `${fromRoom.occupiedBy} did not need a move, and the reassignment itself started irritation and rumor spread.`,
      reputationLoss: 1,
      falloutSeverity: 1
    });
  } else {
    noteStaffOutcome('Runner', `Reassigned ${fromRoom.label} into ${targetRoom.label}.`, { fatigue: 0.08, morale: 0.02 });
  }
  if (checkFailureState()) return;
  if (progressShift('dispatch', { timeScale: 1.05, passiveDrainScale: 1 })) return;
  renderAll();
}

function ensureCrisisEscalationState(targetState = state) {
  if (!targetState || typeof targetState !== 'object') return targetState;
  const crisis = targetState?.crisisNight || {};
  const existing = targetState.crisisEscalation && typeof targetState.crisisEscalation === 'object'
    ? targetState.crisisEscalation
    : {};
  if (Number(existing.night || 0) === Math.max(1, Number(targetState?.night || 1))) {
    targetState.crisisEscalation = {
      night: Math.max(1, Number(targetState?.night || 1)),
      blackoutTriggered: Boolean(existing.blackoutTriggered),
      blackoutLevel: existing?.blackoutLevel || 'none',
      hallwayThreatLevel: Math.max(0, Number(existing?.hallwayThreatLevel || 0)),
      cameraInterferenceLevel: Math.max(0, Number(existing?.cameraInterferenceLevel || 0)),
      overlapPressureLevel: Math.max(0, Number(existing?.overlapPressureLevel || 0)),
      signatureIdsSeen: Array.isArray(existing.signatureIdsSeen) ? existing.signatureIdsSeen : [],
      panicMoments: Math.max(0, Number(existing.panicMoments || 0)),
      crisisKind: crisis.kind || null
    };
    return targetState;
  }
  targetState.crisisEscalation = {
    night: Math.max(1, Number(targetState?.night || 1)),
    blackoutTriggered: false,
    blackoutLevel: 'none',
    hallwayThreatLevel: 0,
    cameraInterferenceLevel: 0,
    overlapPressureLevel: 0,
    signatureIdsSeen: [],
    panicMoments: 0,
    crisisKind: crisis.kind || null
  };
  return targetState;
}

function getBlackoutPressureState(targetState = state) {
  const crisis = targetState?.crisisNight || {};
  const escalation = targetState?.crisisEscalation || {};
  const power = Number(targetState?.power || 100);
  const visibilityBonus = Math.max(0, Number(targetState?.progressionModifiers?.blackoutVisibilityBonus || 0));
  if (escalation.blackoutLevel === 'full') {
    return {
      active: true,
      level: 'full',
      powerDropScale: 1.35,
      cameraInterference: 3,
      servicePenalty: 0.12,
      urgencyBonus: 1,
      hallwayThreatBonus: 2,
      flashlightMode: visibilityBonus <= 0,
      visibilityBand: visibilityBonus > 0 ? 'emergency-lanterns' : 'flashlight'
    };
  }
  if (escalation.blackoutLevel === 'partial' || (crisis.blackoutRisk && power <= 32)) {
    return {
      active: true,
      level: 'partial',
      powerDropScale: 1.18,
      cameraInterference: 2,
      servicePenalty: 0.08,
      urgencyBonus: 1,
      hallwayThreatBonus: 1,
      flashlightMode: visibilityBonus <= 0 && power <= 26,
      visibilityBand: visibilityBonus > 0 ? 'stabilized-low-light' : 'reduced'
    };
  }
  if (crisis.blackoutRisk) {
    return {
      active: false,
      level: 'risk',
      powerDropScale: 1.05,
      cameraInterference: 1,
      servicePenalty: 0.03,
      urgencyBonus: 0,
      hallwayThreatBonus: 1,
      flashlightMode: false,
      visibilityBand: 'strained'
    };
  }
  return {
    active: false,
    level: 'none',
    powerDropScale: 1,
    cameraInterference: 0,
    servicePenalty: 0,
    urgencyBonus: 0,
    hallwayThreatBonus: 0,
    flashlightMode: false,
    visibilityBand: 'clear'
  };
}

function buildHallwayThreatLine(targetState = state) {
  const crisis = targetState?.crisisNight || {};
  const blackout = getBlackoutPressureState(targetState);
  const hallwayThreat = Number(targetState?.crisisEscalation?.hallwayThreatLevel || 0);
  if (blackout.level === 'full') {
    return 'Hallway feel: blackout movement is bleeding through the corridor and the lobby no longer feels secure.';
  }
  if (blackout.level === 'partial') {
    return 'Hallway feel: corridor visibility is thinning out and pressure is moving through shared spaces.';
  }
  if (crisis.kind === 'hostile-social-night' || hallwayThreat >= 2) {
    return 'Hallway feel: voices, movement, and rumor pressure are carrying from room to room.';
  }
  if (crisis.kind === 'guest-surge' || Number(targetState?.crisisEscalation?.overlapPressureLevel || 0) >= 2) {
    return 'Hallway feel: too many active rooms are pulling against the same thin motel calm.';
  }
  return 'Hallway feel: the shared spaces still seem quiet, but not trustworthy.';
}

function buildSignatureIncidentCatalog() {
  return [
    {
      id: 'hallway-knock-pattern',
      title: 'Hallway Knock Pattern',
      log: (room) => `Signature incident: a synchronized knock pattern rolled the hallway and collapsed focus around ${room.label}.`,
      alert: (room) => `${room.label} became the center of a hallway-wide knock surge.`,
      apply: (room) => ({
        ...room,
        condition: room.condition === 'Stable' ? 'Watch' : 'Critical'
      }),
      chainSeverity: 2
    },
    {
      id: 'parking-lot-gathering',
      title: 'Parking Lot Gathering',
      log: (room) => `Signature incident: figures collected outside near ${room.label}, turning one guest problem into a motel-facing threat.`,
      alert: () => 'Parking-lot pressure is feeding the motel interior now.',
      apply: (room) => ({
        ...room,
        deskFlagged: true,
        condition: 'Critical'
      }),
      chainSeverity: 3
    },
    {
      id: 'breaker-room-echo',
      title: 'Breaker Room Echo',
      log: (room) => `Signature incident: a breaker-room echo dropped power confidence and pushed ${room.label} toward operational failure.`,
      alert: () => 'Infrastructure stress just became visible property-wide.',
      apply: (room) => ({
        ...room,
        powerCut: false,
        condition: room.condition === 'Stable' ? 'Watch' : 'Critical'
      }),
      chainSeverity: 2,
      powerDelta: -8
    },
    {
      id: 'lobby-shadow-crossing',
      title: 'Lobby Shadow Crossing',
      log: () => 'Signature incident: a shape crossed the lobby sightline and suddenly every shared space felt less contained.',
      alert: () => 'Shared-space threat is now visible in the lobby itself.',
      apply: (room) => ({
        ...room,
        condition: 'Critical'
      }),
      chainSeverity: 3
    },
    {
      id: 'hallway-surge',
      title: 'Hallway Surge',
      log: (room) => `Signature incident: pressure moved through the hallway wall to wall and broke the calm around ${room.label}.`,
      alert: () => 'A hostile hallway surge is connecting multiple active rooms.',
      apply: (room) => ({
        ...room,
        condition: room.condition === 'Stable' ? 'Watch' : 'Critical'
      }),
      chainSeverity: 3
    }
  ];
}

function triggerSignatureIncident(trigger = 'pressure') {
  ensureCrisisEscalationState(state);
  const occupied = (state.rooms || []).filter((room) => room?.occupiedBy);
  if (!occupied.length) return false;
  const usedIds = new Set(state?.crisisEscalation?.signatureIdsSeen || []);
  const available = buildSignatureIncidentCatalog().filter((entry) => !usedIds.has(entry.id));
  if (!available.length) return false;
  const target = occupied.sort((a, b) => Number(b?.chainPressure || 0) - Number(a?.chainPressure || 0))[0];
  if (!target) return false;
  const incident = available[0];
  const idx = state.rooms.findIndex((room) => room.id === target.id);
  if (idx === -1) return false;
  state.rooms[idx] = incident.apply(state.rooms[idx]);
  if (typeof incident.powerDelta === 'number') {
    state.power = clampPower(state.power + incident.powerDelta);
  }
  registerRoomChainSignal({
    roomId: target.id,
    guestName: target.occupiedBy,
    type: `signature-${incident.id}-${trigger}`,
    severity: incident.chainSeverity
  });
  markRoomMemory(target.id, {
    incidentsSeen: 1,
    signature: incident.id,
    note: `${incident.title} has been logged here.`
  });
  state.logs.push(incident.log(target));
  pushLiveAlert(state, {
    type: 'danger',
    message: incident.alert(target),
    dedupeKey: `signature-${incident.id}-${state.night}`
  });
  state.incidents = [...(Array.isArray(state.incidents) ? state.incidents : []), {
    roomId: target.id,
    guestName: target.occupiedBy,
    riskLevel: target.riskLevel || 'High',
    condition: state.rooms[idx].condition,
    type: incident.title,
    severity: 'high'
  }];
  state.shiftStats.severeIncidents = (state.shiftStats.severeIncidents || 0) + 1;
  state.crisisEscalation.hallwayThreatLevel = Math.max(Number(state?.crisisEscalation?.hallwayThreatLevel || 0), 2);
  state.crisisEscalation.overlapPressureLevel = Math.max(Number(state?.crisisEscalation?.overlapPressureLevel || 0), 2);
  state.crisisEscalation.signatureIdsSeen = [...usedIds, incident.id];
  return true;
}

function maybeTriggerBlackoutPressure(source = 'general') {
  ensureCrisisNightState(state);
  ensureCrisisEscalationState(state);
  const crisis = state?.crisisNight || {};
  if (!crisis.blackoutRisk) return false;
  const blackoutSoftener = Math.max(0, Number(state?.progressionModifiers?.powerBlackoutSoftener || 0));
  const lowPower = Number(state?.power || 100) <= 35;
  const lateNight = Number(state?.shiftElapsedMinutes || 0) >= 180;
  const criticalRooms = getCriticalOccupiedRoomCount();
  const alreadyPartial = state?.crisisEscalation?.blackoutLevel === 'partial';
  const chance = lowPower || lateNight || criticalRooms >= 2 ? 0.34 : 0.12;
  if (Math.random() > chance) return false;
  state.crisisEscalation.blackoutTriggered = true;
  state.crisisEscalation.blackoutLevel =
    alreadyPartial || (crisis.kind === 'partial-blackout' && (lowPower || criticalRooms >= 2))
      ? 'full'
      : 'partial';
  state.crisisEscalation.cameraInterferenceLevel = state.crisisEscalation.blackoutLevel === 'full' ? 3 : 2;
  state.crisisEscalation.hallwayThreatLevel = Math.max(
    Number(state?.crisisEscalation?.hallwayThreatLevel || 0),
    state.crisisEscalation.blackoutLevel === 'full' ? 3 : 2
  );
  state.crisisEscalation.overlapPressureLevel = Math.max(
    Number(state?.crisisEscalation?.overlapPressureLevel || 0),
    state.crisisEscalation.blackoutLevel === 'full' ? 3 : 2
  );
  state.power = clampPower(
    state.power - Math.max(4, Math.round((state.crisisEscalation.blackoutLevel === 'full' ? 18 : crisis.kind === 'partial-blackout' ? 12 : 8) * (1 - blackoutSoftener)))
  );
  const occupied = (state.rooms || []).filter((room) => room?.occupiedBy);
  occupied.slice(0, Math.max(1, Math.min(state.crisisEscalation.blackoutLevel === 'full' ? 3 : 2, occupied.length))).forEach((room) => {
    registerRoomChainSignal({
      roomId: room.id,
      guestName: room.occupiedBy,
      type: `blackout-${source}`,
      severity: state.crisisEscalation.blackoutLevel === 'full' ? 3 : 2
    });
    updateRoomById(room.id, (currentRoom) => {
      const currentService = getDefaultRoomServiceState(currentRoom?.serviceState);
      const activeRequest = currentService.pendingRequest
        ? {
            ...currentService.pendingRequest,
            urgency: 'high'
          }
        : currentService.pendingRequest;
      return {
        ...currentRoom,
        serviceState: {
          ...withAdjustedServiceState(currentService, {
            anxiety: 1,
            irritation: state.crisisEscalation.blackoutLevel === 'full' ? 1 : 0,
            rumorPressure: 1
          }),
          pendingRequest: activeRequest,
          urgency: activeRequest ? 'high' : currentService.urgency,
          responseStatus: state.crisisEscalation.blackoutLevel === 'full'
            ? 'Blackout instability inside occupied room.'
            : 'Partial blackout strain on room control.'
        }
      };
    });
  });
  state.logs.push(
    state.crisisEscalation.blackoutLevel === 'full'
      ? 'Full blackout pressure: cameras, corridor visibility, and occupied-room control all degraded at once.'
      : crisis.kind === 'partial-blackout'
        ? 'Partial blackout: corridor lighting dropped, front desk visibility narrowed, and room pressure spiked under the outage.'
        : 'Blackout scare: power sagged across part of the property and room control immediately worsened.'
  );
  pushLiveAlert(state, {
    type: 'danger',
    message: state.crisisEscalation.blackoutLevel === 'full'
      ? 'Full blackout pressure: shared spaces and room control are breaking down together.'
      : crisis.kind === 'partial-blackout'
        ? 'Partial blackout: visibility and control just got worse across the motel.'
        : 'Blackout pressure: the property is slipping toward operational failure.',
    dedupeKey: `blackout-${state.night}`
  });
  state.shiftStats.majorPowerIncidents = (state.shiftStats.majorPowerIncidents || 0) + 1;
  maybeAdvanceSignatureNightFlow('blackout', { source });
  return true;
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

function handleSelectDarkContract(contractId) {
  const id = String(contractId || '').trim();
  if (!id || !getDarkContractById(id)) return;
  if (!darkWebContractsEnabled(state)) return;
  if (activeScreenId !== 'night-prep-screen') return;
  onMeaningfulAction();
  audioController.playUiClick();
  normalizeEndlessRunState(state);
  state.endlessRun.nextDarkContractId = id;
  state.logs.push(`Dark-web broker locked next shift contract: ${getDarkContractById(id).codename}.`);
  pushLiveAlert(state, {
    type: 'warning',
    message: `Contract queued: ${getDarkContractById(id).codename} — ${getDarkContractById(id).downside}`,
    dedupeKey: `dw-contract-${id}-${state.night}`
  });
  normalizeCampaignSystems();
  renderNightPrepScreen();
  renderAll();
}

function handleDawnAuditorCleanup() {
  const res = applyDawnAuditorCleanupPass(state);
  if (!res.ok) {
    pushLiveAlert(state, { type: 'warning', message: res.reason || 'No concealment pass available.', dedupeKey: 'dawn-cleanup-fail' });
    renderAll();
    return;
  }
  onMeaningfulAction();
  audioController.playUiClick();
  if (progressShift('dawn-auditor-cleanup', { timeScale: 0.1, skipPassiveDrain: true })) return;
  renderAll();
}

function handleDawnShredder() {
  if (activeScreenId !== 'game-screen') return;
  onMeaningfulAction();
  audioController.playUiClick();
  const res = applyDeskShredderPass(state);
  if (!res.ok) {
    pushLiveAlert(state, { type: 'warning', message: res.reason || 'Cannot shred.', dedupeKey: 'dawn-shred-fail' });
    renderAll();
    return;
  }
  if (progressShift('dawn-shredder', { timeScale: 0.12, skipPassiveDrain: true })) return;
  renderAll();
}

function handleDawnIncinerator() {
  if (activeScreenId !== 'game-screen') return;
  onMeaningfulAction();
  audioController.playUiClick();
  const res = applyBasementIncineratorPass(state);
  if (!res.ok) {
    pushLiveAlert(state, { type: 'warning', message: res.reason || 'Cannot run furnace.', dedupeKey: 'dawn-incin-fail' });
    renderAll();
    return;
  }
  if (progressShift('dawn-incinerator', { timeScale: 0.18, skipPassiveDrain: true })) return;
  renderAll();
}

function handleDawnBlackmail() {
  if (activeScreenId !== 'game-screen') return;
  onMeaningfulAction();
  audioController.playUiClick();
  const res = applyAuditorBlackmailPass(state);
  if (!res.ok) {
    pushLiveAlert(state, { type: 'warning', message: res.reason || 'No leverage play available.', dedupeKey: 'dawn-bm-fail' });
    renderAll();
    return;
  }
  if (progressShift('dawn-blackmail', { timeScale: 0.14, skipPassiveDrain: true })) return;
  renderAll();
}

function handleFourAmFixer() {
  if (activeScreenId !== 'game-screen') return;
  onMeaningfulAction();
  audioController.playUiClick();
  const res = applyFourAmFixer(state);
  if (!res.ok) {
    pushLiveAlert(state, { type: 'warning', message: res.reason || 'Fixer unavailable.', dedupeKey: 'fixer-fail' });
    renderAll();
    return;
  }
  if (progressShift('four-am-fixer', { timeScale: 0.1, skipPassiveDrain: true })) return;
  renderAll();
}

function handleBasementFocus(focus) {
  if (activeScreenId !== 'game-screen') return;
  onMeaningfulAction();
  audioController.playUiClick();
  ensureCrisisEscalationState(state);
  const res = resolveBasementIncidentFocus(state, String(focus || ''));
  if (!res.ok) {
    pushLiveAlert(state, { type: 'warning', message: res.reason || 'No basement incident.', dedupeKey: 'basement-focus-fail' });
    renderAll();
    return;
  }
  if (progressShift('basement-resolve', { timeScale: 0.45, skipPassiveDrain: false })) return;
  renderAll();
}

function handleBasementSkim() {
  if (activeScreenId !== 'game-screen') return;
  onMeaningfulAction();
  audioController.playUiClick();
  const res = takeBasementSkim(state);
  if (!res.ok) {
    pushLiveAlert(state, { type: 'warning', message: res.reason || 'Cannot skim.', dedupeKey: 'basement-skim-fail' });
    renderAll();
    return;
  }
  if (progressShift('basement-skim', { timeScale: 0.55, skipPassiveDrain: false })) return;
  renderAll();
}

function handleDeadDropSeal(choiceId) {
  if (activeScreenId !== 'failure-screen') return;
  onMeaningfulAction();
  audioController.playUiClick();
  const res = sealManagerDeadDrop(metaState, String(choiceId || ''), state);
  metaState = res.meta;
  saveMetaSafe();
  if (!res.ok) {
    pushLiveAlert(state, { type: 'warning', message: res.reason || 'Cannot seal drop.', dedupeKey: 'dead-drop-fail' });
    renderAll();
    return;
  }
  pushLiveAlert(state, { type: 'info', message: 'Dead drop sealed in the vent — a future manager may inherit it.', dedupeKey: 'dead-drop-ok' });
  renderAll();
}

function handleFundDrifterNetwork() {
  if (activeScreenId !== 'game-screen') return;
  onMeaningfulAction();
  audioController.playUiClick();
  normalizeDirtyState(state);
  const res = fundDrifterNetwork(state);
  if (!res.ok) {
    pushLiveAlert(state, { type: 'warning', message: res.reason || 'Unable to fund watchers.', dedupeKey: 'road-fund-fail' });
    renderAll();
    return;
  }
  pushLiveAlert(state, { type: 'info', message: 'Drifter network widened — texts may beat trouble to your door.', dedupeKey: 'road-fund-ok' });
  if (progressShift('road-fund-drifters', { timeScale: 0.12, skipPassiveDrain: true })) return;
  renderAll();
}

function handleFeedMotelHound() {
  if (activeScreenId !== 'game-screen') return;
  onMeaningfulAction();
  audioController.playUiClick();
  const res = feedMotelHound(state);
  if (!res.ok) {
    pushLiveAlert(state, { type: 'warning', message: res.reason || 'Cannot feed the lot stray right now.', dedupeKey: 'hound-feed-fail' });
    renderAll();
    return;
  }
  pushLiveAlert(state, { type: 'info', message: 'Motel hound fed — it may warn the lot earlier when something is wrong.', dedupeKey: 'hound-feed-ok' });
  if (progressShift('motel-hound-feed', { timeScale: 0.1, skipPassiveDrain: true })) return;
  renderAll();
}

function handleBorderStagingChoice(choice) {
  if (activeScreenId !== 'game-screen') return;
  onMeaningfulAction();
  audioController.playUiClick();
  if (choice === 'blind') {
    const r = beginBorderBlindWindow(state);
    if (!r.ok) {
      pushLiveAlert(state, { type: 'warning', message: r.reason || 'Cannot open blind.', dedupeKey: 'border-blind-fail' });
      renderAll();
      return;
    }
    if (progressShift('border-blind-open', { timeScale: 0.42 })) return;
  } else if (choice === 'refuse') {
    refuseBorderTransfer(state);
    if (progressShift('border-refuse', { timeScale: 0.28 })) return;
  } else if (choice === 'log') {
    const r = logBorderTransferHonest(state);
    if (!r.ok) {
      pushLiveAlert(state, { type: 'warning', message: r.reason || 'Cannot log.', dedupeKey: 'border-log-fail' });
      renderAll();
      return;
    }
    if (progressShift('border-log', { timeScale: 0.22 })) return;
  }
  renderAll();
}

function handleBorderWitnessChoice(choiceId) {
  if (activeScreenId !== 'game-screen') return;
  onMeaningfulAction();
  audioController.playUiClick();
  const r = resolveBorderWitnessChoice(state, choiceId);
  if (!r.ok) {
    pushLiveAlert(state, { type: 'warning', message: r.reason || 'No witness branch.', dedupeKey: 'border-witness-fail' });
    renderAll();
    return;
  }
  if (progressShift('border-witness-resolve', { timeScale: 0.32 })) return;
  renderAll();
}

function handleOperatorSwitchboardListen(lineId) {
  if (activeScreenId !== 'game-screen') return;
  onMeaningfulAction();
  audioController.playUiClick();
  const r = performSwitchboardListen(state, lineId);
  if (!r.ok) {
    pushLiveAlert(state, { type: 'warning', message: r.reason || 'Cannot tap that line.', dedupeKey: 'op-listen-fail' });
    renderAll();
    return;
  }
  pushLiveAlert(state, {
    type: r.tag === 'misinfo' || r.tag === 'notice' ? 'warning' : 'info',
    message: r.text,
    dedupeKey: `op-listen-${state.night}-${state.shiftElapsedMinutes}-${r.lineKey}`
  });
  if (progressShift('switchboard-listen', { timeScale: 0.32 })) return;
  renderAll();
}

function handleOperatorQuartersResolve(choice) {
  if (activeScreenId !== 'game-screen') return;
  onMeaningfulAction();
  audioController.playUiClick();
  const res = resolveQuartersChoice(state, choice);
  if (!res.ok) {
    pushLiveAlert(state, { type: 'warning', message: res.reason || 'Nothing pending.', dedupeKey: 'op-q-fail' });
    renderAll();
    return;
  }
  if (res.log) state.logs.push(res.log);
  const key = choice === 'check' ? 'operator-quarters-check' : 'operator-quarters-ignore';
  if (progressShift(key, { timeScale: choice === 'check' ? 0.48 : 0.2 })) return;
  renderAll();
}

function buildRenderState() {
  normalizeDeskInspectionState(state);
  normalizeStaffManagementState();
  const uiPressureLevel = deriveUiPressureLevel(state);
  const blackoutState = getBlackoutPressureState(state);
  const emergencyNight = getEmergencyNightProfile(state);
  const emergencyCommands = buildEmergencyCommandModel(state);
  const identity = getIdentityContext();
  const branchContext = getBranchContext(true);
  const campaign = getCampaignContext();
  const ownerBrief = buildOwnerPressureBrief();
  const suspectBoard = buildSuspectBoardSnapshot();
  const sharedSpaces = buildSharedSpacesModel(state);
  const budgetSummary = buildBudgetSummary(state);
  const staffRoster = buildStaffRosterModel(state);
  const staffProfile = getNightStaffProfile(state);
  const doctrineTrack = getDoctrineManagementTrack(state?.doctrine || {});
  const metaSurface = getMetaSurfaceState();
  const onboardingUi = buildOnboardingUiModel(state, onboardingState, {
    activePanelId,
    activeScreenId
  });
  const pressureSnapshot = buildShiftPressureSnapshot(state?.lastSummary || null);

  const roomsWithChainPressure = (state.rooms || []).map((room) => ({
    ...room,
    chainPressure: getVisibleChainPressureForRoom(state, room.id)
  }));

  const guestsWithDeskOptions = (state.guests || []).map((guest) => ({
    ...guest,
    roomAssignmentOptions: getRoomAssignmentOptionsForGuest(guest, roomsWithChainPressure)
  }));

  const clarity = deriveClarityModel(
    {
      ...state,
      guests: guestsWithDeskOptions,
      rooms: roomsWithChainPressure,
      sharedSpaces,
      cameras: state.cameras || [],
      activeEvents: state.activeEvents || [],
      analog: getBreakerBoardSummary(state),
      blackoutState,
      emergencyNight,
      night: state.night,
      power: state.power,
      crisisNight: state?.crisisNight || null,
      finaleDirector: state?.finaleDirector || null,
      dawnAuditor: state?.dawnAuditor || null,
      shiftElapsedMinutes: state.shiftElapsedMinutes
    },
    { activePanelId, activeScreenId, onboardingUi }
  );

  return {
    ...state,
    onInvestigateCamera: investigateCameraZone,
    onCameraSceneAction: handleCameraSceneAction,
    onCloseCameraScene: closeCameraScene,
    onRespondNightEvent: handleRespondNightEvent,
    onCloseNightEvent: handleCloseNightEvent,
    onNightEventChoice: handleNightEventChoice,
    onRepairBlindCamera: repairBlindCamera,
    onTriggerZoneBlackout: triggerZoneBlackout,
    onPerformRadioInterception: performRadioInterception,
    radioInterceptionUsed: Boolean(state.radioInterceptionUsed),
    socialMemoryNote: buildSocialMemoryNote(state),
    unknownCallerHistory: Array.isArray(state.unknownCallerHistory) ? state.unknownCallerHistory : [],
    evidenceLockerSummary: buildEvidenceLockerSummary(state),
    nemesis: state.nemesis || {},
    dirtyLedgerSummary: buildDirtyLedgerSummary(state),
    shadowRepNote: buildShadowRepNote(state),
    bleedingWalkInState: state.bleedingWalkInState || {},
    staffIntelSummary: buildStaffIntelSummary(state),
    staffParanoiaModel: buildStaffParanoiaModel(state),
    onPayStaffBonus: payStaffBonus,
    onDismissSuspectedStaff: dismissSuspectedStaff,
    room9Intel: buildRoom9IntelSummary(state),
    room9Model: buildRoom9Model(state),
    townModel: buildTownModel(state),
    townPressureSummary: buildTownPressureSummary(state),
    currentDayShiftNote: (state.dayShiftNotes || []).length ? state.dayShiftNotes[state.dayShiftNotes.length - 1] : null,
    latestHeadline: state.townState?.headlineArchive?.length ? state.townState.headlineArchive[state.townState.headlineArchive.length - 1] : null,
    onRespondToNote: respondToDayShiftNote,
    onHandleSpecialEncounter: handleOpenSpecialEncounter,
    onCloseSpecialEncounter: handleCloseSpecialEncounter,
    onSpecialEncounterChoice: handleSpecialEncounterChoice,
    onOpenSharedSpace: openSharedSpaceZone,
    onSharedSpaceQuickAction: executeSharedSpaceQuickAction,
    onSharedSpaceDelay: delaySharedSpace,
    onFinaleCommandChoice: handleFinaleCommandChoice,
    onToggleHelpOverlay: toggleHelpOverlay,
    onDismissTutorialHint: dismissTutorialHint,
    onDisableTutorialGuidance: disableTutorialGuidance,
    onEnableTutorialGuidance: enableTutorialGuidance,
    onDismissPanelIntro: dismissPanelIntroChip,
    onSetTutorialMode: setTutorialMode,
    onToggleSettingsOverlay: toggleSettingsOverlay,
    onUpdateSetting: updateSetting,
    onSetDayShiftPlan: setDayShiftPlan,
    onSetStaffFocus: setStaffFocus,
    onCycleStaffAssignment: cycleStaffAssignment,
    onSetUpgradeCategory: setUpgradeCategory,
    onQuestionGuest: questionGuestFurther,
    onEmergencyCommand: executeEmergencyCommand,
    audioMuted: audioController.isMuted(),
    settings: settingsState,
    settingsOverlayOpen,
    settingsStorageHealthy: Boolean(settingsState?.__storageLoaded),
    activeUpgradeSummary: buildActiveUpgradeSummary(state),
    ownerPressureBrief: ownerBrief,
    budgetSummary,
    staffRoster,
    staffFocus: staffProfile.focus,
    staffProfile,
    doctrineTrack,
    suspectBoard,
    uiPressureLevel,
    topbarWarningFlags: getTopbarWarningFlags(state),
    rooms: roomsWithChainPressure,
    sharedSpaces,
    guests: guestsWithDeskOptions,
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
    collapsePrepBrief: buildCollapsePrepBrief(state),
    campaignCollapseStats: state?.campaignCollapseStats || null,
    signatureNight: state?.signatureNight || null,
    emergencyNight,
    emergencyCommands,
    pressureSnapshot,
    blackoutState,
    hallwayThreatLine: buildHallwayThreatLine(state),
    cameraInterferenceLevel: Math.max(
      blackoutState.cameraInterference,
      Number(state?.crisisEscalation?.cameraInterferenceLevel || 0),
      getCameraAnalogPenalty(state),
      isTapeArchiveVulnerable(state) ? 1 : 0,
      Number(state?.contractRuntime?.cameraInterferenceBonus || 0)
    ),
    endlessUi: (() => {
      normalizeEndlessRunState(state);
      const c = getDarkContractById(state.endlessRun.selectedDarkContractId);
      return {
        isEndless: isEndlessMode(state),
        darkContractsOn: darkWebContractsEnabled(state),
        survivalScore: Number(state.endlessRun.survivalScore || 0),
        wave: Number(state.endlessRun.wave || 0),
        auditorPasses: Number(state.endlessRun.auditorPasses || 0),
        auditorPartials: Number(state.endlessRun.auditorPartials || 0),
        auditorFails: Number(state.endlessRun.auditorFails || 0),
        cleanupPasses: Number(state.endlessRun.cleanupPasses || 0),
        contract: c
          ? { id: c.id, codename: c.codename, headline: c.headline, downside: c.downside }
          : null
      };
    })(),
    darkWebPrep: (() => {
      if (!darkWebContractsEnabled(state)) {
        return { enabled: false, offers: [], selectedNextId: '', onSelectDarkContract: null };
      }
      normalizeEndlessRunState(state);
      return {
        enabled: true,
        offers: pickDarkContractOffers(state, 3),
        selectedNextId: String(state.endlessRun.nextDarkContractId || ''),
        onSelectDarkContract: handleSelectDarkContract
      };
    })(),
    dawnAuditorUi: (() => {
      normalizeDawnAuditorState(state);
      normalizeFinalWinterState(state);
      const da = state.dawnAuditor || {};
      return {
        active: Boolean(da.active),
        warned: Boolean(da.warned),
        cleanupWindow: Boolean(da.cleanupWindow),
        cleanupUsed: Number(da.cleanupUsed || 0),
        kind: String(da.kind || ''),
        blackmailUsed: Boolean(da.blackmailUsed),
        exposurePreview: da.active ? computeDawnExposure(state) : null,
        onCleanup: handleDawnAuditorCleanup,
        blackmailAvailable:
          Boolean(da.active && da.cleanupWindow) &&
          hasAuditorBlackmailLeverage(state) &&
          !da.blackmailUsed &&
          Number(da.cleanupUsed || 0) < 1,
        canShred: Boolean(da.active && da.cleanupWindow && Number(state.finalWinter?.shredderUses || 0) < 2),
        canIncinerate: Boolean(da.active && da.cleanupWindow && Number(state.finalWinter?.incineratorUses || 0) < 1),
        onShred: handleDawnShredder,
        onIncinerate: handleDawnIncinerator,
        onBlackmail: handleDawnBlackmail
      };
    })(),
    winterUi: buildFinalWinterRenderModel(state),
    finalWinterPrepLine: buildFinalWinterPrepLine(state),
    basementUi: buildBasementRenderModel(state),
    basementPrepLine: buildBasementPrepLine(state),
    deadDropFailureOffer: buildDeadDropFailureOffer(metaState, state),
    roadWorldUi: (() => {
      normalizeRoadWorldState(state);
      return {
        ...buildRoadWorldRenderModel(state),
        onFundDrifterNetwork: handleFundDrifterNetwork,
        onFeedMotelHound: handleFeedMotelHound
      };
    })(),
    analog: getBreakerBoardSummary(state),
    presentationFatigue: getFatigueTier(state),
    blurGuestNamesFromFatigue: shouldFatigueBlurNames(state),
    forensic: (() => {
      const f = getForensicRenderModel(state);
      return { ...f, uvDeskTraceLines: buildOperatorUvTraceLines(state) };
    })(),
    operatorNoir: buildOperatorNoirRenderModel(state),
    onOperatorSwitchboardListen: handleOperatorSwitchboardListen,
    onOperatorQuartersResolve: handleOperatorQuartersResolve,
    borderTransferUi: buildBorderTransferRenderModel(state),
    borderPrepLine: buildBorderTransferPrepLine(state),
    onToggleUvDeskLens: () => {
      onMeaningfulAction();
      audioController.playUiClick();
      const on = toggleUvDeskLens(state);
      pushLiveAlert(state, {
        type: 'info',
        message: on ? 'Blacklight desk lens on — reactive reads visible on open cases.' : 'Blacklight desk lens off.',
        dedupeKey: `uv-lens-${state.night}-${on ? 'on' : 'off'}`
      });
      if (progressShift('uv-lens-toggle', { timeScale: 0.06, skipPassiveDrain: true })) return;
      renderAll();
    },
    onLostFoundAction: (itemId, action) => {
      onMeaningfulAction();
      audioController.playUiClick();
      const r = resolveLostFoundAction(state, itemId, action);
      if (!r.ok) {
        pushLiveAlert(state, { type: 'warning', message: r.reason, dedupeKey: 'lf-fail' });
      } else if (Array.isArray(r.logs)) {
        r.logs.forEach((ln) => state.logs.push(ln));
      }
      if (progressShift('lost-found', { timeScale: 0.12, skipPassiveDrain: true })) return;
      renderAll();
    },
    onTapeBackupEvidence: (evidenceItemId) => {
      onMeaningfulAction();
      audioController.playUiClick();
      const r = startTapeBackupForEvidenceItem(state, evidenceItemId);
      if (!r.ok) {
        pushLiveAlert(state, { type: 'warning', message: r.reason, dedupeKey: 'tape-fail' });
      } else {
        pushLiveAlert(state, {
          type: 'warning',
          message: 'Tape backup running — two thin ticks of divided attention.',
          dedupeKey: 'tape-start'
        });
      }
      if (progressShift('tape-backup', { timeScale: 0.1, skipPassiveDrain: true })) return;
      renderAll();
    },
    onAnalogCycleCircuit: (circuitId) => {
      onMeaningfulAction();
      audioController.playUiClick();
      cycleCircuitTier(state, circuitId);
      if (progressShift('breaker-toggle', { timeScale: 0.08, skipPassiveDrain: true })) return;
      renderAll();
    },
    onAnalogNeonCycle: () => {
      onMeaningfulAction();
      audioController.playUiClick();
      cycleNeonPlayerWish(state);
      if (progressShift('neon-toggle', { timeScale: 0.08, skipPassiveDrain: true })) return;
      renderAll();
    },
    onOperatorCoffee: () => {
      onMeaningfulAction();
      audioController.playUiClick();
      const r = useCoffee(state);
      if (!r.ok) {
        pushLiveAlert(state, { type: 'warning', message: r.reason, dedupeKey: 'coffee-fail' });
      } else {
        pushLiveAlert(state, { type: 'info', message: 'Coffee run: fatigue eased.', dedupeKey: 'coffee-ok' });
      }
      if (progressShift('operatorCoffee', { timeScale: 0.12, skipPassiveDrain: true })) return;
      renderAll();
    },
    onOperatorStim: () => {
      onMeaningfulAction();
      audioController.playUiClick();
      const r = useStrongStim(state);
      if (!r.ok) {
        pushLiveAlert(state, { type: 'warning', message: r.reason, dedupeKey: 'stim-fail' });
      } else {
        pushLiveAlert(state, { type: 'warning', message: 'Strong stim used — rebound queued, dirty pressure ticked.', dedupeKey: 'stim-ok' });
      }
      if (progressShift('operatorStim', { timeScale: 0.12, skipPassiveDrain: true })) return;
      renderAll();
    },
    nightIdentityLine: buildNightIdentitySummary(state),
    nightMoodLine: buildNightMoodLine(state, ownerBrief, emergencyNight),
    motelCapacityLine: `Rooms licensed tonight: ${getUnlockedRoomCapForNight(state.night)} / 6`,
    intakeStatusLine: `Arrivals left: ${Math.max(0, Number(state?.intake?.arrivalsRemaining ?? 0))} • Desk queue cap: ${Math.max(0, Number(state?.intake?.queueCap ?? 3))} (${(state.guests || []).length} waiting)`,
    localScannerFeed: Array.isArray(state?.localScannerFeed) ? state.localScannerFeed : [],
    runEnding: state?.runEnding || null,
    onboardingUi,
    ...metaSurface,
    clarity,
    onClarityNavigatePanel: (panelId) => {
      if (activeScreenId !== 'game-screen') return;
      setActivePanel(panelId);
      renderAll();
    },
    onDeskGuestFocus: (guestId) => {
      setDeskFocusGuestId(guestId);
      renderAll();
    },
    onSharedSpacesBoardOpen: () => {
      setSharedBoardUserOpen(true);
      renderAll();
    },
    onSharedSpacesBoardCollapse: () => {
      setSharedBoardUserOpen(false);
      renderAll();
    }
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

function buildNightMoodLine(targetState = state, ownerBrief = null, emergency = null) {
  const brief = ownerBrief || buildOwnerPressureBrief();
  const emergencyState = emergency || getEmergencyNightProfile(targetState);
  const signature = getSignatureNightProfile(targetState);
  const pressure = deriveUiPressureLevel(targetState);
  const crisis = targetState?.crisisNight || {};
  const parts = [];
  if (crisis.trueCrisisNight) parts.push('Convergence: collapse-class night');
  else if (Number(crisis.convergenceTier || 0) >= 3) parts.push('Convergence: multi-vector heat');
  if (brief?.mood) parts.push(`Owner tone: ${brief.mood}`);
  if (signature?.active && signature?.title) parts.push(`Signature frame: ${signature.title}`);
  if (emergencyState?.active && emergencyState?.label) parts.push(`Emergency state: ${emergencyState.label}`);
  parts.push(`Shift pressure: ${String(pressure || 'calm')}`);
  return parts.slice(0, 4).join(' • ');
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
  if (Number(stats.roomCallsHandled || 0) >= 2) positives.push('Occupied-room service stayed readable under strain');
  if (Number(stats.smartRestraintMoments || 0) >= 1) positives.push('Restraint prevented over-management fallout');

  if (Number(stats.unresolvedLocationScenes || 0) >= 2) negatives.push('Too many unresolved location problems persisted');
  if (Number(stats.nightEventsMissed || 0) >= 2) negatives.push('Event misses created avoidable chain strain');
  if (Number(stats.policyBroken || 0) >= 2) negatives.push('Policy overrides drove costly instability');
  if (Number(state?.power || 0) <= 30) negatives.push('Power floor collapsed into danger range');
  if (Number(stats.panicSpendingMoments || 0) >= 2) negatives.push('Panic spending reduced late-shift options');
  if (Number(stats.overManagementPenalties || 0) >= 1) negatives.push('Over-management created unnecessary social fallout');

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
  const renderState = buildRenderState();
  const selectedCategory = String(renderState?.dayShift?.management?.selectedUpgradeCategory || 'All');
  const filtered = selectedCategory === 'All'
    ? upgrades
    : upgrades.filter((upgrade) => String(upgrade?.category || '').toLowerCase().includes(selectedCategory.toLowerCase()));
  renderNightPrep(renderState, filtered, purchasePrepUpgrade);
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
  const blackout = getBlackoutPressureState(state);
  if (warningFlags.lowPower && !state.uiFlags.lowPowerWarned) {
    pushLiveAlert(state, {
      type: 'warning',
      message: 'Power reserve is low. The motel feels one bad surge away from blackout conditions.',
      dedupeKey: 'warn-low-power'
    });
    state.uiFlags.lowPowerWarned = true;
    audioController.playAlert('high');
  }
  if (!warningFlags.lowPower) state.uiFlags.lowPowerWarned = false;

  if (warningFlags.lowReputation && !state.uiFlags.lowReputationWarned) {
    pushLiveAlert(state, {
      type: 'warning',
      message: 'Reputation is collapsing. The motel is losing the benefit of the doubt.',
      dedupeKey: 'warn-low-reputation'
    });
    state.uiFlags.lowReputationWarned = true;
  }
  if (!warningFlags.lowReputation) state.uiFlags.lowReputationWarned = false;

  if (warningFlags.criticalPressure && !state.uiFlags.criticalPressureWarned) {
    pushLiveAlert(state, {
      type: 'danger',
      message: 'This night is slipping away. Multiple occupied rooms are already in critical condition.',
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
      message: 'Pressure is spreading room to room. The motel is starting to fail as one property, not isolated rooms.',
      dedupeKey: `warn-chain-pressure-${state.night}`
    });
    state.uiFlags.chainPressureWarned = true;
  }
  if (chainPressure < 5) state.uiFlags.chainPressureWarned = false;

  if (blackout.level === 'partial' && !state.uiFlags.partialBlackoutWarned) {
    pushLiveAlert(state, {
      type: 'warning',
      message: 'Partial blackout: camera confidence is slipping and active rooms are getting louder and less reliable.',
      dedupeKey: `partial-blackout-${state.night}`
    });
    state.uiFlags.partialBlackoutWarned = true;
  }
  if (blackout.level !== 'partial') state.uiFlags.partialBlackoutWarned = false;

  if (blackout.level === 'full' && !state.uiFlags.fullBlackoutWarned) {
    pushLiveAlert(state, {
      type: 'danger',
      message: 'Full blackout pressure: shared spaces, cameras, and occupied rooms are all breaking down together.',
      dedupeKey: `full-blackout-${state.night}`
    });
    state.uiFlags.fullBlackoutWarned = true;
    audioController.playAlert('dire');
  }
  if (blackout.level !== 'full') state.uiFlags.fullBlackoutWarned = false;

  ensureCrisisEscalationState(state);
  if (Number(state?.crisisEscalation?.hallwayThreatLevel || 0) >= 2 && !state.uiFlags.hallwayThreatWarned) {
    pushLiveAlert(state, {
      type: 'warning',
      message: 'Hallway threat is rising. Shared spaces no longer feel separate from the rooms.',
      dedupeKey: `hallway-threat-${state.night}`
    });
    state.uiFlags.hallwayThreatWarned = true;
  }
  if (Number(state?.crisisEscalation?.hallwayThreatLevel || 0) < 2) state.uiFlags.hallwayThreatWarned = false;

  if (Number(state?.crisisEscalation?.overlapPressureLevel || 0) >= 2 && !state.uiFlags.overlapWarned) {
    pushLiveAlert(state, {
      type: 'warning',
      message: 'Multiple active rooms are overlapping now. This no longer feels like isolated motel trouble.',
      dedupeKey: `overlap-pressure-${state.night}`
    });
    state.uiFlags.overlapWarned = true;
  }
  if (Number(state?.crisisEscalation?.overlapPressureLevel || 0) < 2) state.uiFlags.overlapWarned = false;

  if ((warningFlags.criticalPressure || warningFlags.lowPower || chainPressure >= 10) && !state.uiFlags.panicSlipWarned) {
    pushLiveAlert(state, {
      type: 'danger',
      message: blackout.level === 'full'
        ? 'Collapse warning: blackout pressure is stripping control out of the motel faster than the desk can restore it.'
        : 'Panic warning: command is thinning out. One more bad sequence could break the night open.',
      dedupeKey: `panic-slip-${state.night}`
    });
    state.uiFlags.panicSlipWarned = true;
    state.crisisEscalation.panicMoments = Math.max(0, Number(state?.crisisEscalation?.panicMoments || 0) + 1);
  }
  if (!warningFlags.criticalPressure && !warningFlags.lowPower && chainPressure < 7) {
    state.uiFlags.panicSlipWarned = false;
  }

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
  state = normalizeRoomServiceState(state);
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
  normalizeDeskInspectionState(state);
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
  ensureCrisisNightState(state);
  ensureCrisisEscalationState(state);
  normalizeIdentitySystems();
  normalizeRunMemoryState();
  normalizeCampaignSystems();
  normalizeBasementSyndicate(state);
  evaluateBasementUnlock(state);
  if (saved && Number(state.night) >= 2) {
    const _ddrBoot = tryRevealManagerDeadDrop(metaState, state);
    if (_ddrBoot.meta) {
      metaState = _ddrBoot.meta;
      saveMetaSafe();
    }
  }
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
  if (typeof state.dirtyPressure !== 'number') state.dirtyPressure = 0;
  if (typeof state.raidTriggered !== 'boolean') state.raidTriggered = false;
  if (typeof state.raidStatus !== 'string') state.raidStatus = 'none';
  if (typeof state.cameraSabotageTriggered !== 'boolean') state.cameraSabotageTriggered = false;
  if (typeof state.burnerPhoneOffered !== 'boolean') state.burnerPhoneOffered = false;
  if (!state?.nightStartSnapshot?.state) {
    captureNightStartSnapshot('bootstrap-fallback', { force: true });
  }
  normalizeAnalogSurvivalState(state);
  finalizeAnalogSurvivalState(state);
  normalizeEndlessRunState(state);
  normalizeContractRuntime(state);
  normalizeDawnAuditorState(state);
  normalizeRoadWorldState(state);
  normalizeForensicNoirState(state);
  normalizeOperatorNoirState(state);
  normalizeBorderTransferState(state);
}
function renderAll() {
  evaluatePresentationState();
  const renderState = buildRenderState();
  renderTopbar(renderState);
  renderCurrentPriorityCard(renderState);
  renderNightEventCard(renderState);
  renderGuests(
    renderState,
    checkInGuest,
    flagGuest,
    rejectGuest,
    inspectGuestId,
    deepInspectGuest,
    requestGuestDeposit,
    requestSecondaryVerification,
    holdGuestForScreening,
    handleOpenSpecialEncounter,
    questionGuestFurther
  );
  renderRooms(
    renderState,
    resolveRoomServiceAction,
    reassignRoomGuest,
    lockDownRoom,
    callPoliceForRoom,
    cutPowerToRoom,
    evictRoomGuest
  );
  renderSharedSpaces(renderState);
  renderCameras(renderState);
  renderAnalogPowerExtras(renderState);
  renderPowerDigest(renderState);
  renderForensicShiftUi(renderState);
  renderOperatorNoirMount(renderState);
  renderBorderTransferMount(renderState);
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
  renderLogs(renderState);
  if (activeScreenId === 'failure-screen' && state?.failedState) {
    renderFailure(state.failedState, { deadDropOffer: buildDeadDropFailureOffer(metaState, state) });
  }
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

function handleQuickEndlessSetup() {
  if (activeScreenId !== 'main-menu') return;
  onMeaningfulAction();
  audioController.playUiClick();
  if (
    !confirmIfNeeded(
      'Switch Run Setup to Endless Shift (survival)? Your saved motel is unchanged until you start a shift. No finale cadence — waves, contracts, and scoring stack.'
    )
  ) {
    return;
  }
  setRunCampaignModeFromMenu('endless');
}

function handleMainMenuResetCampaign() {
  if (activeScreenId !== 'main-menu') return;
  onMeaningfulAction();
  audioController.playUiClick();
  if (
    !confirmIfNeeded(
      'Reset entire campaign to Night 1?\n\n• Deletes this SAVE SLOT (nights, money, rooms, evidence in the active ledger).\n• Keeps archive meta: perks, points, discovered endings, settings.\n• Cannot be undone.'
    )
  ) {
    return;
  }
  if (!confirmIfNeeded('Second confirmation: wipe this run completely and return to a clean Night 1 motel?')) {
    return;
  }
  startFreshCampaignRun({ skipConfirm: true });
}

function startFreshCampaignRun(options = {}) {
  if (!options?.skipConfirm) {
    if (
      !confirmIfNeeded(
        'Begin a fresh campaign from Night 1? Current run progress will be replaced. Archive progression and settings are kept.'
      )
    ) {
      return;
    }
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
  state.continueUsed = false;
  state.rooms = normalizeEscalationRooms(createDefaultRooms({ unlockedCap: getUnlockedRoomCapForNight(1) }));
  state.rooms = normalizeResponseRooms(state.rooms);
  state.rooms = normalizeTacticalRooms(state.rooms);
  state = normalizeRoomServiceState(state);
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
  ensureCrisisNightState(state);
  ensureCrisisEscalationState(state);
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
  state.dayShift = {
    selectedPlan: 'balanced',
    activeNightPlan: 'balanced',
    ownerPressure: 0,
    ownerMood: 'Watchful',
    ownerMemo: 'Ownership is waiting to see whether the motel grows or slips.',
    lastSettlement: 0,
    memoLines: [],
    staff: {
      focus: 'balanced',
      roster: STAFF_ROSTER_CATALOG.map((entry) => createStaffState(entry))
    },
    budget: getDefaultBudgetLedger(),
    management: getDefaultManagementState()
  };
  state.suspectBoard = {
    entries: [],
    namesSeen: [],
    marksSeen: [],
    vehiclesSeen: [],
    factionLabels: [],
    updatedNight: 0
  };
  state.linkedArrivalState = { pendingLead: null, recentGroups: [] };
  state.contentDirector = {};
  state.contentHistory = {};
  state.pendingRunCompletion = false;
  state.runEnding = null;
  state.metaRunState = {
    metaPerkApplied: false,
    rerollAvailable: false,
    rerollUsed: false,
    clueBoost: false,
    selectedPerkId: null,
    fourAmFixerUsed: false
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
  normalizeDeskInspectionState(state);
  captureNightStartSnapshot('fresh-campaign-night-open', { force: true });
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
    message: `Night ${Math.max(1, Number(state?.night || 1))} reset to its frozen opening state.`
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
  normalizeEndlessRunState(state);
  if (darkWebContractsEnabled(state)) {
    if (!String(state.endlessRun.selectedDarkContractId || '')) {
      const pick = pickDarkContractOffers(state, 1)[0];
      if (pick) {
        state.endlessRun.selectedDarkContractId = pick.id;
        state.endlessRun.lastContractId = pick.id;
      }
    }
    applyDarkContractRuntime(state, state.endlessRun.selectedDarkContractId);
    applyContractAnalogHooks(state);
    applyContractStaffHook(state);
    applyContractWeatherHook(state);
    rollDawnAuditor(state);
  } else {
    clearContractRuntime(state);
    rollDawnAuditor(state);
  }
  state.runModifiers = mergeDarkContractIntoRunModifiers(
    getRunSetupModifierProfile(state.runSetup),
    state.endlessRun.selectedDarkContractId
  );
  state.runSetupSummary = buildRunSetupSummary(state.runSetup);
  applyRunSetupStartModifiers();
  state.doctrine = beginDoctrineNight(state.doctrine || {});
  if (!state.activeStoryBeat) {
    maybeGenerateNightStoryBeat(state, state.night);
  }
  syncFinaleStateForNight({ refreshBranch: true });
  state.rooms = applyRoomUnlockFlags(state.rooms || [], state.night);
  state = normalizeRoomServiceState(state);
  refreshIntakeBudgetForNight(state);
  normalizeFinalWinterState(state);
  normalizeBasementSyndicate(state);
  evaluateBasementUnlock(state);
  normalizeIntakeState(state);
  normalizeDeskInspectionState(state);
  ensureCrisisNightState(state);
  ensureCrisisEscalationState(state);
  state.deferredShiftCosts = [];
  normalizeCampaignDepthState();
  normalizeStaffManagementState();
  pushLiveAlert(state, {
    type: 'info',
    message: `Shift started — Scenario: ${state?.activeScenario?.label || 'Standard Shift'}.`,
    dedupeKey: `scenario-start-${state.night}`
  });
  pushOpeningTensionBeat('shift-start');
  resetAnalogForNewShift(state);
  if (darkWebContractsEnabled(state)) {
    applyDarkContractRuntime(state, state.endlessRun.selectedDarkContractId);
    applyContractAnalogHooks(state);
    applyContractStaffHook(state);
    applyContractWeatherHook(state);
  }
  captureNightStartSnapshot('shift-start', { force: true });
  setActiveScreen('game-screen');
  setActivePanel('frontdesk-panel');
  updateOnboarding((current) => markTutorialEvent(current, 'shift-started'));
  renderAll();
}

// ============================================================
// v0.23 — RAID / CAMERA SABOTAGE / BURNER PHONE / ZONE BLACKOUT
// ============================================================

function triggerLostFoundClaimEvent() {
  state.activeNightEvent = buildLostFoundClaimNightEvent('desk property');
  state.nightEventOverlayOpen = false;
  state.logs.push('Someone is at the glass asking about lost property that never hit the official bin.');
  pushLiveAlert(state, {
    type: 'warning',
    kind: 'actionable',
    message: 'Lost property claim: a face at the desk insists the motel has something.',
    dedupeKey: `lost-claim-${state.night}`
  });
  renderAll();
}

function handleLostFoundClaimChoice(choiceId) {
  onMeaningfulAction();
  audioController.playUiClick();
  state.nightEventOverlayOpen = false;
  state.activeNightEvent = null;
  const res = resolveLostFoundClaimChoice(state, choiceId);
  if (Array.isArray(res.logs)) state.logs.push(...res.logs);
  if (progressShift('lost-claim', { timeScale: 0.18, skipPassiveDrain: true })) return;
  renderAll();
}

function triggerLotPayphoneEvent() {
  state.activeNightEvent = appendRoadPayphoneOptions(buildLotPayphoneNightEvent(), state);
  state.nightEventOverlayOpen = false;
  state.logs.push('Parking island payphone — a wet ring cuts across the lot.');
  pushLiveAlert(state, {
    type: 'warning',
    kind: 'actionable',
    message: 'Lot payphone ringing. Cannot answer from desk — send someone or let it die.',
    dedupeKey: `lot-payphone-open-${state.night}`
  });
  renderAll();
}

function handleLotPayphoneChoice(choiceId) {
  onMeaningfulAction();
  audioController.playUiClick();
  state.nightEventOverlayOpen = false;
  state.activeNightEvent = null;
  const result =
    choiceId === 'payphone-drifter-callback' || choiceId === 'payphone-false-trail'
      ? resolveRoadPayphoneOption(state, choiceId)
      : resolveLotPayphoneChoice(state, choiceId);
  if (!result?.ok) {
    renderAll();
    return;
  }
  if (Array.isArray(result.logs) && result.logs.length) {
    state.logs.push(...result.logs);
  }
  if (Array.isArray(result.alerts) && result.alerts.length) {
    result.alerts.forEach((msg, index) => {
      pushLiveAlert(state, {
        type: result.success ? 'info' : 'warning',
        message: msg,
        dedupeKey: `payphone-${state.night}-${choiceId}-${index}`
      });
    });
  }
  if (result.effects && Object.keys(result.effects).length) {
    applyNightEventPressureEffects(result.effects, 'lot-payphone');
  }
  if (result.success) {
    state.shiftStats.nightEventsResolved = (state.shiftStats.nightEventsResolved || 0) + 1;
  } else if (choiceId === 'send-runner' && !result.success) {
    state.shiftStats.nightEventsMissed = (state.shiftStats.nightEventsMissed || 0) + 1;
    if (Math.random() < 0.38) {
      markHoundInjury(state);
      state.logs.push('[Motel hound] The lot went wrong near the runner — the stray keeps its distance now, ribs showing.');
    }
  }
  if (progressShift('lot-payphone', { timeScale: 0.22, skipPassiveDrain: true })) return;
  renderAll();
}

function triggerPoliceRaidEvent() {
  maybeBurnDrifterNetwork(state);
  bumpRoadHeat(state, 1.2, 'Blue lights narrative tightens — the route knows your sign now.');
  state.activeNightEvent = {
    id: 'police-raid',
    title: 'Police Raid — 5:45 AM Sweep',
    description: 'Officers are inbound for an end-of-night sweep. Dirty activity at this property triggered a coordinated raid. Respond before 6:00 AM.',
    severity: 'high',
    options: [
      {
        id: 'raid-comply',
        label: 'Comply — Cooperate fully',
        preview: '−12 reputation, raid clears cleanly',
        description: 'Open the books and let officers search. A clean showing limits fallout.',
        note: 'Flagged guests may be questioned. Reputation hit is unavoidable but controlled.'
      },
      {
        id: 'raid-evacuate',
        label: 'Evacuate — Move the problem guests',
        preview: '−$40 fee, all flagged rooms vacated',
        description: 'Evict every flagged room immediately. The property looks clean when officers arrive.',
        note: 'Money cost is immediate. Reputation is mostly protected if done before dawn.'
      },
      {
        id: 'raid-stall',
        label: 'Stall — Hope for the best',
        preview: 'Auto-resolves at 6 AM with heavy penalty if ignored',
        description: 'Do nothing. Officers may find nothing actionable before shift close.',
        note: 'Very risky. Heavy reputation loss if unresolved at dawn.'
      }
    ]
  };
  state.raidStatus = 'pending';
  state.nightEventOverlayOpen = true;
  pushLiveAlert(state, {
    type: 'danger',
    message: 'POLICE RAID — 5:45 AM sweep triggered. Officers inbound. Respond before dawn.',
    dedupeKey: 'raid-incoming-night-' + state.night
  });
  state.logs.push('Police raid triggered at 5:45 AM. Accumulated dirty pressure drew law enforcement attention.');
  renderAll();
}

function handleRaidChoice(choiceId) {
  state.nightEventOverlayOpen = false;
  state.activeNightEvent = null;
  if (choiceId === 'raid-comply') {
    state.reputation = Math.max(0, (state.reputation || 50) - 12);
    state.raidStatus = 'resolved-comply';
    state.dirtyPressure = Math.max(0, (state.dirtyPressure || 0) - 3);
    state.logs.push('You cooperated with the police raid. Officers swept the property. Reputation took a hit but the motel avoided escalation.');
    pushLiveAlert(state, {
      type: 'warning',
      message: 'Raid resolved: cooperated. −12 reputation. Motel clear.',
      dedupeKey: 'raid-resolved-comply'
    });
  } else if (choiceId === 'raid-evacuate') {
    state.money = Math.max(0, (state.money || 0) - 40);
    state.raidStatus = 'resolved-evacuate';
    state.dirtyPressure = Math.max(0, (state.dirtyPressure || 0) - 4);
    (state.rooms || []).forEach((room, idx) => {
      if (room.occupied && room.deskFlagged) {
        state.rooms[idx] = {
          ...room,
          occupied: false,
          occupiedBy: null,
          guestName: null,
          condition: 'Vacant',
          deskFlagged: false,
          serviceState: getDefaultRoomServiceState()
        };
        state.logs.push('Room ' + room.label + ': flagged guest evacuated before raid sweep.');
      }
    });
    pushLiveAlert(state, {
      type: 'warning',
      message: 'Raid avoided: flagged rooms evacuated. −$40 coordination cost.',
      dedupeKey: 'raid-resolved-evacuate'
    });
  } else if (choiceId === 'raid-stall') {
    state.raidStatus = 'pending';
    pushLiveAlert(state, {
      type: 'danger',
      message: 'You chose to stall. Heavy penalties at 6:00 AM if unresolved.',
      dedupeKey: 'raid-stall-chosen'
    });
  }
  if (progressShift('raid-response', { timeScale: 0.2, skipPassiveDrain: true })) return;
  renderAll();
}

function triggerCameraSabotageEvent() {
  const clearCameras = (state.cameras || []).filter((cam) => !cam.blindMode);
  if (!clearCameras.length) return;
  const target = clearCameras[Math.floor(Math.random() * clearCameras.length)];

  // v0.26: multiple sabotage types
  const SABOTAGE_TYPES = [
    {
      type: 'feed-loop',
      blindMode: 'sabotage',
      status: 'Looping',
      label: 'Feed Loop Detected',
      desc: `The ${target.name} camera is replaying an earlier segment. The feed looks active but the scene is static — you can\'t trust what you\'re seeing.`,
      repairLabel: 'Force-restart feed (−8 power)',
      ignoreLabel: 'Watch anyway — may miss real movement'
    },
    {
      type: 'planted-calm',
      blindMode: 'sabotage',
      status: 'False-Calm',
      label: 'Planted Calm Scene',
      desc: `The ${target.name} feed looks suspiciously clear. No movement, no anomaly — but the zone is active. Someone replaced or looped the clean frame.`,
      repairLabel: 'Dispatch check — reset the feed (−8 power)',
      ignoreLabel: 'Trust the feed — accept the risk'
    },
    {
      type: 'blind-zone',
      blindMode: 'sabotage',
      status: 'Blind',
      label: 'Cable Cut — Blind Zone',
      desc: `The ${target.name} camera feed is gone entirely. Physical cut — not a software issue. Zone is completely dark until maintenance restores the line.`,
      repairLabel: 'Emergency maintenance — restore line (−8 power)',
      ignoreLabel: 'Accept blind zone for the rest of the shift'
    },
    {
      type: 'delayed-frame',
      blindMode: 'sabotage',
      status: 'Delayed',
      label: 'Delayed Frame Feed',
      desc: `The ${target.name} camera is showing footage from 3–4 minutes ago. You\'re watching history, not now. Zone activity is invisible in real time.`,
      repairLabel: 'Force-sync feed (−8 power)',
      ignoreLabel: 'Use the delayed feed — limited intel only'
    }
  ];
  const sab = SABOTAGE_TYPES[Math.floor(Math.random() * SABOTAGE_TYPES.length)];

  state.cameras = (state.cameras || []).map((cam) =>
    cam.id === target.id ? { ...cam, blindMode: sab.blindMode, sabotageType: sab.type, status: sab.status } : cam
  );
  state.activeNightEvent = {
    id: 'camera-sabotage',
    title: `Camera Sabotage — ${target.name}: ${sab.label}`,
    description: sab.desc,
    sabotageType: sab.type,
    severity: sab.type === 'blind-zone' ? 'high' : 'medium',
    options: [
      {
        id: 'sabotage-repair',
        label: sab.repairLabel,
        preview: '−8 power, camera restored',
        description: 'Restore the camera feed now.',
        note: 'Zone will be dark until maintenance arrives.'
      },
      {
        id: 'sabotage-ignore',
        label: sab.ignoreLabel,
        preview: sab.type === 'planted-calm' ? 'Feed stays — but is it real?' : 'Camera compromised for shift',
        description: 'Accept the current state and continue.',
        note: sab.type === 'planted-calm' ? 'You may be watching a false scene.' : 'Zone monitoring is compromised.'
      }
    ]
  };
  state.nightEventOverlayOpen = true;
  pushLiveAlert(state, {
    type: 'warning',
    message: `Camera sabotage: ${target.name} — ${sab.label}. Review and respond.`,
    dedupeKey: 'camera-sabotage-night-' + state.night
  });
  state.logs.push(`Camera sabotage: ${target.name} — ${sab.label}. A hostile faction compromised your surveillance.`);
  renderAll();
}

function handleCameraSabotageChoice(choiceId) {
  state.nightEventOverlayOpen = false;
  const sabotageEvent = state.activeNightEvent;
  state.activeNightEvent = null;
  const zoneName = (sabotageEvent?.title || '').replace('Camera Sabotage — ', '').replace(' Feed Lost', '');
  if (choiceId === 'sabotage-repair') {
    state.power = Math.max(0, (state.power || 100) - 8);
    state.cameras = (state.cameras || []).map((cam) =>
      cam.name === zoneName ? { ...cam, blindMode: null, status: 'Clear' } : cam
    );
    state.logs.push('Maintenance dispatched: ' + zoneName + ' camera feed restored. −8 power.');
    pushLiveAlert(state, {
      type: 'success',
      message: zoneName + ' camera restored. Feed back online.',
      dedupeKey: 'camera-repaired-' + state.night
    });
  } else {
    state.logs.push('Camera sabotage: ' + zoneName + ' left dark for the remainder of the shift.');
    pushLiveAlert(state, {
      type: 'warning',
      message: zoneName + ' camera remains dark — zone monitoring lost.',
      dedupeKey: 'camera-left-dark-' + state.night
    });
  }
  if (progressShift('camera-sabotage-response', { timeScale: 0.3, skipPassiveDrain: true })) return;
  renderAll();
}

function repairBlindCamera(cameraId) {
  onMeaningfulAction();
  audioController.playUiClick();
  const camIndex = (state.cameras || []).findIndex((cam) => cam.id === cameraId);
  if (camIndex === -1) return;
  const cam = state.cameras[camIndex];
  if (!cam.blindMode) return;
  if (state.power < 8) {
    pushLiveAlert(state, {
      type: 'warning',
      message: 'Not enough power to restore camera. Need at least 8%.',
      dedupeKey: 'camera-repair-no-power'
    });
    renderAll();
    return;
  }
  state.power = Math.max(0, state.power - 8);
  state.cameras[camIndex] = { ...cam, blindMode: null, blindCooldown: 0, status: 'Clear' };
  state.logs.push(cam.name + ' camera restored. Feed back online. −8 power.');
  pushLiveAlert(state, {
    type: 'success',
    message: cam.name + ' camera back online.',
    dedupeKey: 'camera-restored-' + cam.id
  });
  if (progressShift('camera-repair', { timeScale: 0.2, skipPassiveDrain: true })) return;
  renderAll();
}

function triggerBurnerPhoneEvent() {
  state.activeNightEvent = {
    id: 'burner-phone',
    title: 'Anonymous Contact — Burner Line',
    description: 'An unmarked number rang the desk line. A voice offers a "quiet arrangement" — cash in exchange for looking the other way on a specific room tonight. No names, no paperwork.',
    severity: 'medium',
    options: [
      {
        id: 'burner-accept',
        label: 'Accept — Take the money',
        preview: '+$60 cash, +2 dirty pressure',
        description: 'Pocket the payment. Nobody has to know.',
        note: 'Dirty pressure increases. Raid risk goes up for the rest of the shift.'
      },
      {
        id: 'burner-ignore',
        label: 'Ignore — Hang up',
        preview: 'No effect',
        description: 'Put the receiver down. Forget the call.',
        note: 'Neutral. The caller may try again another night.'
      },
      {
        id: 'burner-report',
        label: 'Report — Log the contact',
        preview: '+4 reputation, −$10 processing fee',
        description: 'File a report with the duty supervisor. Shows good-faith compliance.',
        note: 'Reputation gains. Dirty pressure decreases slightly.'
      }
    ]
  };
  state.nightEventOverlayOpen = true;
  pushLiveAlert(state, {
    type: 'warning',
    message: 'Anonymous contact on desk line. Suspicious offer — comply, ignore, or report.',
    dedupeKey: 'burner-phone-night-' + state.night
  });
  state.logs.push('Burner phone contact: anonymous caller offered a cash arrangement for discretion.');
  renderAll();
}

function handleBurnerPhoneChoice(choiceId) {
  state.nightEventOverlayOpen = false;
  state.activeNightEvent = null;
  if (choiceId === 'burner-accept') {
    state.money = (state.money || 0) + 60;
    state.dirtyPressure = Math.min(10, (state.dirtyPressure || 0) + 2);
    state.logs.push('You accepted the burner arrangement. +$60. Dirty pressure increased.');
    pushLiveAlert(state, {
      type: 'warning',
      message: 'Arrangement accepted. +$60. Raid risk elevated.',
      dedupeKey: 'burner-accepted'
    });
  } else if (choiceId === 'burner-ignore') {
    state.logs.push('Burner call ignored. No action taken.');
    pushLiveAlert(state, {
      type: 'info',
      message: 'Anonymous contact ignored.',
      dedupeKey: 'burner-ignored'
    });
  } else if (choiceId === 'burner-report') {
    state.money = Math.max(0, (state.money || 0) - 10);
    state.reputation = Math.min(100, (state.reputation || 50) + 4);
    state.dirtyPressure = Math.max(0, (state.dirtyPressure || 0) - 1);
    state.logs.push('Burner contact reported. +4 reputation. −$10 fee. Dirty pressure slightly reduced.');
    pushLiveAlert(state, {
      type: 'success',
      message: 'Contact reported. +4 reputation. Clean record noted.',
      dedupeKey: 'burner-reported'
    });
  }
  if (progressShift('burner-response', { timeScale: 0.15, skipPassiveDrain: true })) return;
  renderAll();
}

function triggerUnknownCallerEvent() {
  const hasHostileRoom = (state.rooms || []).some((r) => r.occupied && Number(r.serviceState?.hostility || 0) >= 2);
  const hasFactionGuest = (state.guests || []).some((g) => g.factionProfile?.id);
  const dirtyPressure = Number(state.dirtyPressure || 0);
  const pressure = state?.uiPressureLevel || 'calm';
  const priorClean = Number(state?.socialReputation?.cleanHandlings || 0);
  const priorHarsh = Number(state?.socialReputation?.harshHandlings || 0);
  const nightNum = Number(state?.night || 1);

  let callType = 'warning';
  let callTitle = 'Unknown Caller — Warning Signal';
  let callDesc = '"Something is off tonight. You don\'t need to know who I am to believe what I\'m saying: check the rear exit before midnight." Silence.';

  if (dirtyPressure >= 3 || pressure === 'emergency') {
    callType = 'threat';
    callTitle = 'Unknown Caller — Direct Threat';
    callDesc = '"You know what you\'ve been doing. Don\'t think we haven\'t noticed. Tonight is your last chance to make the right call." The line goes dead.';
  } else if (hasFactionGuest) {
    callType = 'bait';
    callTitle = 'Unknown Caller — Suspicious Offer';
    callDesc = '"One of your guests tonight isn\'t a guest. We can tell you which room, for a price. $80 — check the parking lot drop point." Click.';
  } else if (hasHostileRoom) {
    callType = 'misdirect';
    callTitle = 'Unknown Caller — False Lead';
    callDesc = '"You\'re watching the wrong zone. The real problem isn\'t where you think it is." Before you can ask, the line cuts.';
  } else if (priorHarsh >= 2 && nightNum >= 2) {
    callType = 'reference';
    callTitle = 'Unknown Caller — References Prior Night';
    callDesc = '"You turned away three people last time. Word spreads quickly in this area. Tonight, someone will push back." Dial tone.';
  } else if (priorClean >= 3) {
    callType = 'warning';
    callTitle = 'Unknown Caller — Unusual Warning';
    callDesc = '"You\'ve been doing fine. But what happened in Room 3 two nights ago is still unresolved. Someone is coming back for it." Click.';
  }

  const options = [
    {
      id: 'caller-log',
      label: 'Log the contact — note the number',
      preview: 'Logged. Pattern on record.',
      description: 'Document the call. Adds to overnight surveillance record.',
      note: 'No cost. May be referenced in dawn summary.'
    },
    {
      id: 'caller-dismiss',
      label: 'Dismiss — hang up',
      preview: 'No effect',
      description: 'Put it out of your mind. Could be nothing.',
      note: 'Neutral. No cost either way.'
    }
  ];
  if (callType === 'bait') {
    options.push({
      id: 'caller-comply-bait',
      label: 'Check the parking lot drop point',
      preview: '50% chance: +$80, +1 dirty pressure',
      description: 'Follow the instruction. The money might be there — or you might be walking into something.',
      note: 'Risk: dirty pressure increase. Partial odds.'
    });
  }

  state.activeNightEvent = {
    id: 'unknown-caller',
    title: callTitle,
    description: callDesc,
    callType,
    severity: callType === 'threat' ? 'high' : 'medium',
    options
  };
  state.nightEventOverlayOpen = true;
  state.logs.push(`Unknown caller contact: ${callTitle.replace('Unknown Caller — ', '').toLowerCase()}.`);
  pushLiveAlert(state, {
    type: callType === 'threat' ? 'danger' : 'warning',
    message: `Unknown caller made contact. ${callType === 'threat' ? 'Threatening tone.' : 'Review the message.'}`,
    dedupeKey: 'unknown-caller-night-' + state.night
  });
  renderAll();
}

function handleUnknownCallerChoice(choiceId) {
  state.nightEventOverlayOpen = false;
  const callerEvent = state.activeNightEvent;
  state.activeNightEvent = null;
  const callType = callerEvent?.callType || 'warning';

  if (choiceId === 'caller-log') {
    state.logs.push('Unknown caller contact logged. Pattern added to surveillance record.');
    state.unknownCallerLogged = true;
    addEvidenceItem('caller-log-entry', state.night);
    pushLiveAlert(state, { type: 'info', message: 'Anonymous contact logged. Pattern on record.', dedupeKey: 'caller-logged' });
  } else if (choiceId === 'caller-dismiss') {
    state.logs.push('Unknown caller dismissed. No action taken.');
    pushLiveAlert(state, { type: 'info', message: 'Call dismissed.', dedupeKey: 'caller-dismissed' });
  } else if (choiceId === 'caller-comply-bait') {
    if (Math.random() < 0.5) {
      state.money = (state.money || 0) + 80;
      state.dirtyPressure = Math.min(10, (state.dirtyPressure || 0) + 1);
      state.logs.push('Parking lot drop point found. +$80. Dirty pressure increased. This will be noted.');
      pushLiveAlert(state, { type: 'warning', message: '+$80 from anonymous drop. Dirty pressure up.', dedupeKey: 'caller-bait-success' });
    } else {
      state.logs.push('Parking lot empty. No money. No one there. The call was misdirection.');
      pushLiveAlert(state, { type: 'info', message: 'Lot empty. Caller was misdirecting.', dedupeKey: 'caller-bait-fail' });
    }
  }

  if (!state.unknownCallerHistory) state.unknownCallerHistory = [];
  state.unknownCallerHistory.push({ night: state.night, callType, choice: choiceId });

  if (progressShift('unknown-caller-response', { timeScale: 0.15, skipPassiveDrain: true })) return;
  renderAll();
}

function performRadioInterception() {
  onMeaningfulAction();
  audioController.playUiClick();
  if (state.radioInterceptionUsed) {
    pushLiveAlert(state, { type: 'warning', message: 'Radio interception already used this shift.', dedupeKey: 'intercept-used' });
    renderAll();
    return;
  }
  if (state.activeNightEvent) {
    pushLiveAlert(state, { type: 'warning', message: 'Resolve the active event before intercepting.', dedupeKey: 'intercept-busy' });
    renderAll();
    return;
  }
  if ((state.power || 0) < 5) {
    pushLiveAlert(state, { type: 'warning', message: 'Insufficient power for radio interception (−5 required).', dedupeKey: 'intercept-nopow' });
    renderAll();
    return;
  }
  state.power = Math.max(0, (state.power || 100) - 5);
  state.radioInterceptionUsed = true;

  const hasFactionGuest = (state.guests || []).some((g) => g.factionProfile?.id);
  const pressure = state?.uiPressureLevel || 'calm';
  const scannerCount = Array.isArray(state.localScannerFeed) ? state.localScannerFeed.length : 0;
  const successChance = Math.max(0.3, Math.min(0.82,
    0.48 + (hasFactionGuest ? 0.14 : 0) + (['tense','dire','emergency'].includes(pressure) ? 0.1 : 0) + (scannerCount >= 3 ? 0.08 : 0)
  ));

  const TRANSMISSIONS = [
    { type: 'faction', text: 'Partial intercept: "...confirmed in that room... rear exit... after 2 AM..."', impact: 'warning' },
    { type: 'faction', text: 'Partial intercept: "...watcher filed report... management watching lot... move now..."', impact: 'warning' },
    { type: 'misdirect', text: 'Partial intercept: "...tell them nothing changed... if they check cam 3 just stay calm..."', impact: 'warning' },
    { type: 'tip', text: 'Partial intercept: "...second car in lot is moving too early... they\'re not waiting for the contact..."', impact: 'info' },
    { type: 'threat', text: 'Partial intercept: "...night manager is checking files. Problem. Handle it quietly."', impact: 'danger' },
    { type: 'caller', text: 'Partial intercept: "...they don\'t know what we left in room 6. Keep them busy at the desk."', impact: 'warning' },
    { type: 'faction', text: 'Partial intercept: "...third return this week... motel doesn\'t recognize the pattern yet..."', impact: 'info' }
  ];
  const t = TRANSMISSIONS[Math.floor(Math.random() * TRANSMISSIONS.length)];

  const interceptSuccess = Math.random() < successChance;
  if (interceptSuccess) {
    state.logs.push(`Radio intercept (−5 power): ${t.text}`);
    pushLiveAlert(state, {
      type: t.impact,
      message: `Intercept recovered: ${t.text}`,
      dedupeKey: 'radio-intercept-' + state.night
    });
    addEvidenceItem('intercept-success', state.night);
  } else {
    state.logs.push('Radio intercept (−5 power): heavy static — no usable signal recovered.');
    pushLiveAlert(state, { type: 'info', message: 'Radio intercept: static only. −5 power consumed.', dedupeKey: 'radio-intercept-fail-' + state.night });
  }

  if (progressShift('radio-intercept', { timeScale: 0.2, skipPassiveDrain: true })) return;
  renderAll();
}

// ─── v0.27 Evidence Locker & Nemesis ─────────────────────────

function normalizeEvidenceLockerState(targetState = state) {
  if (!targetState) return;
  if (!targetState.evidenceLocker || typeof targetState.evidenceLocker !== 'object') {
    targetState.evidenceLocker = { items: [], mysteryFragmentsFound: 0 };
  }
  if (!Array.isArray(targetState.evidenceLocker.items)) targetState.evidenceLocker.items = [];
  if (typeof targetState.evidenceLocker.mysteryFragmentsFound !== 'number') {
    targetState.evidenceLocker.mysteryFragmentsFound = 0;
  }
}

function normalizeNemesisState(targetState = state) {
  if (!targetState) return;
  if (!targetState.nemesis || typeof targetState.nemesis !== 'object') {
    targetState.nemesis = {
      active: false,
      identified: false,
      styleKey: null,
      pressureLevel: 0,
      lastNight: 0,
      resolvedOutcome: null
    };
  }
}

function addEvidenceItem(triggerId, night = null, contextLabel = '') {
  normalizeEvidenceLockerState();
  const item = buildEvidenceItem(triggerId, night !== null ? night : (state.night || 1), contextLabel);
  if (!item) return;
  const existing = state.evidenceLocker.items;
  // prevent duplicate template per night (same label if contextual)
  const alreadyThisNight = existing.some(
    (e) =>
      e.templateId === triggerId &&
      e.night === item.night &&
      (!contextLabel || String(e.label || '') === String(item.label || ''))
  );
  if (alreadyThisNight) return;
  state.evidenceLocker.items = [...existing, item].slice(-32);
}

function maybeActivateNemesis(targetState = state) {
  normalizeNemesisState(targetState);
  normalizeCallerThreadState(targetState);
  if (targetState.nemesis.active || targetState.nemesis.resolvedOutcome) return;
  const night = Math.max(1, Number(targetState.night || 1));
  if (night < 3) return;
  const huntWins = Number(targetState?.callerThread?.huntNightWins || 0);
  const huntLosses = Number(targetState?.callerThread?.huntNightLosses || 0);
  const callerCount = Array.isArray(targetState.unknownCallerHistory) ? targetState.unknownCallerHistory.length : 0;
  const styleMemory = targetState?.callerThread?.styleMemory || {};
  const dominantStyle = getDominantCallerStyle(targetState);
  const dominantScore = Number(styleMemory[dominantStyle] || 0);
  // Activate when caller keeps escalating or hunt nights become recurring
  const shouldActivate =
    (huntWins + huntLosses >= 2) ||
    (callerCount >= 3 && dominantScore >= 4) ||
    (night >= 5 && callerCount >= 2);
  if (!shouldActivate) return;
  targetState.nemesis.active = true;
  targetState.nemesis.styleKey = dominantStyle;
  targetState.nemesis.pressureLevel = 1;
  targetState.nemesis.lastNight = night;
  targetState.logs.push('Nemesis pattern confirmed: a consistent presence has been profiling your management style across multiple shifts.');
  pushLiveAlert(targetState, {
    type: 'danger',
    message: 'Nemesis active: a recurring adversary has built a profile on your patterns. Hunt nights ahead may target your blind spots.',
    dedupeKey: `nemesis-activate-${night}`
  });
}

function escalateNemesisPressure(targetState = state) {
  normalizeNemesisState(targetState);
  if (!targetState.nemesis.active || targetState.nemesis.resolvedOutcome) return;
  const prevLevel = Number(targetState.nemesis.pressureLevel || 0);
  targetState.nemesis.pressureLevel = Math.min(3, prevLevel + 1);
  targetState.nemesis.lastNight = Math.max(1, Number(targetState.night || 1));
  if (targetState.nemesis.pressureLevel >= 3 && prevLevel < 3) {
    const conv = evaluateCampaignConvergence(targetState);
    if (conv.tier >= 3) {
      pushLiveAlert(targetState, {
        type: 'warning',
        message:
          'Nemesis climax: the pattern presses hardest while ledger dirt, town eyes, and Room 9 echoes all pull at the same desk.',
        dedupeKey: `nemesis-convergence-${targetState.night}`
      });
    }
  }
}

function resolveNemesis(outcome = 'contained', targetState = state) {
  normalizeNemesisState(targetState);
  if (!targetState.nemesis.active) return;
  targetState.nemesis.active = false;
  targetState.nemesis.identified = true;
  targetState.nemesis.resolvedOutcome = outcome;
  const msg = outcome === 'contained'
    ? 'Nemesis pattern disrupted: the recurring adversary\'s access has been cut after hunt night containment.'
    : outcome === 'escaped'
      ? 'Nemesis pattern unresolved: the recurring presence withdrew but left no clear resolution.'
      : 'Nemesis status unclear: pressure faded without decisive action.';
  targetState.logs.push(msg);
  pushLiveAlert(targetState, {
    type: outcome === 'contained' ? 'info' : 'warning',
    message: msg,
    dedupeKey: `nemesis-resolve-${targetState.night}`
  });
}

function triggerFrontDeskBreachEvent() {
  if (state.activeNightEvent) return;
  const night = Math.max(1, Number(state.night || 1));
  const nemesisActive = Boolean(state.nemesis?.active);
  const pressure = state?.uiPressureLevel || 'calm';
  const collapseBreach =
    night >= 4 &&
    (Boolean(state?.crisisNight?.trueCrisisNight) || Number(state?.crisisNight?.convergenceTier || 0) >= 3);
  const eligible =
    night >= 3 &&
    (['high', 'critical', 'emergency', 'dire'].includes(pressure) || nemesisActive || collapseBreach);
  if (!eligible) return;

  const collapseBreachDesc = Boolean(state?.crisisNight?.trueCrisisNight)
    ? 'Convergence night — the building is already loud elsewhere. Someone uses the chaos to slip the desk rail. They are in the restricted area and your board is exposed.'
    : collapseBreach
      ? 'Outside threads are already loud — someone exploits the thin seam at the desk rail. They are in the restricted area; your board is exposed.'
      : 'Someone has pushed through the desk barrier. They are in the restricted area — they\'ve seen your board. You have seconds to act.';

  state.activeNightEvent = {
    id: 'front-desk-breach',
    title: 'Front Desk Breach',
    description: collapseBreachDesc,
    severity: 'high',
    options: [
      {
        id: 'breach-lock-out',
        label: 'Force them out immediately',
        preview: '−5 reputation, −3 power',
        description: 'Physical removal. Fast but aggressive — the motel hears this.',
        note: 'Risk: reputaion cost. Stops breach cleanly.'
      },
      {
        id: 'breach-call-staff',
        label: 'Call for staff backup',
        preview: '−$12, moderate time cost',
        description: 'Escalate through channels. Staff contain the situation professionally.',
        note: 'Money cost. Slower but cleaner outcome.'
      },
      {
        id: 'breach-let-through',
        label: 'Do nothing — let them pass',
        preview: '+2 dirty pressure, −8 reputation',
        description: 'They see everything on your board. The cost comes later.',
        note: 'High risk. Dirty pressure + reputation damage.'
      }
    ]
  };
  state.nightEventOverlayOpen = true;
  state.logs.push('Front desk breach: unauthorized access to restricted area — immediate response required.');
  pushLiveAlert(state, {
    type: 'danger',
    message: 'Front Desk Breach: unauthorized person in restricted zone. Respond now.',
    dedupeKey: `breach-${night}`
  });
  audioController.playEmergencyPulse('high');
  renderAll();
}

function handleFrontDeskBreachChoice(choiceId) {
  state.nightEventOverlayOpen = false;
  state.activeNightEvent = null;

  if (choiceId === 'breach-lock-out') {
    state.reputation = Math.max(0, (state.reputation || 50) - 5);
    state.power = Math.max(0, (state.power || 100) - 3);
    addEvidenceItem('breach-contained', state.night);
    if (state.nemesis?.active) escalateNemesisPressure();
    state.logs.push('Breach resolved: physical removal. Reputation impact registered. Board contents exposed briefly.');
    pushLiveAlert(state, { type: 'warning', message: 'Breach contained by force. −5 rep, −3 power.', dedupeKey: 'breach-lockout-done' });
    applyIdentityImpact({ doctrine: { control: 1, force: 1 }, factions: { guests: -1 }, reason: 'front-desk breach lockout' });
  } else if (choiceId === 'breach-call-staff') {
    const cost = 12;
    if ((state.money || 0) >= cost) {
      state.money = Math.max(0, (state.money || 0) - cost);
    }
    addEvidenceItem('breach-contained', state.night);
    state.logs.push(`Breach resolved via staff response. −$${cost}. Handled professionally.`);
    pushLiveAlert(state, { type: 'info', message: `Breach resolved by staff. −$${cost}.`, dedupeKey: 'breach-staff-done' });
    applyIdentityImpact({ doctrine: { compassion: 1, stability: 1 }, factions: { staff: 1, ownership: 1 }, reason: 'front-desk breach staff response' });
  } else if (choiceId === 'breach-let-through') {
    state.dirtyPressure = Math.min(10, (state.dirtyPressure || 0) + 2);
    state.reputation = Math.max(0, (state.reputation || 50) - 8);
    if (state.nemesis?.active) escalateNemesisPressure();
    state.logs.push('Breach unchallenged: intruder had full desk access. Dirty pressure up. Reputation damage logged.');
    pushLiveAlert(state, { type: 'danger', message: 'Breach uncontested — +2 dirty pressure, −8 reputation.', dedupeKey: 'breach-ignored' });
    applyIdentityImpact({ doctrine: { improvisation: 1, stability: -1 }, factions: { ownership: -2, guests: -1 }, reason: 'front-desk breach ignored' });
  }

  if (progressShift('breach-response', { timeScale: 0.2, skipPassiveDrain: true })) return;
  renderAll();
}

function triggerDosRebootOverlay() {
  const existing = document.getElementById('v27-dos-reboot-overlay');
  if (existing) return;

  addEvidenceItem('dos-reboot-log', state.night);
  state.logs.push('System terminal rebooted unexpectedly. Prior session logs unavailable.');

  const overlay = document.createElement('div');
  overlay.id = 'v27-dos-reboot-overlay';
  overlay.className = 'v27-dos-reboot';

  const lines = [
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    'DEAD END MOTEL — DESK TERMINAL',
    'SYSTEM REINITIALIZING...',
    'RESTORING LAST STABLE SESSION...',
    `NIGHT ${state.night || 1} — SHIFT IN PROGRESS`,
    'WARNING: PRIOR LOG SEGMENT UNAVAILABLE',
    '> SESSION RESTORED_'
  ];

  const sep = document.createElement('div');
  sep.className = 'v27-dos-separator';
  sep.textContent = '══════════════════════════════════';
  overlay.appendChild(sep);

  lines.forEach((text, i) => {
    const line = document.createElement('div');
    line.className = 'v27-dos-line' + (i === lines.length - 1 ? ' dos-blink' : '');
    line.textContent = text;
    overlay.appendChild(line);
  });

  document.body.appendChild(overlay);
  setTimeout(() => { overlay.remove(); }, 3800);
}

// ─── end v0.27 ────────────────────────────────────────────────

function triggerZoneBlackout(cameraId) {
  onMeaningfulAction();
  audioController.playUiClick();
  const camIndex = (state.cameras || []).findIndex((cam) => cam.id === cameraId);
  if (camIndex === -1) return;
  const cam = state.cameras[camIndex];
  if (cam.blindMode) {
    pushLiveAlert(state, {
      type: 'warning',
      message: cam.name + ' zone is already dark.',
      dedupeKey: 'zone-already-dark-' + cameraId
    });
    renderAll();
    return;
  }
  state.cameras[camIndex] = { ...cam, blindMode: 'blackout', blindCooldown: 3, status: 'Blocked' };
  const affectedRooms = (state.rooms || []).filter((r) => r.occupied && Number(r.zoneId || 0) === cameraId);
  affectedRooms.forEach((room) => {
    const idx = state.rooms.findIndex((r) => r.id === room.id);
    if (idx !== -1 && state.rooms[idx].serviceState) {
      state.rooms[idx].serviceState.hostility = Math.max(0, (state.rooms[idx].serviceState.hostility || 0) - 1);
    }
  });
  const zones = state?.locationState?.zones || {};
  if (zones[cameraId]) {
    zones[cameraId].followupPressure = Math.max(0, Number(zones[cameraId].followupPressure || 0) - 1);
  }
  state.logs.push('Targeted blackout: ' + cam.name + ' zone power cut. Camera dark for ~3 actions. Hostile pressure in zone reduced.');
  pushLiveAlert(state, {
    type: 'info',
    message: cam.name + ' zone blacked out (tactical). Camera offline ~3 turns. Zone tension reduced.',
    dedupeKey: 'zone-blackout-' + cameraId
  });
  if (progressShift('zone-blackout', { timeScale: 0.3, skipPassiveDrain: false })) return;
  renderAll();
}

// ─── v0.28 Dirty Business / Shadow Systems ───────────────────

function normalizeDirtyState(targetState = state) {
  if (!targetState) return;
  if (!targetState.dirtyLedger || typeof targetState.dirtyLedger !== 'object') {
    targetState.dirtyLedger = {
      hiddenPayments: 0,
      offBookStays: 0,
      favorsAccepted: 0,
      deadDrops: 0,
      totalDirtyMoney: 0,
      dirtyScore: 0,
      lastActionNight: 0
    };
  }
  if (typeof targetState.dirtyLedger.dirtyScore !== 'number') {
    targetState.dirtyLedger.dirtyScore = Math.max(
      0,
      Number(targetState.dirtyLedger.offBookStays || 0) +
        Number(targetState.dirtyLedger.favorsAccepted || 0) +
        Number(targetState.dirtyLedger.deadDrops || 0) * 0.5
    );
  }
  if (typeof targetState.shadowRep !== 'number') targetState.shadowRep = 0;
  if (!targetState.bleedingWalkInState || typeof targetState.bleedingWalkInState !== 'object') {
    targetState.bleedingWalkInState = { offered: false, sheltered: false, rejected: false, huntersExpected: false, huntersFired: false, huntersNight: null, guestName: null };
  }
  if (!targetState.vendingDropState || typeof targetState.vendingDropState !== 'object') {
    targetState.vendingDropState = { available: false, offered: false, completed: false, paybackPending: false, paybackNight: null };
  }
}

function addDirtyCash(amount, reason = '') {
  normalizeDirtyState();
  const amt = Math.max(0, Number(amount || 0));
  if (!amt) return;
  state.money = Math.max(0, (state.money || 0) + amt);
  state.dirtyLedger.totalDirtyMoney += amt;
  state.dirtyLedger.hiddenPayments += 1;
  state.dirtyLedger.lastActionNight = state.night || 1;
  state.dirtyPressure = Math.min(10, (state.dirtyPressure || 0) + 1);
  addEvidenceItem('stained-cash-band', state.night);
  state.logs.push(`Hidden payment received: +$${amt}${reason ? ` (${reason})` : ''}. Off-book. Dirty pressure up.`);
}

function addToShadowRep(delta, reason = '') {
  normalizeDirtyState();
  const prev = Number(state.shadowRep || 0);
  state.shadowRep = Math.max(-10, Math.min(10, prev + Number(delta || 0)));
  if (Math.abs(delta) >= 1) {
    const dir = delta > 0 ? 'improved' : 'declined';
    state.logs.push(`Shadow reputation ${dir}: ${reason || 'off-book action recorded'} (${state.shadowRep > 0 ? '+' : ''}${state.shadowRep}).`);
  }
  // Ripple into nemesis and caller systems
  if (state.shadowRep <= -3 && state.nemesis?.active) {
    escalateNemesisPressure();
  }
}

function recordDirtyAction(type = 'generic', contextLabel = '') {
  normalizeDirtyState();
  state.dirtyLedger.lastActionNight = state.night || 1;
  if (type === 'off-book-stay') {
    state.dirtyLedger.offBookStays += 1;
    addEvidenceItem('off-book-register-note', state.night);
  } else if (type === 'favor-accepted') {
    state.dirtyLedger.favorsAccepted += 1;
    addEvidenceItem('burner-instruction-slip', state.night);
  } else if (type === 'dead-drop') {
    state.dirtyLedger.deadDrops += 1;
    addEvidenceItem('dead-drop-token', state.night);
  } else if (type === 'betrayal') {
    addEvidenceItem('hunter-vehicle-note', state.night);
  }
  // Torn ledger fragment when dirty actions accumulate
  const totalActions = state.dirtyLedger.offBookStays + state.dirtyLedger.favorsAccepted + state.dirtyLedger.deadDrops;
  if (totalActions >= 3) {
    addEvidenceItem('torn-ledger-fragment', state.night);
  }
}

// ── Bleeding Walk-In Event ─────────────────────

function triggerBleedingWalkInEvent() {
  if (state.activeNightEvent) return;
  normalizeDirtyState();
  if (state.bleedingWalkInState.offered) return;
  state.bleedingWalkInState.offered = true;

  const night = Math.max(1, Number(state.night || 1));
  const cashOffer = night >= 5 ? 160 : night >= 3 ? 120 : 80;
  const guestNames = ['A. Marsh', 'R. Selby', 'M. Croft', 'T. Hane', 'E. Pryce'];
  const guestName = guestNames[night % guestNames.length];
  state.bleedingWalkInState.guestName = guestName;

  state.activeNightEvent = {
    id: 'bleeding-walk-in',
    title: 'Walk-In — No ID, Needs Help',
    description: `Someone came through the rear entrance. Injured — not badly, but enough to notice. No reservation. No valid ID. They slid $${cashOffer} in cash across the desk. "Please. No receipt. I just need a room. No one needs to know." Their hands are shaking. Something outside is wrong.`,
    severity: 'high',
    cashOffer,
    guestName,
    options: [
      {
        id: 'walkin-shelter-paid',
        label: `Take the $${cashOffer} — put them in a room off-book`,
        preview: `+$${cashOffer} dirty, off-book stay, hunters in 1–2 nights`,
        description: 'No log entry. They get a room. The money is yours. But someone is looking for them.',
        note: 'Dirty cash. Shadow rep +1. Hunters expected next night.'
      },
      {
        id: 'walkin-log',
        label: 'Log them properly despite the missing ID',
        preview: '−3 reputation, legitimate record',
        description: 'Record it officially. The situation makes the paperwork uncomfortable, but it\'s clean.',
        note: 'Small rep cost. No dirty pressure. No hunters.'
      },
      {
        id: 'walkin-reject',
        label: 'Turn them away — cannot help',
        preview: '−1 reputation, no further consequence',
        description: 'You cannot take responsibility for this. They leave.',
        note: 'Clean exit. Minor rep cost.'
      },
      {
        id: 'walkin-route-risky',
        label: `Take the $${cashOffer} — route them to the lot annex`,
        preview: `+$${cashOffer} dirty, +2 dirty pressure, shadow rep −1`,
        description: 'The money is yours. You send them somewhere that isn\'t your problem — but should be.',
        note: 'Dirty cash. Betrayal read. Evidence risk.'
      }
    ]
  };
  state.nightEventOverlayOpen = true;
  state.logs.push(`Walk-in arrival: unregistered guest, no valid ID, $${cashOffer} cash offer. Midnight.`);
  pushLiveAlert(state, {
    type: 'danger',
    message: `Walk-in: someone needs a room, no ID, offering $${cashOffer} cash. Decide now.`,
    dedupeKey: `walkin-${night}`
  });
  audioController.playRedPhone();
  renderAll();
}

function handleBleedingWalkInChoice(choiceId) {
  state.nightEventOverlayOpen = false;
  const event = state.activeNightEvent;
  state.activeNightEvent = null;
  const cashOffer = event?.cashOffer || 80;
  const guestName = event?.guestName || 'Unknown';
  normalizeDirtyState();

  if (choiceId === 'walkin-shelter-paid') {
    addDirtyCash(cashOffer, 'walk-in shelter');
    addToShadowRep(1, 'sheltered a desperate walk-in');
    recordDirtyAction('off-book-stay', guestName);
    addEvidenceItem('hidden-guest-entry', state.night);
    state.bleedingWalkInState.sheltered = true;
    state.bleedingWalkInState.huntersExpected = true;
    const huntersIn = Math.random() < 0.55 ? 1 : 2;
    state.bleedingWalkInState.huntersNight = state.night + huntersIn;
    state.logs.push(`Off-book stay accepted: ${guestName} placed in room with no log. $${cashOffer} taken. Hunters expected Night ${state.bleedingWalkInState.huntersNight}.`);
    pushLiveAlert(state, { type: 'warning', message: `${guestName} housed off-book. Someone will come looking. +$${cashOffer} dirty.`, dedupeKey: 'walkin-shelter-done' });
    applyIdentityImpact({ doctrine: { secrecy: 2, compassion: 1, stability: -1 }, factions: { guests: 1, locals: -1 }, reason: 'walk-in sheltered off-book' });

  } else if (choiceId === 'walkin-log') {
    state.reputation = Math.max(0, (state.reputation || 50) - 3);
    state.bleedingWalkInState.sheltered = true;
    state.logs.push(`Walk-in logged officially: ${guestName}. No ID but full entry made. Reputation impact recorded.`);
    pushLiveAlert(state, { type: 'info', message: `${guestName} logged properly. −3 reputation.`, dedupeKey: 'walkin-logged' });
    applyIdentityImpact({ doctrine: { compassion: 2, control: -1 }, factions: { guests: 1 }, reason: 'walk-in logged despite no ID' });

  } else if (choiceId === 'walkin-reject') {
    state.reputation = Math.max(0, (state.reputation || 50) - 1);
    state.bleedingWalkInState.rejected = true;
    state.logs.push(`Walk-in turned away: ${guestName}. Guest left without incident. Small reputation cost.`);
    pushLiveAlert(state, { type: 'info', message: 'Walk-in turned away. −1 reputation.', dedupeKey: 'walkin-rejected' });
    applyIdentityImpact({ doctrine: { control: 1 }, factions: {}, reason: 'walk-in rejected at desk' });

  } else if (choiceId === 'walkin-route-risky') {
    addDirtyCash(cashOffer, 'walk-in rerouted');
    addToShadowRep(-1, 'rerouted a desperate person to a risky location');
    state.dirtyPressure = Math.min(10, (state.dirtyPressure || 0) + 1);
    addEvidenceItem('stained-cash-band', state.night);
    state.bleedingWalkInState.rejected = true;
    state.logs.push(`Walk-in rerouted: ${guestName} sent to lot annex. $${cashOffer} taken. Dirty pressure spiked. Betrayal logged.`);
    pushLiveAlert(state, { type: 'warning', message: `+$${cashOffer} dirty. ${guestName} rerouted to lot. +2 dirty pressure.`, dedupeKey: 'walkin-routed' });
    applyIdentityImpact({ doctrine: { secrecy: 1, force: 1, compassion: -2 }, factions: { locals: -1 }, reason: 'walk-in betrayed for cash' });
  }

  if (progressShift('walk-in-response', { timeScale: 0.2, skipPassiveDrain: true })) return;
  renderAll();
}

// ── Hunters Follow-Up ──────────────────────────

function triggerHuntersEvent() {
  if (state.activeNightEvent) return;
  normalizeDirtyState();
  if (state.bleedingWalkInState.huntersFired) return;
  state.bleedingWalkInState.huntersFired = true;

  const sheltered = state.bleedingWalkInState.sheltered;
  const guestName = state.bleedingWalkInState.guestName || 'the person';
  const shadowRep = Number(state.shadowRep || 0);

  state.activeNightEvent = {
    id: 'hunters',
    title: 'Hunters at the Desk',
    description: `Two people in civilian clothes. One slides a photo across the counter — poor quality, but it's ${guestName} from that night. "We're looking for someone. They may have passed through here recently. We'd like to see your registration log." Their posture says this isn't routine.`,
    severity: 'high',
    options: [
      {
        id: 'hunters-lie',
        label: 'Deny — no record of that person',
        preview: '+1 dirty pressure, shadow rep +1',
        description: 'You hold the line. No one by that description. They study you, then leave — for now.',
        note: shadowRep >= 2 ? 'Shadow rep helps — they half believe you.' : 'They may not fully believe you.'
      },
      {
        id: 'hunters-show-log',
        label: 'Show them the registration log',
        preview: sheltered ? '+2 dirty pressure (unlogged stay exposed)' : 'Clean — no issue',
        description: sheltered
          ? 'The log has no entry. They notice the gap. This creates a different kind of problem.'
          : 'The log is clean. They see the record, nod, and leave.',
        note: sheltered ? 'Risk: off-book stay exposed via absence.' : 'Safe if logged legitimately.'
      },
      {
        id: 'hunters-stall',
        label: 'Stall — give me a moment to check my records',
        preview: 'Moderate outcome, time pressure',
        description: 'Buy time. Check slowly. They\'re impatient. Something may slip.',
        note: 'Random outcome — may escalate or defuse.'
      },
      {
        id: 'hunters-call-police',
        label: 'Call the police — this feels wrong',
        preview: '+2 reputation, dirty pressure may surface',
        description: 'You flag the situation officially. They leave fast. But an audit could follow.',
        note: 'Clean outcome but potential dirty exposure if ledger is dirty.'
      }
    ]
  };
  state.nightEventOverlayOpen = true;
  state.logs.push(`Hunters arrived: two individuals asking about ${guestName}. Desk confrontation in progress.`);
  pushLiveAlert(state, {
    type: 'danger',
    message: `Hunters at the desk — asking about ${guestName}. Respond carefully.`,
    dedupeKey: `hunters-${state.night}`
  });
  audioController.playEmergencyPulse('high');
  renderAll();
}

function handleHuntersChoice(choiceId) {
  state.nightEventOverlayOpen = false;
  const event = state.activeNightEvent;
  state.activeNightEvent = null;
  const guestName = state.bleedingWalkInState?.guestName || 'the person';
  const sheltered = state.bleedingWalkInState?.sheltered || false;
  normalizeDirtyState();

  addEvidenceItem('hunter-vehicle-note', state.night);

  if (choiceId === 'hunters-lie') {
    state.dirtyPressure = Math.min(10, (state.dirtyPressure || 0) + 1);
    addToShadowRep(1, 'protected the walk-in from hunters');
    state.logs.push(`Hunters denied access: lied about ${guestName}. Dirty pressure up. Shadow rep improved. They left — for now.`);
    pushLiveAlert(state, { type: 'warning', message: 'Hunters turned away with a lie. +1 dirty pressure.', dedupeKey: 'hunters-lied' });
    applyIdentityImpact({ doctrine: { secrecy: 2, stability: -1 }, factions: { locals: -1 }, reason: 'lied to hunters at desk' });

  } else if (choiceId === 'hunters-show-log') {
    if (sheltered) {
      state.dirtyPressure = Math.min(10, (state.dirtyPressure || 0) + 2);
      addEvidenceItem('off-book-register-note', state.night);
      state.logs.push(`Hunters shown log: off-book stay gap noticed. Dirty pressure spiked. They know someone was here.`);
      pushLiveAlert(state, { type: 'danger', message: 'Log gap exposed — off-book stay visible. +2 dirty pressure.', dedupeKey: 'hunters-log-exposed' });
      applyIdentityImpact({ doctrine: { control: -1, stability: -1 }, factions: { ownership: -1 }, reason: 'off-book stay exposed to hunters' });
    } else {
      state.reputation = Math.max(0, (state.reputation || 50) + 1);
      state.logs.push(`Hunters shown clean log: guest was properly logged. They were satisfied and left.`);
      pushLiveAlert(state, { type: 'info', message: 'Log shown — clean record. Hunters satisfied.', dedupeKey: 'hunters-log-clean' });
    }

  } else if (choiceId === 'hunters-stall') {
    const outcome = Math.random();
    if (outcome < 0.4) {
      state.dirtyPressure = Math.min(10, (state.dirtyPressure || 0) + 1);
      state.logs.push(`Hunters stalled: time bought but they remained suspicious. Dirty pressure up slightly.`);
      pushLiveAlert(state, { type: 'warning', message: 'Stall failed — hunters still suspicious. +1 dirty pressure.', dedupeKey: 'hunters-stall-fail' });
    } else {
      state.logs.push(`Hunters stalled: they grew impatient and left. No immediate consequence.`);
      pushLiveAlert(state, { type: 'info', message: 'Hunters grew impatient and left. Stall worked.', dedupeKey: 'hunters-stall-win' });
    }
    applyIdentityImpact({ doctrine: { improvisation: 1, secrecy: 1 }, factions: {}, reason: 'stalled hunters' });

  } else if (choiceId === 'hunters-call-police') {
    state.reputation = Math.max(0, (state.reputation || 50) + 2);
    const hasDirty = (state.dirtyLedger?.totalDirtyMoney || 0) > 0 || (state.dirtyLedger?.offBookStays || 0) > 0;
    if (hasDirty) {
      state.dirtyPressure = Math.min(10, (state.dirtyPressure || 0) + 1);
      state.logs.push(`Hunters removed by police call: +2 reputation. Police audit risk due to dirty ledger activity.`);
      pushLiveAlert(state, { type: 'warning', message: 'Police called — hunters gone. Dirty ledger risk flagged in audit.', dedupeKey: 'hunters-police-dirty' });
    } else {
      state.logs.push(`Hunters removed by police call: +2 reputation. Clean audit.`);
      pushLiveAlert(state, { type: 'info', message: 'Police called — clean outcome. +2 reputation.', dedupeKey: 'hunters-police-clean' });
    }
    applyIdentityImpact({ doctrine: { control: 1, force: 1 }, factions: { authorities: 1, locals: -1 }, reason: 'called police on hunters' });
  }

  if (progressShift('hunters-response', { timeScale: 0.2, skipPassiveDrain: true })) return;
  renderAll();
}

// ── Vending Machine Dead Drop ──────────────────

function triggerVendingDeadDropEvent() {
  if (state.activeNightEvent) return;
  normalizeDirtyState();
  if (state.vendingDropState.offered || state.vendingDropState.completed) return;
  state.vendingDropState.offered = true;

  const night = Math.max(1, Number(state.night || 1));
  const payback = night >= 4 ? 100 : night >= 3 ? 75 : 50;

  state.activeNightEvent = {
    id: 'vending-dead-drop',
    title: 'Message in the Machine Panel',
    description: `Behind the vending machine panel: a folded note. "Leave your item in Slot B-4. Take what's there in return." The exchange is already staged. Whoever set this up expected the desk manager to be in play. The $${payback} payback is already in the slot.`,
    severity: 'medium',
    payback,
    options: [
      {
        id: 'drop-complete',
        label: `Use the drop — take the $${payback}`,
        preview: `+$${payback} dirty, shadow rep +1, dead drop evidence`,
        description: 'You play along. The cash is in the slot. Someone now knows you\'re part of this.',
        note: 'Dirty money. Dead drop logged. Evidence item added.'
      },
      {
        id: 'drop-ignore',
        label: 'Leave it — too risky',
        preview: 'No consequence',
        description: 'Walk away. The drop stays untouched.',
        note: 'Clean outcome.'
      },
      {
        id: 'drop-log-it',
        label: 'Document the note — log as suspicious',
        preview: '+1 reputation, evidence item, police awareness',
        description: 'Report the drop point. It becomes an official record.',
        note: 'Small rep boost. Evidence token documented cleanly.'
      }
    ]
  };
  state.nightEventOverlayOpen = true;
  state.logs.push(`Vending machine dead drop discovered: pre-staged exchange found at Machine Panel B-4.`);
  pushLiveAlert(state, {
    type: 'warning',
    message: 'Dead drop discovered in vending machine. Respond to the offer.',
    dedupeKey: `vending-drop-${night}`
  });
  renderAll();
}

function handleVendingDeadDropChoice(choiceId) {
  state.nightEventOverlayOpen = false;
  const event = state.activeNightEvent;
  state.activeNightEvent = null;
  const payback = event?.payback || 50;
  normalizeDirtyState();

  if (choiceId === 'drop-complete') {
    addDirtyCash(payback, 'vending dead drop');
    addToShadowRep(1, 'completed a vending machine dead drop');
    recordDirtyAction('dead-drop');
    state.vendingDropState.completed = true;
    state.logs.push(`Dead drop completed: $${payback} recovered from Machine Panel B-4. Drop token logged. Shadow rep up.`);
    pushLiveAlert(state, { type: 'warning', message: `Drop completed. +$${payback} dirty. You are now a known participant.`, dedupeKey: 'drop-done' });
    applyIdentityImpact({ doctrine: { secrecy: 2, improvisation: 1 }, factions: { locals: -1 }, reason: 'completed vending machine dead drop' });

  } else if (choiceId === 'drop-ignore') {
    state.logs.push('Vending drop ignored: exchange untouched.');
    pushLiveAlert(state, { type: 'info', message: 'Drop left alone. No consequence.', dedupeKey: 'drop-ignored' });

  } else if (choiceId === 'drop-log-it') {
    state.reputation = Math.max(0, (state.reputation || 50) + 1);
    addEvidenceItem('dead-drop-token', state.night);
    state.logs.push('Vending drop documented: token logged as suspicious activity. Reported to appropriate channel.');
    pushLiveAlert(state, { type: 'info', message: 'Drop note documented. +1 reputation. Evidence logged.', dedupeKey: 'drop-logged' });
    applyIdentityImpact({ doctrine: { control: 1, stability: 1 }, factions: { authorities: 1 }, reason: 'documented dead drop for authorities' });
  }

  if (progressShift('vending-drop-response', { timeScale: 0.15, skipPassiveDrain: true })) return;
  renderAll();
}

// ─── end v0.28 ────────────────────────────────────────────────

// ─── v0.29 Staff Paranoia / Traitor / Mutiny ─────────────────

function normalizeStaffV29(targetState = state) {
  if (!targetState || typeof targetState !== 'object') return;
  if (!targetState.staffIntel || typeof targetState.staffIntel !== 'object') {
    targetState.staffIntel = {
      compromisedId: null,
      compromisedNight: 0,
      compromisedSource: '',
      mutinyFired: false,
      insideLeakFired: false,
      dismissedId: null,
      suspicionHints: []
    };
  }
  if (!Array.isArray(targetState.staffIntel.suspicionHints)) {
    targetState.staffIntel.suspicionHints = [];
  }
  const roster = Array.isArray(targetState?.dayShift?.staff?.roster)
    ? targetState.dayShift.staff.roster : [];
  roster.forEach((member) => {
    if (typeof member.fear !== 'number') member.fear = 0;
    if (typeof member.loyalty !== 'number') member.loyalty = 0.70;
    if (typeof member.corrupted !== 'boolean') member.corrupted = false;
    if (typeof member.suspicionScore !== 'number') member.suspicionScore = 0;
    if (typeof member.badOutcomeCount !== 'number') member.badOutcomeCount = 0;
  });
}

function applyStaffFearDelta(role, delta) {
  normalizeStaffV29();
  const roster = Array.isArray(state?.dayShift?.staff?.roster) ? state.dayShift.staff.roster : [];
  const target = roster.find(
    (m) => String(getStaffCatalogEntry(m.id)?.role || '').toLowerCase() === String(role || '').toLowerCase() && m.active
  );
  if (!target) return;
  target.fear = Math.max(0, Math.min(1, Number(target.fear || 0) + Number(delta || 0)));
}

function applyStaffLoyaltyDelta(role, delta) {
  normalizeStaffV29();
  const roster = Array.isArray(state?.dayShift?.staff?.roster) ? state.dayShift.staff.roster : [];
  const target = roster.find(
    (m) => String(getStaffCatalogEntry(m.id)?.role || '').toLowerCase() === String(role || '').toLowerCase() && m.active
  );
  if (!target) return;
  target.loyalty = Math.max(0, Math.min(1, Number(target.loyalty || 0.70) + Number(delta || 0)));
}

function getCompromisedStaff(targetState = state) {
  normalizeStaffV29(targetState);
  const id = targetState.staffIntel?.compromisedId;
  if (!id) return null;
  return (targetState?.dayShift?.staff?.roster || []).find((m) => m.id === id) || null;
}

function maybeCompromiseStaff(targetState = state) {
  normalizeStaffV29(targetState);
  if (targetState.staffIntel.compromisedId || targetState.staffIntel.dismissedId) return;
  const night = Math.max(1, Number(targetState.night || 1));
  if (night < 2) return;

  const dirtyPressure = Number(targetState.dirtyPressure || 0);
  const dirtyTotal = Number(targetState.dirtyLedger?.totalDirtyMoney || 0);
  const factionGuestCount = (targetState.guests || []).filter((g) => g.factionProfile?.id).length;
  const nemesisActive = Boolean(targetState.nemesis?.active);
  const roster = Array.isArray(targetState?.dayShift?.staff?.roster) ? targetState.dayShift.staff.roster : [];
  const activeRoster = roster.filter((m) => m.active);
  const avgMorale = activeRoster.length
    ? activeRoster.reduce((s, m) => s + Number(m.morale || 0.56), 0) / activeRoster.length : 0.56;

  const conditions = [
    dirtyPressure >= 4 || dirtyTotal >= 80,
    factionGuestCount >= 2,
    nemesisActive && night >= 3,
    avgMorale < 0.28
  ];
  const conditionsMet = conditions.filter(Boolean).length;
  if (conditionsMet < 1) return;

  const baseChance = 0.10 + conditionsMet * 0.05;
  if (Math.random() > baseChance) return;

  const eligible = activeRoster.filter((m) => !m.corrupted && Number(m.loyalty || 0.70) < 0.80);
  if (!eligible.length) return;
  eligible.sort((a, b) => Number(a.loyalty || 0.70) - Number(b.loyalty || 0.70));
  const target = eligible[0];

  target.corrupted = true;
  const source = (dirtyPressure >= 4 || dirtyTotal >= 80) ? 'dirty'
    : factionGuestCount >= 2 ? 'faction'
    : nemesisActive ? 'nemesis'
    : 'morale';

  targetState.staffIntel.compromisedId = target.id;
  targetState.staffIntel.compromisedNight = night;
  targetState.staffIntel.compromisedSource = source;

  const base = getStaffCatalogEntry(target.id);
  const name = base?.name || 'staff';
  const role = base?.role || 'Staff';
  targetState.logs.push(`Internal irregularity: ${name} (${role}) — cross-check log shows dispatch inconsistency pattern.`);
  pushLiveAlert(targetState, {
    type: 'warning',
    message: `Staff irregularity flagged: ${name}'s recent dispatch logs don't fully add up.`,
    dedupeKey: `staff-compromised-n${night}`
  });
}

function buildStaffParanoiaModel(targetState = state) {
  normalizeStaffV29(targetState);
  const roster = Array.isArray(targetState?.dayShift?.staff?.roster) ? targetState.dayShift.staff.roster : [];
  const active = roster.filter((m) => m.active);
  const avgMorale = active.length
    ? active.reduce((s, m) => s + Number(m.morale || 0.56), 0) / active.length : 0.56;
  const avgFear = active.length
    ? active.reduce((s, m) => s + Number(m.fear || 0), 0) / active.length : 0;
  const avgLoyalty = active.length
    ? active.reduce((s, m) => s + Number(m.loyalty || 0.70), 0) / active.length : 0.70;
  const compId = targetState.staffIntel?.compromisedId;
  const dismissedId = targetState.staffIntel?.dismissedId;
  const mutinyFired = Boolean(targetState.staffIntel?.mutinyFired);

  const members = active.map((m) => {
    const base = getStaffCatalogEntry(m.id);
    const effectiveRel = clampStaffGauge(
      Number(base?.reliability || 0.65)
      - Number(m.fatigue || 0) * Number(base?.fatigueBias || 0.15)
      + (Number(m.morale || 0.56) - 0.5) * 0.18
      + (Number(m.loyalty || 0.70) - 0.5) * 0.10
      - Number(m.fear || 0) * 0.08,
      0.15, 0.95
    );
    const suspicious = compId === m.id;
    const moraleClass = Number(m.morale || 0.56) < 0.30 ? 'suspect'
      : Number(m.morale || 0.56) < 0.45 ? 'strained' : 'reliable';
    return {
      id: m.id,
      name: base?.name || 'Unknown',
      role: base?.role || 'Staff',
      morale: Math.round(Number(m.morale || 0.56) * 100),
      fear: Math.round(Number(m.fear || 0) * 100),
      loyalty: Math.round(Number(m.loyalty || 0.70) * 100),
      effectiveReliability: Math.round(effectiveRel * 100),
      suspicious,
      suspicionScore: Number(m.suspicionScore || 0),
      moraleClass,
      badOutcomeCount: Number(m.badOutcomeCount || 0)
    };
  });

  const avgMoralePct = Math.round(avgMorale * 100);
  const moodLabel = avgMoralePct < 28 ? 'Critical'
    : avgMoralePct < 40 ? 'Strained'
    : avgMoralePct < 60 ? 'Tense'
    : 'Stable';
  const moodClass = avgMoralePct < 28 ? 'is-suspect'
    : avgMoralePct < 42 ? 'is-strained'
    : 'is-reliable';

  return {
    members,
    avgMorale: avgMoralePct,
    avgFear: Math.round(avgFear * 100),
    avgLoyalty: Math.round(avgLoyalty * 100),
    moodLabel,
    moodClass,
    hasSuspect: Boolean(compId),
    hasDismissed: Boolean(dismissedId),
    mutinyFired,
    compromisedId: compId || null,
    dismissedId: dismissedId || null
  };
}

// ── Staff Mutiny / Refusal Event ──────────────

function triggerStaffMutinyEvent() {
  if (state.activeNightEvent) return;
  normalizeStaffV29();
  if (state.staffIntel.mutinyFired) return;
  state.staffIntel.mutinyFired = true;

  const roster = Array.isArray(state?.dayShift?.staff?.roster) ? state.dayShift.staff.roster : [];
  const active = roster.filter((m) => m.active).slice();
  active.sort((a, b) => Number(a.morale || 0.56) - Number(b.morale || 0.56));
  const worstMember = active[0];
  const base = worstMember ? getStaffCatalogEntry(worstMember.id) : null;
  const spokesperson = base?.name || 'A staff member';
  const role = base?.role || 'Staff';

  state.activeNightEvent = {
    id: 'staff-mutiny',
    title: 'Staff Walkout Warning',
    description: `${spokesperson} (${role}) stopped at the desk. Eyes down. "We need to talk about tonight. The pressure has been too high for too long. If things don't change right now, we're not going back out there." The hallway behind them is quiet. You can hear it in their voice — they mean it.`,
    severity: 'high',
    options: [
      {
        id: 'mutiny-pay-bonus',
        label: 'Pay the team a shift bonus — $30',
        preview: '+0.12 morale all active staff, −$30',
        description: 'Pull the emergency wage float. It buys goodwill and gets them moving again.',
        note: 'Costs $30. Morale and loyalty improve. Immediate resolution.'
      },
      {
        id: 'mutiny-stand-down',
        label: 'Stand them down — let them recover an hour',
        preview: 'Staff recover, morale +0.08, moderate pressure gap',
        description: 'Let them step back. The motel covers itself. They come back steadier.',
        note: 'No cost. Morale improves. Moderate pressure window during gap.'
      },
      {
        id: 'mutiny-force-deployment',
        label: 'Order them back — not optional',
        preview: 'Morale −0.12, loyalty −0.10, fear +0.10 — they comply but remember',
        description: 'You need the motel covered. They go. But this will leave a mark on the team.',
        note: 'Risk: morale and loyalty drop. Works short-term only.'
      },
      {
        id: 'mutiny-negotiate',
        label: 'Listen and negotiate — find a middle ground',
        preview: 'Morale +0.05, loyalty +0.05, no cost',
        description: 'Hear them out. Acknowledge what tonight has been. Work out something fair.',
        note: 'No money cost. Partial recovery. Builds longer-term team loyalty.'
      }
    ]
  };
  state.nightEventOverlayOpen = true;
  state.logs.push(`Staff walkout warning: ${spokesperson} (${role}) threatened to refuse deployment — team morale critical.`);
  pushLiveAlert(state, {
    type: 'danger',
    message: `Staff refusal: ${spokesperson} is refusing to deploy. Respond immediately.`,
    dedupeKey: `staff-mutiny-${state.night}`
  });
  audioController.playEmergencyPulse('high');
  renderAll();
}

function handleStaffMutinyChoice(choiceId) {
  state.nightEventOverlayOpen = false;
  state.activeNightEvent = null;
  normalizeStaffV29();

  const roster = Array.isArray(state?.dayShift?.staff?.roster) ? state.dayShift.staff.roster : [];
  const active = roster.filter((m) => m.active);

  if (choiceId === 'mutiny-pay-bonus') {
    const cost = 30;
    if ((state.money || 0) >= cost) {
      state.money = Math.max(0, state.money - cost);
      addBudgetCost('emergencies', cost, 'Emergency staff bonus — mutiny prevented.');
    }
    active.forEach((m) => {
      m.morale = clampStaffGauge(Number(m.morale || 0.56) + 0.12, 0.15, 1);
      m.loyalty = Math.min(1, Number(m.loyalty || 0.70) + 0.06);
      m.fear = Math.max(0, Number(m.fear || 0) - 0.06);
    });
    addEvidenceItem('staff-loyalty-record', state.night);
    state.logs.push(`Staff refusal resolved: emergency bonus paid. Team morale stabilized. −$${cost}.`);
    pushLiveAlert(state, { type: 'info', message: `Staff bonus paid. Mutiny resolved. −$${cost}.`, dedupeKey: 'mutiny-paid' });
    applyIdentityImpact({ doctrine: { compassion: 2, stability: 1 }, factions: { staff: 2, ownership: -1 }, reason: 'staff mutiny resolved with bonus' });

  } else if (choiceId === 'mutiny-stand-down') {
    active.forEach((m) => {
      m.morale = clampStaffGauge(Number(m.morale || 0.56) + 0.08, 0.15, 1);
      m.fear = Math.max(0, Number(m.fear || 0) - 0.08);
    });
    state.logs.push('Staff stood down for recovery: team pressure relieved. Motel runs lighter during the window.');
    pushLiveAlert(state, { type: 'info', message: 'Staff stood down. Morale recovering. Watch for pressure gaps.', dedupeKey: 'mutiny-standdown' });
    applyIdentityImpact({ doctrine: { compassion: 1, stability: -1 }, factions: { staff: 1 }, reason: 'staff stood down after mutiny warning' });

  } else if (choiceId === 'mutiny-force-deployment') {
    active.forEach((m) => {
      m.morale = clampStaffGauge(Number(m.morale || 0.56) - 0.12, 0.15, 1);
      m.loyalty = Math.max(0, Number(m.loyalty || 0.70) - 0.10);
      m.fear = Math.min(1, Number(m.fear || 0) + 0.10);
    });
    state.logs.push('Staff forced back to work: compliance obtained under pressure. Team condition now fragile and resentful.');
    pushLiveAlert(state, { type: 'warning', message: 'Staff forced back. Morale and loyalty dropped. Team is now fragile.', dedupeKey: 'mutiny-forced' });
    applyIdentityImpact({ doctrine: { control: 2, force: 1, compassion: -2 }, factions: { staff: -2, ownership: 1 }, reason: 'forced staff back after mutiny warning' });

  } else if (choiceId === 'mutiny-negotiate') {
    active.forEach((m) => {
      m.morale = clampStaffGauge(Number(m.morale || 0.56) + 0.05, 0.15, 1);
      m.loyalty = Math.min(1, Number(m.loyalty || 0.70) + 0.05);
      m.fear = Math.max(0, Number(m.fear || 0) - 0.04);
    });
    state.logs.push('Staff mutiny negotiated: honest conversation held. Night acknowledged. Partial morale recovery.');
    pushLiveAlert(state, { type: 'info', message: 'Negotiated with staff. Partial morale recovery. Long-term loyalty improved.', dedupeKey: 'mutiny-negotiated' });
    applyIdentityImpact({ doctrine: { compassion: 2, stability: 1 }, factions: { staff: 1 }, reason: 'staff mutiny resolved through negotiation' });
  }

  if (progressShift('staff-response', { timeScale: 0.2, skipPassiveDrain: true })) return;
  renderAll();
}

// ── Inside Leak / Internal Breach Event ───────

function triggerInsideLeakEvent() {
  if (state.activeNightEvent) return;
  normalizeStaffV29();
  if (state.staffIntel.insideLeakFired) return;
  const comp = getCompromisedStaff();
  if (!comp) return;
  state.staffIntel.insideLeakFired = true;

  const base = getStaffCatalogEntry(comp.id);
  const name = base?.name || 'a staff member';
  const role = base?.role || 'Staff';

  state.activeNightEvent = {
    id: 'inside-leak',
    title: 'Inside Access Suspected',
    description: `Camera 2 caught ${name} (${role}) at the rear hallway door at 1:40 AM — no dispatch was logged. Then you notice: a folded note tucked under Room 4. The scanner caught a transmission fragment that matches the desk log. Someone on your team may be feeding information outside.`,
    severity: 'high',
    suspectId: comp.id,
    suspectName: name,
    options: [
      {
        id: 'leak-confront',
        label: `Confront ${name} directly — right now`,
        preview: '60% confirm and remove, 40% denial — suspicion either cleared or confirmed',
        description: 'Pull them aside. Ask directly. Their reaction tells you something either way.',
        note: '60%: confession — dismissed, reliability gap, +2 rep. 40%: denial, suspicion stays.'
      },
      {
        id: 'leak-ignore',
        label: 'Ignore it — too disruptive to act tonight',
        preview: 'Suspicion persists, compromised staff continues operating, bad outcomes continue',
        description: 'You need everyone on shift. Deal with it after dawn.',
        note: 'Risk: irregular outcomes continue. Suspicion compounds over nights.'
      },
      {
        id: 'leak-report',
        label: 'Report it to ownership — their call to make',
        preview: '+3 reputation, +1 ownership faction, staff morale −0.08',
        description: 'You escalate through official channels. Ownership notices the transparency. The team atmosphere sours.',
        note: 'Clears your liability. Morale cost. Ownership trust improves.'
      }
    ]
  };
  state.nightEventOverlayOpen = true;
  state.logs.push(`Inside access suspected: ${name} (${role}) logged at rear door off-shift — no dispatch record. Possible internal leak.`);
  pushLiveAlert(state, {
    type: 'danger',
    message: `Inside job suspected: ${name} may be feeding information outside the motel.`,
    dedupeKey: `inside-leak-${state.night}`
  });
  addEvidenceItem('inside-job-note', state.night);
  audioController.playEmergencyPulse('high');
  renderAll();
}

function handleInsideLeakChoice(choiceId) {
  state.nightEventOverlayOpen = false;
  const event = state.activeNightEvent;
  state.activeNightEvent = null;
  normalizeStaffV29();

  const suspectId = event?.suspectId || state.staffIntel.compromisedId;
  const suspectName = event?.suspectName || 'the staff member';
  const comp = suspectId ? (state?.dayShift?.staff?.roster || []).find((m) => m.id === suspectId) : null;

  if (choiceId === 'leak-confront') {
    const success = Math.random() < 0.60;
    if (success) {
      if (comp) { comp.active = false; comp.corrupted = false; }
      state.staffIntel.dismissedId = suspectId;
      state.staffIntel.compromisedId = null;
      state.reputation = Math.max(0, (state.reputation || 50) + 2);
      addEvidenceItem('staff-loyalty-record', state.night);
      addEvidenceItem('overwritten-dispatch-note', state.night);
      state.logs.push(`Confrontation successful: ${suspectName} confessed and was removed from shift. +2 reputation. Reliability gap until dawn.`);
      pushLiveAlert(state, { type: 'warning', message: `${suspectName} removed. Leak contained. Reliability reduced for the night.`, dedupeKey: 'leak-confronted-success' });
      applyIdentityImpact({ doctrine: { control: 2, stability: 1 }, factions: { staff: -1, ownership: 2 }, reason: 'confronted and removed inside leak' });
    } else {
      if (comp) comp.suspicionScore = Math.min(10, (comp.suspicionScore || 0) + 2);
      state.logs.push(`Confrontation inconclusive: ${suspectName} denied involvement. Suspicion remains. They know you are watching.`);
      pushLiveAlert(state, { type: 'warning', message: `${suspectName} denied it. Suspicion persists.`, dedupeKey: 'leak-confronted-fail' });
      applyIdentityImpact({ doctrine: { control: 1 }, factions: {}, reason: 'inside leak confrontation inconclusive' });
    }

  } else if (choiceId === 'leak-ignore') {
    if (comp) comp.suspicionScore = Math.min(10, (comp.suspicionScore || 0) + 2);
    state.logs.push(`Inside access deferred: ${suspectName} remains on shift. Decision deferred until dawn review.`);
    pushLiveAlert(state, { type: 'info', message: 'Leak ignored for now. Compromised staff continues on shift.', dedupeKey: 'leak-ignored' });

  } else if (choiceId === 'leak-report') {
    state.reputation = Math.max(0, (state.reputation || 50) + 3);
    const active = (state?.dayShift?.staff?.roster || []).filter((m) => m.active);
    active.forEach((m) => { m.morale = clampStaffGauge(Number(m.morale || 0.56) - 0.08, 0.15, 1); });
    addEvidenceItem('payroll-discrepancy', state.night);
    state.logs.push(`Inside access reported to ownership: ${suspectName} flagged for investigation. +3 reputation. Staff atmosphere strained.`);
    pushLiveAlert(state, { type: 'info', message: `Ownership notified. +3 reputation. Staff morale dipped.`, dedupeKey: 'leak-reported' });
    applyIdentityImpact({ doctrine: { control: 1, stability: 1 }, factions: { ownership: 2, staff: -2 }, reason: 'reported inside leak to ownership' });
  }

  if (progressShift('leak-response', { timeScale: 0.2, skipPassiveDrain: true })) return;
  renderAll();
}

// ── Staff Trust Actions (player-initiated) ────

function payStaffBonus() {
  onMeaningfulAction();
  audioController.playUiClick();
  normalizeStaffV29();
  const cost = 20;
  if ((state.money || 0) < cost) {
    pushLiveAlert(state, { type: 'warning', message: 'Insufficient funds for staff bonus ($20 required).', dedupeKey: 'staff-bonus-funds' });
    renderAll();
    return;
  }
  state.money = Math.max(0, state.money - cost);
  addBudgetCost('emergencies', cost, 'Voluntary staff bonus: morale investment.');
  const roster = (state?.dayShift?.staff?.roster || []).filter((m) => m.active);
  roster.forEach((m) => {
    m.morale = clampStaffGauge(Number(m.morale || 0.56) + 0.08, 0.15, 1);
    m.loyalty = Math.min(1, Number(m.loyalty || 0.70) + 0.04);
  });
  applyIdentityImpact({ doctrine: { compassion: 1 }, factions: { staff: 1, ownership: -1 }, reason: 'voluntary staff bonus paid' });
  state.logs.push(`Staff bonus paid voluntarily: −$${cost}. Morale and loyalty improved across active roster.`);
  pushLiveAlert(state, { type: 'info', message: `Staff bonus: −$${cost}. Team morale improved.`, dedupeKey: 'staff-bonus-voluntary' });
  renderAll();
}

function dismissSuspectedStaff() {
  onMeaningfulAction();
  audioController.playUiClick();
  normalizeStaffV29();
  const compId = state.staffIntel?.compromisedId;
  if (!compId) {
    pushLiveAlert(state, { type: 'warning', message: 'No staff member is currently flagged for dismissal.', dedupeKey: 'dismiss-no-suspect' });
    renderAll();
    return;
  }
  const member = (state?.dayShift?.staff?.roster || []).find((m) => m.id === compId);
  if (!member) return;
  const base = getStaffCatalogEntry(compId);
  const name = base?.name || 'staff member';
  const role = base?.role || 'Staff';

  const cost = 30;
  state.money = Math.max(0, (state.money || 0) - cost);
  addBudgetCost('emergencies', cost, `Severance: ${name} dismissed mid-shift.`);
  member.active = false;
  member.corrupted = false;
  state.staffIntel.dismissedId = compId;
  state.staffIntel.compromisedId = null;

  addEvidenceItem('overwritten-dispatch-note', state.night);
  state.reputation = Math.max(0, (state.reputation || 50) + 1);
  const rest = (state?.dayShift?.staff?.roster || []).filter((m) => m.active);
  rest.forEach((m) => {
    m.morale = clampStaffGauge(Number(m.morale || 0.56) - 0.05, 0.15, 1);
    m.fear = Math.min(1, Number(m.fear || 0) + 0.06);
  });
  state.logs.push(`${name} (${role}) dismissed mid-shift: severance paid ($${cost}). Reliability gap until dawn. Remaining team is tense.`);
  pushLiveAlert(state, { type: 'warning', message: `${name} dismissed. Reliability reduced tonight. −$${cost}.`, dedupeKey: `staff-dismissed-${compId}` });
  applyIdentityImpact({ doctrine: { control: 2, stability: -1 }, factions: { staff: -1, ownership: 1 }, reason: 'suspected staff dismissed mid-shift' });
  renderAll();
}

// ─── end v0.29 ────────────────────────────────────────────────

// ─── v0.30 Contamination / Room 9 / Owner-Protected Space ─────

function normalizeProtectedRoom(targetState = state) {
  if (!targetState.protectedRoom || typeof targetState.protectedRoom !== 'object') {
    targetState.protectedRoom = {
      label: 'Room 9',
      active: true,
      ownerProtected: true,
      knownToPlayer: false,
      pressureLevel: 0,
      contaminationFired: false,
      room9EventFiredTonight: false,
      contaminationCount: 0,
      investigateAttempts: 0,
      ownerWarningFired: false,
      evidenceFound: [],
      lastContaminationNight: null
    };
  }
  if (!Array.isArray(targetState.protectedRoom.evidenceFound)) {
    targetState.protectedRoom.evidenceFound = [];
  }
}

function applyProtectedRoomContamination(targetState = state) {
  normalizeProtectedRoom(targetState);
  if (targetState.protectedRoom.contaminationFired) return;
  targetState.protectedRoom.contaminationFired = true;
  targetState.protectedRoom.contaminationCount = (targetState.protectedRoom.contaminationCount || 0) + 1;
  targetState.protectedRoom.lastContaminationNight = Number(targetState.night || 1);
  targetState.protectedRoom.knownToPlayer = true;

  const level = Number(targetState.protectedRoom.pressureLevel || 0);

  const V30_CONTAMINATION_LOGS = [
    `Room 9 corridor — ambient temperature above threshold near the sealed door. Heat sensor logged at 2:18 AM. No access authorized.`,
    `Housekeeping passed the sealed section: an unspecified concern near the end of the hall. No specifics filed. Staff declined follow-up.`,
    `Room 5 guest complaint: unusual sounds from the connecting wall side. Maintenance dispatched — nothing found.`,
    `Room 6 service call: guest reports a persistent smell. Utilities checked — no explanation found. Guest requested do-not-disturb.`,
    `Rear hallway motion sensor triggered twice between 2:10 and 2:14 AM. Camera feed shows empty corridor. No access log on file.`,
    `Room 9 external check: door seal undisturbed. Heat register near that corridor running at capacity for a third consecutive night.`,
    `Room 5 guest requested early reassignment. Cited the atmosphere near their room. Offered no further explanation.`,
    `Hallway camera near sealed end: 4-second feed flicker, no timestamp registered in system. Loop window unaccounted for.`,
    `Prior shift maintenance note retrieved from back office: "Do not enter Room 9. Owner's standing instruction. Do not attempt contact."`,
    `Front desk key return processed for Room 9 this morning. No active registration on file. No matching checkout recorded.`
  ];

  const idx = Math.floor(Math.random() * V30_CONTAMINATION_LOGS.length);
  targetState.logs.push(V30_CONTAMINATION_LOGS[idx]);

  // Adjacent room pressure leak (rooms 5 and 6)
  (targetState.rooms || []).forEach(room => {
    if ([5, 6].includes(room.id) && room.occupied) {
      room.chainPressure = Math.min(8, (room.chainPressure || 0) + 2);
      if (level >= 2 && room.serviceState) {
        room.serviceState.unresolvedIssues = Math.min(3, (room.serviceState.unresolvedIssues || 0) + 1);
        room.serviceState.anxiety = Math.min(3, (room.serviceState.anxiety || 0) + 1);
      }
    }
  });

  // Hallway zone pressure leak
  if (targetState.locationState?.zones) {
    const zones = Object.values(targetState.locationState.zones);
    const hallway = zones.find(z => String(z.zoneName || '').toLowerCase() === 'hallway');
    if (hallway) hallway.followupPressure = (hallway.followupPressure || 0) + 1;
  }

  // Hallway camera contamination mark (level >= 1)
  if (level >= 1 && Array.isArray(targetState.cameras)) {
    const hallwayCam = targetState.cameras.find(c => String(c.name || '').toLowerCase() === 'hallway');
    if (hallwayCam && !hallwayCam.blindMode) {
      hallwayCam.contaminationMark = true;
    }
  }

  if (targetState.protectedRoom.knownToPlayer && level >= 2) {
    pushLiveAlert(targetState, {
      type: 'warning',
      message: `Room 9 — contamination spreading. Adjacent rooms and corridor affected.`,
      dedupeKey: `room9-contamination-${targetState.night}`
    });
  }
}

function triggerRoom9Event() {
  if (state.activeNightEvent) return;
  normalizeProtectedRoom();
  if (state.protectedRoom.room9EventFiredTonight) return;
  state.protectedRoom.room9EventFiredTonight = true;
  state.protectedRoom.knownToPlayer = true;

  const level = Number(state.protectedRoom.pressureLevel || 0);

  state.activeNightEvent = {
    id: 'room9-intrusion',
    title: 'Room 9 — Disturbance Logged',
    description: `${level >= 2 ? 'Heat readings and movement' : 'Movement'} detected near the sealed room. No guest is registered at that location. The room is marked Owner Authorization Only — staff are not cleared to enter without owner approval.`,
    severity: level >= 2 ? 'high' : 'medium',
    options: [
      {
        id: 'r9-ignore',
        label: 'Log it and move on',
        preview: 'Pressure accumulates. No record.',
        description: 'Note the disturbance and continue the shift. The room stays sealed.',
        note: 'Contamination pressure builds unchecked. Adjacent rooms absorb the bleed.'
      },
      {
        id: 'r9-investigate',
        label: 'Attempt to access the room',
        preview: '−5 reputation, owner override logged',
        description: 'Send staff to check the room. The door is sealed and owner-protected.',
        note: 'Access blocked. Owner will be notified. Reputation cost.'
      },
      {
        id: 'r9-document',
        label: 'Document from the hallway',
        preview: 'Evidence item added. No pressure cost.',
        description: 'Photograph the corridor and log what is observable from outside.',
        note: 'Safe. Adds an evidence item. Does not resolve the pressure.'
      }
    ]
  };
  state.nightEventOverlayOpen = true;
  state.logs.push(`Room 9 disturbance logged — sealed corridor, owner-protected zone. No authorized access.`);
  pushLiveAlert(state, {
    type: 'warning',
    kind: 'actionable',
    message: 'Room 9 — disturbance logged near sealed corridor.',
    dedupeKey: `room9-event-${state.night}`
  });
  audioController.playEmergencyPulse('high');
  renderAll();
}

function handleRoom9Choice(choiceId) {
  state.nightEventOverlayOpen = false;
  state.activeNightEvent = null;
  normalizeProtectedRoom();

  if (choiceId === 'r9-ignore') {
    state.protectedRoom.pressureLevel = Math.min(4, (state.protectedRoom.pressureLevel || 0) + 1);
    (state.rooms || []).forEach(room => {
      if ([5, 6].includes(room.id) && room.occupied) {
        room.chainPressure = Math.min(8, (room.chainPressure || 0) + 1);
      }
    });
    state.logs.push(`Room 9 disturbance logged and ignored. Pressure from the sealed corridor bleeds unchecked.`);

  } else if (choiceId === 'r9-investigate') {
    state.protectedRoom.investigateAttempts = (state.protectedRoom.investigateAttempts || 0) + 1;
    state.reputation = Math.max(0, (state.reputation || 50) - 5);
    const foundIds = state.protectedRoom.evidenceFound || [];
    if (!foundIds.includes('do-not-enter-copy')) {
      addEvidenceItem('do-not-enter-copy', state.night);
      state.protectedRoom.evidenceFound = [...foundIds, 'do-not-enter-copy'];
    }
    state.protectedRoom.ownerWarningFired = true;
    state.logs.push(`Room 9 access attempt blocked. Owner authorization required. Formal override logged by property management. −5 reputation.`);
    pushLiveAlert(state, {
      type: 'danger',
      message: 'Owner override: Room 9 access blocked. −5 reputation.',
      dedupeKey: `room9-blocked-${state.night}`
    });

  } else if (choiceId === 'r9-document') {
    const POOL = ['owner-access-slip', 'sealed-housekeeping-memo', 'stained-maintenance-note', 'unsigned-expense-form', 'old-room-ledger'];
    const foundIds = state.protectedRoom.evidenceFound || [];
    const unfound = POOL.filter(id => !foundIds.includes(id));
    if (unfound.length > 0) {
      const toAdd = unfound[0];
      addEvidenceItem(toAdd, state.night);
      state.protectedRoom.evidenceFound = [...foundIds, toAdd];
    }
    state.logs.push(`Room 9 hallway documented from outside. External evidence logged.`);
    applyIdentityImpact({ doctrine: { secrecy: 1 }, reason: 'Room 9 documented externally' });
  }

  renderAll();
}

function buildRoom9Model(targetState = state) {
  normalizeProtectedRoom(targetState);
  const pr = targetState.protectedRoom;
  const level = Number(pr.pressureLevel || 0);
  return {
    active: true,
    label: pr.label || 'Room 9',
    ownerProtected: true,
    knownToPlayer: Boolean(pr.knownToPlayer),
    pressureLevel: level,
    pressureLabel: level === 0 ? 'Sealed' : level === 1 ? 'Active' : level === 2 ? 'Contaminating' : level === 3 ? 'Spreading' : 'Critical',
    pressureClass: level === 0 ? 'is-sealed' : level === 1 ? 'is-low' : level <= 2 ? 'is-medium' : 'is-high',
    contaminationCount: Number(pr.contaminationCount || 0),
    investigateAttempts: Number(pr.investigateAttempts || 0),
    ownerWarningFired: Boolean(pr.ownerWarningFired),
    evidenceFoundCount: Array.isArray(pr.evidenceFound) ? pr.evidenceFound.length : 0,
    adjacentRoomIds: [5, 6]
  };
}

// ─── end v0.30 ────────────────────────────────────────────────

// ─── v0.31 The Town Is Rotten ─────────────────────────────────

const DAY_SHIFT_NOTE_POOL = [
  // stage 0 — early, quiet
  [
    { text: 'Quiet morning. Guest in 3 asked about the corner room. Told him it was unavailable. He didn\'t ask why.', tone: 'quiet' },
    { text: 'Coffee machine is broken again. Called the repair line. Nobody picked up. Left a note on the board.', tone: 'quiet' },
    { text: 'Checked rooms after checkout. 4 left cigarettes on the mattress. Disposed of them. Did not log it.', tone: 'quiet' },
    { text: 'Someone called at 7 AM asking if we had vacancies "for a few weeks." I said we\'d see. Didn\'t take a name.', tone: 'quiet' }
  ],
  // stage 1 — noticing
  [
    { text: 'A man sat in the lot for 45 minutes, engine off. Didn\'t come inside. Left before I could get a plate.', tone: 'uneasy' },
    { text: 'The back corridor light is out again. Third time this week. I wrote it up. Nobody fixed it last time either.', tone: 'uneasy' },
    { text: 'Two guests in 6 and 7 both checked out early. Neither gave a reason. Room 6 left the TV on.', tone: 'uneasy' },
    { text: 'I found a receipt from the vending alcove jammed behind the desk. Dated three nights ago. Not mine.', tone: 'uneasy' }
  ],
  // stage 2 — pressure
  [
    { text: 'A police car parked across the street for about 20 minutes this morning. Didn\'t come in. Just watched.', tone: 'tense' },
    { text: 'Guest in 2 told me the room "smelled wrong." I changed the towels. She left anyway. Didn\'t ask for a refund.', tone: 'tense' },
    { text: 'Someone called the desk twice, hung up both times. Third time I picked up fast — breathing, then the line dropped.', tone: 'tense' },
    { text: 'The owner left a voicemail. Something about "access logs for the rear wing." I didn\'t return the call.', tone: 'tense' }
  ],
  // stage 3 — critical
  [
    { text: 'A man showed a badge at the door before I opened. He asked about recent guests. I said I wasn\'t authorized to discuss records. He left a card. I haven\'t touched it.', tone: 'critical' },
    { text: 'Something happened last night. I can tell from the lot. Two cars were moved. Someone cleaned the ice machine bay. I didn\'t schedule that.', tone: 'critical' },
    { text: 'I found the back door unlocked when I opened. It wasn\'t forced. Whoever had a key. That narrows it to about four people.', tone: 'critical' },
    { text: 'I\'m not asking what you\'re doing at night. I just need you to know that people are starting to notice the motel. That\'s all this is.', tone: 'critical' }
  ]
];

const HEADLINE_POOL = {
  quiet:       [ '"Local Motel Maintains Quiet Season"', '"Highway 9 Sees Drop in Late Traffic"', '"Town Council Tables Road Budget Amendment"' ],
  disturbance: [ '"Noise Complaint Filed Near Highway Rest Area"', '"Late-Night Incident Under Review by Dispatch"', '"Residents Report Unusual Activity on Route 9 Corridor"' ],
  police:      [ '"Officer Carver Cited for Community Safety Initiative"', '"Department Denies Coverage Gap in Night Patrols"', '"Sheriff\'s Office: No Ongoing Investigations in Area"' ],
  dirty:       [ '"Unverified Cash Transactions Draw Scrutiny"', '"Anonymous Tip Prompts Review of Local Business Records"', '"Board: No Comment on Reported \'Off-Book\' Payments"' ],
  room9:       [ '"Former Tenant Files Complaint Over Extended-Stay Dispute"', '"Health Inspector Visit to Roadside Properties Delayed"', '"Owner Dispute Over Sealed Wing Enters Second Month"' ],
  nemesis:     [ '"Fugitive Suspected in Highway Corridor"', '"State Police Expand Search Radius Toward County Line"', '"Tip Line Active: Public Urged Not to Approach Suspects"' ],
  raid:        [ '"Multi-Agency Operation Targets Highway Corridor Properties"', '"Motel Under Investigation, Owner Not Available for Comment"', '"Three Arrested in Overnight Operation; Details Withheld"' ]
};

const DJ_BROADCAST_POOL = [
  'This is your highway companion, broadcasting from somewhere you can\'t see. Keep moving. The town doesn\'t sleep — it just pretends.',
  'Another night on Route 9. You know who\'s out there. Some of them are looking for something. Most of them just want to keep moving.',
  'Weather is clear through the county. Roads are empty. If you\'re hearing this, you\'re either working or you can\'t sleep. Probably both.',
  'Dedicated to whoever\'s behind the desk tonight. You know what you\'re holding onto. You know what it costs.',
  'Highway advisory: avoid the rest stop south of the interchange. No specifics. Just a suggestion from a friend.',
  'It\'s late. The kind of late where the only people still moving have reasons. I\'m not judging. Neither should you.',
  'For the night shift, always the night shift. You keep the lights on while everyone else forgets the dark exists.',
  'Town\'s quiet. That\'s not the same as safe. Remember that.',
  'Roadside observation: a motel with the lights on is either doing well or doing something. Hard to tell from the road.',
  'This next song is for everyone who knows something they can\'t say out loud. You know who you are.'
];

const DJ_BROADCAST_CONTEXTUAL = {
  dirty:   'Someone out there is keeping two sets of books. Metaphorically speaking. The road doesn\'t care — it just keeps going.',
  room9:   'There are rooms in every building that don\'t belong on the map. Some managers know. Most don\'t ask.',
  nemesis: 'A word of advice: when the city comes to the country, it brings its problems with it. Plan accordingly.',
  staff:   'The people working for you are people too. They have eyes. They remember things. Just a thought.'
};

function pickBagmanName(targetState) {
  if (targetState.townState?.bagmanName) return targetState.townState.bagmanName;
  const names = ['Carver', 'Dunn', 'Ressa'];
  return names[Math.floor(Math.random() * names.length)];
}

function normalizeTownState(targetState = state) {
  if (!targetState.townState) {
    targetState.townState = {
      bagmanName: pickBagmanName(targetState),
      bagmanFired: false,
      bagmanPayoffs: 0,
      policeCompromised: false,
      corruption: 0,
      townSuspicion: 0,
      headlineArchive: [],
      lastDjBroadcast: null,
      djBroadcastFiredTonight: false
    };
  }
  if (!targetState.townState.bagmanName) targetState.townState.bagmanName = pickBagmanName(targetState);
  if (!Array.isArray(targetState.townState.headlineArchive)) targetState.townState.headlineArchive = [];
  targetState.townState.townSuspicion = Math.max(0, Math.min(10, Number(targetState.townState.townSuspicion || 0)));
  targetState.townState.corruption    = Math.max(0, Math.min(10, Number(targetState.townState.corruption || 0)));
}

function normalizeDayShiftNotes(targetState = state) {
  if (!Array.isArray(targetState.dayShiftNotes)) targetState.dayShiftNotes = [];
}

function getDayShiftStage(targetState = state) {
  const night = Number(targetState.night || 1);
  if (night >= 7) return 3;
  if (night >= 5) return 2;
  if (night >= 3) return 1;
  return 0;
}

function generateDayShiftNote(targetState = state) {
  normalizeDayShiftNotes(targetState);
  const stage = getDayShiftStage(targetState);
  const pool = DAY_SHIFT_NOTE_POOL[stage];
  const used = new Set((targetState.dayShiftNotes || []).map((n) => n.text));
  const available = pool.filter((n) => !used.has(n.text));
  const pick = available.length ? available[Math.floor(Math.random() * available.length)] : pool[Math.floor(Math.random() * pool.length)];
  const note = { text: pick.text, tone: pick.tone, stage, night: Number(targetState.night || 1), playerResponse: null };
  targetState.dayShiftNotes.push(note);
  return note;
}

function buildDailyHeadline(targetState = state) {
  normalizeTownState(targetState);
  const t = targetState.townState;
  const dirty = targetState.dirtyLedger;
  const pr = targetState.protectedRoom;
  const nemesis = targetState.nemesis;

  let category = 'quiet';
  if (nemesis?.active && Number(nemesis.heat || 0) >= 7) category = 'nemesis';
  else if (t.townSuspicion >= 7) category = 'raid';
  else if (t.corruption >= 4 || (dirty && Number(dirty.dirtyScore || 0) >= 5)) category = 'dirty';
  else if (pr?.knownToPlayer && Number(pr.pressureLevel || 0) >= 3) category = 'room9';
  else if (t.bagmanFired && t.policeCompromised) category = 'police';
  else if (t.townSuspicion >= 3) category = 'disturbance';

  const pool = HEADLINE_POOL[category] || HEADLINE_POOL.quiet;
  const headline = pool[Math.floor(Math.random() * pool.length)];
  const entry = { headline, category, night: Number(targetState.night || 1) };
  t.headlineArchive.push(entry);
  return entry;
}

function triggerBagmanCopEvent() {
  normalizeTownState();
  const cop = state.townState.bagmanName;
  state.townState.bagmanFired = true;
  state.activeNightEvent = {
    id: 'bagman-cop',
    type: 'bagman-cop',
    title: `Officer ${cop} — Unofficial Visit`,
    description: `Officer ${cop} isn't here on duty. He came around back, didn't knock, just waited. He wants to talk about a "mutual arrangement." He's done this before. The last manager paid. You can see the line of his envelope through his jacket.`,
    severity: 'high',
    options: [
      { id: 'cop-pay',       label: 'Pay the arrangement ($120)',      hint: 'Clean exit. He leaves satisfied.' },
      { id: 'cop-refuse',    label: 'Turn him away',                   hint: 'Risky. He won\'t forget it.' },
      { id: 'cop-cooperate', label: 'Ask what he actually wants',       hint: 'He might let something slip.' },
      { id: 'cop-document',  label: 'Agree but photograph the exchange', hint: 'Evidence, but you still pay.' }
    ]
  };
  pushLiveAlert(state, { type: 'warning', message: `Officer ${cop} is waiting outside — unofficial visit.`, dedupeKey: `bagman-arrive-${state.night}` });
  renderNightEvent();
}

function handleBagmanCopChoice(choiceId) {
  normalizeTownState();
  const t = state.townState;
  const cop = t.bagmanName;
  state.activeNightEvent = null;

  if (choiceId === 'cop-pay') {
    const cost = 120;
    state.money = Math.max(0, (state.money || 0) - cost);
    t.bagmanPayoffs = (t.bagmanPayoffs || 0) + 1;
    t.policeCompromised = true;
    t.townSuspicion = Math.max(0, (t.townSuspicion || 0) - 1);
    addToLog(`[Police] Officer ${cop} left after a brief exchange. No incident logged. The arrangement stands.`);
    applyIdentityImpact({ doctrine: { compliance: 1 }, factions: { ownership: -1 }, reason: 'police payoff accepted' });
  } else if (choiceId === 'cop-refuse') {
    t.townSuspicion = Math.min(10, (t.townSuspicion || 0) + 2);
    t.corruption = Math.min(10, (t.corruption || 0) + 1);
    addToLog(`[Police] Officer ${cop} took his time leaving. He said nothing. That's worse.`);
    addToLog(`[Town] Word travels. Someone will notice Officer ${cop} was turned away.`);
    applyIdentityImpact({ doctrine: { resistance: 1 }, factions: { ownership: -1 }, stats: { pressure: 2 }, reason: 'refused police payoff' });
    pushLiveAlert(state, { type: 'danger', message: `Officer ${cop} turned away — heat incoming.`, dedupeKey: `bagman-refuse-${state.night}` });
  } else if (choiceId === 'cop-cooperate') {
    t.townSuspicion = Math.min(10, (t.townSuspicion || 0) + 1);
    t.corruption = Math.min(10, (t.corruption || 0) + 1);
    addToLog(`[Police] Officer ${cop} let something drop: there's a review coming. He said it like a favor. He still expects payment next time.`);
    addEvidenceItem('false-police-log', state.night);
    applyIdentityImpact({ doctrine: { knowledge: 1 }, reason: 'extracted info from bagman cop' });
    pushLiveAlert(state, { type: 'info', message: `Intel from Officer ${cop} — evidence logged.`, dedupeKey: `bagman-coop-${state.night}` });
  } else if (choiceId === 'cop-document') {
    const cost = 120;
    state.money = Math.max(0, (state.money || 0) - cost);
    t.bagmanPayoffs = (t.bagmanPayoffs || 0) + 1;
    t.policeCompromised = true;
    addToLog(`[Police] Paid Officer ${cop}. Got documentation. He doesn't know that.`);
    addEvidenceItem('police-payoff-receipt', state.night);
    addEvidenceItem('bagman-visit-note', state.night);
    applyIdentityImpact({ doctrine: { compliance: 1, documentation: 1 }, factions: { ownership: -1 }, reason: 'documented police payoff' });
    pushLiveAlert(state, { type: 'success', message: `Payoff documented — evidence secured.`, dedupeKey: `bagman-doc-${state.night}` });
  }

  renderAll();
}

function fireMidnightDJBroadcast() {
  normalizeTownState();
  const t = state.townState;
  t.djBroadcastFiredTonight = true;

  let broadcast = null;
  const pr = state.protectedRoom;
  const nemesis = state.nemesis;
  const dirty = state.dirtyLedger;
  const staffIntel = state.staffIntel;

  if (nemesis?.active && Number(nemesis.heat || 0) >= 6) broadcast = DJ_BROADCAST_CONTEXTUAL.nemesis;
  else if (pr?.knownToPlayer && Number(pr.pressureLevel || 0) >= 2) broadcast = DJ_BROADCAST_CONTEXTUAL.room9;
  else if (dirty && Number(dirty.dirtyScore || 0) >= 3) broadcast = DJ_BROADCAST_CONTEXTUAL.dirty;
  else if (staffIntel?.compromisedId) broadcast = DJ_BROADCAST_CONTEXTUAL.staff;
  else broadcast = DJ_BROADCAST_POOL[Math.floor(Math.random() * DJ_BROADCAST_POOL.length)];

  t.lastDjBroadcast = broadcast;
  addToLog(`[Highway Radio] ${broadcast}`);
  const coded = pickDjCodedAddon(state);
  if (coded) {
    addToLog(`[Highway Radio — coded] ${coded}`);
    t.lastDjBroadcast = `${broadcast} // ${coded}`;
  }
}

function respondToDayShiftNote(response) {
  normalizeDayShiftNotes();
  const notes = state.dayShiftNotes || [];
  if (!notes.length) return;
  const current = notes[notes.length - 1];
  if (current && current.playerResponse === null) {
    current.playerResponse = response;
    addToLog(`[Day Shift] You left a response to the morning note.`);
    if (response === 'acknowledge') {
      applyIdentityImpact({ doctrine: { stability: 1 }, reason: 'acknowledged day shift concerns' });
    } else if (response === 'deflect') {
      applyIdentityImpact({ doctrine: { control: 1 }, reason: 'deflected day shift concerns' });
    }
    renderAll();
  }
}

function buildTownModel(targetState = state) {
  normalizeTownState(targetState);
  normalizeDayShiftNotes(targetState);
  const t = targetState.townState;
  const notes = targetState.dayShiftNotes || [];
  const currentNote = notes.length ? notes[notes.length - 1] : null;
  const lastHeadline = t.headlineArchive?.length
    ? t.headlineArchive[t.headlineArchive.length - 1]
    : null;
  return {
    townSuspicion: t.townSuspicion,
    corruption: t.corruption,
    bagmanFired: t.bagmanFired,
    bagmanPayoffs: t.bagmanPayoffs,
    bagmanName: t.bagmanName,
    policeCompromised: t.policeCompromised,
    lastHeadline,
    lastDjBroadcast: t.lastDjBroadcast,
    currentNote,
    noteCount: notes.length
  };
}

// ─── end v0.31 ────────────────────────────────────────────────

// ============================================================
// ─── Continue After Failure Overlay ──────────────────────────

// DEV/LEGACY FEATURE FLAG
// This project now uses verified PayPal purchases + Continue Credits.
// Fake rewarded ads are NOT used in production/live mode and must never
// appear as a “free continue” option. Keep this disabled unless you are
// explicitly testing UI-only flows locally.
const ENABLE_FAKE_REWARDED_ADS = false;

function closeContinueOverlay() {
  if (_cfoAdTick !== null) {
    clearInterval(_cfoAdTick);
    _cfoAdTick = null;
  }
  const overlay = document.getElementById('continue-failure-overlay');
  if (!overlay) return;
  overlay.classList.remove('is-open');
  overlay.setAttribute('aria-hidden', 'true');
  overlay.innerHTML = '';
}

function resumeAfterContinue(failureCode) {
  state.continueUsed = true;
  state.continueGraceUntil = Date.now() + 1500;
  // Pull state back from the brink without a full reset
  state.power = Math.max(state.power || 0, 30);
  state.reputation = Math.max(state.reputation || 0, 28);
  const maxIncidents = 4;
  if (Array.isArray(state.incidents) && state.incidents.length > maxIncidents) {
    state.incidents = state.incidents.slice(-maxIncidents);
  }
  if (Array.isArray(state.rooms)) {
    state.rooms.forEach(room => {
      if (room.condition === 'Critical') room.condition = 'Poor';
    });
  }
  state.failedState = null;
  try { window.refreshDemActiveEffects?.(); } catch { /* ignore */ }
  setActiveScreen('game-screen');
  setActivePanel('frontdesk-panel');
  renderAll();
}

function showFakeAdAndContinue() {
  if (!ENABLE_FAKE_REWARDED_ADS) {
    console.warn('[ContinueOverlay] Fake rewarded ads disabled.');
    return;
  }
  const overlay = document.getElementById('continue-failure-overlay');
  if (!overlay || !overlay.classList.contains('is-open')) return;
  const btn = overlay.querySelector('.cfo-continue-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Loading ad…'; }

  const panel = overlay.querySelector('.cfo-panel');
  if (!panel) return;

  const adEl = document.createElement('div');
  adEl.className = 'cfo-ad-panel';
  adEl.innerHTML = `<p class="cfo-ad-title">AD BREAK</p>
<p class="cfo-ad-label">Fake rewarded ad simulation</p>
<p class="cfo-ad-countdown" id="cfo-ad-countdown">3</p>`;
  panel.appendChild(adEl);

  let remaining = 3;
  if (_cfoAdTick !== null) { clearInterval(_cfoAdTick); _cfoAdTick = null; }
  _cfoAdTick = setInterval(() => {
    remaining -= 1;
    const cd = document.getElementById('cfo-ad-countdown');
    if (cd) cd.textContent = String(remaining);
    if (remaining <= 0) {
      clearInterval(_cfoAdTick);
      _cfoAdTick = null;
      closeContinueOverlay();
      const failureCode = state?.failedState?.code || 'unknown';
      resumeAfterContinue(failureCode);
    }
  }, 1000);
}

function showContinueOverlay(failure) {
  if (!ENABLE_FAKE_REWARDED_ADS) return;
  const overlay = document.getElementById('continue-failure-overlay');
  if (!overlay) return;
  if (overlay.classList.contains('is-open')) return;

  const continueUsed = state.continueUsed === true;

  let savedCredits = 0;
  try {
    savedCredits = Math.max(0, parseInt(localStorage.getItem('credit') || '0', 10) || 0);
  } catch { /* ignore */ }

  const ctx = typeof window.deadEndMotelGetFailureContext === 'function'
    ? window.deadEndMotelGetFailureContext() : null;
  const progressPct = ctx?.progressPercent ?? null;
  const nearWin = ctx?.nearWin ?? false;

  const night = Number(state?.night || 1);
  const rep = state?.reputation != null ? Math.round(Number(state.reputation)) : null;
  const power = state?.power != null ? Math.round(Number(state.power)) : null;
  const money = state?.money != null ? Math.floor(Number(state.money)) : null;

  const reasonLabel = failure?.reason || 'Shift conditions became unrecoverable.';

  const progressHtml = progressPct != null
    ? `<div class="cfo-recap">
        <p class="cfo-recap-pct">${Math.round(progressPct)}% through the shift</p>
        ${nearWin ? '<p class="cfo-recap-line">You were close — one more push might do it.</p>' : ''}
      </div>` : '';

  const statItems = [
    rep != null && `<span class="cfo-stat">Rep: ${rep}</span>`,
    power != null && `<span class="cfo-stat">Power: ${power}%</span>`,
    money != null && `<span class="cfo-stat">Funds: CA$${money}</span>`,
  ].filter(Boolean).join('');
  const statsHtml = statItems ? `<div class="cfo-stats">${statItems}</div>` : '';

  let ctaHtml = '';
  let noteHtml = '';

  if (savedCredits > 0) {
    ctaHtml = `<button class="button cfo-use-credit-btn" type="button">
      Continue with saved credit ×${savedCredits}
    </button>
    <button class="button button--ghost cfo-restart-btn" type="button">Restart shift</button>`;
    noteHtml = `<p class="cfo-note">Restores tonight's opening snapshot. ${savedCredits - 1} credit${savedCredits - 1 !== 1 ? 's' : ''} will remain.</p>`;
  } else if (!continueUsed) {
    // Legacy/dev-only path. Never shown in live mode (feature-flagged).
    ctaHtml = `<button class="button cfo-continue-btn" type="button">Continue — Watch Ad (dev-only)</button>
    <button class="button button--ghost cfo-restart-btn" type="button">Restart shift</button>`;
    noteHtml = `<p class="cfo-note">Dev-only: fake rewarded ad simulation. Live builds use credits + verified PayPal.</p>`;
  } else {
    ctaHtml = `<button class="button button--ghost cfo-restart-btn" type="button">Restart shift</button>`;
    noteHtml = `<p class="cfo-note cfo-continue-used-msg">Continue already used this run.</p>`;
  }

  overlay.innerHTML = `<div class="cfo-panel" role="dialog" aria-modal="true" aria-label="Shift failed">
    <h2 class="cfo-title">SHIFT FAILED</h2>
    <p class="cfo-subtitle">${reasonLabel}</p>
    ${progressHtml}
    ${statsHtml}
    <div class="cfo-actions">
      ${ctaHtml}
    </div>
    ${noteHtml}
  </div>`;

  overlay.classList.add('is-open');
  overlay.setAttribute('aria-hidden', 'false');

  const creditBtn = overlay.querySelector('.cfo-use-credit-btn');
  if (creditBtn) {
    creditBtn.addEventListener('click', () => {
      if (creditBtn.disabled) return;
      creditBtn.disabled = true;
      const ok = window.deadEndMotelUseSavedContinue?.();
      if (ok) {
        closeContinueOverlay();
      } else {
        creditBtn.disabled = false;
      }
    });
  }

  const adBtn = overlay.querySelector('.cfo-continue-btn');
  if (adBtn) {
    adBtn.addEventListener('click', () => {
      if (adBtn.disabled) return;
      adBtn.disabled = true;
      showFakeAdAndContinue();
    });
  }

  const restartBtn = overlay.querySelector('.cfo-restart-btn');
  if (restartBtn) {
    restartBtn.addEventListener('click', () => {
      closeContinueOverlay();
    });
  }
}

// ─── end Continue After Failure Overlay ──────────────────────

function checkFailureState() {
  if (state.continueGraceUntil && Date.now() < state.continueGraceUntil) return false;

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
  renderFailure(failure, { deadDropOffer: buildDeadDropFailureOffer(metaState, state) });
  setActiveScreen('failure-screen');
  // Live/production failure continue system:
  // - Saved Continue Credits first (failure screen CTA)
  // - Verified PayPal continue packs second (failure screen CTA)
  // - Retry/Restart/Menu always visible
  if (ENABLE_FAKE_REWARDED_ADS) showContinueOverlay(failure);
  return true;
}

function progressShift(actionKey, options = {}) {
  tickDeferredShiftCosts();
  tickPowerEconomy(state);
  tickLocationState(state);
  if (Number(state?.emergencyState?.hideSurvivalTurns || 0) > 0) {
    state.emergencyState.hideSurvivalTurns = Math.max(0, Number(state.emergencyState.hideSurvivalTurns || 0) - 1);
    if (state.emergencyState.hideSurvivalTurns <= 0) {
      state.emergencyState.hideSurvivalActive = false;
    }
  }
  const skipPassiveDrain = Boolean(options?.skipPassiveDrain);
  const passiveDrainBase = skipPassiveDrain
    ? 0
    : getPassiveDrainForAction(actionKey, state, getScenarioModifiers());
  const passiveMult =
    typeof options.passiveDrainScale === 'number' && Number.isFinite(options.passiveDrainScale)
      ? Math.max(0, options.passiveDrainScale)
      : 1;
  const analogBonus = skipPassiveDrain ? 0 : Math.max(0, Math.round(getAnalogPassiveDrainBonus(state)));
  const passiveDrain = Math.max(
    0,
    Math.round(
      passiveDrainBase *
        passiveMult *
        Math.max(0.75, Number(state?.runModifiers?.passiveDrainMult || 1))
    ) + analogBonus
  );
  if (passiveDrain > 0) {
    state.power = clampPower(state.power - passiveDrain);
    state.logs.push(
      `Power grid load drained ${passiveDrain}% during ongoing motel operations${
        analogBonus > 0 ? ` (breaker load +${analogBonus})` : ''
      }.`
    );
  }
  consumeMonetizationCalmBoostIfPending();
  applyCalmModePassiveTick();
  if (!skipPassiveDrain) {
    tickOperatorFatigue(state, actionKey);
    const coldAlert = tickColdWithoutHeating(state);
    if (coldAlert?.alert) {
      pushLiveAlert(state, coldAlert.alert);
    }
  }

  maybeTriggerBlackoutPressure(`pre-${actionKey}`);

  state = advanceNightCycle(state, actionKey, {
    timeScale: options.timeScale,
    minutesOverride: options.minutesOverride
  });
  maybeAdvanceSignatureNightFlow('progress', { actionKey });

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

  tickRoadWorldDuringShift(state, (a) => pushLiveAlert(state, a));
  normalizeBorderTransferState(state);
  maybeOfferBorderTransferStaging(state, (a) => pushLiveAlert(state, a));
  tickBorderTransferDuringShift(state, (a) => pushLiveAlert(state, a));

  normalizeForensicNoirState(state);
  normalizeOperatorNoirState(state);
  tickOperatorNoirAfterAdvance(state, {
    skipPassiveDrain,
    actionKey,
    timeScale: options.timeScale
  });
  const opHall = maybeTriggerHallucination(state, { skipPassiveDrain });
  if (opHall?.alert) {
    pushLiveAlert(state, opHall.alert);
  }
  tickDawnAuditor(state, (a) => pushLiveAlert(state, a));
  tickFinalWinterDuringShift(state, (a) => pushLiveAlert(state, a));
  tickBasementSyndicateDuringShift(state, (a) => pushLiveAlert(state, a));
  const tapeTickResult = tickForensicTape(state);
  if (tapeTickResult?.alert) {
    pushLiveAlert(state, tapeTickResult.alert);
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
  maybeTriggerBlackoutPressure(`post-${actionKey}`);

  if (
    state?.crisisNight?.active &&
    (state.crisisNight.kind === 'stacked-pressure' || state.crisisNight.kind === 'guest-surge') &&
    Number(state.shiftElapsedMinutes || 0) >= 160 &&
    Math.random() < 0.12
  ) {
    triggerSignatureIncident(`crisis-${actionKey}`);
  }

  // ── DAWN CHECK — must run first, before any early returns ──────────────────
  // v0.23 fix: event trigger blocks previously returned false before this ran,
  // leaving the game stuck at 6:00 AM with summary never opening.
  if (!state.dawnProcessed && hasReachedDawn(state)) {
    state.shiftElapsedMinutes = SHIFT_DURATION_MINUTES;
    state.dawnProcessed = true;
    if (state.raidStatus === 'pending') {
      state.reputation = Math.max(0, (state.reputation || 50) - 18);
      state.raidStatus = 'auto-resolved-dawn';
      state.logs.push('Police raid swept the motel at dawn. You failed to respond — major reputation loss.');
      pushLiveAlert(state, {
        type: 'danger',
        message: 'Raid auto-resolved at dawn: you failed to respond. −18 reputation.',
        dedupeKey: 'raid-auto-dawn-' + state.night
      });
    }
    pushLiveAlert(state, {
      type: 'info',
      message: '6:00 AM — dawn. The night shift is over. Closing out.',
      dedupeKey: 'dawn-arrival-night-' + state.night
    });
    const failureTriggered = checkFailureState?.() === true;
    if (!failureTriggered) {
      endNight({ force: true });
      return true;
    }
    // If failure triggered, fall through — failure screen handles the transition
    return false;
  }
  // ── END DAWN CHECK ──────────────────────────────────────────────────────────

  // Tick camera blind cooldowns (targeted blackouts auto-restore)
  let cameraRestored = false;
  state.cameras = (state.cameras || []).map((cam) => {
    if (cam.blindMode === 'blackout' && Number(cam.blindCooldown || 0) > 0) {
      const newCooldown = cam.blindCooldown - 1;
      if (newCooldown <= 0) {
        cameraRestored = true;
        state.logs.push(cam.name + ' zone power restored. Camera feed back online.');
        return { ...cam, blindMode: null, blindCooldown: 0, status: 'Clear' };
      }
      return { ...cam, blindCooldown: newCooldown };
    }
    return cam;
  });
  if (cameraRestored) {
    pushLiveAlert(state, {
      type: 'info',
      message: 'Zone blackout expired — camera feed restored.',
      dedupeKey: 'zone-blackout-restored-' + state.night + '-' + state.shiftElapsedMinutes
    });
  }

  // 5:45 AM — Trigger police raid if dirty pressure is high enough
  // (only runs if dawn has not been reached — dawn check above guarantees this)
  if (!state.raidTriggered && !state.activeNightEvent) {
    const elapsed = Number(state.shiftElapsedMinutes || 0);
    const dirty = Number(state.dirtyPressure || 0);
    if (elapsed >= 465 && dirty >= 3) {
      state.raidTriggered = true;
      triggerPoliceRaidEvent();
      return false;
    }
  }

  // Camera sabotage — faction-hostile rare event
  if (!state.cameraSabotageTriggered && !state.activeNightEvent) {
    const elapsed = Number(state.shiftElapsedMinutes || 0);
    const dirty = Number(state.dirtyPressure || 0);
    const hasHostileRoom = (state.rooms || []).some(
      (r) => r.occupied && Number(r.serviceState?.hostility || 0) >= 2
    );
    if (elapsed >= 180 && dirty >= 2 && hasHostileRoom && Math.random() < 0.04) {
      state.cameraSabotageTriggered = true;
      triggerCameraSabotageEvent();
      return false;
    }
  }

  // Unknown caller — rare, context-aware, once per night
  if (!state.unknownCallerFired && !state.activeNightEvent) {
    const _elapsed = Number(state.shiftElapsedMinutes || 0);
    const _hasFaction = (state.guests || []).some((g) => g.factionProfile?.id);
    const _hasHostile = (state.rooms || []).some((r) => r.occupied && Number(r.serviceState?.hostility || 0) >= 2);
    const _pres = state?.uiPressureLevel || 'calm';
    const _callerChance = Math.max(0.01, Math.min(0.055,
      0.018 + (_hasFaction ? 0.01 : 0) + (_hasHostile ? 0.008 : 0) + (_pres === 'dire' || _pres === 'emergency' ? 0.012 : 0)
    ));
    if (_elapsed >= 120 && _elapsed < 440 && Math.random() < _callerChance) {
      state.unknownCallerFired = true;
      triggerUnknownCallerEvent();
      return false;
    }
  }

  // Burner phone — rare desk contact event
  if (!state.burnerPhoneOffered && !state.activeNightEvent) {
    const elapsed = Number(state.shiftElapsedMinutes || 0);
    if (elapsed >= 90 && elapsed < 420 && Math.random() < 0.025) {
      state.burnerPhoneOffered = true;
      triggerBurnerPhoneEvent();
      return false;
    }
  }

  // Bleeding walk-in — rare midnight event, once per shift, mid-to-late
  if (!state.bleedingWalkInState?.offered && !state.activeNightEvent) {
    const _wEl = Number(state.shiftElapsedMinutes || 0);
    const _wNight = Math.max(1, Number(state.night || 1));
    const _wChance = Math.max(0.015, Math.min(0.045, 0.018 + (_wNight - 1) * 0.007));
    if (_wEl >= 180 && _wEl < 420 && Math.random() < _wChance) {
      normalizeDirtyState();
      triggerBleedingWalkInEvent();
      return false;
    }
  }

  // Hunters follow-up — fires on the correct night after walk-in sheltered
  if (!state.activeNightEvent) {
    const _hwState = state.bleedingWalkInState;
    if (_hwState?.huntersExpected && !_hwState?.huntersFired) {
      if (Number(_hwState.huntersNight || 0) === Number(state.night || 1)) {
        const _hwEl = Number(state.shiftElapsedMinutes || 0);
        if (_hwEl >= 150 && _hwEl < 450 && Math.random() < 0.55) {
          triggerHuntersEvent();
          return false;
        }
      }
    }
  }

  // Vending dead drop — once per run, dirty context or night >= 3, rare
  if (!state.vendingDropState?.offered && !state.vendingDropState?.completed && !state.activeNightEvent) {
    const _vNight = Math.max(1, Number(state.night || 1));
    const _vEl = Number(state.shiftElapsedMinutes || 0);
    const _vDirty = (state.dirtyLedger?.totalDirtyMoney || 0) > 0 || (state.dirtyPressure || 0) >= 2;
    const _vChance = _vDirty ? 0.028 : (_vNight >= 3 ? 0.012 : 0);
    if (_vChance > 0 && _vEl >= 100 && _vEl < 400 && Math.random() < _vChance) {
      normalizeDirtyState();
      triggerVendingDeadDropEvent();
      return false;
    }
  }

  // Front desk breach — nemesis / high-pressure, once per night, mid-shift
  if (!state.breachEventFired && !state.activeNightEvent) {
    const _el = Number(state.shiftElapsedMinutes || 0);
    const _pres = state?.uiPressureLevel || 'calm';
    const _nemActive = Boolean(state.nemesis?.active);
    const _nemPressure = Number(state.nemesis?.pressureLevel || 0);
    const _breachChance = (_nemActive && _nemPressure >= 2)
      ? 0.035
      : (['dire', 'emergency'].includes(_pres) ? 0.015 : 0);
    if (_breachChance > 0 && _el >= 200 && _el < 450 && Math.random() < _breachChance) {
      state.breachEventFired = true;
      triggerFrontDeskBreachEvent();
      return false;
    }
  }

  // v0.29 staff mutiny — once per run, critical morale, mid-shift
  if (!state.staffIntel?.mutinyFired && !state.activeNightEvent) {
    const _s29r = (state?.dayShift?.staff?.roster || []).filter(m => m.active);
    const _avgM = _s29r.reduce((s, m) => s + Number(m.morale || 0.56), 0) / Math.max(1, _s29r.length);
    const _minM = _s29r.length ? Math.min(..._s29r.map(m => Number(m.morale || 0.56))) : 1;
    const _s29El = Number(state.shiftElapsedMinutes || 0);
    if ((_avgM < 0.30 || _minM < 0.18) && _s29El >= 120 && _s29El < 400 && Math.random() < 0.025) {
      normalizeStaffV29();
      triggerStaffMutinyEvent();
      return false;
    }
  }

  // v0.29 inside leak — once per night, compromised + faction/nemesis context
  if (!state.staffIntel?.insideLeakFired && !state.activeNightEvent) {
    const _ilComp = getCompromisedStaff();
    const _ilFaction = (state.guests || []).some(g => g.factionProfile?.id);
    const _ilNem = Boolean(state.nemesis?.active);
    if (_ilComp && (_ilFaction || _ilNem)) {
      const _ilEl = Number(state.shiftElapsedMinutes || 0);
      if (_ilEl >= 200 && _ilEl < 450 && Math.random() < 0.018) {
        triggerInsideLeakEvent();
        return false;
      }
    }
  }

  // v0.30 Room 9 event — once per night, escalating chance with pressure level
  if (!state.protectedRoom?.room9EventFiredTonight && !state.activeNightEvent) {
    const _r9El = Number(state.shiftElapsedMinutes || 0);
    const _r9Night = Number(state.night || 1);
    const _r9Level = Number(state.protectedRoom?.pressureLevel || 0);
    const _r9Chance = _r9Night >= 2
      ? Math.max(0.012, Math.min(0.04, 0.012 + _r9Level * 0.008))
      : 0;
    if (_r9Chance > 0 && _r9El >= 150 && _r9El < 430 && Math.random() < _r9Chance) {
      normalizeProtectedRoom();
      triggerRoom9Event();
      return false;
    }
  }

  // v0.30 Room 9 passive contamination — once per night, starts night 2
  if (!state.protectedRoom?.contaminationFired && !state.activeNightEvent) {
    const _pcEl = Number(state.shiftElapsedMinutes || 0);
    const _pcNight = Number(state.night || 1);
    const _pcLevel = Number(state.protectedRoom?.pressureLevel || 0);
    const _pcChance = _pcNight >= 2
      ? Math.max(0.025, Math.min(0.09, 0.025 + _pcLevel * 0.015))
      : 0;
    if (_pcChance > 0 && _pcEl >= 90 && Math.random() < _pcChance) {
      normalizeProtectedRoom();
      applyProtectedRoomContamination();
    }
  }

  // v0.29 compromised staff passive suspicious log
  const _v29comp = getCompromisedStaff();
  if (_v29comp && !state.activeNightEvent) {
    const _v29base = getStaffCatalogEntry(_v29comp.id);
    const _v29name = _v29base?.name || 'staff';
    const _v29role = _v29base?.role || 'Staff';
    const _v29chance = Math.max(0.06, Math.min(0.14, 0.08 + Number(_v29comp.badOutcomeCount || 0) * 0.01));
    if (Math.random() < _v29chance) {
      const V29_MISLEAD = [
        `${_v29name} (${_v29role}) reported zone clear — camera feed showed continued activity in the sector.`,
        `${_v29role} response filed as resolved by ${_v29name} — room pressure remained elevated at next check.`,
        `${_v29name}'s dispatch timing on this action is unusually slow. No explanation logged.`,
        `Cost on ${_v29name}'s last repair ticket exceeded standard rate by $8. No documentation on file.`,
        `${_v29role} log entry by ${_v29name} was crossed out and rewritten post-filing. Original shows a different room.`
      ];
      state.logs.push(V29_MISLEAD[Math.floor(Math.random() * V29_MISLEAD.length)]);
      _v29comp.badOutcomeCount = (_v29comp.badOutcomeCount || 0) + 1;
      _v29comp.suspicionScore = Math.min(10, (_v29comp.suspicionScore || 0) + 1);
      if (_v29comp.suspicionScore >= 3 && !(state.staffIntel.suspicionHints || []).includes(_v29comp.id)) {
        if (!Array.isArray(state.staffIntel.suspicionHints)) state.staffIntel.suspicionHints = [];
        state.staffIntel.suspicionHints.push(_v29comp.id);
        pushLiveAlert(state, {
          type: 'warning',
          message: `Staff pattern: ${_v29name}'s recent logs show repeated inconsistencies. Review recommended.`,
          dedupeKey: `staff-suspicion-${_v29comp.id}-${state.night}`
        });
      }
    }
  }

  // v0.31 bagman cop — once per run, night ≥ 2, dirty score > 0, elapsed 100–350 min
  if (!state.townState?.bagmanFired && !state.activeNightEvent) {
    const _bmNight = Number(state.night || 1);
    const _bmEl    = Number(state.shiftElapsedMinutes || 0);
    const _bmDirty = Number(state.dirtyLedger?.dirtyScore || 0);
    if (_bmNight >= 2 && _bmDirty > 0 && _bmEl >= 100 && _bmEl < 350 && Math.random() < 0.02) {
      normalizeTownState();
      normalizeRoadWorldState(state);
      bumpRoadHeat(state, 0.35, '');
      state.logs.push(
        '[Road intel] CB mirror: someone used the old "property interview" phrasing for your exit — might be gossip, might be a cruiser buying time.'
      );
      triggerBagmanCopEvent();
      return false;
    }
  }

  // v0.33 lost-property claim — after mishandled lost & found
  if (!state.activeNightEvent && maybeRollLostFoundClaimEvent(state)) {
    triggerLostFoundClaimEvent();
    return false;
  }

  // v0.32 lot payphone — rare outdoor line (weather / pressure weighted)
  if (!state.activeNightEvent && maybeRollLotPayphoneOffer(state)) {
    triggerLotPayphoneEvent();
    return false;
  }

  // v0.31 midnight DJ — once per night, elapsed ≥ 180 min
  if (!state.townState?.djBroadcastFiredTonight) {
    const _djEl = Number(state.shiftElapsedMinutes || 0);
    if (_djEl >= 180 && Math.random() < 0.35) {
      normalizeTownState();
      fireMidnightDJBroadcast();
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
  const worldGuest = applyCampaignGuestWorldSignals(recurringGuest, state);
  const branchedRecurringGuest = applyReturningGuestBranchFlavor(worldGuest, branchContext);
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
  const preparedDeskGuest = normalizeDeskInspectionGuest(guestWithStay, state);
  if (preparedDeskGuest.isReturningGuest) {
    const preferredRoom = state.rooms.find((room) => room.id === preparedDeskGuest.assignedRoomMemoryId);
    if (preferredRoom?.memory?.note) {
      preparedDeskGuest.priorHistoryLine = `${preparedDeskGuest.priorHistoryLine || ''} Room memory: ${preferredRoom.memory.note}`.trim();
    }
    if (preparedDeskGuest.returningGuestNote) {
      preparedDeskGuest.threadMemoryLine = [preparedDeskGuest.threadMemoryLine, preparedDeskGuest.returningGuestNote].filter(Boolean).join(' ');
    }
  }
  if (preparedDeskGuest?.factionProfile?.label) {
    preparedDeskGuest.threadMemoryLine = [
      preparedDeskGuest.threadMemoryLine,
      `Pattern note: ${preparedDeskGuest.factionProfile.label} may be active around this arrival.`
    ].filter(Boolean).join(' ');
  }
  if (preparedDeskGuest?.linkedArrival?.note) {
    preparedDeskGuest.threadMemoryLine = [preparedDeskGuest.threadMemoryLine, preparedDeskGuest.linkedArrival.note].filter(Boolean).join(' ');
  }

  let arrivalGuest = applyNeonArrivalBias(preparedDeskGuest, state);
  arrivalGuest = applyArrivalRoadSkew(state, arrivalGuest);
  consumeRoadIntelForArrival(state);
  state.guests.push(arrivalGuest);
  maybeAdvanceSignatureNightFlow('arrival', { guest: arrivalGuest });
  registerContentExposure(state, {
    kind: 'guest',
    archetype: arrivalGuest?.archetypeKey,
    outsideHeavy: Number(branchContext?.signals?.outsideRisk || 0) >= 6
  });
  registerContentExposure(state, { kind: 'guestMood', mood: arrivalGuest?.mood });
  if (preparedDeskGuest?.specialEncounter?.id) {
    registerContentExposure(state, { kind: 'special', id: preparedDeskGuest.specialEncounter.id });
  }
  guestIdCounter += 1;
  state.logs.push('A new arrival reached the front desk (intake slot consumed).');
  state.logs.push(
    `${preparedDeskGuest.name} looks booked for roughly ${preparedDeskGuest.expectedStayNights} night${preparedDeskGuest.expectedStayNights === 1 ? '' : 's'} if approved.`
  );
  if (preparedDeskGuest?.linkedArrival?.role === 'lead') {
    state.logs.push(`${preparedDeskGuest.name} may be the first half of a linked arrival pattern tonight.`);
  }
  if (preparedDeskGuest?.factionProfile?.label) {
    state.logs.push(`Desk unease: subtle signs suggest ${preparedDeskGuest.factionProfile.label.toLowerCase()} ties.`);
  }
  if (preparedDeskGuest?.specialEncounter?.id) {
    pushLiveAlert(state, {
      type: 'warning',
      kind: 'actionable',
      message: `${preparedDeskGuest.name} presents a special encounter.`,
      dedupeKey: `special-guest-${preparedDeskGuest.id}-${preparedDeskGuest.specialEncounter.id}`
    });
  }
  pushLiveAlert(state, {
    type: 'info',
    message: `${preparedDeskGuest.name} arrived at reception for a likely ${preparedDeskGuest.expectedStayNights}-night stay.`,
    dedupeKey: `guest-arrival-${preparedDeskGuest.id}`
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
  recordSuspectEvidence(updatedGuest, 'flag');
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
  recordSuspectEvidence(guest, 'reject');
  if (guest.isReturningGuest) {
    state.shiftStats.recurringGuestsMissed = (state.shiftStats.recurringGuestsMissed || 0) + 1;
  }

  recordSpecialEncounterMiss(state, guest);

  maybeSpawnLostFoundOnReject(state, guest);

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

function clampDeskSignalValue(value) {
  return Math.max(0, Math.min(2, Number(value || 0)));
}

function updateQueuedGuest(guestId, updater) {
  let updatedGuest = null;
  state.guests = state.guests.map((entry) => {
    if (entry.id !== guestId) return entry;
    const nextGuest = typeof updater === 'function' ? updater(normalizeDeskInspectionGuest(entry, state)) : entry;
    updatedGuest = normalizeDeskInspectionGuest(
      applyPolicyToGuest(nextGuest, state.night),
      state
    );
    return updatedGuest;
  });
  return updatedGuest;
}

function inspectGuestId(guestId) {
  const actionKey = `desk-inspect-id-${guestId}`;
  if (!acquireActionLock(actionKey)) return;
  try {
    onMeaningfulAction();
    audioController.playUiClick();
    const guest = state.guests.find((entry) => entry.id === guestId);
    if (!guest) return;
    if (guest.idInspected) {
      pushLiveAlert(state, {
        type: 'info',
        message: `${guest.name}'s ID has already been inspected.`,
        dedupeKey: `desk-id-repeat-${guest.id}`
      });
      renderAll();
      return;
    }
    const updatedGuest = updateQueuedGuest(guestId, (currentGuest) => {
      const irregularities = Array.isArray(currentGuest?.idProfile?.irregularities)
        ? currentGuest.idProfile.irregularities
        : [];
      const forged = Boolean(currentGuest?.forgeryProfile?.isForged);
      return {
        ...currentGuest,
        idInspected: true,
        flagged: currentGuest.flagged || irregularities.length > 0 || currentGuest?.idProfile?.validity === 'Questionable' || forged,
        policyAlignmentLine: irregularities.length > 0 || currentGuest?.idProfile?.validity === 'Questionable'
          ? 'Desk read: document details do not line up cleanly.'
          : 'Desk read: identity details held together under closer inspection.',
        threadMemoryLine: [
          currentGuest.threadMemoryLine,
          irregularities.length > 0
            ? `ID irregularities: ${irregularities.join('; ')}.`
            : 'ID panel read clean under routine inspection.'
        ].filter(Boolean).join(' ')
      };
    });
    if (!updatedGuest) return;
    const idLine = updatedGuest?.idProfile?.validity === 'Questionable'
      ? `${updatedGuest.name}'s ID looked questionable under the desk lamp.`
      : `${updatedGuest.name}'s ID checked out with no immediate failure points.`;
    state.logs.push(idLine);
    if (updatedGuest?.idProfile?.irregularities?.length) {
      state.logs.push(`ID note: ${updatedGuest.idProfile.irregularities.join('; ')}.`);
    }
    if (updatedGuest?.forgeryProfile?.isForged) {
      state.logs.push(`${updatedGuest.name}'s paperwork now reads like an assembled identity rather than a clean issue.`);
      recordSuspectEvidence(updatedGuest, 'id-check');
    }
    pushLiveAlert(state, {
      type: updatedGuest.flagged ? 'warning' : 'info',
      message: updatedGuest.flagged ? `${updatedGuest.name}'s ID raised desk concerns.` : `${updatedGuest.name}'s ID read clean.`,
      dedupeKey: `desk-id-${updatedGuest.id}`
    });
    if (checkFailureState()) return;
    if (progressShift('inspectId', { timeScale: updatedGuest.flagged ? 1.1 : 0.8 })) return;
    renderAll();
  } finally {
    releaseActionLock(actionKey);
  }
}

function deepInspectGuest(guestId) {
  const actionKey = `desk-uv-${guestId}`;
  if (!acquireActionLock(actionKey)) return;
  try {
    onMeaningfulAction();
    audioController.playUiClick();
    const guest = state.guests.find((entry) => entry.id === guestId);
    if (!guest) return;
    if (guest.uvInspected) {
      pushLiveAlert(state, {
        type: 'info',
        message: `${guest.name} has already gone through UV inspection.`,
        dedupeKey: `desk-uv-repeat-${guest.id}`
      });
      renderAll();
      return;
    }
    const updatedGuest = updateQueuedGuest(guestId, (currentGuest) => {
      const suspicious = Boolean(currentGuest?.uvProfile?.suspicious);
      const deskLines = buildDeskUvObjectLines({ ...currentGuest, uvInspected: true });
      return {
        ...currentGuest,
        uvInspected: true,
        flagged: currentGuest.flagged || suspicious,
        deceptionSignal: clampDeskSignalValue(Number(currentGuest.deceptionSignal || 0) + (suspicious ? 1 : -1)),
        threadMemoryLine: [
          currentGuest.threadMemoryLine,
          suspicious
            ? `UV read found: ${(currentGuest?.uvProfile?.markers || []).join('; ')}.`
            : 'UV read did not reveal fresh tampering.',
          deskLines.length ? `Desk UV objects: ${deskLines.join(' · ')}` : ''
        ].filter(Boolean).join(' ')
      };
    });
    if (!updatedGuest) return;
    applyUvInspectionCrossRef(state, updatedGuest);
    state.logs.push(
      updatedGuest?.uvProfile?.suspicious
        ? `UV inspection on ${updatedGuest.name} exposed hidden marks: ${(updatedGuest.uvProfile.markers || []).join('; ')}.`
        : `UV inspection on ${updatedGuest.name} found no obvious tampering.`
    );
    if (updatedGuest?.uvProfile?.suspicious || updatedGuest?.factionProfile?.label) {
      recordSuspectEvidence(updatedGuest, 'uv-check');
    }
    pushLiveAlert(state, {
      type: updatedGuest?.uvProfile?.suspicious ? 'warning' : 'info',
      message: updatedGuest?.uvProfile?.suspicious
        ? `${updatedGuest.name} showed hidden UV-reactive marks.`
        : `${updatedGuest.name} cleared UV inspection.`,
      dedupeKey: `desk-uv-${updatedGuest.id}`
    });
    if (checkFailureState()) return;
    if (progressShift('deepInspect', { timeScale: updatedGuest?.uvProfile?.suspicious ? 1.2 : 1 })) return;
    renderAll();
  } finally {
    releaseActionLock(actionKey);
  }
}

function requestGuestDeposit(guestId) {
  const actionKey = `desk-deposit-${guestId}`;
  if (!acquireActionLock(actionKey)) return;
  try {
    onMeaningfulAction();
    audioController.playUiClick();
    const guest = state.guests.find((entry) => entry.id === guestId);
    if (!guest) return;
    if (guest.depositRequested) {
      pushLiveAlert(state, {
        type: 'info',
        message: `${guest.name} has already been asked for a deposit.`,
        dedupeKey: `desk-deposit-repeat-${guest.id}`
      });
      renderAll();
      return;
    }
    const riskWeight = guest.riskLevel === 'High' ? 2 : guest.riskLevel === 'Medium' ? 1 : 0;
    const depositAmount = 20 + riskWeight * 10 + (guest.contradictoryClue ? 5 : 0);
    const lowRiskWalk = guest.riskLevel === 'Low' && !guest.contradictoryClue && Math.random() < 0.38;
    if (lowRiskWalk) {
      state.guests = state.guests.filter((entry) => entry.id !== guestId);
      state.reputation = clampReputation(state.reputation - 1);
      state.logs.push(`${guest.name} bristled at the deposit request, muttered about the desk tone, and left the property.`);
      pushLiveAlert(state, {
        type: 'warning',
        message: `${guest.name} walked rather than leave a deposit.`,
        dedupeKey: `desk-deposit-walk-${guest.id}`
      });
    } else {
      const updatedGuest = updateQueuedGuest(guestId, (currentGuest) => ({
        ...currentGuest,
        depositRequested: true,
        requestedDepositAmount: depositAmount,
        urgencySignal: clampDeskSignalValue(Number(currentGuest.urgencySignal || 0) - 1),
        threadMemoryLine: [
          currentGuest.threadMemoryLine,
          `Desk requested a ${depositAmount}$ deposit before room release.`
        ].filter(Boolean).join(' ')
      }));
      state.money += depositAmount;
      addBudgetIncome('depositsHeld', depositAmount, `${updatedGuest.name} paid a caution deposit.`);
      state.reputation = clampReputation(state.reputation - 1);
      state.logs.push(`${updatedGuest.name} put down a ${depositAmount}$ deposit. The desk bought caution at the cost of goodwill.`);
      pushLiveAlert(state, {
        type: 'info',
        message: `${updatedGuest.name} paid a ${depositAmount}$ deposit.`,
        dedupeKey: `desk-deposit-${updatedGuest.id}`
      });
    }
    if (checkFailureState()) return;
    if (progressShift('deposit')) return;
    renderAll();
  } finally {
    releaseActionLock(actionKey);
  }
}

function requestSecondaryVerification(guestId) {
  const actionKey = `desk-verify-${guestId}`;
  if (!acquireActionLock(actionKey)) return;
  try {
    onMeaningfulAction();
    audioController.playUiClick();
    const guest = state.guests.find((entry) => entry.id === guestId);
    if (!guest) return;
    if (guest.secondaryVerified) {
      pushLiveAlert(state, {
        type: 'info',
        message: `${guest.name} already completed secondary verification.`,
        dedupeKey: `desk-verify-repeat-${guest.id}`
      });
      renderAll();
      return;
    }
    const updatedGuest = updateQueuedGuest(guestId, (currentGuest) => {
      const suspicious = currentGuest?.idProfile?.validity === 'Questionable'
        || Boolean(currentGuest?.uvProfile?.suspicious)
        || (currentGuest?.scannerMatches || []).length > 0
        || Boolean(currentGuest?.vehicleProfile?.warmEngine)
        || Boolean(currentGuest?.linkedArrival?.groupId);
      return {
        ...currentGuest,
        idInspected: true,
        secondaryVerified: true,
        flagged: currentGuest.flagged || suspicious,
        deceptionSignal: clampDeskSignalValue(Number(currentGuest.deceptionSignal || 0) + (suspicious ? 1 : -1)),
        instabilitySignal: clampDeskSignalValue(Number(currentGuest.instabilitySignal || 0) + (suspicious ? 0 : -1)),
        policyAlignmentLine: suspicious
          ? 'Secondary verification widened the mismatch instead of settling it.'
          : 'Secondary verification settled the desk read and lowered immediate uncertainty.'
      };
    });
    state.logs.push(
      updatedGuest.flagged
        ? `${updatedGuest.name} failed to reassure the desk during secondary verification.`
        : `${updatedGuest.name} answered secondary verification cleanly and looked more stable afterward.`
    );
    pushLiveAlert(state, {
      type: updatedGuest.flagged ? 'warning' : 'success',
      message: updatedGuest.flagged
        ? `${updatedGuest.name} remains a concern after extra verification.`
        : `${updatedGuest.name} cleared extra verification.`,
      dedupeKey: `desk-verify-${updatedGuest.id}`
    });
    if (checkFailureState()) return;
    if (progressShift('secondaryVerify')) return;
    renderAll();
  } finally {
    releaseActionLock(actionKey);
  }
}

function questionGuestFurther(guestId, questionId = 'inconsistency') {
  const actionKey = `desk-question-${guestId}-${questionId}`;
  if (!acquireActionLock(actionKey)) return;
  try {
    onMeaningfulAction();
    audioController.playUiClick();
    audioController.playStaticBurst('light');
    const guest = state.guests.find((entry) => entry.id === guestId);
    if (!guest) return;
    const catalog = buildDeskQuestionCatalog(guest);
    const question = catalog.find((entry) => entry.id === questionId) || catalog[0];
    const updatedGuest = updateQueuedGuest(guestId, (currentGuest) => {
      const irritate = Number(question?.irritation || 0);
      const revealBoost =
        question?.reveal === 'vehicle' && currentGuest?.vehicleProfile ? 1
        : question?.reveal === 'pair' && currentGuest?.linkedArrival ? 1
        : question?.reveal === 'forgery' && currentGuest?.forgeryProfile?.isForged ? 1
        : question?.reveal === 'document' && currentGuest?.idProfile?.irregularities?.length ? 1
        : question?.reveal === 'timing' && currentGuest?.linkedArrival ? 1
        : 0;
      return {
        ...currentGuest,
        secondaryVerified: currentGuest.secondaryVerified || question?.reveal === 'document',
        flagged: currentGuest.flagged || revealBoost > 0,
        deceptionSignal: clampDeskSignalValue(Number(currentGuest.deceptionSignal || 0) + revealBoost),
        instabilitySignal: clampDeskSignalValue(Number(currentGuest.instabilitySignal || 0) + irritate),
        threadMemoryLine: [
          currentGuest.threadMemoryLine,
          question?.note || 'Extra questioning produced no clean read.'
        ].filter(Boolean).join(' ')
      };
    });
    if (!updatedGuest) return;
    state.logs.push(`${updatedGuest.name}: extra questioning on ${String(question?.label || 'desk inconsistency').toLowerCase()} ${question?.note || 'produced no clean read.'}`);
    if (updatedGuest?.vehicleProfile?.id) {
      addSuspectBoardEntry({
        kind: 'vehicle',
        label: updatedGuest.vehicleProfile.type,
        detail: updatedGuest.vehicleProfile.summary,
        heat: updatedGuest.vehicleProfile.warmEngine ? 3 : 2
      });
    }
    if (updatedGuest?.linkedArrival?.groupId) {
      addSuspectBoardEntry({
        kind: 'group-link',
        label: updatedGuest.linkedArrival.kind,
        detail: updatedGuest.linkedArrival.note,
        heat: 2
      });
    }
    recordSuspectEvidence(updatedGuest, `question-${questionId}`);
    updateOnboarding((current) => markTutorialEvent(current, 'suspect-board-used'));
    pushLiveAlert(state, {
      type: updatedGuest.flagged ? 'warning' : 'info',
      message: updatedGuest.flagged
        ? `${updatedGuest.name} tightened under questioning.`
        : `${updatedGuest.name} held together under questioning.`,
      dedupeKey: `desk-question-${updatedGuest.id}-${questionId}`
    });
    if (checkFailureState()) return;
    if (progressShift('secondaryVerify', { timeScale: 0.9 })) return;
    renderAll();
  } finally {
    releaseActionLock(actionKey);
  }
}

function holdGuestForScreening(guestId) {
  const actionKey = `desk-hold-${guestId}`;
  if (!acquireActionLock(actionKey)) return;
  try {
    onMeaningfulAction();
    audioController.playUiClick();
    const guest = state.guests.find((entry) => entry.id === guestId);
    if (!guest) return;
    if (guest.heldForScreening) {
      pushLiveAlert(state, {
        type: 'info',
        message: `${guest.name} is already being held for extra screening.`,
        dedupeKey: `desk-hold-repeat-${guest.id}`
      });
      renderAll();
      return;
    }
    const updatedGuest = updateQueuedGuest(guestId, (currentGuest) => ({
      ...currentGuest,
      heldForScreening: true,
      flagged: true,
      urgencySignal: clampDeskSignalValue(Number(currentGuest.urgencySignal || 0) + 1),
      instabilitySignal: clampDeskSignalValue(Number(currentGuest.instabilitySignal || 0) - 1),
      threadMemoryLine: [
        currentGuest.threadMemoryLine,
        'Desk held this guest aside for a longer screening pass.'
      ].filter(Boolean).join(' ')
    }));
    state.reputation = clampReputation(state.reputation - 1);
    state.logs.push(`${updatedGuest.name} was held off to the side for extra screening. Safer, slower, and visibly tense.`);
    pushLiveAlert(state, {
      type: 'warning',
      message: `${updatedGuest.name} is being held for screening.`,
      dedupeKey: `desk-hold-${updatedGuest.id}`
    });
    if (checkFailureState()) return;
    if (progressShift('holdScreening', { timeScale: 1.1 })) return;
    renderAll();
  } finally {
    releaseActionLock(actionKey);
  }
}

function checkInGuest(guestId, requestedRoomId = null) {
  const actionKey = `desk-checkin-${guestId}`;
  if (!acquireActionLock(actionKey)) return;
  try {
  onMeaningfulAction();
  audioController.playUiClick();
  const guest = state.guests.find((entry) => entry.id === guestId);
  const requestedId = requestedRoomId == null || requestedRoomId === '' ? null : Number(requestedRoomId);
  let room = requestedId != null
    ? (state.rooms || []).find((entry) => Number(entry.id) === requestedId && entry?.unlocked !== false && !entry?.occupied && entry?.occupiedBy == null)
    : null;
  if (!room) {
    room = getAvailableRoom(state.rooms);
  }
  const roomOptions = getRoomAssignmentOptionsForGuest(guest, state.rooms);
  const roomDecisionMeta = roomOptions.find((entry) => Number(entry.roomId) === Number(room?.id)) || roomOptions[0] || null;

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
  if (guest.depositRequested && room.condition === 'Watch') {
    room.condition = 'Stable';
  }
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
  room.serviceState = getDefaultRoomServiceState(room?.serviceState);
  room.memory.nightsOccupied = Math.max(0, Number(room.memory.nightsOccupied || 0) + 1);
  if (guest.isReturningGuest) {
    room.memory.returningGuestVisits = Math.max(0, Number(room.memory.returningGuestVisits || 0) + 1);
    room.memory.note = `${guest.name} returned to the property with prior history attached.`;
  } else if (guest.archetypeLabel) {
    room.memory.note = `${guest.archetypeLabel} pressure has touched this room before.`;
  }
  if (guest?.factionProfile?.label) {
    room.memory.note = `${room.memory.note} Local network sign: ${guest.factionProfile.label}.`.trim();
  }
  if (guest?.linkedArrival?.groupId) {
    room.memory.note = `${room.memory.note} Linked-arrival pattern remains associated with this check-in.`.trim();
  }
  if (guest.secondaryVerified) {
    room.memory.note = `${room.memory.note} Desk completed secondary verification before releasing the room.`.trim();
  }
  if (guest.heldForScreening) {
    room.memory.note = `${room.memory.note} This room received a screened guest under visible lobby tension.`.trim();
  }
  room.serviceState.mood = guest.riskLevel === 'High' ? 'volatile' : guest.riskLevel === 'Medium' ? 'tense' : 'steady';
  room.serviceState.responseStatus = 'Checked in and settled.';
  room.serviceState.requestCooldown = guest.depositRequested || guest.secondaryVerified ? 1 : 0;
  room.serviceState.serviceHistory = [];
  room.serviceState.trust = guest.depositRequested || guest.secondaryVerified ? 1 : 2;
  room.serviceState.anxiety = guest.flagged ? 1 : 0;
  room.serviceState.irritation = 0;
  room.serviceState.hostility = 0;
  const attitude = deriveRoomAttitudeMeta(room.serviceState);
  room.serviceState.attitudeLabel = attitude.label;
  room.serviceState.attitudeNote = attitude.note;

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
  if (guest.flagged || guest.riskLevel === 'High' || policyResult === 'broken') {
    state.dirtyPressure = Math.min(10, (state.dirtyPressure || 0) + 1);
  }

  queueDeskConsequenceForAction('checkin', guest, room, policyResult);

  const incomeMult = Math.max(0.7, Number(state?.runModifiers?.moneyIncomeMult || 1));
  const roomIncome = Math.max(1, Math.round(20 * incomeMult));
  state.money += roomIncome;
  addBudgetIncome('occupancyIncome', roomIncome, `${guest.name} check-in posted room revenue.`);
  noteStaffOutcome('Desk Assistant', `Checked in ${guest.name} to ${room.label}.`, { fatigue: 0.04, morale: 0.02 });
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
  if (roomDecisionMeta) {
    state.logs.push(
      `Room assignment: ${room.label} was chosen as a ${roomDecisionMeta.score >= 18 ? 'cleaner' : roomDecisionMeta.score <= 14 ? 'riskier' : 'manageable'} fit (${roomDecisionMeta.reasons.join(', ')}).`
    );
  }
  markThreadOutcome(state, {
    action: 'checkin',
    guest,
    guestName: guest.name,
    riskLevel: guest.riskLevel,
    mood: guest.mood,
    linkedZone: room?.label,
    night: state.night
  });
  recordSuspectEvidence(guest, 'checkin');
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

  const roomAssignmentPenalty = roomDecisionMeta && roomDecisionMeta.score <= 14 ? 1 : 0;
  const roomAssignmentRelief = roomDecisionMeta && roomDecisionMeta.score >= 18 ? 1 : 0;
  const depositRelief = guest.depositRequested ? 1 : 0;
  const verificationRelief = guest.secondaryVerified ? 1 : 0;
  const netChainSeverity = Math.max(0, 1 + roomAssignmentPenalty - roomAssignmentRelief - depositRelief - verificationRelief);

  if (shouldSeedChain) {
    if (netChainSeverity > 0) {
      registerRoomChainSignal({
        roomId: room.id,
        guestName: guest.name,
        type: 'check-in-pressure',
        severity: netChainSeverity,
        extraBias: guest.incidentBias || 0
      });
      state.logs.push(
        `Chain reaction: desk approval seeded pressure in ${room.label}. If that room slides, incidents and rep loss will follow.`
      );
      if (roomAssignmentPenalty > 0) {
        state.logs.push(`${room.label} was a poor fit for this guest's pressure profile, increasing spillover risk.`);
      }
      pushLiveAlert(state, {
        type: 'warning',
        message: `${room.label} now carries elevated pressure from this check-in. Watch chain growth before it becomes incidents.`,
        dedupeKey: `checkin-chain-${room.id}-${guest.id}`
      });
    } else {
      state.logs.push(`${room.label} absorbed the check-in better than expected because desk screening and room choice reduced the pressure tail.`);
    }
  }

  if (window.DeadEndPhase2?.pushDecisionFeedback) {
    window.DeadEndPhase2.pushDecisionFeedback({
      repDelta: 1 + Number(policyOutcome.reputationDelta || 0),
      pressureDelta: shouldSeedChain ? netChainSeverity : 0,
      message: `${guest.name} accepted.`,
      consequence: shouldSeedChain
        ? (netChainSeverity > 0 ? 'Suspicion rises.' : 'Screening offset the usual pressure spike.')
        : 'Desk flow remains stable.'
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
  if (Number(state?.cameraInterferenceLevel || 0) >= 2 || String(state?.blackoutState?.level || '') === 'full') {
    audioController.playStaticBurst('heavy');
  }
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
  audioController.playPowerAction('breaker');
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
  audioController.playAlert('high');
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

  // Dispatch v0.23 custom event handlers before the generic resolver
  if (activeEventId === 'lost-found-claim') {
    handleLostFoundClaimChoice(optionId);
    return;
  }
  if (activeEventId === 'lot-payphone') {
    handleLotPayphoneChoice(optionId);
    return;
  }
  if (activeEventId === 'police-raid') {
    handleRaidChoice(optionId);
    return;
  }
  if (activeEventId === 'camera-sabotage') {
    handleCameraSabotageChoice(optionId);
    return;
  }
  if (activeEventId === 'burner-phone') {
    handleBurnerPhoneChoice(optionId);
    return;
  }
  if (activeEventId === 'unknown-caller') {
    handleUnknownCallerChoice(optionId);
    return;
  }
  if (activeEventId === 'front-desk-breach') {
    handleFrontDeskBreachChoice(optionId);
    return;
  }
  if (activeEventId === 'bleeding-walk-in') {
    handleBleedingWalkInChoice(optionId);
    return;
  }
  if (activeEventId === 'hunters') {
    handleHuntersChoice(optionId);
    return;
  }
  if (activeEventId === 'vending-dead-drop') {
    handleVendingDeadDropChoice(optionId);
    return;
  }
  if (activeEventId === 'staff-mutiny') {
    handleStaffMutinyChoice(optionId);
    return;
  }
  if (activeEventId === 'inside-leak') {
    handleInsideLeakChoice(optionId);
    return;
  }
  if (activeEventId === 'room9-intrusion') {
    handleRoom9Choice(optionId);
    return;
  }
  if (activeEventId === 'bagman-cop') {
    handleBagmanCopChoice(optionId);
    return;
  }

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
  audioController.playStaticBurst('light');
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
    addBudgetCost('emergencies', adjustedMoneyCost, `${sceneZone || 'Shared space'} response cost ${formatMoney(adjustedMoneyCost)}.`);
  }
  if (adjustedPowerCost > 0) {
    state.power = clampPower(state.power - adjustedPowerCost);
    addBudgetCost('utilities', adjustedPowerCost, `${sceneZone || 'Shared space'} action strained the utility margin.`);
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
  // Guard: already at summary or prep — do not double-end
  if (activeScreenId === 'summary-screen' || activeScreenId === 'night-prep-screen') {
    return false;
  }
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
    // Clear any stuck screen-transition lock so setActiveScreen('summary-screen') can fire
    isScreenTransitionInProgress = false;
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

  // v0.27 end-of-night hooks
  normalizeEvidenceLockerState();
  normalizeNemesisState();

  // Camera sabotage evidence
  const hadSabotage = (state.cameras || []).some((cam) => cam.sabotageType);
  if (hadSabotage) addEvidenceItem('sabotage-confirmed', state.night);

  // Named figure / faction presence evidence
  const hadNamedFigure = (state.guests || []).some((g) => g.namedPresence);
  if (hadNamedFigure) addEvidenceItem('named-figure-spotted', state.night);

  const hadFactionContact = (state.guests || []).some((g) => g.factionProfile?.id && g.factionProfile?.id !== 'phreaker-local');
  if (hadFactionContact) addEvidenceItem('faction-presence', state.night);

  // Mystery fragment unlock
  const fragment = checkMysteryFragmentUnlock(state);
  if (fragment) {
    state.evidenceLocker.mysteryFragmentsFound = (state.evidenceLocker.mysteryFragmentsFound || 0) + 1;
    addEvidenceItem(fragment.id, state.night);
    state.logs.push(`Previous manager discovery: ${fragment.label} — ${fragment.desc}`);
    pushLiveAlert(state, {
      type: 'info',
      message: `Evidence found: ${fragment.label}. Added to locker.`,
      dedupeKey: `mystery-fragment-${state.night}`
    });
  }

  // Trigger DOS reboot on high corruption, nemesis pressure 3, or collapse-class convergence
  const corruptionLevel = Number(state?.systemOverride?.corruptionLevel || 0);
  const nemesisPressure = Number(state?.nemesis?.pressureLevel || 0);
  const collapseShock =
    Boolean(state?.crisisNight?.trueCrisisNight) && Number(state?.crisisNight?.convergenceTier || 0) >= 3;
  if (corruptionLevel >= 3 || nemesisPressure >= 3 || collapseShock) {
    triggerDosRebootOverlay();
  }

  // v0.28 dirty ledger end-of-night checks
  normalizeDirtyState();
  const _totalDirty = state.dirtyLedger?.totalDirtyMoney || 0;
  const _offBook = state.dirtyLedger?.offBookStays || 0;
  const _drops = state.dirtyLedger?.deadDrops || 0;
  // Torn ledger fragment at end of night if enough dirty history
  if (_totalDirty >= 60 || (_offBook + _drops) >= 2) {
    addEvidenceItem('torn-ledger-fragment', state.night);
  }
  // Shadow rep influences unknown caller and nemesis next night
  if (Number(state.shadowRep || 0) <= -4 && state.nemesis) {
    escalateNemesisPressure();
  }

  // v0.29 staff paranoia end-of-night
  normalizeStaffV29();
  maybeCompromiseStaff();
  const _s29Roster = state?.dayShift?.staff?.roster || [];
  _s29Roster.forEach(m => { if (typeof m.fear === 'number') m.fear = Math.max(0, m.fear - 0.05); });
  const _s29comp = getCompromisedStaff();
  if (_s29comp && Number(_s29comp.badOutcomeCount || 0) >= 2) addEvidenceItem('staff-falsified-report', state.night);
  if (_s29comp && (state.dirtyLedger?.totalDirtyMoney || 0) > 0) addEvidenceItem('payroll-discrepancy', state.night);
  if (_s29comp && state.staffIntel?.mutinyFired) addEvidenceItem('altered-repair-slip', state.night);

  // v0.30 protected room end-of-night
  normalizeProtectedRoom();
  const _r9EndNight = Number(state.night || 1);
  if (_r9EndNight >= 2) {
    const _r9ExpectedLevel = Math.min(4, Math.floor((_r9EndNight - 1) / 2));
    if (_r9ExpectedLevel > Number(state.protectedRoom.pressureLevel || 0)) {
      state.protectedRoom.pressureLevel = _r9ExpectedLevel;
    }
  }
  // Clear camera contamination marks at end of night
  if (Array.isArray(state.cameras)) {
    state.cameras.forEach(c => { if (c.contaminationMark) c.contaminationMark = false; });
  }
  // Surface Room 9 evidence at key pressure thresholds
  const _r9Level = Number(state.protectedRoom.pressureLevel || 0);
  const _r9Found = state.protectedRoom.evidenceFound || [];
  if (_r9Level >= 2 && !_r9Found.includes('sealed-housekeeping-memo')) {
    addEvidenceItem('sealed-housekeeping-memo', state.night);
    state.protectedRoom.evidenceFound = [..._r9Found, 'sealed-housekeeping-memo'];
  }
  if (_r9Level >= 3 && !_r9Found.includes('old-room-ledger')) {
    addEvidenceItem('old-room-ledger', state.night);
    state.protectedRoom.evidenceFound = [...(state.protectedRoom.evidenceFound), 'old-room-ledger'];
  }

  // v0.31 town end-of-night
  normalizeTownState();
  buildDailyHeadline();
  const _t31 = state.townState;
  // Passive suspicion: escalates when dirty or cop refused
  if (Number(state.dirtyLedger?.dirtyScore || 0) >= 2) {
    _t31.townSuspicion = Math.min(10, (_t31.townSuspicion || 0) + 1);
  }
  if (Number(state.dirtyLedger?.shadowRep || 0) >= 4) {
    _t31.corruption = Math.min(10, (_t31.corruption || 0) + 1);
  }

  // Activate / escalate nemesis
  maybeActivateNemesis();
  if (state.nemesis?.active) {
    const huntThisNight = state.huntNight?.night === state.night && !state.huntNight?.resolved;
    if (huntThisNight) escalateNemesisPressure();
    // Nemesis escapes if unresolved after 3+ nights active
    const nightsSinceActive = state.night - (state.nemesis.lastNight || state.night);
    if (nightsSinceActive >= 3 && !state.nemesis.resolvedOutcome) {
      resolveNemesis('escaped');
    }
  }

  // Front desk breach: rare trigger when nemesis is high pressure
  if (state.nemesis?.active && state.nemesis.pressureLevel >= 2 && !state.activeNightEvent) {
    if (Math.random() < 0.28) {
      triggerFrontDeskBreachEvent();
    }
  }
  if (!state.activeNightEvent && state?.crisisNight?.trueCrisisNight && Math.random() < 0.12) {
    triggerFrontDeskBreachEvent();
  }
  if ((state.shiftStats.nightEventsMissed || 0) === 0 && (state.shiftStats.unresolvedLocationScenes || 0) === 0) {
    state.shiftStats.carryoverProblemsContained = (state.shiftStats.carryoverProblemsContained || 0) + 1;
  }
  const nextNightIndex = Number(state.night || 1) + 1;
  state.carryoverBriefing = buildIncomingNightNotes(state, nextNightIndex);

  const dawnAuditorResult = resolveDawnAuditorAtDawn(state);
  if (Array.isArray(dawnAuditorResult.lines) && dawnAuditorResult.lines.length) {
    dawnAuditorResult.lines.forEach((ln) => state.logs.push(ln));
  }

  try {
    renderTopbar(buildRenderState());
  } catch (topbarErr) {
    console.error('[endNight] renderTopbar failed:', topbarErr);
  }

  let _endNightSummary = null;
  let _endNightShouldEndRun = false;
  try {
    recordCampaignConvergenceNight(state);
    _endNightSummary = buildNightSummary(state);
    const _demBonusLines = applyMonetizationDawnBonuses();
    if (Array.isArray(_demBonusLines) && _demBonusLines.length && _endNightSummary) {
      if (!Array.isArray(_endNightSummary.breakdown)) _endNightSummary.breakdown = [];
      _endNightSummary.breakdown.push(..._demBonusLines);
    }
    if (isEndlessMode(state)) {
      recordEndlessWaveStats(state, _endNightSummary);
    }
    state.lastSummary = _endNightSummary;
    state.finalePerformance = buildFinalePerformanceContext(state);
    registerCampaignNightSuccess(state, { summary: _endNightSummary });
    const campaignContext = getCampaignContext();
    _endNightShouldEndRun = shouldEndRunAfterSuccessfulNight(state, state.night);
    state.pendingRunCompletion = _endNightShouldEndRun;
    if (_endNightShouldEndRun) {
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
      _endNightShouldEndRun
        ? 'Final campaign night complete. The motel legacy is ready for review.'
        : campaignContext.nextMilestone.isFinale
          ? "Final night approaching: tomorrow decides the motel's long-run posture."
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
    state.summaryIdentityLines.unshift(buildNightMoodLine(state, buildOwnerPressureBrief(), getEmergencyNightProfile(state)));
    normalizeAnalogSurvivalState(state);
    const analogRecall = (state.analogSurvival?.analogNightLog || []).filter(Boolean).slice(-2);
    if (analogRecall.length) {
      state.summaryIdentityLines.push(`Breaker / neon / operator: ${analogRecall.join(' · ')}`);
    }
    normalizeForensicNoirState(state);
    const forensicRecall = (state.forensicNoir?.shiftLog || []).filter(Boolean).slice(-2);
    if (forensicRecall.length) {
      state.summaryIdentityLines.push(`Forensic / objects: ${forensicRecall.join(' · ')}`);
    }
    const _ccStats = state?.campaignCollapseStats;
    if (_ccStats && (Number(_ccStats.trueCrisisNights || 0) >= 1 || Number(_ccStats.peakConvergenceTier || 0) >= 3)) {
      state.summaryIdentityLines.push(
        `Campaign convergence: peak tier ${Number(_ccStats.peakConvergenceTier || 0)}, ${Number(_ccStats.trueCrisisNights || 0)} collapse-class night(s) logged.`
      );
    }
    state.summaryIdentityLines = state.summaryIdentityLines.filter(Boolean).slice(0, 6);
    if ((state.shiftStats.nightEventsMissed || 0) === 0 && (state.shiftStats.unresolvedLocationScenes || 0) === 0) {
      applyIdentityImpact({
        doctrine: { stability: 1, compassion: 1 },
        factions: { ownership: 1, staff: 1, guests: 1 },
        reason: 'calm night close'
      });
    }
    const outcomeFlavor = buildOutcomeFlavor(state, _endNightSummary);
    const phase2ResultLabel = window.DeadEndPhase2?.buildReplaySummary
      ? window.DeadEndPhase2.buildReplaySummary(state, _endNightSummary)
      : '';
    if (phase2ResultLabel) {
      outcomeFlavor.note = `${outcomeFlavor.note || ''}${outcomeFlavor.note ? ' \u2022 ' : ''}Run Result: ${phase2ResultLabel}`;
      state.campaignSummaryNotes = [`Run Result: ${phase2ResultLabel}`, ...(state.campaignSummaryNotes || [])].slice(0, 3);
    }
    settleBetweenNightDayShift(_endNightSummary);
    state.shiftPressureSnapshot = buildShiftPressureSnapshot(_endNightSummary);
    if (options.force) {
      audioController.playDawn();
    } else {
      audioController.playSummary();
    }
    renderSummary(_endNightSummary, state, outcomeFlavor);
    updateOnboarding((current) => markTutorialEvent(current, 'night-complete', { night: state.night }));
  } catch (endNightErr) {
    console.error('[endNight] summary build/render failed:', endNightErr);
    state.logs = Array.isArray(state.logs) ? state.logs : [];
    state.logs.push('Shift close error: ' + String(endNightErr?.message || 'unknown') + '. Transitioning to summary.');
    pushLiveAlert(state, {
      type: 'danger',
      message: 'Summary failed to load - transitioning to end of night. Check console for details.',
      dedupeKey: 'endnight-error-' + (state.night || 0)
    });
  } finally {
    setActiveScreen('summary-screen');
    const nextNightButton = document.getElementById('next-night-btn');
    if (nextNightButton) {
      nextNightButton.textContent = _endNightShouldEndRun ? 'View Run Ending' : 'Next Night';
    }
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
    triggerSignatureIncident('review');
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
  normalizeStaffManagementState();
  const identity = getIdentityContext();
  const staffProfile = getNightStaffProfile(state);
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
      Number(identity.factionMods.staffDispatchBonus || 0) +
      (Number(staffProfile.rosterStrength || 0.5) - 0.5) * 0.24 +
      (staffProfile.focus === 'security-heavy' ? 0.06 : 0) +
      (staffProfile.hasSecurity ? 0.04 : -0.06)
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
  addBudgetCost('emergencies', dispatchFee, `Dispatch mobilization cost ${formatMoney(dispatchFee)}.`);
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
    noteStaffOutcome('Security', 'Dispatch landed cleanly.', { fatigue: 0.07, morale: 0.03 });
    registerFinaleContainment(state, 1);
    applyIdentityImpact({
      doctrine: { stability: 1, compassion: 1 },
      factions: { staff: 1, ownership: 1 },
      stats: { staffAssists: 1 },
      reason: 'staff dispatch success'
    });
  }

  if (result.responded && result.success === false) {
    noteStaffOutcome('Security', 'Dispatch missed the room pressure.', { fatigue: 0.09, morale: -0.04 });
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

  const preRoom = state.rooms[roomIndex];
  const preGuestName = preRoom?.occupiedBy || preRoom?.guestName || '';
  const preLabel = preRoom?.label || '';

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

  if (preGuestName) {
    maybeSpawnLostFoundOnEvict(state, preGuestName, preLabel, preRoom?.riskLevel);
  }

  if (checkFailureState()) return;
  if (progressShift('evict')) return;
  renderAll();
}

function restartCurrentNight() {
  if (activeScreenId !== 'failure-screen') return;
  if (!confirmIfNeeded(`Retry Night ${Math.max(1, Number(state?.night || 1))} from its frozen opening state? Failed progress from this night will be discarded.`)) {
    return;
  }
  onMeaningfulAction();
  audioController.playUiClick();
  restoreNightStartSnapshot({
    message: `Night ${Math.max(1, Number(state?.night || 1))} retried from its frozen opening state.`
  });
}

function restartCampaignFromFailure() {
  if (activeScreenId !== 'failure-screen') return;
  startFreshCampaignRun();
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
  ensureCrisisEscalationState(state);
  state.rooms = tickEscalationRooms(state.rooms);
  state.rooms = tickResponseCooldowns(state.rooms);
  state.rooms = tickTacticalRooms(state.rooms);
  const blackout = getBlackoutPressureState(state);
  state.rooms = (state.rooms || []).map((room) => {
    const serviceState = getDefaultRoomServiceState(room?.serviceState);
    return {
      ...room,
      serviceState: {
        ...serviceState,
        requestCooldown: Math.max(0, Number(serviceState.requestCooldown || 0) - 1),
        mood: buildRoomServiceMood({ ...room, serviceState }),
        urgency:
          blackout.urgencyBonus > 0 && serviceState.pendingRequest && serviceState.urgency !== 'high'
            ? 'high'
            : serviceState.urgency
      }
    };
  });

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

  maybeGenerateOccupiedRoomRequest('escalation');
  if (Math.random() < ((state?.crisisNight?.active ? 0.12 : 0.06) + (blackout.active ? 0.06 : 0))) {
    maybeCreateSharedSpacePressure('escalation');
  }
  if (
    (state?.crisisNight?.kind === 'guest-surge' || blackout.active || state?.crisisNight?.kind === 'hostile-social-night') &&
    Math.random() < (blackout.level === 'full' ? 0.3 : 0.16)
  ) {
    state.crisisEscalation.overlapPressureLevel = Math.max(
      Number(state?.crisisEscalation?.overlapPressureLevel || 0),
      blackout.level === 'full' ? 3 : 2
    );
    state.crisisEscalation.hallwayThreatLevel = Math.max(
      Number(state?.crisisEscalation?.hallwayThreatLevel || 0),
      state?.crisisNight?.kind === 'hostile-social-night' || blackout.active ? 2 : 1
    );
    state.crisisEscalation.cameraInterferenceLevel = Math.max(
      Number(state?.crisisEscalation?.cameraInterferenceLevel || 0),
      blackout.level === 'full' ? 3 : blackout.level === 'partial' ? 2 : 1
    );
    maybeGenerateOccupiedRoomRequest('overlap');
  }
}

function nextNight() {
  if (activeScreenId !== 'night-prep-screen') return;
  onMeaningfulAction();
  audioController.playUiClick();
  cleanupTransientUiState('next-night');
  updateOnboarding((current) => markTutorialEvent(current, 'prep-opened'));
  state.night += 1;
  state.deadDropRevealRolledNight = null;
  applyFixerDebtIfDue(state);
  state.failedState = null;
  state.pendingRunCompletion = false;
  normalizeEndlessRunState(state);
  decayRoadWorldBetweenNights(state);
  if (darkWebContractsEnabled(state)) {
    const nx = String(state.endlessRun.nextDarkContractId || '');
    if (nx && getDarkContractById(nx)) {
      state.endlessRun.selectedDarkContractId = nx;
      state.endlessRun.lastContractId = nx;
      state.endlessRun.nextDarkContractId = '';
    } else if (!String(state.endlessRun.selectedDarkContractId || '')) {
      const pick = pickDarkContractOffers(state, 1)[0];
      if (pick) {
        state.endlessRun.selectedDarkContractId = pick.id;
        state.endlessRun.lastContractId = pick.id;
      }
    }
  }
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
  state = normalizeRoomServiceState(state);
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
  applyRivalSkimToIntake(state);
  normalizeIntakeState(state);
  normalizeBasementSyndicate(state);
  if (state.basementSyndicate?.unlockedEver) {
    state.basementSyndicate.heat = Math.max(0, n(state.basementSyndicate.heat, 0) - 0.55);
  }
  resetBasementNightFlags(state);
  ensureCrisisNightState(state);
  state.activeEvents = [];
  state.incidents = [];
  state.storyChains = [];
  state.shiftStats = createShiftStats();
  state.powerEconomy = buildFreshPowerEconomy();
  resetAnalogForNewShift(state);
  resetForensicForNewNight(state);
  resetOperatorNoirForNewNight(state);
  resetBorderTransferForNewNight(state);
  resetFinalWinterPerNight(state);
  bumpRivalPressureOnPrep(state);
  const _ddrNext = tryRevealManagerDeadDrop(metaState, state);
  if (_ddrNext.meta) {
    metaState = _ddrNext.meta;
    saveMetaSafe();
  }
  if (darkWebContractsEnabled(state)) {
    applyDarkContractRuntime(state, state.endlessRun.selectedDarkContractId);
    applyContractAnalogHooks(state);
    applyContractStaffHook(state);
    applyContractWeatherHook(state);
    rollDawnAuditor(state);
  } else {
    clearContractRuntime(state);
    rollDawnAuditor(state);
  }
  applyNightStartProgression(state);
  applyDayShiftPlanForNightStart();
  state.cameraScene = buildFreshCameraSceneState();
  resetLocationStateForNight(state);
  state.autoIncidentCooldown = 0;
  state.escalationTick = 0;
  state.shiftElapsedMinutes = 0;
  state._demCalmBoostApplied = false;
  state.dawnProcessed = false;
  state.lastAdvanceReason = null;
  state.summaryBranchNotes = [];
  state.campaignSummaryNotes = [];
  state.dirtyPressure = 0;
  state.raidTriggered = false;
  state.raidStatus = 'none';
  state.cameraSabotageTriggered = false;
  state.burnerPhoneOffered = false;
  state.unknownCallerFired = false;
  state.radioInterceptionUsed = false;
  state.breachEventFired = false;
  normalizeEvidenceLockerState();
  normalizeNemesisState();
  normalizeDirtyState();
  // Reset per-night dirty flags but keep cross-night state
  if (state.bleedingWalkInState) state.bleedingWalkInState.offered = false;
  if (state.vendingDropState) state.vendingDropState.offered = false;
  normalizeStaffV29();
  if (state.staffIntel) state.staffIntel.insideLeakFired = false;
  normalizeProtectedRoom();
  if (state.protectedRoom) {
    state.protectedRoom.contaminationFired = false;
    state.protectedRoom.room9EventFiredTonight = false;
  }
  normalizeTownState();
  normalizeDayShiftNotes();
  if (state.townState) state.townState.djBroadcastFiredTonight = false;
  generateDayShiftNote();
  state = assignScenarioForNight(state);
  state = normalizePresentationState(state);
  state = normalizeSpecialEncounterState(state);
  state = normalizeNightEventState(state);
  state = normalizeDeskConsequenceState(state);
  normalizeCampaignDepthState();
  normalizeStaffManagementState();
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
  normalizeDeskInspectionState(state);
  ensureCrisisEscalationState(state);
  setNightPrepVisited(state, false);
  pushLiveAlert(state, {
    type: 'info',
    message: `Night ${state.night} started — ${state?.activeScenario?.label || 'Standard Shift'}.`,
    dedupeKey: `scenario-start-${state.night}`
  });
  pushOpeningTensionBeat('carryover');
  captureNightStartSnapshot('next-night-open', { force: true });

  renderAll();
  setActiveScreen('game-screen');
  setActivePanel('frontdesk-panel');
}

function bindEvents() {
  const moveToMainMenuSafely = () => {
    if (activeScreenId === 'failure-screen') {
      if (!confirmIfNeeded('Return to main menu? This failed run will be logged in your archive.')) {
        return;
      }
      tryRecordCampaignFailureMeta();
      setActiveScreen('main-menu');
      renderAll();
      return;
    }
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
  document.getElementById('radio-intercept-btn')?.addEventListener('click', performRadioInterception);
  document.getElementById('restart-night-btn').addEventListener('click', restartCurrentNight);
  document.getElementById('restart-campaign-btn').addEventListener('click', restartCampaignFromFailure);
  document.getElementById('failure-menu-btn').addEventListener('click', moveToMainMenuSafely);
  document.getElementById('audio-toggle-btn').addEventListener('click', toggleAudio);
  document.getElementById('open-help-btn').addEventListener('click', () => toggleHelpOverlay(true));
  document.getElementById('main-menu-reroll-btn').addEventListener('click', rerollFirstNightScenario);
  document.getElementById('main-menu-reset-campaign-btn')?.addEventListener('click', handleMainMenuResetCampaign);
  document.getElementById('main-menu-endless-btn')?.addEventListener('click', handleQuickEndlessSetup);

  const appRoot = document.getElementById('app');
  if (appRoot && !appRoot.dataset.v35UiDelegation) {
    appRoot.dataset.v35UiDelegation = '1';
    appRoot.addEventListener('click', (e) => {
      const pickBtn = e.target.closest('[data-dark-contract-id]');
      if (pickBtn && activeScreenId === 'night-prep-screen') {
        handleSelectDarkContract(pickBtn.getAttribute('data-dark-contract-id'));
        e.preventDefault();
        return;
      }
      if (e.target.closest('[data-dawn-auditor-cleanup]')) {
        handleDawnAuditorCleanup();
        e.preventDefault();
      }
      if (e.target.closest('[data-dawn-shredder]')) {
        handleDawnShredder();
        e.preventDefault();
      }
      if (e.target.closest('[data-dawn-incinerator]')) {
        handleDawnIncinerator();
        e.preventDefault();
      }
      if (e.target.closest('[data-dawn-blackmail]')) {
        handleDawnBlackmail();
        e.preventDefault();
      }
      if (e.target.closest('[data-four-am-fixer]')) {
        handleFourAmFixer();
        e.preventDefault();
      }
      const bsf = e.target.closest('[data-basement-focus]');
      if (bsf && activeScreenId === 'game-screen') {
        handleBasementFocus(bsf.getAttribute('data-basement-focus'));
        e.preventDefault();
      }
      if (e.target.closest('[data-basement-skim]') && activeScreenId === 'game-screen') {
        handleBasementSkim();
        e.preventDefault();
      }
      const dds = e.target.closest('[data-dead-drop-seal]');
      if (dds && activeScreenId === 'failure-screen') {
        handleDeadDropSeal(dds.getAttribute('data-dead-drop-seal'));
        e.preventDefault();
      }
      if (e.target.closest('[data-road-fund-drifters]')) {
        handleFundDrifterNetwork();
        e.preventDefault();
      }
      if (e.target.closest('[data-road-feed-hound]')) {
        handleFeedMotelHound();
        e.preventDefault();
      }
      const opListen = e.target.closest('[data-operator-listen]');
      if (opListen && activeScreenId === 'game-screen') {
        handleOperatorSwitchboardListen(opListen.getAttribute('data-operator-listen'));
        e.preventDefault();
        return;
      }
      const opQ = e.target.closest('[data-operator-quarters]');
      if (opQ && activeScreenId === 'game-screen') {
        handleOperatorQuartersResolve(opQ.getAttribute('data-operator-quarters'));
        e.preventDefault();
        return;
      }
      const bStage = e.target.closest('[data-border-staging]');
      if (bStage && activeScreenId === 'game-screen') {
        handleBorderStagingChoice(bStage.getAttribute('data-border-staging'));
        e.preventDefault();
        return;
      }
      const bWit = e.target.closest('[data-border-witness]');
      if (bWit && activeScreenId === 'game-screen') {
        handleBorderWitnessChoice(bWit.getAttribute('data-border-witness'));
        e.preventDefault();
        return;
      }
    });
  }

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

// Dawn integrity watchdog — last-resort fallback only.
// Primary fix is dawn check first in progressShift. This catches any remaining
// edge case where the game is stuck at dawn (e.g., endNight threw, transition
// lock was stuck, or no player action was available after time crossed 480).
// NOTE: endNight() guards against double-ending via activeScreenId check.
setInterval(function dawnWatchdog() {
  try {
    if (activeScreenId !== 'game-screen') return;
    if (!state) return;
    if (!hasReachedDawn(state)) return;
    // Still on game-screen at dawn — force close regardless of dawnProcessed flag
    state.shiftElapsedMinutes = SHIFT_DURATION_MINUTES;
    state.dawnProcessed = true;
    if (state.raidStatus === 'pending') {
      state.reputation = Math.max(0, (state.reputation || 50) - 18);
      state.raidStatus = 'auto-resolved-dawn';
      state.logs.push('Watchdog: raid auto-resolved at dawn — heavy reputation loss.');
    }
    pushLiveAlert(state, {
      type: 'warning',
      message: '6:00 AM — shift closing (watchdog fallback active).',
      dedupeKey: 'dawn-watchdog-night-' + (state.night || 0)
    });
    if (checkFailureState() !== true) {
      endNight({ force: true });
    }
  } catch (watchdogErr) {
    console.error('[dawnWatchdog] endNight failed:', watchdogErr);
  }
}, 5000);

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
