import type { GameState } from '../core/GameState';

export function getAvailableTime(state: GameState): number {
  return state.currentLocation === 'Home' ? state.timeBudget : state.locationTime;
}

export function hasTimeForAction(state: GameState, timeCost: number): boolean {
  return getAvailableTime(state) >= timeCost;
}

export function spendActionTime(state: GameState, timeCost: number): boolean {
  if (!hasTimeForAction(state, timeCost)) return false;

  if (state.currentLocation === 'Home') {
    state.timeBudget -= timeCost;
  } else {
    state.locationTime -= timeCost;
  }

  return true;
}
