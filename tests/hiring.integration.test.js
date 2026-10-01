import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import request from "supertest";
import { app } from "../server/app.js";
import { User, initModels } from "../server/models.js";
import {
  WorkerProfile,
  WorkerBooking,
  initHiringModels,
} from "../server/hiring-models.js";
process.env.NODE_ENV = "test";
let repl, customer, other, worker, moderator;
async function account(name) {
  const agent = request.agent(app);
  const res = await agent
    .post("/api/auth/signup")
    .send({
      name,
      email: name + "@herconnect.demo",
      password: "LongTestPassword123!",
      phone: "01712345678",
    })
    .expect(201);
  return { agent, user: res.body.user, csrf: res.body.csrfToken };
}
const write = (a, method, path, body) =>
  a.agent[method]("/api/hiring" + path)
    .set("X-CSRF-Token", a.csrf)
    .send(body);
before(async () => {
  repl = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(repl.getUri("hiring_tests"));
  await initModels();
  await initHiringModels();
  customer = await account("Customer");
  other = await account("Other");
  worker = await account("Worker");
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
test("hiring approval, private booking, concurrency, cancellation, completion and reviews", async () => {
  assert.equal(
    (await worker.agent.get("/api/hiring/mine").expect(200)).body.profile,
    null,
  );
  const data = {
    displayName: "Test Worker",
    skills: ["Cleaning"],
    bio: "Reliable household cleaning for this integration test.",
    experienceYears: 3,
    hourlyRate: 20000,
    serviceArea: "Dhaka",
    available: true,
    weekdays: [0, 1, 2, 3, 4, 5, 6],
    dayStart: 0,
    dayEnd: 1440,
    status: "approved",
  };
  const profile = (await write(worker, "put", "/mine", data).expect(201)).body;
  assert.equal(profile.status, "pending");
  assert.equal((await customer.agent.get("/api/hiring/workers")).body.total, 0);
  await write(customer, "patch", "/admin/workers/" + profile._id, {
    status: "approved",
    reason: "Attempt",
  }).expect(403);
  await write(moderator, "patch", "/admin/workers/" + profile._id, {
    status: "approved",
    reason: "Application reviewed",
  }).expect(200);
  const publicProfile = (
    await customer.agent
      .get("/api/hiring/workers/" + profile._id)
      .expect(200)
  ).body;
  for (const key of ["user", "phone", "email", "reason", "scheduleVersion"])
    assert.equal(publicProfile[key], undefined);
  const day = new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10);
  const payload = {
    profileId: profile._id,
    service: "Cleaning",
    start: day + "T10:00",
    end: day + "T12:00",
    address: "Private home address, Dhaka",
    phone: "01712345678",
    notes: "Private instructions",
    requestKey: randomUUID(),
    total: 1,
  };
  await worker.agent.post("/api/hiring/bookings").send(payload).expect(403);
  await write(worker, "post", "/bookings", payload).expect(400);

const storedProfile = await WorkerProfile.findById(profile._id).lean();

const { slot, fitsAvailability } =
  await import("../server/hiring-rules.js");

const bookingSlot = slot(payload.start, payload.end);

console.log("AVAILABILITY DEBUG:", {
  requestedService: payload.service,
  storedSkills: storedProfile.skills,
  serviceMatches: storedProfile.skills.includes(payload.service),
  available: storedProfile.available,
  weekdays: storedProfile.weekdays,
  dayStart: storedProfile.dayStart,
  dayEnd: storedProfile.dayEnd,
  requestedStart: payload.start,
  requestedEnd: payload.end,
  calculatedStart: bookingSlot.startAt.toISOString(),
  calculatedEnd: bookingSlot.endAt.toISOString(),
  availabilityMatches: fitsAvailability(
    storedProfile,
    bookingSlot.startAt,
    bookingSlot.endAt
  ),
});

const bookingResponse = await write(
  customer,
  "post",
  "/bookings",
  payload
);

assert.equal(
  bookingResponse.status,
  201,
  "Booking creation failed: " + JSON.stringify(bookingResponse.body)
);

const b = bookingResponse.body;
  assert.equal(b.total, 40000);
  assert.equal(
    (await write(customer, "post", "/bookings", payload).expect(200)).body._id,
    b._id,
  );
  await other.agent.get("/api/hiring/bookings/" + b._id).expect(404);
  const hidden = (await worker.agent.get("/api/hiring/bookings/" + b._id)).body;
  assert.equal(hidden.address, undefined);
  assert.equal(hidden.phone, undefined);
  assert.equal(hidden.notes, undefined);
  await write(customer, "patch", "/bookings/" + b._id, {
    status: "accepted",
  }).expect(409);
  const second = (
    await write(other, "post", "/bookings", {
      ...payload,
      requestKey: randomUUID(),
    }).expect(201)
  ).body;
  const concurrent = await Promise.all(
    [b, second].map((x) =>
      write(worker, "patch", "/bookings/" + x._id, { status: "accepted" }),
    ),
  );
  assert.deepEqual(concurrent.map((r) => r.status).sort(), [200, 409]);
  const accepted = concurrent[0].status === 200 ? b : second;
  const pending = accepted._id === b._id ? second : b;
  const acceptedCustomer = accepted._id === b._id ? customer : other;
  const visible = (
    await worker.agent.get("/api/hiring/bookings/" + accepted._id)
  ).body;
  assert.equal(visible.address, payload.address);
  await write(acceptedCustomer, "patch", "/bookings/" + accepted._id, {
    status: "completed",
  }).expect(409);
  await write(
    acceptedCustomer,
    "post",
    "/bookings/" + accepted._id + "/review",
    { rating: 5, comment: "Too early" },
  ).expect(403);
  await write(acceptedCustomer, "patch", "/bookings/" + accepted._id, {
    status: "cancelled",
    reason: "Changed plans",
  }).expect(200);
  await write(worker, "patch", "/bookings/" + pending._id, {
    status: "accepted",
  }).expect(200);
  // Test fixture advances the accepted booking into the past; production cannot bypass time checks.
  await WorkerBooking.updateOne(
    { _id: pending._id },
    {
      $set: {
        startAt: new Date(Date.now() - 7200000),
        endAt: new Date(Date.now() - 3600000),
      },
    },
  );
  const pendingCustomer = pending._id === b._id ? customer : other;
  await write(worker, "patch", "/bookings/" + pending._id, {
    status: "completed",
  }).expect(409);
  await write(pendingCustomer, "patch", "/bookings/" + pending._id, {
    status: "completed",
  }).expect(200);
  await write(pendingCustomer, "post", "/bookings/" + pending._id + "/review", {
    rating: 5,
    comment: "Completed service",
  }).expect(201);
  await write(pendingCustomer, "post", "/bookings/" + pending._id + "/review", {
    rating: 4,
  }).expect(409);
  const complaint = (
    await write(
      pendingCustomer,
      "post",
      "/bookings/" + pending._id + "/complaint",
      { reason: "Other", details: "A private concern for moderator review." },
    ).expect(201)
  ).body;
  await write(
    pendingCustomer,
    "post",
    "/bookings/" + pending._id + "/complaint",
    { reason: "Other", details: "Duplicate complaint must be blocked." },
  ).expect(409);
  await write(moderator, "patch", "/admin/complaints/" + complaint._id, {
    status: "resolved",
    adminNote: "Reviewed with both parties.",
  }).expect(200);
  await customer.agent.get("/api/hiring/admin/complaints").expect(403);
  assert.equal(
    (await WorkerProfile.findById(profile._id)).status,
    "approved",
    "No automatic complaint suspension",
  );
  await write(moderator, "patch", "/admin/workers/" + profile._id, {
    status: "suspended",
    reason: "Manual moderation decision",
  }).expect(200);
  await customer.agent
    .get("/api/hiring/workers/" + profile._id)
    .expect(404);
  await write(worker, "put", "/mine", data).expect(403);
});
