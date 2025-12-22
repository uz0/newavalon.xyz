/**
 * @file Content management service for cards, tokens, and decks
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../utils/logger.js';
import { CONFIG } from '../utils/config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// In-memory storage for content
let cardDatabase = {};
let tokenDatabase = {};
let deckFiles = [];
let countersDatabase = {};

/**
 * Initialize content database from JSON file
 */
export async function initializeContent() {
  try {
    const contentPath = path.join(__dirname, '../../client/content/contentDatabase.json');

    if (!fs.existsSync(contentPath)) {
      throw new Error(`Content database not found at ${contentPath}`);
    }

    const rawData = fs.readFileSync(contentPath, 'utf8');
    const data = JSON.parse(rawData);

    cardDatabase = data.cards || {};
    tokenDatabase = data.tokens || {};
    deckFiles = data.deckFiles || [];
    countersDatabase = data.counters || {};

    logger.info(`Loaded content: ${Object.keys(cardDatabase).length} cards, ${Object.keys(tokenDatabase).length} tokens, ${deckFiles.length} deck files`);
  } catch (error) {
    logger.error('Failed to initialize content database', error);
    throw error;
  }
}

/**
 * Get card definition by ID
 */
export function getCardDefinition(cardId) {
  return cardDatabase[cardId] || null;
}

/**
 * Get token definition by ID
 */
export function getTokenDefinition(tokenId) {
  return tokenDatabase[tokenId] || null;
}

/**
 * Get counter definition by ID
 */
export function getCounterDefinition(counterId) {
  return countersDatabase[counterId] || null;
}

/**
 * Get all available deck files
 */
export function getDeckFiles() {
  return deckFiles;
}

/**
 * Update content database (for development/hot reload)
 */
export async function updateContent(newContent) {
  try {
    cardDatabase = newContent.cards || {};
    tokenDatabase = newContent.tokens || {};
    deckFiles = newContent.deckFiles || [];
    countersDatabase = newContent.counters || {};

    logger.info('Content database updated');
  } catch (error) {
    logger.error('Failed to update content database', error);
    throw error;
  }
}

/**
 * Get all cards (for API endpoints)
 */
export function getAllCards() {
  return cardDatabase;
}

/**
 * Get all tokens (for API endpoints)
 */
export function getAllTokens() {
  return tokenDatabase;
}

/**
 * Get all counters (for API endpoints)
 */
export function getAllCounters() {
  return countersDatabase;
}

/**
 * Set card database (for deck data updates)
 */
export function setCardDatabase(cards) {
  cardDatabase = cards;
}

/**
 * Set token database (for deck data updates)
 */
export function setTokenDatabase(tokens) {
  tokenDatabase = tokens;
}

/**
 * Set deck files (for deck data updates)
 */
export function setDeckFiles(decks) {
  deckFiles = decks;
}