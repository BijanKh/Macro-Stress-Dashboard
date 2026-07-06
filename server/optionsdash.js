// Per-ticker options dashboard: IV metrics, price levels, flow and a
// dealer-gamma estimate — all from Yahoo option chains (15-min delayed)
// plus 60d of daily bars for realized vol.
//
// One query = listing + up to MAX_EXPIRIES chains + one history call,
// cached 10 minutes per symbol (small LRU).

import { yahooFinance, withTimeout } from './yahoo.js';
import { saveMetrics, getMetricSeries } from './db.js';

const CACHE_TTL_MS = 10 * 60 * 1000;
const MAX_EXPIRIES = 6;
const MAX_CACHE = 20;
const RISK_FREE = 0.04;

const cache = new Map(); // symbol -> { data, fetchedAt, inflight }

function normPdf(x) {
  return Math.exp(-x * x / 2) / Math.sqrt(2 * Math.PI);
}

function mid(c) {
  if (c?.bid > 0 && c?.ask > 0) return (c.bid + c.ask) / 2;
  return c?.lastPrice > 0 ? c.lastPrice : null;
}

function atmIV(chain, spot) {
  const near = (list) => (list || [])
    .filter(c => c.impliedVolatility > 0.001)
    .sort((a, b) => Math.abs(a.strike - spot) - Math.abs(b.strike - spot))
    .slice(0, 2);
  const ivs = [...near(chain.calls), ...near(chain.puts)].map(c => c.impliedVolatility);
  return ivs.length ? ivs.reduce((a, b) => a + b, 0) / ivs.length : null;
}

function maxPain(chain) {
  const strikes = [...new Set([...(chain.calls || []), ...(chain.puts || [])].map(c => c.strike))].sort((a, b) => a - b);
  let best = null;
  for (const S of strikes) {
    let payout = 0;
    for (const c of chain.calls || []) payout += (c.openInterest || 0) * Math.max(0, S - c.strike);
    for (const p of chain.puts || []) payout += (p.openInterest || 0) * Math.max(0, p.strike - S);
    if (!best || payout < best.payout) best = { strike: S, payout };
  }
  return best?.strike ?? null;
}

function walls(chain) {
  const top = (list) => {
    let best = null;
    for (const c of list || []) {
      if (c?.openInterest > 0 && (!best || c.openInterest > best.openInterest)) best = c;
    }
    return best ? { strike: best.strike, oi: best.openInterest } : null;
  };
  const sumOI = (list) => (list || []).reduce((a, c) => a + (c.openInterest || 0), 0);
  const sumVol = (list) => (list || []).reduce((a, c) => a + (c.volume || 0), 0);
  const callOI = sumOI(chain.calls), putOI = sumOI(chain.puts);
  const callVol = sumVol(chain.calls), putVol = sumVol(chain.puts);
  return {
    callWall: top(chain.calls),
    putWall: top(chain.puts),
    pcOIRatio: callOI > 0 ? putOI / callOI : null,
    pcVolRatio: callVol > 0 ? putVol / callVol : null,
  };
}

function strikeProfile(chain, spot) {
  const byStrike = new Map();
  const add = (list, side) => {
    for (const c of list || []) {
      if (c.strike < spot * 0.8 || c.strike > spot * 1.2) continue;
      const row = byStrike.get(c.strike) || { strike: c.strike, callOI: 0, putOI: 0, callVol: 0, putVol: 0 };
      row[`${side}OI`] += c.openInterest || 0;
      row[`${side}Vol`] += c.volume || 0;
      byStrike.set(c.strike, row);
    }
  };
  add(chain.calls, 'call');
  add(chain.puts, 'put');
  return [...byStrike.values()].sort((a, b) => a.strike - b.strike);
}

// Dealer gamma estimate: BS gamma * OI * 100 * spot^2 * 1%, calls +, puts −
// (standard "dealers long calls / short puts" convention — an ESTIMATE).
function gammaProfile(chains, spot) {
  const byStrike = new Map();
  const now = Date.now();
  for (const chain of chains) {
    const T = Math.max((new Date(chain.expirationDate).getTime() - now) / (365 * 86400000), 1 / 365);
    const add = (list, sign) => {
      for (const c of list || []) {
        const iv = c.impliedVolatility;
        if (!iv || iv < 0.005 || !c.openInterest) continue;
        if (c.strike < spot * 0.75 || c.strike > spot * 1.25) continue;
        const d1 = (Math.log(spot / c.strike) + (RISK_FREE + iv * iv / 2) * T) / (iv * Math.sqrt(T));
        const gamma = normPdf(d1) / (spot * iv * Math.sqrt(T));
        const gex = sign * gamma * c.openInterest * 100 * spot * spot * 0.01;
        byStrike.set(c.strike, (byStrike.get(c.strike) || 0) + gex);
      }
    };
    add(chain.calls, +1);
    add(chain.puts, -1);
  }
  const profile = [...byStrike.entries()].map(([strike, gex]) => ({ strike, gex })).sort((a, b) => a.strike - b.strike);
  const total = profile.reduce((a, p) => a + p.gex, 0);

  // Flip level: zero-crossing of cumulative GEX walking up the strikes
  let flip = null, run = 0;
  for (let i = 0; i < profile.length; i++) {
    const prev = run;
    run += profile[i].gex;
    if (i > 0 && ((prev < 0 && run >= 0) || (prev > 0 && run <= 0))) {
      flip = profile[i].strike;
      break;
    }
  }
  return { profile, totalGex: total, flipLevel: flip };
}

