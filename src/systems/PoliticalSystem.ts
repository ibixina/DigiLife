// PoliticalSystem.ts
// Core logic for the Politician career path.
// Handles: annual tick, campaigns, elections, governance, corruption/scandal,
// authoritarian progression, and political action dispatch.

import type { GameState } from '../core/GameState';
import { events } from '../core/EventBus';
import { spendTime, canSpendTime, addHistory, clamp } from '../core/StateUtils';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface PoliticalPosition {
    id: string;
    title: string;
    level: number;
    minAge: number;
    requiredEducation: string;
    requiredMajor?: string;
    requiredFlag?: string;
    minSmarts: number;
    minWillpower: number;
    minPoliticalYears: number;
    minAuthoritarianScore?: number;
    minMilitaryControl?: number;
    salary: number;
    termLength: number;
    termLimit: number;
    isElected: boolean;
    governmentTypes: string[];
    filingFee: number;
    baseCampaignCost: number;
    nextPositions: string[];
}

export interface PolicyDefinition {
    id: string;
    name: string;
    description: string;
    ideology: string;
    minLevel: number;
    netApprovalEffect: number;
    economyEffect: number;
    karmaEffect: number;
    mediaControlEffect?: number;
    militaryControlEffect?: number;
    authoritarianEffect?: number;
    corruptionEffect?: number;
    prerequisitePolicies: string[];
    conflictsPolicies: string[];
}

export interface ScandalChoice {
    text: string;
    successChance?: number;
    successApproval?: number;
    failApproval?: number;
    approvalHit?: number;
    corruptionGain?: number;
    karmaGain?: number;
    karmaHit?: number;
    authoritarianGain?: number;
}

export interface ScandalDefinition {
    id: string;
    title: string;
    description: string;
    severity: 'minor' | 'moderate' | 'major' | 'critical';
    approvalHit: number;
    corruptionThreshold: number;
    triggersImpeachment?: boolean;
    choices: ScandalChoice[];
}

export interface PoliticalActionResult {
    success: boolean;
    message: string;
    statChanges?: Record<string, number>;
}

// ─── Registry ────────────────────────────────────────────────────────────────

let _positions: PoliticalPosition[] = [];
let _policies: PolicyDefinition[] = [];
let _scandals: ScandalDefinition[] = [];

export function registerPoliticalPositions(positions: PoliticalPosition[]) {
    _positions = positions;
}

export function registerPolicies(policies: PolicyDefinition[]) {
    _policies = policies;
}

export function registerScandals(scandals: ScandalDefinition[]) {
    _scandals = scandals;
}

export function getPositions(): PoliticalPosition[] { return _positions; }
export function getPolicies(): PolicyDefinition[] { return _policies; }
export function getScandals(): ScandalDefinition[] { return _scandals; }

export function getPositionById(id: string): PoliticalPosition | undefined {
    return _positions.find(p => p.id === id);
}

// ─── Education level ordering ─────────────────────────────────────────────

const EDU_ORDER = ['None', 'Primary', 'Secondary', 'High School', 'Bachelor', 'Master', 'Doctorate'];

function meetsEducation(state: GameState, required: string): boolean {
    const playerIdx = EDU_ORDER.indexOf(state.education.level);
    const reqIdx = EDU_ORDER.indexOf(required);
    return playerIdx >= reqIdx;
}

// ─── Eligibility ─────────────────────────────────────────────────────────

/**
 * Returns whether the player meets all entry requirements for a position.
 * Does NOT check if they are currently in that position already.
 */
export function isEligibleForPosition(state: GameState, pos: PoliticalPosition): boolean {
    const pol = state.politics;

    if (state.age < pos.minAge) return false;
    if (!meetsEducation(state, pos.requiredEducation)) return false;
    if (state.stats.smarts < pos.minSmarts) return false;
    if (state.stats.willpower < pos.minWillpower) return false;
    if (pol.totalPoliticalYears < pos.minPoliticalYears) return false;

    if (pos.requiredMajor && state.education.major !== pos.requiredMajor) return false;
    if (pos.requiredFlag && !state.flags[pos.requiredFlag]) return false;

    if (pos.minAuthoritarianScore !== undefined && pol.authoritarianScore < pos.minAuthoritarianScore) return false;
    if (pos.minMilitaryControl !== undefined && pol.militaryControl < pos.minMilitaryControl) return false;

    // Must be compatible with current government type
    if (pos.governmentTypes.length > 0 && !pos.governmentTypes.includes(pol.governmentType)) return false;

    // Term limit check
    if (pos.termLimit > 0 && pol.currentPosition === pos.id && pol.termsServed >= pos.termLimit) return false;

    return true;
}

/**
 * Returns all positions the player can currently run for / be appointed to.
 */
export function getEligiblePositions(state: GameState): PoliticalPosition[] {
    return _positions.filter(pos => isEligibleForPosition(state, pos) && pos.id !== state.politics.currentPosition);
}

// ─── Campaign ────────────────────────────────────────────────────────────

/**
 * Declare candidacy for a position. Sets campaignActive, deducts filing fee.
 */
