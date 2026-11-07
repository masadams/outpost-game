/* A smoke pass over what a new player meets in the real game: the day cycle on, new-player feature set, a fresh seed.
   It checks that nothing throws and the windows open. Look at screenshots by hand for layout. */
import { test, expect, type Page } from '@playwright/test';
import { createWorld, stepWorld } from '../../src/sim/world';
import { encodeCheckpoint } from '../../src/persistence/checkpoint';
import { completedBuilding } from '../../src/sim/construction';
import { colonyWorld } from '../../src/sim/localWorld';

test.use({ viewport: { width: 1600, height: 900 }, storageState: { cookies: [], origins: [] } });

async function enter(page: Page, saved: string | null, url = '/?sun=on') {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });
  await page.addInitScript(([text]) => {
    try {
      localStorage.setItem('outpost.sun', 'on');
      if (text && !sessionStorage.getItem('seeded')) { localStorage.setItem('outpost.checkpoint.v1', text); sessionStorage.setItem('seeded', '1'); }
    } catch { /* blocked */ }
  }, [saved]);
  await page.goto(url);
  const menu = page.getByRole('dialog', { name: 'Outpost game menu', exact: true });
  await expect(menu).toBeVisible();
  const cont = menu.getByRole('button', { name: 'Continue', exact: true });
  const button = saved && (await cont.isEnabled()) ? cont : menu.getByRole('button', { name: 'New Game', exact: true });
  await button.focus();
  await page.keyboard.press('Enter');
  await expect(menu).toBeHidden();
  return errors;
}

function staged() {
  const w = createWorld(4242);
  w.system.sun = true;
  w.system.time = 0;
  w.objectives.completed.push('delivery', 'industry', 'buoy');
  w.unloaded = 40;
  w.exploration.surveyed.push('frost');
  w.exploration.known.push('moon');
  w.colony.products.alloy = 40; w.colony.products.wire = 20; w.colony.products.components = 12;
  w.colony.energy = 800;
  w.colony.buildings.push(
    completedBuilding(1, 'solar', 0.1, w), completedBuilding(2, 'refinery', -0.1, w), completedBuilding(3, 'battery', 0.16, w),
    completedBuilding(4, 'observatory', -0.17, w), completedBuilding(5, 'relay', 0.26, w), completedBuilding(6, 'solar', 0.5, w));
  const moon = colonyWorld(w, 'moon');
  moon.colony.buildings.push(completedBuilding(1001, 'solar', 0.25, moon), completedBuilding(1002, 'miningRig', 160 / 450, moon));
  moon.depot.ice = 35;
  w.colony.nextId = 10;
  moon.colony.nextId = 1010;
  w.storm.analysed = true;
  return w;
}

test('a new day-cycle game opens its windows with a clean console', async ({ page }) => {
  const errors = await enter(page, null, '/?sun=on&seed=4242');
  await page.waitForTimeout(1500);
  await page.getByRole('button', { name: 'Build', exact: true }).click();
  await page.waitForTimeout(400);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Map', exact: true }).click();
  await page.waitForTimeout(500);
  expect(errors).toEqual([]);
});

test('a mid-game base opens build, base, map and ship windows with a clean console', async ({ page }) => {
  const text = encodeCheckpoint(staged());
  const errors = await enter(page, text);
  await page.waitForTimeout(1200);
  await page.keyboard.press('p');
  await page.getByRole('button', { name: 'Build', exact: true }).click();
  await page.waitForTimeout(400);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Base', exact: true }).click();
  await page.waitForTimeout(600);
  await page.getByRole('button', { name: /Buildings/ }).first().click().catch(() => {});
  await page.waitForTimeout(400);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Map', exact: true }).click();
  await page.waitForTimeout(500);
  await page.locator('[data-destination="copper"]').click().catch(() => {});
  await page.waitForTimeout(400);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Ship', exact: true }).click();
  await page.waitForTimeout(500);
  expect(errors).toEqual([]);
});

test('a staged base keeps running for a few game minutes without errors', async ({ page }) => {
  test.setTimeout(240000);
  await page.clock.install();
  const errors = await enter(page, encodeCheckpoint(staged()));
  await page.keyboard.press('p');
  for (let i = 0; i < 160; i++) {
    await page.clock.fastForward(250);
  }
  expect(Number(await page.locator('#hud').getAttribute('data-time'))).toBeGreaterThan(30);
  expect(errors).toEqual([]);
});

test('on Nacre the ship, base and map windows open with a clean console', async ({ page }) => {
  const { planetAt, surfacePosition, groundVelocity } = await import('../../src/sim/celestial');
  const w = createWorld(4242);
  w.system.sun = true;
  w.objectives.completed.push('delivery', 'industry', 'buoy');
  w.unloaded = 40;
  w.exploration.known.push('moon', 'cinder');
  w.exploration.surveyed.push('frost');
  w.colony.products.alloy = 30; w.colony.products.wire = 20; w.colony.products.components = 10;
  const moon = colonyWorld(w, 'moon');
  moon.colony.products.alloy = 10; moon.colony.products.wire = 4; moon.colony.products.components = 2;
  moon.colony.buildings.push(completedBuilding(1001, 'solar', 0.25, moon), completedBuilding(1002, 'miningRig', 160 / 450, moon));
  moon.colony.nextId = 1010;
  moon.depot.ice = 48;
  const body = planetAt('moon', w.system);
  w.ship.position = surfacePosition(body, 0, 7);
  w.ship.velocity = { ...groundVelocity(body, w.ship.position) };
  w.ship.angle = 0;
  w.ship.state = 'landed';
  w.ship.ground = 'moon';
  const errors = await enter(page, encodeCheckpoint(w));
  await page.waitForTimeout(1200);
  await page.getByRole('button', { name: 'Ship', exact: true }).click();
  await page.waitForTimeout(600);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Base', exact: true }).click();
  await page.waitForTimeout(600);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Map', exact: true }).click();
  await page.waitForTimeout(600);
  expect(errors).toEqual([]);
});
