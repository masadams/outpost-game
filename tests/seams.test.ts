import { describe, expect, it } from 'vitest';
import { createWorld, stepWorld } from '../src/sim/world';
import { completedBuilding } from '../src/sim/construction';
import { createSurfaceDeposits, GRADE_YIELD, RIG, seamGrade, seamKnown, SURVEYED_NEAR_PAD } from '../src/sim/geology';
import { placementError } from '../src/sim/colony';
import { groundVelocity, planetAt, surfacePosition } from '../src/sim/celestial';
import { stepMiningRig } from '../src/sim/surfaceExtraction';
import { decodeCheckpoint, encodeCheckpoint } from '../src/persistence/checkpoint';

const R = 1800;
function game() {
  const w = createWorld(4242);
  w.system.sun = true;
  w.asteroids = [];
  return w;
}

describe('ore seams', () => {
  it('come in grades, the same way every time, and keep the standard layout plain', () => {
    const a = createSurfaceDeposits(R, 'home', 4242);
    const b = createSurfaceDeposits(R, 'home', 4242);
    expect(a.map(d => d.grade)).toEqual(b.map(d => d.grade));
    const grades = new Set([1, 2, 3, 4, 5, 6, 7, 8].flatMap(s => createSurfaceDeposits(R, 'home', s).map(seamGrade)));
    expect(grades).toEqual(new Set(['poor', 'normal', 'rich']));
    expect(createSurfaceDeposits(R).every(d => d.grade === undefined && seamKnown(d))).toBe(true);
    // The first seams by the pad are never poor.
    for (let s = 1; s < 30; s++) for (const d of createSurfaceDeposits(R, 'home', s).slice(0, 3)) expect(seamGrade(d)).not.toBe('poor');
  });

  it('are known near the pad and unknown farther out', () => {
    const w = game();
    for (const d of w.surfaceDeposits) expect(seamKnown(d)).toBe(Math.abs(d.angle) * R <= SURVEYED_NEAR_PAD);
    expect(w.surfaceDeposits.some(d => !seamKnown(d))).toBe(true);
  });

  it('are surveyed by walking onto them, and a rig cannot go on one before', () => {
    const w = game();
    const far = w.surfaceDeposits.find(d => !seamKnown(d))!;
    w.playerMode = 'astronaut';
    const p = planetAt('home', w.system);
    w.astronaut.position = surfacePosition(p, far.angle, 2.5);
    w.astronaut.velocity = groundVelocity(p, w.astronaut.position);
    w.astronaut.grounded = true;
    expect(placementError(w, 'miningRig', far.angle, { remote: true })).toContain('Survey');
    stepWorld(w, { thrust: false, turn: 0 }, 1 / 60);
    expect(seamKnown(far)).toBe(true);
    expect(w.notice.message).toContain('SEAM SURVEYED');
    expect(decodeCheckpoint(encodeCheckpoint(w)).surfaceDeposits.find(d => d.id === far.id)!.surveyed).toBe(true);
  });

  it('yield faster when rich and slower when poor', () => {
    const run = (grade: 'poor' | 'normal' | 'rich') => {
      const w = createWorld();
      const d = w.surfaceDeposits[0];
      d.grade = grade;
      const rig = completedBuilding(1, 'miningRig', d.angle, w);
      rig.depositId = d.id;
      w.colony.buildings = [rig];
      w.colony.energy = 20;
      const before = d.remaining;
      stepMiningRig(w, rig, RIG.seconds, 1000);
      return before - d.remaining;
    };
    expect(run('rich') / run('normal')).toBeCloseTo(GRADE_YIELD.rich, 6);
    expect(run('poor') / run('normal')).toBeCloseTo(GRADE_YIELD.poor, 6);
  });
});
