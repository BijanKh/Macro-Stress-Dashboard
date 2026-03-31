import React, { useState, useRef, useEffect } from 'react';
import { colors, fonts } from '../styles/theme';

const INDICATOR_INFO = {
  hy_oas: {
    name: 'HY OAS',
    short: 'High Yield Credit Spread',
    description: 'The Option-Adjusted Spread (OAS) of the ICE BofA US High Yield Index measures the extra yield investors demand to hold risky corporate bonds instead of safe Treasuries. It is the single most important indicator of credit market stress.',
    interpretation: 'When this spread is low (250-350 bps), investors are comfortable taking risk. When it widens above 450 bps, the market is getting nervous. Above 700 bps signals crisis-level fear that companies may default on their debt.',
    source: 'FRED: BAMLH0A0HYM2',
    weight: '25%',
  },
  ccc_bb: {
    name: 'CCC-BB Dispersion',
    short: 'Quality Spread Divergence',
    description: 'The difference between CCC-rated (junkiest) and BB-rated (highest junk) bond spreads. When the weakest companies see their borrowing costs rise much faster than stronger junk-rated companies, it signals the market is aggressively sorting winners from losers.',
    interpretation: 'A narrow gap (150-250 bps) means the market treats all junk bonds similarly (calm). When it widens to 400-600 bps, credit stress is building. Above 800 bps, investors are panic-selling the weakest credits.',
    source: 'FRED: BAMLH0A3HYC - BAMLH0A1HYBB',
    weight: '15%',
  },
  cp_spread: {
    name: 'CP-TBill Spread',
    short: 'Funding Stress',
    description: 'The difference between 3-month commercial paper rates (what companies pay for short-term borrowing) and 3-month Treasury bills (the risk-free rate). Commercial paper is how large corporations fund day-to-day operations.',
    interpretation: 'Normally near zero (0.05-0.15%). When it widens to 0.4-0.7%, short-term corporate funding is under pressure. Above 1.2% signals a potential funding freeze where companies cannot roll over their short-term debt.',
    source: 'FRED: DCPF3M - DTB3',
    weight: '15%',
  },
  vix: {
    name: 'VIX',
    short: 'Equity Market Fear Gauge',
    description: 'The CBOE Volatility Index measures expected volatility in the S&P 500 over the next 30 days, derived from options prices. Often called the "fear index" because it rises when investors buy protection against market drops.',
    interpretation: 'A reading of 12-17 is calm. Between 24-32, markets are anxious. Above 40 signals extreme fear (seen in major crises like 2008, 2020). The VIX tends to spike suddenly and mean-revert slowly.',
    source: 'FRED: VIXCLS',
    weight: '15%',
  },
  sofr_ff: {
    name: 'SOFR-FF Spread',
    short: 'Repo Market Stress',
    description: 'The gap between the Secured Overnight Financing Rate (SOFR, the rate for borrowing cash against Treasury collateral) and the Federal Funds rate (the rate banks charge each other). Normally these rates track closely.',
    interpretation: 'A spread of 0-3 bps is normal. When it widens to 8-15 bps, there may be a collateral shortage or funding squeeze in the repo market. Above 25 bps signals serious plumbing problems in the financial system.',
    source: 'FRED: SOFR - DFF',
    weight: '10%',
  },
  tsy_vol: {
    name: 'Treasury Volatility',
    short: 'MOVE Index Proxy',
    description: 'The 20-day rolling standard deviation of daily changes in the 10-year Treasury yield, measured in basis points. This proxies the ICE BofA MOVE Index, which measures bond market volatility.',
    interpretation: 'A reading of 3-5 bps/day is calm. Between 8-12, bonds are moving significantly. Above 16 bps/day signals extreme bond market turbulence, which can trigger margin calls and forced selling across markets.',
    source: 'FRED: DGS10 (20-day stdev)',
    weight: '10%',
  },
  hy_momentum: {
    name: 'HY Spread Momentum',
    short: 'CDX Proxy',
    description: 'The 5-day change in the High Yield OAS spread. This captures how fast credit conditions are deteriorating and proxies the CDX.NA.HY index, which institutional investors use to hedge credit risk.',
    interpretation: 'Negative values mean spreads are tightening (improving). A change of 0-15 bps is neutral. Above 35 bps in 5 days signals rapid credit deterioration. Above 60 bps is crisis-pace widening.',
    source: 'FRED: BAMLH0A0HYM2 (5d change)',
    weight: '10%',
  },
  composite: {
    name: 'Composite Stress Score',
    short: 'Weighted Average of All Indicators',
    description: 'A weighted average of all 7 indicator scores, each normalized to 0-100. The composite aggregates credit spreads, volatility, funding stress, and momentum into a single number that captures overall financial market stress.',
    interpretation: '0-24 = CALM (risk-on). 25-49 = ELEVATED (reduce risk). 50-69 = STRESS (defensive). 70-100 = CRISIS (full defensive). When the score crosses 65, it signals the regime transition for duration positioning.',
    source: 'Computed',
    weight: '100%',
  },
  signal: {
    name: 'Duration Signal',
    short: 'Regime Transition Indicator',
    description: 'Fires when the composite stress score crosses above 65. At this level, credit market stress is severe enough that demand destruction begins overwhelming the inflation impulse -- the "growth shock" overtakes the "inflation shock."',
    interpretation: 'When active: initiate long-duration Treasury positions (20Y+). The logic is that severe financial stress will force the Fed to cut rates and flight-to-quality flows will compress long-end yields, making long-duration bonds rally.',
    source: 'Composite Score >= 65',
    weight: 'N/A',
  },
  yields: {
    name: 'Treasury Yields',
    short: 'US Government Bond Rates',
    description: 'The yield (interest rate) on US Treasury bonds at various maturities. These are the benchmark risk-free rates for the entire financial system. The shape of the yield curve (how these rates relate across maturities) tells us about economic expectations.',
    interpretation: 'A normal upward-sloping curve means the economy is expected to grow. An inverted curve (short rates above long rates) historically predicts recession. The 2s10s spread (10Y minus 2Y) and 10s30s spread are key measures of curve shape.',
    source: 'FRED: DGS2, DGS5, DGS10, DGS20, DGS30',
    weight: 'N/A',
  },
};

