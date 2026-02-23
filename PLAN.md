# DigiLife — Full Implementation Plan

> A comprehensive plan to implement DigiLife as a BitLife-scale life simulation with brutalist/retro aesthetics, vanilla TypeScript, and a fully data-driven architecture.

---

## Table of Contents

1. [Project Setup](#1-project-setup)
2. [Core Engine](#2-core-engine)
3. [Stats & Attributes](#3-stats--attributes)
4. [Life Stages & Aging](#4-life-stages--aging)
5. [Character Creation](#5-character-creation)
6. [Relationships](#6-relationships)
7. [Education](#7-education)
8. [Careers & Jobs](#8-careers--jobs)
9. [Fame & Social Media](#9-fame--social-media)
10. [Financials & Assets](#10-financials--assets)
11. [Health & Mind-Body](#11-health--mind-body)
12. [Crime & Justice](#12-crime--justice)
13. [Military](#13-military)
14. [Activities & Leisure](#14-activities--leisure)
15. [Life Events (Random & Triggered)](#15-life-events-random--triggered)
16. [Death & Legacy](#16-death--legacy)
17. [Achievements & Ribbons](#17-achievements--ribbons)
18. [UI & Rendering](#18-ui--rendering)
19. [Save System & Persistence](#19-save-system--persistence)
20. [Content Pipeline](#20-content-pipeline)
21. [Implementation Phases](#21-implementation-phases)

---

## 1. Project Setup

### Tooling
- **Language**: TypeScript (strict mode)
- **Bundler**: Vite (minimal config, fast dev server)
- **Target**: ES2020+, single-page app
- **No runtime dependencies** — zero npm packages in the final bundle

### File Structure
```
digilife/
├── src/
│   ├── core/                    # Game engine
│   │   ├── GameState.ts         # Central state atom
│   │   ├── EventBus.ts          # Pub/sub system
│   │   ├── ConditionSystem.ts   # "Can this happen?" evaluator
│   │   ├── EffectSystem.ts      # Applies consequences
│   │   ├── SaveSystem.ts        # LocalStorage persistence
│   │   ├── ContentRegistry.ts   # Loads & indexes all content
│   │   ├── EventSelector.ts     # Weighted random event picker
│   │   └── TimeSystem.ts        # Age progression, turn management
│   │
│   ├── systems/                 # Feature-specific logic
│   │   ├── RelationshipSystem.ts
│   │   ├── EducationSystem.ts
│   │   ├── CareerSystem.ts
│   │   ├── FinanceSystem.ts
│   │   ├── HealthSystem.ts
│   │   ├── CrimeSystem.ts
│   │   ├── MilitarySystem.ts
│   │   ├── FameSystem.ts
│   │   ├── AchievementSystem.ts
│   │   └── DeathSystem.ts
│   │
│   ├── content/                 # All game data (JSON)
│   │   ├── events/              # Life events by category
│   │   ├── careers/             # Job definitions
│   │   ├── education/           # Schools, majors, degrees
│   │   ├── relationships/       # Interaction templates
│   │   ├── crimes/              # Crime definitions
│   │   ├── health/              # Diseases, diets, treatments
│   │   ├── assets/              # Properties, vehicles, items
│   │   ├── achievements/        # Ribbons & milestones
│   │   ├── names/               # Name pools by country/gender
│   │   ├── countries/           # Country definitions
│   │   └── traits.json          # Personality traits
│   │
│   ├── ui/                      # Rendering layer
│   │   ├── Renderer.ts          # Minimal DOM diffing
│   │   ├── screens/             # Screen components
│   │   │   ├── TitleScreen.ts
│   │   │   ├── CharCreateScreen.ts
│   │   │   ├── GameScreen.ts
│   │   │   ├── DeathScreen.ts
│   │   │   └── LegacyScreen.ts
│   │   ├── components/          # Reusable UI elements
│   │   │   ├── StatBar.ts
│   │   │   ├── ChoiceCard.ts
│   │   │   ├── EventCard.ts
│   │   │   ├── RelationshipList.ts
│   │   │   ├── ActionMenu.ts
│   │   │   └── Notification.ts
│   │   └── styles/
│   │       ├── reset.css
│   │       ├── theme.css        # Colors, fonts, variables
│   │       ├── layout.css
│   │       └── components.css
│   │
│   └── main.ts                  # Entry point
│
├── public/
│   └── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

## 2. Core Engine

### 2.1 GameState (Single State Atom)
One object holds the entire game state. Serializable to JSON for save/load.

```typescript
interface GameState {
  character: Character
  relationships: Relationship[]
  education: EducationState
  career: CareerState
  finances: FinanceState
  health: HealthState
  legal: LegalState
  military: MilitaryState
  fame: FameState
  assets: AssetState
  achievements: string[]
  flags: Record<string, boolean | number | string>
  history: HistoryEntry[]     // log of all past events
  year: number
  turnsThisYear: number       // support half-year aging
  isAlive: boolean
  deathCause: string | null
  generation: number          // for legacy play
  previousLives: LegacySummary[]
}
```

### 2.2 EventBus
Pub/sub pattern for decoupled communication between systems.

Events emitted:
- `age_up` — turn progression
- `event_triggered` — a life event fires
- `choice_made` — player picks a card
- `stat_changed` — any stat modification
- `relationship_changed`
- `career_changed`
- `death` — game over
- `achievement_unlocked`
- `flag_set`

### 2.3 ConditionSystem
Evaluates whether an event/choice/outcome can trigger.

**Condition types:**
| Type | Operators | Example |
|------|-----------|---------|
| `stat` | eq, gt, lt, gte, lte | `health > 50` |
| `age` | eq, gt, lt, gte, lte, between | `age between 18-29` |
| `flag` | has, not_has, eq | `has("married")` |
| `relationship` | has_type, count_gt | `has partner` |
| `career` | is, is_not, has_any | `career is "doctor"` |
| `education` | has_degree, level_gte | `has("university")` |
| `money` | gt, lt, gte, lte | `money > 10000` |
| `random` | chance | `random(0.3)` — 30% chance |
| `legal` | is_criminal, in_prison | `not in_prison` |
| `fame` | level_gte | `fame > 50` |
| `asset` | owns_type, count_gt | `owns("house")` |
| `country` | is, is_not | `country is "USA"` |
| `talent` | has | `talent is "athletic"` |
| `addiction` | has, not_has | `has("alcohol")` |
| `and` / `or` / `not` | — | Boolean combinators |

### 2.4 EffectSystem
Applies consequences of choices.

**Effect types:**
| Type | Operations | Example |
|------|-----------|---------|
| `stat` | set, add, multiply, random_range | `health +10` |
| `flag` | set, clear, toggle | `set("pregnant")` |
| `relationship` | add, remove, modify | Add a friend |
| `money` | add, subtract, set, multiply | `money +5000` |
| `career` | hire, fire, promote, demote | Promotion |
| `education` | enroll, graduate, expel | Graduate university |
| `legal` | arrest, release, fine, acquit | Get arrested |
| `health` | add_condition, remove_condition | Get disease |
| `asset` | acquire, lose, modify | Buy a house |
| `fame` | add, subtract | Gain fame |
| `achievement` | unlock | Unlock ribbon |
| `addiction` | add, remove, worsen | Develop addiction |
| `trigger_event` | — | Chain another event |
| `death` | — | Character dies |

### 2.5 ContentRegistry
- Loads all JSON content at startup (lazy by life stage)
- Indexes events by category, age range, conditions
- Provides fast lookup for EventSelector

### 2.6 EventSelector
- Pools eligible events for current age/stats/flags
- Uses weighted random selection
- Ensures variety (cooldown on recently seen events)
- Supports priority events (forced triggers)

### 2.7 TimeSystem
- Each tap = 1 year (or half-year if enabled)
- Triggers age-based systems: school enrollment, graduation, retirement
- Applies annual stat decay/growth
- Processes passive income, mortgage payments, etc.

---

## 3. Stats & Attributes

### 3.1 Primary Stats (0–100)
| Stat | Description | Decay | Affected By |
|------|-------------|-------|-------------|
| **Health** | Physical wellbeing. 0 = death | Age-based decay after 50 | Diet, gym, disease, drugs, accidents |
| **Happiness** | Mental/emotional state | Slow decay if neglected | Relationships, career, money, events |
| **Smarts** | Cognitive ability / intelligence | None (grows w/ study) | School, reading, studying, career |
| **Looks** | Physical appearance | Age-based decay after 40 | Plastic surgery, gym, aging, events |
| **Karma** | Moral alignment, affects luck | None | Choices, crime, donations, kindness |

### 3.2 Hidden / Secondary Stats
| Stat | Range | Description |
|------|-------|-------------|
| **Athleticism** | 0–100 | Physical fitness, affects sports & health |
| **Discipline** | 0–100 | Affects study/work success rate |
| **Craziness** | 0–100 | Likelihood of wild events triggering |
| **Willpower** | 0–100 | Resistance to addiction, crime temptation |
| **Fertility** | 0–100 | Chance of having children |
| **Popularity** | 0–100 | Social standing in school/work |
| **Notoriety** | 0–100 | Criminal reputation |
| **Fame** | 0–100 | Public recognition |

### 3.3 Derived Stats
- **Net Worth** = cash + assets - debts
- **Life Stage** = derived from age
- **Social Class** = derived from net worth + career

---

## 4. Life Stages & Aging

| Stage | Age | Key Mechanics |
|-------|-----|---------------|
| **Baby** | 0–2 | No player agency. Random birth events, parent interactions, talents assigned |
| **Toddler** | 3–4 | Minimal choices. Preschool events, pet interactions, sibling dynamics |
| **Child** | 5–11 | Elementary/middle school. Friends, bullying, hobbies, family events |
| **Teen** | 12–17 | High school. Dating, rebellion, part-time jobs, driver's license, social media |
| **Young Adult** | 18–25 | University, career start, independence, military option, first relationships |
| **Adult** | 26–49 | Career peak, marriage, children, assets, midlife events |
| **Middle Age** | 50–64 | Health concerns, grandchildren, career wind-down, wealth management |
| **Senior** | 65–79 | Retirement, legacy planning, health decline, wisdom events |
| **Elder** | 80+ | Increasing death chance, final events, memoir, last wishes |

### Age-Up Process
1. Increment age
2. Apply annual stat changes (stat decay, passive income, loan payments)
3. Process automatic triggers (school enrollment, graduation, retirement)
4. Select eligible random events (1-3 per year)
5. Present events as cards
6. Apply player choices
7. Check death conditions
8. Update relationships (aging, death of NPCs)
9. Auto-save

---

## 5. Character Creation

### 5.1 Birth Setup
- **Name**: Random from name pool (player can edit)
- **Gender**: Male / Female / Non-binary
- **Country**: Random or player-selected (affects events, careers, laws)
- **City**: Generated based on country
- **Family**:
  - Two parents (with their own stats, careers, wealth)
  - 0-3 siblings (random)
  - Possible step-parents, half-siblings
  - Possible orphan/adoption start
- **Stats**: Random roll (influenced by parent stats)
- **Special Talent**: Random (1 of 10):
  - Academic, Athletic, Artistic, Business, Crime, Looks, Music, Political, Social, Voice

### 5.2 Parent Generation
Each parent has:
- Name, age, gender
- Stats (health, happiness, smarts, looks)
- Career, income
- Relationship quality with player (0-100)
- Personality traits

### 5.3 Country System
Each country defines:
- Legal system (crime severity, death penalty, drug laws)
- Education structure (school ages, university cost)
- Healthcare system (free vs paid)
- Available careers
- Military branches
- Currency & cost of living
- Marriage laws (same-sex, polygamy, age)
- Driving age, drinking age, voting age
- Languages

---

## 6. Relationships

### 6.1 Relationship Types
| Type | Max Count | Available From Age |
|------|-----------|------------------|
| **Parents** | 2+ (step) | Birth |
| **Siblings** | Unlimited | Birth |
| **Friends** | ~20 | 3 |
| **Best Friend** | 1 | 5 |
| **Classmates** | ~30 | 5 |
| **Enemies** | ~5 | 5 |
| **Crush** | 1 | 12 |
| **Boy/Girlfriend** | 1 | 14 |
| **Fiancé/e** | 1 | 18 |
| **Spouse** | 1+ | 18 |
| **Children** | Unlimited | 16+ |
| **Grandchildren** | Unlimited | ~40+ |
| **Ex-Partners** | Unlimited | 14 |
| **Coworkers** | ~10 | 16 |
| **Boss** | 1 | 16 |
| **Pets** | ~5 | Any (via parents early) |
| **Stepchildren** | Unlimited | 18 |
| **In-Laws** | Unlimited | 18 |
| **Grandparents** | 4 | Birth |
| **Nieces/Nephews** | Unlimited | Any |
| **Neighbors** | ~5 | Any |

### 6.2 NPC Properties
```typescript
interface NPC {
  id: string
  name: string
  gender: Gender
  age: number
  stats: { health: number, happiness: number, smarts: number, looks: number }
  career: string | null
  income: number
  personalityTraits: string[]
  relationshipToPlayer: number  // 0-100
  crazyLevel: number
  isAlive: boolean
  flags: Record<string, any>
}
```

### 6.3 Relationship Interactions
**Universal (all relationship types):**
- Conversation / Chat
- Compliment / Insult
- Gift (costs money, boosts relationship)
- Spend time together
- Argue
- Apologize

**Romantic Partners:**
- Flirt / Date / Kiss / Make love
- Move in together
- Propose / Accept proposal
- Marriage (wedding planning: venue, budget, guests)
- Divorce (settlement, custody)
- Cheat on / Discover cheating
- Break up
- Have children (planned/unplanned pregnancy)
- Couples counseling
- Shared finances (joint/separate)
- Prenuptial agreements

**Family:**
- Ask for money / Give money
- Ask for advice
- Family dinners / holidays
- Reconnect with estranged family
- Caring for aging parents
- Inheritance disputes
- Sibling rivalry
- Adopt a child

**Friends:**
- Hang out / Party
- Borrow/lend money
- Get introduced to someone
- Road trips
- Help move
- Be wingman/wingwoman

**Children:**
- Raise / Discipline
- Play with
- Help with homework
- Attend events (recitals, games)
- Pay for education
- Give allowance
- Ground / Punish

**Pets:**
- Adopt (dog, cat, bird, fish, hamster, snake, horse, exotic)
- Feed / Walk / Play
- Vet visits
- Pet death
- Breed

### 6.4 Dating & Marriage
- **Dating pool**: Meet people at school, work, bar, gym, online dating, through friends
- **Date activities**: Dinner, movies, concert, walk, adventure
- **Compatibility**: Based on shared traits, stat alignment
- **Marriage types**: Traditional, courthouse, destination, elopement
- **Divorce**: Contested/uncontested, asset division, alimony, custody

---

## 7. Education

### 7.1 Education Levels

| Level | Ages | Duration | Requirement |
|-------|------|----------|-------------|
| **Preschool** | 3–4 | 2 years | None |
| **Elementary** | 5–10 | 6 years | Auto-enrolled |
| **Middle School** | 11–13 | 3 years | Auto-enrolled |
| **High School** | 14–17 | 4 years | Auto-enrolled |
| **Community College** | 18+ | 2 years | HS diploma |
| **University** | 18+ | 4 years | HS diploma + smarts check |
| **Graduate School** | 22+ | 2 years | University degree |
| **Medical School** | 22+ | 7 years | University (science) |
| **Law School** | 22+ | 3 years | University (various) |
| **Business School** | 22+ | 2 years | University (various) |
| **Dental School** | 22+ | 4 years | University (science) |
| **Pharmacy School** | 22+ | 4 years | University (science) |
| **Veterinary School** | 22+ | 4 years | University (science) |
| **Nursing School** | 22+ | 2 years | University (nursing/sci) |
| **Trade School** | 18+ | 1-2 years | HS diploma |

### 7.2 University Majors
- Accounting, Arts, Biology, Business, Chemistry, Communications
- Computer Science, Criminal Justice, Dance, Economics, Education
- Engineering, English, Environmental Science, Finance, History
- Information Technology, Journalism, Law, Marketing, Mathematics
- Music, Nursing, Philosophy, Physics, Political Science
- Psychology, Sociology, Theater

### 7.3 School Mechanics
- **Grades**: A+ to F (based on smarts + study effort + random)
- **Study harder**: Action to boost grades (costs happiness)
- **Popularity**: Social standing among peers
- **Clubs & Activities**: Sports teams, drama club, debate, band, chess, yearbook, student council
- **Fraternities/Sororities**: Join in university (social boost, party events)
- **Scholarships**: Based on grades + athleticism + talent
- **Student loans**: If can't afford tuition
- **Drop out**: Leave at any level (limits career options)
- **Expulsion**: For bad behavior
- **School events**: Field trips, prom, graduation, science fair, talent show, sports matches
- **Teacher interactions**: Good/bad relationships affect grades
- **Bullying**: Be bullied, bully others, stand up to bullies
- **Tutoring**: Hire tutor for stat boost (costs money)
- **Library**: Free smarts boost

---

## 8. Careers & Jobs

### 8.1 Career Tiers

**Tier 0 — No Education Required:**
- Actor (Voice), Auto Mechanic, Babysitter, Baker, Barista, Bartender
- Bouncer, Bus Driver, Busker, Butcher, Carpenter, Cashier
- Chimney Sweep, Circus Performer, Clown, Construction Worker
- Delivery Driver, Dishwasher, Dog Walker, Exotic Dancer
- Factory Worker, Farm Hand, Fast Food Worker, Fisherman
- Freelance Writer, Garbage Collector, Gardener, Housekeeper
- Janitor, Landscaper, Lifeguard, Lumberjack, Maid
- Massage Therapist, Miner, Mover, Newspaper Carrier
- Painter, Pet Groomer, Pizza Delivery, Plumber, Porter
- Retail Salesperson, Roadkill Remover, Security Guard
- Street Performer, Tailor, Tattoo Artist, Telemarketer
- Uber/Taxi Driver, Waiter/Waitress, Warehouse Worker

**Tier 1 — High School Diploma:** 
- Cameraman, Dental Assistant, Electrician, EMT, Firefighter
- Flight Attendant, Grocer, Hairdresser, Insurance Agent
- Mail Carrier, Makeup Artist, Mechanic, Office Clerk
- Paralegal, Pharmacy Tech, Photographer, Police Officer  
- Real Estate Agent, Receptionist, Restaurant Manager
- Salesperson, Travel Agent, Truck Driver, Welder

**Tier 2 — Community College / Trade School:**
- Chef, Dental Hygienist, HVAC Technician, IT Support
- Licensed Practical Nurse, Massage Therapist, Paramedic
- Plumbing Contractor, Radiation Therapist, Surgical Tech
- Web Developer, Veterinary Technician

**Tier 3 — University Degree:**
- Accountant, Animator, Architect, Banker, Biotechnologist
- Business Analyst, Chemical Engineer, Choreographer
- Computer Programmer, Database Admin, Detective
- Editor, Environmental Scientist, Financial Advisor
- Forensic Scientist, Graphic Designer, Human Resources
- Interior Designer, Journalist, Lobbyist, Marketing Manager
- Mechanical Engineer, Microbiologist, Museum Curator
- Music Composer, Operations Analyst, Private Investigator
- Public Relations, Reporter, School Teacher, Social Worker
- Software Engineer, Stockbroker, Urban Planner

**Tier 4 — Graduate / Professional School:**
- Brain Surgeon, CEO (via business school), Dentist
- Judge, Lawyer, Pharmacist, Physician, Professor
- Psychiatrist, Research Scientist, Surgeon, Veterinarian

**Tier 5 — Special Careers (talent/fame required):**
- Actor/Actress, Astronaut, Fashion Model, Musician
- Politician (local → state → national → president)
- Pro Athlete (football, basketball, baseball, soccer, tennis, etc.)
- Social Media Influencer, Supermodel, Writer/Author

### 8.2 Career Mechanics
- **Job listings**: Browse available jobs (filtered by qualifications)
- **Apply**: Success based on stats + education + experience
- **Interview**: Random chance modified by smarts, looks, charisma
- **Performance**: Work harder (+stress, +promotion chance)
- **Promotion cycle**: Entry → Junior → Senior → Lead → Manager → Director → VP → C-Suite
- **Salary**: Based on job tier + seniority + performance
- **Raises**: Ask for raise (random, affected by performance)
- **Fired**: For poor performance, criminal record, bad behavior
- **Quit**: Leave voluntarily
- **Retirement**: Available from 55+ with pension
- **Side hustles**: Freelancing, tutoring, Uber, OnlyFans
- **Coworker interactions**: Befriend, romance, conflict
- **Boss interactions**: Impress, clash, brownose, report
- **Work-life balance**: Working too hard decreases happiness
- **Switching careers**: Career change at any time
- **Multiple jobs**: Part-time + full-time stacking
- **Self-employment**: Start a business (see Finance)

### 8.3 Entrepreneurship
- Start a company (choose type: restaurant, tech, retail, etc.)
- Hire employees
- Manage revenue vs expenses
- Expand / franchise
- Sell the business
- Go bankrupt
- Passive income once established

---

## 9. Fame & Social Media

### 9.1 Fame System
- **Fame meter**: 0–100
- **Paths to fame**: Acting, music, sports, politics, social media, writing, crime (infamy)
- **Fame events**: Paparazzi, scandals, talk show appearances, endorsements
- **Fame decay**: Decreases if not maintained

### 9.2 Fame Activities
- Book commercials
- Appear on talk shows
- Photo shoots
- Sign autographs
- Endorse products
- Host events
- Write autobiography
- Go on tours

### 9.3 Social Media
- Create accounts (age 13+): Fakebook, Instogram, TokTik, Tweeter, TubeYou
- Post content (type depends on career/fame)
- Gain/lose followers
- Go viral (random chance)
- Brand deals (income based on followers)
- Controversy / cancellation events
- Block/unblock people

---

## 10. Financials & Assets

### 10.1 Money & Banking
- **Cash on hand**: Liquid money
- **Bank account**: Savings with interest
- **Salary**: Annual income from career
- **Expenses**: Monthly (housing, food, transportation, insurance)
- **Taxes**: Annual, based on income bracket + country
- **Debt**: Student loans, mortgages, credit cards
- **Inheritance**: Receive from dead relatives
- **Will**: Write a will (distribute assets at death)
- **Bankruptcy**: File if overwhelmed by debt
- **Shared finances**: With spouse (joint/separate)
- **Allowance**: From parents (child) or to children (parent)
- **Alimony & child support**: After divorce

### 10.2 Investments
- **Stocks**: Buy/sell shares in companies (price fluctuation)
- **Crypto**: High-volatility investments
- **Real estate**: Buy properties to rent
- **Bonds**: Low-risk, steady returns
- **Mutual funds**: Diversified portfolios
- **Gambling**: Casino (slots, poker, blackjack, roulette), horse racing, sports betting, lottery
- **Financial advisor**: Hire for better returns (costs fee)

### 10.3 Assets
**Vehicles:**
- Cars (economy → luxury → supercar)
- Motorcycles
- Boats (requires boating license)
- Aircraft (requires pilot's license)
- Condition system: new/used, maintenance costs

**Properties:**
- Apartments, Houses, Mansions, Penthouses, Farms, Estates
- Buy / sell / mortgage
- Rent out (landlord income)
- Renovate / repair
- Haunted property events
- Home invasion events

**Items:**
- Jewelry (rings, earrings, pendants, charms — real/fake)
- Instruments (guitar, piano, drums, violin, etc.)
- Collectibles
- Electronics (phone required for social media)
- Clothing/fashion

**Licenses:**
- Driver's license (age 16+)
- Boating license
- Pilot's license
- Firearms license (country-dependent)

---

## 11. Health & Mind-Body

### 11.1 Physical Health
- **Diseases**: Common cold, flu, cancer, heart disease, diabetes, STDs, chronic conditions
- **Injuries**: From accidents, fights, sports, crime
- **Doctor visits**: Diagnose & treat (costs money, unless free healthcare country)
- **Specialists**: Dentist, optometrist, dermatologist, surgeon
- **Emergency room**: For critical conditions
- **Alternative medicine**: Witch doctor, acupuncture (variable effectiveness)

### 11.2 Fitness & Diet
- **Gym**: Boost health + athleticism + looks (available from age 12)
- **Martial arts**: Karate, jiu-jitsu, boxing (self-defense ability)
- **Sports**: School/club teams, professional sports
- **Diets** (age 18+):
  - Healthy: Mediterranean, Vegan, Keto, Paleo (+health)
  - Unhealthy: Junk food, liquid diet, extreme diets (-health)
- **Walk/run/hike**: Free health boost
- **Yoga/meditation**: Boost happiness + health

### 11.3 Mental Health
- **Conditions**: Depression, anxiety, PTSD, bipolar, OCD, schizophrenia, eating disorders
- **Triggers**: Low happiness, traumatic events, substance abuse, loneliness
- **Treatment**: Therapy (psychiatrist), medication, support groups
- **Self-care**: Meditation, hobbies, vacations, socializing

### 11.4 Substance Use & Addiction
- **Alcohol**: Social drinking → binge drinking → alcoholism
- **Drugs**: Marijuana, cocaine, heroin, prescription drugs, psychedelics
- **Tobacco**: Cigarettes, vaping (health effects)
- **Gambling addiction**: From casino activities
- **Addiction mechanics**:
  - Tolerance buildup
  - Withdrawal effects (health, happiness drop)
  - DUI/legal consequences
  - Relationship damage
- **Recovery**:
  - Alcoholics Anonymous / Narcotics Anonymous (free)
  - Rehab center (expensive, more effective)
  - Hypnotherapy
  - Cold turkey (lowest success rate)
  - Multiple attempts may be needed

### 11.5 Plastic Surgery (age 18+)
- Botox, Nose job, Facelift, Liposuction
- Brazilian butt lift, Breast augmentation
- Tummy tuck, Eyelid surgery
- Gender reassignment
- Two surgeon options: expensive (reliable) vs cheap (risky botch)
- Botched surgery decreases looks and health
- Successful surgery increases looks

---

## 12. Crime & Justice

### 12.1 Crimes
**Petty Crime:**
- Shoplifting, pickpocketing, vandalism, trespassing
- Graffiti, jaywalking, public intoxication
- Fake ID, underage drinking

**Property Crime:**
- Burglary (choose target house, rewards vs risk)
- Car theft (grand theft auto)
- Robbery (armed/unarmed)
- Arson

**Violent Crime:**
- Assault, battery
- Murder (various methods)
- Kidnapping
- Hit and run

**White Collar Crime:**
- Embezzlement (requires job)
- Tax evasion
- Fraud, identity theft
- Money laundering
- Insurance fraud
- Insider trading

**Drug Crime:**
- Drug dealing
- Drug manufacturing
- Drug trafficking

**Cyber Crime:**
- Hacking
- Phishing
- Crypto scams

### 12.2 Organized Crime
- **Syndicates**: Mafia, Yakuza, Triads, Cartel, Biker Gang, Irish Mob
- **Joining**: Requires criminal history + age 18+ (or crime talent)
- **Ranks**: Associate → Soldier → Captain → Underboss → Boss
- **Activities**: Extortion, protection racket, heists, smuggling
- **Loyalty missions**: Carry out orders from superiors
- **Betrayal**: Snitch to police, go witness protection
- **Gang wars**: Turf battles

### 12.3 Legal System
- **Arrest**: Police confrontation (flee, fight, surrender)
- **Trial**: Hire lawyer (quality affects outcome)
  - Guilty / Not guilty / Plea bargain / Mistrial
- **Sentencing**: Fine, probation, community service, prison time, death penalty
- **Prison**:
  - Serve time (years pass)
  - Prison events (fights, gangs, friendships)
  - Solitary confinement
  - Good behavior (reduced sentence)
  - Escape attempts (mini-game: navigate maze)
  - Parole hearings
  - Prison jobs
- **Criminal record**: Affects job applications, relationships, travel
- **Lawsuits**: Sue or be sued (civil court)
- **Restraining orders**
- **Witness crimes**: Intervene, report, ignore

---

## 13. Military

### 13.1 Branches
- Army, Navy, Air Force, Marines, Coast Guard

### 13.2 Enlistment
- Age 18+ with high school diploma (enlisted ranks)
- University degree for officer track
- Physical fitness check (health + athleticism)
- Background check (no serious criminal record)

### 13.3 Military Mechanics
- **Ranks**: 
  - Enlisted: E-1 through E-9
  - Officer: O-1 through O-10
- **Deployments**: Sent on missions (success/failure based on stats)
- **Combat**: Minefield/puzzle mini-game during deployment
- **Medals**: Earned through successful deployments
- **Promotions**: Based on time served + deployment success
- **AWOL**: Go absent without leave (consequences)
- **Discharge**: Honorable, general, dishonorable
- **Veterans benefits**: After honorable discharge (healthcare, education)
- **PTSD**: Risk from combat deployments

---

## 14. Activities & Leisure

### 14.1 Daily Activities
- Go for a walk, read a book, watch TV, browse internet
- Visit library (free smarts boost)
- Meditate, journal, nap

### 14.2 Social Activities
- Go to bar/club/party
- Go on vacation (domestic/international)
- Attend concert, museum, sporting event, theater
- Road trip, camping, hiking, fishing
- Host dinner party, BBQ, house party
- Go to the movies

### 14.3 Hobbies & Skills
- Learn instrument (guitar, piano, drums, violin, etc.)
- Painting, drawing, sculpting
- Writing (novels, poetry, blog)
- Photography
- Cooking classes
- Dancing lessons
- Acting classes
- Singing lessons
- Programming / game development
- Gardening
- Woodworking

### 14.4 Sports
**Individual**: Running, swimming, cycling, tennis, golf, martial arts, gymnastics, skateboarding, surfing, skiing, boxing, wrestling

**Team**: Football, basketball, baseball, soccer, hockey, volleyball, cricket, rugby

**Progression**: Casual → School team → College team → Amateur league → Professional

### 14.5 Gambling
- Casino: Slots, blackjack, poker, roulette, baccarat
- Horse racing
- Sports betting
- Lottery tickets
- Bingo
- Online gambling
- Addiction risk from frequent gambling

### 14.6 Emigration & Travel
- **Vacation**: Book trips to different countries
- **Emigrate**: Move to a new country permanently
  - 8 random country options (or select any)
  - Must find new career
  - Property left behind
  - Family may come along (costs extra)
  - Escape legal consequences
- **Study abroad**: Semester in foreign country

---

## 15. Life Events (Random & Triggered)

### 15.1 Event Categories

**Birth & Early Childhood (0–4):**
- Born with condition / talent discovery
- First words, first steps
- Sibling born, pet adopted
- Parent job change, divorce
- Childhood illness

**School Years (5–17):**
- First day of school, new teacher
- Bullying (victim or perpetrator)  
- School play, science fair, spelling bee
- Best friend drama
- First crush, first kiss
- Parent events (promotion, layoff, affair, illness)
- Discovery events (talent, passion, interest)
- Peer pressure (smoking, drinking, skipping school)
- Puberty events
- Driver's license
- Prom
- Part-time job offer

**Young Adult (18–25):**
- University acceptance / rejection
- College parties, dorm life
- First apartment, first car
- Serious relationship
- Career start / job hunting
- Student loan decisions
- Study abroad opportunity
- Quarter-life crisis
- Friend group changes
- Travel opportunities

**Adult (26–49):**
- Marriage proposal / wedding
- Pregnancy / birth of child
- Career promotion / layoff
- Buying first house
- Financial windfall / crisis
- Midlife crisis
- Affair / relationship trouble
- Parent aging / death
- Lawsuit
- Business opportunity
- Existential events

**Middle Age & Beyond (50+):**
- Grandchildren born
- Retirement decision
- Health scares (heart attack, cancer diagnosis)
- Bucket list events
- Legacy planning
- Losing spouse / friends
- Memoir / autobiography
- Downsizing
- Nursing home
- Final wishes

### 15.2 Random Life Events
- Win lottery (small/big)
- Car accident
- House fire
- Natural disaster
- Find money on the street
- Identity stolen
- Witness a crime
- Celebrity encounter
- Jury duty
- Sued by stranger
- Neighbor dispute
- IRS audit
- Receive mysterious package
- Long-lost relative appears
- Viral moment
- Unexpected inheritance
- Pet runs away
- Wrongful arrest
- Discover hidden talent
- Major news event affects life

### 15.3 Annual Conditional Events
- Birthday celebrations (milestone: 18, 21, 30, 40, 50, 60, 65, 70, 80, 90, 100)
- Annual checkup results
- Tax season
- Holiday events
- Anniversary
- Performance review at work

---

## 16. Death & Legacy

### 16.1 Death Causes
- **Health**: Disease, old age (increasing random chance after 60)
- **Violence**: Murder, war, accident, police encounter
- **Self-inflicted**: Substance overdose, risky behavior
- **Random**: Lightning strike, animal attack, freak accident
- **Execution**: Death penalty (in applicable countries)

### 16.2 Death Mechanics
- Death summary screen (life stats, major achievements)
- Obituary generation
- Net worth at death
- Relationships summary
- Years lived, career summary
- Karma score

### 16.3 Legacy / Generational Play
- **Continue as child**: If character had children, play as one of them
- **Inheritance**: Money, assets, and property passed down
  - Based on will (if written) or legal default
  - Estate tax applied
  - Can be contested by siblings
- **Previous lives**: View history of all past lives
- **Family tree**: Track generational progress
- **Dynasty building**: Multi-generation wealth accumulation

---

## 17. Achievements & Ribbons

### 17.1 Life Ribbons (awarded at death)
| Ribbon | Condition |
|--------|-----------|
| **Rich** | Die with $1M+ net worth |
| **Loaded** | Die with $10M+ net worth |
| **Billionaire** | Die with $1B+ net worth |
| **Famous** | Die with 80+ fame |
| **Successful** | High career achievement |
| **Academic** | All degrees earned |
| **Mediocre** | Average everything |
| **Wasteful** | Went from rich to broke |
| **Fertile** | 10+ children |
| **Lonely** | No close relationships |
| **Scandalous** | Multiple divorces + affairs |
| **Criminal** | Extensive criminal record |
| **Heroic** | Military medals + saved lives |
| **Generous** | Donated $1M+ |
| **Stupid** | Died from preventable cause |
| **Addict** | Died from substance abuse |
| **Jailbird** | Spent 20+ years in prison |
| **Mooch** | Never had a job |
| **Globetrotter** | Visited 20+ countries |
| **Cat/Dog Person** | Owned 10+ pets |
| **Family Person** | High relationship with all family |
| **Cunning** | Rose through crime ranks to Boss |
| **Houdini** | Escaped prison 3+ times |
| **Centennial** | Lived to 100+ |
| **Unlucky** | Died under age 10 |
| **Geriatric** | Lived to 120+ |
| **Model Citizen** | 80+ karma, no crimes |

### 17.2 Milestone Achievements
- First job, first relationship, first child, first home
- Graduate high school / university / professional school
- Reach $100K / $1M / $10M / $100M / $1B
- Get married, get divorced
- Commit first crime, go to prison, escape prison
- Join military, complete deployment
- Become famous
- Start a business
- Visit 10 countries
- Live to 80 / 90 / 100

---

## 18. UI & Rendering

### 18.1 Screen Layout (Mobile-First)
```
┌──────────────────────────────────┐
│  ╔══════════════════════════════╗ │
│  ║  [NAME]  Age: XX  [$XXXXX] ║ │
│  ╚══════════════════════════════╝ │
│                                  │
│  ████████████████░░░░ Health  75 │
│  ██████████████████░░ Happy   85 │
│  ████████████░░░░░░░░ Smarts  55 │
│  ██████████████████░░ Looks   82 │
│  ████████████████░░░░ Karma   70 │
│                                  │
│  ┌─────────────────────────────┐ │
│  │                             │ │
│  │   [EVENT TEXT / STORY]      │ │
│  │                             │ │
│  └─────────────────────────────┘ │
│                                  │
│  ┌─────────┐  ┌─────────┐       │
│  │ CHOICE  │  │ CHOICE  │       │
│  │   A     │  │   B     │       │
│  └─────────┘  └─────────┘       │
│  ┌─────────┐  ┌─────────┐       │
│  │ CHOICE  │  │ CHOICE  │       │
│  │   C     │  │   D     │       │
│  └─────────┘  └─────────┘       │
│                                  │
│  ┌────┬────┬────┬────┬────┐     │
│  │ ⌛ │ 💼 │ 🎒 │ ❤️ │ ≡  │     │
│  │Age │Work│Edu │Rel │More│     │
│  └────┴────┴────┴────┴────┘     │
└──────────────────────────────────┘
```

### 18.2 Navigation Tabs
| Tab | Contents |
|-----|----------|
| **Age** | Age up button, current year summary, life log |
| **Career** | Job info, apply, work harder, quit, side hustles |
| **Education** | School info, study, clubs, grades |
| **Relationships** | All NPCs, interaction menus |
| **Activities** | Leisure, sports, hobbies, travel, mind & body |
| **Assets** | Properties, vehicles, items, investments |
| **Crime** | Crime options, organized crime, legal status |
| **Settings** | Save/load, sound, half-year mode |

### 18.3 UI Components
- **StatBar**: ASCII-style progress bar with label + value
- **ChoiceCard**: Bordered card with text, swipeable on mobile
- **EventCard**: Scrollable text with icon, title, description
- **ActionMenu**: Grid of action buttons with icons
- **Notification**: Pop-up toast for stat changes, achievements
- **Modal**: For complex interactions (dating, shopping, court)
- **ListItem**: For relationship/asset/job listings
- **LifeLog**: Scrollable history of all events

### 18.4 Visual Style
- **Font**: Monospace (JetBrains Mono or similar, loaded from CDN)
- **Colors**: 
  - Background: `#0a0a0a` (near black)
  - Text: `#e0e0e0` (light gray)
  - Accent: `#00ff00` (terminal green)
  - Warning: `#ff4444` (red)
  - Success: `#44ff44` (bright green)
  - Info: `#4444ff` (blue)
  - Gold: `#ffd700` (achievements)
- **Borders**: 2px solid, box-drawing characters where possible
- **Animations**: CSS-only, minimal (stat bar changes, card flip, slide-in)
- **Icons**: Unicode/ASCII only (no images)
- **No gradients**, no shadows, no rounded corners (brutalist)

---

## 19. Save System & Persistence

### 19.1 Auto-Save
- Save to LocalStorage after every turn
- Serialized as JSON (compressed if needed)
- Max save slots: 3

### 19.2 Save Data Structure
```typescript
interface SaveData {
  version: string          // for migration
  gameState: GameState
  settings: UserSettings
  timestamp: number
}
```

### 19.3 Features
- Auto-save on every age-up
- Manual save/load from settings
- Export save as file (download JSON)
- Import save from file
- New game (fresh start)
- Save migration system (version upgrades)

---

## 20. Content Pipeline

### 20.1 Event JSON Format
```json
{
  "id": "first_kiss",
  "title": "First Kiss",
  "description": "Your crush {crush_name} leans in close after school...",
  "icon": "💋",
  "category": "relationships",
  "minAge": 13,
  "maxAge": 17,
  "weight": 40,
  "cooldown": 0,
  "unique": true,
  "conditions": [
    { "type": "flag", "target": "had_first_kiss", "operator": "not_has" },
    { "type": "relationship", "target": "crush", "operator": "has" },
    { "type": "stat", "target": "looks", "operator": "gte", "value": 30 }
  ],
  "choices": [
    {
      "text": "Kiss them back",
      "effects": [
        { "type": "stat", "target": "happiness", "operation": "add", "value": 15 },
        { "type": "flag", "target": "had_first_kiss", "operation": "set", "value": true },
        { "type": "relationship", "target": "crush", "operation": "modify", "value": 20 }
      ],
      "outcomes": [
        {
          "chance": 0.8,
          "description": "It was magical! You'll remember this forever.",
          "effects": [{ "type": "stat", "target": "happiness", "operation": "add", "value": 5 }]
        },
        {
          "chance": 0.2,
          "description": "You bumped noses awkwardly, but it was still sweet.",
          "effects": []
        }
      ]
    },
    {
      "text": "Turn away nervously",
      "effects": [
        { "type": "stat", "target": "happiness", "operation": "add", "value": -5 },
        { "type": "relationship", "target": "crush", "operation": "modify", "value": -10 }
      ]
    },
    {
      "text": "Run away in panic",
      "effects": [
        { "type": "stat", "target": "happiness", "operation": "add", "value": -10 },
        { "type": "relationship", "target": "crush", "operation": "modify", "value": -25 },
        { "type": "flag", "target": "crush_rejected", "operation": "set", "value": true }
      ]
    }
  ]
}
```

### 20.2 Content Goals
Target content volume for BitLife parity:

| Category | Event Count |
|----------|-------------|
| Childhood (0-4) | 40+ |
| School (5-17) | 120+ |
| Education (18+) | 60+ |
| Career | 100+ |
| Relationships | 150+ |
| Health | 80+ |
| Crime | 60+ |
| Military | 30+ |
| Finance | 50+ |
| Random life | 200+ |
| Fame | 40+ |
| Activities/Hobby | 60+ |
| Death/Legacy | 30+ |
| **TOTAL** | **1000+** |

### 20.3 Dynamic Text
Events support template variables:
- `{name}` — Character name
- `{partner_name}` — Current partner
- `{boss_name}` — Current boss
- `{city}` — Current city
- `{country}` — Current country
- `{career}` — Current job title
- `{school}` — Current school
- `{age}` — Current age
- `{pronoun_he}` / `{pronoun_she}` / `{pronoun_they}` — Gender pronouns
- `{random_name}` — Generate random NPC name
- `{random_amount:min:max}` — Random dollar amount

---

## 21. Implementation Phases

### Phase 1 — Foundation (Core Engine) 
**Goal**: Playable skeleton — one turn of life works.
- [ ] Project setup (Vite + TypeScript)
- [ ] GameState data structure
- [ ] EventBus pub/sub
- [ ] ConditionSystem (basic: stat, age, flag, random)
- [ ] EffectSystem (basic: stat, flag, money)
- [ ] TimeSystem (age up)
- [ ] ContentRegistry (load JSON)
- [ ] EventSelector (weighted random)
- [ ] Basic UI: stat bars, event card, choice cards
- [ ] 10 test events across 3 categories
- [ ] CSS theme (brutalist base)

### Phase 2 — Character & Life Basics
**Goal**: Complete life from birth to death.
- [ ] Character creation screen (name, gender, country)
- [ ] Parent/family generation
- [ ] Life stage transitions
- [ ] Death system (health 0, old age, random)
- [ ] Death screen with life summary
- [ ] Basic stat decay/growth per age
- [ ] Save/load system (LocalStorage)
- [ ] Life log (scrollable history)
- [ ] 50+ events covering all life stages
- [ ] Birth events, childhood events, death events

### Phase 3 — Relationships
**Goal**: Full NPC interaction system.
- [ ] NPC data model
- [ ] Relationship types (family, friends, romantic)
- [ ] NPC aging and death
- [ ] Interaction menus (talk, gift, argue, etc.)
- [ ] Dating system (meet people, date, break up)
- [ ] Marriage & divorce
- [ ] Children (pregnancy, birth, raise)
- [ ] Relationship tab UI
- [ ] 100+ relationship events
- [ ] Pet system

### Phase 4 — Education
**Goal**: Full schooling pipeline.
- [ ] School enrollment system
- [ ] Grades & studying mechanics
- [ ] All education levels (preschool → professional school)
- [ ] University majors
- [ ] Scholarships & student loans
- [ ] School activities (clubs, sports, prom)
- [ ] Drop out / expulsion
- [ ] Education tab UI
- [ ] 60+ school events

### Phase 5 — Careers
**Goal**: Full employment system.
- [ ] Job listings & application system
- [ ] All career tiers (Tier 0-5)
- [ ] Performance & promotion system
- [ ] Salary & income
- [ ] Coworker/boss interactions
- [ ] Quit / fired mechanics
- [ ] Side hustles
- [ ] Entrepreneurship basics
- [ ] Career tab UI
- [ ] 80+ career events

### Phase 6 — Crime & Military
**Goal**: Alternate life paths.
- [ ] Crime actions (all categories)
- [ ] Arrest & trial system
- [ ] Prison system (serve time, events, escape)
- [ ] Criminal record effects
- [ ] Organized crime (join, ranks, missions)
- [ ] Military enlistment & officer track
- [ ] Deployments & combat
- [ ] Military ranks & medals
- [ ] Crime & military UI
- [ ] 60+ crime events, 30+ military events

### Phase 7 — Finance & Assets
**Goal**: Full economic simulation.
- [ ] Banking system (savings, interest)
- [ ] Expenses system (monthly costs)
- [ ] Tax system
- [ ] Assets (houses, cars, boats, aircraft)
- [ ] Investment system (stocks, crypto, bonds)
- [ ] Gambling (casino, lottery, betting)
- [ ] Debt & loans
- [ ] Insurance
- [ ] Will system
- [ ] Assets tab UI
- [ ] 50+ finance events

### Phase 8 — Health & Activities
**Goal**: Rich daily life actions.
- [ ] Disease & injury system
- [ ] Doctor visits & treatment
- [ ] Gym, diet, martial arts
- [ ] Plastic surgery
- [ ] Addiction system (substances + gambling)
- [ ] Rehab & recovery
- [ ] Mental health conditions & therapy
- [ ] Hobbies & skills
- [ ] Travel & vacation
- [ ] Activities tab UI 
- [ ] 80+ health events, 60+ activity events

### Phase 9 — Fame & Social Media
**Goal**: Celebrity lifestyle.
- [ ] Fame meter & decay
- [ ] Fame career paths
- [ ] Social media accounts & followers
- [ ] Endorsements & brand deals
- [ ] Talk shows, scandals, paparazzi
- [ ] Viral events
- [ ] 40+ fame events

### Phase 10 — Legacy & Polish
**Goal**: Multi-generational play & final polish.
- [ ] Legacy system (continue as child)
- [ ] Inheritance & estate
- [ ] Family tree viewer
- [ ] Achievement & ribbon system
- [ ] Country system (10+ countries with unique laws)
- [ ] Tutorial / onboarding
- [ ] Settings (half-year aging, sound)
- [ ] Performance optimization (<15KB gzipped)
- [ ] Mobile responsiveness pass
- [ ] Content pass (reach 1000+ events)
- [ ] Bug fixes & balance tuning

---

## Content Totals Summary

| System | Unique Events | Choices Per Event (avg) | Total Choices |
|--------|---------------|------------------------|---------------|
| Childhood | 40 | 3 | 120 |
| School | 120 | 3 | 360 |
| Career | 100 | 3 | 300 |
| Relationships | 150 | 3 | 450 |
| Health | 80 | 3 | 240 |
| Crime | 60 | 3 | 180 |
| Military | 30 | 3 | 90 |
| Finance | 50 | 3 | 150 |
| Fame | 40 | 3 | 120 |
| Activities | 60 | 2 | 120 |
| Random Life | 200 | 3 | 600 |
| Death/Legacy | 30 | 2 | 60 |
| **TOTAL** | **960+** | — | **2,790+** |

> **This plan delivers ~1000 unique events with ~2800 individual choices, matching or exceeding BitLife's content density, all driven by JSON data with zero code changes needed to add more content.**

---

## Performance Budget

| Metric | Target |
|--------|--------|
| Bundle size (gzipped) | < 15KB (code only) |
| Content size (gzipped) | < 50KB (all JSON) |
| First paint | < 500ms on 3G |
| Interaction response | < 100ms |
| Memory usage | < 10MB |
| Lighthouse performance | 100 |
