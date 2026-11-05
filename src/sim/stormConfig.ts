import type { Vec } from './math';

/** Numbers for the first storm. Times are simulation seconds from the start of a game. */
export const STORM = {
  seed: 7,
  /** The first body reaches the local region (handed to the meteor physics) at this time. */
  arrivalTime: 1500,
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
}

export function createStorm(): StormState {
  return { phase: 'quiet', far: [], ids: [], planned: false, arrival: 0, observed: 0, plan: [], armed: false };
}
