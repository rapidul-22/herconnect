import { mockRoadProvider } from "./helpers/road-provider.js";
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import request from "supertest";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import { app } from "../server/app.js";
import { User, initModels } from "../server/models.js";
import {
  DriverProfile as Profile,
  TransportSeat as Seat,
  TransportRide as Ride,
  initTransportModels,
} from "../server/transport-models.js";
process.env.NODE_ENV = "test";
let repl, p1, p2, driver, moderator, profile;
async function account(name) {
  const agent = request.agent(app),
    r = await agent
      .post("/api/auth/signup")
      .send({
        name,
        email: name + "@herconnect.demo",
        phone: "01712345678",
        password: "LongTestPassword123!",
      })
      .expect(201);
  return { agent, user: r.body.user, csrf: r.body.csrfToken };
}
const write = (a, m, p, b) =>
  a.agent[m]("/api/transport" + p)
    .set("X-CSRF-Token", a.csrf)
    .send(b);
const payload = () => ({
  pickup: { lat: 23.81, lng: 90.41, address: "Pickup landmark" },
  dropoff: { lat: 23.82, lng: 90.41, address: "Dropoff landmark" },
  vehicleType: "Car",
  requestKey: crypto.randomUUID(),
  fare: 1,
  quotedFare: 14000,
});
const online = () =>
  write(driver, "patch", "/driver/online", {
    online: true,
    location: { lat: 23.8101, lng: 90.41 },
    source: "geolocation",
  }).expect(200);
