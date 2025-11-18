/**
 * @file Renders the UI panel for a single player, including their hand, deck, and controls.
 */

// FIX: Corrected a typo in the import statement. `in` was replaced with `{ ... }` to properly import React hooks.
import React, { useState, useRef, useEffect, useMemo } from 'react';
import type { Player, DragItem, DropTarget, DeckType, PlayerColor, CustomDeckFile, Card } from '../types';
import { DeckType as DeckTypeEnum } from '../types';
import { PLAYER_POSITIONS, PLAYER_COLOR_NAMES, PLAYER_COLORS } from '../constants';
import { getSelectableDecks, getCardDefinition } from '../decks';
import { Card as CardComponent } from './Card';

/**
 * Props for the PlayerPanel component.
 */
interface PlayerPanelProps {
  player: Player;
  isLocalPlayer: boolean;
  localPlayerId: number | null;
  isSpectator: boolean;
  isGameStarted: boolean;
  position: number;
  onNameChange: (name: string) => void;
  onColorChange: (color: PlayerColor) => void;
  onScoreChange: (delta: number) => void;
  onDeckChange: (deckType: DeckType) => void;
  onLoadCustomDeck: (deckFile: CustomDeckFile) => void;
  onDrawCard: () => void;
  handleDrop: (item: DragItem, target: DropTarget) => void;
  draggedItem: DragItem | null;
  setDraggedItem: (item: DragItem | null) => void;
  openContextMenu: (e: React.MouseEvent, type: 'handCard' | 'deckPile' | 'discardPile' | 'announcedCard', data: any) => void;
  onHandCardDoubleClick: (player: Player, card: Card, cardIndex: number) => void;
  playerColorMap: Map<number, PlayerColor>;
  allPlayers: Player[];
  localPlayerTeamId?: number;
  activeTurnPlayerId?: number;
  onToggleActiveTurn: (playerId: number) => void;
}

/**
 * A generic component that acts as a target for drag-and-drop operations.
 * @param {object} props The properties for the component.
 * @returns {React.ReactElement} The rendered drop zone.
 */
const DropZone: React.FC<{
    onDrop: () => void;
    children: React.ReactNode;
    className?: string;
    isOverClassName?: string;
    onContextMenu?: (e: React.MouseEvent) => void;
}> = ({ onDrop, children, className, isOverClassName = 'bg-indigo-500', onContextMenu }) => {
    const [isOver, setIsOver] = useState(false);

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsOver(true);
    };

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        setIsOver(false);
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsOver(false);
        onDrop();
    };

    return (
        <div 
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onContextMenu={onContextMenu}
            className={`${className} transition-colors ${isOver ? isOverClassName : ''}`}
            data-interactive={!!onContextMenu}
        >
            {children}
        </div>
    );
};

/**
 * Displays all information and interactive elements for a single player.
 * @param {PlayerPanelProps} props The properties for the component.
 * @returns {React.ReactElement} A player's control panel.
 */
