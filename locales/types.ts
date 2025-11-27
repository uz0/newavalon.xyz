
export type LanguageCode = 'en' | 'ru' | 'de' | 'fr' | 'it' | 'pt' | 'zh' | 'hi' | 'es' | 'ar' | 'uk' | 'be' | 'tt' | 'sr';

export interface CardTranslation {
  name: string;
  ability: string;
  flavorText?: string;
}

export interface CounterTranslation {
  name: string;
  description: string;
}

export interface TranslationResource {
  ui: {
    startGame: string;
    joinGame: string;
    deckBuilding: string;
    rules: string;
    settings: string;
    language: string;
    serverAddress: string;
    saveApply: string;
    cancel: string;
    close: string;
    tokens: string;
    counters: string;
    phase: string;
    autoAbility: string;
    newGame: string;
    exit: string;
    surrender: string;
    mode: string;
    size: string;
    dummies: string;
    spectatorMode: string;
    spectatorMsg: string;
    readyCheck: string;
    imReady: string;
    waiting: string;
    cancelStart: string;
    assignTeams: string;
    confirmTeams: string;
    unassigned: string;
    team: string;
    deck: string;
    discard: string;
    showcase: string;
    customDeck: string;
    loadDeck: string;
    clear: string;
    save: string;
    filter: string;
    currentDeck: string;
    emptyDeck: string;
    clickToAdd: string;
    view: string;
    play: string;
    playFaceDown: string;
    toHand: string;
    toDiscard: string;
    revealToAll: string;
    requestReveal: string;
    flipUp: string;
    flipDown: string;
  };
  rules: {
    title: string;
    introTitle: string;
    introText: string;
    componentsTitle: string;
    componentsText: string;
    turnTitle: string;
    turnText: string;
    priorityTitle: string;
    priorityText: string;
    stackTitle: string;
    stackText: string;
    supportTitle: string;
    supportText: string;
    threatTitle: string;
    threatText: string;
    deployTitle: string;
    deployText: string;
    scoringTitle: string;
    scoringText: string;
    endgameTitle: string;
    endgameText: string;
  };
  cards: Record<string, CardTranslation>;
  counters: Record<string, CounterTranslation>;
}
