import React, { useState, useEffect } from 'react';
import Map from './components/Map';
import LoadingScreen from './components/LoadingScreen';
import LandingPage from './components/LandingPage';
import './index.css';

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState('landing');
  const [initialOrigin, setInitialOrigin] = useState(null);
  const [initialDestination, setInitialDestination] = useState(null);
  const [initialLang, setInitialLang] = useState('en');

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
        <LandingPage onSelectDestination={handleLandingSelect} />
      )}
      {!isLoading && page === 'map' && (
        <Map initialOrigin={initialOrigin} initialDestination={initialDestination} initialLang={initialLang} onGoHome={() => setPage('landing')} />
      )}
    </>
  );
}
