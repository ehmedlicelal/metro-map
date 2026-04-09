import React, { useState, useEffect, useRef } from 'react';
import { searchPlaces } from '../services/api';
import { t } from '../i18n/translations.jsx';

/**
 * Floating search bar with autocomplete — sits on top of the map.
 * Calls our backend /api/places which proxies Nominatim, restricted to Baku.
 * Supports debounced input, loading state, and clickable results.
 */
export default function SearchBar({ 
  onSelectDestination, 
  onSelectOrigin, 
  onSelectPlace, 
  lang, 
  onClear, 
  onEnterPickMode,
  pickingMode,
  origin,
  destination,
  selectedOrigin,
  selectedDestination,
  gpsLocation,
  phase = 0
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [originQuery, setOriginQuery] = useState('');
  const [originResults, setOriginResults] = useState([]);
  const [isOriginOpen, setIsOriginOpen] = useState(false);
  const [originLoading, setOriginLoading] = useState(false);

  const debounceRef = useRef(null);
  const originDebounceRef = useRef(null);
  const skipSearchRef = useRef(false);
  const skipOriginSearchRef = useRef(false);
  
  const destInputRef = useRef(null);
  const originInputRef = useRef(null);

  const tr = t(lang);

  // Sync with props if they change (e.g. from map click)
  useEffect(() => {
    if (destination?.name) {
      skipSearchRef.current = true;
      setQuery(destination.name.split(',')[0]);
      setResults([]); // Clear search result markers
      setIsOpen(false); // Close dropdown
    } else if (!destination) {
      setQuery('');
    }
  }, [destination]);

  useEffect(() => {
    if (origin?.name) {
      skipOriginSearchRef.current = true;
      setOriginQuery(origin.name.split(',')[0]);
      setOriginResults([]); // Clear search result markers
      setIsOriginOpen(false); // Close dropdown
    } else if (!origin) {
      setOriginQuery('');
    }
  }, [origin]);

  // Destination Search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (skipSearchRef.current) { skipSearchRef.current = false; return; }
    if (query.trim().length < 2) { setResults([]); setIsOpen(false); return; }

    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const places = await searchPlaces(query);
        setResults(places);
        setIsOpen(places.length > 0);
      } catch { setResults([]); }
      finally { setLoading(false); }
    }, 400);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  // Origin Search
  useEffect(() => {
    if (originDebounceRef.current) clearTimeout(originDebounceRef.current);
    if (skipOriginSearchRef.current) { skipOriginSearchRef.current = false; return; }
    if (originQuery.trim().length < 2) { setOriginResults([]); setIsOriginOpen(false); return; }

    setOriginLoading(true);
    originDebounceRef.current = setTimeout(async () => {
      try {
        const places = await searchPlaces(originQuery);
        setOriginResults(places);
        setIsOriginOpen(places.length > 0);
      } catch { setOriginResults([]); }
      finally { setOriginLoading(false); }
    }, 400);
    return () => clearTimeout(originDebounceRef.current);
  }, [originQuery]);

  const handleSelectDest = (place) => {
    const lat = parseFloat(place.lat);
    const lng = parseFloat(place.lon);
    skipSearchRef.current = true;
    setQuery(place.name.split(',')[0]);
    setIsOpen(false);
    onSelectDestination({ lat, lng, name: place.name });
  };

  const handleSelectOrigin = (place) => {
    const lat = parseFloat(place.lat);
    const lng = parseFloat(place.lon);
    skipOriginSearchRef.current = true;
    setOriginQuery(place.name.split(',')[0]);
    setIsOriginOpen(false);
    onSelectOrigin?.({ lat, lng, name: place.name });
  };

  const handleClear = () => {
    setQuery('');
    setOriginQuery('');
    setResults([]);
    setOriginResults([]);
    setIsOpen(false);
    setIsOriginOpen(false);
    onClear?.();
  };

  // Show markers for search results
  useEffect(() => {
    const activeResults = isOpen ? results : (isOriginOpen ? originResults : []);
    onSelectPlace?.(activeResults);
  }, [isOpen, results, isOriginOpen, originResults, onSelectPlace]);

  return (
    <div className="search-container" id="search-container">
      <div className={`search-bar multi-bar ${pickingMode ? 'is-picking' : ''}`} id="search-bar">
        {/* ORIGIN */}
        <div className={`search-input-wrapper origin-wrapper ${pickingMode === 'origin' ? 'picking' : ''}`}>
          <span className="search-icon">📍</span>
          <input
            ref={originInputRef}
            type="text"
            value={originQuery}
            onChange={(e) => setOriginQuery(e.target.value)}
            onFocus={() => { setIsOriginOpen(originResults.length > 0); setIsOpen(false); }}
            placeholder={tr.searchOriginPlaceholder || "Starting point..."}
            className="search-input"
            autoComplete="off"
          />
          <button 
            className={`map-pick-btn ${pickingMode === 'origin' ? 'active' : ''}`}
            onClick={() => onEnterPickMode?.('origin')}
            title={tr.pickFromMap}
          >
            🗺️
          </button>
          {originLoading && <span className="search-spinner" />}
        </div>

        {/* DESTINATION */}
        <div className={`search-input-wrapper dest-wrapper ${pickingMode === 'destination' ? 'picking' : ''}`}>
          <span className="search-icon">🔍</span>
          <input
            ref={destInputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => { setIsOpen(results.length > 0); setIsOriginOpen(false); }}
            placeholder={tr.searchPlaceholder}
            className="search-input"
            autoComplete="off"
          />
          <button 
            className={`map-pick-btn ${pickingMode === 'destination' ? 'active' : ''}`}
            onClick={() => onEnterPickMode?.('destination')}
            title={tr.pickFromMap}
          >
            🗺️
          </button>
          {loading && <span className="search-spinner" />}
        </div>

        {(query || originQuery) && (
          <button className="search-clear-all" onClick={handleClear} title="Clear all">×</button>
        )}
      </div>

      {phase === 0 && isOriginOpen && originResults.length > 0 && (
          <ul className="search-results search-results-origin">
            {originResults.map((place, i) => (
              <li key={i} className="search-result-item" onClick={() => handleSelectOrigin(place)}>
                <span className="result-icon">📍</span>
                <div className="result-text">
                  <span className="result-name">{place.name.split(',')[0]}</span>
                  <span className="result-address">{place.name.split(',').slice(1, 3).join(',')}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
  
        {phase === 0 && isOpen && results.length > 0 && (
          <ul className="search-results search-results-dest">
            {results.map((place, i) => (
              <li key={i} className="search-result-item" onClick={() => handleSelectDest(place)}>
                <span className="result-icon">🏁</span>
                <div className="result-text">
                  <span className="result-name">{place.name.split(',')[0]}</span>
                  <span className="result-address">{place.name.split(',').slice(1, 3).join(',')}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
    </div>
  );
}

