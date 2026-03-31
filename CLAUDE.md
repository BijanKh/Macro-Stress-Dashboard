# MACRO FINANCIAL STRESS MONITOR

## Project Overview

A full-stack financial stress monitoring dashboard that tracks 7 key macro indicators, computes a composite stress score (0–100), and provides a regime transition signal for timing the rotation from short-duration to long-duration Treasury positions.

**Use case:** The user is a macro investor monitoring credit markets, volatility, and funding stress to identify when the "growth shock" overtakes the "inflation shock" in a stagflationary environment (Iran war / oil crisis, 2026). When the composite score crosses ≥65, it signals the regime transition — time to initiate long-duration Treasury positions (20Y+).

---

## Architecture

```
macro-stress-monitor/
├── CLAUDE.md                  # This file
├── .env                       # FRED API key (FRED_API_KEY=...)
├── package.json
├── server/
│   ├── index.js               # Express server — API routes + static file serving
│   ├── fred.js                # FRED API client — fetches all 10 series
│   ├── indicators.js          # Indicator computation + composite score logic
│   ├── scheduler.js           # Cron job — auto-fetch during market hours
│   └── db.js                  # SQLite interface — daily snapshots
├── client/
│   ├── index.html             # Entry HTML
│   ├── src/
│   │   ├── App.jsx            # Main dashboard component
│   │   ├── components/
│   │   │   ├── Gauge.jsx      # Semicircular stress gauge
│   │   │   ├── IndicatorCard.jsx  # Individual indicator card
│   │   │   ├── HYChart.jsx    # HY OAS history chart
│   │   │   ├── YieldCurve.jsx # Treasury yield curve
│   │   │   ├── ScoreHistory.jsx   # Composite score over time (from SQLite)
│   │   │   ├── SignalBox.jsx  # Duration signal + regime context
│   │   │   └── ScoreBar.jsx   # Indicator comparison bar chart
│   │   ├── lib/
│   │   │   └── api.js         # Frontend API client
│   │   └── styles/
│   │       └── theme.js       # Design tokens, colors, fonts
│   └── vite.config.js
├── data/
│   └── stress.db              # SQLite database (auto-created)
└── scripts/
    └── backfill.js            # One-time script to backfill historical data
```

---

## Tech Stack

- **Backend:** Node.js + Express
- **Database:** SQLite via `better-sqlite3`
- **Scheduler:** `node-cron`
- **Frontend:** React + Vite + Recharts
- **Styling:** CSS-in-JS (inline styles, no Tailwind needed — dark financial terminal aesthetic)
- **FRED API:** Direct HTTP fetch, no SDK needed

### Dependencies

```json
{
  "dependencies": {
    "express": "^4.18",
    "better-sqlite3": "^11",
    "node-cron": "^3",
    "dotenv": "^16",
    "cors": "^2"
  },
  "devDependencies": {
    "vite": "^5",
    "@vitejs/plugin-react": "^4",
    "react": "^18",
    "react-dom": "^18",
    "recharts": "^2"
  }
}
```

---

## Environment Variables

```env
FRED_API_KEY=<your_fred_api_key>   # Get one free at https://fred.stlouisfed.org/docs/api/api_key.html
PORT=3456
```

---

## FRED Series Configuration

All data comes from the FRED API (Federal Reserve Economic Data). Free API, 1-day lag, daily frequency.

| Indicator Key | FRED Series ID  | Description                        |
|---------------|----------------|------------------------------------|
| HY_OAS        | BAMLH0A0HYM2   | ICE BofA US High Yield OAS          |
| CCC_OAS       | BAMLH0A3HYC    | ICE BofA CCC & Lower OAS            |
| BB_OAS        | BAMLH0A1HYBB   | ICE BofA BB OAS                      |
| VIX           | VIXCLS         | CBOE Volatility Index                |
| CP_3M         | DCPF3M         | 3-Month Financial Commercial Paper   |
| TBILL_3M      | DTB3           | 3-Month Treasury Bill                |
| DGS10         | DGS10          | 10-Year Treasury Yield               |
| DGS20         | DGS20          | 20-Year Treasury Yield               |
| DGS30         | DGS30          | 30-Year Treasury Yield               |
| DGS2          | DGS2           | 2-Year Treasury Yield                |
| DGS5          | DGS5           | 5-Year Treasury Yield                |
| SOFR          | SOFR           | Secured Overnight Financing Rate     |
| FED_FUNDS     | DFF            | Effective Federal Funds Rate         |

### FRED API Pattern

```
GET https://api.stlouisfed.org/fred/series/observations
  ?series_id={SERIES_ID}
  &api_key={FRED_API_KEY}
  &file_type=json
  &sort_order=desc
  &limit={LIMIT}
```

