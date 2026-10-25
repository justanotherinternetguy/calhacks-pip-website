# pip website

The landing page for pip (repo: `../safe`), the passive night-out safety app. It uses the design language of
the HoloTouch site (`../website`): cream and ink, Fredoka / Figtree / DM Mono, and the same colour meanings as
the app (`safe/apps/mobile/lib/theme.ts`).

Astro (static) + GSAP ScrollTrigger + Lenis smooth scrolling. No framework runtime.

```bash
pnpm install
pnpm dev      # http://localhost:4321
pnpm build    # static site in dist/
pnpm check    # type check
```

Sections: the pinned scroll story (`Story.astro`, `scripts/story.ts`), the live signal simulator
(`signals.ts`), the incident catalogue (`data/incidents.ts`, kept in step with `safe/docs/FEATURES.md`), the
check-in rule board (`rule.ts`), the escalation rail and hold-for-help button (`escalation.ts`), the typing
check-in (`checkin.ts`), real Shamir key splitting over GF(256) (`shamir.ts`, `privacy.ts`), and the friends'
monitor mock (`monitor.ts`). Every demo honours `prefers-reduced-motion`.
