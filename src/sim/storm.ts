import { planetAt, relative, surfaceAngle, type SystemFrame } from './celestial';
import { WORLD } from './config';
import { heading, wrap, type Vec } from './math';
import { predictMeteor } from './meteor';
import { notify } from './messages';
import { seeded } from './random';
import { around, streamFor } from './seed';
import { operational } from './buildingHealth';
import { ANALYSIS_ENERGY, GIANT, PICKUP_REACH, quietAfter, stormFor, type FarBody, type StormCounts, type StormReport } from './stormConfig';
import type { Meteor } from './defenceConfig';
import type { WorldState } from './world';

/** The state a body has when it is handed to the detailed meteor physics. */
function entryMeteor(id: number, angle: number, tangential: number, system: SystemFrame, radius: number, mass: number, wave: number): Meteor {
  const STORM = stormFor(wave);
  const planet = planetAt('home', system);
  const up = heading(angle + planet.spin);
  const side = { x: -up.y, y: up.x };
  return {
    id,
    position: { x: planet.position.x + up.x * STORM.entryRadius, y: planet.position.y + up.y * STORM.entryRadius },
    velocity: {
      x: planet.velocity.x - up.x * STORM.entrySpeed + side.x * tangential,
      y: planet.velocity.y - up.y * STORM.entrySpeed + side.y * tangential,
    },
    radius, mass, stage: 0, resource: 'iron', health: 1, maxHealth: 1,
  };
}

/** Steps used while searching for the right aim: coarse is plenty to aim with, and many times cheaper. */
const AIM_STEP = 0.1;

/** Where on the planet a fall from this state ends, as a surface angle, or null if it misses. */
function landingAngle(meteor: Meteor, system: SystemFrame): number | null {
  const result = predictMeteor(meteor, 300, system, AIM_STEP);
  if (!result.impact) return null;
  const planet = planetAt('home', { ...system, time: system.time + result.seconds });
  return surfaceAngle(planet, result.impact);
}

function landing(meteor: Meteor, system: SystemFrame): { angle: number; time: number } | null {
  const result = predictMeteor(meteor, 300, system, AIM_STEP);
  if (!result.impact) return null;
  const planet = planetAt('home', { ...system, time: system.time + result.seconds });
  return { angle: surfaceAngle(planet, result.impact), time: system.time + result.seconds };
}

/** Adjust the sideways speed until the body comes down where it is meant to. */
function aimTangential(angle: number, system: SystemFrame, radius: number, mass: number, wave: number): number {
  const error = (tangential: number): number | null => {
    const landed = landingAngle(entryMeteor(0, angle, tangential, system, radius, mass, wave), system);
    return landed === null ? null : wrap(landed - angle);
  };
  let a = 0;
  let b = 12;
  let ea = error(a);
  let eb = error(b);
  for (let i = 0; i < 6 && ea !== null && eb !== null; i++) {
    if (Math.abs(eb) * WORLD.radius < 6) return b;
    const slope = (eb - ea) / (b - a);
    if (Math.abs(slope) < 1e-9) break;
    const next = b - eb / slope;
    a = b;
    ea = eb;
    b = Math.max(-80, Math.min(80, next));
    eb = error(b);
  }
  return eb !== null && ea !== null && Math.abs(eb) <= Math.abs(ea) ? b : a;
}

/** Plan the first storm once. Deterministic: the same seed and world time give the same bodies. */
export function planStorm(world: WorldState): void {
  while (!world.storm.planned) planNextBody(world);
}

/**
 * Plans one more body. Aiming a body means simulating its fall a few times, which takes a moment, so the game plans
 * one body per step instead of all at once (the bodies appear at least 30 s later). Same result as planning together.
 */
/**
 * How this world's seed shapes a storm. Seed 0 is the standard storm. Others move where it comes down and when a little,
 * and make bodies a little bigger or smaller, within fair bounds: the zone never closes on the pad, the first storm
 * arrives in the same part of the day, and no body of the first storm is tougher than standard.
 */
export function stormShape(seed: number, wave: number): { offset: number; arrival: number; size: (i: number) => number; tough: (i: number) => number } {
  const STORM = stormFor(wave, seed);
  if (seed === 0) return { offset: STORM.targetOffset, arrival: 0, size: () => 1, tough: () => 1 };
  const rand = streamFor(seed, `storm/${wave}`);
  const side = STORM.targetOffset >= 0 ? 1 : -1;
  const offset = side * Math.max(100, Math.abs(STORM.targetOffset) * around(rand, 0.35));
  const arrival = Math.round((rand() * 2 - 1) * (wave === 1 ? 40 : 90));
  const sizes = STORM.aim.map(() => around(rand, 0.15));
  const toughs = STORM.aim.map(() => (wave === 1 ? Math.min(1, around(rand, 0.15)) : around(rand, 0.15)));
  return { offset, arrival, size: i => sizes[i] ?? 1, tough: i => toughs[i] ?? 1 };
}

