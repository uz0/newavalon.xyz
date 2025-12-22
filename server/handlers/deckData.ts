/**
 * @file Deck data handler
 * Handles deck content updates from the host
 */

import { logger } from '../utils/logger.js';
import { sanitizeString } from '../utils/security.js';
import { setCardDatabase, setTokenDatabase, setDeckFiles } from '../services/content.js';

/**
 * Handle UPDATE_DECK_DATA message
 * Updates the card/token database from the host
 */
export function handleUpdateDeckData(ws, data) {
  try {
    // SECURITY: Only allow host (player 1) to update deck data
    if (ws.playerId !== 1) {
      ws.send(JSON.stringify({
        type: 'ERROR',
        message: 'Unauthorized: Only host can update deck data'
      }));
      logger.warn(`Non-host player ${ws.playerId} attempted to update deck data`);
      return;
    }

    const { deckData } = data;

    // Validate deck data structure
    if (!deckData || typeof deckData !== 'object') {
      ws.send(JSON.stringify({
        type: 'ERROR',
        message: 'Invalid deck data format'
      }));
      return;
    }

    // Validate deck data size (5MB limit)
    const deckDataSize = JSON.stringify(deckData).length;
    if (deckDataSize > 5 * 1024 * 1024) {
      ws.send(JSON.stringify({
        type: 'ERROR',
        message: 'Deck data too large'
      }));
      logger.warn(`Deck data too large: ${deckDataSize} bytes`);
      return;
    }

    // Sanitize and validate card database
    const sanitizedCardDatabase: Record<string, any> = {};
    if (deckData.cardDatabase && typeof deckData.cardDatabase === 'object') {
      for (const [cardId, card] of Object.entries(deckData.cardDatabase)) {
        const cardObj = card as any;
        if (typeof card === 'object' && card && cardObj.id && cardObj.name) {
          sanitizedCardDatabase[cardId] = {
            id: sanitizeString(String(cardObj.id)),
            name: sanitizeString(String(cardObj.name)),
            ...(cardObj.cost !== undefined && { cost: Number(cardObj.cost) || 0 }),
            ...(cardObj.attack !== undefined && { attack: Number(cardObj.attack) || 0 }),
            ...(cardObj.health !== undefined && { health: Number(cardObj.health) || 0 }),
            ...(cardObj.text && { text: sanitizeString(String(cardObj.text), 1000) }),
            ...(cardObj.image && { image: sanitizeString(String(cardObj.image), 500) })
          };
        }
      }
    }

    // Validate deck files array
    const sanitizedDeckFiles = Array.isArray(deckData.deckFiles)
      ? deckData.deckFiles.filter(deck => {
          const deckObj = deck as any;
          if (!deck || typeof deck !== 'object') return false;
          return deckObj.id && deckObj.name && typeof deckObj.id === 'string' && typeof deckObj.name === 'string';
        }).map(deck => {
          const deckObj = deck as any;
          return {
            id: sanitizeString(String(deckObj.id), 50),
            name: sanitizeString(String(deckObj.name), 100),
            ...(deckObj.isSelectable !== undefined && { isSelectable: Boolean(deckObj.isSelectable) }),
            ...(deckObj.cards && Array.isArray(deckObj.cards) && { cards: deckObj.cards })
          };
        })
      : [];

    logger.info(`Deck data updated by host: ${Object.keys(sanitizedCardDatabase).length} cards, ${sanitizedDeckFiles.length} decks`);

    // Update the content services
    setCardDatabase(sanitizedCardDatabase);
    setTokenDatabase(deckData.tokenDatabase || {});
    setDeckFiles(sanitizedDeckFiles);

    // Send confirmation
    ws.send(JSON.stringify({
      type: 'DECK_DATA_UPDATED',
      success: true
    }));

  } catch (error) {
    logger.error('Failed to update deck data:', error);
    ws.send(JSON.stringify({
      type: 'ERROR',
      message: 'Failed to update deck data'
    }));
  }
}
