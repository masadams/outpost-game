/** One line the game said, and when (game seconds). */
export interface NoticeLine {
  time: number;
  text: string;
}

/** How many past notices are kept. */
export const NOTICE_LOG_LIMIT = 30;

/**
 * Remembers the notices that have been shown, so one that flashed past can be read later in the Journal.
 * Kept for the session only: it is not saved, and a new or loaded game starts it empty.
 */
export class NoticeLog {
  private entries: NoticeLine[] = [];
  private last = '';
  private lastTime = 0;

  /** Call every frame with the notice on screen and the game clock. */
  observe(notice: { message: string; time: number }, time: number): void {
    // The clock going backwards means a different game was started or loaded.
    if (time < this.lastTime - 1) {
      this.entries = [];
      this.last = '';
    }
    this.lastTime = time;
    if (notice.time <= 0 || !notice.message) {
      // Once the line clears, the same words said again count as a new notice.
      this.last = '';
      return;
    }
    if (notice.message === this.last) return;
    this.last = notice.message;
    this.entries.push({ time, text: notice.message });
    if (this.entries.length > NOTICE_LOG_LIMIT) this.entries.splice(0, this.entries.length - NOTICE_LOG_LIMIT);
  }

  /** Newest first. */
  lines(): NoticeLine[] {
    return this.entries.slice().reverse();
  }
}

/** "3 min ago", "just now". */
export function ago(now: number, then: number): string {
  const seconds = Math.max(0, now - then);
  if (seconds < 20) return 'just now';
  if (seconds < 90) return `${Math.round(seconds / 10) * 10} s ago`;
  if (seconds < 3600) return `${Math.round(seconds / 60)} min ago`;
  return `${(seconds / 3600).toFixed(1)} h ago`;
}
