import { nearestPlanet, planetAt, relative, surfacePosition, type BodyId, type Planet } from './celestial';
import type { WorldState } from './world';
/** Typed local inventory view. All actor/scalar writes still go to the same continuous world. */
const views = new WeakMap<WorldState, WorldState>();
export function colonyWorld(w: WorldState, id: BodyId): WorldState {
  const root = w.rootWorld ?? w;
  if (id === 'home') return root;
  let view = views.get(root);
  if (!view) {
    const fields = ['colony', 'depot', 'surfaceDeposits'] as const;
    view = new Proxy(root, {
      get(target, key) {
        if (key === 'rootWorld') return root;
        if (key === 'siteBody') return 'moon';
        if (fields.includes(key as typeof fields[number])) return Reflect.get(target.moon, key);
        return Reflect.get(target, key);
      },
      set(target, key, value) { return fields.includes(key as typeof fields[number]) ? Reflect.set(target.moon, key, value) : Reflect.set(target, key, value); },
    }); views.set(root, view);
  }
  return view;
}
export const colonyPlanet = (w: WorldState): Planet => planetAt(w.siteBody ?? 'home', w.system);
export const localPosition = (w: WorldState, p: { x: number; y: number }) => relative(p, colonyPlanet(w));
export const localAngleAt = (w: WorldState, p: { x: number; y: number }) => Math.atan2(localPosition(w, p).x, -localPosition(w, p).y);
export const sitePosition = (w: WorldState, angle: number, height = 2.5) => surfacePosition(colonyPlanet(w), angle, height);
export const activeWorld = (w: WorldState): WorldState => colonyWorld(w, nearestPlanet(w.playerMode === 'ship' ? w.ship.position : w.astronaut.position, w.system).id);
export const allColonies = (w: WorldState): WorldState[] => [colonyWorld(w, 'home'), colonyWorld(w, 'moon')];
/** IDs stay unambiguous for shared threat control and render selection, even after many rebuilds. */
export function allocateBuildingId(w: WorldState): number {
  while (allColonies(w).some(site => site.colony.buildings.some(b => b.id === w.colony.nextId))) w.colony.nextId++;
  return w.colony.nextId++;
}
