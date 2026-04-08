import { useState, useCallback } from 'react';
import { fetchRoute, fetchStations } from '../services/api';

/**
 * Custom hook for managing metro route state.
 */
export function useRoute() {
  const [route, setRoute] = useState(null);
  const [stationData, setStationData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [phase, setPhase] = useState(0); // 0 = no route, 1-4 = journey phases

  /**
   * Load all station data on mount
   */
  const loadStations = useCallback(async () => {
    try {
      const data = await fetchStations();
      setStationData(data);
      return data;
    } catch (err) {
      console.error('Failed to load stations:', err);
      setError('Failed to load station data');
      return null;
    }
  }, []);

  /**
   * Calculate a route from user location to destination
   */
  const calculateRoute = useCallback(async (userLat, userLng, destLat, destLng) => {
    setLoading(true);
    setError(null);

    try {
      const result = await fetchRoute({ userLat, userLng, destLat, destLng });
      setRoute(result);
      setPhase(1);
      return result;
    } catch (err) {
      console.error('Route calculation failed:', err);
      setError('Failed to calculate route');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Clear the current route
   */
  const clearRoute = useCallback(() => {
    setRoute(null);
    setPhase(0);
    setError(null);
  }, []);

  return {
    route,
    stationData,
    loading,
    error,
    phase,
    setPhase,
    loadStations,
    calculateRoute,
    clearRoute
  };
}