export function declareCandidacy(state: GameState, positionId: string): PoliticalActionResult {
    const pos = getPositionById(positionId);
    if (!pos) return { success: false, message: 'Unknown position.' };

    if (!isEligibleForPosition(state, pos)) {
        return { success: false, message: `You do not meet the requirements for ${pos.title}.` };
    }

    if (state.politics.campaignActive) {
        return { success: false, message: 'You are already running for office.' };
    }

    if (state.finances.cash < pos.filingFee) {
        return { success: false, message: `You need $${pos.filingFee.toLocaleString()} to file.` };
    }

    state.finances.cash -= pos.filingFee;
    state.politics.campaignActive = true;
    state.politics.targetPosition = positionId;
    state.politics.campaignBudget = 0;
    state.politics.endorsements = [];
    state.politics.debatesWon = 0;
    state.politics.ralliesHeld = 0;
    state.politics.hasRunForOffice = true;

    return { success: true, message: `You officially declared your candidacy for ${pos.title}!` };
}

/**
 * Contribute personal funds to the campaign war chest.
 */
export function fundCampaign(state: GameState, amount: number): PoliticalActionResult {
    if (!state.politics.campaignActive) return { success: false, message: 'No active campaign.' };
    if (state.finances.cash < amount) return { success: false, message: 'Insufficient personal funds.' };
    state.finances.cash -= amount;
    state.politics.campaignBudget += amount;
    state.politics.campaignFunds += amount;
    return { success: true, message: `You transferred $${amount.toLocaleString()} to your campaign.` };
}

/**
 * Hold a campaign rally. Costs campaign funds, boosts approval and ralliesHeld.
 */
export function holdRally(state: GameState): PoliticalActionResult {
    if (!state.politics.campaignActive) return { success: false, message: 'No active campaign.' };
    const cost = 5000;
    if (state.politics.campaignFunds < cost) return { success: false, message: 'Insufficient campaign funds.' };

    state.politics.campaignFunds -= cost;
    state.politics.ralliesHeld += 1;

    const boost = Math.floor(Math.random() * 5) + 1;
    state.politics.approvalRating = Math.min(100, state.politics.approvalRating + boost);

    return { success: true, message: `The rally was a success! Approval +${boost}.`, statChanges: { approvalRating: boost } };
}

/**
 * Accept a lobbyist donation. Boosts campaign funds but increases corruption.
 */
export function acceptLobbyistDonation(state: GameState, amount: number): PoliticalActionResult {
    const corruptionGain = Math.floor(amount / 10000) + 5;
    state.politics.campaignFunds += amount;
    state.politics.corruptionLevel = Math.min(100, state.politics.corruptionLevel + corruptionGain);

    return {
        success: true,
        message: `Campaign received $${amount.toLocaleString()} from industry donors. Corruption +${corruptionGain}.`,
        statChanges: { campaignFunds: amount, corruptionLevel: corruptionGain }
    };
}

// ─── Election Resolution ──────────────────────────────────────────────────

export interface ElectionResult {
    won: boolean;
    winProbability: number;
    message: string;
}

/**
 * Calculate win probability using the plan's formula.
 */
export function calculateWinProbability(state: GameState, positionId: string, rigged = false): number {
    const pol = state.politics;
    const pos = getPositionById(positionId);
    if (!pos) return 0;

    // Funding advantage: ratio of campaign budget vs a simulated opponent budget
    const opponentBudget = pos.baseCampaignCost * (0.6 + Math.random() * 0.8);
    const fundingAdvantage = Math.min(1, pol.campaignFunds / Math.max(1, opponentBudget));

    // Party base support
    const partyBaseSupport = pol.party && pol.party !== 'independent' ? 35 : 10;

    // Endorsement bonus: 0.02 per endorsement, capped at 0.10
    const endorsementBonus = Math.min(0.10, pol.endorsements.length * 0.02);

    // Stat composite
    const statComposite = (state.stats.smarts + state.stats.looks + state.stats.willpower) / 3;

    // Incumbent bonus
    const incumbentBonus = pol.currentPosition === positionId ? 0.05 : 0;

    // Education bonus (political science degree helps)
    const educationBonus = state.education.major === 'Political Science' ? 0.10 : 0;

    let chance = 0.30
        + (pol.approvalRating / 100) * 0.35
        + fundingAdvantage * 0.20
        + (partyBaseSupport / 100) * 0.15
        + endorsementBonus * 0.10
        + (statComposite / 100) * 0.10
        + incumbentBonus
        + educationBonus
        + (Math.random() * 0.10 - 0.05);  // ±5% random factor

    // Modifiers
    if (pol.scandalsExposed > 0) chance -= 0.15;
    if (rigged) {
        chance += 0.25;
        pol.corruptionLevel = Math.min(100, pol.corruptionLevel + 30);
    }
    if (pol.approvalRating < 30) chance -= 0.10;

    return Math.max(0.05, Math.min(0.95, chance));
}

/**
 * Resolve the election for the target position. Clears campaign state on completion.
 */
