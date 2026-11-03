import { expect, test } from '@playwright/test';
import { createWorld } from '../../src/sim/world';
import { applyColonyAction } from '../../src/sim/colony';
import { WORLD } from '../../src/sim/config';
import { encodeCheckpoint } from '../../src/persistence/checkpoint';

test('builds a solar-powered large dome over home, holds suit air, disables safely and restores the checkpoint', async ({ page }) => {
  test.setTimeout(70000); const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('/'); const hud = page.locator('#hud'), oxygen = page.locator('[data-instrument="oxygen"]');
  await expect(hud).toHaveAttribute('data-state', 'landed');
  await page.keyboard.press('f'); await page.keyboard.down('d');
  await expect.poll(async () => Number(await hud.getAttribute('data-surface-angle')) * WORLD.radius, { timeout: 10000, intervals: [50] }).toBeGreaterThan(90);
  await page.keyboard.up('d'); await page.waitForTimeout(450); await page.keyboard.press('b'); await page.keyboard.press('Enter');
  await expect(hud).toHaveAttribute('data-buildings', '1');
  for (let i = 0; i < 4; i++) await page.keyboard.press('q');
  await page.locator('[data-select="habitatLarge"]').focus(); await page.keyboard.press('Space');
  await expect(page.locator('.placement')).toContainText('Site clear');
  await page.locator('[data-colony="place"]').focus(); await page.keyboard.press('Enter'); await expect(hud).toHaveAttribute('data-buildings', '2');
  await page.keyboard.press('b'); await page.keyboard.down('a');
  await expect.poll(async () => Number(await hud.getAttribute('data-surface-angle')) * WORLD.radius, { timeout: 12000, intervals: [50] }).toBeLessThan(12);
  await page.keyboard.up('a'); await page.waitForTimeout(450);
  await expect(oxygen).toContainText('HABITAT AIR'); await expect(page.locator('.machine')).toContainText('Large habitat');
  const held = await hud.getAttribute('data-oxygen'); await page.waitForTimeout(1200); expect(await hud.getAttribute('data-oxygen')).toBe(held);
  await page.screenshot({ path: 'docs/screenshots/oxygen-habitat.png' });
  await page.getByRole('button', { name: 'Disable nearby [E]', exact: true }).click(); await expect(oxygen).toContainText('SUIT AIR');
  await expect.poll(async () => Number(await hud.getAttribute('data-oxygen'))).toBeLessThan(Number(held) - .3);
  await page.getByRole('button', { name: 'Enable nearby [E]', exact: true }).click(); await expect(oxygen).toContainText('HABITAT AIR');
  await page.keyboard.press('p'); await page.keyboard.press('k');
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('outpost.checkpoint.v1')!));
  expect(saved.version).toBe(13); expect(saved.world.colony.buildings[1].habitat.oxygen).toBeGreaterThan(.6);
  expect(saved.world.colony.products.oxygen).toBeLessThan(2); expect(saved.world.colony.oxygenUsed).toBeGreaterThan(0);
  await page.reload(); await expect(hud).toHaveAttribute('data-state', 'paused'); await expect(oxygen).toContainText('HABITAT AIR');
  expect(await hud.getAttribute('data-oxygen')).toBe(saved.world.astronaut.oxygen.toFixed(2)); expect(errors).toEqual([]);
});

test('warns during charged backup and resumes suit consumption when life support loses power', async ({ page }) => {
  const w = createWorld(); w.playerMode = 'astronaut'; w.colony.buildOpen = true; w.colony.offset = 0; w.colony.selected = 'habitatLarge';
  applyColonyAction(w, { type: 'place' }); const b = w.colony.buildings[0]; b.habitat = { oxygen: 1, energy: 4, powered: true, backup: true }; b.status = 'air low';
  w.colony.products.oxygen = 0; w.astronaut.oxygen = 20; w.colony.buildOpen = false;
  await page.addInitScript(text => localStorage.setItem('outpost.checkpoint.v1', text), encodeCheckpoint(w)); await page.goto('/');
  const hud = page.locator('#hud'), oxygen = page.locator('[data-instrument="oxygen"]');
  await expect(oxygen).toContainText('HABITAT AIR'); await expect(oxygen).toHaveAttribute('data-level', 'caution');
  await page.keyboard.press('p'); await expect(oxygen).toContainText('SUIT AIR', { timeout: 5000 });
  await expect(oxygen).toHaveAttribute('data-level', 'critical');
  await expect.poll(async () => Number(await hud.getAttribute('data-oxygen'))).toBeLessThan(19.5);
  await page.keyboard.press('p'); const held = await hud.getAttribute('data-oxygen'); await page.waitForTimeout(300); expect(await hud.getAttribute('data-oxygen')).toBe(held);
});
