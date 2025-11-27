import React, { useState, useMemo, useEffect, useRef, useLayoutEffect, useCallback } from 'react';
import { GameBoard } from './components/GameBoard';
import { PlayerPanel } from './components/PlayerPanel';
import { Header } from './components/Header';
import { JoinGameModal } from './components/JoinGameModal';
import { DiscardModal } from './components/DiscardModal';
import { TokensModal } from './components/TokensModal';
import { CountersModal } from './components/CountersModal';
import { TeamAssignmentModal } from './components/TeamAssignmentModal';
import { ReadyCheckModal } from './components/ReadyCheckModal';
import { CardDetailModal } from './components/CardDetailModal';
import { RevealRequestModal } from './components/RevealRequestModal';
import { DeckBuilderModal } from './components/DeckBuilderModal';
import { SettingsModal } from './components/SettingsModal';
import { RulesModal } from './components/RulesModal';
import { ContextMenu } from './components/ContextMenu';
import { CommandModal } from './components/CommandModal';
import { MainMenu } from './components/MainMenu';
import { RoundEndModal } from './components/RoundEndModal'; // NEW IMPORT
import { useGameState } from './hooks/useGameState';
import { useAppAbilities } from './hooks/useAppAbilities';
import type { Player, Card, DragItem, ContextMenuItem, ContextMenuParams, CursorStackState, CardStatus, HighlightData, PlayerColor, FloatingTextData, CommandContext } from './types';
import { DeckType, GameMode } from './types';
import { STATUS_ICONS, STATUS_DESCRIPTIONS } from './constants';
import { canActivateAbility, AbilityAction } from './utils/autoAbilities';
import { countersDatabase } from './contentDatabase';
import { validateTarget, calculateValidTargets } from './utils/targeting';
import { useLanguage } from './contexts/LanguageContext';

/**
 * The main application component.
 */
