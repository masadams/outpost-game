import { describe, expect, it } from 'vitest';
import { createWorld, stepWorld } from '../src/sim/world';
import { CHAPTERS, MEMORIES, storyLeads } from '../src/sim/story';
import { JournalReader, journalView } from '../src/ui/journal/journalView';

const idle = { thrust: false, turn: 0 };
function game() {
  const w = createWorld(4242);
  w.system.sun = true;
  stepWorld(w, idle, 1 / 60);
  return w;
}

describe('the story, as written', () => {
  it('files every entry under a chapter, and every lead waits on an entry that exists', () => {
    const ids = new Set(MEMORIES.map(m => m.id));
    for (const m of MEMORIES) {
      expect(CHAPTERS.some(c => c.id === m.chapter)).toBe(true);
      if (m.after) expect(ids.has(m.after)).toBe(true);
    }
  });

  it('is written plainly: no stock contrasts, no "you", no very long entries', () => {
    for (const m of MEMORIES) {
      // Quoted speech from other units and the makers may say "you"; the unit's own words do not.
      const own = m.text.replace(/"[^"]*"/g, '');
      expect(own, m.id).not.toMatch(/\b[Yy]ou(r|rs)?\b/);
      expect(own, m.id).not.toMatch(/\b[Ii]t is not\b|\bis not .*\. It is\b/);
      expect(m.text.length, m.id).toBeLessThanOrEqual(260);
    }
  });
});

describe('leads', () => {
  it('start with one thing to do and move on as entries come back', () => {
    const w = game();
    expect(storyLeads(w).map(l => l.chapter)).toEqual(['waking']);
    w.exploration.story!.memories.push('firstOre', 'firstMetal');
    const leads = storyLeads(w);
    expect(leads.find(l => l.chapter === 'waking')).toBeUndefined();
    expect(leads.find(l => l.chapter === 'sky')!.text).toMatch(/Frost/);
  });

  it('gives at most one a chapter, and none without a day cycle', () => {
    const w = game();
    w.exploration.story!.memories.push('firstOre', 'firstMetal', 'buoy', 'sky', 'storm', 'moon');
    const chapters = storyLeads(w).map(l => l.chapter);
    expect(new Set(chapters).size).toBe(chapters.length);
    expect(storyLeads(createWorld())).toEqual([]);
  });
});

describe('the Journal view', () => {
  it('groups entries by chapter, counts them and marks the unread ones', () => {
    const w = game();
    w.exploration.story!.memories.push('firstOre', 'buoy');
    const view = journalView(w, new Set(['boot', 'firstOre']));
    const waking = view.chapters.find(c => c.id === 'waking')!;
    expect(waking.entries.map(e => e.id)).toEqual(['boot', 'firstOre']);
    expect(waking.total).toBe(MEMORIES.filter(m => m.chapter === 'waking' && m.id !== 'inherited').length);
    expect(view.chapters.find(c => c.id === 'sky')!.fresh).toBe(true);
    expect(view.unread).toBe(1);
  });
});

describe('the story reader', () => {
  it('treats a game just started as read, then shows new entries one at a time', () => {
    const w = game();
    const reader = new JournalReader();
    reader.observe(w, 0);
    expect(reader.current()).toBeNull();
    w.exploration.story!.memories.push('firstOre', 'buoy');
    reader.observe(w, 1);
    expect(reader.current()).toMatchObject({ id: 'firstOre', chapter: 'Waking', more: 1 });
    expect(reader.unread).toBe(2);
    // It stays up long enough to read, then the next one takes its place.
    reader.observe(w, 5);
    expect(reader.current()!.id).toBe('firstOre');
    reader.observe(w, 1 + JournalReader.seconds(MEMORIES.find(m => m.id === 'firstOre')!.text) + 0.1);
    expect(reader.current()!.id).toBe('buoy');
    reader.dismiss();
    reader.observe(w, 60);
    expect(reader.current()).toBeNull();
    expect(reader.unread).toBe(0);
  });

  it('counts everything as read once the Journal has been opened, and starts clean on a loaded game', () => {
    const w = game();
    const reader = new JournalReader();
    reader.observe(w, 0);
    w.exploration.story!.memories.push('firstOre');
    reader.observe(w, 1);
    reader.readAll();
    expect(reader.current()).toBeNull();
    expect(reader.seen.has('firstOre')).toBe(true);
    const other = game();
    other.exploration.story!.memories.push('firstOre', 'buoy', 'sky');
    reader.observe(other, 2);
    expect(reader.current()).toBeNull();
    expect(reader.unread).toBe(0);
  });
});
