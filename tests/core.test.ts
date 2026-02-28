import { createInitialState } from '../src/core/GameState';
import type { GameState } from '../src/core/GameState';
import { 
  clamp, 
  modifyStat, 
  addHistory, 
  getAvailableTime, 
  canSpendTime, 
  spendTime,
  modifyCash,
  canAfford
} from '../src/core/StateUtils';
import {
  registerAction,
  registerActions,
  getAction,
  getAvailableActions,
  isActionAvailable,
  performAction,
  clearRegistries,
  createSimpleAction,
  createStatModifierAction
} from '../src/core/ActionSystem';
import { test, equal, assert, includes, notIncludes } from './harness';

function makeTestState(): GameState {
  const state = createInitialState();
  state.age = 25;
  state.year = 2050;
  state.timeBudget = 12;
  state.locationTime = 10;
  state.currentLocation = 'Home';
  state.finances.cash = 10000;
  return state;
}

// ============================================
// STATEUTILS TESTS
// ============================================

test('clamp returns value within bounds', () => {
  equal(clamp(50), 50, 'Value in bounds should stay the same');
  equal(clamp(-10), 0, 'Value below min should clamp to 0');
  equal(clamp(150), 100, 'Value above max should clamp to 100');
  equal(clamp(50, 10, 90), 50, 'Custom bounds work');
  equal(clamp(5, 10, 90), 10, 'Value below custom min should clamp');
  equal(clamp(100, 10, 90), 90, 'Value above custom max should clamp');
});

test('clamp rounds to integer', () => {
  equal(clamp(50.4), 50, 'Should round down');
  equal(clamp(50.5), 51, 'Should round up');
});

test('modifyStat changes stat by delta', () => {
  const state = makeTestState();
  const before = state.stats.health;
  modifyStat(state, 'health', 10);
  equal(state.stats.health, before + 10, 'Stat should increase');
});

test('modifyStat clamps to valid range', () => {
  const state = makeTestState();
  state.stats.health = 95;
  modifyStat(state, 'health', 10);
  equal(state.stats.health, 100, 'Stat should clamp to max');
  
  state.stats.health = 5;
  modifyStat(state, 'health', -10);
  equal(state.stats.health, 0, 'Stat should clamp to min');
});

test('addHistory creates history entry', () => {
  const state = makeTestState();
  const before = state.history.length;
  addHistory(state, 'Test event');
  equal(state.history.length, before + 1, 'History should have one more entry');
  
  const entry = state.history[state.history.length - 1];
  equal(entry.text, 'Test event', 'Entry should have correct text');
  equal(entry.age, state.age, 'Entry should have current age');
  equal(entry.year, state.year, 'Entry should have current year');
  equal(entry.type, 'secondary', 'Default type should be secondary');
});

test('addHistory with primary type', () => {
  const state = makeTestState();
  addHistory(state, 'Major event', 'primary');
  const entry = state.history[state.history.length - 1];
  equal(entry.type, 'primary', 'Type should be primary');
});

test('getAvailableTime returns timeBudget at Home', () => {
  const state = makeTestState();
  state.currentLocation = 'Home';
  state.timeBudget = 12;
  state.locationTime = 5;
  equal(getAvailableTime(state), 12, 'Should return timeBudget at Home');
});

test('getAvailableTime returns locationTime away from Home', () => {
  const state = makeTestState();
  state.currentLocation = 'Park';
  state.timeBudget = 12;
  state.locationTime = 5;
  equal(getAvailableTime(state), 5, 'Should return locationTime away from Home');
});

test('canSpendTime checks available time', () => {
  const state = makeTestState();
  state.currentLocation = 'Home';
  state.timeBudget = 5;
  
  assert(canSpendTime(state, 3), 'Should have enough time');
  assert(canSpendTime(state, 5), 'Should have exactly enough time');
  assert(!canSpendTime(state, 6), 'Should not have enough time');
});

test('spendTime deducts from timeBudget at Home', () => {
  const state = makeTestState();
  state.currentLocation = 'Home';
  state.timeBudget = 10;
  
  const result = spendTime(state, 3);
  assert(result, 'Should succeed');
  equal(state.timeBudget, 7, 'Should deduct from timeBudget');
});

