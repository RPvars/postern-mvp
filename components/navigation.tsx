'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { User } from 'lucide-react';
import { HeaderSearch } from '@/components/header-search';
import { UserButton } from '@/components/auth/user-button';
import { useLocale } from '@/components/providers/locale-provider';
import type { Locale } from '@/lib/i18n';

export function Navigation() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const { locale, setLocale } = useLocale();
  const t = useTranslations('navigation');
  const isActive = (path: string) => pathname === path;

  const handleLocaleChange = (newLocale: string) => {
    setLocale(newLocale as Locale);
  };
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
              {t('search')}
            </Link>
            <Link
              href="/compare"
              className={isActive('/compare')
                ? "text-base font-bold text-slate-900"
                : "text-base font-medium text-slate-700 hover:text-slate-900"
              }
            >
              {t('compare')}
            </Link>
            <span className="text-base font-medium text-slate-700 cursor-not-allowed" title={t('comingSoon')}>
              {t('analytics')}
            </span>
            <span className="text-base font-medium text-slate-700 cursor-not-allowed" title={t('comingSoon')}>
              {t('reports')}
            </span>
            </nav>
          </div>

          {/* Search, Language Selector & Login */}
          <div className="flex items-center gap-3">
            <div className="hidden md:block w-80">
              <HeaderSearch />
            </div>
            {/* Language Selector */}
            <Select value={locale} onValueChange={handleLocaleChange}>
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
                <SelectItem value="en">
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

            {/* Login Button / User Menu */}
            {status === 'loading' ? (
              <Button variant="outline" className="h-9" disabled>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              </Button>
            ) : session ? (
              <UserButton />
            ) : (
              <Link href="/login">
                <Button variant="outline" className="h-9">
                  <User className="mr-2 h-4 w-4" />
                  {t('login')}
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
