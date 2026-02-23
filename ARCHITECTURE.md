# DigiLife Architecture

A high-performance, data-driven life simulator built with vanilla TypeScript.

## Design Priorities

1. Performance first (low overhead, minimal runtime complexity)
2. Data-driven expandability (new content through JSON)
3. Player freedom (many action paths, meaningful outcomes)

## Runtime Shape

### Single State Atom

All gameplay runs from one `GameState` object (`src/core/GameState.ts`) that includes:

- character identity and stats
- finances, education, and career state
- relationship graph (NPC list)
- shadow-crime progression state
- flags/history/time budgets

### Event Bus

`src/core/EventBus.ts` provides pub/sub decoupling between engine and UI.

### Engine Tick

`src/core/Engine.ts` annual tick order:

1. Age/year increment
2. Baseline stat drift
3. `processEducationYear`
4. `processCareerYear`
5. `processSerialKillerYear`
6. `ageUpNPCs`
7. passive financial updates
8. random event selection
9. death checks

## Project Structure

```text
src/
├── core/
│   ├── Engine.ts
│   ├── GameState.ts
│   ├── EventBus.ts
│   ├── EventRegistry.ts
│   ├── ConditionSystem.ts
│   └── EffectSystem.ts
├── systems/
│   ├── ActivitySystem.ts
│   ├── RelationshipSystem.ts
│   ├── EducationSystem.ts
│   └── CareerSystem.ts
├── content/
│   ├── events/
│   ├── careers/
│   └── shadow/
├── ui/
│   └── Renderer.ts
└── main.ts
```

## Data-Driven Content

### Career Catalog

- Loaded with `import.meta.glob('./content/careers/*.json')`
- Registered via `registerCareers(...)`
- Definitions support:
  - hard requirements (education, age, stats)
  - optional requirements (majors, flags, law-year gates)
  - salary/raise/difficulty and promotion ladders

### Shadow Contracts

- Loaded from `src/content/shadow/serial_contracts.json`
- Registered via `registerSerialContracts(...)`
- Each contract defines payout, risk, heat/notoriety effects

### Event Content

- Event cards are JSON-loaded via `EventRegistry`
- Conditions/effects are evaluated through dedicated systems

## Key Systems

### Relationship System

`src/systems/RelationshipSystem.ts`

- familiarity decay + relationship evolution
- interaction menu generation by NPC and context
- supports both local and remote interactions for known NPCs
- includes romance, family care, conflict, plotting, and lethal actions

### Education System

`src/systems/EducationSystem.ts`

- school milestones by age
- degree enrollment and progression
- tuition/scholarship/debt model
- bar exam workflow with yearly attempt lockout

### Career System

`src/systems/CareerSystem.ts`

- eligible-career filtering
- apply/hire/reject loop
- annual performance drift, raises, promotions, and firing
- startup path and shadow-crime parallel path
- annual capture risk for shadow mode

## UI Layer

`src/ui/Renderer.ts` performs direct DOM rendering without framework state management.

Current screens:

- title
- character creation
- main game feed
- event modals
- activities, relationships, education/career menus
- death summary

## Testing Architecture

No runtime test dependency is shipped.

- Test harness: `tests/harness.ts`
- Test suites: `tests/*.test.ts`
- Runner: `tests/testRunner.ts`
- Config: `tsconfig.test.json`
- Command: `npm test`

## Extension Rules

When adding systems/features:

1. Prefer data additions first (`src/content/...`)
2. Keep engine complexity low and deterministic
3. Preserve state backward compatibility in `Engine.loadState`
4. Keep interaction latency minimal
5. Run `npm test` and `npm run build`
