import { expect, type Page } from '@playwright/test';
import { test } from './game';
import { TestPilot } from '../helpers/pilot';
import { createShip } from '../../src/sim/physics';
import { planetAt, relative, surfacePosition, type BodyId } from '../../src/sim/celestial';

test.use({ viewport: { width: 900, height: 600 } });

async function telemetry(page: Page) {
  return page.locator('#hud').evaluate(el => {
    const d = (el as HTMLElement).dataset;
    return { time: Number(d.time), x: Number(d.x), y: Number(d.y), vx: Number(d.vx), vy: Number(d.vy), angle: Number(d.angle), spin: Number(d.spin), fuel: Number(d.fuel), cargo: Number(d.cargo), state: d.state, body: d.body, arc: Number(d.surfaceAngle) };
  });
}
async function advance(page: Page, milliseconds: number) {
  // At 10 render frames/s, each frame still runs all six ordinary 60 Hz physics steps.
  for (let elapsed = 0; elapsed < milliseconds; elapsed += 100) await page.clock.fastForward(Math.min(100, milliseconds - elapsed));
}
async function tap(page: Page, key: string) { await page.keyboard.press(key); await advance(page, 100); }
async function fly(page: Page, id: BodyId, height: number, limit = 200, angle = 0) {
  globalThis.console.info(`Flight stage: ${id}, ${height} m`);
  const pilot = new TestPilot(), held = new Set<string>();
  for (let i = 0; i < limit * 10; i++) {
    const data = await telemetry(page), system = { time: data.time, binary: true }, planet = planetAt(id, system);
    const target = { position: surfacePosition(planet, angle, height), velocity: planet.velocity };
    const range = Math.hypot(target.position.x - data.x, target.position.y - data.y), dv = Math.hypot(planet.velocity.x - data.vx, planet.velocity.y - data.vy);
    if (data.state === 'crashed') throw new Error(`Flight crash ${id}/${height}: ${JSON.stringify(data)}`);
    if (i > 2 && (height === 7 ? data.state === 'landed' && data.body === id : range < 5 && dv < 2)) {
      for (const key of held) await page.keyboard.up(key); await advance(page, 100); return;
    }
    const ship = createShip(); ship.position = { x: data.x, y: data.y }; ship.velocity = { x: data.vx, y: data.vy }; ship.angle = data.angle; ship.angularVelocity = data.spin; ship.fuel = data.fuel; ship.cargo.iron = data.cargo; ship.state = data.state === 'landed' ? 'landed' : 'flying';
    const input = pilot.input(ship, target, system, .1), next = new Set<string>([...(input.thrust ? ['w'] : []), ...(input.turn > 0 ? ['d'] : input.turn < 0 ? ['a'] : [])]);
    for (const key of held) if (!next.has(key)) { await page.keyboard.up(key); held.delete(key); }
    for (const key of next) if (!held.has(key)) { await page.keyboard.down(key); held.add(key); }
    await advance(page, 100);
  }
  throw new Error(`Flight timeout ${id}/${height}: ${JSON.stringify(await telemetry(page))}`);
}
async function cargo(page: Page) {
  await page.getByRole('button', { name:'Ship', exact: true }).click({ force: true }); await advance(page, 100);
  const summary = page.locator('.mining summary').filter({ hasText: 'Manufactured freight' });
  if (!await summary.evaluate(el => (el.parentElement as HTMLDetailsElement).open)) await summary.click({ force: true });
}
async function freight(page: Page, operation: 'Load' | 'Unload', product: string, count: number) {
  for (let i = 0; i < count; i++) { await page.getByRole('button', { name: `${operation} ${product} freight`, exact: true }).click({ force: true }); await advance(page, 100); }
}
async function walk(page: Page, direction: 'a' | 'd', target: number) {
  await page.keyboard.down(direction);
  for (let i = 0; i < 200; i++) { await advance(page, 100); const arc = (await telemetry(page)).arc * 450; if (direction === 'd' ? arc >= target : arc <= target) break; }
  await page.keyboard.up(direction); await advance(page, 600);
}

