import { createWorld } from '../../src/sim/world';
import { heading } from '../../src/sim/math';

export function legacyCheckpoint() {
  const world = createWorld();
  // A genuine v1 snapshot predates neighborhood sectors and site metadata.
  world.asteroids = world.asteroids.filter(body => body.belt === undefined); world.nextId = 16;
  world.ship.position = { x: 0, y: -607 }; world.ship.fuel = 150; world.ship.hull = 80; world.ship.cargo.ice = 6;
  const normal = heading(0.02); world.astronaut.position = { x: normal.x * 602.5, y: normal.y * 602.5 };
  world.playerMode = 'astronaut'; world.astronaut.oxygen = 130;
  world.asteroids.forEach((body, i) => {
    const radius = 1100 + i % 3 * 160, n = heading(i * 2.399963), speed = Math.sqrt(1_800_000 / radius);
    body.position = { x: n.x * radius, y: n.y * radius }; body.velocity = { x: -n.y * speed, y: n.x * speed };
  });
  world.asteroids[0].position = { x: 0, y: -1040 }; world.asteroids[0].velocity = { x: 0, y: 0 };
  world.asteroids.splice(5, 1); // Keep a depleted deposit depleted through migration.
  world.colony.buildings = [{ id: 1, kind: 'storage', angle: 0.2, enabled: true, progress: 0, recipe: 0, status: 'idle' }];
  world.colony.nextId = 2; world.depot.iron = 12; world.unloaded = 12; world.colony.products.fuel = 4;
  const { exploration: _currentNeighborhood, ...oldWorld } = world;
  return { version: 1, world: oldWorld };
}
