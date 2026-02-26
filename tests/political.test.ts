// political.test.ts
// Tests for PoliticalSystem — mirrors the testing plan in §15 of PLAN_POLITICIAN.md.

import { createInitialState, createDefaultPoliticalState } from '../src/core/GameState';
import type { GameState } from '../src/core/GameState';
import {
    registerPoliticalPositions,
    registerPolicies,
    registerScandals,
    isEligibleForPosition,
    declareCandidacy,
    fundCampaign,
    holdRally,
    acceptLobbyistDonation,
    calculateWinProbability,
    resolveElection,
    calculateScandalExposureChance,
    checkForScandal,
    applyScandal,
    resolveScandalChoice,
    enactPolicy,
    getAvailablePolicies,
    calculateRevolutionChance,
    processPoliticalYear,
    stageCoup,
    getAvailablePoliticalActions,
    performPoliticalAction,
} from '../src/systems/PoliticalSystem';
import type { PoliticalPosition, PolicyDefinition, ScandalDefinition } from '../src/systems/PoliticalSystem';
import { test, equal, assert, includes, notIncludes, withMockedRandom } from './harness';

// ─── Fixtures ────────────────────────────────────────────────────────────────

/** Minimal position definitions used across tests. */
const POSITIONS: PoliticalPosition[] = [
    {
        id: 'city_council',
        title: 'City Council Member',
        level: 1,
        minAge: 21,
        requiredEducation: 'High School',
        minSmarts: 45,
        minWillpower: 40,
        minPoliticalYears: 0,
        salary: 45000,
        termLength: 4,
        termLimit: 2,
        isElected: true,
        governmentTypes: ['democracy', 'authoritarian'],
        filingFee: 500,
        baseCampaignCost: 10000,
        nextPositions: ['mayor'],
    },
    {
        id: 'mayor',
        title: 'Mayor',
        level: 1,
        minAge: 25,
        requiredEducation: 'High School',
        minSmarts: 50,
        minWillpower: 45,
        minPoliticalYears: 1,
        salary: 65000,
        termLength: 4,
        termLimit: 2,
        isElected: true,
        governmentTypes: ['democracy', 'authoritarian'],
        filingFee: 5000,
        baseCampaignCost: 50000,
        nextPositions: ['governor', 'state_rep'],
    },
    {
        id: 'governor',
        title: 'Governor',
        level: 2,
        minAge: 30,
        requiredEducation: 'Bachelor',
        minSmarts: 62,
        minWillpower: 58,
        minPoliticalYears: 5,
        salary: 175000,
        termLength: 4,
        termLimit: 2,
        isElected: true,
        governmentTypes: ['democracy'],
        filingFee: 10000,
        baseCampaignCost: 5000000,
        nextPositions: ['president'],
    },
    {
        id: 'president',
        title: 'President',
        level: 4,
        minAge: 35,
        requiredEducation: 'Bachelor',
        minSmarts: 70,
        minWillpower: 65,
        minPoliticalYears: 8,
        salary: 400000,
        termLength: 4,
        termLimit: 2,
        isElected: true,
        governmentTypes: ['democracy'],
        filingFee: 50000,
        baseCampaignCost: 100000000,
        nextPositions: [],
    },
    {
        id: 'supreme_leader_test',
        title: 'Supreme Leader',
        level: 5,
        minAge: 30,
        requiredEducation: 'None',
        minSmarts: 0,
        minWillpower: 0,
        minPoliticalYears: 0,
        minAuthoritarianScore: 80,
        minMilitaryControl: 60,
        salary: 1000000,
        termLength: 0,
        termLimit: 0,       // No term limit
        isElected: false,
        governmentTypes: ['dictatorship'],
        filingFee: 0,
        baseCampaignCost: 0,
        nextPositions: [],
    },
];

const POLICIES: PolicyDefinition[] = [
    {
        id: 'universal_healthcare',
        name: 'Universal Healthcare Act',
        description: 'Government-funded healthcare for all.',
        ideology: 'left',
        minLevel: 2,
        netApprovalEffect: 5,
        economyEffect: -5,
        karmaEffect: 10,
        prerequisitePolicies: [],
        conflictsPolicies: ['privatize_healthcare'],
    },
    {
        id: 'privatize_healthcare',
        name: 'Healthcare Privatisation Act',
        description: 'Move healthcare to private sector.',
        ideology: 'right',
        minLevel: 2,
        netApprovalEffect: -3,
        economyEffect: 5,
        karmaEffect: -5,
        prerequisitePolicies: [],
        conflictsPolicies: ['universal_healthcare'],
    },
    {
        id: 'infrastructure_bill',
        name: 'National Infrastructure Bill',
        description: 'Rebuild roads, bridges, and broadband.',
        ideology: 'center',
        minLevel: 3,
        netApprovalEffect: 8,
        economyEffect: 3,
        karmaEffect: 5,
        prerequisitePolicies: [],
        conflictsPolicies: [],
    },
    {
        id: 'advanced_surveillance',
        name: 'Advanced Surveillance Programme',
        description: 'Expand state surveillance capabilities.',
        ideology: 'authoritarian',
        minLevel: 4,
        netApprovalEffect: -5,
        economyEffect: 0,
        karmaEffect: -10,
        mediaControlEffect: 15,
        authoritarianEffect: 10,
        prerequisitePolicies: [],
        conflictsPolicies: [],
    },
];

