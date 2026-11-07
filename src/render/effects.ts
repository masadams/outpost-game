import type Phaser from 'phaser';
import type { WorldState } from '../sim/world';
import type { Vec } from '../sim/math';
import { RESOURCES, RESOURCE_INFO, type Resource } from '../sim/resources';
import { visible, type RenderView } from './budget';
import { seeded } from './mining/random';
import { dustStrength, groundBelow } from './landing';
import { allColonies, sitePosition } from '../sim/localWorld';
import { BLUEPRINTS } from '../sim/colonyConfig';

/** An expanding ring with a few dots: a flash. */
interface Burst { position: Vec; life: number; color: number; size: number }
/** A piece of debris or a glint, flying free. */
interface Chunk { x: number; y: number; vx: number; vy: number; turn: number; spin: number; size: number; life: number; maxLife: number; color: number; glint: boolean }
/** A soft puff of dust kicked up from the ground. */
interface Puff { x: number; y: number; vx: number; vy: number; size: number; grow: number; life: number; maxLife: number }
/** Expanding rings: a building finishing, powering up, or the Observatory starting to listen. */
interface Signal { x: number; y: number; age: number; life: number; color: number; rings: number; reach: number }
interface RockRecord { position: Vec; velocity: Vec; radius: number; stage: number; resource: Resource }

const BURST_LIFE = 0.4;

/** Camera shake (0 to 1) for a rock of this radius breaking this far from the ship. */
export function kickForBreak(distance: number, radius: number): number {
  const reach = 420;
  if (distance >= reach) return 0;
  return Math.min(1, (1 - distance / reach) * (0.35 + radius / 50)) * 0.5;
}

/** Camera shake for the hull losing this many percent at once. */
export function kickForHit(lost: number): { strength: number; seconds: number } {
  const strength = Math.min(1, 0.25 + lost / 30);
  return { strength, seconds: 0.14 + 0.2 * strength };
}
const CHUNKS_PER_EVENT = 8;

/** Render-only bursts and debris. Never saved, never collidable, never change simulation. */
export class VisualEffects {
  private rocks = new Map<number, RockRecord>();
  private cargo = new Map<Resource, number>();
  private hull = 100;
  private bursts: Burst[] = [];
  private chunks: Chunk[] = [];
  private puffs: Puff[] = [];
  private signals: Signal[] = [];
  /** Buildings already in the world, and those that have already run once, so effects fire only for what is new. */
  private seen = new Set<string>();
  private ran = new Set<string>();
  private landings = 0;
  private dustClock = 0;
  /** What happened this frame, for the camera: a rock broke close by, the hull took a knock. Read and cleared each frame. */
  private kicks: Array<{ strength: number; seconds: number }> = [];

  /** The camera shake asked for since the last call. Rock breaks near the ship thud; hull hits rattle harder. */
  takeKicks(): Array<{ strength: number; seconds: number }> {
    const out = this.kicks;
    this.kicks = [];
    return out;
  }

  reset(w: WorldState): void {
    this.rocks = this.snapshotRocks(w);
    this.cargo = this.snapshotCargo(w);
    this.hull = w.ship.hull;
    this.bursts = [];
    this.chunks = [];
    this.puffs = [];
    this.signals = [];
    this.noteBuildings(w, false, 0);
    this.landings = w.ship.landings;
    this.dustClock = 0;
  }

  private snapshotRocks(w: WorldState): Map<number, RockRecord> {
    return new Map(w.asteroids.map(a => [a.id, { position: { ...a.position }, velocity: { ...a.velocity }, radius: a.radius, stage: a.stage, resource: a.resource }]));
  }

  private snapshotCargo(w: WorldState): Map<Resource, number> {
    return new Map(RESOURCES.map(r => [r, w.ship.cargo[r]]));
  }

  update(w: WorldState, dt: number, paused: boolean, limit: number, view: RenderView): void {
    this.bursts = limit === 0 ? [] : this.bursts.slice(-limit);
    if (limit === 0) {
      this.chunks = [];
      this.puffs = [];
      this.signals = [];
    }
    if (paused) return;
    const step = Math.max(0, dt);
    this.bursts = this.bursts.map(b => ({ ...b, life: b.life - step })).filter(b => b.life > 0).slice(-limit);
    this.advanceChunks(step);
    this.advancePuffs(step);
    this.signals = this.signals.map(g => ({ ...g, age: g.age + step })).filter(g => g.age < g.life);
    if (limit === 0) {
      this.bursts = [];
      this.chunks = [];
      this.puffs = [];
    }
    if (limit > 0) this.landingDust(w, step, limit * 6);
    this.noteBuildings(w, limit > 0, limit);

    const burst = (position: Vec, color: number, size = 1): void => {
      if (limit > 0 && visible(view, position, 24)) {
        this.bursts.push({ position: { ...position }, life: BURST_LIFE, color, size });
        this.bursts = this.bursts.slice(-limit);
      }
    };

    const ids = new Set(w.asteroids.map(a => a.id));
    for (const [id, rock] of this.rocks) {
      if (ids.has(id)) continue;
      burst(rock.position, 0xffca8d, rock.stage === 0 ? 1.6 : 1);
      this.kickFor(w, rock.position, rock.radius, rock.stage === 0 ? 1 : 0.55);
      if (limit > 0 && visible(view, rock.position, rock.radius * 2)) this.breakUp(id, rock, limit * 8);
    }
    if (w.ship.hull < this.hull) {
      burst(w.ship.position, 0xff987e);
      this.kicks.push(kickForHit(this.hull - w.ship.hull));
    }

    // A flash at the ship for each kind of ore taken aboard.
    for (const r of RESOURCES) {
      if (w.ship.cargo[r] > (this.cargo.get(r) ?? 0) + 1e-6) {
        burst(w.ship.position, RESOURCE_INFO[r].color, 0.8);
        this.glints(w.ship.position, w.ship.velocity, RESOURCE_INFO[r].color, limit * 8);
      }
    }

    this.rocks = this.snapshotRocks(w);
    this.cargo = this.snapshotCargo(w);
    this.hull = w.ship.hull;
  }

