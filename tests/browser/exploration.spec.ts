import { expect } from '@playwright/test';
import { test, restart } from './game';
import { createWorld } from '../../src/sim/world';
import { encodeCheckpoint } from '../../src/persistence/checkpoint';
import { WORLD } from '../../src/sim/config';

test('charts a finite neighborhood, selects targets while paused and keeps flight guidance readable', async ({ page }) => {
  test.setTimeout(60000); const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('/'); const hud = page.locator('#hud'), panel = page.locator('#navigation-panel'), guidance = page.locator('#navigation-guidance');
  await expect(hud).toHaveAttribute('data-state', 'landed'); await expect(hud).toHaveAttribute('data-asteroids', '31'); await page.keyboard.press('p');
  await page.getByRole('button', { name: 'Map', exact: true }).click(); await expect(panel).toBeVisible();
  await expect(panel.getByRole('img')).toBeVisible(); await expect(panel).toContainText('Frost arc');
  await page.getByRole('button', { name: 'Frost arc', exact: true }).click(); await expect(panel).toContainText('Not surveyed'); await expect(panel).toContainText('Unknown until surveyed');
  const fuel = await hud.getAttribute('data-fuel');
  await page.getByRole('button', { name: 'Frost survey buoy', exact: true }).focus(); await page.keyboard.press('Space');
  await expect(guidance).toHaveAttribute('data-target', 'survey'); await expect(panel).toContainText('Relative speed'); await expect(hud).toHaveAttribute('data-state', 'paused');
  expect(await hud.getAttribute('data-fuel')).toBe(fuel);
  for (const [width, height] of [[900, 600], [1280, 800], [1920, 1080]]) {
    await page.setViewportSize({ width, height });
    const issues = await page.evaluate(() => {
      const nav = document.querySelector('#navigation-guidance')!.getBoundingClientRect(), path = document.querySelector('#flight-status')!.getBoundingClientRect(), instruments = document.querySelector('.instruments')!.getBoundingClientRect();
      const overlap = (a: DOMRect, b: DOMRect) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
      return { clipped: nav.left < 0 || nav.right > innerWidth || nav.top < 0 || nav.bottom > innerHeight, overlap: overlap(nav, path) || overlap(nav, instruments) };
    }); expect(issues).toEqual({ clipped: false, overlap: false });
  }
  await page.setViewportSize({ width: 1280, height: 800 }); await page.locator('#operations-dock').evaluate(e => e.scrollTop = 0); await page.screenshot({ path: 'docs/screenshots/neighborhood-chart.png' });
  await page.keyboard.press('k'); const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('outpost.checkpoint.v1')!)); expect(saved.version).toBe(29); expect(saved.world.exploration.selected).toBe('survey');
  await page.reload(); await expect(hud).toHaveAttribute('data-state', 'paused'); await expect(guidance).toHaveAttribute('data-target', 'survey');
  await page.getByRole('button', { name: 'Map', exact: true }).click(); await page.getByRole('button', { name: 'Home pad', exact: true }).click(); await expect(guidance).toHaveAttribute('data-target', 'home'); expect(errors).toEqual([]);
});

test('matches a physical derelict, recovers finite salvage and restores depletion without duplication', async ({ page }) => {
  test.setTimeout(50000); const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  const w = createWorld(), s = w.exploration.sites.find(s => s.key === 'cache')!; w.asteroids = [];
  w.ship.state = 'flying'; w.ship.position = { x: s.position.x, y: s.position.y - 80 }; w.ship.velocity = { ...s.velocity }; w.exploration.selected = 'cache';
  await page.addInitScript(text => { if (!sessionStorage.getItem('exploration-fixture')) { localStorage.setItem('outpost.checkpoint.v1', text); sessionStorage.setItem('exploration-fixture', 'yes'); } }, encodeCheckpoint(w));
  await page.goto('/'); const hud = page.locator('#hud'), panel = page.locator('#navigation-panel'); await expect(hud).toHaveAttribute('data-state', 'paused');
  await page.getByRole('button', { name: 'Map', exact: true }).click(); const recover = page.getByRole('button', { name: 'Recover salvage [E]', exact: true });
  // Map is for planning: it pauses a flight, so the site is worked with E once the window is closed.
  await expect(recover).toBeDisabled(); await page.keyboard.press('Escape'); await expect(page.locator('#operations-dock')).toBeHidden(); await page.keyboard.press('p');
  await expect(hud).toHaveAttribute('data-state', 'flying'); await page.keyboard.press('e');
  await expect(hud).toHaveAttribute('data-cargo', '18.00');
  await page.getByRole('button', { name: 'Map', exact: true }).click();
  await expect(panel).toContainText('salvage 0.0 kg'); await expect(panel).toContainText('return to the green home pad');
  await page.locator('#operations-dock').evaluate(e => e.scrollTop = 0); await page.screenshot({ path: 'docs/screenshots/orbital-salvage.png' });
  await page.keyboard.press('Escape'); await page.keyboard.press('e');
  await expect(hud).toHaveAttribute('data-cargo', '18.00'); await expect(page.locator('.status')).toContainText('Cache empty');
  await page.keyboard.press('p'); await page.keyboard.press('k'); const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('outpost.checkpoint.v1')!));
  expect(saved.world.exploration.salvaged).toBe(18); expect(saved.world.exploration.surveyed).toContain('copper'); expect(saved.world.exploration.sites.find((s: { key: string }) => s.key === 'cache').mass).toBe(80);
  await restart(page); await expect(hud).toHaveAttribute('data-cargo', '0.00'); await page.keyboard.press('l'); await expect(hud).toHaveAttribute('data-cargo', '18.00');
  await page.reload(); await expect(hud).toHaveAttribute('data-state', 'paused'); await page.getByRole('button', { name: 'Map', exact: true }).click(); await expect(panel).toContainText('salvage 0.0 kg'); expect(errors).toEqual([]);
});

test('uses a finite tender supply with actual ship tank room', async ({ page }) => {
  const w = createWorld(), s = w.exploration.sites.find(s => s.key === 'tender')!; w.asteroids = []; w.ship.state = 'flying'; w.ship.fuel = WORLD.fuelCapacity - 5;
  w.ship.position = { x: s.position.x, y: s.position.y - 80 }; w.ship.velocity = { ...s.velocity }; w.exploration.selected = 'tender';
  await page.addInitScript(text => localStorage.setItem('outpost.checkpoint.v1', text), encodeCheckpoint(w)); await page.goto('/'); const hud = page.locator('#hud');
  const map = page.getByRole('button', { name: 'Map', exact: true }), panel = page.locator('#navigation-panel');
  await expect(hud).toHaveAttribute('data-state', 'paused'); await map.click();
  await expect(page.getByRole('button', { name: 'Transfer tender fuel [E]', exact: true })).toBeVisible();
  await page.keyboard.press('Escape'); await expect(page.locator('#operations-dock')).toBeHidden(); await page.keyboard.press('p');
  await expect(hud).toHaveAttribute('data-state', 'flying'); await page.keyboard.press('e');
  await expect(hud).toHaveAttribute('data-fuel', WORLD.fuelCapacity.toFixed(2));
  await map.click(); await expect(panel).toContainText('fuel 13.0 kg'); await page.keyboard.press('Escape');
  await page.keyboard.press('e'); await map.click(); await expect(panel).toContainText('fuel 13.0 kg');
});
