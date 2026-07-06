import React from 'react';
import {
  ScatterChart, Scatter, XAxis, YAxis, ReferenceLine, ReferenceArea,
  Tooltip, ResponsiveContainer, LabelList,
} from 'recharts';
import { colors, fonts } from '../styles/theme';

const QUADRANTS = [
  { name: 'LEADING', test: (p) => p.x >= 100 && p.y >= 100, color: '#10B981' },
  { name: 'WEAKENING', test: (p) => p.x >= 100 && p.y < 100, color: '#FBBF24' },
  { name: 'LAGGING', test: (p) => p.x < 100 && p.y < 100, color: '#EF4444' },
  { name: 'IMPROVING', test: (p) => p.x < 100 && p.y >= 100, color: '#60a5fa' },
];

function quadColor(p) {
  return QUADRANTS.find(q => q.test(p))?.color || colors.text.muted;
}

function RRGTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const p = payload[0]?.payload;
  if (!p?.symbol) return null;
  return (
    <div style={{ background: '#0f1729', border: `1px solid ${colors.bg.border}`, borderRadius: 6, padding: '8px 12px', fontSize: 12, fontFamily: fonts.mono }}>
      <div style={{ color: colors.text.primary, fontWeight: 600 }}>{p.symbol} — {p.label}</div>
      <div style={{ color: colors.text.secondary }}>RS-Ratio {p.x.toFixed(2)} · RS-Momentum {p.y.toFixed(2)}</div>
    </div>
  );
}

// Relative Rotation Graph: sectors vs SPY. X = relative strength (ratio vs
// its 50d mean), Y = momentum of that strength (vs 10 days ago). Tails show
// the last 5 daily positions.
export default function RRGChart({ rrg }) {
  if (!rrg?.length) {
    return (
      <div style={{ background: colors.bg.card, border: `1px solid ${colors.bg.border}`, borderRadius: 12, padding: 20, fontSize: 12, color: colors.text.muted, fontFamily: fonts.mono }}>
        ROTATION MAP — computing (available after the daily history pass, ~15 min after server start).
      </div>
    );
  }

  const heads = rrg.map(s => ({ symbol: s.symbol, label: s.label, x: s.rsRatio, y: s.rsMomentum }));
  const xs = heads.map(p => p.x), ys = heads.map(p => p.y);
  const pad = 0.4;
  const domX = [Math.min(...xs, 99) - pad, Math.max(...xs, 101) + pad];
  const domY = [Math.min(...ys, 99) - pad, Math.max(...ys, 101) + pad];

  return (
    <div style={{ background: colors.bg.card, border: `1px solid ${colors.bg.border}`, borderRadius: 12, padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 6 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: colors.text.secondary, fontFamily: fonts.sans }}>
          SECTOR ROTATION vs SPY (RRG)
        </span>
        <span style={{ fontSize: 10, fontFamily: fonts.mono }}>
          {QUADRANTS.map(q => (
            <span key={q.name} style={{ color: q.color, marginLeft: 12 }}>● {q.name}</span>
          ))}
        </span>
      </div>
      <ResponsiveContainer width="100%" height={420}>
        <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
          <ReferenceArea x1={100} x2={domX[1]} y1={100} y2={domY[1]} fill="rgba(16,185,129,0.05)" />
          <ReferenceArea x1={domX[0]} x2={100} y1={100} y2={domY[1]} fill="rgba(96,165,250,0.05)" />
          <ReferenceArea x1={100} x2={domX[1]} y1={domY[0]} y2={100} fill="rgba(251,191,36,0.05)" />
          <ReferenceArea x1={domX[0]} x2={100} y1={domY[0]} y2={100} fill="rgba(239,68,68,0.05)" />
          <XAxis
            type="number" dataKey="x" domain={domX}
            tick={{ fontSize: 10, fill: colors.chart.axis, fontFamily: fonts.mono }}
            tickFormatter={v => v.toFixed(1)}
            label={{ value: 'RS-Ratio (strength vs SPY)', position: 'insideBottom', offset: -2, fontSize: 10, fill: colors.text.muted }}
          />
          <YAxis
            type="number" dataKey="y" domain={domY} width={46}
            tick={{ fontSize: 10, fill: colors.chart.axis, fontFamily: fonts.mono }}
            tickFormatter={v => v.toFixed(1)}
            label={{ value: 'RS-Momentum', angle: -90, position: 'insideLeft', fontSize: 10, fill: colors.text.muted }}
          />
          <ReferenceLine x={100} stroke={colors.text.muted} strokeDasharray="4 4" />
          <ReferenceLine y={100} stroke={colors.text.muted} strokeDasharray="4 4" />
          <Tooltip content={<RRGTooltip />} cursor={{ strokeDasharray: '3 3' }} />
          {rrg.map(s => (
            <Scatter
              key={`tail-${s.symbol}`}
              data={s.tail.map(t => ({ x: t.x, y: t.y }))}
              line={{ stroke: quadColor({ x: s.rsRatio, y: s.rsMomentum }), strokeWidth: 1, opacity: 0.35 }}
              fill="none"
              shape={() => null}
              isAnimationActive={false}
            />
          ))}
          <Scatter data={heads} isAnimationActive={false} shape={(props) => (
            <circle cx={props.cx} cy={props.cy} r={5} fill={quadColor(props.payload)} stroke={colors.bg.primary} strokeWidth={1.5} />
          )}>
            <LabelList dataKey="symbol" position="top" style={{ fontSize: 9, fill: colors.text.secondary, fontFamily: fonts.mono }} />
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
      <div style={{ fontSize: 10, color: colors.text.muted, fontFamily: fonts.mono, marginTop: 4 }}>
        Clockwise rotation is typical: Improving → Leading → Weakening → Lagging. Tails = last 5 sessions.
      </div>
    </div>
  );
}
