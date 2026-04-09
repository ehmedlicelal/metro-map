const express = require('express');
const router = express.Router();
const { normalizeStations } = require('../services/normalizeStations');
const { METRO_LINES, TRANSFERS } = require('../services/metroLines');

/**
 * @swagger
 * /api/stations:
 *   get:
 *     summary: Returns all metro stations
 *     description: Returns all normalized stations with exits, plus metro line definitions and transfers.
 *     tags: [Stations]
 *     responses:
 *       200:
 *         description: A list of stations, lines, and transfers
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 stations:
 *                   type: array
 *                   items:
 *                     type: object
 *                 lines:
 *                   type: object
 *                 transfers:
 *                   type: array
 *       500:
 *         description: Failed to load station data
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
