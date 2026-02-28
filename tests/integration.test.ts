import { createInitialState } from '../src/core/GameState';
import type { GameState } from '../src/core/GameState';
import { registerCareers, getAvailableCareerActions, performCareerAction } from '../src/systems/CareerSystem';
import { getAvailableEducationActions, performEducationAction } from '../src/systems/EducationSystem';
import { getAvailableActivities, performActivity } from '../src/systems/ActivitySystem';
import { getAvailableInteractions, interactWithNPC, initializeFamily } from '../src/systems/RelationshipSystem';
import { 
  getAvailablePoliticalActions,
  registerPoliticalPositions,
  registerPolicies,
  registerScandals,
  getEligiblePositions 
} from '../src/systems/PoliticalSystem';
import POSITIONS from '../src/content/politics/positions.json';
import { test, equal, assert, includes, notIncludes } from './harness';
import type { CareerDefinition } from '../src/systems/CareerSystem';

function makeAdultState(): GameState {
  const state = createInitialState();
  state.age = 25;
  state.year = 2050;
  state.timeBudget = 12;
  state.locationTime = 10;
  state.currentLocation = 'Home';
  state.stats.smarts = 85;
  state.stats.willpower = 80;
  state.stats.health = 80;
  state.stats.happiness = 80;
  state.stats.looks = 70;
  state.stats.athleticism = 70;
  state.finances.cash = 50000;
  return state;
}

function travelTo(state: GameState, location: string): void {
  state.currentLocation = location;
  state.locationTime = 10; // Grant time at the new location
}

function makeTeenState(): GameState {
  const state = createInitialState();
  state.age = 16;
  state.year = 2041;
  state.timeBudget = 12;
  state.locationTime = 10;
  state.currentLocation = 'Home';
  state.stats.smarts = 60;
  state.stats.willpower = 55;
  return state;
}

function registerTestCareers(): void {
  const careers: CareerDefinition[] = [
    {
      id: 'test_job',
      title: 'Test Job',
      field: 'Business',
      specialization: 'General',
      requiredEducation: 'High School',
      minAge: 18,
      minSmarts: 30,
      minWillpower: 30,
      startSalary: 40000,
      annualRaise: 0.05,
      difficulty: 0.1
    },
    {
      id: 'test_wrestler',
      title: 'Test Wrestler',
      field: 'Wrestling',
      specialization: 'Indie Singles',
      requiredEducation: 'High School',
      minAge: 18,
      minSmarts: 20,
      minWillpower: 20,
      minAthleticism: 20,
      minLooks: 20,
      startSalary: 50000,
      annualRaise: 0.05,
      difficulty: 0.1
    }
  ];
  registerCareers(careers);
}

function registerTestPositions(): void {
  registerPoliticalPositions([
    {
      id: 'test_position',
      title: 'Test Council Member',
      level: 1,
      minAge: 18,
      requiredEducation: 'High School',
      minSmarts: 40,
      minWillpower: 35,
      minPoliticalYears: 0,
      salary: 30000,
      termLength: 4,
      termLimit: 3,
      isElected: true,
      governmentTypes: ['democracy'],
      filingFee: 100,
      baseCampaignCost: 1000,
      nextPositions: []
    }
  ]);
  registerPolicies([]);
  registerScandals([]);
}

// ============================================
// TIME SYSTEM TESTS
// ============================================

test('Time budget decreases when performing career action', () => {
  registerTestCareers();
  const state = makeAdultState();
  state.education.level = 'High School';
  const beforeTime = state.timeBudget;
  
  performCareerAction(state, 'apply_test_job');
  equal(state.timeBudget, beforeTime - 1, 'Time should decrease by 1 for apply action');
});

test('Time budget decreases when performing education action', () => {
  const state = makeAdultState();
  state.education.level = 'High School';
  const beforeTime = state.timeBudget;
  
  const actions = getAvailableEducationActions(state);
  const studyAction = actions.find(a => a.id === 'study');
  if (studyAction) {
    performEducationAction(state, 'study');
    equal(state.timeBudget, beforeTime - 1, 'Time should decrease for study action');
  }
});

test('Time budget decreases when performing activity', () => {
  const state = makeAdultState();
  const beforeTime = state.timeBudget;
  
  const actions = getAvailableActivities(state);
  const gymAction = actions.find(a => a.id === 'gym');
  if (gymAction) {
    performActivity(state, 'gym');
    assert(state.timeBudget < beforeTime, 'Time should decrease for gym activity');
  }
});

