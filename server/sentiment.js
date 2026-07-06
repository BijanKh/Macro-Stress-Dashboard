// CNN Fear & Greed index — best-effort, unofficial endpoint.
// Any failure returns null; the UI hides the panel section entirely.

const URL = 'https://production.dataviz.cnn.io/index/fearandgreed/graphdata';
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
const CACHE_TTL_MS = 30 * 60 * 1000;

const cache = { data: null, fetchedAt: 0, failedAt: 0 };

export async function getFearGreed() {
  const now = Date.now();
  if (cache.data && now - cache.fetchedAt < CACHE_TTL_MS) return cache.data;
  // Back off 5 minutes after a failure instead of hammering on every poll
  if (now - cache.failedAt < 5 * 60 * 1000) return cache.data;

  try {
    const res = await fetch(URL, {
      headers: { 'User-Agent': UA, 'Accept': 'application/json' },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    const fg = json?.fear_and_greed;
    if (!fg || typeof fg.score !== 'number') throw new Error('Unexpected shape');
    cache.data = {
      score: Math.round(fg.score),
      rating: fg.rating || '',
      previousClose: typeof fg.previous_close === 'number' ? Math.round(fg.previous_close) : null,
      previousWeek: typeof fg.previous_1_week === 'number' ? Math.round(fg.previous_1_week) : null,
    };
    cache.fetchedAt = now;
    return cache.data;
  } catch (err) {
    console.error('Fear & Greed fetch failed:', err.message);
    cache.failedAt = now;
    return cache.data; // possibly stale, possibly null — both fine
  }
}
