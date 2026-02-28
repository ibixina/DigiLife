import type { GameState } from '../core/GameState';
import { spendTime, canSpendTime, addHistory } from '../core/StateUtils';

export type EducationLevel = 'None' | 'Primary' | 'Secondary' | 'High School' | 'Bachelor' | 'Master' | 'Doctorate';

export interface DegreeProgram {
  id: string;
  name: string;
  majorAwarded: string;
  levelAwarded: EducationLevel;
  yearsRequired: number;
  annualTuition: number;
  minAge: number;
  requiresLevel: EducationLevel;
}

export interface EducationAction {
  id: string;
  name: string;
  timeCost: number;
  cost: number;
  isAvailable: (state: GameState) => boolean;
  perform: (state: GameState) => void;
}

const EDUCATION_RANK: Record<EducationLevel, number> = {
  None: 0,
  Primary: 1,
  Secondary: 2,
  'High School': 3,
  Bachelor: 4,
  Master: 5,
  Doctorate: 6
};

const PROGRAMS: DegreeProgram[] = [
  {
    id: 'prelaw_bachelor',
    name: 'B.A. Pre-Law',
    majorAwarded: 'Pre-Law',
    levelAwarded: 'Bachelor',
    yearsRequired: 4,
    annualTuition: 16000,
    minAge: 18,
    requiresLevel: 'High School'
  },
  {
    id: 'engineering_bachelor',
    name: 'B.Sc. Engineering',
    majorAwarded: 'Engineering',
    levelAwarded: 'Bachelor',
    yearsRequired: 4,
    annualTuition: 18000,
    minAge: 18,
    requiresLevel: 'High School'
  },
  {
    id: 'engineering_master',
    name: 'M.Eng.',
    majorAwarded: 'Engineering',
    levelAwarded: 'Master',
    yearsRequired: 2,
    annualTuition: 24000,
    minAge: 22,
    requiresLevel: 'Bachelor'
  },
  {
    id: 'law_jd',
    name: 'Juris Doctor (J.D.)',
    majorAwarded: 'Law',
    levelAwarded: 'Doctorate',
    yearsRequired: 3,
    annualTuition: 34000,
    minAge: 21,
    requiresLevel: 'Bachelor'
  }
];

function hasLevel(state: GameState, required: EducationLevel): boolean {
  return EDUCATION_RANK[state.education.level] >= EDUCATION_RANK[required];
}

function payCost(state: GameState, amount: number) {
  if (amount <= 0) return;
  if (state.finances.cash >= amount) {
    state.finances.cash -= amount;
    return;
  }

  const remaining = amount - state.finances.cash;
  state.finances.cash = 0;
  state.finances.debt += remaining;
  state.education.studentDebt += remaining;
}

function enrollInProgram(state: GameState, programId: string) {
  const program = PROGRAMS.find(p => p.id === programId);
  if (!program) return;
  if (state.education.inProgram) return;
  if (state.age < program.minAge) return;
  if (!hasLevel(state, program.requiresLevel)) return;

  state.education.inProgram = true;
  state.education.programId = program.id;
  state.education.programName = program.name;
  state.education.programYearsCompleted = 0;
  state.education.studyEffort = 0;

  addHistory(state, `You enrolled in ${program.name}.`, 'primary');
}