test('Location time decreases when at non-Home location', () => {
  const state = makeAdultState();
  state.currentLocation = 'Park';
  const beforeTime = state.locationTime;
  
  const actions = getAvailableActivities(state);
  const parkAction = actions.find(a => a.id === 'gym' || a.id === 'walk');
  if (parkAction) {
    performActivity(state, parkAction.id);
    assert(state.locationTime < beforeTime, 'Location time should decrease at non-Home location');
  }
});

test('Actions not available without enough time', () => {
  registerTestCareers();
  const state = makeAdultState();
  state.education.level = 'High School';
  state.timeBudget = 0;
  
  const actions = getAvailableCareerActions(state);
  notIncludes(actions.map(a => a.id), 'work_hard', 'Work hard should not be available with no time');
});

// ============================================
// STAT CLAMPING TESTS
// ============================================

test('Stats are clamped to minimum 0', () => {
  const state = makeAdultState();
  state.stats.health = 5;
  
  performActivity(state, 'gym');
  assert(state.stats.health >= 0, 'Health should never go below 0');
});

test('Stats are clamped to maximum 100', () => {
  const state = makeAdultState();
  state.stats.health = 99;
  
  performActivity(state, 'gym');
  assert(state.stats.health <= 100, 'Health should never exceed 100');
});

test('Stats remain in bounds after multiple modifications', () => {
  const state = makeAdultState();
  
  for (let i = 0; i < 50; i++) {
    performActivity(state, 'gym');
    assert(state.stats.health >= 0 && state.stats.health <= 100, 'Health should stay in bounds');
    assert(state.stats.happiness >= 0 && state.stats.happiness <= 100, 'Happiness should stay in bounds');
    assert(state.stats.athleticism >= 0 && state.stats.athleticism <= 100, 'Athleticism should stay in bounds');
    state.timeBudget = 12;
  }
});

// ============================================
// HISTORY EVENT TESTS
// ============================================

test('Career actions add history events', () => {
  registerTestCareers();
  const state = makeAdultState();
  state.education.level = 'High School';
  const beforeHistory = state.history.length;
  
  performCareerAction(state, 'apply_test_job');
  assert(state.history.length > beforeHistory, 'Job application should add history event');
});

test('Political actions add history events', () => {
  registerTestPositions();
  const state = makeAdultState();
  state.education.level = 'High School';
  state.politics.party = null;
  const beforeHistory = state.history.length;
  
  const actions = getAvailablePoliticalActions(state);
  const joinParty = actions.find(a => a.id === 'join_political_party');
  if (joinParty) {
    joinParty.perform(state);
    assert(state.history.length > beforeHistory, 'Joining party should add history event');
  }
});

test('History events contain correct age and year', () => {
  registerTestCareers();
  const state = makeAdultState();
  state.education.level = 'High School';
  
  performCareerAction(state, 'apply_test_job');
  
  const lastEntry = state.history[state.history.length - 1];
  equal(lastEntry.age, state.age, 'History entry should have current age');
  equal(lastEntry.year, state.year, 'History entry should have current year');
});

// ============================================
// ACTION AVAILABILITY TESTS
// ============================================

test('Career actions filtered by age requirement', () => {
  registerTestCareers();
  const state = makeTeenState();
  state.age = 14;
  state.education.level = 'High School';
  
  const actions = getAvailableCareerActions(state);
  notIncludes(actions.map(a => a.id), 'apply_test_job', 'Should not see job requiring age 18');
});

test('Career actions filtered by education requirement', () => {
  registerTestCareers();
  const state = makeTeenState();
  state.education.level = 'None';
  
  const actions = getAvailableCareerActions(state);
  notIncludes(actions.map(a => a.id), 'apply_test_job', 'Should not see job requiring High School');
});

test('Career actions filtered by stats requirement', () => {
  registerTestCareers();
  const state = makeAdultState();
  state.education.level = 'High School';
  state.stats.smarts = 20;
  
  const actions = getAvailableCareerActions(state);
  notIncludes(actions.map(a => a.id), 'apply_test_job', 'Should not see job requiring smarts 30');
});

test('Political actions filtered by age requirement', () => {
  registerTestPositions();
  const state = makeTeenState();
  state.education.level = 'High School';
  state.age = 14;
  
  const actions = getAvailablePoliticalActions(state);
  const candidacy = actions.find(a => a.id.startsWith('declare_candidacy'));
  assert(!candidacy, 'Should not see candidacy action below minimum age');
});

