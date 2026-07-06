import React from 'react';
import { colors } from '../styles/theme';

// Tiny inline SVG sparkline for tiles/panels. data: [{ date, value }].
export default function Sparkline({ data, width = 84, height = 22, color = colors.text.accent }) {
  const values = (data || []).map(d => d.value).filter(v => v != null && isFinite(v));
  if (values.length < 3) return null;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * (width - 2) + 1;
    const y = height - 2 - ((v - min) / span) * (height - 4);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  return (
    <svg width={width} height={height} style={{ display: 'block', opacity: 0.85 }}>
      <polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}
