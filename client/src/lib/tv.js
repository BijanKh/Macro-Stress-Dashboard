// Yahoo symbol → TradingView symbol mapping for the chart modal.

const SPECIAL = {
  'DX-Y.NYB': 'TVC:DXY',
  'JPY=X': 'FX:USDJPY',
  '^GDAXI': 'XETR:DAX',
  '^STOXX50E': 'TVC:SX5E',
  '^FTSE': 'TVC:UKX',
  '^N225': 'TVC:NI225',
  '^HSI': 'TVC:HSI',
  '^KS11': 'KRX:KOSPI',
  '^SPXEW': 'SP:SPXEW',
  '^BKX': 'CBOE:BKX',
  '^VIX': 'CBOE:VIX',
  '^VIX3M': 'CBOE:VIX3M',
  '^MOVE': 'TVC:MOVE',
  '^IRX': 'TVC:US03MY',
  '^FVX': 'TVC:US05Y',
  '^TNX': 'TVC:US10Y',
  '^TYX': 'TVC:US30Y',
  'SXRS.DE': 'XETR:SXRS',
  'ES=F': 'CME_MINI:ES1!',
  'NQ=F': 'CME_MINI:NQ1!',
  'RTY=F': 'CME_MINI:RTY1!',
  'YM=F': 'CBOT_MINI:YM1!',
  '2YY=F': 'CBOT:2YY1!',
  'ZT=F': 'CBOT:ZT1!',
  'ZN=F': 'CBOT:ZN1!',
  'ZB=F': 'CBOT:ZB1!',
  'ZS=F': 'CBOT:ZS1!',
  'ZW=F': 'CBOT:ZW1!',
  'GC=F': 'COMEX:GC1!',
  'SI=F': 'COMEX:SI1!',
  'HG=F': 'COMEX:HG1!',
  'ALI=F': 'COMEX:ALI1!',
  'TIO=F': 'COMEX:TIO1!',
  'CL=F': 'NYMEX:CL1!',
  'BZ=F': 'NYMEX:BZ1!',
  'NG=F': 'NYMEX:NG1!',
  'HO=F': 'NYMEX:HO1!',
  'RB=F': 'NYMEX:RB1!',
  'PL=F': 'NYMEX:PL1!',
  'PA=F': 'NYMEX:PA1!',
  'CC=F': 'ICEUS:CC1!',
  'BTC-USD': 'BTCUSD',
  'ETH-USD': 'ETHUSD',
};

export function toTvSymbol(yahooSymbol) {
  if (!yahooSymbol) return null;
  if (SPECIAL[yahooSymbol]) return SPECIAL[yahooSymbol];
  if (yahooSymbol.endsWith('=X')) {
    const base = yahooSymbol.slice(0, -2);
    return base.length === 6 ? `FX:${base}` : `USD${base}`; // EURUSD=X vs TRY=X
  }
  if (yahooSymbol.endsWith('-USD')) return yahooSymbol.replace('-USD', 'USD'); // crypto
  if (yahooSymbol.includes('/')) return yahooSymbol; // ratio expressions work on TV
  return yahooSymbol.replace(/^\^/, '');
}
