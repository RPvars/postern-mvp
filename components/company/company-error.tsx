'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Navigation } from '@/components/navigation';
import { AlertCircle } from 'lucide-react';

interface CompanyErrorProps {
  error: string | null;
  companyId?: string;
}

export function CompanyError({ error, companyId }: CompanyErrorProps) {
  const t = useTranslations('company');

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="flex items-center justify-center p-8">
        <div className="max-w-md w-full bg-card rounded-2xl shadow-lg p-8 text-center">
          <div className="mb-6 flex justify-center">
            <div className="bg-destructive/10 rounded-full p-5">
              <AlertCircle className="w-10 h-10 text-destructive" />
            </div>
          </div>

          <h1 className="text-xl font-bold text-foreground mb-2">
            {error || t('notFound')}
          </h1>

          <p className="text-muted-foreground mb-2 leading-relaxed text-sm">
            {t('errorDescription')}
          </p>

          {companyId && (
            <p className="text-xs font-mono text-muted-foreground/60 mb-6">
              {companyId}
            </p>
          )}

          <div className="flex flex-col gap-2">
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-lg bg-[#FEC200] px-4 py-2.5 text-sm font-semibold text-black hover:bg-[#e5af00] transition-colors"
            >
              {t('backToSearch')}
            </Link>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center justify-center rounded-lg border px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-accent transition-colors"
            >
              {t('tryAgain')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
