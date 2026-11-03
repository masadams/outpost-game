import type { Vec } from './math';
import type { Asteroid } from './bodies';

export const WEAPONS = {
  laser: { range: 900, energy: 1.5, cooldown: 0.25, damage: 0.28, alloy: 0, components: 0, speed: 0, blast: 0 },
  flak: { range: 1100, energy: 2, cooldown: 0.8, damage: 0.6, alloy: 0.25, components: 0, speed: 220, blast: 65 },
  missile: { range: 1800, energy: 4, cooldown: 2.5, damage: 1.2, alloy: 1, components: 0.25, speed: 150, blast: 100 },
} as const;
export type Weapon = keyof typeof WEAPONS;
export const isTurret = (kind: string): kind is Weapon => kind === 'laser' || kind === 'flak' || kind === 'missile';
export interface Meteor extends Asteroid { impactBudget?: number }
export interface Projectile { frameVelocity?: Vec; id: number; kind: 'flak' | 'missile'; position: Vec; velocity: Vec; targetId: number | null; life: number; fuse: number }
export interface DefenceBeam { start: Vec; end: Vec; life: number }
export interface DefenceState {
  wave: number; meteors: Meteor[]; projectiles: Projectile[]; beams: DefenceBeam[];
  controlled: number | null; intercepted: number; impacts: number; shots: number; lostStock: number;
}
export type DefenceAction = { type: 'startWave' | 'controlTurret' | 'releaseTurret' | 'toggleAuto' | 'repairBuilding' };
export function createDefence(): DefenceState {
  return { wave: 0, meteors: [], projectiles: [], beams: [], controlled: null, intercepted: 0, impacts: 0, shots: 0, lostStock: 0 };
}
