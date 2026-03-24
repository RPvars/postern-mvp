'use client';

import { useTranslations } from 'next-intl';
import { Navigation } from '@/components/navigation';

export default function PrivacyPolicyPage() {
  const t = useTranslations('legal.privacy');

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <h1 className="text-3xl font-bold mb-6">{t('title')}</h1>
        <div className="prose prose-sm dark:prose-invert max-w-none space-y-6">
          <p className="text-muted-foreground">{t('lastUpdated')}: 2026-03-24</p>

          <section>
            <h2 className="text-xl font-semibold">{t('controller.title')}</h2>
            <p>{t('controller.description')}</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">{t('dataProcessed.title')}</h2>
            <p>{t('dataProcessed.description')}</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>{t('dataProcessed.companyData')}</li>
              <li>{t('dataProcessed.financialData')}</li>
              <li>{t('dataProcessed.personData')}</li>
              <li>{t('dataProcessed.accountData')}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold">{t('legalBasis.title')}</h2>
            <p>{t('legalBasis.description')}</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>{t('legalBasis.publicRegisters')}</li>
              <li>{t('legalBasis.legitimateInterest')}</li>
              <li>{t('legalBasis.consent')}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold">{t('dataSources.title')}</h2>
            <p>{t('dataSources.description')}</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">{t('retention.title')}</h2>
            <p>{t('retention.description')}</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">{t('rights.title')}</h2>
            <p>{t('rights.description')}</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>{t('rights.access')}</li>
              <li>{t('rights.rectification')}</li>
              <li>{t('rights.erasure')}</li>
              <li>{t('rights.restriction')}</li>
              <li>{t('rights.portability')}</li>
              <li>{t('rights.objection')}</li>
            </ul>
            <p className="mt-2">{t('rights.contact')}</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">{t('cookies.title')}</h2>
            <p>{t('cookies.description')}</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">{t('complaints.title')}</h2>
            <p>{t('complaints.description')}</p>
          </section>
        </div>
      </main>
    </div>
  );
}