export function resolveElection(state: GameState, rigged = false): ElectionResult {
    const pol = state.politics;
    if (!pol.campaignActive || !pol.targetPosition) {
        return { won: false, winProbability: 0, message: 'No active campaign to resolve.' };
    }

    const pos = getPositionById(pol.targetPosition);
    if (!pos) return { won: false, winProbability: 0, message: 'Unknown target position.' };

    const winProb = calculateWinProbability(state, pol.targetPosition, rigged);
    const won = Math.random() < winProb;

    // Clear campaign state
    pol.campaignActive = false;
    pol.campaignBudget = 0;
    pol.campaignFunds = Math.max(0, pol.campaignFunds - pos.baseCampaignCost);

    if (won) {
        // Take office
        pol.currentPosition = pos.id;
        pol.positionTitle = pos.title;
        pol.positionLevel = pos.level;
        pol.yearsInOffice = 0;
        pol.termsServed += 1;
        pol.active = true;
        pol.approvalRating = 55 + Math.floor(Math.random() * 10); // Start at 55-65
        pol.influence = Math.min(100, pol.influence + 10);
        pol.partyLoyalty = Math.min(100, pol.partyLoyalty + 10);
        pol.isTermLimited = pos.termLimit > 0 && pol.termsServed >= pos.termLimit;

        state.career.field = 'Politics';
        state.career.title = pos.title;
        if (pos.level >= 2) {
            // Full-time politics replaces regular career salary
            state.finances.salary = pos.salary;
        } else {
            // Local office — can hold alongside regular work
            state.finances.salary = Math.max(state.finances.salary, pos.salary);
        }

        return {
            won: true,
            winProbability: winProb,
            message: `You won the election and are now ${pos.title}! Approval starts at ${pol.approvalRating}%.`
        };
    } else {
        pol.hasLostElection = true;
        state.stats.happiness = Math.max(0, state.stats.happiness - 10);

        return {
            won: false,
            winProbability: winProb,
            message: `You lost the election for ${pos.title}. Better luck next time.`
        };
    }
}

// ─── Governance Actions ───────────────────────────────────────────────────

export interface GovernanceAction {
    id: string;
    label: string;
    description: string;
    timeCost: number;
    requiresOffice: boolean;
    minLevel?: number;
    minAuthoritarianScore?: number;
    available: (state: GameState) => boolean;
    perform: (state: GameState) => PoliticalActionResult;
}

