/**
 * Bearing in degrees (0–360) from point A to point B.
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
 * Compute TWO turn instructions for exiting a metro station.
 *
 * Step 1 — Platform turn  (inside the station, just off the train):
 *   Uses the centroid of ALL exits as the "station center of gravity."
 *   Dot-product of the train-travel vector vs (destination − centroid) vector:
 *     - dot < 0  → destination is BEHIND the direction the train came from
 *                  → walk toward the back of the platform → tell passenger LEFT
 *     - dot >= 0 → destination is AHEAD  → walk toward the front → RIGHT
 *
 * Step 2 — Street turn  (after the turnstile / exit door on the street):
 *   Once outside, the passenger faces the direction (station → exit).
 *   They need to face (exit → destination).
 *   angleDiff = (destFromExitBearing − exitFacingBearing + 360) % 360
 *     - diff ≤ 180 → turn RIGHT
 *     - diff > 180 → turn LEFT
 *
 * @param {number} prevLat
 * @param {number} prevLng
 * @param {number} stationLat
 * @param {number} stationLng
 * @param {number} exitLat        – recommended exit door lat
 * @param {number} exitLng        – recommended exit door lng
 * @param {number} destLat        – final destination lat
 * @param {number} destLng        – final destination lng
 * @param {Array}  allExits       – all exit objects [{ lat, lng, label }]
 * @returns {{ direction_en, direction_az, degrees, platform_en, platform_az }}
 */
function getTurnDirection(
  prevLat, prevLng,
  stationLat, stationLng,
  exitLat, exitLng,
  destLat, destLng,
  allExits
) {
  // ── Step 1: Platform direction ────────────────────────────────────────────

  // Centroid of all exits (average position = "centre of platform exits")
  const exitCentroidLat =
    allExits && allExits.length > 0
      ? allExits.reduce((s, e) => s + e.lat, 0) / allExits.length
      : stationLat;
  const exitCentroidLng =
    allExits && allExits.length > 0
      ? allExits.reduce((s, e) => s + e.lng, 0) / allExits.length
      : stationLng;

  // Train direction vector (previous station → exit station)
  const trainDLng = stationLng - prevLng;
  const trainDLat = stationLat - prevLat;

  // Destination relative to exit centroid
  const destDLng = (destLng !== undefined ? destLng : exitLng) - exitCentroidLng;
  const destDLat = (destLat !== undefined ? destLat : exitLat) - exitCentroidLat;

  // Dot product: positive → destination is in front of train, negative → behind
  const dot = trainDLng * destDLng + trainDLat * destDLat;

  // User's rule: BEHIND (dot < 0) → platform LEFT, AHEAD (dot >= 0) → platform RIGHT
  const platformDir = dot < 0 ? 'LEFT' : 'RIGHT';
  const platformAz  = platformDir === 'LEFT' ? 'SOLA' : 'SAĞA';

  // ── Step 2: Street direction ──────────────────────────────────────────────

  // Direction you face stepping out of the exit door = bearing from station → exit
  // Using centroid instead of station point for more stability in "outward" bearing
  const exitFacingBearing = bearing(exitCentroidLat, exitCentroidLng, exitLat, exitLng);

  let streetDir = 'RIGHT';
  let streetDeg = 0;

  if (destLat !== undefined && destLng !== undefined) {
    // Bearing you NEED to face = from exit door → destination
    const destFromExitBearing = bearing(exitLat, exitLng, destLat, destLng);
    const diff = (destFromExitBearing - exitFacingBearing + 360) % 360;
    streetDir = diff <= 180 ? 'RIGHT' : 'LEFT';
    streetDeg = diff <= 180 ? diff : 360 - diff;
  } else {
    // Fallback (no destination coords): compare train bearing vs exit bearing
    const trainBearing = bearing(prevLat, prevLng, stationLat, stationLng);
    const diff = (exitFacingBearing - trainBearing + 360) % 360;
    streetDir = diff <= 180 ? 'RIGHT' : 'LEFT';
    streetDeg = diff <= 180 ? diff : 360 - diff;
  }

  const streetAz = streetDir === 'LEFT' ? 'SOLA' : 'SAĞA';

  return {
    // Street-level turn (shown as "Turn X after turnstiles")
    direction_en: streetDir,
    direction_az: streetAz,
    degrees: Math.round(streetDeg),
    // Platform-level turn (shown as "After train, walk X toward exit")
    platform_en: platformDir,
    platform_az: platformAz,
  };
}

module.exports = { getTurnDirection, bearing };
