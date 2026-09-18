import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import express from "express";
import { app } from "../server/app.js";
import {
  transport,
  rideInput,
  driverInput,
  rideView,
} from "../server/transport.js";
import {
  fareQuote,
  nearestDrivers,
  canRideTransition,
  locationFresh,
} from "../shared/transport.js";
const now = Date.parse("2026-09-15T00:00:00Z"),
  a = { lat: 23.81, lng: 90.41 },
  b = { lat: 23.82, lng: 90.41 };
test("transport matching excludes stale, unavailable and distant drivers and orders by actual distance", () => {
  const p = (_id, lat, extra = {}) => ({
    _id,
    status: "approved",
    online: true,
    activeRide: null,
    currentLocation: { lat, lng: 90.41, updatedAt: new Date(now) },
    ...extra,
  });
  const drivers = [
    p("far", 23.84),
    p("near", 23.811),
    p("stale", 23.81, {
      currentLocation: { ...a, updatedAt: new Date(now - 90001) },
    }),
    p("busy", 23.81, { activeRide: "ride" }),
    p("offline", 23.81, { online: false }),
    p("pending", 23.81, { status: "pending" }),
    p("outside", 24),
  ];
  assert.deepEqual(
    nearestDrivers(drivers, a, now).map((p) => p._id),
    ["near", "far"],
  );
  assert.equal(
    locationFresh({ ...a, updatedAt: new Date(now - 90000) }, now),
    true,
  );
  assert.equal(
    locationFresh({ ...a, updatedAt: new Date(now + 1) }, now),
    false,
  );
});
test("fare, role transitions, location privacy and strict request validation", () => {
  assert.deepEqual(fareQuote(a, b, "Car"), { distanceKm: 1.11, fare: 11300 });
  assert.throws(() => fareQuote(a, a, "Car"));
  assert.throws(() => fareQuote(a, { lat: 25, lng: 91 }, "Car"));
  const ride = {
    passenger: "p",
    driver: "d",
    status: "requested",
    driverLiveLocation: { ...a, updatedAt: new Date() },
    requestKey: "private",
  };
  assert.equal(canRideTransition(ride, "p", "accepted"), false);
  assert.equal(canRideTransition(ride, "d", "accepted"), true);
  assert.equal(canRideTransition(ride, "d", "completed"), false);
  assert.equal(
    canRideTransition({ ...ride, status: "ongoing" }, "d", "completed"),
    true,
  );
  assert.equal(
    canRideTransition({ ...ride, status: "ongoing" }, "p", "cancelled"),
    true,
  );
  assert.equal(
    canRideTransition({ ...ride, status: "completed" }, "p", "cancelled"),
    false,
  );
  assert.equal(canRideTransition(ride, "other", "cancelled"), false);
  assert.equal(rideView(ride).driverLiveLocation, undefined);
  assert.equal(
    rideView({ ...ride, status: "accepted" }).driverLiveLocation.lat,
    a.lat,
  );
  assert.equal(
    rideView({ ...ride, status: "completed" }).driverLiveLocation,
    undefined,
  );
  assert.equal(rideView(ride).requestKey, undefined);
  assert.equal(driverInput.safeParse({}).success, false);
  assert.equal(
    rideInput.safeParse({ pickup: { lat: 0, lng: 0 } }).success,
    false,
  );
});
test("transport endpoint guards and actual estimate route reject spoofed fare and invalid points", async () => {
  for (const p of [
    "/driver",
    "/contact",
    "/rides",
    "/admin/drivers",
    "/admin/alerts",
  ])
    await request(app)
      .get("/api/transport" + p)
      .expect(401);
  for (const p of [
    "/estimate",
    "/rides",
    "/rides/aaaaaaaaaaaaaaaaaaaaaaaa/panic",
  ])
    await request(app)
      .post("/api/transport" + p)
      .send({})
      .expect(401);
  await request(app)
    .get("/api/transport/drivers?vehicleType=Plane")
    .expect(400);
  await request(app).get("/api/transport/drivers/nope").expect(400);
  const isolated = express();
  isolated.use(express.json(), (req, res, next) => {
    req.user = { _id: "member" };
    req.session = { csrfToken: "token" };
    next();
  });
  isolated.use(transport);
  isolated.use((e, req, res, next) =>
    res.status(e.status || 400).json({ error: e.message }),
  );
  const res = await request(isolated)
    .post("/estimate")
    .set("X-CSRF-Token", "token")
    .send({
      pickup: { ...a, address: "Pickup" },
      dropoff: { ...b, address: "Dropoff" },
      vehicleType: "Car",
      fare: 1,
    })
    .expect(200);
  assert.equal(res.body.fare, 11300);
  await request(isolated).post("/estimate").send({}).expect(403);
  await request(isolated)
    .post("/estimate")
    .set("X-CSRF-Token", "token")
    .send({
      pickup: { ...a, address: "Pickup" },
      dropoff: { ...a, address: "Dropoff" },
      vehicleType: "Car",
    })
    .expect(400);
});
