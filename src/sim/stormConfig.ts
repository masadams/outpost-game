import type { Vec } from './math';
import { streamFor } from './seed';

/** Numbers for the first storm. Times are simulation seconds from the start of a game. */
export const STORM = {
  seed: 7,
  /** The first body reaches the local region (handed to the meteor physics) at this time: early on the second day, in daylight with the sun on, so solar can power the turrets. */
  arrivalTime: 1150,
  /** Bodies travel this many seconds in the far field before that, which is the warning window. */
  lead: 420,
  /** Distance from the planet centre at which a body is handed to the detailed physics. */
  entryRadius: 14000,
  /** Speed on entry, metres per second, relative to the planet. */
  entrySpeed: 105,
  /** Seconds between the first and each later body's arrival. */
  spacing: 1.6,
  /** Where the storm is aimed, as metres from the pad along the surface. */
  targetOffset: 140,
  /** Aim offsets for each body, in metres along the surface from the target. One is a deliberate miss. */
  aim: [0, -35, 60, 130, -45, 260, -520],
  radii: [18, 7, 9, 6, 10, 7, 8],
  masses: [2400, 260, 480, 190, 600, 260, 340],
  /** Toughness: a laser shot does 0.28, so the big one takes over twenty. */
  health: [6, 2.4, 3, 1.8, 3.3, 2.4, 2.7],
} as const;

/** The second storm: more bodies, faster, with small tough ones that are hard to hit with a laser. Missiles help. */
export const STORM_2 = {
  seed: 23,
  /** Starts when planned (after the quiet spell), not at a fixed time. */
  arrivalTime: 0,
  lead: 420,
  entryRadius: 14000,
  entrySpeed: 130,
  spacing: 1.2,
  targetOffset: -80,
  aim: [0, 40, -50, 90, -110, 160, -190, 300, -420],
  radii: [14, 8, 8, 10, 7, 9, 6, 8, 7],
  masses: [1500, 380, 360, 520, 240, 420, 200, 340, 260],
  health: [5, 3.6, 3.6, 4.2, 3, 3.8, 2.6, 3.4, 3],
} as const;

/** Seconds of quiet after a storm before the next is on its way: a long spell at first, never shorter than this. */
export const SECOND_STORM_DELAY = 500;
export const quietAfter = (wave: number): number => SECOND_STORM_DELAY + 120 * Math.min(wave, LATER_STORM_LIMIT);

/** The numbers one storm runs on. */
export interface StormConfig {
  readonly seed: number; readonly arrivalTime: number; readonly lead: number; readonly entryRadius: number; readonly entrySpeed: number;
  readonly spacing: number; readonly targetOffset: number; readonly aim: readonly number[]; readonly radii: readonly number[];
  readonly masses: readonly number[]; readonly health: readonly number[];
  /** What each body is meant to do; missing means every one is aimed at the zone. 'miss' passes by, 'large' is one big body. */
  readonly kinds?: readonly BodyKind[];
}
export type BodyKind = 'hit' | 'miss' | 'large' | 'giant';

/** The rare giant: from the fourth storm, aimed at the base. Toughness is per metre of radius. */
export const GIANT = { chance: 0.35, radius: 40, toughness: 0.8 } as const;

/** Storms past the second keep the second's pattern, with more bodies and a little more of everything, up to a limit. */
export const LATER_STORM_LIMIT = 9;

/**
 * The storm for a wave. Seed 0 is the standard storm, always the same. Any other seed adds strays from the second
 * storm on: bodies that pass by and miss, and from the third a rare big one that comes down well away from the base.
 */
