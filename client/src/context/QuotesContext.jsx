import React, { createContext, useContext, useState, useCallback } from 'react';
import { fetchQuotes, fetchCalendar, fetchEarnings, fetchCrypto } from '../lib/api';
import { useVisibilityPolling } from '../hooks/useVisibilityPolling';

const QuotesCtx = createContext(null);
const CalendarCtx = createContext(null);
const EarningsCtx = createContext(null);
const CryptoCtx = createContext(null);

const QUOTES_INTERVAL_MS = 45 * 1000;
const CALENDAR_INTERVAL_MS = 30 * 60 * 1000;
const EARNINGS_INTERVAL_MS = 6 * 60 * 60 * 1000;
const CRYPTO_INTERVAL_MS = 90 * 1000; // server caches 120s; CoinGecko free tier is tight

// `active` — whether any intraday tab is visible; quotes only poll then.
// `cryptoActive` — whether the Crypto tab is visible; CoinGecko polls only then.
// The calendar polls regardless (30min, cheap, feeds the Overview strip).
export function MarketDataProvider({ active, cryptoActive, children }) {
  const [quotes, setQuotes] = useState(null);
  const [quotesError, setQuotesError] = useState(null);
  const [calendar, setCalendar] = useState(null);
  const [earnings, setEarnings] = useState(null);
  const [crypto, setCrypto] = useState(null);

  const loadQuotes = useCallback(async () => {
    try {
      setQuotes(await fetchQuotes());
      setQuotesError(null);
    } catch (err) {
      setQuotesError(err.message);
    }
  }, []);

  const loadCalendar = useCallback(async () => {
    try {
      setCalendar(await fetchCalendar());
    } catch {
      // keep last good calendar
    }
  }, []);

  const loadEarnings = useCallback(async () => {
    try {
      setEarnings(await fetchEarnings());
    } catch {
      // keep last good earnings
    }
  }, []);

  const loadCrypto = useCallback(async () => {
    try {
      setCrypto(await fetchCrypto());
    } catch {
      // keep last good crypto data
    }
  }, []);

  useVisibilityPolling(loadQuotes, QUOTES_INTERVAL_MS, active);
  useVisibilityPolling(loadCalendar, CALENDAR_INTERVAL_MS, true);
  useVisibilityPolling(loadEarnings, EARNINGS_INTERVAL_MS, true);
  useVisibilityPolling(loadCrypto, CRYPTO_INTERVAL_MS, cryptoActive);

  return (
    <QuotesCtx.Provider value={{ quotes, error: quotesError, reload: loadQuotes }}>
      <CalendarCtx.Provider value={calendar}>
        <EarningsCtx.Provider value={earnings}>
          <CryptoCtx.Provider value={crypto}>
            {children}
          </CryptoCtx.Provider>
        </EarningsCtx.Provider>
      </CalendarCtx.Provider>
    </QuotesCtx.Provider>
  );
}

export function useQuotes() {
  return useContext(QuotesCtx);
}

export function useCalendar() {
  return useContext(CalendarCtx);
}

export function useEarnings() {
  return useContext(EarningsCtx);
}

export function useCrypto() {
  return useContext(CryptoCtx);
}
