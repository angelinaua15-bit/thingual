import { en, type PartialStrings } from './en';
import { uk } from './uk';
import { es } from './es';
import { de } from './de';
import { pl } from './pl';
import { fr } from './fr';
import { useApp } from '../store/useApp';
import { LangCode, lang as langInfo } from '../data/languages';
import { I18nManager } from 'react-native';

const DICTS: Partial<Record<LangCode, PartialStrings>> = { en, uk, es, de, pl, fr };

type Vars = Record<string, string | number>;

const lookup = (dict: unknown, path: string): unknown =>
  path.split('.').reduce<unknown>((o, k) => (o && typeof o === 'object' ? (o as Record<string, unknown>)[k] : undefined), dict);

const fill = (s: string, vars?: Vars) =>
  vars ? s.replace(/\{(\w+)\}/g, (_, k) => (vars[k] !== undefined ? String(vars[k]) : `{${k}}`)) : s;

export function translate(code: LangCode, path: string, vars?: Vars): string {
  const v = lookup(DICTS[code] ?? en, path) ?? lookup(en, path);
  return typeof v === 'string' ? fill(v, vars) : path;
}

export function translateArr(code: LangCode, path: string): string[] {
  const v = lookup(DICTS[code] ?? en, path) ?? lookup(en, path);
  return Array.isArray(v) ? (v as string[]) : [];
}

export function useT() {
  const code = useApp((s) => s.settings.uiLang);
  const t = (path: string, vars?: Vars) => translate(code, path, vars);
  const ta = (path: string) => translateArr(code, path);
  return { t, ta, code, rtl: !!langInfo(code).rtl || I18nManager.isRTL };
}

/** Language name shown in the interface language (falls back to the native name). */
export const languageName = (code: LangCode, ui: LangCode) => {
  if (ui === 'uk') {
    const UK: Partial<Record<LangCode, string>> = {
      en: 'англійська', uk: 'українська', es: 'іспанська', pt: 'португальська', de: 'німецька', fr: 'французька',
      it: 'італійська', pl: 'польська', tr: 'турецька', zh: 'китайська', ja: 'японська', ko: 'корейська',
      ar: 'арабська', hi: 'гінді', id: 'індонезійська', vi: 'в’єтнамська',
    };
    return UK[code] ?? langInfo(code).native;
  }
  return langInfo(code).english;
};
