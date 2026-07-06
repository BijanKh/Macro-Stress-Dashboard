import React from 'react';
import { colors, fonts } from '../styles/theme';
import { useCrypto } from '../context/QuotesContext';
import { fmtBig } from '../lib/format';
import QuoteTable from '../components/QuoteTable';
import Pct from '../components/Pct';

function priceDec(p) {
  if (p == null) return 2;
  if (p >= 1000) return 0;
  if (p >= 1) return 2;
  if (p >= 0.01) return 4;
  return 6;
}

function StatTile({ label, value, sub }) {
  return (
    <div style={{ background: colors.bg.card, border: `1px solid ${colors.bg.border}`, borderRadius: 10, padding: '10px 14px' }}>
      <div style={{ fontSize: 11, color: colors.text.secondary, fontFamily: fonts.sans, marginBottom: 4, whiteSpace: 'nowrap' }}>
        {label}
      </div>
      <div style={{ fontSize: 16, fontWeight: 600, color: colors.text.primary, fontFamily: fonts.mono }}>{value}</div>
      {sub && <div style={{ fontSize: 10, fontFamily: fonts.mono, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

// Crypto market: total caps, dominance, top 20 (incl. /BTC ratios), day movers.
export default function CryptoTab() {
  const crypto = useCrypto();

  if (!crypto) {
    return <div style={{ color: colors.text.muted, fontFamily: fonts.mono, padding: 40, textAlign: 'center' }}>Loading crypto data...</div>;
  }

  const g = crypto.global || {};

  const topRows = (crypto.top || []).map(c => ({
    id: c.id,
    chartSym: `${c.symbol}-USD`,
    rank: c.rank,
    symbol: c.symbol,
    name: c.name,
    price: c.price,
    change24h: c.change24h,
    marketCap: c.marketCap,
    priceBtc: c.priceBtc,
    changeVsBtc24h: c.changeVsBtc24h,
    changeVsBtcWtd: c.changeVsBtcWtd,
    changeVsBtcYtd: c.changeVsBtcYtd,
    dec: priceDec(c.price),
  }));

  const moverRows = (list) => (list || []).map(c => ({
    id: c.id,
    chartSym: `${c.symbol}-USD`,
    symbol: c.symbol,
    name: c.name,
    price: c.price,
    change24h: c.change24h,
    marketCap: c.marketCap,
    dec: priceDec(c.price),
  }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {crypto.stale && (
        <div style={{ fontSize: 11, color: colors.regime.ELEVATED, fontFamily: fonts.mono }}>
          STALE — CoinGecko unreachable, showing last good data
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 8 }}>
        <StatTile label="TOTAL Market Cap" value={fmtBig(g.total)} sub={<Pct value={g.totalChange24h} size={10} />} />
        <StatTile label="TOTAL2 (ex BTC)" value={fmtBig(g.total2)} />
        <StatTile label="TOTAL3 (ex BTC+ETH)" value={fmtBig(g.total3)} />
        <StatTile
          label="BTC Dominance"
          value={g.btcDominance != null ? `${(g.btcDominance * 100).toFixed(2)}%` : '--'}
          sub={<span style={{ color: colors.text.muted }}>ETH {g.ethDominance != null ? `${(g.ethDominance * 100).toFixed(2)}%` : '--'}</span>}
        />
        {crypto.derivatives?.btc && (
          <StatTile
            label="BTC Perp Funding"
            value={`${(crypto.derivatives.btc.funding * 100).toFixed(4)}%`}
            sub={<span style={{ color: colors.text.muted }}>
              {crypto.derivatives.btc.fundingAnnual != null ? `${(crypto.derivatives.btc.fundingAnnual * 100).toFixed(1)}% ann · ` : ''}
              OI {fmtBig(crypto.derivatives.btc.oiUsd)}
            </span>}
          />
        )}
        {crypto.derivatives?.eth && (
          <StatTile
            label="ETH Perp Funding"
            value={`${(crypto.derivatives.eth.funding * 100).toFixed(4)}%`}
            sub={<span style={{ color: colors.text.muted }}>
              {crypto.derivatives.eth.fundingAnnual != null ? `${(crypto.derivatives.eth.fundingAnnual * 100).toFixed(1)}% ann · ` : ''}
              OI {fmtBig(crypto.derivatives.eth.oiUsd)}
            </span>}
          />
        )}
      </div>

      <QuoteTable
        title="TOP 20 BY MARKET CAP"
        columns={[
          { key: 'rank', label: '#', type: 'text', align: 'right' },
          { key: 'symbol', label: 'SYM', type: 'text' },
          { key: 'name', label: 'NAME', type: 'text' },
          { key: 'price', label: 'PRICE $', type: 'price' },
          { key: 'change24h', label: '24H', type: 'pct' },
          { key: 'marketCap', label: 'MCAP', type: 'big' },
          { key: 'priceBtc', label: 'PRICE ₿', type: 'price', dec: 8 },
          { key: 'changeVsBtc24h', label: 'VS BTC 24H', type: 'pct' },
          { key: 'changeVsBtcWtd', label: 'VS BTC WTD', type: 'pct' },
          { key: 'changeVsBtcYtd', label: 'VS BTC YTD', type: 'pct' },
        ]}
        rows={topRows}
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: 16, alignItems: 'start' }}>
        <QuoteTable
          title="TOP 10 WINNERS (24H, top 250 by mcap)"
          columns={[
            { key: 'symbol', label: 'SYM', type: 'text' },
            { key: 'name', label: 'NAME', type: 'text' },
            { key: 'price', label: 'PRICE $', type: 'price' },
            { key: 'change24h', label: '24H', type: 'pct' },
            { key: 'marketCap', label: 'MCAP', type: 'big' },
          ]}
          rows={moverRows(crypto.winners)}
        />
        <QuoteTable
          title="TOP 10 LOSERS (24H, top 250 by mcap)"
          columns={[
            { key: 'symbol', label: 'SYM', type: 'text' },
            { key: 'name', label: 'NAME', type: 'text' },
            { key: 'price', label: 'PRICE $', type: 'price' },
            { key: 'change24h', label: '24H', type: 'pct' },
            { key: 'marketCap', label: 'MCAP', type: 'big' },
          ]}
          rows={moverRows(crypto.losers)}
        />
      </div>

      <div style={{ fontSize: 11, color: colors.text.muted, fontFamily: fonts.mono }}>
        Source: CoinGecko (2min server cache, 90s refresh while tab open). VS BTC columns = coin&apos;s move relative to BTC over that horizon — positive means it outperformed BTC.
        WTD measured from Monday 00:00 UTC; YTD from Dec 31 close (loads ~2min after first visit; &apos;--&apos; = listed after year-end). Stablecoins and wrapped assets excluded from winners/losers.
      </div>
    </div>
  );
}