export function getInfo(key) {
  return INDICATOR_INFO[key] || null;
}

export default function InfoTooltip({ indicatorKey, style }) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const iconRef = useRef(null);
  const tooltipRef = useRef(null);
  const info = INDICATOR_INFO[indicatorKey];

  useEffect(() => {
    if (open && iconRef.current) {
      const rect = iconRef.current.getBoundingClientRect();
      const viewportW = window.innerWidth;
      const viewportH = window.innerHeight;
      const tooltipW = 360;
      const tooltipH = 320;

      let left = rect.left + rect.width / 2 - tooltipW / 2;
      let top = rect.bottom + 8;

      if (left < 12) left = 12;
      if (left + tooltipW > viewportW - 12) left = viewportW - tooltipW - 12;
      if (top + tooltipH > viewportH - 12) top = rect.top - tooltipH - 8;

      setPosition({ top, left });
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handleClick(e) {
      if (tooltipRef.current && !tooltipRef.current.contains(e.target) && !iconRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  if (!info) return null;

  return (
    <>
      <span
        ref={iconRef}
        onClick={() => setOpen(!open)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 18,
          height: 18,
          borderRadius: '50%',
          border: `1px solid ${colors.text.muted}`,
          color: colors.text.muted,
          fontSize: 11,
          fontFamily: fonts.sans,
          fontWeight: 600,
          cursor: 'pointer',
          marginLeft: 6,
          transition: 'all 0.2s',
          flexShrink: 0,
          ...(open ? { borderColor: colors.text.accent, color: colors.text.accent } : {}),
          ...style,
        }}
      >
        i
      </span>
      {open && (
        <div
          ref={tooltipRef}
          style={{
            position: 'fixed',
            top: position.top,
            left: position.left,
            width: 360,
            maxHeight: 400,
            overflowY: 'auto',
            background: '#0f1729',
            border: `1px solid ${colors.bg.border}`,
            borderRadius: 10,
            padding: '16px 18px',
            zIndex: 10000,
            boxShadow: '0 12px 40px rgba(0,0,0,0.6), 0 0 1px rgba(96,165,250,0.2)',
          }}
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
        >
          <div style={{ fontSize: 14, fontWeight: 600, color: colors.text.primary, fontFamily: fonts.sans, marginBottom: 2 }}>
            {info.name}
          </div>
          <div style={{ fontSize: 11, color: colors.text.accent, fontFamily: fonts.mono, marginBottom: 10, letterSpacing: 0.3 }}>
            {info.short}
          </div>

          <div style={{ fontSize: 12, color: colors.text.secondary, lineHeight: 1.6, marginBottom: 12 }}>
            {info.description}
          </div>

          <div style={{
            background: colors.bg.secondary,
            borderRadius: 6,
            padding: '10px 12px',
            marginBottom: 10,
          }}>
            <div style={{ fontSize: 10, color: colors.text.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4, fontFamily: fonts.sans }}>
              How to Read
            </div>
            <div style={{ fontSize: 12, color: colors.text.primary, lineHeight: 1.6 }}>
              {info.interpretation}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, fontFamily: fonts.mono, color: colors.text.muted }}>
            <span>{info.source}</span>
            <span>Weight: {info.weight}</span>
          </div>
        </div>
      )}
    </>
  );
}