/** A tangential speed that carries a body past the planet instead of onto it: the aimed one, pushed sideways until it clears. */
function missTangential(angle: number, aimed: number, system: SystemFrame, radius: number, mass: number, wave: number): number {
  for (const kick of [40, 60, 90, 130, 200, 300]) {
    const missing = landingAngle(entryMeteor(0, angle, aimed + kick, system, radius, mass, wave), system) === null;
    if (missing) return aimed + kick;
  }
  return aimed + 300;
}

/** Game seconds between planning one storm body and the next. Not saved: after a load planning simply carries on. */
const PLAN_SPACING = 0.25;
const lastPlanned = new WeakMap<WorldState, number>();

export function planNextBody(world: WorldState): void {
  const storm = world.storm;
  const STORM = stormFor(storm.wave, world.seed);
  if (storm.planned) return;
  if (storm.arrival <= 0) storm.arrival = STORM.arrivalTime;
  const i = storm.plan.length;
  const rand = seeded(STORM.seed);
  for (let j = 0; j < i; j++) rand();
  const home = planetAt('home', world.system);
  const entryTime = storm.arrival + i * STORM.spacing;
  const system = { ...world.system, time: entryTime };
  const shape = stormShape(world.seed, storm.wave);
  const target = WORLD.padAngle + (shape.offset + STORM.aim[i] + (rand() - 0.5) * 8) / home.radius;
  const radius = STORM.radii[i] * shape.size(i);
  const mass = STORM.masses[i] * shape.size(i) ** 3;
  const aimed = aimTangential(target, system, radius, mass, storm.wave);
  const tangential = STORM.kinds?.[i] === 'miss' ? missTangential(target, aimed, system, radius, mass, storm.wave) : aimed;
  const meteor = entryMeteor(world.nextId++, target, tangential, system, radius, mass, storm.wave);
  const fall = landing(meteor, system);
  storm.ids.push(meteor.id);
  storm.plan.push({ id: meteor.id, impactAngle: fall?.angle ?? null, impactTime: fall?.time ?? null });
  storm.far.push({
    id: meteor.id,
    entry: { ...meteor.position },
    velocity: { ...meteor.velocity },
    entryTime,
    radius: meteor.radius,
    mass: meteor.mass,
    health: STORM.health[i] * shape.tough(i),
    impactAngle: fall?.angle ?? null,
    impactTime: fall?.time ?? null,
  });
  if (storm.plan.length >= STORM.aim.length) storm.planned = true;
}

/** Where a body in the far field is at a given time. */
export function farPosition(body: FarBody, time: number): Vec {
  const back = body.entryTime - time;
  return { x: body.entry.x - body.velocity.x * back, y: body.entry.y - body.velocity.y * back };
}

/** Advances the storm one step: plan it, hand arriving bodies to the meteor physics, notice when it is over. */
export function stepStorm(world: WorldState): void {
  const storm = world.storm;
  const STORM = stormFor(storm.wave, world.seed);
  const time = world.system.time;
  if (!storm.armed) {
    // Building an Observatory is what starts the story.
    if (!world.colony.buildings.some(b => b.kind === 'observatory')) return;
    storm.armed = true;
  }
  if (!storm.planned) {
    // Never sooner than the fixed first-storm time, and always with the full warning window ahead.
    if (storm.plan.length === 0) storm.arrival = Math.max(STORM.arrivalTime + stormShape(world.seed, storm.wave).arrival, time + STORM.lead + 30);
    // Planning a body is heavy; space them out so no two frames in a row carry one.
    const last = lastPlanned.get(world);
    if (storm.plan.length > 0 && last !== undefined && time - last < PLAN_SPACING && time > last) return;
    lastPlanned.set(world, time);
    planNextBody(world);
    if (!storm.planned) return;
  }
  if (storm.phase === 'quiet' && time >= storm.arrival - STORM.lead) {
    storm.phase = 'approaching';
    storm.start = stormCounts(world);
    if (storm.far.some(b => b.radius >= GIANT.radius)) notify(world, 'SOMETHING HUGE IS IN THIS STORM · LASERS WILL NOT STOP IT · MISSILES CAN');
  }
  if (storm.phase === 'quiet') return;
  while (storm.far.length > 0 && storm.far[0].entryTime <= time) {
    const body = storm.far.shift()!;
    const at = farPosition(body, time);
    world.defence.meteors.push({
      id: body.id,
      position: at,
      velocity: { ...body.velocity },
      radius: body.radius,
      mass: body.mass,
      stage: 0,
      resource: 'iron',
      health: body.health,
      maxHealth: body.health,
    });
    if (storm.far.length + 1 === STORM.aim.length) notify(world, 'Something large is coming down.');
  }
  const clear = world.defence.meteors.length === 0 && world.defence.projectiles.length === 0;
  if (storm.phase === 'approaching' && storm.far.length === 0 && clear) {
    storm.phase = 'over';
    storm.endedAt = time;
    // Pieces come down in the zone the bodies were aimed at, whether or not they were shot apart.
    for (const planned of storm.plan) {
      if (planned.impactAngle !== null) storm.samples.push({ id: planned.id, angle: planned.impactAngle });
    }
    // Only the newest pieces stay on the ground, so an uncollected pile cannot grow without limit.
    storm.samples = storm.samples.slice(-32);
    storm.report = stormReport(world);
    notify(world, `${reportLine(storm.report).toUpperCase()}${storm.samples.length > 0 ? ' · PIECES LIE ON THE GROUND' : ''}`, 8);
  }
  if (storm.phase === 'over') collectSamples(world);
  if (storm.phase === 'over' && time >= storm.endedAt + quietAfter(storm.wave)) startNextStorm(world);
}

