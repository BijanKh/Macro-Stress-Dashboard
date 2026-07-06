// Crypto market data via the free CoinGecko API (no key).
// One /global call + one /coins/markets call (top 250) cover everything:
// TOTAL/TOTAL2/TOTAL3 market caps, BTC dominance, top-20 table (incl. /BTC
// ratios), and day winners/losers from the top-250 universe.
// Public rate limit is tight (~5-15 req/min per IP) — cache 120s, poll gently.

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
const GLOBAL_URL = 'https://api.coingecko.com/api/v3/global';
// sparkline=true adds 7d hourly prices per coin — used to derive the WTD
// reference (price at Monday 00:00 UTC) with zero extra API calls.
const MARKETS_URL = 'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=1&price_change_percentage=24h&sparkline=true';
const CACHE_TTL_MS = 120 * 1000;

// Pegged/wrapped assets are noise in winners/losers rankings
const RANKING_EXCLUDES = new Set([
  'usdt', 'usdc', 'dai', 'usde', 'fdusd', 'tusd', 'usds', 'pyusd',
  'wbtc', 'weth', 'steth', 'wsteth', 'reth', 'cbbtc', 'cbeth', 'weeth', 'lbtc',
]);

const cache = { data: null, fetchedAt: 0, inflight: null };

// Prior year-end USD price per coin id, fetched once per coin per year.
const ytdRefs = { year: null, byId: new Map(), missing: new Set(), inflight: false, lastRun: 0 };

// Price at Monday 00:00 UTC from the 7d hourly sparkline (last point ≈ now).
function wtdRefFromSparkline(prices) {
  if (!Array.isArray(prices) || prices.length < 2) return null;
  const now = new Date();
  const mondayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
    - (((now.getUTCDay() + 6) % 7) * 86400000);
  const hoursSinceMonday = Math.floor((now.getTime() - mondayUtc) / 3600000);
  const idx = prices.length - 1 - hoursSinceMonday;
  if (idx < 0 || idx >= prices.length) return null;
  const ref = prices[idx];
  return ref != null && isFinite(ref) && ref > 0 ? ref : null;
}

async function refreshYtdRefs(ids) {
  if (ytdRefs.inflight) return;
  const year = new Date().getUTCFullYear();
  if (ytdRefs.year !== year) {
    ytdRefs.byId.clear();
    ytdRefs.missing.clear();
    ytdRefs.year = year;
  }
  const todo = ids.filter(id => !ytdRefs.byId.has(id) && !ytdRefs.missing.has(id));
  if (todo.length === 0) return;
  // The history endpoint 429s easily on the free tier — run a pass at most
  // every 10 minutes and space calls widely; stragglers fill in over time.
  if (Date.now() - ytdRefs.lastRun < 10 * 60 * 1000) return;
  ytdRefs.lastRun = Date.now();
  ytdRefs.inflight = true;
  try {
    const date = `31-12-${year - 1}`;
    for (const id of todo) {
      try {
        const j = await fetchJson(`https://api.coingecko.com/api/v3/coins/${encodeURIComponent(id)}/history?date=${date}&localization=false`);
        const p = j?.market_data?.current_price?.usd;
        if (p != null && isFinite(p) && p > 0) ytdRefs.byId.set(id, p);
        else ytdRefs.missing.add(id); // listed after year-end — no YTD
      } catch (err) {
        console.error(`Crypto YTD ref failed for ${id}: ${err.message}`);
      }
      await new Promise(r => setTimeout(r, 8000)); // CoinGecko free tier is tight
    }
    cache.fetchedAt = 0; // recompute vs-BTC YTD on next request
    console.log(`Crypto YTD refs: ${ytdRefs.byId.size} loaded`);
  } finally {
    ytdRefs.inflight = false;
  }
}

