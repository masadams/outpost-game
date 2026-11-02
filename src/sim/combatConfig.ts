import type { Vec } from './math';

export const SHIP_WEAPONS = {
  cannon: { speed: 260, damage: 18, energy: 8, heat: 16, interval: 0.18, life: 5, mass: 0.1, alloy: 0.1, components: 0, capacity: 40 },
  missile: { speed: 150, damage: 55, energy: 25, heat: 38, interval: 1.2, life: 12, mass: 1.25, alloy: 1, components: 0.25, capacity: 2 },
} as const;
export type ShipWeapon = keyof typeof SHIP_WEAPONS;
export interface Armament { selected: ShipWeapon; cannon: number; missile: number; energy: number; heat: number; cooldown: number; overheated: boolean }
export const createArmament = (): Armament => ({ selected: 'cannon', cannon: 40, missile: 2, energy: 100, heat: 0, cooldown: 0, overheated: false });
export const ammunitionMass = (a: Armament): number => a.cannon * SHIP_WEAPONS.cannon.mass + a.missile * SHIP_WEAPONS.missile.mass;
export interface Drone {
  id: number; position: Vec; velocity: Vec; angle: number; hull: number; fuel: number; ammo: number; energy: number;
  cooldown: number; windup: number; retreatTime: number; state: 'approach' | 'attack' | 'retreat';
}
export const droneMass = (d: Drone): number => 160 + d.fuel + d.ammo * 0.1;
export interface CombatProjectile { id: number; owner: 'ship' | 'enemy'; kind: ShipWeapon; position: Vec; velocity: Vec; life: number; targetId: number | null }
export interface CombatFlash { position: Vec; life: number }
export interface CombatState {
  enemies: Drone[]; projectiles: CombatProjectile[]; flashes: CombatFlash[];
  encounters: number; tier: number; kills: number; escaped: number; shots: number; enemyShots: number; recoveries: number; lostCargo: number; furthestAltitude: number;
}
export type CombatAction = { type: 'startEncounter' | 'cycleWeapon' | 'recoverShip' };
export const createCombat = (): CombatState => ({ enemies: [], projectiles: [], flashes: [], encounters: 0, tier: 1, kills: 0, escaped: 0, shots: 0, enemyShots: 0, recoveries: 0, lostCargo: 0, furthestAltitude: 0 });
