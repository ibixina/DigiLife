import { createInitialState } from '../src/core/GameState';
import type { GameState } from '../src/core/GameState';
import { processEducationYear, performEducationAction, getAvailableEducationActions } from '../src/systems/EducationSystem';
import { registerCareers, getAvailableCareerActions, performCareerAction, processCareerYear, processSerialKillerYear, registerSerialContracts } from '../src/systems/CareerSystem';
import type { CareerDefinition, SerialContract } from '../src/systems/CareerSystem';
import { test, equal, assert, includes, notIncludes, withMockedRandom } from './harness';

function actionIds(state: GameState): string[] {
  return getAvailableEducationActions(state).map(a => a.id);
}

function careerActionIds(state: GameState): string[] {
  return getAvailableCareerActions(state).map(a => a.id);
}

function makeAdultState(): GameState {
  const state = createInitialState();
  state.age = 25;
  state.year = 2050;
  state.timeBudget = 12;
  state.currentLocation = 'Home';
  state.stats.smarts = 85;
  state.stats.willpower = 80;
  return state;
}

test('Education progression sets school levels at milestone ages', () => {
  const state = createInitialState();

  state.age = 5;
  processEducationYear(state);
  equal(state.education.level, 'Primary', 'Age 5 should start Primary');

  state.age = 13;
  processEducationYear(state);
  equal(state.education.level, 'Secondary', 'Age 13 should start Secondary');

  state.age = 17;
  processEducationYear(state);
  equal(state.education.level, 'High School', 'Age 17 should complete High School');
});

test('Enrolling in degree does not set major before graduation', () => {
  const state = createInitialState();
  state.age = 18;
  state.education.level = 'High School';
  state.timeBudget = 12;

  performEducationAction(state, 'enroll_prelaw_bachelor');

  equal(state.education.inProgram, true, 'Enrollment should start a program');
  equal(state.education.major, null, 'Major should remain unset until graduation');
});

test('Graduation sets major to highest completed degree', () => {
  const state = createInitialState();
  state.age = 18;
  state.year = 2050;
  state.education.level = 'High School';
  state.timeBudget = 12;

  performEducationAction(state, 'enroll_prelaw_bachelor');
  assert(state.education.inProgram, 'Should be in program after enrollment');

  withMockedRandom([0.99], () => {
    for (let i = 0; i < 4; i++) {
      state.year += 1;
      processEducationYear(state);
    }
  });

  equal(state.education.level, 'Bachelor', 'Should graduate to Bachelor');
  equal(state.education.major, 'Pre-Law', 'Major should be set at graduation');
});

test('Academic dismissal does not overwrite prior completed major', () => {
  const state = createInitialState();
  state.age = 22;
  state.year = 2055;
  state.education.level = 'Bachelor';
  state.education.major = 'Pre-Law';
  state.education.gpa = 0.8;
  state.timeBudget = 12;

  performEducationAction(state, 'enroll_law_jd');
  assert(state.education.inProgram, 'JD enrollment should start');

  withMockedRandom([0.99, 0.0], () => {
    processEducationYear(state);
  });

  equal(state.education.inProgram, false, 'Low GPA dismissal should end program');
  equal(state.education.major, 'Pre-Law', 'Major should remain highest completed degree');
});

test('Bar exam is limited to once per year', () => {
  const state = makeAdultState();
  state.education.level = 'Doctorate';
  state.education.major = 'Law';
  state.finances.cash = 10000;

  includes(actionIds(state), 'take_bar_exam', 'Bar exam should be available initially');

  withMockedRandom([0.99], () => {
    performEducationAction(state, 'take_bar_exam');
  });

  notIncludes(actionIds(state), 'take_bar_exam', 'Bar exam should not be available again this year');

  state.year += 1;
  state.timeBudget = 12;
  includes(actionIds(state), 'take_bar_exam', 'Bar exam should be available next year');
});

test('Passing bar exam grants license flag', () => {
  const state = makeAdultState();
  state.education.level = 'Doctorate';
  state.education.major = 'Law';
  state.finances.cash = 10000;

  withMockedRandom([0.0], () => {
    performEducationAction(state, 'take_bar_exam');
  });

  equal(state.flags.license_bar, true, 'Passing bar should set license flag');
});

test('Career apply actions enforce required flags and majors', () => {
  const careers: CareerDefinition[] = [
    {
      id: 'test_corp_attorney',
      title: 'Corporate Attorney',
      field: 'Law',
      specialization: 'Corporate Law',
      requiredEducation: 'Doctorate',
      requiredMajors: ['Law'],
      requiredFlagsAll: ['license_bar'],
      minAge: 24,
      minSmarts: 70,
      minWillpower: 60,
      startSalary: 140000,
      annualRaise: 0.09,
      difficulty: 0.5
    }
  ];
  registerCareers(careers);

  const state = makeAdultState();
  state.education.level = 'Doctorate';
  state.education.major = 'Law';

  notIncludes(careerActionIds(state), 'apply_test_corp_attorney', 'Should not apply without bar license');

  state.flags.license_bar = true;
  includes(careerActionIds(state), 'apply_test_corp_attorney', 'Should apply with required bar license');
});

test('Judge requires licensed law years, not total law years', () => {
  const careers: CareerDefinition[] = [
    {
      id: 'judge',
      title: 'Judge',
      field: 'Law',
      specialization: 'Judiciary',
      requiredEducation: 'Doctorate',
      requiredMajors: ['Law'],
      requiredFlagsAll: ['license_bar'],
      requiredLicensedLawYears: 8,
      minAge: 35,
      minSmarts: 80,
      minWillpower: 75,
      startSalary: 180000,
      annualRaise: 0.07,
      difficulty: 0.8
    }
  ];
  registerCareers(careers);

  const state = makeAdultState();
  state.age = 40;
  state.education.level = 'Doctorate';
  state.education.major = 'Law';
  state.flags.license_bar = true;
  state.career.lawYearsExperience = 12;
  state.career.licensedLawYearsExperience = 7;

  notIncludes(careerActionIds(state), 'apply_judge', 'Should block judge below licensed year requirement');

  state.career.licensedLawYearsExperience = 8;
  includes(careerActionIds(state), 'apply_judge', 'Should allow judge at licensed year threshold');
});

