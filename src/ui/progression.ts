import { TECHNOLOGIES, TECH_IDS, UPGRADES, UPGRADE_IDS, PROGRESSION, type TechId, type UpgradeId, type ProgressionAction } from '../sim/progressionConfig';
import { researchError } from '../sim/research';
import { equipmentError, shopError } from '../sim/equipment';
import { cargoCapacity, fuelCapacity, engineStats, equipmentMass } from '../sim/shipStats';
import { shipMass } from '../sim/shipMass';
import type { WorldState } from '../sim/world';
const cost = (value: Record<string, number | undefined>) => Object.entries(value).map(([p, n]) => `${n} ${p}`).join(' · ');
export function progressionPanel(w: WorldState, paused: boolean): string {
  const r = w.colony.research, disabled = paused ? 'disabled' : '', labs = w.colony.buildings.filter(b => b.kind === 'researchLab' && (b.health ?? 100) > 0), engine = engineStats(w.ship);
  return `<details class="research-panel" data-preserve-open><summary>Research · ${r.completed.length}/4 technologies</summary>
    <p>${labs.length} intact labs · ${PROGRESSION.labPower} kW per active project · ${(r.energyUsed).toFixed(1)} kJ spent</p><small>Build an enabled lab and supply unreserved power. One lab contributes per tick in facility priority order; its power limit scales work. Prerequisites must finish first. Start commits samples; cancel returns only the unworked fraction if storage fits.</small>
    ${TECH_IDS.map(id => { const spec = TECHNOLOGIES[id], error = researchError(w, id), complete = r.completed.includes(id); return `<article data-tech="${id}"><h3>${spec.label}${complete ? ' · complete' : ''}</h3><small>${spec.requires.length ? `Needs ${spec.requires.map(t => TECHNOLOGIES[t].label).join(' + ')}` : 'Starting technology'} · ${spec.seconds} work s<br>${cost(spec.cost)}</small><button ${disabled || error ? 'disabled' : ''} data-research-start="${id}">Research ${spec.label}</button>${!complete && error ? `<p>${error}</p>` : ''}</article>`; }).join('')}
    ${r.queue.map(p => `<article data-project="${p.tech}"><p>${TECHNOLOGIES[p.tech].label} · ${p.paused ? 'paused' : r.queue.find(q => !q.paused) === p && labs.some(b => b.enabled && b.status === 'running') ? 'researching' : 'queued / awaiting available lab'} · ${p.progress.toFixed(1)} / ${TECHNOLOGIES[p.tech].seconds} work s</p><progress aria-label="${TECHNOLOGIES[p.tech].label} progress" max="${TECHNOLOGIES[p.tech].seconds}" value="${p.progress}"></progress><button ${disabled} data-research-tech="${p.tech}" data-research-control="pause">${p.paused ? 'Resume' : 'Pause'} ${TECHNOLOGIES[p.tech].label}</button><button ${disabled} data-research-tech="${p.tech}" data-research-control="cancel">Cancel ${TECHNOLOGIES[p.tech].label}</button></article>`).join('')}</details>
    <details class="equipment-panel" data-preserve-open><summary>Ship equipment · ${w.ship.equipment.length}/8 modules</summary>
    <p>Ship ${shipMass(w.ship).toFixed(1)} kg · modules ${equipmentMass(w.ship)} kg<br>Fuel ${w.ship.fuel.toFixed(1)} / ${fuelCapacity(w.ship)} kg · hold ${cargoCapacity(w.ship)} kg<br>Engine ${(engine.thrust / 1000).toFixed(1)} kN · burn ${engine.burn.toFixed(2)} kg/s</p><small>One of each module; mass is real. Install at home for materials + ${PROGRESSION.fabricationEnergy} kJ unreserved grid energy. Fuel, hull, ammunition and cell charge are preserved. Removal refunds 50% × current hull condition; excess tank fuel returns to stock if it fits. Unload excess cargo first.</small>
    ${shopError(w) ? `<p>${shopError(w)}</p>` : ''}
    ${UPGRADE_IDS.map(id => { const s = UPGRADES[id], installed = w.ship.equipment.includes(id), operation = installed ? 'remove' : 'install', error = equipmentError(w, id, operation); return `<article data-upgrade="${id}" data-installed="${installed}"><h3>${s.label}${installed ? ' · fitted' : ''}</h3><p>${s.benefit}</p><small>+${s.mass} kg · ${s.tradeoff}<br>Research: ${TECHNOLOGIES[s.tech].label}<br>Fabricate: ${cost(s.cost)} + 20 kJ</small><button ${disabled || error ? 'disabled' : ''} data-equipment="${id}" data-equipment-operation="${operation}">${installed ? 'Remove' : 'Fabricate'} ${s.label}</button>${error ? `<p>${error}</p>` : ''}</article>`; }).join('')}
    <small>The paid tow rig remains its own Cargo utility module; it is preserved alongside these upgrades on supplied wreck recovery.</small></details>`;
}
export function progressionAction(button: HTMLElement): ProgressionAction | null {
  const d = button.dataset;
  if (d.researchStart && TECH_IDS.includes(d.researchStart as TechId)) return { type: 'researchStart', tech: d.researchStart as TechId };
  if (d.researchTech && TECH_IDS.includes(d.researchTech as TechId) && (d.researchControl === 'pause' || d.researchControl === 'cancel')) return { type: 'researchControl', tech: d.researchTech as TechId, operation: d.researchControl };
  if (d.equipment && UPGRADE_IDS.includes(d.equipment as UpgradeId) && (d.equipmentOperation === 'install' || d.equipmentOperation === 'remove')) return { type: 'equipment', upgrade: d.equipment as UpgradeId, operation: d.equipmentOperation };
  return null;
}