export function stormFor(wave: number, seed = 0): StormConfig {
  const base = baseStormFor(wave);
  if (seed === 0 || wave < 2) return base;
  const rand = streamFor(seed, `storm-strays/${wave}`);
  const aim: number[] = [...base.aim];
  const radii: number[] = [...base.radii];
  const masses: number[] = [...base.masses];
  const health: number[] = [...base.health];
  const kinds: BodyKind[] = base.aim.map(() => 'hit');
  const misses = (rand() < 0.65 ? 1 : 0) + (rand() < 0.2 ? 1 : 0);
  for (let i = 0; i < misses; i++) {
    aim.push(0);
    const r = 7 + rand() * 5;
    radii.push(r);
    masses.push(Math.round(0.4 * r ** 3));
    health.push(2.5 + rand());
    kinds.push('miss');
  }
  if (wave >= 3 && rand() < 0.4) {
    const side = base.targetOffset >= 0 ? 1 : -1;
    aim.push(side * (600 + rand() * 800));
    const r = 24 + rand() * 10;
    radii.push(r);
    masses.push(Math.round(0.41 * r ** 3));
    health.push(Math.round(r * 4) / 10);
    kinds.push('large');
  }
  if (wave >= 4 && rand() < GIANT.chance) {
    // The big one: aimed close to the base. No laser will stop it in time; missiles can.
    const side = rand() < 0.5 ? -1 : 1;
    aim.push(-base.targetOffset + side * (40 + rand() * 100));
    const r = GIANT.radius + rand() * 8;
    radii.push(r);
    masses.push(Math.round(0.41 * r ** 3));
    health.push(Math.round(r * GIANT.toughness * 10) / 10);
    kinds.push('giant');
  }
  return { ...base, aim, radii, masses, health, kinds };
}

function baseStormFor(wave: number): StormConfig {
  if (wave <= 1) return STORM;
  if (wave === 2) return STORM_2;
  const grow = Math.min(wave, LATER_STORM_LIMIT) - 2;
  const extra = Math.min(grow * 2, 10);
  const aim: number[] = [...STORM_2.aim];
  const radii: number[] = [...STORM_2.radii];
  const masses: number[] = [...STORM_2.masses];
  const health: number[] = [...STORM_2.health];
  for (let i = 0; i < extra; i++) {
    const from = i % STORM_2.aim.length;
    aim.push(STORM_2.aim[from] * (i % 2 ? -0.8 : 1.2) + (i + 1) * 15);
    radii.push(STORM_2.radii[from]);
    masses.push(STORM_2.masses[from]);
    health.push(STORM_2.health[from]);
  }
  const scale = 1 + 0.1 * grow;
  return {
    ...STORM_2, seed: STORM_2.seed + wave * 7, aim, radii: radii.map(r => r * Math.min(1.3, scale)),
    masses: masses.map(m => m * scale ** 3), health: health.map(h => h * scale),
  };
}

/** A body still travelling in the far field. Straight line at constant velocity. */
export interface FarBody {
  id: number;
  /** Position at `entryTime` (the moment it is handed to the detailed physics). */
  entry: Vec;
  velocity: Vec;
  entryTime: number;
  radius: number;
  mass: number;
  health: number;
  /** Where it will land (surface angle) and when, from the plan. Null if it misses the planet. The player never sees this directly. */
  impactAngle: number | null;
  impactTime: number | null;
}

export interface PlannedImpact { id: number; impactAngle: number | null; impactTime: number | null }

export interface StormState {
  phase: 'quiet' | 'approaching' | 'over';
  /** Bodies not yet handed to the meteor physics, soonest first. */
  far: FarBody[];
  /** Ids of every body of this storm, including those already in the meteor physics. */
  ids: number[];
  planned: boolean;
  /** When the first body reaches the local region; set when the storm is planned. */
  arrival: number;
  /** Seconds a powered Observatory has watched the storm bodies in the far field. */
  observed: number;
  /** What the plan says will happen, kept for the Observatory's estimates. The player never sees this directly. */
  plan: PlannedImpact[];
  /** The storm only happens once armed. Building an Observatory arms it. */
  armed: boolean;
  /** Pieces left on the ground where bodies came down. Walk over one to pick it up. */
  samples: StormSample[];
  /** Samples picked up and not yet analysed. */
  held: number;
  /** Once a sample has been analysed, buildings take less blast damage. */
  analysed: boolean;
  /** 1 for the first storm, 2 for the second. */
  wave: number;
  /** When the current storm ended (world seconds), for timing the next. */
  endedAt: number;
}

/** A piece of a storm body lying on the home planet's surface. */
export interface StormSample { id: number; angle: number }

/** Blast damage that gets through once impact material has been analysed. */
export const ANALYSED_DAMAGE_FACTOR = 0.6;
/** How close, in metres along the surface, the astronaut must be to pick a sample up. */
export const PICKUP_REACH = 5;
/** Energy the analysis uses, in kilojoules. */
export const ANALYSIS_ENERGY = 20;

export function createStorm(): StormState {
  return {
    phase: 'quiet', far: [], ids: [], planned: false, arrival: 0, observed: 0, plan: [], armed: false,
    samples: [], held: 0, analysed: false, wave: 1, endedAt: 0,
  };
}
