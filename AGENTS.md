# DigiLife - Project Context for AI Agents

## Project Overview

**DigiLife** is a web-based life simulation game inspired by BitLife, with card-style choice mechanics similar to Plague Inc.

### Core Identity
- **Genre**: Life simulation / Choose-your-own-adventure
- **Platform**: Web (mobile-first responsive)
- **Aesthetic**: Minimalist, retro, brutalist
- **Pricing**: Free to play

## Primary Goals (in priority order)

### 1. Performance (Highest Priority)
The game must be **extremely fast and efficient**:
- Sub-100ms interaction response
- < 15KB gzipped bundle size
- No framework overhead (vanilla TypeScript)
- Minimal DOM operations
- CSS-first animations
- Instant load times on 3G connections

### 2. Freedom & Expandability
- Choices have meaningful consequences
- Massive variety of life events
- Easy to add new content without code changes
- Data-driven event system
- Modular content architecture

### 3. User Experience
- Simple, intuitive UI
- Satisfying feedback loops
- Engaging progression
- Replayability through variety

## Design Constraints

### Must
- Use vanilla TypeScript (no React, Vue, etc.)
- All game content defined as JSON data
- Single-page application
- LocalStorage for persistence
- Work offline after first load
- Mobile-first responsive design

### Must Not
- Require backend/database for MVP
- Use heavy animation libraries
- Have loading screens after initial load
- Require sign-up to play

## Aesthetic Direction

### Visual Style
- Brutalist design (raw, honest, functional)
- Retro feel (early web / terminal aesthetic)
- High contrast colors
- Monospace typography
- ASCII/Unicode icons instead of images
- No gradients or shadows
- Thick borders, bold elements

### UI Principles
- Card-based choices (Plague Inc style)
- Stat bars clearly visible
- Age/year prominent
- Minimal chrome, maximum content

## Game Mechanics

### Core Loop
1. Player starts as a newborn (age 0)
2. Each turn = 1 year of life
3. Event(s) trigger based on age, stats, flags
4. Player makes choices from presented cards
5. Effects applied to character stats/flags
6. Continue until death

### Stats System
| Stat | Key (in code) | Range | Description |
|------|---------------|-------|-------------|
| Health | `health` | 0-100 | Physical wellbeing. 0 = death |
| Happiness | `happiness` | 0-100 | Mental state |
| Smarts | `smarts` | 0-100 | Cognitive ability / Intelligence |
| Looks | `looks` | 0-100 | Physical appearance |
| Karma | `karma` | 0-100 | Affects random outcomes |
| Athleticism | `athleticism`| 0-100 | Physical capability / Fitness |
| Craziness | `craziness` | 0-100 | Propensity for wild/risky actions |
| Willpower | `willpower` | 0-100 | Ability to resist urges/succeed at hard tasks |
| Fertility | `fertility` | 0-100 | Chance of conceiving children |

*Note: "Social" from initial plan is currently handled via individual relationship levels (`relationshipToPlayer`) and `familiarity`.*

### Life Stages
- **Baby** (0-2): Limited choices, parent-dependent.
- **Child** (3-12): School begins, personality forms.
- **Teen** (13-17): Rebellion, relationships, first jobs.
- **Young Adult** (18-29): Higher ed, career start, independence.
- **Adult** (30-59): Career peak, family, mid-life events.
- **Senior** (60+): Retirement, health decline.
- **End of Life** (75+): Increasing chance of natural death each year.

## Core Mechanics Refinement

### Time Management
- **Annual Budget**: Each year grants 12 months of `timeBudget`.
- **Location Time**: Traveling to a location (School, Gym, etc.) grants `locationTime` (hours/units) specific to that visit.
- **Activities**: Consumes either `timeBudget` (if at Home) or `locationTime` (if at a specific location).

### Relationships
- **Familiarity**: A 0-100 stat representing how well you know someone. It decays annually and must be maintained through interaction.
- **Interactions**: Actions like "Converse", "Spend Time", "Ask for Money" affect both `relationshipToPlayer` and `familiarity`.

