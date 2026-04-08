import { useEffect, useRef } from 'react';

/**
 * Custom hook to control the Leaflet map camera based on the current phase.
 *
 * Phase 0: Default Baku overview (zoom 12)
 * Phase 1: Street level between user and entry station (zoom 15-16)
 * Phase 2: Show full metro segment (zoom 12-13)
 * Phase 3: Station close-up (zoom 17-18)
 * Phase 4: Street level between exit and destination (zoom 15-16)
 */
export function useMapCamera(mapRef, phase, location, route) {
  const lastPhaseRef = useRef(phase);

  useEffect(() => {
    const map = mapRef?.current;
    if (!map) return;

    // Only animate on phase change
    if (phase === lastPhaseRef.current && phase !== 0) return;
    lastPhaseRef.current = phase;

    switch (phase) {
      case 0:
        // Default Baku center
        map.flyTo([40.4093, 49.8671], 12, { duration: 1.5 });
        break;

      case 1: {
        // Fit between user location and entry station
        if (location && route?.entry?.station) {
          const bounds = [
            [location.lat, location.lng],
            [route.entry.station.lat, route.entry.station.lng]
          ];
          map.flyToBounds(bounds, { padding: [80, 80], maxZoom: 16, duration: 1.5 });
        }
        break;
      }

      case 2: {
        // Show the full metro route
        if (route?.metro?.stationDetails?.length > 0) {
          const lats = route.metro.stationDetails.map(s => s.lat);
          const lngs = route.metro.stationDetails.map(s => s.lng);
          const bounds = [
            [Math.min(...lats), Math.min(...lngs)],
            [Math.max(...lats), Math.max(...lngs)]
          ];
          map.flyToBounds(bounds, { padding: [60, 60], maxZoom: 14, duration: 1.5 });
        }
        break;
      }

      case 3: {
        // Zoom into exit station
        if (route?.exit?.station) {
          map.flyTo(
            [route.exit.station.lat, route.exit.station.lng],
            17,
            { duration: 1.5 }
          );
        }
        break;
      }

      case 4: {
        // Fit between exit and destination
        if (route?.exit?.recommendedExit && route?.destination) {
          const bounds = [
            [route.exit.recommendedExit.lat, route.exit.recommendedExit.lng],
            [route.destination.lat, route.destination.lng]
          ];
          map.flyToBounds(bounds, { padding: [80, 80], maxZoom: 16, duration: 1.5 });
        }
        break;
      }

      default:
        break;
    }
  }, [mapRef, phase, location, route]);
}
