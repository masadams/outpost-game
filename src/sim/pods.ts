import { BODIES, planetAt, surfaceAngle, surfacePosition, BODY_IDS, type BodyId } from './celestial';
import type { Vec } from './math';
import { bodyKnown } from './explorationConfig';
import { colonyWorld } from './localWorld';
import { notify } from './messages';
import { inventoryMass, RESOURCES, emptyInventory, type Inventory } from './resources';
import { streamFor } from './seed';
import { activeMassDriver, MASS_DRIVER } from './airMachines';
import { capacityFactor } from './facilityStats';
import { oreCapacity } from './colony';
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

/** Where a pod came down, and what became of it. The beacon stays up a while so it can be found. */
export interface PodBeacon {
  id: number;
  body: BodyId;
  from: BodyId;
  kind: 'landed' | 'lost';
  /** Kilograms of ore it carried. */
  kg: number;
  /** Surface angle of the landing site, in the body's own frame. */
  angle: number;
  /** World seconds the beacon keeps showing until. */
  until: number;
}

export const BEACON_SECONDS = { landed: 900, lost: 1800 } as const;

export const POD = {
  /** Most ore one pod carries, kg. */
  capacity: 40,
  /** Metres per second over the hop. */
  speed: 140,
  /** Fuel (kg) a launch uses at the source, plus a little per kg carried. */
  fuel: 8,
  fuelPerKg: 0.05,
  /** Chance a pod is lost, from the world's seed (never on the standard layout, which stays predictable). */
  lossChance: 0.08,
  /** Pods in flight at once. */
  max: 4,
} as const;

const length = (v: Vec): number => Math.hypot(v.x, v.y);
const unit = (v: Vec): Vec => {
  const l = Math.max(1e-9, length(v));
  return { x: v.x / l, y: v.y / l };
};

/** How long a pod takes: it aims for where the far world will be, so the distance depends on the time. */
export function podFlightSeconds(w: WorldState, from: BodyId, to: BodyId): number {
  const start = planetAt(from, w.system).position;
  let seconds = 20;
  for (let i = 0; i < 14; i++) {
    const end = planetAt(to, { ...w.system, time: w.system.time + seconds }).position;
    seconds = Math.max(20, Math.hypot(end.x - start.x, end.y - start.y) / POD.speed);
  }
  return seconds;
}

/** Metres a pod climbs straight up before it turns for the far world, and the same again over the landing site. */
const CLIMB = 700;
const CLIMB_SECONDS = 12;
const DESCENT_SECONDS = 10;

/**
 * The path a pod flies. It leaves the sending world's cargo depot straight up, crosses to a point above the far world's
 * depot where that world will be on arrival, and comes straight down onto it.
 */
export function podLane(w: WorldState, pod: Pod): { from: Vec; up: Vec; over: Vec; to: Vec; landing: { angle: number } } {
  const source = planetAt(pod.from, { ...w.system, time: pod.launched });
  const target = planetAt(pod.to, { ...w.system, time: pod.arrives });
  const out = surfaceAngleOfDepot(source.radius);
  const inn = surfaceAngleOfDepot(target.radius);
  const from = surfacePosition(source, out, 1);
  const to = surfacePosition(target, inn, 1);
  const up = surfacePosition(source, out, CLIMB);
  const over = surfacePosition(target, inn, CLIMB);
  return { from, up, over, to, landing: { angle: inn } };
}

const surfaceAngleOfDepot = (radius: number): number => 54 / radius;

const lerp = (a: Vec, b: Vec, t: number): Vec => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
const smooth = (t: number): number => t * t * (3 - 2 * t);

/** Where a pod is at a time: up from the depot, across, and down onto the far depot. */
export function podPosition(w: WorldState, pod: Pod, time = w.system.time): Vec {
  const lane = podLane(w, pod);
  const total = Math.max(1, pod.arrives - pod.launched);
  const climb = Math.min(CLIMB_SECONDS, total * 0.25);
  const descent = Math.min(DESCENT_SECONDS, total * 0.2);
  const age = Math.max(0, Math.min(total, time - pod.launched));
  if (age <= climb) return lerp(lane.from, lane.up, (age / climb) ** 2);
  if (age >= total - descent) return lerp(lane.over, lane.to, 1 - (1 - (age - (total - descent)) / descent) ** 2);
  return lerp(lane.up, lane.over, smooth((age - climb) / Math.max(1, total - climb - descent)));
}

