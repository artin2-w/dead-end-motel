function inferDecisionSummary(guest = {}) {
  const risk = String(guest?.riskLevel || 'Low');
  const policy = String(guest?.policyRecommendation || 'Approve');
  const flagged = Boolean(guest?.flagged);
  const special = Boolean(guest?.specialEncounter && !guest.specialEncounter.resolved);

  if (special) return 'Priority review: special handling recommended before desk resolution.';
  if (policy.toLowerCase().includes('reject') || risk.toLowerCase() === 'high') {
    return 'High caution: likely rejection path unless strong context suggests otherwise.';
  }
  if (policy.toLowerCase().includes('flag') || flagged) {
    return 'Monitor first: flag path is safer if confidence is low.';
  }
  if (risk.toLowerCase() === 'low') {
    return 'Stable read: check-in favored if no secondary warnings appear.';
  }
  return 'Mixed profile: compare risk note and policy reason before committing.';
}

function ensureHeaderStructure(card, summary) {
  const header = card.querySelector('.guest-card-header');
  if (!header) return;

  header.classList.add('phase3-guest-header', 'phase3-guest-header-layout');

  const avatar = header.querySelector('.phase3-silhouette-avatar');
  if (avatar) {
    avatar.classList.add('phase3-header-avatar');
  }

  let main = header.querySelector('.phase3-header-main');
  if (!main) {
    main = document.createElement('div');
    main.className = 'phase3-header-main';
  }

  const nameNode = header.querySelector('h4');
  if (nameNode && nameNode.parentElement !== main) {
    main.appendChild(nameNode);
  }
  if (summary && summary.parentElement !== main) {
    main.appendChild(summary);
  }

  let status = header.querySelector('.guest-critical-badges');
  if (!status) {
    status = document.createElement('div');
    status.className = 'guest-critical-badges';
    header.appendChild(status);
  }
  status.classList.add('phase3-header-status');

  if (!main.parentElement) {
    if (avatar) {
      avatar.insertAdjacentElement('afterend', main);
    } else {
      header.prepend(main);
    }
  }
}

function refineGuestCards(state = {}) {
  const cards = Array.from(document.querySelectorAll('#guest-queue .guest-card'));
  if (!cards.length) return;

  const guests = Array.isArray(state?.guests) ? state.guests : [];
  cards.forEach((card, index) => {
    const guest = guests[index] || {};

    card.classList.add('phase3-guest-card-refined');

    let summary = card.querySelector('.phase3-decision-summary');
    if (!summary) {
      summary = document.createElement('p');
      summary.className = 'phase3-decision-summary';
    }
    summary.textContent = inferDecisionSummary(guest);
    ensureHeaderStructure(card, summary);

    const chipRows = Array.from(card.querySelectorAll('.guest-chip-row'));
    chipRows.forEach((row) => {
      row.classList.add('phase3-chip-row');
    });

    const chips = Array.from(card.querySelectorAll('.guest-meta-chip, .policy-badge, .risk-badge, .special-badge, .guest-returning-badge, .desk-flag-badge'));
    chips.forEach((chip) => {
      const text = String(chip.textContent || '').toLowerCase();
      chip.classList.add('phase3-chip');
      chip.classList.toggle('phase3-chip-warning', /risk:\s*high|reject|flagged|special/.test(text));
      chip.classList.toggle('phase3-chip-policy', text.includes('approve') || text.includes('flag') || text.includes('reject'));
      chip.classList.toggle('phase3-chip-mood', text.includes('mood:'));
      chip.classList.toggle('phase3-chip-stay', text.includes('stay:'));
      chip.classList.toggle('phase3-chip-trait', text.includes('trait:'));
    });

    const detailBlock = card.querySelector('.guest-detail-block');
    if (detailBlock) {
      detailBlock.classList.add('phase3-detail-block');
      Array.from(detailBlock.querySelectorAll('p')).forEach((line, lineIndex) => {
        line.classList.add('phase3-detail-line');
        if (lineIndex > 0) line.classList.add('is-secondary');
      });
    }

    const history = card.querySelector('.guest-history-block');
    if (history) {
      history.classList.add('phase3-history-block');
    }

    const actionRow = card.querySelector('.guest-action-row');
    if (actionRow) {
      actionRow.classList.add('phase3-action-row');
      Array.from(actionRow.querySelectorAll('.button')).forEach((btn) => {
        btn.classList.add('phase3-tap-button');
      });
    }
  });
}

const phase3 = (window.DeadEndPhase3 = window.DeadEndPhase3 || {});
phase3.refineGuestCards = refineGuestCards;