const SCANDALS: ScandalDefinition[] = [
    {
        id: 'minor_bribery',
        title: 'Minor Bribery Allegation',
        description: 'A local official claims you accepted a small bribe.',
        severity: 'minor',
        approvalHit: -5,
        corruptionThreshold: 10,
        triggersImpeachment: false,
        choices: [
            { text: 'Deny everything', approvalHit: -2, corruptionGain: 5 },
            { text: 'Confess and apologise', approvalHit: -8, karmaGain: 5 },
        ],
    },
    {
        id: 'campaign_finance_violation',
        title: 'Campaign Finance Violation',
        description: 'Illegal donations were traced back to your campaign.',
        severity: 'major',
        approvalHit: -20,
        corruptionThreshold: 40,
        triggersImpeachment: true,
        choices: [
            { text: 'Blame your campaign manager', approvalHit: -5, corruptionGain: 10, karmaHit: 10 },
            {
                text: 'Take full responsibility and cooperate',
                successChance: 0.6,
                successApproval: 3,
                failApproval: -15,
                karmaGain: 8,
            },
        ],
    },
];

/** Build a ready-to-test adult state with positions/policies/scandals registered. */
function makePoliticalState(overrides: Partial<GameState['politics']> = {}): GameState {
    registerPoliticalPositions(POSITIONS);
    registerPolicies(POLICIES);
    registerScandals(SCANDALS);

    const state = createInitialState();
    state.age = 30;
    state.year = 2050;
    state.timeBudget = 12;
    state.stats.smarts = 80;
    state.stats.willpower = 75;
    state.stats.looks = 60;
    state.education.level = 'Bachelor';
    state.finances.cash = 100000;

    Object.assign(state.politics, overrides);
    return state;
}

/** Put the player into a specific office. */
function holdOffice(state: GameState, positionId: string): void {
    const pos = POSITIONS.find(p => p.id === positionId)!;
    state.politics.active = true;
    state.politics.currentPosition = positionId;
    state.politics.positionTitle = pos.title;
    state.politics.positionLevel = pos.level;
    state.politics.approvalRating = 60;
    state.politics.yearsInOffice = 0;
    state.politics.termsServed = 1;
    state.finances.salary = pos.salary;
    state.career.field = 'Politics';
    state.career.title = pos.title;
}

// ─── 1. State Initialization ─────────────────────────────────────────────────

test('Default political state initialises with sane values', () => {
    const pol = createDefaultPoliticalState();
    equal(pol.active, false, 'Should not be active by default');
    equal(pol.currentPosition, null, 'No current position on init');
    equal(pol.positionLevel, 0, 'Position level should be zero');
    equal(pol.governmentType, 'democracy', 'Default government type is democracy');
    equal(pol.approvalRating, 50, 'Approval starts at 50');
    equal(pol.corruptionLevel, 0, 'No corruption on init');
    equal(pol.campaignActive, false, 'Not campaigning on init');
    assert(Array.isArray(pol.policiesEnacted), 'policiesEnacted should be an array');
    equal(pol.policiesEnacted.length, 0, 'No policies enacted on init');
});

test('createInitialState includes a valid politics field', () => {
    const state = createInitialState();
    assert('politics' in state, 'GameState must include politics field');
    equal(typeof state.politics.approvalRating, 'number', 'approvalRating must be numeric');
    equal(typeof state.politics.corruptionLevel, 'number', 'corruptionLevel must be numeric');
});

// ─── 2. Position Eligibility Gates ───────────────────────────────────────────

test('City council eligibility: age, education, smarts gates', () => {
    registerPoliticalPositions(POSITIONS);
    const cityCouncil = POSITIONS.find(p => p.id === 'city_council')!;

    const state = createInitialState();
    state.stats.smarts = 80;
    state.stats.willpower = 70;
    state.education.level = 'High School';

    // Under-age
    state.age = 20;
    equal(isEligibleForPosition(state, cityCouncil), false, 'Should block under 21');

    // At required age
    state.age = 21;
    equal(isEligibleForPosition(state, cityCouncil), true, 'Should allow at 21 with HS diploma');

    // Education too low
    state.education.level = 'Secondary';
    equal(isEligibleForPosition(state, cityCouncil), false, 'Should block with only secondary education');

    // Back to required
    state.education.level = 'High School';
    equal(isEligibleForPosition(state, cityCouncil), true, 'HS diploma restores eligibility');

    // Smarts too low
    state.stats.smarts = 44;
    equal(isEligibleForPosition(state, cityCouncil), false, 'Should block below min smarts');
    state.stats.smarts = 45;
    equal(isEligibleForPosition(state, cityCouncil), true, 'Meets smarts threshold exactly');
});

test('Governor blocks player without enough political years', () => {
    registerPoliticalPositions(POSITIONS);
    const governor = POSITIONS.find(p => p.id === 'governor')!;

    const state = makePoliticalState();
    state.age = 35;

    state.politics.totalPoliticalYears = 4;
    equal(isEligibleForPosition(state, governor), false, 'Should block with only 4 political years (min 5)');

    state.politics.totalPoliticalYears = 5;
    equal(isEligibleForPosition(state, governor), true, 'Should allow at exactly 5 political years');
});

test('Position gated by government type is blocked when government type does not match', () => {
    registerPoliticalPositions(POSITIONS);
    const governor = POSITIONS.find(p => p.id === 'governor')!; // democracies only

    const state = makePoliticalState({ totalPoliticalYears: 5, governmentType: 'dictatorship' });
    state.age = 35;

    equal(isEligibleForPosition(state, governor), false, 'Governor should be blocked in dictatorship');

    state.politics.governmentType = 'democracy';
    equal(isEligibleForPosition(state, governor), true, 'Governor should be available in democracy');
});

