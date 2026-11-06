import { planetAt, relative, surfaceAngle, type SystemFrame } from './celestial';
import { WORLD } from './config';
import { localAngle, heading, wrap, type Vec } from './math';
import { predictMeteor } from './meteor';
import { notify } from './messages';
import { seeded } from './random';
import { operational } from './buildingHealth';
import { ANALYSIS_ENERGY, PICKUP_REACH, SECOND_STORM_DELAY, stormFor, type FarBody } from './stormConfig';
import type { Meteor } from './defenceConfig';
import type { WorldState } from './world';

/** The state a body has when it is handed to the detailed meteor physics. */
function entryMeteor(id: number, angle: number, tangential: number, system: SystemFrame, radius: number, mass: number, wave: 1 | 2): Meteor {
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

/** Where on the planet a fall from this state ends, as a surface angle, or null if it misses. */
function landingAngle(meteor: Meteor, system: SystemFrame): number | null {
  const result = predictMeteor(meteor, 300, system);
  if (!result.impact) return null;
  const planet = planetAt('home', { ...system, time: system.time + result.seconds });
  return surfaceAngle(planet, result.impact);
}

function landing(meteor: Meteor, system: SystemFrame): { angle: number; time: number } | null {
  const result = predictMeteor(meteor, 300, system);
  if (!result.impact) return null;
  const planet = planetAt('home', { ...system, time: system.time + result.seconds });
  return { angle: surfaceAngle(planet, result.impact), time: system.time + result.seconds };
}

/** Adjust the sideways speed until the body comes down where it is meant to. */
function aimTangential(angle: number, system: SystemFrame, radius: number, mass: number, wave: 1 | 2): number {
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
export function planNextBody(world: WorldState): void {
  const storm = world.storm;
  const STORM = stormFor(storm.wave);
  if (storm.planned) return;
  if (storm.arrival <= 0) storm.arrival = STORM.arrivalTime;
  const i = storm.plan.length;
  const rand = seeded(STORM.seed);
  for (let j = 0; j < i; j++) rand();
  const home = planetAt('home', world.system);
  const entryTime = storm.arrival + i * STORM.spacing;
  const system = { ...world.system, time: entryTime };
  const target = WORLD.padAngle + (STORM.targetOffset + STORM.aim[i] + (rand() - 0.5) * 8) / home.radius;
  const tangential = aimTangential(target, system, STORM.radii[i], STORM.masses[i], storm.wave);
  const meteor = entryMeteor(world.nextId++, target, tangential, system, STORM.radii[i], STORM.masses[i], storm.wave);
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
    health: STORM.health[i],
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
  const STORM = stormFor(storm.wave);
  const time = world.system.time;
  if (!storm.armed) {
    // Building an Observatory is what starts the story.
    if (!world.colony.buildings.some(b => b.kind === 'observatory')) return;
    storm.armed = true;
  }
  if (!storm.planned) {
    // Never sooner than the fixed first-storm time, and always with the full warning window ahead.
    if (storm.plan.length === 0) storm.arrival = Math.max(STORM.arrivalTime, time + STORM.lead + 30);
    planNextBody(world);
    if (!storm.planned) return;
  }
  if (storm.phase === 'quiet' && time >= storm.arrival - STORM.lead) storm.phase = 'approaching';
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
    if (storm.samples.length > 0) notify(world, 'The sky is clear. Pieces of the storm are lying out on the ground.');
    else notify(world, 'The sky is clear.');
  }
  if (storm.phase === 'over') collectSamples(world);
  if (storm.phase === 'over' && storm.wave === 1 && time >= storm.endedAt + SECOND_STORM_DELAY) startSecondStorm(world);
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
function startSecondStorm(world: WorldState): void {
  const storm = world.storm;
  storm.wave = 2;
  storm.phase = 'quiet';
  storm.far = [];
  storm.ids = [];
  storm.plan = [];
  storm.planned = false;
  storm.arrival = 0;
  storm.observed = 0;
  storm.endedAt = 0;
  notify(world, 'The sky is changing. Another storm is forming.');
}
