import { createWorld, type WorldState } from '../sim/world';

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
export function newWorld(): WorldState {
  const world = createWorld();
  world.system.sun = sunEnabled();
  return world;
}
