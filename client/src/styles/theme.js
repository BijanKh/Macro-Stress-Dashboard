export const colors = {
  bg: {
    primary: '#070b16',
    secondary: '#0a0f1e',
    card: '#0d1424',
    cardHover: '#111a2e',
    border: '#141e33',
  },
  text: {
    primary: '#e2e8f0',
    secondary: '#8899aa',
    muted: '#3a4d6b',
    accent: '#60a5fa',
  },
  regime: {
    CALM: '#10B981',
    ELEVATED: '#FBBF24',
    STRESS: '#F97316',
    CRISIS: '#EF4444',
  },
  chart: {
    grid: '#141e33',
    axis: '#3a4d6b',
    area: '#1e40af',
    areaFill: 'rgba(30, 64, 175, 0.15)',
    reference: '#ef4444',
  },
};

export const fonts = {
  mono: "'JetBrains Mono', 'IBM Plex Mono', monospace",
  sans: "'Space Grotesk', system-ui, sans-serif",
};

export function regimeColor(regime) {
  return colors.regime[regime] || colors.text.muted;
}

export function scoreColor(score) {
  if (score >= 70) return colors.regime.CRISIS;
  if (score >= 50) return colors.regime.STRESS;
  if (score >= 25) return colors.regime.ELEVATED;
  return colors.regime.CALM;
}
