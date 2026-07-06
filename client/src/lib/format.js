// Shared number formatting for quote displays.

export function fmtPrice(v, dec = 2) {
  if (v == null || !isFinite(v)) return '--';
  return v.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

// Compact market-cap / large-dollar formatting: $2.21T, $184.1B, $92M.
export function fmtBig(v) {
  if (v == null || !isFinite(v)) return '--';
  if (v >= 1e12) return `$${(v / 1e12).toFixed(2)}T`;
  if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(0)}M`;
  return `$${Math.round(v).toLocaleString()}`;
}

// pct is a fraction (0.0123 = +1.23%). Sign is always shown so up/down is
// never encoded by color alone.
export function fmtPct(pct, dec = 2) {
  if (pct == null || !isFinite(pct)) return '--';
  const v = pct * 100;
  const sign = v > 0 ? '+' : v < 0 ? '−' : '';
  return `${sign}${Math.abs(v).toFixed(dec)}%`;
}
