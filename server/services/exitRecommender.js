const { haversine } = require('./dijkstra');

/**
 * Recommend the best exit from a station based on proximity to destination.
 * @param {Array} exits - Array of { label, lat, lng, address }
 * @param {number} destLat - Destination latitude
 * @param {number} destLng - Destination longitude
 * @returns {{ label, lat, lng, address, distance }}
 */
function recommendExit(exits, destLat, destLng) {
  if (!exits || exits.length === 0) return null;

  return exits.reduce((best, exit) => {
    const d = haversine(exit.lat, exit.lng, destLat, destLng);
    return d < best.distance ? { ...exit, distance: d } : best;
  }, { ...exits[0], distance: Infinity });
}

module.exports = { recommendExit };
