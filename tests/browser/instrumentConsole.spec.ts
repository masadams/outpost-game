import { expect } from '@playwright/test';
import { test } from './game';
import { createWorld } from '../../src/sim/world';
import { encodeCheckpoint } from '../../src/persistence/checkpoint';
import { WORLD } from '../../src/sim/config';
import { SUIT } from '../../src/sim/astronaut';
import { planetAt, surfacePosition } from '../../src/sim/celestial';

/** A fast, tilted, spinning approach with little fuel left. */
function danger() {
  const w = createWorld();
  w.asteroids = [];
  w.ship.state = 'flying';
  w.ship.position.y = -WORLD.radius - WORLD.shipRadius - 80;
  w.ship.velocity = { x: 6, y: 20 };
  w.ship.angularVelocity = 0.5;
  w.ship.angle = 0.4;
  w.ship.fuel = 10;
  return w;
}

test('keeps cautions visible and opens telemetry details without changing a paused flight', async ({ page }) => {
  const w = danger();
  await page.addInitScript(text => localStorage.setItem('outpost.checkpoint.v1', text), encodeCheckpoint(w));
  await page.goto('/');
  const hud = page.locator('#hud');
  const cluster = page.locator('#instrument-console .cluster');

  await expect(cluster.locator('[data-instrument]')).toHaveCount(6);
  await expect(cluster.locator('.cluster-attitude')).toBeVisible();
  await expect(page.locator('.status')).toHaveText('PAUSED · CHECKPOINT LOADED · P TO RESUME');
  await expect(page.locator('#flight-status')).toBeHidden();
  await expect(page.locator('[data-caution="spin"]')).toBeVisible();
  await expect(page.locator('#flight-alert')).toContainText('DESCENT HIGH');
  await expect(page.locator('.instrument-mode')).toContainText('LANDING');
  const limits = page.getByRole('group', { name: 'Touchdown limits', exact: true });
  await expect(limits.locator('[data-limit]')).toHaveCount(3);
  await expect(limits.locator('[data-limit="radial"]')).toHaveAttribute('data-level', 'critical');

  const time = await hud.getAttribute('data-time');
  const fuel = await hud.getAttribute('data-fuel');
  await page.getByRole('button', { name: 'Show telemetry details', exact: true }).focus();
  await page.keyboard.press('Space');
  await expect(page.getByRole('region', { name: 'Detailed flight telemetry', exact: true })).toBeVisible();
  await expect(page.locator('#flight-status')).toBeVisible();
  await expect(page.locator('[data-instrument="spin"] strong')).toHaveText('0.50 rad/s');
  await expect(page.getByRole('button', { name: 'Hide telemetry details', exact: true })).toBeFocused();
  await page.waitForTimeout(300);
  await expect(hud).toHaveAttribute('data-time', time!);
  await expect(hud).toHaveAttribute('data-fuel', fuel!);
  await page.keyboard.press('Enter');
  await expect(page.locator('.telemetry-details')).toBeHidden();

  await page.keyboard.press('k');
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('outpost.checkpoint.v1')!).world);
  expect(saved.ship.fuel).toBe(10);
  expect(saved.ship.equipment).toEqual([]);
  expect(saved.colony.products).toEqual(w.colony.products);

  const vertical = cluster.locator('[data-instrument="radial"] strong');
  const before = await vertical.innerText();
  await page.keyboard.press('p');
  await expect.poll(async () => Number(await hud.getAttribute('data-time'))).toBeGreaterThan(0);
  await expect(vertical).not.toHaveText(before);
  await page.keyboard.press('p');
  await expect(hud).toHaveAttribute('data-state', 'paused');
});

