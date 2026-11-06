import { expect } from '@playwright/test';
import { test } from './game';

/** A base part-way through a day, with the day cycle (and so planet rotation) on. */
async function turningBase() {
  const { createWorld, stepWorld } = await import('../../src/sim/world');
  const { completedBuilding } = await import('../../src/sim/construction');
  const { encodeCheckpoint } = await import('../../src/persistence/checkpoint');
  const w = createWorld();
  w.system.sun = true;
  for (const [kind, angle] of [['solar', 0.06], ['battery', 0.075], ['refinery', 0.09]] as const) {
    w.colony.buildings.push(completedBuilding(w.colony.nextId++, kind, angle, w));
  }
  w.colony.energy = 100;
  for (let i = 0; i < 300 * 4; i++) stepWorld(w, { thrust: false, turn: 0 }, 0.25);
  return encodeCheckpoint(w);
}

test('on a turning planet the lander stays on the pad, lifts off and shows its coast path', async ({ page }) => {
  test.setTimeout(90000);
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  const text = await turningBase();
  await page.addInitScript(x => {
    if (!sessionStorage.getItem('rotation-fixture')) {
      localStorage.setItem('outpost.checkpoint.v1', x);
      sessionStorage.setItem('rotation-fixture', '1');
    }
    localStorage.setItem('outpost.sun', 'on');
  }, text);
  await page.goto('/?sun=on');
  const hud = page.locator('#hud');
  await page.keyboard.press('p');
  await expect(hud).toHaveAttribute('data-state', 'landed');
  await page.waitForTimeout(1500);
  await expect(hud).toHaveAttribute('data-state', 'landed');
  await expect(page.locator('#flight-daylight')).toBeVisible();
  await page.keyboard.down('w');
  await expect.poll(async () => Number(await hud.getAttribute('data-altitude')), { timeout: 10000 }).toBeGreaterThan(10);
  await page.keyboard.up('w');
  await expect.poll(async () => Number(await page.locator('#flight-tools').getAttribute('data-prediction-points'))).toBeGreaterThan(2);
  expect(errors).toEqual([]);
});
