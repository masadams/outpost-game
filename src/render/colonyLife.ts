import type Phaser from 'phaser';
import { WORLD } from '../sim/config';
import { heading, wrap } from '../sim/math';

/**
 * Small signs of life around a base: carts hauling between the pad and the working machines, and lamp posts
 * along the ground between buildings that glow after dark. Cosmetic only: nothing here reads more than the
 * view below, and nothing changes the simulation.
 */
export interface LifeView {
  /** Radius of the world the base stands on (m). */
  radius: number;
  /** Buildings as angles around the world, with whether each is a machine that is working right now. */
  buildings: ReadonlyArray<{ angle: number; hauls: boolean; lit: boolean }>;
  /** 0 in full daylight, 1 in full dark, at the base. */
  dark: number;
  /** Whether the base has any stored or incoming power for its lamps. */
  powered: boolean;
}

/** Kinds that take ore in or send material out, so a cart runs to them. */
export const HAUL_KINDS: readonly string[] = ['refinery', 'miningRig', 'fuelProcessor', 'storage', 'workshop', 'researchLab'];

const MAX_CARTS = 6;
const CART_SPEED = 9; // m/s along the ground
const LAMP_SPACING = 42; // m between lamp posts
const LAMP_REACH = 260; // only light gaps shorter than this
const MAX_LAMPS = 40;

const fract = (v: number): number => v - Math.floor(v);

/** Where a cart is on its run, as a share 0..1 from the pad to the building and back. */
export function cartShare(time: number, metres: number, seed: number): number {
  const trip = Math.max(8, (2 * metres) / CART_SPEED);
  const t = fract(time / trip + seed);
  return t < 0.5 ? t * 2 : (1 - t) * 2;
}

/** Angles of the lamp posts between neighbouring buildings (and the pad), evenly spaced. */
export function lampAngles(view: LifeView): number[] {
  const stops = [WORLD.padAngle, ...view.buildings.map(b => b.angle)].map(a => wrap(a)).sort((a, b) => a - b);
  const out: number[] = [];
  for (let i = 0; i + 1 < stops.length && out.length < MAX_LAMPS; i++) {
    const gap = (stops[i + 1] - stops[i]) * view.radius;
    if (gap < LAMP_SPACING * 1.5 || gap > LAMP_REACH) continue;
    const posts = Math.floor(gap / LAMP_SPACING);
    for (let k = 1; k <= posts && out.length < MAX_LAMPS; k++) {
      const angle = stops[i] + ((stops[i + 1] - stops[i]) * k) / (posts + 1);
      // Nothing stands on the landing pad.
      if (Math.abs(wrap(angle - WORLD.padAngle)) * view.radius > WORLD.padHalfWidth + 8) out.push(angle);
    }
  }
  return out;
}

/** Draws in the world's own frame (origin at its centre, turned with its spin). */
export function drawColonyLife(g: Phaser.GameObjects.Graphics, view: LifeView, time: number, animate: boolean): void {
  if (view.buildings.length === 0) return;
  const at = (angle: number, height: number, along = 0) => {
    const n = heading(angle);
    return { x: n.x * (view.radius + height) - n.y * along, y: n.y * (view.radius + height) + n.x * along };
  };

  // Lamp posts: thin and dim by day, glowing after dark while the base has power.
  const glow = view.powered ? Math.max(0, (view.dark - 0.2) / 0.8) : 0;
  for (const angle of lampAngles(view)) {
    const foot = at(angle, 0);
    const top = at(angle, 7);
    g.lineStyle(1, 0x8ea6b8, 0.55);
    g.lineBetween(foot.x, foot.y, top.x, top.y);
    g.fillStyle(glow > 0 ? 0xffe6b0 : 0x8ea6b8, glow > 0 ? 0.95 : 0.5);
    g.fillCircle(top.x, top.y, 1.1);
    if (glow > 0) {
      g.fillStyle(0xffe6b0, 0.1 * glow);
      g.fillCircle(top.x, top.y, 9);
      // A pool of light on the ground under the lamp.
      g.fillStyle(0xffe6b0, 0.06 * glow);
      g.fillEllipse(foot.x, foot.y, 26, 7);
    }
  }

  if (!animate) return;
  // Carts: one per working machine, running between it and the pad.
  let carts = 0;
  for (const b of view.buildings) {
    if (!b.hauls || carts >= MAX_CARTS) continue;
    const span = wrap(b.angle - WORLD.padAngle);
    const metres = Math.abs(span) * view.radius;
    if (metres < 20) continue;
    carts++;
    const seed = fract(Math.abs(b.angle) * 53.7);
    const share = cartShare(time, metres, seed);
    const angle = WORLD.padAngle + span * share;
    const outbound = fract(time / Math.max(8, (2 * metres) / CART_SPEED) + seed) < 0.5;
    const facing = (outbound ? 1 : -1) * Math.sign(span || 1);
    const body = [at(angle, 1.2, -3), at(angle, 3.6, -3), at(angle, 3.6, 2), at(angle, 2.6, 3), at(angle, 1.2, 3)];
    g.fillStyle(0x2c4a5e, 1);
    g.fillPoints(body as Phaser.Geom.Point[], true);
    g.lineStyle(0.8, 0x9fd7ff, 0.9);
    g.strokePoints(body as Phaser.Geom.Point[], true);
    // A loaded cart carries ore toward the pad's depot and comes back empty.
    if (!outbound) {
      const load = at(angle, 4.4, -0.5);
      g.fillStyle(0xd99b5c, 0.95);
      g.fillCircle(load.x, load.y, 1.3);
    }
    for (const x of [-2, 2]) {
      const wheel = at(angle, 0.8, x);
      g.fillStyle(0x0c1a2b, 1);
      g.fillCircle(wheel.x, wheel.y, 1);
    }
    if (view.dark > 0.3) {
      const lamp = at(angle, 2.6, 3.4 * facing);
      g.fillStyle(0xfff2c4, 0.9);
      g.fillCircle(lamp.x, lamp.y, 0.9);
      const beam = at(angle, 1.4, 9 * facing);
      g.fillStyle(0xfff2c4, 0.1 * view.dark);
      g.fillEllipse(beam.x, beam.y, 12, 5);
    }
  }
}
