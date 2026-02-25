import type { GameState, Relationship } from '../core/GameState';
import { events } from '../core/EventBus';

const FAMILY_TYPES: Relationship['type'][] = ['Father', 'Mother', 'Brother', 'Sister', 'Child'];
const NON_ROMANCE_TYPES: Relationship['type'][] = [...FAMILY_TYPES, 'Pet', 'Teacher'];

function clamp01(value: number): number {
    return Math.max(0, Math.min(100, Math.round(value)));
}

function clearRomanceFlagsForNpc(state: GameState, npcId: string) {
    if ((state.flags.spouseId && state.flags.spouseId === npcId) || (state.flags.partnerId && state.flags.partnerId === npcId)) {
        delete state.flags.spouseId;
        delete state.flags.partnerId;
        delete state.flags.married;
    }
}

function markNpcKilledByPlayer(state: GameState, npc: Relationship, reason: string) {
    npc.isAlive = false;
    npc.health = 0;
    clearRomanceFlagsForNpc(state, npc.id);

    state.history.push({
        age: state.age,
        year: state.year,
        text: `${reason} ${npc.name} is dead.`,
        type: 'primary'
    });

    state.stats.karma = clamp01(state.stats.karma - 30);
    state.stats.craziness = clamp01(state.stats.craziness + 8);

    if (state.serialKiller.unlocked && !state.serialKiller.caught) {
        state.serialKiller.kills += 1;
        state.serialKiller.notoriety = clamp01(state.serialKiller.notoriety + 9);
        state.serialKiller.heat = clamp01(state.serialKiller.heat + 14);
        state.serialKiller.lastKillYear = state.year;
        if (state.serialKiller.mode === 'full_time') {
            const payday = Math.floor(Math.random() * 18000) + 4000;
            state.finances.cash += payday;
            state.history.push({ age: state.age, year: state.year, text: `Your underground network rewarded you $${payday.toLocaleString()} for the hit.`, type: 'secondary' });
        }
    } else {
        state.flags.violent_record = true;
        if (Math.random() < 0.22) {
            state.flags.wanted = true;
            state.history.push({ age: state.age, year: state.year, text: 'Witnesses reported the incident. Authorities are now looking for you.', type: 'primary' });
        }
    }
}

function isRomanceCandidate(state: GameState, npc: Relationship): boolean {
    if (NON_ROMANCE_TYPES.includes(npc.type)) return false;
    if (state.age < 13) return false;
    if (npc.age < 13) return false;
    return true;
}

function hasKnownRelationship(npc: Relationship): boolean {
  return npc.familiarity > 0 || npc.relationshipToPlayer > 0;
}

function isSchoolAffiliated(npc: Relationship): boolean {
  return npc.location === 'School' || npc.workplace === 'School' || npc.type === 'Teacher' || npc.type === 'Classmate';
}

function isVisibleInCurrentContext(state: GameState, npc: Relationship): boolean {
  if (state.currentLocation === 'Home') {
    return npc.location === 'Home' || npc.relationshipToPlayer > 80;
  }

  if (state.currentLocation === 'School') {
    return isSchoolAffiliated(npc);
  }

  if (state.currentLocation === 'Arena' && state.career.field === 'Wrestling') {
    const currentPromotionId = state.wrestlingContract?.promotionId;
    if (npc.traits.includes('Wrestling')) {
      if (!currentPromotionId) return npc.location === 'Arena';
      return npc.location === 'Arena' && (npc.promotionId || null) === currentPromotionId;
    }
    return npc.location === 'Arena';
  }

  return npc.location === state.currentLocation;
}

export function getVisibleRelationships(state: GameState): Relationship[] {
  return state.relationships.filter(npc => npc.isAlive && hasKnownRelationship(npc) && isVisibleInCurrentContext(state, npc));
}

function canSpendTime(state: GameState, timeCost: number, requiresSameLocation: boolean): boolean {
    if (requiresSameLocation) {
        if (state.currentLocation === 'Home') return state.timeBudget >= timeCost;
        return state.locationTime >= timeCost;
    }

    if (state.currentLocation === 'Home') return state.timeBudget >= timeCost;
    return state.locationTime >= timeCost;
}