test('Supreme leader position requires authoritarian score AND military control', () => {
    registerPoliticalPositions(POSITIONS);
    const supreme = POSITIONS.find(p => p.id === 'supreme_leader_test')!;

    const state = makePoliticalState({
        authoritarianScore: 80,
        militaryControl: 59,
        governmentType: 'dictatorship',
    });
    state.age = 35;

    equal(isEligibleForPosition(state, supreme), false, 'Blocked at 59 military control (min 60)');

    state.politics.militaryControl = 60;
    equal(isEligibleForPosition(state, supreme), true, 'Accessible at 60 military control');
});

test('Term-limited position blocks re-run after hitting term cap', () => {
    registerPoliticalPositions(POSITIONS);
    const cityCouncil = POSITIONS.find(p => p.id === 'city_council')!; // termLimit = 2

    const state = makePoliticalState({
        currentPosition: 'city_council',
        termsServed: 2,
    });
    state.age = 25;

    equal(isEligibleForPosition(state, cityCouncil), false, 'Should block after 2 terms (limit hit)');

    // Different position — not term-limited
    state.politics.currentPosition = null;
    state.politics.termsServed = 0;
    equal(isEligibleForPosition(state, cityCouncil), true, 'Should allow with no terms in this seat');
});

// ─── 3. Campaign Flow ─────────────────────────────────────────────────────────

test('Declaring candidacy deducts filing fee and sets campaign state', () => {
    const state = makePoliticalState();
    state.age = 25;
    state.finances.cash = 10000;

    const result = declareCandidacy(state, 'city_council');
    assert(result.success, `Declaration should succeed: ${result.message}`);
    equal(state.politics.campaignActive, true, 'Campaign should be active after declaration');
    equal(state.politics.targetPosition, 'city_council', 'Target position should be set');
    equal(state.finances.cash, 9500, 'Filing fee of $500 should be deducted');
    equal(state.politics.hasRunForOffice, true, 'hasRunForOffice flag should be set');
});

test('Declaring candidacy fails when already campaigning', () => {
    const state = makePoliticalState({ campaignActive: true, targetPosition: 'city_council' });
    state.age = 25;

    const result = declareCandidacy(state, 'city_council');
    equal(result.success, false, 'Cannot declare candidacy while already campaigning');
});

test('Declaring candidacy fails when cash is below filing fee', () => {
    const state = makePoliticalState();
    state.age = 25;
    state.finances.cash = 100; // Filing fee is $500

    const result = declareCandidacy(state, 'city_council');
    equal(result.success, false, 'Should fail with insufficient cash for filing fee');
    equal(state.politics.campaignActive, false, 'Campaign should remain inactive');
});

test('Fund campaign moves money from personal cash to campaign budget', () => {
    const state = makePoliticalState({ campaignActive: true, targetPosition: 'city_council' });
    state.finances.cash = 50000;
    const initialBudget = state.politics.campaignBudget;

    const result = fundCampaign(state, 20000);
    assert(result.success, 'Funding should succeed');
    equal(state.finances.cash, 30000, 'Personal cash should decrease by $20,000');
    equal(state.politics.campaignBudget, initialBudget + 20000, 'Campaign budget should increase by $20,000');
    equal(state.politics.campaignFunds, 20000, 'Campaign funds should include the amount');
});

test('Fund campaign fails when no active campaign', () => {
    const state = makePoliticalState({ campaignActive: false });
    const result = fundCampaign(state, 5000);
    equal(result.success, false, 'Cannot fund a campaign that does not exist');
});

test('Accepting lobbyist donation increases funds and corruption', () => {
    const state = makePoliticalState({ campaignActive: true });
    const initialCorruption = state.politics.corruptionLevel;

    const result = acceptLobbyistDonation(state, 50000);
    assert(result.success, 'Lobbyist donation should succeed');
    assert(state.politics.campaignFunds > 0, 'Campaign funds should increase');
    assert(state.politics.corruptionLevel > initialCorruption, 'Corruption should increase');
});

test('Hold rally requires campaign and sufficient campaign funds', () => {
    const state = makePoliticalState({ campaignActive: false });

    let result = holdRally(state);
    equal(result.success, false, 'Cannot hold rally without active campaign');

    state.politics.campaignActive = true;
    state.politics.campaignFunds = 0;
    result = holdRally(state);
    equal(result.success, false, 'Cannot hold rally without campaign funds (need $5,000)');

    state.politics.campaignFunds = 10000;
    result = holdRally(state);
    equal(result.success, true, 'Rally should succeed with enough campaign funds');
    equal(state.politics.campaignFunds, 5000, 'Rally should cost $5,000 from campaign funds');
    equal(state.politics.ralliesHeld, 1, 'Rallies held should increment');
    assert(state.politics.approvalRating >= 50, 'Approval should be at least starting value after rally');
});

// ─── 4. Election Mechanics ────────────────────────────────────────────────────

test('Win probability is within clamped 0.05–0.95 range', () => {
    const state = makePoliticalState({ campaignActive: true, targetPosition: 'city_council' });
    state.age = 25;

    // Run many times to verify clamp
    for (let i = 0; i < 20; i++) {
        const prob = calculateWinProbability(state, 'city_council');
        assert(prob >= 0.05, `Win probability should be >= 0.05, got ${prob}`);
        assert(prob <= 0.95, `Win probability should be <= 0.95, got ${prob}`);
    }
});

