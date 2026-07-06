import React from 'react';
import { colors, fonts } from '../styles/theme';
import { fmtPct } from '../lib/format';

// Diverging polarity tiles: green–neutral–red around 0, alpha scaled by |pct|
// capped per horizon (±3% daily/weekly, ±20% YTD). Every tile shows its
// signed value, so color is never the only encoding.
function tileBg(pct, cap) {
  if (pct == null || !isFinite(pct)) return colors.bg.card;
  const t = Math.min(Math.abs(pct), cap) / cap;
  const alpha = 0.08 + t * 0.42;
  return pct >= 0
    ? `rgba(16, 185, 129, ${alpha.toFixed(3)})`
    : `rgba(239, 68, 68, ${alpha.toFixed(3)})`;
}

export default function SectorHeatmap({ quotes, mode = 'day', compact = false }) {
  const field = mode === 'wtd' ? 'wtdPct' : mode === 'ytd' ? 'ytdPct' : 'dayPct';
  const cap = mode === 'ytd' ? 0.20 : 0.03;
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: `repeat(auto-fill, minmax(${compact ? 96 : 128}px, 1fr))`,
      gap: 6,
    }}>
      {quotes.map(q => (
        <div key={q.symbol} style={{
          background: tileBg(q[field], cap),
          border: `1px solid ${colors.bg.border}`,
          borderRadius: 8,
          padding: compact ? '8px 10px' : '12px 12px',
          minWidth: 0,
        }}>
          <div style={{ fontSize: compact ? 11 : 12, fontWeight: 600, color: colors.text.primary, fontFamily: fonts.mono }}>
            {q.symbol}
          </div>
          {!compact && (
            <div style={{ fontSize: 10, color: colors.text.secondary, fontFamily: fonts.sans, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {q.label}
            </div>
          )}
          <div style={{ fontSize: compact ? 11 : 13, color: colors.text.primary, fontFamily: fonts.mono, marginTop: 2 }}>
            {fmtPct(q[field])}
          </div>
        </div>
      ))}
    </div>
  );
}