function spendTime(state: GameState, timeCost: number, requiresSameLocation: boolean): boolean {
    if (!canSpendTime(state, timeCost, requiresSameLocation)) return false;

    if (state.currentLocation === 'Home') {
        state.timeBudget -= timeCost;
    } else {
        state.locationTime -= timeCost;
    }

    return true;
}

export function initializeFamily(state: GameState, lastName: string) {
    const parentAge1 = Math.floor(Math.random() * 20) + 18;
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

        if (npc.familiarity === undefined) npc.familiarity = 50;
        npc.familiarity = Math.max(0, npc.familiarity - Math.floor(Math.random() * 15) - 5);

        if (npc.age > 60 && Math.random() < ((npc.age - 60) * 0.02)) {
            npc.isAlive = false;
            clearRomanceFlagsForNpc(state, npc.id);
            state.history.push({
                age: state.age,
                year: state.year,
                text: `Your ${npc.type.toLowerCase()} ${npc.name} died at the age of ${npc.age}.`,
                type: 'primary'
            });
            state.stats.happiness -= 30;
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
    requiresSameLocation?: boolean;
    allowedTypes?: Relationship['type'][];
    isAvailable?: (state: GameState, npc: Relationship) => boolean;
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
    'Call / Message': {
        id: 'Call / Message', name: 'Call / Message', minAge: 8, cost: 0, timeCost: 1, minRelationship: 0, requiresSameLocation: false,
        perform: (state, npc) => {
            npc.relationshipToPlayer += Math.floor(Math.random() * 4) + 1;
            npc.familiarity += Math.floor(Math.random() * 7) + 3;
            state.history.push({ age: state.age, year: state.year, text: `You reached out to ${npc.name}.`, type: 'secondary' });
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
        id: 'Argue', name: 'Argue', minAge: 4, cost: 0, timeCost: 1, minRelationship: 0, allowedTypes: ['Father', 'Mother', 'Brother', 'Sister', 'Friend', 'Enemy', 'Partner', 'Co-worker', 'Boss', 'Teacher', 'Classmate', 'Child'],
        perform: (state, npc) => {
            npc.relationshipToPlayer -= Math.floor(Math.random() * 15) + 5;
            npc.familiarity += Math.floor(Math.random() * 10) + 5;
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
    'Flirt': {
        id: 'Flirt', name: 'Flirt', minAge: 13, cost: 0, timeCost: 1, minRelationship: 15, requiresSameLocation: false,
        isAvailable: (state, npc) => isRomanceCandidate(state, npc),
        perform: (state, npc) => {
            const success = Math.random() < (0.35 + (state.stats.looks / 300) + (npc.relationshipToPlayer / 400));
            if (success) {
                npc.relationshipToPlayer += Math.floor(Math.random() * 8) + 4;
                npc.familiarity += 5;
                state.history.push({ age: state.age, year: state.year, text: `${npc.name} responded positively to your flirting.`, type: 'secondary' });
            } else {
                npc.relationshipToPlayer -= Math.floor(Math.random() * 8) + 3;
                state.history.push({ age: state.age, year: state.year, text: `${npc.name} was not interested in your advances.`, type: 'secondary' });
            }
        }
    },
    'Ask Out': {
        id: 'Ask Out',
        name: 'Ask Out',
        minAge: 13,
        cost: 0,
        timeCost: 2,
        minRelationship: 35,
        requiresSameLocation: false,
        isAvailable: (state, npc) => isRomanceCandidate(state, npc) && !state.relationships.some(r => r.isAlive && r.type === 'Partner'),
        perform: (state, npc) => {
            const chance = Math.min(0.9, 0.2 + (npc.relationshipToPlayer / 200) + (npc.familiarity / 250) + (state.stats.looks / 500));
            if (Math.random() < chance) {
                npc.type = 'Partner';
                npc.relationshipToPlayer = Math.min(100, npc.relationshipToPlayer + 15);
                npc.familiarity = Math.min(100, npc.familiarity + 10);
                state.flags.partnerId = npc.id;
                state.history.push({ age: state.age, year: state.year, text: `${npc.name} said yes. You started dating.`, type: 'primary' });
            } else {
                npc.relationshipToPlayer = Math.max(0, npc.relationshipToPlayer - 12);
                state.history.push({ age: state.age, year: state.year, text: `${npc.name} rejected your date invitation.`, type: 'primary' });
            }
        }
    },
    'Go on Date': {
        id: 'Go on Date',
        name: 'Go on Date',
        minAge: 13,
        cost: 20,
        timeCost: 2,
        minRelationship: 0,
        allowedTypes: ['Partner'],
        perform: (state, npc) => {
            npc.relationshipToPlayer = Math.min(100, npc.relationshipToPlayer + Math.floor(Math.random() * 10) + 6);
            npc.familiarity = Math.min(100, npc.familiarity + Math.floor(Math.random() * 12) + 8);
            state.stats.happiness += Math.floor(Math.random() * 6) + 3;
            state.history.push({ age: state.age, year: state.year, text: `You went on a date with ${npc.name}.`, type: 'secondary' });
        }
    },
    'Stalk Target': {
        id: 'Stalk Target',
        name: 'Stalk Target',
        minAge: 14,
        cost: 0,
        timeCost: 2,
        minRelationship: 0,
        requiresSameLocation: false,
        perform: (state, npc) => {
            npc.familiarity = Math.min(100, npc.familiarity + 8);
            state.serialKiller.heat = clamp01(state.serialKiller.heat + 6);
            state.stats.craziness = clamp01(state.stats.craziness + 2);
            state.history.push({ age: state.age, year: state.year, text: `You quietly tracked ${npc.name}'s routines.`, type: 'secondary' });
        }
    },
    'Plot to Kill': {
        id: 'Plot to Kill',
        name: 'Plot to Kill',
        minAge: 14,
        cost: 0,
        timeCost: 2,
        minRelationship: 0,
        requiresSameLocation: false,
        isAvailable: (state, npc) => npc.isAlive && state.flags[`plot_${npc.id}`] !== state.year,
        perform: (state, npc) => {
            state.flags[`plot_${npc.id}`] = state.year;
            state.stats.karma = clamp01(state.stats.karma - 8);
            state.stats.craziness = clamp01(state.stats.craziness + 4);
            state.serialKiller.heat = clamp01(state.serialKiller.heat + 5);
            state.history.push({ age: state.age, year: state.year, text: `You began planning ${npc.name}'s death.`, type: 'primary' });
        }
    },
    'Attempt Kill': {
        id: 'Attempt Kill',
        name: 'Attempt Kill',
        minAge: 14,
        cost: 0,
        timeCost: 3,
        minRelationship: 0,
        isAvailable: (state, npc) => npc.isAlive && (state.flags[`plot_${npc.id}`] !== undefined || state.stats.craziness >= 65),
        perform: (state, npc) => {
            const plotted = state.flags[`plot_${npc.id}`] !== undefined;
            const baseChance = 0.2 + (state.stats.craziness / 250) + ((100 - npc.relationshipToPlayer) / 300) + (plotted ? 0.2 : 0);
            const chance = Math.max(0.1, Math.min(0.95, baseChance));

            if (Math.random() < chance) {
                delete state.flags[`plot_${npc.id}`];
                markNpcKilledByPlayer(state, npc, 'Your attack succeeded.');
            } else {
                npc.relationshipToPlayer = 0;
                npc.type = 'Enemy';
                state.stats.health = clamp01(state.stats.health - (Math.floor(Math.random() * 20) + 8));
                state.stats.happiness = clamp01(state.stats.happiness - 10);
                state.serialKiller.heat = clamp01(state.serialKiller.heat + 20);
                state.history.push({ age: state.age, year: state.year, text: `You failed to kill ${npc.name} and they now see you as an enemy.`, type: 'primary' });
            }
        }
    },
    'Hire Hitman': {
        id: 'Hire Hitman',
        name: 'Hire Hitman',
        minAge: 18,
        cost: 5000,
        timeCost: 1,
        minRelationship: 0,
        requiresSameLocation: false,
        isAvailable: (_state, npc) => npc.isAlive,
        perform: (state, npc) => {
            const success = Math.random() < 0.62;
            if (success) {
                markNpcKilledByPlayer(state, npc, 'A hired killer completed the job.');
            } else {
                state.serialKiller.heat = clamp01(state.serialKiller.heat + 18);
                state.flags.wanted = Math.random() < 0.35 || state.flags.wanted === true;
                state.history.push({ age: state.age, year: state.year, text: `The hired killer failed to eliminate ${npc.name}, and the operation drew attention.`, type: 'primary' });
            }
        }
    },
    'Propose Marriage': {
        id: 'Propose Marriage',
        name: 'Propose Marriage',
        minAge: 18,
        cost: 100,
        timeCost: 2,
        minRelationship: 70,
        allowedTypes: ['Partner'],
        isAvailable: (state) => !state.flags.married,
        perform: (state, npc) => {
            const chance = Math.min(0.95, 0.1 + (npc.relationshipToPlayer / 150) + (npc.familiarity / 300));
            if (Math.random() < chance) {
                state.flags.married = true;
                state.flags.spouseId = npc.id;
                delete state.flags.partnerId;
                state.history.push({ age: state.age, year: state.year, text: `${npc.name} accepted your proposal. You got married!`, type: 'primary' });
            } else {
                npc.relationshipToPlayer = Math.max(0, npc.relationshipToPlayer - 15);
                state.history.push({ age: state.age, year: state.year, text: `${npc.name} said it was too soon for marriage.`, type: 'primary' });
            }
        }
    },
    'Break Up / Divorce': {
        id: 'Break Up / Divorce',
        name: 'Break Up / Divorce',
        minAge: 13,
        cost: 0,
        timeCost: 1,
        minRelationship: 0,
        allowedTypes: ['Partner'],
        perform: (state, npc) => {
            const wasMarried = !!state.flags.married && state.flags.spouseId === npc.id;
            npc.type = 'Friend';
            npc.relationshipToPlayer = Math.max(0, npc.relationshipToPlayer - 30);
            npc.familiarity = Math.max(0, npc.familiarity - 10);
            delete state.flags.married;
            delete state.flags.spouseId;
            delete state.flags.partnerId;
            state.stats.happiness -= wasMarried ? 20 : 10;
            state.history.push({
                age: state.age,
                year: state.year,
                text: wasMarried ? `You divorced ${npc.name}.` : `You broke up with ${npc.name}.`,
                type: 'primary'
            });
        }
    },
    'Try for Baby': {
        id: 'Try for Baby',
        name: 'Try for Baby',
        minAge: 18,
        cost: 0,
        timeCost: 2,
        minRelationship: 55,
        allowedTypes: ['Partner'],
        isAvailable: (state) => !!state.flags.married,
        perform: (state, npc) => {
            const fertilityScore = (state.stats.fertility + npc.health + npc.happiness) / 3;
            const chance = Math.max(0.08, Math.min(0.9, fertilityScore / 120));
            if (Math.random() < chance) {
                const childNames = ['Alex', 'Jordan', 'Casey', 'Sam', 'Riley', 'Taylor', 'Morgan', 'Jamie'];
                const childName = childNames[Math.floor(Math.random() * childNames.length)];
                const childGender = Math.random() > 0.5 ? 'Male' : 'Female';

                state.relationships.push({
                    id: `child_${Date.now()}_${Math.floor(Math.random() * 1000000)}`,
                    name: `${childName} ${state.character.lastName}`,
                    type: 'Child',
                    gender: childGender,
                    age: 0,
                    health: 85,
                    happiness: 75,
                    smarts: 50,
                    looks: 50,
                    relationshipToPlayer: 100,
                    familiarity: 100,
                    location: 'Home',
                    isAlive: true,
                    traits: []
                });
                state.stats.happiness += 15;
                state.history.push({ age: state.age, year: state.year, text: `You and ${npc.name} welcomed a child named ${childName}.`, type: 'primary' });
            } else {
                state.history.push({ age: state.age, year: state.year, text: `You and ${npc.name} tried for a baby, but it did not happen this year.`, type: 'secondary' });
            }
        }
    },
    'Care for Child': {
        id: 'Care for Child',
        name: 'Care for Child',
        minAge: 0,
        cost: 0,
        timeCost: 1,
        minRelationship: 0,
        allowedTypes: ['Child'],
        perform: (state, npc) => {
            npc.health += Math.floor(Math.random() * 6) + 3;
            npc.happiness += Math.floor(Math.random() * 8) + 4;
            npc.relationshipToPlayer += Math.floor(Math.random() * 6) + 4;
            npc.familiarity += Math.floor(Math.random() * 10) + 8;
            state.stats.happiness += Math.floor(Math.random() * 4) + 2;
            state.history.push({ age: state.age, year: state.year, text: `You cared for ${npc.name}.`, type: 'secondary' });
        }
    },
    'Mentor Career': {
        id: 'Mentor Career',
        name: 'Mentor Career',
        minAge: 18,
        cost: 0,
        timeCost: 2,
        minRelationship: 35,
        allowedTypes: ['Co-worker'],
        isAvailable: (state, npc) => !!state.career.id && state.career.level >= 2 && npc.location === state.currentLocation,
        perform: (state, npc) => {
            npc.smarts += Math.floor(Math.random() * 8) + 4;
            npc.happiness += Math.floor(Math.random() * 6) + 2;
            npc.relationshipToPlayer += Math.floor(Math.random() * 7) + 5;
            state.career.performance = clamp01(state.career.performance + 1);
            state.history.push({ age: state.age, year: state.year, text: `You mentored ${npc.name} and helped their career growth.`, type: 'secondary' });
        }
    },
    'Undermine Career': {
        id: 'Undermine Career',
        name: 'Undermine Career',
        minAge: 18,
        cost: 0,
        timeCost: 2,
        minRelationship: 0,
        allowedTypes: ['Co-worker'],
        isAvailable: (state, npc) => !!state.career.id && state.career.level >= 3 && npc.location === state.currentLocation,
        perform: (state, npc) => {
            npc.happiness -= Math.floor(Math.random() * 12) + 6;
            npc.relationshipToPlayer -= Math.floor(Math.random() * 14) + 7;
            state.stats.karma = clamp01(state.stats.karma - 6);
            state.history.push({ age: state.age, year: state.year, text: `You quietly undermined ${npc.name}'s standing at work.`, type: 'primary' });
        }
    }
};

export function getAvailableInteractions(state: GameState, npcId: string): InteractionDef[] {
    const npc = state.relationships.find(r => r.id === npcId);
    if (!npc || !npc.isAlive || !hasKnownRelationship(npc)) return [];

    return Object.values(INTERACTIONS).filter(int => {
        if (state.age < int.minAge || state.finances.cash < int.cost || npc.relationshipToPlayer < int.minRelationship) return false;
        if (int.allowedTypes && !int.allowedTypes.includes(npc.type)) return false;
        if (int.isAvailable && !int.isAvailable(state, npc)) return false;

        const requiresSameLocation = int.requiresSameLocation !== false;
        if (requiresSameLocation && npc.location !== state.currentLocation) return false;
        if (!canSpendTime(state, int.timeCost, requiresSameLocation)) return false;

        return true;
    });
}

export function interactWithNPC(state: GameState, npcId: string, actionId: string) {
    const npc = state.relationships.find(r => r.id === npcId);
    const act = INTERACTIONS[actionId];
    if (!npc || !npc.isAlive || !act || state.finances.cash < act.cost || !hasKnownRelationship(npc)) return;
    if (act.allowedTypes && !act.allowedTypes.includes(npc.type)) return;
    if (act.isAvailable && !act.isAvailable(state, npc)) return;

    const requiresSameLocation = act.requiresSameLocation !== false;
    if (requiresSameLocation && npc.location !== state.currentLocation) return;
    if (!spendTime(state, act.timeCost, requiresSameLocation)) return;

    state.finances.cash -= act.cost;

    act.perform(state, npc);

    npc.relationshipToPlayer = clamp01(npc.relationshipToPlayer);
    npc.familiarity = clamp01(npc.familiarity);
    npc.health = clamp01(npc.health);
    npc.happiness = clamp01(npc.happiness);
    npc.smarts = clamp01(npc.smarts);
    npc.looks = clamp01(npc.looks);

    Object.keys(state.stats).forEach(k => {
        const key = k as keyof typeof state.stats;
        state.stats[key] = clamp01(state.stats[key]);
    });

    state.serialKiller.heat = clamp01(state.serialKiller.heat);
    state.serialKiller.notoriety = clamp01(state.serialKiller.notoriety);

    events.emit('stat_changed', null);
}
