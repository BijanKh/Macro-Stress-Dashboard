import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '..', 'data', 'stress.db');

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS daily_snapshots (
    date TEXT PRIMARY KEY,
    hy_oas REAL,
    ccc_oas REAL,
    bb_oas REAL,
    ccc_bb REAL,
    vix REAL,
    cp_3m REAL,
    tbill_3m REAL,
    cp_spread REAL,
    sofr REAL,
    fed_funds REAL,
    sofr_ff REAL,
    dgs2 REAL,
    dgs5 REAL,
    dgs10 REAL,
    dgs20 REAL,
    dgs30 REAL,
    tsy_vol REAL,
    hy_momentum REAL,
    score_hy_oas REAL,
    score_ccc_bb REAL,
    score_cp_spread REAL,
    score_vix REAL,
    score_sofr_ff REAL,
    score_tsy_vol REAL,
    score_hy_momentum REAL,
    composite_score REAL,
    regime TEXT,
    signal_active INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS fred_observations (
    series_id TEXT NOT NULL,
    date TEXT NOT NULL,
    value REAL NOT NULL,
    fetched_at TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (series_id, date)
  );
`);

const upsertObservation = db.prepare(`
  INSERT OR REPLACE INTO fred_observations (series_id, date, value)
  VALUES (?, ?, ?)
`);

const upsertSnapshot = db.prepare(`
  INSERT OR REPLACE INTO daily_snapshots (
    date, hy_oas, ccc_oas, bb_oas, ccc_bb, vix, cp_3m, tbill_3m, cp_spread,
    sofr, fed_funds, sofr_ff, dgs2, dgs5, dgs10, dgs20, dgs30,
    tsy_vol, hy_momentum,
    score_hy_oas, score_ccc_bb, score_cp_spread, score_vix,
    score_sofr_ff, score_tsy_vol, score_hy_momentum,
    composite_score, regime, signal_active
  ) VALUES (
    ?, ?, ?, ?, ?, ?, ?, ?, ?,
    ?, ?, ?, ?, ?, ?, ?, ?,
    ?, ?,
    ?, ?, ?, ?,
    ?, ?, ?,
    ?, ?, ?
  )
`);

export function saveObservations(seriesId, observations) {
  const tx = db.transaction(() => {
    for (const obs of observations) {
      upsertObservation.run(seriesId, obs.date, obs.value);
    }
  });
  tx();
}

export function saveSnapshot(snapshot) {
  upsertSnapshot.run(
    snapshot.date,
    snapshot.hy_oas, snapshot.ccc_oas, snapshot.bb_oas, snapshot.ccc_bb,
    snapshot.vix, snapshot.cp_3m, snapshot.tbill_3m, snapshot.cp_spread,
    snapshot.sofr, snapshot.fed_funds, snapshot.sofr_ff,
    snapshot.dgs2, snapshot.dgs5, snapshot.dgs10, snapshot.dgs20, snapshot.dgs30,
    snapshot.tsy_vol, snapshot.hy_momentum,
    snapshot.score_hy_oas, snapshot.score_ccc_bb, snapshot.score_cp_spread,
    snapshot.score_vix, snapshot.score_sofr_ff, snapshot.score_tsy_vol,
    snapshot.score_hy_momentum,
    snapshot.composite_score, snapshot.regime, snapshot.signal_active
  );
}

export function getHistory(days = 90) {
  return db.prepare(`
    SELECT date, composite_score, regime, signal_active
    FROM daily_snapshots
    ORDER BY date DESC
    LIMIT ?
  `).all(days).reverse();
}

export function getHYHistory(days = 90) {
  return db.prepare(`
    SELECT date, value
    FROM fred_observations
    WHERE series_id = 'BAMLH0A0HYM2'
    ORDER BY date DESC
    LIMIT ?
  `).all(days).reverse();
}

export function getLatestSnapshot() {
  return db.prepare(`
    SELECT * FROM daily_snapshots ORDER BY date DESC LIMIT 1
  `).get();
}

export function getObservations(seriesId, limit = 120) {
  return db.prepare(`
    SELECT date, value FROM fred_observations
    WHERE series_id = ?
    ORDER BY date DESC
    LIMIT ?
  `).all(seriesId, limit);
}

export default db;
