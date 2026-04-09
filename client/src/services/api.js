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
 * Compute an actual pedestrian route using OSRM (OpenStreetMap).
 * This provides "on foot road" geometry following streets instead of a straight line.
 * Falls back to a straight line if the service is unavailable or no route is found.
 */
export async function fetchWalkingRoute(fromLat, fromLng, toLat, toLng, signal) {
  // Try OpenStreetMap.de first (often better walking data)
  const providers = [
    `https://routing.openstreetmap.de/routed-foot/route/v1/foot/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson`,
    `https://router.project-osrm.org/route/v1/foot/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson`
  ];

  for (const url of providers) {
    try {
      const res = await fetch(url, { signal });
      if (!res.ok) continue;
      
      const data = await res.json();
      if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) continue;

      const route = data.routes[0];
      return {
        geometry: route.geometry,
        distance: route.distance,
        duration: route.duration,
      };
    } catch (err) {
      if (err.name === 'AbortError') throw err;
      console.warn(`Walking route fetch failed for ${url}:`, err);
    }
  }

  // Final fallback: Straight line if all providers fail
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

    // Realistic walking: ~5 km/h but add 30% for road detours
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
