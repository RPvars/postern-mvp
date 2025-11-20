'use client';

import { useState } from 'react';
import { SearchBar } from '@/components/search-bar';
import { Navigation } from '@/components/navigation';

export default function Home() {
  const [selectedCountry, setSelectedCountry] = useState<string>('latvia');

  const getHeaderText = () => {
    switch (selectedCountry) {
      case 'latvia':
        return 'Meklēt Latvijas Uzņēmumus';
      case 'estonia':
        return 'Meklēt Igaunijas Uzņēmumus';
      case 'lithuania':
        return 'Meklēt Lietuvas Uzņēmumus';
      case 'all':
        return 'Meklēt Baltijas Valstu Uzņēmumus';
      default:
        return 'Meklēt Uzņēmumus';
    }
  };

  const getSubText = () => {
    switch (selectedCountry) {
      case 'latvia':
        return 'Meklējiet pēc uzņēmuma nosaukuma, reģistrācijas numura, nodokļu numura vai īpašnieka vārda';
      case 'estonia':
        return 'Meklējiet pēc uzņēmuma nosaukuma, reģistrācijas numura, nodokļu numura vai īpašnieka vārda';
      case 'lithuania':
        return 'Meklējiet pēc uzņēmuma nosaukuma, reģistrācijas numura, nodokļu numura vai īpašnieka vārda';
      case 'all':
        return 'Meklējiet pēc uzņēmuma nosaukuma, reģistrācijas numura, nodokļu numura vai īpašnieka vārda visās Baltijas valstīs';
      default:
        return 'Meklējiet pēc uzņēmuma nosaukuma, reģistrācijas numura, nodokļu numura vai īpašnieka vārda';
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
          © 2025 Posterns. Visas tiesības aizsargātas.
        </div>
      </footer>
    </div>
  );
}