/** Where a beacon shows in the world now (its body turns and moves). */
export function beaconPosition(w: WorldState, beacon: PodBeacon): Vec {
  return surfacePosition(planetAt(beacon.body, w.system), beacon.angle, 2);
}

export type PodAction = { type: 'sendPod'; from: BodyId; to: BodyId };
export const isPodAction = (a: { type: string }): a is PodAction => a.type === 'sendPod';

/** What a pod from this base can carry and costs to launch: better with a running mass driver. */
export function podTerms(source: WorldState): { capacity: number; fuel: number; fuelPerKg: number } {
  const driver = activeMassDriver(source);
  if (!driver) return { capacity: POD.capacity, fuel: POD.fuel, fuelPerKg: POD.fuelPerKg };
  return {
    capacity: MASS_DRIVER.capacity * capacityFactor(driver),
    fuel: POD.fuel * MASS_DRIVER.fuelShare,
    fuelPerKg: POD.fuelPerKg * MASS_DRIVER.fuelShare,
  };
}

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
  const terms = podTerms(source);
  const fuel = terms.fuel + terms.fuelPerKg * Math.min(terms.capacity, inventoryMass(source.depot));
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
  const terms = podTerms(source);
  let room = terms.capacity;
  for (const r of RESOURCES) {
    const take = Math.min(source.depot[r], room);
    cargo[r] = take;
    source.depot[r] -= take;
    room -= take;
  }
  const mass = inventoryMass(cargo);
  source.colony.products.fuel -= terms.fuel + terms.fuelPerKg * mass;
  const seconds = podFlightSeconds(root, from, to);
  const doomed = root.seed !== 0 && streamFor(root.seed, `pod/${root.nextId}`)() < POD.lossChance * (root.colony.research.completed.includes('podLogistics') ? 0.5 : 1);
  root.exploration.pods.push({ id: root.nextId++, from, to, cargo, launched: root.system.time, arrives: root.system.time + seconds, doomed });
  notify(root, `POD LAUNCHED FOR ${BODIES[to].label.toUpperCase()} · ${mass.toFixed(0)} KG · LANDS IN ${Math.round(seconds)} S · FOLLOW IT ON THE MAP`);
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
    const lane = podLane(w, pod);
    const kg = inventoryMass(pod.cargo);
    const beacons = (ex.beacons ??= []);
    const label = BODIES[pod.to].label;
    if (pod.doomed) {
      beacons.push({ id: pod.id, body: pod.to, from: pod.from, kind: 'lost', kg, angle: lane.landing.angle, until: w.system.time + BEACON_SECONDS.lost });
      notify(w, `A cargo pod crashed short of ${label}. Its beacon is on the Map.`);
      continue;
    }
    const target = colonyWorld(w, pod.to);
    let lost = 0;
    for (const r of RESOURCES) {
      const room = Math.max(0, oreCapacity(target.colony) - inventoryMass(target.depot));
      const put = Math.min(pod.cargo[r], room);
      target.depot[r] += put;
      lost += pod.cargo[r] - put;
    }
    beacons.push({ id: pod.id, body: pod.to, from: pod.from, kind: 'landed', kg: kg - lost, angle: lane.landing.angle, until: w.system.time + BEACON_SECONDS.landed });
    notify(w, lost > 0.5 ? `POD LANDED ON ${label.toUpperCase()} · ${lost.toFixed(0)} KG DID NOT FIT` : `POD LANDED ON ${label.toUpperCase()} · ${(kg - lost).toFixed(0)} KG IN THE DEPOT`);
  }
  ex.pods = keep;
}

/** Beacons go dark after a while. */
export function stepBeacons(w: WorldState): void {
  const ex = w.exploration;
  if (!ex.beacons || ex.beacons.length === 0) return;
  ex.beacons = ex.beacons.filter(b => b.until > w.system.time);
}
