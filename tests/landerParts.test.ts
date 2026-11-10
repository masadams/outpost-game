import { describe, expect, it } from 'vitest';
import { fittedSlots } from '../src/render/ship';
import { PART_SLOTS, UPGRADES } from '../src/sim/progressionConfig';

describe('fitted parts drawn on the lander', () => {
  it('shows nothing extra on a bare lander', () => {
    expect(fittedSlots({ equipment: [] }).size).toBe(0);
  });

  it('shows each fitted slot once, whichever part fills it', () => {
    const slots = fittedSlots({ equipment: ['engine', 'tank', 'cargo'] });
    expect([...slots].sort()).toEqual(['drive', 'hold', 'tank']);
    expect(fittedSlots({ equipment: ['ionDrive'] }).has('drive')).toBe(true);
  });

  it('knows a slot for every part', () => {
    for (const id of Object.keys(UPGRADES) as Array<keyof typeof UPGRADES>) expect(PART_SLOTS).toContain(UPGRADES[id].slot);
  });
});
