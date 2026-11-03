import { allColonies, colonyPlanet } from '../sim/localWorld';
import type Phaser from 'phaser';
import type { WorldState } from '../sim/world';
import { WORLD } from '../sim/config';
import { heading } from '../sim/math';
import type { ThreatPrediction } from '../sim/meteor';
import { isTurret } from '../sim/defenceConfig';
import { turretPosition } from '../sim/weapons';
import { buildingHealth } from '../sim/buildingHealth';

export function drawDefence(g: Phaser.GameObjects.Graphics, world: WorldState, predictions: ThreatPrediction[], zoom: number): void {
  for (const p of predictions) {
    g.lineStyle(1 / zoom, 0xffa36f, 0.5); g.beginPath();
    p.points.forEach((v, i) => i % 4 < 2 && i ? g.lineTo(v.x, v.y) : g.moveTo(v.x, v.y)); g.strokePath();
    if (p.impact) {
      const r = 10 / zoom; g.lineStyle(1.5 / zoom, 0xffa36f, 0.9); g.strokeCircle(p.impact.x, p.impact.y, r);
      g.lineBetween(p.impact.x - r, p.impact.y - r, p.impact.x + r, p.impact.y + r);
      g.lineBetween(p.impact.x + r, p.impact.y - r, p.impact.x - r, p.impact.y + r);
    }
  }
  for (const m of world.defence.meteors) {
    const speed = Math.hypot(m.velocity.x, m.velocity.y), r = Math.max(m.radius, 3 / zoom);
    if (speed) { g.lineStyle(3 / zoom, 0xff935c, 0.45); g.lineBetween(m.position.x, m.position.y, m.position.x - m.velocity.x / speed * 36 / zoom, m.position.y - m.velocity.y / speed * 36 / zoom); }
    g.fillStyle(0xad5738); g.fillCircle(m.position.x, m.position.y, r); g.lineStyle(1 / zoom, 0xffc085); g.strokeCircle(m.position.x, m.position.y, r);
  }
  for (const site of allColonies(world)) for (const b of site.colony.buildings) {
    const at = turretPosition(b, site);
    if (isTurret(b.kind)) {
      const n = heading(b.angle + (b.turret?.aim ?? 0)); g.lineStyle(3, b.health === 0 ? 0x624c4a : 0xffc085); g.lineBetween(at.x, at.y, at.x + n.x * 18, at.y + n.y * 18);
      if (world.defence.controlled === b.id) { g.lineStyle(1 / zoom, 0x73f3cf); g.strokeCircle(at.x, at.y, 24 / zoom); }
    }
    if (buildingHealth(b) < 100) {
      const n = heading(b.angle), tangent = { x: -n.y, y: n.x }, height = colonyPlanet(site).radius + 35;
      const x = colonyPlanet(site).position.x + n.x * height, y = colonyPlanet(site).position.y + n.y * height, half = 12 / zoom;
      g.lineStyle(3 / zoom, 0x643f3a); g.lineBetween(x - tangent.x * half, y - tangent.y * half, x + tangent.x * half, y + tangent.y * half);
      g.lineStyle(2 / zoom, 0xffa36f); g.lineBetween(x - tangent.x * half, y - tangent.y * half, x + tangent.x * half * (2 * buildingHealth(b) / 100 - 1), y + tangent.y * half * (2 * buildingHealth(b) / 100 - 1));
    }
  }
  for (const p of world.defence.projectiles) { g.fillStyle(p.kind === 'missile' ? 0xe1adff : 0xffcf79); g.fillCircle(p.position.x, p.position.y, 2.5 / zoom); }
  for (const b of world.defence.beams) { g.lineStyle(2 / zoom, 0xff887e, b.life / 0.13); g.lineBetween(b.start.x, b.start.y, b.end.x, b.end.y); }
}
export function drawThreatRadar(g: Phaser.GameObjects.Graphics, world: WorldState, x: number, y: number, radius: number): void {
  for (const m of world.defence.meteors) {
    const distance = Math.hypot(m.position.x, m.position.y), scale = Math.min(radius / WORLD.radius, 61 / distance);
    g.fillStyle(0xff935c); g.fillCircle(x + m.position.x * scale, y + m.position.y * scale, 3);
  }
}
