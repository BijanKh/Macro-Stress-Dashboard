import React from 'react';
import { colors, fonts } from '../styles/theme';

// Euro area AAA government curve (≈ Bund curve) from the ECB, prev business day.
export default function EcbCurveCard({ ecb, usYields }) {
  const y = ecb?.yields;
  if (!y || Object.keys(y).length === 0) return null;

  const spread210 = y['10y'] != null && y['2y'] != null ? ((y['10y'] - y['2y']) * 100).toFixed(0) : null;
  const diff10 = usYields?.['10y'] != null && y['10y'] != null
    ? ((usYields['10y'] - y['10y']) * 100).toFixed(0) : null;

  return (
    <div style={{ background: colors.bg.card, border: `1px solid ${colors.bg.border}`, borderRadius: 12, padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: colors.text.secondary, fontFamily: fonts.sans }}>
          EURO AAA GOV CURVE (≈ BUND)
        </span>
        <span style={{ fontSize: 10, color: colors.text.muted, fontFamily: fonts.mono }}>ECB · {ecb.asOf || 'prev close'}</span>
      </div>
      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', fontSize: 12, fontFamily: fonts.mono }}>
        {['2y', '5y', '10y', '20y', '30y'].map(k => (
          <span key={k}>
            <span style={{ color: colors.text.muted }}>{k.toUpperCase()} </span>
            <span style={{ color: colors.text.primary }}>{y[k] != null ? `${y[k].toFixed(2)}%` : '--'}</span>
          </span>
        ))}
        <span>
          <span style={{ color: colors.text.muted }}>2s10s </span>
          <span style={{ color: colors.text.primary }}>{spread210 != null ? `${spread210} bp` : '--'}</span>
        </span>
        {diff10 != null && (
          <span>
            <span style={{ color: colors.text.muted }}>US−EU 10Y </span>
            <span style={{ color: colors.text.accent }}>{diff10} bp</span>
          </span>
        )}
      </div>
    </div>
  );
}
