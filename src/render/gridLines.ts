import type Phaser from 'phaser';
import { gridNodes } from '../sim/grid';
import { islandGroups } from '../sim/grid';
import { colonyPlanet } from '../sim/localWorld';
import { heading, wrap } from '../sim/math';
import type { WorldState } from '../sim/world';

/** Line colour by how many relays lie between a building and the base: green straight in, amber, then orange. */
const HOP_COLOURS = [0x92e6a0, 0xffd166, 0xffa45c, 0xff7a5c] as const;
const ISLAND = 0x9fd7ff;
const CUT = 0xff7070;

/**
 * The power grid drawn over the ground: each building's link back towards the pad as a low arc, coloured by how
 * many relays it passes through (more relays, more lost on the way). Separate grids are drawn in blue between their
 * own buildings; a building with no power at all gets a short red stub. Drawn in the world's own frame.
 */
export function drawGridLines(g: Phaser.GameObjects.Graphics, world: WorldState): void {
  const nodes = gridNodes(world);
  if (nodes === null) return;
  const body = colonyPlanet(world);
  const radius = body.radius;
  const byId = new Map(world.colony.buildings.map(b => [b.id, b]));
  g.save();
  g.translateCanvas(body.position.x, body.position.y);
  g.rotateCanvas(body.spin);
  const arc = (from: number, to: number, lift: number, colour: number, alpha: number, width: number) => {
    const span = wrap(to - from);
    const steps = Math.max(4, Math.ceil((Math.abs(span) * radius) / 12));
    g.lineStyle(width, colour, alpha);
    g.beginPath();
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const n = heading(from + span * t);
      // Each hop sits a little higher, so lines to the same node do not lie on top of each other.
      const h = lift;
      if (i === 0) g.moveTo(n.x * (radius + h), n.y * (radius + h));
      else g.lineTo(n.x * (radius + h), n.y * (radius + h));
    }
    g.strokePath();
  };
  for (const [id, node] of nodes) {
    const b = byId.get(id);
    if (!b) continue;
    const parentAngle = node.parent === 0 ? 0 : byId.get(node.parent)?.angle ?? 0;
    const colour = HOP_COLOURS[Math.min(node.relays, HOP_COLOURS.length - 1)];
    arc(parentAngle, b.angle, 30 + 4 * node.relays, colour, 0.6, b.kind === 'relay' ? 1.8 : 1.1);
    // A small tap down to the building.
    const n = heading(b.angle);
    g.lineStyle(1, colour, 0.6);
    g.lineBetween(n.x * (radius + 16), n.y * (radius + 16), n.x * (radius + 30 + 4 * node.relays), n.y * (radius + 30 + 4 * node.relays));
  }
  for (const group of islandGroups(world)) {
    const sorted = [...group].sort((a, b) => a.angle - b.angle);
    for (let i = 1; i < sorted.length; i++) arc(sorted[i - 1].angle, sorted[i].angle, 30, ISLAND, 0.6, 1.1);
  }
  const onIsland = new Set(islandGroups(world).flat().map(b => b.id));
  for (const b of world.colony.buildings) {
    if (nodes.has(b.id) || onIsland.has(b.id) || (b.health !== undefined && b.health <= 0)) continue;
    const n = heading(b.angle);
    g.lineStyle(2, CUT, 0.9);
    g.lineBetween(n.x * (radius + 14), n.y * (radius + 14), n.x * (radius + 26), n.y * (radius + 26));
  }
  g.restore();
}
