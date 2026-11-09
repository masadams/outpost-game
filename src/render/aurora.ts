import type Phaser from 'phaser';

const KEY = 'aurora-sky';
const W = 1024;
const H = 512;
/** Whole waves across the texture, so it tiles without a seam. */
const wave = (x: number, cycles: number, phase = 0): number => Math.sin((x / W) * Math.PI * 2 * cycles + phase) * 0.5 + 0.5;

/** Paints the curtains once into a texture that tiles sideways. */
function paint(scene: Phaser.Scene): void {
  if (scene.textures.exists(KEY)) return;
  const texture = scene.textures.createCanvas(KEY, W, H)!;
  const c = texture.context;
  for (let x = 0; x < W; x += 2) {
    const band = wave(x, 2, 0.4);
    const sway = wave(x, 7, 1.1);
    const ripple = wave(x, 19, 2.3);
    const bottom = H * (0.78 + 0.1 * (wave(x, 3) - 0.5));
    const top = bottom - H * (0.28 + 0.34 * sway);
    const alpha = band * (0.35 + 0.65 * ripple);
    const g = c.createLinearGradient(0, top, 0, bottom);
    g.addColorStop(0, 'rgba(180,140,255,0)');
    g.addColorStop(0.35, `rgba(180,140,255,${0.35 * alpha})`);
    g.addColorStop(0.75, `rgba(109,255,176,${0.55 * alpha})`);
    g.addColorStop(0.97, `rgba(160,255,210,${0.8 * alpha})`);
    g.addColorStop(1, 'rgba(109,255,176,0)');
    c.fillStyle = g;
    c.fillRect(x, top, 2, bottom - top);
  }
  texture.refresh();
}

/** The sky layer for the northern lights: one tiling image, scrolled and faded each frame (no redrawing). */
export function createAuroraSky(scene: Phaser.Scene): Phaser.GameObjects.TileSprite {
  paint(scene);
  return scene.add.tileSprite(0, 0, 16, 16, KEY).setOrigin(0, 0).setVisible(false);
}

export function updateAuroraSky(sprite: Phaser.GameObjects.TileSprite, width: number, height: number, time: number, strength: number): void {
  if (strength <= 0.01) {
    if (sprite.visible) sprite.setVisible(false);
    return;
  }
  const h = height * 0.5;
  if (sprite.width !== width || sprite.height !== h) {
    sprite.setSize(width, h);
    sprite.setTileScale(1, h / H);
  }
  sprite.setVisible(true);
  sprite.setAlpha(Math.min(1, strength) * (0.75 + 0.25 * Math.sin(time * 0.4)));
  sprite.tilePositionX = time * 6;
}
