'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { SearchBar } from '@/components/search-bar';
import { Navigation } from '@/components/navigation';

export default function Home() {
  const [selectedCountry, setSelectedCountry] = useState<string>('latvia');
  const t = useTranslations('home');
  const common = useTranslations('common');

  const getHeaderText = () => {
    switch (selectedCountry) {
      case 'latvia':
        return t('title.latvia');
      case 'estonia':
        return t('title.estonia');
      case 'lithuania':
        return t('title.lithuania');
      case 'all':
        return t('title.all');
      default:
        return t('title.default');
    }
  };

  const getSubText = () => {
    switch (selectedCountry) {
      case 'latvia':
        return t('subtitle.latvia');
      case 'estonia':
        return t('subtitle.estonia');
      case 'lithuania':
        return t('subtitle.lithuania');
      case 'all':
        return t('subtitle.all');
      default:
        return t('subtitle.default');
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Navigation />

      <main className="relative flex flex-1 flex-col items-center justify-center px-4 py-12">
        {/* Geometric Background */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: 'url(/BG_2.avif)', opacity: 0.3 }}
        />

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center w-full space-y-12">
          <div className="text-center max-w-3xl">
            <h1 className="mb-4 text-5xl md:text-6xl font-bold tracking-tight text-slate-900">
              {getHeaderText()}
            </h1>
            <p className="text-xl text-slate-700">
              {getSubText()}
            </p>
          </div>

          <SearchBar country={selectedCountry} onCountryChange={setSelectedCountry} />
        </div>
      </main>

      <footer className="border-t border-slate-200 bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-6 text-center text-sm text-slate-600">
          {common('copyright')}
        </div>
      </footer>
    </div>
  );
}