export const GOVERNANCE_ACTIONS: GovernanceAction[] = [
    {
        id: 'give_public_address',
        label: 'Give Public Address',
        description: 'Address the public to boost your image.',
        timeCost: 1,
        requiresOffice: true,
        available: (s) => s.politics.active,
        perform: (s) => {
            const smartsCheck = Math.random() < s.stats.smarts / 100;
            const boost = smartsCheck ? Math.floor(Math.random() * 4) + 2 : -3;
            s.politics.approvalRating = Math.max(0, Math.min(100, s.politics.approvalRating + boost));
            return {
                success: true,
                message: smartsCheck
                    ? `Your speech resonated with the public. Approval +${boost}.`
                    : 'You stumbled over your words. The press had a field day. Approval -3.',
                statChanges: { approvalRating: boost }
            };
        }
    },
    {
        id: 'meet_constituents',
        label: 'Meet Constituents',
        description: 'Hold town halls and meet with voters.',
        timeCost: 2,
        requiresOffice: true,
        available: (s) => s.politics.active,
        perform: (s) => {
            const boost = Math.floor(Math.random() * 3) + 1;
            s.politics.approvalRating = Math.min(100, s.politics.approvalRating + boost);
            s.politics.influence = Math.min(100, s.politics.influence + 2);
            return { success: true, message: `You connected with voters. Approval +${boost}, Influence +2.` };
        }
    },
    {
        id: 'enact_policy',
        label: 'Enact Policy',
        description: 'Pass a policy from your agenda.',
        timeCost: 2,
        requiresOffice: true,
        available: (s) => s.politics.active && getAvailablePolicies(s).length > 0,
        perform: (_s) => {
            // Policy selection is handled by performPoliticalAction with policyId parameter
            return { success: false, message: 'Specify a policy to enact.' };
        }
    },
    {
        id: 'accept_lobbyist_meeting',
        label: 'Meet with Lobbyists',
        description: 'Accept a lobbyist meeting for campaign funds — at a cost.',
        timeCost: 1,
        requiresOffice: true,
        available: (s) => s.politics.active,
        perform: (s) => {
            const amount = Math.floor(Math.random() * 50000) + 10000;
            return acceptLobbyistDonation(s, amount);
        }
    },
    {
        id: 'appoint_ally',
        label: 'Appoint an Ally',
        description: 'Place a loyal supporter in a key government position.',
        timeCost: 1,
        requiresOffice: true,
        available: (s) => s.politics.active,
        perform: (s) => {
            s.politics.partyLoyalty = Math.min(100, s.politics.partyLoyalty + 5);
            const scandalRoll = Math.random() < 0.15;
            if (scandalRoll) {
                s.politics.corruptionLevel = Math.min(100, s.politics.corruptionLevel + 8);
                return { success: true, message: 'Your ally was appointed, but critics cried cronyism. Corruption +8.' };
            }
            return { success: true, message: 'Your ally is now in office. Party Loyalty +5.' };
        }
    },
    {
        id: 'veto_bill',
        label: 'Veto a Bill',
        description: 'Block unfavorable legislation.',
        timeCost: 1,
        requiresOffice: true,
        minLevel: 2,
        available: (s) => s.politics.active && s.politics.positionLevel >= 2,
        perform: (s) => {
            s.politics.vetoes += 1;
            const approvalChange = Math.random() < 0.5 ? 2 : -3;
            s.politics.approvalRating = Math.max(0, Math.min(100, s.politics.approvalRating + approvalChange));
            return {
                success: true,
                message: `You vetoed the bill. ${approvalChange > 0 ? 'Base supporters cheered.' : 'Opposition is furious.'}`,
                statChanges: { approvalRating: approvalChange }
            };
        }
    },
    {
        id: 'investigate_opponent',
        label: 'Investigate Political Rival',
        description: 'Quietly dig up opposition research on a rival.',
        timeCost: 2,
        requiresOffice: true,
        available: (s) => s.politics.active,
        perform: (s) => {
            const success = Math.random() < 0.5;
            if (success) {
                s.politics.influence = Math.min(100, s.politics.influence + 8);
                return { success: true, message: 'Investigators found damaging info on your rival. Influence +8.' };
            } else {
                s.politics.corruptionLevel = Math.min(100, s.politics.corruptionLevel + 10);
                s.politics.approvalRating = Math.max(0, s.politics.approvalRating - 8);
                return { success: false, message: 'The investigation backfired — the press leaked your involvement. Corruption +10, Approval -8.' };
            }
        }
    },
    {
        id: 'declare_state_of_emergency',
        label: 'Declare State of Emergency',
        description: 'Bypass normal governance using emergency powers.',
        timeCost: 1,
        requiresOffice: true,
        minLevel: 4,
        available: (s) => s.politics.active && s.politics.positionLevel >= 4,
        perform: (s) => {
            s.politics.authoritarianScore = Math.min(100, s.politics.authoritarianScore + 15);
            s.politics.hasDeclaredMartialLaw = true;
            const approvalChange = Math.random() < 0.4 ? 5 : -10;
            s.politics.approvalRating = Math.max(0, Math.min(100, s.politics.approvalRating + approvalChange));
            return {
                success: true,
                message: `State of Emergency declared. Authoritarian Score +15. ${approvalChange > 0 ? 'Some rallied behind you.' : 'Civil liberties groups are outraged.'}`,
                statChanges: { authoritarianScore: 15, approvalRating: approvalChange }
            };
        }
    },
    {
        id: 'control_media',
        label: 'Control the Press',
        description: 'Shut down critical media outlets and install pro-government messaging.',
        timeCost: 2,
        requiresOffice: true,
        minLevel: 4,
        minAuthoritarianScore: 30,
        available: (s) => s.politics.active && s.politics.positionLevel >= 4 && s.politics.authoritarianScore >= 30,
        perform: (s) => {
            s.politics.mediaControl = Math.min(100, s.politics.mediaControl + 20);
            s.politics.authoritarianScore = Math.min(100, s.politics.authoritarianScore + 10);
            s.politics.approvalRating = Math.max(0, s.politics.approvalRating - 8);
            s.stats.karma = Math.max(0, s.stats.karma - 10);
            return {
                success: true,
                message: 'State media now amplifies your message. Media Control +20, Authoritarian Score +10.',
                statChanges: { mediaControl: 20, authoritarianScore: 10 }
            };
        }
    },
    {
        id: 'purge_rivals',
        label: 'Purge Political Rivals',
        description: 'Remove opposition figures from positions of power.',
        timeCost: 2,
        requiresOffice: true,
        minLevel: 4,
        minAuthoritarianScore: 40,
        available: (s) => s.politics.active && s.politics.positionLevel >= 4 && s.politics.authoritarianScore >= 40,
        perform: (s) => {
            s.politics.oppositionStrength = Math.max(0, s.politics.oppositionStrength - 20);
            s.politics.authoritarianScore = Math.min(100, s.politics.authoritarianScore + 10);
            s.politics.militaryControl = Math.min(100, s.politics.militaryControl + 5);
            s.stats.karma = Math.max(0, s.stats.karma - 15);
            return {
                success: true,
                message: 'Your rivals have been removed from power. Opposition -20, Authoritarian Score +10.',
                statChanges: { oppositionStrength: -20, authoritarianScore: 10 }
            };
        }
    },
    {
        id: 'consolidate_military',
        label: 'Consolidate Military Control',
        description: 'Replace military leadership with loyal officers.',
        timeCost: 2,
        requiresOffice: true,
        minLevel: 4,
        minAuthoritarianScore: 30,
        available: (s) => s.politics.active && s.politics.positionLevel >= 4 && s.politics.authoritarianScore >= 30,
        perform: (s) => {
            s.politics.militaryControl = Math.min(100, s.politics.militaryControl + 20);
            s.politics.authoritarianScore = Math.min(100, s.politics.authoritarianScore + 5);
            s.stats.karma = Math.max(0, s.stats.karma - 5);
            return {
                success: true,
                message: 'Loyal generals now command the armed forces. Military Control +20.',
                statChanges: { militaryControl: 20 }
            };
        }
    },
];

// ─── Pre-office Actions ───────────────────────────────────────────────────

export interface PoliticalActivityAction {
    id: string;
    label: string;
    description: string;
    timeCost: number;
    minAge?: number;
    available: (state: GameState) => boolean;
    perform: (state: GameState) => PoliticalActionResult;
}

