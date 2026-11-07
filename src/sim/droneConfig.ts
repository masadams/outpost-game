/**
 * The mining drone bay: a small drone that flies out to the nearest seam, mines and hauls ore back on a timer.
 * Slower than a rig sitting on a seam, but it needs no seam under it. Each trip burns fuel and wears the bay.
 */
export const DRONE = {
  power: 3,
  /** Seconds of powered work per trip. A rig makes 0.25 ore/s; a drone about a third of that. */
  seconds: 30,
  yield: 2.5,
  /** Metres from the bay to the nearest edge of a seam. */
  reach: 300,
  fuel: 0.4,
  wear: 3,
  /** Below this hull the drone will not fly until the bay is repaired. */
  grounded: 20,
} as const;
