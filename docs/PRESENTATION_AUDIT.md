# Initial graphics, UX and UI audit — alpha 0.4

This is a technical audit of the playable combat slice and captured production-browser screenshots, not a completed human usability study. It starts the user's requested Phase 9 overhaul before automation adds further interface complexity. The full redesign remains required before Phase 10 reliability/release playtesting.

| Area | Current finding | Overhaul direction |
|---|---|---|
| HUD hierarchy | Flight, mining, colony and defence information compete for space; important actions can sit below the colony panel's scroll fold. | Contextual flight, crew, construction and turret layouts; a compact persistent safety/weapon layer. |
| Combat visibility | Upper HUD bands can cover approaching targets. The new patrol notice was shortened as an immediate mitigation. | Reserve a clear play area, improve camera framing/look-ahead, and test threats around every panel edge. |
| Camera | Auto zoom follows altitude; manual zoom helps interception, but discovering the right scale is still manual. | Comfortable mode framing, clearer auto/manual state, scale references and reduced-motion options. |
| Graphics | Vector silhouettes, cached planet haze and placeholder structures convey function but lack a complete visual identity. | Cohesive retro palette, typography, icons, terrain/atmosphere detail, recognizable facility silhouettes, animation and restrained effects. |
| Target feedback | HP bars, windup lines, flashes, radar and named drone states provide a baseline; color remains a heavy signal. | Non-color target/weapon identifiers, readable hit confirmation and threat priority at multiple zoom scales. |
| Interaction flow | Keyboard shortcuts are numerous. Mouse controls need reliable return to game input; supplies/services can produce several separate notices. | Consistent contextual prompts, discoverable controls/rebinding, grouped service receipts and explicit reasons for unavailable actions. |
| Construction/economy | A long scrolling panel combines blueprint choice, placement, nearby operations and global inventories. | Separate selection/placement/operations surfaces with clearer costs, power/ammo priorities and failure feedback. |
| Accessibility/layout | Desktop prototype layouts and native keyboard controls exist; full text scaling, contrast, reduced motion and quality settings do not. | Validate 900×600, 1280×800 and 1920×1080, keyboard focus, scalable text, non-color cues and effect budgets on lower-powered hardware. |

Before Phase 7 interface expansion, draft visual direction and contextual layout mockups around these findings. During the full Phase 9 overhaul, run human launch→mine→land→build→defend/combat→repair→save playtests, record task completion/confusion and resolve blocking findings. Establish measured frame-time/quality budgets and visual/input regressions. Do not mark the overhaul complete from screenshots or automated tests alone.

## Alpha 0.5 follow-up

The [presentation foundation](PRESENTATION_DIRECTION.md) now supplies visual-direction tokens, flight/construction/combat wireframes and live desktop references. The playable UI uses one contextual dock, bottom telemetry, a reserved central corridor, grouped notice flow and native keyboard/mouse navigation with help/pause checks. Planet shading/strata remain cached procedural graphics. These address the first hierarchy/occlusion/interaction findings; they do not complete human usability testing, final art, adaptive camera behavior or accessibility/performance options. Use this foundation for Phase 7 interfaces, then complete the broader Phase 9 checklist.
