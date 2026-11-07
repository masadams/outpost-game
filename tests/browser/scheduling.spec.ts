import { expect } from '@playwright/test';
import { test, restart } from './game';
import { WORLD } from '../../src/sim/config';

test('automatically refines rig ore to stock targets, supports native controls and restores active schedules', async ({ page }) => {
  test.setTimeout(90000);
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('/'); const hud = page.locator('#hud');
  await page.keyboard.press('f'); await page.keyboard.down('d');
  await expect.poll(async () => Number(await hud.getAttribute('data-surface-angle')) * WORLD.radius, { timeout: 10000, intervals: [100] }).toBeGreaterThan(96);
  await page.keyboard.up('d'); await page.waitForTimeout(450);
  await page.keyboard.press('b'); await page.keyboard.press('Enter');
  await page.keyboard.press('t'); await page.getByRole('navigation',{name:'Building groups',exact:true}).getByRole('button',{name:'Industry & research',exact:true}).click(); await page.locator('[data-select="miningRig"]').click(); await page.keyboard.press('Enter');
  await page.keyboard.press('t'); await page.keyboard.press('4'); await page.keyboard.press('Enter');
  await expect(hud).toHaveAttribute('data-buildings', '3');
  // Extend construction from a new crew position; the preview is limited to 96 m reach.
  await page.keyboard.down('d');
  await expect.poll(async () => Number(await hud.getAttribute('data-surface-angle')) * WORLD.radius, { timeout: 8000, intervals: [100] }).toBeGreaterThan(130);
  await page.keyboard.up('d'); await page.waitForTimeout(450);
  await page.keyboard.press('1'); await page.keyboard.press('Enter');
  await expect(hud).toHaveAttribute('data-buildings', '4');
  await page.keyboard.press('b'); await page.keyboard.down('d');
  await expect.poll(async () => Number(await hud.getAttribute('data-surface-angle')) * WORLD.radius, { timeout: 12000, intervals: [100] }).toBeGreaterThan(178);
  await page.keyboard.up('d'); await page.waitForTimeout(450);
  const alloyStock = async () => {
    await page.keyboard.press('k');
    return page.evaluate(() => JSON.parse(localStorage.getItem('outpost.checkpoint.v1')!).world.colony.products.alloy as number);
  };
  const openRefinery = async () => {
    await page.getByRole('button', { name: 'Base', exact: true }).click();
    await page.locator('[data-base-nav="buildings"]').click();
    await page.locator('.base-row').filter({ hasText: 'Refinery' }).first().click();
    await expect(page.locator('.base-inspector[aria-label="Refinery details"]')).toBeVisible();
  };
  const inspector = page.locator('.base-inspector[aria-label="Refinery details"]');
  const auto = page.locator('[data-auto]');
  await openRefinery();
  // Start from the copper recipe with no copper: automatic mode must select the available iron.
  await inspector.getByRole('button', { name: 'Next recipe', exact: true }).click();
  await expect(auto).toHaveAttribute('data-auto', 'false');
  for (const [product, count] of [['wire', 2], ['components', 1], ['water', 2], ['oxygen', 1], ['alloy', 2]] as const) {
    for (let i = 0; i < count; i++) await inspector.getByRole('button', { name: `Lower ${product} target`, exact: true }).click();
  }
  await expect(page.locator('[data-target-value="alloy"]')).toHaveText('10');
  await auto.click();
  await expect(auto).toHaveAttribute('data-auto', 'true');
  await expect.poll(alloyStock, { timeout: 25000, intervals: [400] }).toBe(10);
  await expect(inspector).toContainText('Target met');
  const ore = Number(await hud.getAttribute('data-depot')); await page.waitForTimeout(2200);
  expect(await alloyStock()).toBe(10); expect(Number(await hud.getAttribute('data-depot'))).toBeGreaterThan(ore);
  await inspector.getByRole('button', { name: 'Raise alloy target', exact: true }).click();
  await expect(page.locator('[data-target-value="alloy"]')).toHaveText('15'); await expect(hud).toHaveAttribute('data-grounded', 'true');
  await page.waitForTimeout(750); await page.keyboard.press('p'); await page.keyboard.press('k');
  await expect(hud).toHaveAttribute('data-state', 'paused'); await expect(auto).toBeDisabled();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('outpost.checkpoint.v1')!));
  const factory = saved.world.colony.buildings[2]; expect(saved.version).toBe(34);
  expect(factory.schedule.enabled).toBe(true); expect(factory.schedule.targets.alloy).toBe(15);
  expect(factory.progress).toBeGreaterThan(0); expect(factory.progress).toBeLessThan(2);
  await page.screenshot({ path: 'docs/screenshots/production-scheduling.png' });
  await page.keyboard.press('Escape');
  await restart(page); await expect(hud).toHaveAttribute('data-buildings', '0'); await page.keyboard.press('l');
  await expect(hud).toHaveAttribute('data-buildings', '4'); await openRefinery();
  await expect(auto).toHaveAttribute('data-auto', 'true');
  await expect(page.locator('[data-target-value="alloy"]')).toHaveText('15');
  await page.reload(); await expect(hud).toHaveAttribute('data-state', 'paused'); await openRefinery();
  await expect(auto).toHaveAttribute('data-auto', 'true');
  await page.keyboard.press('p'); await inspector.getByRole('button', { name: 'Next recipe', exact: true }).click();
  await expect(auto).toHaveAttribute('data-auto', 'false');
  expect(errors).toEqual([]);
});
