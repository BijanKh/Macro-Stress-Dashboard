import React from 'react';
import { colors, fonts, scoreColor } from '../styles/theme';
import InfoTooltip from './InfoTooltip';

const LABELS = {
  hy_oas: { name: 'HY OAS', unit: 'bps' },
  ccc_bb: { name: 'CCC-BB Dispersion', unit: 'bps' },
  cp_spread: { name: 'CP-TBill Spread', unit: '%' },
  vix: { name: 'VIX', unit: '' },
  sofr_ff: { name: 'SOFR-FF Spread', unit: 'bps' },
  tsy_vol: { name: 'Treasury Vol', unit: 'bps/day' },
  hy_momentum: { name: 'HY Momentum', unit: 'bps (5d)' },
};

export default function IndicatorCard({ indicatorKey, data }) {
  if (!data) return null;
  const label = LABELS[indicatorKey] || { name: indicatorKey, unit: '' };
  const score = data.score;
  const color = score != null ? scoreColor(score) : colors.text.muted;
  const barWidth = score != null ? Math.max(2, score) : 0;

  const formatValue = (val) => {
    if (val == null) return '--';
    if (indicatorKey === 'cp_spread') return val.toFixed(3);
    if (indicatorKey === 'tsy_vol') return val.toFixed(2);
    if (indicatorKey === 'sofr_ff') return val.toFixed(1);
    return Math.round(val).toLocaleString();
  };

  return (
    <div style={{
      background: colors.bg.card,
      borderRadius: 10,
      padding: '16px 18px',
      border: `1px solid ${colors.bg.border}`,
      transition: 'border-color 0.2s',
      minWidth: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8, gap: 4 }}>
        <span style={{
          fontSize: 12,
          fontWeight: 600,
          color: colors.text.secondary,
          fontFamily: fonts.sans,
          letterSpacing: 0.5,
          textTransform: 'uppercase',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {label.name}
        </span>
        <InfoTooltip indicatorKey={indicatorKey} />
        <span style={{
          marginLeft: 'auto',
          fontSize: 10,
          color: colors.text.muted,
          fontFamily: fonts.mono,
          flexShrink: 0,
        }}>
          {(data.weight * 100).toFixed(0)}%
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 10 }}>
        <span style={{
          fontSize: 26,
          fontWeight: 700,
          color: colors.text.primary,
          fontFamily: fonts.mono,
          lineHeight: 1,
        }}>
          {formatValue(data.value)}
        </span>
        <span style={{ fontSize: 11, color: colors.text.muted, fontFamily: fonts.mono }}>
          {label.unit}
        </span>
      </div>

      {/* Score bar */}
      <div style={{
        position: 'relative',
        height: 6,
        background: colors.bg.secondary,
        borderRadius: 3,
        overflow: 'hidden',
        marginBottom: 6,
      }}>
        <div style={{
          position: 'absolute',
          left: 0,
          top: 0,
          height: '100%',
          width: `${barWidth}%`,
          background: color,
          borderRadius: 3,
          transition: 'width 0.6s ease-out',
          boxShadow: `0 0 8px ${color}40`,
        }} />
        {/* 65 threshold marker */}
        <div style={{
          position: 'absolute',
          left: '65%',
          top: -1,
          width: 1,
          height: 8,
          background: colors.chart.reference,
          opacity: 0.5,
        }} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{
          fontSize: 13,
          fontWeight: 600,
          fontFamily: fonts.mono,
          color,
        }}>
          {score != null ? score.toFixed(1) : '--'} / 100
        </span>
      </div>
    </div>
  );
}