test('spendTime deducts from locationTime away from Home', () => {
  const state = makeTestState();
  state.currentLocation = 'Park';
  state.locationTime = 10;
  
  const result = spendTime(state, 3);
  assert(result, 'Should succeed');
  equal(state.locationTime, 7, 'Should deduct from locationTime');
});

test('spendTime fails with insufficient time', () => {
  const state = makeTestState();
  state.currentLocation = 'Home';
  state.timeBudget = 2;
  
  const result = spendTime(state, 5);
  assert(!result, 'Should fail');
  equal(state.timeBudget, 2, 'Should not change timeBudget');
});

test('modifyCash increases cash', () => {
  const state = makeTestState();
  state.finances.cash = 100;
  
  const result = modifyCash(state, 50);
  assert(result, 'Should succeed');
  equal(state.finances.cash, 150, 'Should increase cash');
});

test('modifyCash decreases cash', () => {
  const state = makeTestState();
  state.finances.cash = 100;
  
  const result = modifyCash(state, -50);
  assert(result, 'Should succeed');
  equal(state.finances.cash, 50, 'Should decrease cash');
});

test('modifyCash fails if insufficient funds', () => {
  const state = makeTestState();
  state.finances.cash = 100;
  
  const result = modifyCash(state, -150);
  assert(!result, 'Should fail');
  equal(state.finances.cash, 100, 'Should not change cash');
});

test('canAfford checks cash', () => {
  const state = makeTestState();
  state.finances.cash = 100;
  
  assert(canAfford(state, 50), 'Should afford 50');
  assert(canAfford(state, 100), 'Should afford exactly 100');
  assert(!canAfford(state, 150), 'Should not afford 150');
});

// ============================================
// ACTIONSYSTEM TESTS
// ============================================

test('registerAction adds action to registry', () => {
  clearRegistries();
  const action = createSimpleAction('test_1', 'Test', 'test', 1, () => true, () => {});
  registerAction(action);
  
  const retrieved = getAction('test_1');
  assert(retrieved !== undefined, 'Should find action');
  if (retrieved) {
    equal(retrieved.name, 'Test', 'Should have correct name');
  }
});

test('registerActions adds multiple actions', () => {
  clearRegistries();
  registerActions([
    createSimpleAction('test_2', 'Test 2', 'test', 1, () => true, () => {}),
    createSimpleAction('test_3', 'Test 3', 'test', 1, () => true, () => {})
  ]);
  
  assert(getAction('test_2') !== undefined, 'Should find first action');
  assert(getAction('test_3') !== undefined, 'Should find second action');
});

test('getAction returns undefined for unknown action', () => {
  clearRegistries();
  const result = getAction('nonexistent');
  assert(result === undefined, 'Should return undefined for unknown action');
});

test('getAvailableActions returns only available actions', () => {
  clearRegistries();
  registerActions([
    createSimpleAction('available', 'Available', 'test', 1, () => true, () => {}),
    createSimpleAction('unavailable', 'Unavailable', 'test', 1, () => false, () => {})
  ]);
  
  const state = makeTestState();
  const actions = getAvailableActions(state, 'test');
  
  includes(actions.map(a => a.id), 'available', 'Should include available action');
  notIncludes(actions.map(a => a.id), 'unavailable', 'Should not include unavailable action');
});

test('isActionAvailable checks time', () => {
  clearRegistries();
  const action = createSimpleAction('time_test', 'Time Test', 'test', 5, () => true, () => {});
  registerAction(action);
  
  const state = makeTestState();
  state.timeBudget = 10;
  assert(isActionAvailable(state, action), 'Should be available with enough time');
  
  state.timeBudget = 3;
  assert(!isActionAvailable(state, action), 'Should not be available without enough time');
});

test('isActionAvailable checks cost', () => {
  clearRegistries();
  const action = createSimpleAction('cost_test', 'Cost Test', 'test', 1, () => true, () => {}, { cost: 100 });
  registerAction(action);
  
  const state = makeTestState();
  state.finances.cash = 200;
  assert(isActionAvailable(state, action), 'Should be available with enough cash');
  
  state.finances.cash = 50;
  assert(!isActionAvailable(state, action), 'Should not be available without enough cash');
});

