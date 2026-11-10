import { test, expect } from '@playwright/test';
import { createWorld } from '../../src/sim/world';
import { encodeCheckpoint } from '../../src/persistence/checkpoint';
import { completedBuilding } from '../../src/sim/construction';
import { stepColony } from '../../src/sim/colony';
import { STEP } from '../../src/sim/config';
import { TECH_IDS } from '../../src/sim/progressionConfig';
import { launchBeacon, stepSignal } from '../../src/sim/signal';
import { launchExpedition, stepExpedition } from '../../src/sim/expedition';

test.use({ viewport: { width: 1600, height: 900 }, storageState: { cookies: [], origins: [] } });

function staged(sent: boolean, heard = false, seed = 4242) {
  const w = createWorld(seed);
  w.system.sun = true;
  w.objectives.completed.push('delivery', 'industry', 'buoy');
  w.exploration.surveyed.push('frost');
  w.colony.research.completed.push(...TECH_IDS);
  w.colony.products = { ...w.colony.products, fuel: 90, alloy: 90, wire: 60, components: 60, water: 40, oxygen: 20 };
  w.colony.buildings.push(completedBuilding(1, 'solar', 0.12, w), completedBuilding(2, 'battery', 0.14, w), completedBuilding(3, 'observatory', 0.17, w), completedBuilding(4, 'antenna', 0.2, w));
  w.colony.nextId = 10;
  w.colony.energy = 20;
  for (let i = 0; i < 400; i++) stepColony(w, STEP);
  if (sent || heard) {
    launchBeacon(w);
    w.system.time = w.exploration.signal!.hearAt - 3;
  }
  if (heard) {
    w.system.time = w.exploration.signal!.hearAt + 1;
    stepSignal(w);
  }
  return w;
}

async function open(page: import('@playwright/test').Page, text: string) {
  await page.addInitScript(([t]) => { try { localStorage.setItem('outpost.sun', 'on'); localStorage.setItem('outpost.checkpoint.v1', t as string); } catch { /* blocked */ } }, [text]);
  await page.goto('/?sun=on');
  const menu = page.getByRole('dialog', { name: 'Outpost game menu', exact: true });
  await menu.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(menu).toBeHidden();
}

test('the beacon can be launched from Base and shows as listening on the Map', async ({ page }) => {
  test.setTimeout(90000);
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await open(page, encodeCheckpoint(staged(false)));
  await page.keyboard.press('p');
  await page.getByRole('button', { name: 'Base', exact: true }).click();
  await page.locator('[data-base-nav="expedition"]').click();
  await page.locator('[data-beacon]').click();
  await expect(page.locator('[data-signal="waiting"]')).toContainText('Listening');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Map', exact: true }).click();
  await expect(page.locator('.map-echo')).toHaveAttribute('aria-label', /Beacon out/);
  expect(errors).toEqual([]);
});

test('when the echo comes back Base and the Map name the far system', async ({ page }) => {
  test.setTimeout(90000);
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await open(page, encodeCheckpoint(staged(true)));
  await page.keyboard.press('p');
  await expect(page.locator('.status')).toContainText(/signal came back/i, { timeout: 15000 });
  await page.getByRole('button', { name: 'Base', exact: true }).click();
  await page.locator('[data-base-nav="expedition"]').click();
  await expect(page.locator('[data-echo]')).toContainText('light-hours');
  await page.screenshot({ path: '/tmp/claude-0/-home-user-outpost-game/69b8c470-1738-5ca3-a382-1afb3ca6b07d/scratchpad/shots/signal-base.png' });
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Map', exact: true }).click();
  await expect(page.locator('.map-echo')).toHaveAttribute('aria-label', /light-hours/);
  await page.screenshot({ path: '/tmp/claude-0/-home-user-outpost-game/69b8c470-1738-5ca3-a382-1afb3ca6b07d/scratchpad/shots/signal-map.png' });
  expect(errors).toEqual([]);
});

test('once the echo is in, an expedition can be packed and sent from Base', async ({ page }) => {
  test.setTimeout(90000);
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await open(page, encodeCheckpoint(staged(false, true)));
  await page.keyboard.press('p');
  await page.getByRole('button', { name: 'Base', exact: true }).click();
  await page.locator('[data-base-nav="expedition"]').click();
  await expect(page.locator('[data-expedition="plan"]')).toContainText('Pack for the hazard');
  await page.getByLabel(/Radiation shielding/).check();
  await expect(page.locator('[data-expedition="plan"]')).toContainText(/odds|Risky/);
  await page.screenshot({ path: '/tmp/claude-0/-home-user-outpost-game/69b8c470-1738-5ca3-a382-1afb3ca6b07d/scratchpad/shots/expedition-plan.png' });
  await page.locator('[data-expedition-go]').click();
  await expect(page.locator('[data-expedition="out"]')).toContainText('on its way');
  expect(errors).toEqual([]);
});

test('trouble on the way waits in Base for a decision', async ({ page }) => {
  test.setTimeout(90000);
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  let w = staged(false, true);
  for (let seed = 4243; seed < 4600; seed++) {
    w = staged(false, true, seed);
    w.exploration.signal!.echo!.hazard = 'strong radiation';
    launchExpedition(w, { fuel: false, shielding: true, stores: false });
    const e = w.exploration.expedition!;
    for (let i = 0; i < 200 && !e.pending && e.phase === 'out'; i++) {
      w.system.time += 60;
      stepExpedition(w);
    }
    if (e.pending) break;
  }
  await open(page, encodeCheckpoint(w));
  await page.keyboard.press('p');
  await page.getByRole('button', { name: 'Base', exact: true }).click();
  await page.locator('[data-base-nav="expedition"]').click();
  await expect(page.locator('[data-trouble]')).toContainText('strong radiation');
  await expect(page.locator('[data-choice="shields"]')).toHaveAttribute('data-safe', 'true');
  await page.locator('[data-choice="shields"]').click();
  await expect(page.locator('[data-expedition="out"]')).toContainText('shields held');
  expect(errors).toEqual([]);
});
