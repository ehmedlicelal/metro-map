import React, { useState } from 'react';
import Map from './components/Map';
import LoadingScreen from './components/LoadingScreen';
import './index.css';

/**
 * Baku Metro Navigator — the map IS the entire app.
 */
export default function App() {
  const [isLoading, setIsLoading] = useState(true);

  return (
    <>
      {isLoading && <LoadingScreen onComplete={() => setIsLoading(false)} />}
      <Map />
    </>
  );
}
