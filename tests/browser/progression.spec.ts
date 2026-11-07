import { expect } from '@playwright/test';
import { test } from './game';
import { createWorld } from '../../src/sim/world';
import { encodeCheckpoint } from '../../src/persistence/checkpoint';
import { TECH_IDS, BASE_UPGRADE_IDS, UPGRADES } from '../../src/sim/progressionConfig';
import { WORLD } from '../../src/sim/config';

test('builds a powered lab, earns research with real work and fabricates cargo equipment at home', async ({ page }) => {
  test.setTimeout(150000); const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('/'); const hud = page.locator('#hud'), console = page.locator('#command-console'); await expect(hud).toHaveAttribute('data-state', 'landed');
  await page.keyboard.press('f'); await page.keyboard.down('d'); await expect.poll(async () => Number(await hud.getAttribute('data-surface-angle')) * WORLD.radius, { timeout: 12000, intervals: [100] }).toBeGreaterThan(96);
  await page.keyboard.up('d'); await page.waitForTimeout(450); await page.keyboard.press('b'); await page.keyboard.press('Enter'); await expect(hud).toHaveAttribute('data-buildings', '1');
  await page.keyboard.press('t'); await page.getByRole('navigation',{name:'Building groups',exact:true}).getByRole('button',{name:'Industry & research',exact:true}).click(); await page.locator('[data-select="researchLab"]').click(); await page.keyboard.press('Enter'); await expect(hud).toHaveAttribute('data-buildings', '2'); await page.keyboard.press('b');
  await page.getByRole('button', { name:'Base', exact: true }).click(); await page.getByRole('button',{name:'Research',exact:true}).click();
  const start = page.getByRole('button', { name: 'Research Applied materials', exact: true }); await start.focus(); await page.keyboard.press('Space'); await expect(hud).toHaveAttribute('data-grounded', 'true');
  const progress = console.locator('[data-project="materials"] progress'); await expect.poll(async () => Number(await progress.getAttribute('value')), { timeout: 15000 }).toBeGreaterThan(2);
  await page.keyboard.press('p'); await page.keyboard.press('k'); const save = await page.evaluate(() => JSON.parse(localStorage.getItem('outpost.checkpoint.v1')!));
  expect(save.version).toBe(34); expect(save.world.colony.products.alloy).toBe(14); expect(save.world.colony.research.queue[0].progress).toBeGreaterThan(2); expect(save.world.colony.research.completed).toEqual([]);
  await page.reload(); await expect(hud).toHaveAttribute('data-state', 'paused'); await page.getByRole('button', { name:'Base', exact: true }).click(); await page.getByRole('button',{name:'Research',exact:true}).click();
  await page.keyboard.press('p');await expect(console.locator('[data-project="materials"]')).toHaveCount(0,{timeout:45000});await page.getByLabel('Research view',{exact:true}).selectOption('complete');await expect(console.locator('[data-tech="materials"]')).toHaveAttribute('data-state','complete');
  await expect(console.locator('[data-project="materials"]')).toHaveCount(0); await page.keyboard.press('Escape');
  await page.keyboard.down('a'); await expect.poll(async () => Number(await hud.getAttribute('data-surface-angle')) * WORLD.radius, { timeout: 15000, intervals: [100] }).toBeLessThan(10);
  await page.keyboard.up('a'); await page.waitForTimeout(450); await page.keyboard.press('f'); await expect(hud).toHaveAttribute('data-mode', 'ship');
  await page.getByRole('button', { name:'Base', exact: true }).click(); await page.getByRole('button',{name:'Ship fitting',exact:true}).click();
  const fabricate = page.getByRole('button', { name: 'Fabricate Cargo rack', exact: true }); await expect(fabricate).toBeEnabled(); await fabricate.focus(); await page.keyboard.press('Enter');
  await expect(console.locator('[data-upgrade="cargo"]')).toHaveAttribute('data-installed', 'true');
  await console.locator('[data-upgrade="cargo"]').scrollIntoViewIfNeeded(); await page.screenshot({ path: 'docs/screenshots/ship-equipment.png' });
  await page.getByRole('button', { name:'Ship', exact: true }).click(); await expect(page.locator('.mining')).toContainText('/ 200 kg');
  await page.keyboard.press('p'); await page.keyboard.press('k'); const equipped = await page.evaluate(() => JSON.parse(localStorage.getItem('outpost.checkpoint.v1')!));
  expect(equipped.world.ship.equipment).toEqual(['cargo']); expect(equipped.world.ship.fuel).toBe(240); expect(equipped.world.ship.hull).toBe(100); expect(equipped.world.colony.research.completed).toEqual(['materials']); expect(equipped.world.colony.products.alloy).toBe(8); expect(errors).toEqual([]);
});

