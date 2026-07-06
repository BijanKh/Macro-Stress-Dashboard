// Parses an implied-volatility history CSV (MarketChameleon export format,
// but tolerant of column naming/order) and backfills iv30_{SYMBOL} rows in
// metric_history so IV rank/range have real history.

import { saveMetrics } from './db.js';

function splitCsvLine(line) {
  // handles simple quoted fields ("Jul 3, 2025")
  const out = [];
  let cur = '', inQ = false;
  for (const ch of line) {
    if (ch === '"') inQ = !inQ;
    else if (ch === ',' && !inQ) { out.push(cur); cur = ''; }
    else cur += ch;
  }
  out.push(cur);
  return out.map(s => s.trim());
}

function parseIvValue(raw) {
  if (raw == null) return null;
  const s = String(raw).replace('%', '').trim();
  if (s === '' || s === '-') return null;
  const v = parseFloat(s);
  if (!isFinite(v)) return null;
  return v > 3 ? v / 100 : v; // "45.2" or "45.2%" -> 0.452; "0.452" stays
}

function parseDate(raw) {
  const s = String(raw).trim().replace(/^"|"$/g, '');
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const t = Date.parse(s);
  if (isNaN(t)) return null;
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function importIvCsv(symbol, csvText) {
  const lines = String(csvText).split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) throw new Error('CSV appears empty');

  const header = splitCsvLine(lines[0]).map(h => h.toLowerCase());
  const dateIdx = header.findIndex(h => h.includes('date'));
  if (dateIdx === -1) throw new Error('No date column found');

  // Prefer an "iv30 mean/avg/mid" column, then any iv30, then plain iv
  const findCol = (tests) => {
    for (const test of tests) {
      const i = header.findIndex(test);
      if (i !== -1) return i;
    }
    return -1;
  };
  const ivIdx = findCol([
    h => /iv.?30/.test(h) && /(mean|avg|mid)/.test(h),
    h => /iv.?30/.test(h) && !/(call|put)/.test(h),
    h => /iv.?30/.test(h),
    h => /implied|(^|\W)iv($|\W)/.test(h),
  ]);
  if (ivIdx === -1) throw new Error(`No IV column found (headers: ${header.join(', ')})`);

  const metric = `iv30_${symbol}`;
  let imported = 0, skipped = 0;
  let minDate = null, maxDate = null;
  const batch = {};

  for (let i = 1; i < lines.length; i++) {
    const cells = splitCsvLine(lines[i]);
    const date = parseDate(cells[dateIdx]);
    const iv = parseIvValue(cells[ivIdx]);
    if (!date || iv == null || iv <= 0 || iv > 5) { skipped++; continue; }
    batch[date] = iv;
    imported++;
    if (!minDate || date < minDate) minDate = date;
    if (!maxDate || date > maxDate) maxDate = date;
  }

  if (imported === 0) throw new Error('No valid rows parsed');
  for (const [date, iv] of Object.entries(batch)) {
    saveMetrics(date, { [metric]: iv });
  }

  return { symbol, imported, skipped, from: minDate, to: maxDate, ivColumn: header[ivIdx] };
}
