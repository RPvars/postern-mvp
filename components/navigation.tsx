'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { User } from 'lucide-react';
import { HeaderSearch } from '@/components/header-search';

export function Navigation() {
  return (
    <header className="border-b bg-white/80 backdrop-blur-sm z-10 relative">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/">
            <Image src="/postern-logo.svg" alt="Postern" width={140} height={42} priority />
          </Link>

          {/* Navigation Links */}
          <nav className="hidden items-center gap-6 md:flex">
            <Link href="/" className="text-sm font-medium text-slate-700 hover:text-slate-900">
              Meklēt
            </Link>
            <Link href="/compare" className="text-sm font-medium text-slate-700 hover:text-slate-900">
              Salīdzināt
            </Link>
            <button disabled className="text-sm font-medium text-slate-400 cursor-not-allowed">
              Analītika
            </button>
            <button disabled className="text-sm font-medium text-slate-400 cursor-not-allowed">
              Ziņojumi
            </button>
          </nav>

          {/* Compact Search */}
          <div className="hidden md:block flex-1 max-w-md mx-6">
            <HeaderSearch />
          </div>

          {/* Language Selector & Login */}
          <div className="flex items-center gap-3">
            {/* Language Selector */}
            <div className="flex items-center gap-1 rounded-md border bg-white p-1">
              <button className="rounded bg-slate-900 px-3 py-1 text-xs font-medium text-white">
                LV
              </button>
              <button disabled className="cursor-not-allowed px-3 py-1 text-xs font-medium text-slate-400">
                EN
              </button>
              <button disabled className="cursor-not-allowed px-3 py-1 text-xs font-medium text-slate-400">
                RU
              </button>
            </div>

            {/* Login Button */}
            <Button variant="outline" size="sm">
              <User className="mr-2 h-4 w-4" />
              Pieslēgties
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
