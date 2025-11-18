/**
 * @file Defines the core data structures and types used throughout the application.
 */

/**
 * Enum representing the different playable deck factions.
 */
export enum DeckType {
  SynchroTech = 'SynchroTech',
  Hoods = 'Hoods',
  Optimates = 'Optimates',
  Fusion = 'Fusion',
  Command = 'Command',
  Tokens = 'Tokens',
  Custom = 'Custom',
}

/**
 * Enum for game modes.
 */
export enum GameMode {
  FreeForAll = 'FFA',
  TwoVTwo = '2v2',
  ThreeVOne = '3v1',
}

/**
 * Represents special, non-deck items like tokens or counters.
 */
export type SpecialItemType = 'counter';

/**
 * Defines the available player colors.
 */
export type PlayerColor = 'blue' | 'cyan' | 'red' | 'orange' | 'green' | 'purple' | 'pink' | 'yellow';

/**
 * Represents a single status effect applied to a card.
 */
export interface CardStatus {
  type: string;
  addedByPlayerId: number;
}


/**
 * Represents a single card, token, or counter in the game.
 */
export interface Card {
  id: string;
  deck: DeckType | SpecialItemType;
  name: string;
  imageUrl: string; // The primary Cloudinary URL.
  fallbackImage: string; // The local fallback image path.
  power: number;
  ability: string;
  flavorText?: string;
  color?: string; // Used for counters or simple tokens to define their display color.
  ownerId?: number; // Player ID of the card's original owner.
  ownerName?: string; // Display name of the card's original owner.
  statuses?: CardStatus[]; // Status effects applied to the card on the board.
  isFaceDown?: boolean; // True if the card is played face-down on the board.
  revealedTo?: 'all' | number[]; // Defines who can see this card when it's in hand or face-down.
}

/**
 * Represents a player in the game.
 */
export interface Player {
  id: number;
  name: string;
  score: number;
  hand: Card[];
  deck: Card[];
  discard: Card[];
  announcedCard?: Card | null;
  selectedDeck: DeckType;
  color: PlayerColor;
  isDummy?: boolean; // True if this is a dummy player.
  isDisconnected?: boolean; // True if the player has disconnected but can rejoin.
  playerToken?: string; // A secret token for reconnecting to this player slot.
  isReady?: boolean; // For the pre-game ready check.
  teamId?: number; // The team this player belongs to.
}

/**
 * Represents a single cell on the game board.
 */
export interface Cell {
  card: Card | null;
}

/**
 * Represents the entire game board as a 2D array of cells.
 */
export type Board = Cell[][];

/**
 * Defines the possible sizes for the active grid on the game board.
 */
export type GridSize = 4 | 5 | 6 | 7;

/**
 * Represents a unique identifier for a card's location, whether on the board or in a hand.
 */
export type CardIdentifier = {
    source: 'hand' | 'board';
    ownerId: number;
    cardIndex?: number;
    boardCoords?: { row: number, col: number };
};

/**
 * Represents a request from one player to another to reveal one or more hidden cards.
 */
export interface RevealRequest {
    fromPlayerId: number;
    toPlayerId: number;
    cardIdentifiers: CardIdentifier[];
}


/**
 * Represents the complete state of the game at any given moment.
 */
export interface GameState {
  players: Player[];
  board: Board;
  activeGridSize: GridSize;
  gameId: string | null;
  dummyPlayerCount: number;
  isGameStarted: boolean;
  gameMode: GameMode;
  isPrivate: boolean;
  isReadyCheckActive: boolean;
  revealRequests: RevealRequest[];
  activeTurnPlayerId?: number;
}

/**
 * Defines the data structure for an item being dragged.
 */
export interface DragItem {
  card: Card;
  source: 'hand' | 'board' | 'discard' | 'token_panel' | 'counter_panel' | 'deck' | 'announced';
  playerId?: number; // The ID of the player who owns the source location (hand, deck, etc.).
  boardCoords?: { row: number; col: number }; // Original coordinates if dragged from the board.
  cardIndex?: number; // Original index if dragged from an array (hand, discard, deck).
}

/**
 * Defines the data structure for a potential drop location.
 */
export interface DropTarget {
    target: 'hand' | 'board' | 'deck' | 'discard' | 'announced';
    playerId?: number; // The ID of the player who owns the target location.
    boardCoords?: { row: number; col: number }; // Target coordinates if dropping on the board.
    deckPosition?: 'top' | 'bottom'; // Target position if dropping on a deck.
}

/**
 * Represents a card entry in a custom deck file.
 */
export interface CustomDeckCard {
  cardId: string;
  quantity: number;
}

/**
 * Represents the structure of a saved custom deck file.
 */
export interface CustomDeckFile {
  deckName: string;
  cards: CustomDeckCard[];
}