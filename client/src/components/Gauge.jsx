import React from 'react';
import { colors, fonts, scoreColor } from '../styles/theme';
import InfoTooltip from './InfoTooltip';

export default function Gauge({ score, regime }) {
  const clampedScore = Math.max(0, Math.min(100, score || 0));
  const color = scoreColor(clampedScore);

  // Semicircle from 180° (left) to 0° (right), center at (150, 140)
  // In SVG: 180° = leftmost, 0° = rightmost
  const cx = 150, cy = 140, r = 100;
  const strokeW = 18;

  // Convert a 0-100 score to angle in radians (180° to 0°, i.e. π to 0)
  const scoreToAngle = (s) => Math.PI - (s / 100) * Math.PI;

  // Convert angle (radians) to SVG point
  const angleToXY = (angle) => ({
    x: cx + r * Math.cos(angle),
    y: cy - r * Math.sin(angle),  // SVG y is inverted
  });

  // Create arc path between two scores (0-100)
  const arcBetween = (s1, s2) => {
    const a1 = scoreToAngle(s1);
    const a2 = scoreToAngle(s2);
    const p1 = angleToXY(a1);
    const p2 = angleToXY(a2);
    const sweep = (s2 - s1) > 50 ? 1 : 0;
    return `M ${p1.x} ${p1.y} A ${r} ${r} 0 ${sweep} 1 ${p2.x} ${p2.y}`;
  };

  // Needle
  const needleAngle = scoreToAngle(clampedScore);
  const needleLen = 78;
  const needleTip = {
    x: cx + needleLen * Math.cos(needleAngle),
    y: cy - needleLen * Math.sin(needleAngle),
  };

  // 65 threshold tick
  const threshAngle = scoreToAngle(65);
  const tickInner = { x: cx + 85 * Math.cos(threshAngle), y: cy - 85 * Math.sin(threshAngle) };
  const tickOuter = { x: cx + 115 * Math.cos(threshAngle), y: cy - 115 * Math.sin(threshAngle) };

  return (
    <div style={{
      background: colors.bg.card,
      borderRadius: 12,
      padding: '24px 20px 16px',
      border: `1px solid ${colors.bg.border}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: colors.text.secondary, fontFamily: fonts.sans }}>
          COMPOSITE STRESS
        </span>
        <InfoTooltip indicatorKey="composite" />
      </div>
      <svg viewBox="0 0 300 170" style={{ width: '100%', maxWidth: 320, display: 'block', margin: '0 auto' }}>
        {/* Background track */}
        <path d={arcBetween(0, 100)} fill="none" stroke={colors.bg.border} strokeWidth={strokeW} strokeLinecap="round" />

        {/* Regime color segments (dim background bands) */}
        <path d={arcBetween(0, 24)} fill="none" stroke={colors.regime.CALM} strokeWidth={strokeW} opacity={0.15} />
        <path d={arcBetween(25, 49)} fill="none" stroke={colors.regime.ELEVATED} strokeWidth={strokeW} opacity={0.15} />
        <path d={arcBetween(50, 69)} fill="none" stroke={colors.regime.STRESS} strokeWidth={strokeW} opacity={0.15} />
        <path d={arcBetween(70, 100)} fill="none" stroke={colors.regime.CRISIS} strokeWidth={strokeW} opacity={0.15} />

        {/* Active fill — only up to the current score */}
        {clampedScore > 0.5 && (
          <path
            d={arcBetween(0, clampedScore)}
            fill="none"
            stroke={color}
            strokeWidth={strokeW}
            strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 6px ${color}50)` }}
          />
        )}

        {/* 65 threshold tick mark */}
        <line
          x1={tickInner.x} y1={tickInner.y}
          x2={tickOuter.x} y2={tickOuter.y}
          stroke="#ef4444" strokeWidth={2} strokeDasharray="3,2" opacity={0.6}
        />

        {/* Needle */}
        <line x1={cx} y1={cy} x2={needleTip.x} y2={needleTip.y} stroke={color} strokeWidth={2.5} strokeLinecap="round" />
        <circle cx={cx} cy={cy} r={5} fill={color} />
        <circle cx={cx} cy={cy} r={2} fill={colors.bg.card} />

        {/* Score text */}
        <text x={cx} y={cy - 18} textAnchor="middle" fill={color} fontSize={38} fontFamily={fonts.mono} fontWeight={700}>
          {score != null ? clampedScore.toFixed(1) : '--'}
        </text>
        <text x={cx} y={cy + 2} textAnchor="middle" fill={colors.text.muted} fontSize={11} fontFamily={fonts.mono}>
          / 100
        </text>

        {/* Scale labels */}
        <text x={cx - r - 5} y={cy + 16} textAnchor="middle" fill={colors.text.muted} fontSize={9} fontFamily={fonts.mono}>0</text>
        <text x={cx + r + 5} y={cy + 16} textAnchor="middle" fill={colors.text.muted} fontSize={9} fontFamily={fonts.mono}>100</text>
        <text x={cx} y={cy - r - 8} textAnchor="middle" fill={colors.text.muted} fontSize={9} fontFamily={fonts.mono}>50</text>
      </svg>
      <div style={{
        textAlign: 'center',
        marginTop: 2,
        fontSize: 14,
        fontWeight: 700,
        fontFamily: fonts.mono,
        color,
        letterSpacing: 2,
        textTransform: 'uppercase',
      }}>
        {regime || '--'}
      </div>
    </div>
  );
}
