// Core i18n types and utilities

export type Locale = 'lv' | 'en';

export const DEFAULT_LOCALE: Locale = 'lv';
export const SUPPORTED_LOCALES: Locale[] = ['lv', 'en'];

export const LOCALE_COOKIE_NAME = 'posterns-locale';
export const LOCALE_COOKIE_MAX_AGE = 365 * 24 * 60 * 60; // 1 year in seconds

// Browser language detection helper
export function detectBrowserLocale(): Locale {
  if (typeof window === 'undefined') return DEFAULT_LOCALE;

  const browserLang = navigator.language.split('-')[0].toLowerCase();
  if (SUPPORTED_LOCALES.includes(browserLang as Locale)) {
    return browserLang as Locale;
  }
  return DEFAULT_LOCALE;
}

// Cookie helpers
export function getLocaleCookie(): Locale | null {
  if (typeof document === 'undefined') return null;

  const cookies = document.cookie.split(';');
  const localeCookie = cookies.find(c => c.trim().startsWith(`${LOCALE_COOKIE_NAME}=`));
  if (localeCookie) {
    const value = localeCookie.split('=')[1] as Locale;
    if (SUPPORTED_LOCALES.includes(value)) {
      return value;
    }
  }
  return null;
}

export function setLocaleCookie(locale: Locale): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${LOCALE_COOKIE_NAME}=${locale}; path=/; max-age=${LOCALE_COOKIE_MAX_AGE}; SameSite=Lax`;
}

// Validate if a string is a supported locale
export function isValidLocale(value: string): value is Locale {
  return SUPPORTED_LOCALES.includes(value as Locale);
}
