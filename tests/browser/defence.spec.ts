import { expect } from '@playwright/test';
import { test } from './game';
import { WORLD } from '../../src/sim/config';
import { test as plain } from '@playwright/test';
import { createWorld } from '../../src/sim/world';
import { encodeCheckpoint } from '../../src/persistence/checkpoint';
import { completedBuilding } from '../../src/sim/construction';
import { planetAt } from '../../src/sim/celestial';
import { turretState } from '../../src/sim/weapons';

test('builds and controls a turret, sets it to automatic and saves', async ({ page }) => {
  test.setTimeout(90000);
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('/'); const hud = page.locator('#hud'), panel = page.locator('.defence-panel');
  await expect(panel).toHaveAttribute('data-threats', '0');
  await page.keyboard.press('f'); await page.keyboard.down('d');
  await expect.poll(async () => Number(await hud.getAttribute('data-surface-angle')) * WORLD.radius, { timeout: 10000, intervals: [100] }).toBeGreaterThan(96);
  await page.keyboard.up('d'); await page.waitForTimeout(450);
  await page.keyboard.press('b'); await page.keyboard.press('Enter'); await expect(hud).toHaveAttribute('data-buildings', '1');
  await page.keyboard.press('t'); await page.keyboard.press('7'); await page.keyboard.press('Enter'); await expect(hud).toHaveAttribute('data-buildings', '2');
  await page.keyboard.press('b'); await page.keyboard.down('d');
  await expect.poll(async () => Number(await hud.getAttribute('data-surface-angle')) * WORLD.radius, { timeout: 8000, intervals: [100] }).toBeGreaterThan(145);
  await page.keyboard.up('d'); await page.waitForTimeout(450);
  await page.locator('.nearby-card').getByRole('button', { name: /Take control/ }).click();
  await expect(panel).toHaveAttribute('data-controlled', '2');
  const position = await hud.getAttribute('data-surface-angle');
  await page.keyboard.down('d');
  await expect.poll(async () => Number(await page.locator('.nearby-card').getAttribute('data-aim'))).toBeGreaterThan(0.15);
  await page.keyboard.up('d'); await page.keyboard.down('Space');
  await expect.poll(async () => Number(await panel.getAttribute('data-shots'))).toBeGreaterThan(0);
  await page.keyboard.up('Space'); await expect(panel).toHaveAttribute('data-controlled', '2'); expect(await hud.getAttribute('data-surface-angle')).toBe(position);
  await expect(hud).toHaveAttribute('data-grounded', 'true');
  await page.keyboard.press('g'); await page.keyboard.press('e'); await expect(panel).toHaveAttribute('data-controlled', '');
  await expect(page.locator('.nearby-card').getByRole('button', { name: /Auto defence: on/ })).toBeAttached();
  await page.keyboard.press('k'); await expect(page.locator('.status')).toContainText('Game saved');
  await page.reload(); await expect(hud).toHaveAttribute('data-state', 'paused');
  await expect(hud).toHaveAttribute('data-buildings', '2');
  expect(errors).toEqual([]);
});

plain('an automatic laser turret breaks up incoming rocks before they land', async ({ page }) => {
  plain.setTimeout(90000);
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  const w = createWorld();
  w.asteroids = [];
  const laser = completedBuilding(2, 'laser', 0.05, w);
  turretState(laser).automatic = true;
  w.colony.buildings.push(completedBuilding(1, 'solar', 0.02, w), completedBuilding(3, 'battery', 0.09, w), laser);
  w.colony.nextId = 5;
  w.colony.energy = 1200;
  const home = planetAt('home', w.system);
  for (let i = 0; i < 3; i++) {
    const a = 0.03 + i * 0.02, r = WORLD.radius + 1300 + i * 150;
    w.defence.meteors.push({ id: 900 + i, position: { x: home.position.x + Math.sin(a) * r, y: home.position.y - Math.cos(a) * r },
      velocity: { x: home.velocity.x - Math.sin(a) * 40, y: home.velocity.y + Math.cos(a) * 40 }, radius: 7, mass: 150, resource: 'iron', stage: 0, health: 1, maxHealth: 1 });
  }
  w.nextId = 1000;
  await page.addInitScript(([t]) => { localStorage.setItem('outpost.checkpoint.v1', t as string); }, [encodeCheckpoint(w)]);
  await page.goto('/?sun=off');
  const menu = page.getByRole('dialog', { name: 'Outpost game menu', exact: true });
  await menu.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.keyboard.press('p');
  const hud = page.locator('#hud');
  await expect.poll(async () => Number(await hud.getAttribute('data-storm-impacts')), { timeout: 40000 }).toBe(0);
  await expect.poll(async () => Number(await page.locator('.defence-panel').getAttribute('data-intercepted')), { timeout: 40000, intervals: [200] }).toBeGreaterThanOrEqual(3);
  await expect(page.locator('.defence-panel')).toHaveAttribute('data-impacts', '0');
  expect(errors).toEqual([]);
});
