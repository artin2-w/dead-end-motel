function applyQueueDensity(state = {}) {
  const queue = document.getElementById('guest-queue');
  if (!queue) return;

  const cards = Array.from(queue.querySelectorAll('.guest-card'));
  const queueLength = cards.length;
  const compact = queueLength >= 5;

  queue.classList.toggle('phase3-queue-compact', compact);
  queue.classList.toggle('phase3-queue-dense', queueLength >= 3);

  cards.forEach((card, index) => {
    card.classList.add('phase3-queue-card');
    card.classList.toggle('phase3-lower-priority', compact && index >= 2);

    const detailBlock = card.querySelector('.guest-detail-block');
    const historyBlock = card.querySelector('.guest-history-block');
    const specialBlock = card.querySelector('.guest-special-row, .guest-special-clue');
    const hasSecondaryContent = Boolean(detailBlock || historyBlock || specialBlock);
    if (!hasSecondaryContent) return;

    let details = card.querySelector('.phase3-card-details');
    if (!details) {
      details = document.createElement('details');
      details.className = 'phase3-card-details';
      details.innerHTML = '<summary>Details</summary><div class="phase3-card-details-body"></div>';
      const actionRow = card.querySelector('.guest-action-row');
      if (actionRow && actionRow.parentNode) {
        actionRow.parentNode.insertBefore(details, actionRow);
      } else {
        card.appendChild(details);
      }
    }

    const body = details.querySelector('.phase3-card-details-body');
    if (!body) return;

    const secondaryNodes = [detailBlock, historyBlock]
      .filter(Boolean)
      .filter((node) => node.parentNode && node.parentNode !== body);

    secondaryNodes.forEach((node) => body.appendChild(node));

    if (!compact || index < 2) {
      details.open = true;
    } else {
      details.open = false;
    }
  });
}

const phase3 = (window.DeadEndPhase3 = window.DeadEndPhase3 || {});
phase3.applyQueueDensity = applyQueueDensity;