- Response: `{ observations: [{ date: "2026-03-27", value: "448.00" }, ...] }`
- Values of `"."` mean no data for that date — filter these out
- Parse values as floats
- Rate limit: 120 requests per minute (generous, no issue for us)

---

## 7 Indicators — Computation Logic

### 1. HY OAS (weight: 25%)
- **Raw value:** Latest `BAMLH0A0HYM2` observation (in basis points)
- **What it measures:** Broad high-yield credit spread — the single most important stress indicator
- **Interpretation:** 250–350 = calm, 450–550 = elevated, 700+ = crisis

### 2. CCC–BB Dispersion (weight: 15%)
- **Raw value:** `BAMLH0A3HYC` minus `BAMLH0A1HYBB` (in basis points)
- **What it measures:** Quality spread divergence — when CCC spreads widen faster than BB, the market is discriminating aggressively, an early warning of credit stress
- **Interpretation:** 150–250 = calm, 400–600 = stress, 800+ = crisis

### 3. CP–TBill Spread (weight: 15%)
- **Raw value:** `DCPF3M` minus `DTB3` (in percentage points)
- **What it measures:** Commercial paper funding stress — when this blows out, short-term corporate funding markets are freezing
- **Interpretation:** 0.05–0.15 = calm, 0.4–0.7 = stress, 1.2+ = crisis

### 4. VIX (weight: 15%)
- **Raw value:** Latest `VIXCLS` observation
- **What it measures:** S&P 500 implied volatility — equity market fear gauge
- **Interpretation:** 12–17 = calm, 24–32 = elevated, 40+ = crisis

### 5. SOFR–FF Spread (weight: 10%)
- **Raw value:** `abs(SOFR - DFF) * 100` (convert to basis points)
- **What it measures:** Repo market stress — dislocations between SOFR and Fed Funds signal collateral shortages
- **Interpretation:** 0–3 = calm, 8–15 = stress, 25+ = crisis

### 6. Treasury Volatility — MOVE Index Proxy (weight: 10%)
- **Raw value:** 20-day rolling standard deviation of daily 10Y yield changes (in basis points)
- **Computation:**
  1. Take the last 21 observations of `DGS10`
  2. Compute 20 daily changes: `(obs[i] - obs[i+1]) * 100` (convert to bps; data is sorted desc)
  3. Compute standard deviation of these 20 changes
- **What it measures:** Bond market volatility — proxies the ICE BofA MOVE index
- **Interpretation:** 3–5 = calm, 8–12 = elevated, 16+ = crisis

### 7. HY Spread Momentum — CDX Proxy (weight: 10%)
- **Raw value:** 5-day change in HY OAS: `HY_OAS[0] - HY_OAS[5]` (bps, data sorted desc)
- **What it measures:** Rate of change in credit spreads — proxies CDX.NA.HY institutional hedging
- **Interpretation:** Negative = tightening (calm), 0–15 = neutral, 35+ = rapid widening (stress), 60+ = crisis

---

## Scoring System — Piecewise Linear Interpolation

Each indicator is normalized to a 0–100 score using piecewise linear interpolation between threshold pairs `[value, score]`:

```javascript
const THRESHOLDS = {
  hy_oas:      [[250,0],[350,15],[450,35],[550,55],[700,75],[1000,95],[1500,100]],
  ccc_bb:      [[150,0],[250,15],[400,35],[600,55],[800,75],[1200,100]],
  cp_spread:   [[0.05,0],[0.15,10],[0.25,20],[0.4,35],[0.7,55],[1.2,75],[2.0,100]],
  vix:         [[12,0],[17,15],[24,35],[32,55],[40,75],[55,95],[80,100]],
  sofr_ff:     [[0,0],[3,10],[8,30],[15,50],[25,70],[50,95],[100,100]],
  tsy_vol:     [[3,0],[5,15],[8,35],[12,55],[16,75],[22,100]],
  hy_momentum: [[-10,0],[0,5],[15,25],[35,45],[60,65],[100,85],[160,100]],
};
```

**Interpolation function:**
```javascript
function interpolate(value, thresholds) {
  if (value <= thresholds[0][0]) return thresholds[0][1];
  if (value >= thresholds[thresholds.length - 1][0]) return thresholds[thresholds.length - 1][1];
  for (let i = 0; i < thresholds.length - 1; i++) {
    const [v0, s0] = thresholds[i];
    const [v1, s1] = thresholds[i + 1];
    if (value >= v0 && value <= v1) {
      const t = (value - v0) / (v1 - v0);
      return s0 + t * (s1 - s0);
    }
  }
  return 50;
}
```

