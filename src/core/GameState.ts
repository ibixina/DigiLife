// GameState.ts
export type Gender = 'Male' | 'Female' | 'Non-binary';

export interface Relationship {
  id: string;
  name: string;
  type: 'Father' | 'Mother' | 'Brother' | 'Sister' | 'Friend' | 'Enemy' | 'Pet' | 'Partner' | 'Child' | 'Co-worker' | 'Boss' | 'Teacher' | 'Classmate' | 'Political Ally' | 'Political Rival' | 'Lobbyist' | 'Campaign Manager' | 'Party Leader';
  gender: Gender | 'Unknown';
  age: number;
  health: number;
  happiness: number;
  smarts: number;
  looks: number;
  relationshipToPlayer: number; // 0-100
  familiarity: number; // 0-100, decays over time, increases with interaction
  location: string;
  workplace?: string | null;
  promotionId?: string | null;
  isAlive: boolean;
  traits: string[];
}


export interface HistoryEntry {
  age: number;
  year: number;
  text: string;
  type: 'primary' | 'secondary' | 'age_up';
}

export interface Character {
  firstName: string;
  lastName: string;
  gender: Gender;
  country: string;
  talent: string;
  traits: string[];
}

export interface Stats {
  health: number;
  happiness: number;
  smarts: number;
  looks: number;
  karma: number;
  athleticism: number;
  craziness: number;
  willpower: number;
  fertility: number;
}

export interface FinanceState {
  cash: number;
  salary: number;
  expenses: number;
  debt: number;
}

export interface EducationState {
  level: 'None' | 'Primary' | 'Secondary' | 'High School' | 'Bachelor' | 'Master' | 'Doctorate';
  major: string | null;
  inProgram: boolean;
  programId: string | null;
  programName: string | null;
  programYearsCompleted: number;
  gpa: number;
  studyEffort: number;
  scholarships: number;
  studentDebt: number;
}

export interface CareerState {
  id: string | null;
  title: string | null;
  field: string | null;
  specialization: string | null;
  yearsInRole: number;
  totalYearsExperience: number;
  lawYearsExperience: number;
  licensedLawYearsExperience: number;
  performance: number;
  level: number;
  rejections: number;
}

export interface SerialKillerState {
  unlocked: boolean;
  caught: boolean;
  mode: 'none' | 'double_life' | 'full_time';
  alias: string | null;
  kills: number;
  contractsCompleted: number;
  notoriety: number; // 0-100
  heat: number; // 0-100
  lastKillYear: number | null;
  lastContractYear: number | null;
}

export interface WrestlingContractClauses {
  downsideGuarantee: number;
  merchCutPercent: number;
  appearanceMinimum: number;
  nonCompeteMonths: number;
  creativeControl: boolean;
  injuryProtection: boolean;
  travelCovered: boolean;
  exclusivity: 'exclusive' | 'semi-exclusive' | 'open';
}

export interface WrestlingContractOffer {
  promotionId: string;
  promotionName: string;
  annualSalary: number;
  termYears: number;
  clauses: WrestlingContractClauses;
}

export interface WrestlingContractState {
  promotionId: string;
  promotionName: string;
  startYear: number;
  endYear: number;
  annualSalary: number;
  clauses: WrestlingContractClauses;
  rivalOffer: WrestlingContractOffer | null;
}

export interface PoliticalState {
  active: boolean;
  currentPosition: string | null;       // e.g. 'city_council', 'governor', 'president'
  positionTitle: string | null;          // Display title
  positionLevel: number;                 // 0=none, 1=local, 2=state, 3=national, 4=head of state, 5=supreme
  yearsInOffice: number;
  termsServed: number;
  totalPoliticalYears: number;

  // Core political stats (0-100)
  approvalRating: number;
  influence: number;                     // Political capital / clout
  campaignFunds: number;                 // Cash reserved for campaigns (separate from personal cash)
  partyLoyalty: number;                  // Standing within your party

  // Political identity
  party: string | null;                  // e.g. 'Progressive', 'Conservative', 'Independent'
  ideology: string | null;              // e.g. 'populist', 'moderate', 'radical'

  // Governance track
  policiesEnacted: string[];            // IDs of enacted policies
  legislativeRecord: number;            // Bills passed / supported
  vetoes: number;

  // Dark side
  corruptionLevel: number;              // 0-100, hidden accumulation
  scandalsExposed: number;
  underInvestigation: boolean;
  impeachmentRisk: number;              // 0-100

