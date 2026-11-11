import { nearbyPiles, pileMass } from '../../sim/stockpile';
import { GRADE_LABEL, seamGrade, seamKnown } from '../../sim/geology';
import { BODY_IDS } from '../../sim/celestial';
import { liftoffWarning } from '../../sim/preflight';
import { bodyKnown } from '../../sim/explorationConfig';
import { SUIT } from '../../sim/astronaut';
import { habitatSource } from '../../sim/habitats';
import { localAngle, wrap } from '../../sim/math';
import { RESOURCES, RESOURCE_INFO, inventoryMass, type Resource } from '../../sim/resources';
import { cargoMass } from '../../sim/shipMass';
import { cargoCapacity, fuelCapacity, miningStats, tractorStats } from '../../sim/shipStats';
import { STATIONS, distance, nearbyStation } from '../../sim/surface';
import { colonyPlanet, localAngleAt, sitePosition } from '../../sim/localWorld';
import { nearbyBuilding } from '../../sim/colony';
import { BLUEPRINTS } from '../../sim/colonyConfig';
import { haulError } from '../../sim/freight';
import { manifestPlan } from '../../sim/manifests';
import { blueprintRevealed } from '../../sim/unlocks';
import { availableProduct } from '../../sim/colonyPolicy';
import { PRODUCTS } from '../../sim/colonyConfig';
import type { WorldState } from '../../sim/world';

/** Everything the Ship panel shows, derived from the simulation. Pure: no DOM, no Phaser. */
export interface ShipPanelView {
  cargo: { value: string; capacity: string; fraction: number; full: boolean };
  ore: OreRow[];
  /** What to do next, in one sentence. */
  next: string;
  deposit: DepositView | null;
  tools: string;
  depot: boolean;
  foot: FootView | null;
  kit: KitView | null;
  /** Ore waiting in the depot of another world, ready to haul home. */
  haul: { text: string; enabled: boolean; reason: string } | null;
  /** The worker bay kit for an outpost: shown at home once the worker bay is offered and an outpost stands. */
  outpostKit: { text: string; enabled: boolean; reason: string } | null;
  /** Ore piled beside a mine that is off the base grid, next to the landed lander. */
  piles: { text: string; enabled: boolean; reason: string } | null;
}

export interface KitView {
  text: string;
  /** Set when the Load button should show. */
  load: { enabled: boolean; reason: string } | null;
}

export interface OreRow {
  resource: Resource;
  label: string;
  hold: string;
  stored: string;
}

export interface DepositView {
  label: string;
  distance: string;
  direction: string;
  laserRange: string;
}

export interface FootView {
  /** The ore seam nearest to you, with how much is left. */
  seam: { id: number; resource: string; label: string; distance: string; side: string; left: string; remaining: string } | null;
  status: string;
  places: Array<{ label: string; distance: string }>;
  action: string;
  note: string;
}

function nearestDeposit(w: WorldState) {
  let best: { rock: WorldState['asteroids'][number]; d: number } | null = null;
  for (const rock of w.asteroids) {
    const d = Math.hypot(rock.position.x - w.ship.position.x, rock.position.y - w.ship.position.y);
    if (!best || d < best.d) best = { rock, d };
  }
  return best;
}

function nextStep(w: WorldState, cargo: number, stored: number): string {
  const away = (w.siteBody ?? 'home') !== 'home';
  if (away && w.ship.state === 'landed' && w.colony.products.fuel >= 1 && w.ship.fuel < fuelCapacity(w.ship) - 1) {
    return `Press E to refuel from the ${Math.floor(w.colony.products.fuel)} kg of fuel made here.`;
  }
  if (cargo > 0) {
    return w.ship.state === 'landed' ? 'Press E to unload your ore.' : 'Ore on board. Land on the green pad.';
  }
  if (stored > 0) {
    return (w.siteBody ?? 'home') === 'home' ? 'Delivered. Launch for more.' : 'Ore is waiting in the depot here. Load it and fly home.';
  }
  return 'Point at a rock and hold Space to mine, then hold C to pull the fragments in.';
}

function deposit(w: WorldState): DepositView | null {
  const near = nearestDeposit(w);
  if (!near) return null;
  const bearing = (wrap(localAngle({ x: near.rock.position.x - w.ship.position.x, y: near.rock.position.y - w.ship.position.y }) - w.ship.angle) * 180) / Math.PI;
  return {
    label: `${RESOURCE_INFO[near.rock.resource].label} rock`,
    distance: `${near.d.toFixed(0)} m`,
    direction: Math.abs(bearing) < 3 ? 'Straight ahead' : `${Math.abs(bearing).toFixed(0)}° to your ${bearing < 0 ? 'left' : 'right'}`,
    laserRange: `${miningStats(w.ship).range} m`,
  };
}

