const SILHOUETTE_VARIANTS = {
  neutral: { label: 'Neutral profile' },
  calm: { label: 'Calm profile' },
  nervous: { label: 'Nervous profile' },
  aggressive: { label: 'Aggressive profile' },
  exhausted: { label: 'Exhausted profile' },
  suspicious: { label: 'Suspicious profile' },
  special: { label: 'Special profile' },
  known: { label: 'Known profile' }
};

function textHas(value = '', needle = '') {
  return String(value || '').toLowerCase().includes(String(needle || '').toLowerCase());
}

function inferSilhouetteVariant(guest = {}) {
  if (guest?.specialEncounter && !guest.specialEncounter.resolved) return 'special';
  if (guest?.isReturningGuest || guest?.isKnownGuest) return 'known';

  const mood = String(guest?.mood || '').toLowerCase();
  const trait = String(guest?.trait || '').toLowerCase();
  const risk = String(guest?.riskLevel || '').toLowerCase();
  const recommendation = String(guest?.policyRecommendation || '').toLowerCase();

  if (risk === 'high' || recommendation.includes('reject') || textHas(trait, 'violent')) return 'aggressive';
  if (textHas(mood, 'nervous') || textHas(trait, 'anxious')) return 'nervous';
  if (textHas(mood, 'tired') || textHas(mood, 'exhaust') || textHas(trait, 'fatigue')) return 'exhausted';
  if (textHas(mood, 'cold') || textHas(trait, 'watch') || textHas(trait, 'suspicious')) return 'suspicious';
  if (risk === 'low') return 'calm';
  return 'neutral';
}

function getSeed(guest = {}) {
  const text = `${guest?.id || ''}:${guest?.name || ''}:${guest?.trait || ''}`;
  let seed = 0;
  for (let i = 0; i < text.length; i += 1) {
    seed = (seed + text.charCodeAt(i) * (i + 3)) % 997;
  }
  return seed;
}

function buildSilhouetteMarkup(guest = {}, variant = 'neutral') {
  const seed = getSeed(guest);
  const head = ['head-round', 'head-oval', 'head-square'][seed % 3];
  const posture = ['posture-upright', 'posture-forward', 'posture-slouch'][(seed >> 2) % 3];
  const outfit = ['outfit-hood', 'outfit-collar', 'outfit-jacket', 'outfit-cap'][(seed >> 4) % 4];
  const accent = variant === 'special' ? 'accent-special' : variant === 'known' ? 'accent-known' : 'accent-standard';
  return `
    <span class="phase3-silhouette-body ${posture} ${outfit} ${accent}">
      <span class="phase3-silhouette-head ${head}"></span>
      <span class="phase3-silhouette-torso"></span>
    </span>
  `;
}

function applySilhouettesToGuestCards(state = {}) {
  const cards = Array.from(document.querySelectorAll('#guest-queue .guest-card'));
  if (!cards.length) return;

  const guests = Array.isArray(state?.guests) ? state.guests : [];

  cards.forEach((card, index) => {
    const guest = guests[index] || {};
    const variant = inferSilhouetteVariant(guest);
    const style = SILHOUETTE_VARIANTS[variant] || SILHOUETTE_VARIANTS.neutral;

    card.classList.add('phase3-guest-card');
    card.classList.toggle('phase3-special-guest', variant === 'special');
    card.dataset.phase3Silhouette = variant;

    let avatar = card.querySelector('.phase3-silhouette-avatar');
    if (!avatar) {
      avatar = document.createElement('div');
      avatar.className = 'phase3-silhouette-avatar';
      const header = card.querySelector('.guest-card-header');
      if (header) {
        header.prepend(avatar);
      } else {
        card.prepend(avatar);
      }
    }

    avatar.className = `phase3-silhouette-avatar variant-${variant}`;
    avatar.setAttribute('role', 'img');
    avatar.setAttribute('aria-label', style.label || 'Guest profile');
    avatar.innerHTML = buildSilhouetteMarkup(guest, variant);
  });
}

const phase3 = (window.DeadEndPhase3 = window.DeadEndPhase3 || {});
phase3.applySilhouettesToGuestCards = applySilhouettesToGuestCards;
