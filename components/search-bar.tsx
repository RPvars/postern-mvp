'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface SearchResult {
  id: string;
  name: string;
  registrationNumber: string;
  taxNumber: string;
  owners: { name: string; share: number }[];
}

interface SearchBarProps {
  country: string;
  onCountryChange: (country: string) => void;
}

export function SearchBar({ country, onCountryChange }: SearchBarProps) {
  const router = useRouter();
  const t = useTranslations('home');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const searchCompanies = useCallback(async (searchQuery: string) => {
    if (searchQuery.trim().length < 2) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await response.json();
      setResults(data.results || []);
    } catch (error) {
      console.error('Search failed:', error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      searchCompanies(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query, searchCompanies]);

  const handleSelect = (companyId: string) => {
    router.push(`/company/${companyId}`);
    setIsOpen(false);
    setQuery('');
  };

  const getCountryFlag = (countryCode: string) => {
    switch (countryCode) {
      case 'latvia':
        return '🇱🇻';
      case 'estonia':
        return '🇪🇪';
      case 'lithuania':
        return '🇱🇹';
      case 'all':
        return '🌍';
      default:
        return '🇱🇻';
    }
  };

  return (
    <div className="w-full max-w-4xl">
      <div className="relative">
        <div className="flex items-center rounded-xl border shadow-lg bg-white ring-1 ring-slate-200">
          <div className="flex-1 relative">
            <Command className="border-0 shadow-none bg-transparent" shouldFilter={false}>
              <CommandInput
                placeholder=""
                value={query}
                onValueChange={(value) => {
                  setQuery(value);
                  setIsOpen(value.length >= 2);
                }}
                onFocus={() => query.length >= 2 && setIsOpen(true)}
                onBlur={() => setTimeout(() => setIsOpen(false), 200)}
                className="h-28 text-lg border-0 focus-visible:ring-0 px-4"
              />
              <div className={cn(
                "absolute top-full left-0 right-0 mt-2 rounded-xl border shadow-lg bg-white ring-1 ring-slate-200 overflow-hidden z-50",
                !isOpen && "hidden pointer-events-none"
              )}>
                <CommandList>
                  {isLoading && (
                    <div className="py-6 text-center text-sm text-muted-foreground">{t('search.searching')}</div>
                  )}
                  {!isLoading && query.length >= 2 && results.length === 0 && (
                    <CommandEmpty>{t('search.noResults')}</CommandEmpty>
                  )}
                  {!isLoading && results.length > 0 && (
                    <CommandGroup heading={t('search.companies')}>
                      {results.map((company) => (
                        <CommandItem
                          key={company.id}
                          value={company.name}
                          onSelect={() => handleSelect(company.id)}
                          className="cursor-pointer"
                        >
                          <div className="flex flex-col gap-1 w-full">
                            <div className="font-medium">{company.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {company.registrationNumber} • {company.taxNumber}
                            </div>
                            {company.owners.length > 0 && (
                              <div className="text-xs text-muted-foreground">
                                {t('search.owners')}: {company.owners.map((o) => `${o.name} (${o.share}%)`).join(', ')}
                              </div>
                            )}
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}
                </CommandList>
              </div>
            </Command>
          </div>

          <div className="h-16 w-px bg-slate-200" />

          <Select value={country} onValueChange={onCountryChange}>
            <SelectTrigger className="w-auto h-28 border-0 shadow-none bg-transparent ring-0 focus:ring-0 focus-visible:ring-0 px-3 gap-1">
              <SelectValue>
                <span className="text-3xl">{getCountryFlag(country)}</span>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="latvia">🇱🇻 {t('countries.latvia')}</SelectItem>
              <SelectItem value="estonia">🇪🇪 {t('countries.estonia')}</SelectItem>
              <SelectItem value="lithuania">🇱🇹 {t('countries.lithuania')}</SelectItem>
              <SelectItem value="all">🌍 {t('countries.all')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
