/**
 * @file Visual effects handlers
 * Handles triggering visual effects on clients
 */

import { logger } from '../utils/logger.js';
import { getGameState, getGameIdForClient } from '../services/gameState.js';

/**
 * Handle TRIGGER_HIGHLIGHT message
 * Broadcasts a highlight effect to all clients in the game
 */
export function handleTriggerHighlight(ws, data) {
  try {
    const { gameId, highlightData } = data;
    const gameState = getGameState(gameId);

    if (!gameState) {
      ws.send(JSON.stringify({
        type: 'ERROR',
        message: 'Game not found'
      }));
      return;
    }

    // Broadcast the highlight event to all clients in the game
    const highlightMessage = JSON.stringify({
      type: 'HIGHLIGHT_TRIGGERED',
      highlightData
    });

    gameState.players.forEach(player => {
      if (player.ws && player.ws.readyState === 1) {
        player.ws.send(highlightMessage);
      }
    });

    logger.debug(`Highlight triggered in game ${gameId}`);
  } catch (error) {
    logger.error('Failed to trigger highlight:', error);
  }
}

/**
 * Handle TRIGGER_NO_TARGET message
 * Broadcasts a "no target" overlay to all clients in the game
 */
export function handleTriggerNoTarget(ws, data) {
  try {
    const { gameId, coords, timestamp } = data;
    const gameState = getGameState(gameId);

    if (!gameState) {
      ws.send(JSON.stringify({
        type: 'ERROR',
        message: 'Game not found'
      }));
      return;
    }

    // Broadcast the no-target event to all clients in the game
    const message = JSON.stringify({
      type: 'NO_TARGET_TRIGGERED',
      coords,
      timestamp
    });

    gameState.players.forEach(player => {
      if (player.ws && player.ws.readyState === 1) {
        player.ws.send(message);
      }
    });

    logger.debug(`No target overlay triggered in game ${gameId}`);
  } catch (error) {
    logger.error('Failed to trigger no target overlay:', error);
  }
}

/**
 * Handle TRIGGER_FLOATING_TEXT message
 * Broadcasts a floating text effect to all clients in the game
 */
export function handleTriggerFloatingText(ws, data) {
  try {
    const { gameId, floatingTextData } = data;
    const gameState = getGameState(gameId);

    if (!gameState) {
      ws.send(JSON.stringify({
        type: 'ERROR',
        message: 'Game not found'
      }));
      return;
    }

    // Broadcast the floating text event to all clients in the game
    const message = JSON.stringify({
      type: 'FLOATING_TEXT_TRIGGERED',
      floatingTextData
    });

    gameState.players.forEach(player => {
      if (player.ws && player.ws.readyState === 1) {
        player.ws.send(message);
      }
    });

    logger.debug(`Floating text triggered in game ${gameId}`);
  } catch (error) {
    logger.error('Failed to trigger floating text:', error);
  }
}

/**
 * Handle TRIGGER_FLOATING_TEXT_BATCH message
 * Broadcasts a batch of floating text effects to all clients in the game
 */
export function handleTriggerFloatingTextBatch(ws, data) {
  try {
    const { gameId, batch } = data;
    const gameState = getGameState(gameId);

    if (!gameState) {
      ws.send(JSON.stringify({
        type: 'ERROR',
        message: 'Game not found'
      }));
      return;
    }

    // Broadcast the floating text batch event to all clients in the game
    const message = JSON.stringify({
      type: 'FLOATING_TEXT_BATCH_TRIGGERED',
      batch
    });

    gameState.players.forEach(player => {
      if (player.ws && player.ws.readyState === 1) {
        player.ws.send(message);
      }
    });

    logger.debug(`Floating text batch triggered in game ${gameId}`);
  } catch (error) {
    logger.error('Failed to trigger floating text batch:', error);
  }
}
