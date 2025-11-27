
/**
 * @file Renders a comprehensive Rules & Tutorial modal acting as an interactive encyclopedia.
 */
import React, { useState, useMemo, useEffect } from 'react';
import { Card } from './Card';
import type { Card as CardType, PlayerColor } from '../types';
import { DeckType } from '../types';
import { PLAYER_COLORS } from '../constants';
import { useLanguage } from '../contexts/LanguageContext';

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface RuleSection {
  id: string;
  title: string;
  content: React.ReactNode;
  demoConfig?: (number | null)[];
  demoCardStatuses?: Record<number, { type: string; addedByPlayerId: number }[]>;
}

// --- Constants for Image URLs ---
const RIOT_AGENT_IMG = "https://res.cloudinary.com/dxxh6meej/image/upload/v1763253337/SYN_RIOT_AGENT_jurf4t.png";
const RIOT_AGENT_FALLBACK = "/images/cards/SYN_RIOT_AGENT.png";
const PRINCEPS_IMG = "https://res.cloudinary.com/dxxh6meej/image/upload/v1763253332/OPT_PRINCEPS_w3o5lq.png";
const PRINCEPS_FALLBACK = "/images/cards/OPT_PRINCEPS.png";

// --- Mock Data & Helpers for Demo ---
const createDummyCard = (ownerId: number): CardType => {
    const isBlue = ownerId === 1;
    if (isBlue) {
        return {
            id: `demo-riot-${Math.random()}`,
            deck: DeckType.SynchroTech,
            name: "Riot Agent",
            imageUrl: RIOT_AGENT_IMG,
            fallbackImage: RIOT_AGENT_FALLBACK,
            power: 3,
            ability: "Deploy: Push an adjacent card 1 cell.\nCommit: Stun an adjacent opponent card with threat.",
            ownerId: 1,
            ownerName: 'Player 1',
            statuses: [],
            types: ["Unit", "SynchroTech"]
        };
    } else {
        return {
            id: `demo-princeps-${Math.random()}`,
            deck: DeckType.Optimates,
            name: "Princeps",
            imageUrl: PRINCEPS_IMG,
            fallbackImage: PRINCEPS_FALLBACK,
            power: 3,
            ability: "Deploy: Shield 1. Aim a card with threat.",
            ownerId: 2,
            ownerName: 'Player 2',
            statuses: [],
            types: ["Unit", "Optimates"]
        };
    }
};

const DUMMY_COLOR_MAP = new Map<number, PlayerColor>([
    [1, 'blue'],
    [2, 'red'],
]);