test('compares and installs bounded modules, fills a paid extended tank and safely removes it without free fuel', async ({ page }) => {
  test.setTimeout(90000); const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  const w = createWorld(); w.asteroids = []; w.colony.research.completed = [...TECH_IDS]; w.colony.products = { alloy: 100, wire: 100, components: 100, water: 0, oxygen: 0, fuel: 80 };
  w.colony.buildings = [{ id: 1, kind: 'battery', angle: .1, enabled: true, health: 100, recipe: 0, progress: 0, status: 'idle' }]; w.colony.nextId = 2; w.colony.energy = 200;
  await page.addInitScript(text => { if (!sessionStorage.getItem('equipment-fixture')) { localStorage.setItem('outpost.checkpoint.v1', text); sessionStorage.setItem('equipment-fixture', 'yes'); } }, encodeCheckpoint(w));
  await page.goto('/'); const hud = page.locator('#hud'), console = page.locator('#command-console'); await expect(hud).toHaveAttribute('data-state', 'paused');
  await page.getByRole('button', { name:'Base', exact: true }).click(); await page.getByRole('button',{name:'Ship fitting',exact:true}).click();
  await page.locator('[data-part-slot="drive"]').click();await expect(page.getByRole('button', { name: 'Fabricate High-thrust engine', exact: true })).toBeDisabled(); await page.keyboard.press('p');
  for (const id of BASE_UPGRADE_IDS) { await page.locator('[data-part-slot="'+UPGRADES[id].slot+'"]').click();await expect(console.locator(`[data-upgrade="${id}"]`)).toBeVisible(); await page.getByRole('button', { name: `Fabricate ${UPGRADES[id].label}`, exact: true }).click(); await expect(console.locator(`[data-upgrade="${id}"]`)).toHaveAttribute('data-installed', 'true'); }
  await expect(console.locator('.equipment-panel')).toContainText('modules 98 kg'); await expect(console.locator('.equipment-panel')).toContainText('/ 320 kg');
  await page.keyboard.press('Escape'); await page.keyboard.press('e'); await expect(hud).toHaveAttribute('data-fuel', '320.00');
  await page.getByRole('button', { name:'Base', exact: true }).click();await page.locator('[data-part-slot="tank"]').click(); await page.getByRole('button', { name: 'Remove Extended fuel tank', exact: true }).click();
  await expect(console.locator('[data-upgrade="tank"]')).toHaveAttribute('data-installed', 'false'); await expect(hud).toHaveAttribute('data-fuel', '240.00');
  await page.keyboard.press('p'); await page.keyboard.press('k'); const save = await page.evaluate(() => JSON.parse(localStorage.getItem('outpost.checkpoint.v1')!));
  expect(save.world.ship.equipment).toHaveLength(7); expect(save.world.colony.products.fuel).toBe(80); expect(save.world.colony.energy).toBe(40); expect(save.world.ship.armament.cannon).toBe(40); expect(save.world.ship.hull).toBe(100);
  await page.reload(); await expect(hud).toHaveAttribute('data-state', 'paused'); await page.getByRole('button', { name:'Base', exact: true }).click(); await page.getByRole('button',{name:'Ship fitting',exact:true}).click();
  await page.locator('[data-part-slot="drive"]').click();await expect(console.locator('[data-upgrade="engine"]')).toHaveAttribute('data-installed', 'true'); await page.locator('[data-part-slot="tank"]').click();await expect(console.locator('[data-upgrade="tank"]')).toHaveAttribute('data-installed', 'false'); expect(errors).toEqual([]);
});
