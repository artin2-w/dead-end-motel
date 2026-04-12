function getPhase2() {
  window.DeadEndPhase2 = window.DeadEndPhase2 || {};
  return window.DeadEndPhase2;
}

const SILHOUETTES = ['sil-a', 'sil-b', 'sil-c', 'sil-d', 'sil-e'];

function traitTags(guest) {
  const raw = [guest?.trait, guest?.mood, guest?.hiddenIntent]
    .filter(Boolean)
    .map((value) => String(value).toLowerCase());
  const tags = [];
  if (raw.some((v) => v.includes('aggr'))) tags.push('Aggressive');
  if (raw.some((v) => v.includes('nerv'))) tags.push('Nervous');
  if (raw.some((v) => v.includes('quiet'))) tags.push('Quiet');
  if (tags.length === 0) tags.push('Unknown');
  return tags.slice(0, 3);
}

export function enhanceGuestCard(card, guest) {
  if (!card || card.dataset.phase2Enhanced === 'true') return;
  card.dataset.phase2Enhanced = 'true';
  card.classList.add('phase2-guest-card');

  const header = card.querySelector('.guest-card-header');
  if (header && !header.querySelector('.phase2-avatar')) {
    const avatar = document.createElement('div');
    avatar.className = `phase2-avatar ${SILHOUETTES[Number(guest?.id || 0) % SILHOUETTES.length]}`;
    avatar.setAttribute('aria-hidden', 'true');
    header.prepend(avatar);
  }

  const detail = card.querySelector('.guest-detail-block');
  if (detail && !card.querySelector('.phase2-trait-tags')) {
    const tags = document.createElement('div');
    tags.className = 'phase2-trait-tags';
    traitTags(guest).forEach((tag) => {
      const item = document.createElement('span');
      item.className = 'phase2-trait-tag';
      item.textContent = tag;
      tags.appendChild(item);
    });
    detail.prepend(tags);
  }
}

const ns = getPhase2();
ns.guestUIEnhancer = { enhanceGuestCard };
ns.enhanceGuestCard = enhanceGuestCard;
