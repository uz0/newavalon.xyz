import { AbilityAction, isLine } from './autoAbilities';
import { Card, GameState } from '../types';

/**
 * Maps specific Command Card IDs and Option Indices to Game Actions.
 * 
 * @param cardId The ID of the command card (e.g., 'overwatch', 'inspiration').
 * @param optionIndex -1 for Main Ability, 0-2 for Sub Options.
 * @param card The card object itself.
 * @param gameState The current game state.
 * @param localPlayerId The ID of the player executing the command.
 */
export const getCommandAction = (
    cardId: string,
    optionIndex: number,
    card: Card,
    gameState: GameState,
    localPlayerId: number
): AbilityAction | null => {
    const baseId = card.baseId || cardId.split('_')[1]?.toLowerCase() || cardId; // Robust fallback
    const isMain = optionIndex === -1;

    // --- OVERWATCH ---
    if (baseId.includes('overwatch')) {
        if (isMain) {
            // Main: "Place 1 aim token on any card on the battlefield."
            // Use CREATE_STACK to attach token to cursor
            return {
                type: 'CREATE_STACK',
                tokenType: 'Aim',
                count: 1,
                sourceCard: card
            };
        }
        // Sub 0: "Move units with your aim 1 or 2 cells." 
        if (optionIndex === 0) {
            return {
                type: 'ENTER_MODE',
                mode: 'SELECT_UNIT_FOR_MOVE',
                sourceCard: card,
                payload: {
                    // Select unit with player's Aim
                    filter: (target: Card) => target.statuses?.some(s => s.type === 'Aim' && s.addedByPlayerId === localPlayerId),
                    range: 2 
                }
            };
        }
        // Sub 1: "Reveal 1 card for each of your aim."
        // USE DYNAMIC COUNTING so it calculates AFTER base module runs.
        if (optionIndex === 1) {
            return { 
                type: 'CREATE_STACK', 
                tokenType: 'Revealed', 
                dynamicCount: { factor: 'Aim', ownerId: localPlayerId },
                sourceCard: card
            };
        }
        // Sub 2: "Draw 1 card for each of your aim."
        // USE DYNAMIC RESOURCE so it calculates AFTER base module runs.
        if (optionIndex === 2) {
             return {
                 type: 'GLOBAL_AUTO_APPLY', 
                 payload: { dynamicResource: { type: 'draw', factor: 'Aim', ownerId: localPlayerId } },
                 sourceCard: card
             };
        }
    }

    // --- TACTICAL MANEUVER (Repositioning) ---
    if (baseId.includes('tacticalmaneuver') || baseId.includes('repositioning')) {
        if (isMain) {
            // Main: "Move your unit to any cell in a line."
            // RECORD CONTEXT so we know where it landed for sub-options.
            return {
                type: 'ENTER_MODE',
                mode: 'SELECT_UNIT_FOR_MOVE',
                recordContext: true,
                sourceCard: card,
                payload: {
                    range: 'line', 
                    filter: (target: Card) => target.ownerId === localPlayerId
                }
            };
        }
        // Sub 0: "Draw cards equal to the power of an adjacent allied unit."
        // Context Check: adjacent to the card moved in base module
        if (optionIndex === 0) {
             return {
                 type: 'ENTER_MODE',
                 mode: 'SELECT_TARGET',
                 contextCheck: 'ADJACENT_TO_LAST_MOVE',
                 sourceCard: card,
                 payload: {
                     actionType: 'DRAW_EQUAL_POWER',
                     filter: (target: Card) => target.ownerId === localPlayerId
                 }
             };
        }
        // Sub 1: "Move your unit 1 or 2 cells."
        if (optionIndex === 1) {
            return {
                type: 'ENTER_MODE',
                mode: 'SELECT_UNIT_FOR_MOVE',
                sourceCard: card,
                payload: {
                    filter: (target: Card) => target.ownerId === localPlayerId,
                    range: 2
                }
            };
        }
        // Sub 2: "Gain points equal to the power of one of the moved units."
        // Implemented as: Select ally adjacent to card moved by base module
        if (optionIndex === 2) {
             return {
                 type: 'ENTER_MODE',
                 mode: 'SELECT_TARGET',
                 contextCheck: 'ADJACENT_TO_LAST_MOVE',
                 sourceCard: card,
                 payload: {
                     actionType: 'SCORE_EQUAL_POWER',
                     filter: (target: Card) => target.ownerId === localPlayerId
                 }
             };
        }
    }

    // --- INSPIRATION ---
    if (baseId.includes('inspiration')) {
        if (isMain) {
            // "Remove any number of counters from your unit."
            // Simplified: Select a unit -> Remove ALL counters.
            return {
                type: 'ENTER_MODE',
                mode: 'SELECT_TARGET',
                sourceCard: card,
                payload: {
                    actionType: 'REMOVE_ALL_COUNTERS_SELF',
                    filter: (target: Card) => target.ownerId === localPlayerId
                }
            };
        }
        if (optionIndex === 0) {
             return {
                type: 'ENTER_MODE',
                mode: 'SELECT_UNIT_FOR_MOVE',
                sourceCard: card,
                payload: { 
                    filter: (target: Card) => target.ownerId === localPlayerId,
                    range: 2 
                }
            };
        }
        if (optionIndex === 1) {
             return { type: 'GLOBAL_AUTO_APPLY', sourceCard: card, payload: { resourceChange: { draw: 2 } } };
        }
        if (optionIndex === 2) {
             return { type: 'GLOBAL_AUTO_APPLY', sourceCard: card, payload: { resourceChange: { score: 2 } } };
        }
    }

    // --- DATA INTERCEPTION ---
    if (baseId.includes('datainterception')) {
        if (isMain) {
            // Main: "Place 1 exploit token on any card."
            // Use CREATE_STACK
            return { 
                type: 'CREATE_STACK', 
                tokenType: 'Exploit', 
                count: 1,
                sourceCard: card
            };
        }
        if (optionIndex === 0) {
            return {
                type: 'ENTER_MODE',
                mode: 'SELECT_UNIT_FOR_MOVE',
                sourceCard: card,
                payload: {
                    range: 'line',
                    filter: (target: Card) => target.statuses?.some(s => s.type === 'Exploit' && s.addedByPlayerId === localPlayerId)
                }
            };
        }
        if (optionIndex === 1) {
             let exploitCount = 0;
            gameState.board.forEach(row => row.forEach(cell => {
                if (cell.card?.statuses?.some(s => s.type === 'Exploit' && s.addedByPlayerId === localPlayerId)) {
                    exploitCount++;
                }
            }));
            if (exploitCount > 0) return { type: 'CREATE_STACK', tokenType: 'Revealed', count: exploitCount, sourceCard: card };
            return null;
        }
        if (optionIndex === 2) {
             let maxPower = 0;
             gameState.board.forEach(row => row.forEach(cell => {
                 const c = cell.card;
                 if (c && (c.revealedTo === 'all' || c.statuses?.some(s => s.type === 'Revealed'))) {
                     if (c.power > maxPower) maxPower = c.power;
                 }
             }));
             return { type: 'GLOBAL_AUTO_APPLY', sourceCard: card, payload: { resourceChange: { draw: maxPower } } };
        }
    }

    // --- FALSE ORDERS ---
    if (baseId.includes('falseorders')) {
        if (isMain) {
            return {
                type: 'ENTER_MODE',
                mode: 'SELECT_UNIT_FOR_MOVE',
                sourceCard: card,
                payload: {
                    filter: (target: Card) => target.ownerId !== localPlayerId,
                    range: 2
                }
            };
        }
        if (optionIndex === 0) {
             return {
                type: 'ENTER_MODE',
                mode: 'SELECT_UNIT_FOR_MOVE',
                sourceCard: card,
                payload: { 
                    filter: (target: Card) => target.ownerId !== localPlayerId,
                    range: 2
                }
            };
        }
        if (optionIndex === 1) {
             return {
                type: 'ENTER_MODE',
                mode: 'SELECT_TARGET',
                sourceCard: card,
                payload: {
                    tokenType: 'Stun',
                    filter: (target: Card) => target.ownerId !== localPlayerId
                }
            };
        }
        if (optionIndex === 2) {
             return {
                 type: 'ENTER_MODE',
                 mode: 'SELECT_TARGET',
                 sourceCard: card,
                 payload: {
                     actionType: 'DRAW_EQUAL_POWER',
                     filter: (target: Card) => target.ownerId !== localPlayerId
                 }
             };
        }
    }

    // Default/Mobilization (No Sub Options)
    if (isMain) {
        if (baseId.includes('mobilization1')) return { type: 'ENTER_MODE', mode: 'SELECT_LINE_END', sourceCard: card, payload: { actionType: 'SCORE_LINE' } };
        if (baseId.includes('mobilization2')) return null; 
        if (baseId.includes('mobilization3')) return null; 
    }

    return null;
};