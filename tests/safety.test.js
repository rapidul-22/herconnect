import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { app } from "../server/app.js";
import { reportInput, resourceInput, reportView } from "../server/safety.js";
import { clusterReports, distanceKm } from "../shared/safety.js";
const now = Date.parse("2026-09-14T00:00:00Z");
const point = (lat, lng, extra = {}) => ({
  location: { lat, lng, address: "Test area" },
  category: "Harassment",
  occurredAt: new Date(now - 86400000),
  ...extra,
});
test("hotspots separate clusters, noise, old and future incidents; include boundary points", () => {
  const rows = [
    point(23.8, 90.4),
    point(23.8005, 90.4),
    point(23.801, 90.4),
    point(24, 90.5),
    point(24.0005, 90.5),
    point(24.001, 90.5),
    point(25, 91),
    point(23.8, 90.4, { occurredAt: new Date(now - 181 * 86400000) }),
    point(23.8, 90.4, { occurredAt: new Date(now + 1000) }),
  ];
  assert.deepEqual(
    clusterReports(rows, now).map((c) => c.count),
    [3, 3],
  );
  assert.equal(clusterReports(rows.slice(0, 2), now).length, 0);
  assert.equal(
    clusterReports(
      [
        point(23.8, 90.4),
        point(23.8, 90.4),
        point(23.8, 90.4, { occurredAt: new Date(now - 180 * 86400000) }),
      ],
      now,
    )[0].count,
    3,
  );
  assert.equal(distanceKm({ lat: 0, lng: 0 }, { lat: 0, lng: 0 }), 0);
  assert.ok(
    Math.abs(distanceKm({ lat: 0, lng: 0 }, { lat: 0, lng: 1 }) - 111.195) <
      0.01,
  );
  // Previously labelled noise becomes a border member of a later core cluster.
  assert.equal(
    clusterReports(
      [
        point(23.8, 90.4),
        point(23.804, 90.4),
        point(23.8045, 90.4),
        point(23.805, 90.4),
      ],
      now,
    )[0].count,
    4,
  );
});
test("anonymous projection excludes identity/history, named exposes only display name, validation rejects forged input", () => {
  const row = {
    _id: "123",
    ...point(23.812345, 90.412345),
    reporter: {
      _id: "secret-id",
      name: "Example",
      email: "private@example.test",
    },
    isAnonymous: true,
    history: [{ note: "private note" }],
    hidden: false,
  };
  const view = reportView(row);
  assert.equal(view.reporterName, "Anonymous");
  assert.equal(view.reporter, undefined);
  assert.equal(view.history, undefined);
  assert.equal(view.hidden, undefined);
  assert.equal(view.location.lat, 23.812);
  assert.equal(
    reportView({ ...row, isAnonymous: false }).reporterName,
    "Example",
  );
  assert.equal(reportView(row, true).reporter.email, "private@example.test");
  assert.equal(reportView(row, true).location.lat, 23.812345);
  assert.equal(
    reportInput.safeParse({
      ...row,
      occurredAt: new Date(Date.now() + 86400000).toISOString(),
      requestKey: crypto.randomUUID(),
    }).success,
    false,
  );
  assert.equal(
    resourceInput.safeParse({
      name: "test",
      type: "Hospital",
      phone: "javascript:alert(1)",
      address: "test",
      lat: null,
      lng: null,
      available24x7: false,
      isVerifiedInfo: false,
      sourceUrl: "",
    }).success,
    false,
  );
});
test("report and resource write endpoints require session; malformed public queries rejected before storage", async () => {
  for (const path of ["/reports/mine", "/reports/admin"])
    await request(app)
      .get("/api" + path)
      .expect(401);
  for (const path of ["/reports", "/resources"])
    await request(app)
      .post("/api" + path)
      .send({})
      .expect(401);
  await request(app)
    .patch("/api/reports/aaaaaaaaaaaaaaaaaaaaaaaa/status")
    .send({})
    .expect(401);
  await request(app)
    .put("/api/resources/aaaaaaaaaaaaaaaaaaaaaaaa")
    .send({})
    .expect(401);
  await request(app)
    .delete("/api/resources/aaaaaaaaaaaaaaaaaaaaaaaa")
    .expect(401);
  for (const path of [
    "/reports?category=invalid",
    "/reports?page=0",
    "/reports/nope",
    "/resources?lat=23",
    "/resources?type=invalid",
    "/zones/unsafe?demo=oops",
  ])
    await request(app)
      .get("/api" + path)
      .expect(400);
});
