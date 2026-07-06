import React from 'react';
import { colors, fonts } from '../styles/theme';

function fmtRevenue(v) {
  if (v == null) return '--';
  if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(0)}M`;
  return `$${Math.round(v).toLocaleString()}`;
}

export function daysUntil(iso) {
  if (!iso) return null;
  const ms = new Date(iso).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0);
  return Math.round(ms / 86400000);
}

// Watchlist earnings: next report date + estimates, this week highlighted.
export default function EarningsPanel({ earnings }) {
  const items = earnings?.items || [];
  if (items.length === 0) return null;

  return (
    <div style={{ background: colors.bg.card, border: `1px solid ${colors.bg.border}`, borderRadius: 12, padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: colors.text.secondary, fontFamily: fonts.sans }}>
          EARNINGS — WATCHLIST
        </div>
        {earnings.stale && (
          <span style={{ fontSize: 11, color: colors.regime.ELEVATED, fontFamily: fonts.mono }}>stale</span>
        )}
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, fontFamily: fonts.mono }}>
        <tbody>
          {items.map(item => {
            const d = daysUntil(item.date);
            const soon = d != null && d >= 0 && d <= 7;
            return (
              <tr key={item.symbol} style={{ borderLeft: soon ? `2px solid ${colors.text.accent}` : '2px solid transparent' }}>
                <td style={{ color: colors.text.primary, fontWeight: 600, padding: '4px 8px', width: 60 }}>{item.symbol}</td>
                <td style={{ color: colors.text.secondary, padding: '4px 8px' }}>{item.label}</td>
                <td style={{ color: soon ? colors.text.accent : colors.text.primary, padding: '4px 8px', whiteSpace: 'nowrap' }}>
                  {item.date ? new Date(item.date).toLocaleDateString([], { month: 'short', day: 'numeric' }) : '--'}
                </td>
                <td style={{ color: soon ? colors.text.accent : colors.text.muted, padding: '4px 8px', whiteSpace: 'nowrap' }}>
                  {d == null ? '' : d === 0 ? 'today' : d > 0 ? `in ${d}d` : `${-d}d ago`}
                </td>
                <td style={{ color: item.impliedMove ? colors.regime.ELEVATED : colors.text.muted, padding: '4px 8px', whiteSpace: 'nowrap', textAlign: 'right' }}>
                  {item.impliedMove?.movePct != null ? `±${(item.impliedMove.movePct * 100).toFixed(1)}% implied` : ''}
                </td>
                <td style={{ color: colors.text.muted, padding: '4px 8px', whiteSpace: 'nowrap', textAlign: 'right' }}>
                  {item.epsEstimate != null ? `EPS est ${item.epsEstimate.toFixed(2)}` : ''}
                </td>
                <td style={{ color: colors.text.muted, padding: '4px 8px', whiteSpace: 'nowrap', textAlign: 'right' }}>
                  {item.revenueEstimate != null ? `rev est ${fmtRevenue(item.revenueEstimate)}` : ''}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
