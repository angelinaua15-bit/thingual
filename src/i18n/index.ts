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

/** Plural category without relying on Intl (older engines): one | few | many | other. */
function plural(code: LangCode, n: number): 'one' | 'few' | 'many' | 'other' {
  try {
    return new Intl.PluralRules(code).select(n) as 'one' | 'few' | 'many' | 'other';
  } catch {
    const i = Math.abs(Math.trunc(n)), d10 = i % 10, d100 = i % 100;
    if (code === 'uk' || code === 'pl') {
      if (code === 'uk' && d10 === 1 && d100 !== 11) return 'one';
      if (code === 'pl' && i === 1) return 'one';
      if (d10 >= 2 && d10 <= 4 && (d100 < 12 || d100 > 14)) return 'few';
      return 'many';
    }
    return i === 1 ? 'one' : 'other';
  }
}

/**
 * {name} → value. Plurals: {n:word|words} (2 forms: one|other) or {n:слово|слова|слів} (3 forms: one|few|many).
 */
const fill = (s: string, vars: Vars | undefined, code: LangCode) =>
  vars
    ? s
        .replace(/\{(\w+):([^}]+)\}/g, (_, k, forms: string) => {
          const n = Number(vars[k]);
          const f = forms.split('|');
          const cat = plural(code, Number.isFinite(n) ? n : 0);
          if (f.length >= 3) return cat === 'one' ? f[0] : cat === 'few' ? f[1] : f[2];
          return cat === 'one' ? f[0] : f[1] ?? f[0];
        })
        .replace(/\{(\w+)\}/g, (_, k) => (vars[k] !== undefined ? String(vars[k]) : `{${k}}`))
    : s;

export function translate(code: LangCode, path: string, vars?: Vars): string {
  const own = lookup(DICTS[code] ?? en, path);
  const v = own ?? lookup(en, path);
  return typeof v === 'string' ? fill(v, vars, own !== undefined ? code : 'en') : path;
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
  if (ui === 'en') return langInfo(code).english;
  if (ui === 'uk') {
    const UK: Partial<Record<LangCode, string>> = {
      en: 'англійська', uk: 'українська', es: 'іспанська', pt: 'португальська', de: 'німецька', fr: 'французька',
      it: 'італійська', pl: 'польська', tr: 'турецька', zh: 'китайська', ja: 'японська', ko: 'корейська',
      ar: 'арабська', hi: 'гінді', id: 'індонезійська', vi: 'в’єтнамська',
    };
    return UK[code] ?? langInfo(code).native;
  }
  // other interface languages: the system's own names ("español", "Deutsch"…), English as a fallback
  try {
    const name = new Intl.DisplayNames([ui], { type: 'language' }).of(code);
    if (name && name !== code) return name;
  } catch {}
  return langInfo(code).english;
};
