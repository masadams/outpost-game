import type Phaser from 'phaser';
import { BODIES, nearestPlanet, relative, type Planet } from '../sim/celestial';
import { seasOf } from '../sim/nature';
import { SEA_WALL_REACH, weatherOn } from '../sim/weather';
import { colonyWorld } from '../sim/localWorld';
import { wrap } from '../sim/math';
import type { WorldState } from '../sim/world';

/** High water on Tide: a lighter band of water climbing past each sea's edge, its line shimmering. */
export function drawTide(g: Phaser.GameObjects.Graphics, body: Planet, world: WorldState, seconds: number): void {
  const now = weatherOn(world, body.id);
  if (!now || now.spec.kind !== 'tide' || now.strength <= 0) return;
  const climb = (now.spec.reach * now.strength) / body.radius;
  const walls = colonyWorld(world, 'tide').colony.buildings.filter(b => b.kind === 'seaWall' && (b.health ?? 100) > 0);
  const guard = SEA_WALL_REACH / body.radius;
  const dry = (angle: number) => walls.some(w => Math.abs(wrap(w.angle - angle)) <= guard);
  g.save();
  g.translateCanvas(body.position.x, body.position.y);
  g.rotateCanvas(body.spin);
  for (const sea of seasOf(body.id, world.seed ?? 0)) {
    for (const side of [-1, 1]) {
      // A wall on this shore holds the water back.
      if (dry(sea.angle + side * (sea.half + climb / 2))) continue;
      const edge = sea.angle + side * sea.half - Math.PI / 2;
      const from = side < 0 ? edge - climb : edge;
      const to = side < 0 ? edge : edge + climb;
      g.lineStyle(9, 0x3f8fd0, 0.75);
      g.beginPath();
      g.arc(0, 0, body.radius - 4, from, to);
      g.strokePath();
      const shimmer = 0.55 + 0.35 * Math.sin(seconds * 3 + sea.angle * 7 + side);
      g.lineStyle(1.5, 0xbfe6ff, shimmer);
      g.beginPath();
      g.arc(0, 0, body.radius - 0.5, from, to);
      g.strokePath();
    }
  }
  g.restore();
}

const HAZE = { dust: { colour: 0xc8743a, alpha: 0.32, grain: 0xf0b07a }, ash: { colour: 0x5c5a5a, alpha: 0.3, grain: 0xd0cccc } };

/**
 * Dust or ash over the screen when the pilot is down in it: a tint that thickens near the ground, and grains
 * blowing sideways (dust) or drifting down (ash).
 */
export function drawHaze(
  g: Phaser.GameObjects.Graphics, width: number, height: number, world: WorldState, seconds: number, motion: boolean,
): void {
  g.clear();
  const root = world.rootWorld ?? world;
  const at = root.playerMode === 'astronaut' ? root.astronaut.position : root.ship.position;
  const planet = nearestPlanet(at, root.system);
  const now = weatherOn(root, planet.id);
  if (!now || now.strength <= 0 || now.spec.kind === 'tide') return;
  const offset = relative(at, planet);
  const height01 = Math.max(0, Math.hypot(offset.x, offset.y) - planet.radius) / Math.max(400, BODIES[planet.id].atmosphere || 600);
  const depth = now.strength * Math.max(0, 1 - height01);
  if (depth <= 0.01) return;
  const look = HAZE[now.spec.kind];
  g.fillStyle(look.colour, look.alpha * depth);
  g.fillRect(0, 0, width, height);
  if (!motion) return;
  const count = Math.round(90 * depth);
  g.fillStyle(look.grain, 0.5 * depth);
  for (let i = 0; i < count; i++) {
    // Fixed scattered lanes; each grain loops across the screen at its own speed.
    const lane = (i * 0.6180339) % 1;
    const speed = 0.25 + ((i * 0.37) % 1) * 0.5;
    if (now.spec.kind === 'dust') {
      const x = (((seconds * speed * 0.9 + lane * 3.1) % 1) + 1) % 1;
      const y = (lane + 0.04 * Math.sin(seconds * 2 + i)) % 1;
      g.fillRect(x * width, y * height, 6, 1.4);
    } else {
      const y = (((seconds * speed * 0.12 + lane * 2.3) % 1) + 1) % 1;
      const x = (lane + 0.02 * Math.sin(seconds * 0.8 + i)) % 1;
      g.fillRect(x * width, y * height, 2, 2);
    }
  }
}
