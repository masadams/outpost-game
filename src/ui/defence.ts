import { isShield, SHIELDS } from '../sim/shieldConfig';
import type { WorldState } from '../sim/world';
import type { ThreatPrediction } from '../sim/meteor';

export function defencePanel(world: WorldState, paused: boolean, threats: ThreatPrediction[]): string {
  const d = world.defence, first = threats.filter(t => t.impact).sort((a, b) => a.seconds - b.seconds)[0];
  return `<div class="defence-panel" data-threats="${d.meteors.length}" data-impacts="${d.impacts}" data-intercepted="${d.intercepted}" data-shots="${d.shots}" data-controlled="${d.controlled ?? ''}" data-wave="${d.wave}">
    <label>PLANETARY DEFENCE · DRILL ${d.wave}</label>
    <div class="${d.meteors.length ? 'warning' : ''}">${d.meteors.length ? `${d.meteors.length} INCOMING${first ? ` · impact ${first.seconds.toFixed(0)} s` : ' · tracking'}` : d.wave ? 'SKY CLEAR · START NEXT DRILL WHEN READY' : 'Peaceful sandbox · drills are opt-in'}</div>
    <small>${d.intercepted} intercepts · ${d.impacts} impacts${d.lostStock ? ` · ${d.lostStock.toFixed(1)} kg stock lost` : ''}</small>
    <button ${paused || d.meteors.length || d.projectiles.length ? 'disabled' : ''} data-colony="startWave">Start defence drill [N] · damage counts</button>
    ${d.controlled !== null ? '<p class="warning">TURRET CONTROL · A/D aim · Space fire · E release</p>' : ''}
    ${world.colony.buildings.filter(b => isShield(b.kind)).map(b => `<p>Emitter #${b.id}: ${b.status} · ${(b.shield?.charge ?? 0).toFixed(0)} / ${isShield(b.kind) ? SHIELDS[b.kind].capacity : 0} SP</p>`).join('')}
    <small>Save with K before a drill. The orange band on the ground shows roughly where the rocks will come down.</small>
  </div>`;
}
