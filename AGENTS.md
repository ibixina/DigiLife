# DigiLife - Essential Agent Context

## Non-Negotiables
- Performance first: sub-100ms interactions.
- Vanilla TypeScript only. No frameworks or heavy libs.
- Single-page app, offline after first load.
- All content in JSON (data-driven).
- LocalStorage persistence.

## Aesthetic & UI
- Brutalist, retro, minimalist.
- High contrast, monospace, thick borders.
- No gradients or shadows.
- Card-based choices, stats visible, age/year prominent.

## Core Architecture (see `ARCHITECTURE.md`)
- Single `GameState` atom: `src/core/GameState.ts`
- Engine tick: `src/core/Engine.ts`
- Event bus: `src/core/EventBus.ts`
- Conditions/effects: `src/core/ConditionSystem.ts`, `src/core/EffectSystem.ts`
- Renderer: `src/ui/Renderer.ts`
- Content: `src/content/**` (events, careers, shadow, etc.)

## Core Loop
Age up yearly → select event(s) → player choice → apply effects → check death.

## Stats (0-100)
`health`, `happiness`, `smarts`, `looks`, `karma`, `athleticism`, `craziness`, `willpower`, `fertility`

## Mandatory Investigation Protocol
1. Read `AGENTS.md`, `PLAN.md`, `PROGRESS.md`, `ARCHITECTURE.md` first.
2. Inspect relevant core files before changing behavior.
3. Fix root causes; avoid surface hacks.

## Development Rules
- Prefer data changes in JSON before code changes.
- Keep functions small, pure; avoid classes unless stateful.
- No comments unless requested.
- Keep files under ~500 LOC (split if needed).
- If mechanics change materially, update docs (`README.md`/`ARCHITECTURE.md`).
- “Make a note” means edit `AGENTS.md`.

## Testing
Run `npm test` and `npm run build` for code changes. Dev server on port 5173.
