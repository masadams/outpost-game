import type { Building } from './colony';
export const buildingHealth = (building: Building): number => building.health ?? 100;
export const operational = (building: Building): boolean => buildingHealth(building) > 0;