function toolsLine(w: WorldState, cargo: number): string {
  const heavy = w.ship.state === 'landed' ? liftoffWarning(w) : null;
  if (heavy) return heavy;
  if (cargo >= cargoCapacity(w.ship) - 1e-6) return 'Hold full. Return and unload.';
  if (w.tractorActive) return `Tractor on, reaches ${tractorStats(w.ship).range} m.`;
  return 'C pulls fragments in. Space fires the laser.';
}

function nearestSeam(w: WorldState): FootView['seam'] {
  const at = localAngleAt(w, w.astronaut.position);
  const radius = colonyPlanet(w).radius;
  const found = [...w.surfaceDeposits].sort((a, b) => Math.abs(wrap(a.angle - at)) - Math.abs(wrap(b.angle - at)))[0];
  if (!found) return null;
  const offset = wrap(found.angle - at);
  const known = seamKnown(found);
  return {
    id: found.id,
    resource: found.resource,
    label: known ? `${GRADE_LABEL[seamGrade(found)]} ${RESOURCE_INFO[found.resource].label.toLowerCase()}` : 'Unknown seam',
    distance: `${Math.round(Math.abs(offset) * radius)} m`,
    side: offset < 0 ? 'left' : 'right',
    left: known ? `${found.remaining.toFixed(0)} of ${found.initial} kg left` : 'Walk over it to survey it',
    remaining: found.remaining.toFixed(2),
  };
}

function foot(w: WorldState): FootView {
  const suit = w.astronaut;
  const canBoard = distance(suit.position, w.ship.position) <= SUIT.boardingRange;
  const station = nearbyStation(w);
  const building = nearbyBuilding(w);
  const moon = w.siteBody === 'moon';
  const places = (moon ? STATIONS.filter(s => s.kind === 'depot').map(s => ({ ...s, angle: 54 / colonyPlanet(w).radius })) : STATIONS).map(s => ({
    label: s.label,
    distance: `${distance(suit.position, sitePosition(w, s.angle)).toFixed(0)} m`,
  }));
  const status =
    suit.health <= 0
      ? 'Your pilot is lost. Press Backspace to print a new one at the base.'
      : habitatSource(w)
        ? 'Breathing habitat air.'
        : canBoard
          ? 'Press F to board the lander.'
          : 'Get back to the lander before your suit air runs out.';
  const action =
    station && suit.grounded
      ? station.kind === 'depot'
        ? w.depotOpen ? 'Press E to close the depot.' : 'Press E to open the depot and unload your hold.'
        : 'Press E to restore your suit, repair and refuel.'
      : building && suit.grounded
        ? `Press E to use the ${BLUEPRINTS[building.kind].label.toLowerCase()}${building.kind === 'refinery' ? ', V for the next recipe' : ''}.`
        : 'Walk to a terminal, then press E.';
  const note = moon
    ? 'Nacre has no air and no free suit service. Bring supplies and build a powered service station.'
    : 'Depot is right of the pad, service is left. Service restores air and suit health; hull repair uses 1 kg of stored iron per 10%.';
  return { seam: nearestSeam(w), status, places, action, note };
}

const PRODUCT_NAME = { alloy: 'alloy', wire: 'wire', components: 'components', fuel: 'fuel', oxygen: 'oxygen' } as const;

/** The rig kit for a trip to another world. Shown once the Observatory has surveyed one. */
function kit(w: WorldState): KitView | null {
  if (!BODY_IDS.some(id => id !== 'home' && bodyKnown(w.exploration, id))) return null;
  const aboard = PRODUCTS.some(p => w.ship.freight[p] > 0);
  const onMoon = (w.siteBody ?? 'home') !== 'home';
  if (aboard) {
    const where = onMoon ? 'Land on the pad and press E to unload it.' : 'Pick a world on the Map, fly there and land on its pad.';
    return { text: `Kit aboard. ${where}`, load: null };
  }
  if (onMoon) return null;
  const plan = manifestPlan(w, 'nacreKit');
  const short = PRODUCTS.flatMap(p => (plan.missing[p] > 0 && availableProduct(w.colony, p) + 1e-9 < plan.missing[p]
    ? [`${Math.ceil(plan.missing[p] - availableProduct(w.colony, p))} more ${PRODUCT_NAME[p as keyof typeof PRODUCT_NAME] ?? p}`]
    : []));
  const reason = plan.error === null ? 'Ready to load.'
    : short.length ? `Needs ${short.join(', ')}`
      : plan.error === 'Insufficient shared hold capacity' ? 'Empty the hold first.' : 'Land on the home pad to load the kit.';
  return { text: 'A rig, a solar array, a battery, a power relay and a refinery for another world: 24 alloy, 12 wire, 6 components. Refine ore there and carry home the lighter materials. Nights there are long; the battery carries the rig part of the way.', load: { enabled: plan.error === null, reason } };
}