  /** A rock breaking near the ship thuds in the camera: more for a big rock, nothing for one far away. */
  private kickFor(w: WorldState, at: Vec, radius: number, weight: number): void {
    const near = Math.hypot(at.x - w.ship.position.x, at.y - w.ship.position.y);
    const strength = kickForBreak(near, radius) * weight;
    if (strength > 0) this.kicks.push({ strength, seconds: 0.09 + 0.05 * Math.min(1, radius / 40) });
  }

  /** Notices buildings that are new or have just started running, and marks them with rings of light. */
  private noteBuildings(w: WorldState, announce: boolean, limit: number): void {
    for (const site of allColonies(w)) {
      const body = site.siteBody ?? 'home';
      for (const b of site.colony.buildings) {
        const key = `${body}:${b.id}`;
        const at = sitePosition(site, b.angle, 10);
        const color = BLUEPRINTS[b.kind].color;
        if (!this.seen.has(key)) {
          this.seen.add(key);
          if (announce) {
            this.signals.push({ x: at.x, y: at.y, age: 0, life: 1.4, color, rings: 2, reach: 38 });
            this.glints(at, { x: 0, y: 0 }, color, limit * 8);
          }
        }
        if (b.status === 'running' && !this.ran.has(key)) {
          this.ran.add(key);
          if (!announce) continue;
          // The Observatory announces itself: three slow rings, like a signal going out.
          if (b.kind === 'observatory') this.signals.push({ x: at.x, y: at.y, age: 0, life: 3.2, color: 0xa8d8ff, rings: 3, reach: 150 });
          else this.signals.push({ x: at.x, y: at.y, age: 0, life: 1, color, rings: 1, reach: 22 });
        }
      }
    }
  }

  /** Dust blown by the engine near the ground, and a ring of it when the feet touch down or hit hard. */
  private landingDust(w: WorldState, dt: number, cap: number): void {
    const ship = w.ship;
    const touched = ship.landings > this.landings;
    const hit = w.ship.hull < this.hull && ship.state !== 'landed';
    this.landings = ship.landings;
    if (ship.state === 'crashed' && !hit) return;
    const ground = groundBelow(ship, w.system);
    const side = { x: -ground.up.y, y: ground.up.x };
    const rand = seeded(Math.floor(w.system.time * 30) + 17);
    const spawn = (direction: number, speed: number, size: number): void => {
      const lift = 1 + rand() * 3;
      this.puffs.push({
        x: ground.point.x + side.x * rand() * 3, y: ground.point.y + side.y * rand() * 3,
        vx: side.x * direction * speed + ground.up.x * lift, vy: side.y * direction * speed + ground.up.y * lift,
        size, grow: 5 + rand() * 4, life: 1 + rand() * 0.8, maxLife: 1.8,
      });
    };
    if (touched || hit) {
      const force = hit ? 1.6 : 1;
      for (let i = 0; i < 6; i++) {
        spawn(1, (4 + rand() * 6) * force, 1.2 + rand());
        spawn(-1, (4 + rand() * 6) * force, 1.2 + rand());
      }
    }
    const strength = ship.state === 'flying' ? dustStrength(ground.altitude, ship.thrusting) : 0;
    this.dustClock += dt * strength;
    while (this.dustClock >= 0.04) {
      this.dustClock -= 0.04;
      spawn(rand() < 0.5 ? 1 : -1, 8 + rand() * 10 * strength, 1 + rand() * 1.5);
    }
    if (this.puffs.length > cap) this.puffs = this.puffs.slice(-cap);
  }

