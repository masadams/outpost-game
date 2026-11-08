import type Phaser from 'phaser';

const COLUMNS = 160;

/**
 * Northern lights, drawn on the sky behind the world like the stars: green curtains with violet tops that sway slowly.
 * `strength` is 0 to 1; the caller fades it with the night.
 */
export function drawAuroraSky(g: Phaser.GameObjects.Graphics, width: number, height: number, time: number, strength: number): void {
  g.clear();
  if (strength <= 0.01) return;
  const column = width / COLUMNS;
  for (let k = 0; k < COLUMNS; k++) {
    const u = k / (COLUMNS - 1);
    const x = u * width;
    const band = Math.sin(u * 3.1 + time * 0.05) * 0.5 + 0.5;
    const sway = Math.sin(u * 17 + time * 0.6) * 0.5 + 0.5;
    const ripple = Math.sin(u * 41 - time * 1.1) * 0.5 + 0.5;
    const bottom = height * (0.36 + 0.06 * Math.sin(u * 6 + time * 0.2));
    const top = bottom - height * (0.12 + 0.16 * sway);
    const mid = bottom - (bottom - top) * 0.55;
    const alpha = strength * band * (0.10 + 0.14 * ripple);
    g.fillStyle(0x6dffb0, alpha);
    g.fillRect(x, mid, column + 1, bottom - mid);
    g.fillStyle(0xb48cff, alpha * 0.55);
    g.fillRect(x, top, column + 1, mid - top);
    g.fillStyle(0x9fffd0, alpha * 0.8);
    g.fillRect(x, bottom - 2, column + 1, 2);
  }
}
