import type Phaser from 'phaser';
import type { Beam } from '../../sim/mining';
import type { Vec } from '../../sim/math';
import { seeded } from './random';

export interface Spark {
  /** Where the spark starts, relative to the impact point. */
  from: Vec;
  /** Where it has reached, relative to the impact point. */
  to: Vec;
  /** 0 to 1, how bright it still is. */
  life: number;
}

/**
 * Sparks thrown back from the impact point, towards the ship and to either side of the beam.
 * `tick` changes a few times a second so the shower flickers; the same tick always gives the same sparks.
 */
export function sparkShower(tick: number, beamDirection: Vec, count: number, scale: number): Spark[] {
  const rand = seeded(tick);
  const back = { x: -beamDirection.x, y: -beamDirection.y };
  const base = Math.atan2(back.y, back.x);
  return Array.from({ length: count }, () => {
    const angle = base + (rand() - 0.5) * 2.1;
    const speed = (0.5 + rand() * 0.9) * scale;
    const age = rand();
    const direction = { x: Math.cos(angle), y: Math.sin(angle) };
    const start = speed * age * 0.5;
    const end = speed * (age * 0.5 + 0.45);
    return {
      from: { x: direction.x * start, y: direction.y * start },
      to: { x: direction.x * end, y: direction.y * end },
      life: 1 - age,
    };
  });
}

export interface LaserOptions {
  zoom: number;
  /** Seconds of animation time. */
  time: number;
  /** False when paused or reduced motion is on: steady beam, a few fixed sparks. */
  animate: boolean;
  hitting: boolean;
}

/** Glow, core, travelling pulses, and a spark shower where the beam lands. */
export function drawLaser(g: Phaser.GameObjects.Graphics, beam: Beam, options: LaserOptions): void {
  const { zoom, time, animate, hitting } = options;
  const { start, end } = beam;
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.hypot(dx, dy) || 1;
  const direction = { x: dx / length, y: dy / length };
  const flicker = animate ? 0.88 + 0.12 * Math.sin(time * 55) : 1;
  const px = 1 / zoom;

  g.lineStyle(11 * px, 0xff8a3d, 0.08 * flicker);
  g.lineBetween(start.x, start.y, end.x, end.y);
  g.lineStyle(6 * px, 0xffb05f, 0.2 * flicker);
  g.lineBetween(start.x, start.y, end.x, end.y);
  g.lineStyle((hitting ? 2.2 : 1.4) * px, hitting ? 0xfff3d8 : 0xe3c08a, 0.95 * flicker);
  g.lineBetween(start.x, start.y, end.x, end.y);

  // Bright pulses running out along the beam.
  if (animate) {
    g.fillStyle(0xffffff, 0.85);
    for (let i = 0; i < 3; i++) {
      const t = (time * 1.6 + i / 3) % 1;
      g.fillCircle(start.x + dx * t, start.y + dy * t, 1.8 * px);
    }
  }

  // Muzzle glow.
  g.fillStyle(0xffd9a0, 0.5 * flicker);
  g.fillCircle(start.x, start.y, 4 * px);

  if (!hitting) {
    // Open space: the beam just fades out.
    g.lineStyle(1 * px, 0xe3c08a, 0.3);
    g.strokeCircle(end.x, end.y, 5 * px);
    return;
  }

  g.fillStyle(0xff7a2e, 0.28 * flicker);
  g.fillCircle(end.x, end.y, 9 * px);
  g.fillStyle(0xffd28a, 0.6 * flicker);
  g.fillCircle(end.x, end.y, 5 * px);
  g.fillStyle(0xffffff, 0.95);
  g.fillCircle(end.x, end.y, 2.4 * px);

  const tick = animate ? Math.floor(time * 18) : 0;
  for (const spark of sparkShower(tick, direction, animate ? 9 : 4, 26 * px)) {
    g.lineStyle(1.2 * px, spark.life > 0.5 ? 0xfff0c8 : 0xffa24d, spark.life);
    g.lineBetween(end.x + spark.from.x, end.y + spark.from.y, end.x + spark.to.x, end.y + spark.to.y);
  }
}
