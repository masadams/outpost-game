/** Original inline line icons. Labels carry meaning; icons are decorative. */
const paths:Record<string,string>={
 wire:'M5 3v5a4 4 0 0 0 8 0V5a3 3 0 0 1 6 0v13M3 3h4M17 21h4',
 components:'M7 7h10v10H7zM10 3v4M14 3v4M10 17v4M14 17v4M3 10h4M3 14h4M17 10h4M17 14h4',
 research:'M9 3h6M10 3v6l-6 10a1 1 0 0 0 1 2h14a1 1 0 0 0 1-2L14 9V3M8 15h8',
 drive:'M12 3l5 8v7l-5-3-5 3v-7zM10 19l2 3 2-3',
 tank:'M8 3h8v3l2 2v12H6V8l2-2zM6 12h12',
 hold:'M3 7l9-4 9 4v13H3zM3 7l9 4 9-4M12 11v9',
 mining:'M4 5l15 15M3 10l7-7 10 4-3 3-7-1z',
 tractor:'M5 4v9a7 7 0 0 0 14 0V4h-4v9a3 3 0 0 1-6 0V4zM5 8h4M15 8h4',
 weapon:'M3 17l5-5h9l4-5M7 12l3 7M14 12l3-5h4',
 cooling:'M12 2v20M3 7l18 10M3 17L21 7M9 4l3 3 3-3M9 20l3-3 3 3',
 armour:'M12 3l8 3v6c0 5-8 9-8 9s-8-4-8-9V6zM8 12l3 3 5-6',
 facilities:'M3 21V9l6 3V7l6 3V3h4v18zM6 16h1M11 16h1M16 16h1',
 economy:'M3 20h18M6 16V9M12 16V4M18 16v-5',
 queue:'M4 5h3M10 5h10M4 12h3M10 12h10M4 19h3M10 19h10',
 materials:'M4 8l8-5 8 5v9l-8 4-8-4zM4 8l8 5 8-5M12 13v8',
};
export function icon(name:string):string{return `<svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="${paths[name]??paths.research}"/></svg>`;}
