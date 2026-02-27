import type { GameState } from '../core/GameState';
import type { WrestlingContractClauses, WrestlingContractOffer } from '../core/GameState';
import type { EducationLevel } from './EducationSystem';
import { hasTimeForAction, spendActionTime } from './ActionTimeSystem';

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
  minAthleticism?: number;
  minLooks?: number;
  requiredTotalYearsExperience?: number;
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

function getFlagNumber(state: GameState, key: string, fallback = 0): number {
  const value = state.flags[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function setClampedFlag(state: GameState, key: string, value: number): void {
  state.flags[key] = clampStat(value);
}

function getInjuryYears(state: GameState): number {
  const raw = getFlagNumber(state, 'wrestling_injury_years', 0);
  return Math.max(0, Math.floor(raw));
}

function setInjuryYears(state: GameState, years: number): void {
  state.flags.wrestling_injury_years = Math.max(0, Math.floor(years));
}

function isWrestlingCareer(state: GameState): boolean {
  return state.career.field === 'Wrestling';
}

function getCareerActionLocation(actionId: string, state: GameState): string | null {
  if (actionId.startsWith('apply_')) return null;
  if (actionId.startsWith('wrestling_')) return 'Arena';
  if (actionId.startsWith('serial_') || actionId === 'unlock_serial_path') return null;

  const field = state.career.field;
  if (!field) return null;
  if (field === 'Wrestling') return 'Arena';
  if (field === 'Law') return 'Court';
  if (field === 'Politics') return 'Office';
  return 'Office';
}

function meetsCareerLocation(state: GameState, actionId: string): boolean {
  const requiredLocation = getCareerActionLocation(actionId, state);
  return !requiredLocation || state.currentLocation === requiredLocation;
}

function getWrestlingStyleRiskMultiplier(state: GameState): number {
  const specialization = (state.career.specialization || '').toLowerCase();
  if (specialization.includes('deathmatch') || specialization.includes('hardcore')) return 1.8;
  if (specialization.includes('lucha')) return 1.35;
  if (specialization.includes('strong style')) return 1.45;
  if (specialization.includes('tag')) return 0.92;
  return 1;
}

function isBackstageWrestlingRole(state: GameState): boolean {
  const title = (state.career.title || '').toLowerCase();
  const specialization = (state.career.specialization || '').toLowerCase();
  return (
    specialization.includes('backstage') ||
    title.includes('writer') ||
    title.includes('producer') ||
    title.includes('booker')
  );
}

function inferPromotionId(def: CareerDefinition): string {
  const id = def.id.toLowerCase();
  if (id.includes('wwe')) return 'wwe';
  if (id.includes('aew')) return 'aew';
  if (id.includes('njpw')) return 'njpw';
  if (id.includes('cmll')) return 'cmll';
  if (id.includes('global')) return 'global';
  if (id.includes('indie')) return 'indie';
  if (id.includes('booker') || id.includes('writer') || id.includes('producer')) return 'backstage';
  return 'regional';
}

function promotionNameFromId(promotionId: string): string {
  switch (promotionId) {
    case 'wwe': return 'WWE';
    case 'aew': return 'AEW';
    case 'njpw': return 'NJPW';
    case 'cmll': return 'CMLL';
    case 'global': return 'Global Free Agent Circuit';
    case 'backstage': return 'Backstage Creative';
    case 'indie': return 'Independent Circuit';
    default: return 'Regional Promotion';
  }
}

function generateContractClauses(baseSalary: number): WrestlingContractClauses {
  const downsideGuarantee = Math.floor(baseSalary * (0.65 + (Math.random() * 0.25)));
  return {
    downsideGuarantee,
    merchCutPercent: Math.max(3, Math.min(18, Math.round(5 + Math.random() * 10))),
    appearanceMinimum: Math.max(8, Math.min(42, Math.round(12 + Math.random() * 18))),
    nonCompeteMonths: Math.max(0, Math.min(12, Math.round(Math.random() * 9))),
    creativeControl: Math.random() < 0.2,
    injuryProtection: Math.random() < 0.72,
    travelCovered: Math.random() < 0.86,
    exclusivity: Math.random() < 0.7 ? 'exclusive' : (Math.random() < 0.65 ? 'semi-exclusive' : 'open')
  };
}

function setWrestlingContract(state: GameState, def: CareerDefinition, termYears = 5): void {
  const promotionId = inferPromotionId(def);
  const promotionName = promotionNameFromId(promotionId);
  const annualSalary = Math.max(def.startSalary, state.finances.salary || def.startSalary);
  state.wrestlingContract = {
    promotionId,
    promotionName,
    startYear: state.year,
    endYear: state.year + Math.max(1, termYears),
    annualSalary,
    clauses: generateContractClauses(annualSalary),
    rivalOffer: null
  };
}

function formatClauseSummary(clauses: WrestlingContractClauses): string {
  const control = clauses.creativeControl ? 'creative control' : 'standard creative terms';
  const injury = clauses.injuryProtection ? 'injury protection' : 'limited injury coverage';
  return `${clauses.exclusivity}, ${control}, ${injury}, ${clauses.merchCutPercent}% merch`;
}

function maybeGenerateRivalOffer(state: GameState): void {
  if (!state.wrestlingContract || isBackstageWrestlingRole(state)) return;
  if (state.wrestlingContract.rivalOffer) return;

  const yearsLeft = state.wrestlingContract.endYear - state.year;
  const momentum = getFlagNumber(state, 'wrestling_momentum', 30);
  const fanBase = getFlagNumber(state, 'wrestling_fan_base', 30);
  const heat = Math.max(0.05, Math.min(0.55, 0.08 + (momentum / 250) + (fanBase / 280) + (yearsLeft <= 2 ? 0.12 : 0)));
  if (Math.random() >= heat) return;

  const currentPromotionId = state.wrestlingContract.promotionId;
  const promotions = ['wwe', 'aew', 'njpw', 'cmll', 'global', 'indie'].filter(p => p !== currentPromotionId);
  const targetPromotionId = promotions[Math.floor(Math.random() * promotions.length)];
  const salaryLift = 1.06 + (Math.random() * 0.38);
  const annualSalary = Math.floor(state.wrestlingContract.annualSalary * salaryLift);
  const offer: WrestlingContractOffer = {
    promotionId: targetPromotionId,
    promotionName: promotionNameFromId(targetPromotionId),
    annualSalary,
    termYears: 3 + Math.floor(Math.random() * 4),
    clauses: generateContractClauses(annualSalary)
  };

  state.wrestlingContract.rivalOffer = offer;
  state.history.push({
    age: state.age,
    year: state.year,
    text: `${offer.promotionName} approached you with a ${offer.termYears}-year offer worth $${offer.annualSalary.toLocaleString()}/yr (${formatClauseSummary(offer.clauses)}).`,
    type: 'primary'
  });
}

function ensureWrestlingContacts(state: GameState): void {
  const promotionId = state.wrestlingContract?.promotionId || 'indie';
  const wrestlingPeople = state.relationships.filter(r =>
    r.isAlive &&
    (r.location === 'Arena' || r.traits.includes('Wrestling')) &&
    (r.promotionId || promotionId) === promotionId
  );
  if (wrestlingPeople.length >= 4) return;

  const names = ['Chris Vale', 'Mika Storm', 'Rico Blaze', 'Noah Cross', 'Aki Sato', 'Lena Frost', 'Diego Luna', 'Tori King'];
  const ringSideRoles = ['Co-worker', 'Co-worker', 'Co-worker', 'Boss'] as const;
  const needed = 4 - wrestlingPeople.length;

  for (let i = 0; i < needed; i++) {
    const name = names[Math.floor(Math.random() * names.length)];
    const type = ringSideRoles[Math.floor(Math.random() * ringSideRoles.length)];
    state.relationships.push({
      id: `wrestling_${Date.now()}_${Math.floor(Math.random() * 1000000)}_${i}`,
      name,
      type,
      gender: Math.random() < 0.5 ? 'Male' : 'Female',
      age: Math.max(20, state.age + Math.floor(Math.random() * 12) - 5),
      health: 70 + Math.floor(Math.random() * 21),
      happiness: 50 + Math.floor(Math.random() * 31),
      smarts: 45 + Math.floor(Math.random() * 36),
      looks: 45 + Math.floor(Math.random() * 36),
      relationshipToPlayer: 35 + Math.floor(Math.random() * 26),
      familiarity: 35 + Math.floor(Math.random() * 31),
      location: 'Arena',
      workplace: 'Arena',
      promotionId,
      isAlive: true,
      traits: ['Wrestling']
    });
  }
}

function ensureWrestlingProfile(state: GameState): void {
  if (!state.flags.wrestling_ring_name) {
    const handles = ['Iron Pulse', 'Silver Tempest', 'North Star', 'Atlas Prime', 'Night Comet', 'El Relampago', 'Kitsune Strike'];
    state.flags.wrestling_ring_name = handles[Math.floor(Math.random() * handles.length)];
  }

  if (state.flags.wrestling_fan_base === undefined) {
    setClampedFlag(state, 'wrestling_fan_base', 22 + Math.floor(Math.random() * 16));
  }
  if (state.flags.wrestling_momentum === undefined) {
    setClampedFlag(state, 'wrestling_momentum', 28 + Math.floor(Math.random() * 16));
  }
  if (state.flags.wrestling_promo_skill === undefined) {
    const basePromo = Math.round((state.stats.looks * 0.45) + (state.stats.smarts * 0.35) + (state.stats.willpower * 0.2));
    setClampedFlag(state, 'wrestling_promo_skill', basePromo);
  }
  if (!state.flags.wrestling_alignment) {
    state.flags.wrestling_alignment = 'face';
  }
  if (state.flags.wrestling_push === undefined) {
    setClampedFlag(state, 'wrestling_push', 30 + Math.floor(Math.random() * 21));
  }
  if (state.flags.wrestling_retired === undefined) {
    state.flags.wrestling_retired = false;
  }
  if (state.flags.wrestling_injury_years === undefined) {
    setInjuryYears(state, 0);
  }
  ensureWrestlingContacts(state);
}

function spendTime(state: GameState, timeCost: number): boolean {
  return spendActionTime(state, timeCost);
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
  state.wrestlingContract = null;
}

function canApply(state: GameState, def: CareerDefinition): boolean {
  const hasWrestlingTryoutInvite = state.flags.wrestling_tryout_invited === true;
  const wrestlingStatBuffer = def.field === 'Wrestling' && hasWrestlingTryoutInvite ? 15 : 0;

  if (state.age < def.minAge) return false;
  if (!hasEducation(state, def.requiredEducation)) return false;
  if (state.stats.smarts < Math.max(0, def.minSmarts - wrestlingStatBuffer)) return false;
  if (state.stats.willpower < Math.max(0, def.minWillpower - wrestlingStatBuffer)) return false;
  if (def.minAthleticism !== undefined && state.stats.athleticism < Math.max(0, def.minAthleticism - wrestlingStatBuffer)) return false;
  if (def.minLooks !== undefined && state.stats.looks < Math.max(0, def.minLooks - wrestlingStatBuffer)) return false;
  if (def.requiredTotalYearsExperience !== undefined && state.career.totalYearsExperience < def.requiredTotalYearsExperience) return false;
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
    if (def.field === 'Wrestling') {
      setWrestlingContract(state, def, 5);
      ensureWrestlingProfile(state);
      const contract = state.wrestlingContract;
      const ringName = String(state.flags.wrestling_ring_name);
      const fanBase = getFlagNumber(state, 'wrestling_fan_base', 30);
      const momentum = getFlagNumber(state, 'wrestling_momentum', 30);
      setClampedFlag(state, 'wrestling_fan_base', fanBase + 8);
      setClampedFlag(state, 'wrestling_momentum', momentum + 10);
      state.history.push({ age: state.age, year: state.year, text: `You signed a ${Math.max(1, (contract?.endYear || state.year + 1) - state.year)}-year deal with ${contract?.promotionName || 'a promotion'} as ${def.title}, debuting under the ring name "${ringName}".`, type: 'primary' });
    } else {
      state.wrestlingContract = null;
      state.history.push({ age: state.age, year: state.year, text: `You got hired as a ${def.title}.`, type: 'primary' });
    }
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
  if (isWrestlingCareer(state)) processWrestlingYear(state);

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

  const wrestlingPushGate = !isWrestlingCareer(state) || getFlagNumber(state, 'wrestling_push', 0) >= Math.min(85, 42 + (state.career.level * 10));
  const promotionChance = isWrestlingCareer(state)
    ? Math.max(0.35, Math.min(0.9, 0.38 + (getFlagNumber(state, 'wrestling_push', 35) / 180)))
    : 0.55;

  if (canPromote && wrestlingPushGate && Math.random() < promotionChance) {
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

function processWrestlingYear(state: GameState) {
  ensureWrestlingProfile(state);
  maybeGenerateRivalOffer(state);

  if (state.wrestlingContract && state.year >= state.wrestlingContract.endYear) {
    const promotionName = state.wrestlingContract.promotionName;
    state.history.push({ age: state.age, year: state.year, text: `Your contract with ${promotionName} expired. You are now a free agent and can negotiate a new deal or leave wrestling.`, type: 'primary' });
    clearCareer(state);
    state.wrestlingContract = null;
    return;
  }

  const fanBase = getFlagNumber(state, 'wrestling_fan_base', 30);
  const momentum = getFlagNumber(state, 'wrestling_momentum', 30);
  const push = getFlagNumber(state, 'wrestling_push', 30);
  const promoSkill = getFlagNumber(state, 'wrestling_promo_skill', 50);
  const injuryYears = getInjuryYears(state);
  const isBackstage = isBackstageWrestlingRole(state);

  const pushDelta = Math.floor((momentum - 50) / 14) + Math.floor((fanBase - 50) / 18) + (Math.floor(Math.random() * 5) - 2);
  setClampedFlag(state, 'wrestling_push', push + pushDelta);

  if (injuryYears > 0 && !isBackstage) {
    setInjuryYears(state, injuryYears - 1);
    state.stats.health = clampStat(state.stats.health + 4);
    state.career.performance = clampStat(state.career.performance - (2 + Math.floor(Math.random() * 4)));
    setClampedFlag(state, 'wrestling_momentum', momentum - 4);
    state.history.push({
      age: state.age,
      year: state.year,
      text: 'You spent most of the year recovering from ring injuries and missed key events.',
      type: 'secondary'
    });
    return;
  }

  const exposure = Math.max(1, state.career.level);
  const merchBonus = Math.floor((fanBase + state.career.performance + (exposure * 8) + (push * 0.7) + (promoSkill * 0.5)) * (50 + Math.random() * 80));
  if (merchBonus > 0) {
    state.finances.cash += merchBonus;
    state.history.push({ age: state.age, year: state.year, text: `Merch and appearance bonuses added $${merchBonus.toLocaleString()} to your income.`, type: 'secondary' });
  }

  const momentumShift = Math.floor((state.career.performance - 50) / 12) + Math.floor((push - 45) / 15) + (Math.floor(Math.random() * 9) - 4);
  setClampedFlag(state, 'wrestling_momentum', momentum + momentumShift);
  setClampedFlag(state, 'wrestling_fan_base', fanBase + Math.floor((state.career.performance - 45) / 15) + (Math.floor(Math.random() * 7) - 2));

  if (!isBackstage) {
    const styleRisk = getWrestlingStyleRiskMultiplier(state);
    const injuryChance = Math.max(0.04, Math.min(0.42, (0.07 + ((100 - state.stats.health) * 0.0016)) * styleRisk));
    if (Math.random() < injuryChance) {
      const severe = Math.random() < 0.3;
      const healthLoss = severe ? 18 + Math.floor(Math.random() * 11) : 8 + Math.floor(Math.random() * 8);
      setInjuryYears(state, severe ? 2 : 1);
      state.stats.health = clampStat(state.stats.health - healthLoss);
      state.career.performance = clampStat(state.career.performance - (severe ? 15 : 8));
      setClampedFlag(state, 'wrestling_momentum', getFlagNumber(state, 'wrestling_momentum', 30) - (severe ? 16 : 8));
      state.history.push({
        age: state.age,
        year: state.year,
        text: severe
          ? 'A major in-ring injury forced you to the sidelines and stalled your push.'
          : 'A nagging ring injury slowed your schedule this season.',
        type: 'primary'
      });
    }
  } else {
    const creativeBonus = Math.floor((promoSkill + push + momentum) * (20 + Math.random() * 35));
    state.finances.cash += creativeBonus;
    state.history.push({ age: state.age, year: state.year, text: `Your booking and production bonuses earned an extra $${creativeBonus.toLocaleString()}.`, type: 'secondary' });
  }

  const currentMomentum = getFlagNumber(state, 'wrestling_momentum', 30);
  if (currentMomentum <= 20 && state.career.performance <= 35 && Math.random() < 0.2) {
    state.history.push({ age: state.age, year: state.year, text: `Your promotion released you from your ${state.career.title} contract after a cold streak.`, type: 'primary' });
    clearCareer(state);
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
    id: 'wrestling_tryout',
    name: 'Attend Wrestling Tryout',
    timeCost: 2,
    isAvailable: (state) =>
      !state.career.id &&
      state.age >= 16 &&
      state.education.level !== 'None',
    perform: (state) => {
      if (!spendTime(state, 2)) return;

      state.stats.athleticism = clampStat(state.stats.athleticism + 3 + Math.floor(Math.random() * 5));
      state.stats.willpower = clampStat(state.stats.willpower + 1 + Math.floor(Math.random() * 3));
      state.stats.looks = clampStat(state.stats.looks + Math.floor(Math.random() * 2));

      const tryoutScore =
        state.stats.athleticism * 0.4 +
        state.stats.willpower * 0.25 +
        state.stats.looks * 0.15 +
        state.stats.smarts * 0.1 +
        (state.flags.wrestling_tryout_attempts ? 6 : 0);
      const inviteChance = Math.max(0.18, Math.min(0.92, (tryoutScore - 38) / 80));

      state.flags.wrestling_tryout_attempts = (Number(state.flags.wrestling_tryout_attempts) || 0) + 1;

      if (Math.random() < inviteChance) {
        state.flags.wrestling_tryout_invited = true;
        state.history.push({
          age: state.age,
          year: state.year,
          text: 'You impressed scouts at tryouts and earned a development invitation. Wrestling applications are now easier.',
          type: 'primary'
        });
      } else {
        state.history.push({
          age: state.age,
          year: state.year,
          text: 'You attended wrestling tryouts and gained experience, but scouts asked you to keep training.',
          type: 'secondary'
        });
      }
    }
  },
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
    id: 'wrestling_turn_heel',
    name: 'Turn Heel',
    timeCost: 2,
    isAvailable: (state) =>
      !!state.career.id &&
      state.career.field === 'Wrestling' &&
      !isBackstageWrestlingRole(state) &&
      state.flags.wrestling_alignment !== 'heel',
    perform: (state) => {
      if (!spendTime(state, 2)) return;
      ensureWrestlingProfile(state);
      state.flags.wrestling_alignment = 'heel';
      setClampedFlag(state, 'wrestling_momentum', getFlagNumber(state, 'wrestling_momentum', 30) + 12);
      setClampedFlag(state, 'wrestling_fan_base', getFlagNumber(state, 'wrestling_fan_base', 30) - 5);
      setClampedFlag(state, 'wrestling_push', getFlagNumber(state, 'wrestling_push', 30) + 8);
      state.history.push({ age: state.age, year: state.year, text: 'You turned heel and leaned into a villain persona. The crowd reaction is loud and polarizing.', type: 'primary' });
    }
  },
  {
    id: 'wrestling_turn_face',
    name: 'Turn Face',
    timeCost: 2,
    isAvailable: (state) =>
      !!state.career.id &&
      state.career.field === 'Wrestling' &&
      !isBackstageWrestlingRole(state) &&
      state.flags.wrestling_alignment !== 'face',
    perform: (state) => {
      if (!spendTime(state, 2)) return;
      ensureWrestlingProfile(state);
      state.flags.wrestling_alignment = 'face';
      setClampedFlag(state, 'wrestling_momentum', getFlagNumber(state, 'wrestling_momentum', 30) + 8);
      setClampedFlag(state, 'wrestling_fan_base', getFlagNumber(state, 'wrestling_fan_base', 30) + 10);
      state.history.push({ age: state.age, year: state.year, text: 'You turned face and the audience started rallying behind you.', type: 'primary' });
    }
  },
  {
    id: 'wrestling_cut_promo',
    name: 'Cut Promo',
    timeCost: 2,
    isAvailable: (state) => !!state.career.id && state.career.field === 'Wrestling',
    perform: (state) => {
      if (!spendTime(state, 2)) return;
      ensureWrestlingProfile(state);
      const promoRoll = Math.floor((state.stats.looks + state.stats.smarts + state.stats.willpower) / 32) + (Math.floor(Math.random() * 10) - 2);
      setClampedFlag(state, 'wrestling_promo_skill', getFlagNumber(state, 'wrestling_promo_skill', 45) + promoRoll);
      setClampedFlag(state, 'wrestling_momentum', getFlagNumber(state, 'wrestling_momentum', 30) + Math.floor(promoRoll / 2));
      setClampedFlag(state, 'wrestling_fan_base', getFlagNumber(state, 'wrestling_fan_base', 30) + Math.max(1, Math.floor(promoRoll / 3)));
      state.career.performance = clampStat(state.career.performance + Math.max(1, Math.floor(promoRoll / 3)));
      state.history.push({ age: state.age, year: state.year, text: 'You delivered a strong promo that raised your profile.', type: 'secondary' });
    }
  },
  {
    id: 'wrestling_work_house_show',
    name: 'Work House Show Loop',
    timeCost: 3,
    isAvailable: (state) => !!state.career.id && state.career.field === 'Wrestling' && !isBackstageWrestlingRole(state),
    perform: (state) => {
      if (!spendTime(state, 3)) return;
      ensureWrestlingProfile(state);
      const gateBonus = Math.floor((getFlagNumber(state, 'wrestling_fan_base', 30) + getFlagNumber(state, 'wrestling_push', 30)) * (140 + Math.random() * 140));
      state.finances.cash += gateBonus;
      state.career.performance = clampStat(state.career.performance + 4 + Math.floor(Math.random() * 6));
      setClampedFlag(state, 'wrestling_momentum', getFlagNumber(state, 'wrestling_momentum', 30) + 4);
      setClampedFlag(state, 'wrestling_fan_base', getFlagNumber(state, 'wrestling_fan_base', 30) + 3);

      const bumpRisk = Math.max(0.04, Math.min(0.3, 0.06 + ((100 - state.stats.health) * 0.0014)));
      if (Math.random() < bumpRisk) {
        setInjuryYears(state, Math.max(getInjuryYears(state), 1));
        state.stats.health = clampStat(state.stats.health - (6 + Math.floor(Math.random() * 7)));
        state.history.push({ age: state.age, year: state.year, text: `You worked the house show circuit and earned $${gateBonus.toLocaleString()}, but picked up a minor injury.`, type: 'primary' });
        return;
      }

      state.history.push({ age: state.age, year: state.year, text: `You worked the house show circuit and earned $${gateBonus.toLocaleString()}.`, type: 'secondary' });
    }
  },
  {
    id: 'wrestling_sell_merch',
    name: 'Push Merch Campaign',
    timeCost: 2,
    isAvailable: (state) => !!state.career.id && state.career.field === 'Wrestling',
    perform: (state) => {
      if (!spendTime(state, 2)) return;
      ensureWrestlingProfile(state);
      const alignmentBoost = state.flags.wrestling_alignment === 'face' ? 1.08 : 1.03;
      const payout = Math.floor((getFlagNumber(state, 'wrestling_fan_base', 30) + getFlagNumber(state, 'wrestling_promo_skill', 50)) * (110 + Math.random() * 170) * alignmentBoost);
      state.finances.cash += payout;
      setClampedFlag(state, 'wrestling_push', getFlagNumber(state, 'wrestling_push', 30) + 3);
      state.history.push({ age: state.age, year: state.year, text: `Your merch campaign connected with fans and brought in $${payout.toLocaleString()}.`, type: 'secondary' });
    }
  },
  {
    id: 'wrestling_negotiate_push',
    name: 'Negotiate Creative Push',
    timeCost: 2,
    isAvailable: (state) => !!state.career.id && state.career.field === 'Wrestling',
    perform: (state) => {
      if (!spendTime(state, 2)) return;
      ensureWrestlingProfile(state);
      const leverage = (
        getFlagNumber(state, 'wrestling_momentum', 30) * 0.35 +
        getFlagNumber(state, 'wrestling_fan_base', 30) * 0.35 +
        getFlagNumber(state, 'wrestling_promo_skill', 45) * 0.2 +
        state.career.performance * 0.1
      );
      const successChance = Math.max(0.18, Math.min(0.86, (leverage - 28) / 85));
      if (Math.random() < successChance) {
        setClampedFlag(state, 'wrestling_push', getFlagNumber(state, 'wrestling_push', 30) + 12);
        setClampedFlag(state, 'wrestling_momentum', getFlagNumber(state, 'wrestling_momentum', 30) + 8);
        state.career.performance = clampStat(state.career.performance + 5);
        state.history.push({ age: state.age, year: state.year, text: 'Creative approved a stronger push for your character.', type: 'primary' });
      } else {
        setClampedFlag(state, 'wrestling_momentum', getFlagNumber(state, 'wrestling_momentum', 30) - 6);
        state.career.performance = clampStat(state.career.performance - 3);
        state.history.push({ age: state.age, year: state.year, text: 'Your push request was rejected this cycle.', type: 'secondary' });
      }
    }
  },
  {
    id: 'wrestling_renegotiate_contract',
    name: 'Renegotiate Contract',
    timeCost: 2,
    isAvailable: (state) => !!state.career.id && state.career.field === 'Wrestling' && !!state.wrestlingContract,
    perform: (state) => {
      if (!spendTime(state, 2)) return;
      if (!state.wrestlingContract) return;
      ensureWrestlingProfile(state);

      const leverage = (
        getFlagNumber(state, 'wrestling_fan_base', 30) * 0.35 +
        getFlagNumber(state, 'wrestling_momentum', 30) * 0.25 +
        getFlagNumber(state, 'wrestling_promo_skill', 45) * 0.2 +
        getFlagNumber(state, 'wrestling_push', 30) * 0.1 +
        state.career.performance * 0.1
      );
      const successChance = Math.max(0.2, Math.min(0.92, (leverage - 25) / 85));

      if (Math.random() < successChance) {
        const salaryIncrease = Math.floor(state.wrestlingContract.annualSalary * (0.08 + (Math.random() * 0.18)));
        const extraYears = 1 + Math.floor(Math.random() * 3);
        const newSalary = state.wrestlingContract.annualSalary + salaryIncrease;
        state.wrestlingContract.annualSalary = newSalary;
        state.wrestlingContract.endYear += extraYears;
        state.wrestlingContract.clauses = {
          ...state.wrestlingContract.clauses,
          downsideGuarantee: Math.floor(newSalary * (0.68 + (Math.random() * 0.22))),
          merchCutPercent: Math.min(25, state.wrestlingContract.clauses.merchCutPercent + 1),
          appearanceMinimum: Math.max(8, state.wrestlingContract.clauses.appearanceMinimum - 1),
          creativeControl: state.wrestlingContract.clauses.creativeControl || Math.random() < 0.3,
          injuryProtection: true
        };
        state.finances.salary = Math.max(state.finances.salary, newSalary);
        state.history.push({
          age: state.age,
          year: state.year,
          text: `You renegotiated successfully: +$${salaryIncrease.toLocaleString()}/yr and a ${extraYears}-year extension (${formatClauseSummary(state.wrestlingContract.clauses)}).`,
          type: 'primary'
        });
      } else {
        const penalty = Math.floor(Math.random() * 6) + 4;
        setClampedFlag(state, 'wrestling_momentum', getFlagNumber(state, 'wrestling_momentum', 30) - penalty);
        state.history.push({ age: state.age, year: state.year, text: 'Contract talks stalled. Management cooled on your current push.', type: 'secondary' });
      }
    }
  },
  {
    id: 'wrestling_accept_rival_offer',
    name: 'Accept Rival Offer',
    timeCost: 1,
    isAvailable: (state) => !!state.career.id && state.career.field === 'Wrestling' && !!state.wrestlingContract?.rivalOffer,
    perform: (state) => {
      if (!spendTime(state, 1)) return;
      const offer = state.wrestlingContract?.rivalOffer;
      if (!offer) return;

      state.wrestlingContract = {
        promotionId: offer.promotionId,
        promotionName: offer.promotionName,
        startYear: state.year,
        endYear: state.year + offer.termYears,
        annualSalary: offer.annualSalary,
        clauses: offer.clauses,
        rivalOffer: null
      };
      state.finances.salary = Math.max(state.finances.salary, offer.annualSalary);
      state.history.push({ age: state.age, year: state.year, text: `You signed with ${offer.promotionName} on a ${offer.termYears}-year deal at $${offer.annualSalary.toLocaleString()}/yr.`, type: 'primary' });
      ensureWrestlingContacts(state);
    }
  },
  {
    id: 'wrestling_decline_rival_offer',
    name: 'Decline Rival Offer',
    timeCost: 1,
    isAvailable: (state) => !!state.career.id && state.career.field === 'Wrestling' && !!state.wrestlingContract?.rivalOffer,
    perform: (state) => {
      if (!spendTime(state, 1)) return;
      if (!state.wrestlingContract?.rivalOffer) return;
      const promotionName = state.wrestlingContract.rivalOffer.promotionName;
      state.wrestlingContract.rivalOffer = null;
      setClampedFlag(state, 'wrestling_push', getFlagNumber(state, 'wrestling_push', 30) + 2);
      state.history.push({ age: state.age, year: state.year, text: `You declined an offer from ${promotionName} and stayed loyal to your current promotion.`, type: 'secondary' });
    }
  },
  {
    id: 'wrestling_rehab',
    name: 'Rehab and Conditioning',
    timeCost: 2,
    isAvailable: (state) =>
      !!state.career.id &&
      state.career.field === 'Wrestling' &&
      (getInjuryYears(state) > 0 || state.stats.health < 85),
    perform: (state) => {
      if (!spendTime(state, 2)) return;
      const injuryYears = getInjuryYears(state);
      if (injuryYears > 0) setInjuryYears(state, injuryYears - 1);
      state.stats.health = clampStat(state.stats.health + 10 + Math.floor(Math.random() * 6));
      state.stats.athleticism = clampStat(state.stats.athleticism + 2);
      state.career.performance = clampStat(state.career.performance + 2);
      state.history.push({ age: state.age, year: state.year, text: 'You focused on rehab and conditioning to extend your career.', type: 'secondary' });
    }
  },
  {
    id: 'wrestling_retire',
    name: 'Retire from In-Ring Competition',
    timeCost: 1,
    isAvailable: (state) =>
      !!state.career.id &&
      state.career.field === 'Wrestling' &&
      !isBackstageWrestlingRole(state) &&
      (state.age >= 34 || getInjuryYears(state) > 0 || state.stats.health <= 55),
    perform: (state) => {
      if (!spendTime(state, 1)) return;
      state.flags.wrestling_retired = true;
      setInjuryYears(state, 0);
      const title = state.career.title;
      clearCareer(state);
      state.history.push({ age: state.age, year: state.year, text: `You retired from in-ring competition after your run as ${title}.`, type: 'primary' });
    }
  },
  {
    id: 'wrestling_backstage_write_show',
    name: 'Write Weekly Show',
    timeCost: 2,
    isAvailable: (state) => !!state.career.id && state.career.field === 'Wrestling' && isBackstageWrestlingRole(state),
    perform: (state) => {
      if (!spendTime(state, 2)) return;
      ensureWrestlingProfile(state);
      const creativeGain = 4 + Math.floor(Math.random() * 7);
      setClampedFlag(state, 'wrestling_momentum', getFlagNumber(state, 'wrestling_momentum', 30) + creativeGain);
      setClampedFlag(state, 'wrestling_push', getFlagNumber(state, 'wrestling_push', 30) + Math.floor(creativeGain / 2));
      state.career.performance = clampStat(state.career.performance + Math.floor(creativeGain / 2));
      state.stats.smarts = clampStat(state.stats.smarts + 1);
      state.history.push({ age: state.age, year: state.year, text: 'You mapped out stories and finishes for the upcoming cards.', type: 'secondary' });
    }
  },
  {
    id: 'wrestling_backstage_produce_match',
    name: 'Produce Featured Match',
    timeCost: 2,
    isAvailable: (state) => !!state.career.id && state.career.field === 'Wrestling' && isBackstageWrestlingRole(state),
    perform: (state) => {
      if (!spendTime(state, 2)) return;
      ensureWrestlingProfile(state);
      const successRoll = Math.random();
      if (successRoll < 0.75) {
        setClampedFlag(state, 'wrestling_momentum', getFlagNumber(state, 'wrestling_momentum', 30) + 7);
        setClampedFlag(state, 'wrestling_fan_base', getFlagNumber(state, 'wrestling_fan_base', 30) + 4);
        state.career.performance = clampStat(state.career.performance + 5);
        state.finances.cash += 12000 + Math.floor(Math.random() * 18000);
        state.history.push({ age: state.age, year: state.year, text: 'The featured match landed perfectly and drew strong fan buzz.', type: 'primary' });
      } else {
        setClampedFlag(state, 'wrestling_momentum', getFlagNumber(state, 'wrestling_momentum', 30) - 6);
        state.career.performance = clampStat(state.career.performance - 3);
        state.history.push({ age: state.age, year: state.year, text: 'The produced match underdelivered and drew criticism backstage.', type: 'secondary' });
      }
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
  const baseActions = CAREER_ACTIONS.filter(action =>
    action.isAvailable(state) &&
    hasTimeForAction(state, action.timeCost) &&
    meetsCareerLocation(state, action.id)
  );
  const applyActions = getCareerApplyActions(state).filter(action => meetsCareerLocation(state, action.id));
  return [...baseActions, ...applyActions].filter(action => hasTimeForAction(state, action.timeCost));
}

export function performCareerAction(state: GameState, actionId: string) {
  const allActions = getAvailableCareerActions(state);
  const action = allActions.find(a => a.id === actionId);
  if (!action || !action.isAvailable(state) || !meetsCareerLocation(state, actionId)) return;
  action.perform(state);
}
