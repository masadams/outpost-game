import { MANIFESTS, manifestPlan, type ManifestId } from '../sim/manifests';
import { cargoMass } from '../sim/shipMass';
import { cargoCapacity } from '../sim/shipStats';
import { availableProduct } from '../sim/colonyPolicy';
import { RESOURCES } from '../sim/resources';
import { PRODUCTS } from '../sim/colonyConfig';
import { colonyPlanet } from '../sim/localWorld';
import { freightError } from '../sim/freight';
import type { WorldState } from '../sim/world';
export function freightPanel(w: WorldState, paused: boolean): string {
  const error = freightError(w), disabled = paused || error ? 'disabled' : '';
  return `<details data-preserve-open><summary>Manufactured freight · ${colonyPlanet(w).label} depot</summary><small>Freight shares ore hold space and adds mass. Load supplies here, fly them to another world, and unload at its marked pad. E unloads raw ore; freight transfers use these controls.</small><p>${error ?? 'Pad link ready · finite local supplies'}</p><div class="manifest-list">${(Object.keys(MANIFESTS) as ManifestId[]).map(id=>{const spec=MANIFESTS[id],plan=manifestPlan(w,id);return `<article class="manifest"><h3>${spec.label}</h3><p>${Object.entries(spec.stock).map(([p,q])=>`${q} kg ${p}`).join(' · ')}</p><small>${spec.detail}</small><p>Load ${plan.mass.toFixed(1)} kg · hold ${cargoMass(w.ship).toFixed(1)} → ${(cargoMass(w.ship)+plan.mass).toFixed(1)} / ${cargoCapacity(w.ship)} kg</p><button data-manifest="${id}" ${paused||plan.error?'disabled':''}>Load ${spec.label}</button><small>${paused?'Paused · inspect only':plan.error??'Ready · consumes unreserved local depot stock'}</small></article>`;}).join('')}</div>${PRODUCTS.map(p => `<p>${p} · aboard ${w.ship.freight[p].toFixed(1)} kg · depot ${w.colony.products[p].toFixed(1)} kg (${availableProduct(w.colony,p).toFixed(1)} usable)<br><button ${disabled} data-freight="${p}" data-delta="5" aria-label="Load ${p} freight">Load ≤5 kg</button> <button ${disabled} data-freight="${p}" data-delta="-5" aria-label="Unload ${p} freight">Unload ≤5 kg</button></p>`).join('')}<p>Local raw ore → ship</p>${RESOURCES.map(r => `<p>${r} · depot ${w.depot[r].toFixed(1)} kg <button ${disabled} data-ore-load="${r}" aria-label="Load ${r} ore">Load ≤5 kg</button></p>`).join('')}</details>`;
}
