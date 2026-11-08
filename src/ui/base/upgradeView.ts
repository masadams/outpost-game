import { buildingUpgradeError } from '../../sim/buildingUpgrades';
import { PRODUCTS } from '../../sim/colonyConfig';
import { BATTERY_CAPACITY } from '../../sim/colony';
import type { Building } from '../../sim/colony';
import { RELAY_RANGE } from '../../sim/grid';
import { MASS_DRIVER } from '../../sim/airMachines';
import { capacityFactor, facilityLevel, upgradeCost, workFactor } from '../../sim/facilityStats';
import type { WorldState } from '../../sim/world';

export interface UpgradeView {
  /** What the upgrade changes, in a few words. */
  effect: string;
  /** What it costs, in words. */
  cost: string;
  /** Why it cannot be done right now, or null. */
  blocked: string | null;
  /** The tier it would reach. */
  tier: 2 | 3;
}

/** Every building says what a tier does. New buildings add a line here when they are added. */
export function tierEffect(b: Building, tier: 2 | 3 = 2): string {
  const next = { ...b, level: tier };
  const power = capacityFactor(next);
  const speed = workFactor(next);
  switch (b.kind) {
    case 'solar':
    case 'geothermal':
    case 'windTurbine': return `Makes ${power}× the power`;
    case 'massDriver': return `Pods carry ${MASS_DRIVER.capacity * power} kg instead of ${MASS_DRIVER.capacity}`;
    case 'battery': return `Stores ${BATTERY_CAPACITY * power} kJ instead of ${BATTERY_CAPACITY}`;
    case 'storage': return `Holds ${power}× as much`;
    case 'relay': return `Reaches ${RELAY_RANGE * power} m instead of ${RELAY_RANGE} m`;
    case 'refinery':
    case 'fuelProcessor':
    case 'miningRig':
    case 'droneBay':
    case 'condenser':
    case 'workshop':
    case 'antenna':
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
  'Repair facility fully before upgrading': 'Repair it first.',
  'Recover before issuing upgrade orders': 'Get your pilot back first.',
};

/** The next upgrade step. Null once a building is at its top tier. */
export function upgradeView(w: WorldState, b: Building): UpgradeView | null {
  const level = facilityLevel(b);
  if (level === 3) return null;
  const tier = level === 1 ? 2 : 3;
  const cost = upgradeCost(b, tier);
  const words = PRODUCTS.filter(p => (cost[p] ?? 0) > 0).map(p => `${cost[p]} ${p}`).join(', ');
  const error = buildingUpgradeError(w, b);
  let blocked: string | null = null;
  if (error) {
    if (REASON[error]) blocked = REASON[error];
    else if (error.startsWith('Research ')) blocked = `${error} first.`;
    else if (error === 'Needs more materials') blocked = `Needs ${words}.`;
    else if (error.startsWith('Needs')) blocked = error + '.';
    else blocked = error + '.';
  }
  return { effect: tierEffect(b, tier), cost: words, blocked, tier };
}
