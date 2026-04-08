const { METRO_LINES, TRANSFERS } = require('./metroLines');
const { normalizeStations } = require('./normalizeStations');

/**
 * Haversine distance in meters between two lat/lng points
 */
function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Build the metro graph: adjacency list with weights (Haversine distance)
 */
function buildGraph() {
  const stations = normalizeStations();
  const stationMap = new Map();
  for (const s of stations) {
    stationMap.set(s.id, s);
  }

  // adjacency: stationId → [{ neighbor, distance, line }]
  const adjacency = new Map();

  for (const [lineId, line] of Object.entries(METRO_LINES)) {
    for (let i = 0; i < line.stations.length - 1; i++) {
      const fromId = line.stations[i];
      const toId = line.stations[i + 1];

      const from = stationMap.get(fromId);
      const to = stationMap.get(toId);

      if (!from || !to) continue;

      const dist = haversine(from.center_lat, from.center_lng, to.center_lat, to.center_lng);

      if (!adjacency.has(fromId)) adjacency.set(fromId, []);
      if (!adjacency.has(toId)) adjacency.set(toId, []);

      adjacency.get(fromId).push({ neighbor: toId, distance: dist, line: lineId });
      adjacency.get(toId).push({ neighbor: fromId, distance: dist, line: lineId });
    }
  }

  // Add transfer edges (zero-cost transfer between lines at same station)
  for (const [stationId, lines] of Object.entries(TRANSFERS)) {
    // Transfer is implicit — the station already appears in multiple lines
    // The edges from both lines will already connect through this station
  }

  return { adjacency, stationMap };
}

/**
 * Dijkstra's shortest path from startId to endId
 * Returns: { path: [stationId, ...], segments: [{ from, to, line }], totalDistance }
 */
function findShortestPath(startId, endId) {
  const { adjacency, stationMap } = buildGraph();

  if (!adjacency.has(startId) || !adjacency.has(endId)) {
    return null;
  }

  const dist = new Map();
  const prev = new Map();
  const prevLine = new Map();
  const visited = new Set();

  // Initialize
  for (const id of adjacency.keys()) {
    dist.set(id, Infinity);
  }
  dist.set(startId, 0);

  // Simple priority queue (array-based for small graph)
  const queue = [{ id: startId, dist: 0 }];

  while (queue.length > 0) {
    // Find min distance
    queue.sort((a, b) => a.dist - b.dist);
    const { id: current } = queue.shift();

    if (visited.has(current)) continue;
    visited.add(current);

    if (current === endId) break;

    const neighbors = adjacency.get(current) || [];
    for (const { neighbor, distance, line } of neighbors) {
      if (visited.has(neighbor)) continue;

      const newDist = dist.get(current) + distance;
      if (newDist < dist.get(neighbor)) {
        dist.set(neighbor, newDist);
        prev.set(neighbor, current);
        prevLine.set(neighbor, line);
        queue.push({ id: neighbor, dist: newDist });
      }
    }
  }

  // Reconstruct path
  if (!prev.has(endId) && startId !== endId) {
    return null;
  }

  const path = [];
  let current = endId;
  while (current !== undefined) {
    path.unshift(current);
    current = prev.get(current);
  }

  // Build segments with line info
  const segments = [];
  for (let i = 0; i < path.length - 1; i++) {
    const line = prevLine.get(path[i + 1]);
    segments.push({
      from: path[i],
      to: path[i + 1],
      line: line
    });
  }

  // Group into line segments for transfer detection
  const lineSegments = [];
  let currentLine = null;
  let currentSegment = null;

  for (const seg of segments) {
    if (seg.line !== currentLine) {
      if (currentSegment) {
        lineSegments.push(currentSegment);
      }
      currentLine = seg.line;
      currentSegment = {
        line: seg.line,
        lineName_az: METRO_LINES[seg.line].name_az,
        lineName_en: METRO_LINES[seg.line].name_en,
        lineColor: METRO_LINES[seg.line].color,
        stations: [seg.from, seg.to]
      };
    } else {
      currentSegment.stations.push(seg.to);
    }
  }
  if (currentSegment) lineSegments.push(currentSegment);

  // Build station details
  const stationDetails = path.map(id => {
    const s = stationMap.get(id);
    return s ? {
      id: s.id,
      station_az: s.station_az,
      station_en: s.station_en,
      lat: s.center_lat,
      lng: s.center_lng
    } : null;
  }).filter(Boolean);

  // Identify transfer stations
  const transfers = [];
  for (let i = 0; i < lineSegments.length - 1; i++) {
    const lastStation = lineSegments[i].stations[lineSegments[i].stations.length - 1];
    transfers.push({
      station: lastStation,
      fromLine: lineSegments[i].line,
      toLine: lineSegments[i + 1].line
    });
  }

  return {
    path,
    stationDetails,
    lineSegments,
    transfers,
    totalDistance: dist.get(endId),
    totalStops: path.length - 1
  };
}

/**
 * Find the nearest station to given coordinates
 */
function findNearestStation(lat, lng) {
  const stations = normalizeStations();
  let nearest = null;
  let minDist = Infinity;

  for (const s of stations) {
    const d = haversine(lat, lng, s.center_lat, s.center_lng);
    if (d < minDist) {
      minDist = d;
      nearest = s;
    }
  }

  return { station: nearest, distance: minDist };
}

module.exports = { findShortestPath, findNearestStation, haversine, buildGraph };
