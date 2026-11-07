import type Phaser from 'phaser';
import { seeded } from '../sim/random';

export interface Streak { x0: number; y0: number; x1: number; y1: number; head: number; tail: number; alpha: number }

const PERIOD = 9;
const LIFE = 0.9;

/**
 * A faint shooting star across the upper sky, one every few seconds, always the same ones for the same time. Positions are
 * fractions of the screen (0 to 1). Null between streaks. It is decoration only: nothing in the game reads it.
 */
export function streakAt(time: number, seed = 0): Streak | null {
  const cycle = Math.floor(time / PERIOD);
  const age = time - cycle * PERIOD - (seeded(cycle * 31 + seed)() * (PERIOD - LIFE - 0.2) + 0.1);
  if (age < 0 || age > LIFE) return null;
  const rand = seeded(cycle * 977 + seed + 5);
  const x0 = 0.08 + rand() * 0.84;
  const y0 = 0.04 + rand() * 0.28;
  const dir = rand() < 0.5 ? -1 : 1;
  const length = 0.12 + rand() * 0.1;
  const x1 = Math.max(0.03, Math.min(0.97, x0 + dir * length));
  const y1 = y0 + length * (0.35 + rand() * 0.25);
  const t = age / LIFE;
  return { x0, y0, x1, y1, head: Math.min(1, t * 1.15), tail: Math.max(0, t * 1.15 - 0.35), alpha: Math.sin(Math.PI * t) };
}

/** Draws that streak on the screen-space sky layer, scaled by how dark the sky is (0 in daylight, 1 at night or in space). */
export function drawStreak(g: Phaser.GameObjects.Graphics, width: number, height: number, time: number, darkness: number): void {
  if (darkness < 0.2) return;
  const s = streakAt(time);
  if (!s) return;
  const at = (t: number) => ({ x: (s.x0 + (s.x1 - s.x0) * t) * width, y: (s.y0 + (s.y1 - s.y0) * t) * height });
  const a = at(s.tail);
  const b = at(s.head);
  g.lineStyle(1.6, 0xdff4ff, 0.7 * s.alpha * darkness);
  g.lineBetween(a.x, a.y, b.x, b.y);
  g.lineStyle(3.2, 0xbfe8ff, 0.18 * s.alpha * darkness);
  g.lineBetween(a.x, a.y, b.x, b.y);
  g.fillStyle(0xffffff, 0.9 * s.alpha * darkness);
  g.fillCircle(b.x, b.y, 1.6);
}
