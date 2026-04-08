const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const stationsRouter = require('./routes/stations');
const routeRouter = require('./routes/route');
const placesRouter = require('./routes/places');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/stations', stationsRouter);
app.use('/api/route', routeRouter);
app.use('/api/places', placesRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🚇 Metro Navigator API running on http://localhost:${PORT}`);
});
