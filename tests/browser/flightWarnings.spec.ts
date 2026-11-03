import { expect, test } from '@playwright/test';
import { createWorld } from '../../src/sim/world';
import { WORLD } from '../../src/sim/config';
import { encodeCheckpoint } from '../../src/persistence/checkpoint';

function checkpoint(danger: boolean) {
  const w = createWorld(); w.asteroids = []; w.ship.state = 'flying'; w.ship.position.y = -WORLD.radius - WORLD.shipRadius - (danger ? 80 : 1500);
  w.ship.velocity = { x: danger ? 6 : 0, y: danger ? 20 : 0 }; w.ship.angle = danger ? 0.4 : 0; w.ship.angularVelocity = danger ? 0.5 : 0;
  w.ship.fuel = danger ? 10 : 30; return encodeCheckpoint(w);
}

test('shows landing and fuel lights with distinct real audio, pause/mute safety and reduced motion', async ({ page }) => {
  test.setTimeout(60000); const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(text => localStorage.setItem('outpost.checkpoint.v1', text), checkpoint(true));
  await page.addInitScript(() => {
    const starts: number[] = []; Object.assign(window, { warningTones: starts });
    // AudioParam.value can still be its default for tones scheduled in the future.
    const set = AudioParam.prototype.setValueAtTime;
    AudioParam.prototype.setValueAtTime = function(value: number, time: number) { starts.push(value); return Reflect.apply(set, this, [value, time]); };
    const connect = AudioNode.prototype.connect;
    AudioNode.prototype.connect = function(this: AudioNode, destination: AudioNode | AudioParam, ...args: number[]) {
      if (destination instanceof AudioDestinationNode) {
        const analyser = destination.context.createAnalyser(); analyser.fftSize = 2048;
        Reflect.apply(connect, this, [analyser]); Reflect.apply(connect, analyser, [destination]); const data = new Float32Array(analyser.fftSize);
        const rms = () => { analyser.getFloatTimeDomainData(data); return Math.sqrt(data.reduce((sum, v) => sum + v * v, 0) / data.length); };
        let peak = 0; setInterval(() => { peak = Math.max(peak, rms()); }, 10);
        Object.assign(window, { warningRms: rms, warningPeak: () => peak, clearWarningPeak: () => { peak = 0; } }); return destination;
      }
      return Reflect.apply(connect, this, [destination, ...args]);
    } as typeof AudioNode.prototype.connect;
  });
  const tones = () => page.evaluate(() => (window as unknown as { warningTones: number[] }).warningTones);
  const rms = () => page.evaluate(() => (window as unknown as { warningRms?: () => number }).warningRms?.() ?? 0);
  const peak = () => page.evaluate(() => (window as unknown as { warningPeak?: () => number }).warningPeak?.() ?? 0);
  await page.goto('/'); const hud = page.locator('#hud'), alert = page.locator('#flight-alert'), descent = page.locator('[data-instrument="radial"]');
  await expect(hud).toHaveAttribute('data-state', 'paused'); await expect(alert).toContainText('DESCENT HIGH');
  for (const key of ['radial', 'drift', 'tilt', 'spin', 'fuel']) await expect(page.locator(`[data-instrument="${key}"]`)).toHaveAttribute('data-level', 'critical');
  await expect(descent).toContainText('! DESCENT HIGH');
  await page.keyboard.press('p');
  await expect(hud).toHaveAttribute('data-state', 'flying');
  await expect.poll(tones).toContain(880); await expect.poll(peak, { intervals: [20], timeout: 2000 }).toBeGreaterThan(0.00005);
  expect(await descent.evaluate(e => getComputedStyle(e).animationName)).toBe('caution-pulse');
  await page.keyboard.press('p'); await expect(hud).toHaveAttribute('data-state', 'paused'); await expect.poll(rms).toBeLessThan(0.00001);
  expect(await descent.evaluate(e => getComputedStyle(e).animationName)).toBe('none');
  await page.emulateMedia({ reducedMotion: 'reduce' }); await page.keyboard.press('p');
  await expect(hud).toHaveAttribute('data-state', 'flying');
  expect(await descent.evaluate(e => getComputedStyle(e).animationName)).toBe('none'); await page.keyboard.press('p'); await expect(hud).toHaveAttribute('data-state', 'paused');
  // Load a legitimate checkpoint in orbit for isolated fuel-tone verification, with no engine loops.
  await page.evaluate(text => localStorage.setItem('outpost.checkpoint.v1', text), checkpoint(false));
  await page.keyboard.press('l'); await expect(alert).toContainText('LOW FUEL'); await expect(hud).toHaveAttribute('data-approach', 'false');
  await page.evaluate(() => (window as unknown as { clearWarningPeak: () => void }).clearWarningPeak());
  const before = (await tones()).length; await page.keyboard.press('p');
  await expect(hud).toHaveAttribute('data-state', 'flying');
  await expect.poll(async () => (await tones()).slice(before)).toContain(420);
  await expect.poll(async () => (await tones()).slice(before)).toContain(310);
  await expect.poll(peak, { intervals: [20] }).toBeGreaterThan(0.00005);
  await page.keyboard.press('m'); await expect.poll(rms).toBeLessThan(0.00001); await expect(alert).toContainText('LOW FUEL');
  expect(errors).toEqual([]);
});

test('keeps expanded warning instruments readable at all supported desktop sizes', async ({ page }) => {
  test.setTimeout(60000); await page.addInitScript(text => localStorage.setItem('outpost.checkpoint.v1', text), checkpoint(true));
  for (const [width, height] of [[900, 600], [1280, 800], [1920, 1080]]) {
    await page.setViewportSize({ width, height }); await page.goto('/'); await expect(page.locator('#flight-alert')).toContainText('DESCENT HIGH');
    const problems = await page.locator('.instruments').evaluate(root => {
      const rect = root.getBoundingClientRect(), status = document.querySelector('#flight-status')!.getBoundingClientRect(), errors: string[] = [];
      if (rect.left < 0 || rect.right > innerWidth || rect.top < 0 || rect.bottom > innerHeight) errors.push('instruments outside viewport');
      if (status.bottom > rect.top) errors.push('coast telemetry overlaps instruments');
      for (const e of Array.from(root.querySelectorAll('strong, .instrument-status'))) if (e.scrollWidth > e.clientWidth + 1) errors.push(`clipped ${e.textContent}`);
      return errors;
    });
    expect(problems).toEqual([]); await page.screenshot({ path: `docs/screenshots/landing-warnings-${width}.png` });
  }
});
