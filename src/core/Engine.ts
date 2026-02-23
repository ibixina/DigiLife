// Engine.ts
import { createInitialState } from './GameState';
import type { GameState } from './GameState';
import { EventRegistry } from './EventRegistry';
import type { GameEvent } from './EventRegistry';
import { applyEffects } from './EffectSystem';
import { initializeFamily, ageUpNPCs } from '../systems/RelationshipSystem';
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

    startNewLife(firstName: string, lastName: string, gender: 'Male' | 'Female' | 'Non-binary', country: string) {
        this.state = createInitialState();

        const talents = ['Academic', 'Athletic', 'Artistic', 'Business', 'Crime', 'Looks', 'Music', 'Political', 'Social', 'Voice'];
        const randomTalent = talents[Math.floor(Math.random() * talents.length)];

        // Generate basic traits
        const traitsList = ['Optimist', 'Pessimist', 'Lazy', 'Ambitious', 'Brave', 'Coward', 'Generous', 'Selfish'];
        const randomTraits: string[] = [];
        const numTraits = Math.floor(Math.random() * 2) + 1;
        for (let i = 0; i < numTraits; i++) {
            const trait = traitsList[Math.floor(Math.random() * traitsList.length)];
            if (!randomTraits.includes(trait)) randomTraits.push(trait);
        }

        this.state.character = {
            firstName,
            lastName,
            gender,
            country,
            talent: randomTalent,
            traits: randomTraits
        };

        // Randomize base stats based on birth
        this.state.stats.athleticism = Math.floor(Math.random() * 60) + 20;
        this.state.stats.craziness = Math.floor(Math.random() * 80) + 10;
        this.state.stats.willpower = Math.floor(Math.random() * 60) + 20;
        this.state.stats.fertility = Math.floor(Math.random() * 80) + 20;
        this.state.stats.smarts = Math.floor(Math.random() * 60) + 20;
        this.state.stats.looks = Math.floor(Math.random() * 80) + 20;

        this.logHistory(0, `You were born a ${gender} named ${firstName} ${lastName} in ${country}.`, 'primary');
        if (randomTalent) {
            this.logHistory(0, `You were born with a special talent in ${randomTalent}!`, 'secondary');
        }

        this.state.timeBudget = 12;
        initializeFamily(this.state, lastName);
    }

    ageUp() {
        if (!this.state.isAlive) return;

        this.state.age += 1;
        this.state.year += 1;
        this.state.timeBudget = 12;

        // Base stat decay/growth
        if (this.state.age > 50) this.state.stats.health -= Math.floor(Math.random() * 3);
        if (this.state.age > 40) this.state.stats.looks -= Math.floor(Math.random() * 2);
        this.state.stats.smarts += Math.floor(Math.random() * 2);

        ageUpNPCs(this.state);

        // Passive heal/decay based on happiness & health
        if (this.state.stats.happiness > 80 && this.state.stats.health < 100) this.state.stats.health += 1;
        if (this.state.stats.happiness < 20) this.state.stats.health -= 2;

        // Passive finances
        if (this.state.finances.debt > 0) {
            // Apply 5% interest
            const interest = Math.floor(this.state.finances.debt * 0.05);
            this.state.finances.debt += interest;
        }

        const netIncome = this.state.finances.salary - this.state.finances.expenses;
        this.state.finances.cash += netIncome;

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
        } else if (this.state.age >= 75) {
            // Increasing chance to die of old age
            // At 80: 5%, 90: 15%, 100: 25%, 110: 35%, 122: 100%
            const baseChance = (this.state.age - 75) / 100;
            // Health offsets the chance slightly
            const healthBonus = (this.state.stats.health / 100) * 0.1;
            const finalChance = Math.max(0.01, baseChance - healthBonus);

            if (Math.random() < finalChance || this.state.age >= 122) {
                this.state.isAlive = false;
                this.state.deathCause = 'Old age';
                this.logHistory(this.state.age, `You died peacefully of ${this.state.deathCause}.`, 'primary');
                events.emit('death', this.state.deathCause);
            }
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
