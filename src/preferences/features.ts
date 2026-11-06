import { BODY_IDS } from '../sim/celestial';
import { FINDS } from '../sim/finds';
import type { BuildType } from '../sim/colonyConfig';
import type { ColonyAction } from '../sim/colony';

/**
 * Feature visibility for the current focus milestone (docs/CURRENT_FOCUS.md).
 *
 * New games show only the first-mining-sortie set. Every other system stays in the code and in saves,
 * but is hidden from the interface and its actions are ignored, until a later slice reintroduces it.
 * Developers and the full browser suite can restore everything with `?features=all`
 * (or localStorage `outpost.features` = `all`).
 *
 * This is presentation and input gating only. It never changes simulation rules.
 */
export type FeatureMode = 'focus' | 'all';

export type Feature =
  | 'combat'
  | 'defence'
  | 'shields'
  | 'towing'
  | 'autopilot'
  | 'upgrades'
  | 'scheduling'
  | 'policy'
  | 'freight'
  | 'research'
  | 'shipFitting'
  | 'habitats'
  | 'moonTravel'
  | 'geology'
  | 'starterBudget'
  | 'catalogue';

/** Buildings a new player can place. The first five match number keys 1–5; the rest are mouse-only. */
export const FOCUS_BLUEPRINTS: readonly BuildType[] = ['solar', 'battery', 'storage', 'refinery', 'fuelProcessor', 'miningRig', 'researchLab', 'observatory', 'laser', 'missile', 'relay', 'shieldSmall', 'shieldLarge', 'habitatSmall', 'habitatLarge'];

export const FEATURE_STORAGE_KEY = 'outpost.features';

let mode: FeatureMode | null = null;

function readMode(): FeatureMode {
  try {
    const query = new URLSearchParams(globalThis.location?.search ?? '').get('features');
    if (query === 'all' || query === 'focus') return query;
  } catch {
    // No location (tests, workers): fall through.
  }
  try {
    if (globalThis.localStorage?.getItem(FEATURE_STORAGE_KEY) === 'all') return 'all';
  } catch {
    // Storage blocked: use the focus set.
  }
  return 'focus';
}

export function featureMode(): FeatureMode {
  mode ??= readMode();
  return mode;
}

/** For tests and developer tools. */
export function setFeatureMode(next: FeatureMode | null): void {
  mode = next;
}

export function featureVisible(feature: Feature, current: FeatureMode = featureMode()): boolean {
  void feature;
  return current === 'all';
}

export function blueprintVisible(kind: BuildType, current: FeatureMode = featureMode()): boolean {
  return current === 'all' || FOCUS_BLUEPRINTS.includes(kind);
}

const ACTION_FEATURES: Partial<Record<string, Feature>> = {
  autopilot: 'autopilot',
  upgradeBuilding: 'upgrades',
  loadManifest: 'freight',
  loadOre: 'freight',
  freight: 'freight',
  researchStart: 'research',
  researchControl: 'research',
  equipment: 'shipFitting',
  toggleTow: 'towing',
  installTowRig: 'towing',
  adjustPolicy: 'policy',
  toggleSchedule: 'scheduling',
  adjustTarget: 'scheduling',
  remoteTarget: 'scheduling',
  startEncounter: 'combat',
  cycleWeapon: 'combat',
  startWave: 'defence',
};

/** Whether an action from the keyboard or interface may reach the simulation. */
export function actionAllowed(action: ColonyAction, current: FeatureMode = featureMode(), known: readonly string[] = []): boolean {
  if (current === 'all') return true;
  // The one reserve a new player sees: power kept back for the turrets, set from Base.
  if (action.type === 'adjustPolicy' && action.field === 'energyReserve') return true;
  if (action.type === 'loadManifest' && known.length > 0 && action.manifest === 'nacreKit') return true;
  // Research projects and fabrication are limited by what the player has found (checked in the simulation).
  // Buildings can be upgraded in place once, to tier 2; the research behind it is checked in the simulation.
  // Carrying ore home from another world is part of the loop, not a hidden system.
  if (action.type === 'loadAllOre') return true;
  if (action.type === 'upgradeBuilding') return action.level === 2;
  if (action.type === 'researchStart') return FINDS.some(f => f.tech === action.tech);
  if (action.type === 'equipment') return FINDS.some(f => f.upgrade === action.upgrade);
  const feature = ACTION_FEATURES[action.type];
  if (feature) return featureVisible(feature, current);
  if (action.type === 'select' || action.type === 'queueBuild') return blueprintVisible(action.kind, current);
  if (action.type === 'navigate') return !(BODY_IDS as readonly string[]).includes(action.target) || action.target === 'home' || known.includes(action.target);
  if (action.type === 'remote') return action.operation !== 'auto';
  return true;
}

export function filterActions(actions: ColonyAction[], current: FeatureMode = featureMode(), known: readonly string[] = []): ColonyAction[] {
  return actions.filter(action => actionAllowed(action, current, known));
}

/** Key bindings for hidden systems are left out of the Settings table in the focus set. */
const FOCUS_HIDDEN_BINDINGS: readonly string[] = ['SHIFT', 'N', 'O', 'Z', 'Y', 'SIX', 'SEVEN', 'EIGHT', 'NINE'];

export function bindingVisible(slot: string, current: FeatureMode = featureMode()): boolean {
  return current === 'all' || !FOCUS_HIDDEN_BINDINGS.includes(slot);
}