export const EDUCATION_ACTIONS: EducationAction[] = [
  {
    id: 'study_hard',
    name: 'Study Hard',
    timeCost: 2,
    cost: 0,
    isAvailable: (state) => state.age >= 5 && (state.age <= 17 || state.education.inProgram),
    perform: (state) => {
      if (!spendTime(state, 2)) return;
      state.education.studyEffort += 1;
      state.stats.smarts = Math.min(100, state.stats.smarts + Math.floor(Math.random() * 5) + 2);
      state.stats.willpower = Math.min(100, state.stats.willpower + 1);
      state.stats.happiness = Math.max(0, state.stats.happiness - 1);
      addHistory(state, 'You studied hard.');
    }
  },
  {
    id: 'enroll_engineering_bachelor',
    name: 'Enroll: B.Sc. Engineering',
    timeCost: 1,
    cost: 0,
    isAvailable: (state) => !state.education.inProgram && state.age >= 18 && hasLevel(state, 'High School') && !hasLevel(state, 'Bachelor'),
    perform: (state) => {
      if (!spendTime(state, 1)) return;
      enrollInProgram(state, 'engineering_bachelor');
    }
  },
  {
    id: 'enroll_engineering_master',
    name: 'Enroll: M.Eng.',
    timeCost: 1,
    cost: 0,
    isAvailable: (state) => !state.education.inProgram && state.age >= 22 && hasLevel(state, 'Bachelor') && !hasLevel(state, 'Master'),
    perform: (state) => {
      if (!spendTime(state, 1)) return;
      enrollInProgram(state, 'engineering_master');
    }
  },
  {
    id: 'enroll_prelaw_bachelor',
    name: 'Enroll: B.A. Pre-Law',
    timeCost: 1,
    cost: 0,
    isAvailable: (state) => !state.education.inProgram && state.age >= 18 && hasLevel(state, 'High School') && !hasLevel(state, 'Bachelor'),
    perform: (state) => {
      if (!spendTime(state, 1)) return;
      enrollInProgram(state, 'prelaw_bachelor');
    }
  },
  {
    id: 'enroll_law_jd',
    name: 'Enroll: Juris Doctor (J.D.)',
    timeCost: 1,
    cost: 0,
    isAvailable: (state) => !state.education.inProgram && state.age >= 21 && hasLevel(state, 'Bachelor') && !hasLevel(state, 'Doctorate'),
    perform: (state) => {
      if (!spendTime(state, 1)) return;
      enrollInProgram(state, 'law_jd');
    }
  },
  {
    id: 'take_bar_exam',
    name: 'Take Bar Exam',
    timeCost: 2,
    cost: 2500,
    isAvailable: (state) =>
      hasLevel(state, 'Doctorate') &&
      state.education.major === 'Law' &&
      state.flags.license_bar !== true &&
      state.flags.bar_exam_last_attempt_year !== state.year,
    perform: (state) => {
      if (!spendTime(state, 2)) return;

      if (state.finances.cash >= 2500) {
        state.finances.cash -= 2500;
      } else {
        const missing = 2500 - state.finances.cash;
        state.finances.cash = 0;
        state.finances.debt += missing;
        state.education.studentDebt += missing;
      }

      const score = (state.stats.smarts * 0.5) + (state.stats.willpower * 0.3) + (state.education.gpa * 12);
      const passChance = Math.max(0.2, Math.min(0.93, (score - 55) / 65));
      state.flags.bar_exam_last_attempt_year = state.year;

      if (Math.random() < passChance) {
        state.flags.license_bar = true;
        addHistory(state, 'You passed the bar exam and became a licensed attorney.', 'primary');
      } else {
        addHistory(state, 'You failed the bar exam. You can attempt it again next year.', 'primary');
      }
    }
  }
];

export function getAvailableEducationActions(state: GameState): EducationAction[] {
  return EDUCATION_ACTIONS.filter(action => {
    // Study actions require School location
    if (action.id === 'study_hard' && state.currentLocation !== 'School') {
      return false;
    }
    return action.isAvailable(state) && canSpendTime(state, action.timeCost);
  });
}

export function performEducationAction(state: GameState, actionId: string) {
  const action = EDUCATION_ACTIONS.find(a => a.id === actionId);
  if (!action || !action.isAvailable(state)) return;
  action.perform(state);
}

export function processEducationYear(state: GameState) {
  if (state.age === 5 && state.education.level === 'None') {
    state.education.level = 'Primary';
    addHistory(state, 'You started primary school.', 'primary');
  }

  if (state.age === 13 && EDUCATION_RANK[state.education.level] < EDUCATION_RANK.Secondary) {
    state.education.level = 'Secondary';
    addHistory(state, 'You started secondary school.', 'primary');
  }

  if (state.age === 17 && EDUCATION_RANK[state.education.level] < EDUCATION_RANK['High School']) {
    state.education.level = 'High School';
    addHistory(state, 'You completed high school.', 'primary');
  }

  if (state.education.inProgram) {
    const program = PROGRAMS.find(p => p.id === state.education.programId);
    if (!program) {
      state.education.inProgram = false;
      state.education.programId = null;
      state.education.programName = null;
      state.education.programYearsCompleted = 0;
      state.education.studyEffort = 0;
      return;
    }

    let annualTuition = program.annualTuition;
    const scholarshipChance = Math.max(0, Math.min(0.65, ((state.stats.smarts - 55) / 100) + (state.education.studyEffort * 0.05)));
    if (Math.random() < scholarshipChance) {
      const scholarship = Math.floor(program.annualTuition * (0.2 + Math.random() * 0.3));
      annualTuition = Math.max(0, annualTuition - scholarship);
      state.education.scholarships += scholarship;
      addHistory(state, `You received a scholarship of $${scholarship.toLocaleString()}.`);
    }

    payCost(state, annualTuition);

    const gpaBoost = (state.stats.smarts / 100) + (state.education.studyEffort * 0.25);
    const gpaDelta = Math.max(-0.2, Math.min(0.45, (gpaBoost - 0.6) * 0.5));
    state.education.gpa = Math.max(0, Math.min(4, Math.round((state.education.gpa + gpaDelta) * 100) / 100));

    if (state.education.gpa < 1.2 && Math.random() < 0.35) {
      state.education.inProgram = false;
      state.education.programId = null;
      state.education.programName = null;
      state.education.programYearsCompleted = 0;
      state.education.studyEffort = 0;
      addHistory(state, 'You were academically dismissed from your degree program.', 'primary');
      return;
    }

    state.education.programYearsCompleted += 1;

    if (state.education.programYearsCompleted >= program.yearsRequired) {
      state.education.level = program.levelAwarded;
      state.education.major = program.majorAwarded;
      state.education.inProgram = false;
      state.education.programId = null;
      state.education.programName = null;
      state.education.programYearsCompleted = 0;
      addHistory(state, `You graduated with ${program.name}.`, 'primary');
    }
  }

  state.education.studyEffort = 0;
}
