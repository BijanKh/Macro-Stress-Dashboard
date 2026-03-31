import 'dotenv/config';

const API_KEY = process.env.FRED_API_KEY;
const BASE_URL = 'https://api.stlouisfed.org/fred/series/observations';

if (!API_KEY) {
  console.error('FRED_API_KEY is not set. Add it to your .env file.');
  process.exit(1);
}

const SERIES = {
  HY_OAS:    'BAMLH0A0HYM2',
  CCC_OAS:   'BAMLH0A3HYC',
  BB_OAS:    'BAMLH0A1HYBB',
  VIX:       'VIXCLS',
  CP_3M:     'DCPF3M',
  TBILL_3M:  'DTB3',
  DGS10:     'DGS10',
  DGS20:     'DGS20',
  DGS30:     'DGS30',
  DGS2:      'DGS2',
  DGS5:      'DGS5',
  SOFR:      'SOFR',
  FED_FUNDS: 'DFF',
};

const VALID_SERIES_IDS = new Set(Object.values(SERIES));

async function fetchWithRetry(url, retries = 3) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
      if (res.status >= 400 && res.status < 500) {
        throw new Error(`Client error ${res.status}: ${res.statusText} (not retryable)`);
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      if (err.message.includes('not retryable')) throw err;
      if (attempt === retries - 1) throw err;
      const delay = 1000 * Math.pow(2, attempt) + Math.random() * 500;
      await new Promise(r => setTimeout(r, delay));
    }
  }
}

export async function fetchSeries(seriesId, limit = 120) {
  if (!VALID_SERIES_IDS.has(seriesId)) {
    throw new Error(`Invalid series ID: ${seriesId}`);
  }
  const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 120, 1), 1000);
  const url = `${BASE_URL}?series_id=${encodeURIComponent(seriesId)}&api_key=${encodeURIComponent(API_KEY)}&file_type=json&sort_order=desc&limit=${safeLimit}`;
  const data = await fetchWithRetry(url);

  if (!data || !Array.isArray(data.observations)) {
    throw new Error(`Invalid FRED response for ${seriesId}: missing observations array`);
  }

  return data.observations
    .filter(o => {
      if (!o.date || o.value === '.') return false;
      const v = parseFloat(o.value);
      return !isNaN(v) && isFinite(v);
    })
    .map(o => ({ date: o.date, value: parseFloat(o.value) }));
}

export async function fetchAllSeries(limit = 120) {
  const results = {};
  const entries = Object.entries(SERIES);

  for (let i = 0; i < entries.length; i += 4) {
    const batch = entries.slice(i, i + 4);
    const promises = batch.map(async ([key, seriesId]) => {
      try {
        const obs = await fetchSeries(seriesId, limit);
        return [key, { seriesId, observations: obs }];
      } catch (err) {
        console.error(`Failed to fetch ${key} (${seriesId}):`, err.message);
        return [key, { seriesId, observations: [] }];
      }
    });
    const batchResults = await Promise.all(promises);
    for (const [key, val] of batchResults) {
      results[key] = val;
    }
  }

  return results;
}

export { SERIES };
