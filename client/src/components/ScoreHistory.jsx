import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ReferenceArea, ResponsiveContainer } from 'recharts';
import { colors, fonts } from '../styles/theme';
import InfoTooltip from './InfoTooltip';

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const regimeColors = { CALM: '#10B981', ELEVATED: '#FBBF24', STRESS: '#F97316', CRISIS: '#EF4444' };
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
      <div style={{ color: regimeColors[d.regime] || colors.text.primary, fontWeight: 600 }}>
        {d.composite?.toFixed(1)} — {d.regime}
      </div>
      {d.signalActive && (
        <div style={{ color: '#EF4444', fontSize: 10, marginTop: 2 }}>SIGNAL ACTIVE</div>
      )}
    </div>
  );
}

export default function ScoreHistory({ history }) {
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
          COMPOSITE SCORE HISTORY
        </span>
        <InfoTooltip indicatorKey="composite" />
        <span style={{ marginLeft: 'auto', fontSize: 11, color: colors.text.muted, fontFamily: fonts.mono }}>
          {history.length} days
        </span>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={history} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
          <defs>
            <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#60a5fa" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#60a5fa" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={colors.chart.grid} />
          {/* Regime color bands */}
          <ReferenceArea y1={0} y2={25} fill="#10B981" fillOpacity={0.04} />
          <ReferenceArea y1={25} y2={50} fill="#FBBF24" fillOpacity={0.04} />
          <ReferenceArea y1={50} y2={70} fill="#F97316" fillOpacity={0.04} />
          <ReferenceArea y1={70} y2={100} fill="#EF4444" fillOpacity={0.04} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: colors.chart.axis, fontFamily: fonts.mono }}
            tickFormatter={d => d.slice(5)}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fontSize: 10, fill: colors.chart.axis, fontFamily: fonts.mono }}
            domain={[0, 100]}
            width={35}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine y={65} stroke="#EF4444" strokeDasharray="6 3" strokeWidth={1.5} opacity={0.7}
            label={{ value: 'Signal: 65', position: 'right', fill: '#EF4444', fontSize: 10, fontFamily: fonts.mono }}
          />
          <ReferenceLine y={25} stroke="#FBBF24" strokeDasharray="3 3" opacity={0.2} />
          <ReferenceLine y={50} stroke="#F97316" strokeDasharray="3 3" opacity={0.2} />
          <ReferenceLine y={70} stroke="#EF4444" strokeDasharray="3 3" opacity={0.2} />
          <Area type="monotone" dataKey="composite" stroke="#60a5fa" strokeWidth={2} fill="url(#scoreGrad)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