test('Higher approval rating meaningfully increases win probability', () => {
    const lowApproval = makePoliticalState({ campaignActive: true, targetPosition: 'city_council', approvalRating: 10 });
    lowApproval.age = 25;

    const highApproval = makePoliticalState({ campaignActive: true, targetPosition: 'city_council', approvalRating: 90 });
    highApproval.age = 25;

    // Average across multiple invocations to average out random factor
    let sumLow = 0;
    let sumHigh = 0;
    const rounds = 50;
    withMockedRandom(Array.from({ length: rounds * 4 }, () => 0.5), () => {
        for (let i = 0; i < rounds; i++) {
            sumLow += calculateWinProbability(lowApproval, 'city_council');
            sumHigh += calculateWinProbability(highApproval, 'city_council');
        }
    });

    assert(sumHigh > sumLow, 'Higher approval should produce higher average win probability');
});

test('Rigging election boosts win chance but raises corruption', () => {
    const state = makePoliticalState({ campaignActive: true, targetPosition: 'city_council', corruptionLevel: 0 });
    state.age = 25;

    // Normal chance
    let normalSum = 0;
    let riggedSum = 0;
    const rounds = 20;
    withMockedRandom(Array.from({ length: rounds * 6 }, () => 0.5), () => {
        for (let i = 0; i < rounds; i++) {
            normalSum += calculateWinProbability(state, 'city_council', false);
            riggedSum += calculateWinProbability(state, 'city_council', true);
        }
    });

    assert(riggedSum > normalSum, 'Rigging should produce higher win probability');
});

test('Rigging election in resolveElection spikes corruption', () => {
    const state = makePoliticalState({ campaignActive: true, targetPosition: 'city_council', corruptionLevel: 10 });
    state.age = 25;

    // Force a win via mocked random
    withMockedRandom([0.01], () => {
        resolveElection(state, true); // rigged = true
    });

    assert(state.politics.corruptionLevel > 10, 'Corruption should increase after rigging');
});

test('Winning election sets player in office and updates game state', () => {
    const state = makePoliticalState({ campaignActive: true, targetPosition: 'city_council' });
    state.age = 25;
    state.politics.campaignFunds = 5000;

    // Mock Math.random: calculateWinProbability inner random -> 0.5, then resolveElection draw < prob
    withMockedRandom([0.5, 0.01], () => {
        const result = resolveElection(state);
        assert(result.won, `Player should win with forced random: ${result.message}`);
    });

    equal(state.politics.currentPosition, 'city_council', 'Current position should be set');
    equal(state.politics.active, true, 'Player should be active in office');
    assert(state.politics.approvalRating >= 55, 'Approval should start at 55–65 on win');
    assert(state.politics.approvalRating <= 65, 'Approval should not exceed 65 on win');
    equal(state.politics.campaignActive, false, 'Campaign should be cleared on resolution');
    equal(state.career.field, 'Politics', 'Career field should be set to Politics');
});

test('Losing election sets hasLostElection flag and drops happiness', () => {
    const state = makePoliticalState({ campaignActive: true, targetPosition: 'city_council' });
    state.age = 25;
    state.stats.happiness = 80;

    // Force a loss: win probability inner random = 0.5, then draw > prob (0.99)
    withMockedRandom([0.5, 0.99], () => {
        const result = resolveElection(state);
        equal(result.won, false, `Player should lose with high random draw: ${result.message}`);
    });

    equal(state.politics.hasLostElection, true, 'hasLostElection flag should be set');
    assert(state.stats.happiness < 80, 'Happiness should drop after election loss');
    equal(state.politics.campaignActive, false, 'Campaign should clear even on loss');
});

test('resolveElection fails gracefully without active campaign', () => {
    const state = makePoliticalState({ campaignActive: false });
    const result = resolveElection(state);
    equal(result.won, false, 'Should return failure when no campaign is active');
});

// ─── 5. Corruption & Scandal Exposure ────────────────────────────────────────

test('Scandal exposure chance increases with corruption level', () => {
    const lowCorruption = makePoliticalState({ corruptionLevel: 10, mediaControl: 0, oppositionStrength: 50 });
    holdOffice(lowCorruption, 'city_council');

    const highCorruption = makePoliticalState({ corruptionLevel: 80, mediaControl: 0, oppositionStrength: 50 });
    holdOffice(highCorruption, 'city_council');

    const lowChance = calculateScandalExposureChance(lowCorruption);
    const highChance = calculateScandalExposureChance(highCorruption);

    assert(highChance > lowChance, 'Higher corruption should produce higher scandal exposure chance');
});

test('High media control reduces scandal exposure chance', () => {
    const openMedia = makePoliticalState({ corruptionLevel: 50, mediaControl: 0, oppositionStrength: 50 });
    holdOffice(openMedia, 'city_council');

    const controlledMedia = makePoliticalState({ corruptionLevel: 50, mediaControl: 80, oppositionStrength: 50 });
    holdOffice(controlledMedia, 'city_council');

    const openChance = calculateScandalExposureChance(openMedia);
    const controlledChance = calculateScandalExposureChance(controlledMedia);

    assert(controlledChance < openChance, 'Higher media control should reduce exposure chance');
});

test('Scandal exposure chance is always 0–0.95', () => {
    const state = makePoliticalState({ corruptionLevel: 0, mediaControl: 100, oppositionStrength: 0 });
    holdOffice(state, 'city_council');
    const minChance = calculateScandalExposureChance(state);
    assert(minChance >= 0, 'Exposure chance should not be negative');

    const state2 = makePoliticalState({ corruptionLevel: 100, mediaControl: 0, oppositionStrength: 100 });
    holdOffice(state2, 'city_council');
    const maxChance = calculateScandalExposureChance(state2);
    assert(maxChance <= 0.95, 'Exposure chance should not exceed 0.95');
});