async function fetchRealizedVol(symbol) {
  try {
    const result = await withTimeout(yahooFinance.chart(symbol, {
      period1: new Date(Date.now() - 60 * 86400000), interval: '1d',
    }, { validateResult: false }), 15000, `chart(${symbol})`);
    const closes = (result?.quotes || []).map(q => q.close).filter(c => c != null && isFinite(c));
    if (closes.length < 21) return null;
    const rets = [];
    for (let i = closes.length - 20; i < closes.length; i++) rets.push(Math.log(closes[i] / closes[i - 1]));
    const mean = rets.reduce((a, b) => a + b, 0) / rets.length;
    const variance = rets.reduce((a, r) => a + (r - mean) ** 2, 0) / (rets.length - 1);
    return Math.sqrt(variance * 252);
  } catch {
    return null;
  }
}

async function buildDashboard(symbol) {
  const listing = await withTimeout(
    yahooFinance.options(symbol, {}, { validateResult: false }),
    20000, `options(${symbol})`
  );
  const spot = listing?.quote?.regularMarketPrice;
  const expirations = listing?.expirationDates || [];
  if (!spot || expirations.length === 0) throw new Error('No options listed for this symbol');

  const wanted = expirations.slice(0, MAX_EXPIRIES);
  const chains = [];
  for (const exp of wanted) {
    const first = listing.options?.[0];
    if (first && new Date(first.expirationDate).getTime() === new Date(exp).getTime()) {
      chains.push(first);
    } else {
      try {
        const o = await withTimeout(yahooFinance.options(symbol, { date: exp }, { validateResult: false }), 20000, `options(${symbol},${exp})`);
        if (o?.options?.[0]) chains.push(o.options[0]);
      } catch (err) {
        console.error(`Chain fetch failed ${symbol} ${exp}: ${err.message}`);
      }
      await new Promise(r => setTimeout(r, 200));
    }
  }
  if (chains.length === 0) throw new Error('No chains available');

  const now = Date.now();
  const perExpiry = chains.map(chain => {
    const days = Math.max((new Date(chain.expirationDate).getTime() - now) / 86400000, 0.5);
    const iv = atmIV(chain, spot);
    const w = walls(chain);
    // Expected move from ATM straddle
    const atmCall = (chain.calls || []).reduce((b, c) => !b || Math.abs(c.strike - spot) < Math.abs(b.strike - spot) ? c : b, null);
    const atmPut = atmCall ? (chain.puts || []).find(p => p.strike === atmCall.strike) : null;
    const cm = atmCall ? mid(atmCall) : null, pm = atmPut ? mid(atmPut) : null;
    return {
      expiry: new Date(chain.expirationDate).toISOString().slice(0, 10),
      days: Math.round(days),
      atmIV: iv,
      expectedMovePct: cm != null && pm != null ? (cm + pm) / spot : null,
      maxPain: maxPain(chain),
      ...w,
      strikes: strikeProfile(chain, spot),
    };
  });

  // IV30: interpolate ATM IV around 30 days
  const withIV = perExpiry.filter(e => e.atmIV != null);
  let iv30 = null;
  if (withIV.length) {
    const before = [...withIV].reverse().find(e => e.days <= 30);
    const after = withIV.find(e => e.days >= 30);
    if (before && after && after.days !== before.days) {
      const t = (30 - before.days) / (after.days - before.days);
      iv30 = before.atmIV + t * (after.atmIV - before.atmIV);
    } else {
      iv30 = (after || before || withIV[withIV.length - 1]).atmIV;
    }
  }

  // Skew on the expiry closest to 30d: 95% put IV vs 105% call IV
  const skewChain = chains[perExpiry.indexOf(
    perExpiry.reduce((b, e) => !b || Math.abs(e.days - 30) < Math.abs(b.days - 30) ? e : b, null)
  )] || chains[chains.length - 1];
  const nearestIV = (list, target) => (list || [])
    .filter(c => c.impliedVolatility > 0.005)
    .reduce((b, c) => !b || Math.abs(c.strike - target) < Math.abs(b.strike - target) ? c : b, null)?.impliedVolatility ?? null;
  const putIV = nearestIV(skewChain.puts, spot * 0.95);
  const callIV = nearestIV(skewChain.calls, spot * 1.05);

  // Hedge cost: ~5% OTM put on that same expiry
  const hedgePut = (skewChain.puts || [])
    .filter(p => p.strike <= spot * 0.96)
    .sort((a, b) => b.strike - a.strike)[0];
  const hedgeMid = hedgePut ? mid(hedgePut) : null;

  // Unusual activity across all fetched chains: volume >= 3x OI, volume >= 300
  const unusual = [];
  for (const chain of chains) {
    const exp = new Date(chain.expirationDate).toISOString().slice(0, 10);
    for (const [side, list] of [['C', chain.calls], ['P', chain.puts]]) {
      for (const c of list || []) {
        if ((c.volume || 0) >= 300 && (c.volume || 0) >= 3 * Math.max(c.openInterest || 0, 1)) {
          unusual.push({ side, expiry: exp, strike: c.strike, volume: c.volume, openInterest: c.openInterest || 0, iv: c.impliedVolatility ?? null });
        }
      }
    }
  }
  unusual.sort((a, b) => b.volume - a.volume);

  const rv20 = await fetchRealizedVol(symbol);
  const gamma = gammaProfile(chains, spot);

  // IV history for rank (builds up over time)
  const metricKey = `iv30_${symbol}`;
  if (iv30 != null) {
    saveMetrics(new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(new Date()), { [metricKey]: iv30 });
  }
  const ivSeries = getMetricSeries(metricKey, 252);
  let ivRank = null, ivHigh = null, ivLow = null, pctFromHigh = null, pctFromLow = null;
  if (ivSeries.length > 0 && iv30 != null) {
    const vals = ivSeries.map(r => r.value);
    ivHigh = Math.max(...vals, iv30);
    ivLow = Math.min(...vals, iv30);
    if (ivHigh > 0) pctFromHigh = iv30 / ivHigh - 1;   // ≤ 0: how far below the high
    if (ivLow > 0) pctFromLow = iv30 / ivLow - 1;      // ≥ 0: how far above the low
    if (ivSeries.length >= 10 && ivHigh > ivLow) {
      ivRank = (iv30 - ivLow) / (ivHigh - ivLow);
    }
  }

  return {
    symbol,
    asOf: new Date().toISOString(),
    spot,
    name: listing.quote?.longName || listing.quote?.shortName || symbol,
    iv30,
    ivRank,
    ivRankDays: ivSeries.length,
    ivHigh,
    ivLow,
    pctFromHigh,
    pctFromLow,
    rv20,
    vrp: iv30 != null && rv20 != null ? iv30 - rv20 : null,
    skew: { putIV, callIV, spread: putIV != null && callIV != null ? putIV - callIV : null, expiry: new Date(skewChain.expirationDate).toISOString().slice(0, 10) },
    hedgeCostPct: hedgeMid != null ? hedgeMid / spot : null,
    hedgeStrike: hedgePut?.strike ?? null,
    termStructure: perExpiry.map(e => ({ expiry: e.expiry, days: e.days, atmIV: e.atmIV })),
    expiries: perExpiry,
    unusual: unusual.slice(0, 10),
    gamma,
  };
}

// Drop a symbol's cached dashboard (used after an IV-history import so the
// next query recomputes rank/range against the new history).
export function invalidateSymbol(symbol) {
  cache.delete(String(symbol || '').toUpperCase().trim());
}

export async function getOptionsDashboard(rawSymbol) {
  const symbol = String(rawSymbol || '').toUpperCase().trim();
  if (!/^[A-Z][A-Z0-9.\-]{0,9}$/.test(symbol)) throw new Error('Invalid symbol');

  const entry = cache.get(symbol);
  const now = Date.now();
  if (entry?.data && now - entry.fetchedAt < CACHE_TTL_MS) return entry.data;
  if (entry?.inflight) return entry.inflight;

  const inflight = (async () => {
    try {
      const data = await buildDashboard(symbol);
      if (cache.size >= MAX_CACHE && !cache.has(symbol)) {
        cache.delete(cache.keys().next().value);
      }
      cache.set(symbol, { data, fetchedAt: Date.now(), inflight: null });
      return data;
    } catch (err) {
      if (entry?.data) return entry.data;
      cache.delete(symbol);
      throw err;
    }
  })();

  cache.set(symbol, { ...(entry || { data: null, fetchedAt: 0 }), inflight });
  return inflight;
}
