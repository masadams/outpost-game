import { installAudioProbe } from '../helpers/audioProbe';
import { expect } from '@playwright/test';
import { test, restart } from './game';

test('audio unlocks after input, produces a signal, silences on pause/mute and persists settings', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await installAudioProbe(page);
  const rms = () => page.evaluate(() => (window as unknown as { outpostAudioRms?: () => number }).outpostAudioRms?.() ?? 0);
  await page.goto('/'); const sound = page.locator('#sound-panel');
  await expect(sound).toHaveAttribute('data-status', 'locked');
  await page.keyboard.down('w'); await expect(sound).toHaveAttribute('data-status', 'on');
  await expect.poll(rms).toBeGreaterThan(0.00005);
  await page.keyboard.press('m'); await expect(sound).toHaveAttribute('data-status', 'muted');
  await expect.poll(rms).toBeLessThan(0.00001);
  await page.keyboard.press('m'); await expect(sound).toHaveAttribute('data-status', 'on');
  await expect.poll(rms).toBeGreaterThan(0.00005);
  await page.keyboard.up('w'); await page.keyboard.press('p');
  await expect(sound).toHaveAttribute('data-audible', 'false'); await expect(sound).toHaveAttribute('data-loops', '0');
  await expect.poll(rms).toBeLessThan(0.00001);
  await page.keyboard.press('m'); await expect(sound).toHaveAttribute('data-status', 'muted');
  const volume = page.getByRole('slider', { name: 'Sound volume' });
  await page.getByRole('button', { name: 'Open settings', exact: true }).click();
  await volume.focus(); await page.keyboard.press('ArrowLeft'); await expect(volume).toHaveValue('0.3');
  await page.getByRole('button', { name: 'Return to game', exact: true }).click();
  await page.reload(); await expect(sound).toHaveAttribute('data-status', 'muted');
  await page.getByRole('button', { name: 'Open settings', exact: true }).click(); await expect(volume).toHaveValue('0.3');
  await page.getByRole('button', { name: 'Return to game', exact: true }).click();
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
  await page.keyboard.press('w'); await page.keyboard.press('Escape'); await expect(page.getByRole('dialog')).not.toBeVisible();
  await restart(page);
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

test('mixes music and effects independently and silences both on pause',async({page})=>{
 test.setTimeout(45000);await installAudioProbe(page);await page.goto('/');const hud=page.locator('#hud');await expect(hud).toHaveAttribute('data-state','landed');
 const rms=()=>page.evaluate(()=>(window as unknown as {outpostAudioRms?:()=>number}).outpostAudioRms?.()??0);
 const mix=async(effects:string,music:string)=>{await page.getByRole('button',{name:'Open settings',exact:true}).click();await page.getByRole('slider',{name:'Effects volume',exact:true}).fill(effects);await page.getByRole('slider',{name:'Music volume',exact:true}).fill(music);await page.getByRole('button',{name:'Return to game',exact:true}).click();};
 await mix('0','1');await expect.poll(rms).toBeGreaterThan(.00005);
 await mix('0','0');await expect.poll(rms,{timeout:10000}).toBeLessThan(.00001);
 await page.keyboard.down('w');await expect.poll(rms).toBeLessThan(.00001);await page.keyboard.up('w');
 await mix('1','0');await page.keyboard.down('w');await expect.poll(rms).toBeGreaterThan(.00005);await page.keyboard.up('w');await page.keyboard.press('p');await expect.poll(rms).toBeLessThan(.00001);
});
