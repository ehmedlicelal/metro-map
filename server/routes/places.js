const express = require('express');
const router = express.Router();

// Simple in-memory cache: query -> { data, timestamp }
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Baku bounding box (slightly generous)
const BAKU_VIEWBOX = '49.65,40.58,50.20,40.28';

const CUSTOM_PLACES = [
  {
    name: "Holberton School Azerbaijan (Gənclik Plaza), 89 Ataturk avenue, Baku 1000",
    lat: 40.4060470,
    lon: 49.8483572,
    keywords: ["holberton", "gənclik plaza", "genclik plaza", "ataturk 89", "atatürk 89"]
  },
  {
    name: "Innovation and Digital Development Agency (IDDA; MyGov), 89 Ataturk avenue, Baku 1069",
    lat: 40.4060470,
    lon: 49.8483572,
    keywords: ["idda", "mygov", "my gov", "innovation", "digital development", "ataturk 89", "atatürk 89"]
  }
];

/**
 * Helper: call Nominatim with given params
 */
async function searchNominatim(params) {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?${params}`,
    {
      headers: {
        'User-Agent': 'BakuMetroNavigator/1.0 (educational project)'
      }
    }
  );
  if (!response.ok) {
    throw new Error(`Nominatim returned ${response.status}`);
  }
  return response.json();
}

/**
 * @swagger
 * /api/places:
 *   get:
 *     summary: Search for places in Baku
 *     description: Searches OpenStreetMap Nominatim for places in Baku, Azerbaijan, with local caching.
 *     tags: [Places]
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *           minLength: 2
 *         required: true
 *         description: Search term (e.g., "Park Bulvar", "Port Baku")
 *     responses:
 *       200:
 *         description: A list ofMatching places
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   name:
 *                     type: string
 *                   lat:
 *                     type: number
 *                   lon:
 *                     type: number
 *       400:
 *         description: Invalid query parameter
 *       500:
 *         description: Failed to search places
 */
router.get('/', async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({ error: 'Query parameter "q" must be at least 2 characters' });
    }

    const query = q.trim().toLowerCase();

    // Check cache
    if (cache.has(query)) {
      const cached = cache.get(query);
      if (Date.now() - cached.timestamp < CACHE_TTL) {
        return res.json(cached.data);
      }
      cache.delete(query);
    }

    let rawResults = [];

    // Pass 1: Strict Baku bounding box
    const strictParams = new URLSearchParams({
      q: query,
      format: 'json',
      addressdetails: '1',
      limit: '15',
      countrycodes: 'az',
      viewbox: BAKU_VIEWBOX,
      bounded: '1',
      'accept-language': 'az,en'
    });
    rawResults = await searchNominatim(strictParams);

    // Pass 2: If no results, try with Baku viewbox as preference (not strict)
    if (rawResults.length === 0) {
      const looseParams = new URLSearchParams({
        q: query,
        format: 'json',
        addressdetails: '1',
        limit: '15',
        countrycodes: 'az',
        viewbox: BAKU_VIEWBOX,
        bounded: '0',
        'accept-language': 'az,en'
      });
      rawResults = await searchNominatim(looseParams);
    }

    // Pass 3: If still no results, try appending "Baku" to the query
    if (rawResults.length === 0) {
      const bakuParams = new URLSearchParams({
        q: `${query} Baku`,
        format: 'json',
        addressdetails: '1',
        limit: '15',
        countrycodes: 'az',
        'accept-language': 'az,en'
      });
      rawResults = await searchNominatim(bakuParams);
    }

    // Transform to simplified format
    const places = rawResults.map(place => ({
      name: place.display_name,
      lat: parseFloat(place.lat),
      lon: parseFloat(place.lon)
    }));

    // Inject custom places if matched
    CUSTOM_PLACES.forEach(cp => {
      if (cp.keywords.some(k => query.includes(k))) {
        if (!places.some(p => p.name === cp.name)) {
          places.unshift({ name: cp.name, lat: cp.lat, lon: cp.lon });
        }
      }
    });

    // Store in cache
    cache.set(query, { data: places, timestamp: Date.now() });

    res.json(places);
  } catch (err) {
    console.error('Places search error:', err.message);
    res.status(500).json({ error: 'Failed to search places' });
  }
});

module.exports = router;
