import { CELESTIAL, nearestPlanet, planetAt, relative, surfaceAngle, type BodyId } from './celestial';
import { WORLD } from './config';
import { wrap } from './math';
import { notify } from './messages';
import { onWater } from './nature';
import { PICKUP_REACH } from './stormConfig';
import type { WorldState } from './world';

/**
 * Keystones: the surviving parts of the carrier, one on every world but home. The seed ship cannot be finished
 * without all of them. Each lies at a marked spot near that world's pad; walk over it to pick it up, then land
 * at home to bring it in. See docs/tasks/STORY_ACT_THREE.md.
 */
export const KEYSTONE_WORLDS = ['moon', 'cinder', 'ember', 'glint', 'verdant', 'tide', 'murk'] as const;
export type KeystoneWorld = typeof KEYSTONE_WORLDS[number];

/** Not in the save while it still lies where it fell. */
export type KeystoneState = 'carried' | 'home';
export type KeystoneStates = Partial<Record<KeystoneWorld, KeystoneState>>;

export interface Keystone {
  /** What it is, in a few words. */
  label: string;
  /** The part of the seed ship it finishes. */
  stage: string;
  /** Metres east of that world's pad where it lies (moved along to dry land where there is sea). */
  metres: number;
  /** What the unit notes on picking it up. */
  found: string;
}

export const KEYSTONES: Record<KeystoneWorld, Keystone> = {
  moon: {
    label: 'Crystal lattice', stage: 'Hull plating', metres: -210,
    found: 'A lattice grown on a carrier hull plate. The plate is stamped LONG PATIENCE.',
  },
  cinder: {
    label: 'Unit 2\'s archive', stage: 'Archive core', metres: -170,
    found: 'Unit 2\'s archive, sealed and whole. It kept its memory. It lost everything else.',
  },
  ember: {
    label: 'Engine test records', stage: 'Long-burn drive', metres: 190,
    found: 'Years of engine tests, each a little better than the last, all for a launch that needed a reply.',
  },
  glint: {
    label: 'Tracking mirror', stage: 'Navigation', metres: 160,
    found: 'One mirror from the field, still true. It can hold a star for a very long time.',
  },
  verdant: {
    label: 'Living samples', stage: 'Seed bank', metres: 230,
    found: 'Seed, soil and spore, sealed cold. This is what the carrier was for.',
  },
  tide: {
    label: 'Landing grid survey', stage: 'Landing gear', metres: 200,
    found: 'The survey for a landing grid built for the carrier. It never came down on it.',
  },
  murk: {
    label: 'Unit 5', stage: 'A second mind', metres: 180,
    found: 'Unit 5 stops building when you lift its core. It says one thing: "Is it time?"',
  },
};

/** Parts become worth looking for once the unit knows there was one ship. */
export function keystonesOpen(source: WorldState): boolean {
  const w = source.rootWorld ?? source;
  return (w.exploration.story?.memories ?? []).includes('oneShip');
}

export function keystoneState(source: WorldState, id: KeystoneWorld): 'lying' | KeystoneState {
  return (source.rootWorld ?? source).exploration.keystones?.[id] ?? 'lying';
}

/** How many keystones are home, and how many there are. */
export function keystoneCount(source: WorldState): { home: number; total: number } {
  return { home: KEYSTONE_WORLDS.filter(id => keystoneState(source, id) === 'home').length, total: KEYSTONE_WORLDS.length };
}

const angleCache = new Map<string, number>();
/** Where a keystone lies, as a surface angle on its world. Never in a sea, never on the pad. */
export function keystoneAngle(id: KeystoneWorld, seed: number): number {
  const key = `${id}/${seed}`;
  const known = angleCache.get(key);
  if (known !== undefined) return known;
  const radius = CELESTIAL[id].radius;
  const side = Math.sign(KEYSTONES[id].metres);
  let metres = Math.abs(KEYSTONES[id].metres);
  // Walk outward ten metres at a time until the ground is dry; give up after a quarter of the way round.
  const limit = (Math.PI / 2) * radius;
  while (metres < limit && onWater(id as BodyId, seed, WORLD.padAngle + (side * metres) / radius)) metres += 10;
  const angle = WORLD.padAngle + (side * metres) / radius;
  angleCache.set(key, angle);
  return angle;
}

/** Picks up a keystone the pilot walks over, and brings carried ones in when the lander is home. */
export function stepKeystones(source: WorldState): void {
  const world = source.rootWorld ?? source;
  if (!keystonesOpen(world)) return;
  const ex = world.exploration;
  // Home: whatever the lander carries is unloaded into the yard.
  const carried = KEYSTONE_WORLDS.filter(id => ex.keystones?.[id] === 'carried');
  if (carried.length > 0 && world.ship.state === 'landed' && nearestPlanet(world.ship.position, world.system).id === 'home') {
    for (const id of carried) ex.keystones![id] = 'home';
    const { home, total } = keystoneCount(world);
    const what = carried.map(id => KEYSTONES[id].label).join(' and ');
    notify(world, `CARRIER PART HOME · ${what.toUpperCase()} · ${home} OF ${total}`, 6);
    return;
  }
  if (world.playerMode !== 'astronaut' || !world.astronaut.grounded || world.astronaut.health <= 0) return;
  const body = nearestPlanet(world.astronaut.position, world.system);
  const id = KEYSTONE_WORLDS.find(k => k === body.id);
  if (!id || keystoneState(world, id) !== 'lying') return;
  const planet = planetAt(id, world.system);
  const here = relative(world.astronaut.position, planet);
  if (Math.hypot(here.x, here.y) > planet.radius + 40) return;
  const angle = surfaceAngle(planet, world.astronaut.position);
  if (Math.abs(wrap(angle - keystoneAngle(id, world.seed))) * planet.radius > PICKUP_REACH) return;
  ex.keystones = { ...(ex.keystones ?? {}), [id]: 'carried' };
  notify(world, `${KEYSTONES[id].label.toUpperCase()} · ${KEYSTONES[id].found} Take it home.`, 8);
}

export function validKeystones(value: unknown): boolean {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  return Object.entries(value).every(([k, v]) => (KEYSTONE_WORLDS as readonly string[]).includes(k) && (v === 'carried' || v === 'home'));
}
