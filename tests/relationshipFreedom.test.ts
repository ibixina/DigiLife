import { createInitialState } from '../src/core/GameState';
import { getAvailableInteractions, getVisibleRelationships, interactWithNPC } from '../src/systems/RelationshipSystem';
import { test, assert, includes, notIncludes, equal, withMockedRandom } from './harness';

function makeState() {
  const state = createInitialState();
  state.age = 25;
  state.year = 2050;
  state.timeBudget = 12;
  state.currentLocation = 'Home';
  return state;
}

test('Remote interactions work for known NPCs outside current location', () => {
  const state = makeState();
  state.relationships.push({
    id: 'friend_1',
    name: 'Morgan',
    type: 'Friend',
    gender: 'Non-binary',
    age: 25,
    health: 80,
    happiness: 70,
    smarts: 70,
    looks: 60,
    relationshipToPlayer: 50,
    familiarity: 50,
    location: 'School',
    isAlive: true,
    traits: []
  });

  const ids = getAvailableInteractions(state, 'friend_1').map(i => i.id);
  includes(ids, 'Call / Message', 'Remote interaction should be available');
  notIncludes(ids, 'Spend Time', 'Location-locked interaction should not be available remotely');
});

test('Romance pursuit is blocked for non-romance NPC types', () => {
  const state = makeState();
  state.relationships.push({
    id: 'teacher_1',
    name: 'Teacher',
    type: 'Teacher',
    gender: 'Non-binary',
    age: 40,
    health: 80,
    happiness: 70,
    smarts: 80,
    looks: 55,
    relationshipToPlayer: 65,
    familiarity: 80,
    location: 'Home',
    isAlive: true,
    traits: []
  });

  const ids = getAvailableInteractions(state, 'teacher_1').map(i => i.id);
  notIncludes(ids, 'Flirt', 'Teacher should be blocked from romance actions');
  notIncludes(ids, 'Ask Out', 'Teacher should be blocked from dating path');
});

test('Plot to Kill then Attempt Kill can kill target', () => {
  const state = makeState();
  state.stats.craziness = 90;
  state.relationships.push({
    id: 'enemy_1',
    name: 'Rival',
    type: 'Enemy',
    gender: 'Male',
    age: 24,
    health: 80,
    happiness: 60,
    smarts: 60,
    looks: 50,
    relationshipToPlayer: 5,
    familiarity: 60,
    location: 'Home',
    isAlive: true,
    traits: []
  });

  interactWithNPC(state, 'enemy_1', 'Plot to Kill');
  assert(state.flags.plot_enemy_1 === 2050, 'Plot flag should be set with current year');

  withMockedRandom([0.0], () => {
    interactWithNPC(state, 'enemy_1', 'Attempt Kill');
  });

  const npc = state.relationships.find(r => r.id === 'enemy_1');
  assert(!!npc && !npc.isAlive, 'Target should be dead after successful attempt');
  assert(state.stats.karma < 50, 'Karma should decrease after kill');
});

test('Hire Hitman consumes money and can increase heat on failure', () => {
  const state = makeState();
  state.finances.cash = 10000;
  state.serialKiller.unlocked = true;
  state.relationships.push({
    id: 'target_1',
    name: 'Target',
    type: 'Friend',
    gender: 'Female',
    age: 27,
    health: 80,
    happiness: 60,
    smarts: 55,
    looks: 55,
    relationshipToPlayer: 40,
    familiarity: 60,
    location: 'School',
    isAlive: true,
    traits: []
  });

  withMockedRandom([0.95], () => {
    interactWithNPC(state, 'target_1', 'Hire Hitman');
  });

  equal(state.finances.cash, 5000, 'Hitman fee should be deducted');
  assert(state.serialKiller.heat >= 18, 'Failed hire should increase heat');
});

test('Relationships at home include high-bond remote contacts', () => {
  const state = makeState();
  state.currentLocation = 'Home';
  state.relationships.push({
    id: 'remote_high',
    name: 'Remote High',
    type: 'Friend',
    gender: 'Non-binary',
    age: 26,
    health: 80,
    happiness: 70,
    smarts: 70,
    looks: 60,
    relationshipToPlayer: 81,
    familiarity: 60,
    location: 'Arena',
    isAlive: true,
    traits: []
  });
  state.relationships.push({
    id: 'remote_low',
    name: 'Remote Low',
    type: 'Friend',
    gender: 'Non-binary',
    age: 26,
    health: 80,
    happiness: 70,
    smarts: 70,
    looks: 60,
    relationshipToPlayer: 80,
    familiarity: 60,
    location: 'Arena',
    isAlive: true,
    traits: []
  });

  const visibleIds = getVisibleRelationships(state).map(npc => npc.id);
  includes(visibleIds, 'remote_high', 'Home should include contacts above 80 relationship');
  notIncludes(visibleIds, 'remote_low', 'Home should not include contacts at 80 or lower relationship');
});

test('Wrestling arena view is filtered by current promotion', () => {
  const state = makeState();
  state.currentLocation = 'Arena';
  state.career.field = 'Wrestling';
  state.wrestlingContract = {
    promotionId: 'aew',
    promotionName: 'AEW',
    startYear: state.year,
    endYear: state.year + 5,
    annualSalary: 120000,
    clauses: {
      downsideGuarantee: 80000,
      merchCutPercent: 8,
      appearanceMinimum: 20,
      nonCompeteMonths: 3,
      creativeControl: false,
      injuryProtection: true,
      travelCovered: true,
      exclusivity: 'exclusive'
    },
    rivalOffer: null
  };
  state.relationships.push({
    id: 'aew_contact',
    name: 'AEW Contact',
    type: 'Co-worker',
    gender: 'Male',
    age: 29,
    health: 80,
    happiness: 70,
    smarts: 60,
    looks: 60,
    relationshipToPlayer: 55,
    familiarity: 60,
    location: 'Arena',
    promotionId: 'aew',
    isAlive: true,
    traits: ['Wrestling']
  });
  state.relationships.push({
    id: 'wwe_contact',
    name: 'WWE Contact',
    type: 'Co-worker',
    gender: 'Male',
    age: 29,
    health: 80,
    happiness: 70,
    smarts: 60,
    looks: 60,
    relationshipToPlayer: 55,
    familiarity: 60,
    location: 'Arena',
    promotionId: 'wwe',
    isAlive: true,
    traits: ['Wrestling']
  });

  const visibleIds = getVisibleRelationships(state).map(npc => npc.id);
  includes(visibleIds, 'aew_contact', 'Current promotion contacts should be visible');
  notIncludes(visibleIds, 'wwe_contact', 'Other promotion contacts should be hidden at arena');
});
