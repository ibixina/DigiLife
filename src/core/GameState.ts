// GameState.ts
export type Gender = 'Male' | 'Female' | 'Non-binary';

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
}

export interface Stats {
  health: number;
  happiness: number;
  smarts: number;
  looks: number;
  karma: number;
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
  finances: {
    cash: number;
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
    },
    stats: {
      health: 80,
      happiness: 80,
      smarts: 50,
      looks: 50,
      karma: 50,
    },
    flags: {},
    history: [],
    age: 0,
    year: new Date().getFullYear(),
    isAlive: true,
    deathCause: null,
    finances: { cash: 0 },
  };
}
