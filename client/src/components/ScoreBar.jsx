import React from 'react';
import { colors, fonts, scoreColor } from '../styles/theme';
import InfoTooltip from './InfoTooltip';

const LABELS = {
  hy_oas: 'HY OAS',
  ccc_bb: 'CCC-BB',
  cp_spread: 'CP-TBill',
  vix: 'VIX',
  sofr_ff: 'SOFR-FF',
  tsy_vol: 'Tsy Vol',
  hy_momentum: 'HY Mom',
};

export default function ScoreBar({ indicators }) {
  if (!indicators) return null;

  const entries = Object.entries(indicators).filter(([, d]) => d.score != null);

  return (
    <div style={{
      background: colors.bg.card,
      borderRadius: 12,
      padding: '20px',
      border: `1px solid ${colors.bg.border}`,
    }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: colors.text.secondary, fontFamily: fonts.sans, marginBottom: 16 }}>
        INDICATOR SCORES
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {entries.map(([key, data]) => {
          const color = scoreColor(data.score);
          return (
            <div key={key}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, fontFamily: fonts.mono, color: colors.text.secondary, width: 70 }}>
                    {LABELS[key] || key}
                  </span>
                  <InfoTooltip indicatorKey={key} style={{ marginLeft: 4 }} />
                </div>
                <span style={{ fontSize: 12, fontFamily: fonts.mono, color, fontWeight: 600 }}>
                  {data.score.toFixed(1)}
                </span>
              </div>
              <div style={{ position: 'relative', height: 8, background: colors.bg.secondary, borderRadius: 4 }}>
                <div style={{
                  height: '100%',
                  width: `${Math.max(1, data.score)}%`,
                  background: color,
                  borderRadius: 4,
                  transition: 'width 0.6s',
                  boxShadow: `0 0 6px ${color}30`,
                }} />
                <div style={{
                  position: 'absolute',
                  left: '65%', top: -2,
                  width: 1.5, height: 12,
                  background: '#EF4444',
                  borderRadius: 1,
                  opacity: 0.5,
                }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
