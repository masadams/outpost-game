import { BODIES, nearestPlanet, relative, type BodyId } from './celestial';
import { colonyPlanet } from './localWorld';
import { wrap } from './math';
import { notify } from './messages';
import { seasOf } from './nature';
import { streamFor } from './seed';
import { WORKER } from './workerBay';
import type { WorldState } from './world';

/**
 * Weather on the far worlds. It follows a fixed rhythm for each world and seed, so it needs nothing saved:
 * dust storms on Ember, ash falls on Cinder, and tides on Tide that push the sea up the shore.
 */
export type WeatherKind = 'dust' | 'ash' | 'tide';

export interface WeatherSpec {
  kind: WeatherKind;
  /** Seconds from one start to the next. */
  period: number;
  /** Seconds it lasts, ramps included. */
  length: number;
  /** Seconds to build up and to die away. */
  ramp: number;
  /** Seconds of warning before it starts. */
  lead: number;
  /** Solar output at full strength (1 = unchanged). */
  solar: number;
  /** Rig output at full strength (1 = unchanged). */
  rigs: number;
  /** For tides: metres the sea climbs up the shore at high water. */
  reach: number;
}

export const WEATHER: Partial<Record<BodyId, WeatherSpec>> = {
  ember: { kind: 'dust', period: 600, length: 140, ramp: 20, lead: 45, solar: 0.3, rigs: 0.6, reach: 0 },
  cinder: { kind: 'ash', period: 760, length: 150, ramp: 30, lead: 40, solar: 0.55, rigs: 0.85, reach: 0 },
  tide: { kind: 'tide', period: 480, length: 200, ramp: 60, lead: 45, solar: 1, rigs: 1, reach: 70 },
};

export interface WeatherNow {
  body: BodyId;
  spec: WeatherSpec;
  /** 0 when calm, 1 at full strength. */
  strength: number;
  /** Seconds until it starts; 0 while it is on. */
  startsIn: number;
  /** Seconds until it ends, while it is on. */
  endsIn: number;
}

const phases = new Map<string, number>();
function phase(seed: number, body: BodyId, period: number): number {
  const key = `${seed}/${body}`;
  let value = phases.get(key);
  if (value === undefined) {
    value = streamFor(seed, `weather/${body}`)() * period;
    phases.set(key, value);
  }
  return value;
}

const rootOf = (world: WorldState): WorldState => world.rootWorld ?? world;

/** The weather on a world right now, or null for a world that has none. */
export function weatherOn(world: WorldState, body: BodyId): WeatherNow | null {
  const spec = WEATHER[body];
  if (!spec) return null;
  const root = rootOf(world);
  const t = root.system.time + phase(root.seed ?? 0, body, spec.period);
  const local = ((t % spec.period) + spec.period) % spec.period;
  if (local >= spec.length) return { body, spec, strength: 0, startsIn: spec.period - local, endsIn: 0 };
  const strength = Math.max(0, Math.min(1, local / spec.ramp, (spec.length - local) / spec.ramp));
  return { body, spec, strength, startsIn: 0, endsIn: spec.length - local };
}

/** Metres along the shore a sea wall keeps dry, either side of it. */
export const SEA_WALL_REACH = 150;

/** Whether a standing sea wall guards this spot. */
export function walled(world: WorldState, angle: number): boolean {
  const radius = colonyPlanet(world).radius;
  return world.colony.buildings.some(b => b.kind === 'seaWall' && (b.health ?? 100) > 0
    && Math.abs(wrap(b.angle - angle)) * radius <= SEA_WALL_REACH);
}

/** Whether high water covers this spot on Tide right now. */
export function flooded(world: WorldState, angle: number): boolean {
  if (walled(world, angle)) return false;
  const body = colonyPlanet(world).id;
  const now = weatherOn(world, body);
  if (!now || now.spec.kind !== 'tide' || now.strength <= 0) return false;
  const radius = BODIES[body].radius;
  const climb = now.spec.reach * now.strength;
  return seasOf(body, rootOf(world).seed ?? 0).some(sea => (Math.abs(wrap(angle - sea.angle)) - sea.half) * radius <= climb);
}

/** Whether a worker drone is near enough to sweep dust or ash off a panel at this spot. */
function swept(world: WorldState, angle: number): boolean {
  const radius = colonyPlanet(world).radius;
  return world.colony.buildings.some(b => b.kind === 'workerBay' && b.enabled && (b.health ?? 100) > 0
    && Math.abs(wrap(b.angle - angle)) * radius <= WORKER.reach);
}

