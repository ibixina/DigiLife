// Engine.ts
import { createInitialState } from './GameState';
import type { GameState } from './GameState';
import { EventRegistry } from './EventRegistry';
import type { GameEvent } from './EventRegistry';
import { applyEffects } from './EffectSystem';
import { events } from './EventBus';

export class Engine {
    public state: GameState;
    public registry: EventRegistry;

    constructor() {
        this.state = createInitialState();
        this.registry = new EventRegistry();
    }

    loadState(savedState: GameState) {
        this.state = savedState;
    }

    ageUp() {
        if (!this.state.isAlive) return;

        this.state.age += 1;
        this.state.year += 1;

        // Base stat decay/growth
        if (this.state.age > 50) this.state.stats.health -= Math.floor(Math.random() * 3);
        if (this.state.age > 40) this.state.stats.looks -= Math.floor(Math.random() * 2);
        this.state.stats.smarts += Math.floor(Math.random() * 2);

        // Clamp
        Object.keys(this.state.stats).forEach(k => {
            const key = k as keyof typeof this.state.stats;
            this.state.stats[key] = Math.max(0, Math.min(100, this.state.stats[key]));
        });

        this.logHistory(this.state.age, `You are now ${this.state.age} years old.`, 'age_up');
        events.emit('age_up', this.state.age);

        // Trigger random event
        const evt = this.registry.selectRandomEvent(this.state);
        if (evt) {
            if (evt.unique) this.state.flags[`event_${evt.id}_triggered`] = true;
            events.emit('event_triggered', evt);
        } else {
            this.logHistory(this.state.age, 'Nothing much happened this year.', 'primary');
            events.emit('stat_changed', null);
        }

        // Death check
        if (this.state.stats.health <= 0) {
            this.state.isAlive = false;
            this.state.deathCause = 'Health complications';
            this.logHistory(this.state.age, `You died of ${this.state.deathCause}.`, 'primary');
            events.emit('death', this.state.deathCause);
        }
    }

    handleChoice(event: GameEvent, choiceIndex: number) {
        const choice = event.choices[choiceIndex];
        if (!choice) return;

        // Apply baseline choices
        if (choice.effects) applyEffects(this.state, choice.effects);

        this.logHistory(this.state.age, `You chose: ${choice.text}`, 'secondary');

        // Handle random outcomes
        if (choice.outcomes && choice.outcomes.length > 0) {
            const roll = Math.random();
            let cumulativeChance = 0;

            for (const outcome of choice.outcomes) {
                cumulativeChance += outcome.chance;
                if (roll <= cumulativeChance) {
                    this.logHistory(this.state.age, outcome.description, 'primary');
                    if (outcome.effects) applyEffects(this.state, outcome.effects);
                    break;
                }
            }
        }

        events.emit('choice_made', choice);
    }

    logHistory(age: number, text: string, type: 'primary' | 'secondary' | 'age_up' = 'primary') {
        this.state.history.push({ age, year: this.state.year, text, type });
    }
}

export const engine = new Engine();
