import { getZoneTags, getAnomalyTags, applyTagWeighting } from './branchingCatalog.js';
import {
  getFreshScanZoneWeightMultiplier,
  shouldHardSkipZoneForFreshAnomaly
} from './cameraScenes.js';

const CAMERA_ANOMALIES = [
  {
    status: 'Static',
    severity: 'low',
    buildLog: (name) => `${name} feed broke into static for a few seconds.`
  },
  {
    status: 'Blocked',
    severity: 'medium',
    buildLog: (name) => `${name} camera was partially blocked by something moving close to the lens.`
  },
  {
    status: 'Movement Detected',
    severity: 'medium',
    buildLog: (name) => `Unexpected movement was detected on ${name}.`
  },
  {
    status: 'Door Ajar',
    severity: 'high',
    buildLog: (name) => `${name} shows a door standing open when it should be closed.`
  },
  {
    status: 'Shadow Figure',
    severity: 'high',
    buildLog: (name) => `A shadowy figure appeared briefly on ${name} and then vanished.`
  },
  {
    status: 'Camera Loop',
    severity: 'medium',
    buildLog: (name) => `${name} feed appears to be looping old footage over live traffic.`
  },
  {
    status: 'Heat Bloom',
    severity: 'high',
    buildLog: (name) => `${name} thermal profile surged without matching visible movement.`
  },
  {
    status: 'Relay Drift',
    severity: 'medium',
    buildLog: (name) => `${name} relay timing drifted and desynced with adjacent camera clocks.`
  },
  {
    status: 'Crowd Murmur',
    severity: 'low',
    buildLog: (name) => `${name} picked up clustered motion and scattered voices without clear source.`
  }
];

function pickRandom(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function pickAnomalyCameraIndexes(cameras = [], count = 1, branchContext = null, history = {}, state = null, logs = null) {
  const selected = [];
  const available = cameras.map((camera, index) => ({ camera, index }));

  for (let i = 0; i < count && available.length > 0; i += 1) {
    const eligible = state
      ? available.filter((entry) => !shouldHardSkipZoneForFreshAnomaly(state, entry.camera.id))
      : available;
    const pool = eligible.length ? eligible : [];

    if (pool.length === 0) {
      if (state && logs) {
        logs.push(
          'Fresh sweep routing: every monitored zone is under an active durable/root containment window with no escalation break — no random camera hit assigned this slot.'
        );
      }
      break;
    }

    if (i === 0 && state && logs) {
      const skipped = available.length - pool.length;
      if (skipped > 0) {
        logs.push(
          `Surveillance routing skipped ${skipped} protected zone(s) with durable containment — sweep prioritized other feeds.`
        );
      }
    }

    const weighted = pool.map((entry) => {
      let weight = 1;
      weight += Number(branchContext?.zoneWeights?.[entry.camera?.name] || 0);
      if (Array.isArray(history?.recentLocationZones) && history.recentLocationZones.slice(-4).includes(entry.camera?.name)) {
        weight *= 0.55;
      }
      if (state) {
        weight *= getFreshScanZoneWeightMultiplier(state, entry.camera.id);
      }
      return { ...entry, weight: Math.max(0.04, Number(weight || 0)) };
    });

    const totalWeight = weighted.reduce((sum, entry) => sum + entry.weight, 0);
    let roll = Math.random() * totalWeight;
    let chosenAt = 0;
    for (let j = 0; j < weighted.length; j += 1) {
      roll -= weighted[j].weight;
      if (roll <= 0) {
        chosenAt = j;
        break;
      }
    }

    selected.push(weighted[chosenAt].index);
    available.splice(
      available.findIndex((entry) => entry.index === weighted[chosenAt].index),
      1
    );
  }

  return selected;
}

export function generateCameraScanResult(cameras, night = 1, narrativeBias = {}, branchContext = null, state = null) {
  const updatedCameras = cameras.map((camera) => ({
    ...camera,
    status: 'Clear'
  }));

  const activeEvents = [];
  const logs = [];

  const n = Math.max(1, Number(night || 1));
  const anomalyBias = Number(narrativeBias?.anomalyChanceBonus || 0);
  const branchBonus = Number(branchContext?.anomalyChanceBonus || 0);
  const baseByNight = n === 1
    ? 0.24
    : n === 2
      ? 0.3
      : n === 3
        ? 0.37
        : n === 4
          ? 0.44
          : 0.5;
  const anomalyChance = Math.min(
    Math.max(0.08, baseByNight + anomalyBias + branchBonus),
    n >= 5 ? 0.84 : 0.78
  );

  if (Math.random() > anomalyChance) {
    logs.push('Camera scan complete. All monitored zones are clear.');
    return {
      cameras: updatedCameras,
      activeEvents,
      logs
    };
  }

  let doubleChance = n === 1
    ? 0.04
    : n === 2
      ? 0.12
      : n === 3
        ? 0.2
        : n === 4
          ? 0.28
          : 0.34;
  if (n <= 2 && activeEvents.length >= 1) {
    doubleChance *= 0.55;
  }
  doubleChance = Math.max(0.02, Math.min(0.42, doubleChance));
  const anomalyCount = Math.random() < doubleChance ? 2 : 1;

  const history = branchContext?.profile?.history || {};
  const chosenIndexes = pickAnomalyCameraIndexes(
    updatedCameras,
    anomalyCount,
    branchContext,
    history,
    state,
    logs
  );

  chosenIndexes.forEach((index) => {
    const camera = updatedCameras[index];
    const seenStatuses = Array.isArray(history?.seenAnomalyStatuses) ? history.seenAnomalyStatuses : [];
    const weightedAnomalies = CAMERA_ANOMALIES.map((entry) => {
      let weight = 1;
      weight = applyTagWeighting(
        weight,
        [...getZoneTags(camera.name), ...getAnomalyTags(entry.status)],
        branchContext?.tagWeights || {},
        branchContext?.suppressedTags || {}
      );
      if (Array.isArray(history?.recentAnomalyStatuses) && history.recentAnomalyStatuses.slice(-5).includes(entry.status)) {
        weight *= 0.58;
      }
      if (!seenStatuses.includes(entry.status)) {
        weight += 1.1;
      } else {
        weight *= 0.86;
      }
      if ((branchContext?.profile?.night || 1) >= 4 && entry.severity === 'high') {
        weight += 0.35;
      }
      return { entry, weight: Math.max(0, Number(weight || 0)) };
    }).filter((entry) => entry.weight > 0);

    let anomaly = pickRandom(CAMERA_ANOMALIES);
    if (weightedAnomalies.length) {
      const total = weightedAnomalies.reduce((sum, entry) => sum + entry.weight, 0);
      let roll = Math.random() * total;
      for (let i = 0; i < weightedAnomalies.length; i += 1) {
        roll -= weightedAnomalies[i].weight;
        if (roll <= 0) {
          anomaly = weightedAnomalies[i].entry;
          break;
        }
      }
    }

    camera.status = anomaly.status;

    activeEvents.push({
      cameraId: camera.id,
      cameraName: camera.name,
      status: anomaly.status,
      severity: anomaly.severity
    });

    logs.push(anomaly.buildLog(camera.name));
  });

  return {
    cameras: updatedCameras,
    activeEvents,
    logs
  };
}