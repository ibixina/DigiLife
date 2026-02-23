import type { GameState } from '../core/GameState';
import { events } from '../core/EventBus';

export interface ActivityDef {
    id: string;
    name: string;
    minAge: number;
    cost: number; // money cost
    timeCost: number; // consumes locationTime, OR timeBudget (mths) if isTravel
    requiresLocation?: string;
    isTravel?: boolean;
    travelTo?: string;
    locationTimeGranted?: number;
    perform: (state: GameState, addStat: (stat: keyof GameState['stats'], baseGain: number) => void) => void;
}

export function calculateNaturalPotential(currentStat: number): number {
    // Diminishing returns: much harder to progress past certain thresholds.
    if (currentStat >= 95) return 0.1;
    if (currentStat >= 85) return 0.3;
    if (currentStat >= 70) return 0.6;
    return 1.0;
}

export const ACTIVITIES: Record<string, ActivityDef> = {
    // TRAVEL ACTIONS
    'Go Home': {
        id: 'Go Home', name: 'Go Home', minAge: 0, cost: 0, timeCost: 1, isTravel: true, travelTo: 'Home', locationTimeGranted: 10,
        perform: (state) => {
            state.history.push({ age: state.age, year: state.year, text: 'You went back home.', type: 'secondary' });
        }
    },
    'Go to School': {
        id: 'Go to School', name: 'Go to School', minAge: 5, cost: 0, timeCost: 2, isTravel: true, travelTo: 'School', locationTimeGranted: 8,
        perform: (state) => {
            state.history.push({ age: state.age, year: state.year, text: 'You went to school.', type: 'secondary' });
            // Generate some classmates and teachers if you don't have enough
            const schoolNPCs = state.relationships.filter(r => r.location === 'School' && r.isAlive);
            if (schoolNPCs.length < 3) {
                state.relationships.push({
                    id: 'teacher_' + Date.now() + Math.random(),
                    name: 'Teacher',
                    type: 'Teacher',
                    gender: 'Non-binary',
                    age: Math.floor(state.age + 20),
                    health: 80, happiness: 50, smarts: 80, looks: 50,
                    relationshipToPlayer: 50, familiarity: 10, location: 'School', isAlive: true, traits: []
                });
                state.relationships.push({
                    id: 'classmate_' + Date.now() + Math.random(),
                    name: 'Classmate',
                    type: 'Classmate',
                    gender: 'Non-binary',
                    age: state.age,
                    health: 80, happiness: 50, smarts: 80, looks: 50,
                    relationshipToPlayer: 50, familiarity: 10, location: 'School', isAlive: true, traits: []
                });
            }
        }
    },
    'Go to Gym': {
        id: 'Go to Gym', name: 'Go to Gym', minAge: 14, cost: 0, timeCost: 1, isTravel: true, travelTo: 'Gym', locationTimeGranted: 6,
        perform: (state) => {
            state.history.push({ age: state.age, year: state.year, text: 'You traveled to the gym.', type: 'secondary' });
        }
    },
    'Go to Movies': {
        id: 'Go to Movies', name: 'Go to Movies', minAge: 12, cost: 0, timeCost: 1, isTravel: true, travelTo: 'Movies', locationTimeGranted: 4,
        perform: (state) => {
            state.history.push({ age: state.age, year: state.year, text: 'You traveled to the movie theater.', type: 'secondary' });
        }
    },

    // LOCAL ACTIVITIES
    'Walk': {
        id: 'Walk', name: 'Walk', minAge: 3, cost: 0, timeCost: 1, requiresLocation: 'Home',
        perform: (state, addStat) => {
            addStat('health', 1);
            addStat('happiness', 1);
            addStat('athleticism', 1);
            state.history.push({ age: state.age, year: state.year, text: 'You went for a walk outside your house.', type: 'secondary' });
        }
    },
    'Read Book': {
        id: 'Read Book', name: 'Read Book', minAge: 5, cost: 0, timeCost: 2, requiresLocation: 'Home',
        perform: (state, addStat) => {
            addStat('smarts', Math.floor(Math.random() * 3) + 1);
            state.history.push({ age: state.age, year: state.year, text: 'You read a book.', type: 'secondary' });
        }
    },
    'Study': {
        id: 'Study', name: 'Study', minAge: 5, cost: 0, timeCost: 3, requiresLocation: 'School',
        perform: (state, addStat) => {
            addStat('smarts', Math.floor(Math.random() * 8) + 2);
            state.stats.happiness -= 2;
            state.history.push({ age: state.age, year: state.year, text: 'You studied hard at school.', type: 'secondary' });
        }
    },
    'Meditate': {
        id: 'Meditate', name: 'Meditate', minAge: 8, cost: 0, timeCost: 1, requiresLocation: 'Home',
        perform: (state, addStat) => {
            addStat('happiness', Math.floor(Math.random() * 5) + 2);
            state.history.push({ age: state.age, year: state.year, text: 'You meditated.', type: 'secondary' });
        }
    },
    'Watch Movie': {
        id: 'Watch Movie', name: 'Watch Movie', minAge: 12, cost: 15, timeCost: 3, requiresLocation: 'Movies',
        perform: (state, addStat) => {
            addStat('happiness', Math.floor(Math.random() * 10) + 5);
            state.history.push({ age: state.age, year: state.year, text: 'You watched a movie.', type: 'secondary' });
        }
    },
    'Workout': {
        id: 'Workout', name: 'Workout', minAge: 14, cost: 10, timeCost: 3, requiresLocation: 'Gym',
        perform: (state, addStat) => {
            addStat('athleticism', Math.floor(Math.random() * 10) + 2);
            addStat('health', Math.floor(Math.random() * 3) + 1);
            addStat('looks', Math.floor(Math.random() * 3));
            state.history.push({ age: state.age, year: state.year, text: 'You worked out hard at the gym.', type: 'secondary' });
        }
    }
};

