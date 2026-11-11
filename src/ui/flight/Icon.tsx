/** Line icons from the approved mockup. Decorative: buttons always carry a text label or aria-label. */
const PATHS = {
  ship: 'M12 2l4 9v6H8v-6z M8 17l-3 4 M16 17l3 4 M10 17v2h4v-2',
  build: 'M3 20h18 M5 20V9l7-5 7 5v11 M9 20v-6h6v6',
  base: 'M3 19h18 M5 19v-4a7 7 0 0 1 14 0v4 M10 19v-3h4v3 M12 8V4',
  map: 'M12 12m-3.2 0a3.2 3.2 0 1 0 6.4 0a3.2 3.2 0 1 0 -6.4 0 M2.6 15.4c1.5 3 8.4 2.2 14.8-1.6 M21.4 8.6c-1.5-3-8.4-2.2-14.8 1.6',
  menu: 'M4 7h16 M4 12h16 M4 17h16',
  sound: 'M4 9h4l5-4v14l-5-4H4z M16 9a4 4 0 0 1 0 6 M18.5 6.5a8 8 0 0 1 0 11',
  muted: 'M4 9h4l5-4v14l-5-4H4z M16 9l5 6 M21 9l-5 6',
  help: 'M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0 M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 1-1 1.7v.5 M12 17h.01',
  settings:
    'M12 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0 M12 2v3 M12 19v3 M2 12h3 M19 12h3 M4.9 4.9l2.1 2.1 M17 17l2.1 2.1 M4.9 19.1L7 17 M17 7l2.1-2.1',
  save: 'M5 3h11l3 3v15H5z M8 3v6h8V3 M8 21v-7h8v7',
  pause: 'M8 5v14 M16 5v14',
  play: 'M7 5l12 7-12 7z',
  path: 'M4 18c4-10 10-12 16-12 M4 18h.01 M8 12h.01 M12 9h.01 M16 7h.01',
  grid: 'M3 18h18 M6 18v-6 M12 18v-10 M18 18v-6 M6 12l6-4 6 4 M13 4l-2 3h3l-2 3',
  zoomIn: 'M11 11m-7 0a7 7 0 1 0 14 0a7 7 0 1 0 -14 0 M21 21l-5-5 M8 11h6 M11 8v6',
  zoomOut: 'M11 11m-7 0a7 7 0 1 0 14 0a7 7 0 1 0 -14 0 M21 21l-5-5 M8 11h6',
  autoZoom: 'M4 9V4h5 M20 9V4h-5 M4 15v5h5 M20 15v5h-5 M12 12m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0',
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name }: { name: IconName }) {
  return (
    <svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d={PATHS[name]} />
    </svg>
  );
}
