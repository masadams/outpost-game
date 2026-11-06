import { AdaptiveMusic } from './AdaptiveMusic';
import { AudioDirector, type Cue, type SoundFrame } from './director';
import { AUDIO_KEY, parsePreferences, type AudioPreferences } from './preferences';
import type { WorldState } from '../sim/world';

type Loop = 'engine' | 'mining' | 'tractor' | 'machinery';
export class GameAudio {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private effects: GainNode | null = null;
  private music: AdaptiveMusic | null = null;
  private effectsVolume = 1;
  private musicVolume = .15;
  private duckTime = 0;
  setMix(effects: number, music: number): void { this.effectsVolume = effects; this.musicVolume = music; if(this.effects && this.context) this.effects.gain.setTargetAtTime(effects,this.context.currentTime,.03); }
  private director = new AudioDirector();
  private loops = new Map<Loop, { oscillator: OscillatorNode; gain: GainNode }>();
  private voices = new Set<AudioScheduledSourceNode>();
  private active = true;
  private failed = false;
  private disposed = false;
  private engineRumble: AudioBufferSourceNode | null = null;
  private pickupRun = 0;
  private lastPickup = -10;
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
        this.effects=this.context.createGain(); this.effects.gain.value=this.effectsVolume; this.effects.connect(this.master);
        this.music=new AdaptiveMusic(this.context,this.master);
        const compressor = this.context.createDynamicsCompressor(); compressor.threshold.value = -16; compressor.ratio.value = 3;
        this.master.connect(compressor); compressor.connect(this.context.destination);
        for (const [name, frequency, type] of [['engine', 54, 'sine'], ['mining', 220, 'triangle'], ['tractor', 108, 'sine'], ['machinery', 70, 'sine']] as const) {
          const oscillator = this.context.createOscillator(), gain = this.context.createGain(), filter = this.context.createBiquadFilter();
          oscillator.type = type; oscillator.frequency.value = frequency; filter.type = 'lowpass'; filter.frequency.value = name === 'engine' ? 450 : 1000;
          gain.gain.value = 0; oscillator.connect(filter); filter.connect(gain); gain.connect(this.effects!); oscillator.start();
          if (name === 'engine') {
            // A rocket is mostly a low rumble of rushing gas: filtered brown noise under a soft sine.
            const length = this.context.sampleRate * 2;
            const buffer = this.context.createBuffer(1, length, this.context.sampleRate);
            const data = buffer.getChannelData(0);
            let last = 0;
            let seed = 7;
            for (let i = 0; i < length; i++) {
              seed = (Math.imul(seed, 1664525) + 1013904223) | 0;
              last = (last + 0.04 * (seed / 2147483648)) / 1.02;
              data[i] = last * 14;
            }
            const rumble = this.context.createBufferSource();
            const rumbleFilter = this.context.createBiquadFilter();
            const rumbleGain = this.context.createGain();
            rumble.buffer = buffer;
            rumble.loop = true;
            rumbleFilter.type = 'lowpass';
            rumbleFilter.frequency.value = 260;
            rumbleGain.gain.value = 1.5;
            rumble.connect(rumbleFilter);
            rumbleFilter.connect(rumbleGain);
            rumbleGain.connect(gain);
            rumble.start();
            this.engineRumble = rumble;
          }
          if (name === 'mining') {
            // A slow wobble makes the beam hum feel alive rather than a flat tone.
            const wobble = this.context.createOscillator();
            const depth = this.context.createGain();
            wobble.frequency.value = 6.5;
            depth.gain.value = 14;
            wobble.connect(depth);
            depth.connect(oscillator.frequency);
            wobble.start();
          }
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
      loop.gain.gain.setTargetAtTime(enabled ? name === 'engine' ? 0.07 : name === 'machinery' ? 0.007 : 0.035 : 0, this.context.currentTime, 0.04);
    }
    if (frame.cues.some(c=>['warning','landingWarning','fuelWarning','shieldBreach','crash'].includes(c))) this.duckTime=2;
    this.duckTime=Math.max(0,this.duckTime-seconds);
    this.music?.update(world,seconds,this.musicVolume,this.audible,this.duckTime>0);
    if (paused) this.stopVoices();
    if (this.audible) for (const cue of frame.cues) this.play(cue);
  }
  private track(source: AudioScheduledSourceNode, gain: GainNode): void {
    this.voices.add(source); source.onended = () => { this.voices.delete(source); source.disconnect(); gain.disconnect(); };
  }
  private tone(frequency: number, end: number, duration: number, delay = 0, type: OscillatorType = 'triangle', level = 0.11): void {
    if (!this.context || !this.master || this.voices.size >= 20) return;
    const now = this.context.currentTime + delay, oscillator = this.context.createOscillator(), gain = this.context.createGain();
    oscillator.type = type; oscillator.frequency.setValueAtTime(frequency, now); oscillator.frequency.exponentialRampToValueAtTime(end, now + duration);
    gain.gain.setValueAtTime(0, now); gain.gain.linearRampToValueAtTime(level, now + 0.008); gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(gain); gain.connect(this.effects!); this.track(oscillator, gain); oscillator.start(now); oscillator.stop(now + duration + 0.01);
  }
  private noiseSeed = 19;
  /** A burst of noise; `cutoff` (Hz) softens it into a thud or scuff instead of a hiss. Each burst is slightly different. */
  private noise(duration: number, level: number, cutoff = 0): void {
    if (!this.context || !this.master || this.voices.size >= 20) return;
    const buffer = this.context.createBuffer(1, Math.ceil(this.context.sampleRate * duration), this.context.sampleRate), data = buffer.getChannelData(0);
    let seed = (this.noiseSeed = (this.noiseSeed * 7 + 13) % 100003);
    for (let i = 0; i < data.length; i++) { seed = (Math.imul(seed, 1664525) + 1013904223) | 0; data[i] = seed / 2147483648; }
    const source = this.context.createBufferSource(), gain = this.context.createGain(); source.buffer = buffer;
    const now = this.context.currentTime; gain.gain.setValueAtTime(level, now); gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    if (cutoff > 0) {
      const filter = this.context.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = cutoff;
      source.connect(filter); filter.connect(gain);
    } else source.connect(gain);
    gain.connect(this.effects!); this.track(source, gain); source.start(now);
  }
  private play(cue: Cue): void {
    if(cue==='airlessArrival'){this.tone(220,330,.3,0,'sine');this.tone(440,330,.35,.3,'sine');}
    else if (cue === 'crash') { this.noise(0.45, 0.16); this.tone(130, 35, 0.45); }
    else if (cue === 'split') { this.noise(0.22, 0.12); this.tone(120, 48, 0.3); this.tone(300, 180, 0.1); }
    else if (cue === 'impact' || cue === 'fracture') { this.noise(0.16, 0.09); this.tone(160, 65, 0.18); }
    else if (cue === 'shieldHit') { this.tone(260, 720, 0.16, 0, 'sine'); }
    else if (cue === 'shieldBreach') { this.tone(520, 100, 0.28); this.tone(180, 90, 0.18, 0.28); }
    else if (cue === 'shot') this.tone(920, 180, 0.1, 0, 'sawtooth');
    // Footsteps: a soft, low scuff, not a click.
    else if (cue === 'step') { this.noise(0.07, 0.02, 420); this.tone(95, 70, 0.06, 0, 'sine', 0.02); }
    else if (cue === 'airlock') { this.noise(0.18, 0.04); this.tone(230, 320, 0.1); }
    else if (cue === 'warning') { this.tone(660, 600, 0.12); this.tone(660, 600, 0.12, 0.2); }
    else if (cue === 'landingWarning') { this.tone(880, 520, 0.16); this.tone(880, 520, 0.16, 0.24); }
    else if (cue === 'fuelWarning') { this.tone(420, 420, 0.14); this.tone(310, 310, 0.2, 0.22); }
    else if (cue === 'towLatch') this.tone(210, 360, 0.18);
    else if (cue === 'towRelease') this.tone(330, 150, 0.12);
    else if (cue === 'towSnap') { this.noise(0.08, 0.06); this.tone(150, 80, 0.14); }
    else if (cue === 'atmosphereExit') { this.tone(330, 520, 0.18); this.tone(520, 780, 0.2, 0.18); }
    else if (cue === 'atmosphereEntry') { this.tone(660, 440, 0.18); this.tone(440, 260, 0.2, 0.18); }
    else if (cue === 'land' || cue === 'delivery' || cue === 'service') { this.tone(330, 440, 0.14); this.tone(660, 660, 0.18, 0.12); }
    else if (cue === 'pickup') {
      // Quick pickups in a row climb a step each, up to an octave, so a haul feels like a run.
      const now = this.context?.currentTime ?? 0;
      this.pickupRun = now - this.lastPickup < 1.4 ? Math.min(this.pickupRun + 1, 7) : 0;
      this.lastPickup = now;
      const rise = 2 ** (this.pickupRun / 7);
      this.tone(740 * rise, 980 * rise, 0.08);
    }
    else if (cue === 'production') { this.tone(523, 523, 0.18, 0, 'sine', 0.04); this.tone(784, 784, 0.25, 0.12, 'sine', 0.035); }
    else if (cue === 'scan') { this.tone(300, 900, 0.5, 0, 'sine'); this.tone(450, 1350, 0.5, 0.35, 'sine'); this.tone(600, 1800, 0.45, 0.7, 'sine'); }
    else if (cue === 'sighting') { this.tone(520, 520, 0.12, 0, 'sine'); this.tone(780, 780, 0.2, 0.16, 'sine'); }
    else if (cue === 'stormOver') { this.tone(330, 440, 0.3, 0, 'sine'); this.tone(495, 660, 0.4, 0.2, 'sine'); }
    // Finished building: a soft two-note chime.
    else if (cue === 'build') { this.tone(392, 392, 0.2, 0, 'sine', 0.045); this.tone(587, 587, 0.28, 0.12, 'sine', 0.04); }
    else if (cue === 'demolish') { this.noise(0.25, 0.03, 600); this.tone(220, 110, 0.25, 0, 'sine', 0.05); }
    else if (cue === 'jump') this.tone(170, 280, 0.12);
    else if (cue === 'launch') this.tone(90, 160, 0.2);
    else this.tone(260, 380, 0.12);
  }
  destroy(): void {
    this.disposed = true; this.silence();
    document.removeEventListener('keydown', this.unlock); document.removeEventListener('pointerdown', this.unlock);
    window.removeEventListener('blur', this.silence); document.removeEventListener('visibilitychange', this.visibility);
    for (const loop of this.loops.values()) loop.oscillator.stop();
    this.engineRumble?.stop();
    this.music?.destroy(); this.loops.clear(); if (this.context) void this.context.close().catch(() => {});
  }
}
