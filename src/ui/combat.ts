import { printPlan } from '../sim/wrecks';
import { featureVisible } from '../preferences/features';
import type { WorldState } from '../sim/world';
export function combatPanel(world: WorldState, paused: boolean): string {
  const s = world.ship, a = s.armament, c = world.combat;
  if (!featureVisible('combat')) return recoveryPanel(world, paused);
  return `<div class="combat-panel" data-enemies="${c.enemies.length}" data-kills="${c.kills}" data-shots="${c.shots}" data-cannon="${a.cannon}" data-missiles="${a.missile}" data-heat="${a.heat.toFixed(1)}" data-energy="${a.energy.toFixed(1)}" data-overheated="${a.overheated}" data-encounters="${c.encounters}" data-recoveries="${c.recoveries}">
    <label>SHIP ARMAMENT · ${a.selected.toUpperCase()}</label>
    <div>${a.cannon} cannon · ${a.missile} missiles · ${c.kills} drones defeated</div>
    <small>${world.playerMode === 'ship' ? 'Shift fires' : 'Board the ship to fire'} · Z switches · E repairs/rearms when landed using colony materials.</small>
    <button ${paused ? 'disabled' : ''} data-colony="cycleWeapon">Switch ship weapon [Z]</button>
    ${s.state === 'crashed' ? `<button ${paused ? 'disabled' : ''} data-colony="recoverShip">Print new pilot and lander [Backspace] · 8 alloy + 2 components</button>` : ''}
  </div>`;
}

/** Focus-set view of the ship panel: only what a wrecked lander needs. */
function recoveryPanel(world: WorldState, paused: boolean): string {
  const c = world.combat;
  const plan = printPlan(world);
  if (!plan) {
    return `<div class="combat-panel" data-recoveries="${c.recoveries}"><label>SHIP</label><p>Your lander is intact.</p></div>`;
  }
  const cost = Object.entries(plan.cost).filter(([, n]) => (n ?? 0) > 0).map(([p, n]) => `${n} ${p}`).join(' and ');
  return `<div class="combat-panel" data-recoveries="${c.recoveries}">
    <label>${plan.lander ? 'LANDER LOST' : 'PILOT LOST'}</label>
    <p>Your pilots are printed at the base. ${plan.lander ? `Print a new pilot and a basic lander on the pad for ${cost}. The old lander stays where it fell, with what survived; its transponder shows it on the Map for an hour, so you can fly out and salvage it.` : `Print a new pilot at the base for ${cost}.`}</p>
    ${plan.blocked ? `<p class="why">${plan.blocked}.</p>` : ''}
    <button ${paused || plan.blocked ? 'disabled' : ''} data-colony="recoverShip">Print new pilot${plan.lander ? ' and lander' : ''} [Backspace]</button>
    <small>Or press L to load your last save.</small>
  </div>`;
}