  private advancePuffs(dt: number): void {
    for (const p of this.puffs) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= Math.exp(-1.8 * dt);
      p.vy *= Math.exp(-1.8 * dt);
      p.size += p.grow * dt;
      p.life -= dt;
    }
    this.puffs = this.puffs.filter(p => p.life > 0);
  }

  /** Debris thrown out of a rock that has broken. The first break throws more and bigger pieces than the last. */
  private breakUp(id: number, rock: RockRecord, cap: number): void {
    const rand = seeded(id * 31 + rock.stage);
    const colour = RESOURCE_INFO[rock.resource].color;
    const pieces = rock.stage === 0 ? CHUNKS_PER_EVENT : CHUNKS_PER_EVENT - 3;
    for (let i = 0; i < pieces; i++) {
      const angle = (i / pieces) * Math.PI * 2 + rand() * 0.8;
      const speed = (6 + rand() * 14) * (rock.stage === 0 ? 1 : 1.3);
      const glint = i % 3 === 0;
      this.chunks.push({
        x: rock.position.x + Math.cos(angle) * rock.radius * 0.4,
        y: rock.position.y + Math.sin(angle) * rock.radius * 0.4,
        vx: rock.velocity.x + Math.cos(angle) * speed,
        vy: rock.velocity.y + Math.sin(angle) * speed,
        turn: rand() * Math.PI * 2,
        spin: (rand() - 0.5) * 9,
        size: Math.max(0.8, rock.radius * (0.1 + rand() * 0.14)),
        life: 0.8 + rand() * 0.7,
        maxLife: 1.5,
        color: glint ? colour : 0x4d6477,
        glint,
      });
    }
    this.trim(cap);
  }

  /** A few bright specks thrown from where ore is collected. */
  private glints(at: Vec, velocity: Vec, color: number, cap: number): void {
    const rand = seeded(Math.floor(at.x * 7 + at.y * 13));
    for (let i = 0; i < 3; i++) {
      const angle = rand() * Math.PI * 2;
      this.chunks.push({
        x: at.x, y: at.y, vx: velocity.x + Math.cos(angle) * 14, vy: velocity.y + Math.sin(angle) * 14,
        turn: 0, spin: 0, size: 0.7, life: 0.35, maxLife: 0.35, color, glint: true,
      });
    }
    this.trim(cap);
  }

  private trim(cap: number): void {
    if (this.chunks.length > cap) this.chunks = this.chunks.slice(-cap);
  }

  private advanceChunks(dt: number): void {
    for (const c of this.chunks) {
      c.x += c.vx * dt;
      c.y += c.vy * dt;
      c.turn += c.spin * dt;
      c.life -= dt;
    }
    this.chunks = this.chunks.filter(c => c.life > 0);
  }

  /** Flashes alive. Debris is limited separately and does not count here. */
  get count(): number { return this.bursts.length; }

  /** Rings of light alive. */
  get rings(): number { return this.signals.length; }

  /** Pieces of debris alive. */
  get debris(): number { return this.chunks.length; }

  /** Puffs of dust alive. */
  get dust(): number { return this.puffs.length; }

  draw(g: Phaser.GameObjects.Graphics, zoom: number): void {
    const px = 1 / zoom;
    for (const b of this.bursts) {
      const age = BURST_LIFE - b.life;
      const alpha = Math.min(1, b.life * 2.2);
      g.lineStyle(1.2 * px, b.color, alpha);
      g.strokeCircle(b.position.x, b.position.y, (3 + age * 34 * b.size) * px);
      g.fillStyle(b.color, alpha * 0.18);
      g.fillCircle(b.position.x, b.position.y, (2 + age * 26 * b.size) * px);
    }
    for (const sig of this.signals) {
      for (let i = 0; i < sig.rings; i++) {
        const t = (sig.age - i * (sig.life * 0.22)) / (sig.life * 0.7);
        if (t <= 0 || t >= 1) continue;
        g.lineStyle(1.6 * px, sig.color, (1 - t) * 0.85);
        g.strokeCircle(sig.x, sig.y, 3 + t * sig.reach);
      }
    }
    for (const p of this.puffs) {
      const fade = Math.min(1, p.life / p.maxLife);
      g.fillStyle(0xb9a58f, fade * 0.28);
      g.fillCircle(p.x, p.y, p.size);
    }
    for (const c of this.chunks) {
      const fade = Math.min(1, c.life / (c.maxLife * 0.4));
      if (c.glint) {
        g.fillStyle(c.color, fade);
        g.fillCircle(c.x, c.y, Math.max(c.size, 1.2 * px));
        g.fillStyle(0xffffff, fade * 0.8);
        g.fillCircle(c.x, c.y, Math.max(c.size * 0.4, 0.5 * px));
      } else {
        const a = c.turn;
        const s = c.size;
        g.fillStyle(c.color, fade);
        g.fillTriangle(
          c.x + Math.cos(a) * s * 1.3, c.y + Math.sin(a) * s * 1.3,
          c.x + Math.cos(a + 2.3) * s, c.y + Math.sin(a + 2.3) * s,
          c.x + Math.cos(a + 4.1) * s * 0.8, c.y + Math.sin(a + 4.1) * s * 0.8,
        );
      }
    }
  }
}
