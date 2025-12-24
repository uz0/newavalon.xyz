import React, { memo, useState, useEffect, useCallback, useMemo } from 'react'
import type { Card as CardType, PlayerColor, Player, ContextMenuItem } from '@/types'
import { Card } from './Card'
import { ContextMenu } from './ContextMenu'
import { useLanguage } from '@/contexts/LanguageContext'

interface TopDeckViewProps {
    isOpen: boolean;
    player: Player;
    onClose: () => void;
    onReorder: (playerId: number, newTopCards: CardType[]) => void;
    onMoveToBottom: (cardIndex: number) => void;
    onMoveToHand: (cardIndex: number) => void;
    onMoveToDiscard: (cardIndex: number) => void;
    onPlayCard: (cardIndex: number) => void;
    onViewCard: (card: CardType) => void;
    playerColorMap: Map<number, PlayerColor>;
    localPlayerId: number | null;
    imageRefreshVersion?: number;
    initialCount?: number;
    isLocked?: boolean;
}

const TopDeckView: React.FC<TopDeckViewProps> = memo(({
  isOpen,
  player,
  onClose,
  onReorder,
  onMoveToBottom,
  onMoveToHand,
  onMoveToDiscard,
  onPlayCard,
  onViewCard,
  playerColorMap,
  localPlayerId,
  imageRefreshVersion,
  initialCount = 3,
  isLocked = false,
}) => {
  const { t } = useLanguage()
  const [viewCount, setViewCount] = useState(initialCount)
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, cardIndex: number } | null>(null)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  useEffect(() => {
    if (isOpen) {
      setViewCount(initialCount)
    }
  }, [isOpen, initialCount])

  const visibleCards = useMemo(() => {
    return player.deck.slice(0, Math.min(viewCount, player.deck.length))
  }, [player.deck, viewCount])

  const handleContextMenu = useCallback((e: React.MouseEvent, index: number) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({ x: e.clientX, y: e.clientY, cardIndex: index })
  }, [])

  const handleCloseMenu = useCallback(() => {
    setContextMenu(null)
  }, [])

  const handleIncrement = useCallback(() => {
    if (!isLocked && viewCount < player.deck.length) {
      setViewCount(prev => prev + 1)
    }
  }, [isLocked, viewCount, player.deck.length])

  const handleDecrement = useCallback(() => {
    if (!isLocked && viewCount > 1) {
      setViewCount(prev => prev - 1)
    }
  }, [isLocked, viewCount])

  const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
    setDraggedIndex(index)
    e.dataTransfer.effectAllowed = 'move'
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (dragOverIndex !== index) {
      setDragOverIndex(index)
    }
  }, [dragOverIndex])

  const handleDragEnd = useCallback(() => {
    setDraggedIndex(null)
    setDragOverIndex(null)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent, targetIndex: number) => {
    e.preventDefault()
    setDragOverIndex(null)

    if (draggedIndex === null || draggedIndex === targetIndex) {
      return
    }

    const newCards = [...visibleCards]
    const [movedCard] = newCards.splice(draggedIndex, 1)
    newCards.splice(targetIndex, 0, movedCard)

    onReorder(player.id, newCards)
    setDraggedIndex(null)
  }, [draggedIndex, visibleCards, onReorder, player.id])

  const contextMenuItems: ContextMenuItem[] = useMemo(() => {
    if (!contextMenu) {
      return []
    }

    return [
      { label: t('view'), isBold: true, onClick: () => onViewCard(visibleCards[contextMenu.cardIndex]) },
      { label: t('play'), disabled: isLocked, onClick: () => {
        onPlayCard(contextMenu.cardIndex)
      } },
      { label: t('moveToBottom'), onClick: () => {
        onMoveToBottom(contextMenu.cardIndex)
        setViewCount(prev => Math.max(0, prev - 1))
      } },
      { isDivider: true },
      { label: t('toHand'), disabled: isLocked, onClick: () => {
        onMoveToHand(contextMenu.cardIndex)
        setViewCount(prev => Math.max(0, prev - 1))
      } },
      { label: t('toDiscard'), disabled: isLocked, onClick: () => {
        onMoveToDiscard(contextMenu.cardIndex)
        setViewCount(prev => Math.max(0, prev - 1))
      } },
    ]
  }, [visibleCards, isLocked, onViewCard, onPlayCard, onMoveToBottom, onMoveToHand, onMoveToDiscard, contextMenu, t])

  if (!isOpen) {
    return null
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-[250] backdrop-blur-sm" onClick={onClose}>
      <div className="bg-gray-800 rounded-lg p-6 shadow-xl w-auto max-w-5xl border border-gray-600 relative flex flex-col items-center" onClick={e => e.stopPropagation()}>

        <h2 className="text-2xl font-bold text-white mb-2 text-center">{t('deckView')}</h2>

        <div className="flex items-center gap-4 mb-4 bg-gray-900 p-2 rounded-full border border-gray-700">
          <button
            onClick={handleDecrement}
            disabled={isLocked || viewCount <= 1}
            className="w-8 h-8 flex items-center justify-center bg-gray-700 hover:bg-red-600 rounded-full text-white font-bold disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
                        -
          </button>
          <span className="text-xl font-mono font-bold text-indigo-400 w-8 text-center">{viewCount}</span>
          <button
            onClick={handleIncrement}
            disabled={isLocked || viewCount >= player.deck.length}
            className="w-8 h-8 flex items-center justify-center bg-gray-700 hover:bg-green-600 rounded-full text-white font-bold disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
                        +
          </button>
        </div>

        <p className="text-gray-400 text-xs mb-6 text-center">
          {t('dragToReorder')} {t('rightClickForActions')}
        </p>

        <div className="flex justify-center flex-wrap gap-4 mb-8 min-h-[140px] px-4">
          {visibleCards.length === 0 ? (
            <p className="text-gray-500 italic">{t('deckEmpty')}</p>
          ) : (
            visibleCards.map((card, index) => {
              const isDragTarget = dragOverIndex === index
              const isDragging = draggedIndex === index

              return (
                <div
                  key={card.id || index}
                  draggable={true}
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  onDrop={(e) => handleDrop(e, index)}
                  className={`w-32 h-32 relative transition-all rounded-lg
                                        ${isDragging ? 'opacity-50 scale-95' : 'hover:scale-105 cursor-grab active:cursor-grabbing'}
                                        ${isDragTarget ? 'ring-4 ring-cyan-400 shadow-[0_0_15px_#22d3ee] scale-105 z-10' : ''}
                                    `}
                  onContextMenu={(e) => handleContextMenu(e, index)}
                >
                  <div className="absolute -top-3 -left-2 z-20 bg-gray-900 text-gray-400 text-xs font-bold px-2 py-0.5 rounded-full border border-gray-600 shadow-md">
                                        #{index + 1}
                  </div>

                  <Card
                    card={card}
                    isFaceUp={true}
                    playerColorMap={playerColorMap}
                    localPlayerId={localPlayerId}
                    imageRefreshVersion={imageRefreshVersion}
                  />
                </div>
              )
            })
          )}
        </div>

        <div className="flex justify-center">
          <button
            onClick={onClose}
            className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-8 rounded shadow-lg transition-colors"
          >
            {t('done')}
          </button>
        </div>
      </div>

      {contextMenu && (
        <div className="fixed inset-0 z-[255]" onClick={handleCloseMenu} />
      )}

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={handleCloseMenu}
          items={contextMenuItems}
        />
      )}
    </div>
  )
})

export { TopDeckView }