export const PRE_OFFICE_ACTIONS: PoliticalActivityAction[] = [
    {
        id: 'join_political_party',
        label: 'Join a Political Party',
        description: 'Affiliate with a political party to access their resources.',
        timeCost: 1,
        minAge: 16,
        available: (s) => s.age >= 16 && !s.politics.party,
        perform: (s) => {
            if (!spendTime(s, 1)) return { success: false, message: 'Not enough time.' };
            const parties = ['progressive', 'conservative', 'centrist', 'libertarian'];
            s.politics.party = parties[Math.floor(Math.random() * parties.length)];
            s.politics.partyLoyalty = 50;
            s.politics.totalPoliticalYears += 0;
            const msg = `You joined the ${s.politics.party} party!`;
            addHistory(s, msg, 'primary');
            return { success: true, message: msg };
        }
    },
    {
        id: 'run_independent',
        label: 'Run as Independent',
        description: 'Declare yourself an independent with no party ties.',
        timeCost: 1,
        minAge: 18,
        available: (s) => s.age >= 18 && !s.politics.party,
        perform: (s) => {
            if (!spendTime(s, 1)) return { success: false, message: 'Not enough time.' };
            s.politics.party = 'independent';
            s.politics.ideology = 'independent';
            const msg = 'You registered as an independent candidate.';
            addHistory(s, msg, 'primary');
            return { success: true, message: msg };
        }
    },
    {
        id: 'volunteer_campaign',
        label: 'Volunteer for a Campaign',
        description: 'Gain experience by helping with someone else\'s campaign.',
        timeCost: 2,
        minAge: 16,
        available: (s) => s.age >= 16,
        perform: (s) => {
            if (!spendTime(s, 2)) return { success: false, message: 'Not enough time.' };
            s.politics.totalPoliticalYears += 1;
            s.politics.influence = clamp(s.politics.influence + 3);
            const msg = 'You volunteered for a political campaign. Experience +1 year.';
            addHistory(s, msg);
            return { success: true, message: msg };
        }
    },
    {
        id: 'intern_city_hall',
        label: 'Intern at City Hall',
        description: 'Get inside experience in local government.',
        timeCost: 3,
        minAge: 16,
        available: (s) => s.age >= 16 && s.age <= 25,
        perform: (s) => {
            if (!spendTime(s, 3)) return { success: false, message: 'Not enough time.' };
            s.politics.totalPoliticalYears += 1;
            s.politics.influence = clamp(s.politics.influence + 5);
            s.stats.smarts = clamp(s.stats.smarts + 2);
            const msg = 'You interned at City Hall. Political experience +1 year.';
            addHistory(s, msg);
            return { success: true, message: msg };
        }
    },
    {
        id: 'community_organizing',
        label: 'Community Organizing',
        description: 'Organize your community for a cause — build grassroots influence.',
        timeCost: 2,
        minAge: 18,
        available: (s) => s.age >= 18,
        perform: (s) => {
            if (!spendTime(s, 2)) return { success: false, message: 'Not enough time.' };
            s.politics.totalPoliticalYears += 1;
            s.politics.influence = clamp(s.politics.influence + 4);
            s.stats.karma = clamp(s.stats.karma + 5);
            const msg = 'You organized your community. Influence +4, Karma +5.';
            addHistory(s, msg);
            return { success: true, message: msg };
        }
    },
];

// ─── Available getters ────────────────────────────────────────────────────

export function getAvailablePoliticalActions(state: GameState): (GovernanceAction | PoliticalActivityAction)[] {
    const actions: (GovernanceAction | PoliticalActivityAction)[] = [];

    // Governance actions (in office)
    for (const action of GOVERNANCE_ACTIONS) {
        if (action.available(state)) {
            actions.push(action);
        }
    }

    // Pre-office activities
    if (!state.politics.active) {
        for (const action of PRE_OFFICE_ACTIONS) {
            if (action.available(state)) {
                actions.push(action);
            }
        }
        
        // Candidacy actions for eligible positions
        if (!state.politics.campaignActive) {
            const eligiblePositions = getEligiblePositions(state);
            for (const pos of eligiblePositions) {
                actions.push({
                    id: `declare_candidacy_${pos.id}`,
                    label: `Run for ${pos.title}`,
                    description: `File candidacy for ${pos.title}. Filing fee: $${pos.filingFee.toLocaleString()}`,
                    timeCost: 1,
                    available: (s) => 
                        !s.politics.campaignActive && 
                        isEligibleForPosition(s, pos) &&
                        s.finances.cash >= pos.filingFee &&
                        canSpendTime(s, 1),
                    perform: (s) => {
                        if (!spendTime(s, 1)) return { success: false, message: 'Not enough time.' };
                        const result = declareCandidacy(s, pos.id);
                        if (result.success) {
                            addHistory(s, result.message, 'primary');
                        }
                        return result;
                    }
                });
            }
        } else {
            // Campaign is active - add campaign actions
            // Fund Campaign
            actions.push({
                id: 'fund_campaign',
                label: 'Fund Campaign',
                description: 'Transfer $5,000 from personal funds to campaign war chest.',
                timeCost: 1,
                available: (s) => 
                    s.politics.campaignActive && 
                    s.finances.cash >= 5000 &&
                    canSpendTime(s, 1),
                perform: (s) => {
                    if (!spendTime(s, 1)) return { success: false, message: 'Not enough time.' };
                    const result = fundCampaign(s, 5000);
                    if (result.success) {
                        addHistory(s, result.message);
                    }
                    return result;
                }
            });

            // Hold Rally
            actions.push({
                id: 'hold_rally',
                label: 'Hold Campaign Rally',
                description: 'Hold a rally to boost voter support. Costs $5,000 from campaign funds.',
                timeCost: 2,
                available: (s) => 
                    s.politics.campaignActive && 
                    s.politics.campaignBudget >= 5000 &&
                    canSpendTime(s, 2),
                perform: (s) => {
                    if (!spendTime(s, 2)) return { success: false, message: 'Not enough time.' };
                    const result = holdRally(s);
                    if (result.success) {
                        addHistory(s, result.message);
                    }
                    return result;
                }
            });

            // Resolve Election
            actions.push({
                id: 'resolve_election',
                label: 'Resolve Election',
                description: 'Election day is here! See if you won.',
                timeCost: 1,
                available: (s) => 
                    s.politics.campaignActive && 
                    canSpendTime(s, 1),
                perform: (s) => {
                    if (!spendTime(s, 1)) return { success: false, message: 'Not enough time.' };
                    const result = resolveElection(s);
                    if (result.won) {
                        addHistory(s, result.message, 'primary');
                    } else {
                        addHistory(s, result.message);
                    }
                    return { success: result.won, message: result.message };
                }
            });
        }
    }

    return actions;
}

