import React from 'react';
import { Polyline } from 'react-leaflet';

/**
 * Route polylines for all journey phases.
 *
 * Phase 1: Blue dashed walking line (user → station entrance)
 * Phase 2: Colored metro line(s) between stations
 * Phase 3: Yellow dashed arc (station center → exit → destination)
 * Phase 4: Green walking line (exit → destination)
 */
export default function RoutePolylines({ phase, route, walkingRoute, postMetroRoute, stationData }) {
  if (!route) return null;

  const lines = [];

  // Walk-only route: just show a direct walking polyline (green dashed)
  if (route.walkOnly && walkingRoute) {
    const coords = walkingRoute.geometry?.coordinates?.map(c => [c[1], c[0]]) || [];
    if (coords.length > 0) {
      lines.push(
        <Polyline
          key="walk-only-route"
          positions={coords}
          pathOptions={{
            color: '#4ecca3',
            weight: 5,
            opacity: 0.9,
            dashArray: '10, 8',
            lineCap: 'round'
          }}
        />
      );
    }
    return <>{lines}</>;
  }

  // Phase 1: Walking polyline to entry station
  if (walkingRoute && (phase === 1 || phase === 0)) {
    const coords = walkingRoute.geometry?.coordinates?.map(c => [c[1], c[0]]) || [];
    if (coords.length > 0) {
      lines.push(
        <Polyline
          key="walking-to-station"
          positions={coords}
          pathOptions={{
            color: '#4285F4',
            weight: 5,
            opacity: 0.8,
            dashArray: '10, 8',
            lineCap: 'round'
          }}
        />
      );
    }
  }

  // Phase 2: Metro route polylines (colored by line)
  if (route.metro?.lineSegments && (phase >= 1)) {
    const stations = stationData?.stations || [];
    const stationMap = {};
    for (const s of stations) {
      stationMap[s.id] = s;
    }

    for (const segment of route.metro.lineSegments) {
      const coords = segment.stations
        .map(id => {
          const s = stationMap[id];
          return s ? [s.center_lat, s.center_lng] : null;
        })
        .filter(Boolean);

      if (coords.length >= 2) {
        lines.push(
          <Polyline
            key={`metro-${segment.line}-${segment.stations[0]}`}
            positions={coords}
            pathOptions={{
              color: segment.lineColor,
              weight: 6,
              opacity: phase === 2 ? 1 : 0.6,
              lineCap: 'round',
              lineJoin: 'round'
            }}
          />
        );
      }
    }
  }

  // Phase 3: Dashed arc from station to exit to destination
  if (phase === 3 && route.exit?.recommendedExit && route.destination) {
    const exitCoords = [
      [route.exit.station.lat, route.exit.station.lng],
      [route.exit.recommendedExit.lat, route.exit.recommendedExit.lng],
      [route.destination.lat, route.destination.lng]
    ];
    lines.push(
      <Polyline
        key="exit-arc"
        positions={exitCoords}
        pathOptions={{
          color: '#fbbf24',
          weight: 4,
          opacity: 0.9,
          dashArray: '8, 6',
          lineCap: 'round'
        }}
      />
    );
  }

  // Phase 4: Walking polyline from exit to destination
  if (postMetroRoute && phase === 4) {
    const coords = postMetroRoute.geometry?.coordinates?.map(c => [c[1], c[0]]) || [];
    if (coords.length > 0) {
      lines.push(
        <Polyline
          key="walking-from-station"
          positions={coords}
          pathOptions={{
            color: '#4ecca3',
            weight: 5,
            opacity: 0.9,
            dashArray: '10, 8',
            lineCap: 'round'
          }}
        />
      );
    }
  }

  return <>{lines}</>;
}
