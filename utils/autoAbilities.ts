import type { Card, GameState } from '../types';

export type AbilityAction = {
    type: 'CREATE_STACK' | 'ENTER_MODE' | 'OPEN_MODAL' | 'GLOBAL_AUTO_APPLY';
    mode?: string;
    tokenType?: string;
    count?: number;
    dynamicCount?: { factor: string; ownerId: number }; // For dynamic stack counts (e.g. Overwatch Reveal)
    onlyFaceDown?: boolean;
    onlyOpponents?: boolean;
    targetOwnerId?: number;
    excludeOwnerId?: number;
    sourceCard?: Card;
    sourceCoords?: { row: number, col: number };
    payload?: any;
    isDeployAbility?: boolean;
    recordContext?: boolean; // If true, the result of this action (e.g. move destination) is saved
    contextCheck?: 'ADJACENT_TO_LAST_MOVE'; // If set, validates targets based on saved context
    requiredTargetStatus?: string;
    mustBeAdjacentToSource?: boolean;
    mustBeInLineWithSource?: boolean;
    placeAllAtOnce?: boolean;
};

export const isLine = (r1: number, c1: number, r2: number, c2: number): boolean => {
    return r1 === r2 || c1 === c2;
};

export const isAdjacent = (r1: number, c1: number, r2: number, c2: number): boolean => {
    return Math.abs(r1 - r2) + Math.abs(c1 - c2) === 1;
};

const hasStatus = (card: Card, type: string, playerId?: number): boolean => {
    if (!card.statuses) return false;
    return card.statuses.some(s => s.type === type && (playerId === undefined || s.addedByPlayerId === playerId));
};

const hasAbilityKeyword = (ability: string, keyword: string): boolean => {
    if (!ability) return false;
    return ability.toLowerCase().includes(keyword.toLowerCase());
};

/**
 * Determines if a specific card can be activated in the current state.
 * Priority 1: Deploy Ability (if not consumed)
 * Priority 2: Phase-specific Ability (if not used in this phase)
 * Condition: If "Support =>", must have Support status.
 */
export const canActivateAbility = (card: Card, phaseIndex: number, activeTurnPlayerId: number | undefined): boolean => {
    if (activeTurnPlayerId !== card.ownerId) return false;
    if (card.statuses?.some(s => s.type === 'Stun')) return false;

    const abilityText = card.ability || '';

    // Helper to check Support prerequisite
    const checkSupport = (text: string): boolean => {
        // Regex to match "Support => [Key]" or "Support => ... [Key]"
        // Simplified: if text has "support =>" case insensitive, check status.
        if (text.toLowerCase().includes('support ⇒')) {
            return hasStatus(card, 'Support', activeTurnPlayerId);
        }
        return true; // No support requirement found
    };

    // === 1. CHECK DEPLOY ABILITY ===
    // Rule: Deploy is available if not consumed.
    if (!card.deployAbilityConsumed) {
        if (hasAbilityKeyword(abilityText, 'deploy:')) {
            // Check if Deploy part requires support (e.g. "Support => Deploy:")
            // This is tricky if multiple abilities exist. We assume standard formatting.
            // If "Support => Deploy" is present, check support.
            if (hasAbilityKeyword(abilityText, 'support ⇒ deploy:')) {
                return hasStatus(card, 'Support', activeTurnPlayerId);
            }
            return true;
        }
    }

    // === 2. CHECK PHASE ABILITY ===
    // Rule: Can only be used if not used in this phase yet.
    if (card.abilityUsedInPhase !== phaseIndex) {
        let phaseKeyword = '';
        if (phaseIndex === 0) phaseKeyword = 'setup:';
        if (phaseIndex === 1) phaseKeyword = 'act:';
        if (phaseIndex === 2) phaseKeyword = 'commit:';

        if (phaseKeyword && hasAbilityKeyword(abilityText, phaseKeyword)) {
             // Check if THIS phase ability requires support
             // We look for "Support => [PhaseKeyword]"
             if (hasAbilityKeyword(abilityText, `support ⇒ ${phaseKeyword}`)) {
                 return hasStatus(card, 'Support', activeTurnPlayerId);
             }
             return true;
        }
    }

    // Special Case for COMMAND cards (always usable during phases 1 and 3 if in hand/announced)
    if (card.deck === 'Command') {
        // Valid phases for Commands: Main (1) and Commit (3) -> Wait, game phases are Setup(0), Main(1), Commit(2)?
        // TURN_PHASES = ['Setup Phase', 'Main Phase', 'Commit Phase']; (0, 1, 2)
        // Actually, Command cards can usually be played in Main or Commit phase.
        if (phaseIndex === 1 || phaseIndex === 2) return true;
    }

    return false;
};

