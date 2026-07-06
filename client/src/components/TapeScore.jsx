import React from 'react';
import { colors, fonts } from '../styles/theme';
import InfoTooltip from './InfoTooltip';

function tapeColor(score) {
  if (score == null) return colors.text.muted;
  if (score >= 70) return colors.regime.CALM;
  if (score >= 45) return colors.regime.ELEVATED;
  if (score >= 25) return colors.regime.STRESS;
  return colors.regime.CRISIS;
}

// The godmode number: composite risk-on/off score with component breakdown.
export default function TapeScore({ tape }) {
  if (!tape) return null;
  const color = tapeColor(tape.score);

  return (
    <div style={{
      background: colors.bg.card,
      border: `1px solid ${colors.bg.border}`,
      borderLeft: `3px solid ${color}`,
      borderRadius: 12,
      padding: '14px 18px',
      display: 'flex',
      alignItems: 'center',
      gap: 20,
      flexWrap: 'wrap',
    }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', fontSize: 10, color: colors.text.muted, fontFamily: fonts.sans, letterSpacing: 1 }}>
          TAPE SCORE
          <InfoTooltip indicatorKey="tape" style={{ width: 14, height: 14, fontSize: 9 }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <span style={{ fontSize: 30, fontWeight: 700, color, fontFamily: fonts.mono }}>{tape.score}</span>
          <span style={{ fontSize: 13, fontWeight: 700, color, fontFamily: fonts.sans }}>{tape.label}</span>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginLeft: 'auto' }}>
        {tape.components.map(c => (
          <div key={c.key} style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 9, color: colors.text.muted, fontFamily: fonts.sans, whiteSpace: 'nowrap' }}>{c.label}</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: tapeColor(c.score), fontFamily: fonts.mono }}>
              {c.score != null ? c.score : '--'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
