import { reachableWreck, WRECK, wreckCourse } from '../../sim/wrecks';
import type { WorldState } from '../../sim/world';
import { duration } from './stormView';

export interface WreckCard {
  title: string;
  detail: string;
}

/** When a wreck is close: whether you can salvage it, or what to do first. */
export function wreckCard(w: WorldState): WreckCard | null {
  const root = w.rootWorld ?? w;
  const near = reachableWreck(root);
  if (!near) return null;
  return { title: 'Wreck', detail: near.reason ? `${near.reason}, then press E to salvage.` : 'Press E to salvage what is left.' };
}

export interface WreckMark {
  id: number;
  at: { x: number; y: number };
  /** "Crashed · on the ground · transponder 52 min". */
  label: string;
}

/** Wrecks whose transponders are still on, for the Map and radar. */
export function wreckMarks(w: WorldState): WreckMark[] {
  const root = w.rootWorld ?? w;
  const now = root.system.time;
  return root.wrecks
    .filter(x => x.beaconUntil > now)
    .map(x => ({
      id: x.id,
      at: x.ship.position,
      label: `Wreck · ${wreckCourse(root, x)} · transponder ${duration(Math.min(WRECK.beacon, x.beaconUntil - now))}`,
    }));
}
