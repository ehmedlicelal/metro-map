/**
 * Calculate bearing in degrees from point A to point B.
 */
function bearing(lat1, lng1, lat2, lng2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const toDeg = (r) => (r * 180) / Math.PI;

  const dLng = toRad(lng2 - lng1);
  const y = Math.sin(dLng) * Math.cos(toRad(lat2));
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLng);

  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

/**
 * Determine LEFT or RIGHT turn direction after exiting the train.
 *
 * @param {number} prevLat - Latitude of the previous station
 * @param {number} prevLng - Longitude of the previous station
 * @param {number} stationLat - Latitude of the final (exit) station
 * @param {number} stationLng - Longitude of the final (exit) station
 * @param {number} exitLat - Latitude of the recommended exit
 * @param {number} exitLng - Longitude of the recommended exit
 * @returns {{ direction_en: string, direction_az: string, degrees: number }}
 */
function getTurnDirection(prevLat, prevLng, stationLat, stationLng, exitLat, exitLng) {
  const trainBearing = bearing(prevLat, prevLng, stationLat, stationLng);
  const exitBearing = bearing(stationLat, stationLng, exitLat, exitLng);

  const diff = (exitBearing - trainBearing + 360) % 360;

  if (diff > 180) {
    return { direction_en: 'LEFT', direction_az: 'SOLA', degrees: 360 - diff };
  } else {
    return { direction_en: 'RIGHT', direction_az: 'SAĞA', degrees: diff };
  }
}

module.exports = { getTurnDirection, bearing };