/**
 * Multiplier on a solar array's output from the weather where it stands. A worker drone in reach sweeps the panels,
 * so they lose only half as much.
 */
export function weatherSolar(world: WorldState, angle?: number): number {
  const now = weatherOn(world, colonyPlanet(world).id);
  if (!now || now.strength <= 0) return 1;
  const loss = (1 - now.spec.solar) * now.strength;
  return 1 - (angle !== undefined && swept(world, angle) ? loss / 2 : loss);
}

/** Multiplier on what a mining rig brings up. */
export function weatherRigs(world: WorldState): number {
  const now = weatherOn(world, colonyPlanet(world).id);
  if (!now || now.strength <= 0) return 1;
  return 1 - (1 - now.spec.rigs) * now.strength;
}

const WORDS: Record<WeatherKind, { name: string; coming: string; here: string; gone: string }> = {
  dust: { name: 'Dust storm', coming: 'PANELS WILL DIM', here: 'PANELS DIM AND RIGS SLOW', gone: 'THE DUST HAS SETTLED' },
  ash: { name: 'Ash fall', coming: 'PANELS WILL DIM', here: 'ASH DIMS THE PANELS', gone: 'THE ASH HAS SETTLED' },
  tide: { name: 'High tide', coming: 'THE SHORE WILL FLOOD', here: 'BUILDINGS ON THE SHORE STOP UNTIL IT EBBS', gone: 'THE TIDE HAS GONE OUT' },
};

/** The world the pilot is on or close above, if any. */
function pilotBody(root: WorldState): BodyId | null {
  const at = root.playerMode === 'astronaut' ? root.astronaut.position : root.ship.position;
  const planet = nearestPlanet(at, root.system);
  const offset = relative(at, planet);
  return Math.hypot(offset.x, offset.y) - planet.radius < 2000 ? (planet.id as BodyId) : null;
}

/** Worlds whose weather is worth a notice: where the pilot is, and where an outpost stands. */
function watched(root: WorldState): BodyId[] {
  const bodies = new Set<BodyId>();
  const here = pilotBody(root);
  if (here) bodies.add(here);
  for (const [id, outpost] of Object.entries(root.outposts)) {
    if (outpost && outpost.colony.buildings.length > 0) bodies.add(id as BodyId);
  }
  return [...bodies].filter(b => WEATHER[b]);
}

type Stage = 'calm' | 'warned' | 'on';
const stages = new WeakMap<WorldState, Map<BodyId, Stage>>();

/** Says when weather is coming, has arrived and has passed, on the worlds the player cares about. */
export function stepWeather(source: WorldState): void {
  const root = rootOf(source);
  let known = stages.get(root);
  const fresh = !known;
  if (!known) {
    known = new Map();
    stages.set(root, known);
  }
  for (const body of watched(root)) {
    const now = weatherOn(root, body)!;
    const stage: Stage = now.strength > 0 ? 'on' : now.startsIn <= now.spec.lead ? 'warned' : 'calm';
    const before = known.get(body);
    known.set(body, stage);
    // Coming back to a world, or loading a game, sets the stage quietly.
    if (fresh || before === undefined || before === stage) continue;
    const words = WORDS[now.spec.kind];
    const where = BODIES[body].label.toUpperCase();
    if (stage === 'warned') notify(root, `${words.name.toUpperCase()} ON ${where} IN ${Math.ceil(now.startsIn)} S · ${words.coming}`, 6);
    else if (stage === 'on') notify(root, `${words.name.toUpperCase()} ON ${where} · ${words.here}`, 6);
    else notify(root, `${words.gone} ON ${where}`, 4);
  }
}

/** The HUD chip for weather where the pilot is: coming soon or on now. */
export function weatherChip(source: WorldState): { label: string; detail: string; active: boolean } | null {
  const root = rootOf(source);
  const body = pilotBody(root);
  if (!body) return null;
  const now = weatherOn(root, body);
  if (!now) return null;
  const name = WORDS[now.spec.kind].name;
  if (now.strength > 0) {
    const effect = now.spec.kind === 'tide' ? 'Shore flooded' : `Panels at ${Math.round(100 * (1 - (1 - now.spec.solar) * now.strength))}%`;
    return { label: name, detail: `${effect} · ${Math.ceil(now.endsIn)} s left`, active: true };
  }
  if (now.startsIn <= now.spec.lead) return { label: name, detail: `In ${Math.ceil(now.startsIn)} s`, active: false };
  return null;
}
