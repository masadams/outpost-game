import type { WorldState } from '../sim/world';
import { soundscape, type Area } from './soundscape';
import { BEAT, melodyStep, noteFrequency } from './melody';
/** Three original, quiet sustained voices; no sample downloads or unbounded scheduling. */
export class AdaptiveMusic {
 private voices: OscillatorNode[]=[];
 private gain: GainNode;
 private time=0;
 private beatClock=0;
 private step=0;
 private last=2;
 private plucks=new Set<OscillatorNode>();
 constructor(private context: AudioContext, destination: AudioNode){
  this.gain=context.createGain();this.gain.gain.value=0;this.gain.connect(destination);
  for(let i=0;i<3;i++){const voice=context.createOscillator();voice.type='sine';voice.frequency.value=55;voice.connect(this.gain);voice.start();this.voices.push(voice);}
 }
 update(w:WorldState, seconds:number, volume:number, audible:boolean, duck:boolean):void{
  if(audible)this.time+=Math.min(.1,Math.max(0,seconds));
  const chord=Math.floor(this.time/12)%4;
  const danger=w.combat.enemies.length>0||w.defence.meteors.length>0;
  const sound=soundscape(w),scape=sound.music,area=sound.area;
  const root=danger?55:scape.root;
  // Region/state changes retune slowly, with no per-frame oscillator allocation.
  const ratios=danger?[1,1.1892,1.4983]:scape.ratios;const shift=[1,1.12246,.8909,1][chord];
  this.voices.forEach((voice,i)=>voice.frequency.setTargetAtTime(root*shift*ratios[i],this.context.currentTime,1.2));
  if(audible&&!danger){this.beatClock+=Math.min(.1,Math.max(0,seconds));const beat=BEAT[area];if(this.beatClock>=beat){this.beatClock-=beat;this.pluck(area,root*shift*2,volume*(duck?.2:1)*scape.level);}}
  this.gain.gain.setTargetAtTime(audible?volume*(duck?.004:.012*(danger?1:scape.level)):0,this.context.currentTime,audible?.8:.01);
 }
 /** One soft note of the wandering line: a sine with a fast attack and a long, gentle fall. */
 private pluck(area:Area,root:number,level:number):void{
  const note=melodyStep(area,this.step++,this.last);
  if(!note||this.plucks.size>=3||level<=0)return;
  this.last=note.index;
  const t=this.context.currentTime,osc=this.context.createOscillator(),env=this.context.createGain();
  osc.type='sine';osc.frequency.value=noteFrequency(area,root*2,note.index,note.octave);
  env.gain.setValueAtTime(0,t);env.gain.linearRampToValueAtTime(.05*level,t+.03);env.gain.exponentialRampToValueAtTime(.0001,t+3.2);
  osc.connect(env);env.connect(this.gain);this.plucks.add(osc);
  osc.onended=()=>{this.plucks.delete(osc);osc.disconnect();env.disconnect();};
  osc.start(t);osc.stop(t+3.3);
 }
 destroy():void{for(const v of this.voices){v.stop();v.disconnect();}this.voices=[];this.gain.disconnect();}
}
