/**
 * Procedural SFX via Web Audio API (no external files).
 */
export class GameAudio {
  private ctx: AudioContext | null = null;

  private context(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
    }
    return this.ctx;
  }

  /** Required on many browsers after AudioContext is created. */
  async resume(): Promise<void> {
    const c = this.context();
    if (c.state === 'suspended') {
      await c.resume();
    }
  }

  private masterGain(c: AudioContext, value: number, when: number): GainNode {
    const g = c.createGain();
    g.gain.setValueAtTime(value, when);
    g.connect(c.destination);
    return g;
  }

  /** Pleasant ascending arpeggio when selection sums to 10. */
  playCorrect(): void {
    const c = this.context();
    const t0 = c.currentTime;
    const master = this.masterGain(c, 0.22, t0);
    const notes = [523.25, 659.25, 783.99, 1046.5];
    const step = 0.07;
    notes.forEach((freq, i) => {
      const t = t0 + i * step;
      const osc = c.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.35, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
      osc.connect(g);
      g.connect(master);
      osc.start(t);
      osc.stop(t + 0.1);
    });
  }

  /** Harsh dissonant buzz when selection is invalid. */
  playWrong(): void {
    const c = this.context();
    const t0 = c.currentTime;
    const master = this.masterGain(c, 0.18, t0);
    const freqs = [185, 246.94];
    freqs.forEach((freq) => {
      const osc = c.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, t0);
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.45, t0 + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.22);
      osc.connect(g);
      g.connect(master);
      osc.start(t0);
      osc.stop(t0 + 0.24);
    });
  }

  /** Short tick each second while the countdown runs. */
  playTick(): void {
    const c = this.context();
    const t0 = c.currentTime;
    const master = this.masterGain(c, 0.12, t0);
    const osc = c.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(1760, t0);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.2, t0 + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.045);
    osc.connect(g);
    g.connect(master);
    osc.start(t0);
    osc.stop(t0 + 0.05);
  }

  /** Alarm when time runs out. */
  playTimeUp(): void {
    const c = this.context();
    const t0 = c.currentTime;
    const master = this.masterGain(c, 0.2, t0);
    const pattern = [392, 330, 261.63];
    pattern.forEach((freq, i) => {
      const t = t0 + i * 0.28;
      const osc = c.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.55, t + 0.04);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
      osc.connect(g);
      g.connect(master);
      osc.start(t);
      osc.stop(t + 0.22);
    });
  }
}
