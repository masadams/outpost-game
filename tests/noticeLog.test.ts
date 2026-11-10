import { describe, expect, it } from 'vitest';
import { ago, NOTICE_LOG_LIMIT, NoticeLog } from '../src/ui/noticeLog';

describe('notice history', () => {
  it('keeps each notice once, newest first', () => {
    const log = new NoticeLog();
    for (let t = 0; t < 3; t += 0.1) log.observe({ message: 'GAME SAVED', time: 3 - t }, 100 + t);
    log.observe({ message: '', time: 0 }, 104);
    log.observe({ message: 'NEW BLUEPRINT · BATTERY', time: 3 }, 110);
    expect(log.lines().map(l => l.text)).toEqual(['NEW BLUEPRINT · BATTERY', 'GAME SAVED']);
    expect(log.lines()[1].time).toBe(100);
  });

  it('records the same words again once the line has cleared', () => {
    const log = new NoticeLog();
    log.observe({ message: 'GAME SAVED', time: 3 }, 10);
    log.observe({ message: 'GAME SAVED', time: 0 }, 14);
    log.observe({ message: 'GAME SAVED', time: 3 }, 200);
    expect(log.lines()).toHaveLength(2);
  });

  it('keeps only the latest lines and starts empty for another game', () => {
    const log = new NoticeLog();
    for (let i = 0; i < NOTICE_LOG_LIMIT + 10; i++) log.observe({ message: `LINE ${i}`, time: 3 }, 100 + i);
    expect(log.lines()).toHaveLength(NOTICE_LOG_LIMIT);
    expect(log.lines()[0].text).toBe(`LINE ${NOTICE_LOG_LIMIT + 9}`);
    log.observe({ message: 'CHECKPOINT LOADED', time: 3 }, 5);
    expect(log.lines().map(l => l.text)).toEqual(['CHECKPOINT LOADED']);
  });

  it('says how long ago in plain words', () => {
    expect(ago(100, 95)).toBe('just now');
    expect(ago(100, 40)).toBe('60 s ago');
    expect(ago(1000, 400)).toBe('10 min ago');
    expect(ago(10000, 1000)).toBe('2.5 h ago');
  });
});
