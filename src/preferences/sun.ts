import { groundVelocity, planetAt } from '../sim/celestial';
import { createWorld, type WorldState } from '../sim/world';
import { oldImpactOre } from '../sim/rockFall';

export const SUN_STORAGE_KEY = 'outpost.sun';

/** The day and night cycle is on unless `?sun=off` or localStorage `outpost.sun` = `off` (the browser regression suite uses that). */
export function sunEnabled(): boolean {
  try {
    const query = new URLSearchParams(globalThis.location?.search ?? '').get('sun');
    if (query === 'off') return false;
    if (query === 'on') return true;
  } catch {
    // No location: fall through.
  }
  try {
    if (globalThis.localStorage?.getItem(SUN_STORAGE_KEY) === 'off') return false;
  } catch {
    // Storage blocked: keep the sun on.
  }
  return true;
}

/** A new game world, with the sun switched on or off as the player's setup says. */
/** The world seed: `?seed=N` fixes it; otherwise each new game gets its own. 0 is the standard layout. */
export function worldSeed(): number {
  try {
    const query = new URLSearchParams(globalThis.location?.search ?? '').get('seed');
    if (query !== null && /^\d{1,10}$/.test(query)) return Number(query) % 4294967296;
  } catch {
    // No location: pick one.
  }
  // The regression suite and developer runs (day cycle off) always get the standard layout.
  return sunEnabled() ? 1 + Math.floor(Math.random() * 4294967294) : 0;
}

export function newWorld(seed = worldSeed()): WorldState {
  const world = createWorld(seed);
  world.system.sun = sunEnabled();
  if (world.system.sun) {
    world.pickups.push(...oldImpactOre(() => world.nextId++, world.system, world.seed));
    // The planet turns once the day cycle is on: the parked lander turns with it from the first frame.
    world.ship.velocity = groundVelocity(planetAt('home', world.system), world.ship.position);
  }
  return world;
}
