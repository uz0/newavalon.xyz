import React, { useState, useRef, useEffect } from 'react'
import type { Player, Card as CardType, DragItem, PlayerColor } from '@/types'
import { Card } from './Card'

interface DeckViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  player: Player;
  cards: CardType[];
  setDraggedItem: (item: DragItem | null) => void;
  onCardContextMenu?: (e: React.MouseEvent, cardIndex: number) => void;
  onCardDoubleClick?: (cardIndex: number) => void;
  onCardClick?: (cardIndex: number) => void;
  canInteract: boolean;
  isDeckView?: boolean; // If true, the source of dragged cards is 'deck' instead of 'discard'.
  playerColorMap: Map<number, PlayerColor>;
  localPlayerId: number | null;
  imageRefreshVersion?: number;
  highlightFilter?: (card: CardType) => boolean; // Optional filter to highlight certain cards (e.g. Units)
}

export const DeckViewModal: React.FC<DeckViewModalProps> = ({ isOpen, onClose, title, player, cards, setDraggedItem, onCardContextMenu, onCardDoubleClick, onCardClick, canInteract, isDeckView = false, playerColorMap, localPlayerId, imageRefreshVersion, highlightFilter }) => {
  const [draggedCardId, setDraggedCardId] = useState<string | null>(null)
  // Track drag enter/leave events to prevent false closes when dragging over child elements
  const dragOverCountRef = useRef(0)
  const modalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen) {
      setDraggedCardId(null)
      dragOverCountRef.current = 0
    }
  }, [isOpen])

  if (!isOpen) {
    return null
  }

  const handleDragEnter = (_e: React.DragEvent) => {
    if (draggedCardId !== null) {
      dragOverCountRef.current++
    }
  }

  const handleDragLeave = (e: React.DragEvent) => {
    if (draggedCardId !== null && e.target === modalRef.current) {
      dragOverCountRef.current--
      if (dragOverCountRef.current <= 0) {
        onClose()
      }
    }
  }

  const rowCount = Math.ceil(cards.length / 5)
  const shouldScroll = rowCount > 5
  const heightFor5Rows = 'calc(5 * 7rem + 4 * 0.5rem + 1rem)'

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 pointer-events-auto"
      onClick={onClose}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div
        ref={modalRef}
        onClick={(e) => e.stopPropagation()}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        className="bg-gray-800 rounded-lg p-4 shadow-xl w-auto max-w-4xl max-h-[95vh] flex flex-col">
        <div className="flex justify-between items-center mb-2 flex-shrink-0">
          <h2 className="text-xl font-bold">{title}</h2>
          <button onClick={onClose} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-1 px-3 rounded text-sm">
                Close
          </button>
        </div>
        <div
          className={`bg-gray-900 rounded p-2 ${shouldScroll ? 'overflow-y-auto' : ''}`}
          style={shouldScroll ? { height: heightFor5Rows } : {}}
        >
          <div className="grid grid-cols-5 gap-2">
            {cards.map((card, index) => {
              const isMatchingFilter = highlightFilter ? highlightFilter(card) : true
              const isHighlighted = isMatchingFilter
              const isBeingDragged = draggedCardId === card.id
              const isInteractive = canInteract && isMatchingFilter

              const opacity = isBeingDragged ? 0.3 : (isMatchingFilter ? 1 : 0.3)

              return (
                <div
                  key={`${card.id}-${index}`}
                  style={{ opacity }}
                  draggable={isInteractive}
                  onDragStart={() => {
                    if (isInteractive) {
                      setDraggedCardId(card.id)
                      setDraggedItem({
                        card,
                        source: isDeckView ? 'deck' : 'discard',
                        playerId: player.id,
                        cardIndex: index,
                      })
                    }
                  }}
                  onDragEnd={() => {
                    setDraggedCardId(null)
                    setDraggedItem(null)
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    if (onCardContextMenu) {
                      onCardContextMenu(e, index)
                    }
                  }}
                  onClick={() => isInteractive && onCardClick?.(index)}
                  onDoubleClick={() => isInteractive && onCardDoubleClick?.(index)}
                  data-interactive={isInteractive}
                  className={`w-28 h-28 relative ${isInteractive ? 'cursor-grab' : 'cursor-default'}`}
                >
                  <div className={`w-full h-full ${isHighlighted && highlightFilter ? 'ring-4 ring-cyan-400 rounded-md shadow-[0_0_15px_#22d3ee]' : ''}`}>
                    <Card
                      card={card}
                      isFaceUp={true}
                      playerColorMap={playerColorMap}
                      localPlayerId={localPlayerId}
                      imageRefreshVersion={imageRefreshVersion}
                      disableActiveHighlights={!isMatchingFilter}
                    />
                  </div>
                </div>
              )
            })}
            {cards.length === 0 && <p className="col-span-5 w-full text-center text-gray-400 py-8">Empty</p>}
          </div>
        </div>
      </div>
    </div>
  )
}
