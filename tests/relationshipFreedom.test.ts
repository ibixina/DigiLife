import { createInitialState } from '../src/core/GameState';
import { getAvailableInteractions, interactWithNPC } from '../src/systems/RelationshipSystem';
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