**Composite score** = weighted sum of all indicator scores using WEIGHTS defined above.

If any indicator is missing (FRED returns no data), reweight the remaining indicators proportionally.

---

## Regime Classification

| Composite Score | Regime    | Color   | Action                              |
|----------------|-----------|---------|-------------------------------------|
| 0–24           | CALM      | #10B981 | Risk-on, short vol                  |
| 25–49          | ELEVATED  | #FBBF24 | Caution, reduce risk                |
| 50–69          | STRESS    | #F97316 | Defensive, raise cash               |
| 70–100         | CRISIS    | #EF4444 | Full defensive, consider duration   |

### Duration Signal
- **Fires when:** Composite score ≥ 65
- **Meaning:** Growth shock is overtaking inflation shock — initiate long-duration Treasury position (20Y+)
- **Historical context:** This level aligns with credit market stress severe enough that demand destruction begins killing the inflation impulse

---

## SQLite Schema

```sql
-- Daily snapshots of all indicators and composite score
CREATE TABLE IF NOT EXISTS daily_snapshots (
  date TEXT PRIMARY KEY,             -- YYYY-MM-DD
  hy_oas REAL,
  ccc_oas REAL,
  bb_oas REAL,
  ccc_bb REAL,                       -- computed: ccc_oas - bb_oas
  vix REAL,
  cp_3m REAL,
  tbill_3m REAL,
  cp_spread REAL,                    -- computed: cp_3m - tbill_3m
  sofr REAL,
  fed_funds REAL,
  sofr_ff REAL,                      -- computed: abs(sofr - ff) * 100
  dgs2 REAL,
  dgs5 REAL,
  dgs10 REAL,
  dgs20 REAL,
  dgs30 REAL,
  tsy_vol REAL,                      -- computed: 20d stdev
  hy_momentum REAL,                  -- computed: 5d change
  -- Scores (0-100)
  score_hy_oas REAL,
  score_ccc_bb REAL,
  score_cp_spread REAL,
  score_vix REAL,
  score_sofr_ff REAL,
  score_tsy_vol REAL,
  score_hy_momentum REAL,
  composite_score REAL,
  regime TEXT,                        -- CALM / ELEVATED / STRESS / CRISIS
  signal_active INTEGER DEFAULT 0,   -- 1 if composite >= 65
  created_at TEXT DEFAULT (datetime('now'))
);

-- Raw FRED observations for historical reference
CREATE TABLE IF NOT EXISTS fred_observations (
  series_id TEXT NOT NULL,
  date TEXT NOT NULL,
  value REAL NOT NULL,
  fetched_at TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (series_id, date)
);
```

---

## Scheduler

Use `node-cron` to auto-fetch during US market hours:

```javascript
// Fetch every 30 minutes, Mon-Fri, 8am-6pm ET
// FRED data updates daily around 8:30am ET, but this catches intraday VIX updates
cron.schedule('*/30 8-18 * * 1-5', fetchAndStore, {
  timezone: "America/New_York"
});
```

On each scheduled run:
1. Fetch all 13 FRED series (latest 120 observations each for history)
2. Upsert raw observations into `fred_observations`
3. Compute all 7 indicators + composite score
4. Insert/update `daily_snapshots` for today's date
5. Log the result to console

---

## API Endpoints

### `GET /api/current`
Returns the latest computed indicators and composite score.

```json
{
  "asOf": "2026-03-30",
  "indicators": {
    "hy_oas": { "value": 448, "score": 34.0, "weight": 0.25 },
    "ccc_bb": { "value": 655, "score": 63.8, "weight": 0.15 },
    "cp_spread": { "value": 0.240, "score": 18.0, "weight": 0.15 },
    "vix": { "value": 29.6, "score": 48.5, "weight": 0.15 },
    "sofr_ff": { "value": 0.0, "score": 0.0, "weight": 0.10 },
    "tsy_vol": { "value": 7.2, "score": 28.3, "weight": 0.10 },
    "hy_momentum": { "value": 28, "score": 37.5, "weight": 0.10 }
  },
  "composite": 33.5,
  "regime": "ELEVATED",
  "signalActive": false,
  "yields": {
    "2y": 3.82, "5y": 3.97, "10y": 4.35, "20y": 4.92, "30y": 4.91
  },
  "context": {
    "fedFunds": "3.50-3.75",
    "sofr": 3.63
  }
}
```

### `GET /api/history?days=90`
Returns daily composite score history for the chart.

