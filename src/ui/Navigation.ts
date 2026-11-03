import { planets } from '../sim/celestial';
import { BELTS, BELT_IDS, SITE_INFO, SITE_IDS, EXPLORATION, type Destination } from '../sim/explorationConfig';
import { navigation, siteError, destination } from '../sim/exploration';
import { inventoryMass, RESOURCES } from '../sim/resources';
import { patchMarkup } from './dom';
import type { ColonyAction } from '../sim/colony';
import type { WorldState } from '../sim/world';
const fmt = (n: number) => n.toFixed(1);
export class NavigationPanel {
  readonly root = document.createElement('section');
  readonly guidance = document.createElement('div');
  private paused = false;
  private chartZoom=1;
  private chartTarget=false;
  constructor(issue: (action: ColonyAction) => void) {
    this.root.id = 'navigation-panel'; this.root.setAttribute('aria-label', 'Neighborhood navigation'); this.guidance.id = 'navigation-guidance';
    this.root.addEventListener('click', e => {
      const button = (e.target as HTMLElement).closest<HTMLButtonElement>('button'); if (!button || button.disabled) return;
      if(button.dataset.chart){const a=button.dataset.chart;if(a==='in')this.chartZoom=Math.min(8,this.chartZoom*1.5);if(a==='out')this.chartZoom=Math.max(.5,this.chartZoom/1.5);if(a==='system'){this.chartTarget=false;this.chartZoom=1;}if(a==='target'){this.chartTarget=true;this.chartZoom=2;}return;}
      if (button.dataset.destination) issue({ type: 'navigate', target: button.dataset.destination as Destination });
      if (button.dataset.visit && !this.paused) issue({ type: 'visitSite' });
      if (e.detail > 0) button.blur();
    });
  }
  update(w: WorldState, paused: boolean, visible: boolean): void {
    this.paused = paused; const e = w.exploration, n = navigation(w);
    const code = e.selected === 'home' ? 'HOME' : e.selected.toUpperCase();
    this.guidance.textContent = `${n.occluded?'△ BLOCKED · ':''}TARGET ${code} · ${Math.round(n.range)} m · closing ${fmt(n.closing)} · relative ${fmt(n.relativeSpeed)} m/s`;
    this.guidance.title = `${n.label}: bearing from nose (local up on foot); positive closing speed means approaching. Match total relative velocity, not just closing speed. ${n.occluded ? 'Planet blocks direct contact.' : 'Direct line of sight.'}`;
    this.guidance.dataset.target = e.selected;
    if (!visible) return;
    const bodies=planets(w.system), anchors=[w.ship.position,n.position,...w.exploration.sites.map(s=>s.position),...bodies.flatMap(b=>[{x:b.position.x-b.radius-b.atmosphere,y:b.position.y-b.radius-b.atmosphere},{x:b.position.x+b.radius+b.atmosphere,y:b.position.y+b.radius+b.atmosphere}])];
    const minX=Math.min(...anchors.map(p=>p.x)),maxX=Math.max(...anchors.map(p=>p.x)),minY=Math.min(...anchors.map(p=>p.y)),maxY=Math.max(...anchors.map(p=>p.y));
    const centre=this.chartTarget?n.position:{x:(minX+maxX)/2,y:(minY+maxY)/2},k=240/Math.max(3000,maxX-minX,maxY-minY)*this.chartZoom;
    const raw = (p: { x: number; y: number })=>({x:140+(p.x-centre.x)*k,y:140+(p.y-centre.y)*k});
    const point = (p: { x: number; y: number }) => ({ x: Math.max(8,Math.min(272,140+(p.x-centre.x)*k)), y: Math.max(8,Math.min(272,140+(p.y-centre.y)*k)) });
    const ship = point(w.ship.position), home = point(destination(w, 'home').position);
    const target=point(n.position);
    const chart = `<svg viewBox="0 0 280 280" role="img" aria-label="Planet, atmosphere, mining belts, sites and ship"><line x1="${ship.x}" y1="${ship.y}" x2="${target.x}" y2="${target.y}" stroke="${n.occluded?'#ffc58c':'#8ce9dd'}" stroke-dasharray="3 4"/>${planets(w.system).map(body => { const p = raw(body.position); return `<circle cx="${p.x}" cy="${p.y}" r="${body.radius * k}" fill="${body.id === 'home' ? '#102535' : '#3b354a'}" stroke="#5481b0"/><text x="${p.x + 4}" y="${p.y - body.radius * k - 4}" fill="#d9e8ed" font-size="10">${body.label}</text>${body.atmosphere ? `<circle cx="${p.x}" cy="${p.y}" r="${(body.radius + body.atmosphere) * k}" fill="none" stroke="#304b5d" stroke-dasharray="3 4"/>` : ''}`; }).join('')}
      ${w.asteroids.filter(b => b.belt).map(b => { const p = point(b.position); return `<circle cx="${p.x}" cy="${p.y}" r="1.8" fill="${BELTS[b.belt!].color.toString(16).padStart(6, '0').replace(/^/, '#')}"/>`; }).join('')}
      ${w.exploration.sites.map(s => { const p = point(s.position); return `<circle cx="${p.x}" cy="${p.y}" r="${s.key === e.selected ? 6 : 3}" fill="none" stroke="${s.health > 0 ? '#8ce9dd' : '#ff958b'}"/>`; }).join('')}
      <rect x="${home.x - 2}" y="${home.y - 2}" width="4" height="4" fill="#73f3cf"/><circle cx="${ship.x}" cy="${ship.y}" r="3" fill="#ffc58c"/></svg>`;
    const select = (key: Destination, label: string) => `<button data-destination="${key}" aria-pressed="${e.selected === key}">${label}</button>`;
    const site = n.site, error = site ? siteError(w, site) : null;
    const manifest = BELT_IDS.map(b => {
      const bodies = [...w.asteroids, ...w.pickups].filter(r => r.belt === b), known = e.surveyed.includes(b), stock = RESOURCES.map(r => { const q = bodies.filter(a => a.resource === r).reduce((sum, a) => sum + a.mass, 0); return q > 1e-9 ? `${r} ${fmt(q)} kg` : ''; }).filter(Boolean).join(' · ');
      return `<article>${select(b, BELTS[b].label)}<p>${known ? stock || 'Depleted · no respawn' : 'Unsurveyed · rendezvous with the associated site for a live ore manifest'}</p><small>${bodies.length} tracked bodies · drifting centroid follows remaining rocks/ore</small></article>`;
    }).join('');
    patchMarkup(this.root, `<label>NEIGHBORHOOD · LIVE NAVIGATION</label>${chart}<div class="chart-tools"><button data-chart="in" aria-label="Zoom chart in">+</button><button data-chart="out" aria-label="Zoom chart out">−</button><button data-chart="system">Fit system</button><button data-chart="target">Focus target</button></div><small>Home ■ · ship ● · sites ○ · resource clusters in color. Dashed line is a bearing, not a safe route; △ blocked means terrain intervenes. Off-chart markers clamp to the edge. The chart follows physical objects; distant objects are never frozen. Use range/bearing below if outside the overview.</small>
      <p>${select('home', 'Return to home pad')} ${w.system.binary ? select('moon', 'Nacre moon · land and work') : ''}</p><h3>${n.label}</h3><p class="nav-metrics">Range ${Math.round(n.range)} m<br>Bearing ${Math.round(n.bearing * 180 / Math.PI)}° ${w.playerMode === 'ship' ? 'from nose' : 'from local up'}<br>TARGET FRAME closing ${fmt(n.closing)} m/s · relative ${fmt(n.relativeSpeed)} m/s</p><small>Positive closing means approaching; cancel total relative velocity to rendezvous. ${n.occluded ? 'PLANET OCCLUDES CONTACT' : 'Direct line of sight'}</small>
      ${site ? `<p>Site hull ${(site.health * 100).toFixed(0)}% · ${site.key === 'cache' ? `salvage ${fmt(inventoryMass(site.stock))} kg` : site.key === 'tender' ? `fuel ${fmt(site.fuel)} kg` : 'survey data uplink'}</p><button ${paused || error ? 'disabled' : ''} data-visit="true">${site.key === 'cache' ? 'Recover salvage' : site.key === 'tender' ? 'Transfer tender fuel' : 'Survey Frost arc'} [E]</button><p>${error ?? `Rendezvous ready · within ${EXPLORATION.range} m / ${EXPLORATION.relativeSpeed} m/s`}</p>` : ''}
      <div class="nav-sites">${SITE_IDS.map(key => select(key, SITE_INFO[key].label)).join('')}</div>
      <details open data-preserve-open><summary>Finite mining destinations</summary>${manifest}</details>
      <p class="nav-objective">${e.returned ? 'SALVAGE RETURN COMPLETE · HOME DELIVERY CONFIRMED' : e.sites.find(s => s.key === 'cache')?.health === 0 && e.salvaged === 0 ? 'CACHE LOST · recover drifting debris with C or explore the remaining sites' : e.salvaged > 0 ? 'Salvage recovered · return to the green home pad and unload ore [E]' : 'Survey Frost buoy → recover Copper derelict ore → return home and unload'}</p>
      <small>Surveyed ${e.surveyed.length}/3 · salvaged ${fmt(e.salvaged)} kg · tender fuel ${fmt(e.refuelled)} kg. Stocks never respawn; mining/tractor, towing, damage and normal landing remain active.</small>`);
  }
}
