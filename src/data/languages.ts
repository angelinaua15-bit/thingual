export type LangCode =
  | 'en' | 'uk' | 'es' | 'pt' | 'de' | 'fr' | 'it' | 'pl'
  | 'tr' | 'zh' | 'ja' | 'ko' | 'ar' | 'hi' | 'id' | 'vi';

export type Language = {
  code: LangCode;
  /** Name in the language itself */
  native: string;
  /** English name */
  english: string;
  /** BCP-47 voice for text-to-speech */
  voice: string;
  rtl?: boolean;
  /** Language uses grammatical gender / articles shown on cards */
  articles?: boolean;
  /** Non-Latin script: show romanization */
  romanize?: boolean;
};

export const LANGUAGES: Language[] = [
  { code: 'en', native: 'English', english: 'English', voice: 'en-US' },
  { code: 'uk', native: 'Українська', english: 'Ukrainian', voice: 'uk-UA' },
  { code: 'es', native: 'Español', english: 'Spanish', voice: 'es-ES', articles: true },
  { code: 'pt', native: 'Português (Brasil)', english: 'Portuguese', voice: 'pt-BR', articles: true },
  { code: 'de', native: 'Deutsch', english: 'German', voice: 'de-DE', articles: true },
  { code: 'fr', native: 'Français', english: 'French', voice: 'fr-FR', articles: true },
  { code: 'it', native: 'Italiano', english: 'Italian', voice: 'it-IT', articles: true },
  { code: 'pl', native: 'Polski', english: 'Polish', voice: 'pl-PL' },
  { code: 'tr', native: 'Türkçe', english: 'Turkish', voice: 'tr-TR' },
  { code: 'zh', native: '简体中文', english: 'Chinese', voice: 'zh-CN', romanize: true },
  { code: 'ja', native: '日本語', english: 'Japanese', voice: 'ja-JP', romanize: true },
  { code: 'ko', native: '한국어', english: 'Korean', voice: 'ko-KR', romanize: true },
  { code: 'ar', native: 'العربية', english: 'Arabic', voice: 'ar-SA', rtl: true, romanize: true },
  { code: 'hi', native: 'हिन्दी', english: 'Hindi', voice: 'hi-IN', romanize: true },
  { code: 'id', native: 'Bahasa Indonesia', english: 'Indonesian', voice: 'id-ID' },
  { code: 'vi', native: 'Tiếng Việt', english: 'Vietnamese', voice: 'vi-VN' },
];

export const lang = (code: LangCode) => LANGUAGES.find((l) => l.code === code) ?? LANGUAGES[0];

/** Languages that have a fully translated interface. Others fall back to English. */
export const UI_LANGUAGES: LangCode[] = ['en', 'uk'];
