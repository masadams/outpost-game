import { bench, describe } from 'vitest';
import { createWorld, stepWorld } from '../src/sim/world';
import { fracture } from '../src/sim/mining';
import { STEP } from '../src/sim/config';

const fresh = createWorld(), fragments = createWorld(), ore = createWorld();
fragments.asteroids = fragments.asteroids.flatMap(r => fracture(r, () => fragments.nextId++).rocks);
ore.pickups = ore.asteroids.flatMap(r => fracture(r, () => ore.nextId++).rocks.flatMap(p => fracture(p, () => ore.nextId++).ore));
ore.asteroids = [];
describe('shared 60 Hz neighborhood simulation, no LOD freezes', () => {
  bench('27 parent rocks + 3 physical sites', () => stepWorld(fresh, { turn: 0, thrust: false }, STEP), { time: 300, warmupTime: 100 });
  bench('54 fragments + 3 physical sites', () => stepWorld(fragments, { turn: 0, thrust: false }, STEP), { time: 300, warmupTime: 100 });
  bench('216 drifting ore stacks + 3 physical sites', () => stepWorld(ore, { turn: 0, thrust: false }, STEP), { time: 300, warmupTime: 100 });
});