test('isActionAvailable checks location', () => {
  clearRegistries();
  const action = createSimpleAction('location_test', 'Location Test', 'test', 1, () => true, () => {}, { location: 'Office' });
  registerAction(action);
  
  const state = makeTestState();
  state.currentLocation = 'Office';
  assert(isActionAvailable(state, action), 'Should be available at correct location');
  
  state.currentLocation = 'Home';
  assert(!isActionAvailable(state, action), 'Should not be available at wrong location');
});

test('performAction executes action and spends time', () => {
  clearRegistries();
  let executed = false;
  registerAction(createSimpleAction('exec_test', 'Exec Test', 'test', 2, () => true, () => { executed = true; }));
  
  const state = makeTestState();
  state.timeBudget = 10;
  const result = performAction(state, 'exec_test');
  
  assert(result.success, 'Should succeed');
  assert(executed, 'Should have executed');
  equal(state.timeBudget, 8, 'Should spend time');
});

test('performAction adds history on success', () => {
  clearRegistries();
  registerAction(createSimpleAction('history_test', 'History Test', 'test', 1, () => true, () => ({ success: true, message: 'Done!' })));
  
  const state = makeTestState();
  const before = state.history.length;
  performAction(state, 'history_test');
  
  equal(state.history.length, before + 1, 'Should add history entry');
  equal(state.history[state.history.length - 1].text, 'Done!', 'Should have correct message');
});

test('performAction fails for unknown action', () => {
  clearRegistries();
  const state = makeTestState();
  const result = performAction(state, 'unknown');
  
  assert(!result.success, 'Should fail');
  assert(result.message !== undefined, 'Should have error message');
});

test('performAction fails without time', () => {
  clearRegistries();
  registerAction(createSimpleAction('no_time_test', 'No Time Test', 'test', 5, () => true, () => {}));
  
  const state = makeTestState();
  state.timeBudget = 2;
  const result = performAction(state, 'no_time_test');
  
  assert(!result.success, 'Should fail');
  equal(state.timeBudget, 2, 'Should not spend time');
});

test('performAction spends money and time', () => {
  clearRegistries();
  registerAction(createSimpleAction('paid_action', 'Paid Action', 'test', 2, () => true, () => {}, { cost: 50 }));
  
  const state = makeTestState();
  state.timeBudget = 10;
  state.finances.cash = 100;
  const result = performAction(state, 'paid_action');
  
  assert(result.success, 'Should succeed');
  equal(state.timeBudget, 8, 'Should spend time');
  equal(state.finances.cash, 50, 'Should spend cash');
});

test('createStatModifierAction modifies stats', () => {
  clearRegistries();
  const action = createStatModifierAction(
    'stat_mod',
    'Stat Modifier',
    'test',
    1,
    { health: 10, happiness: -5 },
    () => true
  );
  registerAction(action);
  
  const state = makeTestState();
  state.stats.health = 50;
  state.stats.happiness = 50;
  const result = performAction(state, 'stat_mod');
  
  assert(result.success, 'Should succeed');
  equal(state.stats.health, 60, 'Health should increase');
  equal(state.stats.happiness, 45, 'Happiness should decrease');
});

test('getAvailableActions filters by category', () => {
  clearRegistries();
  registerActions([
    createSimpleAction('cat_a', 'Cat A', 'category_a', 1, () => true, () => {}),
    createSimpleAction('cat_b', 'Cat B', 'category_b', 1, () => true, () => {})
  ]);
  
  const state = makeTestState();
  const actions = getAvailableActions(state, 'category_a');
  
  includes(actions.map(a => a.id), 'cat_a', 'Should include category_a action');
  notIncludes(actions.map(a => a.id), 'cat_b', 'Should not include category_b action');
});

test('getAvailableActions returns all when no category specified', () => {
  clearRegistries();
  registerActions([
    createSimpleAction('all_a', 'All A', 'category_a', 1, () => true, () => {}),
    createSimpleAction('all_b', 'All B', 'category_b', 1, () => true, () => {})
  ]);
  
  const state = makeTestState();
  const actions = getAvailableActions(state);
  
  includes(actions.map(a => a.id), 'all_a', 'Should include category_a action');
  includes(actions.map(a => a.id), 'all_b', 'Should include category_b action');
});
