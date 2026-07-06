import React from 'react';
import { colors, fonts } from '../styles/theme';
import InfoTooltip from './InfoTooltip';

function fmtNet(v) {
  if (v == null) return '--';
  const abs = Math.abs(v);
  const s = abs >= 1000 ? `${(abs / 1000).toFixed(1)}k` : String(abs);
  return `${v < 0 ? '−' : '+'}${s}`;
}

function pctileColor(p) {
  if (p == null) return colors.text.muted;
  if (p >= 0.9 || p <= 0.1) return colors.regime.ELEVATED; // crowded extreme
  return colors.text.secondary;
}

// CFTC COT: net non-commercial (speculative) futures positioning, weekly.
export default function CotCard({ cot }) {
  const markets = cot?.markets || [];
  if (markets.length === 0) return null;

  return (
    <div style={{ background: colors.bg.card, border: `1px solid ${colors.bg.border}`, borderRadius: 12, padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', fontSize: 13, fontWeight: 600, color: colors.text.secondary, fontFamily: fonts.sans }}>
          SPECULATIVE POSITIONING (COT)
          <InfoTooltip indicatorKey="cot" />
        </span>
        <span style={{ fontSize: 10, color: colors.text.muted, fontFamily: fonts.mono }}>
          report {markets[0]?.reportDate || '--'}
        </span>
      </div>
      <div style={{ fontSize: 10, color: colors.text.muted, fontFamily: fonts.sans, marginBottom: 10 }}>
        Net non-commercial contracts · Δ vs prior week · percentile of the last year (≥90% or ≤10% = crowded)
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, fontFamily: fonts.mono }}>
        <tbody>
          {markets.map(m => (
            <tr key={m.key}>
              <td style={{ color: colors.text.primary, padding: '4px 8px 4px 0' }}>{m.label}</td>
              <td style={{ color: m.net >= 0 ? colors.updown.up : colors.updown.down, padding: '4px 8px', textAlign: 'right' }}>
                {fmtNet(m.net)}
              </td>
              <td style={{ color: m.netChange == null ? colors.text.muted : m.netChange >= 0 ? colors.updown.up : colors.updown.down, padding: '4px 8px', textAlign: 'right' }}>
                {m.netChange != null ? `Δ ${fmtNet(m.netChange)}` : ''}
              </td>
              <td style={{ color: pctileColor(m.pctile1y), padding: '4px 0 4px 8px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                {m.pctile1y != null ? `${Math.round(m.pctile1y * 100)}%ile` : '--'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