test('Activities filtered by age requirement', () => {
  const state = makeTeenState();
  state.age = 5;
  
  const actions = getAvailableActivities(state);
  const adultOnly = actions.filter(a => a.minAge && a.minAge > 5);
  equal(adultOnly.length, 0, 'Should not see activities above age');
});

// ============================================
// STATE ISOLATION TESTS
// ============================================

test('Multiple actions in same year accumulate time cost', () => {
  registerTestCareers();
  const state = makeAdultState();
  state.education.level = 'High School';
  
  performCareerAction(state, 'apply_test_job');
  const afterFirst = state.timeBudget;
  
  state.career.id = 'test_job';
  state.career.title = 'Test Job';
  state.career.field = 'Business';
  const workHardAction = getAvailableCareerActions(state).find(a => a.id === 'work_hard');
  if (workHardAction) {
    performCareerAction(state, 'work_hard');
    assert(state.timeBudget < afterFirst, 'Second action should further reduce time');
  }
});

test('Action does not execute with insufficient time', () => {
  registerTestCareers();
  const state = makeAdultState();
  state.education.level = 'High School';
  state.career.id = 'test_job';
  state.career.title = 'Test Job';
  state.career.field = 'Business';
  state.timeBudget = 1;
  
  const beforeTime = state.timeBudget;
  
  performCareerAction(state, 'work_hard');
  
  equal(state.timeBudget, beforeTime, 'Time should not change if action failed');
});

// ============================================
// RELATIONSHIP SYSTEM TESTS
// ============================================

test('Family members initialized on age up', () => {
  const state = createInitialState();
  initializeFamily(state, 'Test');
  
  const parents = state.relationships.filter(r => r.type === 'Father' || r.type === 'Mother');
  assert(parents.length >= 1, 'Should have at least one parent');
});

test('Interactions require same location for some actions', () => {
  const state = makeAdultState();
  initializeFamily(state, 'Test');
  const parent = state.relationships.find(r => r.type === 'Father' || r.type === 'Mother');
  
  if (parent) {
    state.currentLocation = 'Home';
    const interactions = getAvailableInteractions(state, parent.id);
    assert(interactions.length > 0, 'Should have available interactions');
  }
});

test('Relationship relationshipToPlayer clamped to 0-100', () => {
  const state = makeAdultState();
  initializeFamily(state, 'Test');
  const parent = state.relationships.find(r => r.type === 'Father' || r.type === 'Mother');
  
  if (parent) {
    parent.relationshipToPlayer = 99;
    state.currentLocation = 'Home';
    
    const interactions = getAvailableInteractions(state, parent.id);
    if (interactions.length > 0) {
      for (let i = 0; i < 10; i++) {
        state.timeBudget = 10;
        if (getAvailableInteractions(state, parent.id).length > 0) {
          interactWithNPC(state, parent.id, interactions[0].id);
        }
      }
      assert(parent.relationshipToPlayer <= 100, 'relationshipToPlayer should not exceed 100');
    }
  }
});

// ============================================
// POLITICAL SYSTEM TESTS
// ============================================

test('Eligible positions returns empty when requirements not met', () => {
  registerTestPositions();
  const state = makeTeenState();
  state.education.level = 'None';
  
  const positions = getEligiblePositions(state);
  equal(positions.length, 0, 'Should have no eligible positions without requirements');
});

test('Eligible positions returns position when requirements met', () => {
  registerTestPositions();
  const state = makeAdultState();
  state.education.level = 'High School';
  
  const positions = getEligiblePositions(state);
  includes(positions.map(p => p.id), 'test_position', 'Should be eligible for test position');
});

test('Joining party sets party and loyalty', () => {
  registerTestPositions();
  const state = makeAdultState();
  state.politics.party = null;
  
  const actions = getAvailablePoliticalActions(state);
  const joinParty = actions.find(a => a.id === 'join_political_party');
  if (joinParty) {
    joinParty.perform(state);
    assert(state.politics.party !== null, 'Party should be set');
    equal(state.politics.partyLoyalty, 50, 'Party loyalty should be 50');
  }
});

test('Cannot join party twice', () => {
  registerTestPositions();
  const state = makeAdultState();
  state.politics.party = 'progressive';
  
  const actions = getAvailablePoliticalActions(state);
  const joinParty = actions.find(a => a.id === 'join_political_party');
  assert(!joinParty, 'Should not see join party action when already in party');
});

