const express = require('express');
const router = express.Router();
const { findShortestPath, findNearestStation, haversine } = require('../services/dijkstra');
const { recommendExit } = require('../services/exitRecommender');
const { getTurnDirection } = require('../services/directionCalc');
const { normalizeStations } = require('../services/normalizeStations');

/**
 * POST /api/route
 * Body: { userLat, userLng, destLat, destLng, destStationId? }
 *
 * If destStationId is provided, route to that station.
 * Otherwise, find nearest station to destination and route to it.
 *
 * Returns full journey: walk → metro → exit → walk
 */
router.post('/', (req, res) => {
  try {
    const { userLat, userLng, destLat, destLng, destStationId } = req.body;

    if (!userLat || !userLng || (!destLat && !destStationId)) {
      return res.status(400).json({
        error: 'userLat, userLng, and either destLat/destLng or destStationId are required'
      });
    }

    const stations = normalizeStations();

    // 1. Find nearest station to user (entry station)
    const { station: entryStation, distance: walkDistanceToStation } = findNearestStation(userLat, userLng);

    // 2. Find nearest station to destination (exit station) or use provided ID
    let exitStation;
    let walkDistanceFromStation;
    if (destStationId) {
      exitStation = stations.find(s => s.id === destStationId);
      if (!exitStation) {
        return res.status(404).json({ error: `Station ${destStationId} not found` });
      }
      walkDistanceFromStation = 0;
    } else {
      const nearest = findNearestStation(destLat, destLng);
      exitStation = nearest.station;
      walkDistanceFromStation = nearest.distance;
    }

    // Resolve final destination coordinates
    const destLatFinal = destLat || exitStation.center_lat;
    const destLngFinal = destLng || exitStation.center_lng;

    // 3. If entry and exit stations are the same, just walk — no metro needed
    if (entryStation.id === exitStation.id) {
      const directWalkDistance = haversine(userLat, userLng, destLatFinal, destLngFinal);

      return res.json({
        walkOnly: true,
        origin: { lat: userLat, lng: userLng },
        destination: {
          lat: destLatFinal,
          lng: destLngFinal,
          walkingDistance: Math.round(directWalkDistance)
        }
      });
    }

    // 4. Find metro route (Dijkstra)
    const route = findShortestPath(entryStation.id, exitStation.id);

    if (!route) {
      return res.status(404).json({ error: 'No metro route found between these stations' });
    }

    // 5. Recommend best exit at destination station
    const bestExit = recommendExit(exitStation.exits, destLatFinal, destLngFinal);

    // 5. Calculate turn direction
    let turnDirection = null;
    if (route.path.length >= 2 && bestExit) {
      const prevStationId = route.path[route.path.length - 2];
      const prevStation = stations.find(s => s.id === prevStationId);
      if (prevStation) {
        turnDirection = getTurnDirection(
          prevStation.center_lat, prevStation.center_lng,
          exitStation.center_lat, exitStation.center_lng,
          bestExit.lat, bestExit.lng
        );
      }
    }

    // 6. Find closest entry exit (nearest exit of entry station to user)
    const entryExit = recommendExit(entryStation.exits, userLat, userLng);

    res.json({
      // Phase 1: Walking to station
      entry: {
        station: {
          id: entryStation.id,
          station_az: entryStation.station_az,
          station_en: entryStation.station_en,
          lat: entryStation.center_lat,
          lng: entryStation.center_lng
        },
        walkingDistance: Math.round(walkDistanceToStation),
        recommendedEntry: entryExit
      },

      // Phase 2: Metro journey
      metro: {
        ...route,
        totalStops: route.totalStops,
        totalDistance: Math.round(route.totalDistance)
      },

      // Phase 3: Exiting station
      exit: {
        station: {
          id: exitStation.id,
          station_az: exitStation.station_az,
          station_en: exitStation.station_en,
          lat: exitStation.center_lat,
          lng: exitStation.center_lng
        },
        allExits: exitStation.exits,
        recommendedExit: bestExit,
        turnDirection
      },

      // Phase 4: Walking to destination
      destination: {
        lat: destLatFinal,
        lng: destLngFinal,
        walkingDistance: bestExit ? Math.round(bestExit.distance) : Math.round(walkDistanceFromStation)
      }
    });
  } catch (err) {
    console.error('Route calculation error:', err);
    res.status(500).json({ error: 'Failed to calculate route' });
  }
});

module.exports = router;