async function fetchJson(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, 'Accept': 'application/json' },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// Perp funding + open interest from OKX public API (Binance/Bybit geo-block EU).
async function fetchDerivs() {
  const out = {};
  for (const [key, inst] of [['btc', 'BTC-USDT-SWAP'], ['eth', 'ETH-USDT-SWAP']]) {
    try {
      const [fr, oi] = await Promise.all([
        fetchJson(`https://www.okx.com/api/v5/public/funding-rate?instId=${inst}`),
        fetchJson(`https://www.okx.com/api/v5/public/open-interest?instId=${inst}`),
      ]);
      const funding = Number(fr?.data?.[0]?.fundingRate);
      const oiUsd = Number(oi?.data?.[0]?.oiUsd);
      out[key] = {
        funding: isFinite(funding) ? funding : null,          // per 8h, fraction
        fundingAnnual: isFinite(funding) ? funding * 3 * 365 : null,
        oiUsd: isFinite(oiUsd) ? oiUsd : null,
      };
    } catch (err) {
      console.error(`OKX derivs failed for ${key}: ${err.message}`);
      out[key] = null;
    }
  }
  return out;
}

async function fetchCryptoData() {
  const [globalRes, markets, derivatives] = await Promise.all([
    fetchJson(GLOBAL_URL),
    fetchJson(MARKETS_URL),
    fetchDerivs(),
  ]);

  const g = globalRes?.data;
  const total = g?.total_market_cap?.usd ?? null;
  const btcDom = g?.market_cap_percentage?.btc ?? null;
  const ethDom = g?.market_cap_percentage?.eth ?? null;

  const globalOut = {
    total,
    total2: total != null && btcDom != null ? total * (1 - btcDom / 100) : null,
    total3: total != null && btcDom != null && ethDom != null ? total * (1 - (btcDom + ethDom) / 100) : null,
    totalChange24h: g?.market_cap_change_percentage_24h_usd != null
      ? g.market_cap_change_percentage_24h_usd / 100 : null,
    btcDominance: btcDom != null ? btcDom / 100 : null,
    ethDominance: ethDom != null ? ethDom / 100 : null,
  };

  const coins = (Array.isArray(markets) ? markets : [])
    .filter(c => c?.current_price != null && c.market_cap != null)
    .map(c => {
      const wtdRef = wtdRefFromSparkline(c.sparkline_in_7d?.price);
      const ytdRef = ytdRefs.byId.get(c.id);
      return {
        id: c.id,
        symbol: (c.symbol || '').toUpperCase(),
        name: c.name,
        price: c.current_price,
        change24h: c.price_change_percentage_24h != null ? c.price_change_percentage_24h / 100 : null,
        wtdPct: wtdRef ? c.current_price / wtdRef - 1 : null,
        ytdPct: ytdRef ? c.current_price / ytdRef - 1 : null,
        marketCap: c.market_cap,
        rank: c.market_cap_rank,
      };
    });

  const btc = coins.find(c => c.symbol === 'BTC');
  const rel = (a, b) => a != null && b != null ? (1 + a) / (1 + b) - 1 : null;
  const top = coins.slice(0, 20).map(c => ({
    ...c,
    priceBtc: btc?.price ? c.price / btc.price : null,
    changeVsBtc24h: rel(c.change24h, btc?.change24h),
    changeVsBtcWtd: rel(c.wtdPct, btc?.wtdPct),
    changeVsBtcYtd: rel(c.ytdPct, btc?.ytdPct),
  }));

  // Kick the slow year-end reference fill for the current top 20 (no await)
  refreshYtdRefs(top.map(c => c.id)).catch(err => console.error('YTD ref refresh failed:', err.message));

  const rankable = coins.filter(c => c.change24h != null && !RANKING_EXCLUDES.has(c.symbol.toLowerCase()));
  const bySorted = [...rankable].sort((a, b) => b.change24h - a.change24h);
  const winners = bySorted.slice(0, 10);
  const losers = bySorted.slice(-10).reverse();

  return { asOf: new Date().toISOString(), global: globalOut, top, winners, losers, derivatives };
}

export async function getCrypto() {
  const now = Date.now();
  if (cache.data && now - cache.fetchedAt < CACHE_TTL_MS) {
    return { ...cache.data, stale: false };
  }
  if (cache.inflight) return cache.inflight;

  cache.inflight = (async () => {
    try {
      const data = await fetchCryptoData();
      cache.data = data;
      cache.fetchedAt = Date.now();
      return { ...data, stale: false };
    } catch (err) {
      console.error('Crypto fetch failed:', err.message);
      if (cache.data) return { ...cache.data, stale: true };
      throw err;
    } finally {
      cache.inflight = null;
    }
  })();

  return cache.inflight;
}
