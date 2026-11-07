import { planetAt, BODY_IDS, type BodyId } from './celestial';
import { bodyKnown } from './explorationConfig';
import { colonyWorld } from './localWorld';
import { notify } from './messages';
import { inventoryMass, RESOURCES, emptyInventory, type Inventory } from './resources';
import { streamFor } from './seed';
import type { WorldState } from './world';

/** A cargo pod on its slow way from one world's depot to another's. Ore leaves the source when it launches. */
export interface Pod {
  id: number;
  from: BodyId;
  to: BodyId;
  cargo: Inventory;
  /** World seconds at launch and at arrival. */
  launched: number;
  arrives: number;
  /** Set when the trip will fail: the pod is lost on arrival day, not announced beforehand. */
  doomed: boolean;
}

export const POD = {
  /** Most ore one pod carries, kg. */
  capacity: 40,
  /** Metres per second over the hop. */
  speed: 45,
  /** Fuel (kg) a launch uses at the source, plus a little per kg carried. */
  fuel: 8,
  fuelPerKg: 0.05,
  /** Chance a pod is lost, from the world's seed (never on the standard layout, which stays predictable). */
  lossChance: 0.08,
  /** Pods in flight at once. */
  max: 4,
} as const;

export type PodAction = { type: 'sendPod'; from: BodyId; to: BodyId };
export const isPodAction = (a: { type: string }): a is PodAction => a.type === 'sendPod';

/** Why a pod cannot be sent from one world to another now, or null. */
export function podError(w: WorldState, from: BodyId, to: BodyId): string | null {
  const root = w.rootWorld ?? w;
  if (from === to) return 'Pick another world to send it to.';
  if (!BODY_IDS.includes(from) || !BODY_IDS.includes(to)) return 'Unknown world.';
  if (!bodyKnown(root.exploration, from) || !bodyKnown(root.exploration, to)) return 'You have not found both worlds.';
  const source = colonyWorld(root, from);
  const working = source.colony.buildings.some(b => (b.kind === 'miningRig' || b.kind === 'refinery') && b.health !== 0);
  if (!working) return 'Needs a mining rig or refinery at the sending base.';
  if (root.exploration.pods.length >= POD.max) return 'All pods are still out.';
  if (inventoryMass(source.depot) < 1) return 'No ore in the depot there.';
  const fuel = POD.fuel + POD.fuelPerKg * Math.min(POD.capacity, inventoryMass(source.depot));
  if (source.colony.products.fuel + 1e-9 < fuel) return `Needs ${Math.ceil(fuel - source.colony.products.fuel)} more fuel at the sending base.`;
  return null;
}

/** Load the biggest share of the depot a pod can take, pay its fuel, and send it. */
export function sendPod(w: WorldState, from: BodyId, to: BodyId): void {
  const root = w.rootWorld ?? w;
  const error = podError(root, from, to);
  if (error) {
    notify(root, error);
    return;
  }
  const source = colonyWorld(root, from);
  const cargo = emptyInventory();
  let room = POD.capacity;
  for (const r of RESOURCES) {
    const take = Math.min(source.depot[r], room);
    cargo[r] = take;
    source.depot[r] -= take;
    room -= take;
  }
  const mass = inventoryMass(cargo);
  source.colony.products.fuel -= POD.fuel + POD.fuelPerKg * mass;
  const a = planetAt(from, root.system).position;
  const b = planetAt(to, root.system).position;
  const seconds = Math.max(20, Math.hypot(b.x - a.x, b.y - a.y) / POD.speed);
  const doomed = root.seed !== 0 && streamFor(root.seed, `pod/${root.nextId}`)() < POD.lossChance;
  root.exploration.pods.push({ id: root.nextId++, from, to, cargo, launched: root.system.time, arrives: root.system.time + seconds, doomed });
  notify(root, `POD SENT · ${mass.toFixed(0)} KG · ARRIVES IN ${Math.round(seconds)} S`);
}

/** Moves every pod on; a pod that has arrived puts its ore in the destination depot (as much as fits) or is lost. */
export function stepPods(w: WorldState): void {
  const ex = w.exploration;
  if (ex.pods.length === 0) return;
  const keep: Pod[] = [];
  for (const pod of ex.pods) {
    if (w.system.time < pod.arrives) {
      keep.push(pod);
      continue;
    }
    if (pod.doomed) {
      notify(w, 'A cargo pod was lost on the way.');
      continue;
    }
    const target = colonyWorld(w, pod.to);
    let lost = 0;
    for (const r of RESOURCES) {
      const room = Math.max(0, 400 - inventoryMass(target.depot));
      const put = Math.min(pod.cargo[r], room);
      target.depot[r] += put;
      lost += pod.cargo[r] - put;
    }
    notify(w, lost > 0.5 ? `POD ARRIVED · ${lost.toFixed(0)} KG DID NOT FIT` : 'POD ARRIVED');
  }
  ex.pods = keep;
}
