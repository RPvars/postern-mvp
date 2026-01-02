'use client';

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { useSession } from 'next-auth/react';
import {
  Locale,
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  getLocaleCookie,
  setLocaleCookie,
  detectBrowserLocale,
} from '@/lib/i18n';

interface LocaleContextType {
  locale: Locale;
  setLocale: (locale: Locale) => Promise<void>;
  isLoading: boolean;
}

const LocaleContext = createContext<LocaleContextType | undefined>(undefined);

interface LocaleProviderProps {
  children: ReactNode;
}

export function LocaleProvider({ children }: LocaleProviderProps) {
  const { data: session, status } = useSession();
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize locale on mount
  useEffect(() => {
    const initLocale = async () => {
      // 1. Check cookie first (fastest, available immediately)
      const cookieLocale = getLocaleCookie();
      if (cookieLocale) {
        setLocaleState(cookieLocale);
        setIsLoading(false);
        return;
      }

      // 2. If logged in, check user preference from database
      if (status === 'authenticated' && session?.user?.id) {
        try {
          const response = await fetch('/api/user/locale', {
            method: 'GET',
            credentials: 'include',
          });
          if (response.ok) {
            const data = await response.json();
            if (data.locale && SUPPORTED_LOCALES.includes(data.locale)) {
              setLocaleState(data.locale);
              setLocaleCookie(data.locale);
              setIsLoading(false);
              return;
            }
          }
        } catch (error) {
          // Network error - fall through to browser detection
          console.warn('Failed to fetch user locale, using browser detection:', error);
        }
      }

      // 3. Detect browser language for first-time visitors or when API fails
      if (status !== 'loading') {
        const browserLocale = detectBrowserLocale();
        setLocaleState(browserLocale);
        setLocaleCookie(browserLocale);
        setIsLoading(false);
      }
    };

    // Only run when session status is determined
    if (status !== 'loading') {
      initLocale();
    }
  }, [session?.user?.id, status]);

  // Update locale handler
  const setLocale = useCallback(async (newLocale: Locale) => {
    // Validate locale
    if (!SUPPORTED_LOCALES.includes(newLocale)) {
      console.error('Invalid locale:', newLocale);
      return;
    }

    // Update state and cookie immediately for responsive UI
    setLocaleState(newLocale);
    setLocaleCookie(newLocale);

    // Update HTML lang attribute
    if (typeof document !== 'undefined') {
      document.documentElement.lang = newLocale;
    }

    // If logged in, save to database (async, don't block UI)
    if (status === 'authenticated') {
      try {
        await fetch('/api/user/locale', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ locale: newLocale }),
        });
      } catch (error) {
        console.error('Failed to save locale preference:', error);
        // Don't revert - cookie is already set and user experience is fine
      }
    }

    // Refresh page to load new messages from next-intl
    window.location.reload();
  }, [status]);

  // Update HTML lang attribute when locale changes
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = locale;
    }
  }, [locale]);

  return (
    <LocaleContext.Provider value={{ locale, setLocale, isLoading }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (context === undefined) {
    throw new Error('useLocale must be used within a LocaleProvider');
  }
  return context;
}