/** Walking over a piece picks it up. */
function collectSamples(world: WorldState): void {
  const storm = world.storm;
  if (storm.samples.length === 0 || world.playerMode !== 'astronaut' || !world.astronaut.grounded || world.astronaut.health <= 0) return;
  const planet = planetAt('home', world.system);
  const here = relative(world.astronaut.position, planet);
  if (Math.hypot(here.x, here.y) > planet.radius + 40) return;
  const angle = surfaceAngle(planet, world.astronaut.position);
  const near = storm.samples.filter(s => Math.abs(wrap(s.angle - angle)) * planet.radius <= PICKUP_REACH);
  if (near.length === 0) return;
  storm.samples = storm.samples.filter(s => !near.includes(s));
  storm.held += near.length;
  notify(world, near.length === 1 ? 'Picked up a piece of the storm. Analyse it in Base.' : `Picked up ${near.length} pieces of the storm.`);
}

export type StormAction = { type: 'analyseSample' };
export const isStormAction = (action: { type: string }): action is StormAction => action.type === 'analyseSample';

/** Spend a piece and a little power to learn how to harden buildings against blasts. */
export function applyStormAction(world: WorldState, action: StormAction): void {
  void action;
  const storm = world.storm;
  if (storm.analysed) {
    notify(world, 'You have already learned what this material can teach.');
    return;
  }
  if (storm.held <= 0) {
    notify(world, 'You need a piece of the storm. Walk over one on the ground.');
    return;
  }
  const lab = world.colony.buildings.find(b => b.kind === 'observatory' && operational(b));
  if (!lab) {
    notify(world, 'Analysis needs a working Observatory.');
    return;
  }
  if (world.colony.energy < ANALYSIS_ENERGY) {
    notify(world, `Analysis needs ${ANALYSIS_ENERGY} kJ stored (you have ${Math.floor(world.colony.energy)}).`);
    return;
  }
  world.colony.energy -= ANALYSIS_ENERGY;
  storm.held -= 1;
  storm.analysed = true;
  notify(world, 'Analysis done. Buildings now take less damage from blasts.');
}

/** After a quiet spell the sky fills again. The first storm's pieces stay where they are. */
function startNextStorm(world: WorldState): void {
  const storm = world.storm;
  storm.wave += 1;
  storm.phase = 'quiet';
  storm.far = [];
  storm.ids = [];
  storm.plan = [];
  storm.planned = false;
  storm.arrival = 0;
  storm.observed = 0;
  storm.endedAt = 0;
  notify(world, storm.wave === 2 ? 'The sky is changing. Another storm is forming.' : 'The Observatory sees another storm forming.');
}

/** Rocks stopped and landed so far, and how the home base stands. */
export function stormCounts(world: WorldState): StormCounts {
  const working = world.colony.buildings.filter(b => b.status !== 'wrecked' && (b.health ?? 100) > 0);
  return {
    stopped: world.defence.intercepted,
    landed: world.defence.impacts,
    standing: working.length,
    hurt: working.filter(b => (b.health ?? 100) < 100).length,
  };
}

/** What the storm that just ended did, from the counts taken when it closed in. */
function stormReport(world: WorldState): StormReport {
  const now = stormCounts(world);
  const then = world.storm.start ?? now;
  const lost = Math.max(0, then.standing - now.standing);
  return {
    wave: world.storm.wave,
    stopped: Math.max(0, now.stopped - then.stopped),
    landed: Math.max(0, now.landed - then.landed),
    damaged: Math.max(0, now.hurt - then.hurt),
    lost,
  };
}

const count = (n: number, one: string, many: string): string => `${n} ${n === 1 ? one : many}`;

/** "Storm 2 survived · 6 rocks stopped · 2 landed · 1 building damaged · none lost". */
export function reportLine(r: StormReport): string {
  const parts = [`Storm ${r.wave} survived`, `${count(r.stopped, 'rock', 'rocks')} stopped`, `${r.landed} landed`];
  if (r.damaged > 0) parts.push(`${count(r.damaged, 'building', 'buildings')} damaged`);
  parts.push(r.lost > 0 ? `${count(r.lost, 'building', 'buildings')} lost` : 'no buildings lost');
  return parts.join(' · ');
}
