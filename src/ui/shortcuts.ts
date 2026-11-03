import { keyLabel, type BindingSlot, type PresentationPreferences } from '../preferences/presentation';
const originals=new WeakMap<Text,{source:string;rendered:string}>();
const digits:BindingSlot[]=['ZERO','ONE','TWO','THREE','FOUR','FIVE','SIX','SEVEN','EIGHT','NINE'];
const aliases:Record<string,BindingSlot>={Space:'SPACE',Shift:'SHIFT',Enter:'ENTER',Backspace:'BACKSPACE',Esc:'ESC'};
let remapped=false;
/** Keep shortcut hints accurate without replacing interactive elements or focus. */
export function decorateShortcuts(root:HTMLElement,p:PresentationPreferences):void{
 if(!remapped&&!Object.keys(p.bindings).length)return;
 remapped=Object.keys(p.bindings).length>0;
 const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);const nodes:Text[]=[];let node:Node|null;
 while((node=walker.nextNode()))if(node.parentElement?.closest('#hud'))nodes.push(node as Text);
 for(const text of nodes){
  const previous=originals.get(text),current=text.data,source=previous?.rendered===current?previous.source:current;
  const blueprint=text.parentElement?.matches('button[data-select]') && /^\d\./.test(source);
  if(!source.includes('[')&&!blueprint)continue;
  let rendered=source.replace(/\[([^\]]+)\]/g,(_,inside:string)=>'['+inside.replace(/\b(?:Space|Shift|Enter|Backspace|Esc|[A-Z]|[0-9])\b/g,word=>{const slot=aliases[word]??(/^\d$/.test(word)?digits[Number(word)]:word as BindingSlot);return keyLabel(p.bindings[slot]??slot);})+']');
  if(blueprint)rendered=rendered.replace(/^(\d)\./,(_,n:string)=>keyLabel(p.bindings[digits[Number(n)]]??digits[Number(n)])+'.');
  if(current!==rendered)text.data=rendered;originals.set(text,{source,rendered});
 }
}
