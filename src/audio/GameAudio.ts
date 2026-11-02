import { AudioDirector, type Cue, type SoundFrame } from './director';
import { AUDIO_KEY, parsePreferences, type AudioPreferences } from './preferences';
import type { WorldState } from '../sim/world';

type Loop = 'engine' | 'mining' | 'tractor' | 'machinery';
export class GameAudio {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private director = new AudioDirector();
  private loops = new Map<Loop, { oscillator: OscillatorNode; gain: GainNode }>();
  private voices = new Set<AudioScheduledSourceNode>();
  private active = true;
  private failed = false;
  private disposed = false;
  private frame: SoundFrame = { cues: [], engine: false, mining: false, tractor: false, machinery: false };
  readonly preferences: AudioPreferences;
  constructor() {
    let saved: string | null = null; try { saved = localStorage.getItem(AUDIO_KEY); } catch { /* Optional storage. */ }
    this.preferences = parsePreferences(saved);
    document.addEventListener('keydown', this.unlock); document.addEventListener('pointerdown', this.unlock);
    window.addEventListener('blur', this.silence); document.addEventListener('visibilitychange', this.visibility);
  }
  get status(): 'locked' | 'on' | 'muted' | 'unavailable' {
    if (this.failed) return 'unavailable';
    if (this.preferences.muted || this.preferences.volume === 0) return 'muted';
    return this.context?.state === 'running' ? 'on' : 'locked';
  }
  get audible(): boolean { return this.status === 'on' && this.active; }
  enable(): void { this.unlock(); this.mix(); }
  get loopCount(): number { return this.audible ? [this.frame.engine, this.frame.mining, this.frame.tractor, this.frame.machinery].filter(Boolean).length : 0; }
  private visibility = (): void => { if (document.hidden) this.silence(); };
  private unlock = (): void => {
    if (this.disposed || this.failed) return;
    try {
      if (!this.context) {
        this.context = new AudioContext(); this.master = this.context.createGain(); this.master.gain.value = 0;
        const compressor = this.context.createDynamicsCompressor(); compressor.threshold.value = -16; compressor.ratio.value = 3;
        this.master.connect(compressor); compressor.connect(this.context.destination);
        for (const [name, frequency, type] of [['engine', 82, 'sawtooth'], ['mining', 220, 'triangle'], ['tractor', 108, 'sine'], ['machinery', 62, 'triangle']] as const) {
          const oscillator = this.context.createOscillator(), gain = this.context.createGain(), filter = this.context.createBiquadFilter();
          oscillator.type = type; oscillator.frequency.value = frequency; filter.type = 'lowpass'; filter.frequency.value = name === 'engine' ? 450 : 1000;
          gain.gain.value = 0; oscillator.connect(filter); filter.connect(gain); gain.connect(this.master); oscillator.start();
          this.loops.set(name, { oscillator, gain });
        }
      }
      if (this.context.state === 'suspended') void this.context.resume().catch(() => { /* Retry on the next user gesture. */ });
    } catch { this.failed = true; }
  };
  private persist(): void { try { localStorage.setItem(AUDIO_KEY, JSON.stringify(this.preferences)); } catch { /* Play without persistence. */ } }
  toggleMute(): void { this.preferences.muted = !this.preferences.muted; this.persist(); this.mix(); }
  setVolume(volume: number): void { this.preferences.volume = Math.max(0, Math.min(1, Number.isFinite(volume) ? volume : 0.35)); this.persist(); this.mix(); }
  private mix(): void {
    if (!this.context || !this.master) return;
    const gain = this.active && !this.preferences.muted ? this.preferences.volume : 0;
    this.master.gain.cancelScheduledValues(this.context.currentTime);
    this.master.gain.setTargetAtTime(gain, this.context.currentTime, 0.015);
  }
  silence = (): void => {
    this.active = false; this.mix(); this.stopVoices();
    if (this.context) for (const loop of this.loops.values()) loop.gain.gain.setTargetAtTime(0, this.context.currentTime, 0.005);
  };
  private stopVoices(): void {
    for (const voice of this.voices) { try { voice.stop(); } catch { /* Already ended. */ } }
    this.voices.clear();
  }
  reset(world: WorldState): void { this.director.reset(world); this.stopVoices(); }
  update(world: WorldState, paused: boolean, seconds: number): void {
    const frame = this.director.update(world, seconds, paused);
    this.frame = frame;
    this.active = !paused && !document.hidden; this.mix();
    if (!this.context) return;
    for (const [name, loop] of this.loops) {
      const enabled = !paused && frame[name];
      loop.gain.gain.setTargetAtTime(enabled ? name === 'engine' ? 0.065 : name === 'machinery' ? 0.018 : 0.035 : 0, this.context.currentTime, 0.04);
    }
    if (paused) this.stopVoices();
    if (this.audible) for (const cue of frame.cues) this.play(cue);
  }
  private track(source: AudioScheduledSourceNode, gain: GainNode): void {
    this.voices.add(source); source.onended = () => { this.voices.delete(source); source.disconnect(); gain.disconnect(); };
  }
  private tone(frequency: number, end: number, duration: number, delay = 0, type: OscillatorType = 'triangle'): void {
    if (!this.context || !this.master || this.voices.size >= 20) return;
    const now = this.context.currentTime + delay, oscillator = this.context.createOscillator(), gain = this.context.createGain();
    oscillator.type = type; oscillator.frequency.setValueAtTime(frequency, now); oscillator.frequency.exponentialRampToValueAtTime(end, now + duration);
    gain.gain.setValueAtTime(0, now); gain.gain.linearRampToValueAtTime(0.11, now + 0.008); gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(gain); gain.connect(this.master); this.track(oscillator, gain); oscillator.start(now); oscillator.stop(now + duration + 0.01);
  }
  private noise(duration: number, level: number): void {
    if (!this.context || !this.master || this.voices.size >= 20) return;
    const buffer = this.context.createBuffer(1, Math.ceil(this.context.sampleRate * duration), this.context.sampleRate), data = buffer.getChannelData(0);
    let seed = 19; for (let i = 0; i < data.length; i++) { seed = (Math.imul(seed, 1664525) + 1013904223) | 0; data[i] = seed / 2147483648; }
    const source = this.context.createBufferSource(), gain = this.context.createGain(); source.buffer = buffer;
    const now = this.context.currentTime; gain.gain.setValueAtTime(level, now); gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    source.connect(gain); gain.connect(this.master); this.track(source, gain); source.start(now);
  }
  private play(cue: Cue): void {
    if (cue === 'crash') { this.noise(0.45, 0.16); this.tone(130, 35, 0.45); }
    else if (cue === 'impact' || cue === 'fracture') { this.noise(0.16, 0.09); this.tone(160, 65, 0.18); }
    else if (cue === 'step') this.noise(0.045, 0.035);
    else if (cue === 'airlock') { this.noise(0.18, 0.04); this.tone(230, 320, 0.1); }
    else if (cue === 'warning') { this.tone(660, 600, 0.12); this.tone(660, 600, 0.12, 0.2); }
    else if (cue === 'land' || cue === 'delivery' || cue === 'service') { this.tone(330, 440, 0.14); this.tone(660, 660, 0.18, 0.12); }
    else if (cue === 'pickup' || cue === 'production') this.tone(cue === 'pickup' ? 740 : 440, 980, 0.08);
    else if (cue === 'build') { this.noise(0.08, 0.035); this.tone(260, 520, 0.18); }
    else if (cue === 'demolish') this.tone(220, 90, 0.2);
    else if (cue === 'jump') this.tone(170, 280, 0.12);
    else if (cue === 'launch') this.tone(90, 160, 0.2);
    else this.tone(260, 380, 0.12);
  }
  destroy(): void {
    this.disposed = true; this.silence();
    document.removeEventListener('keydown', this.unlock); document.removeEventListener('pointerdown', this.unlock);
    window.removeEventListener('blur', this.silence); document.removeEventListener('visibilitychange', this.visibility);
    for (const loop of this.loops.values()) loop.oscillator.stop();
    this.loops.clear(); if (this.context) void this.context.close().catch(() => {});
  }
}
