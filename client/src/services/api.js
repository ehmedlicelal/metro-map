const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

/**
 * Fetch all stations and line data
 */
export async function fetchStations() {
  const res = await fetch(`${API_BASE}/stations`);
  if (!res.ok) throw new Error('Failed to fetch stations');
  return res.json();
}

/**
 * Calculate a metro route
 */
export async function fetchRoute({ userLat, userLng, destLat, destLng, destStationId }) {
  const res = await fetch(`${API_BASE}/route`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userLat, userLng, destLat, destLng, destStationId })
  });
  if (!res.ok) throw new Error('Failed to calculate route');
  return res.json();
}

/**
 * Search for places via our backend /api/places endpoint.
 * Backend uses Nominatim (OpenStreetMap) with in-memory caching,
 * restricted to Baku, Azerbaijan.
 */
export async function searchPlaces(query) {
  if (!query || query.trim().length < 2) return [];

  const params = new URLSearchParams({ q: query });
  const res = await fetch(`${API_BASE}/places?${params}`);
  if (!res.ok) return [];
  return res.json();
}

/**
 * Compute a straight-line walking route between two points.
 * Uses the Haversine formula for distance and 5 km/h average walking speed.
 * This avoids unreliable OSRM pedestrian data in Baku which causes weird detours.
 * The straight-line geometry matches how transit apps (Google Maps, etc.) display
 * walking segments between transit stops.
 * The `signal` parameter is accepted for API compatibility but unused.
 */
export async function fetchWalkingRoute(fromLat, fromLng, toLat, toLng, _signal) {
  // Haversine distance in metres
  const R = 6371000;
  const φ1 = (fromLat * Math.PI) / 180;
  const φ2 = (toLat * Math.PI) / 180;
  const Δφ = ((toLat - fromLat) * Math.PI) / 180;
  const Δλ = ((toLng - fromLng) * Math.PI) / 180;
  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const distance = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  // Realistic walking: ~5 km/h but add 30% for road detours (even for straight-line display)
  const duration = (distance / 1000 / 5) * 3600 * 1.3;

  return {
    geometry: {
      type: 'LineString',
      coordinates: [
        [fromLng, fromLat],
        [toLng, toLat],
      ],
    },
    distance,
    duration,
  };
}
