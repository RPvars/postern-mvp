'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Navigation } from '@/components/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Building2, User, Search, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CompanyResult {
  id: string;
  name: string;
  registrationNumber: string;
  taxNumber: string;
}

interface PersonResult {
  name: string;
  personalCode: string | null;
  roles: string[];
  companyCount: number;
  companies: { registrationNumber: string; name: string }[];
}

const ROLE_COLORS: Record<string, string> = {
  owner: 'bg-[#FEC200]',
  board: 'bg-blue-400',
  beneficial: 'bg-purple-400',
};

export default function SearchPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const t = useTranslations('searchResults');
  const tHome = useTranslations('home');
  const initialQuery = searchParams.get('q') || '';

  const [query, setQuery] = useState(initialQuery);
  const [companies, setCompanies] = useState<CompanyResult[]>([]);
  const [persons, setPersons] = useState<PersonResult[]>([]);
  const [isLoadingCompanies, setIsLoadingCompanies] = useState(false);
  const [isLoadingPersons, setIsLoadingPersons] = useState(false);

  const search = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setCompanies([]);
      setPersons([]);
      return;
    }

    const encoded = encodeURIComponent(q.trim());

    setIsLoadingCompanies(true);
    setIsLoadingPersons(true);

    // Fetch both in parallel
    const [companyRes, personRes] = await Promise.allSettled([
      fetch(`/api/search?q=${encoded}`).then(r => r.json()),
      fetch(`/api/person/search?q=${encoded}`).then(r => r.json()),
    ]);

    if (companyRes.status === 'fulfilled') {
      setCompanies(companyRes.value.results || []);
    }
    setIsLoadingCompanies(false);

    if (personRes.status === 'fulfilled') {
      setPersons(personRes.value.results || []);
    }
    setIsLoadingPersons(false);
  }, []);

  useEffect(() => {
    if (initialQuery) {
      search(initialQuery);
    }
  }, [initialQuery, search]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim().length >= 2) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
      search(query.trim());
    }
  };

  const isLoading = isLoadingCompanies || isLoadingPersons;
  const hasNoResults = !isLoading && companies.length === 0 && persons.length === 0 && initialQuery.length >= 2;

  return (
    <>
      <Navigation />
      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Search bar */}
        <form onSubmit={handleSubmit} className="mb-8">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('searchPlaceholder')}
              className="pl-12 h-14 text-lg rounded-xl"
              autoFocus
            />
          </div>
        </form>

        {/* Loading */}
        {isLoading && (
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-lg" />
            ))}
          </div>
        )}

        {/* No results */}
        {hasNoResults && (
          <div className="text-center py-12 text-muted-foreground">
            <Search className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p className="text-lg">{t('noResults')}</p>
            <p className="text-sm mt-1">{t('noResultsHint')}</p>
          </div>
        )}

        {/* Company results */}
        {!isLoadingCompanies && companies.length > 0 && (
          <Card className="mb-6">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Building2 className="h-5 w-5" />
                {t('companies')}
                <span className="text-sm font-normal text-muted-foreground">({companies.length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {companies.map((company) => (
                  <Link
                    key={company.id}
                    href={`/company/${company.id}`}
                    className="flex items-center justify-between px-6 py-3 hover:bg-accent transition-colors group"
                  >
                    <div>
                      <div className="font-medium text-foreground group-hover:text-primary transition-colors">
                        {company.name}
                      </div>
                      <div className="text-sm text-muted-foreground">{company.registrationNumber}</div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Person results */}
        {!isLoadingPersons && persons.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <User className="h-5 w-5" />
                {t('people')}
                <span className="text-sm font-normal text-muted-foreground">({persons.length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {persons.map((person, i) => (
                  <Link
                    key={`${person.name}-${person.personalCode}-${i}`}
                    href={`/person/${encodeURIComponent(person.personalCode || '')}?name=${encodeURIComponent(person.name)}`}
                    className="flex items-center justify-between px-6 py-3 hover:bg-accent transition-colors group"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground group-hover:text-primary transition-colors">
                          {person.name}
                        </span>
                        <div className="flex gap-0.5">
                          {person.roles.map((role) => (
                            <span
                              key={role}
                              className={cn("w-2.5 h-2.5 rounded-full", ROLE_COLORS[role])}
                              title={tHome(`search.roles.${role}`)}
                            />
                          ))}
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground truncate">
                        {person.companies.map(c => c.name).join(', ')}
                        {person.companyCount > 3 && ` +${person.companyCount - 3}`}
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </>
  );
}
