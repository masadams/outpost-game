import type Phaser from 'phaser';
import { planetAt } from '../sim/celestial';
import { heading } from '../sim/math';
import type { WorldState } from '../sim/world';
import type { RenderView } from './budget';
import { visible } from './budget';
import { coreAngle, crystalAngle } from '../sim/crystal';
import { KEYSTONE_WORLDS, keystoneAngle, keystonesOpen, keystoneState } from '../sim/keystones';

/** Pieces of the storm lying on the ground: small dark rocks with a warm glint, so they can be found. */
export function drawStormSamples(g: Phaser.GameObjects.Graphics, w: WorldState, zoom: number, time: number, view: RenderView): void {
  const storm = w.storm;
  if (storm.samples.length === 0) return;
  const planet = planetAt('home', w.system);
  const px = 1 / zoom;
  for (const sample of storm.samples) {
    const up = heading(sample.angle + planet.spin);
    const at = { x: planet.position.x + up.x * (planet.radius + 0.6), y: planet.position.y + up.y * (planet.radius + 0.6) };
    if (!visible(view, at, 60)) continue;
    const side = { x: -up.y, y: up.x };
    const pulse = 0.55 + 0.35 * Math.sin(time * 3 + sample.id);
    g.fillStyle(0xffb06a, 0.16 * pulse);
    g.fillCircle(at.x + up.x * 1.2, at.y + up.y * 1.2, Math.max(5, 9 * px));
    g.fillStyle(0x2d3b47);
    g.fillTriangle(
      at.x - side.x * 1.8, at.y - side.y * 1.8,
      at.x + side.x * 1.6, at.y + side.y * 1.6,
      at.x + up.x * 2.2 - side.x * 0.3, at.y + up.y * 2.2 - side.y * 0.3,
    );
    g.fillStyle(0xffb06a, pulse);
    g.fillCircle(at.x + up.x * 1.1 + side.x * 0.4, at.y + up.y * 1.1 + side.y * 0.4, Math.max(0.5, 0.7));
  }
}

/** The Nacre crystal: a cold blue spire with a slow glow, lying on the moon until someone picks it up. */
export function drawCrystal(g: Phaser.GameObjects.Graphics, w: WorldState, zoom: number, time: number, view: RenderView): void {
  if (w.exploration.crystal !== 'lying') return;
  const moon = planetAt('moon', w.system);
  const up = heading(crystalAngle() + moon.spin);
  const at = { x: moon.position.x + up.x * (moon.radius + 0.6), y: moon.position.y + up.y * (moon.radius + 0.6) };
  if (!visible(view, at, 80)) return;
  const side = { x: -up.y, y: up.x };
  const pulse = 0.55 + 0.35 * Math.sin(time * 2);
  const px = 1 / zoom;
  g.fillStyle(0x7fd8ff, 0.18 * pulse);
  g.fillCircle(at.x + up.x * 2, at.y + up.y * 2, Math.max(7, 12 * px));
  g.fillStyle(0x9fe4ff);
  g.fillTriangle(at.x - side.x * 1.4, at.y - side.y * 1.4, at.x + side.x * 1.4, at.y + side.y * 1.4, at.x + up.x * 5, at.y + up.y * 5);
  g.fillStyle(0xdaf6ff);
  g.fillTriangle(at.x, at.y, at.x + side.x * 1.2, at.y + side.y * 1.2, at.x + up.x * 3.4, at.y + up.y * 3.4);
}

/** The Cinder core sample: a dull amber lump with a faint heat glow, lying on Cinder until picked up. */
export function drawCore(g: Phaser.GameObjects.Graphics, w: WorldState, zoom: number, time: number, view: RenderView): void {
  if (w.exploration.core !== 'lying') return;
  const body = planetAt('cinder', w.system);
  const up = heading(coreAngle() + body.spin);
  const at = { x: body.position.x + up.x * (body.radius + 0.6), y: body.position.y + up.y * (body.radius + 0.6) };
  if (!visible(view, at, 80)) return;
  const side = { x: -up.y, y: up.x };
  const pulse = 0.55 + 0.35 * Math.sin(time * 1.6);
  const px = 1 / zoom;
  g.fillStyle(0xffa45c, 0.18 * pulse);
  g.fillCircle(at.x + up.x * 2, at.y + up.y * 2, Math.max(7, 12 * px));
  g.fillStyle(0x6b4a33);
  g.fillTriangle(at.x - side.x * 2.2, at.y - side.y * 2.2, at.x + side.x * 2.2, at.y + side.y * 2.2, at.x + up.x * 3.4, at.y + up.y * 3.4);
  g.fillStyle(0xd68a4a);
  g.fillTriangle(at.x - side.x * 0.9, at.y - side.y * 0.9, at.x + side.x * 1.1, at.y + side.y * 1.1, at.x + up.x * 2.2, at.y + up.y * 2.2);
}

/** A part of the carrier lying on its world: a pale casing with a slow beacon light, until someone picks it up. */
export function drawKeystones(g: Phaser.GameObjects.Graphics, w: WorldState, zoom: number, time: number, view: RenderView): void {
  if (!keystonesOpen(w)) return;
  for (const id of KEYSTONE_WORLDS) {
    if (keystoneState(w, id) !== 'lying') continue;
    const body = planetAt(id, w.system);
    const up = heading(keystoneAngle(id, w.seed) + body.spin);
    const at = { x: body.position.x + up.x * (body.radius + 0.6), y: body.position.y + up.y * (body.radius + 0.6) };
    if (!visible(view, at, 80)) continue;
    const side = { x: -up.y, y: up.x };
    const pulse = 0.5 + 0.5 * Math.sin(time * 1.3);
    const px = 1 / zoom;
    const p = (x: number, y: number) => ({ x: at.x + side.x * x + up.x * y, y: at.y + side.y * x + up.y * y });
    g.fillStyle(0xffe6b0, 0.14 * pulse);
    g.fillCircle(at.x + up.x * 2, at.y + up.y * 2, Math.max(8, 13 * px));
    // A canted casing, half buried.
    g.fillStyle(0xcfd8dc, 1);
    g.fillPoints([p(-2.6, 0), p(-2, 2.4), p(1.6, 3.2), p(2.8, 0)] as Phaser.Geom.Point[], true);
    g.lineStyle(0.4, 0x5f7a8a, 1);
    g.strokePoints([p(-2.6, 0), p(-2, 2.4), p(1.6, 3.2), p(2.8, 0)] as Phaser.Geom.Point[], false);
    g.lineBetween(p(-0.4, 0.2).x, p(-0.4, 0.2).y, p(-0.1, 2.8).x, p(-0.1, 2.8).y);
    // A thin mast with a light, so it can be found from a little way off.
    g.lineStyle(0.3, 0xcfd8dc, 1);
    g.lineBetween(p(1.2, 3).x, p(1.2, 3).y, p(1.2, 7).x, p(1.2, 7).y);
    g.fillStyle(0xffe6b0, 0.4 + 0.6 * pulse);
    g.fillCircle(p(1.2, 7).x, p(1.2, 7).y, Math.max(0.6, 1.6 * px));
  }
}
