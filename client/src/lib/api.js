const BASE = '';

export async function fetchCurrent() {
  const res = await fetch(`${BASE}/api/current`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchHistory(days = 252) {
  const res = await fetch(`${BASE}/api/history?days=${days}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchHYHistory(days = 252) {
  const res = await fetch(`${BASE}/api/hy-history?days=${days}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function refreshData() {
  const res = await fetch(`${BASE}/api/refresh`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}
