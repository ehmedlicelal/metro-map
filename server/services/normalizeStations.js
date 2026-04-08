const { parseCSV } = require('./csvService');

let cachedStations = null;

/**
 * Normalize CSV rows into station objects grouped by station name.
 * Each station has a center (avg lat/lng) and an array of exits.
 */
function normalizeStations() {
  if (cachedStations) return cachedStations;

  const rows = parseCSV();
  const stationMap = new Map();

  for (const row of rows) {
    const key = row.station_en; // Use English name as key

    if (!stationMap.has(key)) {
      stationMap.set(key, {
        station_az: row.station_az,
        station_en: row.station_en,
        exits: []
      });
    }

    // Handle "Memar Ajami 2" as same station "Memar Ajami"
    const station = stationMap.get(key);
    station.exits.push({
      label: row.exit_label,
      lat: row.lat,
      lng: row.lng,
      address: row.address
    });
  }

  // Merge "Memar Ajami 2" exits into "Memar Ajami"
  if (stationMap.has('Memar Ajami 2') && stationMap.has('Memar Ajami')) {
    const main = stationMap.get('Memar Ajami');
    const extra = stationMap.get('Memar Ajami 2');
    // Re-label exits from Memar Ajami 2
    for (const exit of extra.exits) {
      main.exits.push({
        ...exit,
        label: `Çıxış ${main.exits.length + 1} (2)`
      });
    }
    stationMap.delete('Memar Ajami 2');
  }

  // Compute center coordinates for each station
  const stations = [];
  for (const [key, station] of stationMap) {
    const avgLat = station.exits.reduce((sum, e) => sum + e.lat, 0) / station.exits.length;
    const avgLng = station.exits.reduce((sum, e) => sum + e.lng, 0) / station.exits.length;

    stations.push({
      id: key.toLowerCase().replace(/\s+/g, '-'),
      station_az: station.station_az,
      station_en: station.station_en,
      center_lat: avgLat,
      center_lng: avgLng,
      exits: station.exits
    });
  }

  cachedStations = stations;
  return stations;
}

/**
 * Find a station by its English name (case-insensitive)
 */
function findStation(name) {
  const stations = normalizeStations();
  return stations.find(s =>
    s.station_en.toLowerCase() === name.toLowerCase() ||
    s.station_az.toLowerCase() === name.toLowerCase()
  );
}

module.exports = { normalizeStations, findStation };
