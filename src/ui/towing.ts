import { featureVisible } from '../preferences/features';
import { TOW } from '../sim/towingConfig';
import { towInstallationError } from '../sim/towing';
import { RESOURCE_INFO } from '../sim/resources';
import type { WorldState } from '../sim/world';
export function towingPanel(w: WorldState, paused: boolean): string {
  if (!featureVisible('towing')) return '';
  const rock = w.asteroids.find(r => r.id === w.towing.targetId), error = towInstallationError(w);
  const nearest = w.asteroids.filter(r => r.health > 0).map(r => ({ rock: r, distance: Math.hypot(r.position.x - w.ship.position.x, r.position.y - w.ship.position.y) })).sort((a, b) => a.distance - b.distance || a.rock.id - b.rock.id)[0];
  const distance = rock ? Math.hypot(rock.position.x - w.ship.position.x, rock.position.y - w.ship.position.y) : 0;
  return `<div class="towing-panel" data-equipped="${w.ship.towRig}" data-target="${w.towing.targetId ?? ''}" data-breaks="${w.towing.breaks}" data-tension="${w.towing.tension.toFixed(1)}">
    <label>SHIP UTILITY · TOW RIG</label>
    ${w.ship.towRig ? `<small>Fitted · ${TOW.mass} kg · fixed-length passive cable</small>
      ${rock ? `<p>${RESOURCE_INFO[rock.resource].label} · ${rock.mass.toFixed(1)} kg · ${distance.toFixed(0)} m away<br>Cable ${w.towing.length.toFixed(0)} m · tension ${w.towing.tension.toFixed(0)} / ${TOW.breakForce} N<br>Stretch ${Math.max(0, distance - w.towing.length).toFixed(1)} / ${TOW.stretch} m</p>` : `<p>${nearest ? `Nearest: ${RESOURCE_INFO[nearest.rock.resource].label} · ${nearest.distance.toFixed(0)} m · relative ${Math.hypot(nearest.rock.velocity.x - w.ship.velocity.x, nearest.rock.velocity.y - w.ship.velocity.y).toFixed(1)} m/s` : 'Field depleted'}<br>Match velocity, then latch. Cable can snap under strain, impact or terrain contact.</p>`}
      <button ${paused || !rock && (w.playerMode !== 'ship' || w.ship.state !== 'flying') ? 'disabled' : ''} data-colony="toggleTow">${rock ? 'Release tow' : 'Latch nearest rock'} [Y]</button>` : `<p>16 alloy · 6 wire · 3 components → ${TOW.mass} kg utility rig</p><button ${paused || error ? 'disabled' : ''} data-colony="installTowRig">Fabricate tow rig · home pad</button><small>${error ?? 'Pilot docked · supplies available'}</small>`}
    <small>Latch: within ${TOW.range} m, relative speed ≤${TOW.relativeSpeed} m/s, clear terrain. Y releases; dropped rocks keep moving. Haul near home, then use normal mining/tractor/unload. No instant ore delivery. Coast prediction is suspended while towing.</small>
  </div>`;
}
