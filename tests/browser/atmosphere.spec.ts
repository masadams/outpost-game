import { expect } from '@playwright/test';
import { test } from './game';
import { WORLD } from '../../src/sim/config';

test('shows a live coast path and supports keyboard, wheel and button zoom while paused', async ({ page }) => {
  test.setTimeout(60000);
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/'); const hud = page.locator('#hud'), tools = page.locator('#flight-tools');
  await expect(page.locator('#flight-status')).toHaveAttribute('data-regime', 'atmosphere');
  await expect(tools).toHaveAttribute('data-trajectory', 'true');
  await page.keyboard.down('w');
  await expect.poll(async () => Number(await hud.getAttribute('data-altitude')), { timeout: 12000, intervals: [100] }).toBeGreaterThan(100);
  await page.keyboard.up('w'); await page.keyboard.press('p'); await expect(hud).toHaveAttribute('data-state', 'paused');
  await expect.poll(async () => Number(await tools.getAttribute('data-prediction-points'))).toBeGreaterThan(10);
  const altitude = await hud.getAttribute('data-altitude'), fuel = await hud.getAttribute('data-fuel');
  const initialZoom = Number(await tools.getAttribute('data-zoom'));
  await page.keyboard.press('-'); await expect(tools).toHaveAttribute('data-zoom-mode', 'manual');
  await expect.poll(async () => Number(await tools.getAttribute('data-zoom'))).toBeLessThan(initialZoom * 0.9);
  await page.mouse.move(640, 350); await page.mouse.wheel(0, 300);
  // Wait for wheel easing to approach its requested scale before testing the opposite direction.
  // A fixed delay can sample above the subsequent zoom-in target on software-rendered CI.
  await expect.poll(async () => Number(await tools.getAttribute('data-zoom')), { timeout: 10000 }).toBeLessThan(initialZoom * 0.48);
  const zoomedOut = Number(await tools.getAttribute('data-zoom'));
  await page.getByRole('button', { name: 'Zoom in', exact: true }).click();
  await expect.poll(async () => Number(await tools.getAttribute('data-zoom')), { timeout: 10000 }).toBeGreaterThan(zoomedOut * 1.03);
  await page.keyboard.press('j'); await expect(tools).toHaveAttribute('data-trajectory', 'false');
  await page.keyboard.press('j'); await expect(tools).toHaveAttribute('data-trajectory', 'true');
  await expect.poll(async () => Number(await tools.getAttribute('data-prediction-points'))).toBeGreaterThan(10);
  await page.keyboard.press('0'); await expect(tools).toHaveAttribute('data-zoom-mode', 'auto');
  await page.mouse.move(640, 350);
  for (let i = 0; i < 4; i++) await page.mouse.wheel(0, 300);
  await expect.poll(async () => Number(await tools.getAttribute('data-zoom')), { timeout: 10000 }).toBeLessThan(0.12);
  await page.screenshot({ path: 'docs/screenshots/atmosphere-trajectory.png' });
  expect(await hud.getAttribute('data-altitude')).toBe(altitude); expect(await hud.getAttribute('data-fuel')).toBe(fuel);
  expect(errors).toEqual([]);
});
