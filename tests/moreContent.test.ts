import { describe, expect, it } from 'vitest';
import { createWorld, type WorldState } from '../src/sim/world';
import { stepColony, oreCapacity, productCapacity } from '../src/sim/colony';
import { completedBuilding } from '../src/sim/construction';
import { STEP } from '../src/sim/config';
import { colonyWorld } from '../src/sim/localWorld';
import { blueprintRevealed } from '../src/sim/unlocks';
import { GEOTHERMAL, WIND, PHOTOVOLTAIC_GAIN, generatorOutput } from '../src/sim/generators';
import { MASS_DRIVER, watchBoost } from '../src/sim/airMachines';
import { podTerms, POD } from '../src/sim/pods';
import { TECH_IDS, TECHNOLOGIES } from '../src/sim/progressionConfig';
import { TECH_POSITIONS } from '../src/ui/techTree';
import { TIER3_FAMILY } from '../src/sim/tiers';
import { stationPosition } from '../src/sim/stations';
import { repairBuilding } from '../src/sim/buildingDamage';

const run = (w: WorldState, s: number) => { for (let i = 0; i < Math.round(s / STEP); i++) stepColony(w, STEP); };
const done = (w: WorldState, ...techs: string[]) => { w.colony.research.completed.push(...(techs as never[])); };

describe('the tree is consistent', () => {
  it('every technology has its own place, real prerequisites and no loops', () => {
    expect(new Set(TECH_IDS.map(id => TECH_POSITIONS[id].join(','))).size).toBe(TECH_IDS.length);
    for (const id of TECH_IDS) for (const req of TECHNOLOGIES[id].requires) expect(TECH_IDS).toContain(req);
    const depth = (id: (typeof TECH_IDS)[number], seen: string[] = []): number => {
      expect(seen).not.toContain(id);
      return 1 + Math.max(0, ...TECHNOLOGIES[id].requires.map(r => depth(r, [...seen, id])));
    };
    for (const id of TECH_IDS) expect(depth(id)).toBeLessThan(12);
  });

  it('tier III family technologies all exist', () => {
    for (const tech of Object.values(TIER3_FAMILY)) expect(TECH_IDS).toContain(tech);
  });
});

describe('new generators', () => {
  it('a geothermal tap makes steady power at night; wind follows the air', () => {
    const w = createWorld();
    w.system.sun = true;
    w.colony.buildings.push(completedBuilding(1, 'geothermal', 0.2, w), completedBuilding(2, 'windTurbine', 0.3, w));
    expect(generatorOutput(w, w.colony.buildings[0])).toBeCloseTo(GEOTHERMAL.power, 6);
    expect(generatorOutput(w, w.colony.buildings[1])).toBeCloseTo(WIND.power, 6);
    const nacre = colonyWorld(w, 'moon');
    const turbine = completedBuilding(1001, 'windTurbine', 0.3, nacre);
    const tap = completedBuilding(1002, 'geothermal', 0.35, nacre);
    expect(generatorOutput(nacre, turbine)).toBe(0);
    expect(generatorOutput(nacre, tap)).toBeCloseTo(GEOTHERMAL.power, 6);
  });

  it('their power reaches the base and feeds the colony', () => {
    const w = createWorld();
    w.colony.buildings.push(completedBuilding(1, 'geothermal', 0.12, w));
    w.colony.energy = 0;
    run(w, 3);
    expect(w.colony.generation).toBeCloseTo(GEOTHERMAL.power, 3);
    expect(w.colony.energy).toBeGreaterThan(10);
  });

  it('Photovoltaics makes solar arrays 20% better', () => {
    const w = createWorld();
    const solar = completedBuilding(1, 'solar', 0.2, w);
    const before = generatorOutput(w, solar);
    done(w, 'photovoltaics');
    expect(generatorOutput(w, solar)).toBeCloseTo(before * PHOTOVOLTAIC_GAIN, 6);
  });
});

describe('perks', () => {
  it('Deep storage, Field repair, Lab automation and Survey optics do what they say', () => {
    const w = createWorld();
    w.colony.buildings.push(completedBuilding(1, 'storage', 0.2, w));
    const ore = oreCapacity(w.colony);
    const products = productCapacity(w.colony);
    done(w, 'deepStorage');
    expect(oreCapacity(w.colony)).toBeCloseTo(400 + (ore - 400) * 1.25, 6);
    expect(productCapacity(w.colony)).toBeCloseTo(100 + (products - 100) * 1.25, 6);
    expect(watchBoost(w)).toBe(1);
    done(w, 'surveyOptics');
    expect(watchBoost(w)).toBeCloseTo(1.25, 6);
  });

  it('Field repair halves the alloy a repair costs', () => {
    const w = createWorld();
    const b = completedBuilding(1, 'solar', 0.2, w);
    b.health = 50;
    w.colony.buildings.push(b);
    w.playerMode = 'astronaut';
    w.astronaut.grounded = true;
    w.astronaut.position = stationPosition(0.2);
    const alloy = w.colony.products.alloy;
    done(w, 'fieldRepair');
    repairBuilding(w);
    expect(b.health).toBe(100);
    expect(alloy - w.colony.products.alloy).toBeCloseTo(2.5, 6);
  });
});

describe('mass driver', () => {
  it('pods leave on less fuel and carry more once a driver is running', () => {
    const w = createWorld();
    w.colony.buildings.push(completedBuilding(1, 'solar', 0.12, w), completedBuilding(2, 'solar', 0.15, w), completedBuilding(3, 'massDriver', 0.25, w), completedBuilding(4, 'battery', 0.35, w));
    expect(podTerms(w)).toEqual({ capacity: POD.capacity, fuel: POD.fuel, fuelPerKg: POD.fuelPerKg });
    w.colony.energy = 20;
    run(w, 2);
    const terms = podTerms(w);
    expect(terms.capacity).toBe(MASS_DRIVER.capacity);
    expect(terms.fuel).toBeCloseTo(POD.fuel * MASS_DRIVER.fuelShare, 6);
  });
});

describe('earning the new buildings', () => {
  it('each opens with its technology', () => {
    const w = createWorld();
    for (const [kind, tech] of [['geothermal', 'geoscience'], ['windTurbine', 'aeronautics'], ['massDriver', 'massDrivers']] as const) {
      expect(blueprintRevealed(w, kind)).toBe(false);
      done(w, tech);
      expect(blueprintRevealed(w, kind)).toBe(true);
    }
  });
});