test('fits the cluster at supported sizes and enlarged text, with details above it', async ({ page }) => {
  test.setTimeout(90000);
  await page.addInitScript(text => localStorage.setItem('outpost.checkpoint.v1', text), encodeCheckpoint(danger()));
  for (const [width, height] of [[900, 600], [1280, 800], [1920, 1080]]) {
    for (const scale of ['1', '1.5']) {
      await page.setViewportSize({ width, height });
      await page.goto('/');
      await page.getByRole('button', { name: 'Open settings', exact: true }).click();
      await page.getByLabel('Text size', { exact: true }).selectOption(scale);
      await page.getByRole('button', { name: 'Return to game', exact: true }).click();
      const cluster = page.locator('#instrument-console .cluster');
      const box = (await cluster.boundingBox())!;
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(width);
      expect(box.y + box.height).toBeLessThanOrEqual(height);
      expect(box.height).toBeLessThanOrEqual(height * 0.35);
      const clipped = await cluster.evaluate(root =>
        Array.from(root.querySelectorAll<HTMLElement>('.cluster-label, strong, .instrument-mode'))
          .filter(e => e.scrollWidth > e.clientWidth + 1)
          .map(e => e.textContent),
      );
      expect(clipped, `${width}×${height} at ${scale}×`).toEqual([]);
      const collisions = await page.evaluate(() => {
        const boxes = (selector: string) => Array.from(document.querySelectorAll<HTMLElement>(selector))
          .filter(e => e.offsetParent !== null)
          .map(e => ({ name: `${selector} ${e.textContent?.trim().slice(0, 12)}`, r: e.getBoundingClientRect() }));
        const overlap = (a: DOMRect, b: DOMRect) => a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1;
        const problems: string[] = [];
        for (const group of ['.cluster-readout', '.cluster-bar', '.touchdown-limit', '.cluster-body > section']) {
          const items = boxes(group);
          items.forEach((a, i) => items.slice(i + 1).forEach(b => { if (overlap(a.r, b.r)) problems.push(`${a.name} × ${b.name}`); }));
          for (const item of items) {
            if (item.r.left < 0 || item.r.right > innerWidth || item.r.top < 0) problems.push(`${item.name} off screen`);
          }
        }
        const left = document.querySelector('#hud-chrome .chrome-left')!.getBoundingClientRect();
        const right = document.querySelector('#hud-chrome .chrome-right')!.getBoundingClientRect();
        if (overlap(left, right)) problems.push('left chrome × right chrome');
        return problems;
      });
      expect(collisions, `${width}×${height} at ${scale}×`).toEqual([]);
      await page.screenshot({ path: `docs/screenshots/instruments-${width}-${scale === '1' ? 'standard' : 'large'}.png` });
      await page.getByRole('button', { name: 'Show telemetry details', exact: true }).click();
      const drawer = (await page.locator('.telemetry-details').boundingBox())!;
      expect(drawer.x).toBeGreaterThanOrEqual(0);
      expect(drawer.y).toBeGreaterThanOrEqual(0);
      expect(drawer.x + drawer.width).toBeLessThanOrEqual(width);
      expect(drawer.y + drawer.height).toBeLessThanOrEqual(box.y);
      await page.getByRole('button', { name: 'Hide telemetry details', exact: true }).click();
    }
  }
});

test('switches to suit gauges on foot and keeps low suit air visible', async ({ page }) => {
  const w = createWorld();
  w.asteroids = [];
  w.playerMode = 'astronaut';
  w.astronaut.position = surfacePosition(planetAt('home', w.system), 0, SUIT.radius);
  w.astronaut.oxygen = 20;
  await page.addInitScript(text => localStorage.setItem('outpost.checkpoint.v1', text), encodeCheckpoint(w));
  await page.goto('/');
  const cluster = page.locator('#instrument-console .cluster');
  await expect(cluster.locator('[data-instrument]')).toHaveCount(4);
  await expect(cluster.locator('.cluster-attitude')).toHaveCount(0);
  await expect(page.locator('[data-instrument="oxygen"]').first()).toHaveAttribute('data-level', 'critical');
  await expect(page.locator('[data-caution="oxygen"]')).toBeVisible();
  await expect(page.locator('.instrument-mode')).toContainText('EVA');
  await expect(page.locator('#combat-status')).toBeHidden();
  await page.screenshot({ path: 'docs/screenshots/instruments-crew.png' });
});
