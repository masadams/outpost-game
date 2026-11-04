# Task 007E — Earned mobile logistics through asteroid towing

Continue Phase 7 after the landing-warning feedback slice. Keep PR #14 open for review; stack this task until its dependency merges. Retarget #14 onto main now that resource priorities #13 are merged. Do not merge automatically.

- Fabricate a 25 kg utility towing rig at the piloted home pad, spending 16 alloy + 6 wire + 3 components and respecting turret-material reserves. Installation is paid once and changes actual ship mass.
- Y latches the nearest eligible asteroid within 180 m and relative speed ≤15 m/s with clear terrain; Y releases. Use a fixed-length slack/tension cable, equal/opposite impulses and dissipative damping, with no initial impulse or free ore.
- Break on excessive tension/stretch, impact, terrain occlusion or target destruction. Preserve the remaining world body and its momentum; normal mining/tractor/unload remains necessary.
- Integrate gravity/drag/collisions, normal controls, cable drawing, Cargo equipment/relative-speed/tension/stretch feedback and mechanical audio. Suspend the uncoupled coast path while attached.
- Version-8 checkpoints preserve equipment/cable state and prior progress; versions 1–7 receive no free module. Paid wreck recovery keeps installed equipment and releases the cable.
- Test mass/payment, target selection, momentum/energy, slack, break modes, recovery, frame-rate independence and active/legacy saves. Demonstrate tow → mine/collect → land/unload through ordinary simulation inputs and real-browser equipment/cable controls.
- Run build/typecheck/unit/browser checks and open a review PR. Update the roadmap and explicitly schedule ship upgrades, oxygen habitats and shields in response to user feedback.

This implements towing, one allowed mobile-logistics option. Autonomous drones, reeling/multiple cables, logistics AI and the full upgrade interface remain later work. Habitat domes follow in Phase 7.5; ship progression and shield domes in Phase 8.
