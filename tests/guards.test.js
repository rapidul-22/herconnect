import { test } from "node:test";
import request from "supertest";
import assert from "node:assert/strict";
import { app } from "../server/app.js";
process.env.NODE_ENV = "test";
test("unauthenticated requests cannot reach private actions", async () => {
  for (const path of [
    "/orders",
    "/wishlist",
    "/seller/products",
    "/admin/sellers",
    "/admin/products",
    "/admin/audits",
  ])
    await request(app)
      .get("/api" + path)
      .expect(401);
  await request(app).post("/api/seller/uploads").expect(401);
});
test("cross-origin writes blocked before login", async () => {
  await request(app)
    .post("/api/auth/login")
    .set("Origin", "https://attacker.example")
    .send({ email: "a@example.com", password: "anything" })
    .expect(403);
  await request(app)
    .post("/api/auth/login")
    .set("Sec-Fetch-Site", "cross-site")
    .send({})
    .expect(403);
});
test("invalid input is rejected before database access", async () => {
  const result = await request(app)
    .post("/api/auth/signup")
    .send({ name: "A", email: "invalid", password: "short", phone: "123" })
    .expect(400);
  assert.ok(result.body.error);
  assert.equal(result.body.stack, undefined);
  await request(app)
    .post("/api/auth/login")
    .send({ email: { $ne: null }, password: "x" })
    .expect(400);
  await request(app)
    .post("/api/auth/reset-password")
    .send({ token: "invalid", password: "LongEnoughPassword!" })
    .expect(400);
  await request(app)
    .post("/api/auth/login")
    .set("Content-Type", "application/json")
    .send("{")
    .expect(400);
});
test("health and API errors are JSON with secure response headers", async () => {
  const health = await request(app).get("/api/health").expect(503);
  assert.equal(health.body.ready, false);
  assert.equal(health.headers["x-content-type-options"], "nosniff");
  assert.equal(health.headers["x-powered-by"], undefined);
  await request(app)
    .get("/api/not-a-route")
    .expect(404)
    .expect("Content-Type", /json/);
});
