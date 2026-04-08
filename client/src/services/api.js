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
 * Get walking route from OSRM (free, no API key)
 */
export async function fetchWalkingRoute(fromLat, fromLng, toLat, toLng) {
  const url = `https://router.project-osrm.org/route/v1/walking/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  if (data.routes && data.routes.length > 0) {
    return {
      geometry: data.routes[0].geometry,
      distance: data.routes[0].distance,
      duration: data.routes[0].duration
    };
  }
  return null;
}
