import React from 'react';
import { colors, fonts, regimeColor } from '../styles/theme';
import InfoTooltip from './InfoTooltip';

const REGIME_TEXT = {
  CALM: 'Markets are functioning normally. Risk appetite is healthy, credit spreads are tight, and volatility is low. Standard risk-on positioning is appropriate.',
  ELEVATED: 'Caution warranted. Credit spreads are widening and volatility is picking up. Consider reducing risk exposure and raising cash allocations.',
  STRESS: 'Significant financial stress detected. Credit markets are under pressure, funding conditions are tightening. Defensive positioning recommended. Monitor for signal threshold crossing.',
  CRISIS: 'Crisis-level stress across markets. Credit spreads blown out, volatility extreme, funding markets strained. Full defensive posture. If composite >= 65, the duration signal is active.',
};

export default function SignalBox({ composite, regime, signalActive }) {
  const color = regimeColor(regime);

  return (
    <div style={{
      background: colors.bg.card,
      borderRadius: 12,
      padding: '20px',
      border: `1px solid ${signalActive ? '#ef4444' : colors.bg.border}`,
      boxShadow: signalActive ? '0 0 20px rgba(239,68,68,0.15)' : 'none',
      display: 'flex',
      flexDirection: 'column',
      gap: 14,
    }}>
      {/* Signal status */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 10, gap: 4 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: colors.text.secondary, fontFamily: fonts.sans }}>
            DURATION SIGNAL
          </span>
          <InfoTooltip indicatorKey="signal" />
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '12px 14px',
          borderRadius: 8,
          background: signalActive ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.08)',
          border: `1px solid ${signalActive ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.2)'}`,
        }}>
          <div style={{
            width: 10,
            height: 10,
            borderRadius: '50%',
            background: signalActive ? '#EF4444' : '#10B981',
            boxShadow: `0 0 8px ${signalActive ? '#EF444480' : '#10B98180'}`,
            animation: signalActive ? 'pulse 2s infinite' : 'none',
          }} />
          <span style={{
            fontSize: 15,
            fontWeight: 700,
            fontFamily: fonts.mono,
            color: signalActive ? '#EF4444' : '#10B981',
            letterSpacing: 1,
          }}>
            {signalActive ? 'ACTIVE — GO LONG DURATION' : 'INACTIVE'}
          </span>
        </div>
      </div>

      {/* Threshold bar */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, fontFamily: fonts.mono, color: colors.text.muted, marginBottom: 4 }}>
          <span>0</span>
          <span>Threshold: 65</span>
          <span>100</span>
        </div>
        <div style={{ position: 'relative', height: 8, background: colors.bg.secondary, borderRadius: 4 }}>
          <div style={{
            position: 'absolute',
            left: 0, top: 0,
            height: '100%',
            width: `${Math.min(100, composite || 0)}%`,
            borderRadius: 4,
            background: `linear-gradient(90deg, #10B981, #FBBF24 40%, #F97316 65%, #EF4444)`,
            transition: 'width 0.6s',
          }} />
          <div style={{
            position: 'absolute',
            left: '65%', top: -3,
            width: 2, height: 14,
            background: '#EF4444',
            borderRadius: 1,
          }} />
        </div>
      </div>

      {/* Regime context */}
      <div style={{
        fontSize: 12,
        lineHeight: 1.6,
        color: colors.text.secondary,
      }}>
        <span style={{ color, fontWeight: 600 }}>{regime}</span>
        {' — '}
        {REGIME_TEXT[regime] || ''}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
