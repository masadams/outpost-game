import type { Page } from '@playwright/test';
import { planetAt, surfacePosition, type BodyId } from '../../src/sim/celestial';
import { FOCUS_Y } from '../../src/render/camera';

/** Screen position of a surface point, from the live camera exposed on #flight-tools. */
export async function surfacePoint(page: Page, body: BodyId, angle: number): Promise<{ x: number; y: number }> {
  const v = await page.evaluate(() => {
    const hud = document.querySelector<HTMLElement>('#hud')!;
    const tools = document.querySelector<HTMLElement>('#flight-tools')!;
    return {
      time: Number(hud.dataset.time),
      x: Number(tools.dataset.cameraX),
      y: Number(tools.dataset.cameraY),
      angle: Number(tools.dataset.cameraAngle),
      zoom: Number(tools.dataset.zoom),
      width: innerWidth,
      height: innerHeight,
    };
  });
  const target = surfacePosition(planetAt(body, { time: v.time, binary: true }), angle, 0);
  const dx = target.x - v.x;
  const dy = target.y - v.y;
  return {
    x: v.width / 2 + (dx * Math.cos(v.angle) + dy * Math.sin(v.angle)) * v.zoom,
    y: v.height * FOCUS_Y + (-dx * Math.sin(v.angle) + dy * Math.cos(v.angle)) * v.zoom,
  };
}
