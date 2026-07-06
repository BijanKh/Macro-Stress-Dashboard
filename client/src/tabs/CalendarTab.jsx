import React, { useState, useMemo } from 'react';
import { colors, fonts } from '../styles/theme';
import { useCalendar, useEarnings } from '../context/QuotesContext';
import EarningsPanel from '../components/EarningsPanel';

const IMPACTS = ['High', 'Medium', 'Low', 'Holiday'];
const MAIN_CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'CNY', 'CHF', 'CAD', 'AUD', 'NZD'];

function Chip({ label, active, color, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: active ? colors.bg.cardHover : 'transparent',
        border: `1px solid ${active ? (color || colors.text.accent) : colors.bg.border}`,
        color: active ? (color || colors.text.accent) : colors.text.muted,
        borderRadius: 999,
        padding: '4px 12px',
        cursor: 'pointer',
        fontFamily: fonts.mono,
        fontSize: 11,
      }}
    >
      {label}
    </button>
  );
}

function dayKey(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
}

function isToday(iso) {
  const d = new Date(iso), n = new Date();
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate();
}

// ForexFactory weekly calendar with impact + currency filters.
export default function CalendarTab() {
  const calendar = useCalendar();
  const earnings = useEarnings();
  const [impacts, setImpacts] = useState(new Set(['High', 'Medium']));
  const [currencies, setCurrencies] = useState(new Set(['USD', 'EUR']));

  const grouped = useMemo(() => {
    const events = (calendar?.events || [])
      .filter(e => impacts.has(e.impact) && (currencies.size === 0 || currencies.has(e.country)))
      .sort((a, b) => new Date(a.date) - new Date(b.date));
    const byDay = new Map();
    for (const e of events) {
      const k = dayKey(e.date);
      if (!byDay.has(k)) byDay.set(k, []);
      byDay.get(k).push(e);
    }
    return byDay;
  }, [calendar, impacts, currencies]);

  function toggle(set, setter, value) {
    const next = new Set(set);
    next.has(value) ? next.delete(value) : next.add(value);
    setter(next);
  }

  if (!calendar) {
    return <div style={{ color: colors.text.muted, fontFamily: fonts.mono, padding: 40, textAlign: 'center' }}>Loading calendar...</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <EarningsPanel earnings={earnings} />
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {IMPACTS.map(i => (
            <Chip key={i} label={i} active={impacts.has(i)} color={colors.impact[i]}
              onClick={() => toggle(impacts, setImpacts, i)} />
          ))}
        </div>
        <div style={{ width: 1, height: 18, background: colors.bg.border }} />
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {MAIN_CURRENCIES.map(c => (
            <Chip key={c} label={c} active={currencies.has(c)}
              onClick={() => toggle(currencies, setCurrencies, c)} />
          ))}
        </div>
        {calendar.stale && (
          <span style={{ fontSize: 11, color: colors.regime.ELEVATED, fontFamily: fonts.mono }}>stale feed</span>
        )}
      </div>

      {grouped.size === 0 && (
        <div style={{ color: colors.text.muted, fontFamily: fonts.mono, padding: 30, textAlign: 'center' }}>
          No events match the filters.
        </div>
      )}

      {[...grouped.entries()].map(([day, events]) => {
        const todayFlag = isToday(events[0].date);
        return (
          <div key={day} style={{
            background: colors.bg.card,
            border: `1px solid ${todayFlag ? colors.text.accent : colors.bg.border}`,
            borderRadius: 12,
            padding: 16,
          }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: todayFlag ? colors.text.accent : colors.text.secondary, fontFamily: fonts.sans, marginBottom: 10 }}>
              {day}{todayFlag ? ' — TODAY' : ''}
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, fontFamily: fonts.mono }}>
              <tbody>
                {events.map((e, i) => (
                  <tr key={`${e.date}-${e.title}-${i}`}>
                    <td style={{ color: colors.text.muted, padding: '4px 8px 4px 0', whiteSpace: 'nowrap', width: 60 }}>
                      {new Date(e.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td style={{ color: colors.impact[e.impact] || colors.text.muted, padding: '4px 8px', fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap', width: 60 }}>
                      ● {e.impact.toUpperCase()}
                    </td>
                    <td style={{ color: colors.text.secondary, padding: '4px 8px', width: 44 }}>{e.country}</td>
                    <td style={{ color: colors.text.primary, padding: '4px 8px' }}>{e.title}</td>
                    <td style={{ color: colors.text.muted, padding: '4px 8px', whiteSpace: 'nowrap' }}>{e.forecast ? `f: ${e.forecast}` : ''}</td>
                    <td style={{ color: colors.text.muted, padding: '4px 8px', whiteSpace: 'nowrap' }}>{e.previous ? `p: ${e.previous}` : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}

      <div style={{ fontSize: 11, color: colors.text.muted, fontFamily: fonts.mono }}>
        Source: ForexFactory weekly feed. Times shown in your local timezone.
      </div>
    </div>
  );
}