/**
 * Policies available to enact: player is in office at sufficient level,
 * no conflicts, and not already enacted.
 */
export function getAvailablePolicies(state: GameState): PolicyDefinition[] {
    if (!state.politics.active) return [];
    const pol = state.politics;
    return _policies.filter(p => {
        if (p.minLevel > pol.positionLevel) return false;
        if (pol.policiesEnacted.includes(p.id)) return false;
        if (p.prerequisitePolicies.some(pre => !pol.policiesEnacted.includes(pre))) return false;
        if (p.conflictsPolicies.some(conflict => pol.policiesEnacted.includes(conflict))) return false;
        return true;
    });
}

// ─── Policy Enactment ──────────────────────────────────────────────────────

export function enactPolicy(state: GameState, policyId: string): PoliticalActionResult {
    if (!state.politics.active) {
        return { success: false, message: 'You must be in office to enact policy.' };
    }
    const policy = _policies.find(p => p.id === policyId);
    if (!policy) return { success: false, message: 'Unknown policy.' };
    const available = getAvailablePolicies(state);
    if (!available.find(p => p.id === policyId)) {
        return { success: false, message: 'This policy is not available to you right now.' };
    }

    state.politics.policiesEnacted.push(policyId);
    state.politics.legislativeRecord += 1;

    // Apply effects
    state.politics.approvalRating = Math.max(0, Math.min(100, state.politics.approvalRating + policy.netApprovalEffect));
    state.stats.karma = Math.max(0, Math.min(100, state.stats.karma + policy.karmaEffect));

    if (policy.mediaControlEffect) {
        state.politics.mediaControl = Math.max(0, Math.min(100, state.politics.mediaControl + policy.mediaControlEffect));
    }
    if (policy.militaryControlEffect) {
        state.politics.militaryControl = Math.max(0, Math.min(100, state.politics.militaryControl + policy.militaryControlEffect));
    }
    if (policy.authoritarianEffect) {
        state.politics.authoritarianScore = Math.max(0, Math.min(100, state.politics.authoritarianScore + policy.authoritarianEffect));
    }
    if (policy.corruptionEffect) {
        state.politics.corruptionLevel = Math.max(0, Math.min(100, state.politics.corruptionLevel + policy.corruptionEffect));
    }

    events.emit('stat_changed', { stat: 'approvalRating', value: state.politics.approvalRating });

    return {
        success: true,
        message: `${policy.name} enacted. Approval ${policy.netApprovalEffect >= 0 ? '+' : ''}${policy.netApprovalEffect}.`,
        statChanges: { approvalRating: policy.netApprovalEffect }
    };
}

// ─── Scandal System ───────────────────────────────────────────────────────

/**
 * Calculate the probability that a scandal is exposed this year.
 */
export function calculateScandalExposureChance(state: GameState): number {
    const pol = state.politics;
    // From plan §9.2
    const mediaFreedom = 100 - pol.mediaControl;  // higher media control = less free press
    const chance = (pol.corruptionLevel / 100) * 0.3
        + (mediaFreedom / 100) * 0.2
        + (pol.oppositionStrength / 100) * 0.1
        - (pol.mediaControl / 100) * 0.15;
    return Math.max(0, Math.min(0.95, chance));
}

/**
 * Try to trigger a scandal based on current corruption and exposure chance.
 * Returns the scandal definition if one fires, otherwise null.
 */
export function checkForScandal(state: GameState): ScandalDefinition | null {
    if (!state.politics.active) return null;
    const chance = calculateScandalExposureChance(state);
    if (Math.random() > chance) return null;

    // Find eligible scandals based on corruption threshold
    const eligible = _scandals.filter(s => s.corruptionThreshold <= state.politics.corruptionLevel);
    if (eligible.length === 0) return null;

    return eligible[Math.floor(Math.random() * eligible.length)];
}

/**
 * Apply the immediate effects of a scandal being exposed (before player response).
 */
