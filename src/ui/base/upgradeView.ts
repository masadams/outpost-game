import { buildingUpgradeError } from '../../sim/buildingUpgrades';
import { PRODUCTS } from '../../sim/colonyConfig';
import { BATTERY_CAPACITY } from '../../sim/colony';
import type { Building } from '../../sim/colony';
import { RELAY_RANGE } from '../../sim/grid';
import { capacityFactor, facilityLevel, upgradeCost, workFactor } from '../../sim/facilityStats';
import type { WorldState } from '../../sim/world';

export interface UpgradeView {
  /** What the upgrade changes, in a few words. */
  effect: string;
  /** What it costs, in words. */
  cost: string;
  /** Why it cannot be done right now, or null. */
  blocked: string | null;
}

/** Every building says what a tier does. New buildings add a line here when they are added. */
export function tierEffect(b: Building): string {
  const next = { ...b, level: 2 as const };
  const power = capacityFactor(next);
  const speed = workFactor(next);
  switch (b.kind) {
    case 'solar': return `Makes ${power}× the power`;
    case 'battery': return `Stores ${BATTERY_CAPACITY * power} kJ instead of ${BATTERY_CAPACITY}`;
    case 'storage': return `Holds ${power}× as much`;
    case 'relay': return `Reaches ${RELAY_RANGE * power} m instead of ${RELAY_RANGE} m`;
    case 'refinery':
    case 'fuelProcessor':
    case 'miningRig':
    case 'researchLab':
    case 'observatory':
      return `Works ${speed}× as fast`;
    case 'laser':
    case 'flak':
    case 'missile':
      return `Fires ${speed}× as often`;
    case 'shieldSmall':
    case 'shieldLarge':
      return `Recharges ${speed}× as fast`;
    case 'habitatSmall':
    case 'habitatLarge':
      return `Holds ${power}× the air`;
    default: return 'Tougher against damage';
  }
}

const REASON: Record<string, string> = {
  'Research Infrastructure retrofits': 'Research Infrastructure retrofits first.',
  'Repair facility fully before upgrading': 'Repair it first.',
  'Recover before issuing upgrade orders': 'Get your pilot back first.',
};

/** The first upgrade step. Null once a building is past it. */
export function upgradeView(w: WorldState, b: Building): UpgradeView | null {
  if (facilityLevel(b) !== 1) return null;
  const cost = upgradeCost(b, 2);
  const words = PRODUCTS.filter(p => (cost[p] ?? 0) > 0).map(p => `${cost[p]} ${p}`).join(', ');
  const error = buildingUpgradeError(w, b);
  let blocked: string | null = null;
  if (error) {
    if (REASON[error]) blocked = REASON[error];
    else if (error.startsWith('Needs unreserved')) blocked = `Needs ${words}.`;
    else if (error.startsWith('Needs')) blocked = error.replace(' unreserved local grid charge', ' stored') + '.';
    else blocked = error + '.';
  }
  return { effect: tierEffect(b), cost: words, blocked };
}
