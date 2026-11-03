import type { Colony } from './colony';
import type { Product } from './colonyConfig';

export const POLICY_FIELDS = ['energyReserve', 'deliveryReserve', 'alloyReserve', 'componentsReserve'] as const;
export type PolicyField = typeof POLICY_FIELDS[number];
export interface ColonyPolicy { energyReserve: number; deliveryReserve: number; alloyReserve: number; componentsReserve: number }
export const POLICY_INFO: Record<PolicyField, { label: string; step: number; unit: string }> = {
  energyReserve: { label: 'Essential systems power', step: 5, unit: 'kJ' },
  deliveryReserve: { label: 'Ship delivery room', step: 25, unit: 'kg' },
  alloyReserve: { label: 'Turret alloy', step: 5, unit: 'kg' },
  componentsReserve: { label: 'Turret components', step: 1, unit: 'kg' },
};
export const MAX_RESERVE = 1000;
export const createPolicy = (): ColonyPolicy => ({ energyReserve: 0, deliveryReserve: 0, alloyReserve: 0, componentsReserve: 0 });
const DEFAULT_POLICY: Readonly<ColonyPolicy> = Object.freeze(createPolicy());
export const policyFor = (colony: Colony): Readonly<ColonyPolicy> => colony.policy ?? DEFAULT_POLICY;
export type PolicyAction = { type: 'adjustPolicy'; field: PolicyField; direction: -1 | 1 };

/** Turrets may spend their reserve. Every other manufactured-material consumer uses this budget. */
export function availableProduct(colony: Colony, product: Product): number {
  const policy = policyFor(colony), held = product === 'alloy' ? policy.alloyReserve : product === 'components' ? policy.componentsReserve : 0;
  return Math.max(0, colony.products[product] - held);
}
export function industrialPowerBlock(colony: Colony, amount: number): 'no power' | 'power reserved' | null {
  if (colony.energy + 1e-9 < amount) return 'no power';
  return Math.max(0, colony.energy - policyFor(colony).energyReserve) + 1e-9 < amount ? 'power reserved' : null;
}
export function validPolicy(value: unknown): value is ColonyPolicy {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const p = value as ColonyPolicy;
  return POLICY_FIELDS.every(f => Number.isFinite(p[f]) && p[f] >= 0 && p[f] <= MAX_RESERVE) && Object.keys(p).every(f => POLICY_FIELDS.includes(f as PolicyField));
}
