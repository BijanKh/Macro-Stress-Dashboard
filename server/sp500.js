// S&P 500 market breadth: % of index members above their 20/50/200-day SMA.
//
// Cost model (the whole point of this design):
// - Constituents: Wikipedia scrape, cached 7 days in memory + on disk.
// - 50d/200d: Yahoo's batched quote() already returns fiftyDayAverage /
//   twoHundredDayAverage per symbol — ~4 chunked requests per refresh,
//   cached 15 min. No history downloads.
// - 20d: not in quote(); computed from a once-per-day sequential chart()
//   pass over all members (gentle 400ms gaps). Null until the first pass
//   completes (~10 min after first request).

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { yahooFinance, withTimeout, localDateParts, sameDate } from './yahoo.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DISK_CACHE = path.join(__dirname, '..', 'data', 'sp500.json');

const WIKI_URL = 'https://en.wikipedia.org/wiki/List_of_S%26P_500_companies';
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

const LIST_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const BREADTH_TTL_MS = 15 * 60 * 1000;
const SMA20_TTL_MS = 24 * 60 * 60 * 1000;
const QUOTE_CHUNK = 150;
const SMA_GAP_MS = 400;

// ---------- constituents ----------

const constituents = { symbols: null, fetchedAt: 0 };

async function fetchConstituentsFromWiki() {
  const res = await fetch(WIKI_URL, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`Wikipedia HTTP ${res.status}`);
  const html = await res.text();
  const found = new Set();
  for (const m of html.matchAll(/href="https:\/\/www\.nyse\.com\/quote\/XNYS:([A-Z.]+)/g)) {
    found.add(m[1]);
  }
  for (const m of html.matchAll(/href="https:\/\/www\.nasdaq\.com\/market-activity\/stocks\/([a-z.-]+)/g)) {
    found.add(m[1].toUpperCase());
  }
  // Yahoo uses dashes for share classes (BRK.B -> BRK-B)
  const symbols = [...found].map(s => s.replace(/\./g, '-')).sort();
  if (symbols.length < 400) throw new Error(`Only ${symbols.length} constituents parsed`);
  return symbols;
}

async function getConstituents() {
  if (constituents.symbols && Date.now() - constituents.fetchedAt < LIST_TTL_MS) {
    return constituents.symbols;
  }
  try {
    const symbols = await fetchConstituentsFromWiki();
    constituents.symbols = symbols;
    constituents.fetchedAt = Date.now();
    try { fs.writeFileSync(DISK_CACHE, JSON.stringify({ fetchedAt: constituents.fetchedAt, symbols })); } catch {}
    console.log(`S&P 500 constituents: ${symbols.length} from Wikipedia`);
    return symbols;
  } catch (err) {
    console.error('S&P 500 constituent fetch failed:', err.message);
    if (constituents.symbols) return constituents.symbols;
    try {
      const disk = JSON.parse(fs.readFileSync(DISK_CACHE, 'utf8'));
      if (Array.isArray(disk.symbols) && disk.symbols.length >= 400) {
        constituents.symbols = disk.symbols;
        constituents.fetchedAt = disk.fetchedAt || 0;
        console.log(`S&P 500 constituents: ${disk.symbols.length} from disk cache`);
        return disk.symbols;
      }
    } catch {}
    return null;
  }
}

// The Trending scanner (server/trending.js) reuses the constituent list
export { getConstituents as getSp500Symbols };

// ---------- 20-day SMA store (once-a-day slow pass) ----------

const sma20Store = { bySymbol: new Map(), fetchedAt: 0, inflight: false };

async function fetchSma20(symbol) {
  const result = await withTimeout(yahooFinance.chart(symbol, {
    period1: new Date(Date.now() - 60 * 86400000),
    interval: '1d',
  }, { validateResult: false }), 15000, `chart(${symbol})`);
  const tz = result?.meta?.exchangeTimezoneName;
  const bars = (result?.quotes || []).filter(q => q.close != null && isFinite(q.close));
  if (bars.length === 0) return null;
  const today = localDateParts(new Date(), tz);
  const completed = sameDate(localDateParts(bars[bars.length - 1].date, tz), today)
    ? bars.slice(0, -1) : bars;
  if (completed.length < 20) return null;
  const closes = completed.slice(-20).map(b => b.close);
  return closes.reduce((a, b) => a + b, 0) / 20;
}

async function refreshSma20(symbols) {
  if (sma20Store.inflight) return;
  sma20Store.inflight = true;
  console.log(`Refreshing S&P 500 20d SMAs for ${symbols.length} members...`);
  try {
    let done = 0, ok = 0;
    for (const s of symbols) {
      try {
        const v = await fetchSma20(s);
        if (v != null) { sma20Store.bySymbol.set(s, v); ok++; }
      } catch {}
      done++;
      if (done % 100 === 0) console.log(`S&P 20d SMAs: ${done}/${symbols.length}`);
      await new Promise(r => setTimeout(r, SMA_GAP_MS));
    }
    sma20Store.fetchedAt = Date.now();
    breadthCache.fetchedAt = 0; // recompute pctAbove20 on next request
    console.log(`S&P 500 20d SMAs loaded: ${ok}/${symbols.length}`);
  } finally {
    sma20Store.inflight = false;
  }
}

function ensureSma20(symbols) {
  if (Date.now() - sma20Store.fetchedAt > SMA20_TTL_MS && !sma20Store.inflight) {
    refreshSma20(symbols).catch(err => console.error('S&P 20d SMA refresh failed:', err.message));
  }
}

// ---------- breadth ----------

const breadthCache = { data: null, fetchedAt: 0, inflight: null };

async function computeBreadth() {
  const symbols = await getConstituents();
  if (!symbols) return null;
  ensureSma20(symbols);

  const counters = {
    20: { above: 0, total: 0 },
    50: { above: 0, total: 0 },
    200: { above: 0, total: 0 },
  };
  let quoted = 0;

  for (let i = 0; i < symbols.length; i += QUOTE_CHUNK) {
    const chunk = symbols.slice(i, i + QUOTE_CHUNK);
    let results;
    try {
      results = await withTimeout(
        yahooFinance.quote(chunk, {}, { validateResult: false }),
        30000, `quote(chunk ${i / QUOTE_CHUNK})`
      );
    } catch (err) {
      console.error(`S&P breadth quote chunk failed: ${err.message}`);
      continue;
    }
    for (const r of results || []) {
      const price = r?.regularMarketPrice;
      if (price == null) continue;
      quoted++;
      if (r.fiftyDayAverage != null) {
        counters[50].total++;
        if (price > r.fiftyDayAverage) counters[50].above++;
      }
      if (r.twoHundredDayAverage != null) {
        counters[200].total++;
        if (price > r.twoHundredDayAverage) counters[200].above++;
      }
      const s20 = sma20Store.bySymbol.get(r.symbol);
      if (s20 != null) {
        counters[20].total++;
        if (price > s20) counters[20].above++;
      }
    }
  }

  if (quoted < 300) return null; // too few quotes to trust the reading

  const pct = (c) => c.total >= 300 ? c.above / c.total : null;
  return {
    pctAbove20: pct(counters[20]),
    pctAbove50: pct(counters[50]),
    pctAbove200: pct(counters[200]),
    count: quoted,
    asOf: new Date().toISOString(),
  };
}

export async function getSpxBreadth() {
  const now = Date.now();
  if (breadthCache.data && now - breadthCache.fetchedAt < BREADTH_TTL_MS) {
    return { ...breadthCache.data, stale: false };
  }
  if (breadthCache.inflight) return breadthCache.inflight;

  breadthCache.inflight = (async () => {
    try {
      const data = await computeBreadth();
      if (data) {
        breadthCache.data = data;
        breadthCache.fetchedAt = Date.now();
        return { ...data, stale: false };
      }
      return breadthCache.data ? { ...breadthCache.data, stale: true } : null;
    } catch (err) {
      console.error('S&P breadth failed:', err.message);
      return breadthCache.data ? { ...breadthCache.data, stale: true } : null;
    } finally {
      breadthCache.inflight = null;
    }
  })();

  return breadthCache.inflight;
}
