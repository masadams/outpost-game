import type { WorldState } from '../../sim/world';
import { RESOURCES, RESOURCE_INFO, type Resource } from '../../sim/resources';

export interface PickupLine {
  key: Resource;
  /** "+4.0 kg Iron" */
  text: string;
  /** 1 when fresh, fading to 0 as the line goes. */
  fade: number;
}

interface Entry {
  resource: Resource;
  amount: number;
  age: number;
}

/** Pickups landing within this many seconds of each other add up into one line. */
const MERGE_WINDOW = 1.2;
const LIFE = 2.6;
const MAX_LINES = 4;

/** A short list of what just came aboard. Display only; reads cargo, never changes it. */
export class PickupFeed {
  private entries: Entry[] = [];
  private last = new Map<Resource, number>();

  reset(w: WorldState): void {
    this.entries = [];
    this.last = this.read(w);
  }

  update(w: WorldState, dt: number): void {
    const step = Math.max(0, dt);
    const now = this.read(w);
    for (const resource of RESOURCES) {
      const gained = (now.get(resource) ?? 0) - (this.last.get(resource) ?? 0);
      if (gained <= 1e-6) continue;
      const open = this.entries.find(e => e.resource === resource && e.age < MERGE_WINDOW);
      if (open) {
        open.amount += gained;
        open.age = 0;
      } else {
        this.entries.push({ resource, amount: gained, age: 0 });
      }
    }
    this.last = now;
    for (const entry of this.entries) entry.age += step;
    this.entries = this.entries.filter(e => e.age < LIFE).slice(-MAX_LINES);
  }

  lines(): PickupLine[] {
    return this.entries.map(e => ({
      key: e.resource,
      text: `+${e.amount.toFixed(1)} kg ${RESOURCE_INFO[e.resource].label}`,
      fade: Math.min(1, (LIFE - e.age) / 0.8),
    }));
  }

  private read(w: WorldState): Map<Resource, number> {
    return new Map(RESOURCES.map(r => [r, w.ship.cargo[r]]));
  }
}
