/**
 * @file Renders the UI panel for a single player, including their hand, deck, and controls.
 */

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import type { Player, DragItem, DropTarget, DeckType, PlayerColor, CustomDeckFile, Card } from '../types';
import { DeckType as DeckTypeEnum } from '../types';
import { PLAYER_POSITIONS, PLAYER_COLOR_NAMES, PLAYER_COLORS, STATUS_ICONS } from '../constants';
import { getSelectableDecks } from '../contentDatabase';
import { Card as CardComponent } from './Card';
import { CardTooltipContent } from './Tooltip';

const ROUND_WIN_MEDAL_URL = "https://res.cloudinary.com/dxxh6meej/image/upload/v1764204928/medal_rgbw8d.png";

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
  imageRefreshVersion?: number;
  layoutMode?: 'standard' | 'list-local' | 'list-remote';
  onCardClick?: (player: Player, card: Card, cardIndex: number) => void;
  validHandTargets?: {playerId: number, cardIndex: number}[];
  onAnnouncedCardDoubleClick?: (player: Player, card: Card) => void;
  currentPhase?: number;
  disableActiveHighlights?: boolean;
  roundWinners?: Record<number, number[]>;
  startingPlayerId?: number;
}

/**
 * A generic component that acts as a target for drag-and-drop operations.
 */
const DropZone: React.FC<{
    onDrop: () => void;
    children: React.ReactNode;
    className?: string;
    isOverClassName?: string;
    onContextMenu?: (e: React.MouseEvent) => void;
    style?: React.CSSProperties;
}> = ({ onDrop, children, className, isOverClassName = 'bg-indigo-500', onContextMenu, style }) => {
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
            data-interactive={!!onContextMenu ? "true" : undefined}
            style={style}
        >
            {children}
        </div>
    );
};

// --- Color Picker Component (Extracted) ---
interface ColorPickerProps {
    player: Player;
    canEditSettings: boolean;
    selectedColors: Set<PlayerColor>;
    onColorChange: (color: PlayerColor) => void;
    compact?: boolean;
}

const ColorPicker: React.FC<ColorPickerProps> = ({ player, canEditSettings, selectedColors, onColorChange, compact = false }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [coords, setCoords] = useState({ top: 0, left: 0 });
    const buttonRef = useRef<HTMLButtonElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const colorKey = PLAYER_COLORS[player.color] ? player.color : 'blue';
    const colorData = PLAYER_COLORS[colorKey];

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
             const target = event.target as Node;
             if (
                 isOpen &&
                 buttonRef.current && !buttonRef.current.contains(target) &&
                 dropdownRef.current && !dropdownRef.current.contains(target)
             ) {
                 setIsOpen(false);
             }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    const toggle = () => {
        if (!canEditSettings) return;
        if (!isOpen && buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            setCoords({
                top: rect.bottom + window.scrollY + 4,
                left: rect.left + window.scrollX
            });
            setIsOpen(true);
        } else {
            setIsOpen(false);
        }
    };

    return (
        <>
            <button
                ref={buttonRef}
                type="button"
                onClick={toggle}
                disabled={!canEditSettings}
                className={`flex items-center gap-2 bg-gray-700 p-1.5 rounded-md border border-gray-600 justify-center disabled:opacity-100 disabled:cursor-default hover:bg-gray-600 ${compact ? 'px-2 py-1' : 'w-28'} flex-shrink-0`}
                title={canEditSettings ? "Change Color" : undefined}
            >
                <div className={`rounded-full ${colorData.bg} border border-white/50 ${compact ? 'w-3 h-3' : 'w-4 h-4'}`}></div>
                {!compact && <span className="capitalize font-medium truncate select-none">{colorKey}</span>}
            </button>
            {isOpen && createPortal(
                <div
                    ref={dropdownRef}
                    className="fixed bg-gray-800 border border-gray-600 rounded-md shadow-lg py-1 left-0 z-[9990]"
                    style={{ top: coords.top, left: coords.left, width: '9rem' }}
                >
                    {PLAYER_COLOR_NAMES.map(color => {
                        const isTaken = selectedColors.has(color);
                        const itemColorData = PLAYER_COLORS[color];
                        return (
                            <button
                                key={color}
                                type="button"
                                disabled={isTaken}
                                onClick={() => {
                                    onColorChange(color);
                                    setIsOpen(false);
                                }}
                                className="w-full flex items-center gap-3 px-3 py-1.5 text-sm text-left hover:bg-indigo-600 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed"
                            >
                                <div className={`w-4 h-4 rounded-full ${itemColorData.bg} border border-white/50`}></div>
                                <span className="capitalize font-medium text-white select-none">{color}</span>
                            </button>
                        );
                    })}
                </div>,
                document.body
            )}
        </>
    );
};

