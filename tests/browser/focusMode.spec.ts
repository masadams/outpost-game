import { expect } from '@playwright/test';
import { test } from './game';

// What a new player sees: the first-mining-sortie set only (docs/CURRENT_FOCUS.md).
test.use({ storageState: { cookies: [], origins: [] } });

test('new players see only the first-sortie systems', async ({ page }) => {
  await page.goto('/');

  await expect(page.locator('#objectives')).toContainText('Objective · 0/2');

  await page.getByRole('button', { name: 'Ship', exact: true }).click();
  const dock = page.locator('#operations-dock');
  await expect(dock).toBeVisible();
  await expect(dock.getByRole('button', { name: 'Weapons', exact: true })).toHaveCount(0);
  await expect(dock.getByRole('button', { name: 'Flight computer', exact: true })).toHaveCount(0);
  await page.keyboard.press('Escape');

  await page.getByRole('button', { name: 'Build', exact: true }).click();
  const bar = page.getByRole('region', { name: 'Build', exact: true });
  const cards = bar.locator('[data-select]');
  await expect(cards).toHaveCount(5);
  for (const name of ['Solar array', 'Battery', 'Storage', 'Refinery', 'Fuel processor']) {
    await expect(cards.filter({ hasText: name })).toHaveCount(1);
  }
  await expect(bar.getByRole('navigation', { name: 'Building groups' })).toHaveCount(0);
  await expect(bar).not.toContainText('unreserved');
  await page.keyboard.press('Escape');
  await expect(bar).toBeHidden();

  await page.getByRole('button', { name: 'Base', exact: true }).click();
  const pages = dock.locator('button[data-page]');
  await expect(pages).toHaveText(['Facilities', 'Construction', 'Economy']);
  await page.keyboard.press('Escape');

  await page.getByRole('button', { name: 'Map', exact: true }).click();
  await expect(dock.getByRole('button', { name: /Return to home pad/ })).toBeVisible();
  await expect(dock.getByRole('button', { name: /Nacre moon/ })).toHaveCount(0);
  await page.keyboard.press('Escape');

  await page.keyboard.press('h');
  const help = page.getByRole('dialog', { name: 'Outpost quick-start and controls', exact: true });
  await expect(help).toContainText('Your first sortie');
  await expect(help).not.toContainText('turret');
});

test('the all-features switch restores hidden systems', async ({ page }) => {
  await page.goto('/?features=all');
  await expect(page.locator('#objectives')).toContainText('Objective · 0/8');
  await page.getByRole('button', { name: 'Base', exact: true }).click();
  await expect(page.locator('#operations-dock [data-page="research"]')).toBeVisible();
});
