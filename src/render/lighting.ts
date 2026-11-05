/** Mix two 0xRRGGBB colours; t = 0 gives a, t = 1 gives b. */
export function mixColor(a: number, b: number, t: number): number {
  const k = Math.max(0, Math.min(1, t));
  const channel = (shift: number) => Math.round(((a >> shift) & 255) * (1 - k) + ((b >> shift) & 255) * k);
  return (channel(16) << 16) | (channel(8) << 8) | channel(0);
}

export interface SkyLook {
  background: number;
  /** 0 to 1: how much of the sky glow around the planet shows. */
  atmosphere: number;
  /** Multiplies the planet's colours. */
  planetTint: number;
  /** 0 to 1: how bright the stars are. */
  stars: number;
  /** 0 to 1: how bright everything drawn in the world is. */
  world: number;
}

/** What the sky and ground look like at a given share of daylight (1 = full sun, 0 = night). */
export function skyLook(daylight: number): SkyLook {
  const d = Math.max(0, Math.min(1, daylight));
  return {
    // A warm band at dusk and dawn: strongest when the light is half gone.
    background: mixColor(mixColor(0x02050b, 0x080f1c, d), 0x3a2236, 0.55 * 4 * d * (1 - d)),
    atmosphere: 0.12 + 0.88 * d,
    planetTint: mixColor(0x3a4658, 0xffffff, d),
    stars: 1 - 0.45 * d,
    world: 0.6 + 0.4 * d,
  };
}
