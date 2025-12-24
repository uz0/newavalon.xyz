import React, { memo, useRef, useState, useEffect } from 'react'
import { DeckType as DeckTypeEnum } from '@/types'
import type { Player, PlayerColor, Card as CardType, DragItem, DropTarget, CustomDeckFile, ContextMenuParams } from '@/types'
import { PLAYER_COLORS, PLAYER_POSITIONS } from '@/constants'
import { getSelectableDecks } from '@/content'
import { Card as CardComponent } from './Card'
import { CardTooltipContent } from './Tooltip'
import { useLanguage } from '@/contexts/LanguageContext'
import { validateDeckData } from '@/utils/deckValidation'

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
  onDeckChange: (deckType: DeckTypeEnum) => void;
  onLoadCustomDeck: (deckFile: CustomDeckFile) => void;
  onDrawCard: () => void;
  handleDrop: (item: DragItem, target: DropTarget) => void;
  draggedItem: DragItem | null;
  setDraggedItem: (item: DragItem | null) => void;
  openContextMenu: (e: React.MouseEvent, type: ContextMenuParams['type'], data: any) => void;
  onHandCardDoubleClick: (player: Player, card: CardType, index: number) => void;
  playerColorMap: Map<number, PlayerColor>;
  allPlayers: Player[];
  localPlayerTeamId?: number;
  activeTurnPlayerId?: number;
  onToggleActiveTurn: (playerId: number) => void;
  imageRefreshVersion: number;
  layoutMode: 'standard' | 'list-local' | 'list-remote';
  onCardClick?: (player: Player, card: CardType, index: number) => void;
  validHandTargets?: { playerId: number, cardIndex: number }[];
  onAnnouncedCardDoubleClick?: (player: Player, card: CardType) => void;
  currentPhase: number;
  disableActiveHighlights?: boolean;
  roundWinners?: Record<number, number[]>;
  startingPlayerId?: number;
  onDeckClick?: (playerId: number) => void;
  isDeckSelectable?: boolean;
}

