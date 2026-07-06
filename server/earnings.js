// Watchlist earnings dates + estimates via Yahoo quoteSummary(calendarEvents).
// Sequential per-symbol calls (small watchlist), cached 12h, stale-on-error.

import { yahooFinance, withTimeout } from './yahoo.js';
import { GROUPS, EARNINGS_WATCHLIST } from './symbols.js';
import { impliedMove } from './options.js';

const CACHE_TTL_MS = 12 * 60 * 60 * 1000;
const GAP_MS = 200;

const LABELS = new Map(GROUPS.megacaps.map(e => [e.s, e.label]));

const cache = { data: null, fetchedAt: 0, inflight: null };

async function fetchOne(symbol) {
  const r = await withTimeout(
    yahooFinance.quoteSummary(symbol, { modules: ['calendarEvents'] }, { validateResult: false }),
    15000,
    `quoteSummary(${symbol})`
  );
  const e = r?.calendarEvents?.earnings;
  const rawDate = Array.isArray(e?.earningsDate) ? e.earningsDate[0] : e?.earningsDate;
  return {
    symbol,
    label: LABELS.get(symbol) || symbol,
    date: rawDate ? new Date(rawDate).toISOString() : null,
    epsEstimate: typeof e?.earningsAverage === 'number' ? e.earningsAverage : null,
    revenueEstimate: typeof e?.revenueAverage === 'number' ? e.revenueAverage : null,
  };
}

async function fetchAll() {
  const items = [];
  for (const symbol of EARNINGS_WATCHLIST) {
    try {
      items.push(await fetchOne(symbol));
    } catch (err) {
      console.error(`Earnings fetch failed for ${symbol}: ${err.message}`);
    }
    await new Promise(r => setTimeout(r, GAP_MS));
  }
  items.sort((a, b) => {
    if (!a.date && !b.date) return 0;
    if (!a.date) return 1;
    if (!b.date) return -1;
    return new Date(a.date) - new Date(b.date);
  });

  // Implied move (ATM straddle / spot) for reports within 14 days
  const soonest = items.filter(i => {
    if (!i.date) return false;
    const days = (new Date(i.date) - Date.now()) / 86400000;
    return days >= -1 && days <= 14;
  });
  for (const item of soonest) {
    try {
      item.impliedMove = await impliedMove(item.symbol, item.date);
    } catch (err) {
      console.error(`Implied move failed for ${item.symbol}: ${err.message}`);
    }
    await new Promise(r => setTimeout(r, GAP_MS));
  }

  return items;
}

export async function getEarnings() {
  const now = Date.now();
  if (cache.data && now - cache.fetchedAt < CACHE_TTL_MS) {
    return { fetchedAt: new Date(cache.fetchedAt).toISOString(), stale: false, items: cache.data };
  }
  if (cache.inflight) return cache.inflight;

  cache.inflight = (async () => {
    try {
      const items = await fetchAll();
      if (items.length > 0) {
        cache.data = items;
        cache.fetchedAt = Date.now();
        return { fetchedAt: new Date(cache.fetchedAt).toISOString(), stale: false, items };
      }
      return { fetchedAt: null, stale: true, items: cache.data || [] };
    } catch (err) {
      console.error('Earnings fetch failed:', err.message);
      return { fetchedAt: cache.fetchedAt ? new Date(cache.fetchedAt).toISOString() : null, stale: true, items: cache.data || [] };
    } finally {
      cache.inflight = null;
    }
  })();

  return cache.inflight;
}
