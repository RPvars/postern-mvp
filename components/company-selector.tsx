'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SearchResult {
  id: string;
  name: string;
  registrationNumber: string;
  taxNumber: string;
}

interface SelectedCompany {
  id: string;
  name: string;
  registrationNumber: string;
}

interface CompanySelectorProps {
  selectedCompanies: SelectedCompany[];
  onCompaniesChange: (companies: SelectedCompany[]) => void;
  minCompanies?: number;
  maxCompanies?: number;
}

export function CompanySelector({
  selectedCompanies,
  onCompaniesChange,
  minCompanies = 2,
  maxCompanies = 5,
}: CompanySelectorProps) {
  const t = useTranslations('companySelector');
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

  const handleSelect = (company: SearchResult) => {
    // Check if already selected
    if (selectedCompanies.some((c) => c.id === company.id)) {
      return;
    }

    // Check max companies limit
    if (selectedCompanies.length >= maxCompanies) {
      return;
    }

    // Add to selected companies
    onCompaniesChange([
      ...selectedCompanies,
      {
        id: company.id,
        name: company.name,
        registrationNumber: company.registrationNumber,
      },
    ]);

    // Clear search
    setQuery('');
    setIsOpen(false);
  };

  const handleRemove = (companyId: string) => {
    onCompaniesChange(selectedCompanies.filter((c) => c.id !== companyId));
  };

  const canAddMore = selectedCompanies.length < maxCompanies;
  const needsMore = selectedCompanies.length < minCompanies;

  return (
    <div className="space-y-4">
      {/* Selected Companies */}
      {selectedCompanies.length > 0 && (
        <div className="space-y-3">
          {selectedCompanies.map((company, index) => (
            <Card
              key={company.id}
              className="relative p-4 hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Badge variant="secondary" className="text-sm font-medium">
                  {index + 1}
                </Badge>
                <div className="flex-1">
                  <div className="font-medium text-slate-900">{company.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {company.registrationNumber}
                  </div>
                </div>
                <button
                  onClick={() => handleRemove(company.id)}
                  className="rounded-full p-1 hover:bg-slate-200 transition-colors"
                  aria-label={t('removeCompany')}
                >
                  <X className="h-4 w-4 text-slate-600" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Search Input */}
      {canAddMore && (
        <div className="relative">
          <Command className="border rounded-lg shadow-sm" shouldFilter={false}>
            <CommandInput
              placeholder={t('searchPlaceholder', { count: selectedCompanies.length, max: maxCompanies })}
              value={query}
              onValueChange={(value) => {
                setQuery(value);
                setIsOpen(value.length >= 2);
              }}
              onFocus={() => query.length >= 2 && setIsOpen(true)}
              onBlur={() => setTimeout(() => setIsOpen(false), 200)}
              className="h-11 px-3"
            />
            <div
              className={cn(
                'absolute top-full left-0 right-0 mt-1 rounded-lg border shadow-lg bg-white z-50 max-h-80 overflow-y-auto',
                !isOpen && 'hidden pointer-events-none'
              )}
            >
              <CommandList>
                {isLoading && (
                  <div className="py-6 text-center text-sm text-muted-foreground">
                    {t('searching')}
                  </div>
                )}
                {!isLoading && query.length >= 2 && results.length === 0 && (
                  <CommandEmpty>{t('noResults')}</CommandEmpty>
                )}
                {!isLoading && results.length > 0 && (
                  <CommandGroup heading={t('companies')}>
                    {results
                      .filter(
                        (company) => !selectedCompanies.some((c) => c.id === company.id)
                      )
                      .map((company) => (
                        <CommandItem
                          key={company.id}
                          value={company.name}
                          onSelect={() => handleSelect(company)}
                          className="cursor-pointer"
                        >
                          <div className="flex flex-col gap-1 w-full">
                            <div className="font-medium">{company.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {company.registrationNumber} • {company.taxNumber}
                            </div>
                          </div>
                        </CommandItem>
                      ))}
                  </CommandGroup>
                )}
              </CommandList>
            </div>
          </Command>
        </div>
      )}

      {/* Validation Messages */}
      {needsMore && (
        <p className="text-sm text-muted-foreground">
          {t('minCompanies', { min: minCompanies })}
        </p>
      )}
      {!canAddMore && (
        <p className="text-sm text-muted-foreground">
          {t('maxCompanies', { max: maxCompanies })}
        </p>
      )}
    </div>
  );
}
