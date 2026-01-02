import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const locale = cookieStore.get('posterns-locale')?.value || 'lv';

  // Validate locale
  const validLocales = ['lv', 'en'];
  const validLocale = validLocales.includes(locale) ? locale : 'lv';

  return {
    locale: validLocale,
    messages: (await import(`@/messages/${validLocale}.json`)).default,
    onError(error) {
      // Show errors in development
      if (process.env.NODE_ENV === 'development') {
        console.error('Missing translation:', error);
      }
    },
    getMessageFallback({ namespace, key }) {
      // In dev: show error key; in prod: fallback gracefully
      if (process.env.NODE_ENV === 'development') {
        return `MISSING: ${namespace}.${key}`;
      }
      return key;
    }
  };
});
