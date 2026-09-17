import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import request from "supertest";
import { app } from "../server/app.js";
import { User, initModels } from "../server/models.js";
import { SafetyReport, initSafetyModels } from "../server/safety-models.js";
process.env.NODE_ENV = "test";
let repl, reporter, other, moderator;
async function account(name) {
  const agent = request.agent(app);
  const r = await agent
    .post("/api/auth/signup")
    .send({
      name,
      email: name + "@test.example",
      password: "LongTestPassword123!",
      phone: "01712345678",
    })
    .expect(201);
  return { agent, user: r.body.user, csrf: r.body.csrfToken };
}
const write = (a, method, path, body) =>
  a.agent[method]("/api" + path)
    .set("X-CSRF-Token", a.csrf)
    .send(body);
before(async () => {
  repl = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(repl.getUri("safety_tests"));
  await initModels();
  await initSafetyModels();
  reporter = await account("Reporter");
  other = await account("Other");
  moderator = await account("Moderator");
  await User.updateOne(
    { _id: moderator.user._id },
    { $set: { isAdmin: true } },
  );
});
after(async () => {
  await mongoose.disconnect();
  await repl?.stop();
});
test("report creation, public privacy, owner access, retry, moderation, real/demo clusters and resource administration", async () => {
  const body = {
    category: "Harassment",
    description:
      "A fictional integration-test incident near a public landmark.",
    location: { address: "Test landmark", lat: 23.812345, lng: 90.412345 },
    occurredAt: new Date(Date.now() - 3600000).toISOString(),
    isAnonymous: true,
    requestKey: randomUUID(),
    status: "resolved",
    reporter: other.user._id,
    isDemo: true,
  };
  await reporter.agent.post("/api/reports").send(body).expect(403);
  const result = await write(reporter, "post", "/reports", body);
  assert.equal(result.status, 201, JSON.stringify(result.body));
  const r = result.body;
  assert.equal(r.status, "pending");
  assert.equal(r.isDemo, false);
  assert.equal(r.reporter._id, reporter.user._id);
  assert.equal(
    (await write(reporter, "post", "/reports", body).expect(200)).body._id,
    r._id,
  );
  const publicReport = (
    await request(app)
      .get("/api/reports/" + r._id)
      .expect(200)
  ).body;
  assert.equal(publicReport.reporter, undefined);
  assert.equal(publicReport.history, undefined);
  assert.equal(publicReport.reporterName, "Anonymous");
  assert.equal(publicReport.location.lat, 23.812);
  assert.equal(
    (await other.agent.get("/api/reports/" + r._id)).body.reporter,
    undefined,
  );
  assert.equal(
    (await reporter.agent.get("/api/reports/" + r._id)).body.location.lat,
    body.location.lat,
  );
  assert.equal((await reporter.agent.get("/api/reports/mine")).body.total, 1);
  assert.equal((await other.agent.get("/api/reports/mine")).body.total, 0);
  const decision = {
    status: "reviewed",
    hidden: false,
    note: "Checked the report for platform policy.",
    expectedVersion: 1,
  };
  await write(other, "patch", "/reports/" + r._id + "/status", decision).expect(
    403,
  );
  await other.agent.get("/api/reports/admin").expect(403);
  await write(moderator, "patch", "/reports/" + r._id + "/status", {
    ...decision,
    status: "resolved",
  }).expect(409);
  const races = await Promise.all([
    write(moderator, "patch", "/reports/" + r._id + "/status", decision),
    write(moderator, "patch", "/reports/" + r._id + "/status", decision),
  ]);
  assert.deepEqual(races.map((r) => r.status).sort(), [200, 409]);
  await write(moderator, "patch", "/reports/" + r._id + "/status", {
    status: "resolved",
    hidden: true,
    note: "Removed identifying text from public access.",
    expectedVersion: 2,
  }).expect(200);
  await request(app)
    .get("/api/reports/" + r._id)
    .expect(404);
  await other.agent.get("/api/reports/" + r._id).expect(404);
  await reporter.agent.get("/api/reports/" + r._id).expect(200);
  assert.equal((await request(app).get("/api/reports")).body.total, 0);
  assert.equal(
    (await request(app).get("/api/zones/unsafe")).body.sampleSize,
    0,
  );
  assert.equal(
    (await moderator.agent.get("/api/reports/admin")).body.reports[0].reporter
      .email,
    reporter.user.email,
  );
  for (let i = 0; i < 3; i++)
    await write(reporter, "post", "/reports", {
      ...body,
      requestKey: randomUUID(),
      isAnonymous: i !== 0,
      location: { ...body.location, lat: 23.812 + i * 0.0002 },
    }).expect(201);
  const feed = (await request(app).get("/api/reports?area=Test")).body;
  assert.equal(feed.total, 3);
  assert.ok(feed.reports.some((r) => r.reporterName === "Reporter"));
  assert.ok(
    feed.reports.every(
      (r) => r.reporter === undefined && r.history === undefined,
    ),
  );
  assert.equal(
    (await request(app).get("/api/zones/unsafe")).body.zones[0].count,
    3,
  );
  await SafetyReport.create({
    ...body,
    reporter: reporter.user._id,
    requestKey: randomUUID(),
    isDemo: true,
  });
  assert.equal(
    (await request(app).get("/api/zones/unsafe")).body.sampleSize,
    3,
  );
  assert.equal(
    (await request(app).get("/api/zones/unsafe?demo=true")).body.sampleSize,
    1,
  );
  const resource = {
    name: "Test facility",
    type: "Hospital",
    phone: "",
    address: "Fictional test location",
    lat: 23.81,
    lng: 90.41,
    available24x7: false,
    isVerifiedInfo: false,
    sourceUrl: "",
  };
  await write(other, "post", "/resources", resource).expect(403);
  await write(moderator, "post", "/resources", {
    ...resource,
    isVerifiedInfo: true,
  }).expect(400);
  const entry = (
    await write(moderator, "post", "/resources", resource).expect(201)
  ).body;
  const list = (
    await request(app).get("/api/resources?lat=23.81&lng=90.41&type=Hospital")
  ).body;
  assert.equal(list.resources[0].distanceKm, 0);
  await write(moderator, "put", "/resources/" + entry._id, {
    ...resource,
    name: "Updated test facility",
  }).expect(200);
  await write(other, "delete", "/resources/" + entry._id).expect(403);
  await write(moderator, "delete", "/resources/" + entry._id).expect(200);
  assert.equal(
    (await request(app).get("/api/resources")).body.resources.length,
    0,
  );
});