test('Applying a scandal increments scandalsExposed and reduces approval', () => {
    const state = makePoliticalState();
    holdOffice(state, 'city_council');
    const initialApproval = state.politics.approvalRating;
    const scandal = SCANDALS.find(s => s.id === 'minor_bribery')!;

    applyScandal(state, scandal);

    equal(state.politics.scandalsExposed, 1, 'Scandals exposed should increment to 1');
    assert(state.politics.approvalRating < initialApproval, 'Approval should drop after scandal');
    equal(state.politics.underInvestigation, true, 'Under investigation flag should be set');
});

test('Critical scandal with triggersImpeachment boosts impeachment risk', () => {
    const state = makePoliticalState();
    holdOffice(state, 'city_council');
    const scandal = SCANDALS.find(s => s.id === 'campaign_finance_violation')!;

    applyScandal(state, scandal);

    assert(state.politics.impeachmentRisk > 0, 'Impeachment risk should be elevated after critical scandal');
});

test('Scandal choice with deterministic outcome applies approvalHit correctly', () => {
    const state = makePoliticalState();
    holdOffice(state, 'city_council');
    state.politics.approvalRating = 60;
    const scandal = SCANDALS.find(s => s.id === 'minor_bribery')!;

    // Choice 0: deny everything — approvalHit: -2
    const result = resolveScandalChoice(state, scandal, 0);
    assert(result.success, 'Deterministic choice should return success');
    equal(state.politics.approvalRating, 58, 'Approval should drop by exactly 2 for deny choice');
    assert(state.politics.corruptionLevel > 0, 'Corruption should increase for deny choice');
});

test('Scandal choice with probabilistic outcome can succeed or fail', () => {
    const scandal = SCANDALS.find(s => s.id === 'campaign_finance_violation')!;

    // Forced success
    const successState = makePoliticalState();
    holdOffice(successState, 'city_council');
    successState.politics.approvalRating = 60;
    withMockedRandom([0.01], () => { // < 0.6 successChance
        resolveScandalChoice(successState, scandal, 1);
    });
    assert(successState.politics.approvalRating >= 60, 'Successful resolution should not drop approval below start');

    // Forced fail
    const failState = makePoliticalState();
    holdOffice(failState, 'city_council');
    failState.politics.approvalRating = 60;
    withMockedRandom([0.99], () => {
        resolveScandalChoice(failState, scandal, 1);
    });
    assert(failState.politics.approvalRating < 60, 'Failed resolution should drop approval');
});

test('checkForScandal returns null when player is not in office', () => {
    const state = makePoliticalState({ corruptionLevel: 80 });
    state.politics.active = false;
    registerScandals(SCANDALS);
    const scandal = checkForScandal(state);
    equal(scandal, null, 'Should return null when not in office');
});

test('checkForScandal only returns scandals within corruption threshold', () => {
    const state = makePoliticalState({ corruptionLevel: 5, mediaControl: 0, oppositionStrength: 100 });
    holdOffice(state, 'city_council');
    registerScandals(SCANDALS);

    // Force scandal to trigger (random < 1)
    let scandal: ScandalDefinition | null = null;
    withMockedRandom([0.001, 0.0], () => {
        scandal = checkForScandal(state);
    });

    // Only the minor_bribery scandal has corruptionThreshold <= 5 (campaign_finance needs >= 40)
    if (scandal !== null) {
        assert((scandal as ScandalDefinition).corruptionThreshold <= state.politics.corruptionLevel,
            'Triggered scandal threshold should not exceed current corruption level');
    }
});

// ─── 6. Approval Drift ────────────────────────────────────────────────────────

test('Approval drifts down by at least 2 per year (base decay)', () => {
    const state = makePoliticalState({ approvalRating: 60 });
    holdOffice(state, 'city_council');
    state.stats.looks = 50; // Neutral charisma (no bonus/penalty)

    // Mock random to produce neutral economy (between 0.20 and 0.75)
    withMockedRandom([0.5, 0.5, 0.5, 0.5, 0.5], () => {
        processPoliticalYear(state);
    });

    // Base decay is -2; charisma neutral; economy neutral at 0.5
    assert(state.politics.approvalRating <= 58, 'Approval should decay by at least 2 in a neutral year');
});

test('High charisma (looks > 70) provides approval bonus', () => {
    const withHighLooks = makePoliticalState({ approvalRating: 60 });
    holdOffice(withHighLooks, 'city_council');
    withHighLooks.stats.looks = 80; // Above 70 threshold

    const withLowLooks = makePoliticalState({ approvalRating: 60 });
    holdOffice(withLowLooks, 'city_council');
    withLowLooks.stats.looks = 25; // Below 30 threshold

    // Use neutral economy both times
    withMockedRandom([0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5], () => {
        processPoliticalYear(withHighLooks);
        processPoliticalYear(withLowLooks);
    });

    assert(withHighLooks.politics.approvalRating > withLowLooks.politics.approvalRating,
        'High charisma should result in higher approval than low charisma');
});

