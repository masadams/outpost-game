import { expect, type Page } from '@playwright/test';
import { test } from './game';

const advance = async (p: Page, ms: number) => {
  for (let t = 0; t < ms; t += 250) await p.clock.fastForward(Math.min(250, ms - t));
};

/** A defended base with an Observatory that has watched the storm for a while, a few seconds before it arrives. */
async function preparedCheckpoint(): Promise<{ text: string; sampleAngle: number }> {
  const { createWorld, stepWorld } = await import('../../src/sim/world');
  const { encodeCheckpoint } = await import('../../src/persistence/checkpoint');
  const { turretState } = await import('../../src/sim/weapons');
  const { STORM } = await import('../../src/sim/stormConfig');
  const { planetAt, surfacePosition } = await import('../../src/sim/celestial');
  const w = createWorld();
  w.asteroids = [];
  w.colony.buildings = [
    { id: 1, kind: 'observatory', angle: 0.02, enabled: true, progress: 0, recipe: 0, status: 'idle', health: 100 },
    { id: 2, kind: 'solar', angle: 0.03, enabled: true, progress: 0, recipe: 0, status: 'idle', health: 100 },
    { id: 3, kind: 'laser', angle: 0.075, enabled: true, progress: 0, recipe: 0, status: 'idle', health: 100 },
    { id: 4, kind: 'laser', angle: 0.085, enabled: true, progress: 0, recipe: 0, status: 'idle', health: 100 },
    { id: 5, kind: 'battery', angle: 0.06, enabled: true, progress: 0, recipe: 0, status: 'idle', health: 100 },
    { id: 6, kind: 'battery', angle: 0.065, enabled: true, progress: 0, recipe: 0, status: 'idle', health: 100 },
  ] as never;
  w.colony.nextId = 10;
  w.colony.energy = 150;
  for (const b of w.colony.buildings) if (b.kind === 'laser') turretState(b).automatic = true;
  w.system.time = 1000;
  // Watch long enough for a precise warning, then stop a little before the first body arrives.
  while (w.system.time < w.storm.arrival - 15 || w.storm.arrival === 0) stepWorld(w, { thrust: false, turn: 0 }, 0.25);
  const sampleAngle = w.storm.plan.find(p => p.impactAngle !== null)!.impactAngle!;
  const planet = planetAt('home', w.system);
  w.playerMode = 'astronaut';
  w.astronaut.position = surfacePosition(planet, sampleAngle, 1.5);
  w.astronaut.velocity = { ...planet.velocity };
  w.astronaut.grounded = true;
  void STORM;
  return { text: encodeCheckpoint(w), sampleAngle };
}

test('warns of the storm, survives it with defences, picks up a piece and analyses it', async ({ page }) => {
  test.setTimeout(240000);
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  const { text } = await preparedCheckpoint();
  await page.addInitScript(t => {
    if (!sessionStorage.getItem('storm-fixture')) {
      localStorage.setItem('outpost.checkpoint.v1', t);
      sessionStorage.setItem('storm-fixture', '1');
    }
  }, text);
  await page.clock.install({ time: new Date('2030-01-01T00:00:00Z') });
  await page.clock.pauseAt(new Date('2030-01-01T00:00:01Z'));
  await page.goto('/');
  await advance(page, 500);
  const hud = page.locator('#hud');
  await expect(hud).toHaveAttribute('data-storm-phase', 'approaching');
  await expect(page.locator('.storm-card')).toContainText('Storm tracked');

  await page.keyboard.press('p');
  for (let i = 0; i < 80; i++) {
    await advance(page, 2000);
    if ((await hud.getAttribute('data-storm-phase')) === 'over') break;
  }
  await expect(hud).toHaveAttribute('data-storm-phase', 'over');
  await expect(hud).toHaveAttribute('data-storm-impacts', '0');
  await advance(page, 1000);
  await expect(hud).toHaveAttribute('data-storm-held', '1');

  await page.getByRole('button', { name: 'Base', exact: true }).click();
  await advance(page, 300);
  await page.getByRole('navigation', { name: 'Base sections' }).getByRole('button', { name: 'Research', exact: true }).click();
  await advance(page, 300);
  await page.getByRole('button', { name: 'Analyse a piece' }).click();
  await advance(page, 300);
  await expect(hud).toHaveAttribute('data-storm-analysed', 'true');
  expect(errors).toEqual([]);
});
