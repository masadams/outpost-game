import { visible, type RenderView } from './budget';
import { facilityArt } from './facilityArt';
import { facilityMotion } from './facilityMotion';
import { colonyPlanet } from '../sim/localWorld';
import { HABITATS, isHabitat } from '../sim/habitatConfig';
import { operational } from '../sim/buildingHealth';
import Phaser from 'phaser';
import { BLUEPRINTS, type BuildType } from '../sim/colonyConfig';
import { placementError, previewAngle } from '../sim/colony';
import { heading } from '../sim/math';
import { daylightAt } from '../sim/sun';
import type { WorldState } from '../sim/world';

function drawColonyLocal(g: Phaser.GameObjects.Graphics, world: WorldState, selected: number | null = null, draft: { kind: BuildType; angle: number; valid: boolean } | null = null, view?:RenderView, detail=true, time=0, animate=false): void {
  const colony = world.colony;
  const target = colony.buildings.find(b => b.id === selected);
  if (target) { const n = heading(target.angle); g.lineStyle(1, 0xffc58c, .9); g.strokeCircle(n.x * (colonyPlanet(world).radius + 12), n.y * (colonyPlanet(world).radius + 12), 24); }
  for (const order of colony.command.queue) { const n = heading(order.angle); g.lineStyle(1, 0xffc58c, .5); g.strokeCircle(n.x * (colonyPlanet(world).radius + 6), n.y * (colonyPlanet(world).radius + 6), 8); }
  const entries = colony.buildings.map(b => ({ kind: b.kind, angle: b.angle, ghost: false, active: b.enabled && operational(b) && (!isHabitat(b.kind) || !!b.habitat?.powered), working: b.enabled && operational(b) && (b.kind === 'solar' || b.kind === 'battery' || b.status === 'running') }));
  if (draft) entries.push({ kind: draft.kind, angle: draft.angle, ghost: true, active: draft.valid, working: false });
  if (!draft && colony.buildOpen && world.playerMode === 'astronaut') entries.push({ kind: colony.selected, angle: previewAngle(world), ghost: true, active: !placementError(world), working: false });
  for (const entry of entries) {
    const blueprint = BLUEPRINTS[entry.kind], n = heading(entry.angle), tangent = { x: -n.y, y: n.x };
    const body=colonyPlanet(world);if(!visible(view,{x:body.position.x+n.x*body.radius,y:body.position.y+n.y*body.radius},isHabitat(entry.kind)?HABITATS[entry.kind].halfSpan+HABITATS[entry.kind].height:50))continue;
    const p = (x: number, height: number) => new Phaser.Geom.Point(n.x * (colonyPlanet(world).radius + height) + tangent.x * x, n.y * (colonyPlanet(world).radius + height) + tangent.y * x);
    const color = entry.ghost ? entry.active ? 0x73f3cf : 0xff8f75 : blueprint.color;
    if (isHabitat(entry.kind)) {
      const spec = HABITATS[entry.kind];
      const roof = Array.from({ length: 49 }, (_, i) => {
        const arc = -spec.halfSpan + 2 * spec.halfSpan * i / 48;
        const radial = heading(entry.angle + arc / colonyPlanet(world).radius);
        const height = spec.height * Math.sqrt(Math.max(0, 1 - (arc / spec.halfSpan) ** 2));
        return new Phaser.Geom.Point(radial.x * (colonyPlanet(world).radius + height), radial.y * (colonyPlanet(world).radius + height));
      });
      g.fillStyle(color, entry.ghost ? 0.08 : 0.07); g.fillPoints(roof, true);
      g.lineStyle(1.5, color, entry.active ? 0.9 : 0.3); g.strokePoints(roof, false);
      for (const side of [-1, 1]) {
        const foot = heading(entry.angle + side * spec.halfSpan / colonyPlanet(world).radius);
        g.fillStyle(color, 0.9); g.fillCircle(foot.x * colonyPlanet(world).radius, foot.y * colonyPlanet(world).radius, 2);
      }
      for(const factor of [-.5,0,.5]){
        const a=heading(entry.angle+factor*spec.halfSpan/colonyPlanet(world).radius),h=spec.height*Math.sqrt(1-factor*factor);
        g.lineStyle(.6,color,.25);g.lineBetween(a.x*colonyPlanet(world).radius,a.y*colonyPlanet(world).radius,a.x*(colonyPlanet(world).radius+h),a.y*(colonyPlanet(world).radius+h));
      }
      continue;
    }
    const width = blueprint.halfWidth;
    const outline = [p(-width, 0), p(-width, 13), p(width - 4, 13), p(width, 9), p(width, 0)];
    g.fillStyle(entry.ghost ? color : 0x203749, entry.ghost ? 0.12 : 0.95); g.fillPoints(outline, true);
    g.lineStyle(1, color, entry.active ? 0.95 : 0.4); g.strokePoints(outline, true);
    if (entry.kind === 'solar') {
      g.lineStyle(1, color); for (const x of [-8, -4, 0, 4, 8]) { const a = p(x, 4), b = p(x, 11); g.lineBetween(a.x, a.y, b.x, b.y); }
    } else if (entry.kind === 'miningRig') {
      const tower = [p(-8, 1), p(0, 29), p(8, 1)]; g.strokePoints(tower, false);
      for (const height of [7, 14, 21]) { const a = p(-5, height), b = p(5, height); g.lineBetween(a.x, a.y, b.x, b.y); }
      const drillTop = p(0, 19), drillBottom = p(0, -5); g.lineStyle(2, color); g.lineBetween(drillTop.x, drillTop.y, drillBottom.x, drillBottom.y);
    } else if (entry.kind === 'refinery') {
      const chimney = [p(-width + 2, 13), p(-width + 2, 21), p(-width + 5, 21), p(-width + 5, 13)]; g.strokePoints(chimney, true);
    } else {
      const a = p(-width + 3, 5), b = p(width - 3, 5); g.lineBetween(a.x, a.y, b.x, b.y);
      const c = p(-width + 3, 9), d = p(width - 3, 9); g.lineBetween(c.x, c.y, d.x, d.y);
    }
    if(detail)facilityArt(g,entry.kind,p,width,color,entry.active);
    if(detail&&animate&&entry.working&&!entry.ghost)facilityMotion(g,entry.kind,p,width,color,time,Math.abs(entry.angle*37)%1);
    const lamp = p(0, 15); g.fillStyle(color, entry.active ? 1 : 0.25); g.fillCircle(lamp.x, lamp.y, 1.4);
    // After dark a working building glows from its lamp.
    const dark = 1 - daylightAt(world.system, entry.angle, colonyPlanet(world).id);
    if (dark > 0.2 && entry.active && !entry.ghost) { g.fillStyle(color, 0.16 * dark); g.fillCircle(lamp.x, lamp.y, 6); g.fillStyle(0xffe6b0, 0.07 * dark); g.fillCircle(lamp.x, lamp.y, 11); }
  }
}

export function drawColony(g: Phaser.GameObjects.Graphics, world: WorldState, selected: number | null = null, draft: { kind: BuildType; angle: number; valid: boolean } | null = null, view?:RenderView, detail=true, time=0, animate=false): void {
  const p = colonyPlanet(world); g.save(); g.translateCanvas(p.position.x, p.position.y);
  drawColonyLocal(g, world, selected, draft, view, detail, time, animate); g.restore();
}
