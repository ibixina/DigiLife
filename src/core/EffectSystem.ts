// EffectSystem.ts
import type { GameState } from './GameState';
import { events } from './EventBus';

export interface Effect {
    type: string;
    target?: string;
    operation?: string;
    value?: any;
}

export function applyEffect(state: GameState, effect: Effect) {
    switch (effect.type) {
        case 'stat': {
            if (!effect.target || !effect.operation || effect.value === undefined) return;
            const t = effect.target as keyof typeof state.stats;
            let val = state.stats[t] || 0;

            switch (effect.operation) {
                case 'add': val += effect.value; break;
                case 'set': val = effect.value; break;
                case 'multiply': val *= effect.value; break;
            }

            // Clamp stats 0-100
            val = Math.max(0, Math.min(100, val));
            state.stats[t] = val;
            events.emit('stat_changed', { stat: t, value: val });
            break;
        }
        case 'flag': {
            if (!effect.target || !effect.operation) return;
            if (effect.operation === 'set') state.flags[effect.target] = effect.value ?? true;
            if (effect.operation === 'clear') delete state.flags[effect.target];
            if (effect.operation === 'toggle') state.flags[effect.target] = !state.flags[effect.target];
            events.emit('flag_changed', { flag: effect.target, value: state.flags[effect.target] });
            break;
        }
        case 'money': {
            if (!effect.operation || effect.value === undefined) return;
            switch (effect.operation) {
                case 'add': state.finances.cash += effect.value; break;
                case 'set': state.finances.cash = effect.value; break;
                case 'multiply': state.finances.cash *= effect.value; break;
            }
            events.emit('money_changed', state.finances.cash);
            break;
        }
        case 'death': {
            state.isAlive = false;
            state.deathCause = effect.value || 'Unknown causes';
            events.emit('death', state.deathCause);
            break;
        }
        default:
            console.warn(`Unknown effect type: ${effect.type}`);
    }
}

export function applyEffects(state: GameState, effects: Effect[] | undefined) {
    if (!effects) return;
    for (const eff of effects) applyEffect(state, eff);
}
