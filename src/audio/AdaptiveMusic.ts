import type { WorldState } from '../sim/world';
import { flightRegion } from '../sim/flightRegion';
/** Three original, quiet sustained voices; no sample downloads or unbounded scheduling. */
export class AdaptiveMusic {
 private voices: OscillatorNode[]=[];
 private gain: GainNode;
 private time=0;
 constructor(private context: AudioContext, destination: AudioNode){
  this.gain=context.createGain();this.gain.gain.value=0;this.gain.connect(destination);
  for(let i=0;i<3;i++){const voice=context.createOscillator();voice.type='sine';voice.frequency.value=55;voice.connect(this.gain);voice.start();this.voices.push(voice);}
 }
 update(w:WorldState, seconds:number, volume:number, audible:boolean, duck:boolean):void{
  if(audible)this.time+=Math.min(.1,Math.max(0,seconds));
  const chord=Math.floor(this.time/12)%4;
  const danger=w.combat.enemies.length>0||w.defence.meteors.length>0;
  const root=danger?55:w.playerMode==='astronaut'?65.406:flightRegion(w.ship.position,w.system)==='airless'?73.416:flightRegion(w.ship.position,w.system)==='space'?61.735:55;
  // Region/state changes retune slowly, with no per-frame oscillator allocation.
  const ratios=danger?[1,1.1892,1.4983]:[1,1.4983,2];const shift=[1,1.12246,.8909,1][chord];
  this.voices.forEach((voice,i)=>voice.frequency.setTargetAtTime(root*shift*ratios[i],this.context.currentTime,1.2));
  this.gain.gain.setTargetAtTime(audible?volume*(duck?.004:.012):0,this.context.currentTime,audible?.8:.01);
 }
 destroy():void{for(const v of this.voices){v.stop();v.disconnect();}this.voices=[];this.gain.disconnect();}
}
