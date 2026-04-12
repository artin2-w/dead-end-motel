const GUEST_FIRST_NAMES = [
  'Noah', 'Mila', 'Victor', 'Lena', 'Jonah', 'Nadia', 'Eli', 'Ivy', 'Mason', 'Zara',
  'Owen', 'Hazel', 'Caleb', 'Nora', 'Liam', 'Ava', 'Lucas', 'Maya', 'Evan', 'Leah',
  'Declan', 'Cora', 'Jasper', 'Ruby', 'Miles', 'Clara', 'Theo', 'Elise', 'Dylan', 'Sabrina',
  'Artin', 'Arash', 'Abby', 'Gabby', 'Ethan'
];

const GUEST_LAST_NAMES = [
  'Price', 'Hart', 'Shaw', 'Cross', 'Pike', 'Stone', 'Mercer', 'Vale', 'Ward', 'Cole',
  'Reyes', 'Bennett', 'Frost', 'Maddox', 'Sinclair', 'Carver', 'Dawson', 'Holloway',
  'Serrano', 'Keller', 'Monroe', 'Bishop', 'Delgado', 'Hayes', 'Sutton', 'Ellis'
];

const GUEST_MOODS = ['Calm', 'Tired', 'Nervous', 'Silent', 'Agitated'];

function pickRandom(list = []) {
  return list[Math.floor(Math.random() * list.length)];
}

function normalizeSet(values = []) {
  const set = new Set();
  (Array.isArray(values) ? values : []).forEach((value) => {
    const safe = String(value || '').trim();
    if (safe) set.add(safe.toLowerCase());
  });
  return set;
}

function buildFirstNameCounts(values = []) {
  const counts = new Map();
  (Array.isArray(values) ? values : []).forEach((value) => {
    const safe = String(value || '').trim();
    if (!safe) return;
    const firstName = safe.split(/\s+/)[0] || '';
    if (!firstName) return;
    const key = firstName.toLowerCase();
    counts.set(key, (counts.get(key) || 0) + 1);
  });
  return counts;
}

function shouldAvoidFirstName(firstName, firstNameCounts) {
  const key = String(firstName || '').toLowerCase();
  const count = Number(firstNameCounts.get(key) || 0);
  if (count >= 2) return true;

  const uniqueVisibleFirstNames = firstNameCounts.size;
  const availableAlternatives = GUEST_FIRST_NAMES.length - uniqueVisibleFirstNames;
  if (count >= 1 && availableAlternatives >= 8) return true;
  return false;
}

export function createGuest(id, options = {}) {
  const activeNames = Array.isArray(options?.activeNames) ? options.activeNames : [];
  const takenFullNames = normalizeSet(activeNames);
  const firstNameCounts = buildFirstNameCounts(activeNames);

  const MAX_ROLLS = 20;
  let selectedFirst = pickRandom(GUEST_FIRST_NAMES);
  let selectedLast = pickRandom(GUEST_LAST_NAMES);

  for (let i = 0; i < MAX_ROLLS; i += 1) {
    const candidateFirst = pickRandom(GUEST_FIRST_NAMES);
    const candidateLast = pickRandom(GUEST_LAST_NAMES);
    const candidateFull = `${candidateFirst} ${candidateLast}`.toLowerCase();
    if (takenFullNames.has(candidateFull)) continue;
    if (shouldAvoidFirstName(candidateFirst, firstNameCounts)) continue;
    selectedFirst = candidateFirst;
    selectedLast = candidateLast;
    break;
  }

  return {
    id,
    name: `${selectedFirst} ${selectedLast}`,
    mood: GUEST_MOODS[Math.floor(Math.random() * GUEST_MOODS.length)],
    nights: 1,
    checkedIn: false,
    assignedRoomId: null
  };
}
