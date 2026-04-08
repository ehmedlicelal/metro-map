import React, { useEffect, useRef, useState, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Tooltip, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import UserLocationMarker from './UserLocationMarker';
import ExitMarkers from './ExitMarkers';
import RoutePolylines from './RoutePolylines';
import SearchBar from './SearchBar';
import RoutePanel from './RoutePanel';
import ExitCard from './ExitCard';
import PhaseIndicator from './PhaseIndicator';
import LanguageToggle from './LanguageToggle';

import { useGeolocation, detectPhase } from '../hooks/useGeolocation';
import { useRoute } from '../hooks/useRoute';
import { useMapCamera } from '../hooks/useMapCamera';
import { fetchWalkingRoute } from '../services/api';

// Baku center
const BAKU_CENTER = [40.4093, 49.8671];
const DEFAULT_ZOOM = 12;

// Baku map bounds — restricts panning to Baku area
const BAKU_BOUNDS = [
  [40.30, 49.70], // Southwest corner
  [40.50, 50.10]  // Northeast corner
];

// Standard OSM tiles — shows all POI labels (cafes, shops, etc.) when zoomed in.
// A CSS filter on .leaflet-tile-pane inverts to dark mode.
const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILE_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

/**
 * Create a metro station icon (small circle with line color)
 */
function createStationIcon(color, isOnRoute) {
  const size = isOnRoute ? 16 : 10;
  const svg = `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 1}" fill="${isOnRoute ? color : '#2a2a4a'}" stroke="${color || '#555'}" stroke-width="${isOnRoute ? 2 : 1.5}"/>
    </svg>
  `;
  return L.divIcon({
    html: svg,
    className: 'station-marker',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2]
  });
}

/**
 * Destination pin icon
 */
function createDestinationIcon() {
  const svg = `
    <svg width="32" height="42" viewBox="0 0 32 42" xmlns="http://www.w3.org/2000/svg">
      <path d="M16 0 C7.16 0 0 7.16 0 16 C0 28 16 42 16 42 C16 42 32 28 32 16 C32 7.16 24.84 0 16 0Z" fill="#e94560" stroke="#fff" stroke-width="2"/>
      <circle cx="16" cy="16" r="6" fill="#fff"/>
    </svg>
  `;
  return L.divIcon({
    html: svg,
    className: 'destination-marker',
    iconSize: [32, 42],
    iconAnchor: [16, 42]
  });
}

/**
 * Place marker icon (orange/amber pin for search result places)
 */
function createPlaceIcon() {
  const svg = `
    <svg width="28" height="38" viewBox="0 0 28 38" xmlns="http://www.w3.org/2000/svg">
      <path d="M14 0 C6.27 0 0 6.27 0 14 C0 24.5 14 38 14 38 C14 38 28 24.5 28 14 C28 6.27 21.73 0 14 0Z" fill="#f59e0b" stroke="#fff" stroke-width="2"/>
      <circle cx="14" cy="14" r="5" fill="#fff"/>
    </svg>
  `;
  return L.divIcon({
    html: svg,
    className: 'place-marker',
    iconSize: [28, 38],
    iconAnchor: [14, 38]
  });
}

/**
 * Entry station pin icon (green)
 */
function createEntryIcon() {
  const svg = `
    <svg width="28" height="38" viewBox="0 0 28 38" xmlns="http://www.w3.org/2000/svg">
      <path d="M14 0 C6.27 0 0 6.27 0 14 C0 24.5 14 38 14 38 C14 38 28 24.5 28 14 C28 6.27 21.73 0 14 0Z" fill="#4ecca3" stroke="#fff" stroke-width="2"/>
      <text x="14" y="16" text-anchor="middle" dominant-baseline="central" fill="#fff" font-size="14" font-weight="bold">M</text>
    </svg>
  `;
  return L.divIcon({
    html: svg,
    className: 'entry-marker',
    iconSize: [28, 38],
    iconAnchor: [14, 38]
  });
}

/**
 * MapController — connects to the useMap hook for camera control
 */
function MapController({ mapRef }) {
  const map = useMap();
  useEffect(() => {
    mapRef.current = map;
  }, [map, mapRef]);
  return null;
}

