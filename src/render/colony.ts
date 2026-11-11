import { visible, type RenderView } from './budget';
import { facilityArt } from './facilityArt';
import { facilityMotion } from './facilityMotion';
import { colonyPlanet } from '../sim/localWorld';
import { HABITATS, isHabitat } from '../sim/habitatConfig';
import { operational } from '../sim/buildingHealth';
import Phaser from 'phaser';
import { BLUEPRINTS, type BuildType } from '../sim/colonyConfig';
import { placementError, previewAngle } from '../sim/colony';
import { heading, wrap } from '../sim/math';
import { DRONE } from '../sim/droneConfig';
import { droneSeam } from '../sim/minerDrone';
import { linkPreview } from '../sim/grid';
import { daylightAt } from '../sim/sun';
import { WORLD } from '../sim/config';
import { TUG, tugTarget } from '../sim/tugBay';
import { workerPosition } from '../sim/workerBay';
import { ENDINGS, SEED_STAGES, seedEnding, seedStagesDone } from '../sim/seedShip';
import { drawColonyLife, HAUL_KINDS, type LifeView } from './colonyLife';
import type { WorldState } from '../sim/world';

function drawColonyLocal(g: Phaser.GameObjects.Graphics, world: WorldState, selected: number | null = null, draft: { kind: BuildType; angle: number; valid: boolean } | null = null, view?:RenderView, detail=true, time=0, animate=false): void {
  const colony = world.colony;
  const target = colony.buildings.find(b => b.id === selected);
  if (target) { const n = heading(target.angle); g.lineStyle(1, 0xffc58c, .9); g.strokeCircle(n.x * (colonyPlanet(world).radius + 12), n.y * (colonyPlanet(world).radius + 12), 24); }
  for (const order of colony.command.queue) { const n = heading(order.angle); g.lineStyle(1, 0xffc58c, .5); g.strokeCircle(n.x * (colonyPlanet(world).radius + 6), n.y * (colonyPlanet(world).radius + 6), 8); }
  const entries = colony.buildings.map(b => ({ kind: b.kind, angle: b.angle, ghost: false, active: b.enabled && operational(b) && (!isHabitat(b.kind) || !!b.habitat?.powered), working: b.enabled && operational(b) && (b.kind === 'solar' || b.kind === 'battery' || b.status === 'running') }));
  if (draft) entries.push({ kind: draft.kind, angle: draft.angle, ghost: true, active: draft.valid, working: false });
  if (!draft && colony.buildOpen && world.playerMode === 'astronaut') entries.push({ kind: colony.selected, angle: previewAngle(world), ghost: true, active: !placementError(world), working: false });
  // While placing, a line runs to the wired node it would hang from, with ticks where its reach ends.
  for (const entry of entries) {
    if (!entry.ghost) continue;
    const link = linkPreview(world, entry.kind, entry.angle);
    if (!link) continue;
    const radius = colonyPlanet(world).radius;
    const tint = link.connected ? 0x73f3cf : 0xffc247;
    const lift = radius + 3;
    const steps = 12;
    const span = Math.min(Math.PI, Math.abs(entry.angle - link.fromAngle) > Math.PI ? 2 * Math.PI - Math.abs(entry.angle - link.fromAngle) : Math.abs(entry.angle - link.fromAngle));
    const sign = Math.sin(entry.angle - link.fromAngle) >= 0 ? 1 : -1;
    g.lineStyle(1.5, tint, 0.85);
    for (let i = 0; i < steps; i += 2) {
      const a = heading(link.fromAngle + sign * span * i / steps);
      const b = heading(link.fromAngle + sign * span * (i + 1) / steps);
      g.lineBetween(a.x * lift, a.y * lift, b.x * lift, b.y * lift);
    }
    // Where the reach ends, on the same side: move the building to this tick for the longest link.
    const tickAngle = link.fromAngle + sign * link.reach / radius;
    const t = heading(tickAngle);
    g.lineStyle(2, 0x73f3cf, 0.9);
    g.lineBetween(t.x * (radius + 1), t.y * (radius + 1), t.x * (radius + 14), t.y * (radius + 14));
  }
  // A working drone bay sends a small drone out to its seam and back, over one trip.
  for (const b of colony.buildings) {
    if (b.kind !== 'droneBay' || b.status !== 'running') continue;
    const seam = droneSeam(world, b);
    if (!seam) continue;
    const trip = Math.min(1, b.progress / DRONE.seconds);
    const out = trip < 0.5 ? trip * 2 : (1 - trip) * 2;
    const arc = Math.abs(wrap(seam.angle - b.angle)) < 1e-9 ? 0 : wrap(seam.angle - b.angle);
    const at = heading(b.angle + arc * out);
    const height = colonyPlanet(world).radius + 8 + 14 * Math.sin(Math.PI * out);
    g.fillStyle(0x9be8a8, 0.95);
    g.fillCircle(at.x * height, at.y * height, 2);
    g.lineStyle(1, 0x9be8a8, 0.35);
    g.strokeCircle(at.x * height, at.y * height, 4);
  }
  // A working tug bay's tug flies up to its rock and back over one trip, with a faint tether line.
  for (const b of colony.buildings) {
    if (b.kind !== 'tugBay' || b.status !== 'running') continue;
    const rock = tugTarget(world, b);
    if (!rock) continue;
    const body = colonyPlanet(world);
    const rel = { x: rock.position.x - body.position.x, y: rock.position.y - body.position.y };
    const c = Math.cos(-body.spin), sn = Math.sin(-body.spin);
    const to = { x: rel.x * c - rel.y * sn, y: rel.x * sn + rel.y * c };
    const n = heading(b.angle);
    const from = { x: n.x * (body.radius + 20), y: n.y * (body.radius + 20) };
    const trip = Math.min(1, b.progress / TUG.seconds);
    const out = trip < 0.5 ? trip * 2 : (1 - trip) * 2;
    const at = { x: from.x + (to.x - from.x) * out, y: from.y + (to.y - from.y) * out };
    g.lineStyle(0.6, 0xb6f0ff, 0.25);
    g.lineBetween(from.x, from.y, at.x, at.y);
    g.fillStyle(0xb6f0ff, 0.95);
    g.fillCircle(at.x, at.y, 2.4);
  }
  // A worker drone flies an arc to its job, and while there it hovers with a welding spark under it.
  for (const b of colony.buildings) {
    if (b.kind !== 'workerBay') continue;
    const at = workerPosition(world, b);
    if (!at) continue;
    const r = colonyPlanet(world).radius + at.height;
    const n = heading(at.angle);
    // Body, a ring of rotor wash and two little arms.
    const side = { x: -n.y, y: n.x };
    g.fillStyle(0xffd98a, 1);
    g.fillCircle(n.x * r, n.y * r, 3.4);
    g.lineStyle(1.4, 0xffd98a, 0.9);
    g.lineBetween(n.x * r - side.x * 7, n.y * r - side.y * 7, n.x * r + side.x * 7, n.y * r + side.y * 7);
    g.lineStyle(1, 0xffe6b0, 0.45);
    g.strokeCircle(n.x * r, n.y * r, 7);
    if (b.job?.leg === 'work' && b.status === 'running') {
      const flicker = 0.5 + 0.5 * Math.sin(world.system.time * 31 + b.id);
      const ground = colonyPlanet(world).radius + 6;
      g.lineStyle(1.6, 0xfff1c2, 0.4 + 0.5 * flicker);
      g.lineBetween(n.x * (r - 3), n.y * (r - 3), n.x * ground, n.y * ground);
      g.fillStyle(0xffffff, 0.8 * flicker);
      g.fillCircle(n.x * ground, n.y * ground, 2.6);
    }
  }
  // A building out of reach of the base's power wears an amber diamond.
  for (const b of colony.buildings) {
    if (b.linked !== false) continue;
    const up = heading(b.angle);
    const r = colonyPlanet(world).radius + 34;
    g.lineStyle(1.5, 0xffc247, 0.95);
    g.strokePoints([
      new Phaser.Geom.Point(up.x * r - up.y * 5, up.y * r + up.x * 5),
      new Phaser.Geom.Point(up.x * (r + 5), up.y * (r + 5)),
      new Phaser.Geom.Point(up.x * r + up.y * 5, up.y * r - up.x * 5),
      new Phaser.Geom.Point(up.x * (r - 5), up.y * (r - 5)),
    ], true);
  }
  for (const entry of entries) {
    const blueprint = BLUEPRINTS[entry.kind], n = heading(entry.angle), tangent = { x: -n.y, y: n.x };
    const body=colonyPlanet(world),seen=heading(entry.angle+body.spin);if(!visible(view,{x:body.position.x+seen.x*body.radius,y:body.position.y+seen.y*body.radius},isHabitat(entry.kind)?HABITATS[entry.kind].halfSpan+HABITATS[entry.kind].height:50))continue;
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
    } else if (entry.kind === 'geothermal') {
      const vent = [p(-4, 13), p(-2, 24), p(2, 24), p(4, 13)];
      g.strokePoints(vent, false);
      for (const x of [-3, 0, 3]) { const a = p(x, 25), b = p(x + 2, 31); g.lineBetween(a.x, a.y, b.x, b.y); }
    } else if (entry.kind === 'windTurbine') {
      const hub = p(0, 26), mast = p(0, 13);
      g.lineBetween(mast.x, mast.y, hub.x, hub.y);
      for (const angle of [0.6, 2.7, 4.8]) { const tip = p(Math.cos(angle) * 9, 26 + Math.sin(angle) * 9); g.lineBetween(hub.x, hub.y, tip.x, tip.y); }
    } else if (entry.kind === 'condenser') {
      const fan = p(0, 18);
      g.strokeCircle(fan.x, fan.y, 5);
      const a = p(-4, 18), b = p(4, 18), c = p(0, 14), d = p(0, 22);
      g.lineBetween(a.x, a.y, b.x, b.y); g.lineBetween(c.x, c.y, d.x, d.y);
    } else if (entry.kind === 'antenna') {
      const mast = p(0, 13), top = p(0, 30), left = p(-6, 27), right = p(6, 27);
      g.lineBetween(mast.x, mast.y, top.x, top.y); g.lineBetween(left.x, left.y, top.x, top.y); g.lineBetween(top.x, top.y, right.x, right.y);
    } else if (entry.kind === 'headquarters') {
      // A taller block with a dome and a mast: the seed unit's housing. Wider than its footprint by a little.
      const block = [p(-14, 0), p(-14, 20), p(-6, 24), p(6, 24), p(14, 20), p(14, 0)];
      g.fillStyle(0x203749, 0.95);
      g.fillPoints(block, true);
      g.lineStyle(1.2, color, entry.active ? 1 : 0.5);
      g.strokePoints(block, true);
      const dome = p(0, 24);
      g.strokeCircle(dome.x, dome.y, 5);
      const mastTop = p(0, 38);
      g.lineBetween(dome.x, dome.y, mastTop.x, mastTop.y);
      // A window band for each level the HQ has reached.
      const levels = world.colony.buildings.find(b => b.kind === 'headquarters')?.hqLevel ?? 1;
      for (let i = 0; i < levels; i++) {
        const a = p(-10, 5 + i * 4), b = p(10, 5 + i * 4);
        g.lineBetween(a.x, a.y, b.x, b.y);
      }
    } else if (entry.kind === 'seaWall') {
      // A low, sloped wall facing both ways, with a coping line along the top.
      g.strokePoints([p(-width, 0), p(-width + 4, 12), p(width - 4, 12), p(width, 0)], false);
      const a = p(-width + 4, 9), b = p(width - 4, 9);
      g.lineBetween(a.x, a.y, b.x, b.y);
    } else if (entry.kind === 'workerBay') {
      // A landing pad on a short post, with the drone sitting on it when it is home.
      const left = p(-6, 18), right = p(6, 18), post = p(0, 13);
      g.lineBetween(left.x, left.y, right.x, right.y);
      g.lineBetween(post.x, post.y, p(0, 18).x, p(0, 18).y);
      const home = world.colony.buildings.find(b => b.angle === entry.angle && b.kind === 'workerBay');
      if (home && !home.job) {
        const seat = p(0, 21);
        g.fillStyle(0xffd98a, 0.9);
        g.fillCircle(seat.x, seat.y, 2.2);
      }
    } else if (entry.kind === 'tugBay') {
      // A launch cradle: two rails angled up, with the tug sitting in it when it is home.
      const a = p(-6, 13), b = p(-2, 26), c = p(6, 13), d = p(2, 26);
      g.lineBetween(a.x, a.y, b.x, b.y);
      g.lineBetween(c.x, c.y, d.x, d.y);
    } else if (entry.kind === 'shipyard') {
      // A gantry: two legs, a beam across, and a hook.
      const left = p(-width + 2, 13), right = p(width - 2, 13), topLeft = p(-width + 2, 40), topRight = p(width - 2, 40);
      g.lineBetween(left.x, left.y, topLeft.x, topLeft.y);
      g.lineBetween(right.x, right.y, topRight.x, topRight.y);
      g.lineBetween(topLeft.x, topLeft.y, topRight.x, topRight.y);
      const hookTop = p(4, 40), hook = p(4, 33);
      g.lineBetween(hookTop.x, hookTop.y, hook.x, hook.y);
    } else if (entry.kind === 'workshop') {
      const roof = [p(-width + 2, 13), p(0, 22), p(width - 2, 13)];
      g.strokePoints(roof, false);
      const door = p(0, 8); g.strokeRect(door.x - 3, door.y - 3, 6, 6);
    } else if (entry.kind === 'massDriver') {
      const a = p(-width + 2, 12), b = p(width - 2, 34);
      g.lineBetween(a.x, a.y, b.x, b.y);
      const c = p(-width + 2, 16), d = p(width - 2, 38);
      g.lineBetween(c.x, c.y, d.x, d.y);
    } else if (entry.kind === 'droneBay') {
      const pad = [p(-5, 13), p(0, 22), p(5, 13)]; g.strokePoints(pad, true);
      const dot = p(0, 17); g.fillStyle(color, 0.9); g.fillCircle(dot.x, dot.y, 1.8);
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

/** The seed ship standing under the Shipyard's gantry: an outline once the frame is laid, filling in stage by stage. */
function drawSeedShip(g: Phaser.GameObjects.Graphics, world: WorldState, time: number): void {
  const done = seedStagesDone(world).length;
  const ending = seedEnding(world);
  if (done === 0 || (ending && ENDINGS[ending].departs)) return;
  const yard = world.colony.buildings.find(b => b.kind === 'shipyard');
  if (!yard) return;
  const radius = colonyPlanet(world).radius;
  const n = heading(yard.angle);
  const tangent = { x: -n.y, y: n.x };
  const p = (x: number, height: number) => new Phaser.Geom.Point(n.x * (radius + height) + tangent.x * x, n.y * (radius + height) + tangent.y * x);
  // Hull outline, nose up, standing on the pad of the yard.
  const hull: Array<[number, number]> = [[-7, 14], [-8, 22], [-6, 30], [-2.5, 36], [0, 38], [2.5, 36], [6, 30], [8, 22], [7, 14]];
  g.lineStyle(0.8, 0xffe6b0, 0.9);
  g.strokePoints(hull.map(([x, y]) => p(x, y)), true);
  // Filled from the bottom, one band per finished stage after the frame.
  const share = (done - 1) / (SEED_STAGES.length - 1);
  const top = 14 + 24 * share;
  if (share > 0) {
    const half = (y: number) => (y <= 22 ? 7 + (y - 14) / 8 : y <= 30 ? 8 - ((y - 22) * 2) / 8 : Math.max(0, 6 - ((y - 30) * 6) / 8));
    const band: Phaser.Geom.Point[] = [];
    for (let y = 14; y <= top + 1e-6; y += 2) band.push(p(-half(y), y));
    for (let y = top; y >= 14 - 1e-6; y -= 2) band.push(p(half(y), y));
    g.fillStyle(0xcfd8dc, 0.9);
    g.fillPoints(band, true);
  }
  // Finished: running lights.
  if (done === SEED_STAGES.length) {
    const blink = 0.5 + 0.5 * Math.sin(time * 2);
    const tip = p(0, 39);
    g.fillStyle(0x7fe6d3, 0.4 + 0.6 * blink);
    g.fillCircle(tip.x, tip.y, 1.2);
  }
}

/** What the cosmetic base life needs to know, read from the simulation. */
function lifeView(world: WorldState): LifeView {
  const body = colonyPlanet(world);
  const colony = world.colony;
  return {
    radius: body.radius,
    buildings: colony.buildings.filter(b => operational(b) && !isHabitat(b.kind)).map(b => ({
      angle: b.angle,
      hauls: HAUL_KINDS.includes(b.kind) && b.enabled && (b.status === 'running' || b.kind === 'storage'),
      lit: b.enabled,
    })),
    dark: 1 - daylightAt(world.system, WORLD.padAngle, body.id),
    powered: colony.energy > 0.5,
  };
}

export function drawColony(g: Phaser.GameObjects.Graphics, world: WorldState, selected: number | null = null, draft: { kind: BuildType; angle: number; valid: boolean } | null = null, view?:RenderView, detail=true, time=0, animate=false): void {
  const p = colonyPlanet(world); g.save(); g.translateCanvas(p.position.x, p.position.y); g.rotateCanvas(p.spin);
  drawColonyLocal(g, world, selected, draft, view, detail, time, animate);
  if (detail) drawColonyLife(g, lifeView(world), time, animate);
  drawSeedShip(g, world, time);
  g.restore();
}
