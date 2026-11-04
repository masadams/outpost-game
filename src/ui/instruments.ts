import { localAngleAt } from '../sim/localWorld';
import { fuelCapacity } from '../sim/shipStats';
import { HABITATS, isHabitat } from '../sim/habitatConfig';
import { habitatSource } from '../sim/habitats';
import { flightSafety, type FlightMetric, type InstrumentSafety } from '../sim/flightSafety';
import { telemetry } from '../sim/physics';
import { WORLD } from '../sim/config';
import { SUIT } from '../sim/astronaut';
import { wrap } from '../sim/math';
import type { WorldState } from '../sim/world';

export type InstrumentKey=FlightMetric|'oxygen'|'suit'|'footing';
export interface InstrumentReading {
 key:InstrumentKey;label:string;short:string;value:number|string;unit:string;digits:number;
 min:number;max:number;primary:boolean;state:InstrumentSafety;attitude?:number;
}
const neutral=():InstrumentSafety=>({level:'neutral',label:''});
/** All values stay in the current body's surface frame. Scale changes never alter the numbers. */
export function instrumentReadings(w:WorldState):InstrumentReading[]{
 const foot=w.playerMode==='astronaut',s=w.ship;
 const t=foot?telemetry({...w.astronaut,angle:localAngleAt(w,w.astronaut.position)},SUIT.radius,w.system):telemetry(s,WORLD.shipRadius,w.system);
 const safety=flightSafety(s,w.system),habitat=habitatSource(w);
 const reading=(key:InstrumentKey,label:string,short:string,value:number|string,unit:string,digits:number,min:number,max:number,primary=true):InstrumentReading=>({key,label,short,value,unit,digits,min,max,primary,state:foot?neutral():safety.instruments[key as FlightMetric]});
 const altitudeMax=[100,500,1200,5000,20000,100000,1e6,1e9].find(n=>n>=t.altitude)??1e9;
 const rateMax=(n:number)=>Math.max(10,Math.ceil(Math.abs(n)/10)*10);
 const rows=[reading('altitude','Altitude','ALT',t.altitude,'m',0,0,altitudeMax),
  reading('radial','Vertical speed','V/S',t.radial,'m/s',1,-rateMax(t.radial),rateMax(t.radial),!foot),
  reading('drift','Lateral drift','DRIFT',t.tangential,'m/s',1,-rateMax(t.tangential),rateMax(t.tangential),!foot),
  reading('speed','Total speed','SPEED',t.speed,'m/s',1,0,Math.max(20,Math.ceil(t.speed/20)*20),foot)];
 const air=habitat?.habitat&&isHabitat(habitat.kind)?habitat.habitat.oxygen/HABITATS[habitat.kind].capacity*100:w.astronaut.oxygen/SUIT.oxygen*100;
 const reserve=reading(foot?'oxygen':'fuel',foot?habitat?'Habitat air':'Suit air':'Fuel',foot?habitat?'HABITAT AIR':'SUIT AIR':'FUEL',foot?air:s.fuel/fuelCapacity(s)*100,'%',0,0,100);
 if(foot){
  if(habitat)reserve.state={level:habitat.status==='air low'||habitat.habitat?.backup?'caution':'safe',label:`${habitat.status==='air low'?'AIR LOW · ':''}${habitat.habitat?.backup?'BACKUP · ':''}Suit ${(w.astronaut.oxygen/SUIT.oxygen*100).toFixed(0)}% held`};
  else if(w.astronaut.oxygen<30)reserve.state={level:'critical',label:'LOW SUIT AIR'};
 }
 rows.push(reserve,reading(foot?'suit':'hull',foot?'Suit integrity':'Hull integrity',foot?'SUIT':'HULL',foot?w.astronaut.health:s.hull,'%',0,0,100));
 if(foot)rows.push(reading('footing','Footing','FOOTING',w.astronaut.grounded?'GROUND':'AIR','',0,0,1,false));
 else{
  const attitude=reading('tilt','Attitude to local up','ATT',t.tilt*180/Math.PI,'°',0,0,180);attitude.attitude=wrap(s.angle-localAngleAt(w,s.position))*180/Math.PI;
  rows.splice(3,0,attitude);rows.push(reading('spin','Angular velocity','SPIN',s.angularVelocity,'rad/s',2,-2,2,false));
 }
 return rows;
}
export function gaugeFraction(r:InstrumentReading):number {return typeof r.value==='number'?Math.max(0,Math.min(1,(r.value-r.min)/(r.max-r.min))):0;}
const symbols={neutral:'',safe:'●',caution:'▲',critical:'!'} as const;
export function readingValue(r:InstrumentReading):string{return typeof r.value==='number'?r.value.toFixed(r.digits):r.value;}
function gauge(r:InstrumentReading):string{
 if(r.attitude!==undefined)return `<svg class="dial-gauge attitude-gauge" viewBox="0 0 100 56" aria-hidden="true"><defs><clipPath id="attitude-window"><circle cx="50" cy="28" r="23"/></clipPath></defs><g clip-path="url(#attitude-window)"><g transform="rotate(${-r.attitude} 50 28)"><path d="M0 0h100v28H0z" fill="#20434e"/><path d="M0 28h100v28H0z" fill="#302c29"/><path d="M0 28h100M42 18h16M42 38h16" stroke="#9ebbc1" stroke-width="1.5"/></g></g><circle cx="50" cy="28" r="24" fill="none" stroke="#607982"/><path d="M31 28h13l6 4 6-4h13" fill="none" stroke="#e1b97b" stroke-width="2"/></svg>`;
 const fraction=gaugeFraction(r),angle=fraction*180-90;
 return `<svg class="dial-gauge" viewBox="0 0 100 56" aria-hidden="true"><path class="gauge-track" d="M12 47a38 38 0 0 1 76 0" pathLength="100"/><path class="gauge-fill" d="M12 47a38 38 0 0 1 76 0" pathLength="100" stroke-dasharray="${(fraction*100).toFixed(2)} 100"/><path class="gauge-ticks" d="M9 47h7M50 6v7M84 47h7"/><path class="gauge-needle" d="M50 47V18" transform="rotate(${angle.toFixed(2)} 50 47)"/><circle cx="50" cy="47" r="2" fill="currentColor"/></svg>`;
}
export function dialMarkup(r:InstrumentReading):string{
 const value=readingValue(r),scale=typeof r.value==='number'&&(r.unit==='m'&&r.value>=1000||r.unit==='m/s'&&Math.abs(r.value)>=1000)?1000:1;
 const unit=scale===1000?(r.unit==='m'?'km':'km/s'):r.unit;
 const display=scale===1000?(Number(r.value)/scale).toFixed(1):value;
 const signed=typeof r.value==='number'&&r.min<0&&r.value>0?'+':'';
 const range=r.min<0?`±${r.max/scale}`:`0–${r.max/scale}`;
 const description=`${r.label}: ${value} ${r.unit}. ${r.state.label}. ${r.attitude===undefined?`Gauge scale ${range} ${unit}; auto-ranges for altitude and velocity.`:'Surface-relative attitude; upright is level with local up.'}`;
 return `<div class="flight-dial" data-instrument="${r.key}" data-level="${r.state.level}" role="group" aria-label="${description}" title="${description}"><span class="dial-label"><i class="dial-light" aria-hidden="true"></i>${r.short}</span><div class="dial-face">${gauge(r)}<strong>${signed}${display}<small> ${unit}</small></strong></div><span class="dial-range">${r.attitude===undefined?`${range} ${unit}`:'LOCAL UP'}</span><small class="instrument-status" hidden>${symbols[r.state.level]} ${r.state.label||'—'}</small></div>`;
}
export function detailMarkup(rows:InstrumentReading[]):string{return rows.map(r=>`<div class="detail-reading" data-detail="${r.key}" ${r.primary?'':`data-instrument="${r.key}" data-level="${r.state.level}"`}><span>${r.label}</span><strong>${readingValue(r)}<small> ${r.unit}</small></strong><span class="detail-state" data-level="${r.state.level}">${symbols[r.state.level]} ${r.state.label||'—'}</span></div>`).join('');}
