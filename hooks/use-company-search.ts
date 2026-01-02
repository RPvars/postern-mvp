import { useState, useEffect, useCallback } from 'react';
import { APP_CONFIG } from '@/lib/config';

export interface SearchResult {
  id: string;
  name: string;
  registrationNumber: string;
  taxNumber: string;
  owners?: { name: string; share: number }[];
}

export interface UseCompanySearchOptions {
  minQueryLength?: number;
  debounceMs?: number;
}

export function useCompanySearch(options: UseCompanySearchOptions = {}) {
  const {
    minQueryLength = APP_CONFIG.search.minQueryLength,
    debounceMs = APP_CONFIG.search.debounceMs,
  } = options;

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const searchCompanies = useCallback(async (searchQuery: string) => {
    if (searchQuery.trim().length < minQueryLength) {
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
  }, [minQueryLength]);

  useEffect(() => {
    const timer = setTimeout(() => {
      searchCompanies(query);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [query, searchCompanies, debounceMs]);

  const handleQueryChange = useCallback((value: string) => {
    setQuery(value);
    setIsOpen(value.length >= minQueryLength);
  }, [minQueryLength]);

  const handleFocus = useCallback(() => {
    if (query.length >= minQueryLength) {
      setIsOpen(true);
    }
  }, [query, minQueryLength]);

  const handleBlur = useCallback(() => {
    setTimeout(() => setIsOpen(false), 200);
  }, []);

  const clearSearch = useCallback(() => {
    setQuery('');
    setIsOpen(false);
  }, []);

  return {
    query,
    results,
    isLoading,
    isOpen,
    setIsOpen,
    handleQueryChange,
    handleFocus,
    handleBlur,
    clearSearch,
  };
}
