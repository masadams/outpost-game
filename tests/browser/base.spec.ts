import { expect } from '@playwright/test';
import { test } from './game';
import { createWorld } from '../../src/sim/world';
import { completedBuilding } from '../../src/sim/construction';
import { encodeCheckpoint } from '../../src/persistence/checkpoint';
import { SUIT } from '../../src/sim/astronaut';
import { planetAt, surfacePosition } from '../../src/sim/celestial';

// The new Base window and nearby card are what a new player sees (focus set).
test.use({ storageState: { cookies: [], origins: [] } });

/** On foot next to a refinery that has no ore, with a solar array nearby. */
function outpost() {
  const w = createWorld();
  w.asteroids = [];
  const refineryAngle = 0.09;
  w.colony.buildings.push(completedBuilding(1, 'solar', 0.05, w), completedBuilding(2, 'refinery', refineryAngle, w));
  w.colony.nextId = 3;
  w.playerMode = 'astronaut';
  w.astronaut.position = surfacePosition(planetAt('home', w.system), refineryAngle, SUIT.radius);
  return w;
}

test('Base shows materials, power and plain reasons; the nearby card controls the building you stand by', async ({ page }) => {
  const w = outpost();
  await page.addInitScript(text => localStorage.setItem('outpost.checkpoint.v1', text), encodeCheckpoint(w));
  await page.goto('/');
  const hud = page.locator('#hud');
  await expect(hud).toHaveAttribute('data-state', 'paused');
  await page.keyboard.press('p');

  // The old facility panel no longer opens on foot; the card does.
  const card = page.getByRole('region', { name: 'Nearby: Refinery', exact: true });
  await expect(card).toBeVisible();
  await expect(card).toContainText('Needs iron ore. Mine some and unload it at the pad.');
  await expect(page.locator('#operations-dock')).toBeHidden();

  await card.getByRole('button', { name: /Turn off/ }).click();
  await expect(card.getByRole('button', { name: /Turn on/ })).toBeVisible();
  await expect(card).toContainText('Off');

  // Details opens Base → Buildings with that building selected.
  await card.getByRole('button', { name: 'Details', exact: true }).click();
  const dock = page.locator('#operations-dock');
  await expect(dock.locator('.dock-title')).toHaveText('Base');
  await expect(page.getByRole('button', { name: 'Select Refinery 2', exact: true })).toHaveAttribute('aria-pressed', 'true');
  const inspector = page.getByRole('complementary', { name: 'Refinery details', exact: true });
  await expect(inspector).toContainText('Iron → alloy');
  await inspector.getByRole('button', { name: 'Turn on', exact: true }).click();
  await expect(inspector.getByRole('button', { name: 'Turn off', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Select Solar array 1', exact: true })).toContainText('Generating');

  // Overview: materials, power and what needs attention.
  await page.getByRole('button', { name: 'Overview', exact: true }).click();
  await expect(dock.locator('[data-stock="alloy"] strong')).toHaveText(String(w.colony.products.alloy));
  await expect(dock.locator('.base-power-summary')).toContainText('of 8.0 kW');
  await page.getByRole('button', { name: 'Refinery: Needs iron ore. Mine some and unload it at the pad.', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Select Refinery 2', exact: true })).toHaveAttribute('aria-pressed', 'true');

  // Ship section, and no legacy console for new players.
  await page.getByRole('button', { name: 'Lander', exact: true }).click();
  await expect(dock.locator('[data-base-section="ship"]')).toContainText('On the pad');
  await expect(dock.locator('[data-base-nav="legacy"]')).toHaveCount(0);
  await expect(dock.locator('#command-console')).toHaveCount(0);

  await page.keyboard.press('k');
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('outpost.checkpoint.v1')!).world);
  expect(saved.colony.buildings.find((b: { id: number }) => b.id === 2).enabled).toBe(true);
});
