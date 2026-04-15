const SESSION_MUTE_KEY = 'dead-end-motel-muted';

function createEnvelopeGain(ctx, destination, { attack = 0.01, decay = 0.12, peak = 0.16 } = {}) {
  const gain = ctx.createGain();
  const now = ctx.currentTime;
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), now + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + attack + decay);
  gain.connect(destination);
  return gain;
}

function safeNow(ctx) {
  return ctx?.currentTime || 0;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function createAudioController() {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  let ctx = null;
  let unlocked = false;
  let muted = sessionStorage.getItem(SESSION_MUTE_KEY) === '1';
  let humOsc = null;
  let humGain = null;
  let humLevel = 'calm';

  function ensureContext() {
    if (!AudioCtx) return null;
    if (!ctx) {
      try {
        ctx = new AudioCtx();
      } catch (_err) {
        ctx = null;
      }
    }
    return ctx;
  }

  function canPlay() {
    const audioCtx = ensureContext();
    if (!audioCtx || muted) return null;
    if (audioCtx.state !== 'running') return null;
    return audioCtx;
  }

  function playTone({
    type = 'sine',
    frequency = 440,
    duration = 0.14,
    attack = 0.006,
    decay = 0.12,
    gain = 0.12,
    detune = 0
  } = {}) {
    const audioCtx = canPlay();
    if (!audioCtx) return;

    try {
      const osc = audioCtx.createOscillator();
      const env = createEnvelopeGain(audioCtx, audioCtx.destination, {
        attack,
        decay,
        peak: gain
      });

      osc.type = type;
      osc.frequency.setValueAtTime(frequency, safeNow(audioCtx));
      osc.detune.setValueAtTime(detune, safeNow(audioCtx));
      osc.connect(env);
      osc.start();
      osc.stop(safeNow(audioCtx) + duration);
    } catch (_err) {
      // Fail silently for browser audio restrictions.
    }
  }

  function playPattern(pattern = []) {
    const audioCtx = canPlay();
    if (!audioCtx || !Array.isArray(pattern) || !pattern.length) return;
    const baseTime = safeNow(audioCtx);

    try {
      pattern.forEach((tone, index) => {
        const offset = Number(tone?.offset ?? index * 0.05);
        const start = baseTime + Math.max(0, offset);
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        const peak = Math.max(0.0002, Number(tone?.gain ?? 0.08));
        const attack = Math.max(0.001, Number(tone?.attack ?? 0.004));
        const decay = Math.max(0.02, Number(tone?.decay ?? 0.08));
        const duration = Math.max(0.03, Number(tone?.duration ?? 0.12));

        gainNode.gain.setValueAtTime(0.0001, start);
        gainNode.gain.exponentialRampToValueAtTime(peak, start + attack);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, start + attack + decay);

        osc.type = tone?.type || 'sine';
        osc.frequency.setValueAtTime(Number(tone?.frequency || 440), start);
        osc.detune.setValueAtTime(Number(tone?.detune || 0), start);
        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        osc.start(start);
        osc.stop(start + duration);
      });
    } catch (_err) {
      // Fail silently.
    }
  }

  function playDoubleTone(first, second, gap = 0.045) {
    const audioCtx = canPlay();
    if (!audioCtx) return;
    const baseTime = safeNow(audioCtx);

    try {
      [first, second].forEach((tone, index) => {
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        const start = baseTime + index * gap;
        const peak = Math.max(0.0002, tone.gain ?? 0.12);
        const attack = tone.attack ?? 0.005;
        const decay = tone.decay ?? 0.1;

        gainNode.gain.setValueAtTime(0.0001, start);
        gainNode.gain.exponentialRampToValueAtTime(peak, start + attack);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, start + attack + decay);

        osc.type = tone.type || 'sine';
        osc.frequency.setValueAtTime(tone.frequency || 440, start);
        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        osc.start(start);
        osc.stop(start + (tone.duration || 0.14));
      });
    } catch (_err) {
      // Fail silently.
    }
  }

  function unlock() {
    const audioCtx = ensureContext();
    if (!audioCtx) return false;

    if (audioCtx.state === 'running') {
      unlocked = true;
      return true;
    }

    audioCtx.resume().then(() => {
      unlocked = audioCtx.state === 'running';
    }).catch(() => {
      unlocked = false;
    });

    return audioCtx.state === 'running';
  }

  function toggleMute() {
    muted = !muted;
    sessionStorage.setItem(SESSION_MUTE_KEY, muted ? '1' : '0');
    if (muted && humGain && ctx) {
      humGain.gain.setTargetAtTime(0.0001, safeNow(ctx), 0.08);
    }
    if (!muted) {
      unlock();
      updatePressureHum(humLevel);
    }
    return muted;
  }

  function isMuted() {
    return muted;
  }

  function playUiClick() {
    playTone({ type: 'triangle', frequency: 520, duration: 0.08, gain: 0.06, decay: 0.06 });
  }

  function playScan() {
    playDoubleTone(
      { type: 'sine', frequency: 760, duration: 0.09, gain: 0.065 },
      { type: 'sine', frequency: 980, duration: 0.1, gain: 0.055 },
      0.05
    );
  }

  function playAlert(level = 'normal') {
    const frequency = level === 'high' || level === 'dire' ? 250 : 330;
    playTone({ type: 'sawtooth', frequency, duration: 0.16, gain: 0.08, decay: 0.14 });
  }

  function playSuccess() {
    playDoubleTone(
      { type: 'sine', frequency: 540, duration: 0.08, gain: 0.07 },
      { type: 'sine', frequency: 700, duration: 0.11, gain: 0.07 },
      0.05
    );
  }

  function playFailure() {
    playDoubleTone(
      { type: 'square', frequency: 310, duration: 0.12, gain: 0.08 },
      { type: 'square', frequency: 190, duration: 0.2, gain: 0.08 },
      0.065
    );
  }

  function playDispatch() {
    playTone({ type: 'triangle', frequency: 620, duration: 0.12, gain: 0.065, decay: 0.1 });
  }

  function playRedPhone() {
    playPattern([
      { type: 'square', frequency: 720, duration: 0.09, gain: 0.05, offset: 0 },
      { type: 'square', frequency: 540, duration: 0.09, gain: 0.05, offset: 0.06 },
      { type: 'square', frequency: 720, duration: 0.1, gain: 0.055, offset: 0.18 },
      { type: 'square', frequency: 540, duration: 0.1, gain: 0.055, offset: 0.24 }
    ]);
  }

  function playKnock() {
    playPattern([
      { type: 'triangle', frequency: 180, duration: 0.05, gain: 0.055, decay: 0.045, offset: 0 },
      { type: 'triangle', frequency: 140, duration: 0.05, gain: 0.05, decay: 0.05, offset: 0.06 },
      { type: 'triangle', frequency: 170, duration: 0.05, gain: 0.048, decay: 0.05, offset: 0.16 }
    ]);
  }

  function playFootsteps() {
    playPattern([
      { type: 'sine', frequency: 150, duration: 0.045, gain: 0.032, decay: 0.04, offset: 0 },
      { type: 'sine', frequency: 132, duration: 0.045, gain: 0.03, decay: 0.04, offset: 0.09 },
      { type: 'sine', frequency: 146, duration: 0.045, gain: 0.028, decay: 0.04, offset: 0.18 }
    ]);
  }

  function playBreakerSnap() {
    playPattern([
      { type: 'square', frequency: 240, duration: 0.04, gain: 0.05, decay: 0.03, offset: 0 },
      { type: 'sawtooth', frequency: 96, duration: 0.12, gain: 0.042, decay: 0.1, offset: 0.03 }
    ]);
  }

  function playStaticBurst(intensity = 'light') {
    const heavy = intensity === 'heavy' || intensity === 'dire';
    playPattern([
      { type: 'sawtooth', frequency: heavy ? 1180 : 980, detune: -12, duration: 0.035, gain: 0.03, decay: 0.028, offset: 0 },
      { type: 'square', frequency: heavy ? 860 : 720, detune: 8, duration: 0.03, gain: 0.024, decay: 0.025, offset: 0.02 },
      { type: 'triangle', frequency: heavy ? 1340 : 1080, detune: -18, duration: 0.038, gain: 0.026, decay: 0.03, offset: 0.05 },
      ...(heavy ? [{ type: 'sawtooth', frequency: 640, detune: 20, duration: 0.05, gain: 0.03, decay: 0.04, offset: 0.09 }] : [])
    ]);
  }

  function playEmergencyPulse(level = 'high') {
    const dire = level === 'dire' || level === 'critical';
    playPattern([
      { type: 'square', frequency: dire ? 210 : 250, duration: 0.08, gain: 0.055, decay: 0.07, offset: 0 },
      { type: 'square', frequency: dire ? 330 : 390, duration: 0.08, gain: 0.05, decay: 0.07, offset: 0.08 },
      { type: 'square', frequency: dire ? 210 : 250, duration: 0.08, gain: 0.055, decay: 0.07, offset: 0.18 }
    ]);
  }

  function playIntroSting(kind = 'standard') {
    if (kind === 'emergency') {
      playPattern([
        { type: 'triangle', frequency: 230, duration: 0.11, gain: 0.05, offset: 0 },
        { type: 'triangle', frequency: 320, duration: 0.11, gain: 0.052, offset: 0.08 },
        { type: 'square', frequency: 210, duration: 0.12, gain: 0.05, offset: 0.2 }
      ]);
      return;
    }
    if (kind === 'blackout') {
      playPattern([
        { type: 'sine', frequency: 300, duration: 0.08, gain: 0.04, offset: 0 },
        { type: 'sawtooth', frequency: 180, duration: 0.12, gain: 0.038, offset: 0.08 }
      ]);
      return;
    }
    playPattern([
      { type: 'triangle', frequency: 360, duration: 0.08, gain: 0.04, offset: 0 },
      { type: 'triangle', frequency: 440, duration: 0.1, gain: 0.04, offset: 0.07 },
      { type: 'sine', frequency: 520, duration: 0.12, gain: 0.042, offset: 0.16 }
    ]);
  }

  function playPolice() {
    playDoubleTone(
      { type: 'square', frequency: 700, duration: 0.08, gain: 0.05 },
      { type: 'square', frequency: 520, duration: 0.08, gain: 0.05 },
      0.07
    );
  }

  function playEvict() {
    playTone({ type: 'square', frequency: 240, duration: 0.13, gain: 0.075, decay: 0.11 });
  }

  function playPowerAction(type) {
    if (type === 'restore') {
      playTone({ type: 'sine', frequency: 460, duration: 0.1, gain: 0.06, decay: 0.1 });
      return;
    }
    if (type === 'breaker' || type === 'cut-room') {
      playBreakerSnap();
      return;
    }
    playTone({ type: 'triangle', frequency: 290, duration: 0.1, gain: 0.06, decay: 0.1 });
  }

  function playSummary() {
    playDoubleTone(
      { type: 'triangle', frequency: 440, duration: 0.11, gain: 0.065 },
      { type: 'triangle', frequency: 660, duration: 0.16, gain: 0.065 },
      0.06
    );
  }

  function playDawn() {
    playDoubleTone(
      { type: 'sine', frequency: 500, duration: 0.12, gain: 0.06 },
      { type: 'sine', frequency: 760, duration: 0.18, gain: 0.065 },
      0.07
    );
  }

  function ensureHum(audioCtx) {
    if (humOsc && humGain) return;

    humOsc = audioCtx.createOscillator();
    humGain = audioCtx.createGain();
    humOsc.type = 'triangle';
    humOsc.frequency.setValueAtTime(56, safeNow(audioCtx));
    humGain.gain.setValueAtTime(0.0001, safeNow(audioCtx));
    humOsc.connect(humGain);
    humGain.connect(audioCtx.destination);
    humOsc.start();
  }

  function updatePressureHum(level) {
    humLevel = level || 'calm';
    const audioCtx = canPlay();
    if (!audioCtx) return;

    try {
      ensureHum(audioCtx);
      const now = safeNow(audioCtx);
      const targetGain =
        humLevel === 'emergency' ? 0.024 : humLevel === 'dire' ? 0.018 : humLevel === 'tense' ? 0.01 : 0.002;
      const targetFreq =
        humLevel === 'emergency' ? 84 : humLevel === 'dire' ? 72 : humLevel === 'tense' ? 64 : 56;

      humOsc.frequency.setTargetAtTime(targetFreq, now, 0.2);
      humGain.gain.setTargetAtTime(clamp(targetGain, 0.0001, 0.03), now, 0.25);
    } catch (_err) {
      // Keep silent if browser audio graph is unavailable.
    }
  }

  return {
    unlock,
    toggleMute,
    isMuted,
    playUiClick,
    playScan,
    playAlert,
    playSuccess,
    playFailure,
    playDispatch,
    playRedPhone,
    playKnock,
    playFootsteps,
    playBreakerSnap,
    playStaticBurst,
    playEmergencyPulse,
    playIntroSting,
    playPolice,
    playEvict,
    playPowerAction,
    playSummary,
    playDawn,
    updatePressureHum
  };
}

