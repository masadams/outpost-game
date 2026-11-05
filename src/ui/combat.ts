import { featureVisible } from '../preferences/features';
import { WORLD } from '../sim/config';
import type { WorldState } from '../sim/world';
import { telemetry } from '../sim/physics';
import { threatTier } from '../sim/combat';
export function combatPanel(world: WorldState, paused: boolean): string {
  const s = world.ship, a = s.armament, c = world.combat;
  if (!featureVisible('combat')) return recoveryPanel(world, paused);
  return `<div class="combat-panel" data-enemies="${c.enemies.length}" data-kills="${c.kills}" data-shots="${c.shots}" data-cannon="${a.cannon}" data-missiles="${a.missile}" data-heat="${a.heat.toFixed(1)}" data-energy="${a.energy.toFixed(1)}" data-overheated="${a.overheated}" data-encounters="${c.encounters}" data-recoveries="${c.recoveries}">
    <label>SHIP ARMAMENT · ${a.selected.toUpperCase()}</label>
    <div>${a.cannon} cannon · ${a.missile} missiles · ${c.kills} drones defeated</div>
    <small>${world.playerMode === 'ship' ? 'Shift fires' : 'Board the ship to fire'} · Z switches · E repairs/rearms when landed using colony materials.</small>
    <button ${paused ? 'disabled' : ''} data-colony="cycleWeapon">Switch ship weapon [Z]</button>
    <button ${paused || world.playerMode !== 'ship' || s.state !== 'flying' || telemetry(s, WORLD.shipRadius, world.system).altitude < 200 || c.enemies.length || c.projectiles.length ? 'disabled' : ''} data-colony="startEncounter">Start hostile patrol [O] · tier ${threatTier(world)}</button>
    ${s.state === 'crashed' ? `<button ${paused ? 'disabled' : ''} data-colony="recoverShip">Recover ship [Backspace] · 8 alloy + 2 components</button>` : ''}
    <small>Save with K before combat. Land to disengage. Recovery loses cargo; L restores a checkpoint.</small>
  </div>`;
}

/** Focus-set view of the ship panel: only what a wrecked lander needs. */
function recoveryPanel(world: WorldState, paused: boolean): string {
  const c = world.combat;
  if (world.ship.state !== 'crashed') {
    return `<div class="combat-panel" data-recoveries="${c.recoveries}"><label>SHIP</label><p>Your lander is intact.</p></div>`;
  }
  return `<div class="combat-panel" data-recoveries="${c.recoveries}">
    <label>LANDER WRECKED</label>
    <p>Bring the lander back to the pad for 8 alloy and 2 components from your base. Its cargo is lost.</p>
    <button ${paused ? 'disabled' : ''} data-colony="recoverShip">Recover lander [Backspace]</button>
    <small>Or press L to load your last save.</small>
  </div>`;
}
