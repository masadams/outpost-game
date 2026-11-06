import { expect } from '@playwright/test';
import { test } from './game';
import { createWorld } from '../../src/sim/world';
import { completedBuilding } from '../../src/sim/construction';
import { encodeCheckpoint } from '../../src/persistence/checkpoint';
import { TECH_IDS } from '../../src/sim/progressionConfig';
import { WORLD } from '../../src/sim/config';

test('queues a paid emitter, charges it from solar, operates native controls and preserves pause/load', async ({ page }) => {
  test.setTimeout(100000); const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  const w = createWorld(); w.asteroids = []; w.playerMode = 'astronaut'; w.colony.research.completed = [...TECH_IDS];
  w.colony.buildings = [completedBuilding(1, 'solar', .2, w), completedBuilding(2, 'battery', .3, w)]; w.colony.nextId = 3;
  await page.addInitScript(text => { if (!sessionStorage.getItem('shield-fixture')) { localStorage.setItem('outpost.checkpoint.v1', text); sessionStorage.setItem('shield-fixture', 'yes'); } }, encodeCheckpoint(w));
  await page.goto('/'); const hud = page.locator('#hud'), console = page.locator('#command-console'); await expect(hud).toHaveAttribute('data-state', 'paused');
  await page.getByRole('button', { name:'Base', exact: true }).click(); await page.getByRole('button',{name:'Construction',exact:true}).click();
  await page.keyboard.press('p'); await page.locator('#command-blueprint').selectOption('shieldSmall'); await page.locator('#command-site').fill('90'); await page.locator('#command-site').press('Tab');
  const queue = page.getByRole('button', { name: 'Queue paid construction', exact: true }); await expect(queue).toBeEnabled(); await queue.focus(); await page.keyboard.press('Enter');
  await expect(hud).toHaveAttribute('data-buildings', '3', { timeout: 30000 }); await page.getByRole('button',{name:'Facilities',exact:true}).click(); await page.getByRole('button', { name: 'Select facility 3', exact: true }).click();
  const charge = page.getByRole('meter', { name: 'Shield charge', exact: true }); await expect.poll(async () => Number(await charge.getAttribute('value')), { timeout: 30000 }).toBeGreaterThan(30);
  await expect(console.locator('[data-selected="3"]')).toContainText('shield active');
  await console.locator('[data-selected="3"]').scrollIntoViewIfNeeded(); await page.screenshot({ path: 'docs/screenshots/shield-active.png' });
  await page.keyboard.press('p'); const held = Number(await charge.getAttribute('value')); await page.waitForTimeout(300); expect(Number(await charge.getAttribute('value'))).toBe(held);
  await page.keyboard.press('k'); const save = await page.evaluate(() => JSON.parse(localStorage.getItem('outpost.checkpoint.v1')!)); expect(save.version).toBe(25); expect(save.world.colony.products).toMatchObject({ alloy: 16, wire: 10, components: 5 }); expect(save.world.colony.buildings[2].shield.charge).toBeGreaterThan(30);
  await page.reload(); await page.getByRole('button', { name:'Base', exact: true }).click(); await page.getByRole('button', { name: 'Select facility 3', exact: true }).click(); await expect(charge).toHaveAttribute('value', String(save.world.colony.buildings[2].shield.charge));
  await expect(page.getByRole('button', { name: 'Disable selected', exact: true })).toBeDisabled(); await page.keyboard.press('p');
  const slider = page.getByRole('slider', { name: 'Selected facility power limit' }); await slider.focus(); await page.keyboard.press('Home'); await expect(console.locator('[data-selected="3"]')).toContainText('power limited');
  await expect(hud).toHaveAttribute('data-grounded', 'true'); await page.getByRole('button', { name: 'Disable selected', exact: true }).click(); await expect(console.locator('[data-selected="3"]')).toContainText('disabled');
  expect(errors).toEqual([]);
});

test('intercepts a real fast meteor, displays breach recovery and fits supported desktop layouts', async ({ page }) => {
  test.setTimeout(60000); const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  const w = createWorld(); w.asteroids = []; w.exploration.sites = []; w.colony.research.completed = [...TECH_IDS];
  const b = completedBuilding(1, 'shieldSmall', 0, w); Object.assign(b.shield!, { charge: 15, ready: true, powered: true, delay: 2 });
  w.colony.buildings = [b, completedBuilding(2, 'solar', .1, w)]; w.colony.nextId = 3;
  w.defence.meteors.push({ id: w.nextId++, position: { x: 0, y: -WORLD.radius - 100 }, velocity: { x: 0, y: 500 }, mass: 1200, radius: 2, stage: 1, resource: 'iron', health: .55, maxHealth: .55, impactBudget: 15 });
  await page.addInitScript(text => localStorage.setItem('outpost.checkpoint.v1', text), encodeCheckpoint(w)); await page.emulateMedia({ reducedMotion: 'reduce' }); await page.goto('/');
  await page.getByRole('button', { name:'Base', exact: true }).click(); const console = page.locator('#command-console'); await page.getByRole('button',{name:'Shields',exact:true}).click();
  const accents = page.getByRole('checkbox', { name: 'Shield hit colour accents' }); await expect(accents).not.toBeChecked();
  await page.keyboard.press('p'); await expect(console).toBeVisible(); await expect(console).toContainText('1 hits · 1 breaches', { timeout: 10000 }); await page.keyboard.press('p');
  await expect(page.locator('#operations-dock')).toHaveAttribute('data-panel', 'command');
  await page.getByRole('button',{name:'Facilities',exact:true}).click(); await page.getByRole('button', { name: 'Select facility 1', exact: true }).click(); await expect(console.locator('[data-selected="1"]')).toContainText('shield breached'); await expect(page.locator('#threat-alert')).toContainText('BREACHED');
  await page.keyboard.press('k'); const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('outpost.checkpoint.v1')!));
  expect(saved.world.defence.meteors).toHaveLength(0); expect(saved.world.pickups).toHaveLength(0); expect(saved.world.colony.shielding.dustMass).toBe(1200); expect(saved.world.ship.hull).toBe(100); expect(saved.world.colony.buildings[0].shield.recovery).toBeGreaterThan(0);
  await page.getByRole('button',{name:'Shields',exact:true}).click();
  for (const viewport of [{ width: 900, height: 600 }, { width: 1280, height: 800 }, { width: 1920, height: 1080 }]) {
    await page.setViewportSize(viewport); await expect(accents).toBeEnabled(); await accents.check(); await expect(accents).toBeChecked(); await accents.uncheck();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.setViewportSize({ width: 1280, height: 800 }); await page.getByRole('button',{name:'Facilities',exact:true}).click(); await page.getByRole('button', { name: 'Select facility 1', exact: true }).click(); await console.locator('[data-selected="1"]').scrollIntoViewIfNeeded(); await page.screenshot({ path: 'docs/screenshots/shield-breach.png' });
  expect(errors).toEqual([]);
});
