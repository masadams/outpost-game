import { HABITATS, isHabitat } from './habitatConfig';
import { RIG } from './geology';
import { REFINERY_RECIPES, FUEL_RECIPE } from './colonyConfig';
import type { Building, Colony } from './colony';
export const powerFraction = (b: Building): number => (b.dispatch?.limit ?? 100) / 100;
export function orderedBuildings(c: Colony): Building[] {
  const indexed = c.buildings.map((b, index) => ({ b, rank: b.dispatch?.rank ?? index }));
  return indexed.sort((a, b) => a.rank - b.rank || a.b.id - b.b.id).map(v => v.b);
}
export function ratedPower(b: Building): number {
  return b.kind === 'solar' ? 8 : b.kind === 'miningRig' ? RIG.power : b.kind === 'refinery' ? REFINERY_RECIPES[b.recipe].power : b.kind === 'fuelProcessor' ? FUEL_RECIPE.power : isHabitat(b.kind) ? HABITATS[b.kind].power : 0;
}
