import { expect } from '@playwright/test';
import { test } from './game';

test('the Map moves with drag and arrow keys, zooms with the wheel and + / −, and keeps keys from the ship', async ({ page }) => {
  test.setTimeout(60000);
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('/');
  const hud = page.locator('#hud');
  await expect(hud).toHaveAttribute('data-state', 'landed');
  await page.getByRole('button', { name: 'Map', exact: true }).click();
  const chart = page.locator('.map-chart');
  await expect(chart).toBeVisible();
  const planet = page.locator('.map-body').first().locator('.map-planet');
  const read = async () => ({
    x: Number(await planet.getAttribute('cx')),
    y: Number(await planet.getAttribute('cy')),
    r: Number(await planet.getAttribute('r')),
  });
  const home = await read();

  // Arrow keys move the chart; the ship stays put behind the window.
  await page.keyboard.press('ArrowRight');
  await expect.poll(async () => (await read()).x).toBeLessThan(home.x - 50);
  await page.keyboard.press('ArrowUp');
  await expect.poll(async () => (await read()).y).toBeGreaterThan(home.y + 50);
  await page.waitForTimeout(600);
  await expect(hud).toHaveAttribute('data-state', 'landed');

  // 0 goes back home.
  await page.keyboard.press('0');
  await expect.poll(async () => (await read()).x).toBeCloseTo(home.x, 0);

  // + and − zoom.
  await page.keyboard.press('+');
  await expect.poll(async () => (await read()).r).toBeGreaterThan(home.r * 1.4);
  await page.keyboard.press('-');
  await expect.poll(async () => (await read()).r).toBeCloseTo(home.r, 0);

  // The wheel zooms toward the cursor; a small trackpad nudge alone does not jump.
  const box = (await chart.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.wheel(0, -30);
  await page.waitForTimeout(200);
  expect((await read()).r).toBeCloseTo(home.r, 0);
  await page.mouse.wheel(0, -120);
  await expect.poll(async () => (await read()).r).toBeGreaterThan(home.r * 1.4);

  // Dragging moves the chart.
  const before = await read();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 120, box.y + box.height / 2 + 40, { steps: 6 });
  await page.mouse.up();
  await expect.poll(async () => (await read()).x).toBeGreaterThan(before.x + 60);
  expect(errors).toEqual([]);
});
