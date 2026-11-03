import { activeWorld, allColonies } from '../sim/localWorld';
import { planetAt, planets, CELESTIAL } from '../sim/celestial';
import { drawShields } from './shields';
import { applyExplorationAction } from '../sim/exploration';
import { drawExploration } from './exploration';
import { drawGeology } from './geology';
import { drawTowing } from './towing';
import { drawCombat } from './combat';
import { predictMeteor, type ThreatPrediction } from '../sim/meteor';
import { drawDefence } from './defence';
import Phaser from 'phaser';
import { Keyboard } from '../input/keyboard';
import { FixedClock } from '../sim/clock';
import { WORLD } from '../sim/config';
import { heading } from '../sim/math';
import { createWorld, stepWorld } from '../sim/world';
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
import { FlightTools, type ViewAction } from '../ui/FlightTools';
import { predictCoast, type Trajectory } from '../sim/trajectory';
import { createAtmosphere } from './atmosphere';
import { createPlanet } from './planet';
import { drawTrajectory } from './trajectory';

export class FlightScene extends Phaser.Scene {
  private simulation = createWorld();
  private get ship() { return this.simulation.ship; }
  private clock = new FixedClock();
  private follow = new FlightCamera();
  private keys!: Keyboard;
  private hud!: Hud;
  private world!: Phaser.GameObjects.Container;
  private art!: Phaser.GameObjects.Graphics;
  private atmosphere!: Phaser.GameObjects.Image;
  private moon!: Phaser.GameObjects.Image;
  private planet!: Phaser.GameObjects.Image;
  private stars!: Phaser.GameObjects.Graphics;
  private map!: Phaser.GameObjects.Graphics;
  private paused = false;
  private hudTime = 0;
  private colonyActions: ColonyAction[] = [];
  private audio!: GameAudio;
  private soundControls!: SoundControls;
  private help!: Help;
  private pausedBeforeHelp = false;
  private flightTools!: FlightTools;
  private prediction: Trajectory | null = null;
  private predictionTime = 0;
  private threats: ThreatPrediction[] = [];
  private threatTime = 0;
  private starPoints = Array.from({ length: 240 }, (_, i) => ({ x: ((i * 0.61803398875) % 1), y: ((i * i * 0.41421356237) % 1), bright: i % 7 === 0 }));
  constructor() { super('flight'); }
  create(): void {
    this.keys = new Keyboard(this); this.hud = new Hud(action => { if (action.type === 'navigate') applyExplorationAction(this.simulation, action); else if (!this.paused) this.colonyActions.push(action); });
    this.audio = new GameAudio();
    this.help = new Help(open => {
      if (open) this.pausedBeforeHelp = this.paused;
      this.setPaused(open ? true : this.pausedBeforeHelp);
    });
    this.soundControls = new SoundControls(this.audio, () => this.help.toggle());
    this.flightTools = new FlightTools(action => this.viewAction(action));
    this.loadCheckpoint(false);
    this.audio.reset(this.simulation);
    this.follow.reset(this.simulation.playerMode === 'astronaut' ? this.simulation.astronaut : this.ship, this.simulation.system);
    this.stars = this.add.graphics();
    this.world = this.add.container(0, 0); this.atmosphere = createAtmosphere(this);
    this.planet = createPlanet(this);
    this.moon = this.add.image(0, 0, this.planet.texture.key).setDisplaySize(this.planet.displayWidth * CELESTIAL.moon.radius / WORLD.radius, this.planet.displayHeight * CELESTIAL.moon.radius / WORLD.radius).setTint(0xc4b4df);
    this.art = this.add.graphics(); this.world.add([this.atmosphere, this.planet, this.moon, this.art]);
    this.map = this.add.graphics();
    const blur = () => this.setPaused(true), visibility = () => { if (document.hidden) this.setPaused(true); };
    window.addEventListener('blur', blur); document.addEventListener('visibilitychange', visibility);
    const wheel = (event: WheelEvent) => {
      if (this.help.isOpen) return;
      this.follow.zoomBy(Math.exp(-Math.max(-300, Math.min(300, event.deltaY)) * 0.002)); event.preventDefault();
    };
    this.game.canvas.addEventListener('wheel', wheel, { passive: false });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      window.removeEventListener('blur', blur); document.removeEventListener('visibilitychange', visibility);
      this.audio.destroy(); this.soundControls.destroy(); this.help.destroy(); this.keys.destroy(); this.hud.destroy();
      this.flightTools.destroy(); this.game.canvas.removeEventListener('wheel', wheel);
    });
  }
  private viewAction(action: ViewAction): void {
    if (this.help.isOpen) return;
    if (action === 'trajectory') { this.flightTools.trajectory = !this.flightTools.trajectory; this.prediction = null; this.threats = []; }
    else if (action === 'autoZoom') this.follow.autoZoom();
    else this.follow.zoomBy(action === 'zoomIn' ? 1.25 : 0.8);
  }
  private setPaused(value: boolean): void {
    this.paused = value; this.keys.release(); this.colonyActions = []; this.clock.reset();
    if (value) this.audio.silence();
  }
  update(_time: number, delta: number): void {
    if (this.keys.mute()) this.audio.toggleMute();
    if (this.keys.help()) this.help.toggle();
    if (this.keys.closePanel()) { if (this.help.isOpen) this.help.close(); else this.hud.closeDock(); }
    if (!this.help.isOpen && this.keys.restart()) { this.simulation = createWorld(); this.setPaused(false); this.follow.reset(this.ship, this.simulation.system); this.audio.reset(this.simulation); this.prediction = null; this.threats = []; }
    if (!this.help.isOpen && this.keys.save()) {
      try { writeCheckpoint(window.localStorage, this.simulation); notify(this.simulation, 'CHECKPOINT SAVED · K TO UPDATE · L TO LOAD'); }
      catch { notify(this.simulation, 'CHECKPOINT SAVE FAILED · STORAGE UNAVAILABLE OR STATE INVALID'); }
    }
    if (!this.help.isOpen && this.keys.load()) this.loadCheckpoint(true);
    if (!this.help.isOpen && this.keys.pause()) this.setPaused(!this.paused);
    if (!this.help.isOpen) {
      if (this.keys.inventory()) this.hud.toggleDock('cargo');
      if (this.keys.trajectory()) this.viewAction('trajectory');
      if (this.keys.zoomIn()) this.viewAction('zoomIn');
      if (this.keys.zoomOut()) this.viewAction('zoomOut');
      if (this.keys.autoZoom()) this.viewAction('autoZoom');
    }
    if (!this.paused) {
      this.clock.advance(delta / 1000, dt => {
        const input = this.keys.read();
        stepWorld(this.simulation, { ...input, colonyActions: [...(input.colonyActions ?? []), ...this.colonyActions.splice(0)] }, dt);
      });
    }
    const onFoot = this.simulation.playerMode === 'astronaut';
    this.follow.update(onFoot ? this.simulation.astronaut : this.ship, Math.min(delta / 1000, 0.1), onFoot, this.simulation.system);
    this.predictionTime += delta / 1000;
    if (this.simulation.towing.targetId !== null) this.prediction = null;
    if (this.simulation.towing.targetId === null && this.flightTools.trajectory && (this.prediction === null || (!this.paused && this.predictionTime >= 0.2))) {
      this.prediction = predictCoast(this.ship, 180, this.simulation.system); this.predictionTime = 0;
    }
    this.threatTime += delta / 1000;
    if ((!this.paused && this.threatTime >= 0.5) || this.threats.length !== Math.min(12, this.simulation.defence.meteors.length)) {
      this.threats = this.simulation.defence.meteors.slice(0, 12).map(m => predictMeteor(m, 120, this.simulation.system)); this.threatTime = 0;
    }
    this.flightTools.update(this.ship, this.follow, this.prediction, this.simulation.towing.targetId !== null, this.simulation.system);
    this.audio.update(activeWorld(this.simulation), this.paused, delta / 1000);
    this.soundControls.update();
    this.draw();
    this.hudTime += delta;
    if (this.hudTime > 50) { this.hud.update(activeWorld(this.simulation), this.paused, this.threats); this.hudTime = 0; }
  }
  private loadCheckpoint(requested: boolean): void {
    try {
      const saved = readCheckpoint(window.localStorage);
      if (saved) {
        this.simulation = saved; this.paused = true; this.keys.release(); this.clock.reset(); this.colonyActions = [];
        this.follow.reset(saved.playerMode === 'astronaut' ? saved.astronaut : saved.ship);
        this.audio.reset(saved); this.audio.silence();
        this.prediction = null; this.threats = [];
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
    const home = planetAt('home', this.simulation.system), moon = planetAt('moon', this.simulation.system);
    this.atmosphere.setPosition(home.position.x - this.follow.x, home.position.y - this.follow.y);
    this.moon.setVisible(this.simulation.system.binary).setPosition(moon.position.x - this.follow.x, moon.position.y - this.follow.y);
    this.planet.setPosition(home.position.x - this.follow.x, home.position.y - this.follow.y);
    for (const body of planets(this.simulation.system)) {
      g.save(); g.translateCanvas(body.position.x, body.position.y);
    g.lineStyle(4, 0x73f3cf); g.lineBetween(-30, -body.radius, 30, -body.radius);
    for (const x of [-32, 32]) {
      g.lineStyle(1, 0x73f3cf); g.lineBetween(x, -body.radius, x, -body.radius - 18);
      g.fillStyle(0x73f3cf); g.fillCircle(x, -body.radius - 19, 2);
    }
    // Pad beacon remains visible at orbital zoom.
    g.lineStyle(1 / this.follow.zoom, 0x73f3cf, 0.35); g.strokeCircle(0, -body.radius - WORLD.shipRadius, 16 / this.follow.zoom);
      g.restore();
    }
    if (this.flightTools.trajectory && this.simulation.towing.targetId === null) drawTrajectory(g, this.prediction, this.ship, this.follow.zoom);
    drawExploration(g, this.simulation, this.follow.zoom);
    drawMining(g, this.simulation, this.follow.zoom);
    drawTowing(g, this.simulation, this.follow.zoom);
    for (const site of allColonies(this.simulation)) {
      drawGeology(g, site, this.follow.zoom); drawShields(g, site, this.hud.shieldAccents);
      drawColony(g, site, this.hud.selectedBuildingId, (site.siteBody ?? 'home') === this.hud.buildPreview?.body ? this.hud.buildPreview : null);
      drawSurface(g, site);
    }
    drawDefence(g, this.simulation, this.threats, this.follow.zoom);
    drawCombat(g, this.simulation, this.follow.zoom);
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
    const mx = width - 92, my = height - 100, m = this.map;
    m.fillStyle(0x0a1724, .9); m.fillCircle(mx, my, 68); m.lineStyle(1, 0x233c4b); m.strokeCircle(mx, my, 62);
    const point = (p: { x: number; y: number }) => { const k = Math.min(.0058, 61 / Math.max(1, Math.hypot(p.x, p.y))); return { x: mx + p.x * k, y: my + p.y * k }; };
    for (const body of planets(this.simulation.system)) { const p = point(body.position); m.lineStyle(1, body.id === 'home' ? 0x73f3cf : 0xc9b2ef); m.strokeCircle(p.x, p.y, body.radius * .0058); }
    for (const actor of [...this.simulation.asteroids, ...this.simulation.exploration.sites, ...this.simulation.defence.meteors]) { const p = point(actor.position); m.fillStyle(0x9bb4c5, .7); m.fillCircle(p.x, p.y, 1.3); }
    const ship = point(s.position); m.fillStyle(0xffcf94); m.fillCircle(ship.x, ship.y, 3);
    if (this.simulation.playerMode === 'astronaut') { const p = point(this.simulation.astronaut.position); m.fillStyle(0xe0eff2); m.fillCircle(p.x, p.y, 2); }
  }
}
