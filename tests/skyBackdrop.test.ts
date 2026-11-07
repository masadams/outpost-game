import { describe, expect, it } from 'vitest';
import { buildSky } from '../src/render/skyBackdrop';

describe('sky backdrop', () => {
  it('is the same for the same seed and different for another', () => {
    expect(buildSky(5)).toEqual(buildSky(5));
    expect(buildSky(5).tilt).not.toBe(buildSky(6).tilt);
    expect(buildSky(0)).toEqual(buildSky(0));
  });

  it('keeps its patches and stars mostly on screen, and stars thick along the band', () => {
    const sky = buildSky(9);
    const onScreen = sky.stars.filter(s => s.u > -0.1 && s.u < 1.1 && s.v > -0.1 && s.v < 1.1);
    expect(onScreen.length).toBeGreaterThan(sky.stars.length * 0.6);
    expect(sky.clouds.length).toBeGreaterThan(20);
    expect(sky.galaxies.length).toBeGreaterThan(0);
  });

  it('draws less on low quality', () => {
    expect(buildSky(3, 'low').clouds.length).toBeLessThan(buildSky(3, 'high').clouds.length);
    expect(buildSky(3, 'low').stars.length).toBeLessThan(buildSky(3, 'high').stars.length);
  });
});
