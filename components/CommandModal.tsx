import React, { useState, useMemo } from 'react';
import { Card } from '../types';
import { Card as CardComponent } from './Card';
import { formatAbilityText } from '../utils/textFormatters';
import { useLanguage } from '../contexts/LanguageContext';

interface CommandModalProps {
    isOpen: boolean;
    card: Card;
    playerColorMap: Map<number, string>;
    onConfirm: (selectedIndices: number[]) => void;
    onCancel: () => void;
}

export const CommandModal: React.FC<CommandModalProps> = ({ isOpen, card, playerColorMap, onConfirm, onCancel }) => {
    const { getCardTranslation } = useLanguage();
    const [selectedIndices, setSelectedIndices] = useState<number[]>([]);

    // Use localized text if available
    const localized = card.baseId ? getCardTranslation(card.baseId) : undefined;
    const displayCard = localized ? { ...card, ...localized } : card;
    const abilityText = displayCard.ability || "";

    // Parse Ability Text to extract Main Effect and Options
    const parsedAbility = useMemo(() => {
        // Regex to find "Choose X of Y:"
        // Matches text before the choice as "main", and text after as "optionsBlock"
        const match = abilityText.match(/(.*?)Choose (\d+) of \d+:(.*)/s);
        
        if (match) {
            const mainText = match[1].trim();
            const requiredCount = parseInt(match[2], 10);
            const optionsBlock = match[3];
            
            // Split options by bullet point '‣' or newlines if formatted that way
            const rawOptions = optionsBlock.split(/‣/).map(s => s.trim()).filter(s => s.length > 0);
            
            return {
                mainText,
                requiredCount,
                options: rawOptions
            };
        }
        
        // Fallback for non-standard formats
        return {
            mainText: abilityText,
            requiredCount: 0,
            options: []
        };
    }, [abilityText]);

    if (!isOpen) return null;

    const handleOptionClick = (index: number) => {
        if (selectedIndices.includes(index)) {
            // Deselect
            setSelectedIndices(prev => prev.filter(i => i !== index));
        } else {
            // Select (if limit not reached)
            if (selectedIndices.length < parsedAbility.requiredCount) {
                setSelectedIndices(prev => [...prev, index]);
            }
        }
    };

    const isReady = selectedIndices.length === parsedAbility.requiredCount;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-[200]">
            <div className="bg-gray-900 rounded-xl border-2 border-yellow-500 shadow-2xl p-6 w-full max-w-4xl flex gap-8">
                
                {/* Left: Card View */}
                <div className="w-1/3 flex flex-col items-center justify-center">
                    <div className="w-64 h-64 relative">
                         <CardComponent card={displayCard} isFaceUp={true} playerColorMap={playerColorMap as any} disableTooltip={true} />
                    </div>
                    <h2 className="text-2xl font-bold text-yellow-500 mt-4 text-center">{displayCard.name}</h2>
                </div>

                {/* Right: Selection Interface */}
                <div className="w-2/3 flex flex-col">
                    <h3 className="text-xl font-bold text-white mb-4 border-b border-gray-700 pb-2">Execute Command</h3>
                    
                    {/* Main Ability */}
                    <div className="bg-gray-800 p-4 rounded-lg mb-6 border-l-4 border-indigo-500">
                        <h4 className="text-indigo-400 font-bold text-sm uppercase mb-1">Main Effect</h4>
                        <p className="text-lg text-white">{parsedAbility.mainText}</p>
                    </div>

                    {/* Options Selection */}
                    {parsedAbility.options.length > 0 && (
                        <div className="flex-grow">
                            <h4 className="text-yellow-500 font-bold text-sm uppercase mb-2">
                                Select {parsedAbility.requiredCount} options (in order):
                            </h4>
                            <div className="space-y-2">
                                {parsedAbility.options.map((optionText, index) => {
                                    const isSelected = selectedIndices.includes(index);
                                    const order = selectedIndices.indexOf(index) + 1;

                                    return (
                                        <button
                                            key={index}
                                            onClick={() => handleOptionClick(index)}
                                            className={`w-full text-left p-3 rounded-lg border transition-all flex items-center gap-3 ${
                                                isSelected 
                                                    ? 'bg-yellow-900/30 border-yellow-500 text-white' 
                                                    : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-750 hover:border-gray-600'
                                            }`}
                                        >
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold border ${
                                                isSelected ? 'bg-yellow-500 text-black border-yellow-500' : 'bg-gray-700 text-gray-500 border-gray-600'
                                            }`}>
                                                {isSelected ? order : ''}
                                            </div>
                                            <span className="text-base">{optionText}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="mt-8 flex justify-end gap-4">
                        <button 
                            onClick={onCancel}
                            className="px-6 py-2 rounded bg-gray-700 hover:bg-gray-600 text-white font-bold transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={() => onConfirm(selectedIndices)}
                            disabled={!isReady}
                            className={`px-6 py-2 rounded font-bold transition-colors ${
                                isReady 
                                    ? 'bg-yellow-500 hover:bg-yellow-400 text-black shadow-[0_0_10px_#eab308]' 
                                    : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                            }`}
                        >
                            Execute Sequence
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};