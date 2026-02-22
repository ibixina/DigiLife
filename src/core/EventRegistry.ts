// EventRegistry.ts
import type { GameState } from './GameState';
import { evaluateConditions } from './ConditionSystem';
import type { Condition } from './ConditionSystem';
import type { Effect } from './EffectSystem';

export interface GameEvent {
    id: string;
    title: string;
    description: string;
    icon?: string;
    category: string;
    minAge: number;
    maxAge: number;
    weight: number;
    cooldown?: number;
    unique?: boolean;
    conditions?: Condition[];
    choices: Choice[];
}

export interface Choice {
    text: string;
    effects?: Effect[];
    outcomes?: Outcome[];
}

export interface Outcome {
    chance: number;
    description: string;
    effects?: Effect[];
}

export class EventRegistry {
    private events: Map<string, GameEvent> = new Map();

    register(event: GameEvent) {
        this.events.set(event.id, event);
    }

    registerMany(events: GameEvent[]) {
        events.forEach(e => this.register(e));
    }

    getEligibleEvents(state: GameState): GameEvent[] {
        const eligible: GameEvent[] = [];

        for (const [_, event] of this.events) {
            if (state.age < event.minAge || state.age > event.maxAge) continue;

            // Check if unique and already triggered (stored in history)
            if (event.unique && state.flags[`event_${event.id}_triggered`]) continue;

            if (!evaluateConditions(state, event.conditions)) continue;

            eligible.push(event);
        }

        return eligible;
    }

    selectRandomEvent(state: GameState): GameEvent | null {
        const eligibleEvents = this.getEligibleEvents(state);
        if (eligibleEvents.length === 0) return null;

        // Weighted random selection
        const totalWeight = eligibleEvents.reduce((sum, e) => sum + e.weight, 0);
        let randomVal = Math.random() * totalWeight;

        for (const event of eligibleEvents) {
            randomVal -= event.weight;
            if (randomVal <= 0) return event;
        }

        return eligibleEvents[eligibleEvents.length - 1];
    }
}
