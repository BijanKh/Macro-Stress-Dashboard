import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts';
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
      <div style={{ color: colors.text.primary, fontWeight: 600 }}>{payload[0].value} bps</div>
    </div>
  );
}

export default function HYChart({ history }) {
  if (!history || history.length === 0) return null;

  return (
    <div style={{
      background: colors.bg.card,
      borderRadius: 12,
      padding: '20px',
      border: `1px solid ${colors.bg.border}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: colors.text.secondary, fontFamily: fonts.sans }}>
          HY OAS SPREAD
        </span>
        <InfoTooltip indicatorKey="hy_oas" />
        <span style={{ marginLeft: 'auto', fontSize: 11, color: colors.text.muted, fontFamily: fonts.mono }}>
          YTD
        </span>
      </div>
      <ResponsiveContainer width="100%" height={240}>
        <AreaChart data={history} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
          <defs>
            <linearGradient id="hyGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#60a5fa" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#60a5fa" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={colors.chart.grid} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: colors.chart.axis, fontFamily: fonts.mono }}
            tickFormatter={d => d.slice(5)}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fontSize: 10, fill: colors.chart.axis, fontFamily: fonts.mono }}
            domain={['auto', 'auto']}
            width={45}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine y={500} stroke="#F97316" strokeDasharray="4 4" opacity={0.5} label={{ value: '500', position: 'right', fill: '#F97316', fontSize: 10, fontFamily: fonts.mono }} />
          <ReferenceLine y={700} stroke="#EF4444" strokeDasharray="4 4" opacity={0.5} label={{ value: '700', position: 'right', fill: '#EF4444', fontSize: 10, fontFamily: fonts.mono }} />
          <Area type="monotone" dataKey="value" stroke="#60a5fa" strokeWidth={2} fill="url(#hyGrad)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
