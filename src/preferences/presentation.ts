export const PRESENTATION_KEY = 'outpost.presentation.v1';
export const BINDING_SLOTS = ['W','A','D','UP','LEFT','RIGHT','SPACE','C','SHIFT','E','F','B','Q','T','ENTER','V','G','U','Z','Y','BACKSPACE','R','ONE','TWO','THREE','FOUR','FIVE','SIX','SEVEN','EIGHT','NINE','P','K','M','H','J','MINUS','PLUS','ZERO','I','ESC'] as const;
export type BindingSlot = typeof BINDING_SLOTS[number];
export const BINDING_LABELS: Partial<Record<BindingSlot,string>> = { W:'Thrust / jump', A:'Turn / walk left', D:'Turn / walk right', SPACE:'Mine / jump / turret fire', C:'Tractor', SHIFT:'Ship weapon fire', E:'Interact / unload', F:'Board / exit', B:'Construction', Q:'Preview left', T:'Preview right', ENTER:'Place building', V:'Recipe', G:'Auto turret', U:'Repair building', Z:'Weapon', Y:'Tow cable', BACKSPACE:'Recover ship', R:'Ground scan', P:'Pause', K:'Quick save', M:'Mute', H:'Guide', J:'Coast path', MINUS:'Zoom out', PLUS:'Zoom in', ZERO:'Auto zoom', I:'Cargo', ESC:'Close panel' };
export const PHYSICAL_KEYS = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'ZERO','ONE','TWO','THREE','FOUR','FIVE','SIX','SEVEN','EIGHT','NINE','UP','DOWN','LEFT','RIGHT','SPACE','SHIFT','ENTER','ESC','BACKSPACE','MINUS','PLUS'] as const;
export interface PresentationPreferences { buildingLabels:boolean; textScale: number; reducedMotion: boolean; quality: 'high'|'low'; cameraRotation: boolean; effectsVolume: number; musicVolume: number; bindings: Partial<Record<BindingSlot,string>> }
export function defaultPresentation(reduced = false): PresentationPreferences { return { buildingLabels:false,textScale:1, reducedMotion:reduced, quality:'high', cameraRotation:true, effectsVolume:1, musicVolume:.35, bindings:{} }; }
export function bindingError(bindings: PresentationPreferences['bindings'], slot: BindingSlot, key: string): string | null {
  if (!(PHYSICAL_KEYS as readonly string[]).includes(key)) return 'Use a letter, digit, arrow, Space, Shift, Enter, Escape, Backspace, − or +.';
  const owner = BINDING_SLOTS.find(s => s !== slot && (bindings[s] ?? s) === key);
  return owner ? `Already assigned to ${BINDING_LABELS[owner] ?? owner}. Choose another key or reset controls.` : null;
}
export function parsePresentation(text: string|null, reduced = false): PresentationPreferences {
  const fallback = defaultPresentation(reduced);
  try {
    const v = JSON.parse(text ?? 'null');
    if (!v || ![1,1.25,1.5].includes(v.textScale) || typeof v.reducedMotion !== 'boolean' || !['high','low'].includes(v.quality) || typeof v.cameraRotation !== 'boolean' || ![v.effectsVolume,v.musicVolume].every(n=>typeof n === 'number' && Number.isFinite(n) && n>=0 && n<=1) || !v.bindings || typeof v.bindings !== 'object' || Array.isArray(v.bindings)) return fallback;
    if (Object.keys(v.bindings).some(k=>!(BINDING_SLOTS as readonly string[]).includes(k)) || BINDING_SLOTS.some(k=>bindingError(v.bindings,k,v.bindings[k]??k))) return fallback;
    return { buildingLabels:v.buildingLabels===true,textScale:v.textScale,reducedMotion:v.reducedMotion,quality:v.quality,cameraRotation:v.cameraRotation,effectsVolume:v.effectsVolume,musicVolume:v.musicVolume,bindings:{...v.bindings} };
  } catch { return fallback; }
}
export function readPresentation(): PresentationPreferences { try { return parsePresentation(localStorage.getItem(PRESENTATION_KEY),matchMedia('(prefers-reduced-motion: reduce)').matches); } catch { return defaultPresentation(); } }
export function applyPresentation(p: PresentationPreferences): void {
  document.documentElement.style.setProperty('--text-scale',String(p.textScale));
  document.documentElement.dataset.textScale=String(p.textScale); document.documentElement.dataset.reducedMotion=String(p.reducedMotion); document.documentElement.dataset.quality=p.quality;
  try { localStorage.setItem(PRESENTATION_KEY,JSON.stringify(p)); } catch { /* Optional preferences must not block play. */ }
}
export const keyLabel = (name: string): string => ({ UP:'↑',DOWN:'↓',LEFT:'←',RIGHT:'→',SPACE:'Space',ESC:'Esc',SHIFT:'Shift',ENTER:'Enter',BACKSPACE:'Backspace',PLUS:'+',MINUS:'−',ZERO:'0',ONE:'1',TWO:'2',THREE:'3',FOUR:'4',FIVE:'5',SIX:'6',SEVEN:'7',EIGHT:'8',NINE:'9' })[name] ?? name;
export function controlHint(text: string, p: PresentationPreferences): string {
  const aliases: Record<string,BindingSlot> = { Space:'SPACE',Shift:'SHIFT',Enter:'ENTER',Backspace:'BACKSPACE',Esc:'ESC', BACKSPACE:'BACKSPACE', SPACE:'SPACE', SHIFT:'SHIFT', ENTER:'ENTER', ESC:'ESC' };
  return text.replace(/\b(?:Space|Shift|Enter|Backspace|Esc|BACKSPACE|SPACE|SHIFT|ENTER|ESC|[A-Z])\b/g, word => { const slot=aliases[word]??word as BindingSlot; return keyLabel(p.bindings[slot]??slot); });
}

export const physicalKey = (code: string): string => code.startsWith('Key') ? code.slice(3) : code.startsWith('Digit') ? ['ZERO','ONE','TWO','THREE','FOUR','FIVE','SIX','SEVEN','EIGHT','NINE'][Number(code.slice(5))] : ({ ArrowUp:'UP',ArrowDown:'DOWN',ArrowLeft:'LEFT',ArrowRight:'RIGHT',Space:'SPACE',ShiftLeft:'SHIFT',ShiftRight:'SHIFT',Enter:'ENTER',Escape:'ESC',Backspace:'BACKSPACE',Minus:'MINUS',Equal:'PLUS' })[code] ?? '';