export default function App() {
  const { t } = useLanguage();
  const {
    gameState,
    localPlayerId,
    setLocalPlayerId,
    createGame,
    joinGame,
    startReadyCheck,
    cancelReadyCheck, 
    playerReady,
    assignTeams,
    setGameMode,
    setGamePrivacy,
    setActiveGridSize,
    setDummyPlayerCount,
    updatePlayerName,
    changePlayerColor,
    updatePlayerScore,
    changePlayerDeck,
    loadCustomDeck,
    drawCard,
    handleDrop,
    draggedItem,
    setDraggedItem,
    connectionStatus,
    gamesList,
    requestGamesList,
    exitGame,
    moveItem,
    shufflePlayerDeck,
    addBoardCardStatus,
    removeBoardCardStatus,
    removeBoardCardStatusByOwner,
    modifyBoardCardPower,
    addAnnouncedCardStatus,
    removeAnnouncedCardStatus,
    modifyAnnouncedCardPower,
    addHandCardStatus,
    removeHandCardStatus,
    flipBoardCard,
    flipBoardCardFaceDown,
    revealHandCard,
    revealBoardCard,
    requestCardReveal,
    respondToRevealRequest,
    syncGame,
    removeRevealedStatus,
    resetGame,
    toggleActiveTurnPlayer,
    forceReconnect,
    triggerHighlight,
    latestHighlight,
    latestFloatingTexts, // Updated to handle batch array
    nextPhase,
    prevPhase,
    setPhase,
    markAbilityUsed,
    applyGlobalEffect,
    swapCards,
    transferStatus,
    transferAllCounters,
    recoverDiscardedCard,
    resurrectDiscardedCard,
    spawnToken,
    scoreLine,
    confirmRoundEnd // New hook function
  } = useGameState();

  // ... (State hooks omitted, unchanged) ...
  const [isJoinModalOpen, setJoinModalOpen] = useState(false);
  const [isDeckBuilderOpen, setDeckBuilderOpen] = useState(false);
  const [isSettingsModalOpen, setSettingsModalOpen] = useState(false);
  const [isTokensModalOpen, setTokensModalOpen] = useState(false);
  const [isCountersModalOpen, setCountersModalOpen] = useState(false);
  const [isRulesModalOpen, setRulesModalOpen] = useState(false);
  const [commandModalCard, setCommandModalCard] = useState<Card | null>(null);
  const [tokensModalAnchor, setTokensModalAnchor] = useState<{ top: number; left: number } | null>(null);
  const [countersModalAnchor, setCountersModalAnchor] = useState<{ top: number; left: number } | null>(null);
  const [isTeamAssignOpen, setTeamAssignOpen] = useState(false);
  const [viewingDiscard, setViewingDiscard] = useState<{ player: Player; pickConfig?: { filterType: string; action: 'recover' | 'resurrect'; targetCoords?: {row: number, col: number} } } | null>(null);
  const [viewingDeck, setViewingDeck] = useState<Player | null>(null);
  const [viewingCard, setViewingCard] = useState<{ card: Card; player?: Player } | null>(null);
  const [isListMode, setIsListMode] = useState(true);
  
  const [imageRefreshVersion, setImageRefreshVersion] = useState<number>(() => {
      try {
          const stored = localStorage.getItem('image_refresh_data');
          if (stored) {
              const { version, timestamp } = JSON.parse(stored);
              const twelveHours = 12 * 60 * 60 * 1000;
              if (Date.now() - timestamp < twelveHours) {
                  return version;
              }
          }
      } catch (e) {
          console.error("Error parsing image refresh data", e);
      }
      const newVersion = Date.now();
      localStorage.setItem('image_refresh_data', JSON.stringify({ version: newVersion, timestamp: newVersion }));
      return newVersion;
  });

  const [contextMenuProps, setContextMenuProps] = useState<ContextMenuParams | null>(null);
  const [playMode, setPlayMode] = useState<{ card: Card; sourceItem: DragItem; faceDown?: boolean } | null>(null);
  const [cursorStack, setCursorStack] = useState<CursorStackState | null>(null);
  const cursorFollowerRef = useRef<HTMLDivElement>(null);
  const lastClickPos = useRef<{x: number, y: number} | null>(null);
  const [highlight, setHighlight] = useState<HighlightData | null>(null);
  const [activeFloatingTexts, setActiveFloatingTexts] = useState<FloatingTextData[]>([]); // Track floating texts
  const [isAutoAbilitiesEnabled, setIsAutoAbilitiesEnabled] = useState(true);
  const [abilityMode, setAbilityMode] = useState<AbilityAction | null>(null);
  const [actionQueue, setActionQueue] = useState<AbilityAction[]>([]); // Queue for command sequences
  const [validTargets, setValidTargets] = useState<{row: number, col: number}[]>([]);
  const [validHandTargets, setValidHandTargets] = useState<{playerId: number, cardIndex: number}[]>([]);
  const [noTargetOverlay, setNoTargetOverlay] = useState<{row: number, col: number} | null>(null);
  const [commandContext, setCommandContext] = useState<CommandContext>({}); // Context for multi-step actions
  const mousePos = useRef({ x: 0, y: 0 });
  const leftPanelRef = useRef<HTMLDivElement>(null);
  const boardContainerRef = useRef<HTMLDivElement>(null);
  const [leftPanelWidth, setLeftPanelWidth] = useState<number | undefined>(undefined);
  
  const interactionLock = useRef(false);

  // Extract Ability Handlers to hook
  const { 
      playCommandCard,
      handleCommandConfirm,
      activateAbility,
      handleLineSelection,
      handleBoardCardClick,
      handleEmptyCellClick,
      handleHandCardClick,
      handleAnnouncedCardDoubleClick
  } = useAppAbilities({
      gameState,
      localPlayerId,
      abilityMode,
      setAbilityMode,
      cursorStack,
      setCursorStack,
      setActionQueue,
      commandContext,
      setCommandContext,
      setCommandModalCard,
      setViewingDiscard,
      setNoTargetOverlay,
      setPlayMode,
      interactionLock,
      moveItem,
      drawCard,
      updatePlayerScore,
      markAbilityUsed,
      applyGlobalEffect,
      swapCards,
      transferStatus,
      transferAllCounters,
      resurrectDiscardedCard,
      spawnToken,
      scoreLine,
      nextPhase,
      modifyBoardCardPower,
      addBoardCardStatus,
      removeBoardCardStatus,
      removeBoardCardStatusByOwner,
      requestCardReveal
  });

  const activePlayerCount = useMemo(() => gameState.players.filter(p => !p.isDummy && !p.isDisconnected).length, [gameState.players]);
  const isSpectator = localPlayerId === null && gameState.gameId !== null;
  const realPlayerCount = useMemo(() => gameState.players.filter(p => !p.isDummy).length, [gameState.players]);
  const isHost = localPlayerId === 1;

  const localPlayer = useMemo(() => gameState.players.find(p => p.id === localPlayerId), [gameState.players, localPlayerId]);
  const isGameActive = gameState.gameId && (localPlayer || isSpectator);

  const playerColorMap = useMemo(() => {
    const map = new Map<number, PlayerColor>();
    gameState.players.forEach(p => map.set(p.id, p.color));
    return map;
  }, [gameState.players]);

  const isTargetingMode = !!abilityMode || !!cursorStack;

  // --- Auto-Enter Scoring Mode on Phase Transition ---
  useEffect(() => {
      if (gameState.isScoringStep && isAutoAbilitiesEnabled && !abilityMode) {
          const activePid = gameState.activeTurnPlayerId;
          // If local player is active OR local player is controlling active Dummy
          if (activePid !== undefined && (activePid === localPlayerId || gameState.players.find(p => p.id === activePid)?.isDummy)) {
              // Find Last Played Card
              let lastPlayedCoords: {row: number, col: number} | null = null;
              
              gameState.board.some((row, r) => {
                  return row.some((cell, c) => {
                      if (cell.card && cell.card.statuses?.some(s => s.type === 'LastPlayed' && s.addedByPlayerId === activePid)) {
                          lastPlayedCoords = { row: r, col: c };
                          return true;
                      }
                      return false;
                  });
              });

              if (lastPlayedCoords) {
                  setAbilityMode({
                      type: 'ENTER_MODE',
                      mode: 'SCORE_LAST_PLAYED_LINE', // Special mode
                      sourceCoords: lastPlayedCoords,
                      payload: {}
                  });
              } else {
                  // Fallback: Allow selecting any line if no card marked (e.g. destroyed)
                  // Or skip? For flexibility, allow selection of any line.
                  setAbilityMode({
                      type: 'ENTER_MODE',
                      mode: 'SELECT_LINE_END', // Use generic line selection
                      payload: { actionType: 'SCORE_LINE' }
                  });
              }
          }
      }
  }, [gameState.isScoringStep, isAutoAbilitiesEnabled, gameState.activeTurnPlayerId, localPlayerId, gameState.board, abilityMode]);


  // ... (Layout effects omitted, unchanged) ...
  useEffect(() => {
      const checkListMode = () => {
          const savedMode = localStorage.getItem('ui_list_mode');
          setIsListMode(savedMode === null ? true : savedMode === 'true');
      };
      checkListMode();
      window.addEventListener('storage', checkListMode);
      return () => window.removeEventListener('storage', checkListMode);
  }, []);

  useLayoutEffect(() => {
      if (!isListMode) {
          setLeftPanelWidth(undefined);
          return;
      }
      const calculateWidth = () => {
          if (boardContainerRef.current) {
              const windowWidth = window.innerWidth;
              const boardRect = boardContainerRef.current.getBoundingClientRect();
              if (boardRect.width === 0) return;
              const centeredLeftSpace = (windowWidth - boardRect.width) / 2;
              const gap = 10;
              const targetWidth = centeredLeftSpace - gap;
              setLeftPanelWidth(Math.max(0, targetWidth));
          }
      };
      const observer = new ResizeObserver(calculateWidth);
      if (boardContainerRef.current) observer.observe(boardContainerRef.current);
      window.addEventListener('resize', calculateWidth);
      calculateWidth();
      const timer = setTimeout(calculateWidth, 100);
      return () => {
          observer.disconnect();
          window.removeEventListener('resize', calculateWidth);
          clearTimeout(timer);
      };
  }, [isListMode, localPlayerId, gameState.activeGridSize]);

  useLayoutEffect(() => {
      if (cursorStack && cursorFollowerRef.current && lastClickPos.current) {
          cursorFollowerRef.current.style.left = `${lastClickPos.current.x - 2}px`;
          cursorFollowerRef.current.style.top = `${lastClickPos.current.y - 2}px`;
      }
  }, [cursorStack]);

  useEffect(() => {
      const handleMouseMove = (e: MouseEvent) => {
          mousePos.current = { x: e.clientX, y: e.clientY };
          if (cursorFollowerRef.current && (cursorStack || abilityMode)) {
              cursorFollowerRef.current.style.left = `${e.clientX - 2}px`;
              cursorFollowerRef.current.style.top = `${e.clientY - 2}px`;
          }
      };
      window.addEventListener('mousemove', handleMouseMove);
      if ((cursorStack || abilityMode) && cursorFollowerRef.current) {
           cursorFollowerRef.current.style.left = `${mousePos.current.x - 2}px`;
           cursorFollowerRef.current.style.top = `${mousePos.current.y - 2}px`;
      }
      return () => {
          window.removeEventListener('mousemove', handleMouseMove);
      };
  }, [cursorStack, abilityMode]);

  // ... (Action Queue Processing, mouseup handlers omitted - unchanged) ...
  useEffect(() => {
      if (actionQueue.length > 0 && !abilityMode && !cursorStack) {
          const nextAction = actionQueue[0];
          setActionQueue(prev => prev.slice(1));

          // Helper to calculate count based on factor (e.g. 'Aim') dynamically
          const calculateDynamicCount = (factor: string, ownerId: number) => {
              let count = 0;
              if (factor === 'Aim') {
                  gameState.board.forEach(row => row.forEach(cell => {
                      if (cell.card?.statuses?.some(s => s.type === 'Aim' && s.addedByPlayerId === ownerId)) {
                          count++;
                      }
                  }));
              } else if (factor === 'Exploit') {
                  gameState.board.forEach(row => row.forEach(cell => {
                      if (cell.card?.statuses?.some(s => s.type === 'Exploit' && s.addedByPlayerId === ownerId)) {
                          count++;
                      }
                  }));
              }
              return count;
          };

          if (nextAction.type === 'GLOBAL_AUTO_APPLY') {
              // 1. Cleanup Command: Move card to discard
              if (nextAction.payload?.cleanupCommand && nextAction.sourceCard) {
                   const card = nextAction.sourceCard;
                   moveItem({ 
                       card, 
                       source: 'announced', 
                       playerId: card.ownerId 
                   }, { 
                       target: 'discard', 
                       playerId: card.ownerId 
                   });
              }
              // 2. Dynamic Resource (e.g. Draw per Aim)
              else if (nextAction.payload?.dynamicResource) {
                  const { type, factor, ownerId } = nextAction.payload.dynamicResource;
                  const count = calculateDynamicCount(factor, ownerId);
                  if (type === 'draw' && count > 0) {
                      for(let i=0; i<count; i++) drawCard(ownerId);
                  }
              }
              // 3. Static Resource
              else if (nextAction.payload?.resourceChange) {
                  const { draw, score } = nextAction.payload.resourceChange;
                  // Fix: Commands played by Dummies or others need correct resource application
                  const activePlayerId = gameState.activeTurnPlayerId; 
                  if (activePlayerId !== undefined) {
                      if (draw) {
                          const count = typeof draw === 'number' ? draw : 1;
                          for(let i=0; i<count; i++) drawCard(activePlayerId);
                      }
                      if (score) {
                          updatePlayerScore(activePlayerId, score);
                      }
                  }
              }
          } else if (nextAction.type === 'CREATE_STACK') {
              // 4. Dynamic Count for Stack (e.g. Reveal per Aim)
              let finalCount = nextAction.count || 1;
              if (nextAction.dynamicCount) {
                  finalCount = calculateDynamicCount(nextAction.dynamicCount.factor, nextAction.dynamicCount.ownerId);
              }

              if (finalCount > 0 && nextAction.tokenType) {
                  setCursorStack({ 
                      type: nextAction.tokenType, 
                      count: finalCount, 
                      isDragging: false, 
                      sourceCoords: nextAction.sourceCoords,
                      excludeOwnerId: nextAction.excludeOwnerId,
                      onlyOpponents: nextAction.onlyOpponents,
                      onlyFaceDown: nextAction.onlyFaceDown,
                      isDeployAbility: nextAction.isDeployAbility,
                      requiredTargetStatus: nextAction.requiredTargetStatus,
                      mustBeAdjacentToSource: nextAction.mustBeAdjacentToSource,
                      mustBeInLineWithSource: nextAction.mustBeInLineWithSource,
                      placeAllAtOnce: nextAction.placeAllAtOnce
                  });
              }
          } else {
              setAbilityMode(nextAction);
          }
      }
  }, [actionQueue, abilityMode, cursorStack, localPlayerId, drawCard, updatePlayerScore, gameState.activeTurnPlayerId, gameState.board, moveItem]);

  useEffect(() => {
      const handleGlobalMouseUp = (e: MouseEvent) => {
          if (!cursorStack) return;
          const target = document.elementFromPoint(e.clientX, e.clientY);
          
          const handCard = target?.closest('[data-hand-card]');
          if (handCard) {
              const attr = handCard.getAttribute('data-hand-card');
              if (attr) {
                  const [playerIdStr, cardIndexStr] = attr.split(',');
                  const playerId = parseInt(playerIdStr, 10);
                  const cardIndex = parseInt(cardIndexStr, 10);
                  const targetPlayer = gameState.players.find(p => p.id === playerId);
                  const targetCard = targetPlayer?.hand[cardIndex];

                  if (targetPlayer && targetCard) {
                      const isValid = validateTarget(
                          { card: targetCard, ownerId: playerId, location: 'hand' },
                          cursorStack,
                          localPlayerId,
                          gameState.players
                      );
                      if (!isValid) return;
                      
                      if (cursorStack.type === 'Revealed' && playerId !== localPlayerId && !targetPlayer.isDummy) {
                           if (localPlayerId !== null) {
                               requestCardReveal({ source: 'hand', ownerId: playerId, cardIndex }, localPlayerId);
                               if (cursorStack.sourceCoords) markAbilityUsed(cursorStack.sourceCoords, cursorStack.isDeployAbility);
                               if (cursorStack.count > 1) {
                                   setCursorStack(prev => prev ? ({ ...prev, count: prev.count - 1 }) : null);
                               } else {
                                   setCursorStack(null);
                               }
                               interactionLock.current = true;
                               setTimeout(() => { interactionLock.current = false; }, 300);
                           }
                           return; 
                      }
                       handleDrop({
                          card: { id: `stack`, deck: 'counter', name: '', imageUrl: '', fallbackImage: '', power: 0, ability: '', types: [] },
                          source: 'counter_panel',
                          statusType: cursorStack.type,
                          count: 1 
                       }, { target: 'hand', playerId, cardIndex, boardCoords: undefined }); 
                       if (cursorStack.sourceCoords) markAbilityUsed(cursorStack.sourceCoords, cursorStack.isDeployAbility);
                       if (cursorStack.count > 1) {
                           setCursorStack(prev => prev ? ({ ...prev, count: prev.count - 1 }) : null);
                       } else {
                           setCursorStack(null);
                       }
                       interactionLock.current = true;
                       setTimeout(() => { interactionLock.current = false; }, 300);
                      return;
                  }
              }
          }

          const boardCell = target?.closest('[data-board-coords]');
          if (boardCell) {
              const coords = boardCell.getAttribute('data-board-coords');
              if (coords) {
                  const [rowStr, colStr] = coords.split(',');
                  const row = parseInt(rowStr, 10);
                  const col = parseInt(colStr, 10);
                  const targetCard = gameState.board[row][col].card;
                  
                  if (targetCard && targetCard.ownerId !== undefined) {
                      const isValid = validateTarget(
                          { card: targetCard, ownerId: targetCard.ownerId, location: 'board', boardCoords: { row, col } },
                          cursorStack,
                          localPlayerId,
                          gameState.players
                      );
                      if (!isValid) return;
                      const targetPlayer = gameState.players.find(p => p.id === targetCard.ownerId);
                      if (cursorStack.type === 'Revealed' && targetCard.ownerId !== localPlayerId && !targetPlayer?.isDummy) {
                           if (localPlayerId !== null) {
                               requestCardReveal({ source: 'board', ownerId: targetCard.ownerId, boardCoords: { row, col } }, localPlayerId);
                               if (cursorStack.sourceCoords) markAbilityUsed(cursorStack.sourceCoords, cursorStack.isDeployAbility);
                               if (cursorStack.count > 1) {
                                   setCursorStack(prev => prev ? ({ ...prev, count: prev.count - 1 }) : null);
                               } else {
                                   setCursorStack(null);
                               }
                               interactionLock.current = true;
                               setTimeout(() => { interactionLock.current = false; }, 300);
                           }
                           return;
                      }
                  }
                  if (targetCard) {
                      const amountToDrop = cursorStack.placeAllAtOnce ? cursorStack.count : 1;
                      
                      handleDrop({
                          card: { id: `stack`, deck: 'counter', name: '', imageUrl: '', fallbackImage: '', power: 0, ability: '', types: [] },
                          source: 'counter_panel',
                          statusType: cursorStack.type,
                          count: amountToDrop
                      }, { target: 'board', boardCoords: { row, col }});
                       if (cursorStack.sourceCoords) markAbilityUsed(cursorStack.sourceCoords, cursorStack.isDeployAbility);
                      if (cursorStack.count > amountToDrop) {
                          setCursorStack(prev => prev ? ({ ...prev, count: prev.count - amountToDrop }) : null);
                      } else {
                          setCursorStack(null);
                      }
                      interactionLock.current = true;
                      setTimeout(() => { interactionLock.current = false; }, 300);
                  }
              }
          } else {
              const isOverModal = target?.closest('.counter-modal-content');
              if (cursorStack.isDragging) {
                  if (isOverModal) {
                      setCursorStack(prev => prev ? { ...prev, isDragging: false } : null);
                  } else {
                      setCursorStack(null);
                  }
              } else {
                   if (!isOverModal) {
                       setCursorStack(null);
                   }
              }
          }
      };
      window.addEventListener('mouseup', handleGlobalMouseUp);
      return () => {
          window.removeEventListener('mouseup', handleGlobalMouseUp);
      };
  }, [cursorStack, handleDrop, gameState, localPlayerId, revealHandCard, requestCardReveal, markAbilityUsed]);

  useEffect(() => {
      const handleGlobalClickCapture = (e: MouseEvent) => {
          if (interactionLock.current) {
              e.stopPropagation();
              e.preventDefault();
          }
      };
      window.addEventListener('click', handleGlobalClickCapture, true);
      return () => window.removeEventListener('click', handleGlobalClickCapture, true);
  }, []);

  useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
          if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) {
              return;
          }
          if (e.code === 'Space') {
              e.preventDefault(); 
              if (gameState.isGameStarted) {
                  nextPhase();
              }
          }
          if (e.key === 'Escape') {
              if (abilityMode && abilityMode.sourceCoords && abilityMode.sourceCoords.row >= 0) {
                  markAbilityUsed(abilityMode.sourceCoords, abilityMode.isDeployAbility);
              }
              if (cursorStack && cursorStack.sourceCoords) {
                  markAbilityUsed(cursorStack.sourceCoords, cursorStack.isDeployAbility);
              }
              setCursorStack(null);
              setPlayMode(null);
              setAbilityMode(null);
              setViewingDiscard(null); 
              setCommandModalCard(null);
              setActionQueue([]);
              setCommandContext({});
          }
      };
      
      const handleRightClick = (e: MouseEvent) => {
          if (cursorStack || playMode || abilityMode) {
              e.preventDefault();
              if (abilityMode && abilityMode.sourceCoords && abilityMode.sourceCoords.row >= 0) {
                  markAbilityUsed(abilityMode.sourceCoords, abilityMode.isDeployAbility);
              }
              if (cursorStack && cursorStack.sourceCoords) {
                  markAbilityUsed(cursorStack.sourceCoords, cursorStack.isDeployAbility);
              }
              setCursorStack(null);
              setPlayMode(null);
              setAbilityMode(null);
              setViewingDiscard(null);
              setActionQueue([]);
              setCommandContext({});
          }
      };
      window.addEventListener('keydown', handleKeyDown);
      window.addEventListener('contextmenu', handleRightClick); 
      return () => {
          window.removeEventListener('keydown', handleKeyDown);
          window.removeEventListener('contextmenu', handleRightClick);
      }
  }, [cursorStack, playMode, abilityMode, markAbilityUsed, gameState.isGameStarted, nextPhase]);

  useEffect(() => {
      let effectiveAction: AbilityAction | null = abilityMode;
      if (cursorStack && !abilityMode) {
          effectiveAction = {
              type: 'CREATE_STACK',
              tokenType: cursorStack.type,
              count: cursorStack.count,
              onlyFaceDown: cursorStack.onlyFaceDown,
              onlyOpponents: cursorStack.onlyOpponents,
              targetOwnerId: cursorStack.targetOwnerId,
              excludeOwnerId: cursorStack.excludeOwnerId,
              requiredTargetStatus: cursorStack.requiredTargetStatus,
              mustBeAdjacentToSource: cursorStack.mustBeAdjacentToSource,
              mustBeInLineWithSource: cursorStack.mustBeInLineWithSource,
              sourceCoords: cursorStack.sourceCoords
          };
      }
      
      // Determine the ACTOR for targeting validation.
      // 1. Source Card Owner (Best)
      // 2. Fallback to deriving from source coordinates (for Stacks)
      // 3. Local Player (Fallback)
      // 4. Active Turn Player (Fallback)
      const actorId = effectiveAction?.sourceCard?.ownerId 
          ?? (effectiveAction?.sourceCoords ? gameState.board[effectiveAction.sourceCoords.row][effectiveAction.sourceCoords.col].card?.ownerId : null)
          ?? (localPlayerId || gameState.activeTurnPlayerId);

      const boardTargets = calculateValidTargets(effectiveAction, gameState, actorId, commandContext);
      const handTargets: {playerId: number, cardIndex: number}[] = [];
      if (abilityMode && abilityMode.type === 'ENTER_MODE' && abilityMode.mode === 'SELECT_TARGET') {
          if (abilityMode.payload.filter) {
              gameState.players.forEach(p => {
                  p.hand.forEach((card, index) => {
                      if (abilityMode.payload.filter!(card)) {
                          handTargets.push({ playerId: p.id, cardIndex: index });
                      }
                  });
              });
          }
      } 
      else if (cursorStack) {
          const counterDef = countersDatabase[cursorStack.type];
          if (counterDef && counterDef.allowedTargets && counterDef.allowedTargets.includes('hand')) {
               gameState.players.forEach(p => {
                   p.hand.forEach((card, index) => {
                       const isValid = validateTarget(
                           { card, ownerId: p.id, location: 'hand' },
                           cursorStack,
                           localPlayerId,
                           gameState.players
                       );
                       if (isValid) {
                           handTargets.push({ playerId: p.id, cardIndex: index });
                       }
                   });
               });
          }
      }
      // Add SCORING Mode valid targets
      if (abilityMode && (abilityMode.mode === 'SCORE_LAST_PLAYED_LINE' || abilityMode.mode === 'SELECT_LINE_END')) {
          // Calculate valid cells (Row/Col)
          const gridSize = gameState.board.length;
          // If sourceCoords exist (Last Played), only that row/col
          if (abilityMode.sourceCoords) {
              for(let r=0; r<gridSize; r++) boardTargets.push({row: r, col: abilityMode.sourceCoords.col});
              for(let c=0; c<gridSize; c++) boardTargets.push({row: abilityMode.sourceCoords.row, col: c});
          } else {
              // Else ALL cells are valid line selectors
              for(let r=0; r<gridSize; r++) {
                  for(let c=0; c<gridSize; c++) boardTargets.push({row: r, col: c});
              }
          }
      }

      setValidTargets(boardTargets);
      setValidHandTargets(handTargets);
  }, [abilityMode, cursorStack, gameState.board, gameState.players, localPlayerId, commandContext]);

  // ... (Highlights and modal closing omitted) ...
  useEffect(() => {
      if (latestHighlight) {
          setHighlight(latestHighlight);
          const timer = setTimeout(() => setHighlight(null), 1000);
          return () => clearTimeout(timer);
      }
  }, [latestHighlight]);

  // Handle Incoming Floating Text Events
  useEffect(() => {
      if (latestFloatingTexts && latestFloatingTexts.length > 0) {
          const newTexts = latestFloatingTexts.map(ft => ({ ...ft, id: `float_${Date.now()}_${Math.random()}` }));
          setActiveFloatingTexts(prev => [...prev, ...newTexts]);
          
          // Auto-remove after animation duration (1.5s)
          const timer = setTimeout(() => {
              setActiveFloatingTexts(prev => prev.filter(item => !newTexts.find(nt => nt.id === item.id)));
          }, 1500);
          
          return () => clearTimeout(timer);
      }
  }, [latestFloatingTexts]);

  const closeAllModals = () => {
      setTokensModalOpen(false);
      setCountersModalOpen(false);
      setViewingDiscard(null);
      setViewingDeck(null);
      setViewingCard(null);
      setRulesModalOpen(false);
      setCommandModalCard(null);
  };
  
  const handleStartGameSequence = () => {
      if (!isHost) return;
      if (gameState.gameMode === GameMode.FreeForAll) {
          startReadyCheck();
      } else {
          setTeamAssignOpen(true);
      }
  };
  
  const handleTeamAssignment = (teamAssignments: Record<number, number[]>) => {
      assignTeams(teamAssignments);
      setTeamAssignOpen(false);
      startReadyCheck();
  };

  const handleJoinGame = (gameId: string) => {
    joinGame(gameId);
    setJoinModalOpen(false);
  };

  const handleCreateGame = () => {
    createGame();
    setLocalPlayerId(1);
  };
  
  const handleOpenJoinModal = () => {
    requestGamesList();
    setJoinModalOpen(true);
  };

  const handleSaveSettings = (url: string) => {
    localStorage.setItem('custom_ws_url', url.trim());
    const savedMode = localStorage.getItem('ui_list_mode');
    setIsListMode(savedMode === null ? true : savedMode === 'true');
    setSettingsModalOpen(false);
    forceReconnect();
  };
  
  const handleSyncAndRefresh = () => {
      const newVersion = Date.now();
      setImageRefreshVersion(newVersion);
      localStorage.setItem('image_refresh_data', JSON.stringify({ version: newVersion, timestamp: newVersion }));
      syncGame();
  };

  const handleTriggerHighlight = (coords: { type: 'row' | 'col' | 'cell', row?: number, col?: number}) => {
      if (localPlayerId === null) return;
      triggerHighlight({
          ...coords,
          playerId: localPlayerId
      });
  };

  // ... (Rest of Context Menu and standard render logic unchanged) ...
  const closeContextMenu = () => setContextMenuProps(null);
  
  const openContextMenu = (e: React.MouseEvent, type: ContextMenuParams['type'], data: any) => {
    e.preventDefault();
    if (abilityMode || cursorStack || playMode) return;
    e.stopPropagation();
    if (localPlayerId === null) return;
    setContextMenuProps({ x: e.clientX, y: e.clientY, type, data });
  };
  
    const handleDoubleClickBoardCard = (card: Card, boardCoords: { row: number, col: number }) => {
        if (abilityMode || cursorStack) return;
        if (interactionLock.current) return;
        const isOwner = card.ownerId === localPlayerId;
        if (isOwner && card.isFaceDown) { flipBoardCard(boardCoords); return; }
        const owner = card.ownerId ? gameState.players.find(p => p.id === card.ownerId) : undefined;
        const isRevealedByRequest = card.statuses?.some(s => s.type === 'Revealed' && s.addedByPlayerId === localPlayerId);
        const isVisibleForMe = !card.isFaceDown || card.revealedTo === 'all' || (Array.isArray(card.revealedTo) && card.revealedTo.includes(localPlayerId!)) || isRevealedByRequest;
        if (isVisibleForMe || isOwner) { setViewingCard({ card, player: owner }); } else if (localPlayerId !== null) { requestCardReveal({ source: 'board', ownerId: card.ownerId!, boardCoords }, localPlayerId); }
    };
    
    const handleDoubleClickEmptyCell = (boardCoords: { row: number, col: number }) => {
        if (abilityMode || cursorStack) return;
        if (interactionLock.current) return;
        handleTriggerHighlight({ type: 'cell', row: boardCoords.row, col: boardCoords.col });
    };

    const handleDoubleClickHandCard = (player: Player, card: Card, cardIndex: number) => {
        if (abilityMode || cursorStack) return;
        if (interactionLock.current) return;
        
        // Update: Allow Dummies
        if (player.id === localPlayerId || player.isDummy) {
            if (card.deck === DeckType.Command) {
                closeAllModals();
                playCommandCard(card, { card, source: 'hand', playerId: player.id, cardIndex });
                return;
            }

            closeAllModals();
            const sourceItem: DragItem = { card, source: 'hand', playerId: player.id, cardIndex };
            setPlayMode({ card, sourceItem, faceDown: false });
        } else if (localPlayerId !== null) {
            const isRevealedToAll = card.revealedTo === 'all';
            const isRevealedToMe = Array.isArray(card.revealedTo) && card.revealedTo.includes(localPlayerId);
            const isRevealedByRequest = card.statuses?.some(s => s.type === 'Revealed' && s.addedByPlayerId === localPlayerId);
            const isVisible = isRevealedToAll || isRevealedToMe || isRevealedByRequest || !!player.isDummy || !!player.isDisconnected;
            if (isVisible) { setViewingCard({ card, player }); } else { requestCardReveal({ source: 'hand', ownerId: player.id, cardIndex }, localPlayerId); }
        }
    };

    // ... (handleDoubleClickPileCard, handleViewDeck, handleViewDiscard) ...
    const handleDoubleClickPileCard = (player: Player, card: Card, cardIndex: number, source: 'deck' | 'discard') => {
        if (abilityMode || cursorStack) return;
        if (interactionLock.current) return;
        const sourceItem: DragItem = { card, source, playerId: player.id, cardIndex };
        moveItem(sourceItem, { target: 'hand', playerId: player.id });
    };

  const handleViewDeck = (player: Player) => { setViewingDiscard(null); setViewingDeck(player); };
  const handleViewDiscard = (player: Player) => { setViewingDeck(null); setViewingDiscard({ player }); };
  
  // Derived state for modals to ensure synchronization with game state updates
  const viewingDiscardPlayer = useMemo(() => {
      if (!viewingDiscard) return null;
      return gameState.players.find(p => p.id === viewingDiscard.player.id) || viewingDiscard.player;
  }, [viewingDiscard, gameState.players]);

  const viewingDeckPlayer = useMemo(() => {
      if (!viewingDeck) return null;
      return gameState.players.find(p => p.id === viewingDeck.id) || viewingDeck;
  }, [viewingDeck, gameState.players]);

  const renderedContextMenu = useMemo(() => {
    if (!contextMenuProps || localPlayerId === null) return null;
    const { type, data, x, y } = contextMenuProps;
    let items: ContextMenuItem[] = [];
    if (type === 'emptyBoardCell') {
        items.push({ label: 'Highlight Cell', onClick: () => handleTriggerHighlight({ type: 'cell', row: data.boardCoords.row, col: data.boardCoords.col }) });
        items.push({ label: 'Highlight Column', onClick: () => handleTriggerHighlight({ type: 'col', col: data.boardCoords.col }) });
        items.push({ label: 'Highlight Row', onClick: () => handleTriggerHighlight({ type: 'row', row: data.boardCoords.row }) });
    } else if (type === 'boardItem' || type === 'announcedCard') {
        const isBoardItem = type === 'boardItem';
        let card = isBoardItem ? gameState.board[data.boardCoords.row][data.boardCoords.col].card : data.card;
        let player = isBoardItem ? null : data.player;
        if (!isBoardItem && player) {
            const currentPlayer = gameState.players.find(p => p.id === player.id);
            if (currentPlayer) { player = currentPlayer; card = currentPlayer.announcedCard || card; }
        }
        if (!card) { setContextMenuProps(null); return null; }
        const owner = card.ownerId ? gameState.players.find(p => p.id === card.ownerId) : undefined;
        const isOwner = card.ownerId === localPlayerId;
        const isDummyCard = !!owner?.isDummy;
        const canControl = isOwner || isDummyCard;
        const isRevealedByRequest = card.statuses?.some(s => s.type === 'Revealed' && (s.addedByPlayerId === localPlayerId));
        const isVisible = !card.isFaceDown || card.revealedTo === 'all' || (Array.isArray(card.revealedTo) && card.revealedTo.includes(localPlayerId!)) || isRevealedByRequest;
        if (isVisible || (isOwner && card.isFaceDown)) { items.push({ label: t('view'), isBold: true, onClick: () => setViewingCard({ card, player: owner }) }); }
        if (!isBoardItem && canControl && card.deck === DeckType.Command) {
             items.push({ label: t('play'), isBold: true, onClick: () => { playCommandCard(card, { card, source: 'announced', playerId: player!.id }); } });
        }
        // ... (Standard menu items logic remains the same, `canControl` now includes Dummies) ...
        if (isBoardItem && canControl) {
             if (card.isFaceDown) { items.push({ label: t('flipUp'), isBold: true, onClick: () => flipBoardCard(data.boardCoords) }); } 
             else { items.push({ label: t('flipDown'), onClick: () => flipBoardCardFaceDown(data.boardCoords) }); }
        }
        const sourceItem: DragItem = isBoardItem ? { card, source: 'board', boardCoords: data.boardCoords } : { card, source: 'announced', playerId: player!.id };
        const ownerId = card.ownerId;
        const isSpecialItem = card?.deck === DeckType.Tokens || card?.deck === 'counter';
        if (isBoardItem) {
            if (canControl && card.isFaceDown) { items.push({ label: t('revealToAll'), onClick: () => revealBoardCard(data.boardCoords, 'all') }); }
            if (!isOwner && !isVisible) { items.push({ label: t('requestReveal'), onClick: () => requestCardReveal({ source: 'board', ownerId: card.ownerId!, boardCoords: data.boardCoords }, localPlayerId) }); }
        }
        if (items.length > 0) items.push({ isDivider: true });
        if (canControl && isVisible) {
            items.push({ label: t('toHand'), disabled: isSpecialItem, onClick: () => moveItem(sourceItem, { target: 'hand', playerId: ownerId }) });
            if (ownerId) {
                const discardLabel = isSpecialItem ? 'Remove' : t('toDiscard');
                items.push({ label: discardLabel, onClick: () => moveItem(sourceItem, { target: 'discard', playerId: ownerId }) });
                items.push({ label: 'To Deck Top', disabled: isSpecialItem, onClick: () => moveItem(sourceItem, { target: 'deck', playerId: ownerId, deckPosition: 'top'}) });
                items.push({ label: 'To Deck Bottom', disabled: isSpecialItem, onClick: () => moveItem(sourceItem, { target: 'deck', playerId: ownerId, deckPosition: 'bottom'}) });
            }
        }
        if (isBoardItem) {
            items.push({ isDivider: true });
            items.push({ label: 'Highlight Cell', onClick: () => handleTriggerHighlight({ type: 'cell', row: data.boardCoords.row, col: data.boardCoords.col }) });
            items.push({ label: 'Highlight Column', onClick: () => handleTriggerHighlight({ type: 'col', col: data.boardCoords.col }) });
            items.push({ label: 'Highlight Row', onClick: () => handleTriggerHighlight({ type: 'row', row: data.boardCoords.row }) });
        }
        if (isVisible) {
            const allStatusTypes = ['Aim', 'Exploit', 'Stun', 'Shield', 'Support', 'Threat', 'Revealed'];
            const visibleStatusItems: ContextMenuItem[] = [];
            allStatusTypes.forEach(status => {
                const currentCount = card.statuses?.filter((s: CardStatus) => s.type === status).length || 0;
                if (currentCount > 0) {
                    visibleStatusItems.push({
                        type: 'statusControl',
                        label: status,
                        onAdd: () => isBoardItem ? addBoardCardStatus(data.boardCoords, status, localPlayerId) : addAnnouncedCardStatus(player.id, status, localPlayerId),
                        onRemove: () => isBoardItem ? removeBoardCardStatus(data.boardCoords, status) : removeAnnouncedCardStatus(player.id, status),
                        removeDisabled: false
                    });
                }
            });
            if (visibleStatusItems.length > 0) {
                 if (items.length > 0 && !('isDivider' in items[items.length - 1])) items.push({ isDivider: true });
                items.push(...visibleStatusItems);
            }
             if (items.length > 0 && !('isDivider' in items[items.length - 1])) items.push({ isDivider: true });
             items.push({
                type: 'statusControl',
                label: 'Power',
                onAdd: () => isBoardItem ? modifyBoardCardPower(data.boardCoords, 1) : modifyAnnouncedCardPower(player.id, 1),
                onRemove: () => isBoardItem ? modifyBoardCardPower(data.boardCoords, -1) : modifyAnnouncedCardPower(player.id, -1),
                removeDisabled: false
             });
        }
    } else if (type === 'token_panel_item') {
        const { card } = data;
        const sourceItem: DragItem = { card, source: 'token_panel' };
        items.push({ label: t('view'), isBold: true, onClick: () => setViewingCard({ card }) });
        items.push({ isDivider: true });
        items.push({ label: t('play'), isBold: true, onClick: () => { closeAllModals(); setPlayMode({ card, sourceItem, faceDown: false }); }});
        items.push({ label: t('playFaceDown'), onClick: () => { closeAllModals(); setPlayMode({ card, sourceItem, faceDown: true }); }});
    } else if (['handCard', 'discardCard', 'deckCard'].includes(type)) {
        let { card, boardCoords, player, cardIndex } = data;
        const currentPlayer = gameState.players.find(p => p.id === player.id);
        if (currentPlayer) {
            player = currentPlayer;
            if (type === 'handCard') { card = currentPlayer.hand[cardIndex] || card; } 
            else if (type === 'discardCard') { card = currentPlayer.discard[cardIndex] || card; } 
            else if (type === 'deckCard') { card = currentPlayer.deck[cardIndex] || card; }
        }
        const canControl = player.id === localPlayerId || !!player.isDummy;
        const localP = gameState.players.find(p => p.id === localPlayerId);
        const isTeammate = localP?.teamId !== undefined && player.teamId === localP.teamId;
        const isRevealedToMe = card.revealedTo === 'all' || (Array.isArray(card.revealedTo) && card.revealedTo.includes(localPlayerId));
        const isRevealedByRequest = card.statuses?.some(s => s.type === 'Revealed' && s.addedByPlayerId === localPlayerId);
        const isVisible = (() => {
            if (type !== 'handCard') return true;
            return player.id === localPlayerId || isTeammate || !!player.isDummy || !!player.isDisconnected || isRevealedToMe || isRevealedByRequest;
        })();
        let source: DragItem['source'];
        if (type === 'handCard') source = 'hand';
        else if (type === 'discardCard') source = 'discard';
        else source = 'deck';
        const sourceItem: DragItem = { card, source, playerId: player?.id, cardIndex, boardCoords };
        const ownerId = card.ownerId;
        const isSpecialItem = card?.deck === DeckType.Tokens || card?.deck === 'counter';
        if (isVisible) {
            const owner = card.ownerId ? gameState.players.find(p => p.id === card.ownerId) : undefined;
            items.push({ label: t('view'), isBold: true, onClick: () => setViewingCard({ card, player: owner }) });
        }
        if (canControl) {
            if (card.deck === DeckType.Command) {
                 items.push({ label: t('play'), isBold: true, onClick: () => { closeAllModals(); playCommandCard(card, sourceItem); }});
            } else if (type === 'handCard') {
                items.push({ label: t('play'), isBold: true, onClick: () => { closeAllModals(); setPlayMode({ card, sourceItem, faceDown: false }); }});
                 items.push({ label: t('playFaceDown'), onClick: () => { closeAllModals(); setPlayMode({ card, sourceItem, faceDown: true }); }});
            } else if (isVisible && ['discardCard', 'deckCard'].includes(type)) {
                 items.push({ label: t('play'), isBold: true, onClick: () => { closeAllModals(); setPlayMode({ card, sourceItem, faceDown: false }); }});
                items.push({ label: t('playFaceDown'), onClick: () => { closeAllModals(); setPlayMode({ card, sourceItem, faceDown: true }); }});
            }
            if (items.length > 0) items.push({ isDivider: true });
            if (type === 'handCard') { items.push({ label: t('revealToAll'), onClick: () => revealHandCard(player.id, cardIndex, 'all') }); }
            if (items.length > 0 && !('isDivider' in items[items.length - 1])) items.push({ isDivider: true });
            if (type === 'discardCard') { items.push({ label: t('toHand'), disabled: isSpecialItem, onClick: () => moveItem(sourceItem, { target: 'hand', playerId: ownerId }) }); } 
            else if (type === 'handCard') { items.push({ label: t('toDiscard'), onClick: () => moveItem(sourceItem, { target: 'discard', playerId: ownerId }) }); }
            if (['handCard', 'discardCard'].includes(type) && ownerId) {
                 items.push({ label: 'To Deck Top', disabled: isSpecialItem, onClick: () => moveItem(sourceItem, { target: 'deck', playerId: ownerId, deckPosition: 'top'}) });
                 items.push({ label: 'To Deck Bottom', disabled: isSpecialItem, onClick: () => moveItem(sourceItem, { target: 'deck', playerId: ownerId, deckPosition: 'bottom'}) });
            }
             if (type === 'deckCard') {
                 items.push({ label: t('toHand'), disabled: isSpecialItem, onClick: () => moveItem(sourceItem, { target: 'hand', playerId: player.id }) });
                 items.push({ label: t('toDiscard'), onClick: () => moveItem(sourceItem, { target: 'discard', playerId: player.id }) });
             }
             if (type === 'handCard') {
                const revealedCount = card.statuses?.filter((s: CardStatus) => s.type === 'Revealed').length || 0;
                if (revealedCount > 0) {
                    if (items.length > 0 && !('isDivider' in items[items.length - 1])) items.push({ isDivider: true });
                    items.push({ type: 'statusControl', label: 'Revealed', onAdd: () => addHandCardStatus(player.id, cardIndex, 'Revealed', localPlayerId), onRemove: () => removeHandCardStatus(player.id, cardIndex, 'Revealed'), removeDisabled: false });
                }
             }
        } 
        else if (type === 'handCard' && !isVisible) { items.push({ label: t('requestReveal'), onClick: () => requestCardReveal({ source: 'hand', ownerId: player.id, cardIndex }, localPlayerId) }); }
    } else if (type === 'deckPile') {
        const { player } = data;
        const canControl = player.id === localPlayerId || !!player.isDummy;
        if (canControl) {
            items.push({ label: 'Draw Card', onClick: () => drawCard(player.id) });
            // Add option to draw starting hand (6 cards)
            items.push({ label: 'Draw Starting Hand (6)', onClick: () => { for(let i=0; i<6; i++) drawCard(player.id); } });
            items.push({ label: 'Shuffle', onClick: () => shufflePlayerDeck(player.id) });
        }
        items.push({ label: t('view'), onClick: () => handleViewDeck(player) });
    } else if (type === 'discardPile') {
        const { player } = data;
        items.push({ label: t('view'), onClick: () => handleViewDiscard(player) });
    }
    items = items.filter((item, index) => {
        if (!('isDivider' in item)) return true;
        if (index === 0 || index === items.length - 1) return false;
        if ('isDivider' in items[index-1]) return false;
        return true;
    });
    return <ContextMenu x={x} y={y} items={items} onClose={closeContextMenu} />;
  }, [gameState, localPlayerId, moveItem, handleTriggerHighlight, addBoardCardStatus, removeBoardCardStatus, modifyBoardCardPower, addAnnouncedCardStatus, removeAnnouncedCardStatus, modifyAnnouncedCardPower, addHandCardStatus, removeHandCardStatus, drawCard, shufflePlayerDeck, flipBoardCard, flipBoardCardFaceDown, revealHandCard, revealBoardCard, requestCardReveal, removeRevealedStatus, activateAbility, t, viewingDiscardPlayer, viewingDeckPlayer, playCommandCard]);

  // ... (Effects and Modal Handlers - Unchanged) ...
  useEffect(() => {
    window.addEventListener('click', closeContextMenu);
    const handleContextMenu = (e: MouseEvent) => {
        if (!(e.target as HTMLElement).closest('[data-interactive]')) { closeContextMenu(); }
    };
    window.addEventListener('contextmenu', handleContextMenu);
    return () => {
        window.removeEventListener('click', closeContextMenu);
        window.removeEventListener('contextmenu', handleContextMenu);
    };
  }, []);

  useEffect(() => { if (draggedItem) { closeContextMenu(); } }, [draggedItem]);

  const handleOpenTokensModal = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (isTokensModalOpen) { setTokensModalOpen(false); setTokensModalAnchor(null); } 
    else { setCountersModalOpen(false); setCountersModalAnchor(null); const rect = event.currentTarget.getBoundingClientRect(); setTokensModalAnchor({ top: rect.top, left: rect.left }); setTokensModalOpen(true); }
  };

  const handleOpenCountersModal = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (isCountersModalOpen) { setCountersModalOpen(false); setCountersModalAnchor(null); } 
    else { setTokensModalOpen(false); setTokensModalAnchor(null); const rect = event.currentTarget.getBoundingClientRect(); setCountersModalAnchor({ top: rect.top, left: rect.left }); setCountersModalOpen(true); }
  };

  const handleCounterMouseDown = (type: string, e: React.MouseEvent) => {
      lastClickPos.current = { x: e.clientX, y: e.clientY };
      setCursorStack(prev => {
          if (prev && prev.type === type) { return { type, count: prev.count + 1, isDragging: true, sourceCoords: prev.sourceCoords }; }
          return { type, count: 1, isDragging: true };
      });
  };

  // ... (Render Main Menu - Unchanged) ...
  if (!isGameActive) {
    return (
      <MainMenu 
        handleCreateGame={handleCreateGame}
        setSettingsModalOpen={setSettingsModalOpen}
        handleOpenJoinModal={handleOpenJoinModal}
        setDeckBuilderOpen={setDeckBuilderOpen}
        setRulesModalOpen={setRulesModalOpen}
        isJoinModalOpen={isJoinModalOpen}
        setJoinModalOpen={setJoinModalOpen}
        handleJoinGame={handleJoinGame}
        gamesList={gamesList}
        isDeckBuilderOpen={isDeckBuilderOpen}
        setViewingCard={setViewingCard}
        isSettingsModalOpen={isSettingsModalOpen}
        handleSaveSettings={handleSaveSettings}
        isRulesModalOpen={isRulesModalOpen}
        viewingCard={viewingCard}
        gameState={gameState}
        imageRefreshVersion={imageRefreshVersion}
        t={t}
      />
    );
  }

  return (
    <div className={`relative w-screen h-screen overflow-hidden ${cursorStack ? 'cursor-none' : ''}`}>
      <Header
        gameId={gameState.gameId}
        isGameStarted={gameState.isGameStarted}
        onStartGame={handleStartGameSequence}
        onResetGame={resetGame}
        activeGridSize={gameState.activeGridSize}
        onGridSizeChange={setActiveGridSize}
        dummyPlayerCount={gameState.dummyPlayerCount}
        onDummyPlayerCountChange={setDummyPlayerCount}
        realPlayerCount={realPlayerCount}
        connectionStatus={connectionStatus}
        onExitGame={exitGame}
        onOpenTokensModal={handleOpenTokensModal}
        onOpenCountersModal={handleOpenCountersModal}
        gameMode={gameState.gameMode}
        onGameModeChange={setGameMode}
        isPrivate={gameState.isPrivate}
        onPrivacyChange={setGamePrivacy}
        isHost={isHost}
        onSyncGame={handleSyncAndRefresh}
        currentPhase={gameState.currentPhase}
        onNextPhase={nextPhase}
        onPrevPhase={prevPhase}
        onSetPhase={setPhase}
        isAutoAbilitiesEnabled={isAutoAbilitiesEnabled}
        onToggleAutoAbilities={setIsAutoAbilitiesEnabled}
        isScoringStep={gameState.isScoringStep} // Pass status
        currentRound={gameState.currentRound}
        turnNumber={gameState.turnNumber}
      />
      
      {/* Round End Modal */}
      {gameState.isRoundEndModalOpen && (
          <RoundEndModal
              gameState={gameState}
              onConfirm={confirmRoundEnd}
              localPlayerId={localPlayerId}
              onExit={exitGame}
          />
      )}
      
      {/* Command Modal */}
      {commandModalCard && (
          <CommandModal
              isOpen={!!commandModalCard}
              card={commandModalCard}
              playerColorMap={new Map(gameState.players.map(p => [p.id, p.color])) as any}
              onConfirm={(indices) => handleCommandConfirm(indices, commandModalCard)}
              onCancel={() => { setCommandModalCard(null); setActionQueue([]); setCommandContext({}); }}
          />
      )}

      {/* Render the Context Menu */}
      {renderedContextMenu}

      {/* ... (Panel Rendering - Pass down permissions properly) ... */}
      {isListMode ? (
        <div className="relative h-full w-full pt-14 overflow-hidden bg-gray-900">
            {localPlayer && (
                <div 
                    ref={leftPanelRef}
                    className="absolute left-0 top-14 bottom-[2px] z-30 bg-panel-bg shadow-xl flex flex-col border-r border-gray-700 w-fit min-w-0 pl-[2px] py-[2px] pr-0 transition-all duration-100 overflow-hidden"
                    style={{ width: leftPanelWidth }}
                >
                     <PlayerPanel
                        key={localPlayer.id}
                        player={localPlayer}
                        isLocalPlayer={true}
                        localPlayerId={localPlayerId}
                        isSpectator={isSpectator}
                        isGameStarted={gameState.isGameStarted}
                        position={localPlayer.id}
                        onNameChange={(name) => updatePlayerName(localPlayer.id, name)}
                        onColorChange={(color) => changePlayerColor(localPlayer.id, color)}
                        onScoreChange={(delta) => updatePlayerScore(localPlayer.id, delta)}
                        onDeckChange={(deckType) => changePlayerDeck(localPlayer.id, deckType)}
                        onLoadCustomDeck={(deckFile) => loadCustomDeck(localPlayer.id, deckFile)}
                        onDrawCard={() => drawCard(localPlayer.id)}
                        handleDrop={handleDrop}
                        draggedItem={draggedItem}
                        setDraggedItem={setDraggedItem}
                        openContextMenu={openContextMenu}
                        onHandCardDoubleClick={handleDoubleClickHandCard}
                        playerColorMap={playerColorMap}
                        allPlayers={gameState.players}
                        localPlayerTeamId={localPlayer?.teamId}
                        activeTurnPlayerId={gameState.activeTurnPlayerId}
                        onToggleActiveTurn={toggleActiveTurnPlayer}
                        imageRefreshVersion={imageRefreshVersion}
                        layoutMode="list-local"
                        onCardClick={handleHandCardClick}
                        validHandTargets={validHandTargets}
                        onAnnouncedCardDoubleClick={handleAnnouncedCardDoubleClick}
                        currentPhase={gameState.currentPhase}
                        disableActiveHighlights={isTargetingMode}
                        roundWinners={gameState.roundWinners}
                        startingPlayerId={gameState.startingPlayerId}
                     />
                </div>
            )}

            <div 
                className="absolute top-14 bottom-0 z-10 flex items-center justify-center pointer-events-none w-full left-0"
            >
                 <div 
                    ref={boardContainerRef}
                    className="pointer-events-auto h-full aspect-square flex items-center justify-center py-[2px]"
                 >
                     <GameBoard
                        board={gameState.board}
                        isGameStarted={gameState.isGameStarted}
                        activeGridSize={gameState.activeGridSize}
                        handleDrop={handleDrop}
                        draggedItem={draggedItem}
                        setDraggedItem={setDraggedItem}
                        openContextMenu={openContextMenu}
                        playMode={playMode}
                        setPlayMode={setPlayMode}
                        highlight={highlight}
                        playerColorMap={playerColorMap}
                        localPlayerId={localPlayerId}
                        onCardDoubleClick={handleDoubleClickBoardCard}
                        onEmptyCellDoubleClick={handleDoubleClickEmptyCell}
                        imageRefreshVersion={imageRefreshVersion}
                        cursorStack={cursorStack}
                        setCursorStack={setCursorStack}
                        currentPhase={gameState.currentPhase}
                        activeTurnPlayerId={gameState.activeTurnPlayerId}
                        onCardClick={handleBoardCardClick}
                        onEmptyCellClick={handleEmptyCellClick}
                        validTargets={validTargets}
                        noTargetOverlay={noTargetOverlay}
                        disableActiveHighlights={isTargetingMode}
                        activeFloatingTexts={activeFloatingTexts} // Pass floating texts
                     />
                 </div>
            </div>

            <div className="absolute right-0 top-14 bottom-0 z-30 w-[34.2rem] bg-panel-bg shadow-xl flex flex-col pt-[3px] pb-[3px] border-l border-gray-700 gap-[3px]">
                 {gameState.players
                    .filter(p => p.id !== localPlayerId)
                    .map(player => (
                        <div key={player.id} className="w-full flex-1 min-h-0">
                            <PlayerPanel
                                player={player}
                                isLocalPlayer={false}
                                localPlayerId={localPlayerId}
                                isSpectator={isSpectator}
                                isGameStarted={gameState.isGameStarted}
                                position={player.id}
                                onNameChange={(name) => updatePlayerName(player.id, name)}
                                onColorChange={(color) => changePlayerColor(player.id, color)}
                                onScoreChange={(delta) => updatePlayerScore(player.id, delta)}
                                onDeckChange={(deckType) => changePlayerDeck(player.id, deckType)}
                                onLoadCustomDeck={(deckFile) => loadCustomDeck(player.id, deckFile)}
                                onDrawCard={() => drawCard(player.id)}
                                handleDrop={handleDrop}
                                draggedItem={draggedItem}
                                setDraggedItem={setDraggedItem}
                                openContextMenu={openContextMenu}
                                onHandCardDoubleClick={handleDoubleClickHandCard}
                                playerColorMap={playerColorMap}
                                allPlayers={gameState.players}
                                localPlayerTeamId={localPlayer?.teamId}
                                activeTurnPlayerId={gameState.activeTurnPlayerId}
                                onToggleActiveTurn={toggleActiveTurnPlayer}
                                imageRefreshVersion={imageRefreshVersion}
                                layoutMode="list-remote"
                                onCardClick={handleHandCardClick}
                                validHandTargets={validHandTargets}
                                onAnnouncedCardDoubleClick={handleAnnouncedCardDoubleClick}
                                currentPhase={gameState.currentPhase}
                                disableActiveHighlights={isTargetingMode}
                                roundWinners={gameState.roundWinners}
                                startingPlayerId={gameState.startingPlayerId}
                            />
                        </div>
                    ))}
            </div>
        </div>
      ) : (
        // Standard Mode (Absolute Positioning)
        <>
            {gameState.players.map(player => (
                <PlayerPanel
                    key={player.id}
                    player={player}
                    isLocalPlayer={player.id === localPlayerId}
                    localPlayerId={localPlayerId}
                    isSpectator={isSpectator}
                    isGameStarted={gameState.isGameStarted}
                    position={player.id}
                    onNameChange={(name) => updatePlayerName(player.id, name)}
                    onColorChange={(color) => changePlayerColor(player.id, color)}
                    onScoreChange={(delta) => updatePlayerScore(player.id, delta)}
                    onDeckChange={(deckType) => changePlayerDeck(player.id, deckType)}
                    onLoadCustomDeck={(deckFile) => loadCustomDeck(player.id, deckFile)}
                    onDrawCard={() => drawCard(player.id)}
                    handleDrop={handleDrop}
                    draggedItem={draggedItem}
                    setDraggedItem={setDraggedItem}
                    openContextMenu={openContextMenu}
                    onHandCardDoubleClick={handleDoubleClickHandCard}
                    playerColorMap={playerColorMap}
                    allPlayers={gameState.players}
                    localPlayerTeamId={localPlayer?.teamId}
                    activeTurnPlayerId={gameState.activeTurnPlayerId}
                    onToggleActiveTurn={toggleActiveTurnPlayer}
                    imageRefreshVersion={imageRefreshVersion}
                    layoutMode="standard"
                    onCardClick={handleHandCardClick}
                    validHandTargets={validHandTargets}
                    onAnnouncedCardDoubleClick={handleAnnouncedCardDoubleClick}
                    currentPhase={gameState.currentPhase}
                    disableActiveHighlights={isTargetingMode}
                    roundWinners={gameState.roundWinners}
                    startingPlayerId={gameState.startingPlayerId}
                />
            ))}
            
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
                 <div 
                    ref={boardContainerRef}
                    className="pointer-events-auto h-[80%] aspect-square flex items-center justify-center"
                 >
                     <GameBoard
                        board={gameState.board}
                        isGameStarted={gameState.isGameStarted}
                        activeGridSize={gameState.activeGridSize}
                        handleDrop={handleDrop}
                        draggedItem={draggedItem}
                        setDraggedItem={setDraggedItem}
                        openContextMenu={openContextMenu}
                        playMode={playMode}
                        setPlayMode={setPlayMode}
                        highlight={highlight}
                        playerColorMap={playerColorMap}
                        localPlayerId={localPlayerId}
                        onCardDoubleClick={handleDoubleClickBoardCard}
                        onEmptyCellDoubleClick={handleDoubleClickEmptyCell}
                        imageRefreshVersion={imageRefreshVersion}
                        cursorStack={cursorStack}
                        setCursorStack={setCursorStack}
                        currentPhase={gameState.currentPhase}
                        activeTurnPlayerId={gameState.activeTurnPlayerId}
                        onCardClick={handleBoardCardClick}
                        onEmptyCellClick={handleEmptyCellClick}
                        validTargets={validTargets}
                        noTargetOverlay={noTargetOverlay}
                        disableActiveHighlights={isTargetingMode}
                        activeFloatingTexts={activeFloatingTexts}
                     />
                 </div>
            </div>
        </>
      )}

      <JoinGameModal 
        isOpen={isJoinModalOpen}
        onClose={() => setJoinModalOpen(false)}
        onJoin={handleJoinGame}
        games={gamesList}
      />

      <DiscardModal
        isOpen={!!viewingDiscard}
        onClose={() => setViewingDiscard(null)}
        title={viewingDiscard?.pickConfig ? (viewingDiscard.pickConfig.action === 'recover' ? 'Recover Device' : 'Resurrect Unit') : "Discard Pile"}
        player={viewingDiscardPlayer!}
        cards={viewingDiscardPlayer?.discard || []}
        setDraggedItem={setDraggedItem}
        canInteract={!!viewingDiscard?.pickConfig || (!!viewingDiscardPlayer && (viewingDiscardPlayer.id === localPlayerId || !!viewingDiscardPlayer.isDummy))}
        onCardContextMenu={(e, index) => {
             if (!viewingDiscard?.pickConfig && viewingDiscardPlayer) {
                 openContextMenu(e, 'discardCard', { card: viewingDiscardPlayer.discard[index], player: viewingDiscardPlayer, cardIndex: index });
             }
        }}
        onCardClick={(index) => {
            if (viewingDiscard?.pickConfig && viewingDiscardPlayer) {
                const config = viewingDiscard.pickConfig;
                const card = viewingDiscardPlayer.discard[index];
                
                // Filter check
                let isValid = false;
                if (config.filterType === 'Device') isValid = card.types?.includes('Device') || false;
                if (config.filterType === 'Optimates') isValid = (card.types?.includes('Optimates') || card.faction === 'Optimates') && card.types?.includes('Unit') || false;

                if (isValid) {
                    // Execute action
                    if (config.action === 'recover') {
                        recoverDiscardedCard(viewingDiscardPlayer.id, index);
                    } else if (config.action === 'resurrect' && abilityMode && abilityMode.sourceCoords) {
                        // Store selection in payload for second step (selecting board target)
                        setAbilityMode(prev => prev ? ({
                            ...prev,
                            payload: { ...prev.payload, selectedCardIndex: index }
                        }) : null);
                    }
                    setViewingDiscard(null);
                }
            }
        }}
        playerColorMap={playerColorMap}
        localPlayerId={localPlayerId}
        imageRefreshVersion={imageRefreshVersion}
      />

      <DiscardModal
        isOpen={!!viewingDeck}
        onClose={() => setViewingDeck(null)}
        title="Deck"
        player={viewingDeckPlayer!}
        cards={viewingDeckPlayer?.deck || []}
        setDraggedItem={setDraggedItem}
        canInteract={!!viewingDeckPlayer && (viewingDeckPlayer.id === localPlayerId || !!viewingDeckPlayer.isDummy)}
        isDeckView={true}
        onCardContextMenu={(e, index) => viewingDeckPlayer && openContextMenu(e, 'deckCard', { card: viewingDeckPlayer.deck[index], player: viewingDeckPlayer, cardIndex: index })}
        playerColorMap={playerColorMap}
        localPlayerId={localPlayerId}
        imageRefreshVersion={imageRefreshVersion}
      />

      <TokensModal 
        isOpen={isTokensModalOpen}
        onClose={() => { setTokensModalOpen(false); setTokensModalAnchor(null); }}
        setDraggedItem={setDraggedItem}
        openContextMenu={openContextMenu}
        canInteract={!!localPlayerId}
        anchorEl={tokensModalAnchor}
        imageRefreshVersion={imageRefreshVersion}
        draggedItem={draggedItem}
      />

      <CountersModal 
        isOpen={isCountersModalOpen}
        onClose={() => { setCountersModalOpen(false); setCountersModalAnchor(null); }}
        setDraggedItem={setDraggedItem}
        canInteract={!!localPlayerId}
        anchorEl={countersModalAnchor}
        imageRefreshVersion={imageRefreshVersion}
        onCounterMouseDown={handleCounterMouseDown}
        cursorStack={cursorStack}
      />

      {isTeamAssignOpen && gameState.gameMode !== GameMode.FreeForAll && (
          <TeamAssignmentModal
              players={gameState.players}
              gameMode={gameState.gameMode}
              onCancel={() => setTeamAssignOpen(false)}
              onConfirm={handleTeamAssignment}
          />
      )}

      {gameState.isReadyCheckActive && localPlayer && (
        <ReadyCheckModal 
          players={gameState.players}
          localPlayer={localPlayer}
          onReady={playerReady}
          onCancel={cancelReadyCheck}
        />
      )}

      {gameState.revealRequests.filter(req => req.toPlayerId === localPlayerId).map((req, index) => {
          const fromPlayer = gameState.players.find(p => p.id === req.fromPlayerId);
          if (!fromPlayer) return null;
          return (
            <RevealRequestModal 
                key={index}
                fromPlayer={fromPlayer}
                cardCount={req.cardIdentifiers.length}
                onAccept={() => respondToRevealRequest(fromPlayer.id, true)}
                onDecline={() => respondToRevealRequest(fromPlayer.id, false)}
            />
          );
      })}

      {viewingCard && (
          <CardDetailModal 
              card={viewingCard.card}
              ownerPlayer={viewingCard.player}
              onClose={() => setViewingCard(null)}
              statusDescriptions={STATUS_DESCRIPTIONS}
              allPlayers={gameState.players}
              imageRefreshVersion={imageRefreshVersion}
          />
      )}

      <DeckBuilderModal
          isOpen={isDeckBuilderOpen}
          onClose={() => setDeckBuilderOpen(false)}
          setViewingCard={setViewingCard}
      />

      <SettingsModal 
          isOpen={isSettingsModalOpen}
          onClose={() => setSettingsModalOpen(false)}
          onSave={handleSaveSettings}
      />

      <RulesModal
          isOpen={isRulesModalOpen}
          onClose={() => setRulesModalOpen(false)}
      />

      <div 
        ref={cursorFollowerRef}
        className={`fixed pointer-events-none z-[9999] flex items-center justify-center transition-transform duration-75 ${cursorStack || abilityMode ? 'block' : 'hidden'}`}
        style={{ transform: 'translate(5px, 5px)' }} // Offset slightly so cursor isn't blocked
      >
          {cursorStack && (
              <div 
                className="relative w-12 h-12 flex items-center justify-center"
                style={{ 
                    backgroundImage: 'url(https://res.cloudinary.com/dxxh6meej/image/upload/v1763653192/background_counter_socvss.png)',
                    backgroundSize: 'contain',
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'center'
                }}
              >
                  {STATUS_ICONS[cursorStack.type] ? (
                      <img 
                        src={STATUS_ICONS[cursorStack.type]} 
                        alt={cursorStack.type} 
                        className="w-8 h-8 object-contain drop-shadow-lg"
                      />
                  ) : (
                      <span className="text-white font-bold text-lg drop-shadow-[0_0_2px_black]">
                          {cursorStack.type.charAt(0)}
                      </span>
                  )}
                  <div className="absolute -top-1 -right-1 bg-red-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center border border-white z-10">
                      {cursorStack.count}
                  </div>
              </div>
          )}
      </div>
    </div>
  );
}