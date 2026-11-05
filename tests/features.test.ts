import { afterEach, describe, expect, it } from 'vitest';
import {
  actionAllowed,
  blueprintVisible,
  featureMode,
  featureVisible,
  filterActions,
  FOCUS_BLUEPRINTS,
  setFeatureMode,
} from '../src/preferences/features';
import { BUILD_TYPES } from '../src/sim/colonyConfig';
import type { ColonyAction } from '../src/sim/colony';

afterEach(() => setFeatureMode(null));

describe('focus feature set', () => {
  it('defaults to the focus set without a browser override', () => {
    setFeatureMode(null);
    expect(featureMode()).toBe('focus');
  });

  it('keeps the first-sortie buildings on number keys 1–5', () => {
    expect(BUILD_TYPES.slice(0, 5)).toEqual(FOCUS_BLUEPRINTS.slice(0, 5));
    for (const kind of BUILD_TYPES) expect(blueprintVisible(kind, 'focus')).toBe(FOCUS_BLUEPRINTS.includes(kind));
    for (const kind of BUILD_TYPES) expect(blueprintVisible(kind, 'all')).toBe(true);
  });

  it('allows the core sortie and construction actions', () => {
    const allowed: ColonyAction[] = [
      { type: 'toggleBuild' },
      { type: 'place' },
      { type: 'demolish' },
      { type: 'toggleMachine' },
      { type: 'cycleRecipe' },
      { type: 'recoverShip' },
      { type: 'repairBuilding' },
      { type: 'select', kind: 'refinery' },
      { type: 'queueBuild', kind: 'solar', angle: 0.1 },
      { type: 'navigate', target: 'home' },
      { type: 'crewOrder', operation: 'build' },
      { type: 'remote', id: 1, operation: 'toggle' },
    ];
    for (const action of allowed) expect(actionAllowed(action, 'focus'), action.type).toBe(true);
  });

  it('ignores hidden systems in the focus set but not with all features', () => {
    const hidden: ColonyAction[] = [
      { type: 'startWave' },
      { type: 'startEncounter' },
      { type: 'cycleWeapon' },
      { type: 'toggleTow' },
      { type: 'toggleAuto' },
      { type: 'autopilot', operation: 'cancel' },
      { type: 'upgradeBuilding', id: 1, level: 2 },
      { type: 'researchStart', tech: 'materials' },
      { type: 'toggleSchedule' },
      { type: 'select', kind: 'laser' },
      { type: 'queueBuild', kind: 'shieldSmall', angle: 0 },
      { type: 'navigate', target: 'moon' },
      { type: 'remote', id: 1, operation: 'schedule' },
    ];
    for (const action of hidden) {
      expect(actionAllowed(action, 'focus'), action.type).toBe(false);
      expect(actionAllowed(action, 'all'), action.type).toBe(true);
    }
    expect(filterActions(hidden, 'focus')).toEqual([]);
    expect(filterActions(hidden, 'all')).toHaveLength(hidden.length);
  });

  it('hides named features only in the focus set', () => {
    expect(featureVisible('combat', 'focus')).toBe(false);
    expect(featureVisible('combat', 'all')).toBe(true);
  });
});