/** A worker bay, battery and relay to carry to an outpost, so its buildings get built and mended while you are away. */
function outpostKit(w: WorldState): ShipPanelView['outpostKit'] {
  if ((w.siteBody ?? 'home') !== 'home') return null;
  if (!blueprintRevealed(w, 'workerBay')) return null;
  if (!Object.values(w.outposts).some(o => o.colony.buildings.length > 0)) return null;
  if (PRODUCTS.some(p => w.ship.freight[p] > 0)) return null;
  const plan = manifestPlan(w, 'outpostKit');
  const short = PRODUCTS.flatMap(p => (plan.missing[p] > 0 && availableProduct(w.colony, p) + 1e-9 < plan.missing[p]
    ? [`${Math.ceil(plan.missing[p] - availableProduct(w.colony, p))} more ${PRODUCT_NAME[p as keyof typeof PRODUCT_NAME] ?? p}`]
    : []));
  const reason = plan.error === null ? 'Load it, fly to the outpost, land on its pad and press E.'
    : short.length ? `Needs ${short.join(', ')}`
      : plan.error === 'Insufficient shared hold capacity' ? 'Empty the hold first.' : 'Land on the home pad to load the kit.';
  return {
    text: 'A worker bay, a battery and a power relay: 18 alloy, 11 wire, 8 components. Its drone builds and mends the outpost while you are away.',
    enabled: plan.error === null,
    reason,
  };
}

/** Ore piled at mines beside the landed lander, out of reach of the base grid. */
function piles(w: WorldState): ShipPanelView['piles'] {
  const near = nearbyPiles(w);
  if (near.length === 0) return null;
  const kg = near.reduce((sum, b) => sum + pileMass(b), 0);
  const room = Math.max(0, cargoCapacity(w.ship) - cargoMass(w.ship));
  return {
    text: `${kg.toFixed(0)} kg of ore is piled at the mine here. It is not on the base grid, so it waits for you. Your hold takes ${room.toFixed(0)} kg.`,
    enabled: room > 0.5,
    reason: room > 0.5 ? 'Load it, fly home and press E on the pad. A relay line to the base would send it in by itself.' : 'Your hold is full.',
  };
}

/** Carrying a remote depot's ore home. Shown on another world whenever its depot has ore, in the lander or on foot. */
function haul(w: WorldState): ShipPanelView['haul'] {
  if ((w.siteBody ?? 'home') === 'home') return null;
  const stored = inventoryMass(w.depot);
  if (stored < 0.5) return null;
  const room = Math.max(0, cargoCapacity(w.ship) - cargoMass(w.ship));
  // On foot the button cannot work yet: say how to get to where it does.
  const error = w.playerMode !== 'ship' ? 'Board the lander on the pad (F), then load here.' : haulError(w);
  return {
    text: `${stored.toFixed(0)} kg of ore waits in the depot here. Your hold takes ${room.toFixed(0)} kg. Refining it here first means carrying less.`,
    enabled: error === null,
    reason: error ?? 'Load it, fly home and press E on the pad.',
  };
}

export function shipPanelView(w: WorldState): ShipPanelView {
  const cargo = cargoMass(w.ship);
  const stored = inventoryMass(w.depot);
  const capacity = cargoCapacity(w.ship);
  return {
    cargo: {
      value: cargo.toFixed(0),
      capacity: `${capacity}`,
      fraction: Math.min(1, cargo / capacity),
      full: cargo >= capacity - 1e-6,
    },
    ore: RESOURCES.map(resource => ({
      resource,
      label: RESOURCE_INFO[resource].label,
      hold: w.ship.cargo[resource].toFixed(1),
      stored: w.depot[resource].toFixed(1),
    })),
    next: nextStep(w, cargo, stored),
    deposit: w.playerMode === 'ship' ? deposit(w) : null,
    tools: toolsLine(w, cargo),
    depot: w.depotOpen,
    foot: w.playerMode === 'astronaut' ? foot(w) : null,
    kit: kit(w),
    outpostKit: outpostKit(w),
    haul: haul(w),
    piles: piles(w),
  };
}
