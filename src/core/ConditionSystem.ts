// ConditionSystem.ts
import type { GameState } from './GameState';

export interface Condition {
    type: string;
    target?: string;
    operator?: string;
    value?: any;
}

export function evaluateCondition(state: GameState, condition: Condition): boolean {
    switch (condition.type) {
        case 'stat': {
            if (!condition.target || !condition.operator || condition.value === undefined) return false;
            const targetVal = state.stats[condition.target as keyof typeof state.stats] || 0;
            return compare(targetVal, condition.operator, condition.value);
        }
        case 'flag': {
            if (!condition.target || !condition.operator) return false;
            const targetVal = state.flags[condition.target];
            if (condition.operator === 'has') return targetVal !== undefined;
            if (condition.operator === 'not_has') return targetVal === undefined;
            return compare(targetVal, condition.operator, condition.value);
        }
        case 'age': {
            if (!condition.operator || condition.value === undefined) return false;
            return compare(state.age, condition.operator, condition.value);
        }
        case 'random': {
            if (condition.value === undefined) return false;
            return Math.random() <= condition.value;
        }
        default:
            console.warn(`Unknown condition type: ${condition.type}`);
            return true; // Default to true if unknown, so we don't break content completely
    }
}

export function evaluateConditions(state: GameState, conditions: Condition[] | undefined): boolean {
    if (!conditions || conditions.length === 0) return true;
    for (const cond of conditions) {
        if (!evaluateCondition(state, cond)) return false;
    }
    return true;
}

function compare(a: any, op: string, b: any): boolean {
    switch (op) {
        case 'eq': return a === b;
        case 'neq': return a !== b;
        case 'gt': return a > b;
        case 'gte': return a >= b;
        case 'lt': return a < b;
        case 'lte': return a <= b;
        default: return false;
    }
}
