import Phaser from 'phaser';
import { Keyboard } from '../input/keyboard';
import { FixedClock } from '../sim/clock';
import { WORLD } from '../sim/config';
import { heading, localAngle } from '../sim/math';
import { createWorld, stepWorld } from '../sim/world';
import { RESOURCE_INFO } from '../sim/resources';
import { Hud } from '../ui/hud';
import { FlightCamera } from './camera';
import { drawMining } from './mining';
import { drawSurface } from './surface';
import { drawColony } from './colony';
import type { ColonyAction } from '../sim/colony';
import { notify } from '../sim/messages';
import { readCheckpoint, writeCheckpoint } from '../persistence/checkpoint';
import { GameAudio } from '../audio/GameAudio';
import { Help } from '../ui/Help';
import { SoundControls } from '../ui/SoundControls';

export class FlightScene extends Phaser.Scene {
  private simulation = createWorld();
  private get ship() { return this.simulation.ship; }
  private clock = new FixedClock();
  private follow = new FlightCamera();
  private keys!: Keyboard;
  private hud!: Hud;
  private world!: Phaser.GameObjects.Container;
  private art!: Phaser.GameObjects.Graphics;
  private stars!: Phaser.GameObjects.Graphics;
  private map!: Phaser.GameObjects.Graphics;
  private paused = false;
  private hudTime = 0;
  private colonyActions: ColonyAction[] = [];
  private audio!: GameAudio;
  private soundControls!: SoundControls;
  private help!: Help;
  private pausedBeforeHelp = false;
  private starPoints = Array.from({ length: 240 }, (_, i) => ({ x: ((i * 0.61803398875) % 1), y: ((i * i * 0.41421356237) % 1), bright: i % 7 === 0 }));
  constructor() { super('flight'); }
  create(): void {
    this.keys = new Keyboard(this); this.hud = new Hud(action => { if (!this.paused) this.colonyActions.push(action); });
    this.audio = new GameAudio();
    this.help = new Help(open => {
      if (open) this.pausedBeforeHelp = this.paused;
      this.setPaused(open ? true : this.pausedBeforeHelp);
    });
    this.soundControls = new SoundControls(this.audio, () => this.help.toggle());
    this.loadCheckpoint(false);
    this.audio.reset(this.simulation);
    this.follow.reset(this.simulation.playerMode === 'astronaut' ? this.simulation.astronaut : this.ship);
    this.stars = this.add.graphics();
    this.world = this.add.container(0, 0); this.art = this.add.graphics(); this.world.add(this.art);
    this.map = this.add.graphics();
    const blur = () => this.setPaused(true), visibility = () => { if (document.hidden) this.setPaused(true); };
    window.addEventListener('blur', blur); document.addEventListener('visibilitychange', visibility);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      window.removeEventListener('blur', blur); document.removeEventListener('visibilitychange', visibility);
      this.audio.destroy(); this.soundControls.destroy(); this.help.destroy(); this.keys.destroy(); this.hud.destroy();
    });
  }
  private setPaused(value: boolean): void {
    this.paused = value; this.keys.release(); this.colonyActions = []; this.clock.reset();
    if (value) this.audio.silence();
  }
  update(_time: number, delta: number): void {
    if (this.keys.mute()) this.audio.toggleMute();
    if (this.keys.help()) this.help.toggle();
    if (!this.help.isOpen && this.keys.restart()) { this.simulation = createWorld(); this.setPaused(false); this.follow.reset(this.ship); this.audio.reset(this.simulation); }
    if (!this.help.isOpen && this.keys.save()) {
      try { writeCheckpoint(window.localStorage, this.simulation); notify(this.simulation, 'CHECKPOINT SAVED · K TO UPDATE · L TO LOAD'); }
      catch { notify(this.simulation, 'CHECKPOINT SAVE FAILED · STORAGE UNAVAILABLE OR STATE INVALID'); }
    }
    if (!this.help.isOpen && this.keys.load()) this.loadCheckpoint(true);
    if (!this.help.isOpen && this.keys.pause()) this.setPaused(!this.paused);
    if (!this.paused) {
      this.clock.advance(delta / 1000, dt => {
        const input = this.keys.read();
        stepWorld(this.simulation, { ...input, colonyActions: [...(input.colonyActions ?? []), ...this.colonyActions.splice(0)] }, dt);
      });
      const onFoot = this.simulation.playerMode === 'astronaut';
      this.follow.update(onFoot ? this.simulation.astronaut : this.ship, Math.min(delta / 1000, 0.1), onFoot);
    }
    this.audio.update(this.simulation, this.paused, delta / 1000);
    this.soundControls.update();
    this.draw();
    this.hudTime += delta;
    if (this.hudTime > 50) { this.hud.update(this.simulation, this.paused); this.hudTime = 0; }
  }
  private loadCheckpoint(requested: boolean): void {
    try {
      const saved = readCheckpoint(window.localStorage);
      if (saved) {
        this.simulation = saved; this.paused = true; this.keys.release(); this.clock.reset(); this.colonyActions = [];
        this.follow.reset(saved.playerMode === 'astronaut' ? saved.astronaut : saved.ship);
        this.audio.reset(saved); this.audio.silence();
      } else if (requested) notify(this.simulation, 'NO CHECKPOINT · PRESS K TO SAVE');
    } catch { notify(this.simulation, 'CHECKPOINT INVALID OR STORAGE UNAVAILABLE · CURRENT WORLD KEPT'); }
  }
  private draw(): void {
    const { width, height } = this.scale;
    const g = this.art; g.clear(); this.stars.clear(); this.map.clear();
    for (const star of this.starPoints) {
      this.stars.fillStyle(star.bright ? 0xa9c9dc : 0x456079, star.bright ? 0.85 : 0.5);
      this.stars.fillRect(star.x * width, star.y * height, star.bright ? 2 : 1, star.bright ? 2 : 1);
    }
    this.world.setPosition(width / 2, height * 0.53).setScale(this.follow.zoom).setRotation(-this.follow.angle);
    g.setPosition(-this.follow.x, -this.follow.y);
    g.lineStyle(2, 0x314b58, 0.35); g.strokeCircle(0, 0, WORLD.radius + 90);
    g.fillStyle(0x17282e); g.fillCircle(0, 0, WORLD.radius);
    g.lineStyle(2, 0x6a8b8b); g.strokeCircle(0, 0, WORLD.radius);
    // Deterministic geological markings, entirely inside the collision rim.
    for (let i = 0; i < 100; i++) {
      const a = i * 2.399963; const r = 50 + ((i * 137) % 500);
      g.lineStyle(1, 0x30464b, 0.8); g.strokeCircle(Math.cos(a) * r, Math.sin(a) * r, 4 + i % 19);
    }
    for (let i = 0; i < 180; i++) {
      const n = heading(i * Math.PI / 90);
      g.lineStyle(1, 0x466263, 0.7); g.lineBetween(n.x * 590, n.y * 590, n.x * 598, n.y * 598);
    }
    g.lineStyle(4, 0x73f3cf); g.lineBetween(-30, -600, 30, -600);
    for (const x of [-32, 32]) {
      g.lineStyle(1, 0x73f3cf); g.lineBetween(x, -600, x, -618);
      g.fillStyle(0x73f3cf); g.fillCircle(x, -619, 2);
    }
    // Pad beacon remains visible at orbital zoom.
    g.lineStyle(1 / this.follow.zoom, 0x73f3cf, 0.35); g.strokeCircle(0, -607, 16 / this.follow.zoom);
    drawMining(g, this.simulation, this.follow.zoom);
    drawColony(g, this.simulation);
    drawSurface(g, this.simulation);
    const s = this.ship; const n = heading(s.angle); const right = { x: -n.y, y: n.x };
    const visibilityScale = Math.max(1, 0.7 / this.follow.zoom);
    const p = (x: number, y: number) => new Phaser.Geom.Point(s.position.x + (right.x * x + n.x * y) * visibilityScale, s.position.y + (right.y * x + n.y * y) * visibilityScale);
    g.lineStyle(1.2, s.impact > 0 ? 0xff8f75 : 0xb7e7e6); g.fillStyle(s.state === 'crashed' ? 0x713c3e : 0x254d60);
    g.fillPoints([p(0, 10), p(6, -4), p(4, -6), p(-4, -6), p(-6, -4)], true);
    g.strokePoints([p(0, 10), p(6, -4), p(4, -6), p(-4, -6), p(-6, -4)], true);
    g.fillStyle(0x73f3cf); const cockpit = p(0, 3); g.fillCircle(cockpit.x, cockpit.y, 2);
    for (const side of [-1, 1]) { const a = p(side * 4, -3), b = p(side * 8, -7); g.lineBetween(a.x, a.y, b.x, b.y); }
    if (s.thrusting && !this.paused) {
      g.fillStyle(0xffbb73); g.fillPoints([p(-3, -6), p(3, -6), p(0, -16 - Math.sin(this.time.now / 45) * 3)], true);
    }
    // Radar shows the complete moon and the direction home at every altitude.
    const mx = width > 560 ? width - 380 : width - 92, my = height - 178, radius = 22;
    const m = this.map; m.fillStyle(0x0a1724, 0.9); m.fillCircle(mx, my, 68);
    m.lineStyle(1, 0x233c4b); m.strokeCircle(mx, my, 62);
    m.lineStyle(1, 0x3b5969); m.strokeCircle(mx, my, radius);
    m.fillStyle(0x73f3cf); m.fillRect(mx - 3, my - radius - 2, 6, 4);
    const angle = localAngle(s.position); const direction = heading(angle);
    const distance = Math.min(61, Math.hypot(s.position.x, s.position.y) / WORLD.radius * radius);
    m.fillStyle(0xffcf94); m.fillCircle(mx + direction.x * distance, my + direction.y * distance, 3);
    if (this.simulation.playerMode === 'astronaut') {
      const p = this.simulation.astronaut.position;
      m.fillStyle(0xe0eff2); m.fillCircle(mx + p.x / WORLD.radius * radius, my + p.y / WORLD.radius * radius, 2);
    }
    for (const rock of this.simulation.asteroids) {
      const distance = Math.hypot(rock.position.x, rock.position.y);
      const scale = Math.min(radius / WORLD.radius, 61 / distance);
      m.fillStyle(RESOURCE_INFO[rock.resource].color, 0.8); m.fillCircle(mx + rock.position.x * scale, my + rock.position.y * scale, 1.5);
    }
  }
}