```json
{
  "history": [
    { "date": "2026-01-02", "composite": 8.2, "regime": "CALM", "signalActive": false },
    { "date": "2026-01-03", "composite": 8.5, "regime": "CALM", "signalActive": false },
    ...
  ]
}
```

### `GET /api/hy-history?days=90`
Returns HY OAS daily values for the spread chart.

### `GET /api/refresh`
Triggers an immediate data fetch + recompute (manual refresh button).

---

## Frontend Design Specification

### Aesthetic
- **Dark financial terminal** — deep navy/charcoal background (#070b16, #0a0f1e, #0d1424)
- **Monospace data** — JetBrains Mono or IBM Plex Mono for all numbers and data labels
- **Sans-serif headers** — Space Grotesk or system sans-serif for section headers
- **Color-coded stress levels** — green (#10B981), amber (#FBBF24), orange (#F97316), red (#EF4444)
- **Subtle glows and gradients** — not flashy, professional and readable
- **No emojis in the UI** (except ⚡ for the signal indicator)

### Layout (top to bottom)
1. **Header bar** — title, data timestamp, WTI oil price badge
2. **Top row** (3 columns, responsive):
   - Left: Semicircular gauge with composite score + regime label
   - Center: Key levels table (HY OAS, VIX, CCC-BB, yields, curve spreads, SOFR, Fed Funds)
   - Right: Duration signal box (green/red with threshold bar) + regime context paragraph
3. **Indicator cards grid** — 7 cards, each showing: label, description, raw value, score/100, stress bar, FRED series ID, weight
4. **Charts row** (2 columns):
   - Left: HY OAS YTD area chart with 500/700 reference lines
   - Right: Treasury yield curve (3M through 30Y) with 2s10s/10s30s annotations
5. **Composite score history chart** (full width) — area chart from SQLite daily_snapshots, with regime color bands and the 65-threshold reference line. THIS IS THE KEY NEW CHART that the static version couldn't have.
6. **Score comparison bar chart** — horizontal bars for each indicator score with 65-threshold line
7. **Methodology footer** — compact explanation

### Charts
- Use Recharts for all charts
- Dark backgrounds, muted grid lines (#141e33)
- Axis text in monospace, muted color (#3a4d6b)
- Custom dark tooltips matching the theme
- Area charts with subtle gradient fills

---

## Backfill Script

`scripts/backfill.js` should:
1. Fetch the last 252 trading days (~1 year) of data for all series
2. For each trading day, compute indicators and composite score
3. Insert into `daily_snapshots`
4. This populates the composite score history chart immediately

Run once after first setup: `node scripts/backfill.js`

---

## Running the Project

```bash
# Install
npm install

# Set up .env
echo "FRED_API_KEY=<your_fred_api_key>" > .env
echo "PORT=3456" >> .env

# Backfill historical data (one-time, takes ~30 seconds)
node scripts/backfill.js

# Development — runs Express backend + Vite dev server
npm run dev

# Production build
npm run build
npm start
```

### package.json scripts
```json
{
  "scripts": {
    "dev": "concurrently \"node server/index.js\" \"vite --config client/vite.config.js\"",
    "build": "vite build --config client/vite.config.js",
    "start": "NODE_ENV=production node server/index.js",
    "backfill": "node scripts/backfill.js"
  }
}
```

In production, Express serves the built Vite output as static files from `client/dist/`.

In development, Vite runs on port 5173 and proxies API calls to Express on port 3456.

---

## Important Implementation Notes

1. **FRED data has a 1-day lag.** The latest observation is typically from the previous business day. The dashboard should display the observation date, not "today."

2. **Weekend/holiday handling.** FRED returns no data on weekends/holidays. The computation should always use the latest available observation, not assume today has data.

3. **Missing series.** If any FRED series returns no data (happens occasionally), compute the composite from available indicators and reweight proportionally. Flag the missing indicator in the UI.

4. **Treasury vol computation** requires 21 observations of DGS10 to compute the 20-day rolling stdev. During backfill, skip dates where fewer than 21 prior observations exist.

5. **HY momentum** requires 6 observations (current + 5 prior). Same skip logic for backfill.

6. **The composite score ≥65 signal** is the most important output. It should be visually prominent and unmistakable.

7. **Vite proxy config** for development:
```javascript
// client/vite.config.js
export default {
  server: {
    proxy: {
      '/api': 'http://localhost:3456'
    }
  }
}
```

8. **Error handling:** FRED API can occasionally return 500s or rate limit. Implement retry with exponential backoff (max 3 retries, 1s/2s/4s delays).

9. **The `.env` file should be in `.gitignore`** but the FRED API key is not particularly sensitive (it's free and tied to FRED, not a financial account).
