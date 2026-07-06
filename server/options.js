// Options intel from Yahoo chains: SPY/QQQ open-interest walls + P/C ratio,
// and implied earnings moves (ATM straddle / spot) for the watchlist.

import { yahooFinance, withTimeout } from './yahoo.js';

const WALLS_TTL_MS = 60 * 60 * 1000;
const wallsCache = { data: null, fetchedAt: 0, inflight: null };

function mid(c) {
  if (c?.bid > 0 && c?.ask > 0) return (c.bid + c.ask) / 2;
  return c?.lastPrice > 0 ? c.lastPrice : null;
}

async function fetchChain(symbol, date) {
  const opts = date ? { date } : {};
  return withTimeout(
    yahooFinance.options(symbol, opts, { validateResult: false }),
    20000, `options(${symbol})`
  );
}

function maxOIStrike(contracts) {
  let best = null;
  for (const c of contracts || []) {
    if (c?.openInterest > 0 && (!best || c.openInterest > best.openInterest)) best = c;
  }
  return best ? { strike: best.strike, oi: best.openInterest } : null;
}

async function computeWalls(symbol) {
  const o = await fetchChain(symbol);
  const spot = o?.quote?.regularMarketPrice;
  const chain = o?.options?.[0];
  if (!spot || !chain) return null;
  const callOI = (chain.calls || []).reduce((a, c) => a + (c.openInterest || 0), 0);
  const putOI = (chain.puts || []).reduce((a, c) => a + (c.openInterest || 0), 0);
  return {
    symbol,
    spot,
    expiry: chain.expirationDate ? new Date(chain.expirationDate).toISOString().slice(0, 10) : null,
    maxCallOI: maxOIStrike(chain.calls),
    maxPutOI: maxOIStrike(chain.puts),
    pcOIRatio: callOI > 0 ? putOI / callOI : null,
  };
}

export async function getOIWalls() {
  const now = Date.now();
  if (wallsCache.data && now - wallsCache.fetchedAt < WALLS_TTL_MS) return wallsCache.data;
  if (wallsCache.inflight) return wallsCache.inflight;

  wallsCache.inflight = (async () => {
    try {
      const out = [];
      for (const s of ['SPY', 'QQQ']) {
        try {
          const w = await computeWalls(s);
          if (w) out.push(w);
        } catch (err) {
          console.error(`OI walls failed for ${s}: ${err.message}`);
        }
      }
      if (out.length) {
        wallsCache.data = out;
        wallsCache.fetchedAt = Date.now();
      }
      return wallsCache.data;
    } finally {
      wallsCache.inflight = null;
    }
  })();

  return wallsCache.inflight;
}

// Implied move for one symbol around its earnings date: pick the first expiry
// on/after the report, price the ATM straddle, divide by spot.
export async function impliedMove(symbol, earningsDateIso) {
  const listing = await fetchChain(symbol);
  const spot = listing?.quote?.regularMarketPrice;
  const expirations = listing?.expirationDates || [];
  if (!spot || !expirations.length) return null;

  const target = new Date(earningsDateIso).getTime();
  const expiry = expirations.find(d => new Date(d).getTime() >= target);
  if (!expiry) return null;

  let chain = listing.options?.[0];
  if (!chain || new Date(chain.expirationDate).getTime() !== new Date(expiry).getTime()) {
    chain = (await fetchChain(symbol, expiry))?.options?.[0];
  }
  if (!chain) return null;

  const atmCall = (chain.calls || []).reduce((b, c) =>
    !b || Math.abs(c.strike - spot) < Math.abs(b.strike - spot) ? c : b, null);
  if (!atmCall) return null;
  const atmPut = (chain.puts || []).find(p => p.strike === atmCall.strike);
  const cm = mid(atmCall), pm = atmPut ? mid(atmPut) : null;
  if (cm == null || pm == null) return null;

  return {
    movePct: (cm + pm) / spot,
    strike: atmCall.strike,
    expiry: new Date(chain.expirationDate).toISOString().slice(0, 10),
  };
}
