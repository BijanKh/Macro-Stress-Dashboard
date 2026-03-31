const THRESHOLDS = {
  hy_oas:      [[250,0],[350,15],[450,35],[550,55],[700,75],[1000,95],[1500,100]],
  ccc_bb:      [[150,0],[250,15],[400,35],[600,55],[800,75],[1200,100]],
  cp_spread:   [[0.05,0],[0.15,10],[0.25,20],[0.4,35],[0.7,55],[1.2,75],[2.0,100]],
  vix:         [[12,0],[17,15],[24,35],[32,55],[40,75],[55,95],[80,100]],
  sofr_ff:     [[0,0],[3,10],[8,30],[15,50],[25,70],[50,95],[100,100]],
  tsy_vol:     [[3,0],[5,15],[8,35],[12,55],[16,75],[22,100]],
  hy_momentum: [[-10,0],[0,5],[15,25],[35,45],[60,65],[100,85],[160,100]],
};

const WEIGHTS = {
  hy_oas: 0.25,
  ccc_bb: 0.15,
  cp_spread: 0.15,
  vix: 0.15,
  sofr_ff: 0.10,
  tsy_vol: 0.10,
  hy_momentum: 0.10,
};

function interpolate(value, thresholds) {
  if (value <= thresholds[0][0]) return thresholds[0][1];
  if (value >= thresholds[thresholds.length - 1][0]) return thresholds[thresholds.length - 1][1];
  for (let i = 0; i < thresholds.length - 1; i++) {
    const [v0, s0] = thresholds[i];
    const [v1, s1] = thresholds[i + 1];
    if (value >= v0 && value <= v1) {
      const t = (value - v0) / (v1 - v0);
      return s0 + t * (s1 - s0);
    }
  }
  return 50;
}

function stddev(arr) {
  const n = arr.length;
  if (n === 0) return 0;
  const mean = arr.reduce((a, b) => a + b, 0) / n;
  const variance = arr.reduce((sum, x) => sum + (x - mean) ** 2, 0) / n;
  return Math.sqrt(variance);
}

export function computeIndicators(allData) {
  const latest = (key) => allData[key]?.observations?.[0]?.value ?? null;

  // FRED OAS series are in percentage points (e.g., 3.42 = 342 bps) — convert to bps
  const hy_oas_raw = latest('HY_OAS');
  const ccc_oas_raw = latest('CCC_OAS');
  const bb_oas_raw = latest('BB_OAS');
  const hy_oas = hy_oas_raw != null ? hy_oas_raw * 100 : null;
  const ccc_oas = ccc_oas_raw != null ? ccc_oas_raw * 100 : null;
  const bb_oas = bb_oas_raw != null ? bb_oas_raw * 100 : null;
  const vix = latest('VIX');
  const cp_3m = latest('CP_3M');
  const tbill_3m = latest('TBILL_3M');
  const sofr = latest('SOFR');
  const fed_funds = latest('FED_FUNDS');
  const dgs2 = latest('DGS2');
  const dgs5 = latest('DGS5');
  const dgs10 = latest('DGS10');
  const dgs20 = latest('DGS20');
  const dgs30 = latest('DGS30');

  const ccc_bb = (ccc_oas != null && bb_oas != null) ? ccc_oas - bb_oas : null;
  const cp_spread = (cp_3m != null && tbill_3m != null) ? cp_3m - tbill_3m : null;
  const sofr_ff = (sofr != null && fed_funds != null) ? Math.abs(sofr - fed_funds) * 100 : null;

  let tsy_vol = null;
  const dgs10Obs = allData.DGS10?.observations || [];
  if (dgs10Obs.length >= 21) {
    const changes = [];
    for (let i = 0; i < 20; i++) {
      changes.push((dgs10Obs[i].value - dgs10Obs[i + 1].value) * 100);
    }
    tsy_vol = Math.round(stddev(changes) * 100) / 100;
  }

  let hy_momentum = null;
  const hyObs = allData.HY_OAS?.observations || [];
  if (hyObs.length >= 6) {
    // FRED OAS is in pct points, convert 5-day change to bps
    hy_momentum = Math.round((hyObs[0].value - hyObs[5].value) * 100 * 100) / 100;
  }

  const indicators = {};
  const rawValues = { hy_oas, ccc_bb, cp_spread, vix, sofr_ff, tsy_vol, hy_momentum };

  let totalWeight = 0;
  let weightedSum = 0;

  for (const [key, weight] of Object.entries(WEIGHTS)) {
    const val = rawValues[key];
    if (val != null) {
      const score = Math.round(interpolate(val, THRESHOLDS[key]) * 10) / 10;
      indicators[key] = { value: val, score, weight };
      weightedSum += score * weight;
      totalWeight += weight;
    } else {
      indicators[key] = { value: null, score: null, weight };
    }
  }

  const composite = totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 10) / 10 : null;

  let regime = 'CALM';
  if (composite >= 70) regime = 'CRISIS';
  else if (composite >= 50) regime = 'STRESS';
  else if (composite >= 25) regime = 'ELEVATED';

  const signalActive = composite != null && composite >= 65;

  const asOf = hyObs[0]?.date || dgs10Obs[0]?.date || new Date().toISOString().slice(0, 10);

  return {
    asOf,
    indicators,
    composite,
    regime,
    signalActive,
    yields: { '2y': dgs2, '5y': dgs5, '10y': dgs10, '20y': dgs20, '30y': dgs30 },
    context: { fedFunds: fed_funds, sofr },
    raw: {
      hy_oas, ccc_oas, bb_oas, ccc_bb, vix, cp_3m, tbill_3m, cp_spread,
      sofr, fed_funds, sofr_ff, dgs2, dgs5, dgs10, dgs20, dgs30,
      tsy_vol, hy_momentum,
    },
    scores: {
      score_hy_oas: indicators.hy_oas?.score,
      score_ccc_bb: indicators.ccc_bb?.score,
      score_cp_spread: indicators.cp_spread?.score,
      score_vix: indicators.vix?.score,
      score_sofr_ff: indicators.sofr_ff?.score,
      score_tsy_vol: indicators.tsy_vol?.score,
      score_hy_momentum: indicators.hy_momentum?.score,
    },
  };
}

export function computeFromObservations(observationsByKey, targetDate) {
  const allData = {};
  for (const [key, obs] of Object.entries(observationsByKey)) {
    const filtered = obs.filter(o => o.date <= targetDate).sort((a, b) => b.date.localeCompare(a.date));
    allData[key] = { observations: filtered };
  }
  const result = computeIndicators(allData);
  result.asOf = targetDate;
  return result;
}
