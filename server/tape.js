// Tape Score: one 0-100 risk-on/risk-off composite from breadth, volatility,
// VIX term structure, sentiment, and the credit stress score (inverted).
// Higher = healthier tape.

function interp(value, points) {
  if (value == null || !isFinite(value)) return null;
  if (value <= points[0][0]) return points[0][1];
  if (value >= points[points.length - 1][0]) return points[points.length - 1][1];
  for (let i = 0; i < points.length - 1; i++) {
    const [v0, s0] = points[i];
    const [v1, s1] = points[i + 1];
    if (value >= v0 && value <= v1) return s0 + (value - v0) / (v1 - v0) * (s1 - s0);
  }
  return null;
}

export function computeTapeScore({ quotes, spxBreadth, fearGreed, creditComposite }) {
  const vol = quotes?.groups?.volatility || [];
  const vix = vol.find(q => q.symbol === '^VIX')?.price;
  const vix3m = vol.find(q => q.symbol === '^VIX3M')?.price;

  const components = [
    {
      key: 'breadth', label: 'S&P breadth (>50d)', weight: 0.30,
      score: spxBreadth?.pctAbove50 != null ? spxBreadth.pctAbove50 * 100
        : quotes?.breadth?.pctAbove50 != null ? quotes.breadth.pctAbove50 * 100 : null,
    },
    {
      key: 'vix', label: 'VIX level', weight: 0.20,
      score: interp(vix, [[12, 100], [16, 80], [20, 60], [26, 35], [32, 15], [45, 0]]),
    },
    {
      key: 'term', label: 'VIX term structure', weight: 0.20,
      score: vix && vix3m ? interp(vix / vix3m, [[0.75, 100], [0.85, 80], [0.95, 55], [1.0, 35], [1.1, 0]]) : null,
    },
    {
      key: 'sentiment', label: 'Fear & Greed', weight: 0.10,
      score: typeof fearGreed?.score === 'number' ? fearGreed.score : null,
    },
    {
      key: 'credit', label: 'Credit stress (inv)', weight: 0.20,
      score: creditComposite != null ? 100 - creditComposite : null,
    },
  ];

  const avail = components.filter(c => c.score != null);
  if (avail.length === 0) return null;
  const totalW = avail.reduce((a, c) => a + c.weight, 0);
  const score = avail.reduce((a, c) => a + c.score * (c.weight / totalW), 0);

  const label = score >= 70 ? 'RISK-ON' : score >= 45 ? 'NEUTRAL' : score >= 25 ? 'DEFENSIVE' : 'RISK-OFF';
  return {
    score: Math.round(score),
    label,
    components: components.map(c => ({ key: c.key, label: c.label, score: c.score != null ? Math.round(c.score) : null })),
  };
}
