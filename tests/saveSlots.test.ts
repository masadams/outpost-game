import { describe, expect, it } from 'vitest';
import { createWorld } from '../src/sim/world';
import { SAVE_KEY } from '../src/persistence/checkpoint';
import { deleteSlot, readSlot, saveLabel, slotRows, writeSlot } from '../src/persistence/slots';

function memoryStorage() {
  const data = new Map<string, string>();
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
    data,
  };
}

describe('save slots', () => {
  it('lists the autosave and three empty saves on a fresh browser', () => {
    const rows = slotRows(memoryStorage());
    expect(rows.map(r => r.slot)).toEqual(['auto', 1, 2, 3]);
    expect(rows.every(r => r.empty && !r.broken)).toBe(true);
  });

  it('keeps each save apart, with a line that tells them apart', () => {
    const storage = memoryStorage();
    const a = createWorld(11);
    const b = createWorld(22);
    b.system.time = 3 * 3600 + 5 * 60;
    writeSlot(storage, 1, a, 1000);
    writeSlot(storage, 3, b, 2000);
    expect(readSlot(storage, 1)!.seed).toBe(11);
    expect(readSlot(storage, 3)!.seed).toBe(22);
    expect(readSlot(storage, 2)).toBeNull();
    const rows = slotRows(storage);
    expect(rows[3].meta).toEqual({ savedAt: 2000, label: saveLabel(b) });
    expect(saveLabel(b)).toMatch(/^Selene · \d+ buildings? · 3 h 5 min played$/);
    expect(rows[2].empty).toBe(true);
  });

  it('writes the autosave through the usual checkpoint, and never touches it from a slot', () => {
    const storage = memoryStorage();
    writeSlot(storage, 'auto', createWorld(5));
    const auto = storage.getItem(SAVE_KEY);
    writeSlot(storage, 2, createWorld(6));
    expect(storage.getItem(SAVE_KEY)).toBe(auto);
    expect(readSlot(storage, 'auto')!.seed).toBe(5);
  });

  it('deletes a save and its line, and marks a damaged save as broken', () => {
    const storage = memoryStorage();
    writeSlot(storage, 1, createWorld(7));
    deleteSlot(storage, 1);
    expect(slotRows(storage)[1]).toMatchObject({ empty: true, meta: null });
    storage.setItem('outpost.slot.2', '{not a save');
    expect(slotRows(storage)[2]).toMatchObject({ empty: false, broken: true });
    expect(() => readSlot(storage, 2)).toThrow();
  });
});