test('Enacted policies provide a yearly approval bonus', () => {
    const withPolicies = makePoliticalState({ approvalRating: 60, policiesEnacted: ['infrastructure_bill', 'universal_healthcare'] });
    holdOffice(withPolicies, 'governor');
    withPolicies.stats.looks = 50;

    const withoutPolicies = makePoliticalState({ approvalRating: 60, policiesEnacted: [] });
    holdOffice(withoutPolicies, 'governor');
    withoutPolicies.stats.looks = 50;

    // Neutral economy both
    withMockedRandom([0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5], () => {
        processPoliticalYear(withPolicies);
        processPoliticalYear(withoutPolicies);
    });

    assert(withPolicies.politics.approvalRating >= withoutPolicies.politics.approvalRating,
        'Enacted policies should provide an approval bonus');
});

test('Annual tick increments totalPoliticalYears and yearsInOffice', () => {
    const state = makePoliticalState();
    holdOffice(state, 'city_council');
    const initialTotal = state.politics.totalPoliticalYears;
    const initialYears = state.politics.yearsInOffice;

    withMockedRandom([0.5, 0.5, 0.5, 0.5, 0.5], () => {
        processPoliticalYear(state);
    });

    equal(state.politics.totalPoliticalYears, initialTotal + 1, 'Total political years should increment');
    equal(state.politics.yearsInOffice, initialYears + 1, 'Years in office should increment');
});

// ─── 7. Term Limits ───────────────────────────────────────────────────────────

test('Term limit flag is set when terms served meets or exceeds limit', () => {
    registerPoliticalPositions(POSITIONS);
    const state = makePoliticalState({
        currentPosition: 'city_council',
        termsServed: 1,
        isTermLimited: false,
    });
    holdOffice(state, 'city_council');

    // After one more year in office we are still at 1 term
    withMockedRandom([0.5, 0.5, 0.5, 0.5, 0.5], () => {
        processPoliticalYear(state);
    });
    equal(state.politics.isTermLimited, false, 'Not yet term limited with 1 term served');

    state.politics.termsServed = 2;
    withMockedRandom([0.5, 0.5, 0.5, 0.5, 0.5], () => {
        processPoliticalYear(state);
    });
    equal(state.politics.isTermLimited, true, 'Should be term limited at 2 terms for city_council (limit = 2)');
});

test('Position with termLimit 0 (no limit) never sets isTermLimited through annual tick', () => {
    const state = makePoliticalState({
        currentPosition: 'supreme_leader_test',
        positionLevel: 5,
        authoritarianScore: 100,
        militaryControl: 80,
        governmentType: 'dictatorship',
        termsServed: 100, // Arbitrary large value
    });
    holdOffice(state, 'supreme_leader_test');

    withMockedRandom(Array.from({ length: 20 }, () => 0.5), () => {
        processPoliticalYear(state);
    });

    equal(state.politics.isTermLimited, false, 'Position with termLimit=0 should never be term limited');
});

// ─── 8. Policy System ─────────────────────────────────────────────────────────

test('Enacting a policy adds it to policiesEnacted and applies approval effect', () => {
    const state = makePoliticalState();
    holdOffice(state, 'governor'); // level 2, can enact universal_healthcare (minLevel 2)
    state.politics.approvalRating = 50;

    const result = enactPolicy(state, 'universal_healthcare');
    assert(result.success, `Policy should be enacted: ${result.message}`);
    includes(state.politics.policiesEnacted, 'universal_healthcare', 'Policy should be stored in enacted list');
    equal(state.politics.approvalRating, 55, 'Approval should increase by policy netApprovalEffect (+5)');
    equal(state.politics.legislativeRecord, 1, 'Legislative record should increment');
});

test('Conflicting policies cannot both be enacted', () => {
    const state = makePoliticalState();
    holdOffice(state, 'governor'); // level 2

    enactPolicy(state, 'universal_healthcare');
    includes(state.politics.policiesEnacted, 'universal_healthcare', 'First policy should be enacted');

    const result = enactPolicy(state, 'privatize_healthcare'); // conflicts with universal_healthcare
    equal(result.success, false, 'Conflicting policy should be rejected');
    notIncludes(state.politics.policiesEnacted, 'privatize_healthcare', 'Conflicting policy should not appear in enacted list');
});

test('Policy with minLevel requirement is blocked below that level', () => {
    const state = makePoliticalState();
    holdOffice(state, 'city_council'); // positionLevel = 1
    // infrastructure_bill requires minLevel = 3
    const result = enactPolicy(state, 'infrastructure_bill');
    equal(result.success, false, 'Should block policy requiring higher office level');
});

test('getAvailablePolicies excludes already-enacted and conflicting policies', () => {
    const state = makePoliticalState();
    holdOffice(state, 'governor'); // level 2

    enactPolicy(state, 'universal_healthcare');
    const available = getAvailablePolicies(state);

    notIncludes(available.map(p => p.id), 'universal_healthcare', 'Already enacted policy should not be available');
    notIncludes(available.map(p => p.id), 'privatize_healthcare', 'Conflicting policy should be excluded');
});

test('Policy not available when not in office', () => {
    const state = makePoliticalState();
    // state.politics.active = false by default from makePoliticalState without holdOffice

    const result = enactPolicy(state, 'universal_healthcare');
    equal(result.success, false, 'Cannot enact policy without holding office');
    equal(getAvailablePolicies(state).length, 0, 'No policies available when not in office');
});

// ─── 9. Authoritarian Thresholds ──────────────────────────────────────────────

