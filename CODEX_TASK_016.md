# Task 016 — Management workspace and visual research

User feedback: menus are convoluted, too dense and too small. Follow AGENTS.md and GAME_DESIGN.md, based on merged #25. Prioritize usable information hierarchy before adding catalogue content.

- Large management workspace by default, separate labelled/icon pages for facilities, research, ship fitting, construction, economy and shields. Allow compact/expanded operations windows; preserve compact world placement and flight controls. Do not silently pause or issue actions when opening/inspecting.
- Connected, tiered research map showing locked, ready, queued and completed states with words and icons. Select a node for requirements, costs, unlocks and explicit paid actions. Brief hover hints supplement keyboard-accessible persistent details. Keep tree browsing/search separate from purchases.
- Visual ship slot navigation and part catalogue. Select a part for comparison against the currently fitted module, real costs/tradeoffs and explicit atomic fitting. Hide deep mechanics in disclosures. No hover-only essential information or icon-only navigation.
- Add four useful research branches and six functional parts with real mass/power/heat/propulsion/capacity tradeoffs. No new unrelated systems or legacy-save migrations.
- Exercise native mouse/keyboard focus, paused inspection, actual paid research/fitting, selection and scroll stability, enlarged layouts and regressions. Run typecheck, unit tests, production build and browser checks. Open a PR for user review; do not merge automatically.

## Implementation and verification

Implemented in alpha 0.20 on `feat/management-workspace`, based on merged #25. All four branches and six parts have real paid simulation effects. Research/fitting use persistent selection and explicit actions; original controls move into the expanded window rather than being duplicated. Short desktops use side navigation and a full-height inspector. The flight footer's CSS is scoped to the flight footer, and inspector actions remain inside their card.

Typecheck, production build and all 478 unit tests pass locally. All 21 targeted production-browser scenarios have passed across focused runs: command power/priority/construction, objectives, accessible settings/rebinding, paid freight, compact HUD and expanded geometry, performance bounds, physical facility selection, all 22 part inspections, normally paid research/fabrication, tank conservation, shield construction/interception and the new workspace. The stricter seven-scenario final rerun passes native objective navigation, compact/enlarged layouts, keyboard/remapped Pause safety, paid Ion propulsion and fitting, and complete action-button visibility at 900×600, 1280×800 and 1920×1080 with enlarged text. The final short-screen inspector refinement passes its three-size layout route again. Six new screenshots document the actual UI. The full CI catalogue has 62 browser scenarios; remote CI and user review remain pending.

Human menu/handling/pacing feedback and representative hardware testing remain open. Open the implementation PR for review and do not merge automatically.
