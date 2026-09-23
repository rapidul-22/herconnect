export const reportCategories = [
  "Harassment",
  "Stalking",
  "Unsafe Area",
  "Assault",
  "Verbal Abuse",
  "Other",
];
export const resourceTypes = [
  "Police Station",
  "Hospital",
  "NGO / Helpline",
  "Safe Shelter",
  "Legal Aid",
];
export const reportStatuses = ["pending", "reviewed", "resolved"];
export function distanceKm(a, b) {
  const rad = (x) => (x * Math.PI) / 180;
  const v =
    Math.sin(rad(b.lat - a.lat) / 2) ** 2 +
    Math.cos(rad(a.lat)) *
      Math.cos(rad(b.lat)) *
      Math.sin(rad(b.lng - a.lng) / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(Math.min(1, Math.max(0, v))));
}
// DBSCAN: core points have >=3 reports (including themselves) within 500m.
// Density-connected clusters can span more than 500m; noise is not a safe-area label.
export function clusterReports(reports, now = Date.now()) {
  const rows = reports.filter(
    (r) =>
      +new Date(r.occurredAt) >= now - 180 * 86400000 &&
      +new Date(r.occurredAt) <= now,
  );
  const labels = new Map(),
    clusters = [];
  // ponytail: O(n²), bounded to 2000 reports by the API; use a spatial index at larger scale.
  const near = (i) =>
    rows.flatMap((r, j) =>
      distanceKm(rows[i].location, r.location) <= 0.5 ? [j] : [],
    );
  for (let i = 0; i < rows.length; i++) {
    if (labels.has(i)) continue;
    const neighbours = near(i);
    if (neighbours.length < 3) {
      labels.set(i, -1);
      continue;
    }
    const id = clusters.length,
      members = [],
      queue = new Set(neighbours);
    labels.set(i, id);
    members.push(i);
    for (const j of queue) {
      if (labels.get(j) === -1) {
        labels.set(j, id);
        members.push(j);
      }
      if (labels.has(j)) continue;
      labels.set(j, id);
      members.push(j);
      const next = near(j);
      if (next.length >= 3) next.forEach((k) => queue.add(k));
    }
    clusters.push(members);
  }
  const weight = {Assault:5, Stalking:4, Harassment:3, 'Verbal Abuse':2, 'Unsafe Area':2, Other:1};
  const score = ids => Math.round(ids.reduce((n,j) => {
    const age = (now - +new Date(rows[j].occurredAt)) / 86400000;
    return n + (weight[rows[j].category] || 1) * (age <= 7 ? 1 : age <= 30 ? .6 : age <= 90 ? .3 : .1);
  }, 0) * 10) / 10;
  return clusters.map((ids, i) => ({
    score: score(ids),
    level: score(ids) >= 10 ? 'High report activity' : score(ids) >= 5 ? 'Elevated report activity' : 'Report cluster',
    color: score(ids) >= 10 ? '#b42342' : score(ids) >= 5 ? '#bb6b16' : '#876196',
    latestAt: new Date(Math.max(...ids.map(j => +new Date(rows[j].occurredAt)))).toISOString(),
    radiusMetres: 500,
    id: i + 1,
    count: ids.length,
    lat: Number(
      (ids.reduce((n, j) => n + rows[j].location.lat, 0) / ids.length).toFixed(
        3,
      ),
    ),
    lng: Number(
      (ids.reduce((n, j) => n + rows[j].location.lng, 0) / ids.length).toFixed(
        3,
      ),
    ),
    categories: ids.reduce((a, j) => {
      a[rows[j].category] = (a[rows[j].category] || 0) + 1;
      return a;
    }, {}),
  }));
}