export const PlayerPanel: React.FC<PlayerPanelProps> = ({
  player,
  isLocalPlayer,
  localPlayerId,
  isSpectator,
  isGameStarted,
  position,
  onNameChange,
  onColorChange,
  onScoreChange,
  onDeckChange,
  onLoadCustomDeck,
  onDrawCard,
  handleDrop,
  draggedItem,
  setDraggedItem,
  openContextMenu,
  onHandCardDoubleClick,
  playerColorMap,
  allPlayers,
  localPlayerTeamId,
  activeTurnPlayerId,
  onToggleActiveTurn,
}) => {
  const positionClass = PLAYER_POSITIONS[position] || 'top-2 left-2';
  const isDisconnected = !!player.isDisconnected;
  const isTeammate = localPlayerTeamId !== undefined && player.teamId === localPlayerTeamId;
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Settings can be edited before the game starts. The local player can edit their
  // own panel, and any active player can edit a dummy's panel.
  const canEditSettings = !isGameStarted && !isSpectator && (isLocalPlayer || !!player.isDummy);
  
  // Defines who can interact with this player panel's cards and actions.
  const canPerformActions = !isSpectator && isGameStarted && (
    isLocalPlayer || // You can always control your own panel.
    isDisconnected || // Anyone can control a disconnected player.
    !!player.isDummy // Any real player can control a dummy player.
  );
  
  const localPlayerBorder = isLocalPlayer && !isDisconnected;
  
  const selectedColors = new Set(allPlayers.filter(p => !p.isDummy && p.id !== player.id).map(p => p.color));
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const selectableDecks = useMemo(() => getSelectableDecks(), []);

  // Effect to close the color picker when clicking outside of it.
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
            setIsColorPickerOpen(false);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
        document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [pickerRef]);
  
  const handleDeckSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const deckType = e.target.value as DeckType;
    onDeckChange(deckType);
  }

  const handleLoadDeckClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const text = e.target?.result as string;
            const data = JSON.parse(text);
            const { deckName, cards } = data;
            
            // --- Validation ---
            if (typeof deckName !== 'string' || !Array.isArray(cards)) {
                throw new Error("Invalid file structure. Must have 'deckName' (string) and 'cards' (array).");
            }

            let totalCards = 0;
            for (const card of cards) {
                if (typeof card.cardId !== 'string' || typeof card.quantity !== 'number' || card.quantity < 1 || !Number.isInteger(card.quantity)) {
                    throw new Error(`Invalid card entry: ${JSON.stringify(card)}`);
                }
                if (!getCardDefinition(card.cardId)) {
                    throw new Error(`Card with ID '${card.cardId}' does not exist.`);
                }
                totalCards += card.quantity;
            }

            if (totalCards > 100) {
                throw new Error(`Deck exceeds the 100 card limit (found ${totalCards} cards).`);
            }
            if (totalCards === 0) {
              throw new Error(`Deck cannot be empty.`);
            }

            onLoadCustomDeck(data);

        } catch (error) {
            alert(`Error loading deck: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            // Reset the input value to allow loading the same file again
            if(event.target) event.target.value = '';
        }
    };
    reader.readAsText(file);
  };
    
  const isActiveTurn = player.id === activeTurnPlayerId;
  const borderColorClass = isActiveTurn ? 'border-yellow-400' : localPlayerBorder ? 'border-indigo-500' : 'border-gray-700';

  return (
    <div className={`fixed ${positionClass} min-w-[30rem] bg-panel-bg rounded-lg shadow-2xl p-3 flex flex-col z-10 border-2 ${borderColorClass} ${isDisconnected ? 'opacity-60' : ''}`}>
      {/* Player Info and Score */}
      <div className="flex items-center justify-between mb-2 gap-3">
        <div className="flex items-center gap-2 flex-grow">
            <div className="relative" ref={pickerRef}>
                <button
                    type="button"
                    onClick={() => canEditSettings && setIsColorPickerOpen(!isColorPickerOpen)}
                    disabled={!canEditSettings}
                    className="flex items-center gap-2 bg-gray-700 p-1.5 rounded-md border border-gray-600 w-28 justify-center disabled:opacity-70 disabled:cursor-not-allowed hover:bg-gray-600"
                >
                    <div className={`w-4 h-4 rounded-full ${PLAYER_COLORS[player.color].bg} border border-white/50`}></div>
                    <span className="capitalize text-sm font-medium">{player.color}</span>
                    <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 transition-transform ${isColorPickerOpen ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                </button>
                {isColorPickerOpen && (
                    <div 
                        className="absolute top-full mt-1 w-36 bg-gray-800 border border-gray-600 rounded-md shadow-lg z-20 py-1"
                    >
                        {PLAYER_COLOR_NAMES.map(color => {
                            const isTaken = selectedColors.has(color);
                            return (
                                <button
                                    key={color}
                                    type="button"
                                    disabled={isTaken}
                                    onClick={() => {
                                        onColorChange(color);
                                        setIsColorPickerOpen(false);
                                    }}
                                    className="w-full flex items-center gap-3 px-3 py-1.5 text-sm text-left hover:bg-indigo-600 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed"
                                >
                                    <div className={`w-4 h-4 rounded-full ${PLAYER_COLORS[color].bg} border border-white/50`}></div>
                                    <span className="capitalize font-medium">{color}</span>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>
            <input
              type="text"
              value={isDisconnected ? `${player.name} (Disconnected)` : player.name}
              onChange={(e) => onNameChange(e.target.value)}
              readOnly={!canEditSettings || isDisconnected}
              className="bg-transparent font-bold text-xl p-1.5 flex-grow focus:bg-gray-800 rounded focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:cursor-default"
            />
        </div>
        <div className="flex items-center space-x-2 flex-shrink-0">
          <input
            type="checkbox"
            checked={isActiveTurn}
            onChange={() => onToggleActiveTurn(player.id)}
            disabled={!isLocalPlayer}
            className="w-5 h-5 text-yellow-400 bg-gray-700 border-gray-600 rounded focus:ring-yellow-500 focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            title="Mark as active turn"
          />
          <div className="flex items-center space-x-1">
            <button onClick={() => onScoreChange(-1)} disabled={!canPerformActions} className="bg-gray-700 w-8 h-8 rounded disabled:opacity-50 disabled:cursor-not-allowed">-</button>
            <span className="font-bold text-2xl w-10 text-center">{player.score}</span>
            <button onClick={() => onScoreChange(1)} disabled={!canPerformActions} className="bg-gray-700 w-8 h-8 rounded disabled:opacity-50 disabled:cursor-not-allowed">+</button>
          </div>
        </div>
      </div>
      
      {/* Deck Selector */}
      <div className="mb-3 flex items-center space-x-2">
         <select
            value={player.selectedDeck}
            onChange={handleDeckSelectChange}
            disabled={!canEditSettings}
            className="bg-gray-700 border border-gray-600 text-white text-base rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-full p-2 disabled:opacity-70 disabled:cursor-not-allowed"
         >
            {player.selectedDeck === DeckTypeEnum.Custom && (
                <option value={DeckTypeEnum.Custom}>Custom Deck</option>
            )}
            {selectableDecks.map(deck => <option key={deck.id} value={deck.id}>{deck.name}</option>)}
         </select>
         <input type="file" ref={fileInputRef} onChange={handleFileSelected} accept=".json" style={{ display: 'none' }} />
         <button 
          onClick={handleLoadDeckClick}
          disabled={!canEditSettings}
          title="Load Custom Deck"
          className="bg-gray-600 hover:bg-gray-500 text-white font-bold p-2 rounded disabled:opacity-70 disabled:cursor-not-allowed"
         >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
         </button>
      </div>

      <div className="flex-grow flex space-x-3">
        {/* Left side: Deck and Discard Piles */}
        <div className="flex flex-col w-28 space-y-2">
          <DropZone onDrop={() => draggedItem && handleDrop(draggedItem, {target: 'deck', playerId: player.id})} onContextMenu={(e) => canPerformActions && openContextMenu(e, 'deckPile', { player })}>
            <div onClick={canPerformActions ? onDrawCard : undefined} className={`relative w-28 h-28 bg-card-back rounded-md flex items-center justify-center text-center text-sm p-1 ${canPerformActions ? 'cursor-pointer hover:ring-2 ring-indigo-400' : 'cursor-not-allowed'}`}>
              DECK <br/> ({player.deck.length})
            </div>
          </DropZone>
          <DropZone
            onDrop={() => {
                if (draggedItem) { // Anyone can discard to a dummy's pile
                    handleDrop(draggedItem, { target: 'discard', playerId: player.id });
                }
            }}
            onContextMenu={(e) => canPerformActions && openContextMenu(e, 'discardPile', { player })}
            className={`relative w-28 h-28 bg-gray-700 rounded-md flex items-center justify-center text-center text-sm p-1 ${canPerformActions ? 'cursor-pointer' : ''}`}
            isOverClassName="bg-indigo-600 ring-2 ring-indigo-400"
          >
            DISCARD <br/> ({player.discard.length})
          </DropZone>
          <div className="relative w-28 h-28">
            <DropZone
                onDrop={() => draggedItem && handleDrop(draggedItem, {target: 'announced', playerId: player.id})}
                className="w-full h-full bg-gray-700 rounded-md flex items-center justify-center text-center text-xs p-1"
                isOverClassName="bg-indigo-600 ring-2 ring-indigo-400"
            >
                {!player.announcedCard && (<span>Showcase</span>)}
                {player.announcedCard && (
                    <div 
                        draggable={canPerformActions}
                        onDragStart={() => canPerformActions && setDraggedItem({ card: player.announcedCard!, source: 'announced', playerId: player.id })}
                        onDragEnd={() => setDraggedItem(null)}
                        onContextMenu={(e) => canPerformActions && openContextMenu(e, 'announcedCard', { card: player.announcedCard, player })}
                        className="w-full h-full"
                        data-interactive="true"
                    >
                        <CardComponent card={player.announcedCard} isFaceUp={true} playerColorMap={playerColorMap} localPlayerId={localPlayerId} />
                    </div>
                )}
            </DropZone>
          </div>
        </div>
        
        {/* Right side: Hand */}
        <DropZone onDrop={() => draggedItem && handleDrop(draggedItem, {target: 'hand', playerId: player.id})} className="flex-grow bg-gray-800 rounded-lg p-2 min-h-[16rem] max-h-[22.25rem] overflow-y-auto" isOverClassName="bg-gray-900 ring-2 ring-indigo-400">
          <div className="grid grid-cols-3 gap-0.5">
            {player.hand.map((card, index) => (
              <div 
                key={`${card.id}-${index}`}
                className="w-28 h-28"
                draggable={canPerformActions}
                onDragStart={() => canPerformActions && setDraggedItem({
                    card,
                    source: 'hand',
                    playerId: player.id,
                    cardIndex: index
                })}
                onDragEnd={() => setDraggedItem(null)}
                onContextMenu={(e) => {
                    // Allow context menu for any active player (non-spectator) after game starts.
                    // This enables the "Request Reveal" feature on opponent cards.
                    if (localPlayerId !== null && isGameStarted) {
                        openContextMenu(e, 'handCard', { card, player, cardIndex: index });
                    }
                }}
                onDoubleClick={() => onHandCardDoubleClick(player, card, index)}
                data-interactive="true"
              >
                  <CardComponent
                      card={card}
                      isFaceUp={(() => {
                        const isRevealedToAll = card.revealedTo === 'all';
                        const isRevealedToMe = localPlayerId !== null && Array.isArray(card.revealedTo) && card.revealedTo.includes(localPlayerId);
                        const isRevealedByRequest = localPlayerId !== null && card.statuses?.some(s => s.type === 'Revealed' && s.addedByPlayerId === localPlayerId);

                        return isLocalPlayer || isTeammate || !!player.isDummy || isDisconnected || isRevealedToAll || isRevealedToMe || isRevealedByRequest;
                      })()}
                      playerColorMap={playerColorMap}
                      localPlayerId={localPlayerId}
                  />
              </div>
            ))}
          </div>
        </DropZone>
      </div>
    </div>
  );
};