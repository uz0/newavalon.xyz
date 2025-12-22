
import React from 'react'
import { DeckType } from '@/types'
import type { DragItem, Card as CardType } from '@/types'
import { decksData } from '@/content'
import { Card } from './Card'

interface TokensModalProps {
  isOpen: boolean;
  onClose: () => void;
  setDraggedItem: (item: DragItem | null) => void;
  openContextMenu: (e: React.MouseEvent, type: 'token_panel_item', data: { card: CardType }) => void;
  canInteract: boolean;
  anchorEl: { top: number; left: number } | null;
  imageRefreshVersion?: number;
  draggedItem: DragItem | null;
}

export const TokensModal: React.FC<TokensModalProps> = ({ isOpen, onClose, setDraggedItem, openContextMenu, canInteract, anchorEl, imageRefreshVersion, draggedItem }) => {
  if (!isOpen || !anchorEl) {
    return null
  }

  const tokenCards = (decksData[DeckType.Tokens] || []).filter(token => {
    return !token.allowedPanels || token.allowedPanels.includes('TOKEN_PANEL')
  })

  const modalStyle: React.CSSProperties = {
    position: 'fixed',
    top: `${anchorEl.top}px`,
    left: `${anchorEl.left}px`,
    zIndex: 60,
  }

  const handleDragLeave = (e: React.DragEvent) => {
    if (draggedItem?.source === 'token_panel') {
      const rect = e.currentTarget.getBoundingClientRect()
      const x = e.clientX
      const y = e.clientY

      if (x < rect.left || x >= rect.right || y < rect.top || y >= rect.bottom) {
        onClose()
      }
    }
  }

  return (
    <div
      style={modalStyle}
      className="pointer-events-auto"
      onDragLeave={handleDragLeave}
    >
      <div className="bg-gray-800 rounded-lg p-4 shadow-xl w-96 max-w-[90vw] h-auto flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-xl font-bold">Tokens</h2>
          <button onClick={onClose} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-1 px-3 rounded text-sm">
                Close
          </button>
        </div>
        <div className="flex-grow bg-gray-900 rounded p-2 overflow-y-auto">
          <div className="grid grid-cols-3 gap-2">
            {tokenCards.map((token) => (
              <div
                key={token.id}
                draggable={canInteract}
                onDragStart={() => canInteract && setDraggedItem({
                  card: token,
                  source: 'token_panel',
                })}
                onDragEnd={() => setDraggedItem(null)}
                onContextMenu={(e) => canInteract && openContextMenu(e, 'token_panel_item', { card: token })}
                data-interactive={canInteract}
                className={`w-24 h-24 ${canInteract ? 'cursor-grab' : 'cursor-not-allowed'}`}
              >
                <Card card={token} isFaceUp={true} playerColorMap={new Map()} imageRefreshVersion={imageRefreshVersion} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
