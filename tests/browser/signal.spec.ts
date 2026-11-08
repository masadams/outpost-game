import { test, expect } from '@playwright/test';
import { createWorld } from '../../src/sim/world';
import { encodeCheckpoint } from '../../src/persistence/checkpoint';
import { completedBuilding } from '../../src/sim/construction';
import { stepColony } from '../../src/sim/colony';
import { STEP } from '../../src/sim/config';
import { TECH_IDS } from '../../src/sim/progressionConfig';
import { launchBeacon } from '../../src/sim/signal';

test.use({ viewport: { width: 1600, height: 900 }, storageState: { cookies: [], origins: [] } });

function staged(sent: boolean) {
  const w = createWorld(4242);
  w.system.sun = true;
  w.objectives.completed.push('delivery', 'industry', 'buoy');
  w.exploration.surveyed.push('frost');
  w.colony.research.completed.push(...TECH_IDS);
  w.colony.products = { ...w.colony.products, fuel: 60, alloy: 60, wire: 30, components: 30 };
  w.colony.buildings.push(completedBuilding(1, 'solar', 0.12, w), completedBuilding(2, 'battery', 0.14, w), completedBuilding(3, 'observatory', 0.17, w), completedBuilding(4, 'antenna', 0.2, w));
  w.colony.nextId = 10;
  w.colony.energy = 20;
  for (let i = 0; i < 400; i++) stepColony(w, STEP);
  if (sent) {
    launchBeacon(w);
    w.system.time = w.exploration.signal!.hearAt - 3;
  }
  return w;
}

async function open(page: import('@playwright/test').Page, text: string) {
  await page.addInitScript(([t]) => { try { localStorage.setItem('outpost.sun', 'on'); localStorage.setItem('outpost.checkpoint.v1', t as string); } catch { /* blocked */ } }, [text]);
  await page.goto('/?sun=on');
  const menu = page.getByRole('dialog', { name: 'Outpost game menu', exact: true });
  await menu.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(menu).toBeHidden();
}

test('the beacon can be launched from Base and shows as listening on the Map', async ({ page }) => {
  test.setTimeout(90000);
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await open(page, encodeCheckpoint(staged(false)));
  await page.keyboard.press('p');
  await page.getByRole('button', { name: 'Base', exact: true }).click();
  await page.locator('[data-beacon]').click();
  await expect(page.locator('[data-signal="waiting"]')).toContainText('Listening');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Map', exact: true }).click();
  await expect(page.locator('.map-echo')).toHaveAttribute('aria-label', /Beacon out/);
  expect(errors).toEqual([]);
});

test('when the echo comes back Base and the Map name the far system', async ({ page }) => {
  test.setTimeout(90000);
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await open(page, encodeCheckpoint(staged(true)));
  await page.keyboard.press('p');
  await expect(page.locator('.status')).toContainText(/signal came back/i, { timeout: 15000 });
  await page.getByRole('button', { name: 'Base', exact: true }).click();
  await expect(page.locator('[data-echo]')).toContainText('light-hours');
  await page.screenshot({ path: '/tmp/claude-0/-home-user-outpost-game/69b8c470-1738-5ca3-a382-1afb3ca6b07d/scratchpad/shots/signal-base.png' });
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Map', exact: true }).click();
  await expect(page.locator('.map-echo')).toHaveAttribute('aria-label', /light-hours/);
  await page.screenshot({ path: '/tmp/claude-0/-home-user-outpost-game/69b8c470-1738-5ca3-a382-1afb3ca6b07d/scratchpad/shots/signal-map.png' });
  expect(errors).toEqual([]);
});
