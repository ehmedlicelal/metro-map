const express = require('express');
const cors = require('cors');
const path = require('path');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const stationsRouter = require('./routes/stations');
const routeRouter = require('./routes/route');
const placesRouter = require('./routes/places');

const app = express();
const PORT = process.env.PORT || 3001;

// Global error handlers to prevent silent crashes
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

app.use(cors({ origin: ["https://metro-map-gamma.vercel.app", "https://metro-map.vercel.app", "http://localhost:5173", "http://localhost:3000"] }));
app.use(express.json());

// Swagger configuration
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: '🚇 Baku Metro Navigator API',
      version: '1.0.0',
      description: 'API documentation for the Baku Metro Navigator application.',
    },
    servers: [
      {
        url: 'https://metro-map.onrender.com',
        description: 'Production server',
      },
      {
        url: `http://localhost:${PORT}`,
        description: 'Local development server',
      },
    ],
  },
  apis: [
    path.join(__dirname, './routes/*.js'),
    path.join(__dirname, './index.js')
  ], // Path to the API docs
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// API Routes
app.use('/api/stations', stationsRouter);
app.use('/api/route', routeRouter);
app.use('/api/places', placesRouter);

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: API health check
 *     description: Returns the status and timestamp of the API.
 *     tags: [Utility]
 *     responses:
 *       200:
 *         description: API is running
 */
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

/**
 * @swagger
 * /api/awake:
 *   get:
 *     summary: Keep-alive check
 *     description: Returns a confirmation message that the server is active.
 *     tags: [Utility]
 *     responses:
 *       200:
 *         description: Server is awake
 */
app.get('/api/awake', (req, res) => {
  res.send("I am awake");
});

app.listen(PORT, () => {
  console.log(`🚇 Metro Navigator API running on http://localhost:${PORT}`);
});