const ColorPicker: React.FC<{ player: Player, canEditSettings: boolean, selectedColors: Set<PlayerColor>, onColorChange: (c: PlayerColor) => void }> = memo(({ player, canEditSettings, selectedColors, onColorChange }) => {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  if (!canEditSettings) {
    return <div className={`w-9 h-9 rounded-md ${PLAYER_COLORS[player.color].bg} border border-white/30 shadow-md flex-shrink-0`}></div>
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-9 h-9 rounded-md ${PLAYER_COLORS[player.color].bg} border-2 border-gray-600 hover:border-white transition-all shadow-md flex items-center justify-center group flex-shrink-0`}
        title="Change Color"
      >
        <svg className="w-4 h-4 text-white/60 group-hover:text-white transition-colors drop-shadow-md" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 p-2 bg-gray-800 border border-gray-600 rounded-lg shadow-xl z-50 grid grid-cols-4 gap-2 w-max animate-fade-in">
          {Object.keys(PLAYER_COLORS).map((colorKey) => {
            const color = colorKey as PlayerColor
            const isTaken = selectedColors.has(color) && player.color !== color
            const isCurrent = player.color === color

            return (
              <button
                key={color}
                onClick={() => {
                  if (!isTaken) {
                    onColorChange(color)
                    setIsOpen(false)
                  }
                }}
                disabled={isTaken}
                className={`w-8 h-8 rounded-md ${PLAYER_COLORS[color].bg} border-2 ${
                  isCurrent ? 'border-white ring-1 ring-white scale-110' :
                    isTaken ? 'border-transparent opacity-20 cursor-not-allowed' :
                      'border-transparent hover:border-white hover:scale-110 hover:shadow-lg'
                } transition-all duration-150`}
                title={color}
              />
            )
          })}
        </div>
      )}
    </div>
  )
})

const DropZone: React.FC<{ onDrop: () => void, className?: string, isOverClassName?: string, children: React.ReactNode, onContextMenu?: (e: React.MouseEvent) => void }> = ({ onDrop, className, isOverClassName, children, onContextMenu }) => {
  const [isOver, setIsOver] = useState(false)
  return (
    <div
      onDragOver={(e) => {
        e.preventDefault(); setIsOver(true)
      }}
      onDragLeave={() => setIsOver(false)}
      onDrop={(e) => {
        e.preventDefault(); e.stopPropagation(); setIsOver(false); onDrop()
      }}
      onContextMenu={onContextMenu}
      className={`${className || ''} ${isOver ? (isOverClassName || '') : ''}`}
    >
      {children}
    </div>
  )
}

const RemoteScore: React.FC<{ score: number, onChange: (delta: number) => void, canEdit: boolean }> = ({ score, onChange, canEdit }) => (
  <div className="w-full h-full bg-gray-800 rounded flex flex-col items-center justify-between text-white select-none overflow-hidden py-0.5">
    <button
      onClick={() => canEdit && onChange(1)}
      disabled={!canEdit}
      className="flex-1 w-full flex items-center justify-center bg-gray-700 hover:bg-gray-600 active:bg-gray-500 transition-colors text-[10px] font-bold disabled:opacity-50 disabled:cursor-default leading-none"
    >
            +
    </button>
    <div className="flex-shrink-0 flex items-center justify-center font-bold text-sm bg-gray-800 w-full py-0.5">
      {score}
    </div>
    <button
      onClick={() => canEdit && onChange(-1)}
      disabled={!canEdit}
      className="flex-1 w-full flex items-center justify-center bg-gray-700 hover:bg-gray-600 active:bg-gray-500 transition-colors text-[10px] font-bold disabled:opacity-50 disabled:cursor-default leading-none"
    >
            -
    </button>
  </div>
)

const RemotePile: React.FC<{ label: string, count: number, onClick?: () => void, children?: React.ReactNode, className?: string }> = ({ label, count, onClick, children, className }) => (
  <div
    onClick={onClick}
    className={`w-full h-full rounded flex flex-col items-center justify-center cursor-pointer hover:ring-2 ring-indigo-400 transition-all shadow-sm select-none text-white border border-gray-600 relative overflow-hidden ${className || ''}`}
  >
    {children ? children : (
      <>
        <span className="text-[9px] font-bold mb-0.5 opacity-80 uppercase tracking-tighter">{label}</span>
        <span className="text-base font-bold">{count}</span>
      </>
    )}
  </div>
)

const PlayerPanel: React.FC<PlayerPanelProps> = memo(({
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
  layoutMode,
  onCardClick,
  validHandTargets,
  onAnnouncedCardDoubleClick,
  currentPhase,
  disableActiveHighlights,
  roundWinners,
  startingPlayerId,
  onDeckClick,
  isDeckSelectable,
}) => {
  const { t } = useLanguage()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const canPerformActions = isLocalPlayer || player.isDummy

  const isActiveTurn = activeTurnPlayerId === player.id
  const isTeammate = localPlayerTeamId !== undefined && player.teamId === localPlayerTeamId && !isLocalPlayer
  const isDisconnected = !!player.isDisconnected

  const selectableDecks = getSelectableDecks()
  const selectedColors = new Set(allPlayers.map(p => p.color))

  const winCount = roundWinners ? Object.values(roundWinners).filter(winners => winners.includes(player.id)).length : 0
  const isFirstPlayer = startingPlayerId === player.id
  const firstPlayerIconUrl = 'https://res.cloudinary.com/dxxh6meej/image/upload/v1763478810/LastPlayed_bfkbwb.png'
  const ROUND_WIN_MEDAL_URL = 'https://res.cloudinary.com/dxxh6meej/image/upload/v1764252181/medal_rgbw8d.png'
  const shouldFlashDeck = isActiveTurn && currentPhase === 0

  const handleDeckSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onDeckChange(e.target.value as DeckTypeEnum)
  }

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) {
      return
    }
    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const deckData = JSON.parse(event.target?.result as string)
        const validation = validateDeckData(deckData)

        if (!validation.isValid) {
          console.error('Failed to load deck:', validation.error)
          return
        }

        const { deckFile } = validation
        onLoadCustomDeck(deckFile)
      } catch (err) {
        console.error('Failed to parse deck file', err)
      }
    }
    reader.readAsText(file)
  }

  const handleLoadDeckClick = () => {
    fileInputRef.current?.click()
  }

  const handleDeckInteraction = () => {
    if (isDeckSelectable && onDeckClick) {
      onDeckClick(player.id)
    } else if (canPerformActions) {
      onDrawCard()
    }
  }

  if (layoutMode === 'list-local') {
    const borderClass = isActiveTurn ? 'border-yellow-400' : 'border-gray-700'

    return (
      <div className={`w-full h-full flex flex-col p-4 bg-panel-bg border-2 ${borderClass} rounded-lg shadow-2xl ${isDisconnected ? 'opacity-60' : ''}`}>
        <div className="flex items-center gap-2 mb-[3px] flex-shrink-0 relative z-50">
          <ColorPicker player={player} canEditSettings={!isGameStarted && canPerformActions} selectedColors={selectedColors} onColorChange={onColorChange} />
          <div className="flex-grow relative flex items-center min-w-0">
            <input type="text" value={player.name} onChange={(e) => onNameChange(e.target.value)} readOnly={isGameStarted || !canPerformActions} className="bg-transparent font-bold text-xl p-1 flex-grow focus:bg-gray-800 rounded focus:outline-none border-b border-gray-600 mr-3 text-white truncate" />
            {isFirstPlayer && (
              <img src={firstPlayerIconUrl} alt="First Player" className="w-6 h-6 drop-shadow-md mr-3 flex-shrink-0" title="First Player" />
            )}
            {winCount > 0 && Array.from({ length: winCount }).map((_, i) => (
              <img key={`win-${i}`} src={ROUND_WIN_MEDAL_URL} alt="Round Winner" className="w-6 h-6 drop-shadow-md mr-2 flex-shrink-0" title="Round Winner" />
            ))}
            <input type="checkbox" checked={isActiveTurn} onChange={() => onToggleActiveTurn(player.id)} disabled={!isLocalPlayer && !player.isDummy} className={`w-6 h-6 text-yellow-400 bg-gray-700 border-gray-600 rounded flex-shrink-0 ${!isLocalPlayer && !player.isDummy ? 'cursor-default' : 'cursor-pointer'}`} title="Active Turn" />
          </div>
        </div>

        <div className="flex justify-between items-start gap-1 bg-gray-800 p-[2px] rounded-lg mb-[3px] flex-shrink-0 flex-wrap relative z-0">
          <div className="p-0 border border-transparent flex gap-1 flex-wrap justify-center">
            <DropZone className="relative z-30" onDrop={() => draggedItem && handleDrop(draggedItem, { target: 'deck', playerId: player.id, deckPosition: 'top' })} onContextMenu={(e) => openContextMenu(e, 'deckPile', { player })}>
              <div onClick={handleDeckInteraction} className={`w-[120px] h-[120px] bg-card-back rounded flex flex-col items-center justify-center cursor-pointer hover:ring-2 ring-indigo-400 transition-all shadow-lg select-none text-white border-2 border-transparent ${shouldFlashDeck ? 'animate-deck-start' : ''} ${isDeckSelectable ? 'ring-4 ring-sky-400 shadow-[0_0_15px_#38bdf8] animate-pulse' : ''}`}>
                <span className="text-xs font-bold mb-1">DECK</span>
                <span className="text-lg font-bold">{player.deck.length}</span>
              </div>
            </DropZone>
            <DropZone className="relative z-10" onDrop={() => draggedItem && handleDrop(draggedItem, { target: 'discard', playerId: player.id })} onContextMenu={(e) => openContextMenu(e, 'discardPile', { player })} isOverClassName="bg-indigo-600 ring-2">
              <div className="w-[120px] h-[120px] bg-gray-700 rounded flex flex-col items-center justify-center cursor-pointer hover:bg-gray-600 transition-all shadow-lg border border-gray-600 select-none text-white">
                <span className="text-xs font-bold mb-1 text-gray-400">DISCARD</span>
                <span className="text-lg font-bold">{player.discard.length}</span>
              </div>
            </DropZone>
            <DropZone onDrop={() => draggedItem && handleDrop(draggedItem, { target: 'announced', playerId: player.id })} className="relative z-10 w-[120px] h-[120px] bg-gray-800 border border-dashed border-gray-600 rounded flex items-center justify-center">
              {player.announcedCard ? (
                <div className="w-full h-full p-1 cursor-pointer" draggable={canPerformActions} onDragStart={() => canPerformActions && setDraggedItem({ card: player.announcedCard!, source: 'announced', playerId: player.id, isManual: true })} onDragEnd={() => setDraggedItem(null)} onContextMenu={(e) => canPerformActions && openContextMenu(e, 'announcedCard', { card: player.announcedCard, player })} onDoubleClick={() => onAnnouncedCardDoubleClick?.(player, player.announcedCard!)}>
                  <CardComponent card={player.announcedCard} isFaceUp={true} playerColorMap={playerColorMap} imageRefreshVersion={imageRefreshVersion} activePhaseIndex={currentPhase} activeTurnPlayerId={activeTurnPlayerId} disableActiveHighlights={disableActiveHighlights} />
                </div>
              ) : <span className="text-xs font-bold text-gray-500 select-none">Showcase</span>}
            </DropZone>
          </div>

          <div className="flex flex-col items-center justify-between h-[120px] w-12 flex-shrink-0 py-0 select-none relative text-white">
            <button onClick={() => onScoreChange(1)} className="bg-gray-700 w-full h-10 rounded font-bold hover:bg-gray-600 flex items-center justify-center text-xl">+</button>
            <span className="font-bold text-3xl">{player.score}</span>
            <button onClick={() => onScoreChange(-1)} className="bg-gray-700 w-full h-10 rounded font-bold hover:bg-gray-600 flex items-center justify-center text-xl">-</button>
          </div>
        </div>

        {!isGameStarted && canPerformActions && (
          <div className="mb-[3px] flex-shrink-0 text-white">
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
          <DropZone onDrop={() => draggedItem && handleDrop(draggedItem, { target: 'hand', playerId: player.id })} className="flex-grow bg-gray-800 rounded-lg p-2 overflow-y-scroll border border-gray-700 custom-scrollbar">
            <div className="flex flex-col gap-[2px]">
              {player.hand.map((card, index) => {
                const isTarget = validHandTargets?.some(t => t.playerId === player.id && t.cardIndex === index)
                const targetClass = isTarget ? 'ring-4 ring-cyan-400 shadow-[0_0_15px_#22d3ee] rounded-md z-10' : ''

                return (
                  <div key={`${card.id}-${index}`} className={`flex bg-gray-900 border border-gray-700 rounded p-2 ${targetClass}`} draggable={canPerformActions} onDragStart={() => canPerformActions && setDraggedItem({ card, source: 'hand', playerId: player.id, cardIndex: index, isManual: true })} onDragEnd={() => setDraggedItem(null)} onContextMenu={(e) => canPerformActions && openContextMenu(e, 'handCard', { card, player, cardIndex: index })} onDoubleClick={() => onHandCardDoubleClick(player, card, index)} onClick={() => onCardClick?.(player, card, index)} data-hand-card={`${player.id},${index}`} data-interactive="true">
                    <div className="w-[120px] h-[120px] flex-shrink-0 mr-3">
                      <CardComponent card={card} isFaceUp={true} playerColorMap={playerColorMap} localPlayerId={localPlayerId} imageRefreshVersion={imageRefreshVersion} disableTooltip={true} disableActiveHighlights={disableActiveHighlights} />
                    </div>
                    <div className="flex-grow min-w-0">
                      <CardTooltipContent card={card} className="relative flex flex-col text-left w-full h-full justify-start whitespace-normal break-words" hideOwner={card.ownerId === player.id} powerPosition="inner" />
                    </div>
                  </div>
                )
              })}
            </div>
          </DropZone>
        </div>
      </div>
    )
  }

  if (layoutMode === 'list-remote') {
    const borderClass = isActiveTurn ? 'border-yellow-400' : 'border-gray-700'
    return (
      <div className={`w-full h-full flex flex-col p-1 pt-[1px] bg-panel-bg border-2 ${borderClass} rounded-lg shadow-xl ${isDisconnected ? 'opacity-60' : ''} overflow-hidden`}>
        {/* Header */}
        <div className="flex items-center gap-2 mb-0 px-2 flex-shrink-0 min-h-[25px] mt-[2px]">
          <div className={`w-[18px] h-[18px] rounded-sm ${PLAYER_COLORS[player.color].bg} shadow-sm border border-white/20`}></div>
          <span className="font-bold text-white text-[14px] truncate leading-none pt-0.5 max-w-[120px]">{player.name}</span>

          {/* Dummy Deck Select */}
          {!isGameStarted && player.isDummy && canPerformActions && (
            <select
              value={player.selectedDeck}
              onChange={handleDeckSelectChange}
              className="text-sm bg-gray-700 text-white border border-gray-600 rounded px-1 py-0 h-6 w-[135px] focus:outline-none truncate"
            >
              {selectableDecks.map(deck => <option key={deck.id} value={deck.id}>{deck.name}</option>)}
              <option value={DeckTypeEnum.Custom}>Custom</option>
            </select>
          )}

          <div className="flex-1"></div>

          <div className="flex items-center gap-1">
            {isFirstPlayer && <img src={firstPlayerIconUrl} className="w-5 h-5" title="First Player" />}
            {winCount > 0 && <span className="text-yellow-500 text-base font-bold">★{winCount}</span>}
            <input
              type="checkbox"
              checked={isActiveTurn}
              onChange={() => onToggleActiveTurn(player.id)}
              disabled={!canPerformActions}
              className="w-4 h-4 text-yellow-400 bg-gray-700 border-gray-600 rounded cursor-pointer flex-shrink-0 accent-yellow-500"
              title="Active Turn"
            />
          </div>
        </div>

        {/* Main Vertical Layout */}
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden">

          {/* Row 1: Resources and Score (Fixed Height compact row) */}
          <div className="flex items-center gap-1 px-2 mb-2 h-[77px] flex-shrink-0 mt-[2px]">
            {/* Deck */}
            <DropZone className="h-full aspect-square relative" onDrop={() => draggedItem && handleDrop(draggedItem, { target: 'deck', playerId: player.id, deckPosition: 'top' })} onContextMenu={(e) => openContextMenu(e, 'deckPile', { player })}>
              <RemotePile
                label="DECK"
                count={player.deck.length}
                onClick={handleDeckInteraction}
                className={`bg-card-back ${shouldFlashDeck ? 'animate-deck-start' : ''} ${isDeckSelectable ? 'ring-4 ring-sky-400 shadow-[0_0_15px_#38bdf8] animate-pulse' : ''}`}
              />
            </DropZone>

            {/* Discard */}
            <DropZone className="h-full aspect-square relative" onDrop={() => draggedItem && handleDrop(draggedItem, { target: 'discard', playerId: player.id })} onContextMenu={(e) => openContextMenu(e, 'discardPile', { player })} isOverClassName="ring-2 ring-indigo-500">
              <RemotePile
                label="DISC"
                count={player.discard.length}
                className="bg-gray-700"
              />
            </DropZone>

            {/* Showcase */}
            <DropZone className="h-full aspect-square relative" onDrop={() => draggedItem && handleDrop(draggedItem, { target: 'announced', playerId: player.id })}>
              <div className="w-full h-full bg-gray-800 border border-dashed border-gray-600 rounded flex items-center justify-center relative overflow-hidden">
                {player.announcedCard ? (
                  <div className="w-full h-full" draggable={canPerformActions} onDragStart={() => canPerformActions && setDraggedItem({ card: player.announcedCard!, source: 'announced', playerId: player.id, isManual: true })} onDragEnd={() => setDraggedItem(null)} onContextMenu={(e) => openContextMenu(e, 'announcedCard', { card: player.announcedCard, player })} onDoubleClick={() => onAnnouncedCardDoubleClick?.(player, player.announcedCard!)}>
                    <CardComponent card={player.announcedCard} isFaceUp={true} playerColorMap={playerColorMap} imageRefreshVersion={imageRefreshVersion} disableTooltip={false} disableActiveHighlights={disableActiveHighlights} />
                  </div>
                ) : <span className="text-[9px] font-bold text-gray-500 select-none uppercase">SHOW</span>}
              </div>
            </DropZone>

            {/* Spacer to push score to right */}
            <div className="flex-1"></div>

            {/* Score (Narrow, same height) */}
            <div className="h-full w-[33px]">
              <RemoteScore score={player.score} onChange={onScoreChange} canEdit={canPerformActions} />
            </div>
          </div>

          {/* Row 2: Hand Cards - Grid 6 cols - Scrollable with ALWAYS VISIBLE SCROLLBAR */}
          <DropZone onDrop={() => draggedItem && handleDrop(draggedItem, { target: 'hand', playerId: player.id })} className="grid grid-cols-6 gap-1 px-2 overflow-y-scroll custom-scrollbar flex-grow content-start min-h-[30px]">
            {player.hand.map((card, index) => {
              const isTarget = validHandTargets?.some(t => t.playerId === player.id && t.cardIndex === index)
              const targetClass = isTarget ? 'ring-2 ring-cyan-400 shadow-[0_0_8px_#22d3ee] rounded-md z-10' : ''

              const isRevealedToAll = card.revealedTo === 'all'
              const isRevealedToMe = localPlayerId !== null && Array.isArray(card.revealedTo) && card.revealedTo.includes(localPlayerId)
              const isRevealedByStatus = localPlayerId !== null && card.statuses?.some(s => s.type === 'Revealed' && s.addedByPlayerId === localPlayerId)

              const owner = allPlayers.find(p => p.id === card.ownerId)
              const isOwnerDummy = owner?.isDummy
              const isOwner = localPlayerId === card.ownerId

              const isVisible = isOwner || isOwnerDummy || isTeammate || isRevealedToAll || isRevealedToMe || isRevealedByStatus

              return (
                <div
                  key={`${card.id}-${index}`}
                  className={`aspect-square relative ${targetClass}`}
                  draggable={canPerformActions}
                  onDragStart={() => canPerformActions && setDraggedItem({ card, source: 'hand', playerId: player.id, cardIndex: index, isManual: true })}
                  onDragEnd={() => setDraggedItem(null)}
                  onContextMenu={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    openContextMenu(e, 'handCard', { card, player, cardIndex: index })
                  }}
                  onDoubleClick={() => onHandCardDoubleClick(player, card, index)}
                  onClick={() => onCardClick?.(player, card, index)}
                  data-hand-card={`${player.id},${index}`}
                  data-interactive="true"
                >
                  <div className="w-full h-full">
                    <CardComponent
                      card={card}
                      isFaceUp={isVisible}
                      playerColorMap={playerColorMap}
                      localPlayerId={localPlayerId}
                      imageRefreshVersion={imageRefreshVersion}
                      disableTooltip={!isVisible}
                      disableActiveHighlights={disableActiveHighlights}
                      smallStatusIcons={true}
                    />
                  </div>
                </div>
              )
            })}
          </DropZone>
          {player.hand.length === 0 && <div className="text-center text-gray-600 text-[10px] mt-2 italic">{t('emptyHand')}</div>}
        </div>
      </div>
    )
  }

  const posClass = PLAYER_POSITIONS[position] || 'top-20 left-20'
  const borderClass = isActiveTurn ? 'border-yellow-400' : 'border-gray-700'

  return (
    <div className={`absolute ${posClass} w-64 bg-panel-bg bg-opacity-90 p-4 rounded-lg shadow-lg border-2 ${borderClass} flex flex-col gap-2 z-20 ${isDisconnected ? 'opacity-60' : ''}`}>
      <div className="flex justify-between items-center text-white">
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${PLAYER_COLORS[player.color].bg}`}></div>
          <span className="font-bold">{player.name}</span>
        </div>
        <span className="font-mono text-xl">{player.score}</span>
      </div>

      <div className="flex gap-2 h-20">
        <div onClick={handleDeckInteraction} className={`flex-1 bg-gray-800 rounded flex items-center justify-center border border-gray-600 cursor-pointer hover:bg-gray-700 transition-colors ${isDeckSelectable ? 'ring-4 ring-sky-400 shadow-[0_0_15px_#38bdf8] animate-pulse' : ''}`}>
          <span className="text-white font-bold">{player.deck.length} {t('cards')}</span>
        </div>
        <div className="w-20 bg-gray-800 border-dashed border border-gray-600 rounded flex items-center justify-center p-1">
          {player.announcedCard ? (
            <div className="w-full h-full" onContextMenu={(e) => openContextMenu(e, 'announcedCard', { card: player.announcedCard, player })}>
              <CardComponent card={player.announcedCard} isFaceUp={true} playerColorMap={playerColorMap} imageRefreshVersion={imageRefreshVersion} disableTooltip={true} />
            </div>
          ) : <span className="text-xs text-gray-500">Empty</span>}
        </div>
      </div>
    </div>
  )
})

export { PlayerPanel }
