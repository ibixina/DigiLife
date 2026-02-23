import type { GameState, Relationship } from '../core/GameState';
import { events } from '../core/EventBus';

export function initializeFamily(state: GameState, lastName: string) {
    const parentAge1 = Math.floor(Math.random() * 20) + 18; // 18-37
    const parentAge2 = Math.floor(Math.random() * 20) + 18;

    state.relationships.push({
        id: 'father_' + Date.now(),
        name: 'John ' + lastName,
        type: 'Father',
        gender: 'Male',
        age: parentAge1,
        health: Math.floor(Math.random() * 30) + 70,
        happiness: Math.floor(Math.random() * 40) + 60,
        smarts: Math.floor(Math.random() * 50) + 50,
        looks: Math.floor(Math.random() * 50) + 50,
        relationshipToPlayer: 100,
        familiarity: 100,
        location: 'Home',
        isAlive: true,
        traits: ['Generous']
    });

    state.relationships.push({
        id: 'mother_' + Date.now(),
        name: 'Jane ' + lastName,
        type: 'Mother',
        gender: 'Female',
        age: parentAge2,
        health: Math.floor(Math.random() * 30) + 70,
        happiness: Math.floor(Math.random() * 40) + 60,
        smarts: Math.floor(Math.random() * 50) + 50,
        looks: Math.floor(Math.random() * 50) + 50,
        relationshipToPlayer: 100,
        familiarity: 100,
        location: 'Home',
        isAlive: true,
        traits: ['Optimist']
    });

    // Siblings
    const numSiblings = Math.floor(Math.random() * 3);
    for (let i = 0; i < numSiblings; i++) {
        const isBrother = Math.random() > 0.5;
        const sibAge = Math.floor(Math.random() * 10);
        state.relationships.push({
            id: 'sibling_' + Date.now() + i,
            name: (isBrother ? 'Tim ' : 'Sarah ') + lastName,
            type: isBrother ? 'Brother' : 'Sister',
            gender: isBrother ? 'Male' : 'Female',
            age: sibAge,
            health: 80,
            happiness: 80,
            smarts: 50,
            looks: 50,
            relationshipToPlayer: 80,
            familiarity: 80,
            location: 'Home',
            isAlive: true,
            traits: []
        });
    }
}

export function ageUpNPCs(state: GameState) {
    state.relationships.forEach(npc => {
        if (!npc.isAlive) return;
        npc.age++;

        // Decay familiarity if not interacted with (player can build it back up)
        // Ensure familiarity is defined to support existing saves
        if (npc.familiarity === undefined) npc.familiarity = 50;
        npc.familiarity = Math.max(0, npc.familiarity - Math.floor(Math.random() * 15) - 5);

        // Random NPC death
        if (npc.age > 60 && Math.random() < ((npc.age - 60) * 0.02)) {
            npc.isAlive = false;
            state.history.push({
                age: state.age,
                year: state.year,
                text: `Your ${npc.type.toLowerCase()} ${npc.name} died at the age of ${npc.age}.`,
                type: 'primary'
            });
            state.stats.happiness -= 30; // Tragic loss
        }
    });
}

export interface InteractionDef {
    id: string;
    name: string;
    minAge: number;
    cost: number;
    timeCost: number;
    minRelationship: number;
    perform: (state: GameState, npc: Relationship) => void;
}

