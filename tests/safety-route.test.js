import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import request from "supertest";
import { safety } from "../server/safety.js";
import { SafetyReport } from "../server/safety-models.js";
process.env.NODE_ENV = "test";
test("actual report routes: creation stores actor, duplicate retries, anonymous public response, orphan privacy", async (t) => {
  const app = express();
  app.use(express.json());
  const user = {
    _id: "111111111111111111111111",
    name: "Reporter",
    email: "private@test.example",
  };
  app.use((req, res, next) => {
    if (req.get("Test-Session")) {
      req.user = user;
      req.session = { csrfToken: "test" };
    }
    next();
  });
  app.use("/api", safety);
  app.use((e, req, res, next) =>
    res.status(e.status || 500).json({ error: e.message }),
  );
  let stored = null;
  const chain = (value) => ({ select: () => ({ populate: () => ({ lean: async () => value }) }) });
  t.mock.method(SafetyReport, "findOne", () => chain(stored));
  t.mock.method(SafetyReport, "create", async (data) => {
    assert.equal(data.reporter, user._id);
    assert.equal(data.status, undefined);
    assert.equal(data.isDemo, undefined);
    stored = {
      ...data,
      _id: "222222222222222222222222",
      reporter: user,
      status: "pending",
      isDemo: false,
      hidden: false,
    };
    return stored;
  });
  t.mock.method(SafetyReport, "findById", () => chain(stored));
  const payload = {
    category: "Harassment",
    description: "A fictional concern near a public landmark.",
    location: { address: "Demo landmark", lat: 23.812345, lng: 90.412345 },
    occurredAt: new Date(Date.now() - 60000).toISOString(),
    isAnonymous: true,
    requestKey: crypto.randomUUID(),
    status: "resolved",
    reporter: "spoofed",
    isDemo: true,
  };
  const send = () =>
    request(app)
      .post("/api/reports")
      .set("Test-Session", "yes")
      .set("X-CSRF-Token", "test")
      .send(payload);
  const created = await send();
  assert.equal(created.status, 201, JSON.stringify(created.body));
  assert.equal(created.body.history.length, 1);
  assert.equal((await send()).status, 200);
  const publicView = (
    await request(app)
      .get("/api/reports/" + stored._id)
      .expect(200)
  ).body;
  assert.equal(publicView.reporter, undefined);
  assert.equal(publicView.history, undefined);
  assert.equal(publicView.reporterName, "Anonymous");
  stored.reporter = null;
  stored.hidden = true;
  await request(app)
    .get("/api/reports/" + stored._id)
    .expect(404);
});
