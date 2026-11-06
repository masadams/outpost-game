import { describe, expect, it } from 'vitest';
import { STAR, SUN, discCover, lightAt, lightAtPoint, starPosition, sunAngle } from '../src/sim/star';
import { daylightAt, solarFactor } from '../src/sim/sun';
import { planetAt } from '../src/sim/celestial';
import { heading } from '../src/sim/math';

const sys = (time: number) => ({ time, binary: true, sun: true });

describe('the star as a body', () => {
  it('is a real position far away, in the direction the day cycle says', () => {
    const p = starPosition(sys(0));
    expect(Math.hypot(p.x, p.y)).toBeCloseTo(STAR.distance, 0);
    const home = planetAt('home', sys(300));
    const light = lightAtPoint(sys(300), home.position, null);
    // The subsolar point is a surface angle; in the world it is turned by the planet's spin.
    const expected = heading(sunAngle(300) + home.spin);
    expect(light.direction.x).toBeCloseTo(expected.x, 3);
    expect(light.direction.y).toBeCloseTo(expected.y, 3);
  });

  it('gets brighter as the square of the distance falls, and is one at the home distance', () => {
    const star = starPosition(sys(0));
    const half = { x: star.x / 2, y: star.y / 2 };
    expect(lightAtPoint(sys(0), half, null).flux).toBeCloseTo(4, 1);
    const home = planetAt('home', sys(0));
    expect(lightAtPoint(sys(0), home.position, null).flux).toBeCloseTo(1, 2);
  });

  it('works out how much of a disc another disc covers', () => {
    expect(discCover(0.02, 0.05, 0.2)).toBe(0);
    expect(discCover(0.02, 0.05, 0.01)).toBe(1);
    expect(discCover(0.05, 0.02, 0)).toBeCloseTo(0.16, 5);
    const partial = discCover(0.02, 0.05, 0.05);
    expect(partial).toBeGreaterThan(0.1);
    expect(partial).toBeLessThan(0.9);
  });

  it('is high overhead at noon, hidden below the horizon at midnight, and the same everywhere with the sun off', () => {
    const noon = (0 - SUN.startAngle) / (Math.PI * 2) * SUN.dayLength;
    expect(lightAt(sys(noon), 'home', 0).elevation).toBeGreaterThan(0.99);
    expect(lightAt(sys(noon + SUN.dayLength / 2), 'home', 0).elevation).toBeLessThan(-0.99);
    expect(daylightAt({ time: 123, binary: true }, 0)).toBe(1);
  });

  it('is eclipsed by the moon now and then, and a solar panel notices', () => {
    let eclipse = -1;
    for (let t = 0; t < 8000; t += 1) {
      const angle = sunAngle(t);
      if (lightAt(sys(t), 'home', angle).eclipse > 0.95) {
        eclipse = t;
        break;
      }
    }
    expect(eclipse).toBeGreaterThan(0);
    const angle = sunAngle(eclipse);
    expect(solarFactor(sys(eclipse), angle)).toBeLessThan(0.1);
    expect(solarFactor(sys(eclipse - 200), sunAngle(eclipse - 200))).toBeGreaterThan(0.9);
  });

  it('lets the home planet eclipse the star for the moon, too', () => {
    let seen = false;
    for (let t = 0; t < 8000 && !seen; t += 1) seen = lightAt(sys(t), 'moon', sunAngle(t)).eclipse > 0.95;
    expect(seen).toBe(true);
  });
});
