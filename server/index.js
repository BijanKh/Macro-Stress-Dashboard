import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { fetchAllSeries, SERIES } from './fred.js';
import { computeIndicators } from './indicators.js';
import { saveObservations, saveSnapshot, getHistory, getHYHistory, getLatestSnapshot } from './db.js';
import { startScheduler } from './scheduler.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3456;
const app = express();

app.use(cors());

// In production, serve Vite build
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '..', 'client', 'dist')));
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
      // Try loading from DB first
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
      // No cached data and no DB data — fetch fresh
      cachedResult = await fetchAndStore();
    }
    res.json(cachedResult);
  } catch (err) {
    console.error('Error in /api/current:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/history', (req, res) => {
  const days = parseInt(req.query.days) || 90;
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
  const days = parseInt(req.query.days) || 90;
  res.json({ history: getHYHistory(days) });
});

app.get('/api/refresh', async (req, res) => {
  try {
    const result = await fetchAndStore();
    res.json(result);
  } catch (err) {
    console.error('Error in /api/refresh:', err);
    res.status(500).json({ error: err.message });
  }
});

// SPA fallback for production
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'client', 'dist', 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  startScheduler(fetchAndStore);
});
