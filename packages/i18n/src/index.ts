// UI languages (spec §2.4): English, Bahasa Malaysia, 中文 (简体). Tamil has a slot (D18) and falls back to English.
// One JSON per language per module in ../messages/<locale>/<namespace>.json; `pnpm i18n:check` fails on any missing key.
import enAuth from '../messages/en/auth.json';
import enCommon from '../messages/en/common.json';
import enConsole from '../messages/en/console.json';
import enErrors from '../messages/en/errors.json';
import enHome from '../messages/en/home.json';
import enLegal from '../messages/en/legal.json';
import enOnboarding from '../messages/en/onboarding.json';
import enSettings from '../messages/en/settings.json';
import enTeam from '../messages/en/team.json';
import msAuth from '../messages/ms/auth.json';
import msCommon from '../messages/ms/common.json';
import msConsole from '../messages/ms/console.json';
import msErrors from '../messages/ms/errors.json';
import msHome from '../messages/ms/home.json';
import msLegal from '../messages/ms/legal.json';
import msOnboarding from '../messages/ms/onboarding.json';
import msSettings from '../messages/ms/settings.json';
import msTeam from '../messages/ms/team.json';
import zhAuth from '../messages/zh/auth.json';
import zhCommon from '../messages/zh/common.json';
import zhConsole from '../messages/zh/console.json';
import zhErrors from '../messages/zh/errors.json';
import zhHome from '../messages/zh/home.json';
import zhLegal from '../messages/zh/legal.json';
import zhOnboarding from '../messages/zh/onboarding.json';
import zhSettings from '../messages/zh/settings.json';
import zhTeam from '../messages/zh/team.json';

export const LOCALES = ['en', 'ms', 'zh'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'en';
export const LOCALE_LABELS: Record<Locale, string> = { en: 'English', ms: 'Bahasa Malaysia', zh: '中文' };
export const NAMESPACES = ['common', 'auth', 'errors', 'legal', 'onboarding', 'home', 'team', 'settings', 'console'] as const;

const en = {
  common: enCommon,
  auth: enAuth,
  errors: enErrors,
  legal: enLegal,
  onboarding: enOnboarding,
  home: enHome,
  team: enTeam,
  settings: enSettings,
  console: enConsole,
};
export type Messages = typeof en;

const all: Record<Locale, Messages> = {
  en,
  ms: {
    common: msCommon,
    auth: msAuth,
    errors: msErrors,
    legal: msLegal,
    onboarding: msOnboarding,
    home: msHome,
    team: msTeam,
    settings: msSettings,
    console: msConsole,
  } as Messages,
  zh: {
    common: zhCommon,
    auth: zhAuth,
    errors: zhErrors,
    legal: zhLegal,
    onboarding: zhOnboarding,
    home: zhHome,
    team: zhTeam,
    settings: zhSettings,
    console: zhConsole,
  } as Messages,
};

export const isLocale = (v: unknown): v is Locale => typeof v === 'string' && (LOCALES as readonly string[]).includes(v);

export function messagesFor(locale: Locale): Messages {
  return all[locale] ?? en;
}

/** Cookie first, then the browser's Accept-Language, then English. */
export function pickLocale(cookie: string | undefined | null, acceptLanguage: string | undefined | null): Locale {
  if (isLocale(cookie)) return cookie;
  for (const part of (acceptLanguage ?? '').split(',')) {
    const tag = part.split(';')[0]?.trim().toLowerCase() ?? '';
    if (tag.startsWith('ms') || tag.startsWith('id')) return 'ms';
    if (tag.startsWith('zh')) return 'zh';
    if (tag.startsWith('en')) return 'en';
  }
  return DEFAULT_LOCALE;
}

/** Money is always shown as "RM 1,234.50" (spec §2.4), whatever the UI language. */
export function formatRM(sen: number): string {
  return `RM ${(sen / 100).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Every key path in a messages object, e.g. "team.invite.title". */
export function keyPaths(obj: unknown, prefix = ''): string[] {
  if (obj === null || typeof obj !== 'object') return [prefix];
  return Object.entries(obj as Record<string, unknown>).flatMap(([k, v]) => keyPaths(v, prefix ? `${prefix}.${k}` : k));
}

export const allMessages = all;
