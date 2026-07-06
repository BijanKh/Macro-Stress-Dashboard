import React from 'react';
import { colors, fonts } from '../styles/theme';

function classify(s210) {
  if (s210 == null) return null;
  if (s210 < -10) return {
    name: 'INVERTED', color: colors.regime.CRISIS,
    text: 'Short rates sit above long rates — the market is pricing restrictive policy against a slowing economy. Historically the most reliable recession lead (6–18 months). Classic trades: curve steepeners, quality duration; equities are late-cycle here.',
  };
  if (s210 < 25) return {
    name: 'FLAT', color: colors.regime.STRESS,
    text: 'The curve is compressed — a transition regime. Coming out of an inversion this is where re-steepening begins; watch WHO moves: a falling front end (bull steepening) means cuts are being priced — historically the risk-off phase. A rising long end (bear steepening) means term premium or inflation fear.',
  };
  if (s210 < 100) return {
    name: 'NORMALIZING / MODERATELY STEEP', color: colors.regime.ELEVATED,
    text: 'Positive slope in the normal historical range. Policy is loosening relative to growth expectations, bank net-interest margins improve, carry trades work. Mid-cycle behavior — direction of travel matters more than the level.',
  };
  return {
    name: 'STEEP', color: colors.regime.CALM,
    text: 'A steep curve: aggressive easing is priced in or the long end demands heavy term premium (fiscal supply, inflation risk). Early-cycle risk-on historically — but if 10s30s is also blowing out, it is a bond-supply/fiscal story, not a growth story.',
  };
}

// Rule-based description of the current curve regime. Today's steepening
// direction uses each live instrument's own day change (2YY=F and ^TNX vs
// their OWN previous closes) — never mixing futures levels with FRED spot,
// since the 2Y yield future embeds expected cuts and sits below spot.
export default function CurveRegime({ fredYields, q2, q10 }) {
  const y2 = fredYields?.['2y'];
  const y10 = fredYields?.['10y'];
  const y30 = fredYields?.['30y'];
  const s210 = y10 != null && y2 != null ? (y10 - y2) * 100 : null;
  const s1030 = y30 != null && y10 != null ? (y30 - y10) * 100 : null;
  const regime = classify(s210);
  if (!regime) return null;

  // Today's move in bp per leg, each vs its own prev close
  let todayLine = null;
  const d2 = q2?.price != null && q2?.prevClose != null ? (q2.price - q2.prevClose) * 100 : null;
  const d10 = q10?.price != null && q10?.prevClose != null ? (q10.price - q10.prevClose) * 100 : null;
  if (d2 != null && d10 != null) {
    const delta = d10 - d2; // change in 2s10s today
    if (Math.abs(delta) >= 1) {
      const steepening = delta > 0;
      const frontLed = Math.abs(d2) > Math.abs(d10);
      const led = frontLed ? `front end (2Y ${d2 > 0 ? '+' : ''}${d2.toFixed(0)}bp)` : `long end (10Y ${d10 > 0 ? '+' : ''}${d10.toFixed(0)}bp)`;
      const kind = steepening
        ? (frontLed ? 'bull steepening — cuts being priced' : 'bear steepening — term premium/inflation')
        : (frontLed ? 'bear flattening — higher-for-longer priced' : 'bull flattening — growth fear into duration');
      todayLine = `Today: ${steepening ? 'steepening' : 'flattening'} ${delta > 0 ? '+' : ''}${delta.toFixed(0)}bp, led by the ${led} → ${kind}.`;
    } else {
      todayLine = `Today: curve little changed (2Y ${d2 > 0 ? '+' : ''}${d2.toFixed(0)}bp, 10Y ${d10 > 0 ? '+' : ''}${d10.toFixed(0)}bp).`;
    }
  }

  return (
    <div style={{ background: colors.bg.card, border: `1px solid ${colors.bg.border}`, borderRadius: 12, padding: '20px' }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: colors.text.secondary, fontFamily: fonts.sans, marginBottom: 10 }}>
        CURVE REGIME
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 10, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 16, fontWeight: 700, color: regime.color, fontFamily: fonts.sans }}>
          {regime.name}
        </span>
        <span style={{ fontSize: 11, fontFamily: fonts.mono, color: colors.text.muted }}>
          2s10s {s210 != null ? `${s210 > 0 ? '+' : ''}${s210.toFixed(0)}bp` : '--'}
          {'  ·  '}
          10s30s {s1030 != null ? `${s1030 > 0 ? '+' : ''}${s1030.toFixed(0)}bp` : '--'}
        </span>
      </div>
      <p style={{ fontSize: 12, color: colors.text.secondary, lineHeight: 1.65, margin: 0 }}>
        {regime.text}
      </p>
      {todayLine && (
        <p style={{ fontSize: 11, color: colors.text.primary, fontFamily: fonts.mono, lineHeight: 1.6, margin: '10px 0 0' }}>
          {todayLine}
        </p>
      )}
    </div>
  );
}
