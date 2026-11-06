import { nearestPlanet, groundVelocity, surfaceAngle, surfacePosition, type SystemFrame } from './celestial';
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
