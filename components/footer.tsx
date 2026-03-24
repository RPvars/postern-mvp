'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';

export function Footer() {
  const t = useTranslations('legal.footer');

  return (
    <footer className="border-t bg-background/80 backdrop-blur-sm mt-auto">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-muted-foreground">
          <span>&copy; {new Date().getFullYear()} {t('copyright')}</span>
          <div className="flex gap-4">
            <Link href="/legal/privacy" className="hover:text-foreground transition-colors">
              {t('privacy')}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
