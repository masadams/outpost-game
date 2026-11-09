import type { WorldState } from '../sim/world';
import { barNotes, barSeconds, frequency, moodFor, MOODS, type Mood, type Note } from './score';

/** How loud the music bus is at a music volume of 1, before the master volume. */
const LEVEL = 1.6;
/** Most notes sounding at once; more are skipped rather than piling up. */
const MAX_VOICES = 48;
/** Schedule a bar this many seconds before it starts. */
const LOOKAHEAD = 0.35;

/**
 * The game's music: a generated score (see score.ts) played on simple synth voices through a shared reverb and echo.
 * Bars are scheduled a moment ahead on the audio clock, so playback is steady and costs almost nothing per frame.
 * The mood is chosen at each bar line, so changes land on the beat.
 */
export class AdaptiveMusic {
  private bus: GainNode;
  private reverb: GainNode;
  private echo: GainNode;
  private noise: AudioBuffer;
  private nextBar = 0;
  private bar = 0;
  private mood: Mood = 'calm';
  private voices = 0;
  private moodClock = 0;
  private wanted: Mood = 'calm';

  constructor(private context: AudioContext, destination: AudioNode) {
    this.bus = context.createGain();
    this.bus.gain.value = 0;
    this.bus.connect(destination);
    // Reverb: a convolver with a generated, softly decaying impulse.
    const convolver = context.createConvolver();
    const seconds = 2.6;
    const impulse = context.createBuffer(2, Math.floor(context.sampleRate * seconds), context.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = impulse.getChannelData(ch);
      for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length) ** 2.4;
    }
    convolver.buffer = impulse;
    this.reverb = context.createGain();
    this.reverb.gain.value = 0.45;
    this.reverb.connect(convolver);
    convolver.connect(this.bus);
    // Echo: a dotted-eighth delay with gentle feedback, dulled each repeat.
    const delay = context.createDelay(2);
    delay.delayTime.value = 0.6;
    const feedback = context.createGain();
    feedback.gain.value = 0.32;
    const dull = context.createBiquadFilter();
    dull.type = 'lowpass';
    dull.frequency.value = 2200;
    this.echo = context.createGain();
    this.echo.gain.value = 0.3;
    this.echo.connect(delay);
    delay.connect(dull);
    dull.connect(feedback);
    feedback.connect(delay);
    dull.connect(this.bus);
    // A short burst of noise, reused for the hats.
    this.noise = context.createBuffer(1, Math.floor(context.sampleRate * 0.1), context.sampleRate);
    const n = this.noise.getChannelData(0);
    for (let i = 0; i < n.length; i++) n[i] = Math.random() * 2 - 1;
  }

  update(w: WorldState, seconds: number, volume: number, audible: boolean, duck: boolean): void {
    const now = this.context.currentTime;
    this.bus.gain.setTargetAtTime(audible ? volume * LEVEL * (duck ? 0.35 : 1) : 0, now, audible ? 0.6 : 0.05);
    if (!audible) {
      this.nextBar = 0;
      return;
    }
    // Working out the mood is cheap but there is no need to do it every frame.
    this.moodClock -= seconds;
    if (this.moodClock <= 0) {
      this.wanted = moodFor(w);
      this.moodClock = 0.5;
    }
    if (this.nextBar < now) this.nextBar = now + 0.1;
    if (this.nextBar - now > LOOKAHEAD) return;
    if (this.wanted !== this.mood) {
      this.mood = this.wanted;
      this.bar = 0;
    }
    for (const note of barNotes(this.mood, this.bar)) this.play(note, this.nextBar + note.at);
    this.nextBar += barSeconds(this.mood);
    this.bar++;
  }

  private play(note: Note, at: number): void {
    if (this.voices >= MAX_VOICES) return;
    const c = this.context;
    const env = c.createGain();
    env.gain.value = 0;
    const end = at + note.length;
    const sources: AudioScheduledSourceNode[] = [];
    const v = note.velocity;
    const f = frequency(note.pitch);
    switch (note.part) {
      case 'pad': {
        const filter = c.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = MOODS[this.mood].brightness;
        for (const detune of [-7, 7]) {
          const o = c.createOscillator();
          o.type = 'sawtooth';
          o.frequency.value = f;
          o.detune.value = detune;
          o.connect(filter);
          sources.push(o);
        }
        filter.connect(env);
        env.gain.setValueAtTime(0, at);
        env.gain.linearRampToValueAtTime(0.03 * v, at + 1.2);
        env.gain.setValueAtTime(0.03 * v, end);
        env.gain.linearRampToValueAtTime(0, end + 1.5);
        this.send(env, 0.6, 0);
        this.finish(sources, env, at, end + 1.6);
        return;
      }
      case 'bass': {
        const o = c.createOscillator();
        o.type = 'triangle';
        o.frequency.value = f;
        const filter = c.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 420;
        o.connect(filter);
        filter.connect(env);
        sources.push(o);
        env.gain.setValueAtTime(0, at);
        env.gain.linearRampToValueAtTime(0.11 * v, at + 0.02);
        env.gain.setTargetAtTime(0.07 * v, at + 0.05, 0.3);
        env.gain.setValueAtTime(0.07 * v, end);
        env.gain.linearRampToValueAtTime(0, end + 0.25);
        this.send(env, 0, 0);
        this.finish(sources, env, at, end + 0.3);
        return;
      }
      case 'arp':
      case 'melody': {
        const o = c.createOscillator();
        o.type = note.part === 'arp' ? 'triangle' : 'sine';
        o.frequency.value = f;
        o.connect(env);
        sources.push(o);
        const peak = (note.part === 'arp' ? 0.035 : 0.06) * v;
        env.gain.setValueAtTime(0, at);
        env.gain.linearRampToValueAtTime(peak, at + 0.02);
        env.gain.exponentialRampToValueAtTime(0.0001, end + 0.8);
        this.send(env, 0.5, note.part === 'melody' ? 0.6 : 0.4);
        this.finish(sources, env, at, end + 0.9);
        return;
      }
      case 'kick': {
        const o = c.createOscillator();
        o.type = 'sine';
        o.frequency.setValueAtTime(120, at);
        o.frequency.exponentialRampToValueAtTime(42, at + 0.14);
        o.connect(env);
        sources.push(o);
        env.gain.setValueAtTime(0.22 * v, at);
        env.gain.exponentialRampToValueAtTime(0.0001, at + 0.3);
        this.send(env, 0, 0);
        this.finish(sources, env, at, at + 0.32);
        return;
      }
      case 'hat': {
        const s = c.createBufferSource();
        s.buffer = this.noise;
        const filter = c.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 7000;
        s.connect(filter);
        filter.connect(env);
        sources.push(s);
        env.gain.setValueAtTime(0.025 * v, at);
        env.gain.exponentialRampToValueAtTime(0.0001, at + 0.05);
        this.send(env, 0.1, 0);
        this.finish(sources, env, at, at + 0.06);
        return;
      }
    }
  }

  /** Dry to the bus, plus some to the reverb and the echo. */
  private send(node: AudioNode, reverb: number, echo: number): void {
    node.connect(this.bus);
    this.sends = [];
    for (const [amount, target] of [[reverb, this.reverb], [echo, this.echo]] as const) {
      if (amount <= 0) continue;
      const g = this.context.createGain();
      g.gain.value = amount;
      node.connect(g);
      g.connect(target);
      this.sends.push(g);
    }
  }
  /** The send nodes made for the note being set up, disconnected when it ends. */
  private sends: GainNode[] = [];

  private finish(sources: AudioScheduledSourceNode[], env: GainNode, start: number, stop: number): void {
    this.voices++;
    const sends = this.sends;
    this.sends = [];
    let left = sources.length;
    for (const s of sources) {
      s.start(start);
      s.stop(stop);
      s.onended = () => {
        s.disconnect();
        left--;
        if (left === 0) {
          env.disconnect();
          for (const g of sends) g.disconnect();
          this.voices--;
        }
      };
    }
  }

  destroy(): void {
    this.bus.disconnect();
  }
}

