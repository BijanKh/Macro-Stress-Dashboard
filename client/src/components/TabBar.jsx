import React from 'react';
import { colors, fonts } from '../styles/theme';

export default function TabBar({ tabs, active, onChange }) {
  return (
    <nav style={{
      display: 'flex',
      gap: 4,
      borderBottom: `1px solid ${colors.bg.border}`,
      marginBottom: 20,
      overflowX: 'auto',
    }}>
      {tabs.map(tab => {
        const isActive = tab.id === active;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            style={{
              background: 'none',
              border: 'none',
              borderBottom: isActive ? `2px solid ${colors.text.accent}` : '2px solid transparent',
              color: isActive ? colors.text.primary : colors.text.secondary,
              padding: '10px 16px',
              cursor: 'pointer',
              fontFamily: fonts.sans,
              fontSize: 13,
              fontWeight: isActive ? 600 : 400,
              letterSpacing: 0.2,
              whiteSpace: 'nowrap',
            }}
          >
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
}
