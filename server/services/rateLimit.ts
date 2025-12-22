/**
 * @file Rate limiting service for DoS protection
 */

import { CONFIG } from '../utils/config.js';
import { logger } from '../utils/logger.js';

// Rate limiting maps
const messageCounts = new Map(); // Connection -> [timestamps]

/**
 * Check if connection is rate limited
 */
export function isRateLimited(client) {
  const now = Date.now();
  const timestamps = messageCounts.get(client) || [];

  // Remove old timestamps outside the window
  const validTimestamps = timestamps.filter(
    timestamp => now - timestamp < CONFIG.RATE_LIMIT_WINDOW
  );

  // Check if limit exceeded (allow 60 messages per minute)
  const MESSAGE_LIMIT = 60;
  if (validTimestamps.length >= MESSAGE_LIMIT) {
    logger.warn(`Rate limit exceeded for connection`);
    return true;
  }

  // Update timestamps
  validTimestamps.push(now);
  messageCounts.set(client, validTimestamps);

  return false;
}

/**
 * Clean up rate limiting data for disconnected client
 */
export function cleanupRateLimitData(client) {
  messageCounts.delete(client);
}

/**
 * Get rate limit status for connection
 */
export function getRateLimitStatus(client) {
  const timestamps = messageCounts.get(client) || [];
  const now = Date.now();

  const validTimestamps = timestamps.filter(
    timestamp => now - timestamp < CONFIG.RATE_LIMIT_WINDOW
  );

  return {
    currentCount: validTimestamps.length,
    windowStart: validTimestamps[0] || now,
    isLimited: validTimestamps.length >= 60
  };
}