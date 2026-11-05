import { planetAt, relative, type SystemFrame } from './celestial';
import { WORLD } from './config';
import { localAngle, heading, wrap, type Vec } from './math';
import { predictMeteor } from './meteor';
import { notify } from './messages';
import { seeded } from './random';
import { STORM, type FarBody } from './stormConfig';
import type { Meteor } from './defenceConfig';
import type { WorldState } from './world';

/** The state a body has when it is handed to the detailed meteor physics. */
function entryMeteor(id: number, angle: number, tangential: number, system: SystemFrame, radius: number, mass: number): Meteor {
  const planet = planetAt('home', system);
  const up = heading(angle);
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
  return localAngle(relative(result.impact, planet));
}

function landing(meteor: Meteor, system: SystemFrame): { angle: number; time: number } | null {
  const result = predictMeteor(meteor, 300, system);
  if (!result.impact) return null;
  const planet = planetAt('home', { ...system, time: system.time + result.seconds });
  return { angle: localAngle(relative(result.impact, planet)), time: system.time + result.seconds };
}

/** Adjust the sideways speed until the body comes down where it is meant to. */
function aimTangential(angle: number, system: SystemFrame, radius: number, mass: number): number {
  const error = (tangential: number): number | null => {
    const landed = landingAngle(entryMeteor(0, angle, tangential, system, radius, mass), system);
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
  const storm = world.storm;
  if (storm.planned) return;
  storm.planned = true;
  if (storm.arrival <= 0) storm.arrival = STORM.arrivalTime;
  const rand = seeded(STORM.seed);
  const home = planetAt('home', world.system);
  for (let i = 0; i < STORM.aim.length; i++) {
    const entryTime = storm.arrival + i * STORM.spacing;
    const system = { ...world.system, time: entryTime };
    const target = WORLD.padAngle + (STORM.targetOffset + STORM.aim[i] + (rand() - 0.5) * 8) / home.radius;
    const tangential = aimTangential(target, system, STORM.radii[i], STORM.masses[i]);
    const meteor = entryMeteor(world.nextId++, target, tangential, system, STORM.radii[i], STORM.masses[i]);
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
      impactAngle: fall?.angle ?? null,
      impactTime: fall?.time ?? null,
    });
  }
}

/** Where a body in the far field is at a given time. */
export function farPosition(body: FarBody, time: number): Vec {
  const back = body.entryTime - time;
  return { x: body.entry.x - body.velocity.x * back, y: body.entry.y - body.velocity.y * back };
}

/** Advances the storm one step: plan it, hand arriving bodies to the meteor physics, notice when it is over. */
export function stepStorm(world: WorldState): void {
  const storm = world.storm;
  const time = world.system.time;
  if (!storm.armed) {
    // Building an Observatory is what starts the story.
    if (!world.colony.buildings.some(b => b.kind === 'observatory')) return;
    storm.armed = true;
  }
  if (!storm.planned) {
    // Never sooner than the fixed first-storm time, and always with the full warning window ahead.
    storm.arrival = Math.max(STORM.arrivalTime, time + STORM.lead + 30);
    planStorm(world);
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
      health: 1,
      maxHealth: 1,
    });
    if (storm.far.length + 1 === STORM.aim.length) notify(world, 'Something large is coming down.');
  }
  const clear = world.defence.meteors.length === 0 && world.defence.projectiles.length === 0;
  if (storm.phase === 'approaching' && storm.far.length === 0 && clear) storm.phase = 'over';
}
