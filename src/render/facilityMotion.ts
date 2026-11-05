import type Phaser from 'phaser';
import type { BuildType } from '../sim/colonyConfig';

type Point = (x: number, y: number) => { x: number; y: number };

const fract = (v: number): number => v - Math.floor(v);

/**
 * Small moving details that show a building is working: smoke, a turning rotor, a sweeping glint, a scan ping.
 * Called every frame for buildings that are running. Cosmetic only; nothing here reads or changes the simulation.
 */
export function facilityMotion(
  g: Phaser.GameObjects.Graphics,
  kind: BuildType,
  p: Point,
  width: number,
  color: number,
  time: number,
  seed: number,
): void {
  if (kind === 'solar') {
    // A bright glint slides across the panels.
    const x = -width + 2 + fract(time * 0.28 + seed) * (width * 2 - 4);
    const a = p(x, 6);
    const b = p(x + 2.4, 16);
    g.lineStyle(1.3, 0xffffff, 0.35);
    g.lineBetween(a.x, a.y, b.x, b.y);
  } else if (kind === 'refinery') {
    // Smoke rises from the chimney, spreading and fading.
    for (let i = 0; i < 3; i++) {
      const t = fract(time * 0.45 + i / 3 + seed);
      const at = p(-width + 3.5 + Math.sin(t * 6 + i) * 1.6, 22 + t * 16);
      g.fillStyle(0xcfd8dc, 0.4 * (1 - t));
      g.fillCircle(at.x, at.y, 1.2 + t * 2.6);
    }
    const glow = p(0, 9);
    g.fillStyle(0xffa45c, 0.35 + 0.15 * Math.sin(time * 7));
    g.fillCircle(glow.x, glow.y, 1.6);
  } else if (kind === 'fuelProcessor') {
    // Rotors turn.
    for (const cx of [-5, 5]) {
      const centre = p(cx, 11);
      for (let k = 0; k < 2; k++) {
        const angle = time * 4 + k * Math.PI;
        const end = p(cx + Math.cos(angle) * 3.6, 11 + Math.sin(angle) * 3.6);
        g.lineStyle(1, color, 0.9);
        g.lineBetween(centre.x, centre.y, end.x, end.y);
      }
    }
  } else if (kind === 'miningRig') {
    // The bit shudders, throwing sparks, with dust at the foot.
    const jitter = Math.sin(time * 38) * 0.7;
    const top = p(jitter, 19);
    const bottom = p(-jitter, -5);
    g.lineStyle(1.4, 0xffffff, 0.45);
    g.lineBetween(top.x, top.y, bottom.x, bottom.y);
    for (let i = 0; i < 3; i++) {
      const t = fract(time * 1.1 + i / 3 + seed);
      const at = p((i - 1) * 3 * (0.6 + t), 1 + t * 7);
      g.fillStyle(0xb89f86, 0.4 * (1 - t));
      g.fillCircle(at.x, at.y, 1 + t * 2);
    }
    const spark = p(Math.sin(time * 31) * 2, -4);
    g.fillStyle(0xffd28a, 0.85);
    g.fillCircle(spark.x, spark.y, 0.8);
  } else if (kind === 'researchLab') {
    const angle = time * 2.6;
    const at = p(3 + Math.cos(angle) * 6, 14 + Math.sin(angle) * 6);
    g.fillStyle(0xe0ecff, 0.9);
    g.fillCircle(at.x, at.y, 0.9);
  } else if (kind === 'observatory') {
    // The dish turns slowly and pings the sky.
    const phase = fract(time * 0.4 + seed);
    const dish = p(4.5, 19);
    g.lineStyle(1, 0xa8d8ff, 0.55 * (1 - phase));
    g.strokeCircle(dish.x, dish.y, 4 + phase * 56);
    const lamp = p(-3, 12);
    g.fillStyle(0xa8d8ff, 0.5 + 0.5 * Math.sin(time * 5));
    g.fillCircle(lamp.x, lamp.y, 1.1);
  } else if (kind === 'battery' || kind === 'service') {
    const lamp = p(0, 12);
    g.fillStyle(color, 0.35 + 0.35 * Math.sin(time * 3 + seed * 6));
    g.fillCircle(lamp.x, lamp.y, 1.8);
  }
}