/**
 * Displays all information and interactive elements for a single player.
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
  imageRefreshVersion,
  layoutMode = 'standard',
  onCardClick,
  validHandTargets,
  onAnnouncedCardDoubleClick,
  currentPhase,
  disableActiveHighlights,
  roundWinners,
  startingPlayerId
}) => {
  const isDisconnected = !!player.isDisconnected;
  const isTeammate = localPlayerTeamId !== undefined && player.teamId === localPlayerTeamId;
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const canEditSettings = !isGameStarted && !isSpectator && (isLocalPlayer || !!player.isDummy);
  const canPerformActions = !isSpectator && isGameStarted && (isLocalPlayer || isDisconnected || !!player.isDummy);
  
  const localPlayerBorder = isLocalPlayer && !isDisconnected;
  const selectedColors = new Set(allPlayers.filter(p => !p.isDummy && p.id !== player.id).map(p => p.color));
  const selectableDecks = useMemo(() => getSelectableDecks(), []);
  const isActiveTurn = player.id === activeTurnPlayerId;
  
  const shouldFlashDeck = isGameStarted && currentPhase === 0 && isActiveTurn;

  const winCount = useMemo(() => {
      // roundWinners is a record of RoundNumber -> PlayerID[]. 
      // We count how many rounds this player won.
      // Flatten the values and count occurrences of player.id
      return roundWinners ? Object.values(roundWinners).flat().filter(id => id === player.id).length : 0;
  }, [roundWinners, player.id]);

  const isFirstPlayer = startingPlayerId === player.id;
  const firstPlayerIconUrl = STATUS_ICONS['LastPlayed'];

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
            onLoadCustomDeck(data);
        } catch (error) {
            alert(`Error loading deck: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            if(event.target) event.target.value = '';
        }
    };
    reader.readAsText(file);
  };
    
  if (layoutMode === 'list-remote') {
      const borderClass = isActiveTurn ? 'border-yellow-400' : 'border-gray-700';
      
      return (
        <div className={`w-full h-full bg-panel-bg rounded-lg shadow-lg p-3 border-2 ${borderClass} ${isDisconnected ? 'opacity-60' : ''} flex flex-col overflow-hidden`}>
            {/* Header */}
            <div className="flex items-center justify-between mb-2 flex-shrink-0 gap-2">
                <div className="flex items-center gap-2 overflow-hidden flex-grow">
                    <ColorPicker player={player} canEditSettings={canEditSettings} selectedColors={selectedColors} onColorChange={onColorChange} compact={true} />
                    
                    <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-1">
                            <span className={`font-bold text-base truncate ${isActiveTurn ? 'text-yellow-400' : 'text-white'} select-none`}>{player.name}</span>
                            {isFirstPlayer && (
                                <img src={firstPlayerIconUrl} alt="First Player" className="w-4 h-4 drop-shadow-md ml-1" title="First Player" />
                            )}
                            {winCount > 0 && Array.from({ length: winCount }).map((_, i) => (
                                <img key={`win-${i}`} src={ROUND_WIN_MEDAL_URL} alt="Round Winner" className="w-4 h-4 drop-shadow-md ml-1" title="Round Winner" />
                            ))}
                        </div>
                        {player.isDummy && !isGameStarted && (
                            <div className="flex items-center gap-1 mt-0.5">
                                <select value={player.selectedDeck} onChange={handleDeckSelectChange} className="bg-gray-800 border border-gray-600 text-xs rounded p-0.5 text-gray-300 max-w-[120px]" onClick={(e) => e.stopPropagation()}>
                                     {selectableDecks.map(deck => <option key={deck.id} value={deck.id}>{deck.name}</option>)}
                                </select>
                            </div>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                     <input type="checkbox" checked={isActiveTurn} onChange={() => onToggleActiveTurn(player.id)} disabled={!isLocalPlayer && !player.isDummy} className="w-4 h-4 text-yellow-400 bg-gray-700 border-gray-600 rounded cursor-pointer flex-shrink-0" title="Mark as Active Turn" />
                </div>
            </div>

            <div className="grid grid-cols-6 gap-1 mb-2 flex-shrink-0">
                <DropZone onDrop={() => draggedItem && handleDrop(draggedItem, {target: 'deck', playerId: player.id, deckPosition: 'top'})} onContextMenu={(e) => openContextMenu(e, 'deckPile', { player })} className="w-full aspect-square">
                    <div onClick={canPerformActions ? onDrawCard : undefined} className={`w-full h-full bg-card-back rounded border border-gray-600 flex flex-col items-center justify-center cursor-pointer hover:ring-1 ring-white shadow-sm select-none ${shouldFlashDeck ? 'animate-deck-reminder border-4' : ''}`} title="Deck">
                        <span className="text-xs font-bold mb-0.5 text-white drop-shadow-md">DECK</span>
                        <span className="text-xl font-bold text-white drop-shadow-md">{player.deck.length}</span>
                    </div>
                </DropZone>
                <DropZone onDrop={() => draggedItem && handleDrop(draggedItem, {target: 'discard', playerId: player.id})} onContextMenu={(e) => openContextMenu(e, 'discardPile', { player })} className="w-full aspect-square">
                    <div className="w-full h-full bg-gray-700 rounded border border-gray-600 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-600 shadow-sm select-none" title="Discard">
                        <span className="text-xs font-bold mb-0.5 text-gray-400">DISCARD</span>
                        <span className="text-xl font-bold text-white">{player.discard.length}</span>
                    </div>
                </DropZone>
                <DropZone onDrop={() => draggedItem && handleDrop(draggedItem, {target: 'announced', playerId: player.id})} className="w-full aspect-square bg-gray-800 border border-dashed border-gray-600 rounded flex items-center justify-center" isOverClassName="bg-indigo-600">
                    {player.announcedCard ? (
                        <div className="w-full h-full cursor-pointer" draggable={canPerformActions} onDragStart={() => canPerformActions && setDraggedItem({ card: player.announcedCard!, source: 'announced', playerId: player.id, isManual: true })} onDragEnd={() => setDraggedItem(null)} onContextMenu={(e) => canPerformActions && openContextMenu(e, 'announcedCard', { card: player.announcedCard, player })} onDoubleClick={() => onAnnouncedCardDoubleClick && onAnnouncedCardDoubleClick(player, player.announcedCard!)}>
                             <CardComponent card={player.announcedCard} isFaceUp={true} playerColorMap={playerColorMap} imageRefreshVersion={imageRefreshVersion} activePhaseIndex={currentPhase} activeTurnPlayerId={activeTurnPlayerId} disableActiveHighlights={disableActiveHighlights} />
                        </div>
                    ) : <span className="text-xs font-bold text-gray-400 select-none">Showcase</span>} 
                </DropZone>
                <div></div>
                <div></div>
                <div className="flex justify-end h-full w-full">
                    <div className="flex flex-col items-center justify-between h-full w-6 select-none relative">
                         <button onClick={() => onScoreChange(1)} disabled={!canPerformActions} className="bg-gray-700 w-full h-[30%] rounded hover:bg-gray-600 disabled:opacity-50 flex items-center justify-center text-sm font-bold leading-none pb-0.5">+</button>
                         <span className="font-bold text-lg leading-none">{player.score}</span>
                         <button onClick={() => onScoreChange(-1)} disabled={!canPerformActions} className="bg-gray-700 w-full h-[30%] rounded hover:bg-gray-600 disabled:opacity-50 flex items-center justify-center text-sm font-bold leading-none pb-0.5">-</button>
                    </div>
                </div>
            </div>

            <DropZone onDrop={() => draggedItem && handleDrop(draggedItem, {target: 'hand', playerId: player.id})} className="w-full bg-gray-900/50 rounded p-1 grid grid-cols-6 gap-1 flex-grow overflow-y-scroll content-start">
                {player.hand.map((card, index) => {
                     const isTarget = validHandTargets?.some(t => t.playerId === player.id && t.cardIndex === index);
                     const targetClass = isTarget ? 'ring-4 ring-cyan-400 shadow-[0_0_15px_#22d3ee] rounded-md z-10' : '';
                     return (
                        <div key={`${card.id}-${index}`} className={`w-full aspect-square ${targetClass}`} draggable={canPerformActions} onDragStart={() => canPerformActions && setDraggedItem({ card, source: 'hand', playerId: player.id, cardIndex: index, isManual: true })} onDragEnd={() => setDraggedItem(null)} onContextMenu={(e) => isGameStarted && openContextMenu(e, 'handCard', { card, player, cardIndex: index })} onDoubleClick={() => onHandCardDoubleClick(player, card, index)} onClick={() => onCardClick && onCardClick(player, card, index)} data-hand-card={`${player.id},${index}`}>
                            <CardComponent card={card} isFaceUp={(() => {
                                const isRevealedToAll = card.revealedTo === 'all';
                                const isRevealedToMe = localPlayerId !== null && Array.isArray(card.revealedTo) && card.revealedTo.includes(localPlayerId);
                                const isRevealedByRequest = localPlayerId !== null && card.statuses?.some(s => s.type === 'Revealed' && s.addedByPlayerId === localPlayerId);
                                return isLocalPlayer || isTeammate || !!player.isDummy || isDisconnected || isRevealedToAll || isRevealedToMe || isRevealedByRequest;
                            })()} playerColorMap={playerColorMap} localPlayerId={localPlayerId} imageRefreshVersion={imageRefreshVersion} disableActiveHighlights={disableActiveHighlights} />
                        </div>
                    );
                })}
            </DropZone>
        </div>
      );
  }

  if (layoutMode === 'list-local') {
      const borderClass = isActiveTurn ? 'border-yellow-400' : 'border-gray-700';

      return (
        <div className={`w-full h-full flex flex-col p-4 bg-panel-bg border-2 ${borderClass} rounded-lg shadow-2xl ${isDisconnected ? 'opacity-60' : ''}`}>
             <div className="flex items-center gap-2 mb-[3px] flex-shrink-0">
                 <ColorPicker player={player} canEditSettings={canEditSettings} selectedColors={selectedColors} onColorChange={onColorChange} />
                 <div className="flex-grow relative flex items-center">
                     <input type="text" value={player.name} onChange={(e) => onNameChange(e.target.value)} readOnly={!canEditSettings} className="bg-transparent font-bold text-xl p-1 flex-grow focus:bg-gray-800 rounded focus:outline-none border-b border-gray-600 mr-3" />
                     {isFirstPlayer && (
                        <img src={firstPlayerIconUrl} alt="First Player" className="w-6 h-6 drop-shadow-md mr-3" title="First Player" />
                     )}
                     {winCount > 0 && Array.from({ length: winCount }).map((_, i) => (
                        <img key={`win-${i}`} src={ROUND_WIN_MEDAL_URL} alt="Round Winner" className="w-6 h-6 drop-shadow-md mr-2" title="Round Winner" />
                     ))}
                     <input type="checkbox" checked={isActiveTurn} onChange={() => onToggleActiveTurn(player.id)} disabled={!isLocalPlayer && !player.isDummy} className="w-6 h-6 text-yellow-400 bg-gray-700 border-gray-600 rounded cursor-pointer flex-shrink-0" title="Active Turn" />
                 </div>
             </div>
             
             <div className="flex justify-between items-start gap-4 bg-gray-800 p-[2px] rounded-lg mb-[3px] flex-shrink-0">
                 <div className="p-0 border border-transparent flex gap-[3px]">
                      <DropZone onDrop={() => draggedItem && handleDrop(draggedItem, {target: 'deck', playerId: player.id, deckPosition: 'top'})} onContextMenu={(e) => openContextMenu(e, 'deckPile', { player })}>
                        <div onClick={canPerformActions ? onDrawCard : undefined} className={`w-[120px] h-[120px] bg-card-back rounded flex flex-col items-center justify-center cursor-pointer hover:ring-2 ring-indigo-400 transition-all shadow-lg select-none ${shouldFlashDeck ? 'animate-deck-reminder border-4' : ''}`}>
                            <span className="text-xs font-bold mb-1">DECK</span>
                            <span className="text-lg font-bold">{player.deck.length}</span>
                        </div>
                      </DropZone>
                      <DropZone onDrop={() => draggedItem && handleDrop(draggedItem, {target: 'discard', playerId: player.id})} onContextMenu={(e) => openContextMenu(e, 'discardPile', { player })} isOverClassName="bg-indigo-600 ring-2">
                        <div className="w-[120px] h-[120px] bg-gray-700 rounded flex flex-col items-center justify-center cursor-pointer hover:bg-gray-600 transition-all shadow-lg border border-gray-600 select-none">
                             <span className="text-xs font-bold mb-1 text-gray-400">DISCARD</span>
                             <span className="text-lg font-bold">{player.discard.length}</span>
                        </div>
                      </DropZone>
                       <DropZone onDrop={() => draggedItem && handleDrop(draggedItem, {target: 'announced', playerId: player.id})} className="w-[120px] h-[120px] bg-gray-800 border border-dashed border-gray-600 rounded flex items-center justify-center">
                            {player.announcedCard ? (
                                <div className="w-full h-full p-1 cursor-pointer" draggable={canPerformActions} onDragStart={() => canPerformActions && setDraggedItem({ card: player.announcedCard!, source: 'announced', playerId: player.id, isManual: true })} onDragEnd={() => setDraggedItem(null)} onContextMenu={(e) => canPerformActions && openContextMenu(e, 'announcedCard', { card: player.announcedCard, player })} onDoubleClick={() => onAnnouncedCardDoubleClick && onAnnouncedCardDoubleClick(player, player.announcedCard!)}>
                                    <CardComponent card={player.announcedCard} isFaceUp={true} playerColorMap={playerColorMap} imageRefreshVersion={imageRefreshVersion} activePhaseIndex={currentPhase} activeTurnPlayerId={activeTurnPlayerId} disableActiveHighlights={disableActiveHighlights} />
                                </div>
                            ) : <span className="text-xs font-bold text-gray-500 select-none">Showcase</span>}
                       </DropZone>
                 </div>
                 
                 <div className="flex flex-col items-center justify-between h-[120px] w-12 flex-shrink-0 py-0 select-none relative">
                     <button onClick={() => onScoreChange(1)} className="bg-gray-700 w-full h-10 rounded font-bold hover:bg-gray-600 flex items-center justify-center text-xl">+</button>
                     <span className="font-bold text-3xl">{player.score}</span>
                     <button onClick={() => onScoreChange(-1)} className="bg-gray-700 w-full h-10 rounded font-bold hover:bg-gray-600 flex items-center justify-center text-xl">-</button>
                 </div>
             </div>
             
             {!isGameStarted && (
                 <div className="mb-[3px] flex-shrink-0">
                    <select value={player.selectedDeck} onChange={handleDeckSelectChange} className="w-full bg-gray-700 border border-gray-600 rounded p-2 mb-2">
                         {selectableDecks.map(deck => <option key={deck.id} value={deck.id}>{deck.name}</option>)}
                         <option value={DeckTypeEnum.Custom}>Custom Deck</option>
                    </select>
                     {player.selectedDeck === DeckTypeEnum.Custom && (
                         <div className="flex gap-2">
                            <input type="file" ref={fileInputRef} onChange={handleFileSelected} accept=".json" className="hidden" />
                            <button onClick={handleLoadDeckClick} className="w-full bg-indigo-600 hover:bg-indigo-700 py-1 rounded font-bold">Load Custom Deck</button>
                         </div>
                     )}
                 </div>
             )}
             
             <div className="flex-grow flex flex-col min-h-0">
                 <DropZone onDrop={() => draggedItem && handleDrop(draggedItem, {target: 'hand', playerId: player.id})} className="flex-grow bg-gray-800 rounded-lg p-2 overflow-y-scroll border border-gray-700">
                     <div className="flex flex-col gap-[2px]">
                        {player.hand.map((card, index) => {
                             const isTarget = validHandTargets?.some(t => t.playerId === player.id && t.cardIndex === index);
                             const targetClass = isTarget ? 'ring-4 ring-cyan-400 shadow-[0_0_15px_#22d3ee] rounded-md z-10' : '';
                            
                            return (
                                <div key={`${card.id}-${index}`} className={`flex bg-gray-900 border border-gray-700 rounded p-2 ${targetClass}`} draggable={canPerformActions} onDragStart={() => canPerformActions && setDraggedItem({ card, source: 'hand', playerId: player.id, cardIndex: index, isManual: true })} onDragEnd={() => setDraggedItem(null)} onContextMenu={(e) => canPerformActions && openContextMenu(e, 'handCard', { card, player, cardIndex: index })} onDoubleClick={() => onHandCardDoubleClick(player, card, index)} onClick={() => onCardClick && onCardClick(player, card, index)} data-hand-card={`${player.id},${index}`}>
                                    <div className="w-[120px] h-[120px] flex-shrink-0 mr-3">
                                        <CardComponent card={card} isFaceUp={true} playerColorMap={playerColorMap} localPlayerId={localPlayerId} imageRefreshVersion={imageRefreshVersion} disableTooltip={true} disableActiveHighlights={disableActiveHighlights} />
                                    </div>
                                    <div className="flex-grow min-w-0">
                                        <CardTooltipContent card={card} className="relative flex flex-col text-left w-full h-full justify-start whitespace-normal break-words" hideOwner={card.ownerId === player.id} powerPosition="inner" />
                                    </div>
                                </div>
                            );
                        })}
                     </div>
                 </DropZone>
             </div>
        </div>
      );
  }

  // Standard Mode
  const positionClass = PLAYER_POSITIONS[position] || 'top-2 left-2';
  const borderColorClass = isActiveTurn ? 'border-yellow-400' : localPlayerBorder ? 'border-indigo-500' : 'border-gray-700';

  return (
    <div className={`fixed ${positionClass} min-w-[30rem] bg-panel-bg rounded-lg shadow-2xl p-3 flex flex-col z-10 border-2 ${borderColorClass} ${isDisconnected ? 'opacity-60' : ''}`}>
      <div className="flex items-center justify-between mb-2 gap-3">
        <div className="flex items-center gap-2 flex-grow">
            <ColorPicker player={player} canEditSettings={canEditSettings} selectedColors={selectedColors} onColorChange={onColorChange} />
            <input type="text" value={isDisconnected ? `${player.name} (Disconnected)` : player.name} onChange={(e) => onNameChange(e.target.value)} readOnly={!canEditSettings || isDisconnected} className="bg-transparent font-bold text-xl p-1.5 flex-grow focus:bg-gray-800 rounded focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:cursor-default" />
            {isFirstPlayer && (
                <img src={firstPlayerIconUrl} alt="First Player" className="w-6 h-6 drop-shadow-md" title="First Player" />
            )}
            {winCount > 0 && Array.from({ length: winCount }).map((_, i) => (
                <img key={`win-${i}`} src={ROUND_WIN_MEDAL_URL} alt="Round Winner" className="w-6 h-6 drop-shadow-md ml-1" title="Round Winner" />
            ))}
        </div>
        <div className="flex items-center space-x-2 flex-shrink-0">
          <input type="checkbox" checked={isActiveTurn} onChange={() => onToggleActiveTurn(player.id)} disabled={!isLocalPlayer && !player.isDummy} className="w-5 h-5 text-yellow-400 bg-gray-700 border-gray-600 rounded focus:ring-yellow-500 focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer" title="Mark as active turn" />
          <div className="flex items-center space-x-1 select-none relative">
            <button onClick={() => onScoreChange(-1)} disabled={!canPerformActions} className="bg-gray-700 w-8 h-8 rounded disabled:opacity-50 disabled:cursor-not-allowed">-</button>
            <span className="font-bold text-2xl w-10 text-center">{player.score}</span>
            <button onClick={() => onScoreChange(1)} disabled={!canPerformActions} className="bg-gray-700 w-8 h-8 rounded disabled:opacity-50 disabled:cursor-not-allowed">+</button>
          </div>
        </div>
      </div>
      
      <div className="mb-3 flex items-center space-x-2">
         <select value={player.selectedDeck} onChange={handleDeckSelectChange} disabled={!canEditSettings} className="bg-gray-700 border border-gray-600 text-white text-base rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-full p-2 disabled:opacity-70 disabled:cursor-not-allowed">
            {player.selectedDeck === DeckTypeEnum.Custom && (<option value={DeckTypeEnum.Custom}>Custom Deck</option>)}
            {selectableDecks.map(deck => <option key={deck.id} value={deck.id}>{deck.name}</option>)}
         </select>
         <input type="file" ref={fileInputRef} onChange={handleFileSelected} accept=".json" style={{ display: 'none' }} />
         <button onClick={handleLoadDeckClick} disabled={!canEditSettings} title="Load Custom Deck" className="bg-gray-600 hover:bg-gray-500 text-white font-bold p-2 rounded disabled:opacity-70 disabled:cursor-not-allowed">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
         </button>
      </div>

      <div className="flex-grow flex space-x-3">
        <div className="flex flex-col w-28 space-y-2">
          <DropZone onDrop={() => draggedItem && handleDrop(draggedItem, {target: 'deck', playerId: player.id, deckPosition: 'top'})} onContextMenu={(e) => openContextMenu(e, 'deckPile', { player })}>
            <div onClick={canPerformActions ? onDrawCard : undefined} className={`relative w-28 h-28 bg-card-back rounded-md flex items-center justify-center text-center text-sm font-bold p-1 select-none ${canPerformActions ? 'cursor-pointer hover:ring-2 ring-indigo-400' : 'cursor-not-allowed'} ${shouldFlashDeck ? 'animate-deck-reminder border-4' : ''}`}>
              DECK <br/> ({player.deck.length})
            </div>
          </DropZone>
          <DropZone onDrop={() => { if (draggedItem) { handleDrop(draggedItem, { target: 'discard', playerId: player.id }); }}} onContextMenu={(e) => openContextMenu(e, 'discardPile', { player })} className={`relative w-28 h-28 bg-gray-700 rounded-md flex items-center justify-center text-center text-sm font-bold p-1 select-none ${canPerformActions ? 'cursor-pointer' : ''}`} isOverClassName="bg-indigo-600 ring-2 ring-indigo-400">
            DISCARD <br/> ({player.discard.length})
          </DropZone>
          <div className="relative w-28 h-28">
            <DropZone onDrop={() => draggedItem && handleDrop(draggedItem, {target: 'announced', playerId: player.id})} className="w-full h-full bg-gray-700 rounded-md flex items-center justify-center text-center text-sm p-1" isOverClassName="bg-indigo-600 ring-2 ring-indigo-400">
                {!player.announcedCard && (<span className="text-sm font-bold text-gray-500 select-none">Showcase</span>)}
                {player.announcedCard && (
                    <div draggable={canPerformActions} onDragStart={() => canPerformActions && setDraggedItem({ card: player.announcedCard!, source: 'announced', playerId: player.id, isManual: true })} onDragEnd={() => setDraggedItem(null)} onContextMenu={(e) => canPerformActions && openContextMenu(e, 'announcedCard', { card: player.announcedCard, player })} onDoubleClick={() => onAnnouncedCardDoubleClick && onAnnouncedCardDoubleClick(player, player.announcedCard!)} className="w-full h-full cursor-pointer" data-interactive="true">
                        <CardComponent card={player.announcedCard} isFaceUp={true} playerColorMap={playerColorMap} localPlayerId={localPlayerId} imageRefreshVersion={imageRefreshVersion} activePhaseIndex={currentPhase} activeTurnPlayerId={activeTurnPlayerId} disableActiveHighlights={disableActiveHighlights} />
                    </div>
                )}
            </DropZone>
          </div>
        </div>
        
        <DropZone onDrop={() => draggedItem && handleDrop(draggedItem, {target: 'hand', playerId: player.id})} className="flex-grow bg-gray-800 rounded-lg p-2 min-h-[16rem] max-h-[22.25rem] overflow-y-auto" isOverClassName="bg-gray-900 ring-2 ring-indigo-400">
          <div className="grid grid-cols-3 gap-0.5">
            {player.hand.map((card, index) => {
               const isTarget = validHandTargets?.some(t => t.playerId === player.id && t.cardIndex === index);
               const targetClass = isTarget ? 'ring-4 ring-cyan-400 shadow-[0_0_15px_#22d3ee] rounded-md z-10' : '';
               return (
                  <div key={`${card.id}-${index}`} className={`w-28 h-28 ${targetClass}`} draggable={canPerformActions} onDragStart={() => canPerformActions && setDraggedItem({ card, source: 'hand', playerId: player.id, cardIndex: index, isManual: true })} onDragEnd={() => setDraggedItem(null)} onContextMenu={(e) => { if (localPlayerId !== null && isGameStarted) { openContextMenu(e, 'handCard', { card, player, cardIndex: index }); }}} onDoubleClick={() => onHandCardDoubleClick(player, card, index)} onClick={() => onCardClick && onCardClick(player, card, index)} data-interactive="true" data-hand-card={`${player.id},${index}`}>
                      <CardComponent card={card} isFaceUp={(() => {
                            const isRevealedToAll = card.revealedTo === 'all';
                            const isRevealedToMe = localPlayerId !== null && Array.isArray(card.revealedTo) && card.revealedTo.includes(localPlayerId);
                            const isRevealedByRequest = localPlayerId !== null && card.statuses?.some(s => s.type === 'Revealed' && s.addedByPlayerId === localPlayerId);
                            return isLocalPlayer || isTeammate || !!player.isDummy || isDisconnected || isRevealedToAll || isRevealedToMe || isRevealedByRequest;
                          })()} playerColorMap={playerColorMap} localPlayerId={localPlayerId} imageRefreshVersion={imageRefreshVersion} disableActiveHighlights={disableActiveHighlights} />
                  </div>
              );
            })}
          </div>
        </DropZone>
      </div>
    </div>
  );
}