test('Declare state of emergency requires positionLevel >= 4', () => {
    const state = makePoliticalState();

    // Level 1 — should not be available
    holdOffice(state, 'city_council'); // level 1
    const actionsLow = getAvailablePoliticalActions(state).map(a => a.id);
    notIncludes(actionsLow, 'declare_state_of_emergency', 'Emergency powers should not be available at level 1');

    // Level 4 — should be available
    state.politics.positionLevel = 4;
    const actionsHigh = getAvailablePoliticalActions(state).map(a => a.id);
    includes(actionsHigh, 'declare_state_of_emergency', 'Emergency powers should be available at level 4');
});

test('Control media action requires positionLevel >= 4 AND authoritarianScore >= 30', () => {
    const state = makePoliticalState({ authoritarianScore: 25 });
    holdOffice(state, 'city_council');
    state.politics.positionLevel = 4;

    const actionsBelow = getAvailablePoliticalActions(state).map(a => a.id);
    notIncludes(actionsBelow, 'control_media', 'control_media requires authoritarian >= 30');

    state.politics.authoritarianScore = 30;
    const actionsAt = getAvailablePoliticalActions(state).map(a => a.id);
    includes(actionsAt, 'control_media', 'control_media should be available at authoritarian score 30');
});

test('Purge rivals action requires positionLevel >= 4 AND authoritarianScore >= 40', () => {
    const state = makePoliticalState({ authoritarianScore: 38 });
    holdOffice(state, 'city_council');
    state.politics.positionLevel = 4;

    notIncludes(getAvailablePoliticalActions(state).map(a => a.id), 'purge_rivals', 'Purge requires auth >= 40');

    state.politics.authoritarianScore = 40;
    includes(getAvailablePoliticalActions(state).map(a => a.id), 'purge_rivals', 'Purge available at auth score 40');
});

test('Declare state of emergency increases authoritarianScore and sets flag', () => {
    const state = makePoliticalState({ authoritarianScore: 0 });
    holdOffice(state, 'city_council');
    state.politics.positionLevel = 4;

    performPoliticalAction(state, 'declare_state_of_emergency');

    assert(state.politics.authoritarianScore >= 15, 'Authoritarian score should increase by 15');
    equal(state.politics.hasDeclaredMartialLaw, true, 'Martial law flag should be set');
});

// ─── 10. Coup Mechanic ────────────────────────────────────────────────────────

test('Coup requires state-level office or higher', () => {
    const state = makePoliticalState();
    holdOffice(state, 'city_council'); // level 1
    state.politics.militaryControl = 80;

    const result = stageCoup(state);
    equal(result.success, false, 'Coup should require at least state-level office (level 2)');
});

test('Coup requires military backing or high craziness', () => {
    const state = makePoliticalState();
    holdOffice(state, 'governor'); // level 2
    state.politics.militaryControl = 30;
    state.stats.craziness = 30;

    const result = stageCoup(state);
    equal(result.success, false, 'Coup should fail without military backing or craziness');
});

test('Successful coup installs player as Supreme Leader', () => {
    const state = makePoliticalState();
    holdOffice(state, 'governor'); // level 2
    state.politics.militaryControl = 90;
    state.politics.oppositionStrength = 10;

    // Force success
    withMockedRandom([0.01, 0.01], () => {
        const result = stageCoup(state);
        assert(result.success, `Coup should succeed with high military control: ${result.message}`);
    });

    equal(state.politics.currentPosition, 'supreme_leader', 'Position should be supreme_leader after coup');
    equal(state.politics.positionLevel, 5, 'Position level should be 5 after coup');
    equal(state.politics.authoritarianScore, 100, 'Authoritarian score should max out after coup');
    equal(state.politics.governmentType, 'dictatorship', 'Government type should switch to dictatorship');
    equal(state.politics.hasStagedCoup, true, 'hasStagedCoup flag should be set');
});

test('Failed coup ends career or worse', () => {
    const state = makePoliticalState();
    holdOffice(state, 'governor');
    state.politics.militaryControl = 90;
    state.politics.oppositionStrength = 10;

    // Force failure
    withMockedRandom([0.99, 0.99], () => {
        const result = stageCoup(state);
        equal(result.success, false, `Coup should fail with bad random: ${result.message}`);
    });

    equal(state.politics.active, false, 'Political career should end after failed coup');
    assert(
        !state.isAlive || (state.isAlive && state.flags.political_career_ended),
        'Player should be dead or have political career ended after failed coup'
    );
});

// ─── 11. Revolution Probability ───────────────────────────────────────────────

test('Revolution chance is 0 for non-supreme positions', () => {
    const state = makePoliticalState();
    holdOffice(state, 'governor'); // level 2

    const chance = calculateRevolutionChance(state);
    equal(chance, 0, 'Revolution chance should be 0 for non-supreme positions');
});

test('Revolution chance increases with low approval and high opposition', () => {
    const stable = makePoliticalState({
        approvalRating: 80,
        oppositionStrength: 10,
        militaryControl: 90,
        mediaControl: 80,
    });
    stable.politics.positionLevel = 5;

    const unstable = makePoliticalState({
        approvalRating: 10,
        oppositionStrength: 90,
        militaryControl: 10,
        mediaControl: 0,
    });
    unstable.politics.positionLevel = 5;

    const stableChance = calculateRevolutionChance(stable);
    const unstableChance = calculateRevolutionChance(unstable);

    assert(unstableChance > stableChance, 'Unstable dictator should face higher revolution chance');
    assert(unstableChance >= 0 && unstableChance <= 0.9, 'Revolution chance should be clamped 0–0.9');
});

// ─── 12. Action Dispatcher ────────────────────────────────────────────────────

