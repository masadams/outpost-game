import { SUIT } from '../../sim/astronaut';
import { habitatSource } from '../../sim/habitats';
import { localAngle, wrap } from '../../sim/math';
import { RESOURCES, RESOURCE_INFO, inventoryMass, type Resource } from '../../sim/resources';
import { cargoMass } from '../../sim/shipMass';
import { cargoCapacity, miningStats, tractorStats } from '../../sim/shipStats';
import { STATIONS, distance, nearbyStation } from '../../sim/surface';
import { colonyPlanet, sitePosition } from '../../sim/localWorld';
import { nearbyBuilding } from '../../sim/colony';
import { BLUEPRINTS } from '../../sim/colonyConfig';
import { manifestPlan } from '../../sim/manifests';
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
  if (cargo > 0) {
    return w.ship.state === 'landed' ? 'Press E to unload your ore.' : 'Ore on board. Land on the green pad.';
  }
  if (stored > 0) return 'Delivered. Launch for more.';
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
  if (cargo >= cargoCapacity(w.ship) - 1e-6) return 'Hold full. Return and unload.';
  if (w.tractorActive) return `Tractor on, reaches ${tractorStats(w.ship).range} m.`;
  return 'C pulls fragments in. Space fires the laser.';
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
  return { status, places, action, note };
}

const PRODUCT_NAME = { alloy: 'alloy', wire: 'wire', components: 'components', fuel: 'fuel', oxygen: 'oxygen' } as const;

/** The rig kit for the first trip to Nacre. Shown once the Observatory has surveyed it. */
function kit(w: WorldState): KitView | null {
  if (!w.exploration.nacreSurveyed) return null;
  const aboard = PRODUCTS.some(p => w.ship.freight[p] > 0);
  const onMoon = w.siteBody === 'moon';
  if (aboard) {
    const where = onMoon ? 'Land on the pad and press E to unload it.' : 'Fly to Nacre and land on its pad.';
    return { text: `Rig kit aboard. ${where}`, load: null };
  }
  if (onMoon) return null;
  const plan = manifestPlan(w, 'expedition');
  const short = PRODUCTS.flatMap(p => (plan.missing[p] > 0 && availableProduct(w.colony, p) + 1e-9 < plan.missing[p]
    ? [`${Math.ceil(plan.missing[p] - availableProduct(w.colony, p))} more ${PRODUCT_NAME[p as keyof typeof PRODUCT_NAME] ?? p}`]
    : []));
  const reason = plan.error === null ? 'Ready to load.'
    : short.length ? `Needs ${short.join(', ')}`
      : plan.error === 'Insufficient shared hold capacity' ? 'Empty the hold first.' : 'Land on the home pad to load the kit.';
  return { text: 'A rig and a solar array for Nacre: 15 alloy, 5 wire, 5 components.', load: { enabled: plan.error === null, reason } };
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
  };
}
