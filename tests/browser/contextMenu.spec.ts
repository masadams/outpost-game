import { expect } from '@playwright/test';
import { test } from './game';
import { surfacePoint } from './screen';

const ANGLE = 0.0778;

async function withSolar() {
  const { createWorld } = await import('../../src/sim/world');
  const { completedBuilding } = await import('../../src/sim/construction');
  const { encodeCheckpoint } = await import('../../src/persistence/checkpoint');
  const w = createWorld();
  w.colony.buildings.push(completedBuilding(w.colony.nextId++, 'solar', ANGLE, w));
  return encodeCheckpoint(w);
}

test('right-clicking a building opens its menu, and demolishing asks first', async ({ page }) => {
  test.setTimeout(60000);
  const text = await withSolar();
  await page.addInitScript(t => {
    if (!sessionStorage.getItem('menu-fixture')) {
      localStorage.setItem('outpost.checkpoint.v1', t);
      sessionStorage.setItem('menu-fixture', '1');
    }
  }, text);
  await page.goto('/');
  const hud = page.locator('#hud');
  await page.keyboard.press('p');
  await expect(hud).not.toHaveAttribute('data-state', 'paused');
  await expect(hud).toHaveAttribute('data-buildings', '1');

  const at = await surfacePoint(page, 'home', ANGLE);
  await page.mouse.click(at.x, at.y - 8, { button: 'right' });
  const menu = page.getByRole('menu', { name: 'Solar array menu' });
  await expect(menu).toBeVisible();
  await expect(menu.getByRole('menuitem', { name: 'Details' })).toBeVisible();

  // Asks first, and "Keep it" leaves the building alone.
  await menu.getByRole('button', { name: 'Demolish…' }).click();
  await expect(menu.getByRole('alertdialog')).toContainText('Demolish Solar array? You get back');
  await menu.getByRole('button', { name: 'Keep it' }).click();
  await expect(hud).toHaveAttribute('data-buildings', '1');

  await menu.getByRole('button', { name: 'Demolish…' }).click();
  await menu.getByRole('button', { name: 'Demolish', exact: true }).click();
  await expect(hud).toHaveAttribute('data-buildings', '0');
  await expect(menu).toBeHidden();
});
