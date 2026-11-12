import { CHAPTERS, MEMORIES, archiveReadable, memories, storyLeads, type ChapterId } from '../../sim/story';
import type { WorldState } from '../../sim/world';

export interface JournalEntry {
  id: string;
  title: string;
  text: string;
  /** Not read yet: it came back since the Journal was last open. */
  fresh: boolean;
}

export interface JournalChapter {
  id: ChapterId;
  title: string;
  /** Entries recovered so far, in the order they came back. */
  entries: JournalEntry[];
  /** How many entries the chapter holds in all. */
  total: number;
  /** What to do next to find more of this chapter, if anything is open. */
  lead: string | null;
  /** Whether any entry is unread. */
  fresh: boolean;
}

export interface JournalView {
  /** How much of the archive reads back, 6 to 100. */
  readable: number;
  /** Chapters with at least one entry or an open lead, in reading order. */
  chapters: JournalChapter[];
  /** Entries not read yet. */
  unread: number;
}

/** The story as the Journal shows it: chapters, what has come back in each, and what to follow next. */
export function journalView(w: WorldState, read: ReadonlySet<string>): JournalView {
  const got = memories(w);
  const leads = storyLeads(w);
  const chapters = CHAPTERS.map(chapter => {
    const entries = got
      .filter(m => m.chapter === chapter.id)
      .map(m => ({ id: m.id, title: m.title, text: m.text, fresh: !read.has(m.id) }));
    return {
      id: chapter.id,
      title: chapter.title,
      entries,
      // The entry for a second system only exists in a game that follows the colony ending.
      total: MEMORIES.filter(m => m.chapter === chapter.id && (m.id !== 'inherited' || got.some(g => g.id === 'inherited'))).length,
      lead: leads.find(l => l.chapter === chapter.id)?.text ?? null,
      fresh: entries.some(e => e.fresh),
    };
  }).filter(c => c.entries.length > 0 || c.lead !== null);
  return { readable: archiveReadable(w), chapters, unread: chapters.reduce((n, c) => n + c.entries.filter(e => e.fresh).length, 0) };
}

/** Keeps track of which entries the player has had in front of them, and which are waiting to be shown on screen. */
export class JournalReader {
  private read = new Set<string>();
  /** Entries to show as cards, oldest first. */
  private waiting: string[] = [];
  private world: WorldState | null = null;
  private card: { id: string; until: number } | null = null;

  /** Seconds a card stays up: long enough to read it at an easy pace. */
  static seconds(text: string): number {
    return Math.min(22, 6 + text.length / 16);
  }

  /** Call every frame. A game just loaded or started counts as read, so nothing floods the screen. */
  observe(source: WorldState, nowSeconds: number): void {
    const w = source.rootWorld ?? source;
    const ids = w.exploration.story?.memories ?? [];
    if (this.world !== w) {
      this.world = w;
      this.read = new Set(ids);
      this.waiting = [];
      this.card = null;
      return;
    }
    for (const id of ids) {
      if (this.read.has(id) || this.waiting.includes(id) || this.card?.id === id) continue;
      this.waiting.push(id);
    }
    if (this.card && nowSeconds >= this.card.until) this.dismiss();
    if (!this.card && this.waiting.length > 0) {
      const id = this.waiting.shift()!;
      const memory = MEMORIES.find(m => m.id === id);
      if (memory) this.card = { id, until: nowSeconds + JournalReader.seconds(memory.text) };
    }
  }

  /** The entry on screen now, if any. */
  current(): { id: string; title: string; text: string; chapter: string; more: number } | null {
    if (!this.card) return null;
    const memory = MEMORIES.find(m => m.id === this.card!.id);
    if (!memory) return null;
    const chapter = CHAPTERS.find(c => c.id === memory.chapter)?.title ?? '';
    return { id: memory.id, title: memory.title, text: memory.text, chapter, more: this.waiting.length };
  }

  /** Puts the card away. Having been on screen, the entry counts as read. */
  dismiss(): void {
    if (this.card) this.read.add(this.card.id);
    this.card = null;
  }

  /** Entries the player has had in front of them. */
  get seen(): ReadonlySet<string> {
    return this.read;
  }

  /** How many entries are still unread: waiting, or on screen now. */
  get unread(): number {
    return this.waiting.length + (this.card ? 1 : 0);
  }

  /** Opening the Journal reads everything. */
  readAll(): void {
    for (const id of this.world?.exploration.story?.memories ?? []) this.read.add(id);
    for (const id of this.waiting) this.read.add(id);
    this.waiting = [];
    this.dismiss();
  }
}
