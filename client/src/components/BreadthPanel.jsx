import React, { useState } from 'react';
import { colors, fonts } from '../styles/theme';
import InfoTooltip from './InfoTooltip';

function levelColor(pct) {
  if (pct == null) return colors.text.muted;
  if (pct >= 0.7) return colors.regime.CALM;
  if (pct >= 0.4) return colors.regime.ELEVATED;
  return colors.regime.CRISIS;
}

// Percentage row with fill bar. If `below` is given, the row is expandable
// and lists the members below the average.
export function BreadthRow({ label, pct, count, below, open, onToggle }) {
  const color = levelColor(pct);
  const expandable = below !== undefined;
  return (
    <div>
      <div onClick={expandable ? onToggle : undefined} style={{ cursor: expandable ? 'pointer' : 'default', userSelect: 'none' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontFamily: fonts.mono, marginBottom: 3 }}>
          <span style={{ color: colors.text.secondary }}>
            {expandable && <span style={{ color: colors.text.muted, marginRight: 4 }}>{open ? '▾' : '▸'}</span>}
            {label}
          </span>
          <span>
            <span style={{ color: colors.text.primary, fontWeight: 600 }}>
              {pct != null ? `${Math.round(pct * 100)}%` : '--'}
            </span>
            {pct != null && count > 0 && (
              <span style={{ color: colors.text.muted, marginLeft: 6 }}>
                {Math.round(pct * count)}/{count}
              </span>
            )}
          </span>
        </div>
        <div style={{ height: 4, background: colors.bg.border, borderRadius: 2, overflow: 'hidden' }}>
          <div style={{ width: `${pct != null ? pct * 100 : 0}%`, height: '100%', background: color, borderRadius: 2 }} />
        </div>
      </div>
      {expandable && open && (
        <div style={{ marginTop: 6, fontSize: 10, fontFamily: fonts.mono, lineHeight: 1.8 }}>
          <span style={{ color: colors.text.muted, marginRight: 6 }}>below:</span>
          {(below || []).length === 0 ? (
            <span style={{ color: colors.updown.up }}>all above</span>
          ) : (
            (below || []).map(s => (
              <span key={s} style={{
                color: colors.updown.down,
                border: `1px solid ${colors.bg.border}`,
                borderRadius: 4,
                padding: '1px 5px',
                marginRight: 4,
                whiteSpace: 'nowrap',
              }}>
                {s}
              </span>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// % of the tracked sector ETFs above their own 20/50/200-day SMA.
// Click a row to see which ETFs are below that average.
export default function BreadthPanel({ breadth }) {
  const [open, setOpen] = useState(null);
  const count = breadth?.count || 0;

  const rows = [
    { key: 20, label: '> 20-day avg', pct: breadth?.pctAbove20, below: breadth?.below20 },
    { key: 50, label: '> 50-day avg', pct: breadth?.pctAbove50, below: breadth?.below50 },
    { key: 200, label: '> 200-day avg', pct: breadth?.pctAbove200, below: breadth?.below200 },
  ];

  return (
    <div style={{ background: colors.bg.card, border: `1px solid ${colors.bg.border}`, borderRadius: 12, padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', fontSize: 13, fontWeight: 600, color: colors.text.secondary, fontFamily: fonts.sans }}>
        SECTOR BREADTH
        <InfoTooltip indicatorKey="breadth" />
      </div>
      <div style={{ fontSize: 10, color: colors.text.muted, fontFamily: fonts.sans, margin: '2px 0 12px' }}>
        % of {count || 23} sector ETFs above their own moving average
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {rows.map(r => (
          <BreadthRow
            key={r.key}
            label={r.label}
            pct={r.pct}
            count={count}
            below={r.below}
            open={open === r.key}
            onToggle={() => setOpen(open === r.key ? null : r.key)}
          />
        ))}
      </div>
    </div>
  );
}
