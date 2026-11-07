import { expect } from '@playwright/test';
import { test } from './game';

const sizes = [[900, 600], [1280, 800], [1920, 1080]] as const;
test('keeps desktop controls inside the viewport and leaves a clear central flight corridor', async ({ page }) => {
  test.setTimeout(60000);
  for (const [width, height] of sizes) {
    await page.setViewportSize({ width, height }); await page.goto('/');
    await expect(page.locator('#hud')).toHaveAttribute('data-state', 'landed');
    await expect(page.locator('#operations-dock')).toBeHidden();
    await page.getByRole('button', { name: 'Build', exact: true }).click();
    await expect(page.getByRole('region', { name: 'Build', exact: true })).toBeVisible();
    const issues = await page.evaluate(() => {
      const selectors = ['#hud-chrome .screens', '#flight-tools', '#sound-panel', '#build-bar-host .build-bar', '.notices'];
      const rects = selectors.map(selector => ({ selector, box: document.querySelector(selector)!.getBoundingClientRect() }));
      const intersect = (a: { left: number; right: number; top: number; bottom: number }, b: { left: number; right: number; top: number; bottom: number }) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
      const centre = { left: innerWidth * 0.4, right: innerWidth * 0.6, top: innerHeight * 0.27, bottom: innerHeight * 0.59 };
      const errors: string[] = [];
      for (const { selector, box } of rects) {
        if (box.left < 0 || box.top < 0 || box.right > innerWidth || box.bottom > innerHeight) errors.push(`${selector} outside viewport`);
        if (intersect(box, centre)) errors.push(`${selector} blocks flight corridor`);
      }
      for (let i = 0; i < rects.length; i++) for (let j = i + 1; j < rects.length; j++) if (intersect(rects[i].box, rects[j].box)) errors.push(`${rects[i].selector} overlaps ${rects[j].selector}`);
      return errors;
    });
    expect(issues).toEqual([]);
    await page.screenshot({ path: `docs/screenshots/presentation-${width}.png` });
    await page.keyboard.press('Escape'); await expect(page.locator('#operations-dock')).toBeHidden();
  }
});

test('uses contextual panels with pause-safe mouse/keyboard navigation and readable construction scrolling', async ({ page }) => {
  test.setTimeout(45000); const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('/'); const hud = page.locator('#hud'), dock = page.locator('#operations-dock');
  await expect(dock).toBeHidden(); await page.keyboard.press('i'); await expect(dock).toHaveAttribute('data-panel', 'cargo');
  await page.keyboard.press('p'); await expect(hud).toHaveAttribute('data-state', 'paused'); const fuel = await hud.getAttribute('data-fuel');
  const combatButton = page.getByRole('button', { name: 'Weapons', exact: true }); await combatButton.focus(); await page.keyboard.press('Enter');
  await expect(dock).toHaveAttribute('data-panel', 'combat'); await expect(page.locator('.combat-panel')).toBeVisible();
  expect(await hud.getAttribute('data-fuel')).toBe(fuel);
  await page.keyboard.press('h'); await expect(page.getByRole('dialog')).toBeVisible(); await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden(); await expect(dock).toHaveAttribute('data-panel', 'combat');
  await page.keyboard.press('Escape'); await expect(dock).toBeHidden(); await page.keyboard.press('p'); await page.keyboard.press('f');
  await expect(hud).toHaveAttribute('data-context', 'surface'); await expect(dock).toBeHidden();
  await page.getByRole('button', { name:'Ship', exact: true }).focus(); await page.keyboard.press('Space');
  await expect(dock).toHaveAttribute('data-panel', 'cargo'); await expect(hud).toHaveAttribute('data-grounded', 'true');
  await page.keyboard.press('b'); await expect(hud).toHaveAttribute('data-context', 'construction');
  await expect(page.locator('.build-bar [data-select]')).toHaveCount(4);
  await page.getByRole('navigation',{name:'Building groups',exact:true}).getByRole('button',{name:'Defence',exact:true}).click();
  const last = page.locator('[data-select="shieldLarge"]'); await last.click(); await expect(last).toHaveAttribute('aria-pressed', 'true');
  const bar = page.getByRole('region', { name: 'Build', exact: true });
  await page.keyboard.press('Escape'); await expect(bar).toBeHidden();
  await page.getByRole('button', { name: 'Build', exact: true }).click(); await expect(bar).toBeVisible();
  expect(errors).toEqual([]);
});
