import { test, expect } from '@playwright/test';
import { createWorld } from '../../src/sim/world';
import { encodeCheckpoint } from '../../src/persistence/checkpoint';
import { createEvents, startEvent } from '../../src/sim/events';

test.use({ viewport: { width: 1600, height: 900 }, storageState: { cookies: [], origins: [] } });

test('a warned event shows in the corner and a finished one is written in the Journal', async ({ page }) => {
  test.setTimeout(90000);
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  const w = createWorld(4242);
  w.system.sun = true;
  w.objectives.completed.push('delivery');
  w.exploration.events = createEvents();
  w.system.time = 2000;
  startEvent(w, 'dust');
  w.exploration.events.journal.push('A comet passed close and left ice rocks in orbit.');
  await page.addInitScript(([t]) => { try { localStorage.setItem('outpost.sun', 'on'); localStorage.setItem('outpost.checkpoint.v1', t as string); } catch { /* blocked */ } }, [encodeCheckpoint(w)]);
  await page.goto('/?sun=on');
  const menu = page.getByRole('dialog', { name: 'Outpost game menu', exact: true });
  await menu.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.locator('#flight-event')).toContainText('Dust front');
  await page.getByRole('button', { name: 'Open expedition objectives', exact: true }).click();
  await expect(page.locator('[data-event-line]').first()).toContainText('comet');
  expect(errors).toEqual([]);
});
