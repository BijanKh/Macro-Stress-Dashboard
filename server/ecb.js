// Euro area AAA government yield curve (≈ Bund curve) from the free ECB Data
// Portal API. Daily data, previous business day.

const TENORS = [
  { key: '2y', series: 'SR_2Y' },
  { key: '5y', series: 'SR_5Y' },
  { key: '10y', series: 'SR_10Y' },
  { key: '20y', series: 'SR_20Y' },
  { key: '30y', series: 'SR_30Y' },
];
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

const cache = { data: null, fetchedAt: 0, inflight: null };

async function fetchTenor(series) {
  const url = `https://data-api.ecb.europa.eu/service/data/YC/B.U2.EUR.4F.G_N_A.SV_C_YM.${series}?format=jsondata&lastNObservations=1`;
  const res = await fetch(url, {
    headers: { 'Accept': 'application/json' },
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const j = await res.json();
  const seriesObj = j?.dataSets?.[0]?.series?.['0:0:0:0:0:0:0'];
  const obs = seriesObj?.observations?.['0'];
  const value = Array.isArray(obs) ? obs[0] : null;
  const dateValues = j?.structure?.dimensions?.observation?.[0]?.values;
  const date = Array.isArray(dateValues) && dateValues[0]?.id ? dateValues[0].id : null;
  return value != null && isFinite(value) ? { value, date } : null;
}

export async function getEcbCurve() {
  const now = Date.now();
  if (cache.data && now - cache.fetchedAt < CACHE_TTL_MS) return cache.data;
  if (cache.inflight) return cache.inflight;

  cache.inflight = (async () => {
    try {
      const yields = {};
      let asOf = null;
      for (const t of TENORS) {
        try {
          const r = await fetchTenor(t.series);
          if (r) { yields[t.key] = r.value; asOf = r.date || asOf; }
        } catch (err) {
          console.error(`ECB tenor ${t.key} failed: ${err.message}`);
        }
        await new Promise(r => setTimeout(r, 200));
      }
      if (Object.keys(yields).length >= 3) {
        cache.data = { asOf, yields };
        cache.fetchedAt = Date.now();
      }
      return cache.data;
    } finally {
      cache.inflight = null;
    }
  })();

  return cache.inflight;
}
