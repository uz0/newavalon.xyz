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
        if (typeof card === 'object' && card && cardObj.name) {
          // Card ID is the key, not a property
          sanitizedCardDatabase[cardId] = {
            name: sanitizeString(String(cardObj.name)),
            ...(cardObj.imageUrl && { imageUrl: sanitizeString(String(cardObj.imageUrl), 500) }),
            ...(cardObj.fallbackImage && { fallbackImage: sanitizeString(String(cardObj.fallbackImage), 500) }),
            ...(cardObj.power !== undefined && { power: Number(cardObj.power) || 0 }),
            ...(cardObj.ability && { ability: sanitizeString(String(cardObj.ability), 2000) }),
            ...(cardObj.flavorText && { flavorText: sanitizeString(String(cardObj.flavorText), 500) }),
            ...(cardObj.color && { color: sanitizeString(String(cardObj.color), 50) }),
            ...(cardObj.types && Array.isArray(cardObj.types) && { types: cardObj.types.map(t => sanitizeString(String(t), 50)) }),
            ...(cardObj.faction && { faction: sanitizeString(String(cardObj.faction), 50) }),
            ...(cardObj.allowedPanels && Array.isArray(cardObj.allowedPanels) && { allowedPanels: cardObj.allowedPanels.map(p => sanitizeString(String(p), 50)) }),
          };
        }
      }
    }

    // Validate and sanitize deck files array
    const sanitizedDeckFiles = Array.isArray(deckData.deckFiles)
      ? deckData.deckFiles.filter(deck => {
          const deckObj = deck as any;
          if (!deck || typeof deck !== 'object') return false;
          return deckObj.id && deckObj.name && typeof deckObj.id === 'string' && typeof deckObj.name === 'string';
        }).map(deck => {
          const deckObj = deck as any;
          const sanitizedDeck: any = {
            id: sanitizeString(String(deckObj.id), 50),
            name: sanitizeString(String(deckObj.name), 100),
            ...(deckObj.isSelectable !== undefined && { isSelectable: Boolean(deckObj.isSelectable) })
          };

          // Validate and sanitize cards array if present
          if (deckObj.cards && Array.isArray(deckObj.cards)) {
            const sanitizedCards = deckObj.cards
              .filter((card: any) => card && typeof card === 'object' && typeof card.id === 'string')
              .map((card: any) => ({
                id: sanitizeString(String(card.id), 50),
                count: Math.max(0, Math.min(99, Number(card.count) || 1))
              }));

            if (sanitizedCards.length > 0) {
              sanitizedDeck.cards = sanitizedCards;
            }
          }

          return sanitizedDeck;
        })
      : [];

    logger.info(`Deck data updated by host: ${Object.keys(sanitizedCardDatabase).length} cards, ${sanitizedDeckFiles.length} decks`);

    // Sanitize token database
    const sanitizedTokenDatabase: Record<string, any> = {};
    if (deckData.tokenDatabase && typeof deckData.tokenDatabase === 'object') {
      for (const [tokenId, token] of Object.entries(deckData.tokenDatabase)) {
        const tokenObj = token as any;
        if (typeof token === 'object' && token && tokenObj.name) {
          // Token ID is the key, not a property
          sanitizedTokenDatabase[tokenId] = {
            name: sanitizeString(String(tokenObj.name)),
            ...(tokenObj.imageUrl && { imageUrl: sanitizeString(String(tokenObj.imageUrl), 500) }),
            ...(tokenObj.fallbackImage && { fallbackImage: sanitizeString(String(tokenObj.fallbackImage), 500) }),
            ...(tokenObj.power !== undefined && { power: Number(tokenObj.power) || 0 }),
            ...(tokenObj.ability && { ability: sanitizeString(String(tokenObj.ability), 2000) }),
            ...(tokenObj.flavorText && { flavorText: sanitizeString(String(tokenObj.flavorText), 500) }),
            ...(tokenObj.color && { color: sanitizeString(String(tokenObj.color), 50) }),
            ...(tokenObj.types && Array.isArray(tokenObj.types) && { types: tokenObj.types.map(t => sanitizeString(String(t), 50)) }),
            ...(tokenObj.allowedPanels && Array.isArray(tokenObj.allowedPanels) && { allowedPanels: tokenObj.allowedPanels.map(p => sanitizeString(String(p), 50)) }),
          };
        }
      }
    }

    // Update the content services
    setCardDatabase(sanitizedCardDatabase);
    setTokenDatabase(sanitizedTokenDatabase);
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
