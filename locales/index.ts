
import { TranslationResource, LanguageCode } from './types';
import { en } from './en';
import { ru } from './ru';

// Helper to create a partial translation based on English for rapid prototyping of other languages
// In a real scenario, these would be fully translated files like ru.ts
const createLocale = (overrides: Partial<TranslationResource['ui']>, ruleTitle: string): TranslationResource => {
    return {
        ui: { ...en.ui, ...overrides },
        rules: { ...en.rules, title: ruleTitle },
        cards: en.cards, // Fallback to English cards for now
        counters: en.counters // Fallback to English counters for now
    };
};

// Mock translations for other languages to demonstrate the system works without creating 14 massive files in this snippet.
// In a production app, these would be imported from ./de.ts, ./fr.ts etc.
export const resources: Record<LanguageCode, TranslationResource> = {
    en,
    ru,
    de: createLocale({ startGame: "Spiel Starten", settings: "Einstellungen", rules: "Regeln", language: "Sprache", exit: "Verlassen", surrender: "Aufgeben" }, "Spielregeln"),
    fr: createLocale({ startGame: "Démarrer", settings: "Paramètres", rules: "Règles", language: "Langue", exit: "Quitter", surrender: "Abandonner" }, "Règles du jeu"),
    it: createLocale({ startGame: "Inizia Gioco", settings: "Impostazioni", rules: "Regole", language: "Lingua", exit: "Esci", surrender: "Arrendersi" }, "Regole del gioco"),
    pt: createLocale({ startGame: "Iniciar Jogo", settings: "Configurações", rules: "Regras", language: "Idioma", exit: "Sair", surrender: "Desistir" }, "Regras do Jogo"),
    es: createLocale({ startGame: "Iniciar Juego", settings: "Ajustes", rules: "Reglas", language: "Idioma", exit: "Salir", surrender: "Rendirse" }, "Reglas del Juego"),
    zh: createLocale({ startGame: "开始游戏", settings: "设置", rules: "规则", language: "语言", exit: "退出", surrender: "投降" }, "游戏规则"),
    hi: createLocale({ startGame: "खेल शुरू करें", settings: "सेटिंग्स", rules: "नियम", language: "भाषा", exit: "बाहर जाएं", surrender: "समर्पण" }, "खेल के नियम"),
    ar: createLocale({ startGame: "ابدأ اللعبة", settings: "الإعدادات", rules: "القواعد", language: "لغة", exit: "خروج", surrender: "استسلام" }, "قواعد اللعبة"),
    uk: createLocale({ startGame: "Почати гру", settings: "Налаштування", rules: "Правила", language: "Мова", exit: "Вихід", surrender: "Здатися" }, "Правила гри"),
    be: createLocale({ startGame: "Пачаць гульню", settings: "Налады", rules: "Правілы", language: "Мова", exit: "Выхад", surrender: "Здацца" }, "Правілы гульні"),
    tt: createLocale({ startGame: "Уенны башлау", settings: "Көйләүләр", rules: "Кагыйдәләр", language: "Тел", exit: "Чыгу", surrender: "Бирелү" }, "Уен кагыйдәләре"),
    sr: createLocale({ startGame: "Започни игру", settings: "Подешавања", rules: "Правила", language: "Језик", exit: "Излаз", surrender: "Предај се" }, "Правила игре"),
};

export const LANGUAGE_NAMES: Record<LanguageCode, string> = {
    en: "English",
    ru: "Русский",
    de: "Deutsch",
    fr: "Français",
    it: "Italiano",
    pt: "Português",
    es: "Español",
    zh: "中文",
    hi: "हिन्दी",
    ar: "العربية",
    uk: "Українська",
    be: "Беларуская",
    tt: "Татарча",
    sr: "Српски"
};
