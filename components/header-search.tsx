'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Command, CommandInput } from '@/components/ui/command';
import { useCompanySearch } from '@/hooks/use-company-search';

export function HeaderSearch() {
  const router = useRouter();
  const t = useTranslations('navigation');
  const home = useTranslations('home');
  const {
    query,
    results,
    isLoading,
    isOpen,
    handleQueryChange,
    handleFocus,
    handleBlur,
    clearSearch,
  } = useCompanySearch();

  const handleSelect = (companyId: string) => {
    router.push(`/company/${companyId}`);
    clearSearch();
  };

  return (
    <div className="relative w-full">
      <Command className="border rounded-lg shadow-sm bg-white" shouldFilter={false}>
        <CommandInput
          placeholder={t('searchPlaceholder')}
          value={query}
          onValueChange={handleQueryChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
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