export function applyScandal(state: GameState, scandal: ScandalDefinition): void {
    state.politics.scandalsExposed += 1;
    state.politics.approvalRating = Math.max(0, state.politics.approvalRating + scandal.approvalHit);
    state.politics.underInvestigation = true;

    if (scandal.triggersImpeachment) {
        state.politics.impeachmentRisk = Math.min(100, state.politics.impeachmentRisk + 40);
    }
}

/**
 * Resolve a scandal choice made by the player.
 */
export function resolveScandalChoice(state: GameState, scandal: ScandalDefinition, choiceIndex: number): PoliticalActionResult {
    const choice = scandal.choices[choiceIndex];
    if (!choice) return { success: false, message: 'Invalid choice.' };

    if (choice.approvalHit !== undefined) {
        // Deterministic outcome
        state.politics.approvalRating = Math.max(0, Math.min(100, state.politics.approvalRating + choice.approvalHit));
        if (choice.corruptionGain) state.politics.corruptionLevel = Math.min(100, state.politics.corruptionLevel + choice.corruptionGain);
        if (choice.karmaGain) state.stats.karma = Math.min(100, state.stats.karma + choice.karmaGain);
        if (choice.karmaHit) state.stats.karma = Math.max(0, state.stats.karma - choice.karmaHit);
        if (choice.authoritarianGain) state.politics.authoritarianScore = Math.min(100, state.politics.authoritarianScore + choice.authoritarianGain);
        return { success: true, message: `You chose: ${choice.text}. Fallout contained.` };
    } else if (choice.successChance !== undefined) {
        // Probabilistic outcome
        const success = Math.random() < choice.successChance;
        const approvalChange = success ? (choice.successApproval ?? 0) : (choice.failApproval ?? -10);
        state.politics.approvalRating = Math.max(0, Math.min(100, state.politics.approvalRating + approvalChange));
        if (!success && choice.corruptionGain) {
            state.politics.corruptionLevel = Math.min(100, state.politics.corruptionLevel + choice.corruptionGain);
        }
        if (choice.karmaHit) state.stats.karma = Math.max(0, state.stats.karma - choice.karmaHit);
        if (choice.karmaGain) state.stats.karma = Math.min(100, state.stats.karma + choice.karmaGain);
        if (choice.authoritarianGain) state.politics.authoritarianScore = Math.min(100, state.politics.authoritarianScore + choice.authoritarianGain);
        return {
            success,
            message: success ? `Your gamble paid off. ${choice.text} worked.` : `Your strategy backfired. Approval ${approvalChange}.`
        };
    }
    return { success: false, message: 'Choice has no defined effect.' };
}

// ─── Coup ────────────────────────────────────────────────────────────────

export interface CoupResult {
    success: boolean;
    message: string;
}

/**
 * Attempt a coup d'état. Available from Level 2+ with sufficient military/craziness.
 */
export function stageCoup(state: GameState): CoupResult {
    const pol = state.politics;
    if (pol.positionLevel < 2) {
        return { success: false, message: 'You need to hold at least a state-level office to stage a coup.' };
    }
    if (pol.militaryControl < 50 && state.stats.craziness < 40) {
        return { success: false, message: 'You lack the military backing or sheer audacity for a coup.' };
    }

    const successChance = (pol.militaryControl / 100) * 0.5
        + (1 - pol.oppositionStrength / 100) * 0.3
        + (Math.random() * 0.2);

    const success = Math.random() < Math.min(0.85, successChance);

    if (success) {
        pol.currentPosition = 'supreme_leader';
        pol.positionTitle = 'Supreme Leader';
        pol.positionLevel = 5;
        pol.authoritarianScore = 100;
        pol.governmentType = 'dictatorship';
        pol.hasStagedCoup = true;
        pol.active = true;
        pol.yearsInOffice = 0;
        pol.oppositionStrength = Math.max(0, pol.oppositionStrength - 40);
        state.stats.karma = Math.max(0, state.stats.karma - 30);
        state.finances.salary = 1000000;
        state.career.field = 'Politics';
        state.career.title = 'Supreme Leader';
        return { success: true, message: 'The coup succeeded! You seized absolute power. You are now Supreme Leader.' };
    } else {
        pol.active = false;
        pol.currentPosition = null;
        pol.positionTitle = null;
        pol.positionLevel = 0;
        state.isAlive = Math.random() > 0.5; // 50% chance arrested vs executed
        if (!state.isAlive) {
            state.deathCause = 'Executed after failed coup attempt';
        } else {
            state.flags.imprisoned = true;
            state.flags.political_career_ended = true;
        }
        return { success: false, message: 'The coup failed. Loyalists arrested you. Your political career is over — or worse.' };
    }
}

// ─── Revolution check (for dictators/monarchs) ───────────────────────────

export function calculateRevolutionChance(state: GameState): number {
    const pol = state.politics;
    if (pol.positionLevel < 5) return 0;
    const chance = ((100 - pol.approvalRating) / 100) * 0.2
        + (pol.oppositionStrength / 100) * 0.3
        - (pol.militaryControl / 100) * 0.25
        - (pol.mediaControl / 100) * 0.1;
    return Math.max(0, Math.min(0.9, chance));
}

// ─── Annual Political Tick ────────────────────────────────────────────────

