const PLANET_RADIUS = 1800;
export const WORLD = {
  radius: PLANET_RADIUS, mu: 5 * PLANET_RADIUS ** 2, minimumRadius: PLANET_RADIUS,
  padAngle: 0, padHalfWidth: 30, shipRadius: 7,
  dryMass: 900, fuelCapacity: 240, burnRate: 0.8, thrust: 14_000,
  angularAcceleration: 3.2, angularDamping: 3, maxAngularSpeed: 1.7,
  safeRadialSpeed: 6, safeTangentialSpeed: 4, safeTilt: Math.PI / 12,
  safeAngularSpeed: 0.35,
} as const;
export const ATMOSPHERE = { height: 1200, scaleHeight: 320, surfaceDensity: 0.08, shipDragArea: 8, suitDragArea: 0.7, suitMass: 100 } as const;
export const STEP = 1 / 60;

/** Seconds for Selene to turn once relative to its star: one day. Planets only turn when the day cycle is on (`system.sun`). */
export const DAY_LENGTH = 1000;