  // Authoritarian track
  authoritarianScore: number;           // 0-100, accumulated from authoritarian actions
  militaryControl: number;              // 0-100, control over armed forces
  mediaControl: number;                 // 0-100, control over press / propaganda
  oppositionStrength: number;           // 0-100, how strong the opposition is
  governmentType: string;               // 'democracy' | 'authoritarian' | 'dictatorship' | 'monarchy' | 'theocracy'
  dynastyEstablished: boolean;

  // Campaign state (active during election cycles)
  campaignActive: boolean;
  targetPosition: string | null;
  campaignBudget: number;
  endorsements: string[];               // IDs of endorsing NPCs/orgs
  debatesWon: number;
  ralliesHeld: number;

  // Relationships (political)
  allies: string[];                     // NPC IDs
  rivals: string[];                     // NPC IDs
  lobbyists: string[];                  // NPC IDs

  // Flags
  hasRunForOffice: boolean;
  hasLostElection: boolean;
  hasBeenImpeached: boolean;
  hasStagedCoup: boolean;
  hasDeclaredMartialLaw: boolean;
  isTermLimited: boolean;
}

export interface GameState {
  version: string;
  character: Character;
  stats: Stats;
  flags: Record<string, any>;
  history: HistoryEntry[];
  age: number;
  year: number;
  isAlive: boolean;
  deathCause: string | null;
  finances: FinanceState;
  education: EducationState;
  career: CareerState;
  serialKiller: SerialKillerState;
  wrestlingContract: WrestlingContractState | null;
  relationships: Relationship[];
  timeBudget: number;
  locationTime: number;
  currentLocation: string;
  activitiesExperience: Record<string, number>;
  politics: PoliticalState;
}

export function createDefaultPoliticalState(): PoliticalState {
  return {
    active: false,
    currentPosition: null,
    positionTitle: null,
    positionLevel: 0,
    yearsInOffice: 0,
    termsServed: 0,
    totalPoliticalYears: 0,
    approvalRating: 50,
    influence: 0,
    campaignFunds: 0,
    partyLoyalty: 50,
    party: null,
    ideology: null,
    policiesEnacted: [],
    legislativeRecord: 0,
    vetoes: 0,
    corruptionLevel: 0,
    scandalsExposed: 0,
    underInvestigation: false,
    impeachmentRisk: 0,
    authoritarianScore: 0,
    militaryControl: 0,
    mediaControl: 0,
    oppositionStrength: 50,
    governmentType: 'democracy',
    dynastyEstablished: false,
    campaignActive: false,
    targetPosition: null,
    campaignBudget: 0,
    endorsements: [],
    debatesWon: 0,
    ralliesHeld: 0,
    allies: [],
    rivals: [],
    lobbyists: [],
    hasRunForOffice: false,
    hasLostElection: false,
    hasBeenImpeached: false,
    hasStagedCoup: false,
    hasDeclaredMartialLaw: false,
    isTermLimited: false,
  };
}

export function createInitialState(): GameState {
  return {
    version: '0.0.1',
    character: {
      firstName: '',
      lastName: '',
      gender: 'Non-binary',
      country: '',
      talent: '',
      traits: [],
    },
    stats: {
      health: 80,
      happiness: 80,
      smarts: 50,
      looks: 50,
      karma: 50,
      athleticism: 50,
      craziness: 50,
      willpower: 50,
      fertility: 50,
    },
    flags: {},
    history: [],
    age: 0,
    year: new Date().getFullYear(),
    isAlive: true,
    deathCause: null,
    finances: { cash: 0, salary: 0, expenses: 0, debt: 0 },
    education: {
      level: 'None',
      major: null,
      inProgram: false,
      programId: null,
      programName: null,
      programYearsCompleted: 0,
      gpa: 2.5,
      studyEffort: 0,
      scholarships: 0,
      studentDebt: 0,
    },
    career: {
      id: null,
      title: null,
      field: null,
      specialization: null,
      yearsInRole: 0,
      totalYearsExperience: 0,
      lawYearsExperience: 0,
      licensedLawYearsExperience: 0,
      performance: 50,
      level: 0,
      rejections: 0,
    },
    serialKiller: {
      unlocked: false,
      caught: false,
      mode: 'none',
      alias: null,
      kills: 0,
      contractsCompleted: 0,
      notoriety: 0,
      heat: 0,
      lastKillYear: null,
      lastContractYear: null,
    },
    wrestlingContract: null,
    relationships: [],
    timeBudget: 12,
    locationTime: 10,
    currentLocation: 'Home',
    activitiesExperience: {},
    politics: createDefaultPoliticalState(),
  };
}
