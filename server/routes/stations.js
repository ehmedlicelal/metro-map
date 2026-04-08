const express = require('express');
const router = express.Router();
const { normalizeStations } = require('../services/normalizeStations');
const { METRO_LINES, TRANSFERS } = require('../services/metroLines');

/**
 * GET /api/stations
 * Returns all normalized stations with exits, plus metro line definitions.
 */
router.get('/', (req, res) => {
  try {
    const stations = normalizeStations();
    res.json({
      stations,
      lines: METRO_LINES,
      transfers: TRANSFERS
    });
  } catch (err) {
    console.error('Error loading stations:', err);
    res.status(500).json({ error: 'Failed to load station data' });
  }
});

module.exports = router;
