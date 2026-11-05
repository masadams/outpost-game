import { seeded } from './random';

/** A rock's look, in unit radius. Pure and deterministic from the rock's id. */
export interface RockShape {
  /** Outline points, unit radius, going round the rock. */
  outline: Array<[number, number]>;
  /** Mineral glints: position (unit radius), size (fraction of radius), and a phase for twinkling. */
  veins: Array<{ x: number; y: number; size: number; phase: number }>;
  /** Shallow craters: position and radius, fractions of the rock's radius. */
  craters: Array<{ x: number; y: number; r: number }>;
  /** Cracks that appear with damage, in the order they appear: a zigzag from near the centre to the rim. */
  cracks: Array<Array<[number, number]>>;
  /** Radians per second of cosmetic spin. */
  spin: number;
}

const cache = new Map<number, RockShape>();

export function rockShape(id: number): RockShape {
  const known = cache.get(id);
  if (known) return known;
  const rand = seeded(id);
  const count = 10 + Math.floor(rand() * 4);
  // Smoothed radial noise so neighbouring points relate: lumpy rather than spiky.
  const noise = Array.from({ length: count }, () => 0.72 + rand() * 0.34);
  const outline = noise.map((_, i) => {
    const r = (noise[(i + count - 1) % count] + noise[i] * 2 + noise[(i + 1) % count]) / 4;
    const angle = (i / count) * Math.PI * 2 + (rand() - 0.5) * 0.18;
    return [Math.cos(angle) * r, Math.sin(angle) * r] as [number, number];
  });
  const veins = Array.from({ length: 3 + Math.floor(rand() * 3) }, () => {
    const angle = rand() * Math.PI * 2;
    const distance = 0.2 + rand() * 0.45;
    return { x: Math.cos(angle) * distance, y: Math.sin(angle) * distance, size: 0.1 + rand() * 0.1, phase: rand() * Math.PI * 2 };
  });
  const craters = Array.from({ length: 2 }, () => {
    const angle = rand() * Math.PI * 2;
    const distance = 0.15 + rand() * 0.4;
    return { x: Math.cos(angle) * distance, y: Math.sin(angle) * distance, r: 0.12 + rand() * 0.14 };
  });
  const cracks = Array.from({ length: 5 }, () => {
    const angle = rand() * Math.PI * 2;
    const points: Array<[number, number]> = [];
    for (let step = 0; step < 4; step++) {
      const reach = 0.1 + step * 0.27;
      const wobble = (rand() - 0.5) * 0.35;
      points.push([Math.cos(angle + wobble) * reach, Math.sin(angle + wobble) * reach]);
    }
    return points;
  });
  const spin = (rand() - 0.5) * 0.35;
  const shape = { outline, veins, craters, cracks, spin };
  if (cache.size > 400) cache.clear();
  cache.set(id, shape);
  return shape;
}
