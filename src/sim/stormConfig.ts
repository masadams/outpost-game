import type { Vec } from './math';

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

/** Seconds of quiet after the first storm before the second is on its way. */
export const SECOND_STORM_DELAY = 500;

export const stormFor = (wave: 1 | 2): typeof STORM | typeof STORM_2 => (wave === 2 ? STORM_2 : STORM);

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
  wave: 1 | 2;
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
