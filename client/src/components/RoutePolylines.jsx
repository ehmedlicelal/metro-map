import React from 'react';
import { Polyline, Marker } from 'react-leaflet';
import L from 'leaflet';

/** Compute compass bearing (degrees) from A to B */
function bearing(a, b) {
  const lat1 = (a[0] * Math.PI) / 180;
  const lat2 = (b[0] * Math.PI) / 180;
  const dLon = ((b[1] - a[1]) * Math.PI) / 180;
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

/** Arrow chevron SVG marker rotated to direction */
function createArrowIcon(deg, color) {
  const size = 18;
  return L.divIcon({
    html: `<div style="transform:rotate(${deg}deg);width:${size}px;height:${size}px">
      <svg width="${size}" height="${size}" viewBox="0 0 22 22" xmlns="http://www.w3.org/2000/svg">
        <polygon points="11,2 20,18 11,13 2,18" fill="${color}" fill-opacity="0.85" stroke="white" stroke-width="1"/>
      </svg>
    </div>`,
    className: '',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

/** Sample arrow positions every ~`step` metres along coords */
function sampleArrows(coords, step = 85) {
  if (coords.length < 2) return [];
  const arrows = [];
  let acc = 0;
  let threshold = step * 0.5;

  for (let i = 1; i < coords.length; i++) {
    const [p, c] = [coords[i - 1], coords[i]];
    const R = 6371000;
    const dLat = ((c[0] - p[0]) * Math.PI) / 180;
    const dLon = ((c[1] - p[1]) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((p[0] * Math.PI) / 180) *
        Math.cos((c[0] * Math.PI) / 180) *
        Math.sin(dLon / 2) ** 2;
    acc += R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    if (acc >= threshold) {
      const mid = [(p[0] + c[0]) / 2, (p[1] + c[1]) / 2];
      arrows.push({ pos: mid, deg: bearing(p, c) });
      acc = 0;
      threshold = step;
    }
  }
  return arrows;
}

/**
 * Convert an OSRM geometry (coordinates = [[lng,lat],...]) → Leaflet [[lat,lng],...]
 * Handles missing or malformed geometry gracefully.
 */
function geomToLeaflet(geometry) {
  return geometry?.coordinates?.map(c => [c[1], c[0]]) || [];
}

/**
 * Draw a walking polyline + direction arrows.
 * Falls back to a straight dotted line between two points if coords is empty.
 */
function WalkLine({ keyPrefix, coords, fallbackA, fallbackB, color, opacity = 0.88 }) {
  const pts = coords.length >= 2 ? coords : (fallbackA && fallbackB ? [fallbackA, fallbackB] : []);
  if (pts.length < 2) return null;

  const arrows = sampleArrows(pts, 85);
  return (
    <>
      <Polyline
        key={`${keyPrefix}-line`}
        positions={pts}
        pathOptions={{ color, weight: 5, opacity, dashArray: '1, 15', lineCap: 'round' }}
      />
      {arrows.map((a, i) => (
        <Marker
          key={`${keyPrefix}-arr-${i}`}
          position={a.pos}
          icon={createArrowIcon(a.deg, color)}
          interactive={false}
        />
      ))}
    </>
  );
}

/**
 * Route polylines for all journey phases.
 *
 * Phase 1 walk is ALWAYS shown when a route exists (not phase-gated)
 * because GPS auto-detection on desktop incorrectly jumps to phase 2.
 *
 * Phase 4 walk is shown during phase 3 and 4 as a preview.
 * Both fall back to straight lines if OSRM returns nothing.
 */
export default function RoutePolylines({ phase, route, walkingRoute, postMetroRoute, stationData, userLocation }) {
  if (!route) return null;

  /* ── Walk-only route ── */
  if (route.walkOnly) {
    const coords = geomToLeaflet(walkingRoute?.geometry);
    const fb1 = route.origin ? [route.origin.lat, route.origin.lng] : null;
    const fb2 = route.destination ? [route.destination.lat, route.destination.lng] : null;
    return (
      <WalkLine
        keyPrefix="walk-only"
        coords={coords}
        fallbackA={fb1}
        fallbackB={fb2}
        color="#4285F4"
      />
    );
  }

  const elements = [];

  /* ── Phase 1: Walk to station ─────────────────────────────────────
     Always visible regardless of GPS-detected phase.
     Falls back to straight line from userLocation → entry station.   */
  {
    const coords = geomToLeaflet(walkingRoute?.geometry);
    // Fallback: use the passed-in user location → entry station center
    const fbA = userLocation ? [userLocation.lat, userLocation.lng] : null;
    const fbB = route.entry?.station
      ? [route.entry.station.lat, route.entry.station.lng]
      : null;
    const opacity = phase <= 2 ? 0.9 : 0.35; // dim when past walking phase

    if (coords.length >= 2 || fbB) {
      elements.push(
        <WalkLine
          key="walk-in"
          keyPrefix="walk1"
          coords={coords}
          fallbackA={fbA}
          fallbackB={fbB}
          color="#4285F4"
          opacity={opacity}
        />
      );
    }
  }

  /* ── Phase 2: Metro lines ── */
  if (route.metro?.lineSegments) {
    const stations = stationData?.stations || [];
    const stationMap = Object.fromEntries(stations.map(s => [s.id, s]));

    for (const seg of route.metro.lineSegments) {
      const coords = seg.stations
        .map(id => { const s = stationMap[id]; return s ? [s.center_lat, s.center_lng] : null; })
        .filter(Boolean);

      if (coords.length >= 2) {
        elements.push(
          <Polyline
            key={`metro-${seg.line}-${seg.stations[0]}`}
            positions={coords}
            pathOptions={{
              color: seg.lineColor,
              weight: 6,
              opacity: phase === 2 ? 1 : 0.55,
              lineCap: 'round',
              lineJoin: 'round',
            }}
          />
        );
      }
    }
  }

  /* ── Phase 3: Exit arc ── */
  if (route.exit?.recommendedExit && route.destination) {
    const arc = [
      [route.exit.station.lat, route.exit.station.lng],
      [route.exit.recommendedExit.lat, route.exit.recommendedExit.lng],
      [route.destination.lat, route.destination.lng],
    ];
    elements.push(
      <Polyline
        key="exit-arc"
        positions={arc}
        pathOptions={{ color: '#fbbf24', weight: 4, opacity: 0.85, dashArray: '1, 12', lineCap: 'round' }}
      />
    );
    for (let i = 1; i < arc.length; i++) {
      const mid = [(arc[i-1][0]+arc[i][0])/2, (arc[i-1][1]+arc[i][1])/2];
      elements.push(
        <Marker
          key={`exit-arr-${i}`}
          position={mid}
          icon={createArrowIcon(bearing(arc[i-1], arc[i]), '#fbbf24')}
          interactive={false}
        />
      );
    }
  }

  /* ── Phase 4: Walk from exit to destination ────────────────────────
     Shown during phase 3 and 4 so the user can preview where to go.
     Falls back to straight line from exit → destination.              */
  {
    const coords = geomToLeaflet(postMetroRoute?.geometry);
    const fbA = route.exit?.recommendedExit
      ? [route.exit.recommendedExit.lat, route.exit.recommendedExit.lng]
      : route.exit?.station
        ? [route.exit.station.lat, route.exit.station.lng]
        : null;
    const fbB = route.destination
      ? [route.destination.lat, route.destination.lng]
      : null;
    const opacity = phase >= 3 ? 0.9 : 0.35;

    if (coords.length >= 2 || (fbA && fbB)) {
      elements.push(
        <WalkLine
          key="walk-out"
          keyPrefix="walk4"
          coords={coords}
          fallbackA={fbA}
          fallbackB={fbB}
          color="#4285F4"
          opacity={opacity}
        />
      );
    }
  }

  return <>{elements}</>;
}
