import React, { useState, useEffect, useRef } from 'react';
import { searchPlaces } from '../services/api';

/**
 * Floating search bar with autocomplete — sits on top of the map.
 * Calls our backend /api/places which proxies Nominatim, restricted to Baku.
 * Supports debounced input, loading state, and clickable results.
 */
export default function SearchBar({ onSelectDestination, onSelectPlace, lang, onClear }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (query.trim().length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const places = await searchPlaces(query);
        setResults(places);
        setIsOpen(places.length > 0);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const handleSelect = (place) => {
    const lat = parseFloat(place.lat);
    const lng = parseFloat(place.lon);
    const displayName = place.name;
    setQuery(displayName.split(',')[0]);
    setIsOpen(false);
    setResults([]);

    // Notify parent of destination selection
    onSelectDestination({ lat, lng, name: displayName });

    // Also notify with all current results as place markers
    if (onSelectPlace) {
      onSelectPlace(results);
    }
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setIsOpen(false);
    onClear?.();
  };

  // Show markers for search results when dropdown is open
  useEffect(() => {
    if (onSelectPlace && isOpen && results.length > 0) {
      onSelectPlace(results);
    } else if (onSelectPlace && !isOpen && results.length === 0) {
      onSelectPlace([]);
    }
  }, [isOpen, results, onSelectPlace]);

  return (
    <div className="search-bar" id="search-bar">
      <div className="search-input-wrapper">
        <span className="search-icon">🔍</span>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          placeholder={lang === 'az' ? 'Hara getmək istəyirsiniz?' : 'Where do you want to go?'}
          className="search-input"
          id="search-input"
          autoComplete="off"
        />
        {query && (
          <button className="search-clear" onClick={handleClear} aria-label="Clear search">×</button>
        )}
        {loading && <span className="search-spinner" />}
      </div>

      {isOpen && results.length > 0 && (
        <ul className="search-results" id="search-results">
          {results.map((place, i) => (
            <li
              key={`${place.lat}-${place.lon}-${i}`}
              className="search-result-item"
              onClick={() => handleSelect(place)}
            >
              <span className="result-icon">📍</span>
              <div className="result-text">
                <span className="result-name">{place.name.split(',')[0]}</span>
                <span className="result-address">
                  {place.name.split(',').slice(1, 3).join(',')}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