test('Law experience tracks separately from licensed law experience', () => {
  const careers: CareerDefinition[] = [
    {
      id: 'legal_assistant',
      title: 'Legal Assistant',
      field: 'Law',
      specialization: 'Legal Ops',
      requiredEducation: 'High School',
      minAge: 18,
      minSmarts: 40,
      minWillpower: 30,
      startSalary: 45000,
      annualRaise: 0.04,
      difficulty: 0.2
    }
  ];
  registerCareers(careers);

  const state = makeAdultState();
  state.education.level = 'High School';

  withMockedRandom([0.0], () => {
    performCareerAction(state, 'apply_legal_assistant');
  });

  assert(!!state.career.id, 'Should be hired into legal assistant role');

  withMockedRandom([0.5, 0.9, 0.9], () => {
    processCareerYear(state);
    processCareerYear(state);
  });

  equal(state.career.lawYearsExperience, 2, 'Law years should grow while in law role');
  equal(state.career.licensedLawYearsExperience, 0, 'Licensed law years should not grow without license');

  state.flags.license_bar = true;

  withMockedRandom([0.5], () => {
    processCareerYear(state);
  });

  equal(state.career.lawYearsExperience, 3, 'Law years should continue growing');
  equal(state.career.licensedLawYearsExperience, 1, 'Licensed law years should grow only after licensing');
});

test('Secret serial-killer path unlocks from high-craziness profile', () => {
  registerCareers([]);
  registerSerialContracts([]);
  const state = makeAdultState();
  state.stats.craziness = 85;
  state.stats.willpower = 40;
  state.timeBudget = 12;

  includes(careerActionIds(state), 'unlock_serial_path', 'Unlock action should appear for qualifying profile');

  withMockedRandom([0.1], () => {
    performCareerAction(state, 'unlock_serial_path');
  });

  equal(state.serialKiller.unlocked, true, 'Shadow path should unlock');
  assert(!!state.serialKiller.alias, 'Alias should be generated');
  assert(state.serialKiller.mode === 'double_life' || state.serialKiller.mode === 'full_time', 'Mode should be initialized');
});

test('Switching to full-time serial mode resigns normal career', () => {
  const careers: CareerDefinition[] = [
    {
      id: 'cover_job',
      title: 'Office Clerk',
      field: 'Business',
      specialization: 'Admin',
      requiredEducation: 'High School',
      minAge: 18,
      minSmarts: 10,
      minWillpower: 10,
      startSalary: 40000,
      annualRaise: 0.01,
      difficulty: 0.1
    }
  ];
  registerCareers(careers);
  registerSerialContracts([]);

  const state = makeAdultState();
  state.education.level = 'High School';
  withMockedRandom([0.0], () => {
    performCareerAction(state, 'apply_cover_job');
  });
  assert(!!state.career.id, 'Should start with a cover job');

  state.serialKiller.unlocked = true;
  state.serialKiller.mode = 'double_life';
  state.timeBudget = 12;
  performCareerAction(state, 'serial_mode_full_time');

  equal(state.serialKiller.mode, 'full_time', 'Mode should switch to full-time');
  equal(state.career.id, null, 'Normal career should be dropped in full-time mode');
});

test('Serial contract completion rewards cash and tracks heat/notoriety', () => {
  registerCareers([]);
  const contracts: SerialContract[] = [
    {
      id: 'test_contract',
      codename: 'Test Contract',
      minAge: 18,
      minNotoriety: 0,
      payout: 50000,
      heatGain: 10,
      notorietyGain: 12,
      risk: 0.1
    }
  ];
  registerSerialContracts(contracts);

  const state = makeAdultState();
  state.serialKiller.unlocked = true;
  state.serialKiller.mode = 'full_time';
  state.serialKiller.notoriety = 10;
  state.finances.cash = 0;
  state.timeBudget = 12;

  withMockedRandom([0.0, 0.9], () => {
    performCareerAction(state, 'serial_contract');
  });

  equal(state.finances.cash, 50000, 'Successful contract should pay out');
  equal(state.serialKiller.contractsCompleted, 1, 'Contracts completed should increment');
  equal(state.serialKiller.kills, 1, 'Kills should increment via contract');
  equal(state.serialKiller.heat, 10, 'Heat should increase by contract heat');
  equal(state.serialKiller.notoriety, 22, 'Notoriety should increase by contract notoriety gain');
});

test('Annual serial processing can catch player at extreme heat', () => {
  registerCareers([]);
  registerSerialContracts([]);

  const state = makeAdultState();
  state.serialKiller.unlocked = true;
  state.serialKiller.mode = 'full_time';
  state.serialKiller.heat = 95;
  state.serialKiller.notoriety = 80;
  state.career.id = 'cover';
  state.career.title = 'Cover Job';
  state.finances.salary = 42000;

  withMockedRandom([0.0], () => {
    processSerialKillerYear(state);
  });

  equal(state.serialKiller.caught, true, 'Extreme heat should be able to trigger capture');
  equal(state.serialKiller.mode, 'none', 'Capture should end serial mode');
  equal(state.career.id, null, 'Capture should clear regular career');
  equal(state.finances.salary, 0, 'Capture should remove salary');
});