export function getPressureAudioLevel(state) {
  const rooms = Array.isArray(state?.rooms) ? state.rooms : [];
  const criticalOccupiedRooms = rooms.filter(
    (room) => room?.occupiedBy && room?.condition === 'Critical'
  ).length;
  const progress = Math.max(0, Math.min(100, Math.round(((state?.shiftElapsedMinutes || 0) / 480) * 100)));
  const chainPressure = Array.isArray(state?.storyChains)
    ? state.storyChains.reduce((sum, chain) => sum + Math.max(0, Number(chain?.pressure || 0)), 0)
    : 0;

  const severeSignals =
    Boolean(state?.emergencyNight?.active) ||
    (state?.power ?? 100) <= 22 ||
    (state?.reputation ?? 50) <= 28 ||
    criticalOccupiedRooms >= 2 ||
    chainPressure >= 9;

  if (Boolean(state?.emergencyNight?.active) || String(state?.blackoutState?.level || '') === 'full') {
    return 'emergency';
  }
  if (severeSignals) return 'dire';

  const tenseSignals =
    (state?.power ?? 100) <= 40 ||
    (state?.reputation ?? 50) <= 40 ||
    criticalOccupiedRooms >= 1 ||
    progress >= 78 ||
    chainPressure >= 4;

  if (tenseSignals) return 'tense';
  return 'calm';
}