// CFTC Commitments of Traders (legacy futures-only) via the free Socrata API.
// Weekly data; net non-commercial (speculative) positioning + 1y percentile.

const BASE = 'https://publicreporting.cftc.gov/resource/6dca-aqww.json';
const CACHE_TTL_MS = 12 * 60 * 60 * 1000;

const MARKETS = [
  { key: 'es', label: 'S&P 500 E-mini', match: "E-MINI S&P 500 -%" },
  { key: 'nq', label: 'Nasdaq 100 E-mini', match: "NASDAQ MINI -%" },
  { key: 'ty', label: '10Y T-Note', match: "UST 10Y NOTE -%" },
  { key: 'gc', label: 'Gold', match: "GOLD - COMMODITY EXCHANGE%" },
  { key: 'cl', label: 'WTI Crude', match: "CRUDE OIL, LIGHT SWEET%" },
  { key: 'eur', label: 'Euro FX', match: "EURO FX - CHICAGO%" },
  { key: 'jpy', label: 'Japanese Yen', match: "JAPANESE YEN - CHICAGO%" },
  { key: 'vix', label: 'VIX Futures', match: "VIX FUTURES -%" },
  { key: 'btc', label: 'Bitcoin', match: "BITCOIN - CHICAGO MERCANTILE%" },
];

const cache = { data: null, fetchedAt: 0, inflight: null };

async function fetchMarket(m) {
  const where = encodeURIComponent(`upper(market_and_exchange_names) like '${m.match}'`);
  const select = encodeURIComponent('report_date_as_yyyy_mm_dd,noncomm_positions_long_all,noncomm_positions_short_all,open_interest_all,market_and_exchange_names');
  const url = `${BASE}?$select=${select}&$where=${where}&$order=report_date_as_yyyy_mm_dd DESC&$limit=54`;
  const res = await fetch(url.replace(/ /g, '%20'), { signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const rows = await res.json();
  if (!Array.isArray(rows) || rows.length === 0) return null;

  const nets = rows.map(r => Number(r.noncomm_positions_long_all) - Number(r.noncomm_positions_short_all));
  const net = nets[0];
  const netPrev = nets.length > 1 ? nets[1] : null;
  const below = nets.filter(v => v <= net).length;
  return {
    key: m.key,
    label: m.label,
    reportDate: String(rows[0].report_date_as_yyyy_mm_dd).slice(0, 10),
    net,
    netChange: netPrev != null ? net - netPrev : null,
    openInterest: Number(rows[0].open_interest_all) || null,
    pctile1y: nets.length >= 20 ? below / nets.length : null,
  };
}

export async function getCot() {
  const now = Date.now();
  if (cache.data && now - cache.fetchedAt < CACHE_TTL_MS) {
    return { fetchedAt: new Date(cache.fetchedAt).toISOString(), stale: false, markets: cache.data };
  }
  if (cache.inflight) return cache.inflight;

  cache.inflight = (async () => {
    try {
      const out = [];
      for (const m of MARKETS) {
        try {
          const r = await fetchMarket(m);
          if (r) out.push(r);
        } catch (err) {
          console.error(`COT fetch failed for ${m.key}: ${err.message}`);
        }
        await new Promise(r => setTimeout(r, 300));
      }
      if (out.length) {
        cache.data = out;
        cache.fetchedAt = Date.now();
        return { fetchedAt: new Date(cache.fetchedAt).toISOString(), stale: false, markets: out };
      }
      return { fetchedAt: null, stale: true, markets: cache.data || [] };
    } finally {
      cache.inflight = null;
    }
  })();

  return cache.inflight;
}
