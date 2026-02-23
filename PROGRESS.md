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

## 🟢 Phase 2: Core Mechanics & Stats
**Status: Complete**

- [x] Fleshed-out Stat System (Hidden stats: Athleticism, Craziness, Willpower, Fertility).
- [x] Personality Traits & Special Talents (assigned at birth).
- [x] Passive tick recalculation (annual income, loan payments, passive healing/decay).

---

## � Phase 3: Life Stages, Activities & Relationships
**Status: Complete**

- [x] **Relationships System**:
  - [x] NPC generator for parents, siblings, friends, coworkers.
  - [x] Interaction menus (Spend time, converse, argue, gift, ask for money).
  - [x] Romance (Dating, marriage, divorce, child-rearing).
  - [x] High-freedom interactions across known NPCs (remote contact, romance pursuit, plotting, lethal actions).
- [x] **Activities & Leisure**:
  - [x] Daily actions (Read book, meditate, movie theater).
  - [x] Pets (Adopt, train, care for).

---

## 🔴 Phase 4: Education & Career
**Status: Complete**

- [x] **Education System**:
  - [x] Primary & Secondary school cycles.
  - [x] Studying loop integrated with annual progression.
  - [x] Higher Education (Engineering Bachelor/Master tracks).
  - [x] Student loans & Scholarships.
- [x] **Career System**:
  - [x] Job Board (filtering by age/education/stats).
  - [x] Work performance, promotions, raises, and getting fired.
  - [x] Special career tracks (Engineering: software/electrical/molecular/nuclear; Law: assistant/paralegal/attorney/prosecutor/public defender/judge).
  - [x] Entrepreneurship / Startups.

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
**Status: In Progress**

- [ ] **Crime System**:
  - [ ] Petty crimes, burglary, grand theft auto, violent crimes.
  - [x] Secret serial-killer pathway (double life/full-time modes, contracts, heat/notoriety loop).
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
