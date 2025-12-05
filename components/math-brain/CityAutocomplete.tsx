'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';

export interface CityResult {
  id: number;
  name: string;
  lat: number;
  lng: number;
  country: string;
  countryName: string;
  adminCode: string | null;
  adminName: string | null;
  population: number;
  timezone: string;
}

interface CityAutocompleteProps {
  value: CityResult | null;
  onChange: (city: CityResult | null) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function CityAutocomplete({
  value,
  onChange,
  placeholder = 'Search for a city...',
  disabled = false,
  className = '',
}: CityAutocompleteProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CityResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [error, setError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced search
  const searchCities = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/city-search?q=${encodeURIComponent(searchQuery)}`);
      
      if (!response.ok) {
        throw new Error('City search failed');
      }

      const data = await response.json();
      
      if (data.error) {
        setError(data.error);
        setResults([]);
      } else {
        setResults(data.results || []);
        setIsOpen(data.results?.length > 0);
        setHighlightedIndex(-1);
      }
    } catch (err) {
      // Error handling - error state is set above
      setError('Unable to search cities. Please try again.');
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Handle input change with debounce
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = e.target.value;
    setQuery(newQuery);
    
    // Clear previous selection if user is typing
    if (value) {
      onChange(null);
    }

    // Debounce the search
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      searchCities(newQuery);
    }, 300);
  }, [value, onChange, searchCities]);

  // Handle selection
  const handleSelect = useCallback((city: CityResult) => {
    onChange(city);
    setQuery(`${city.name}, ${city.adminCode || city.country}`);
    setIsOpen(false);
    setResults([]);
  }, [onChange]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!isOpen || results.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) => 
          prev < results.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => 
          prev > 0 ? prev - 1 : results.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < results.length) {
          handleSelect(results[highlightedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        break;
    }
  }, [isOpen, results, highlightedIndex, handleSelect]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        inputRef.current && 
        !inputRef.current.contains(e.target as Node) &&
        listRef.current &&
        !listRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  // Update query when value changes externally
  useEffect(() => {
    if (value) {
      setQuery(`${value.name}, ${value.adminCode || value.country}`);
    }
  }, [value]);

  const formatCityLabel = (city: CityResult) => {
    const parts = [city.name];
    if (city.adminName) parts.push(city.adminName);
    if (city.countryName) parts.push(city.countryName);
    return parts.join(', ');
  };

  const formatPopulation = (pop: number) => {
    if (pop >= 1_000_000) return `${(pop / 1_000_000).toFixed(1)}M`;
    if (pop >= 1_000) return `${(pop / 1_000).toFixed(0)}K`;
    return pop.toString();
  };

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (results.length > 0 && !value) {
              setIsOpen(true);
            }
          }}
          placeholder={placeholder}
          disabled={disabled}
          className={`
            w-full px-4 py-3 pr-10 rounded-xl border text-slate-100 placeholder:text-slate-500
            focus:ring-2 outline-none transition
            ${disabled 
              ? 'bg-slate-900 border-slate-800 cursor-not-allowed opacity-60' 
              : 'bg-slate-800/80 border-slate-700 focus:border-emerald-500/50 focus:ring-emerald-500/20'
            }
            ${value ? 'border-emerald-500/30' : ''}
          `}
          aria-label="Search for a city"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-controls="city-suggestions-listbox"
          role="combobox"
        />
        
        {/* Loading / Success indicator */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-slate-600 border-t-emerald-500 rounded-full animate-spin" />
          ) : value ? (
            <span className="text-emerald-400">✓</span>
          ) : (
            <span className="text-slate-500">🔍</span>
          )}
        </div>
      </div>

      {/* Error message */}
      {error && (
        <p className="mt-2 text-sm text-red-400">{error}</p>
      )}

      {/* Dropdown results */}
      {isOpen && results.length > 0 && (
        <ul
          ref={listRef}
          id="city-suggestions-listbox"
          className="absolute z-50 w-full mt-2 py-2 bg-slate-800 border border-slate-700 rounded-xl shadow-xl max-h-64 overflow-y-auto"
          role="listbox"
        >
          {results.map((city, index) => (
            <li
              key={city.id}
              onClick={() => handleSelect(city)}
              onMouseEnter={() => setHighlightedIndex(index)}
              className={`
                px-4 py-3 cursor-pointer transition-colors
                ${index === highlightedIndex 
                  ? 'bg-emerald-500/20 text-emerald-100' 
                  : 'text-slate-200 hover:bg-slate-700/50'
                }
              `}
              role="option"
              aria-selected={index === highlightedIndex}
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium">{city.name}</p>
                  <p className="text-xs text-slate-400">
                    {[city.adminName, city.countryName].filter(Boolean).join(', ')}
                  </p>
                </div>
                <div className="text-right text-xs text-slate-500">
                  <p>{formatPopulation(city.population)} pop</p>
                  <p>{city.timezone}</p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* No results message */}
      {isOpen && query.length >= 2 && !isLoading && results.length === 0 && !error && (
        <div className="absolute z-50 w-full mt-2 py-4 px-4 bg-slate-800 border border-slate-700 rounded-xl text-center text-slate-400 text-sm">
          No cities found matching "{query}"
        </div>
      )}
    </div>
  );
}

export default CityAutocomplete;