test('flies to the moving moon, builds supplied mining, saves both colonies, carries real ore home and lands', async ({ page }) => {
  test.setTimeout(600000); const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.clock.install({ time: new Date('2030-01-01T00:00:00Z') }); await page.clock.pauseAt(new Date('2030-01-01T00:00:01Z'));
  await page.goto('/'); await advance(page, 500); const hud = page.locator('#hud'); await expect(hud).toHaveAttribute('data-state', 'landed');
  await tap(page, 'm'); await tap(page, 'j');
  await cargo(page); await freight(page, 'Load', 'alloy', 3); await freight(page, 'Load', 'wire', 1); await freight(page, 'Load', 'components', 1);
  expect((await telemetry(page)).cargo).toBe(25); await tap(page, 'Escape');
  await page.getByRole('button', { name: 'Map', exact: true }).click({ force: true }); await advance(page, 100);
  await page.getByRole('button', { name: 'Nacre moon', exact: true }).click({ force: true }); await advance(page, 100); await expect(page.locator('#navigation-guidance')).toHaveAttribute('data-target', 'moon'); await tap(page, 'Escape');
  // The clock advances real fixed simulation/render steps; the test only reads HUD telemetry and presses normal keys.
  await page.keyboard.down('Space'); await page.keyboard.down('c'); await fly(page, 'home', 1500); await page.keyboard.up('Space'); await page.keyboard.up('c');
  await fly(page, 'moon', 150); await fly(page, 'moon', 7, 120); await expect(hud).toHaveAttribute('data-body', 'moon'); await expect(page.locator('#flight-region')).toHaveText('AIRLESS · VACUUM');
  await cargo(page); await freight(page, 'Unload', 'alloy', 3); await freight(page, 'Unload', 'wire', 1); await freight(page, 'Unload', 'components', 1); await tap(page, 'Escape');
  await tap(page, 'f'); await walk(page, 'd', 120); await tap(page, 'b');
  await page.getByRole('navigation',{name:'Building groups',exact:true}).getByRole('button',{name:'Industry & research',exact:true}).click(); await page.locator('[data-select="miningRig"]').click({ force: true }); await advance(page, 100); await tap(page, 'Enter'); await expect(hud).toHaveAttribute('data-buildings', '1');
  await tap(page, 't'); await page.getByRole('navigation',{name:'Building groups',exact:true}).getByRole('button',{name:'Power & storage',exact:true}).click(); await page.locator('[data-select="solar"]').click({ force: true }); await advance(page, 100); await tap(page, 'Enter'); await expect(hud).toHaveAttribute('data-buildings', '2'); await tap(page, 'b');
  await advance(page, 8000); await tap(page, 'p'); await tap(page, 'k');
  const save = await page.evaluate(() => JSON.parse(localStorage.getItem('outpost.checkpoint.v1')!)); expect(save.version).toBe(32); expect(save.world.objectives.completed).toContain('moonWork');expect(save.world.outposts.moon.depot.ice).toBeGreaterThan(0); expect(save.world.depot.ice).toBe(0); expect(save.world.outposts.moon.surfaceDeposits[0].remaining).toBeLessThan(180); expect(save.world.colony.buildings).toHaveLength(0);
  await page.getByRole('button', { name:'Base', exact: true }).click({ force: true }); await advance(page, 100);
  await expect(page.locator('#command-console')).toContainText('COMMAND · NACRE COLONY');
  await page.getByRole('combobox', { name: 'Command colony', exact: true }).selectOption('home'); await advance(page, 100); await expect(page.locator('#command-console')).toContainText('COMMAND · SELENE COLONY');
  await page.getByRole('combobox', { name: 'Command colony', exact: true }).selectOption('moon'); await advance(page, 100); await expect(page.locator('#command-console')).toContainText('Mining rig'); await page.screenshot({ path: 'docs/screenshots/moon-colony.png' });
  await page.reload(); await advance(page, 500); await expect(hud).toHaveAttribute('data-state', 'paused'); await expect(hud).toHaveAttribute('data-body', 'moon'); await tap(page, 'p');
  await walk(page, 'a', 8); await tap(page, 'f'); await expect(hud).toHaveAttribute('data-mode', 'ship');
  await cargo(page); await page.getByRole('button', { name: 'Load ice ore', exact: true }).click({ force: true }); await advance(page, 100); const carried = (await telemetry(page)).cargo; expect(carried).toBeGreaterThan(0); await tap(page, 'Escape');
  await fly(page, 'moon', 1000); const data = await telemetry(page), delta = relative({ x: data.x, y: data.y }, planetAt('home', { binary: true, time: data.time })); let angle = Math.atan2(delta.x, -delta.y);
  await fly(page, 'home', 3500, 200, angle);
  while (Math.abs(angle) > .01) { angle -= Math.sign(angle) * Math.min(Math.PI / 4, Math.abs(angle)); await fly(page, 'home', 3500, 150, angle); }
  await fly(page, 'home', 1500); await fly(page, 'home', 7, 600); await tap(page, 'e'); await tap(page, 'p'); await tap(page, 'k');
  const returned = await page.evaluate(() => JSON.parse(localStorage.getItem('outpost.checkpoint.v1')!)); expect(returned.world.objectives.completed).toEqual(expect.arrayContaining(['moonWork','return','delivery']));expect(returned.world.ship.ground).toBe('home'); expect(returned.world.depot.ice).toBeGreaterThan(0); expect(returned.world.ship.cargo.ice).toBe(0); expect(returned.world.ship.fuel).toBeLessThan(240); expect(returned.world.outposts.moon.colony.buildings).toHaveLength(2); expect(errors).toEqual([]);
});

