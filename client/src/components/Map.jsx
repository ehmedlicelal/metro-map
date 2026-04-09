import React, { useEffect, useRef, useState, useCallback } from 'react';
import { t, LANGUAGES } from '../i18n/translations.jsx';
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
import LoadingScreen from './LoadingScreen';

import { detectPhase } from '../hooks/useGeolocation';
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

// Google Maps Standard tiles - Provides large clear typography, deep zoom levels, and native Azerbaijani localization
const TILE_URL = 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&hl=az';
const TILE_ATTR = '&copy; <a href="https://www.google.com/maps">Google Maps</a>';

function formatDuration(seconds) {
  if (!seconds) return '';
  const mins = Math.ceil(seconds / 60);
  if (mins >= 60) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${m}m`;
  }
  return `${mins} min`;
}

/**
 * Create a metro station icon (small circle with line color)
 */
function createStationIcon(color, isOnRoute) {
  const size = isOnRoute ? 24 : 16;
  const svg = `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 1}" fill="${isOnRoute ? color : '#2a2a4a'}" stroke="${color || '#555'}" stroke-width="${isOnRoute ? 3 : 2}"/>
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
 * In 'picking' mode: sets either origin or destination.
 * Otherwise, default behavior is setting destination.
 */
function MapClickHandler({ pickingMode, onPick }) {
  useMapEvents({
    click(e) {
      const pos = { lat: e.latlng.lat, lng: e.latlng.lng };
      onPick(pos);
    }
  });
  return null;
}

/**
 * Map language selector — single 🌐 globe button that opens
 * a dropdown listing ALL available languages.
 */
