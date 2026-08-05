// Web Audio API procedural sound service for Ash Flow (iOS System Sound Synthesizers)
class SoundService {
  constructor() {
    this.ctx = null;
    this.initUserGestureUnlock();
  }

  initUserGestureUnlock() {
    if (typeof window === "undefined") return;
    const unlock = () => {
      const ctx = this.getAudioContext();
      if (ctx && ctx.state === "suspended") {
        ctx.resume().catch(() => {});
      }
      window.removeEventListener("touchstart", unlock, true);
      window.removeEventListener("touchend", unlock, true);
      window.removeEventListener("click", unlock, true);
      window.removeEventListener("pointerdown", unlock, true);
    };

    window.addEventListener("touchstart", unlock, true);
    window.addEventListener("touchend", unlock, true);
    window.addEventListener("click", unlock, true);
    window.addEventListener("pointerdown", unlock, true);
  }

  getAudioContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  _playTone(freq, start, duration, type = "sine", startGain = 0.3, pitchDrop = null) {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    if (pitchDrop) {
      osc.frequency.exponentialRampToValueAtTime(pitchDrop, start + duration);
    }

    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(startGain, start + 0.003);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(start);
    osc.stop(start + duration);
  }

  /** 1. SAVE / ADD SOUND - iOS Apple Pay Style Double Chime (E6 & B6) */
  playAdd() {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      this._playTone(1318.51, now, 0.35, "sine", 0.3);
      this._playTone(1975.53, now + 0.085, 0.45, "sine", 0.35);
    } catch (err) {
      console.warn("Audio play failed:", err);
    }
  }

  /** 2. EDIT SOUND - iOS Crisp UI Edit Pop / Tap Sound */
  playEdit() {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      this._playTone(1120, now, 0.04, "sine", 0.28, 600);
      this._playTone(1480, now + 0.015, 0.05, "sine", 0.22, 800);
    } catch (err) {
      console.warn("Audio play failed:", err);
    }
  }

  /** 3. DELETE SOUND - iOS Vanish / Trash Swoosh Sound */
  playDelete() {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const duration = 0.16;

      const bufferSize = ctx.sampleRate * duration;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.Q.setValueAtTime(3.5, now);
      filter.frequency.setValueAtTime(3500, now);
      filter.frequency.exponentialRampToValueAtTime(150, now + duration);

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.35, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(ctx.destination);

      noise.start(now);
      noise.stop(now + duration);

      this._playTone(320, now, 0.12, "sine", 0.2, 45);
    } catch (err) {
      console.warn("Audio play failed:", err);
    }
  }

  /** 4. SETTLE SOUND - iOS Ascending Chord Chime */
  playSettle() {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((freq, i) => {
        this._playTone(freq, now + i * 0.055, 0.35, "sine", 0.22);
      });
    } catch (err) {
      console.warn("Audio play failed:", err);
    }
  }
}

export const soundEffects = new SoundService();
export default soundEffects;
