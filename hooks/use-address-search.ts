import { useState, useEffect, useCallback } from 'react';
import { APP_CONFIG } from '@/lib/config';

export interface AddressSearchResult {
  address: string;
  companyCount: number;
}

export function useAddressSearch() {
  const minQueryLength = APP_CONFIG.search.minQueryLength;
  const debounceMs = APP_CONFIG.search.debounceMs;

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<AddressSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const searchAddresses = useCallback(async (searchQuery: string) => {
    if (searchQuery.trim().length < minQueryLength) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/address/search?q=${encodeURIComponent(searchQuery)}`);
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
      searchAddresses(query);
    }, debounceMs);
    return () => clearTimeout(timer);
  }, [query, searchAddresses, debounceMs]);

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
