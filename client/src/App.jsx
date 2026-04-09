import React, { useState, useEffect } from 'react';
import Map from './components/Map';
import LoadingScreen from './components/LoadingScreen';
import LandingPage from './components/LandingPage';
import { useGeolocation } from './hooks/useGeolocation';
import './index.css';

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState('landing');
  const [initialOrigin, setInitialOrigin] = useState(null);
  const [initialDestination, setInitialDestination] = useState(null);
  const [initialLang, setInitialLang] = useState('en');

  // Root-level geolocation tracking to keep it alive during page transitions
  const geo = useGeolocation();

  useEffect(() => {
    document.body.classList.toggle('page--map',     page === 'map');
    document.body.classList.toggle('page--landing', page === 'landing');
  }, [page]);

  // dest may be null (user clicked Open Map without search)
  // dest.lang always carries the selected language
  const handleLandingSelect = (dest, origin) => {
    const lang = dest?.lang || 'en';
    setInitialLang(lang);
    setInitialOrigin(origin?.lat ? origin : null);
    setInitialDestination(dest?.lat ? dest : null);
    setPage('map');
  };

  return (
    <>
      {isLoading && <LoadingScreen onComplete={() => setIsLoading(false)} />}
      {!isLoading && page === 'landing' && (
        <LandingPage 
          onSelectDestination={handleLandingSelect} 
          gpsLocation={geo.location}
          startGps={geo.startTracking}
        />
      )}
      {!isLoading && page === 'map' && (
        <Map 
          initialOrigin={initialOrigin} 
          initialDestination={initialDestination} 
          initialLang={initialLang} 
          onGoHome={() => setPage('landing')}
          gpsState={geo}
        />
      )}
    </>
  );
}
