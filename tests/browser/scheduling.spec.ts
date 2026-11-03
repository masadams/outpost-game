import { expect, test } from '@playwright/test';
import { WORLD } from '../../src/sim/config';

test('automatically refines rig ore to stock targets, supports native controls and restores active schedules', async ({ page }) => {
  test.setTimeout(90000);
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('/'); const hud = page.locator('#hud'), machine = page.locator('.machine'), schedule = page.locator('.schedule-controls');
  await page.keyboard.press('f'); await page.keyboard.down('d');
  await expect.poll(async () => Number(await hud.getAttribute('data-surface-angle')) * WORLD.radius, { timeout: 10000, intervals: [100] }).toBeGreaterThan(96);
  await page.keyboard.up('d'); await page.waitForTimeout(450);
  await page.keyboard.press('b'); await page.keyboard.press('Enter');
  await page.keyboard.press('t'); await page.locator('[data-select="miningRig"]').click(); await page.keyboard.press('Enter');
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
  await page.keyboard.up('d'); await page.waitForTimeout(450); await expect(machine).toContainText('Refinery');
  // Start from the copper recipe with no copper: automatic mode must select the available iron.
  await page.keyboard.press('v'); await expect(machine).toContainText('Copper → wire');
  await expect(schedule).toHaveAttribute('data-enabled', 'false');
  for (const [product, count] of [['wire', 2], ['components', 1], ['water', 2], ['oxygen', 1], ['alloy', 2]] as const) {
    for (let i = 0; i < count; i++) await page.getByRole('button', { name: `Lower ${product} target`, exact: true }).click();
  }
  await expect(page.locator('[data-target-value="alloy"]')).toHaveText('10');
  const toggle = page.locator('[data-colony="toggleSchedule"]'); await toggle.focus(); await page.keyboard.press('Enter');
  await expect(schedule).toHaveAttribute('data-enabled', 'true');
  const alloy = page.locator('.product-grid span').filter({ hasText: 'alloy' }).locator('b');
  await expect.poll(async () => Number(await alloy.textContent()), { timeout: 25000, intervals: [200] }).toBe(10);
  await expect(machine).toContainText('target met');
  const ore = Number(await hud.getAttribute('data-depot')); await page.waitForTimeout(2200);
  await expect(alloy).toHaveText('10.0'); expect(Number(await hud.getAttribute('data-depot'))).toBeGreaterThan(ore);
  await page.getByRole('button', { name: 'Raise alloy target', exact: true }).focus(); await page.keyboard.press('Space');
  await expect(page.locator('[data-target-value="alloy"]')).toHaveText('15'); await expect(hud).toHaveAttribute('data-grounded', 'true');
  await page.waitForTimeout(750); await page.keyboard.press('p'); await page.keyboard.press('k');
  await expect(hud).toHaveAttribute('data-state', 'paused'); await expect(toggle).toBeDisabled();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('outpost.checkpoint.v1')!));
  const factory = saved.world.colony.buildings[2]; expect(saved.version).toBe(9);
  expect(factory.schedule.enabled).toBe(true); expect(factory.schedule.targets.alloy).toBe(15);
  expect(factory.progress).toBeGreaterThan(0); expect(factory.progress).toBeLessThan(2);
  await schedule.scrollIntoViewIfNeeded(); await page.screenshot({ path: 'docs/screenshots/production-scheduling.png' });
  await page.keyboard.press('r'); await expect(hud).toHaveAttribute('data-buildings', '0'); await page.keyboard.press('l');
  await expect(hud).toHaveAttribute('data-buildings', '4'); await expect(schedule).toHaveAttribute('data-enabled', 'true');
  await expect(page.locator('[data-target-value="alloy"]')).toHaveText('15');
  await page.reload(); await expect(hud).toHaveAttribute('data-state', 'paused'); await expect(schedule).toHaveAttribute('data-enabled', 'true');
  await expect(machine).toContainText(`${factory.progress.toFixed(1)} s`);
  await page.keyboard.press('p'); await page.keyboard.press('v'); await expect(schedule).toHaveAttribute('data-enabled', 'false');
  expect(errors).toEqual([]);
});
