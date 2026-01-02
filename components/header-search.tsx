'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';

interface SearchResult {
  id: string;
  name: string;
  registrationNumber: string;
  taxNumber: string;
}

export function HeaderSearch() {
  const router = useRouter();
  const t = useTranslations('navigation');
  const home = useTranslations('home');
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
      console.log('[HeaderSearch] API Response:', data);
      console.log('[HeaderSearch] Results count:', data.results?.length || 0);
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
      console.log('[HeaderSearch] Debounced search for query:', query);
      searchCompanies(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query, searchCompanies]);

  useEffect(() => {
    console.log('[HeaderSearch] State update - isOpen:', isOpen, 'results.length:', results.length, 'query:', query);
  }, [isOpen, results, query]);

  const handleSelect = (companyId: string) => {
    router.push(`/company/${companyId}`);
    setIsOpen(false);
    setQuery('');
  };

  return (
    <div className="relative w-full">
      <Command className="border rounded-lg shadow-sm bg-white" shouldFilter={false}>
        <CommandInput
          placeholder={t('searchPlaceholder')}
          value={query}
          onValueChange={(value) => {
            setQuery(value);
            setIsOpen(value.length >= 2);
          }}
          onFocus={() => query.length >= 2 && setIsOpen(true)}
          onBlur={() => setTimeout(() => setIsOpen(false), 200)}
          className="h-9 text-sm px-3"
        />
      </Command>
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 rounded-lg border shadow-lg bg-white z-50 max-h-80 overflow-y-auto">
          {isLoading && (
            <div className="py-4 text-center text-sm text-muted-foreground">
              {home('search.searching')}
            </div>
          )}
          {!isLoading && query.length >= 2 && results.length === 0 && (
            <div className="py-4 text-center text-sm text-muted-foreground">
              {home('search.noResults')}
            </div>
          )}
          {!isLoading && results.length > 0 && (
            <div className="space-y-1 p-2">
              {results.map((company) => (
                <button
                  key={company.id}
                  onClick={() => handleSelect(company.id)}
                  onMouseDown={(e) => e.preventDefault()}
                  className="w-full text-left px-3 py-2 rounded-md hover:bg-slate-100 cursor-pointer transition-colors"
                >
                  <div className="flex flex-col gap-0.5">
                    <div className="font-medium text-sm text-slate-900">{company.name}</div>
                    <div className="text-xs text-slate-600">
                      {company.registrationNumber}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