before(async () => {
  repl = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(repl.getUri("transport_tests"));
  await initModels();
  await initTransportModels();
  p1 = await account("PassengerOne");
  p2 = await account("PassengerTwo");
  driver = await account("Driver");
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
test("driver approval, concurrent matching, cross-role lock, private tracking, panic, completion, review, timeout and suspension", async (t) => {
  mockRoadProvider(t);
  await write(driver, "put", "/driver", {
    displayName: "Test Driver",
    bio: "Fictional driving service for integration testing.",
    vehicleType: "Car",
    vehicleNumber: "DEMO-123",
    licenseNumber: "PRIVATE-LICENCE",
    status: "approved",
  }).expect(200);
  profile = (await driver.agent.get("/api/transport/driver")).body.profile;
  assert.equal(profile.status, "pending");
  await write(driver, "patch", "/driver/online", {
    online: true,
    location: { lat: 23.81, lng: 90.41 },
  }).expect(403);
  await write(p1, "patch", "/admin/drivers/" + profile._id, {
    status: "approved",
    reason: "Test approval",
    expectedVersion: 1,
  }).expect(403);
  await write(moderator, "patch", "/admin/drivers/" + profile._id, {
    status: "approved",
    reason: "Application checked for the test.",
    expectedVersion: 1,
  }).expect(200);
  const pub = (await p1.agent.get("/api/transport/drivers/" + profile._id))
    .body;
  assert.equal(pub.licenseNumber, undefined);
  assert.equal(pub.currentLocation, undefined);
  assert.equal(pub.user, undefined);
  await online();
  await write(driver, "patch", "/driver/location", {
    lat: 23.81,
    lng: 90.41,
    source: "demo",
  }).expect(403);
  const self = (await write(driver, "post", "/rides", payload()).expect(201))
    .body;
  assert.equal(self.status, "no_driver_available");
  const race = await Promise.all([
    write(p1, "post", "/rides", payload()),
    write(p2, "post", "/rides", payload()),
  ]);
  race.forEach((r) => assert.equal(r.status, 201, JSON.stringify(r.body)));
  assert.deepEqual(race.map((r) => r.body.status).sort(), [
    "no_driver_available",
    "requested",
  ]);
  const index = race.findIndex((r) => r.body.status === "requested"),
    passenger = [p1, p2][index],
    other = [p1, p2][1 - index],
    ride = race[index].body;
  assert.equal(ride.fare, 14000);
  assert.equal(ride.driverLiveLocation, undefined);
  assert.equal(await Seat.countDocuments({ ride: ride._id }), 2);
  await write(driver, "post", "/rides", payload()).expect(409);
  await write(passenger, "post", "/rides", payload()).expect(409);
  await write(driver, "patch", "/driver/online", {
    online: true,
    location: { lat: 23.81, lng: 90.41 },
  }).expect(409);
  await write(driver, "put", "/driver", {
    displayName: "Changed Driver",
    bio: "Fictional driving service for integration testing.",
    vehicleType: "Car",
    vehicleNumber: "DEMO-123",
    licenseNumber: "PRIVATE-LICENCE",
  }).expect(409);
  await other.agent.get("/api/transport/rides/" + ride._id).expect(404);
  await write(passenger, "patch", "/rides/" + ride._id + "/status", {
    status: "accepted",
  }).expect(409);
  await write(driver, "patch", "/rides/" + ride._id + "/status", {
    status: "accepted",
  }).expect(200);
  await write(driver, "patch", "/driver/location", {
    lat: 23.812,
    lng: 90.413,
    source: "geolocation",
  }).expect(200);
  const tracked = (
    await passenger.agent.get("/api/transport/rides/" + ride._id)
  ).body;
  assert.equal(tracked.driverLiveLocation.lat, 23.812);
  assert.equal(tracked.locationStale, false);
  await write(passenger, "put", "/contact", {
    name: "Trusted Contact",
    phone: "01712345678",
  }).expect(200);
  assert.equal(
    (await driver.agent.get("/api/transport/contact")).body.name,
    "",
  );
  const alert = (
    await write(passenger, "post", "/rides/" + ride._id + "/panic", {
      source: "pickup",
    }).expect(201)
  ).body;
  assert.equal(alert.location.lat, ride.pickup.lat);
  await write(other, "post", "/rides/" + ride._id + "/panic", {
    source: "pickup",
  }).expect(404);
  await write(driver, "patch", "/alerts/" + alert._id + "/resolve", {
    note: "Cannot resolve another persons alert.",
  }).expect(404);
  const adminAlerts = (await moderator.agent.get("/api/transport/admin/alerts"))
    .body;
  assert.equal(adminAlerts.total, 1);
  await write(passenger, "post", "/rides/" + ride._id + "/review", {
    rating: 5,
  }).expect(403);
  await write(driver, "patch", "/rides/" + ride._id + "/status", {
    status: "completed",
  }).expect(409);
  await write(driver, "patch", "/rides/" + ride._id + "/status", {
    status: "ongoing",
  }).expect(200);
  await write(driver, "patch", "/rides/" + ride._id + "/status", {
    status: "completed",
  }).expect(200);
  assert.equal(await Seat.countDocuments({ ride: ride._id }), 0);
  assert.equal((await Profile.findById(profile._id)).online, true);
  const done = (await passenger.agent.get("/api/transport/rides/" + ride._id))
    .body;
  assert.equal(done.driverLiveLocation, undefined);
  assert.equal(done.alerts[0].status, "active");
  await write(moderator, "patch", "/alerts/" + alert._id + "/resolve", {
    note: "Reviewed the classroom alert.",
  }).expect(200);
  await write(passenger, "post", "/rides/" + ride._id + "/review", {
    rating: 5,
    comment: "Fictional completed journey.",
  }).expect(201);
  await write(passenger, "post", "/rides/" + ride._id + "/review", {
    rating: 4,
  }).expect(409);
  assert.equal(
    (await p1.agent.get("/api/transport/drivers/" + profile._id)).body
      .rating,
    5,
  );
  await write(passenger, "post", "/rides/" + ride._id + "/panic", {
    source: "pickup",
  }).expect(409);
  const nextPayload = payload(),
    next = (await write(passenger, "post", "/rides", nextPayload).expect(201))
      .body;
  assert.equal(
    (await write(passenger, "post", "/rides", nextPayload).expect(200)).body
      ._id,
    next._id,
  );
  await Ride.updateOne(
    { _id: next._id },
    { $set: { expiresAt: new Date(Date.now() - 1000) } },
  );
  const expired = (
    await passenger.agent.get("/api/transport/rides/" + next._id)
  ).body;
  assert.equal(expired.status, "no_driver_available");
  assert.equal(await Seat.countDocuments({ ride: next._id }), 0);
  assert.equal((await Profile.findById(profile._id)).online, false);
  await online();
  await Profile.updateOne(
    { _id: profile._id },
    { $set: { "currentLocation.updatedAt": new Date(Date.now() - 91000) } },
  );
  assert.equal(
    (await write(passenger, "post", "/rides", payload()).expect(201)).body
      .status,
    "no_driver_available",
  );
  await online();
  const last = (await write(passenger, "post", "/rides", payload()).expect(201))
    .body;
  const p = await Profile.findById(profile._id);
  await write(moderator, "patch", "/admin/drivers/" + profile._id, {
    status: "suspended",
    reason: "Test manual suspension.",
    expectedVersion: p.history.length,
  }).expect(200);
  await write(driver, "patch", "/rides/" + last._id + "/status", {
    status: "accepted",
  }).expect(409);
  await write(passenger, "patch", "/rides/" + last._id + "/status", {
    status: "cancelled",
    reason: "Driver is no longer available.",
  }).expect(200);
  assert.equal((await Profile.findById(profile._id)).online, false);
  await p1.agent
    .get("/api/transport/drivers/" + profile._id)
    .expect(404);
});
