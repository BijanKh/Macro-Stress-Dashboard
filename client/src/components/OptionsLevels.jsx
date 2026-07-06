import React from 'react';
import { colors, fonts } from '../styles/theme';

// Nearest-expiry open-interest walls on SPY/QQQ — the strikes option flows
// defend; rough intraday magnet/support/resistance levels.
export default function OptionsLevels({ walls }) {
  if (!walls?.length) return null;

  return (
    <div style={{ background: colors.bg.card, border: `1px solid ${colors.bg.border}`, borderRadius: 12, padding: 16 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: colors.text.secondary, fontFamily: fonts.sans, marginBottom: 2 }}>
        OPTIONS OI LEVELS
      </div>
      <div style={{ fontSize: 10, color: colors.text.muted, fontFamily: fonts.sans, marginBottom: 12 }}>
        Nearest expiry · largest open-interest strikes
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {walls.map(w => (
          <div key={w.symbol}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontFamily: fonts.mono, marginBottom: 3 }}>
              <span style={{ color: colors.text.primary, fontWeight: 600 }}>{w.symbol} <span style={{ color: colors.text.muted, fontWeight: 400 }}>{w.expiry}</span></span>
              <span style={{ color: colors.text.muted }}>P/C OI {w.pcOIRatio != null ? w.pcOIRatio.toFixed(2) : '--'}</span>
            </div>
            <div style={{ display: 'flex', gap: 16, fontSize: 12, fontFamily: fonts.mono }}>
              <span>
                <span style={{ color: colors.updown.down }}>put wall </span>
                <span style={{ color: colors.text.primary }}>{w.maxPutOI?.strike ?? '--'}</span>
              </span>
              <span style={{ color: colors.text.muted }}>spot {w.spot?.toFixed(0)}</span>
              <span>
                <span style={{ color: colors.updown.up }}>call wall </span>
                <span style={{ color: colors.text.primary }}>{w.maxCallOI?.strike ?? '--'}</span>
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
