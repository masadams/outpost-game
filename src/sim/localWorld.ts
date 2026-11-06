import { BODY_IDS, nearestPlanet, planetAt, relative, surfaceAngle, surfacePosition, type BodyId, type Planet } from './celestial';
import type { OutpostId, WorldState } from './world';
/** Typed local inventory view. All actor/scalar writes still go to the same continuous world. */
const views = new WeakMap<WorldState, Map<BodyId, WorldState>>();
export function colonyWorld(w: WorldState, id: BodyId): WorldState {
  const root = w.rootWorld ?? w;
  if (id === 'home') return root;
  let byBody = views.get(root);
  if (!byBody) {
    byBody = new Map();
    views.set(root, byBody);
  }
  let view = byBody.get(id);
  if (!view) {
    const fields = ['colony', 'depot', 'surfaceDeposits'] as const;
    const outpost = (target: WorldState) => target.outposts[id as OutpostId];
    view = new Proxy(root, {
      get(target, key) {
        if (key === 'rootWorld') return root;
        if (key === 'siteBody') return id;
        if (fields.includes(key as typeof fields[number])) return Reflect.get(outpost(target), key);
        return Reflect.get(target, key);
      },
      set(target, key, value) {
        return fields.includes(key as typeof fields[number]) ? Reflect.set(outpost(target), key, value) : Reflect.set(target, key, value);
      },
    });
    byBody.set(id, view);
  }
  return view;
}
export const colonyPlanet = (w: WorldState): Planet => planetAt(w.siteBody ?? 'home', w.system);
export const localPosition = (w: WorldState, p: { x: number; y: number }) => relative(p, colonyPlanet(w));
/** Surface angle at a point: fixed to the ground of the colony's planet, turning with it. Buildings and orders use these. */
export const localAngleAt = (w: WorldState, p: { x: number; y: number }) => surfaceAngle(colonyPlanet(w), p);
/** The direction of local up at a point, as a world angle (for attitude, art and the camera). */
export const upAngleAt = (w: WorldState, p: { x: number; y: number }) => Math.atan2(localPosition(w, p).x, -localPosition(w, p).y);
export const sitePosition = (w: WorldState, angle: number, height = 2.5) => surfacePosition(colonyPlanet(w), angle, height);
export const activeWorld = (w: WorldState): WorldState => colonyWorld(w, nearestPlanet(w.playerMode === 'ship' ? w.ship.position : w.astronaut.position, w.system).id);
export const allColonies = (w: WorldState): WorldState[] => BODY_IDS.map(id => colonyWorld(w, id));
/** IDs stay unambiguous for shared threat control and render selection, even after many rebuilds. */
export function allocateBuildingId(w: WorldState): number {
  while (allColonies(w).some(site => site.colony.buildings.some(b => b.id === w.colony.nextId))) w.colony.nextId++;
  return w.colony.nextId++;
}
