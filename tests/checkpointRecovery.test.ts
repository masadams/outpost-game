import { expect, it } from 'vitest';
import { createWorld } from '../src/sim/world';
import { SAVE_KEY, PREVIOUS_SAVE_KEY, encodeCheckpoint, inspectCheckpoint, readCheckpoint, writeCheckpoint } from '../src/persistence/checkpoint';
function memory() {
 const items = new Map<string,string>(), writes:string[]=[];
 return { items, writes, getItem:(key:string)=>items.get(key)??null, setItem:(key:string,value:string)=>{writes.push(key);items.set(key,value);} };
}
function world(fuel:number) { const w=createWorld();w.ship.fuel=fuel;return w; }
it('retains a distinct previous valid flight and prefers the latest without changing either snapshot on read',()=>{
 const s=memory();writeCheckpoint(s,world(220));writeCheckpoint(s,world(180));const before=new Map(s.items);
 expect(inspectCheckpoint(s).source).toBe('checkpoint');expect(readCheckpoint(s)?.ship.fuel).toBe(180);expect(s.items).toEqual(before);
 writeCheckpoint(s,world(180));expect(s.items.get(PREVIOUS_SAVE_KEY)).toBe(encodeCheckpoint(world(220)));expect(s.writes).toEqual([SAVE_KEY,PREVIOUS_SAVE_KEY,SAVE_KEY]);
});
it.each(['missing','invalid','incompatible','oversized'])('offers only the validated previous snapshot when the latest is %s',kind=>{
 const s=memory();writeCheckpoint(s,world(220));writeCheckpoint(s,world(180));
 if(kind==='missing')s.items.delete(SAVE_KEY);else s.items.set(SAVE_KEY,kind==='invalid'?'{broken':kind==='oversized'?' '.repeat(1_000_001):JSON.stringify({version:17,world:createWorld()}));
 const before=new Map(s.items),selected=inspectCheckpoint(s);expect(selected.source).toBe('previous');expect(selected.world?.ship.fuel).toBe(220);expect(selected.world?.buttons.board).toBe(false);expect(s.items).toEqual(before);
});
it.each([PREVIOUS_SAVE_KEY,SAVE_KEY])('keeps a usable prior flight when the %s write fails',failedKey=>{
 const s=memory();writeCheckpoint(s,world(220));writeCheckpoint(s,world(180));const primary=s.items.get(SAVE_KEY);
 const failing={getItem:s.getItem,setItem:(key:string,value:string)=>{if(key===failedKey)throw new Error('Quota exceeded');s.setItem(key,value);}};
 expect(()=>writeCheckpoint(failing,world(100))).toThrow('Quota exceeded');expect(s.items.get(SAVE_KEY)).toBe(primary);expect(readCheckpoint(s)?.ship.fuel).toBe(180);
 s.items.set(SAVE_KEY,'{broken');expect(readCheckpoint(s)?.ship.fuel).toBe(failedKey===SAVE_KEY?180:220);
});
it('does not replace a good fallback with corrupt data when saving a recovered or fresh run',()=>{
 const s=memory();s.items.set(SAVE_KEY,'{broken');s.items.set(PREVIOUS_SAVE_KEY,encodeCheckpoint(world(220)));const previous=s.items.get(PREVIOUS_SAVE_KEY);
 writeCheckpoint(s,world(150));expect(s.items.get(PREVIOUS_SAVE_KEY)).toBe(previous);expect(readCheckpoint(s)?.ship.fuel).toBe(150);
});
it('rejects invalid runtime state before reading or changing storage',()=>{
 const s=memory();writeCheckpoint(s,world(220));const before=new Map(s.items),w=world(-1);
 expect(()=>writeCheckpoint({...s,getItem:()=>{throw new Error('Should not read');}},w)).toThrow('World state cannot be saved');expect(s.items).toEqual(before);
});
it('rejects two unusable slots and never migrates or silently deletes them',()=>{
 const s=memory();s.items.set(SAVE_KEY,'{broken');s.items.set(PREVIOUS_SAVE_KEY,JSON.stringify({version:17,world:createWorld()}));const before=new Map(s.items);
 expect(()=>inspectCheckpoint(s)).toThrow('No valid current-format checkpoint');expect(s.items).toEqual(before);
});
it('ignores a broken backup when the latest is valid and propagates inaccessible storage without writes',()=>{
 const s=memory();writeCheckpoint(s,world(220));s.items.set(PREVIOUS_SAVE_KEY,'{broken');expect(readCheckpoint(s)?.ship.fuel).toBe(220);
 const denied={getItem:()=>{throw new Error('Storage denied');},setItem:s.setItem};const count=s.writes.length;
 expect(()=>readCheckpoint(denied)).toThrow('Storage denied');expect(()=>writeCheckpoint(denied,world(150))).toThrow('Storage denied');expect(s.writes).toHaveLength(count);
});
it('preserves the fallback when a replacement of corrupt primary fails',()=>{
 const s=memory();s.items.set(SAVE_KEY,'{broken');const previous=encodeCheckpoint(world(210));s.items.set(PREVIOUS_SAVE_KEY,previous);
 expect(()=>writeCheckpoint({getItem:s.getItem,setItem:()=>{throw new Error('Full');}},world(150))).toThrow('Full');expect(s.items.get(PREVIOUS_SAVE_KEY)).toBe(previous);expect(readCheckpoint(s)?.ship.fuel).toBe(210);
});
