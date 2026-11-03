import { colonyPlanet } from '../sim/localWorld';
import { createSurfaceDeposits, rigDeposit } from '../sim/geology';
import type { WorldState } from '../sim/world';
export function validGeology(world: WorldState): boolean {
  const deposits = world.surfaceDeposits, expected = createSurfaceDeposits(colonyPlanet(world).radius);
  if (!Array.isArray(deposits) || deposits.length !== expected.length) return false;
  const seen = new Set<number>();
  for (const d of deposits) {
    if (d === null || typeof d !== 'object') return false;
    const source = expected.find(v => v.id === d.id);
    if (!source || seen.has(d.id) || d.resource !== source.resource || d.angle !== source.angle || d.halfWidth !== source.halfWidth || d.initial !== source.initial || !Number.isFinite(d.remaining) || d.remaining < 0 || d.remaining > d.initial) return false;
    seen.add(d.id);
  }
  return world.colony.buildings.every(b => b.kind === 'miningRig' ? Number.isInteger(b.depositId) && !!rigDeposit(deposits, b, colonyPlanet(world).radius) : b.depositId === undefined);
}
