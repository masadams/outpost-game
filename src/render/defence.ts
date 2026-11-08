import { visible, type RenderView } from './budget';
import { allColonies, colonyPlanet } from '../sim/localWorld';
import type Phaser from 'phaser';
import type { WorldState } from '../sim/world';
import { WORLD } from '../sim/config';
import { heading } from '../sim/math';
import type { ThreatPrediction } from '../sim/meteor';
import { nearestPlanet } from '../sim/celestial';
import { isTurret } from '../sim/defenceConfig';
import { turretPosition } from '../sim/weapons';
import { buildingHealth } from '../sim/buildingHealth';

export function drawDefence(g: Phaser.GameObjects.Graphics, world: WorldState, predictions: ThreatPrediction[], zoom: number, view?:RenderView): void {
  drawLandingZone(g, world, predictions, zoom);
  for (const m of world.defence.meteors) {
    if(!visible(view,m.position,m.radius+40/zoom))continue;
    const speed = Math.hypot(m.velocity.x, m.velocity.y), r = Math.max(m.radius, 3 / zoom);
    if (speed) { g.lineStyle(3 / zoom, 0xff935c, 0.45); g.lineBetween(m.position.x, m.position.y, m.position.x - m.velocity.x / speed * 36 / zoom, m.position.y - m.velocity.y / speed * 36 / zoom); }
    g.fillStyle(0xad5738); g.fillCircle(m.position.x, m.position.y, r); g.lineStyle(1 / zoom, 0xffc085); g.strokeCircle(m.position.x, m.position.y, r);
  }
  for (const site of allColonies(world)) for (const b of site.colony.buildings) {
    const at = turretPosition(b, site);
    if (isTurret(b.kind)) {
      const n = heading(b.angle + colonyPlanet(site).spin + (b.turret?.aim ?? 0)); g.lineStyle(3, b.health === 0 ? 0x624c4a : 0xffc085); g.lineBetween(at.x, at.y, at.x + n.x * 18, at.y + n.y * 18);
      if (world.defence.controlled === b.id) { g.lineStyle(1 / zoom, 0x73f3cf); g.strokeCircle(at.x, at.y, 24 / zoom); }
    }
    if (buildingHealth(b) < 100) {
      const n = heading(b.angle + colonyPlanet(site).spin), tangent = { x: -n.y, y: n.x }, height = colonyPlanet(site).radius + 35;
      const x = colonyPlanet(site).position.x + n.x * height, y = colonyPlanet(site).position.y + n.y * height, half = 12 / zoom;
      g.lineStyle(3 / zoom, 0x643f3a); g.lineBetween(x - tangent.x * half, y - tangent.y * half, x + tangent.x * half, y + tangent.y * half);
      g.lineStyle(2 / zoom, 0xffa36f); g.lineBetween(x - tangent.x * half, y - tangent.y * half, x + tangent.x * half * (2 * buildingHealth(b) / 100 - 1), y + tangent.y * half * (2 * buildingHealth(b) / 100 - 1));
    }
  }
  for (const p of world.defence.projectiles) { if(!visible(view,p.position,4/zoom))continue; g.fillStyle(p.kind === 'missile' ? 0xe1adff : 0xffcf79); g.fillCircle(p.position.x, p.position.y, 2.5 / zoom); }
  for (const b of world.defence.beams) { g.lineStyle(2 / zoom, 0xff887e, b.life / 0.13); g.lineBetween(b.start.x, b.start.y, b.end.x, b.end.y); }
}
export function drawThreatRadar(g: Phaser.GameObjects.Graphics, world: WorldState, x: number, y: number, radius: number): void {
  for (const m of world.defence.meteors) {
    const distance = Math.hypot(m.position.x, m.position.y), scale = Math.min(radius / WORLD.radius, 61 / distance);
    g.fillStyle(0xff935c); g.fillCircle(x + m.position.x * scale, y + m.position.y * scale, 3);
  }
}

/**
 * One general landing zone for the rocks coming down: a band on the ground from the westmost to the eastmost
 * expected impact, with some margin, rather than a path and a marker per rock.
 */
export function drawLandingZone(g: Phaser.GameObjects.Graphics, world: WorldState, predictions: ThreatPrediction[], zoom: number): void {
  const groups = new Map<string, { planet: ReturnType<typeof nearestPlanet>; angles: number[] }>();
  for (const p of predictions) {
    if (!p.impact) continue;
    const planet = nearestPlanet(p.impact, world.system);
    const group = groups.get(planet.id) ?? { planet, angles: [] };
    group.angles.push(Math.atan2(p.impact.y - planet.position.y, p.impact.x - planet.position.x));
    groups.set(planet.id, group);
  }
  for (const { planet, angles } of groups.values()) {
    const base = angles[0];
    const offsets = angles.map(a => Math.atan2(Math.sin(a - base), Math.cos(a - base)));
    const margin = 50 / planet.radius;
    const from = base + Math.min(...offsets) - margin;
    const to = base + Math.max(...offsets) + margin;
    g.lineStyle(14, 0xff7a4a, 0.22);
    g.beginPath();
    g.arc(planet.position.x, planet.position.y, planet.radius + 7, from, to);
    g.strokePath();
    g.lineStyle(2 / zoom, 0xffa36f, 0.85);
    for (const edge of [from, to]) {
      const n = { x: Math.cos(edge), y: Math.sin(edge) };
      g.lineBetween(planet.position.x + n.x * planet.radius, planet.position.y + n.y * planet.radius, planet.position.x + n.x * (planet.radius + 30), planet.position.y + n.y * (planet.radius + 30));
    }
  }
}
