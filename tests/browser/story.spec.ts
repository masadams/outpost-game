import { expect, test } from '@playwright/test';

// A new player's view: the suite's all-features switch would list every blueprint.
test.use({ storageState: { cookies: [], origins: [] } });

test('a new game wakes with the boot log and keeps the first memory in the Journal', async ({ page }) => {
  test.setTimeout(60000);
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(() => {
    try { localStorage.setItem('outpost.sun', 'on'); } catch { /* blocked */ }
  });
  await page.goto('/?sun=on');
  const menu = page.getByRole('dialog', { name: 'Outpost game menu', exact: true });
  await menu.getByRole('button', { name: 'New Game', exact: true }).click();
  await expect(menu).toBeHidden();
  const boot = page.locator('.boot-log');
  await expect(boot).toContainText('SEED UNIT 7');
  await expect(boot).toContainText('412 YEARS');
  // The log never takes clicks away from the game.
  expect(await boot.evaluate(el => getComputedStyle(el).pointerEvents)).toBe('none');
  await page.screenshot({ path: 'docs/screenshots/story-boot.png' });
  await page.locator('#objectives').click();
  await expect(page.locator('[data-memory="boot"]')).toContainText('Seed unit 7');
  await expect(page.locator('[data-archive]')).toHaveAttribute('data-archive', '6');
  // Only the two starting blueprints are offered.
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Build', exact: true }).click();
  await expect(page.locator('[data-select="solar"]')).toBeVisible();
  await expect(page.locator('[data-select="battery"]')).toHaveCount(0);
  expect(errors).toEqual([]);
});
