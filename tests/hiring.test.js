import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { app } from "../server/app.js";
import {
  slot,
  fitsAvailability,
  canTransition,
  bookingInput,
  profileInput,
} from "../server/hiring-rules.js";
const now = Date.parse("2026-09-14T00:00:00Z");
test("Bangladesh time, duration, availability and transition boundaries", () => {
  const s = slot("2026-09-15T10:00", "2026-09-15T12:00", now);
  assert.equal(s.startAt.toISOString(), "2026-09-15T04:00:00.000Z");
  assert.equal(s.hours, 2);
  for (const [a, b] of [
    ["2026-02-30T10:00", "2026-02-30T12:00"],
    ["2026-09-13T10:00", "2026-09-13T12:00"],
    ["2026-09-15T12:00", "2026-09-15T10:00"],
    ["2026-09-15T23:00", "2026-09-16T01:00"],
    ["2026-09-15T10:00", "2026-09-15T19:00"],
  ])
    assert.throws(() => slot(a, b, now));
  const p = { available: true, weekdays: [2], dayStart: 600, dayEnd: 720 };
  assert.equal(fitsAvailability(p, s.startAt, s.endAt), true);
  assert.equal(
    fitsAvailability({ ...p, available: false }, s.startAt, s.endAt),
    false,
  );
  assert.equal(
    fitsAvailability({ ...p, weekdays: [1] }, s.startAt, s.endAt),
    false,
  );
  const b = { customer: "customer", worker: "worker", status: "pending", ...s };
  assert.equal(canTransition(b, "customer", "accepted", now), false);
  assert.equal(canTransition(b, "worker", "accepted", now), true);
  assert.equal(
    canTransition({ ...b, status: "accepted" }, "customer", "completed", now),
    false,
  );
  assert.equal(
    canTransition(
      { ...b, status: "accepted" },
      "customer",
      "completed",
      +s.endAt,
    ),
    true,
  );
  assert.equal(
    canTransition(
      { ...b, status: "completed" },
      "customer",
      "cancelled",
      +s.endAt,
    ),
    false,
  );
  assert.equal(canTransition(b, "outsider", "cancelled", now), false);
});
test("hiring validates inputs and blocks private endpoints without a session", async () => {
  for (const path of [
    "/mine",
    "/bookings",
    "/complaints",
    "/admin/workers",
    "/admin/complaints",
  ])
    await request(app)
      .get("/api/hiring" + path)
      .expect(401);
  await request(app).post("/api/hiring/bookings").send({}).expect(401);
  await request(app).get("/api/hiring/workers?skill=Invalid").expect(401);
  await request(app).get("/api/hiring/workers/not-an-id").expect(401);
  assert.equal(profileInput.safeParse({}).success, false);
  assert.equal(
    bookingInput.safeParse({ start: "2026-09-15T10:15" }).success,
    false,
  );
});