test('shows surface-relative moon instruments and native local power controls at supported desktop sizes', async ({ page }) => {
  const { createWorld } = await import('../../src/sim/world'); const { colonyWorld } = await import('../../src/sim/localWorld');
  const { completedBuilding } = await import('../../src/sim/construction'); const { encodeCheckpoint } = await import('../../src/persistence/checkpoint');
  const { TECH_IDS } = await import('../../src/sim/progressionConfig');
  test.setTimeout(60000); const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  const w = createWorld(); w.asteroids = []; w.system.time = 200; w.colony.research.completed = [...TECH_IDS];
  const moon = planetAt('moon', w.system), site = colonyWorld(w, 'moon'); w.ship.position = surfacePosition(moon, 0, 7); w.ship.velocity = { ...moon.velocity }; w.ship.ground = 'moon';
  w.playerMode = 'astronaut'; w.astronaut.position = surfacePosition(moon, 14 / 450, 2.5); w.astronaut.velocity = { ...moon.velocity };
  w.colony.buildings = [completedBuilding(1, 'solar', .1, w)]; w.colony.nextId = 2;
  const shield = completedBuilding(1001, 'shieldSmall', .2, site); Object.assign(shield.shield!, { charge: 60, ready: true, powered: true }); site.colony.buildings = [shield, completedBuilding(1002, 'solar', .4, site)]; site.colony.nextId = 1003;
  await page.addInitScript(text => localStorage.setItem('outpost.checkpoint.v1', text), encodeCheckpoint(w)); await page.goto('/');
  const hud = page.locator('#hud'), console = page.locator('#command-console'); await expect(hud).toHaveAttribute('data-state', 'paused');
  for (const viewport of [{ width: 900, height: 600 }, { width: 1280, height: 800 }, { width: 1920, height: 1080 }]) {
    await page.setViewportSize(viewport); await expect(hud).toHaveAttribute('data-body', 'moon');
    await expect(page.locator('[data-instrument="altitude"] strong')).toHaveText('0 m'); await expect(page.locator('[data-instrument="speed"] strong')).toHaveText('0.0 m/s');
    await expect(page.locator('#flight-region')).toHaveText('AIRLESS · VACUUM'); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.getByRole('button', { name:'Base', exact: true }).click(); await page.getByRole('button', { name: 'Select facility 1001', exact: true }).click();
  const slider = page.getByRole('slider', { name: 'Selected facility power limit' }); await expect(slider).toBeDisabled(); await page.keyboard.press('p'); await slider.focus(); await page.keyboard.press('Home');
  await expect(console.locator('[data-selected="1001"]')).toContainText('power limited'); await expect(hud).toHaveAttribute('data-grounded', 'true');
  await page.keyboard.press('p'); await page.keyboard.press('k'); const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('outpost.checkpoint.v1')!));
  expect(saved.world.outposts.moon.colony.buildings[0].dispatch.limit).toBe(0); expect(saved.world.colony.buildings[0].enabled).toBe(true); expect(saved.world.ship.ground).toBe('moon'); expect(errors).toEqual([]);
  await page.setViewportSize({ width: 1280, height: 800 }); await console.locator('[data-selected="1001"]').scrollIntoViewIfNeeded(); await page.screenshot({ path: 'docs/screenshots/moon-shield-controls.png' });
});
