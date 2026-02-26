# DigiLife — Politician Career Path: Full Implementation Plan

> A comprehensive plan for implementing the Politician career as a deep, branching career path with maximum player freedom — from local politics to leading (or overthrowing) a government.

---

## Table of Contents

1. [Overview & Design Philosophy](#1-overview--design-philosophy)
2. [Architecture Changes](#2-architecture-changes)
3. [Political State Model](#3-political-state-model)
4. [Career Progression Ladder](#4-career-progression-ladder)
5. [Campaign & Election System](#5-campaign--election-system)
6. [Governance & Approval System](#6-governance--approval-system)
7. [Political Actions & Activities](#7-political-actions--activities)
8. [Political Events (JSON Content)](#8-political-events-json-content)
9. [Scandal & Corruption System](#9-scandal--corruption-system)
10. [Authoritarian Pathways](#10-authoritarian-pathways)
11. [Political Relationships & Factions](#11-political-relationships--factions)
12. [Integration with Existing Systems](#12-integration-with-existing-systems)
13. [Content Files & JSON Schemas](#13-content-files--json-schemas)
14. [Implementation Phases](#14-implementation-phases)
15. [Testing Plan](#15-testing-plan)

---

## 1. Overview & Design Philosophy

### Core Vision
The Politician career is not a linear job ladder like Engineering or Law. It is a **branching political simulation** where the player navigates elections, governance, scandals, and power struggles. The player should feel agency at every level — they can be a noble public servant, a corrupt power-broker, a populist demagogue, or a revolutionary dictator.

### Design Principles

1. **Maximum Freedom**: Every political rank opens multiple forward paths. No single "correct" route.
2. **Consequences Matter**: Corruption, scandal, and authoritarian moves carry real risk.
3. **Data-Driven**: All political positions, events, and campaign scenarios live in JSON. New countries/government-types are added by editing JSON, not engine code.
4. **Integrated**: Politics touches relationships (allies, rivals, lobbyists), finances (campaign funds, bribes), education (Political Science / Law degrees help), and fame.
5. **Replayable**: Different countries, different government structures, different ideologies — each playthrough feels unique.

### What Makes This Different from Other Careers
| Aspect | Normal Career | Politician Career |
|--------|--------------|-------------------|
| Entry | Apply → Hired | Campaign → Win Election (or appointed) |
| Advancement | Performance → Promotion | Win higher elections / consolidate power |
| Income | Salary | Salary + fundraising + optional corruption |
| Failure | Fired | Lose election / impeached / overthrown |
| End-game | Retire | President / Dictator / King / Revolutionary |

---

## 2. Architecture Changes

### 2.1 New Files to Create

```
src/
├── systems/
│   └── PoliticalSystem.ts          # Core political logic
├── content/
│   ├── politics/
│   │   ├── positions.json          # All political positions by government type
│   │   ├── ideologies.json         # Political ideologies and their effects
│   │   ├── policies.json           # Policy decisions and consequences
│   │   ├── scandals.json           # Scandal templates
│   │   └── government_types.json   # Government system definitions
│   └── events/
│       └── political.json          # Political random events
```

### 2.2 GameState Extension

Add a new `PoliticalState` interface to `src/core/GameState.ts`:

```typescript
export interface PoliticalState {
  active: boolean;
  currentPosition: string | null;      // e.g. 'city_council', 'governor', 'president'
  positionTitle: string | null;         // Display title
  positionLevel: number;                // 0=none, 1=local, 2=state, 3=national, 4=head of state, 5=supreme
  yearsInOffice: number;
  termsServed: number;
  totalPoliticalYears: number;

  // Core political stats (0-100)
  approvalRating: number;
  influence: number;                    // Political capital / clout
  campaignFunds: number;                // Cash reserved for campaigns (separate from personal cash)
  partyLoyalty: number;                 // Standing within your party

  // Political identity
  party: string | null;                 // e.g. 'Progressive', 'Conservative', 'Independent'
  ideology: string | null;             // e.g. 'populist', 'moderate', 'radical'

  // Governance track
  policiesEnacted: string[];           // IDs of enacted policies
  legislativeRecord: number;           // Bills passed / supported
  vetoes: number;

  // Dark side
  corruptionLevel: number;             // 0-100, hidden accumulation
  scandalsExposed: number;
  underInvestigation: boolean;
  impeachmentRisk: number;             // 0-100

  // Authoritarian track
  authoritarianScore: number;          // 0-100, accumulated from authoritarian actions
  militaryControl: number;             // 0-100, control over armed forces
  mediaControl: number;                // 0-100, control over press / propaganda
  oppositionStrength: number;          // 0-100, how strong the opposition is
  governmentType: string;              // 'democracy' | 'authoritarian' | 'dictatorship' | 'monarchy' | 'theocracy'
  dynastyEstablished: boolean;

  // Campaign state (active during election cycles)
  campaignActive: boolean;
  targetPosition: string | null;
  campaignBudget: number;
  endorsements: string[];              // IDs of endorsing NPCs/orgs
  debatesWon: number;
  ralliesHeld: number;

  // Relationships (political)
  allies: string[];                    // NPC IDs
  rivals: string[];                    // NPC IDs
  lobbyists: string[];                 // NPC IDs

  // Flags
  hasRunForOffice: boolean;
  hasLostElection: boolean;
  hasBeenImpeached: boolean;
  hasStagedCoup: boolean;
  hasDeclaredMartialLaw: boolean;
  isTermLimited: boolean;
}
```

### 2.3 Engine Changes (`src/core/Engine.ts`)

Add to the annual tick order (after `processCareerYear`, before `processSerialKillerYear`):

```typescript
import { processPoliticalYear } from '../systems/PoliticalSystem';
// ...
// In ageUp():
processPoliticalYear(this.state);
```

Add political state initialization in `loadState()` for backward compatibility.

### 2.4 Renderer Changes (`src/ui/Renderer.ts`)

- Add a **"Politics"** tab/button in the main game screen action bar (alongside Activities, Relationships, Career).
- The Politics menu renders: current office info, available political actions, campaign panel, governance panel.
- Conditionally visible: only after age 18 or if the player has the 'Political' talent (visible from age 16).

### 2.5 Main.ts Changes

- Import and register political content JSON files.
- Register political events with the EventRegistry.

### 2.6 EffectSystem Extension

Add new effect types to `src/core/EffectSystem.ts`:

```typescript
case 'political': {
  // Modify political stats
  // e.g. { type: 'political', target: 'approvalRating', operation: 'add', value: 10 }
  break;
}
```

### 2.7 ConditionSystem Extension

Add new condition types to `src/core/ConditionSystem.ts`:

```typescript
case 'political': {
  // Check political state
  // e.g. { type: 'political', target: 'positionLevel', operator: 'gte', value: 3 }
  break;
}
```

---

## 3. Political State Model

### 3.1 Position Hierarchy

```
Level 0: Civilian (no political office)
Level 1: Local Government
  ├── School Board Member
  ├── City Council Member
  ├── County Commissioner
  └── Mayor

Level 2: State Government
  ├── State Representative
  ├── State Senator
  ├── Lieutenant Governor
  ├── Attorney General (requires law license)
  └── Governor

Level 3: National Government
  ├── U.S. Representative (House)
  ├── U.S. Senator
  ├── Cabinet Secretary (appointed, not elected)
  └── Ambassador (appointed)

Level 4: Head of State
  ├── Vice President
  └── President

Level 5: Supreme Power (authoritarian paths only)
  ├── President-for-Life
  ├── Supreme Leader / Dictator
  ├── Monarch / King / Queen
  └── Revolutionary Chairman
```

### 3.2 Government Types

Each country in the game has a government type that determines available positions and rules:

| Government Type | Head of State | Term Limits | Can Be Overthrown | Succession |
|----------------|---------------|-------------|-------------------|------------|
| **Democracy** | President/PM | Yes (2 terms) | Via impeachment only | Election |
| **Authoritarian** | President | Weak/None | Coup possible | Appointed/rigged election |
| **Dictatorship** | Dictator/Supreme Leader | None | Revolution possible | Self-appointed |
| **Monarchy** | King/Queen | None (life) | Revolution possible | Hereditary (dynasty) |
| **Theocracy** | Supreme Religious Leader | None | Revolution possible | Council appointment |

### 3.3 Political Parties

Parties are generated per-country. The player can:
- **Join** an existing party (boosts resources, limits ideology)
- **Run Independent** (harder to win, total freedom)
- **Found a new party** (requires Level 3+ and high influence)

Party templates:
```json
[
  { "id": "progressive", "name": "Progressive Party", "ideology": "left", "baseSupport": 35 },
  { "id": "conservative", "name": "Conservative Party", "ideology": "right", "baseSupport": 35 },
  { "id": "centrist", "name": "Centrist Alliance", "ideology": "center", "baseSupport": 20 },
  { "id": "libertarian", "name": "Liberty Party", "ideology": "libertarian", "baseSupport": 10 },
  { "id": "independent", "name": "Independent", "ideology": "none", "baseSupport": 0 }
]
```

---

## 4. Career Progression Ladder

### 4.1 Entry Requirements by Position

| Position | Min Age | Education | Min Smarts | Min Willpower | Other Requirements |
|----------|---------|-----------|------------|---------------|-------------------|
| School Board | 18 | High School | 40 | 35 | None |
| City Council | 21 | High School | 45 | 40 | None |
| County Commissioner | 21 | High School | 45 | 40 | None |
| Mayor | 25 | Bachelor preferred | 50 | 45 | 1+ year political experience |
| State Rep | 25 | Bachelor preferred | 55 | 50 | 2+ years political experience |
| State Senator | 30 | Bachelor | 58 | 52 | 3+ years political experience |
| Lt. Governor | 30 | Bachelor | 60 | 55 | 4+ years, state-level exp |
| Attorney General | 30 | Law License | 65 | 55 | Bar license required |
| Governor | 30 | Bachelor | 62 | 58 | 5+ years, state-level exp OR mayor exp |
| US Representative | 25 | Bachelor | 60 | 55 | 4+ years political experience |
| US Senator | 30 | Bachelor | 65 | 60 | 6+ years, national or governor exp |
| Vice President | 35 | Bachelor | 68 | 62 | Selected by president (or elected) |
| President | 35 | Bachelor | 70 | 65 | 8+ years, senator or governor exp |

### 4.2 Common Progression Paths

**The Public Servant Path** (clean, democratic, high-karma):
```
School Board → City Council → Mayor → State Senator → Governor → President
```

**The Lawyer-Politician Path**:
```
Law Degree → Attorney General → State Senator → US Senator → President
```

**The Populist Fast-Track** (high looks, high charisma, low experience):
```
Celebrity/Fame → City Council → Governor → President
  (Skips levels via high approval & fame, but risky)
```

**The Dark Horse Path** (independent, grassroots):
```
Community Organizer → City Council → US Representative → US Senator → President
  (Harder, no party support, relies on high smarts + approval)
```

**The Authoritarian Path** (low karma, high craziness):
```
Mayor → Governor → President → Declare Emergency → Suspend Elections → Dictator
```

**The Revolutionary Path** (military or popular uprising):
```
Any Position → Build Military Control → Stage Coup → Supreme Leader → Dictator/Monarch
```

**The Dynasty Path**:
```
President/Dictator → Establish Monarchy → Crown Self King/Queen → Pass to Heir
  (Requires dynasty flag; integrates with Phase 8 multi-generational play)
```

---

## 5. Campaign & Election System

### 5.1 Campaign Phases

Each election follows a structured campaign:

**Phase 1: Declaration (1 action)**
- Announce candidacy for target position
- Costs: filing fee ($500 - $50,000 depending on level)
- Sets `campaignActive = true`

**Phase 2: Fundraising (ongoing)**
- Actions: Host fundraiser, Call donors, Online campaign, PAC outreach
- Campaign funds accumulate separately from personal wealth
- Larger war chest = better ad buys = higher win chance
- Corruption option: Accept dark money (boosts funds, increases corruption)

**Phase 3: Campaigning (ongoing)**
- Actions: Hold rally, Canvas neighborhoods, Run ads, Give speech
- Each action costs campaign funds + time budget
- Builds approval and name recognition

**Phase 4: Debate (event)**
- Triggered automatically before election
- Player makes choices (aggressive, moderate, deflect, personal attack)
- Outcomes affect approval rating and media coverage
- Smarts and willpower checks determine debate performance

**Phase 5: Election Day (resolution)**
- Win probability calculated from:
  - Approval rating (35% weight)
  - Campaign funds vs opponent (20% weight)
  - Party base support (15% weight)
  - Endorsements (10% weight)
  - Smarts + Looks + Willpower composite (10% weight)
  - Incumbent advantage if applicable (5% weight)
  - Random factor (5% weight)
- Player can also choose to rig the election (very high risk, corruption spike)

### 5.2 Election Outcome Effects

**Win:**
- Assume office, salary set, approval starts at 55-65
- History log celebration
- Party loyalty boost
- Influence boost

**Lose:**
- Happiness drop
- Can try again next cycle (or different position)
- "Graceful concession" vs "Contest results" choice
  - Contest: small chance of recount win, big approval hit if fails
  - Concede: karma boost, maintain political viability

**Lose + Contest + Fail:**
- Reputation damaged
- Can trigger investigation event

### 5.3 Win Probability Formula

```
baseChance = 0.30
+ (approvalRating / 100) * 0.35
+ (fundingAdvantage) * 0.20        // ratio of your funds vs opponent
+ (partyBaseSupport / 100) * 0.15
+ (endorsementBonus) * 0.10        // 0.02 per endorsement, capped at 0.10
+ (statComposite / 100) * 0.10     // avg of smarts, looks, willpower
+ (incumbentBonus) * 0.05          // 0.05 if incumbent, else 0
+ (random -0.05 to +0.05)

// Modifiers
if (hasScandal) chance -= 0.15
if (rigged) chance += 0.25 but corruptionLevel += 30
if (opponent.isWeak) chance += 0.10

// Clamp to 0.05 - 0.95 (never guaranteed)
```

---

## 6. Governance & Approval System

### 6.1 Approval Rating Mechanics

Approval rating (0-100) is the single most important political stat. It determines re-election viability and unlocks higher-office runs.

**Approval Modifiers (annual tick):**
```
Base drift: -2 per year (natural decay, governing is hard)
Economy good: +3 to +8 (random, simulates economic conditions)
Economy bad: -5 to -15
Policy popular: +2 to +5 per enacted popular policy
Policy unpopular: -3 to -8 per enacted unpopular policy
Scandal exposed: -10 to -30 (severity dependent)
Crisis handled well: +5 to +15
Crisis handled poorly: -10 to -20
High charisma (looks > 70): +2
Low charisma (looks < 30): -2
War/conflict: +5 initially (rally effect), -3 per year ongoing
```

### 6.2 Governance Actions (while in office)

| Action | Time Cost | Effect | Risk |
|--------|-----------|--------|------|
| **Enact Policy** | 2 | Choose from available policies; affects approval, economy | Unpopular policy = approval drop |
| **Veto Bill** | 1 | Block legislation; polarizes approval | Alienates party or opposition |
| **Give Public Address** | 1 | +2-5 approval if speech goes well | Gaffe chance (smarts check) |
| **Meet Constituents** | 2 | +1-3 approval, +influence | Low risk |
| **Negotiate Deal** | 2 | +influence, potential policy win | Can backfire |
| **Appoint Ally** | 1 | +partyLoyalty, ally gets position | Cronyism scandal risk |
| **Fire Official** | 1 | Remove underperformer/rival | Controversy, -approval if popular |
| **Accept Lobbyist Meeting** | 1 | +campaignFunds, +corruptionLevel | Corruption exposure risk |
| **Investigate Opponent** | 2 | Dirt on rival, -opponent influence | Can backfire spectacularly |
| **Declare State of Emergency** | 1 | Bypass normal governance, +power | Major approval split, authoritarian flag |
| **Purge Rivals** | 2 | Remove opposition from positions | Only in authoritarian mode, very risky |

### 6.3 Policy System

Policies are defined in `policies.json`. Each policy has:

```json
{
  "id": "universal_healthcare",
  "name": "Universal Healthcare Act",
  "description": "Establish government-funded healthcare for all citizens.",
  "ideology": "left",
  "minLevel": 3,
  "approvalEffect": { "left": 15, "center": 3, "right": -10 },
  "economyEffect": -5,
  "karmaEffect": 10,
  "prerequisitePolicies": [],
  "conflictsPolicies": ["privatize_healthcare"]
}
```

---

## 7. Political Actions & Activities

### 7.1 Pre-Office Actions (available before holding office)

| Action | Min Age | Time Cost | Effect |
|--------|---------|-----------|--------|
| **Join Political Party** | 16 | 1 | Sets party affiliation |
| **Volunteer for Campaign** | 16 | 2 | +political experience, +influence |
| **Attend Political Rally** | 16 | 1 | +political awareness flag |
| **Join Student Government** | 14 | 2 | +smarts, +political experience |
| **Intern at City Hall** | 16 | 3 | +political experience, +influence |
| **Community Organizing** | 18 | 2 | +influence, +karma, +political experience |
| **Run for Office** | 18+ | 2 | Start campaign (see §5) |

### 7.2 In-Office Actions

See §6.2 above for governance actions.

### 7.3 Political Activities (added to ActivitySystem)

These are activities available at new locations:

**Location: Capitol** (travel action, like Arena)
- Lobby for Bill (influence + legislative record)
- Negotiate Coalition (influence + partyLoyalty)
- Press Conference (approval ± random)
- Backroom Deal (influence + corruption risk)

**Location: Campaign HQ** (available during campaigns)
- Phone Bank (approval + small)
- Strategy Meeting (optimize campaign)
- Fundraiser Call (campaign funds)
- Opposition Research (dirt on opponent)

---

## 8. Political Events (JSON Content)

### 8.1 Event Categories

Events are added to `src/content/events/political.json`. They use the existing `GameEvent` schema with political conditions.

#### Early Political Events (age 16-25)
- **Student Election** (age 14-18, unique): Run for class president
- **Political Awakening** (age 16-22): Attend a protest / get inspired by a speech
- **Interppronship Offer** (age 18-22): Congressional/parliamentary internship offer
- **Campus Activism** (age 18-24): Lead a campus movement

#### Campaign Events (triggered during active campaigns)
- **Debate Night**: Multi-choice debate with stat-based outcomes
- **Scandal Leak**: Opposition leaks dirt — respond or ignore
- **Endorsement Offer**: Celebrity/organization offers endorsement (accept/decline)
- **Fundraiser Gala**: High-rollers fundraiser with corruption temptation
- **Smear Campaign**: Opponent attacks — retaliate, take high road, or expose their dirt
- **Media Interview**: Handle tough questions (smarts check)
- **Viral Moment**: Something you said goes viral (positive or negative)
- **October Surprise**: Last-minute bombshell that can swing the election

#### Governance Events (triggered while holding office)
- **Economic Crisis**: Handle recession — austerity vs stimulus
- **Natural Disaster**: Emergency response — approval swings based on response
- **Foreign Affairs Crisis**: Diplomatic incident — hawk vs dove choice
- **Whistleblower**: Government misconduct exposed — cover up or transparency
- **Assassination Attempt**: Survived (health check, approval spike)
- **Impeachment Vote**: Triggered by high corruption/scandal exposure
- **Military Conflict**: Go to war, negotiate peace, or ignore
- **Budget Battle**: Allocate resources — every choice angers someone
- **Supreme Court Vacancy**: Appoint justice — ideological consequences
- **Pandemic**: Public health crisis management

#### Authoritarian Events (triggered by high authoritarian score)
- **Consolidate Power**: Opportunity to remove term limits
- **Control the Press**: Shut down critical media outlet
- **Purge the Party**: Remove internal dissidents
- **Military Parade**: Show of force (+militaryControl, -opposition approval)
- **Rigged Referendum**: Hold sham vote to legitimize power grab
- **Revolution Brewing**: Opposition organizing against you
- **Palace Coup Attempt**: Allies try to betray you
- **International Sanctions**: World reacts to your authoritarian moves
- **Declare Yourself Monarch**: Ultimate power move (requires very high military+media control)

#### Scandal Events
- **Bribery Accusation**: Accept/deny/confess
- **Affair Exposed**: Political + personal fallout
- **Tax Evasion Discovery**: Financial scandal
- **Insider Trading**: Stock market abuse exposed
- **Campaign Finance Violation**: Illegal donations traced
- **Leaked Communications**: Private messages made public
- **Nepotism Accusation**: Appointed family member to position
- **Abuse of Power**: Used office for personal gain

### 8.2 Example Event JSON

```json
{
  "id": "political_debate_night",
  "title": "The Big Debate",
  "description": "You're on stage for a televised debate against your opponent. The cameras are rolling and millions are watching.",
  "icon": "🎙️",
  "category": "political",
  "minAge": 25,
  "maxAge": 80,
  "weight": 80,
  "unique": false,
  "conditions": [
    { "type": "political", "target": "campaignActive", "operator": "eq", "value": true }
  ],
  "choices": [
    {
      "text": "Attack your opponent's record aggressively",
      "outcomes": [
        {
          "chance": 0.4,
          "description": "Your attacks landed perfectly. The audience is fired up!",
          "effects": [
            { "type": "political", "target": "approvalRating", "operation": "add", "value": 8 },
            { "type": "political", "target": "debatesWon", "operation": "add", "value": 1 }
          ]
        },
        {
          "chance": 0.35,
          "description": "Your opponent countered effectively. It's a draw.",
          "effects": [
            { "type": "political", "target": "approvalRating", "operation": "add", "value": 1 }
          ]
        },
        {
          "chance": 0.25,
          "description": "You came across as mean-spirited. The audience booed.",
          "effects": [
            { "type": "political", "target": "approvalRating", "operation": "add", "value": -6 },
            { "type": "stat", "target": "karma", "operation": "add", "value": -5 }
          ]
        }
      ]
    },
    {
      "text": "Stay calm and present your policies clearly",
      "outcomes": [
        {
          "chance": 0.6,
          "description": "Your composure impressed the audience. You looked presidential.",
          "effects": [
            { "type": "political", "target": "approvalRating", "operation": "add", "value": 5 },
            { "type": "political", "target": "debatesWon", "operation": "add", "value": 1 }
          ]
        },
        {
          "chance": 0.4,
          "description": "Your answers were solid but forgettable. No major impact.",
          "effects": [
            { "type": "political", "target": "approvalRating", "operation": "add", "value": 1 }
          ]
        }
      ]
    },
    {
      "text": "Make an outrageous populist promise",
      "outcomes": [
        {
          "chance": 0.5,
          "description": "The crowd goes wild! Your promise dominated the news cycle.",
          "effects": [
            { "type": "political", "target": "approvalRating", "operation": "add", "value": 12 },
            { "type": "stat", "target": "karma", "operation": "add", "value": -10 }
          ]
        },
        {
          "chance": 0.5,
          "description": "Fact-checkers destroyed your claim. You look like a fraud.",
          "effects": [
            { "type": "political", "target": "approvalRating", "operation": "add", "value": -10 }
          ]
        }
      ]
    }
  ]
}
```

---

## 9. Scandal & Corruption System

### 9.1 Corruption Accumulation

Corruption (0-100) is a hidden stat that accumulates through:
- Accepting lobbyist money: +5–15
- Rigging elections: +25–35
- Accepting bribes: +10–20
- Appointing cronies: +5–10
- Cover-ups: +10–15
- Using office for personal enrichment: +10–20

### 9.2 Scandal Exposure Mechanics

Each year while in office, there's a chance a scandal is exposed:

```
exposureChance = (corruptionLevel / 100) * 0.3
                + (mediaFreedom / 100) * 0.2    // higher media freedom = more likely exposed
                + (oppositionStrength / 100) * 0.1
                - (mediaControl / 100) * 0.15   // if you control media, harder to expose
```

When exposed:
- Approval drops 10-30 based on severity
- Investigation may start
- Can lead to impeachment at high levels
- Player choices: Deny (risky), Confess (approval hit but contained), Blame others (karma hit)

### 9.3 Impeachment Process

Triggered when:
- `corruptionLevel > 60` AND scandal exposed
- OR 3+ scandals exposed in single term
- OR specific "abuse of power" events

Process:
1. **Investigation Phase**: Player can obstruct (more corruption) or cooperate
2. **Vote Phase**: Based on party loyalty, approval, evidence
3. **Outcome**: Acquitted (survive but weakened), Convicted (removed from office, career setback)

---

## 10. Authoritarian Pathways

### 10.1 The Path to Absolute Power

This is the dark endgame, available only from Level 4+ (Head of State). The player can gradually dismantle democratic institutions.

**Step 1: State of Emergency** (requires crisis event or manufactured crisis)
- Declare emergency powers
- Bypass legislature temporarily
- `authoritarianScore += 15`

**Step 2: Extend Emergency / Suspend Elections**
- Require `authoritarianScore > 25`
- Suspend upcoming elections
- `oppositionStrength` check — if high, protests/rebellion

**Step 3: Control the Media**
- Shut down critical outlets
- Install propaganda apparatus
- `mediaControl += 20-30`

**Step 4: Purge Political Opponents**
- Remove rival politicians from office
- Imprison opposition leaders
- `oppositionStrength -= 20-30`

**Step 5: Military Consolidation**
- Replace military leaders with loyalists
- `militaryControl += 20-30`
- Required for coup defense

**Step 6: Declare New Government Type**
- Options:
  - **President-for-Life**: Remove term limits, stay in power indefinitely
  - **Supreme Leader / Dictator**: Dissolve legislature, rule by decree
  - **Monarch**: Establish hereditary rule, crown yourself King/Queen
  - **Theocratic Leader**: Establish religious governance (if high karma + faith flags)
  - **Revolutionary Chairman**: Establish new ideological government

### 10.2 Coup d'État (Player-Initiated)

Available from any Level 2+ position if:
- `militaryControl > 50` OR strong military NPC allies
- `craziness > 40` OR `willpower > 70`

Process:
1. **Plot**: Recruit military allies (relationship checks)
2. **Execute**: Success based on `militaryControl`, `oppositionStrength`, random
3. **Outcomes**:
   - **Success**: Become Supreme Leader, `authoritarianScore = 100`
   - **Failure**: Arrested, imprisonment, political career over (or death)

### 10.3 Revolution (Counter-Coup)

If the player is a dictator/monarch, revolution can occur:

```
revolutionChance = (100 - approvalRating) / 100 * 0.2
                 + (oppositionStrength / 100) * 0.3
                 - (militaryControl / 100) * 0.25
                 - (mediaControl / 100) * 0.1
```

Outcomes:
- **Survive**: Opposition crushed, tighter grip
- **Overthrown**: Exile, imprisonment, or execution (game over risk)
- **Negotiate**: Step down peacefully, karma boost

### 10.4 Dynasty / Monarchy System

If the player establishes a monarchy:
- `dynastyEstablished = true`
- Heir is chosen from player's children (relationship system)
- Upon player death, game **can continue as heir** (Phase 8 integration)
- Dynasty has prestige stat that carries over
- Other nations may recognize or oppose the dynasty

---

## 11. Political Relationships & Factions

### 11.1 New NPC Types

Add to the Relationship type union:
```typescript
type: '... | 'Political Ally' | 'Political Rival' | 'Lobbyist' | 'Campaign Manager' | 'Party Leader'
```

### 11.2 Political NPC Generation

When entering politics, the system generates:
- **Party Leader** (1): High influence, controls party resources
- **Political Allies** (2-4): Supportive NPCs, can betray
- **Political Rivals** (2-4): Opposition figures, can be befriended or destroyed
- **Lobbyists** (1-3): Offer money for influence
- **Campaign Manager** (1): Hired for campaigns, affects efficiency

### 11.3 Political Interactions

New interactions added to the relationship system for political NPCs:

| Interaction | Effect |
|-------------|--------|
| **Form Alliance** | +influence, +partyLoyalty, ally relationship |
| **Betray Ally** | +influence, -karma, -partyLoyalty, ally becomes rival |
| **Negotiate with Rival** | Reduce opposition, potential policy compromise |
| **Accept Bribe (from Lobbyist)** | +campaignFunds, +corruption |
| **Blackmail** | +influence, high corruption risk, rival weakened |
| **Endorse** | Transfer approval to ally's campaign |
| **Smear** | Damage rival's reputation, risk of backfire |

---

## 12. Integration with Existing Systems

### 12.1 Career System Integration

- Political positions **are not** standard CareerDefinitions — they use their own system
- But they DO set `career.field = 'Politics'` and `career.title` for display
- Players can hold political office AND have a regular career simultaneously at local levels
- At State level and above, politics becomes a full-time career
- Political salary is set by position level:
  - Local: $30,000 - $80,000
  - State: $80,000 - $175,000
  - National: $174,000 - $200,000
  - President: $400,000

### 12.2 Education Integration

- **Political Science** degree: Shortcut to political career (+10% election win chance)
- **Law degree + Bar license**: Required for Attorney General, helpful elsewhere
- **No degree**: Can still run for local office (harder path)
- **Dropout**: Can run as populist outsider (requires high looks/fame)

### 12.3 Finance Integration

- Campaign funds are separate from personal cash
- Can self-fund campaigns (transfer personal cash → campaign funds)
- Corruption income goes to personal cash
- Political salary replaces career salary while in office

### 12.4 Relationship Integration

- Political NPCs generate alongside existing relationships
- Marriage to powerful NPC can boost political career
- Affair scandal integrates with existing romance system
- Children can become political heirs (dynasty integration)

### 12.5 Fame Integration (future Phase 8)

- Higher fame = easier elections
- TV appearances, social media presence boost approval
- Celebrity endorsements have extra weight
- Scandal fame is different from positive fame

### 12.6 Shadow/Crime Integration

- Can be a corrupt politician + serial killer simultaneously (extreme risk)
- Criminal record blocks most political positions
- BUT authoritarian path doesn't care about criminal record
- Corruption interacts with shadow crime system heat mechanics

---

## 13. Content Files & JSON Schemas

### 13.1 `positions.json` Schema

```json
[
  {
    "id": "city_council",
    "title": "City Council Member",
    "level": 1,
    "minAge": 21,
    "requiredEducation": "High School",
    "minSmarts": 45,
    "minWillpower": 40,
    "minPoliticalYears": 0,
    "salary": 45000,
    "termLength": 4,
    "termLimit": 3,
    "isElected": true,
    "governmentTypes": ["democracy", "authoritarian"],
    "filingFee": 500,
    "baseCampaignCost": 10000,
    "nextPositions": ["mayor", "state_representative", "county_commissioner"]
  }
]
```

### 13.2 `ideologies.json` Schema

```json
[
  {
    "id": "populist",
    "name": "Populist",
    "description": "Champion of the common people against the elite.",
    "approvalModifier": 5,
    "corruptionModifier": 2,
    "policyBias": ["social_spending", "anti_corporate"],
    "statRequirements": { "looks": 50 }
  }
]
```

### 13.3 `scandals.json` Schema

```json
[
  {
    "id": "bribery_scandal",
    "title": "Bribery Scandal",
    "description": "Evidence surfaces that you accepted cash payments from a construction company.",
    "severity": "major",
    "approvalHit": -20,
    "corruptionThreshold": 30,
    "choices": [
      { "text": "Deny everything", "successChance": 0.3, "failApproval": -10, "corruptionGain": 5 },
      { "text": "Confess and apologize", "approvalHit": -10, "karmaGain": 5 },
      { "text": "Blame your staff", "successChance": 0.5, "karmaHit": -10 }
    ]
  }
]
```

---

## 14. Implementation Phases

### Phase A: Foundation (MVP - core political system)

**Priority: HIGH | Estimated effort: Large**

1. Add `PoliticalState` interface to `GameState.ts`
2. Add default political state to `createInitialState()`
3. Add backward-compat initialization in `Engine.loadState()`
4. Create `PoliticalSystem.ts` with:
   - `processPoliticalYear()` — annual tick
   - `runForOffice()` — start campaign
   - `resolveElection()` — determine win/lose
   - `getAvailablePoliticalActions()` — action list
   - `performPoliticalAction()` — action execution
5. Create `positions.json` with all position definitions
6. Add `processPoliticalYear` call to `Engine.ageUp()`
7. Extend `ConditionSystem` and `EffectSystem` for political types
8. Add Politics tab to Renderer
9. Create basic `political.json` events (10-15 events)
10. Register political content in `main.ts`

### Phase B: Campaigns & Elections

**Priority: HIGH | Estimated effort: Medium**

1. Implement full campaign flow (declare → fundraise → campaign → debate → election)
2. Add campaign actions to the UI
3. Create campaign event cards (debate, rallies, endorsements, smear)
4. Implement election resolution formula
5. Add political NPC generation (allies, rivals, lobbyists)
6. Create `political.json` campaign events (10-15 events)

### Phase C: Governance & Policy

**Priority: MEDIUM | Estimated effort: Medium**

1. Implement governance actions (enact policy, veto, address, etc.)
2. Create `policies.json` with 20+ policies
3. Implement approval rating annual tick
4. Add governance events (crisis, disaster, budget battle, etc.)
5. Create `political.json` governance events (15-20 events)

### Phase D: Corruption & Scandals

**Priority: MEDIUM | Estimated effort: Medium**

1. Implement corruption accumulation mechanics
2. Implement scandal exposure probability
3. Create `scandals.json` with 10+ scandal templates
4. Implement impeachment process
5. Add corruption-related choices to existing political actions
6. Create scandal events (10-15 events)

### Phase E: Authoritarian & Revolutionary Paths

**Priority: MEDIUM | Estimated effort: Large**

1. Implement authoritarian score tracking
2. Add authoritarian actions (state of emergency, media control, purge, etc.)
3. Implement coup mechanic (player-initiated)
4. Implement revolution mechanic (counter-coup)
5. Implement government type change
6. Add dynasty system (monarchy path)
7. Create authoritarian events (15-20 events)
8. Create `government_types.json`

### Phase F: Polish & Integration

**Priority: LOW | Estimated effort: Medium**

1. Political interactions for relationship system
2. Integration with fame system (when Phase 8 is built)
3. Integration with save/load system (when Phase 1 save/load is built)
4. UI polish for political menus
5. Additional events and policies for variety
6. Balance testing on election mechanics and approval drift

---

## 15. Testing Plan

### Unit Tests (`tests/political.test.ts`)

1. **Election mechanics**: Verify win probability formula produces expected ranges
2. **Position eligibility**: Verify age, education, experience gates
3. **Corruption exposure**: Verify exposure chance calculation
4. **Approval drift**: Verify annual approval changes
5. **Authoritarian thresholds**: Verify authoritarian actions require correct scores
6. **Campaign fund management**: Verify separate fund tracking
7. **State initialization**: Verify backward-compatible state loading
8. **Policy conflicts**: Verify conflicting policies can't both be enacted
9. **Term limits**: Verify term-limited positions block re-election
10. **Government type changes**: Verify transitions between government types

### Integration Tests

1. Full political career playthrough (school board → president)
2. Authoritarian takeover sequence
3. Campaign + election + governance cycle
4. Scandal → impeachment → removal flow
5. Coup attempt → success/failure branches

### Validation Workflow

```bash
npm test
npm run build
```

Both must pass before merging any political system changes.

---

## Appendix A: Position Salary Table

| Position | Annual Salary | Campaign Cost (typical) |
|----------|--------------|------------------------|
| School Board Member | $30,000 | $5,000 |
| City Council Member | $45,000 | $10,000 |
| County Commissioner | $50,000 | $15,000 |
| Mayor (small city) | $65,000 | $50,000 |
| Mayor (large city) | $120,000 | $500,000 |
| State Representative | $80,000 | $100,000 |
| State Senator | $95,000 | $250,000 |
| Lieutenant Governor | $130,000 | $500,000 |
| Attorney General | $150,000 | $1,000,000 |
| Governor | $175,000 | $5,000,000 |
| US Representative | $174,000 | $2,000,000 |
| US Senator | $174,000 | $10,000,000 |
| Vice President | $235,000 | N/A (selected) |
| President | $400,000 | $100,000,000 |
| Dictator/Monarch | Unlimited (state treasury) | N/A |

## Appendix B: Ideology Compass

```
             Authoritarian
                  |
                  |
    Left -------- + -------- Right
                  |
                  |
             Libertarian
```

Each ideology maps to this grid:
- **Populist**: Center-left, moderately authoritarian
- **Progressive**: Left, libertarian
- **Conservative**: Right, moderately authoritarian
- **Libertarian**: Center-right, strongly libertarian
- **Radical**: Far-left or far-right, strongly authoritarian
- **Centrist/Moderate**: Center, center

## Appendix C: Quick Reference — Player Freedom Map

```
                    ┌──────────────────┐
                    │    CIVILIAN      │
                    │  (Join party,    │
                    │   volunteer)     │
                    └────────┬─────────┘
                             │
                    ┌────────▼─────────┐
                    │  LOCAL OFFICE     │
                    │  School Board     │
                    │  City Council     │
                    │  Mayor            │
                    └────────┬─────────┘
                             │
                    ┌────────▼─────────┐
                    │  STATE OFFICE     │
                    │  State Rep/Sen    │
                    │  Governor         │
                    │  Attorney General │
                    └────────┬─────────┘
                             │
                    ┌────────▼─────────┐
                    │  NATIONAL OFFICE  │
                    │  US Rep/Senator   │
                    │  Cabinet          │
                    └────────┬─────────┘
                             │
              ┌──────────────▼──────────────┐
              │       HEAD OF STATE          │
              │       President              │
              └──────┬───────────────┬───────┘
                     │               │
        ┌────────────▼───┐    ┌──────▼────────────┐
        │  DEMOCRATIC    │    │  AUTHORITARIAN     │
        │  (Term limits, │    │  (Suspend elections,│
        │   legacy,      │    │   consolidate,     │
        │   retire)      │    │   purge)           │
        └────────────────┘    └──────┬─────────────┘
                                     │
                        ┌────────────▼────────────┐
                        │    SUPREME POWER         │
                        │  ┌─────────────────────┐ │
                        │  │ Dictator             │ │
                        │  │ Monarch / King       │ │
                        │  │ Supreme Leader       │ │
                        │  │ Revolutionary Chair  │ │
                        │  └─────────────────────┘ │
                        │                          │
                        │  Can be: overthrown,     │
                        │  assassinated, or        │
                        │  establish dynasty       │
                        └──────────────────────────┘
```
