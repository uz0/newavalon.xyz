/**
 * @file Phase management handlers
 * Handles turn phase navigation and auto-abilities toggle
 */

import { logger } from '../utils/logger.js';
import { getGameState } from '../services/gameState.js';
import { broadcastToGame } from '../services/websocket.js';

/**
 * Handle TOGGLE_AUTO_ABILITIES message
 * Toggles whether auto-abilities are enabled for the game
 */
export function handleToggleAutoAbilities(ws, data) {
  try {
    const { gameId, enabled } = data;
    const gameState = getGameState(gameId);

    if (!gameState) {
      ws.send(JSON.stringify({
        type: 'ERROR',
        message: 'Game not found'
      }));
      return;
    }

    gameState.autoAbilitiesEnabled = enabled;
    broadcastToGame(gameId, gameState);
    logger.info(`Auto-abilities ${enabled ? 'enabled' : 'disabled'} for game ${gameId}`);
  } catch (error) {
    logger.error('Failed to toggle auto abilities:', error);
  }
}

/**
 * Handle NEXT_PHASE message
 * Advances to the next turn phase
 */
export function handleNextPhase(ws, data) {
  try {
    const { gameId } = data;
    const gameState = getGameState(gameId);

    if (!gameState) {
      ws.send(JSON.stringify({
        type: 'ERROR',
        message: 'Game not found'
      }));
      return;
    }

    if (!gameState.isGameStarted) {
      ws.send(JSON.stringify({
        type: 'ERROR',
        message: 'Game has not started'
      }));
      return;
    }

    // Get current phase index or default to 0
    const currentPhaseIndex = gameState.currentPhaseIndex || 0;
    const maxPhases = gameState.turnPhases?.length || 5;

    // Advance to next phase, wrapping around
    gameState.currentPhaseIndex = (currentPhaseIndex + 1) % maxPhases;

    broadcastToGame(gameId, gameState);
    logger.info(`Phase advanced to ${gameState.currentPhaseIndex} in game ${gameId}`);
  } catch (error) {
    logger.error('Failed to advance phase:', error);
  }
}

/**
 * Handle PREV_PHASE message
 * Goes back to the previous turn phase
 */
export function handlePrevPhase(ws, data) {
  try {
    const { gameId } = data;
    const gameState = getGameState(gameId);

    if (!gameState) {
      ws.send(JSON.stringify({
        type: 'ERROR',
        message: 'Game not found'
      }));
      return;
    }

    if (!gameState.isGameStarted) {
      ws.send(JSON.stringify({
        type: 'ERROR',
        message: 'Game has not started'
      }));
      return;
    }

    // Get current phase index or default to 0
    const currentPhaseIndex = gameState.currentPhaseIndex || 0;
    const maxPhases = gameState.turnPhases?.length || 5;

    // Go to previous phase, wrapping around
    gameState.currentPhaseIndex = (currentPhaseIndex - 1 + maxPhases) % maxPhases;

    broadcastToGame(gameId, gameState);
    logger.info(`Phase retreated to ${gameState.currentPhaseIndex} in game ${gameId}`);
  } catch (error) {
    logger.error('Failed to retreat phase:', error);
  }
}

/**
 * Handle SET_PHASE message
 * Sets the turn phase to a specific index
 */
export function handleSetPhase(ws, data) {
  try {
    const { gameId, phaseIndex } = data;
    const gameState = getGameState(gameId);

    if (!gameState) {
      ws.send(JSON.stringify({
        type: 'ERROR',
        message: 'Game not found'
      }));
      return;
    }

    if (!gameState.isGameStarted) {
      ws.send(JSON.stringify({
        type: 'ERROR',
        message: 'Game has not started'
      }));
      return;
    }

    const maxPhases = gameState.turnPhases?.length || 5;

    if (phaseIndex < 0 || phaseIndex >= maxPhases) {
      ws.send(JSON.stringify({
        type: 'ERROR',
        message: `Invalid phase index. Must be between 0 and ${maxPhases - 1}`
      }));
      return;
    }

    gameState.currentPhaseIndex = phaseIndex;
    broadcastToGame(gameId, gameState);
    logger.info(`Phase set to ${phaseIndex} in game ${gameId}`);
  } catch (error) {
    logger.error('Failed to set phase:', error);
  }
}
