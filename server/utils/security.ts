/**
 * @file Security utilities for input sanitization and validation
 */

import { CONFIG } from './config.js';

/**
 * Sanitize string input
 */
export function sanitizeString(input, maxLength = CONFIG.MAX_STRING_LENGTH) {
  if (typeof input !== 'string') return '';

  return input
    .replace(/[<>"'&]/g, '') // Remove HTML special chars
    .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
    .substring(0, maxLength);
}

/**
 * Sanitize player name
 */
export function sanitizePlayerName(name) {
  const sanitized = sanitizeString(name, 20);
  // Remove leading/trailing whitespace and collapse multiple spaces
  return sanitized.trim().replace(/\s+/g, ' ') || 'Anonymous';
}

/**
 * Validate game state size
 */
export function validateGameStateSize(gameState) {
  const size = JSON.stringify(gameState).length;
  return size <= CONFIG.MAX_GAME_STATE_SIZE;
}

/**
 * Check if message size is within limits
 */
export function validateMessageSize(message) {
  return message.length <= CONFIG.MAX_MESSAGE_SIZE;
}

/**
 * Generate secure game ID
 */
export function generateSecureGameId() {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${timestamp}_${random}`.toUpperCase();
}