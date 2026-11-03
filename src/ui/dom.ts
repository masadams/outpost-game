// Keep interactive controls/focus/scroll stable while telemetry changes around them.
export function patchMarkup(target: HTMLElement, markup: string): void {
  const template = document.createElement('template'); template.innerHTML = markup;
  const open=new Map(Array.from(target.querySelectorAll<HTMLDetailsElement>('details[data-preserve-open]')).map(d=>[detailKey(d),d.open]));
  patchChildren(target, template.content);
  for(const d of Array.from(target.querySelectorAll<HTMLDetailsElement>('details[data-preserve-open]'))){const state=open.get(detailKey(d));if(state!==undefined&&d.open!==state)d.open=state;}

}
function detailKey(e:Element):string {return e.id || e.getAttribute('data-key') || e.className || e.querySelector('summary')?.textContent?.split('·')[0].trim() || ''; }
function patchChildren(target: Node, source: Node): void {
  const children = Array.from(source.childNodes);
  children.forEach((next, index) => {
    const current = target.childNodes[index];
    if (!current) { target.appendChild(next.cloneNode(true)); return; }
    if (current.nodeType !== next.nodeType || (current instanceof Element && next instanceof Element && current.tagName !== next.tagName)) {
      target.replaceChild(next.cloneNode(true), current); return;
    }
    if (current instanceof Element && next instanceof Element) {
      for (const attribute of Array.from(current.attributes)) if (!next.hasAttribute(attribute.name) && !(attribute.name === 'open' && current.matches('details[data-preserve-open]'))) current.removeAttribute(attribute.name);
      for (const attribute of Array.from(next.attributes)) if (!(attribute.name==='open'&&current.matches('details[data-preserve-open]')&&detailKey(current)===detailKey(next)) && current.getAttribute(attribute.name) !== attribute.value) current.setAttribute(attribute.name, attribute.value);
      patchChildren(current, next);
    } else if (current.nodeValue !== next.nodeValue) current.nodeValue = next.nodeValue;
  });
  while (target.childNodes.length > children.length) target.removeChild(target.lastChild!);
}

export function setText(target: Element,text:string):void {if(target.textContent!==text)target.textContent=text;}
