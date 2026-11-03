import { availableProduct, MAX_RESERVE, POLICY_FIELDS, POLICY_INFO, policyFor } from '../sim/colonyPolicy';
import { oreCapacity } from '../sim/colony';
import { inventoryMass } from '../sim/resources';
import type { WorldState } from '../sim/world';

export function policyPanel(world: WorldState, paused: boolean): string {
  const policy = policyFor(world.colony), disabled = paused ? 'disabled' : '';
  return `<details class="policy-controls" data-preserve-open><summary>Resource priorities · reserves</summary>
    <small>Manage from ship or surface. Reserves protect existing stock; they do not create resources.</small>
    ${POLICY_FIELDS.map(field => { const info = POLICY_INFO[field]; return `<div class="policy-row"><span>${info.label}<small>${info.unit}</small></span><button ${disabled || policy[field] <= 0 ? 'disabled' : ''} aria-label="Lower ${info.label} reserve" data-policy="${field}" data-direction="-1">−</button><b data-policy-value="${field}">${policy[field]}</b><button ${disabled || policy[field] >= MAX_RESERVE ? 'disabled' : ''} aria-label="Raise ${info.label} reserve" data-policy="${field}" data-direction="1">+</button></div>`; }).join('')}
    <p>Available to industry: ${Math.max(0, world.colony.energy - policy.energyReserve).toFixed(1)} kJ · rig room ${Math.max(0, oreCapacity(world.colony) - inventoryMass(world.depot) - policy.deliveryReserve).toFixed(1)} kg<br>Unreserved: ${availableProduct(world.colony, 'alloy').toFixed(1)} alloy · ${availableProduct(world.colony, 'components').toFixed(1)} components</p>
    <small>Power: rigs and factories leave this charge for turrets/service. Delivery room: rigs leave empty ore space for ships. Turret materials: building, repairs, ship rearm and recovery spend only excess; turret fire can use the reserve. Lower a reserve to release it. Goals above capacity can stop production.</small>
  </details>`;
}
