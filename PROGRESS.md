# DigiLife - Progress Checklist


## 🟢 Phase 1: Foundation (Core Engine & UI)
**Status: Mostly Complete**

- [x] **Project Setup**: Vite, vanilla TypeScript, minimalist CSS styling.
- [x] **Core Engine Architecture**:
  - [x] `GameState` single-atom state store.
  - [x] `EventBus` for decoupled system pub/sub events.
  - [x] `ConditionSystem` to evaluate if events/choices can trigger.
  - [x] `EffectSystem` to apply consequences to stats and flags.
- [x] **Basic UI & Rendering layer**:
  - [x] Brutalist / retro aesthetic (HTML/CSS).
  - [x] Title Screen.
  - [x] Character Creation Screen.
  - [x] Main Game Interface (Event Log, Stats Bar, Top Bar).
  - [x] Modal popup system for interactive random events.
  - [x] Death / Game Over screen.
- [x] **Basic Game Loop**:
  - [x] "AGE + 1" mechanic.
  - [x] Automated stat clamping and basic decay.
  - [x] History logging (Age headers, primary/secondary text points).
- [x] **Content Pipeline**:
  - [x] Loading JSON event structures (`childhood.json`).
  - [x] Parsing nested choices, random weighted outcomes, and conditional triggers.
- [ ] **Save/Load System**: Persistence via `localStorage`.

---

## 🟡 Phase 2: Core Mechanics & Stats
**Status: Not Started**

- [ ] Fleshed-out Stat System (Hidden stats: Athleticism, Craziness, Willpower, Fertility).
- [ ] Personality Traits & Special Talents (assigned at birth).
- [ ] Passive tick recalculation (annual income, loan payments, passive healing/decay).

---

## 🔴 Phase 3: Life Stages, Activities & Relationships
**Status: Not Started**

- [ ] **Relationships System**:
  - [ ] NPC generator for parents, siblings, friends, coworkers.
  - [ ] Interaction menus (Spend time, converse, argue, gift, ask for money).
  - [ ] Romance (Dating, marriage, divorce, child-rearing).
- [ ] **Activities & Leisure**:
  - [ ] Daily actions (Read book, meditate, movie theater).
  - [ ] Pets (Adopt, train, care for).

---

## 🔴 Phase 4: Education & Career
**Status: Not Started**

- [ ] **Education System**:
  - [ ] Primary & Secondary school cycles.
  - [ ] Extracurriculars, bullying interactions, studying.
  - [ ] Higher Education (University, Trade School, Graduate programs).
  - [ ] Student loans & Scholarships.
- [ ] **Career System**:
  - [ ] Job Board (filtering by age/education/stats).
  - [ ] Work performance, promotions, raises, and getting fired.
  - [ ] Special career tracks (Actors, politicians, athletes).
  - [ ] Entrepreneurship / Startups.

---

## 🔴 Phase 5: Finance & Assets
**Status: Not Started**

- [ ] **Financial System**: Bank accounts, income vs expenses, taxes.
- [ ] **Real Estate**: Buying, selling, mortgages, landlord mechanics.
- [ ] **Vehicles**: Cars, boats, planes (maintenance, condition).
- [ ] **Investments**: Stock market, crypto, bonds, gambling.

---

## 🔴 Phase 6: Health & Mind
**Status: Not Started**

- [ ] **Physical Health**: Diseases, doctor visits, emergency room, diets, gym.
- [ ] **Mental Health**: Conditions, therapy, self-care.
- [ ] **Substances**: Alcohol, drugs, addiction chains, rehab.
- [ ] **Plastic Surgery**: Enhancements and botched operations.

---

## 🔴 Phase 7: Crime, Justice & Military
**Status: Not Started**

- [ ] **Crime System**:
  - [ ] Petty crimes, burglary, grand theft auto, violent crimes.
  - [ ] Organized Crime (joining syndicates, climbing ranks).
- [ ] **Legal System**:
  - [ ] Police confrontation, trials, hiring lawyers.
  - [ ] Prison (serving time, escapes, prison gangs, riots).
- [ ] **Military**: Branch enlistment, deployments, combat minigames, veterans.

---

## 🔴 Phase 8: Fame, Legacy & End-Game
**Status: Not Started**

- [ ] **Fame System**: Followers, social media, verification, scandals, endorsements.
- [ ] **Legacy Planning**: Last wills, inheritance to children.
- [ ] **Multi-Generational Play**: Continuing as your child after death.
- [ ] **Achievements System**: Ribbons (e.g., "Thief", "Hero", "Rich", "Mediocre") and graveyard history.
