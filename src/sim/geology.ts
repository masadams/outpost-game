import { WORLD } from './config';
import { wrap } from './math';
import type { Resource } from './resources';
import type { Building } from './colony';

export interface SurfaceDeposit { id: number; resource: Resource; angle: number; halfWidth: number; initial: number; remaining: number }
export const RIG = { power: 6, seconds: 2, yield: 0.5 } as const;
const SEAMS: readonly [Resource, number, number, number][] = [
  ['iron', 160, 34, 180], ['ice', -180, 40, 120], ['copper', 420, 36, 180],
  ['silicon', 760, 40, 160], ['rareMetals', 1160, 24, 60], ['ice', 2100, 45, 240],
  ['iron', 3200, 48, 360], ['copper', -1700, 40, 300], ['silicon', -3000, 40, 240], ['rareMetals', -4400, 30, 100],
];
export function createSurfaceDeposits(radius: number = WORLD.radius): SurfaceDeposit[] {
  const seams: typeof SEAMS = radius === WORLD.radius ? SEAMS : [['ice', 160, 40, 180], ['iron', -180, 34, 160], ['rareMetals', 420, 32, 90], ['silicon', 760, 36, 120], ['copper', -600, 36, 160]];
  return seams.map(([resource, arc, halfWidth, initial], i) => ({ id: i + 1, resource, angle: arc / radius, halfWidth, initial, remaining: initial }));
}
export const surfaceDistance = (a: number, b: number): number => Math.abs(wrap(a - b)) * WORLD.radius;
export function depositAt(deposits: SurfaceDeposit[], angle: number, footprint = 0, radius: number = WORLD.radius): SurfaceDeposit | undefined {
  return deposits.find(d => Math.abs(wrap(angle - d.angle)) * radius + footprint <= d.halfWidth + 1e-7);
}
export function rigDeposit(deposits: SurfaceDeposit[], building: Building, radius: number = WORLD.radius): SurfaceDeposit | undefined {
  const d = deposits.find(d => d.id === building.depositId);
  return d && Math.abs(wrap(building.angle - d.angle)) * radius + 12 <= d.halfWidth + 1e-7 ? d : undefined;
}
