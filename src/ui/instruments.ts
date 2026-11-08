import { upAngleAt } from '../sim/localWorld';
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
 const t=foot?telemetry({...w.astronaut,angle:upAngleAt(w,w.astronaut.position)},SUIT.radius,w.system):telemetry(s,WORLD.shipRadius,w.system);
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
  const attitude=reading('tilt','Attitude to local up','ATT',t.tilt*180/Math.PI,'°',0,0,180);attitude.attitude=wrap(s.angle-upAngleAt(w,s.position))*180/Math.PI;
  rows.splice(3,0,attitude);rows.push(reading('spin','Angular velocity','SPIN',s.angularVelocity,'rad/s',2,-2,2,false));
 }
 return rows;
}
export function gaugeFraction(r:InstrumentReading):number {return typeof r.value==='number'?Math.max(0,Math.min(1,(r.value-r.min)/(r.max-r.min))):0;}
const symbols={neutral:'',safe:'●',caution:'▲',critical:'!'} as const;
export function readingValue(r:InstrumentReading):string{return typeof r.value==='number'?r.value.toFixed(r.digits):r.value;}
export function detailMarkup(rows:InstrumentReading[]):string{return rows.map(r=>`<div class="detail-reading" data-detail="${r.key}" ${r.primary?'':`data-instrument="${r.key}" data-level="${r.state.level}"`}><span>${r.label}</span><strong>${readingValue(r)}<small> ${r.unit}</small></strong><span class="detail-state" data-level="${r.state.level}">${symbols[r.state.level]} ${r.state.label||'—'}</span></div>`).join('');}
