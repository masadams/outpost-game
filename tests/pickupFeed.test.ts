import { describe, expect, it } from 'vitest';
import { PickupFeed } from '../src/ui/flight/pickupFeed';
import { createWorld } from '../src/sim/world';

describe('pickup feed', () => {
  it('shows what came aboard and merges quick pickups of the same ore', () => {
    const w = createWorld();
    const feed = new PickupFeed();
    feed.reset(w);
    expect(feed.lines()).toEqual([]);
    w.ship.cargo.iron += 1;
    feed.update(w, 0.1);
    w.ship.cargo.iron += 1.5;
    feed.update(w, 0.1);
    expect(feed.lines().map(l => l.text)).toEqual(['+2.5 kg Iron']);
  });

  it('keeps different ores on their own lines and lets them expire', () => {
    const w = createWorld();
    const feed = new PickupFeed();
    feed.reset(w);
    w.ship.cargo.iron += 1;
    w.ship.cargo.ice += 2;
    feed.update(w, 0.1);
    expect(feed.lines()).toHaveLength(2);
    feed.update(w, 3);
    expect(feed.lines()).toEqual([]);
  });

  it('ignores cargo that leaves the hold', () => {
    const w = createWorld();
    w.ship.cargo.iron = 5;
    const feed = new PickupFeed();
    feed.reset(w);
    w.ship.cargo.iron = 0;
    feed.update(w, 0.1);
    expect(feed.lines()).toEqual([]);
  });
});
