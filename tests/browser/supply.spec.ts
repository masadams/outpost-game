import { test, expect } from '@playwright/test';
import { createWorld } from '../../src/sim/world';
import { encodeCheckpoint } from '../../src/persistence/checkpoint';
import { completedBuilding } from '../../src/sim/construction';
import { colonyWorld } from '../../src/sim/localWorld';
import { TECH_IDS } from '../../src/sim/progressionConfig';

test.use({ viewport: { width: 1600, height: 900 }, storageState: { cookies: [], origins: [] } });

test('supply lines can be set in Base and send a pod by themselves', async ({ page }) => {
  test.setTimeout(90000);
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  const w = createWorld(4242);
  w.system.sun = true;
  w.system.binary = true;
  w.objectives.completed.push('delivery', 'industry', 'buoy');
  w.exploration.surveyed.push('frost');
  w.exploration.known.push('moon');
  w.colony.research.completed.push(...TECH_IDS);
  w.colony.products.fuel = 60;
  w.colony.energy = 10;
  w.colony.buildings.push(completedBuilding(1, 'solar', 0.12, w), completedBuilding(2, 'refinery', 0.2, w));
  w.colony.nextId = 10;
  w.depot.iron = 200;
  const moon = colonyWorld(w, 'moon');
  moon.colony.buildings.push(completedBuilding(1001, 'solar', 0.2, moon));
  moon.colony.nextId = 1010;
  await page.addInitScript(([t]) => { try { localStorage.setItem('outpost.sun', 'on'); localStorage.setItem('outpost.checkpoint.v1', t as string); } catch { /* blocked */ } }, [encodeCheckpoint(w)]);
  await page.goto('/?sun=on');
  const menu = page.getByRole('dialog', { name: 'Outpost game menu', exact: true });
  await menu.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(menu).toBeHidden();
  await page.keyboard.press('p');
  await page.getByRole('button', { name: 'Base', exact: true }).click();
  for (let i = 0; i < 4; i++) await page.getByRole('button', { name: 'Raise Nacre Iron reserve', exact: true }).click();
  await expect(page.locator('[data-reserve-value="moon:iron"]')).toHaveText('40');
  await page.locator('[data-supply-toggle]').click();
  await expect(page.locator('[data-supply="true"]')).toBeVisible();
  await page.screenshot({ path: '/tmp/claude-0/-home-user-outpost-game/69b8c470-1738-5ca3-a382-1afb3ca6b07d/scratchpad/shots/supply.png' });
  // The check runs every game minute; speed it up through the page's own clock by waiting.
  await expect(page.locator('[data-supply-line]')).toContainText(/Sent 40 kg of iron for Nacre/, { timeout: 80000 });
  expect(errors).toEqual([]);
});
