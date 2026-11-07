import type Phaser from 'phaser';
import { seeded } from '../sim/random';

/** One soft patch of dust or glow, placed as fractions of the screen (0 to 1). */
export interface SkyCloud { u: number; v: number; radius: number; alpha: number; color: number }
export interface SkyStar { u: number; v: number; bright: boolean; color: number }
export interface SkyBackdrop {
  /** Tilt of the galaxy band across the sky, radians. */
  tilt: number;
  clouds: SkyCloud[];
  stars: SkyStar[];
  /** Far-off galaxies: tiny tilted smudges. */
  galaxies: Array<{ u: number; v: number; length: number; angle: number; color: number }>;
}

const BAND_COLORS = [0x3a4f7a, 0x4a3f78, 0x2f5f78, 0x6a4a6e];
const STAR_COLORS = [0xa9c9dc, 0xd8e6ff, 0xffe9c4, 0xffd0b0];

/**
 * The sky behind everything: a galaxy band, a few glowing clouds, extra stars thick along the band, and a couple of far
 * galaxies. Everything comes from the world seed, so each game has its own sky and the standard layout (seed 0) always
 * has the same one. Decoration only: nothing in the simulation reads it.
 */
export function buildSky(seed: number, quality: 'low' | 'high' = 'high'): SkyBackdrop {
  const rand = seeded(seed * 7919 + 13);
  const tilt = (rand() - 0.5) * 1.1 + (rand() < 0.5 ? 0.35 : -0.35);
  const along = (t: number) => ({ x: 0.5 + Math.cos(tilt) * t, y: 0.5 + Math.sin(tilt) * t });
  const normal = { x: -Math.sin(tilt), y: Math.cos(tilt) };
  const cloudCount = quality === 'low' ? 14 : 44;
  const clouds: SkyCloud[] = [];
  for (let i = 0; i < cloudCount; i++) {
    const p = along((rand() - 0.5) * 1.8);
    const spread = (rand() + rand() + rand() - 1.5) * 0.16;
    clouds.push({
      u: p.x + normal.x * spread,
      v: p.y + normal.y * spread,
      radius: 0.05 + rand() * 0.1,
      alpha: 0.1 + rand() * 0.12,
      color: BAND_COLORS[Math.floor(rand() * BAND_COLORS.length)],
    });
  }
  const stars: SkyStar[] = [];
  const bandStars = quality === 'low' ? 60 : 260;
  for (let i = 0; i < bandStars; i++) {
    const p = along((rand() - 0.5) * 1.9);
    const spread = (rand() + rand() + rand() - 1.5) * 0.14;
    stars.push({
      u: p.x + normal.x * spread,
      v: p.y + normal.y * spread,
      bright: rand() < 0.06,
      color: STAR_COLORS[Math.floor(rand() * STAR_COLORS.length)],
    });
  }
  const galaxies = Array.from({ length: quality === 'low' ? 1 : 3 }, () => ({
    u: 0.08 + rand() * 0.84,
    v: 0.06 + rand() * 0.4,
    length: 0.012 + rand() * 0.016,
    angle: rand() * Math.PI,
    color: BAND_COLORS[Math.floor(rand() * BAND_COLORS.length)],
  }));
  return { tilt, clouds, stars, galaxies };
}

/** Draws the sky onto a screen-space graphics layer. Call once per size or quality change, not every frame. */
export function drawSky(g: Phaser.GameObjects.Graphics, sky: SkyBackdrop, width: number, height: number): void {
  const scale = Math.max(width, height);
  for (const c of sky.clouds) {
    // Soft edges from a few stacked discs.
    const steps = 9;
    for (let layer = steps; layer >= 1; layer--) {
      g.fillStyle(c.color, c.alpha * 0.2);
      g.fillCircle(c.u * width, c.v * height, c.radius * scale * (layer / steps) * 1.4);
    }
  }
  for (const s of sky.stars) {
    g.fillStyle(s.color, s.bright ? 0.85 : 0.45);
    g.fillRect(s.u * width, s.v * height, s.bright ? 2 : 1, s.bright ? 2 : 1);
  }
  for (const gal of sky.galaxies) {
    const dx = Math.cos(gal.angle) * gal.length * scale;
    const dy = Math.sin(gal.angle) * gal.length * scale;
    const x = gal.u * width;
    const y = gal.v * height;
    g.lineStyle(3, gal.color, 0.18);
    g.lineBetween(x - dx, y - dy, x + dx, y + dy);
    g.lineStyle(1, 0xdfe8ff, 0.45);
    g.lineBetween(x - dx * 0.4, y - dy * 0.4, x + dx * 0.4, y + dy * 0.4);
  }
}
