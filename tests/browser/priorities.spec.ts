import { expect } from '@playwright/test';
import { test, restart } from './game';
import { WORLD } from '../../src/sim/config';

test('manages reserves from ship and surface, protects production/storage/materials and restores policy', async ({ page }) => {
  // This full construction/hold/release/save route takes longer on software-rendered CI runners.
  test.setTimeout(120000); const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('/'); const hud = page.locator('#hud'), policy = page.locator('.policy-controls:visible');
  // From the ship, reserves live in Base → Economy.
  await page.getByRole('button', { name: 'Base', exact: true }).click(); await page.getByRole('button', { name: 'Economy', exact: true }).click();
  await page.locator('.policy-controls:visible summary').focus(); await page.keyboard.press('Enter');
  await expect(policy).toHaveAttribute('open', '');
  const powerUp = page.getByRole('button', { name: 'Raise Essential systems power reserve', exact: true });
  for (let i = 0; i < 4; i++) await powerUp.click();
  await expect(page.locator('[data-policy-value="energyReserve"]:visible')).toHaveText('20');
  await expect(hud).toHaveAttribute('data-mode', 'ship'); await expect(policy).toHaveAttribute('open', '');
  await page.keyboard.press('Escape');await page.keyboard.press('f'); await page.keyboard.down('d');
  await expect.poll(async () => Number(await hud.getAttribute('data-surface-angle')) * WORLD.radius, { timeout: 10000, intervals: [100] }).toBeGreaterThan(96);
  await page.keyboard.up('d'); await page.waitForTimeout(450);
  await page.keyboard.press('b'); await page.keyboard.press('Enter'); await page.keyboard.press('t');
  await page.getByRole('navigation',{name:'Building groups',exact:true}).getByRole('button',{name:'Industry & research',exact:true}).click(); await page.locator('[data-select="miningRig"]').click(); await page.keyboard.press('Enter'); await expect(hud).toHaveAttribute('data-buildings', '2');
  await page.keyboard.press('b'); await page.keyboard.down('d');
  await expect.poll(async () => Number(await hud.getAttribute('data-surface-angle')) * WORLD.radius, { timeout: 8000, intervals: [100] }).toBeGreaterThan(145);
  await page.keyboard.up('d'); await page.waitForTimeout(450);
  await expect(page.locator('.machine')).toContainText('power reserved'); await expect(hud).toHaveAttribute('data-depot', '0.00');
  // On foot the nearby panel has its own reserves section; open it.
  if (await policy.getAttribute('open') === null) await page.locator('.policy-controls:visible summary').click();
  const powerDown = page.getByRole('button', { name: 'Lower Essential systems power reserve', exact: true });
  for (let i = 0; i < 4; i++) await powerDown.click();
  await expect.poll(async () => Number(await hud.getAttribute('data-depot')), { timeout: 6000 }).toBeGreaterThan(0);
  for (let i = 0; i < 16; i++) await page.getByRole('button', { name: 'Raise Ship delivery room reserve', exact: true }).click();
  await expect(page.locator('.machine')).toContainText('delivery reserved'); const ore = await hud.getAttribute('data-depot');
  await page.waitForTimeout(2200); await expect(hud).toHaveAttribute('data-depot', ore!);
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'Raise Turret alloy reserve', exact: true }).click();
  const componentsUp = page.getByRole('button', { name: 'Raise Turret components reserve', exact: true });
  await componentsUp.focus(); await page.keyboard.press('Space');
  for (let i = 0; i < 4; i++) await componentsUp.click();
  await expect(hud).toHaveAttribute('data-grounded', 'true'); await expect(page.locator('[data-policy-value="componentsReserve"]:visible')).toHaveText('5');
  await page.keyboard.press('b'); await page.keyboard.press('4'); await page.keyboard.press('Enter');
  await expect(page.locator('.status')).toContainText('Materials reserved for turrets');
  await expect(hud).toHaveAttribute('data-buildings', '2'); await page.keyboard.press('b');
  await page.keyboard.press('p'); await expect(componentsUp).toBeDisabled(); await page.keyboard.press('k');
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('outpost.checkpoint.v1')!));
  expect(saved.version).toBe(31); expect(saved.world.colony.policy).toEqual({ energyReserve: 0, deliveryReserve: 400, alloyReserve: 15, componentsReserve: 5 });
  await page.locator('#operations-dock').evaluate(e => { e.scrollTop = 0; });
  await page.screenshot({ path: 'docs/screenshots/colony-priorities.png' });
  await restart(page); await expect(page.locator('[data-policy-value="deliveryReserve"]').first()).toHaveText('0');
  await page.keyboard.press('l'); await expect(hud).toHaveAttribute('data-state', 'paused');
  await expect(page.locator('[data-policy-value="deliveryReserve"]').first()).toHaveText('400'); await expect(hud).toHaveAttribute('data-depot', ore!);
  await page.reload(); await expect(hud).toHaveAttribute('data-state', 'paused');
  await page.getByRole('button', { name: 'Base', exact: true }).click(); await page.getByRole('button', { name: 'Economy', exact: true }).click();
  await page.locator('.policy-controls:visible summary').click(); await expect(page.locator('[data-policy-value="alloyReserve"]:visible')).toHaveText('15');
  await page.keyboard.press('p'); await page.getByRole('button', { name: 'Lower Ship delivery room reserve', exact: true }).click();
  await expect.poll(async () => Number(await hud.getAttribute('data-depot')), { timeout: 6000 }).toBeGreaterThan(Number(ore));
  expect(errors).toEqual([]);
});
