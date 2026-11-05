import { describe, expect, it } from 'vitest';
import { coach } from '../src/ui/flight/coach';
import { createWorld } from '../src/sim/world';

describe('first-sortie coach', () => {
  it('walks a new player from lift-off to unloading, then stops', () => {
    const w = createWorld();
    expect(coach(w)?.step).toBe('launch');

    w.ship.state = 'flying';
    const aim = coach(w);
    expect(aim?.step).toBe('aim');
    expect(aim?.target).toEqual(w.asteroids[0].position);

    const rock = w.asteroids[0];
    w.beam = { start: { ...w.ship.position }, end: { ...rock.position }, targetId: rock.id };
    expect(coach(w)?.step).toBe('cut');
    w.beam = null;

    w.pickups.push({ id: 900, position: { x: w.ship.position.x, y: w.ship.position.y + 30 }, velocity: { ...w.ship.velocity }, radius: 2, mass: 5, resource: 'iron' } as never);
    expect(coach(w)?.step).toBe('pull');

    w.pickups = [];
    w.ship.cargo.iron = 4;
    const home = coach(w);
    expect(home?.step).toBe('return');
    expect(home?.target).not.toBeNull();

    w.ship.state = 'landed';
    expect(coach(w)?.step).toBe('unload');

    w.unloaded = 4;
    w.ship.cargo.iron = 0;
    expect(coach(w)).toBeNull();
  });

  it('uses the player\'s own key labels', () => {
    const w = createWorld();
    const text = coach(w, { thrust: 'Up', turn: 'Left / Right', fire: 'Enter', tractor: 'X', unload: 'U' })?.text;
    expect(text).toContain('Up');
  });

  it('says nothing on foot or after a crash', () => {
    const w = createWorld();
    w.playerMode = 'astronaut';
    expect(coach(w)).toBeNull();
    w.playerMode = 'ship';
    w.ship.state = 'crashed';
    expect(coach(w)).toBeNull();
  });
});
