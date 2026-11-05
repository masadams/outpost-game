import type Phaser from 'phaser';
import type { Asteroid } from '../../sim/bodies';
import { RESOURCE_INFO } from '../../sim/resources';
import { rockShape } from './rockShape';

/** Light comes from the upper left, so every rock is lit the same way whatever its spin. */
const LIGHT = { x: -0.55, y: -0.83 };
const BASE = [0x1b2733, 0x2f4252] as const;

function mix(a: number, b: number, t: number): number {
  const ar = (a >> 16) & 255;
  const ag = (a >> 8) & 255;
  const ab = a & 255;
  const br = (b >> 16) & 255;
  const bg = (b >> 8) & 255;
  const bb = b & 255;
  return ((ar + (br - ar) * t) << 16) | ((ag + (bg - ag) * t) << 8) | (ab + (bb - ab) * t);
}

export interface RockDrawOptions {
  zoom: number;
  /** Seconds of animation time. */
  time: number;
  /** Show craters and glints. Off on reduced graphics. */
  detail: boolean;
  /** The laser is hitting this rock right now. */
  targeted: boolean;
}

export function drawRock(g: Phaser.GameObjects.Graphics, rock: Asteroid, options: RockDrawOptions): void {
  const { zoom, time, detail, targeted } = options;
  const shape = rockShape(rock.id);
  const colour = RESOURCE_INFO[rock.resource].color;
  const turn = rock.id * 0.7 + time * shape.spin;
  const cos = Math.cos(turn);
  const sin = Math.sin(turn);
  const at = (x: number, y: number) => ({ x: rock.position.x + (x * cos - y * sin) * rock.radius, y: rock.position.y + (x * sin + y * cos) * rock.radius });
  const damage = Math.max(0, Math.min(1, 1 - rock.health / rock.maxHealth));
  const heat = targeted ? 0.35 + damage * 0.5 : damage * 0.25;

  const outline = shape.outline.map(([x, y]) => at(x, y));
  // A lit centre, nudged towards the light, makes each triangle a facet with its own shade.
  const centre = { x: rock.position.x + LIGHT.x * rock.radius * 0.18, y: rock.position.y + LIGHT.y * rock.radius * 0.18 };
  for (let i = 0; i < outline.length; i++) {
    const a = outline[i];
    const b = outline[(i + 1) % outline.length];
    const mid = { x: (a.x + b.x) / 2 - rock.position.x, y: (a.y + b.y) / 2 - rock.position.y };
    const length = Math.hypot(mid.x, mid.y) || 1;
    const lit = Math.max(0, (mid.x / length) * LIGHT.x + (mid.y / length) * LIGHT.y);
    g.fillStyle(mix(BASE[0], BASE[1], 0.25 + lit * 0.75));
    g.fillTriangle(centre.x, centre.y, a.x, a.y, b.x, b.y);
  }

  if (detail) {
    g.fillStyle(0x0d151d, 0.28);
    for (const c of shape.craters) {
      const p = at(c.x, c.y);
      g.fillCircle(p.x, p.y, c.r * rock.radius);
    }
  }

  // Heat: the rock warms from the rim in towards the beam as it takes damage.
  if (heat > 0.02) {
    g.fillStyle(0xff8a3d, Math.min(0.45, heat * 0.5));
    g.fillPoints(outline, true);
  }

  g.lineStyle(1.2 / Math.max(zoom, 0.6), mix(colour, 0xffb06a, Math.min(1, heat)), 0.9);
  g.strokePoints(outline, true);

  // Mineral glints in the colour of what the rock holds.
  for (const v of shape.veins) {
    const p = at(v.x, v.y);
    const size = Math.max(v.size * rock.radius, 0.9);
    g.fillStyle(colour, 0.85);
    g.fillPoints([{ x: p.x, y: p.y - size }, { x: p.x + size * 0.8, y: p.y }, { x: p.x, y: p.y + size * 0.9 }, { x: p.x - size * 0.8, y: p.y }], true);
    if (detail) {
      const twinkle = 0.35 + 0.35 * Math.sin(time * 2.2 + v.phase);
      g.fillStyle(0xffffff, Math.max(0, twinkle));
      g.fillCircle(p.x - size * 0.15, p.y - size * 0.25, size * 0.22);
    }
  }

  // Cracks open one by one as the rock takes damage.
  const cracks = Math.ceil(damage * shape.cracks.length - 1e-6);
  if (cracks > 0) {
    g.lineStyle(1.1 / Math.max(zoom, 0.6), 0xffd9a0, 0.4 + damage * 0.5);
    for (let k = 0; k < cracks; k++) {
      const points = shape.cracks[k].map(([x, y]) => at(x, y));
      g.beginPath();
      g.moveTo(rock.position.x, rock.position.y);
      for (const p of points) g.lineTo(p.x, p.y);
      g.strokePath();
    }
  }

  // Progress bar only while the rock is being worked on.
  if (damage > 0.01) {
    const width = rock.radius * 2;
    const y = rock.position.y - rock.radius - 7 / Math.max(zoom, 0.6);
    const left = rock.position.x - rock.radius;
    g.lineStyle(3 / Math.max(zoom, 0.6), 0x0b1620, 0.7);
    g.lineBetween(left, y, left + width, y);
    g.lineStyle(2 / Math.max(zoom, 0.6), mix(0x73f3cf, 0xffb06a, damage), 0.95);
    g.lineBetween(left, y, left + width * (1 - damage), y);
  }
}