/**
 * ZoomTracker — tracks current zoom level for conditional label rendering
 */
function ZoomTracker({ onZoomChange }) {
  useMapEvents({
    zoomend(e) {
      onZoomChange(e.target.getZoom());
    }
  });
  return null;
}

/**
 * MapClickHandler — handles map clicks.
 * In 'destination' mode (default): clicking sets where the user wants to go.
 * In 'manual-location' mode: clicking sets the user's current position.
 */
function MapClickHandler({ mode, onSetDestination, onSetLocation }) {
  useMapEvents({
    click(e) {
      const pos = { lat: e.latlng.lat, lng: e.latlng.lng };
      if (mode === 'manual-location') {
        onSetLocation({ ...pos, accuracy: 10 });
      } else {
        onSetDestination(pos);
      }
    }
  });
  return null;
}

/**
 * Main map component — the entire app is this map with floating overlays.
 */
export default function Map() {
  const mapRef = useRef(null);
  const { location: gpsLocation, heading, speed, error: geoError } = useGeolocation();
  const {
    route, stationData, loading, error: routeError,
    phase, setPhase, loadStations, calculateRoute, clearRoute
  } = useRoute();

  const [lang, setLang] = useState('az');
  const [destination, setDestination] = useState(null);
  const [walkingRoute, setWalkingRoute] = useState(null);
  const [postMetroRoute, setPostMetroRoute] = useState(null);
  const [currentStopIndex, setCurrentStopIndex] = useState(0);
  const [bottomCardInfo, setBottomCardInfo] = useState(null);
  const [manualLocation, setManualLocation] = useState(null);
  const [placeMarkers, setPlaceMarkers] = useState([]);
  const [zoomLevel, setZoomLevel] = useState(DEFAULT_ZOOM);
  const [locationMode, setLocationMode] = useState('auto'); // 'auto' (GPS) or 'manual-location'
  const [theme, setTheme] = useState(() => {
    if (typeof window === 'undefined') return 'light';
    return window.localStorage.getItem('theme') || 'light';
  });

  // Effective location: manual click overrides GPS
  const location = manualLocation || gpsLocation;

  // Ref for destination handler to avoid stale closures
  const selectDestRef = useRef(null);

  // Handle map click to set destination (default behavior)
  const handleMapClickDestination = useCallback((pos) => {
    if (selectDestRef.current) {
      selectDestRef.current({ lat: pos.lat, lng: pos.lng, name: `${pos.lat.toFixed(4)}, ${pos.lng.toFixed(4)}` });
    }
  }, []);

  // Handle map click to set manual location (only when in manual mode)
  const handleMapClickLocation = useCallback((pos) => {
    setManualLocation(pos);
    setLocationMode('auto'); // Switch back to auto after setting
  }, []);

  // Load stations on mount
  useEffect(() => {
    loadStations();
  }, [loadStations]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem('theme', theme);
  }, [theme]);

  // Camera control
  useMapCamera(mapRef, phase, manualLocation || gpsLocation, route);

  // Auto-detect phase from GPS
  useEffect(() => {
    if (location && route) {
      const detected = detectPhase(location, speed, route);
      setPhase(detected);
    }
  }, [location, speed, route, setPhase]);

  // When destination is selected, calculate route
  const handleSelectDestination = useCallback(async (dest) => {
    setDestination(dest);

    // Use user's location or default Baku center
    const userLat = location?.lat || 40.4093;
    const userLng = location?.lng || 49.8671;

    const result = await calculateRoute(userLat, userLng, dest.lat, dest.lng);

    if (result) {
      // Walk-only response: destination is close enough to just walk
      if (result.walkOnly) {
        const directWalk = await fetchWalkingRoute(
          userLat, userLng,
          result.destination.lat, result.destination.lng
        );
        setWalkingRoute(directWalk);
        setPostMetroRoute(null);
        setBottomCardInfo({
          walkOnly: true,
          walkDistance: result.destination.walkingDistance
        });
        return;
      }

      // Fetch walking route to entry station
      if (result.entry?.recommendedEntry) {
        const walk = await fetchWalkingRoute(
          userLat, userLng,
          result.entry.recommendedEntry.lat,
          result.entry.recommendedEntry.lng
        );
        setWalkingRoute(walk);
      }

      // Fetch walking route from exit to destination
      if (result.exit?.recommendedExit) {
        const postWalk = await fetchWalkingRoute(
          result.exit.recommendedExit.lat,
          result.exit.recommendedExit.lng,
          dest.lat, dest.lng
        );
        setPostMetroRoute(postWalk);
      }

      // Set bottom card info for Phase 1
      setBottomCardInfo({
        walkDistance: result.entry?.walkingDistance,
        stationName_az: result.entry?.station?.station_az,
        stationName_en: result.entry?.station?.station_en,
        exitLabel: result.entry?.recommendedEntry?.label
      });
    }
  }, [location, calculateRoute]);

  // Keep ref in sync for map-click handler
  selectDestRef.current = handleSelectDestination;

  const handleClearRoute = useCallback(() => {
    clearRoute();
    setDestination(null);
    setWalkingRoute(null);
    setPostMetroRoute(null);
    setBottomCardInfo(null);
    setCurrentStopIndex(0);
    setPlaceMarkers([]);
  }, [clearRoute]);

  // Handle place markers from search results
  const handlePlaceMarkers = useCallback((places) => {
    setPlaceMarkers(places);
  }, []);

  const toggleLang = useCallback(() => {
    setLang(prev => prev === 'az' ? 'en' : 'az');
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  }, []);

  // Get station colors for markers
  const getStationColor = (stationId) => {
    if (!stationData?.lines) return '#555';
    for (const [lineId, line] of Object.entries(stationData.lines)) {
      if (line.stations.includes(stationId)) return line.color;
    }
    return '#555';
  };

  const isOnRoute = (stationId) => {
    return route?.metro?.path?.includes(stationId) || false;
  };

  const showWelcomeCard = !route && !destination && !loading;
  const locationStatusLabel = geoError
    ? (lang === 'az' ? 'GPS bağlı deyil' : 'GPS unavailable')
    : location
      ? (lang === 'az' ? 'Canlı məkan aktivdir' : 'Live location active')
      : (lang === 'az' ? 'Məkana icazə verin' : 'Enable location');

  return (
    <div className="map-container" id="map-container">
      <MapContainer
        center={BAKU_CENTER}
        zoom={DEFAULT_ZOOM}
        className="leaflet-map"
        zoomControl={false}
        attributionControl={false}
        maxBounds={BAKU_BOUNDS}
        maxBoundsViscosity={0.9}
        minZoom={11}
      >
        <MapController mapRef={mapRef} />
        <ZoomTracker onZoomChange={setZoomLevel} />
        <MapClickHandler
          mode={locationMode}
          onSetDestination={handleMapClickDestination}
          onSetLocation={handleMapClickLocation}
        />

        {/* Map tiles — standard OSM with POI labels, CSS-inverted to dark mode */}
        <TileLayer url={TILE_URL} attribution={TILE_ATTR} detectRetina={true} />

        {/* User location */}
        <UserLocationMarker position={location} heading={heading} />

        {/* All metro stations */}
        {stationData?.stations?.map(station => (
          <Marker
            key={station.id}
            position={[station.center_lat, station.center_lng]}
            icon={createStationIcon(getStationColor(station.id), isOnRoute(station.id))}
            zIndexOffset={isOnRoute(station.id) ? 400 : 100}
          >
            <Popup className="station-popup">
              <div className="station-popup-content">
                <strong>🚇 {lang === 'az' ? station.station_az : station.station_en}</strong>
                <span className="exit-count">
                  {station.exits.length} {lang === 'az' ? 'çıxış' : 'exits'}
                </span>
              </div>
            </Popup>
            {zoomLevel >= 13 && (
              <Tooltip
                permanent
                direction="right"
                offset={[8, -4]}
                className="station-label"
              >
                {lang === 'az' ? station.station_az : station.station_en}
              </Tooltip>
            )}
          </Marker>
        ))}

        {/* Entry station marker */}
        {route?.entry?.station && phase <= 1 && (
          <Marker
            position={[route.entry.station.lat, route.entry.station.lng]}
            icon={createEntryIcon()}
            zIndexOffset={800}
          >
            <Popup>
              <strong>🟢 {lang === 'az' ? route.entry.station.station_az : route.entry.station.station_en}</strong>
            </Popup>
          </Marker>
        )}

        {/* Destination marker */}
        {/* Place markers from search results */}
        {placeMarkers.map((place, i) => (
          <Marker
            key={`place-${place.lat}-${place.lon}-${i}`}
            position={[place.lat, place.lon]}
            icon={createPlaceIcon()}
            zIndexOffset={600}
          >
            <Popup>
              <strong>📍 {place.name.split(',')[0]}</strong>
            </Popup>
            <Tooltip
              permanent
              direction="top"
              offset={[0, -38]}
              className="place-label"
            >
              {place.name.split(',')[0]}
            </Tooltip>
          </Marker>
        ))}

        {destination && (
          <Marker
            position={[destination.lat, destination.lng]}
            icon={createDestinationIcon()}
            zIndexOffset={800}
          >
            <Popup>
              <strong>🏁 {destination.name?.split(',')[0]}</strong>
            </Popup>
          </Marker>
        )}

        {/* Exit markers (Phase 3) */}
        {phase === 3 && route?.exit && (
          <ExitMarkers
            exits={route.exit.allExits}
            recommendedExit={route.exit.recommendedExit}
            lang={lang}
          />
        )}

        {/* Route polylines */}
        <RoutePolylines
          phase={phase}
          route={route}
          walkingRoute={walkingRoute}
          postMetroRoute={postMetroRoute}
          stationData={stationData}
        />
      </MapContainer>

      {/* === FLOATING UI OVERLAYS === */}

      {/* Search Bar */}
      <SearchBar
        onSelectDestination={handleSelectDestination}
        onSelectPlace={handlePlaceMarkers}
        onClear={handleClearRoute}
        lang={lang}
      />

      <div className="top-control-stack" id="top-control-stack">
        <button
          className="theme-toggle"
          id="theme-toggle"
          onClick={toggleTheme}
          aria-label={theme === 'light'
            ? (lang === 'az' ? 'Tünd rejimi aktiv et' : 'Enable dark mode')
            : (lang === 'az' ? 'İşıqlı rejimi aktiv et' : 'Enable light mode')}
          title={theme === 'light'
            ? (lang === 'az' ? 'Tünd rejim' : 'Dark mode')
            : (lang === 'az' ? 'İşıqlı rejim' : 'Light mode')}
        >
          <span className="theme-toggle-icon">{theme === 'light' ? '🌙' : '☀️'}</span>
          <span className="theme-toggle-text">{theme === 'light' ? 'Dark' : 'Light'}</span>
        </button>

        <LanguageToggle lang={lang} onToggle={toggleLang} />
      </div>

      {/* Phase Indicator */}
      <PhaseIndicator phase={phase} lang={lang} />

      {/* Walk-only card — destination is nearby, no metro needed */}
      {bottomCardInfo?.walkOnly && (
        <div className="walk-card walk-only-card" id="walk-only-card">
          <div className="walk-card-icon">🚶</div>
          <div className="walk-card-info">
            <span className="walk-distance">
              {lang === 'az'
                ? `${bottomCardInfo.walkDistance}m piyada`
                : `Walk ${bottomCardInfo.walkDistance}m`}
            </span>
            <span className="walk-station walk-station-highlight">
              {lang === 'az'
                ? 'Metro lazım deyil — piyada gedin'
                : 'No metro needed — just walk'}
            </span>
          </div>
          <button
            className="start-nav-btn"
            onClick={handleClearRoute}
          >
            ✕
          </button>
        </div>
      )}

      {/* Phase 1: Walk to station card (only for metro routes) */}
      {phase === 1 && bottomCardInfo && !bottomCardInfo.walkOnly && (
        <div className="walk-card" id="walk-card">
          <div className="walk-card-icon">🚶</div>
          <div className="walk-card-info">
            <span className="walk-distance">
              {lang === 'az'
                ? `${bottomCardInfo.walkDistance}m piyada`
                : `Walk ${bottomCardInfo.walkDistance}m`}
            </span>
            <span className="walk-station">
              {lang === 'az'
                ? `${bottomCardInfo.stationName_az} stansiyasına`
                : `to ${bottomCardInfo.stationName_en} station`}
            </span>
            {bottomCardInfo.exitLabel && (
              <span className="walk-exit">
                → {lang === 'az' ? `${bottomCardInfo.exitLabel}-dən daxil olun` : `Enter from ${bottomCardInfo.exitLabel}`}
              </span>
            )}
          </div>
          <button
            className="start-nav-btn"
            onClick={() => setPhase(2)}
          >
            {lang === 'az' ? 'Başla' : 'Start'}
          </button>
        </div>
      )}

      {/* Phase 2: Route panel */}
      <RoutePanel
        route={route}
        phase={phase}
        currentStopIndex={currentStopIndex}
        lang={lang}
      />

      {/* Phase 3: Exit card */}
      <ExitCard route={route} phase={phase} lang={lang} />

      {/* Phase 4: Walk to destination card */}
      {phase === 4 && route && (
        <div className="walk-card walk-card-destination" id="walk-card-destination">
          <div className="walk-card-icon">🏁</div>
          <div className="walk-card-info">
            <span className="walk-distance">
              {lang === 'az'
                ? `${route.destination?.walkingDistance || '?'}m piyada`
                : `Walk ${route.destination?.walkingDistance || '?'}m`}
            </span>
            <span className="walk-station">
              {destination?.name?.split(',')[0] || (lang === 'az' ? 'Təyinat' : 'Destination')}
            </span>
          </div>
        </div>
      )}

      {/* Loading overlay */}
      {loading && (
        <div className="loading-overlay" id="loading-overlay">
          <div className="loading-spinner" />
          <span>{lang === 'az' ? 'Marşrut hesablanır...' : 'Calculating route...'}</span>
        </div>
      )}

      {/* Error toast */}
      {routeError && (
        <div className="error-toast" id="error-toast">
          ⚠️ {routeError}
        </div>
      )}

      {/* Manual location mode hint */}
      {locationMode === 'manual-location' && (
        <div className="location-hint" id="location-hint">
          <span className="hint-icon">📍</span>
          <span className="hint-text">
            {lang === 'az'
              ? 'Yerinizi təyin etmək üçün xəritəyə klikləyin'
              : 'Tap the map to set your location'}
          </span>
        </div>
      )}

      {/* Location mode toggle button */}
      <button
        className={`location-mode-btn ${locationMode === 'manual-location' ? 'active' : ''} ${manualLocation ? 'has-manual' : ''}`}
        id="location-mode-btn"
        onClick={() => {
          if (manualLocation) {
            // Currently using manual location → switch back to GPS
            setManualLocation(null);
            setLocationMode('auto');
          } else {
            // Toggle into manual mode so next click sets location
            setLocationMode(prev => prev === 'manual-location' ? 'auto' : 'manual-location');
          }
        }}
        title={manualLocation
          ? (lang === 'az' ? 'Avtomatik yerə qayıt' : 'Switch to auto location')
          : (lang === 'az' ? 'Yeri əl ilə seç' : 'Set location manually')}
      >
        {manualLocation ? (
          <>
            <span className="loc-btn-icon">🛰️</span>
            <span className="loc-btn-text">{lang === 'az' ? 'Avto yer' : 'Auto Location'}</span>
          </>
        ) : locationMode === 'manual-location' ? (
          <>
            <span className="loc-btn-icon">👆</span>
            <span className="loc-btn-text">{lang === 'az' ? 'Xəritəyə klikləyin' : 'Tap the map'}</span>
          </>
        ) : (
          <>
            <span className="loc-btn-icon">📍</span>
            <span className="loc-btn-text">{lang === 'az' ? 'Əl ilə yer' : 'Manual Location'}</span>
          </>
        )}
      </button>

      {/* Phase nav buttons (for demo/testing) */}
      {route && (
        <div className="phase-nav" id="phase-nav">
          {[1, 2, 3, 4].map(p => (
            <button
              key={p}
              className={`phase-nav-btn ${phase === p ? 'active' : ''}`}
              onClick={() => setPhase(p)}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
