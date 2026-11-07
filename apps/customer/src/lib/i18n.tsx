import { createContext, useContext, useLayoutEffect, useState, type ReactNode } from 'react';
import hi from '../locales/hi.json';
import mr from '../locales/mr.json';
export const languages = [
  { code: 'en', name: 'English', locale: 'en-IN' },
  { code: 'hi', name: 'हिन्दी', locale: 'hi-IN' },
  { code: 'mr', name: 'मराठी', locale: 'mr-IN' },
] as const;
export type Language = typeof languages[number]['code'];
const KEY = 'sync:language:v1';
const dictionaries: Record<Language, Record<string, string>> = { en: {}, hi, mr };
export function validLanguage(value: unknown): value is Language { return languages.some(item => item.code === value); }
function initialLanguage(): Language {
  if (typeof window === 'undefined') return 'en';
  try { const saved = localStorage.getItem(KEY); if (validLanguage(saved)) return saved; } catch {}
  const browser = typeof navigator === 'undefined' ? 'en' : navigator.language.split('-')[0];
  return validLanguage(browser) ? browser : 'en';
}
let activeLanguage = initialLanguage();
export function translate(source: string | undefined | null, language: Language = activeLanguage, values: Record<string, string | number> = {}): string {
  if (!source) return '';
  const key = source.trim(); const dictionary = dictionaries[language];
  let text = Object.prototype.hasOwnProperty.call(dictionary, key) ? source.slice(0, source.indexOf(key)) + dictionary[key] + source.slice(source.indexOf(key) + key.length) : source;
  if (language !== 'en' && text === source) {
    const count = /^Needs at least (\d+) (employees|locations)$/.exec(key);
    const tiers = /^Available in Tier ([\d /]+) cities$/.exec(key);
    if (count) text = translate(`Needs at least {count} ${count[2]}`, language, { count: count[1] });
    else if (tiers) text = translate('Available in Tier {tiers} cities', language, { tiers: tiers[1] });
  }
  return text.replace(/\{(\w+)\}/g, (match, name: string) => String(values[name] ?? match));
}
export function money(paise: number, decimals = true) {
  return new Intl.NumberFormat(languages.find(item => item.code === activeLanguage)!.locale, { style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: decimals ? 2 : 0 }).format(paise / 100);
}
type I18n = { language: Language; locale: string; setLanguage: (language: Language) => void; t: (source: string | null | undefined, values?: Record<string, string | number>) => string };
const Context = createContext<I18n | null>(null);
export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, update] = useState<Language>(initialLanguage);
  activeLanguage = language;
  useLayoutEffect(() => { document.documentElement.lang = language; document.documentElement.dir = 'ltr'; }, [language]);
  const setLanguage = (value: Language) => {
    if (!validLanguage(value)) return;
    update(value);
    try { localStorage.setItem(KEY, value); } catch { /* Language still applies for this session. */ }
  };
  return <Context.Provider value={{ language, locale: languages.find(item => item.code === language)!.locale, setLanguage, t: (source, values) => translate(source, language, values) }}>{children}</Context.Provider>;
}
export function useI18n() {
  const value = useContext(Context);
  if (!value) throw new Error('Language provider missing');
  return value;
}
