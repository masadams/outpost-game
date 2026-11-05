import { describe, expect, it } from 'vitest';
import { mixColor, skyLook } from '../src/render/lighting';

describe('sky look', () => {
  it('mixes colours per channel', () => {
    expect(mixColor(0x000000, 0xffffff, 0.5)).toBe(0x808080);
    expect(mixColor(0xff0000, 0x0000ff, 0)).toBe(0xff0000);
    expect(mixColor(0xff0000, 0x0000ff, 2)).toBe(0x0000ff);
  });

  it('gets darker and starrier as the light goes, but never fully black', () => {
    const day = skyLook(1);
    const night = skyLook(0);
    expect(night.stars).toBeGreaterThan(day.stars);
    expect(night.atmosphere).toBeLessThan(day.atmosphere);
    expect(night.world).toBeLessThan(day.world);
    expect(night.world).toBeGreaterThan(0.5);
    expect(day.planetTint).toBe(0xffffff);
    expect(night.background).not.toBe(0);
  });
});
