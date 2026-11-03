import { WORLD } from '../sim/config';
import type { WorldState } from '../sim/world';
import { telemetry } from '../sim/physics';
import { threatTier } from '../sim/combat';
export function combatPanel(world: WorldState, paused: boolean): string {
  const s = world.ship, a = s.armament, c = world.combat;
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