### Activity Potential
- **Diminishing Returns**: Stat gains from activities slow down as stats approach 100.
- **Consistency**: Repeatedly performing an activity increases its efficiency via `activitiesExperience`.
### Content Categories (expandable)
- Childhood events
- Education
- Career
- Relationships
- Health
- Crime
- Random life events

## Technical Architecture

See `ARCHITECTURE.md` for full details.

### Key Patterns
- **Data-Driven**: Events/choices/effects as JSON
- **Event Bus**: Decoupled system communication
- **Single State Atom**: One game state object
- **Condition/Effect System**: Flexible game logic

### Core Systems & Files
- **Engine**: `src/core/Engine.ts` (Game loop, aging, death)
- **State**: `src/core/GameState.ts` (Single atom state)
- **Rules**: `src/core/ConditionSystem.ts`, `src/core/EffectSystem.ts`
- **Content**: `src/content/events/` (Currently mostly `childhood.json`)
- **UI**: `src/ui/Renderer.ts` (Manual DOM updates)
- **Systems**: `src/systems/RelationshipSystem.ts`, `src/systems/ActivitySystem.ts`

### File Structure
```
src/
├── core/        # Engine (GameState, EventBus, Systems)
├── content/     # All game data as JSON
├── systems/     # Feature-specific logic (Relationships, Activities)
├── ui/          # Rendering, components, styles
└── main.ts      # Entry point
```

## Development Guidelines for Agents

### 🚨 Mandatory Investigation Protocol
1. **Always read before you write.** Use `view_file` to inspect `AGENTS.md`, `PLAN.md`, `PROGRESS.md`, and `ARCHITECTURE.md` to understand the overarching state of the project before touching code.
2. **Contextualize changes.** Use `grep_search` or `view_file` on core engine files (like `Engine.ts`, `GameState.ts`, `Renderer.ts`) to understand current data flow before making superficial fixes.
3. **Fix the core, don't hack the surface.** If a requested change feels difficult, heavily convoluted, or breaks existing architecture, STOP. Identify the fundamental core issue causing the friction and fix *that*. Every change in this codebase should feel effortless and logical. A hacky workaround is a failure.

### Critical Thinking
- Fix root cause (not band-aid).
- Unsure: read more code; if still stuck, ask w/ short options.
- Conflicts: call out; pick safer path.
- Unrecognized changes: assume other agent; keep going; focus your changes. If it causes issues, stop + ask user.
- Leave breadcrumb notes in thread.
- Keep files <~500 LOC; split/refactor as needed.
- If a change materially alters game mechanics/systems, update docs (`README.md`, `ARCHITECTURE.md`, or files under `docs/`) in the same PR.
- “Make a note” => edit AGENTS.md (shortcut; not a blocker).

### When Adding Features
1. First check if it can be data-driven (add to JSON)
2. Only add code if truly new mechanic
3. Maintain performance targets (zero overhead, pure TS)
4. Follow existing code patterns and pub/sub architecture
5. Keep bundle size minimal

### When Adding Content
1. Add to appropriate JSON file in `src/content/events/`
2. Use existing events as templates
3. Balance weight/probability
5. Include multiple choice options

### Code Style
- No comments unless requested
- TypeScript strict mode
- Functional patterns preferred
- Avoid classes unless stateful
- Keep functions small and pure

### Testing Philosophy
- Manual testing for game feel
- Unit tests for core systems only
- For code changes, run `npm test` and `npm run build` before finishing
- Performance benchmarks matter
- Always run the sever on port 5173

## Success Metrics

1. **Performance**: Lighthouse score 100, < 15KB bundle
2. **Engagement**: Players return for multiple lives
3. **Expandability**: Adding new events takes < 5 minutes
4. **Freedom**: Meaningful choices with visible consequences

## Questions for Future Agents

When asked to modify this project, consider:
- Does this change improve performance?
- Can this be data instead of code?
- Does this align with brutalist/retro aesthetic?
- Is the bundle size impact acceptable?
- Does this expand player freedom?
