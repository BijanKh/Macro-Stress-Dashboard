import 'dotenv/config';
import { fetchAllSeries, SERIES } from '../server/fred.js';
import { computeFromObservations } from '../server/indicators.js';
import { saveObservations, saveSnapshot } from '../server/db.js';

async function backfill() {
  console.log('Starting backfill — fetching ~1 year of data for all series...');

  const allData = await fetchAllSeries(500);

  // Save all raw observations
  for (const [key, { seriesId, observations }] of Object.entries(allData)) {
    if (observations.length > 0) {
      saveObservations(seriesId, observations);
      console.log(`  Saved ${observations.length} observations for ${key} (${seriesId})`);
    }
  }

  // Build observation arrays by key
  const obsByKey = {};
  for (const [key, { observations }] of Object.entries(allData)) {
    obsByKey[key] = observations;
  }

  // Collect all unique trading dates from HY OAS (most representative)
  const hyObs = allData.HY_OAS?.observations || [];
  const dates = hyObs.map(o => o.date).sort();

  console.log(`\nComputing snapshots for ${dates.length} trading days...`);

  let count = 0;
  for (const date of dates) {
    const result = computeFromObservations(obsByKey, date);

    if (result.composite == null) continue;

    const snapshot = {
      date,
      ...result.raw,
      ...result.scores,
      composite_score: result.composite,
      regime: result.regime,
      signal_active: result.signalActive ? 1 : 0,
    };

    saveSnapshot(snapshot);
    count++;

    if (count % 50 === 0) {
      console.log(`  Processed ${count} / ${dates.length} days...`);
    }
  }

  console.log(`\nBackfill complete. Saved ${count} daily snapshots.`);
}

backfill().catch(err => {
  console.error('Backfill failed:', err);
  process.exit(1);
});
