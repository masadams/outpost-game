import { describe, expect, it } from 'vitest';
import { createWorld, stepWorld } from '../src/sim/world';
import { nacreSurvey } from '../src/sim/nacreSurvey';
import { NACRE_SURVEY_SECONDS } from '../src/sim/observatory';
import { mapView } from '../src/ui/map/mapView';
import { actionAllowed } from '../src/preferences/features';

function watch(seconds: number, powered: boolean) {
  const w = createWorld();
  w.colony.generation = 0;
  w.colony.buildings.push({ id: 90, kind: 'observatory', angle: 0.1, enabled: true, progress: 0, recipe: 0, status: 'idle' } as never);
  if (powered) w.colony.buildings.push({ id: 91, kind: 'solar', angle: -0.1, enabled: true, progress: 0, recipe: 0, status: 'idle' } as never);
  w.colony.energy = 200;
  for (let i = 0; i < seconds * 4; i++) stepWorld(w, { thrust: false, turn: 0 }, 0.25);
  return w;
}

describe('surveying Nacre', () => {
  it('needs a powered Observatory watching long enough', () => {
    expect(nacreSurvey(watch(NACRE_SURVEY_SECONDS + 10, false))).toBeNull();
    expect(nacreSurvey(watch(NACRE_SURVEY_SECONDS / 2, true))).toBeNull();
    const w = watch(NACRE_SURVEY_SECONDS + 10, true);
    expect(w.exploration.nacreSurveyed).toBe(true);
    const survey = nacreSurvey(w)!;
    expect(survey.deposits).toMatch(/seams/);
  });

  it('opens Nacre on the Map and for navigation only once surveyed', () => {
    const fresh = createWorld();
    expect(mapView(fresh).places.some(p => p.id === 'moon')).toBe(false);
    expect(actionAllowed({ type: 'navigate', target: 'moon' }, 'focus', false)).toBe(false);
    expect(actionAllowed({ type: 'navigate', target: 'moon' }, 'focus', true)).toBe(true);
    fresh.exploration.nacreSurveyed = true;
    expect(mapView(fresh).places.some(p => p.id === 'moon')).toBe(true);
  });
});
