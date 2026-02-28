import type { GameState, StatName } from './GameState';

export function clamp(value: number, min: number = 0, max: number = 100): number {
  return Math.max(min, Math.min(max, Math.round(value)));
}

export function modifyStat(state: GameState, stat: StatName, delta: number): void {
  const current = state.stats[stat];
  state.stats[stat] = clamp(current + delta);
}

export function addHistory(state: GameState, text: string, type: 'primary' | 'secondary' = 'secondary'): void {
  state.history.push({
    age: state.age,
    year: state.year,
    text,
    type
  });
}

export function getAvailableTime(state: GameState): number {
  return state.currentLocation === 'Home' ? state.timeBudget : state.locationTime;
}

export function canSpendTime(state: GameState, cost: number): boolean {
  return getAvailableTime(state) >= cost;
}

export function spendTime(state: GameState, cost: number): boolean {
  if (!canSpendTime(state, cost)) return false;
  
  if (state.currentLocation === 'Home') {
    state.timeBudget -= cost;
  } else {
    state.locationTime -= cost;
  }
  return true;
}

export function modifyCash(state: GameState, amount: number): boolean {
  if (state.finances.cash + amount < 0) return false;
  state.finances.cash += amount;
  return true;
}

export function canAfford(state: GameState, cost: number): boolean {
  return state.finances.cash >= cost;
}
