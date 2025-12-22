/**
 * @file Ready check handlers
 * Manages the ready check phase before game starts
 */

import { logger } from '../utils/logger.js';
import { getGameState } from '../services/gameState.js';
import { broadcastToGame } from '../services/websocket.js';

/**
 * Handle START_READY_CHECK message
 * Activates ready check phase and resets all player ready states
 */
export function handleStartReadyCheck(ws, data) {
  try {
    const gameState = getGameState(data.gameId);
    if (!gameState) {
      ws.send(JSON.stringify({
        type: 'ERROR',
        message: 'Game not found'
      }));
      return;
    }

    if (gameState.isGameStarted) {
      ws.send(JSON.stringify({
        type: 'ERROR',
        message: 'Game already started'
      }));
      return;
    }

    // Reset all ready statuses
    gameState.players.forEach(p => p.isReady = false);
    gameState.isReadyCheckActive = true;

    broadcastToGame(data.gameId, gameState);
    logger.info(`Ready check started for game ${data.gameId}`);
  } catch (error) {
    logger.error('Failed to start ready check:', error);
  }
}

/**
 * Handle CANCEL_READY_CHECK message
 * Deactivates ready check phase
 */
export function handleCancelReadyCheck(ws, data) {
  try {
    const gameState = getGameState(data.gameId);
    if (!gameState) {
      ws.send(JSON.stringify({
        type: 'ERROR',
        message: 'Game not found'
      }));
      return;
    }

    if (!gameState.isReadyCheckActive) {
      return; // Already not in ready check
    }

    // Deactivate ready check and reset all ready states
    gameState.isReadyCheckActive = false;
    gameState.players.forEach(p => p.isReady = false);

    broadcastToGame(data.gameId, gameState);
    logger.info(`Ready check cancelled for game ${data.gameId}`);
  } catch (error) {
    logger.error('Failed to cancel ready check:', error);
  }
}

/**
 * Handle PLAYER_READY message
 * Marks a player as ready and checks if all players are ready
 */
export function handlePlayerReady(ws, data) {
  try {
    const gameState = getGameState(data.gameId);
    if (!gameState) {
      ws.send(JSON.stringify({
        type: 'ERROR',
        message: 'Game not found'
      }));
      return;
    }

    if (!gameState.isReadyCheckActive) {
      ws.send(JSON.stringify({
        type: 'ERROR',
        message: 'No active ready check'
      }));
      return;
    }

    if (gameState.isGameStarted) {
      return; // Game already started
    }

    // Mark player as ready
    const player = gameState.players.find(p => p.id === data.playerId);
    if (player) {
      player.isReady = true;
      logger.info(`Player ${data.playerId} marked as ready in game ${data.gameId}`);
    }

    // Check if all non-dummy, connected players are ready
    const activePlayers = gameState.players.filter(p => !p.isDummy && !p.isDisconnected);
    const allReady = activePlayers.length > 0 && activePlayers.every(p => p.isReady);

    if (allReady && activePlayers.length >= 1) {
      // All players ready - start the game!
      gameState.isReadyCheckActive = false;
      gameState.isGameStarted = true;
      gameState.startingPlayerId = activePlayers[0].id;
      gameState.activeTurnPlayerId = activePlayers[0].id;

      // Deal initial cards (5 cards each)
      gameState.players.forEach(p => {
        if (!p.isDummy) {
          const handCards = p.deck.splice(0, 5);
          p.hand.push(...handCards);
        }
      });

      logger.info(`All players ready! Starting game ${data.gameId}`);
    }

    broadcastToGame(data.gameId, gameState);
  } catch (error) {
    logger.error('Failed to mark player as ready:', error);
  }
}
