import { test, expect, type Page } from '@playwright/test';
import { createWorld } from '../../src/sim/world';
import { encodeCheckpoint } from '../../src/persistence/checkpoint';
import { completedBuilding } from '../../src/sim/construction';
import { planetAt, surfacePosition, groundVelocity } from '../../src/sim/celestial';
import { sendPod } from '../../src/sim/pods';
import { WORLD } from '../../src/sim/config';

test.use({ viewport: { width: 1600, height: 900 }, storageState: { cookies: [], origins: [] } });

function staged() {
  const w = createWorld(4242);
  w.system.sun = true;
  w.system.binary = true;
  w.objectives.completed.push('delivery', 'industry', 'buoy');
  w.exploration.surveyed.push('frost');
  w.exploration.known.push('moon');
  w.colony.products.fuel = 40;
  w.colony.products.alloy = 40;
  w.colony.energy = 10;
  w.colony.buildings.push(completedBuilding(1, 'solar', 0.12, w), completedBuilding(2, 'refinery', 0.2, w));
  w.colony.nextId = 10;
  w.depot.iron = 120;
  return w;
}

async function enter(page: Page, text: string) {
  await page.addInitScript(([t]) => { try { localStorage.setItem('outpost.sun', 'on'); localStorage.setItem('outpost.checkpoint.v1', t as string); } catch { /* blocked */ } }, [text]);
  await page.goto('/?sun=on');
  const menu = page.getByRole('dialog', { name: 'Outpost game menu', exact: true });
  await menu.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(menu).toBeHidden();
}

test('a pod sent from Base shows on the Map with a countdown and a lane', async ({ page }) => {
  test.setTimeout(90000);
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await enter(page, encodeCheckpoint(staged()));
  await page.keyboard.press('p');
  await page.getByRole('button', { name: 'Base', exact: true }).click();
  await page.locator('[data-base-nav="logistics"]').click();
  await page.getByRole('button', { name: /Send ore to Nacre/ }).click();
  await expect(page.locator('.status')).toContainText('Pod launched for Nacre');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Map', exact: true }).click();
  await expect(page.locator('.map-pod-flight')).toHaveAttribute('aria-label', /Cargo pod to Nacre, \d+ s/);
  await expect(page.locator('.map-pod-lane')).toHaveCount(1);
  expect(errors).toEqual([]);
});

test('a pod that lands leaves a beacon on the Map and on the ground', async ({ page }) => {
  test.setTimeout(90000);
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  const w = staged();
  sendPod(w, 'home', 'moon');
  w.system.time = w.exploration.pods[0].arrives - 4;
  const moon = planetAt('moon', w.system);
  w.ship.position = surfacePosition(moon, 0, WORLD.shipRadius);
  w.ship.velocity = groundVelocity(moon, w.ship.position);
  w.ship.state = 'landed';
  w.ship.ground = 'moon';
  w.playerMode = 'ship';
  await enter(page, encodeCheckpoint(w));
  await page.keyboard.press('p');
  await expect(page.locator('.status')).toContainText(/Pod landed on Nacre/, { timeout: 15000 });
  await page.getByRole('button', { name: 'Map', exact: true }).click();
  await expect(page.locator('.map-beacon[data-kind="landed"]')).toHaveAttribute('aria-label', /Pod landed on Nacre · 40 kg in the depot/);
  expect(errors).toEqual([]);
});
