import { nearestPlanet, groundVelocity, surfaceAngle, surfacePosition, type SystemFrame } from './celestial';
import { WORLD } from './config';
import type { Resource } from './resources';
import type { Asteroid, Pickup } from './bodies';

/** A rock touching the ground at more than this (m/s) breaks up. Thick air slows a falling rock to a few m/s, so almost any touchdown does it. */
export const ROCK_SHATTER_SPEED = 0.5;

/** Four lumps of ore lying where the rock hit, sharing its mass. Pick them up on foot, or pull them in with the tractor. */
export function rockToOre(rock: Asteroid, nextId: () => number, system: SystemFrame): Pickup[] {
  const planet = nearestPlanet(rock.position, system);
  const angle = surfaceAngle(planet, rock.position);
  return Array.from({ length: 4 }, (_, i) => {
    const along = (i - 1.5) * 2.5 * 1.6 / planet.radius;
    const position = surfacePosition(planet, angle + along, 2.1);
    return { id: nextId(), ...(rock.belt ? { belt: rock.belt } : {}), resource: rock.resource, mass: rock.mass / 4, radius: 2,
      position, velocity: groundVelocity(planet, position) };
  });
}

/** Lumps from old impacts: [metres from the pad (+ east, - west), resource, kg]. */
const OLD_IMPACTS: ReadonlyArray<readonly [number, Resource, number]> = [
  [-260, 'iron', 30], [-210, 'iron', 24], [190, 'copper', 22], [240, 'ice', 28], [330, 'iron', 26], [-380, 'ice', 20],
];

/** A few lumps lying near the pad from long-ago impacts, so first fuel and metal need no mining. */
export function oldImpactOre(nextId: () => number, system: SystemFrame): Pickup[] {
  const planet = nearestPlanet({ x: 0, y: -1 }, system);
  return OLD_IMPACTS.map(([metres, resource, mass]) => {
    const position = surfacePosition(planet, WORLD.padAngle + metres / planet.radius, 2.1);
    return { id: nextId(), resource, mass, radius: 2, position, velocity: groundVelocity(planet, position) };
  });
}