const MiniBoard: React.FC<{ config?: (number | null)[], cardStatuses?: Record<number, { type: string; addedByPlayerId: number }[]> }> = ({ config, cardStatuses }) => {
    const cells = config || Array(9).fill(null);
    return (
        <div className="bg-board-bg p-2 rounded-lg shadow-xl aspect-square w-full max-w-[400px] mx-auto grid grid-cols-3 grid-rows-3 gap-1">
            {cells.map((ownerId, index) => {
                const card = ownerId ? createDummyCard(ownerId) : null;
                if (card && cardStatuses && cardStatuses[index]) {
                    card.statuses = cardStatuses[index];
                }
                return (
                    <div key={index} className="bg-board-cell rounded flex items-center justify-center relative">
                        {card ? (
                            <div className="w-full h-full p-0.5">
                                <Card card={card} isFaceUp={true} playerColorMap={DUMMY_COLOR_MAP} localPlayerId={1} />
                            </div>
                        ) : (
                            <div className="w-1 h-1 bg-gray-600 rounded-full opacity-20"></div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

export const RulesModal: React.FC<RulesModalProps> = ({ isOpen, onClose }) => {
    const { resources, t } = useLanguage();
    const r = resources.rules;

    const RULES: RuleSection[] = [
        {
            id: 'intro',
            title: r.introTitle,
            content: <div className="text-left whitespace-pre-wrap">{r.introText}</div>,
            demoConfig: [null, 1, null, null, 2, null, null, null, null],
        },
        {
            id: 'components',
            title: r.componentsTitle,
            content: <div className="text-left whitespace-pre-wrap">{r.componentsText}</div>,
        },
        {
            id: 'turn_order',
            title: r.turnTitle,
            content: <div className="text-left whitespace-pre-wrap">{r.turnText}</div>,
        },
        {
            id: 'priority',
            title: r.priorityTitle,
            content: <div className="text-left whitespace-pre-wrap">{r.priorityText}</div>,
        },
        {
            id: 'stack',
            title: r.stackTitle,
            content: <div className="text-left whitespace-pre-wrap">{r.stackText}</div>,
        },
        {
            id: 'statuses_support',
            title: r.supportTitle,
            content: <div className="text-left whitespace-pre-wrap">{r.supportText}</div>,
            demoConfig: [null, null, null, null, 1, 1, null, null, null],
            demoCardStatuses: { 4: [{ type: 'Support', addedByPlayerId: 1 }], 5: [{ type: 'Support', addedByPlayerId: 1 }] }
        },
        {
            id: 'statuses_threat',
            title: r.threatTitle,
            content: <div className="text-left whitespace-pre-wrap">{r.threatText}</div>,
            demoConfig: [null, 2, null, null, 1, null, null, 2, null],
            demoCardStatuses: { 4: [{ type: 'Threat', addedByPlayerId: 2 }] }
        },
        {
            id: 'deployment',
            title: r.deployTitle,
            content: <div className="text-left whitespace-pre-wrap">{r.deployText}</div>,
            demoConfig: [null, null, null, null, 1, null, null, null, null],
        },
        {
            id: 'scoring',
            title: r.scoringTitle,
            content: <div className="text-left whitespace-pre-wrap">{r.scoringText}</div>,
            demoConfig: [1, 1, 1, null, null, null, null, null, null]
        },
        {
            id: 'endgame',
            title: r.endgameTitle,
            content: <div className="text-left whitespace-pre-wrap">{r.endgameText}</div>,
        }
    ];

    const [activeSectionId, setActiveSectionId] = useState<string>(RULES[0].id);
    const activeSection = useMemo(() => RULES.find(r => r.id === activeSectionId) || RULES[0], [activeSectionId, RULES]);

    useEffect(() => {
        if (isOpen) {
            const imagesToLoad = [RIOT_AGENT_IMG, PRINCEPS_IMG, RIOT_AGENT_FALLBACK, PRINCEPS_FALLBACK];
            imagesToLoad.forEach((src) => { const img = new Image(); img.src = src; });
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-[100]" onClick={onClose}>
            <div className="bg-gray-900 w-[95vw] h-[90vh] rounded-xl shadow-2xl flex overflow-hidden border border-gray-700" onClick={e => e.stopPropagation()}>
                {/* Left Panel */}
                <div className="w-1/4 min-w-[250px] bg-gray-800 border-r border-gray-700 flex flex-col">
                    <div className="p-4 border-b border-gray-700 bg-gray-800">
                        <h2 className="text-xl font-bold text-white">{r.title}</h2>
                    </div>
                    <div className="flex-grow overflow-y-auto p-2 space-y-1">
                        {RULES.map(section => (
                            <button
                                key={section.id}
                                onClick={() => setActiveSectionId(section.id)}
                                className={`w-full text-left px-4 py-3 rounded-md transition-colors text-sm font-medium ${
                                    activeSectionId === section.id ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-400 hover:bg-gray-700 hover:text-gray-200'
                                }`}
                            >
                                {section.title}
                            </button>
                        ))}
                    </div>
                    <div className="p-4 border-t border-gray-700">
                        <button onClick={onClose} className="w-full bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 rounded transition-colors">
                            {t('close')}
                        </button>
                    </div>
                </div>
                {/* Center Panel */}
                <div className="w-2/5 p-8 overflow-y-auto border-r border-gray-700 bg-gray-900 text-left">
                    <h1 className="text-3xl font-bold text-white mb-6 border-b border-indigo-500 pb-2 inline-block">
                        {activeSection.title}
                    </h1>
                    <div className="prose prose-invert prose-lg max-w-none text-gray-300 leading-relaxed text-left">
                        {activeSection.content}
                    </div>
                </div>
                {/* Right Panel */}
                <div className="w-[35%] bg-gray-800 flex flex-col items-center justify-center p-8 relative">
                    <h3 className="absolute top-6 left-0 right-0 text-center text-gray-400 text-sm uppercase tracking-widest font-bold">Visual Demo</h3>
                    <div className="w-full">
                        <MiniBoard config={activeSection.demoConfig} cardStatuses={activeSection.demoCardStatuses} />
                    </div>
                </div>
            </div>
        </div>
    );
};
