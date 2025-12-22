/**
 * @file Game state management service
 */

import { logger } from '../utils/logger.js';
import { CONFIG } from '../utils/config.js';
import { validateGameStateSize } from '../utils/security.js';

// In-memory storage for game states
const gameStates = new Map(); // gameId -> gameState
const clientGameMap = new Map(); // ws_client -> gameId
const gameLogs = new Map(); // gameId -> string[]
const gameTerminationTimers = new Map(); // gameId -> NodeJS.Timeout
const gameInactivityTimers = new Map(); // gameId -> NodeJS.Timeout
const playerDisconnectTimers = new Map(); // Key: `${gameId}-${playerId}` -> NodeJS.Timeout

/**
 * Create new game state
 */
export function createGameState(gameId: string, options: any = {}) {
  const gameState: any = {
    id: gameId,
    players: [],
    board: Array(8).fill(null).map(() => Array(8).fill(null)),
    isGameStarted: false,
    activeTurnPlayerId: null,
    currentPhase: 0,
    turnNumber: 1,
    currentRound: 1,
    isPrivate: (options && options.isPrivate) || false,
    gameMode: (options && options.gameMode) || 'skirmish',
    activeGridSize: { rows: 8, cols: 8 },
    isReadyCheckActive: false,
    created: Date.now(),
    lastActivity: Date.now(),
    ...options
  };

  gameStates.set(gameId, gameState);
  gameLogs.set(gameId, []);

  logger.info(`Created game ${gameId}`);
  return gameState;
}

/**
 * Get game state by ID
 */
export function getGameState(gameId) {
  return gameStates.get(gameId);
}

/**
 * Update game state
 */
export function updateGameState(gameId, updates) {
  const gameState = gameStates.get(gameId);
  if (!gameState) {
    throw new Error(`Game ${gameId} not found`);
  }

  const updatedState = { ...gameState, ...updates, lastActivity: Date.now() };

  if (!validateGameStateSize(updatedState)) {
    throw new Error('Game state size exceeds limit');
  }

  gameStates.set(gameId, updatedState);
  return updatedState;
}

/**
 * Delete game state
 */
export function deleteGameState(gameId) {
  const gameState = gameStates.get(gameId);
  if (gameState) {
    // Clear all timers
    clearGameTimers(gameId);

    gameStates.delete(gameId);
    gameLogs.delete(gameId);

    // Remove client mappings
    for (const [client, clientGameId] of clientGameMap.entries()) {
      if (clientGameId === gameId) {
        clientGameMap.delete(client);
      }
    }

    logger.info(`Deleted game ${gameId}`);
  }
}

/**
 * Add player to game
 */
export function addPlayerToGame(gameId, player) {
  const gameState = gameStates.get(gameId);
  if (!gameState) {
    throw new Error(`Game ${gameId} not found`);
  }

  if (gameState.players.length >= CONFIG.MAX_PLAYERS) {
    throw new Error('Game is full');
  }

  const existingPlayer = gameState.players.find(p => p.name === player.name);
  if (existingPlayer) {
    throw new Error('Player name already taken');
  }

  gameState.players.push(player);
  updateGameState(gameId, { players: gameState.players });

  logGameAction(gameId, `Player ${player.name} joined`);
  return player;
}

/**
 * Remove player from game
 */
export function removePlayerFromGame(gameId, playerId) {
  const gameState = gameStates.get(gameId);
  if (!gameState) {
    throw new Error(`Game ${gameId} not found`);
  }

  const playerIndex = gameState.players.findIndex(p => p.id === playerId);
  if (playerIndex === -1) {
    throw new Error('Player not found in game');
  }

  const [removedPlayer] = gameState.players.splice(playerIndex, 1);
  updateGameState(gameId, { players: gameState.players });

  logGameAction(gameId, `Player ${removedPlayer.name} left`);
  return removedPlayer;
}

/**
 * Get all game states
 */
export function getAllGameStates() {
  return Array.from(gameStates.values());
}

/**
 * Get public games list
 */
export function getPublicGames() {
  return Array.from(gameStates.values())
    .filter(game => !game.isPrivate)
    .map(game => ({
      gameId: game.id,
      playerCount: game.players.length,
      maxPlayers: CONFIG.MAX_PLAYERS,
      isGameStarted: game.isGameStarted,
      gameMode: game.gameMode
    }));
}

/**
 * Associate client with game
 */
export function associateClientWithGame(client, gameId) {
  clientGameMap.set(client, gameId);
}

/**
 * Get game ID for client
 */
export function getGameIdForClient(client) {
  return clientGameMap.get(client);
}

/**
 * Remove client association
 */
export function removeClientAssociation(client) {
  clientGameMap.delete(client);
}

/**
 * Get client game map (for broadcasting)
 */
export function getClientGameMap() {
  return clientGameMap;
}

/**
 * Log game action
 */
export function logGameAction(gameId, action) {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${action}`;

  const logs = gameLogs.get(gameId) || [];
  logs.push(logEntry);
  gameLogs.set(gameId, logs);

  // Keep only last 1000 log entries
  if (logs.length > 1000) {
    gameLogs.set(gameId, logs.slice(-1000));
  }
}

/**
 * Get game logs
 */
export function getGameLogs(gameId) {
  return gameLogs.get(gameId) || [];
}

/**
 * Clear game timers
 */
export function clearGameTimers(gameId) {
  const timers = [
    gameTerminationTimers.get(gameId),
    gameInactivityTimers.get(gameId),
    playerDisconnectTimers.get(`${gameId}-disconnect`)
  ].filter(Boolean);

  timers.forEach(timer => clearTimeout(timer));

  gameTerminationTimers.delete(gameId);
  gameInactivityTimers.delete(gameId);

  // Clear all player disconnect timers for this game
  for (const [key, timer] of playerDisconnectTimers.entries()) {
    if (key.startsWith(`${gameId}-`)) {
      clearTimeout(timer);
      playerDisconnectTimers.delete(key);
    }
  }
}

/**
 * Get game statistics
 */
export function getGameStats() {
  const activeGames = gameStates.size;
  const totalPlayers = Array.from(gameStates.values())
    .reduce((sum, game) => sum + game.players.length, 0);

  return {
    activeGames,
    totalPlayers,
    maxGames: CONFIG.MAX_ACTIVE_GAMES
  };
}