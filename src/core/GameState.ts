// GameState.ts
export type Gender = 'Male' | 'Female' | 'Non-binary';

export interface Relationship {
  id: string;
  name: string;
  type: 'Father' | 'Mother' | 'Brother' | 'Sister' | 'Friend' | 'Enemy' | 'Pet' | 'Partner' | 'Child' | 'Co-worker' | 'Boss' | 'Teacher' | 'Classmate';
  gender: Gender | 'Unknown';
  age: number;
  health: number;
  happiness: number;
  smarts: number;
  looks: number;
  relationshipToPlayer: number; // 0-100
  familiarity: number; // 0-100, decays over time, increases with interaction
  location: string;
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
  relationships: Relationship[];
  timeBudget: number;
  locationTime: number;
  currentLocation: string;
  activitiesExperience: Record<string, number>;
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
    relationships: [],
    timeBudget: 12,
    locationTime: 10,
    currentLocation: 'Home',
    activitiesExperience: {},
  };
}
