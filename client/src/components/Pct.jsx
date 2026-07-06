import React from 'react';
import { fonts, changeColor } from '../styles/theme';
import { fmtPct } from '../lib/format';

// Signed, color-coded percentage. The +/− sign carries direction so color
// is never the only encoding.
export default function Pct({ value, dec = 2, size = 12 }) {
  return (
    <span style={{ color: changeColor(value), fontFamily: fonts.mono, fontSize: size }}>
      {fmtPct(value, dec)}
    </span>
  );
}
