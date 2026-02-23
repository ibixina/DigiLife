import type { GameState } from '../core/GameState';
import type { EducationLevel } from './EducationSystem';

export interface CareerDefinition {
  id: string;
  title: string;
  field: string;
  specialization: string;
  requiredEducation: EducationLevel;
  minAge: number;
  minSmarts: number;
  minWillpower: number;
  startSalary: number;
  annualRaise: number;
  difficulty: number;
  promotionTitles?: string[];
  requiredMajors?: string[];
  requiredFlagsAll?: string[];
  requiredLawYears?: number;
  requiredLicensedLawYears?: number;
}

export interface CareerAction {
  id: string;
  name: string;
  timeCost: number;
  isAvailable: (state: GameState) => boolean;
  perform: (state: GameState) => void;
}

export interface SerialContract {
  id: string;
  codename: string;
  minAge: number;
  minNotoriety: number;
  payout: number;
  heatGain: number;
  notorietyGain: number;
  risk: number; // 0-1
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

let careerCatalog: CareerDefinition[] = [];
let serialContracts: SerialContract[] = [];

function spendTime(state: GameState, timeCost: number): boolean {
  if (state.currentLocation === 'Home') {
    if (state.timeBudget < timeCost) return false;
    state.timeBudget -= timeCost;
    return true;
  }

  if (state.locationTime < timeCost) return false;
  state.locationTime -= timeCost;
  return true;
}

function hasEducation(state: GameState, level: EducationLevel): boolean {
  return EDUCATION_RANK[state.education.level] >= EDUCATION_RANK[level];
}

function clampStat(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function clearCareer(state: GameState) {
  state.career.id = null;
  state.career.title = null;
  state.career.field = null;
  state.career.specialization = null;
  state.career.yearsInRole = 0;
  state.career.performance = 50;
  state.career.level = 0;
  state.finances.salary = 0;
}

function canApply(state: GameState, def: CareerDefinition): boolean {
  if (state.age < def.minAge) return false;
  if (!hasEducation(state, def.requiredEducation)) return false;
  if (state.stats.smarts < def.minSmarts) return false;
  if (state.stats.willpower < def.minWillpower) return false;
  if (def.requiredMajors && def.requiredMajors.length > 0) {
    if (!state.education.major || !def.requiredMajors.includes(state.education.major)) return false;
  }
  if (def.requiredFlagsAll && def.requiredFlagsAll.length > 0) {
    if (!def.requiredFlagsAll.every(flag => state.flags[flag] === true)) return false;
  }
  if (def.requiredLawYears !== undefined && state.career.lawYearsExperience < def.requiredLawYears) return false;
  if (def.requiredLicensedLawYears !== undefined && state.career.licensedLawYearsExperience < def.requiredLicensedLawYears) return false;
  return true;
}

function applyForCareer(state: GameState, careerId: string) {
  const def = careerCatalog.find(c => c.id === careerId);
  if (!def) return;
  if (state.career.id) return;
  if (!canApply(state, def)) return;

  const score =
    (state.stats.smarts - def.minSmarts) * 0.01 +
    (state.stats.willpower - def.minWillpower) * 0.007 +
    (state.education.gpa - 2.5) * 0.12 +
    0.5;

  const chance = Math.max(0.15, Math.min(0.95, score - (def.difficulty * 0.25)));

  if (Math.random() < chance) {
    state.career.id = def.id;
    state.career.title = def.promotionTitles?.[0] || def.title;
    state.career.field = def.field;
    state.career.specialization = def.specialization;
    state.career.yearsInRole = 0;
    state.career.performance = 55;
    state.career.level = 1;
    state.finances.salary = def.startSalary;
    state.history.push({ age: state.age, year: state.year, text: `You got hired as a ${def.title}.`, type: 'primary' });
  } else {
    state.career.rejections += 1;
    state.history.push({ age: state.age, year: state.year, text: `Your ${def.title} application was rejected.`, type: 'secondary' });
  }
}

export function registerCareers(careers: CareerDefinition[]) {
  careerCatalog = careers.slice();
}

export function registerSerialContracts(contracts: SerialContract[]) {
  serialContracts = contracts.slice();
}

export function getAllCareers(): CareerDefinition[] {
  return careerCatalog.slice();
}

export function getEligibleCareers(state: GameState): CareerDefinition[] {
  return careerCatalog.filter(def => canApply(state, def));
}

export function processCareerYear(state: GameState) {
  if (!state.career.id) return;

  const def = careerCatalog.find(c => c.id === state.career.id);
  if (!def) {
    if (state.career.id === 'engineering_founder') {
      state.career.yearsInRole += 1;
      state.career.totalYearsExperience += 1;
      const growth = Math.floor((state.stats.smarts + state.career.performance) * (400 + Math.random() * 500));
      state.finances.salary = Math.max(20000, Math.floor(state.finances.salary + growth * 0.08));
      if (Math.random() < 0.08) {
        const setback = Math.floor(state.finances.salary * 0.2);
        state.finances.salary = Math.max(20000, state.finances.salary - setback);
        state.history.push({ age: state.age, year: state.year, text: `Your startup had a rough year and profits dropped by $${setback.toLocaleString()}.`, type: 'secondary' });
      }
    }
    return;
  }

  state.career.yearsInRole += 1;
  state.career.totalYearsExperience += 1;
  if (state.career.field === 'Law') state.career.lawYearsExperience += 1;
  if (state.career.field === 'Law' && state.flags.license_bar === true) state.career.licensedLawYearsExperience += 1;

  const performanceDrift = Math.floor(Math.random() * 9) - 4;
  state.career.performance = Math.max(0, Math.min(100, state.career.performance + performanceDrift));

  if (state.career.performance >= 72) {
    const raise = Math.floor(state.finances.salary * def.annualRaise);
    if (raise > 0) {
      state.finances.salary += raise;
      state.history.push({ age: state.age, year: state.year, text: `You received a raise of $${raise.toLocaleString()} as a ${state.career.title}.`, type: 'secondary' });
    }
  }

  const canPromote =
    state.career.performance >= 80 &&
    state.career.yearsInRole >= Math.max(2, state.career.level * 2) &&
    !!def.promotionTitles &&
    state.career.level < def.promotionTitles.length;

  if (canPromote && Math.random() < 0.55) {
    state.career.level += 1;
    state.career.title = def.promotionTitles?.[state.career.level - 1] || state.career.title;
    const promotionRaise = Math.floor(state.finances.salary * 0.12);
    state.finances.salary += promotionRaise;
    state.history.push({ age: state.age, year: state.year, text: `You were promoted to ${state.career.title}.`, type: 'primary' });
  }

  if (state.career.performance <= 25 && Math.random() < 0.25) {
    state.history.push({ age: state.age, year: state.year, text: `You were fired from your ${state.career.title} role.`, type: 'primary' });
    state.career.id = null;
    state.career.title = null;
    state.career.field = null;
    state.career.specialization = null;
    state.career.yearsInRole = 0;
    state.career.performance = 50;
    state.career.level = 0;
    state.finances.salary = 0;
  }
}

export function processSerialKillerYear(state: GameState) {
  if (!state.serialKiller.unlocked || state.serialKiller.caught) return;

  const decay = state.serialKiller.mode === 'double_life' ? 12 : 7;
  state.serialKiller.heat = clampStat(state.serialKiller.heat - decay);

  if (state.serialKiller.lastKillYear !== state.year - 1) {
    state.serialKiller.notoriety = clampStat(state.serialKiller.notoriety - 2);
  }

  const investigationRisk = Math.max(0, (state.serialKiller.heat - 70) / 130);
  if (state.serialKiller.heat >= 70 && Math.random() < investigationRisk) {
    state.serialKiller.caught = true;
    state.serialKiller.mode = 'none';
    state.flags.serial_caught = true;
    clearCareer(state);
    state.stats.happiness = clampStat(state.stats.happiness - 35);
    state.stats.karma = clampStat(state.stats.karma - 10);
    state.history.push({
      age: state.age,
      year: state.year,
      text: 'Investigators identified your crimes. You were arrested and your double life ended.',
      type: 'primary'
    });
  }
}

function chooseContract(state: GameState): SerialContract | null {
  const eligible = serialContracts.filter(c =>
    state.age >= c.minAge &&
    state.serialKiller.notoriety >= c.minNotoriety
  );
  if (eligible.length === 0) return null;

  const totalWeight = eligible.reduce((sum, c) => sum + Math.max(1, c.minNotoriety + 5), 0);
  let roll = Math.random() * totalWeight;
  for (const contract of eligible) {
    roll -= Math.max(1, contract.minNotoriety + 5);
    if (roll <= 0) return contract;
  }
  return eligible[eligible.length - 1];
}

export const CAREER_ACTIONS: CareerAction[] = [
  {
    id: 'work_hard',
    name: 'Work Hard',
    timeCost: 3,
    isAvailable: (state) => !!state.career.id,
    perform: (state) => {
      if (!spendTime(state, 3)) return;
      state.career.performance = Math.min(100, state.career.performance + Math.floor(Math.random() * 10) + 6);
      state.stats.happiness = Math.max(0, state.stats.happiness - 2);
      state.stats.smarts = Math.min(100, state.stats.smarts + 1);
      state.history.push({ age: state.age, year: state.year, text: `You put in extra work as a ${state.career.title}.`, type: 'secondary' });
    }
  },
  {
    id: 'resign_job',
    name: 'Resign Job',
    timeCost: 1,
    isAvailable: (state) => !!state.career.id,
    perform: (state) => {
      if (!spendTime(state, 1)) return;
      const title = state.career.title;
      clearCareer(state);
      state.history.push({ age: state.age, year: state.year, text: `You resigned from your role as ${title}.`, type: 'primary' });
    }
  },
  {
    id: 'start_engineering_startup',
    name: 'Start Engineering Startup',
    timeCost: 3,
    isAvailable: (state) =>
      !!state.career.id &&
      state.age >= 25 &&
      state.finances.cash >= 40000 &&
      state.career.level >= 2 &&
      state.career.field === 'Engineering',
    perform: (state) => {
      if (!spendTime(state, 3)) return;

      state.finances.cash -= 40000;
      state.career.id = 'engineering_founder';
      state.career.title = `Founder, ${state.career.specialization || 'Engineering'} Startup`;
      state.career.field = 'Engineering';
      state.career.specialization = state.career.specialization || 'General';
      state.career.level = 1;
      state.career.performance = 60;
      state.career.yearsInRole = 0;
      state.finances.salary = Math.floor(50000 + Math.random() * 35000);
      state.history.push({ age: state.age, year: state.year, text: `You launched your own ${state.career.specialization.toLowerCase()} startup.`, type: 'primary' });
    }
  },
  {
    id: 'unlock_serial_path',
    name: 'Indulge Dark Impulses (Secret)',
    timeCost: 2,
    isAvailable: (state) =>
      !state.serialKiller.unlocked &&
      !state.serialKiller.caught &&
      state.age >= 18 &&
      state.stats.craziness >= 70 &&
      state.stats.willpower <= 55,
    perform: (state) => {
      if (!spendTime(state, 2)) return;
      const aliases = ['Night Ledger', 'Paper Ghost', 'Cold Witness', 'Nocturne', 'Quiet Null'];
      state.serialKiller.unlocked = true;
      state.serialKiller.mode = state.career.id ? 'double_life' : 'full_time';
      state.serialKiller.alias = aliases[Math.floor(Math.random() * aliases.length)];
      state.serialKiller.notoriety = 5;
      state.serialKiller.heat = 5;
      state.stats.karma = clampStat(state.stats.karma - 25);
      state.history.push({
        age: state.age,
        year: state.year,
        text: `You embraced a hidden violent identity under the alias "${state.serialKiller.alias}".`,
        type: 'primary'
      });
    }
  },
  {
    id: 'serial_mode_double_life',
    name: 'Operate as Double Life',
    timeCost: 1,
    isAvailable: (state) =>
      state.serialKiller.unlocked &&
      !state.serialKiller.caught &&
      state.serialKiller.mode !== 'double_life',
    perform: (state) => {
      if (!spendTime(state, 1)) return;
      state.serialKiller.mode = 'double_life';
      state.history.push({ age: state.age, year: state.year, text: 'You decided to hide behind a normal day-to-day persona.', type: 'secondary' });
    }
  },
  {
    id: 'serial_mode_full_time',
    name: 'Go Full-Time Predator',
    timeCost: 1,
    isAvailable: (state) =>
      state.serialKiller.unlocked &&
      !state.serialKiller.caught &&
      state.serialKiller.mode !== 'full_time',
    perform: (state) => {
      if (!spendTime(state, 1)) return;
      if (state.career.id) {
        const previousTitle = state.career.title;
        clearCareer(state);
        state.history.push({ age: state.age, year: state.year, text: `You abandoned your public role as ${previousTitle}.`, type: 'secondary' });
      }
      state.serialKiller.mode = 'full_time';
      state.history.push({ age: state.age, year: state.year, text: 'You shifted into a full-time shadow career built around contracts and violence.', type: 'primary' });
    }
  },
  {
    id: 'serial_contract',
    name: 'Take Contract',
    timeCost: 3,
    isAvailable: (state) =>
      state.serialKiller.unlocked &&
      !state.serialKiller.caught &&
      state.serialKiller.mode !== 'none' &&
      state.serialKiller.lastContractYear !== state.year &&
      serialContracts.some(c => state.age >= c.minAge && state.serialKiller.notoriety >= c.minNotoriety),
    perform: (state) => {
      if (!spendTime(state, 3)) return;
      const contract = chooseContract(state);
      if (!contract) {
        state.history.push({ age: state.age, year: state.year, text: 'No viable contracts were available in your network.', type: 'secondary' });
        return;
      }

      state.serialKiller.lastContractYear = state.year;
      if (Math.random() < contract.risk) {
        state.serialKiller.heat = clampStat(state.serialKiller.heat + contract.heatGain + 12);
        state.serialKiller.notoriety = clampStat(state.serialKiller.notoriety + Math.floor(contract.notorietyGain / 2));
        state.history.push({ age: state.age, year: state.year, text: `Contract "${contract.codename}" went sideways. You escaped, but investigators now have leads.`, type: 'primary' });
        return;
      }

      state.finances.cash += contract.payout;
      state.serialKiller.contractsCompleted += 1;
      state.serialKiller.kills += 1;
      state.serialKiller.heat = clampStat(state.serialKiller.heat + contract.heatGain);
      state.serialKiller.notoriety = clampStat(state.serialKiller.notoriety + contract.notorietyGain);
      state.serialKiller.lastKillYear = state.year;
      state.stats.karma = clampStat(state.stats.karma - 18);
      state.stats.happiness = clampStat(state.stats.happiness + 4);
      state.history.push({ age: state.age, year: state.year, text: `You completed contract "${contract.codename}" and earned $${contract.payout.toLocaleString()}.`, type: 'primary' });
    }
  },
  {
    id: 'serial_hunt',
    name: 'Hunt Independently',
    timeCost: 3,
    isAvailable: (state) =>
      state.serialKiller.unlocked &&
      !state.serialKiller.caught &&
      state.serialKiller.mode !== 'none' &&
      state.serialKiller.lastKillYear !== state.year,
    perform: (state) => {
      if (!spendTime(state, 3)) return;
      state.serialKiller.lastKillYear = state.year;
      state.serialKiller.kills += 1;
      state.serialKiller.notoriety = clampStat(state.serialKiller.notoriety + 7);
      state.serialKiller.heat = clampStat(state.serialKiller.heat + 14);
      state.stats.karma = clampStat(state.stats.karma - 20);
      state.stats.happiness = clampStat(state.stats.happiness + 3);
      state.history.push({ age: state.age, year: state.year, text: 'You acted on your violent compulsions and left another body in your wake.', type: 'primary' });
    }
  },
  {
    id: 'serial_lay_low',
    name: 'Lay Low and Scrub Trail',
    timeCost: 2,
    isAvailable: (state) =>
      state.serialKiller.unlocked &&
      !state.serialKiller.caught &&
      state.serialKiller.mode !== 'none' &&
      state.serialKiller.heat > 0,
    perform: (state) => {
      if (!spendTime(state, 2)) return;
      state.serialKiller.heat = clampStat(state.serialKiller.heat - 20);
      state.stats.happiness = clampStat(state.stats.happiness - 2);
      state.history.push({ age: state.age, year: state.year, text: 'You disappeared for a while and erased as many traces as possible.', type: 'secondary' });
    }
  },
  {
    id: 'serial_maintain_cover',
    name: 'Maintain Day-Job Cover',
    timeCost: 2,
    isAvailable: (state) =>
      state.serialKiller.unlocked &&
      !state.serialKiller.caught &&
      state.serialKiller.mode === 'double_life' &&
      !!state.career.id,
    perform: (state) => {
      if (!spendTime(state, 2)) return;
      state.career.performance = clampStat(state.career.performance + 6);
      state.serialKiller.heat = clampStat(state.serialKiller.heat - 8);
      state.stats.happiness = clampStat(state.stats.happiness - 1);
      state.history.push({ age: state.age, year: state.year, text: 'You leaned into your public routine and reinforced your facade.', type: 'secondary' });
    }
  }
];

export function getCareerApplyActions(state: GameState): CareerAction[] {
  if (state.career.id) return [];

  return getEligibleCareers(state).map((career): CareerAction => ({
    id: `apply_${career.id}`,
    name: `Apply: ${career.title}`,
    timeCost: 1,
    isAvailable: (s) => !s.career.id && canApply(s, career),
    perform: (s) => {
      if (!spendTime(s, 1)) return;
      applyForCareer(s, career.id);
    }
  }));
}

export function getAvailableCareerActions(state: GameState): CareerAction[] {
  const baseActions = CAREER_ACTIONS.filter(action => action.isAvailable(state));
  const applyActions = getCareerApplyActions(state);
  return [...baseActions, ...applyActions];
}

export function performCareerAction(state: GameState, actionId: string) {
  const allActions = getAvailableCareerActions(state);
  const action = allActions.find(a => a.id === actionId);
  if (!action || !action.isAvailable(state)) return;
  action.perform(state);
}
