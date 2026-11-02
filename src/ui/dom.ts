// Keep interactive controls/focus/scroll stable while telemetry changes around them.
export function patchMarkup(target: HTMLElement, markup: string): void {
  const template = document.createElement('template'); template.innerHTML = markup;
  patchChildren(target, template.content);
}
function patchChildren(target: Node, source: Node): void {
  const children = Array.from(source.childNodes);
  children.forEach((next, index) => {
    const current = target.childNodes[index];
    if (!current) { target.appendChild(next.cloneNode(true)); return; }
    if (current.nodeType !== next.nodeType || (current instanceof Element && next instanceof Element && current.tagName !== next.tagName)) {
      target.replaceChild(next.cloneNode(true), current); return;
    }
    if (current instanceof Element && next instanceof Element) {
      for (const attribute of Array.from(current.attributes)) if (!next.hasAttribute(attribute.name)) current.removeAttribute(attribute.name);
      for (const attribute of Array.from(next.attributes)) if (current.getAttribute(attribute.name) !== attribute.value) current.setAttribute(attribute.name, attribute.value);
      patchChildren(current, next);
    } else if (current.nodeValue !== next.nodeValue) current.nodeValue = next.nodeValue;
  });
  while (target.childNodes.length > children.length) target.removeChild(target.lastChild!);
}
