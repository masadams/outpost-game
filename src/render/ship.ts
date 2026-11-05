import type Phaser from 'phaser';
import type { Ship } from '../sim/physics';
import { heading } from '../sim/math';

/**
 * The lander, drawn in metres in ship space: +y is the nose, x is to the right.
 * It spans about 14 m from the foot pads (y = -7) to the nose (y = 6.8) and 12 m across the feet,
 * which is the physical envelope the collision and landing rules use.
 * Only the explicit distant glyph uses screen size.
 */
const PALETTE = {
  intact: { line: 0xabe7e5, cabin: 0x35566e, cabinLight: 0x4a7189, stage: 0x213b50, stageDark: 0x172c3d, leg: 0xcddadb, glass: 0x0b1b28, accent: 0x5fe0d0 },
  wrecked: { line: 0xe69b88, cabin: 0x5a3f45, cabinLight: 0x6e4c52, stage: 0x43302f, stageDark: 0x2f2222, leg: 0x936a64, glass: 0x1d1416, accent: 0xa5675b },
} as const;

type Point = { x: number; y: number };

export function drawShip(g: Phaser.GameObjects.Graphics, s: Ship, zoom: number, time: number, paused: boolean, reduced: boolean): void {
  const n = heading(s.angle);
  const right = { x: -n.y, y: n.x };
  const p = (x: number, y: number): Point => ({ x: s.position.x + right.x * x + n.x * y, y: s.position.y + right.y * x + n.y * y });
  const line = (x: number, y: number, a: number, b: number): void => {
    const u = p(x, y);
    const v = p(a, b);
    g.lineBetween(u.x, u.y, v.x, v.y);
  };
  const poly = (points: Array<[number, number]>, fill: number, stroke?: number, width = 0.45): void => {
    const pts = points.map(([x, y]) => p(x, y));
    g.fillStyle(fill);
    g.fillPoints(pts, true);
    if (stroke !== undefined) {
      g.lineStyle(width, stroke);
      g.strokePoints(pts, true);
    }
  };
  const wrecked = s.state === 'crashed';
  const c = wrecked ? PALETTE.wrecked : PALETTE.intact;

  // Far away: a small fixed-size arrow so the ship is never lost.
  if (zoom < 0.45) {
    const a = 8 / zoom;
    g.lineStyle(1.3 / zoom, c.line);
    g.strokePoints([p(0, a), p(a * 0.6, -a * 0.6), p(0, -a * 0.25), p(-a * 0.6, -a * 0.6)], true);
    return;
  }

  // Engine flame is drawn first, so the hull sits in front of it.
  if (s.thrusting && !paused) {
    const flicker = reduced ? 0 : Math.sin(time / 65) * 2;
    const length = 8 + flicker;
    g.fillStyle(0xf3bd79, 0.75);
    g.fillPoints([p(-1.9, -6.1), p(1.9, -6.1), p(0, -6.1 - length)], true);
    g.fillStyle(0xa3f8ff, 0.9);
    g.fillPoints([p(-1.1, -6.1), p(1.1, -6.1), p(0, -6.1 - length * 0.55)], true);
  }

  // Landing legs: splayed struts with a brace and a foot pad each.
  g.lineStyle(0.7, c.leg);
  for (const side of [-1, 1]) {
    line(side * 4.2, -2.6, side * 6.1, -6.9);
    g.lineStyle(0.4, c.leg);
    line(side * 2.6, -4.4, side * 5.1, -5.7);
    g.lineStyle(0.9, c.leg);
    line(side * 5.1, -7, side * 7, -7);
    g.lineStyle(0.7, c.leg);
  }

  // Engine bell.
  poly([[-1.5, -4.6], [1.5, -4.6], [2.3, -6.1], [-2.3, -6.1]], c.stageDark, c.line, 0.35);

  // Descent stage: the wide lower body, with a lit right half and a stripe.
  poly([[-4.6, -0.7], [4.6, -0.7], [5.1, -3.1], [4.2, -4.8], [-4.2, -4.8], [-5.1, -3.1]], c.stage, c.line, 0.5);
  poly([[0, -0.7], [4.6, -0.7], [5.1, -3.1], [4.2, -4.8], [0, -4.8]], c.stageDark);
  g.lineStyle(0.45, c.accent);
  line(-4.8, -2.4, 4.8, -2.4);
  g.lineStyle(0.3, c.line, 0.6);
  line(-2.2, -0.7, -2.2, -4.8);
  line(2.2, -0.7, 2.2, -4.8);

  // Ascent cabin on top.
  poly([[0, 6.8], [2.4, 5.3], [3.3, 2.6], [3, -0.7], [-3, -0.7], [-3.3, 2.6], [-2.4, 5.3]], c.cabin, c.line, 0.5);
  poly([[0, 6.8], [2.4, 5.3], [3.3, 2.6], [3, -0.7], [0, -0.7]], c.cabinLight);
  g.lineStyle(0.5, c.line);
  g.strokePoints([p(0, 6.8), p(2.4, 5.3), p(3.3, 2.6), p(3, -0.7), p(-3, -0.7), p(-3.3, 2.6), p(-2.4, 5.3)], true);

  // Window with a glint, and thruster blocks on the cabin sides.
  poly([[-1.3, 4.3], [1.3, 4.3], [1.7, 2.6], [1, 1.4], [-1, 1.4], [-1.7, 2.6]], c.glass, c.accent, 0.35);
  g.lineStyle(0.35, 0xdffcf9, 0.8);
  line(-0.7, 3.8, 0.1, 3.8);
  poly([[3.3, 1.7], [4.3, 1.4], [4.3, 0.2], [3.2, 0.2]], c.stageDark, c.line, 0.3);
  poly([[-3.3, 1.7], [-4.3, 1.4], [-4.3, 0.2], [-3.2, 0.2]], c.stageDark, c.line, 0.3);

  // Damage.
  if (s.hull < 75) {
    g.lineStyle(0.5, 0xe39c78);
    line(1, 0, 3, -2);
    if (s.hull < 40) line(-3, 1, -1, -3);
  }

  // Spin jets.
  if (!reduced && !paused && Math.abs(s.angularVelocity) > 0.1) {
    g.lineStyle(0.6, 0xa3f8ff, 0.6);
    const side = Math.sign(s.angularVelocity);
    line(side * 4.4, 0.8, side * 7.4, 0.8);
  }
}