export const INTERACTIONS: Record<string, InteractionDef> = {
    'Converse': {
        id: 'Converse', name: 'Converse', minAge: 2, cost: 0, timeCost: 1, minRelationship: 0,
        perform: (state, npc) => {
            npc.relationshipToPlayer += Math.floor(Math.random() * 5);
            npc.familiarity += Math.floor(Math.random() * 15) + 10;
            state.stats.happiness += Math.floor(Math.random() * 2) + 1;
            state.history.push({ age: state.age, year: state.year, text: `You had a conversation with ${npc.name}.`, type: 'secondary' });
        }
    },
    'Spend Time': {
        id: 'Spend Time', name: 'Spend Time', minAge: 2, cost: 0, timeCost: 2, minRelationship: 0,
        perform: (state, npc) => {
            npc.relationshipToPlayer += Math.floor(Math.random() * 10) + 2;
            npc.familiarity += Math.floor(Math.random() * 30) + 15;
            state.stats.happiness += Math.floor(Math.random() * 5) + 2;
            state.history.push({ age: state.age, year: state.year, text: `You spent time with ${npc.name}.`, type: 'secondary' });
        }
    },
    'Argue': {
        id: 'Argue', name: 'Argue', minAge: 4, cost: 0, timeCost: 1, minRelationship: 0,
        perform: (state, npc) => {
            npc.relationshipToPlayer -= Math.floor(Math.random() * 15) + 5;
            npc.familiarity += Math.floor(Math.random() * 10) + 5; // still interacted
            state.stats.happiness -= Math.floor(Math.random() * 10) + 5;
            state.history.push({ age: state.age, year: state.year, text: `You argued with ${npc.name}.`, type: 'secondary' });
        }
    },
    'Gift': {
        id: 'Gift', name: 'Gift', minAge: 10, cost: 20, timeCost: 1, minRelationship: 0,
        perform: (state, npc) => {
            npc.relationshipToPlayer += Math.floor(Math.random() * 20) + 5;
            npc.familiarity += Math.floor(Math.random() * 20) + 10;
            state.history.push({ age: state.age, year: state.year, text: `You gave a gift to ${npc.name}.`, type: 'secondary' });
        }
    },
    'Ask for Money': {
        id: 'Ask for Money', name: 'Ask for Money', minAge: 6, cost: 0, timeCost: 1, minRelationship: 20,
        perform: (state, npc) => {
            npc.familiarity += 5;
            // Higher chance to reject if you don't know them well
            const knowsYouWell = npc.familiarity > 40;
            if (npc.relationshipToPlayer > 50 && knowsYouWell && Math.random() > 0.4) {
                const amount = Math.floor(Math.random() * 100) + 20;
                state.finances.cash += amount;
                state.history.push({ age: state.age, year: state.year, text: `${npc.name} gave you $${amount}.`, type: 'secondary' });
            } else {
                npc.relationshipToPlayer -= Math.floor(Math.random() * 10);
                const reason = knowsYouWell ? "refused to give you money" : "barely knows you and refused to give you money";
                state.history.push({ age: state.age, year: state.year, text: `${npc.name} ${reason}.`, type: 'secondary' });
            }
        }
    }
};

export function getAvailableInteractions(state: GameState, npcId: string): InteractionDef[] {
    const npc = state.relationships.find(r => r.id === npcId);
    if (!npc || !npc.isAlive || npc.location !== state.currentLocation) return [];

    return Object.values(INTERACTIONS).filter(int => {
        if (state.age < int.minAge || state.finances.cash < int.cost || npc.relationshipToPlayer < int.minRelationship) return false;

        if (state.currentLocation === 'Home') {
            if (state.timeBudget < int.timeCost) return false;
        } else {
            if (state.locationTime < int.timeCost) return false;
        }

        return true;
    });
}

export function interactWithNPC(state: GameState, npcId: string, actionId: string) {
    const npc = state.relationships.find(r => r.id === npcId);
    const act = INTERACTIONS[actionId];
    if (!npc || !npc.isAlive || npc.location !== state.currentLocation || !act || state.finances.cash < act.cost) return;

    if (state.currentLocation === 'Home') {
        if (state.timeBudget < act.timeCost) return;
        state.timeBudget -= act.timeCost;
    } else {
        if (state.locationTime < act.timeCost) return;
        state.locationTime -= act.timeCost;
    }

    state.finances.cash -= act.cost;

    act.perform(state, npc);

    npc.relationshipToPlayer = Math.max(0, Math.min(100, npc.relationshipToPlayer));
    npc.familiarity = Math.max(0, Math.min(100, npc.familiarity));
    events.emit('stat_changed', null);
}
