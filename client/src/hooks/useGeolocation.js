import { useState, useEffect, useRef } from 'react';

/**
 * Custom hook for real-time geolocation tracking.
 * Uses watchPosition for continuous updates.
 */
export function useGeolocation() {
  const [location, setLocation] = useState(null);
  const [heading, setHeading] = useState(null);
  const [speed, setSpeed] = useState(null);
  const [error, setError] = useState(null);
  const [isTracking, setIsTracking] = useState(false);
  const watchIdRef = useRef(null);

  useEffect(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser');
      return;
    }

    setIsTracking(true);

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, heading: h, speed: s, accuracy } = position.coords;
        setLocation({ lat: latitude, lng: longitude, accuracy });
        setHeading(h);
        setSpeed(s);
        setError(null);
      },
      (err) => {
        console.error('Geolocation error:', err);
        setError(err.message);
        setIsTracking(false);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 1000,
        timeout: 10000
      }
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  return { location, heading, speed, error, isTracking };
}

/**
 * Detect which navigation phase the user is in based on GPS data.
 *
 * Phase 1: Walking to station (speed < 6 km/h, far from entry station)
 * Phase 2: On metro (speed > 15 km/h or near station on route)
 * Phase 3: At exit station (speed ~0, near final station)
 * Phase 4: Walking from station (speed < 6 km/h, near exit station)
 */
export function detectPhase(location, speed, route) {
  if (!location || !route) return 1;

  const { lat, lng } = location;
  const speedKmh = speed ? speed * 3.6 : 0;

  // Distance to entry station
  const entryLat = route.entry?.station?.lat;
  const entryLng = route.entry?.station?.lng;
  const distToEntry = entryLat ? haversineDist(lat, lng, entryLat, entryLng) : Infinity;

  // Distance to exit station
  const exitLat = route.exit?.station?.lat;
  const exitLng = route.exit?.station?.lng;
  const distToExit = exitLat ? haversineDist(lat, lng, exitLat, exitLng) : Infinity;

  // Distance to destination
  const destLat = route.destination?.lat;
  const destLng = route.destination?.lng;
  const distToDest = destLat ? haversineDist(lat, lng, destLat, destLng) : Infinity;

  // Phase detection logic
  if (distToExit < 200 && speedKmh < 6) {
    // Near exit station and slow — either phase 3 or 4
    if (distToDest < 50) return 4; // Very close to destination
    return distToExit < 100 ? 3 : 4;
  }

  if (speedKmh > 15 || (distToEntry > 300 && distToExit > 300)) {
    return 2; // Fast speed = on train, or between stations
  }

  if (distToEntry < 500) {
    return 1; // Near entry station
  }

  return 1; // Default to phase 1
}

function haversineDist(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
