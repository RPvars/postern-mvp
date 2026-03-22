'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Command, CommandInput } from '@/components/ui/command';
import { useCompanySearch } from '@/hooks/use-company-search';
import { usePersonSearch, PersonSearchResult } from '@/hooks/use-person-search';
import { Building2, User, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const ROLE_COLORS: Record<string, string> = {
  owner: 'bg-[#FEC200]',
  board: 'bg-blue-400',
  beneficial: 'bg-purple-400',
};

export function HeaderSearch() {
  const router = useRouter();
  const t = useTranslations('navigation');
  const home = useTranslations('home');

  const companySearch = useCompanySearch();
  const personSearch = usePersonSearch();

  const isOpen = companySearch.isOpen || personSearch.isOpen;
  const isLoading = companySearch.isLoading || personSearch.isLoading;
  const query = companySearch.query; // Both hooks share the same query via handleQueryChange

  const handleQueryChange = (value: string) => {
    companySearch.handleQueryChange(value);
    personSearch.handleQueryChange(value);
  };

  const handleFocus = () => {
    companySearch.handleFocus();
    personSearch.handleFocus();
  };

  const handleBlur = () => {
    companySearch.handleBlur();
    personSearch.handleBlur();
  };

  const navigate = (url: string, newTab: boolean) => {
    if (newTab) {
      window.open(url, '_blank');
    } else {
      router.push(url);
    }
    companySearch.clearSearch();
    personSearch.clearSearch();
  };

  const handleCompanySelect = (companyId: string, e?: React.MouseEvent) => {
    navigate(`/company/${companyId}`, !!(e?.metaKey || e?.ctrlKey));
  };

  const handlePersonSelect = (person: PersonSearchResult, e?: React.MouseEvent) => {
    const code = person.personalCode || '';
    navigate(`/person/${encodeURIComponent(code)}?name=${encodeURIComponent(person.name)}`, !!(e?.metaKey || e?.ctrlKey));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && query.trim().length >= 2) {
      e.preventDefault();
      navigate(`/search?q=${encodeURIComponent(query.trim())}`, !!(e.metaKey || e.ctrlKey));
    }
  };

  const hasResults = companySearch.results.length > 0 || personSearch.results.length > 0;
  const noResults = !isLoading && query.length >= 2 && !hasResults;

  return (
    <div className="relative w-full">
      <Command className="border rounded-lg shadow-sm bg-card" shouldFilter={false}>
        <CommandInput
          placeholder={t('searchPlaceholder')}
          value={query}
          onValueChange={handleQueryChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className="h-9 text-sm px-3"
        />
      </Command>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 rounded-lg border shadow-lg bg-card z-50 max-h-96 overflow-y-auto">
          {isLoading && (
            <div className="py-4 text-center text-sm text-muted-foreground">
              {home('search.searching')}
            </div>
          )}

          {noResults && (
            <div className="py-4 text-center text-sm text-muted-foreground">
              {home('search.noResults')}
            </div>
          )}

          {/* Company results */}
          {!isLoading && companySearch.results.length > 0 && (
            <div>
              <div className="px-3 pt-2 pb-1 text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Building2 className="h-3 w-3" />
                {home('search.companies')}
              </div>
              <div className="space-y-0.5 px-2 pb-1">
                {companySearch.results.slice(0, 5).map((company) => (
                  <button
                    key={company.id}
                    onClick={(e) => handleCompanySelect(company.id, e)}
                    onMouseDown={(e) => e.preventDefault()}
                    className="w-full text-left px-3 py-2 rounded-md hover:bg-accent cursor-pointer transition-colors"
                  >
                    <div className="font-medium text-sm text-foreground">{company.name}</div>
                    <div className="text-xs text-muted-foreground">{company.registrationNumber}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Person results */}
          {!isLoading && personSearch.results.length > 0 && (
            <div>
              {companySearch.results.length > 0 && <div className="border-t mx-2" />}
              <div className="px-3 pt-2 pb-1 text-xs font-medium text-muted-foreground flex items-center gap-1">
                <User className="h-3 w-3" />
                {home('search.people')}
              </div>
              <div className="space-y-0.5 px-2 pb-1">
                {personSearch.results.slice(0, 5).map((person, i) => (
                  <button
                    key={`${person.name}-${person.personalCode}-${i}`}
                    onClick={(e) => handlePersonSelect(person, e)}
                    onMouseDown={(e) => e.preventDefault()}
                    className="w-full text-left px-3 py-2 rounded-md hover:bg-accent cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-foreground">{person.name}</span>
                      <div className="flex gap-0.5">
                        {person.roles.map((role) => (
                          <span key={role} className={cn("w-2 h-2 rounded-full", ROLE_COLORS[role])} />
                        ))}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {person.companies.map(c => c.name).join(', ')}
                      {person.companyCount > 3 && ` +${person.companyCount - 3}`}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* View all results link */}
          {!isLoading && hasResults && (
            <>
              <div className="border-t mx-2" />
              <button
                onClick={(e) => {
                  navigate(`/search?q=${encodeURIComponent(query.trim())}`, !!(e.metaKey || e.ctrlKey));
                }}
                onMouseDown={(e) => e.preventDefault()}
                className="w-full text-center px-3 py-2.5 text-sm text-primary hover:bg-accent transition-colors flex items-center justify-center gap-1"
              >
                {home('search.viewAll')}
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
