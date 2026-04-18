/**
 * Procedural SFX via Web Audio API. All sounds go through one master gain (volume + mute).
 */
export class GameAudio {
  private ctx: AudioContext | null = null;
  private masterOut: GainNode | null = null;
  /** User volume 0..1 (ignored when muted). */
  private volume = 0.65;
  private muted = false;
  /** Step through a short happy phrase each second (instead of a harsh tick). */
  private tickStep = 0;

  private context(): AudioContext {
    if (!this.ctx) {
      const c = new AudioContext();
      this.ctx = c;
      this.masterOut = c.createGain();
      this.masterOut.gain.value = this.effectiveGain();
      this.masterOut.connect(c.destination);
    }
    return this.ctx;
  }

  private effectiveGain(): number {
    return this.muted ? 0 : this.volume;
  }

  private applyMasterGain(): void {
    const c = this.ctx;
    const g = this.masterOut;
    if (!c || !g) return;
    const t = c.currentTime;
    g.gain.cancelScheduledValues(t);
    g.gain.setValueAtTime(this.effectiveGain(), t);
  }

  /** 0..1 */
  setVolume(v: number): void {
    this.volume = Math.max(0, Math.min(1, v));
    this.applyMasterGain();
  }

  getVolume(): number {
    return this.volume;
  }

  setMuted(m: boolean): void {
    this.muted = m;
    this.applyMasterGain();
  }

  getMuted(): boolean {
    return this.muted;
  }

  /** Call when a new round starts so the countdown melody begins from the top. */
  resetTickMelody(): void {
    this.tickStep = 0;
  }

  /** Toggle mute; returns new muted state. */
  toggleMute(): boolean {
    this.muted = !this.muted;
    this.applyMasterGain();
    return this.muted;
  }

  async resume(): Promise<void> {
    const c = this.context();
    if (c.state === 'suspended') {
      await c.resume();
    }
  }

  private mixInput(): GainNode {
    const c = this.context();
    const g = c.createGain();
    g.connect(this.masterOut!);
    return g;
  }

  /** Pleasant ascending arpeggio when selection sums to 10. */
  playCorrect(): void {
    const c = this.context();
    const t0 = c.currentTime;
    const mix = this.mixInput();
    mix.gain.setValueAtTime(0.22, t0);
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
      g.connect(mix);
      osc.start(t);
      osc.stop(t + 0.1);
    });
  }

  playWrong(): void {
    const c = this.context();
    const t0 = c.currentTime;
    const mix = this.mixInput();
    mix.gain.setValueAtTime(0.18, t0);
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
      g.connect(mix);
      osc.start(t0);
      osc.stop(t0 + 0.24);
    });
  }

  /**
   * One soft note per second: loops a short C-major pentatonic "walking" melody (kid-friendly).
   */
  playTick(): void {
    const c = this.context();
    const t0 = c.currentTime;
    const mix = this.mixInput();
    // Quieter than game feedback sounds
    mix.gain.setValueAtTime(0.1, t0);

    const freqs = [
      523.25, 587.33, 659.25, 698.46, 783.99, 880.0, 783.99, 659.25, 587.33, 523.25, 659.25, 783.99,
    ];
    const freq = freqs[this.tickStep % freqs.length]!;
    this.tickStep++;

    const osc = c.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t0);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.22, t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.16);
    osc.connect(g);
    g.connect(mix);
    osc.start(t0);
    osc.stop(t0 + 0.18);
  }

  playTimeUp(): void {
    const c = this.context();
    const t0 = c.currentTime;
    const mix = this.mixInput();
    mix.gain.setValueAtTime(0.2, t0);
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
      g.connect(mix);
      osc.start(t);
      osc.stop(t + 0.22);
    });
  }
}
