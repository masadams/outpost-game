import type { Building } from '../sim/colony';
import { createSchedule, MAX_STOCK_TARGET, SCHEDULE_PRODUCTS } from '../sim/scheduling';

export function schedulingPanel(building: Building, disabled: string): string {
  if (building.kind !== 'refinery') return '';
  const schedule = building.schedule ?? createSchedule();
  return `<div class="schedule-controls" data-enabled="${schedule.enabled}">
    <button ${disabled} data-colony="toggleSchedule">Auto recipes: ${schedule.enabled ? 'on' : 'off'}</button>
    <small>Shared stock targets · kg. Finish the current cycle, then rotate between needed recipes with available feedstock and output room.</small>
    ${SCHEDULE_PRODUCTS.map(p => `<div class="stock-target"><span>${p}</span><button ${disabled || schedule.targets[p] <= 0 ? 'disabled' : ''} aria-label="Lower ${p} target" data-target="${p}" data-delta="-5">−</button><b data-target-value="${p}">${schedule.targets[p]}</b><button ${disabled || schedule.targets[p] >= MAX_STOCK_TARGET ? 'disabled' : ''} aria-label="Raise ${p} target" data-target="${p}" data-delta="5">+</button></div>`).join('')}
    <small>Ice yields both water and oxygen; either target requests the recipe. Active batches finish even if other machines fill a target. V selects a manual recipe and stops scheduling.</small>
  </div>`;
}