export const getCardAbilityAction = (
    card: Card,
    gameState: GameState,
    localPlayerId: number | null,
    coords: { row: number, col: number }
): AbilityAction | null => {
    if (localPlayerId !== card.ownerId) return null;

    // Priority 1: Deploy (if available and not consumed)
    if (!card.deployAbilityConsumed) {
        const deployAction = getDeployAction(card, gameState, localPlayerId as number, coords);
        if (deployAction) {
            // Ensure we respect Support requirement for Deploy too
            const abilityText = card.ability || '';
            if (hasAbilityKeyword(abilityText, 'support ⇒ deploy:')) {
                if (!hasStatus(card, 'Support', localPlayerId as number)) {
                    // Blocked by Support
                }
            }
            if (deployAction) return { ...deployAction, isDeployAbility: true };
        }
    }

    // Priority 2: Phase Ability
    if (card.abilityUsedInPhase !== gameState.currentPhase) {
        const phaseAction = getPhaseAction(card, gameState, localPlayerId as number, coords);
        if (phaseAction) {
            return phaseAction;
        }
    }

    return null;
};

// --- Internal Helper: Get Deploy Action ---
const getDeployAction = (
    card: Card,
    gameState: GameState,
    ownerId: number,
    coords: { row: number, col: number }
): AbilityAction | null => {
    const name = card.name.toLowerCase();
    
    // Helper to check support locally for specific cards if needed
    const hasSup = hasStatus(card, 'Support', ownerId);

    // SYNCHROTECH
    if (name.includes('ip dept agent')) {
        return {
            type: 'CREATE_STACK',
            tokenType: 'Stun',
            count: 2,
            requiredTargetStatus: 'Exploit',
            placeAllAtOnce: true
        };
    }
    if (name.includes('tactical agent')) {
        return {
            type: 'CREATE_STACK',
            tokenType: 'Aim',
            count: 1,
            requiredTargetStatus: 'Threat'
        };
    }
    if (name.includes('riot agent')) {
        return { type: 'ENTER_MODE', mode: 'RIOT_PUSH', sourceCard: card, sourceCoords: coords, payload: {} };
    }
    if (name.includes('threat analyst')) {
        return { type: 'CREATE_STACK', tokenType: 'Exploit', count: 1 };
    }

    // HOODS
    if (name.includes('reckless provocateur')) {
        return {
            type: 'ENTER_MODE',
            mode: 'SWAP_POSITIONS',
            sourceCard: card,
            sourceCoords: coords,
            payload: { filter: (target: Card, r: number, c: number) => isAdjacent(r, c, coords.row, coords.col) }
        };
    }
    if (name.includes('data liberator')) {
        return { type: 'CREATE_STACK', tokenType: 'Exploit', count: 1 };
    }
    if (name.includes('cautious avenger')) {
        return {
            type: 'CREATE_STACK',
            tokenType: 'Aim',
            count: 1,
            sourceCoords: coords,
            mustBeInLineWithSource: true
        };
    }
    if (name.includes('inventive maker')) {
        return { type: 'ENTER_MODE', mode: 'SPAWN_TOKEN', sourceCard: card, sourceCoords: coords, payload: { tokenName: 'Recon Drone' } };
    }

    // OPTIMATES
    if (name.includes('faber')) {
        return { type: 'ENTER_MODE', mode: 'SPAWN_TOKEN', sourceCard: card, sourceCoords: coords, payload: { tokenName: 'Walking Turret' } };
    }
    if (name.includes('censor')) {
        return { type: 'CREATE_STACK', tokenType: 'Exploit', count: 1 };
    }
    if (name.includes('princeps')) {
        return { type: 'ENTER_MODE', mode: 'PRINCEPS_SHIELD_THEN_AIM', sourceCard: card, sourceCoords: coords, payload: {} };
    }
    if (name.includes('immunis')) {
        if (hasSup) {
            return {
                type: 'OPEN_MODAL',
                mode: 'IMMUNIS_RETRIEVE',
                sourceCard: card,
                sourceCoords: coords,
                payload: { filter: (r: number, c: number) => isAdjacent(r, c, coords.row, coords.col) }
            };
        }
    }

    // FUSION
    if (name.includes('code keeper')) {
        // Automatic: Exploit all opponent cards with Threat (owned by me)
        return {
            type: 'GLOBAL_AUTO_APPLY',
            sourceCard: card,
            sourceCoords: coords,
            payload: {
                tokenType: 'Exploit',
                count: 1,
                filter: (target: Card) => target.ownerId !== ownerId && hasStatus(target, 'Threat', ownerId)
            }
        };
    }
    if (name.includes('devout synthetic')) {
        return { type: 'ENTER_MODE', mode: 'RIOT_PUSH', sourceCard: card, sourceCoords: coords, payload: {} };
    }
    if (name.includes('unwavering integrator')) {
        return { type: 'CREATE_STACK', tokenType: 'Exploit', count: 1 };
    }
    if (name.includes('signal prophet')) {
        // Automatic: Exploit all MY cards with Support (owned by me)
        return {
            type: 'GLOBAL_AUTO_APPLY',
            sourceCard: card,
            sourceCoords: coords,
            payload: {
                tokenType: 'Exploit',
                count: 1,
                filter: (target: Card) => target.ownerId === ownerId && hasStatus(target, 'Support', ownerId)
            }
        };
    }
    if (name.includes('zealous missionary')) {
        return { type: 'CREATE_STACK', tokenType: 'Exploit', count: 1 };
    }

    // Generic fallback if card has deploy keyword but not specific logic above
    if (card.ability.toLowerCase().includes('deploy:')) {
         if (card.ability.toLowerCase().includes('shield 1')) return { type: 'CREATE_STACK', tokenType: 'Shield', count: 1 };
         if (card.ability.toLowerCase().includes('stun 1')) return { type: 'CREATE_STACK', tokenType: 'Stun', count: 1 };
         if (card.ability.toLowerCase().includes('aim 1')) return { type: 'CREATE_STACK', tokenType: 'Aim', count: 1 };
    }

    return null;
};