function MapLangCluster({ lang, setLang }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = (e) => { if (!e.target.closest('.map-lang-cluster')) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const current = LANGUAGES.find(l => l.code === lang);

  return (
    <div className="map-lang-cluster" id="map-lang-cluster">
      <button
        id="map-lang-globe-btn"
        className={`map-flag-btn map-globe-btn ${open ? 'map-flag-btn--active' : ''}`}
        onClick={() => setOpen(s => !s)}
        title={current ? `${current.flag} ${current.name}` : 'Language'}
        aria-label="Change language"
      >
        🌐
      </button>

      {open && (
        <div className="map-more-panel" id="map-lang-panel">
          <div className="map-more-title">Language</div>
          <div className="map-more-grid">
            {LANGUAGES.map(l => (
              <button
                key={l.code}
                id={`map-lang-${l.code}`}
                className={`map-more-item ${lang === l.code ? 'map-more-item--active' : ''}`}
                onClick={() => { setLang(l.code); setOpen(false); }}
                aria-label={l.name}
              >
                <span className="map-more-flag">{l.flag}</span>
                <span className="map-more-name">{l.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Main map component.
 */
export default function Map({ initialOrigin, initialDestination, initialLang = 'en', onGoHome, gpsState }) {
  const mapRef = useRef(null);
  const { location: gpsLocation, heading, speed, error: geoError } = gpsState || {};
  const {
    route, setRoute, stationData, loading, error: routeError,
    phase, setPhase, loadStations, calculateRoute, clearRoute
  } = useRoute();

  const [lang, setLang] = useState(initialLang);
  const [destination, setDestination] = useState(null);
  const [walkingRoute, setWalkingRoute] = useState(null);
  const [postMetroRoute, setPostMetroRoute] = useState(null);
  const [currentStopIndex, setCurrentStopIndex] = useState(0);
  const [bottomCardInfo, setBottomCardInfo] = useState(null);
  const [routeOptions, setRouteOptions] = useState(null);
  const [manualLocation, setManualLocation] = useState(null);
  const [placeMarkers, setPlaceMarkers] = useState([]);
  const [zoomLevel, setZoomLevel] = useState(DEFAULT_ZOOM);
  const [pickingMode, setPickingMode] = useState(null); // 'origin', 'destination', or null
  const [theme, setTheme] = useState(() => {
    if (typeof window === 'undefined') return 'light';
    return window.localStorage.getItem('theme') || 'light';
  });
  const [skipGpsWait, setSkipGpsWait] = useState(false);

  // Effective location: manual click overrides GPS
  const location = manualLocation || gpsLocation;

  // Ref for destination handler to avoid stale closures
  const selectDestRef = useRef(null);
  // AbortController ref — cancels in-flight OSRM requests on each new selection
  const routeAbortRef = useRef(null);

  // Camera control
  useMapCamera(mapRef, phase, manualLocation || gpsLocation, route);

  // Auto-detect phase from GPS
  useEffect(() => {
    if (location && route) {
      const detected = detectPhase(location, speed, route);
      setPhase(detected);
    }
  }, [location, speed, route, setPhase]);


  // Define core handlers at the top to avoid ReferenceErrors in other hooks/pickers
  const handleSelectDestination = useCallback(async (dest, forcedOrigin = null) => {
    // Cancel any previous in-flight OSRM requests
    if (routeAbortRef.current) {
      routeAbortRef.current.abort();
    }
    const abort = new AbortController();
    routeAbortRef.current = abort;
    const { signal } = abort;

    setDestination(dest);
    // Clear stale route data immediately
    setWalkingRoute(null);
    setPostMetroRoute(null);
    setBottomCardInfo(null);
    setRouteOptions(null);

    // Immediately show the destination marker on the map
    if (mapRef.current) {
      mapRef.current.flyTo([dest.lat, dest.lng], 16, { duration: 1.5 });
    }

    // Use forced origin, manual origin, user's location, or default Baku center
    const originToUse = forcedOrigin || manualLocation || gpsLocation;
    const userLat = originToUse?.lat || 40.4093;
    const userLng = originToUse?.lng || 49.8671;

    const result = await calculateRoute(userLat, userLng, dest.lat, dest.lng);
    if (signal.aborted) return; // A newer click already took over

    if (result) {
      if (result.walkOnly) {
        const directWalk = await fetchWalkingRoute(
          userLat, userLng,
          result.destination.lat, result.destination.lng,
          signal
        );
        if (signal.aborted) return;
        setWalkingRoute(directWalk);
        setPostMetroRoute(null);
        setBottomCardInfo({
          walkOnly: true,
          walkDistance: result.destination.walkingDistance,
          totalTime: directWalk ? directWalk.duration : 0
        });
        return;
      }

      // Fetch all walking variations in parallel
      const [directWalk, walk, postWalk] = await Promise.all([
        fetchWalkingRoute(userLat, userLng, dest.lat, dest.lng, signal),
        result.entry?.recommendedEntry
          ? fetchWalkingRoute(userLat, userLng, result.entry.recommendedEntry.lat, result.entry.recommendedEntry.lng, signal)
          : Promise.resolve(null),
        result.exit?.recommendedExit
          ? fetchWalkingRoute(result.exit.recommendedExit.lat, result.exit.recommendedExit.lng, dest.lat, dest.lng, signal)
          : Promise.resolve(null),
      ]);
      if (signal.aborted) return;

      const directWalkDuration = directWalk ? directWalk.duration : Infinity;
      const walkDuration = walk ? walk.duration : ((result.entry?.walkingDistance || 0) / 1.3);
      const postWalkDuration = postWalk ? postWalk.duration : ((result.destination?.walkingDistance || 0) / 1.3);

      const metroDistanceM = (result.metro?.totalDistance || 0) * 1.2;
      const metroRideSeconds = (metroDistanceM / 1000 / 40) * 3600;
      const metroWaitTime = 240;
      const stationOverhead = 360;
      const metroTransferTime = (result.metro?.transfers?.length || 0) * 420;

      const metroTotalDuration =
        walkDuration +
        metroRideSeconds +
        postWalkDuration +
        metroWaitTime +
        stationOverhead +
        metroTransferTime;

      const calculatedInfo = {
        directWalk,
        entryWalk: walk,
        exitWalk: postWalk,
        directWalkDuration,
        metroTotalDuration,
        metroResult: result,
      };

      if (directWalkDuration <= metroTotalDuration + 600) {
        setRouteOptions(calculatedInfo);
      } else {
        setWalkingRoute(walk);
        setPostMetroRoute(postWalk);
        setBottomCardInfo({
          walkDistance: result.entry?.walkingDistance,
          stationName_az: result.entry?.station?.station_az,
          stationName_en: result.entry?.station?.station_en,
          exitLabel: result.entry?.recommendedEntry?.label,
          totalTime: metroTotalDuration
        });
      }
    }
  }, [gpsLocation, manualLocation, calculateRoute]);

  const handleSelectOrigin = useCallback((origin) => {
    setManualLocation(origin);
    if (destination) {
      handleSelectDestination(destination, origin);
    }
  }, [destination, handleSelectDestination]);

  // Handle map click picking
  const handleMapClickPick = useCallback((pos) => {
    const coords = { 
      lat: pos.lat, 
      lng: pos.lng, 
      name: `${pos.lat.toFixed(4)}, ${pos.lng.toFixed(4)}` 
    };

    if (pickingMode === 'origin') {
      handleSelectOrigin(coords);
    } else {
      handleSelectDestination(coords);
    }
    setPickingMode(null);
  }, [pickingMode, handleSelectOrigin, handleSelectDestination]);

  // Load stations on mount
  useEffect(() => {
    loadStations();
  }, [loadStations]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem('theme', theme);
  }, [theme]);

  // When arriving from the landing page with pre-selected origin/destination, auto-route
  const initialHandled = useRef(false);
  useEffect(() => {
    if ((initialDestination || initialOrigin) && !initialHandled.current) {
      // Check if map is ready, otherwise retry shortly
      if (selectDestRef.current) {
        initialHandled.current = true;
        if (initialOrigin) setManualLocation(initialOrigin);
        
        if (initialDestination) {
          if (initialDestination.pickMode) {
            setPickingMode(initialDestination.pickMode);
          } else if (initialDestination.lat) {
            handleSelectDestination(initialDestination);
          }
        }
      }
    }
  }, [initialDestination, initialOrigin, handleSelectDestination]);

  // Camera control
  useMapCamera(mapRef, phase, manualLocation || gpsLocation, route);

  // Auto-detect phase from GPS
  useEffect(() => {
    if (location && route) {
      const detected = detectPhase(location, speed, route);
      setPhase(detected);
    }
  }, [location, speed, route, setPhase]);



  // RE-ROUTE if GPS location becomes available AFTER destination was set via default fallback
  const lastRoutedLocationRef = useRef(null);
  useEffect(() => {
    if (!destination || !gpsLocation || manualLocation) return;
    
    // If we haven't routed from this location yet (or if distance is > 100m)
    const dist = lastRoutedLocationRef.current 
      ? L.latLng(gpsLocation.lat, gpsLocation.lng).distanceTo(L.latLng(lastRoutedLocationRef.current.lat, lastRoutedLocationRef.current.lng))
      : 1000; // Trigger first time

    // If we are significantly far from the last routed point and we were using a fallback or it's new
    if (dist > 100) {
      handleSelectDestination(destination);
      lastRoutedLocationRef.current = { lat: gpsLocation.lat, lng: gpsLocation.lng };
    }
  }, [gpsLocation, destination, manualLocation, handleSelectDestination]);

  // GPS timeout and accuracy checks are now handled by the shared gpsState in App/useGeolocation hook
  // which ensures time spent on the landing page is counted.

  const applyWalkRoute = useCallback(() => {
    if (!routeOptions) return;
    const walkRouteObj = {
      walkOnly: true,
      destination: {
        lat: destination.lat,
        lng: destination.lng,
        walkingDistance: Math.round(routeOptions.directWalk?.distance || 0)
      }
    };
    setRoute(walkRouteObj);
    setWalkingRoute(routeOptions.directWalk);
    setPostMetroRoute(null);
    setBottomCardInfo({
      walkOnly: true,
      walkDistance: Math.round(routeOptions.directWalk?.distance || 0),
      totalTime: routeOptions.directWalkDuration
    });
    setPhase(1);
    setRouteOptions(null);
  }, [routeOptions, destination, setRoute, setPhase]);

  const applyMetroRoute = useCallback(() => {
    if (!routeOptions) return;
    setWalkingRoute(routeOptions.entryWalk);
    setPostMetroRoute(routeOptions.exitWalk);
    setBottomCardInfo({
      walkDistance: routeOptions.metroResult.entry?.walkingDistance,
      stationName_az: routeOptions.metroResult.entry?.station?.station_az,
      stationName_en: routeOptions.metroResult.entry?.station?.station_en,
      exitLabel: routeOptions.metroResult.entry?.recommendedEntry?.label,
      totalTime: routeOptions.metroTotalDuration
    });
    setPhase(1);
    setRouteOptions(null);
  }, [routeOptions, setPhase]);

  // Keep ref in sync for map-click handler
  selectDestRef.current = handleSelectDestination;

  const handleClearRoute = useCallback(() => {
    clearRoute();
    setDestination(null);
    setWalkingRoute(null);
    setPostMetroRoute(null);
    setBottomCardInfo(null);
    setRouteOptions(null);
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
  const tr = t(lang);
  
  // Show Loading Screen if we're waiting for GPS fix for a direct navigation
  // Logic: only show if we have an initial destination, no fixed origin, and hook says not ready yet
  const isWaitingForGps = initialDestination && !initialOrigin && !gpsState?.isReady && !geoError && !manualLocation && !skipGpsWait;
  
  if (isWaitingForGps) {
    const loadingMsg = gpsLocation 
      ? `${tr.improvingPrecision || "Improving precision..."} (${Math.round(gpsLocation.accuracy)}m)`
      : tr.locatingYourself || "Finding your location...";

    return (
      <LoadingScreen 
        persistent={true} 
        message={loadingMsg} 
        onCancel={() => setSkipGpsWait(true)}
      />
    );
  }

  const locationStatusLabel = geoError ? tr.gpsUnavailable
    : location ? tr.gpsActive : tr.enableLocation;

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
        maxZoom={22}
      >
        <MapController mapRef={mapRef} />
        <ZoomTracker onZoomChange={setZoomLevel} />
        <MapClickHandler
          pickingMode={pickingMode}
          onPick={handleMapClickPick}
        />

        {/* Map tiles — Google Maps standard */}
        <TileLayer url={TILE_URL} attribution={TILE_ATTR} maxZoom={22} maxNativeZoom={21} />

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
            <Tooltip
              permanent
              direction="right"
              offset={[14, -4]}
              className="station-label"
            >
              {lang === 'az' ? station.station_az : station.station_en}
            </Tooltip>
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
          userLocation={location}
        />
      </MapContainer>

      {/* === FLOATING UI OVERLAYS === */}

      {/* Search Bar */}
      <SearchBar
        onSelectDestination={handleSelectDestination}
        onSelectOrigin={handleSelectOrigin}
        onSelectPlace={handlePlaceMarkers}
        onClear={handleClearRoute}
        onEnterPickMode={setPickingMode}
        pickingMode={pickingMode}
        origin={manualLocation}
        destination={destination}
        lang={lang}
        phase={phase}
      />

      <div className="top-control-stack" id="top-control-stack">
        {onGoHome && (
          <button
            className="map-home-btn"
            id="map-home-btn"
            onClick={onGoHome}
            title="Back to Home"
            aria-label="Back to Home"
          >
            <span>←</span>
            <span className="map-home-text">Home</span>
          </button>
        )}

        <button
          className="theme-toggle"
          id="theme-toggle"
          onClick={toggleTheme}
          aria-label={theme === 'light' ? tr.enableDark : tr.enableLight}
          title={theme === 'light' ? tr.darkMode : tr.lightMode}
        >
          <span className="theme-toggle-icon">{theme === 'light' ? '🌙' : '☀️'}</span>
          <span className="theme-toggle-text">{theme === 'light' ? tr.dark : tr.light}</span>
        </button>

        <MapLangCluster lang={lang} setLang={setLang} />

        {/* Location mode toggle button */}
        <button
          className={`location-mode-btn ${manualLocation ? 'has-manual' : ''}`}
          id="location-mode-btn"
          onClick={() => {
            if (manualLocation) {
              setManualLocation(null);
              setPickingMode(null);
            } else {
              setPickingMode('origin');
            }
          }}
          title={manualLocation ? tr.switchToAuto : tr.setManually}
        >
          {manualLocation ? (
            <>
              <span className="loc-btn-icon">🛰️</span>
              <span className="loc-btn-text">{tr.autoLocation}</span>
            </>
          ) : (
            <>
              <span className="loc-btn-icon">📍</span>
              <span className="loc-btn-text">{tr.manualLocation}</span>
            </>
          )}
        </button>
      </div>

      {/* Phase Indicator */}
      <PhaseIndicator phase={phase} lang={lang} isWalkOnly={route?.walkOnly} />

      {/* Walk-only card — destination is nearby, no metro needed */}
      {bottomCardInfo?.walkOnly && (
        <div className="walk-card walk-only-card" id="walk-only-card">
          <div className="walk-card-icon">🚶</div>
          <div className="walk-card-info">
            <span className="walk-distance">
              {tr.walkM(bottomCardInfo.walkDistance, formatDuration(bottomCardInfo.totalTime))}
            </span>
            <span className="walk-station walk-station-highlight">
              {tr.noMetroNeeded}
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
              {tr.walkM(bottomCardInfo.walkDistance, formatDuration(bottomCardInfo.totalTime))}
            </span>
            <span className="walk-station">
              {tr.toStation(lang === 'az' ? bottomCardInfo.stationName_az : bottomCardInfo.stationName_en)}
            </span>
            {bottomCardInfo.exitLabel && (
              <span className="walk-exit">
                → {tr.enterFrom(bottomCardInfo.exitLabel)}
              </span>
            )}
          </div>
          <button
            className="start-nav-btn"
            onClick={() => setPhase(2)}
          >
            {tr.start}
          </button>
        </div>
      )}

      {/* Route Options Card (Walk vs Metro) */}
      {routeOptions && (
        <div className="route-options-backdrop" id="route-options-modal">
          <div className="route-options-card">
            <h3>{tr.chooseRoute}</h3>
            <p className="options-subtitle">{tr.walkingFaster}</p>
            <div className="options-buttons">
              <button className="option-btn walk-option" onClick={applyWalkRoute}>
                <span className="icon">🚶</span>
                <span className="details">
                  <span className="mode">{tr.walk}</span>
                  <span className="time">{formatDuration(routeOptions.directWalkDuration)}</span>
                </span>
              </button>
              <button className="option-btn metro-option" onClick={applyMetroRoute}>
                <span className="icon">🚇</span>
                <span className="details">
                  <span className="mode">{tr.metro}</span>
                  <span className="time">{formatDuration(routeOptions.metroTotalDuration)}</span>
                </span>
              </button>
            </div>
            <button className="cancel-nav-btn" onClick={handleClearRoute}>
              {tr.cancel}
            </button>
          </div>
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
              {tr.walkToDestM(route.destination?.walkingDistance || '?')}
            </span>
            <span className="walk-station">
              {destination?.name?.split(',')[0] || tr.destination}
            </span>
          </div>
        </div>
      )}

      {/* Loading overlay */}
      {loading && (
        <div className="loading-overlay" id="loading-overlay">
          <div className="loading-spinner" />
          <span>{tr.calculating}</span>
        </div>
      )}

      {/* Error toast */}
      {routeError && (
        <div className="error-toast" id="error-toast">
          ⚠️ {routeError}
        </div>
      )}

      {/* Picking mode hint */}
      {pickingMode && (
        <div className="location-hint" id="location-hint">
          <span className="hint-icon">👆</span>
          <span className="hint-text">
            {pickingMode === 'origin' ? tr.tapMapToSetOrigin || "Tap map to set starting point" : tr.tapMapToSetDest || "Tap map to set destination"}
          </span>
        </div>
      )}

      {/* Phase nav buttons (for demo/testing) */}
      {route && (
        <div className="phase-nav" id="phase-nav">
          {(route.walkOnly ? [1] : [1, 2, 3, 4]).map(p => (
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
