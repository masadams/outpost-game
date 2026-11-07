import { CELESTIAL, planetAt, relative, surfaceAngle } from './celestial';
import { wrap } from './math';
import { notify } from './messages';
import { operational } from './buildingHealth';
import { ANALYSIS_ENERGY, PICKUP_REACH } from './stormConfig';
import type { WorldState } from './world';

/** Where the Nacre crystal lies, in metres east of the Nacre pad. */
export const CRYSTAL_METRES = 240;
const CRYSTAL_ANGLE = CRYSTAL_METRES / CELESTIAL.moon.radius;

export type CrystalState = 'lying' | 'carried' | 'studied';
export type CrystalAction = { type: 'studyCrystal' };
export const isCrystalAction = (a: { type: string }): a is CrystalAction => a.type === 'studyCrystal';

export const crystalAngle = (): number => CRYSTAL_ANGLE;

/** Walking over the crystal on Nacre picks it up. */
export function stepCrystal(world: WorldState): void {
  const ex = world.exploration;
  if (ex.crystal !== 'lying' || world.playerMode !== 'astronaut' || !world.astronaut.grounded || world.astronaut.health <= 0) return;
  const moon = planetAt('moon', world.system);
  const here = relative(world.astronaut.position, moon);
  if (Math.hypot(here.x, here.y) > moon.radius + 40) return;
  const angle = surfaceAngle(moon, world.astronaut.position);
  if (Math.abs(wrap(angle - CRYSTAL_ANGLE)) * moon.radius > PICKUP_REACH) return;
  ex.crystal = 'carried';
  notify(world, 'Picked up a crystal of Nacre. Take it home and study it in Base.');
}

/** Why the crystal cannot be studied right now, or null. */
export function crystalBlock(world: WorldState): string | null {
  const ex = world.exploration;
  if (ex.crystal === 'studied') return 'Already studied.';
  if (ex.crystal === 'lying') return 'Find the crystal on Nacre first.';
  if (!world.colony.buildings.some(b => b.kind === 'observatory' && operational(b))) return 'Needs a working Observatory.';
  if (world.colony.energy < ANALYSIS_ENERGY) {
    return `Needs ${ANALYSIS_ENERGY} kJ stored (you have ${Math.floor(world.colony.energy)}).`;
  }
  return null;
}

/** Studying the crystal teaches a bigger hold design: the lander gets it for free. */
export function applyCrystalAction(world: WorldState): void {
  const block = crystalBlock(world);
  if (block) {
    notify(world, block);
    return;
  }
  world.colony.energy -= ANALYSIS_ENERGY;
  world.exploration.crystal = 'studied';
  grantHold(world);
  notify(world, 'Study done. Your lander now has a bigger hold.');
}

/** A studied crystal's upgrade, also given to any replacement lander. */
export function grantHold(world: WorldState): void {
  if (world.exploration.crystal !== 'studied') return;
  const held = world.ship.equipment;
  if (!held.some(id => id === 'cargo' || id === 'lightHold' || id === 'bulkHold')) held.push('cargo');
}

/** The core sample on Cinder: a dense lump from its deepest seam, metres east of the Cinder pad. */
export const CORE_METRES = 150;
export const coreAngle = (): number => CORE_METRES / CELESTIAL.cinder.radius;
export type CoreAction = { type: 'studyCore' };
export const isCoreAction = (a: { type: string }): a is CoreAction => a.type === 'studyCore';

/** Walking over the core sample on Cinder picks it up. */
export function stepCore(world: WorldState): void {
  const ex = world.exploration;
  if (ex.core !== 'lying' || world.playerMode !== 'astronaut' || !world.astronaut.grounded || world.astronaut.health <= 0) return;
  const body = planetAt('cinder', world.system);
  const here = relative(world.astronaut.position, body);
  if (Math.hypot(here.x, here.y) > body.radius + 40) return;
  const angle = surfaceAngle(body, world.astronaut.position);
  if (Math.abs(wrap(angle - coreAngle())) * body.radius > PICKUP_REACH) return;
  ex.core = 'carried';
  notify(world, 'Picked up a core sample from Cinder. Take it home and study it in Base.');
}

/** Why the core sample cannot be studied right now, or null. */
export function coreBlock(world: WorldState): string | null {
  const ex = world.exploration;
  if (ex.core === 'studied') return 'Already studied.';
  if (ex.core === 'lying') return 'Find the core sample on Cinder first.';
  if (!world.colony.buildings.some(b => b.kind === 'observatory' && operational(b))) return 'Needs a working Observatory.';
  if (world.colony.energy < ANALYSIS_ENERGY) return `Needs ${ANALYSIS_ENERGY} kJ stored (you have ${Math.floor(world.colony.energy)}).`;
  return null;
}

/** Studying the core opens deeper mining research. No free part: the research and the fabrication are paid for. */
export function applyCoreAction(world: WorldState): void {
  const block = coreBlock(world);
  if (block) {
    notify(world, block);
    return;
  }
  world.colony.energy -= ANALYSIS_ENERGY;
  world.exploration.core = 'studied';
  notify(world, 'Study done. Deeper mining is open to research.');
}
