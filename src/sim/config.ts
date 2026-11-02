export const WORLD = {
  radius: 600, mu: 1_800_000, minimumRadius: 120,
  padAngle: 0, padHalfWidth: 30, shipRadius: 7,
  dryMass: 900, fuelCapacity: 240, burnRate: 0.8, thrust: 14_000,
  angularAcceleration: 3.2, angularDamping: 3, maxAngularSpeed: 1.7,
  safeRadialSpeed: 6, safeTangentialSpeed: 4, safeTilt: Math.PI / 12,
  safeAngularSpeed: 0.35,
} as const;
export const STEP = 1 / 60;
