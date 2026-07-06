import React, { useState, useCallback } from 'react';
import { colors, fonts } from '../styles/theme';
import { fetchBriefing } from '../lib/api';
import { useVisibilityPolling } from '../hooks/useVisibilityPolling';

const TAG_COLORS = {
  TAPE: colors.text.accent,
  WARN: colors.regime.CRISIS,
  CREDIT: colors.regime.ELEVATED,
};

// Rule-based market briefing, regenerated every 10 minutes.
export default function BriefingPanel() {
  const [briefing, setBriefing] = useState(null);
  const [collapsed, setCollapsed] = useState(false);

  const load = useCallback(async () => {
    try { setBriefing(await fetchBriefing()); } catch {}
  }, []);
  useVisibilityPolling(load, 10 * 60 * 1000, true);

  if (!briefing?.lines?.length) return null;

  return (
    <div style={{ background: colors.bg.card, border: `1px solid ${colors.bg.border}`, borderRadius: 12, padding: '12px 16px' }}>
      <div
        onClick={() => setCollapsed(c => !c)}
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', cursor: 'pointer', userSelect: 'none' }}
      >
        <span style={{ fontSize: 13, fontWeight: 600, color: colors.text.secondary, fontFamily: fonts.sans }}>
          {collapsed ? '▸' : '▾'} BRIEFING
        </span>
        <span style={{ fontSize: 10, color: colors.text.muted, fontFamily: fonts.mono }}>
          {new Date(briefing.generatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
      {!collapsed && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 10 }}>
          {briefing.lines.map((l, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, fontSize: 12, lineHeight: 1.5 }}>
              <span style={{
                color: TAG_COLORS[l.tag] || colors.text.muted,
                fontFamily: fonts.mono,
                fontSize: 10,
                fontWeight: 700,
                minWidth: 64,
                paddingTop: 2,
              }}>
                {l.tag}
              </span>
              <span style={{ color: l.tag === 'WARN' ? colors.regime.CRISIS : colors.text.primary, fontFamily: fonts.mono, fontSize: 12 }}>
                {l.text}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
