# Task 009 — Powered shield domes

Continue after merged Command #17, neighborhood discovery #18 and research/equipment #19. Implement Phase 8.2 from the game design, development roadmap and upgrades/domes schedule.

- Paid small/large emitters unlocked by Combat engineering; empty initial charge, continuous upkeep and finite paid recharge.
- Separate shield maintenance/charging priorities from essential habitat air; obey actual grid supply, reserves and power caps.
- Continuous swept meteor/hostile-shot entry, bounded damage absorption, overlap and first-contact ordering, residual damage/speed, explicit dust/energy accounting.
- Preserve friendly traffic, towing, mining, outgoing ammunition and oxygen semantics. No toggle/reload/rebuild invulnerability or free ore.
- World coverage/charge, Command/Defence/HUD states, original procedural cues and reduced-effect option.
- Bounded version-13 current-checkpoint validation; no legacy-save support during development.
- Automated scarcity, collision, persistence, timing, friendly traffic and browser regressions; run typecheck, tests, production build and browser suite. Open a review PR; merge only under user authorization.

See [implemented rules and playtest](docs/SHIELDS.md). Nearby worlds are next; the full presentation/reliability phases remain pending.
