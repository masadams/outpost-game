import { expect, type Page } from '@playwright/test';
import { test } from './game';

const time = async (page: Page) => Number(await page.locator('#hud').getAttribute('data-time'));

test('Base and Map pause a flight while open and stay live on the pad', async ({ page }) => {
  await page.goto('/');
  const hud = page.locator('#hud');
  const dock = page.locator('#operations-dock');
  const badge = dock.getByRole('status').filter({ hasText: 'Paused while open' });

  // On the pad: Base stays live so the outpost keeps running.
  await expect(hud).toHaveAttribute('data-state', 'landed');
  await page.getByRole('button', { name: 'Base', exact: true }).click();
  await expect(dock).toHaveAttribute('data-expanded', 'true');
  await expect(badge).toBeHidden();
  const padStart = await time(page);
  await expect.poll(() => time(page)).toBeGreaterThan(padStart);
  await page.keyboard.press('Escape');

  // In flight: Base freezes the world, so nothing can crash behind the window.
  await page.keyboard.down('w');
  await expect(hud).toHaveAttribute('data-state', 'flying');
  await page.waitForTimeout(1500);
  await page.keyboard.up('w');
  for (const screen of ['Base', 'Map']) {
    await page.getByRole('button', { name: screen, exact: true }).click();
    await expect(badge).toBeVisible();
    await expect(hud).toHaveAttribute('data-state', 'paused');
    const frozen = await hud.getAttribute('data-time');
    const y = await hud.getAttribute('data-y');
    await page.waitForTimeout(400);
    await expect(hud).toHaveAttribute('data-time', frozen!);
    await expect(hud).toHaveAttribute('data-y', y!);
    await page.keyboard.press('Escape');
    await expect(badge).toBeHidden();
    await expect(hud).toHaveAttribute('data-state', 'flying');
    await expect.poll(() => time(page)).toBeGreaterThan(Number(frozen));
  }
});
