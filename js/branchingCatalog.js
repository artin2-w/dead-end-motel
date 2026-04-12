const SPECIAL_ENCOUNTER_TAGS = Object.freeze({
  'insurance-investigator': ['authority', 'inspection', 'ownership', 'public'],
  'long-haul-driver': ['guest-relations', 'quiet', 'contained'],
  'off-duty-officer': ['authority', 'security', 'inspection'],
  'missing-reservation': ['ownership', 'guest-relations', 'disruption'],
  'local-agitator': ['local-pressure', 'retaliation', 'security', 'outside'],
  'vip-privacy': ['privacy', 'quiet', 'coverup', 'contained'],
  'injured-traveler': ['guest-relations', 'quiet', 'contained'],
  'paranoid-prepper': ['security', 'chaotic', 'disruption'],
  'county-health-auditor': ['authority', 'inspection', 'ownership', 'public'],
  'corporate-compliance-rep': ['ownership', 'inspection', 'privacy', 'coverup'],
  'quiet-protection-ask': ['guest-relations', 'quiet', 'privacy', 'contained'],
  'rumor-podcaster': ['public', 'guest-relations', 'disruption', 'outside'],
  'deputy-cousin-local': ['authority', 'local-pressure', 'outside', 'retaliation'],
  'finale-clean-fixer': ['quiet', 'coverup', 'disruption', 'contained']
});

const NIGHT_EVENT_TAGS = Object.freeze({
  'noise-complaint-call': ['guest-relations', 'public', 'disruption'],
  'water-leak-report': ['maintenance', 'contained'],
  'parking-lot-standoff': ['local-pressure', 'retaliation', 'outside', 'chaotic'],
  'flickering-utility-surge': ['maintenance', 'chaotic', 'disruption'],
  'strange-knock-closed-room': ['privacy', 'quiet', 'inspection'],
  'emergency-vehicle-outside': ['authority', 'public', 'outside'],
  'ice-machine-flood-risk': ['maintenance', 'contained'],
  'missing-key-conflict': ['guest-relations', 'ownership', 'public', 'disruption'],
  'press-inbox-flood': ['public', 'guest-relations', 'outside', 'disruption'],
  'union-fatigue-warning': ['maintenance', 'ownership', 'contained'],
  'boiler-pressure-rattle': ['maintenance', 'chaotic', 'contained'],
  'authority-visibility-walkthrough': ['authority', 'public', 'inspection'],
  'false-calm-shift': ['quiet', 'contained', 'coverup'],
  'vip-corridor-argument': ['guest-relations', 'privacy', 'public'],
  'ownership-midnight-call': ['ownership', 'inspection', 'public']
});

const ZONE_TAGS = Object.freeze({
  Lobby: ['public', 'ownership', 'authority'],
  Hallway: ['public', 'guest-relations', 'inspection'],
  'Parking Lot': ['outside', 'local-pressure', 'retaliation', 'chaotic'],
  'Rear Exit': ['outside', 'security', 'retaliation', 'contained'],
  Laundry: ['maintenance', 'contained'],
  'Ice Machine': ['maintenance', 'public', 'contained']
});

const ANOMALY_STATUS_TAGS = Object.freeze({
  Static: ['maintenance', 'quiet'],
  Blocked: ['security', 'disruption'],
  'Movement Detected': ['security', 'public'],
  'Door Ajar': ['security', 'inspection', 'outside'],
  'Shadow Figure': ['privacy', 'quiet', 'chaotic'],
  'Camera Loop': ['inspection', 'quiet', 'coverup'],
  'Heat Bloom': ['maintenance', 'chaotic', 'public'],
  'Relay Drift': ['maintenance', 'security', 'disruption'],
  'Crowd Murmur': ['public', 'guest-relations', 'outside']
});

export function getSpecialEncounterTags(encounterId) {
  return Array.isArray(SPECIAL_ENCOUNTER_TAGS[encounterId])
    ? [...SPECIAL_ENCOUNTER_TAGS[encounterId]]
    : [];
}

export function getNightEventTags(eventId) {
  return Array.isArray(NIGHT_EVENT_TAGS[eventId]) ? [...NIGHT_EVENT_TAGS[eventId]] : [];
}

export function getZoneTags(zoneName) {
  return Array.isArray(ZONE_TAGS[zoneName]) ? [...ZONE_TAGS[zoneName]] : [];
}

export function getAnomalyTags(status) {
  return Array.isArray(ANOMALY_STATUS_TAGS[status]) ? [...ANOMALY_STATUS_TAGS[status]] : [];
}

export function getGuestFamilyTags(guest = {}) {
  const tags = [];
  const archetype = String(guest?.archetypeKey || '').toLowerCase();
  const mood = String(guest?.mood || '').toLowerCase();
  const trait = String(guest?.trait || '').toLowerCase();

  if (archetype.includes('drunk') || archetype.includes('volatile')) tags.push('chaotic', 'local-pressure');
  if (archetype.includes('observer') || archetype.includes('evasive')) tags.push('privacy', 'inspection');
  if (archetype.includes('runaway') || archetype.includes('drifter')) tags.push('quiet', 'contained');
  if (mood.includes('agitated') || mood.includes('nervous')) tags.push('guest-relations', 'disruption');
  if (trait.includes('aggressive') || trait.includes('unstable')) tags.push('security', 'chaotic');
  if (trait.includes('quiet') || trait.includes('silent')) tags.push('quiet', 'privacy');

  return [...new Set(tags)];
}

export function applyTagWeighting(baseWeight, tags = [], tagWeights = {}, suppressedTags = {}) {
  let weight = Math.max(0, Number(baseWeight || 0));
  tags.forEach((tag) => {
    const boost = Number(tagWeights?.[tag] || 0);
    const suppression = Number(suppressedTags?.[tag] || 0);
    if (boost) {
      weight += boost;
    }
    if (suppression > 0) {
      weight *= Math.max(0.2, 1 - suppression);
    }
  });
  return Math.max(0, weight);
}
