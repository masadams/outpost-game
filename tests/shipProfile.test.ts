import { describe, expect, it } from 'vitest';
import { createShip } from '../src/sim/physics';
import { shipProfile, shipRole } from '../src/sim/shipProfile';
import type { UpgradeId } from '../src/sim/progressionConfig';

const fit = (...parts: UpgradeId[]) => ({ equipment: parts });

describe('ship profile', () => {
  it('the standard ship is a lander, not a specialist', () => {
    expect(shipRole(createShip()).role).toBe('Standard lander');
  });

  it('a heavier hold costs lift; a lighter drive-and-tank build gains range', () => {
    const base = shipProfile(createShip());
    const hauler = shipProfile(fit('bulkHold'));
    expect(hauler.hold).toBeGreaterThan(base.hold);
    expect(hauler.loadedLift).toBeLessThan(base.loadedLift * 1.01);
    const scout = shipProfile(fit('efficientEngine', 'surveyTank'));
    expect(scout.deltaV).toBeGreaterThan(base.deltaV);
  });

  it('builds read as their jobs', () => {
    expect(shipRole(fit('efficientEngine', 'surveyTank', 'lightHold')).role).toBe('Scout');
    expect(shipRole(fit('bulkHold', 'deepMining', 'precisionTractor')).role).toBe('Miner');
    expect(shipRole(fit('engine', 'heavyCoil', 'layeredArmour')).role).toBe('Interceptor');
  });

  it('a mixed fit is called a hybrid, never a free win', () => {
    const mixed = shipRole(fit('efficientEngine', 'surveyTank', 'bulkHold', 'deepMining'));
    expect(['Hybrid', 'Scout', 'Miner']).toContain(mixed.role);
  });
});

import { createWorld } from '../src/sim/world';
import { roleLine } from '../src/ui/shipFitting';

describe('fitting screen role line', () => {
  it('says what a selected part would turn the ship into', () => {
    const w = createWorld();
    const line = roleLine(w, 'tank', 'surveyTank', false);
    expect(line).toMatch(/Still a standard lander|Turns your standard lander into a/);
    w.ship.equipment = ['efficientEngine', 'surveyTank', 'lightHold'];
    expect(roleLine(w, 'tank', 'surveyTank', true)).toMatch(/Scout/);
  });
});

import { engineStats, fuelCapacity, cargoCapacity, damageFactor, miningStats, tractorStats, cannonStats, thermalStats } from '../src/sim/shipStats';
import { flightComputer } from '../src/sim/autopilotConfig';

describe('the second set of ship parts', () => {
  const one = (part: UpgradeId) => ({ equipment: [part] });

  it('each part does what it says against the standard ship', () => {
    const base = engineStats({ equipment: [] });
    expect(engineStats(one('afterburner')).thrust).toBeCloseTo(base.thrust * 1.6, 6);
    expect(engineStats(one('afterburner')).burn).toBeGreaterThan(base.burn * 1.6);
    expect(fuelCapacity(one('dropTank'))).toBe(fuelCapacity({ equipment: [] }) + 200);
    expect(cargoCapacity(one('cargoBay'))).toBe(cargoCapacity({ equipment: [] }) + 140);
    expect(miningStats(one('pulseMiner'))).toMatchObject({ rate: 2.2, range: 500 });
    expect(tractorStats(one('wideTractor'))).toMatchObject({ range: 400 });
    expect(cannonStats(one('railCoil')).damage).toBe(40);
    expect(thermalStats(one('radiatorFins')).cooling).toBe(34);
    expect(damageFactor(one('ablativePlating'))).toBe(0.5);
    expect(flightComputer(one('missionComputer'))).toMatchObject({ tier: 3, power: 2 });
  });

  it('every part beats the one before it in some way and pays for it in another', () => {
    const base = shipProfile({ equipment: [] });
    expect(shipProfile(one('afterburner')).lift).toBeGreaterThan(base.lift);
    expect(shipProfile(one('afterburner')).deltaV).toBeLessThan(base.deltaV * 1.05);
    expect(shipProfile(one('cargoBay')).hold).toBeGreaterThan(base.hold);
    expect(shipProfile(one('cargoBay')).loadedLift).toBeLessThan(base.loadedLift);
    expect(shipProfile(one('dropTank')).deltaV).toBeGreaterThan(base.deltaV);
  });
});
