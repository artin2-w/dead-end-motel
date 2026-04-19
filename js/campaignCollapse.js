/**
 * v0.34 — Late-campaign convergence: multi-vector readout, true crisis nights, run stats for endings/summary.
 */

import { getBreakerBoardSummary } from './analogSurvival.js';

function n(value, fallback = 0) {
  const x = Number(value);
  return Number.isFinite(x) ? x : fallback;
}

export function evaluateCampaignConvergence(state) {
  const night = Math.max(1, n(state?.night, 1));
  const campaignLen = Math.max(3, n(state?.campaign?.length, 5));
  const lateStretch = night >= campaignLen - 1 || night >= Math.max(3, Math.ceil(campaignLen * 0.62));

  const vectors = [];

  const pr = state?.protectedRoom || {};
  if (n(pr.pressureLevel, 0) >= 1 || n(pr.contaminationCount, 0) >= 1 || pr.knownToPlayer) {
    vectors.push({ id: 'room9', label: 'Room 9 / owner trace' });
  }

  const nem = state?.nemesis || {};
  if (nem.active && n(nem.pressureLevel, 0) >= 2) vectors.push({ id: 'nemesis', label: 'Nemesis pressure' });
  else if (nem.active) vectors.push({ id: 'nemesis', label: 'Nemesis (watching)' });

  const roster = Array.isArray(state?.dayShift?.staff?.roster) ? state.dayShift.staff.roster : [];
  const activeStaff = roster.filter((m) => m && m.active !== false);
  const avgMor =
    activeStaff.length > 0
      ? activeStaff.reduce((s, m) => s + n(m.morale, 0.56), 0) / activeStaff.length
      : 0.56;
  const si = state?.staffIntel || {};
  if (si.mutinyFired || (Array.isArray(si.suspicionHints) && si.suspicionHints.length >= 2) || avgMor < 0.38) {
    vectors.push({ id: 'staff', label: 'Staff fracture' });
  }

  const dl = state?.dirtyLedger || {};
  const dirtyScore = n(dl.dirtyScore, Math.min(10, n(dl.totalDirtyMoney, 0) / 20));
  if (dirtyScore >= 3 || n(state?.dirtyPressure, 0) >= 3) vectors.push({ id: 'dirty', label: 'Dirty ledger' });

  const town = state?.townState || {};
  if (n(town.townSuspicion, 0) >= 4 || n(town.corruption, 0) >= 2 || town.bagmanFired) {
    vectors.push({ id: 'town', label: 'Town heat' });
  }

  const items = Array.isArray(state?.evidenceLocker?.items) ? state.evidenceLocker.items : [];
  const uvC = items.filter((it) => it?.uvConfirmed).length;
  const tapeC = items.filter((it) => it?.tapeSecured).length;
  if (items.length >= 5 || uvC >= 2 || tapeC >= 2) vectors.push({ id: 'evidence', label: 'Evidence weight' });

  let gridStrain = false;
  try {
    const br = getBreakerBoardSummary(state);
    if (br && n(br.load, 0) >= n(br.budget, 99) - 1) gridStrain = true;
  } catch (_) {
    /* optional module */
  }
  if (gridStrain || n(state?.analogSurvival?.operatorFatigue, 0) >= 60) {
    vectors.push({ id: 'grid', label: 'Grid / operator strain' });
  }

  if (n(state?.crisisEscalation?.hallwayThreatLevel, 0) >= 2 || n(state?.crisisEscalation?.overlapPressureLevel, 0) >= 2) {
    vectors.push({ id: 'overlap', label: 'Shared-space breach' });
  }

  const vectorCount = vectors.length;
  const tier = vectorCount >= 7 ? 4 : vectorCount >= 5 ? 3 : vectorCount >= 3 ? 2 : vectorCount >= 2 ? 1 : 0;
  const readout = vectors
    .slice(0, 5)
    .map((v) => v.label)
    .join(' · ');
  return {
    tier,
    score: vectorCount,
    vectors,
    vectorCount,
    readout: readout || 'Systems not yet threaded into one hazard',
    lateStretch
  };
}

export function recordCampaignConvergenceNight(state) {
  if (!state || typeof state !== 'object') return;
  const c = state.crisisNight && typeof state.crisisNight === 'object' ? state.crisisNight : {};
  const conv = evaluateCampaignConvergence(state);
  state.campaignCollapseStats =
    state.campaignCollapseStats && typeof state.campaignCollapseStats === 'object'
      ? state.campaignCollapseStats
      : { peakConvergenceTier: 0, trueCrisisNights: 0, totalVectorHits: 0 };
  const peak = Math.max(n(state.campaignCollapseStats.peakConvergenceTier, 0), n(c.convergenceTier, conv.tier));
  state.campaignCollapseStats.peakConvergenceTier = peak;
  if (c.trueCrisisNight) {
    state.campaignCollapseStats.trueCrisisNights = n(state.campaignCollapseStats.trueCrisisNights, 0) + 1;
  }
  const hits = Array.isArray(c.convergenceVectors) ? c.convergenceVectors.length : n(conv.vectorCount, 0);
  state.campaignCollapseStats.totalVectorHits = n(state.campaignCollapseStats.totalVectorHits, 0) + hits;
}

export function normalizeCampaignCollapseStats(state) {
  if (!state || typeof state !== 'object') return state;
  state.campaignCollapseStats =
    state.campaignCollapseStats && typeof state.campaignCollapseStats === 'object'
      ? {
          peakConvergenceTier: Math.max(0, n(state.campaignCollapseStats.peakConvergenceTier, 0)),
          trueCrisisNights: Math.max(0, n(state.campaignCollapseStats.trueCrisisNights, 0)),
          totalVectorHits: Math.max(0, n(state.campaignCollapseStats.totalVectorHits, 0))
        }
      : { peakConvergenceTier: 0, trueCrisisNights: 0, totalVectorHits: 0 };
  return state;
}

export function buildCollapsePrepBrief(state) {
  normalizeCampaignCollapseStats(state);
  const stats = state.campaignCollapseStats;
  const conv = evaluateCampaignConvergence(state);
  if (n(stats.peakConvergenceTier, 0) < 2 && conv.tier < 2) return '';
  const survived = n(stats.trueCrisisNights, 0);
  return `Convergence peak tier ${Math.max(n(stats.peakConvergenceTier, 0), conv.tier)}${survived ? ` • ${survived} collapse night(s) survived` : ''}. Next shift: bleed pressure early or systems will keep colliding.`;
}
