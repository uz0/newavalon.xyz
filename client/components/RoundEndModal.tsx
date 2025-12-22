/**
 * @file Renders a modal showing round results and winners.
 */
import React from 'react'
import type { GameState, Player } from '@/types'
import { PLAYER_COLORS } from '@/constants'

interface RoundEndModalProps {
    gameState: GameState;
    onConfirm: () => void;
    localPlayerId: number | null;
    onExit: () => void;
}

export const RoundEndModal: React.FC<RoundEndModalProps> = ({ gameState, onConfirm, localPlayerId, onExit }) => {
  if (!gameState.isRoundEndModalOpen) {
    return null
  }

  const roundWinnerIds = gameState.roundWinners[gameState.currentRound] || []
  const gameWinnerId = gameState.gameWinner
  const isGameOver = !!gameWinnerId

  // Calculate next round target dynamically
  const nextRound = gameState.currentRound + 1
  const nextTarget = (nextRound * 10) + 10

  const medalUrl = 'https://res.cloudinary.com/dxxh6meej/image/upload/v1764252181/medal_rgbw8d.png'

  // Sort players based on starting player for the round/game rotation
  // Find index of starting player
  const players = [...gameState.players].sort((a, b) => a.id - b.id)
  const startId = gameState.startingPlayerId || 1
  const startIndex = players.findIndex(p => p.id === startId)

  let sortedPlayers: Player[] = []
  if (startIndex !== -1) {
    sortedPlayers = [
      ...players.slice(startIndex),
      ...players.slice(0, startIndex),
    ]
  } else {
    sortedPlayers = players
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-[200] backdrop-blur-sm">
      <div className="bg-gray-900 rounded-lg border-2 border-gray-700 shadow-2xl p-6 w-full max-w-md text-left relative">

        {/* Header */}
        <div className="mb-4 text-center">
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest leading-none">
            {isGameOver ? 'Game Over' : `Round ${gameState.currentRound} Complete`}
          </h2>
        </div>

        {/* Player List */}
        <div className="space-y-2 mb-4">
          {sortedPlayers.map(p => {
            const isCurrentWinner = roundWinnerIds.includes(p.id)

            // Count total medals across all rounds
            const totalMedals = Object.values(gameState.roundWinners).flat().filter(id => id === p.id).length

            const colorData = PLAYER_COLORS[p.color]

            return (
              <div key={p.id} className={`flex items-center justify-between p-3 rounded bg-gray-800 border ${isCurrentWinner ? 'border-yellow-500/50' : 'border-gray-700'}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${colorData?.bg || 'bg-gray-500'}`}></div>
                  <span className={`font-bold text-lg ${isCurrentWinner ? 'text-white' : 'text-gray-400'}`}>
                    {p.name}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-bold text-white font-mono mr-2">{p.score}</span>
                  {totalMedals > 0 && Array.from({ length: totalMedals }).map((_, i) => (
                    <img
                      key={i}
                      src={medalUrl}
                      alt="Winner"
                      className="w-6 h-6 object-contain drop-shadow-md"
                      title="Round Winner"
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        <hr className="border-gray-600 my-2" />

        {/* Meta Info */}
        <div className="text-xs text-gray-400 flex justify-between px-1">
          <span>Ended on Turn {gameState.turnNumber}</span>
          <span>Alpha v0.1.3</span>
        </div>

        <hr className="border-gray-600 my-2" />

        {/* Next Round / Conditions */}
        <div className="text-sm text-gray-300 leading-snug space-y-2 mt-3">
          {!isGameOver ? (
            <>
              <div className="flex justify-between">
                <span className="text-gray-400">Next:</span>
                <span className="font-bold text-white">Round {nextRound}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Victory Condition:</span>
                <span className="font-bold text-yellow-400">{nextTarget} Points</span>
              </div>
              <div className="text-xs text-gray-500 italic mt-2 text-center">
                                * Win 2 rounds to win the match. <br/>
                {nextRound === 5 ? 'Final Round! Max 10 Turns.' : 'Max 5 Rounds.'}
              </div>
            </>
          ) : (
            <div className="text-center py-2">
              <div className="text-yellow-400 font-bold text-lg mb-1">Match Complete</div>
              <p className="text-gray-400 text-xs">Thank you for playing New Avalon: Skirmish.</p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="mt-6 flex justify-end gap-3">
          {isGameOver ? (
            <>
              <button
                onClick={onExit}
                className="flex-1 bg-red-900 hover:bg-red-800 text-white font-bold py-2 px-4 rounded border border-red-700 text-sm transition-colors"
              >
                                Return to Menu
              </button>
              <button
                onClick={onConfirm}
                className="flex-1 bg-green-800 hover:bg-green-700 text-white font-bold py-2 px-4 rounded border border-green-600 text-sm transition-colors"
              >
                                Continue Game
              </button>
            </>
          ) : (
            <button
              onClick={onConfirm}
              className="bg-green-800 hover:bg-green-700 text-white font-bold py-2 px-6 rounded border border-green-600 text-sm transition-colors w-full"
            >
                            Start Round {nextRound}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
