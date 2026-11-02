import { expect, test } from '@playwright/test';

test('audio unlocks after input, produces a signal, silences on pause/mute and persists settings', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    const connect = AudioNode.prototype.connect;
    AudioNode.prototype.connect = function(this: AudioNode, destination: AudioNode | AudioParam, ...args: number[]) {
      if (destination instanceof AudioDestinationNode) {
        const analyser = destination.context.createAnalyser(); analyser.fftSize = 2048;
        Reflect.apply(connect, this, [analyser]); Reflect.apply(connect, analyser, [destination]);
        const data = new Float32Array(analyser.fftSize);
        Object.assign(window, { outpostAudioRms: () => { analyser.getFloatTimeDomainData(data); return Math.sqrt(data.reduce((sum, v) => sum + v * v, 0) / data.length); } });
        return destination;
      }
      return Reflect.apply(connect, this, [destination, ...args]);
    } as typeof AudioNode.prototype.connect;
  });
  const rms = () => page.evaluate(() => (window as unknown as { outpostAudioRms?: () => number }).outpostAudioRms?.() ?? 0);
  await page.goto('/'); const sound = page.locator('#sound-panel');
  await expect(sound).toHaveAttribute('data-status', 'locked');
  await page.keyboard.down('w'); await expect(sound).toHaveAttribute('data-status', 'on');
  await expect.poll(rms).toBeGreaterThan(0.00005);
  await page.keyboard.up('w'); await page.keyboard.press('p');
  await expect(sound).toHaveAttribute('data-audible', 'false'); await expect(sound).toHaveAttribute('data-loops', '0');
  await expect.poll(rms).toBeLessThan(0.00001);
  await page.keyboard.press('m'); await expect(sound).toHaveAttribute('data-status', 'muted');
  const volume = page.getByRole('slider', { name: 'Sound volume' });
  await volume.focus(); await page.keyboard.press('ArrowLeft'); await expect(volume).toHaveValue('0.3');
  await page.reload(); await expect(sound).toHaveAttribute('data-status', 'muted'); await expect(volume).toHaveValue('0.3');
  await page.keyboard.press('m'); await expect(sound).toHaveAttribute('data-status', 'on');
  await page.keyboard.down('w'); await expect.poll(rms).toBeGreaterThan(0.00005);
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await expect(page.locator('#hud')).toHaveAttribute('data-state', 'paused'); await expect.poll(rms).toBeLessThan(0.00001);
  await page.keyboard.up('w'); expect(errors).toEqual([]);
});

test('quick-start guide pauses gameplay, supports keyboard and resumes without stuck input', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/'); const hud = page.locator('#hud');
  await page.getByRole('button', { name: 'Toggle sound mute' }).click();
  await expect(page.locator('#sound-panel')).toHaveAttribute('data-status', 'on');
  await page.keyboard.press('h'); await expect(page.getByRole('dialog')).toBeVisible();
  await expect(hud).toHaveAttribute('data-state', 'paused');
  await page.screenshot({ path: 'docs/screenshots/playtest-guide.png' });
  await page.keyboard.press('w'); await page.keyboard.press('r');
  await expect(hud).toHaveAttribute('data-state', 'paused');
  await page.keyboard.press('Escape'); await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(hud).toHaveAttribute('data-state', 'landed'); await expect(hud).toHaveAttribute('data-fuel', '240.00');
  await page.keyboard.press('p'); await expect(hud).toHaveAttribute('data-state', 'paused');
  await page.getByRole('button', { name: 'Open quick-start guide' }).click();
  await page.getByRole('button', { name: 'Return to game' }).click();
  await expect(hud).toHaveAttribute('data-state', 'paused');
  await page.evaluate(() => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', keyCode: 75, ctrlKey: true, bubbles: true }));
    window.dispatchEvent(new KeyboardEvent('keyup', { key: 'k', keyCode: 75, ctrlKey: true, bubbles: true }));
  });
  await page.waitForTimeout(150);
  expect(await page.evaluate(() => localStorage.getItem('outpost.checkpoint.v1'))).toBeNull();
  expect(errors).toEqual([]);
});
