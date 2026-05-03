/**
 * v0.56 — First-shift “handover call” tutorial (atmospheric, skippable, localStorage).
 */

const LS_KEY = 'dem_v56_shift_handover_v1';

function readStore() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return { finished: false };
    const o = JSON.parse(raw);
    return { finished: Boolean(o?.finished) };
  } catch {
    return { finished: false };
  }
}

function writeFinished(skipped) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({ finished: true, skipped: Boolean(skipped), at: Date.now() }));
  } catch {
    /* ignore */
  }
}

const STEPS = [
  {
    title: 'Line open',
    body:
      '…You there? Good. I\'m not supposed to use this extension, but the last clerk left mid-sentence. Listen: the desk is simple — it only feels complicated when you stop moving your hands.'
  },
  {
    title: 'Arrivals',
    body:
      'When bodies hit the glass, you read the slip, you run the checks you can afford, then you commit. Indecision costs power the same way mistakes cost reputation.'
  },
  {
    title: 'Glass eyes',
    body:
      'Cameras are not entertainment. Scan when the motel goes quiet — quiet is when the building lies best.'
  },
  {
    title: 'The grid',
    body:
      'Power is not “maintenance flavor.” It is time. If the reserve looks cute, you are already late. Watch the breaker story, not the meter fantasy.'
  },
  {
    title: 'Paper trail',
    body:
      'Incidents arrive as attitude first, paperwork second. Review before you stamp the night closed — the report remembers what you pretended not to see.'
  },
  {
    title: 'Sign-off',
    body:
      'If you hear your name spoken from an empty room, finish the task in front of you anyway. Dawn still counts. Good luck — and don\'t thank me.'
  }
];

export function maybeOpenShiftHandover({ activeScreenId, night, onFinished }) {
  if (activeScreenId !== 'game-screen') return;
  if (Number(night || 1) !== 1) return;
  if (readStore().finished) return;
  if (document.getElementById('v56-handover-overlay')) return;

  const overlay = document.createElement('div');
  overlay.id = 'v56-handover-overlay';
  overlay.className = 'v56-handover-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'v56-handover-title');

  let step = 0;
  let onEsc = null;

  const detachEsc = () => {
    if (typeof onEsc === 'function') {
      try {
        document.removeEventListener('keydown', onEsc, true);
      } catch {
        /* ignore */
      }
      onEsc = null;
    }
  };

  const renderStep = () => {
    const s = STEPS[step];
    overlay.innerHTML = `
      <div class="v56-handover-card">
        <p class="v56-handover-kicker">Incoming line — previous shift</p>
        <h2 id="v56-handover-title" class="v56-handover-title">${s.title}</h2>
        <p class="v56-handover-body">${s.body}</p>
        <div class="v56-handover-actions">
          <button type="button" class="button button-secondary v56-handover-skip">Skip handover</button>
          <button type="button" class="button button-primary v56-handover-next">${step >= STEPS.length - 1 ? 'Begin shift' : 'Next'}</button>
        </div>
        <p class="v56-handover-meta muted">You can dismiss this permanently. Settings → tutorial still controls lighter hints.</p>
      </div>
    `;
    const skip = overlay.querySelector('.v56-handover-skip');
    const next = overlay.querySelector('.v56-handover-next');
    skip?.addEventListener('click', () => {
      detachEsc();
      writeFinished(true);
      overlay.remove();
      if (typeof onFinished === 'function') onFinished({ skipped: true });
    });
    next?.addEventListener('click', () => {
      if (step >= STEPS.length - 1) {
        detachEsc();
        writeFinished(false);
        overlay.remove();
        if (typeof onFinished === 'function') onFinished({ skipped: false });
        return;
      }
      step += 1;
      renderStep();
    });
  };

  document.body.appendChild(overlay);
  onEsc = (ev) => {
    if (ev.key !== 'Escape') return;
    if (!document.getElementById('v56-handover-overlay')) return;
    ev.preventDefault();
    detachEsc();
    writeFinished(true);
    overlay.remove();
    if (typeof onFinished === 'function') onFinished({ skipped: true });
  };
  document.addEventListener('keydown', onEsc, true);

  renderStep();
}
