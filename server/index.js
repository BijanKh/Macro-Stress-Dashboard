import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import { fetchAllSeries, SERIES } from './fred.js';
import { computeIndicators } from './indicators.js';
import { saveObservations, saveSnapshot, getHistory, getHYHistory, getLatestSnapshot } from './db.js';
import { startScheduler } from './scheduler.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isProduction = process.env.NODE_ENV === 'production';

const PORT = (() => {
  const p = parseInt(process.env.PORT, 10);
  return Number.isInteger(p) && p >= 1 && p <= 65535 ? p : 3456;
})();

const app = express();

// Security headers
app.use(helmet({
  contentSecurityPolicy: isProduction ? undefined : false,
}));

// CORS — restrict to known origins
const ALLOWED_ORIGINS = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',')
  : ['http://localhost:5173', 'http://localhost:3456'];

app.use(cors({
  origin: ALLOWED_ORIGINS,
  methods: ['GET', 'HEAD', 'OPTIONS'],
}));

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});
app.use('/api/', apiLimiter);

const refreshLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Refresh rate limited. Try again in a minute.' },
});

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    console.log(`${req.method} ${req.path} ${res.statusCode} ${Date.now() - start}ms`);
  });
  next();
});

// In production, serve Vite build
if (isProduction) {
  app.use(express.static(path.join(__dirname, '..', 'client', 'dist')));
}

// Validate and clamp days param
function parseDays(raw) {
  const d = parseInt(raw, 10);
  if (!Number.isInteger(d) || d < 1) return 90;
  return Math.min(d, 1000);
}

let cachedResult = null;

export async function fetchAndStore() {
  console.log('Fetching all FRED series...');
  const allData = await fetchAllSeries(120);

  // Save raw observations
  for (const [key, { seriesId, observations }] of Object.entries(allData)) {
    if (observations.length > 0) {
      saveObservations(seriesId, observations);
    }
  }

  // Compute indicators
  const result = computeIndicators(allData);
  cachedResult = result;

  // Save daily snapshot
  const snapshot = {
    date: result.asOf,
    ...result.raw,
    ...result.scores,
    composite_score: result.composite,
    regime: result.regime,
    signal_active: result.signalActive ? 1 : 0,
  };
  saveSnapshot(snapshot);

  console.log(`Data saved for ${result.asOf} — Composite: ${result.composite} (${result.regime})`);
  return result;
}

// API Routes
app.get('/api/current', async (req, res) => {
  try {
    if (!cachedResult) {
      const dbSnapshot = getLatestSnapshot();
      if (dbSnapshot) {
        res.json({
          asOf: dbSnapshot.date,
          indicators: {
            hy_oas: { value: dbSnapshot.hy_oas, score: dbSnapshot.score_hy_oas, weight: 0.25 },
            ccc_bb: { value: dbSnapshot.ccc_bb, score: dbSnapshot.score_ccc_bb, weight: 0.15 },
            cp_spread: { value: dbSnapshot.cp_spread, score: dbSnapshot.score_cp_spread, weight: 0.15 },
            vix: { value: dbSnapshot.vix, score: dbSnapshot.score_vix, weight: 0.15 },
            sofr_ff: { value: dbSnapshot.sofr_ff, score: dbSnapshot.score_sofr_ff, weight: 0.10 },
            tsy_vol: { value: dbSnapshot.tsy_vol, score: dbSnapshot.score_tsy_vol, weight: 0.10 },
            hy_momentum: { value: dbSnapshot.hy_momentum, score: dbSnapshot.score_hy_momentum, weight: 0.10 },
          },
          composite: dbSnapshot.composite_score,
          regime: dbSnapshot.regime,
          signalActive: dbSnapshot.signal_active === 1,
          yields: {
            '2y': dbSnapshot.dgs2, '5y': dbSnapshot.dgs5, '10y': dbSnapshot.dgs10,
            '20y': dbSnapshot.dgs20, '30y': dbSnapshot.dgs30,
          },
          context: { fedFunds: dbSnapshot.fed_funds, sofr: dbSnapshot.sofr },
        });
        return;
      }
      cachedResult = await fetchAndStore();
    }
    res.json(cachedResult);
  } catch (err) {
    console.error('Error in /api/current:', err);
    res.status(500).json({ error: 'Failed to load current data.' });
  }
});

app.get('/api/history', (req, res) => {
  const days = parseDays(req.query.days);
  const history = getHistory(days);
  res.json({
    history: history.map(h => ({
      date: h.date,
      composite: h.composite_score,
      regime: h.regime,
      signalActive: h.signal_active === 1,
    })),
  });
});

app.get('/api/hy-history', (req, res) => {
  const days = parseDays(req.query.days);
  res.json({ history: getHYHistory(days) });
});

app.get('/api/refresh', refreshLimiter, async (req, res) => {
  try {
    const result = await fetchAndStore();
    res.json(result);
  } catch (err) {
    console.error('Error in /api/refresh:', err);
    res.status(500).json({ error: 'Refresh failed. Try again later.' });
  }
});

// SPA fallback for production
if (isProduction) {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'client', 'dist', 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} (${isProduction ? 'production' : 'development'})`);
  startScheduler(fetchAndStore);
});
