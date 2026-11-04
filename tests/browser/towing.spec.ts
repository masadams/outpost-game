import { expect } from '@playwright/test';
import { test } from './game';
import { createWorld } from '../../src/sim/world';
import { applyTowAction } from '../../src/sim/towing';
import { WORLD } from '../../src/sim/config';
import { encodeCheckpoint } from '../../src/persistence/checkpoint';

test('fabricates a paid tow rig using native controls and preserves the equipment across reset/reload', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message)); await page.goto('/');
  const panel = page.locator('.towing-panel'), hud = page.locator('#hud');
  await expect(hud).toHaveAttribute('data-state', 'landed');
  await page.keyboard.press('i'); await expect(panel).toBeVisible();
  await expect(panel).toHaveAttribute('data-equipped', 'false');
  await page.getByRole('button', { name: 'Fabricate tow rig · home pad', exact: true }).focus(); await page.keyboard.press('Enter');
  await expect(panel).toHaveAttribute('data-equipped', 'true'); await expect(hud).toHaveAttribute('data-state', 'landed');
  await page.keyboard.press('p'); await page.keyboard.press('k');
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('outpost.checkpoint.v1')!));
  expect(saved.version).toBe(19); expect(saved.world.ship.towRig).toBe(true); expect(saved.world.colony.products).toMatchObject({ alloy: 12, wire: 8, components: 5 });
  await page.keyboard.press('r'); await expect(panel).toHaveAttribute('data-equipped', 'false');
  await page.keyboard.press('l'); await expect(panel).toHaveAttribute('data-equipped', 'true');
  await page.reload(); await expect(hud).toHaveAttribute('data-state', 'paused'); await expect(panel).toHaveAttribute('data-equipped', 'true');
  expect(errors).toEqual([]);
});

test('latches a physical asteroid, builds cable tension, restores it paused and releases through normal controls', async ({ page }) => {
  test.setTimeout(60000); const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  const w = createWorld(); applyTowAction(w, { type: 'installTowRig' }); w.ship.state = 'flying'; w.ship.position.y = -WORLD.radius - WORLD.shipRadius - 500;
  w.asteroids = [{ id: 1, position: { x: 0, y: w.ship.position.y + 90 }, velocity: { x: 0, y: 0 }, radius: 16, mass: 40, resource: 'iron', stage: 0, health: 1, maxHealth: 1 }];
  await page.addInitScript(text => {
    if (!sessionStorage.getItem('towing-fixture')) { localStorage.setItem('outpost.checkpoint.v1', text); sessionStorage.setItem('towing-fixture', 'loaded'); }
  }, encodeCheckpoint(w));
  await page.goto('/'); const hud = page.locator('#hud'), panel = page.locator('.towing-panel');
  await expect(hud).toHaveAttribute('data-state', 'paused'); await page.keyboard.press('i'); await page.keyboard.press('p');
  await expect(hud).toHaveAttribute('data-state', 'flying'); await page.keyboard.press('y'); await expect(panel).toHaveAttribute('data-target', '1');
  await expect(page.locator('#flight-status')).toContainText('prediction suspended'); await expect(page.locator('#flight-tools')).toHaveAttribute('data-prediction-points', '0');
  await page.keyboard.down('w'); await expect.poll(async () => Number(await panel.getAttribute('data-tension')), { timeout: 6000 }).toBeGreaterThan(10);
  await page.keyboard.up('w'); await page.keyboard.press('p'); await expect(hud).toHaveAttribute('data-state', 'paused'); await page.keyboard.press('k');
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('outpost.checkpoint.v1')!));
  expect(saved.world.towing.targetId).toBe(1); expect(saved.world.towing.tension).toBeGreaterThan(0); expect(saved.world.ship.fuel).toBeLessThan(240);
  await expect(page.getByRole('button', { name: 'Release tow [Y]', exact: true })).toBeDisabled();
  await panel.scrollIntoViewIfNeeded(); await page.screenshot({ path: 'docs/screenshots/asteroid-towing.png' });
  await page.keyboard.press('r'); await expect(panel).toHaveAttribute('data-equipped', 'false'); await page.keyboard.press('l');
  await expect(hud).toHaveAttribute('data-state', 'paused'); await expect(panel).toHaveAttribute('data-target', '1');
  await page.reload(); await expect(hud).toHaveAttribute('data-state', 'paused'); await expect(panel).toHaveAttribute('data-target', '1');
  await expect(panel).toHaveAttribute('data-tension', saved.world.towing.tension.toFixed(1));
  await page.keyboard.press('p'); await expect(hud).toHaveAttribute('data-state', 'flying'); await page.keyboard.press('y');
  await expect(panel).toHaveAttribute('data-target', ''); await expect(panel).toHaveAttribute('data-breaks', '0');
  await expect(page.locator('#flight-status')).not.toContainText('prediction suspended');
  await expect.poll(async () => Number(await page.locator('#flight-tools').getAttribute('data-prediction-points'))).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});
