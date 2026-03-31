import 'dotenv/config';

const API_KEY = process.env.FRED_API_KEY;
const BASE_URL = 'https://api.stlouisfed.org/fred/series/observations';

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

async function fetchWithRetry(url, retries = 3) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      if (attempt === retries - 1) throw err;
      await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)));
    }
  }
}

export async function fetchSeries(seriesId, limit = 120) {
  const url = `${BASE_URL}?series_id=${seriesId}&api_key=${API_KEY}&file_type=json&sort_order=desc&limit=${limit}`;
  const data = await fetchWithRetry(url);
  return (data.observations || [])
    .filter(o => o.value !== '.')
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
