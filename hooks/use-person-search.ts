import { useState, useEffect, useCallback } from 'react';
import { APP_CONFIG } from '@/lib/config';

export interface PersonSearchResult {
  name: string;
  personalCode: string | null;
  roles: string[];
  companyCount: number;
  companies: { registrationNumber: string; name: string }[];
}

export function usePersonSearch() {
  const minQueryLength = APP_CONFIG.search.minQueryLength;
  const debounceMs = APP_CONFIG.search.debounceMs;

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PersonSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const searchPersons = useCallback(async (searchQuery: string) => {
    if (searchQuery.trim().length < minQueryLength) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/person/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await response.json();
      setResults(data.results || []);
    } catch {
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [minQueryLength]);

  useEffect(() => {
    const timer = setTimeout(() => {
      searchPersons(query);
    }, debounceMs);
    return () => clearTimeout(timer);
  }, [query, searchPersons, debounceMs]);

  const handleQueryChange = useCallback((value: string) => {
    setQuery(value);
    setIsOpen(value.length >= minQueryLength);
  }, [minQueryLength]);

  const handleFocus = useCallback(() => {
    if (query.length >= minQueryLength) setIsOpen(true);
  }, [query, minQueryLength]);

  const handleBlur = useCallback(() => {
    setTimeout(() => setIsOpen(false), 200);
  }, []);

  const clearSearch = useCallback(() => {
    setQuery('');
    setIsOpen(false);
  }, []);

  return { query, results, isLoading, isOpen, setIsOpen, handleQueryChange, handleFocus, handleBlur, clearSearch };
}
