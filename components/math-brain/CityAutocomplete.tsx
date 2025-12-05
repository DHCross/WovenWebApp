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
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [apiUnavailable, setApiUnavailable] = useState(false);
  
  // Manual entry fields
  const [manualCity, setManualCity] = useState('');
  const [manualLat, setManualLat] = useState('');
  const [manualLng, setManualLng] = useState('');
  const [manualTimezone, setManualTimezone] = useState('America/New_York');

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
    } catch {
      // Error handling - API likely not configured
      setError('City search unavailable');
      setApiUnavailable(true);
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

  // Handle manual entry submission
  const handleManualSubmit = useCallback(() => {
    const lat = parseFloat(manualLat);
    const lng = parseFloat(manualLng);
    
    if (!manualCity.trim()) {
      setError('Please enter a city name');
      return;
    }
    if (isNaN(lat) || lat < -90 || lat > 90) {
      setError('Latitude must be between -90 and 90');
      return;
    }
    if (isNaN(lng) || lng < -180 || lng > 180) {
      setError('Longitude must be between -180 and 180');
      return;
    }

    const manualResult: CityResult = {
      id: Date.now(), // Unique ID for manual entries
      name: manualCity.trim(),
      lat,
      lng,
      country: 'Manual',
      countryName: 'Manual Entry',
      adminCode: null,
      adminName: null,
      population: 0,
      timezone: manualTimezone,
    };

    onChange(manualResult);
    setShowManualEntry(false);
    setError(null);
    setQuery(`${manualResult.name} (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
  }, [manualCity, manualLat, manualLng, manualTimezone, onChange]);

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

      {/* Error message with manual entry option */}
      {error && (
        <div className="mt-2">
          <p className="text-sm text-red-400">{error}</p>
          {apiUnavailable && !showManualEntry && (
            <button
              type="button"
              onClick={() => setShowManualEntry(true)}
              className="mt-1 text-sm text-emerald-400 hover:text-emerald-300 underline underline-offset-2"
            >
              Enter coordinates manually →
            </button>
          )}
        </div>
      )}

      {/* Manual entry link (always available) */}
      {!showManualEntry && !error && !value && (
        <button
          type="button"
          onClick={() => setShowManualEntry(true)}
          className="mt-2 text-xs text-slate-500 hover:text-slate-400 underline underline-offset-2"
        >
          Or enter coordinates manually
        </button>
      )}

      {/* Manual entry form */}
      {showManualEntry && (
        <div className="mt-4 p-4 rounded-xl border border-slate-700 bg-slate-800/50 space-y-3">
          <div className="flex justify-between items-center mb-2">
            <p className="text-sm font-medium text-slate-300">Manual Location Entry</p>
            <button
              type="button"
              onClick={() => {
                setShowManualEntry(false);
                setError(null);
              }}
              className="text-xs text-slate-500 hover:text-slate-400"
            >
              ✕ Cancel
            </button>
          </div>
          
          <p className="text-xs text-slate-400 mb-3">
            Get coordinates from{' '}
            <a 
              href="https://www.astro-seek.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-emerald-400 hover:text-emerald-300 underline"
            >
              Astro-Seek
            </a>
            {' '}or{' '}
            <a 
              href="https://www.google.com/maps" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-emerald-400 hover:text-emerald-300 underline"
            >
              Google Maps
            </a>
          </p>

          <div>
            <label className="block text-xs text-slate-400 mb-1">City Name</label>
            <input
              type="text"
              value={manualCity}
              onChange={(e) => setManualCity(e.target.value)}
              placeholder="e.g., Bryn Mawr"
              className="w-full px-3 py-2 rounded-lg border border-slate-700 bg-slate-900/80 text-slate-100 placeholder:text-slate-500 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 outline-none text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Latitude</label>
              <input
                type="text"
                value={manualLat}
                onChange={(e) => setManualLat(e.target.value)}
                placeholder="e.g., 40.0210"
                className="w-full px-3 py-2 rounded-lg border border-slate-700 bg-slate-900/80 text-slate-100 placeholder:text-slate-500 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Longitude</label>
              <input
                type="text"
                value={manualLng}
                onChange={(e) => setManualLng(e.target.value)}
                placeholder="e.g., -75.3144"
                className="w-full px-3 py-2 rounded-lg border border-slate-700 bg-slate-900/80 text-slate-100 placeholder:text-slate-500 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 outline-none text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">Timezone</label>
            <select
              value={manualTimezone}
              onChange={(e) => setManualTimezone(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-700 bg-slate-900/80 text-slate-100 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 outline-none text-sm"
            >
              <option value="America/New_York">Eastern (America/New_York)</option>
              <option value="America/Chicago">Central (America/Chicago)</option>
              <option value="America/Denver">Mountain (America/Denver)</option>
              <option value="America/Los_Angeles">Pacific (America/Los_Angeles)</option>
              <option value="America/Phoenix">Arizona (America/Phoenix)</option>
              <option value="America/Anchorage">Alaska (America/Anchorage)</option>
              <option value="Pacific/Honolulu">Hawaii (Pacific/Honolulu)</option>
              <option value="Europe/London">London (Europe/London)</option>
              <option value="Europe/Paris">Paris (Europe/Paris)</option>
              <option value="Europe/Berlin">Berlin (Europe/Berlin)</option>
              <option value="Asia/Tokyo">Tokyo (Asia/Tokyo)</option>
              <option value="Australia/Sydney">Sydney (Australia/Sydney)</option>
              <option value="UTC">UTC</option>
            </select>
          </div>

          <button
            type="button"
            onClick={handleManualSubmit}
            className="w-full mt-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition-colors text-sm"
          >
            Use This Location
          </button>
        </div>
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
