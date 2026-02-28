import type { GameState } from './GameState';
import { canSpendTime, spendTime, canAfford, modifyCash, addHistory, modifyStat } from './StateUtils';

export interface Action {
  id: string;
  name: string;
  category: string;
  timeCost: number;
  cost?: number;
  location?: string;
  isAvailable: (state: GameState) => boolean;
  perform: (state: GameState) => ActionResult;
}

export interface ActionResult {
  success: boolean;
  message?: string;
}

export type ActionRegistry = Map<string, Action>;

const registries: Map<string, ActionRegistry> = new Map();

export function getOrCreateRegistry(category: string): ActionRegistry {
  let registry = registries.get(category);
  if (!registry) {
    registry = new Map();
    registries.set(category, registry);
  }
  return registry;
}

export function registerAction(action: Action): void {
  const registry = getOrCreateRegistry(action.category);
  registry.set(action.id, action);
}

export function registerActions(actions: Action[]): void {
  for (const action of actions) {
    registerAction(action);
  }
}

export function getAction(id: string): Action | undefined {
  for (const registry of registries.values()) {
    const action = registry.get(id);
    if (action) return action;
  }
  return undefined;
}

export function getAvailableActions(state: GameState, category?: string): Action[] {
  const result: Action[] = [];
  
  if (category) {
    const registry = registries.get(category);
    if (registry) {
      for (const action of registry.values()) {
        if (isActionAvailable(state, action)) {
          result.push(action);
        }
      }
    }
  } else {
    for (const registry of registries.values()) {
      for (const action of registry.values()) {
        if (isActionAvailable(state, action)) {
          result.push(action);
        }
      }
    }
  }
  
  return result;
}

export function isActionAvailable(state: GameState, action: Action): boolean {
  if (!canSpendTime(state, action.timeCost)) return false;
  if (action.cost !== undefined && !canAfford(state, action.cost)) return false;
  if (action.location && state.currentLocation !== action.location) return false;
  return action.isAvailable(state);
}

export function performAction(state: GameState, actionId: string): ActionResult {
  const action = getAction(actionId);
  if (!action) {
    return { success: false, message: `Unknown action: ${actionId}` };
  }
  
  if (!isActionAvailable(state, action)) {
    return { success: false, message: 'Action not available' };
  }
  
  if (!spendTime(state, action.timeCost)) {
    return { success: false, message: 'Not enough time' };
  }
  
  if (action.cost !== undefined && !modifyCash(state, -action.cost)) {
    return { success: false, message: 'Not enough money' };
  }
  
  const result = action.perform(state);
  
  if (result.success && result.message) {
    addHistory(state, result.message, 'secondary');
  }
  
  return result;
}

export function clearRegistries(): void {
  registries.clear();
}

export function createSimpleAction(
  id: string,
  name: string,
  category: string,
  timeCost: number,
  isAvailable: (state: GameState) => boolean,
  effect: (state: GameState) => ActionResult | void,
  options?: { cost?: number; location?: string }
): Action {
  return {
    id,
    name,
    category,
    timeCost,
    cost: options?.cost,
    location: options?.location,
    isAvailable,
    perform: (state: GameState): ActionResult => {
      const result = effect(state);
      return result !== undefined ? result : { success: true };
    }
  };
}

export function createStatModifierAction(
  id: string,
  name: string,
  category: string,
  timeCost: number,
  statChanges: Partial<Record<string, number>>,
  isAvailable: (state: GameState) => boolean = () => true,
  options?: { cost?: number; location?: string; message?: string }
): Action {
  return {
    id,
    name,
    category,
    timeCost,
    cost: options?.cost,
    location: options?.location,
    isAvailable,
    perform: (state: GameState): ActionResult => {
      for (const [stat, delta] of Object.entries(statChanges)) {
        if (delta !== undefined) {
          modifyStat(state, stat as any, delta);
        }
      }
      return { success: true, message: options?.message };
    }
  };
}
