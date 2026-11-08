import type Phaser from 'phaser';
import { ATMOSPHERE, WORLD } from '../sim/config';

/** A single cached procedural sprite avoids filling sixteen screen-sized discs every frame. */
export function createAtmosphere(scene: Phaser.Scene): Phaser.GameObjects.Image {
  const key = 'planet-atmosphere';
  if (!scene.textures.exists(key)) {
    const texture = scene.textures.createCanvas(key, 512, 512)!;
    const context = texture.context;
    const gradient = context.createRadialGradient(256, 256, 0, 256, 256, 256);
    gradient.addColorStop(0, 'rgba(37,77,131,0.55)');
    gradient.addColorStop(WORLD.radius / (WORLD.radius + ATMOSPHERE.height), 'rgba(37,77,131,0.55)');
    gradient.addColorStop(0.82, 'rgba(37,77,131,0.16)');
    gradient.addColorStop(1, 'rgba(37,77,131,0)');
    context.fillStyle = gradient; context.fillRect(0, 0, 512, 512); texture.refresh();
  }
  const diameter = 2 * (WORLD.radius + ATMOSPHERE.height);
  return scene.add.image(0, 0, key).setDisplaySize(diameter, diameter);
}

/** A soft halo of air around another world, tinted for the kind of air it has. */
export function createHalo(scene: Phaser.Scene, key: string, radius: number, height: number, rgb: string, strength: number): Phaser.GameObjects.Image {
  if (!scene.textures.exists(key)) {
    const texture = scene.textures.createCanvas(key, 256, 256)!;
    const context = texture.context;
    const gradient = context.createRadialGradient(128, 128, 0, 128, 128, 128);
    const edge = radius / (radius + height);
    gradient.addColorStop(0, `rgba(${rgb},${strength})`);
    gradient.addColorStop(edge, `rgba(${rgb},${strength})`);
    gradient.addColorStop(edge + (1 - edge) * 0.4, `rgba(${rgb},${strength * 0.35})`);
    gradient.addColorStop(1, `rgba(${rgb},0)`);
    context.fillStyle = gradient;
    context.fillRect(0, 0, 256, 256);
    texture.refresh();
  }
  const diameter = 2 * (radius + height);
  return scene.add.image(0, 0, key).setDisplaySize(diameter, diameter);
}