export function getAvailableActivities(state: GameState): ActivityDef[] {
    return Object.values(ACTIVITIES).filter(act => {
        if (state.age < act.minAge || state.finances.cash < act.cost) return false;

        if (act.isTravel) {
            // Can only travel if at Home, OR if the travel is "Go Home"
            if (act.travelTo === 'Home') {
                if (state.currentLocation === 'Home') return false; // Already home
                if (state.timeBudget < act.timeCost) return false;
            } else {
                if (state.currentLocation !== 'Home') return false; // Can only travel FROM home
                if (state.timeBudget < act.timeCost) return false;
            }
        } else {
            // Local check
            if (act.requiresLocation && act.requiresLocation !== state.currentLocation) return false;

            if (state.currentLocation === 'Home') {
                if (state.timeBudget < act.timeCost) return false;
            } else {
                if (state.locationTime < act.timeCost) return false;
            }
        }

        return true;
    });
}

export function performActivity(state: GameState, activityId: string) {
    const act = ACTIVITIES[activityId];
    if (!act) return;

    if (act.isTravel) {
        if (state.timeBudget < act.timeCost) return;
        state.timeBudget -= act.timeCost;
        state.currentLocation = act.travelTo || 'Home';
        state.locationTime = act.locationTimeGranted || 10;
    } else {
        if (act.requiresLocation && act.requiresLocation !== state.currentLocation) return;

        if (state.currentLocation === 'Home') {
            if (state.timeBudget < act.timeCost || state.finances.cash < act.cost) return;
            state.timeBudget -= act.timeCost;
        } else {
            if (state.locationTime < act.timeCost || state.finances.cash < act.cost) return;
            state.locationTime -= act.timeCost;
        }
    }
    state.finances.cash -= act.cost;

    // Track consistency
    if (!state.activitiesExperience) state.activitiesExperience = {};
    const exp = state.activitiesExperience[activityId] || 0;

    // The more you do it, the more "efficient" it becomes up to a cap (e.g. +50% at 50 exp)
    const efficiencyMult = 1 + Math.min(exp / 100, 0.5);

    const addStat = (statName: keyof GameState['stats'], baseGain: number) => {
        const currentStat = state.stats[statName];
        const potentialMult = calculateNaturalPotential(currentStat);

        // Final gain can dwindle heavily if you reached natural limits
        const finalGain = baseGain * efficiencyMult * potentialMult;
        state.stats[statName] += finalGain;
    };

    act.perform(state, addStat);

    state.activitiesExperience[activityId] = exp + 1;

    // Clamp stats explicitly using Math.round to keep UI clean
    Object.keys(state.stats).forEach(k => {
        const key = k as keyof typeof state.stats;
        state.stats[key] = Math.max(0, Math.min(100, Math.round(state.stats[key])));
    });

    events.emit('stat_changed', null);
}
