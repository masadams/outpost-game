import { BODIES, type BodyId } from '../sim/celestial';
import type { WorldState } from '../sim/world';
import { decodeCheckpoint, encodeCheckpoint, inspectCheckpoint, writeCheckpoint } from './checkpoint';

/** The three saves the player chooses, beside the autosave (which quick save also writes). */
export const SLOTS = [1, 2, 3] as const;
export type SlotId = (typeof SLOTS)[number];
export type SaveSlot = SlotId | 'auto';

const slotKey = (slot: SlotId): string => `outpost.slot.${slot}`;
const metaKey = (slot: SaveSlot): string => (slot === 'auto' ? 'outpost.checkpoint.meta' : `outpost.slot.${slot}.meta`);

/** What a save row shows without opening the save itself. */
export interface SlotMeta {
  /** Wall-clock time of the save, in milliseconds. */
  savedAt: number;
  /** "Selene · 34 buildings · 2 h 10 min played". */
  label: string;
}

export interface SlotRow {
  slot: SaveSlot;
  /** No save here yet. */
  empty: boolean;
  /** A save is here but cannot be opened by this version. */
  broken: boolean;
  meta: SlotMeta | null;
}

type Store = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

/** Hours and minutes of play from the world clock. */
function played(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min played`;
  return `${Math.floor(minutes / 60)} h ${minutes % 60} min played`;
}

/** One line that tells saves apart: where the pilot is, how big the base is, how long it has run. */
export function saveLabel(world: WorldState): string {
  const root = world.rootWorld ?? world;
  const where = BODIES[(root.siteBody ?? 'home') as BodyId]?.label ?? 'Selene';
  const buildings = root.colony.buildings.length;
  return `${where} · ${buildings} building${buildings === 1 ? '' : 's'} · ${played(root.system.time)}`;
}

function writeMeta(storage: Store, slot: SaveSlot, world: WorldState, now: number): void {
  const meta: SlotMeta = { savedAt: now, label: saveLabel(world) };
  try {
    storage.setItem(metaKey(slot), JSON.stringify(meta));
  } catch {
    // The save itself is written; a missing label only makes the row plainer.
  }
}

function readMeta(storage: Pick<Storage, 'getItem'>, slot: SaveSlot): SlotMeta | null {
  try {
    const meta = JSON.parse(storage.getItem(metaKey(slot)) ?? 'null') as SlotMeta | null;
    if (meta && Number.isFinite(meta.savedAt) && typeof meta.label === 'string') return meta;
  } catch {
    /* Treated as no label. */
  }
  return null;
}

/** Saves into a slot. The autosave keeps its backup; a chosen slot is replaced outright. Throws like writeCheckpoint. */
export function writeSlot(storage: Store, slot: SaveSlot, world: WorldState, now = Date.now()): void {
  if (slot === 'auto') writeCheckpoint(storage, world);
  else storage.setItem(slotKey(slot), encodeCheckpoint(world));
  writeMeta(storage, slot, world, now);
}

/** Opens a slot; null when it is empty. Throws when the save cannot be read. */
export function readSlot(storage: Pick<Storage, 'getItem'>, slot: SaveSlot): WorldState | null {
  if (slot === 'auto') return inspectCheckpoint(storage).world;
  const text = storage.getItem(slotKey(slot));
  return text === null ? null : decodeCheckpoint(text);
}

export function deleteSlot(storage: Store, slot: SlotId): void {
  storage.removeItem(slotKey(slot));
  storage.removeItem(metaKey(slot));
}

/** Every save row, autosave first. Each save is opened once, to tell readable saves from broken ones. */
export function slotRows(storage: Pick<Storage, 'getItem'>): SlotRow[] {
  return (['auto', ...SLOTS] as SaveSlot[]).map(slot => {
    let empty = false;
    let broken = false;
    try {
      empty = readSlot(storage, slot) === null;
    } catch {
      broken = true;
    }
    return { slot, empty, broken, meta: empty ? null : readMeta(storage, slot) };
  });
}
