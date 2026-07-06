import React from 'react';
import { colors, fonts } from '../styles/theme';
import InfoTooltip from './InfoTooltip';
import { BreadthRow } from './BreadthPanel';
import Sparkline from './Sparkline';

// % of S&P 500 index members above their own 20/50/200-day SMA.
export default function SpxBreadthPanel({ spx, history }) {
  if (!spx) return null;
  const count = spx.count || 0;

  return (
    <div style={{ background: colors.bg.card, border: `1px solid ${colors.bg.border}`, borderRadius: 12, padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', fontSize: 13, fontWeight: 600, color: colors.text.secondary, fontFamily: fonts.sans }}>
        S&amp;P 500 BREADTH
        {spx.stale && <span style={{ marginLeft: 8, fontSize: 10, color: colors.regime.ELEVATED, fontFamily: fonts.mono }}>stale</span>}
        <InfoTooltip indicatorKey="spxBreadth" />
      </div>
      <div style={{ fontSize: 10, color: colors.text.muted, fontFamily: fonts.sans, margin: '2px 0 12px' }}>
        % of {count} S&amp;P 500 stocks above their own moving average
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <BreadthRow label="> 20-day avg" pct={spx.pctAbove20} count={count} />
        <BreadthRow label="> 50-day avg" pct={spx.pctAbove50} count={count} />
        <BreadthRow label="> 200-day avg" pct={spx.pctAbove200} count={count} />
      </div>
      {spx.pctAbove20 == null && (
        <div style={{ fontSize: 10, color: colors.text.muted, fontFamily: fonts.mono, marginTop: 8 }}>
          20d loads in background (~10 min after server start)
        </div>
      )}
      {history?.spxAbove50?.length >= 3 && (
        <div style={{ marginTop: 10 }}>
          <div style={{ fontSize: 9, color: colors.text.muted, fontFamily: fonts.sans, marginBottom: 2 }}>%{'>'}50d — 30 days</div>
          <Sparkline data={history.spxAbove50} width={140} />
        </div>
      )}
    </div>
  );
}
