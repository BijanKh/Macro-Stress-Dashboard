import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { colors, fonts } from '../styles/theme';
import InfoTooltip from './InfoTooltip';

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: '#0f1729',
      border: `1px solid ${colors.bg.border}`,
      borderRadius: 6,
      padding: '8px 12px',
      fontSize: 12,
      fontFamily: fonts.mono,
    }}>
      <div style={{ color: colors.text.muted, marginBottom: 4 }}>{label}</div>
      <div style={{ color: colors.text.primary, fontWeight: 600 }}>{payload[0].value?.toFixed(2)}%</div>
    </div>
  );
}

export default function YieldCurve({ yields }) {
  if (!yields) return null;

  const data = [
    { maturity: '2Y', yield: yields['2y'] },
    { maturity: '5Y', yield: yields['5y'] },
    { maturity: '10Y', yield: yields['10y'] },
    { maturity: '20Y', yield: yields['20y'] },
    { maturity: '30Y', yield: yields['30y'] },
  ].filter(d => d.yield != null);

  const spread2s10s = (yields['10y'] != null && yields['2y'] != null)
    ? ((yields['10y'] - yields['2y']) * 100).toFixed(0)
    : null;

  const spread10s30s = (yields['30y'] != null && yields['10y'] != null)
    ? ((yields['30y'] - yields['10y']) * 100).toFixed(0)
    : null;

  return (
    <div style={{
      background: colors.bg.card,
      borderRadius: 12,
      padding: '20px',
      border: `1px solid ${colors.bg.border}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: colors.text.secondary, fontFamily: fonts.sans }}>
          TREASURY YIELD CURVE
        </span>
        <InfoTooltip indicatorKey="yields" />
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 12 }}>
          {spread2s10s != null && (
            <span style={{ fontSize: 11, fontFamily: fonts.mono, color: parseInt(spread2s10s) < 0 ? '#EF4444' : colors.text.muted }}>
              2s10s: {spread2s10s}bp
            </span>
          )}
          {spread10s30s != null && (
            <span style={{ fontSize: 11, fontFamily: fonts.mono, color: parseInt(spread10s30s) < 0 ? '#EF4444' : colors.text.muted }}>
              10s30s: {spread10s30s}bp
            </span>
          )}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={colors.chart.grid} />
          <XAxis
            dataKey="maturity"
            tick={{ fontSize: 11, fill: colors.chart.axis, fontFamily: fonts.mono }}
          />
          <YAxis
            tick={{ fontSize: 10, fill: colors.chart.axis, fontFamily: fonts.mono }}
            domain={['auto', 'auto']}
            width={40}
            tickFormatter={v => v.toFixed(1)}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line type="monotone" dataKey="yield" stroke="#FBBF24" strokeWidth={2.5} dot={{ fill: '#FBBF24', r: 4 }} activeDot={{ r: 6 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
