import { expect } from '@playwright/test';
import { test } from './game';

/** A lander that came down hard near the colony with ore aboard. */
async function crashedNearby() {
  const { createWorld } = await import('../../src/sim/world');
  const { encodeCheckpoint } = await import('../../src/persistence/checkpoint');
  const { planetAt, surfacePosition, groundVelocity } = await import('../../src/sim/celestial');
  const { WORLD } = await import('../../src/sim/config');
  const w = createWorld();
  w.asteroids = [];
  const home = planetAt('home', w.system);
  w.ship.position = surfacePosition(home, 45 / WORLD.radius, WORLD.shipRadius);
  w.ship.velocity = groundVelocity(home, w.ship.position);
  Object.assign(w.ship, { state: 'crashed', hull: 0, ground: 'home', crashSpeed: 18, fuel: 80 });
  w.ship.cargo.iron = 30;
  return encodeCheckpoint(w);
}

test('a lost lander is replaced by a printed pilot and lander, and the wreck can be salvaged', async ({ page }) => {
  test.setTimeout(90000);
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  const text = await crashedNearby();
  await page.addInitScript(x => {
    if (!sessionStorage.getItem('wreck-fixture')) {
      localStorage.setItem('outpost.checkpoint.v1', x);
      sessionStorage.setItem('wreck-fixture', '1');
    }
  }, text);
  await page.goto('/');
  const hud = page.locator('#hud');
  await page.keyboard.press('p');
  await expect(hud).toHaveAttribute('data-state', 'crashed');
  await page.keyboard.press('Backspace');
  await expect(hud).toHaveAttribute('data-state', 'landed');
  await expect(hud).toHaveAttribute('data-cargo', '0.00');
  await page.getByRole('button', { name: 'Map', exact: true }).click();
  await expect(page.locator('.map-wreck')).toHaveCount(1);
  await expect(page.locator('.map-wreck')).toHaveAttribute('aria-label', /Wreck · on the ground · transponder/);
  await page.keyboard.press('Escape');
  // Step out and walk over to it.
  await page.keyboard.press('f');
  await expect(hud).toHaveAttribute('data-mode', 'astronaut');
  await page.keyboard.down('d');
  await expect(page.locator('[data-wreck]')).toContainText('Press E', { timeout: 20000 });
  await page.keyboard.up('d');
  await page.keyboard.press('e');
  await expect(page.locator('[data-wreck]')).toHaveCount(0, { timeout: 5000 });
  expect(errors).toEqual([]);
});
