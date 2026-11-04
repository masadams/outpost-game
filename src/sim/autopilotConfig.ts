import {fittedPart} from './shipStats';
import type {Ship} from './physics';
import type {Destination} from './explorationConfig';
import type {BodyId} from './celestial';
export type AutopilotMode='land'|'home'|'navigate';
export type FlightPhase='ascent'|'depart'|'transfer'|'arc'|'approach'|'landing'|'rendezvous';
export interface FlightProgram {mode:AutopilotMode;target:Destination;body:BodyId;origin:BodyId;phase:FlightPhase;angle:number;duty:number;elapsed:number}
export interface AutopilotState {program:FlightProgram|null;status:string;energyUsed:number}
export type AutopilotAction={type:'autopilot';operation:AutopilotMode|'cancel'};
export const createAutopilot=():AutopilotState=>({program:null,status:'Manual flight',energyUsed:0});
export function flightComputer(ship:Pick<Ship,'equipment'>):{tier:number;power:number;label:string}{
 const id=fittedPart(ship,'avionics');return id==='navigationComputer'?{tier:3,power:3,label:'Navigation computer'}:id==='returnComputer'?{tier:2,power:2,label:'Return computer'}:id==='landingComputer'?{tier:1,power:1,label:'Landing computer'}:{tier:0,power:0,label:'No flight computer'};
}
