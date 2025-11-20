'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { User } from 'lucide-react';
import { HeaderSearch } from '@/components/header-search';

export function Navigation() {
  const pathname = usePathname();
  const isActive = (path: string) => pathname === path;
  return (
    <header className="border-b bg-white/80 backdrop-blur-sm z-10 relative">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo & Navigation Links */}
          <div className="flex items-center gap-6">
            <Link href="/">
              <Image src="/posterns-logo.svg" alt="Posterns" width={140} height={42} priority />
            </Link>

            {/* Navigation Links */}
            <nav className="hidden items-center gap-6 md:flex">
            <Link
              href="/"
              className={isActive('/')
                ? "text-base font-bold text-slate-900"
                : "text-base font-medium text-slate-700 hover:text-slate-900"
              }
            >
              Meklēt
            </Link>
            <Link
              href="/compare"
              className={isActive('/compare')
                ? "text-base font-bold text-slate-900"
                : "text-base font-medium text-slate-700 hover:text-slate-900"
              }
            >
              Salīdzināt
            </Link>
            <span className="text-base font-medium text-slate-700 cursor-not-allowed">
              Analītika
            </span>
            <span className="text-base font-medium text-slate-700 cursor-not-allowed">
              Ziņojumi
            </span>
            </nav>
          </div>

          {/* Search, Language Selector & Login */}
          <div className="flex items-center gap-3">
            <div className="hidden md:block w-80">
              <HeaderSearch />
            </div>
            {/* Language Selector */}
            <Select defaultValue="lv">
              <SelectTrigger className="w-[110px] h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="lv">
                  <span className="flex items-center gap-2">
                    <span>🇱🇻</span>
                    <span>LV</span>
                  </span>
                </SelectItem>
                <SelectItem value="lt" disabled>
                  <span className="flex items-center gap-2">
                    <span>🇱🇹</span>
                    <span>LT</span>
                  </span>
                </SelectItem>
                <SelectItem value="ee" disabled>
                  <span className="flex items-center gap-2">
                    <span>🇪🇪</span>
                    <span>EE</span>
                  </span>
                </SelectItem>
                <SelectItem value="en" disabled>
                  <span className="flex items-center gap-2">
                    <span>🇬🇧</span>
                    <span>EN</span>
                  </span>
                </SelectItem>
                <SelectItem value="ru" disabled>
                  <span className="flex items-center gap-2">
                    <span>🇷🇺</span>
                    <span>RU</span>
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>

            {/* Login Button */}
            <Button variant="outline" className="h-9">
              <User className="mr-2 h-4 w-4" />
              Pieslēgties
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