test('performPoliticalAction returns error for unknown action IDs', () => {
    const state = makePoliticalState();
    holdOffice(state, 'city_council');

    const result = performPoliticalAction(state, 'nonexistent_action_xyz');
    equal(result.success, false, 'Unknown action should return failure');
    assert(result.message.includes('nonexistent_action_xyz'), 'Error message should include the bad action ID');
});

test('performPoliticalAction respects timeBudget for governance actions', () => {
    const state = makePoliticalState();
    holdOffice(state, 'city_council');
    state.timeBudget = 0; // No time left

    const result = performPoliticalAction(state, 'meet_constituents');
    equal(result.success, false, 'Governance action should fail without enough time');
});

test('performPoliticalAction dispatches declare_candidacy correctly', () => {
    const state = makePoliticalState();
    state.age = 25;
    state.finances.cash = 10000;

    const result = performPoliticalAction(state, 'declare_candidacy', 'city_council');
    assert(result.success, `declareCandidacy via dispatcher should succeed: ${result.message}`);
    equal(state.politics.campaignActive, true, 'Campaign should be active after dispatch');
});

test('performPoliticalAction dispatches enact_policy with policy ID', () => {
    const state = makePoliticalState();
    holdOffice(state, 'governor'); // level 2
    state.timeBudget = 12;

    const result = performPoliticalAction(state, 'enact_policy', 'universal_healthcare');
    assert(result.success, `Policy dispatch should succeed: ${result.message}`);
    includes(state.politics.policiesEnacted, 'universal_healthcare', 'Policy should be in enacted list via dispatcher');
});

// ─── 13. Integration: Democratic Career Ladder ───────────────────────────────

test('Integration: full local political career from civilian to mayor', () => {
    registerPoliticalPositions(POSITIONS);
    registerPolicies(POLICIES);
    registerScandals(SCANDALS);

    const state = createInitialState();
    state.age = 21;
    state.year = 2050;
    state.timeBudget = 12;
    state.stats.smarts = 80;
    state.stats.willpower = 70;
    state.stats.looks = 60;
    state.education.level = 'High School';
    state.finances.cash = 10000;
    state.politics.governmentType = 'democracy';

    // Step 1: Volunteer to build political experience
    performPoliticalAction(state, 'volunteer_campaign');
    state.timeBudget = 12;

    // Step 2: Declare for city council and run
    assert(isEligibleForPosition(state, POSITIONS.find(p => p.id === 'city_council')!), 'Should be eligible for city council');
    const decl = declareCandidacy(state, 'city_council');
    assert(decl.success, `Declaration should succeed: ${decl.message}`);
    state.politics.campaignFunds = 20000; // Top up campaign funds

    // Step 3: Win election
    withMockedRandom([0.5, 0.01], () => {
        const electionResult = resolveElection(state);
        assert(electionResult.won, `Should win city council election: ${electionResult.message}`);
    });

    equal(state.politics.currentPosition, 'city_council', 'Should hold city council seat');
    equal(state.politics.active, true, 'Player should be in office');

    // Step 4: Serve a year, approve a policy
    holdOffice(state, 'city_council'); // Ensure positionLevel correct
    withMockedRandom([0.5, 0.5, 0.5, 0.5, 0.5, 0.5], () => {
        processPoliticalYear(state);
    });
    state.age = 25;
    state.politics.totalPoliticalYears = 2;
    state.finances.cash = 50000;

    // Step 5: Run for mayor after one term
    state.politics.campaignActive = false;
    const mayorDecl = declareCandidacy(state, 'mayor');
    assert(mayorDecl.success, `Mayor declaration should succeed: ${mayorDecl.message}`);

    state.politics.campaignFunds = 60000;
    withMockedRandom([0.5, 0.01], () => {
        const mayorResult = resolveElection(state);
        assert(mayorResult.won, `Should win mayor race: ${mayorResult.message}`);
    });

    equal(state.politics.currentPosition, 'mayor', 'Should progress to mayor');
    equal(state.politics.positionLevel, 1, 'Position level should still be 1 for local office');
    assert(state.finances.salary >= 65000, 'Salary should be at least mayoral salary');
});

// ─── 14. Campaign Fund Tracking is separate from personal cash ───────────────

test('Campaign funds are tracked separately from personal finances', () => {
    const state = makePoliticalState({ campaignActive: true });
    state.finances.cash = 100000;
    const initialCash = state.finances.cash;

    fundCampaign(state, 30000);

    equal(state.finances.cash, initialCash - 30000, 'Personal cash should decrease');
    equal(state.politics.campaignFunds, 30000, 'Campaign funds should increase independently');
    equal(state.politics.campaignBudget, 30000, 'Campaign budget should also track the amount');

    // Lobbyist donation goes to campaign funds, not personal cash
    const cashBeforeLobbyist = state.finances.cash;
    acceptLobbyistDonation(state, 10000);
    equal(state.finances.cash, cashBeforeLobbyist, 'Personal cash unchanged after lobbyist donation');
    equal(state.politics.campaignFunds, 40000, 'Campaign funds grow from lobbyist donation');
});

// ─── 15. Government Type Changes ─────────────────────────────────────────────

test('Successful coup changes government type to dictatorship', () => {
    const state = makePoliticalState({ governmentType: 'democracy' });
    holdOffice(state, 'governor');
    state.politics.militaryControl = 95;
    state.politics.oppositionStrength = 5;

    withMockedRandom([0.01, 0.01], () => {
        stageCoup(state);
    });

    equal(state.politics.governmentType, 'dictatorship', 'Government type should transition to dictatorship after coup');
});
