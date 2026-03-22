'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Command, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useCompanySearch } from '@/hooks/use-company-search';
import { usePersonSearch, PersonSearchResult } from '@/hooks/use-person-search';
import { Building2, User, ArrowRight } from 'lucide-react';

const ROLE_COLORS: Record<string, string> = {
  owner: 'bg-[#FEC200]',
  board: 'bg-blue-400',
  beneficial: 'bg-purple-400',
};

interface SearchBarProps {
  country: string;
  onCountryChange: (country: string) => void;
}

export function SearchBar({ country, onCountryChange }: SearchBarProps) {
  const router = useRouter();
  const t = useTranslations('home');

  const companySearch = useCompanySearch();
  const personSearch = usePersonSearch();

  const isOpen = companySearch.isOpen || personSearch.isOpen;
  const isLoading = companySearch.isLoading || personSearch.isLoading;
  const query = companySearch.query;

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

  const clearAll = () => {
    companySearch.clearSearch();
    personSearch.clearSearch();
  };

  const navigate = (url: string, newTab: boolean) => {
    if (newTab) {
      window.open(url, '_blank');
    } else {
      router.push(url);
    }
    clearAll();
  };

  const handleCompanySelect = (companyId: string) => {
    navigate(`/company/${companyId}`, false);
  };

  const handlePersonSelect = (person: PersonSearchResult) => {
    const code = person.personalCode || '';
    navigate(`/person/${encodeURIComponent(code)}?name=${encodeURIComponent(person.name)}`, false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && query.trim().length >= 2) {
      e.preventDefault();
      navigate(`/search?q=${encodeURIComponent(query.trim())}`, !!(e.metaKey || e.ctrlKey));
    }
  };

  const hasResults = companySearch.results.length > 0 || personSearch.results.length > 0;

  const getCountryFlag = (countryCode: string) => {
    switch (countryCode) {
      case 'latvia': return '🇱🇻';
      case 'estonia': return '🇪🇪';
      case 'lithuania': return '🇱🇹';
      case 'all': return '🌍';
      default: return '🇱🇻';
    }
  };

  return (
    <div className="w-full max-w-4xl">
      <div className="relative">
        <div className="flex items-center rounded-xl border shadow-lg bg-card ring-1 ring-border">
          <div className="flex-1 relative">
            <Command className="border-0 shadow-none bg-transparent" shouldFilter={false}>
              <CommandInput
                placeholder=""
                value={query}
                onValueChange={handleQueryChange}
                onFocus={handleFocus}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                className="h-28 text-lg border-0 focus-visible:ring-0 px-4"
              />
              <div className={cn(
                "absolute top-full left-0 right-0 mt-2 rounded-xl border shadow-lg bg-card ring-1 ring-border overflow-hidden z-50",
                !isOpen && "hidden pointer-events-none"
              )}>
                <CommandList>
                  {isLoading && (
                    <div className="py-6 text-center text-sm text-muted-foreground">{t('search.searching')}</div>
                  )}

                  {!isLoading && query.length >= 2 && !hasResults && (
                    <div className="py-6 text-center text-sm text-muted-foreground">{t('search.noResults')}</div>
                  )}

                  {/* Company results */}
                  {!isLoading && companySearch.results.length > 0 && (
                    <CommandGroup heading={t('search.companies')}>
                      {companySearch.results.slice(0, 5).map((company) => (
                        <CommandItem
                          key={company.id}
                          value={company.name}
                          onSelect={() => handleCompanySelect(company.id)}
                          className="cursor-pointer"
                        >
                          <Building2 className="h-4 w-4 text-muted-foreground mr-2 shrink-0" />
                          <div className="flex flex-col gap-0.5 w-full">
                            <div className="font-medium">{company.name}</div>
                            <div className="text-sm text-muted-foreground">{company.registrationNumber}</div>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}

                  {/* Person results */}
                  {!isLoading && personSearch.results.length > 0 && (
                    <CommandGroup heading={t('search.people')}>
                      {personSearch.results.slice(0, 5).map((person, i) => (
                        <CommandItem
                          key={`${person.name}-${person.personalCode}-${i}`}
                          value={person.name}
                          onSelect={() => handlePersonSelect(person)}
                          className="cursor-pointer"
                        >
                          <User className="h-4 w-4 text-muted-foreground mr-2 shrink-0" />
                          <div className="flex flex-col gap-0.5 w-full">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{person.name}</span>
                              <div className="flex gap-0.5">
                                {person.roles.map((role) => (
                                  <span key={role} className={cn("w-2 h-2 rounded-full", ROLE_COLORS[role])} />
                                ))}
                              </div>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {person.companies.map(c => c.name).join(', ')}
                              {person.companyCount > 3 && ` +${person.companyCount - 3}`}
                            </div>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}

                  {/* View all results */}
                  {!isLoading && hasResults && (
                    <div className="border-t">
                      <button
                        onClick={(e) => {
                          navigate(`/search?q=${encodeURIComponent(query.trim())}`, !!(e.metaKey || e.ctrlKey));
                        }}
                        onMouseDown={(e) => e.preventDefault()}
                        className="w-full text-center px-3 py-3 text-sm text-primary hover:bg-accent transition-colors flex items-center justify-center gap-1"
                      >
                        {t('search.viewAll')}
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </CommandList>
              </div>
            </Command>
          </div>

          <div className="h-16 w-px bg-border" />

          <Select value={country} onValueChange={onCountryChange}>
            <SelectTrigger className="w-auto h-28 border-0 shadow-none bg-transparent ring-0 focus:ring-0 focus-visible:ring-0 px-3 gap-1">
              <SelectValue>
                <span className="text-3xl">{getCountryFlag(country)}</span>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="latvia">🇱🇻 {t('countries.latvia')}</SelectItem>
              <SelectItem value="estonia" disabled>🇪🇪 {t('countries.estonia')}</SelectItem>
              <SelectItem value="lithuania" disabled>🇱🇹 {t('countries.lithuania')}</SelectItem>
              <SelectItem value="all" disabled>🌍 {t('countries.all')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
