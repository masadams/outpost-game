import { expect, test } from '@playwright/test';
import { createWorld } from '../../src/sim/world';
import { WORLD, ATMOSPHERE } from '../../src/sim/config';
import { encodeCheckpoint } from '../../src/persistence/checkpoint';

test('identifies thin air, space exit and atmospheric return at the physical boundary', async ({ page }) => {
  test.setTimeout(45000); const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  const fixture = (above: boolean) => { const w = createWorld(); w.asteroids = []; w.ship.state = 'flying';
    w.ship.position.y = -WORLD.radius - ATMOSPHERE.height - (above ? 5 : -5); w.ship.velocity.y = above ? 10 : -10; return encodeCheckpoint(w); };
  await page.addInitScript(text => localStorage.setItem('outpost.checkpoint.v1', text), fixture(false));
  await page.goto('/'); const badge = page.locator('#flight-region'), hud = page.locator('#hud'), status = page.locator('#flight-status');
  await expect(hud).toHaveAttribute('data-state', 'paused'); await expect(badge).toHaveText('THIN AIR');
  await page.keyboard.press('p'); await expect(hud).toHaveAttribute('data-state', 'flying');
  await expect(badge).toHaveText('SPACE · VACUUM', { timeout: 6000 }); await expect(status).toContainText('NO AIR DRAG');
  await expect(status).toHaveAttribute('data-regime', 'vacuum'); await page.keyboard.press('p'); await expect(hud).toHaveAttribute('data-state', 'paused');
  await page.waitForTimeout(250); await expect(badge).toHaveText('SPACE · VACUUM');
  for (const [width, height] of [[900, 600], [1280, 800], [1920, 1080]]) {
    await page.setViewportSize({ width, height });
    const fits = await badge.evaluate(e => { const r = e.getBoundingClientRect(), sound = document.querySelector('#sound-panel')!.getBoundingClientRect();
      return r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight && !(r.left < sound.right && r.right > sound.left && r.top < sound.bottom && r.bottom > sound.top); });
    expect(fits).toBe(true);
  }
  await page.setViewportSize({ width: 1280, height: 800 }); await page.screenshot({ path: 'docs/screenshots/atmosphere-space.png' });
  await page.evaluate(text => localStorage.setItem('outpost.checkpoint.v1', text), fixture(true)); await page.keyboard.press('l');
  await expect(badge).toHaveText('SPACE · VACUUM'); await page.keyboard.press('p');
  await expect(badge).toHaveText('THIN AIR', { timeout: 6000 }); await expect(status).toHaveAttribute('data-regime', 'atmosphere');
  expect(errors).toEqual([]);
});