/**
 * Called once per year from Engine.ageUp().
 * Handles: approval drift, corruption check, scandal exposure, impeachment,
 * revolution (for supreme positions), and office-year accounting.
 */
export function processPoliticalYear(state: GameState): void {
    const pol = state.politics;

    // Always track total political years if active or was ever active
    if (pol.active || pol.hasRunForOffice) {
        pol.totalPoliticalYears += 1;
    }

    if (!pol.active) return;

    pol.yearsInOffice += 1;

    // ── Approval drift ──────────────────────────────────────────────────────
    let approvalDelta = -2; // Base annual decay

    // Charisma bonus/penalty
    if (state.stats.looks > 70) approvalDelta += 2;
    if (state.stats.looks < 30) approvalDelta -= 2;

    // Economy simulation (random economic conditions)
    const economyRoll = Math.random();
    if (economyRoll > 0.75) approvalDelta += Math.floor(Math.random() * 6) + 3;  // Good economy +3..8
    else if (economyRoll < 0.20) approvalDelta -= Math.floor(Math.random() * 11) + 5; // Bad economy -5..15

    // Enacted popular policies carry a yearly bonus
    approvalDelta += Math.min(10, pol.policiesEnacted.length * 1);

    pol.approvalRating = Math.max(0, Math.min(100, pol.approvalRating + approvalDelta));

    // ── Track term limits ───────────────────────────────────────────────────
    const pos = getPositionById(pol.currentPosition ?? '');
    if (pos && pos.termLimit > 0 && pol.termsServed >= pos.termLimit) {
        pol.isTermLimited = true;
    }

    // ── Scandal exposure check ──────────────────────────────────────────────
    const scandal = checkForScandal(state);
    if (scandal) {
        applyScandal(state, scandal);
        events.emit('political_scandal', scandal);
    }

    // ── Impeachment risk ────────────────────────────────────────────────────
    if (pol.scandalsExposed >= 3 || pol.corruptionLevel > 60) {
        pol.impeachmentRisk = Math.min(100,
            pol.impeachmentRisk + Math.floor(pol.corruptionLevel / 10)
        );

        if (pol.impeachmentRisk > 70 && Math.random() < 0.3 && pol.governmentType === 'democracy') {
            // Impeached!
            pol.hasBeenImpeached = true;
            pol.active = false;
            pol.currentPosition = null;
            pol.positionTitle = null;
            pol.positionLevel = 0;
            state.finances.salary = 0;
            state.career.title = null;
            events.emit('political_impeached', state);
            state.history.push({
                age: state.age,
                year: state.year,
                text: 'You were impeached and removed from office in disgrace.',
                type: 'primary'
            });
            return;
        }
    }

    // ── Revolution check (supreme positions) ───────────────────────────────
    if (pol.positionLevel >= 5) {
        const revChance = calculateRevolutionChance(state);
        if (Math.random() < revChance) {
            events.emit('political_revolution_threat', state);
        }
    }

    events.emit('political_year_processed', state);
}

// ─── Action dispatcher ────────────────────────────────────────────────────

/**
 * Central dispatcher for all political actions. The UI calls this with an action ID
 * and an optional parameter (e.g. policyId for enact_policy, amount for funding).
 */
export function performPoliticalAction(
    state: GameState,
    actionId: string,
    param?: string | number
): PoliticalActionResult {
    // Parameterised enact_policy must be handled before the generic GOVERNANCE_ACTIONS
    // lookup, because the stub in GOVERNANCE_ACTIONS only asks the player to specify a
    // policy and does not call through to the real enactPolicy() function.
    if (actionId === 'enact_policy' && typeof param === 'string') {
        if (!state.politics.active) return { success: false, message: 'Action not available.' };
        if (!spendTime(state, 2)) return { success: false, message: 'Not enough time this year.' };
        return enactPolicy(state, param);
    }

    // Pre-office actions
    const preAction = PRE_OFFICE_ACTIONS.find(a => a.id === actionId);
    if (preAction) {
        if (!preAction.available(state)) return { success: false, message: 'Action not available.' };
        if (!spendTime(state, preAction.timeCost)) return { success: false, message: 'Not enough time this year.' };
        return preAction.perform(state);
    }

    // Governance actions
    const govAction = GOVERNANCE_ACTIONS.find(a => a.id === actionId);
    if (govAction) {
        if (!govAction.available(state)) return { success: false, message: 'Action not available.' };
        if (!spendTime(state, govAction.timeCost)) return { success: false, message: 'Not enough time this year.' };
        return govAction.perform(state);
    }

    // Campaign-specific actions
    if (actionId === 'declare_candidacy' && typeof param === 'string') {
        return declareCandidacy(state, param);
    }

    if (actionId === 'fund_campaign' && typeof param === 'number') {
        return fundCampaign(state, param);
    }

    if (actionId === 'hold_rally') {
        if (!spendTime(state, 1)) return { success: false, message: 'Not enough time this year.' };
        return holdRally(state);
    }

    if (actionId === 'stage_coup') {
        return { success: stageCoup(state).success, message: stageCoup(state).message };
    }

    if (actionId === 'resolve_election') {
        const rigged = param === 'rigged';
        const result = resolveElection(state, rigged);
        return { success: result.won, message: result.message };
    }

    return { success: false, message: `Unknown political action: ${actionId}` };
}