// --- Internal Helper: Get Phase Action ---
const getPhaseAction = (
    card: Card,
    gameState: GameState,
    ownerId: number,
    coords: { row: number, col: number }
): AbilityAction | null => {
    const name = card.name.toLowerCase();
    const phaseIndex = gameState.currentPhase;
    const hasSup = hasStatus(card, 'Support', ownerId);

    // PHASE 0: SETUP
    if (phaseIndex === 0) {
        if (name.includes('tactical agent')) {
            return {
                type: 'ENTER_MODE',
                mode: 'SELECT_TARGET',
                sourceCard: card,
                sourceCoords: coords,
                payload: { actionType: 'DESTROY', filter: (target: Card) => hasStatus(target, 'Aim') }
            };
        }
        if (name.includes('patrol agent')) {
            return { type: 'ENTER_MODE', mode: 'PATROL_MOVE', sourceCard: card, sourceCoords: coords, payload: {} };
        }
        if (name.includes('cautious avenger')) {
            if (!hasSup) return null;
            return {
                type: 'ENTER_MODE',
                mode: 'SELECT_TARGET',
                sourceCard: card,
                sourceCoords: coords,
                payload: { actionType: 'DESTROY', filter: (target: Card) => hasStatus(target, 'Aim') }
            };
        }
        if (name.includes('inventive maker')) {
            if (!hasSup) return null;
            return { type: 'OPEN_MODAL', mode: 'RETRIEVE_DEVICE', sourceCard: card, sourceCoords: coords, payload: {} };
        }
        if (name.includes('princeps')) {
            return {
                type: 'ENTER_MODE',
                mode: 'SELECT_TARGET',
                sourceCard: card,
                sourceCoords: coords,
                payload: {
                    actionType: 'DESTROY',
                    filter: (target: Card, r: number, c: number) => isLine(r, c, coords.row, coords.col) && hasStatus(target, 'Aim', ownerId)
                }
            };
        }
        if (name.includes('centurion')) {
            if (!hasSup) return null;
            return {
                type: 'ENTER_MODE',
                mode: 'SELECT_LINE_END',
                sourceCard: card,
                sourceCoords: coords,
                payload: { actionType: 'CENTURION_BUFF', firstCoords: coords }
            };
        }
        if (name.includes('devout synthetic')) {
            if (!hasSup) return null;
            return {
                type: 'ENTER_MODE',
                mode: 'SELECT_TARGET',
                sourceCard: card,
                sourceCoords: coords,
                payload: {
                    actionType: 'DESTROY',
                    filter: (target: Card, r: number, c: number) => 
                        isAdjacent(r, c, coords.row, coords.col) && 
                        target.ownerId !== ownerId && 
                        (hasStatus(target, 'Threat', ownerId) || hasStatus(target, 'Stun', ownerId))
                }
            };
        }
        if (name.includes('unwavering integrator')) {
            if (!hasSup) return null;
            return { type: 'ENTER_MODE', mode: 'INTEGRATOR_LINE_SELECT', sourceCard: card, sourceCoords: coords, payload: {} };
        }
        if (name.includes('recon drone')) {
            return { type: 'ENTER_MODE', mode: 'SELECT_CELL', sourceCard: card, sourceCoords: coords, payload: { allowSelf: false, range: 'global' } };
        }
    }

    // PHASE 1: MAIN (Act)
    if (phaseIndex === 1) {
        // Generic handler for Act keywords if any card has them.
        if (hasAbilityKeyword(card.ability, 'act:')) {
             // Implement specific Act abilities if added
        }
    }

    // PHASE 2: COMMIT
    if (phaseIndex === 2) {
        if (name.includes('ip dept agent')) {
            if (!hasSup) return null;
            return {
                type: 'ENTER_MODE',
                mode: 'SELECT_TARGET',
                sourceCard: card,
                sourceCoords: coords,
                payload: { actionType: 'DESTROY', filter: (target: Card) => target.ownerId !== ownerId && hasStatus(target, 'Revealed', ownerId) }
            };
        }
        if (name.includes('patrol agent') || name.includes('riot agent')) {
            return {
                type: 'CREATE_STACK',
                tokenType: 'Stun',
                count: 1,
                requiredTargetStatus: 'Threat',
                onlyOpponents: true,
                mustBeAdjacentToSource: true,
                sourceCoords: coords
            };
        }
        if (name.includes('threat analyst')) {
            if (!hasSup) return null;
            
            // Calculate total exploit tokens owned by this player on the board
            let totalExploits = 0;
            gameState.board.forEach(row => {
                row.forEach(cell => {
                    if (cell.card && cell.card.statuses) {
                        totalExploits += cell.card.statuses.filter(s => s.type === 'Exploit' && s.addedByPlayerId === ownerId).length;
                    }
                });
            });

            if (totalExploits === 0) return null; // Nothing to reveal

            return { type: 'CREATE_STACK', tokenType: 'Revealed', count: totalExploits }; 
        }
        if (name.includes('reckless provocateur')) {
            return {
                type: 'ENTER_MODE',
                mode: 'TRANSFER_ALL_STATUSES',
                sourceCard: card,
                sourceCoords: coords,
                payload: {
                    filter: (target: Card) => {
                        if (target.id === card.id) return false;
                        return target.ownerId === ownerId; 
                    }
                }
            };
        }
        if (name.includes('vigilant spotter')) {
            return { type: 'CREATE_STACK', tokenType: 'Revealed', count: 1, onlyFaceDown: true, excludeOwnerId: ownerId };
        }
        if (name.includes('recon drone')) {
            return {
                type: 'ENTER_MODE',
                mode: 'REVEAL_ENEMY',
                sourceCard: card,
                sourceCoords: coords,
                payload: { filter: (target: Card, r: number, c: number) => isAdjacent(r, c, coords.row, coords.col) && target.ownerId !== ownerId }
            };
        }
        if (name.includes('censor')) {
            if (!hasSup) return null;
            return { type: 'ENTER_MODE', mode: 'CENSOR_SWAP', sourceCard: card, sourceCoords: coords, payload: { filter: (target: Card) => hasStatus(target, 'Exploit', ownerId) } };
        }
        if (name.includes('walking turret')) {
            if (!hasSup) return null;
            if (hasStatus(card, 'Shield')) return null;
            return { type: 'ENTER_MODE', mode: 'WALKING_TURRET_SHIELD', sourceCard: card, sourceCoords: coords, payload: {} };
        }
        if (name.includes('code keeper')) {
            if (!hasSup) return null;
            return {
                type: 'ENTER_MODE',
                mode: 'SELECT_UNIT_FOR_MOVE',
                sourceCard: card,
                sourceCoords: coords,
                payload: {
                    // Target: Opponent card with Exploit
                    filter: (target: Card) => target.ownerId !== ownerId && hasStatus(target, 'Exploit', ownerId)
                }
            };
        }
        if (name.includes('signal prophet')) {
            if (!hasSup) return null;
            return {
                type: 'ENTER_MODE',
                mode: 'SELECT_UNIT_FOR_MOVE',
                sourceCard: card,
                sourceCoords: coords,
                payload: {
                    // Target: Own card with Exploit
                    filter: (target: Card) => target.ownerId === ownerId && hasStatus(target, 'Exploit', ownerId)
                }
            };
        }
        if (name.includes('zealous missionary')) {
            if (!hasSup) return null;
            return { type: 'ENTER_MODE', mode: 'ZEALOUS_WEAKEN', sourceCard: card, sourceCoords: coords, payload: { filter: (target: Card) => hasStatus(target, 'Exploit', ownerId) } };
        }
    }

    return null;
};