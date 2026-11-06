import { describe, expect, it } from 'vitest';
import { LABEL_HIDE_ZOOM, LABEL_MIN_SCALE, labelScale } from '../src/ui/BuildingLabels';

describe('building labels when zooming out', () => {
  it('are full size up close, shrink as you zoom out, and hide when buildings are only dots', () => {
    expect(labelScale(1.5)).toBe(1);
    expect(labelScale(0.7)).toBe(1);
    expect(labelScale(0.5)).toBeLessThan(1);
    expect(labelScale(0.5)).toBeGreaterThan(LABEL_MIN_SCALE);
    expect(labelScale(0.25)).toBe(LABEL_MIN_SCALE);
    expect(labelScale(LABEL_HIDE_ZOOM / 2)).toBe(0);
  });
});