// ============================================
// FINANCIAL SYSTEM TESTS
// ============================================

test('Activities with cost deduct from cash', () => {
  const state = makeAdultState();
  const beforeCash = state.finances.cash;
  
  const actions = getAvailableActivities(state);
  const paidAction = actions.find(a => a.cost > 0);
  
  if (paidAction) {
    performActivity(state, paidAction.id);
    assert(state.finances.cash < beforeCash, 'Cash should decrease for paid activity');
  }
});

test('Paid activities not available without cash', () => {
  const state = makeAdultState();
  state.finances.cash = 0;
  
  const actions = getAvailableActivities(state);
  const paidActions = actions.filter(a => a.cost > 0);
  equal(paidActions.length, 0, 'Should not see paid activities without cash');
});

// ============================================
// INTEGRATION TESTS
// ============================================

test('Full career lifecycle: apply, work, resign', () => {
  registerTestCareers();
  const state = makeAdultState();
  state.education.level = 'High School';
  
  equal(state.career.id, null, 'Should start unemployed');
  
  performCareerAction(state, 'apply_test_job');
  assert(state.career.id !== null, 'Should be employed after apply');
  
  state.timeBudget = 12;
  state.currentLocation = 'Office';
  performCareerAction(state, 'work_hard');
  assert(state.career.performance > 50, 'Performance should increase from work_hard');
  
  state.timeBudget = 12;
  performCareerAction(state, 'resign_job');
  equal(state.career.id, null, 'Should be unemployed after resign');
});

test('Political career progression', () => {
  registerTestPositions();
  const state = makeAdultState();
  state.education.level = 'High School';
  state.finances.cash = 1000;
  
  const actions1 = getAvailablePoliticalActions(state);
  const joinParty = actions1.find(a => a.id === 'join_political_party');
  assert(joinParty, 'Should see join party action');
  
  if (joinParty) {
    joinParty.perform(state);
    assert(state.politics.party !== null, 'Should have party');
  }
  
  state.timeBudget = 12;
  const actions2 = getAvailablePoliticalActions(state);
  const runForOffice = actions2.find(a => a.id.includes('declare_candidacy'));
  assert(runForOffice, 'Should see candidacy action after joining party');
});

test('Political career progression via CareerSystem', () => {
  registerTestPositions();
  const state = makeAdultState();
  state.education.level = 'High School';
  state.finances.cash = 1000;
  
  // Travel to Office for political actions
  travelTo(state, 'Office');
  
  // First, join the party
  const actions1 = getAvailableCareerActions(state);
  const joinParty = actions1.find(a => a.id === 'join_political_party');
  assert(joinParty, 'Should see join party action in career actions at Office');
  
  if (joinParty) {
    joinParty.perform(state);
    assert(state.politics.party !== null, 'Should have party after joining');
  }
  
  // Now check for candidacy options
  state.timeBudget = 12;
  travelTo(state, 'Office');
  const actions2 = getAvailableCareerActions(state);
  const candidacyActions = actions2.filter(a => a.id.includes('declare_candidacy'));
  
  assert(candidacyActions.length > 0, 'Should see at least one candidacy action after joining party via CareerSystem at Office. Found: ' + candidacyActions.length);
});

test('Candidacy requires minimum age 18', () => {
  registerPoliticalPositions(POSITIONS);
  registerPolicies([]);
  registerScandals([]);
  
  // Create state at age 16 (minimum age to join party)
  const state = createInitialState();
  state.age = 16;
  state.year = 2050;
  state.timeBudget = 12;
  state.locationTime = 10;
  state.currentLocation = 'Home';
  state.stats.smarts = 85;
  state.stats.willpower = 80;
  state.stats.health = 80;
  state.stats.happiness = 80;
  state.stats.looks = 70;
  state.stats.athleticism = 70;
  state.finances.cash = 5000;
  state.education.level = 'High School';
  
  // Travel to Office for political actions
  travelTo(state, 'Office');
  
  // Join party at age 16
  const actions1 = getAvailableCareerActions(state);
  const joinParty = actions1.find(a => a.id === 'join_political_party');
  assert(joinParty, 'Should see join party action at age 16 at Office');
  
  if (joinParty) {
    joinParty.perform(state);
    assert(state.politics.party !== null, 'Should have party after joining at 16');
  }
  
  // At age 16 with High School education, player should NOT see candidacy options
  // because minimum age for school_board is 18
  const actions2 = getAvailableCareerActions(state);
  const candidacyActions = actions2.filter(a => a.id.includes('declare_candidacy'));
  
  assert(candidacyActions.length === 0, 'Should NOT see candidacy actions at age 16. Found: ' + candidacyActions.length);
  
  // Now age up to 18
  state.age = 18;
  state.timeBudget = 12;
  travelTo(state, 'Office');
  
  const actions3 = getAvailableCareerActions(state);
  const candidacyActions18 = actions3.filter(a => a.id.includes('declare_candidacy'));
  
  assert(candidacyActions18.length > 0, 'Should see candidacy actions at age 18 at Office. Found: ' + candidacyActions18.length);
});

