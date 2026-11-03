import { BLUEPRINTS, type BuildType } from './colonyConfig';
import { HABITAT, HABITATS, isHabitat } from './habitatConfig';
import { WORLD } from './config';
import { wrap } from './math';
/** Roofs overlay the colony; only their two physical footings exclude other foundations. */
export function foundationSites(kind: BuildType, angle: number): { angle: number; halfWidth: number }[] {
  return isHabitat(kind) ? [-1, 1].map(side => ({ angle: wrap(angle + side * HABITATS[kind].halfSpan / WORLD.radius), halfWidth: HABITAT.foundationHalfWidth })) :
    [{ angle, halfWidth: BLUEPRINTS[kind].halfWidth }];
}
