/** Preserve native button/slider activation without passing navigation keys to Phaser. */
export function isolateControlKeys(element: HTMLElement): void {
  const stop = (event: KeyboardEvent) => {
    if (['Enter', ' ', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) event.stopPropagation();
  };
  element.addEventListener('keydown', stop); element.addEventListener('keyup', stop);
}