test('Campaign actions appear when actively campaigning', () => {
  registerPoliticalPositions(POSITIONS);
  registerPolicies([]);
  registerScandals([]);
  
  const state = createInitialState();
  state.age = 25;
  state.year = 2050;
  state.timeBudget = 12;
  state.currentLocation = 'Home';
  state.stats.smarts = 85;
  state.stats.willpower = 80;
  state.stats.health = 80;
  state.stats.happiness = 80;
  state.stats.looks = 70;
  state.stats.athleticism = 70;
  state.finances.cash = 5000;
  state.education.level = 'High School';
  state.politics.party = 'progressive';
  
  // Travel to Office for political actions
  travelTo(state, 'Office');
  
  // Declare candidacy first
  const actions1 = getAvailableCareerActions(state);
  const candidacyAction = actions1.find(a => a.id === 'declare_candidacy_school_board');
  assert(candidacyAction, 'Should see candidacy action at Office');
  
  if (candidacyAction) {
    candidacyAction.perform(state);
    assert(state.politics.campaignActive, 'Should have active campaign');
  }
  
  // Now check for campaign actions
  state.timeBudget = 12;
  travelTo(state, 'Office');
  const actions2 = getAvailableCareerActions(state);
  
  const fundCampaign = actions2.find(a => a.id === 'fund_campaign');
  const holdRally = actions2.find(a => a.id === 'hold_rally');
  const resolveElection = actions2.find(a => a.id === 'resolve_election');
  
  assert(fundCampaign, 'Should see fund_campaign action when campaign is active at Office');
  assert(holdRally, 'Should see hold_rally action when campaign is active at Office');
  assert(resolveElection, 'Should see resolve_election action when campaign is active at Office');
  
  // Should NOT see candidacy actions while campaign is active
  const candidacyActions = actions2.filter(a => a.id.includes('declare_candidacy'));
  assert(candidacyActions.length === 0, 'Should NOT see candidacy actions while campaign is active');
  
  // Resolve the election
  if (resolveElection) {
    resolveElection.perform(state);
    assert(!state.politics.campaignActive, 'Campaign should no longer be active after election');
  }
});

test('Political actions require Office location', () => {
  registerPoliticalPositions(POSITIONS);
  registerPolicies([]);
  registerScandals([]);
  
  const state = createInitialState();
  state.age = 25;
  state.year = 2050;
  state.timeBudget = 12;
  state.currentLocation = 'Home';
  state.locationTime = 10;
  state.stats.smarts = 85;
  state.stats.willpower = 80;
  state.stats.health = 80;
  state.stats.happiness = 80;
  state.stats.looks = 70;
  state.stats.athleticism = 70;
  state.finances.cash = 5000;
  state.education.level = 'High School';
  state.politics.party = 'progressive';
  
  // At Home - should NOT see political actions
  const actionsAtHome = getAvailableCareerActions(state);
  const joinPartyAtHome = actionsAtHome.find(a => a.id === 'join_political_party');
  const candidacyAtHome = actionsAtHome.find(a => a.id.includes('declare_candidacy'));
  
  assert(!joinPartyAtHome, 'Should NOT see join_political_party at Home');
  assert(!candidacyAtHome, 'Should NOT see candidacy actions at Home');
  
  // Travel to Office - should see political actions
  travelTo(state, 'Office');
  const actionsAtOffice = getAvailableCareerActions(state);
  const joinPartyAtOffice = actionsAtOffice.find(a => a.id === 'join_political_party');
  
  assert(!joinPartyAtOffice, 'Should NOT see join_political_party when already in party');
  
  // Check that candidacy is available at Office
  const candidacyAtOffice = actionsAtOffice.find(a => a.id.includes('declare_candidacy'));
  assert(candidacyAtOffice, 'Should see candidacy actions at Office when in party');
});
