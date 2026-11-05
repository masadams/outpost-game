import type Phaser from 'phaser';
import { colonyPlanet, localAngleAt } from '../sim/localWorld';
import { nearestPlanet } from '../sim/celestial';
import { heading } from '../sim/math';
import type { WorldState } from '../sim/world';

/**
 * The astronaut, drawn in metres in surface space (+y is up from the ground, +x along it).
 * About 7.5 m tall from the boots (y = -2.5) to the top of the helmet (y = 5), matching SUIT_ART_HEIGHT.
 */
const COLOURS = {
  ok: { suit: 0xe0eff2, shade: 0xb4c9d3, pack: 0x4f7285, visor: 0x0a1f2c, rim: 0x73f3cf },
  lost: { suit: 0xff9a80, shade: 0xc77360, pack: 0x7a4a42, visor: 0x2a1410, rim: 0xff8f75 },
} as const;

let facing = 1;

export function drawAstronaut(g: Phaser.GameObjects.Graphics, world: WorldState, time: number): void {
  const body = colonyPlanet(world);
  const suit = world.astronaut;
  if (world.playerMode !== 'astronaut' || nearestPlanet(suit.position, world.system).id !== body.id) return;

  const up = heading(localAngleAt(world, suit.position));
  const along = { x: -up.y, y: up.x };
  const speed = (suit.velocity.x - body.velocity.x) * along.x + (suit.velocity.y - body.velocity.y) * along.y;
  if (Math.abs(speed) > 0.6) facing = Math.sign(speed);
  const walking = suit.grounded && Math.abs(speed) > 1;
  const stride = walking ? Math.sin(time * 11) : 0;
  const c = suit.health <= 0 ? COLOURS.lost : COLOURS.ok;
  const f = facing;

  const p = (x: number, y: number) => ({
    x: suit.position.x + along.x * x * f + up.x * y,
    y: suit.position.y + along.y * x * f + up.y * y,
  });
  const poly = (points: Array<[number, number]>, fill: number, stroke?: number, width = 0.4) => {
    const pts = points.map(([x, y]) => p(x, y));
    g.fillStyle(fill);
    g.fillPoints(pts, true);
    if (stroke !== undefined) {
      g.lineStyle(width, stroke);
      g.strokePoints(pts, true);
    }
  };
  const limb = (x0: number, y0: number, x1: number, y1: number, width: number, colour: number) => {
    const a = p(x0, y0);
    const b = p(x1, y1);
    g.lineStyle(width, colour);
    g.lineBetween(a.x, a.y, b.x, b.y);
  };

  // Legs behind the body, swinging when walking. Boots are small blocks.
  const swing = stride * 1.1;
  limb(-0.5, -0.6, -0.9 - swing, -2.2, 1.5, c.shade);
  limb(0.5, -0.6, 0.9 + swing, -2.2, 1.5, c.suit);
  poly([[-1.8 - swing, -2.5], [0 - swing, -2.5], [0 - swing, -1.9], [-1.5 - swing, -1.9]], c.pack, undefined);
  poly([[0.1 + swing, -2.5], [2 + swing, -2.5], [1.8 + swing, -1.9], [0.1 + swing, -1.9]], c.pack, undefined);

  // Life-support pack on the back.
  poly([[-3.1, -0.6], [-1.5, -0.6], [-1.5, 3.2], [-2.8, 3.4], [-3.1, 2.6]], c.pack, c.shade, 0.35);

  // Torso.
  poly([[-1.9, -0.8], [1.9, -0.8], [2.3, 0.6], [2, 2.6], [-2, 2.6], [-2.3, 0.6]], c.suit, c.shade, 0.4);
  g.lineStyle(0.35, c.rim);
  const chestA = p(-1, 1.7);
  const chestB = p(1.2, 1.7);
  g.lineBetween(chestA.x, chestA.y, chestB.x, chestB.y);

  // Arm in front, swinging against the legs.
  limb(1, 2, 2.2 - swing * 0.8, 0.2, 1.3, c.suit);

  // Helmet with a visor on the facing side.
  const head = p(0.2, 3.1);
  g.fillStyle(c.suit);
  g.fillCircle(head.x, head.y, 2.15);
  g.lineStyle(0.4, c.shade);
  g.strokeCircle(head.x, head.y, 2.15);
  poly([[0.3, 4.4], [2.1, 3.7], [2.2, 2.4], [0.6, 1.9], [0, 2.8]], c.visor, c.rim, 0.35);
  limb(0.9, 3.9, 1.7, 3.5, 0.35, 0xdffcf9);
}
