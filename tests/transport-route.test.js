import { mockRoadProvider } from "./helpers/road-provider.js";
import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import request from "supertest";
import mongoose from "mongoose";
import { transport } from "../server/transport.js";
import {
  DriverProfile as Profile,
  TransportSeat as Seat,
  TransportRide as Ride,
} from "../server/transport-models.js";
process.env.NODE_ENV = "test";
test("actual ride creation route chooses nearest profile, snapshots server fare and preserves retry identity (mock storage)", async (t) => {
  mockRoadProvider(t);
  const user = "111111111111111111111111",
    driver = "222222222222222222222222";
  let stored = null,
    claimed = null;
  const candidates = [
    {
      _id: "444444444444444444444444",
      user: "555555555555555555555555",
      status: "approved",
      online: true,
      activeRide: null,
      currentLocation: { lat: 23.85, lng: 90.41, updatedAt: new Date() },
    },
    {
      _id: "333333333333333333333333",
      user,
      status: "approved",
      online: true,
      activeRide: null,
      currentLocation: { lat: 23.811, lng: 90.41, updatedAt: new Date() },
      displayName: "Nearest driver",
      vehicleNumber: "DEMO-1",
    },
  ];
  candidates[1].user = driver;
  const chain = (value) => {
    const c = { lean: async () => value };
    c.session = () => c;
    c.select = () => c;
    c.limit = () => c;
    c.then = (resolve, reject) => Promise.resolve(value).then(resolve, reject);
    return c;
  };
  t.mock.method(mongoose.connection, "transaction", (fn) => fn({}));
  t.mock.method(Seat, "updateOne", async () => ({}));
  t.mock.method(Seat, "findOneAndUpdate", (filter) =>
    chain({ _id: "seat", ...filter }),
  );
  t.mock.method(Ride, "find", () => chain([]));
  t.mock.method(Ride, "findOne", () => chain(stored));
  t.mock.method(Ride, "create", async (rows) => {
    stored = { ...rows[0] };
    return [{ toObject: () => stored }];
  });
  t.mock.method(Profile, "find", (filter) => {
    assert.equal(filter.user.$ne, user);
    assert.equal(filter.isDemo, false);
    return chain(candidates);
  });
  t.mock.method(Profile, "findOneAndUpdate", (filter) => {
    claimed = filter._id;
    return chain(candidates.find((p) => p._id === filter._id));
  });
  const app = express();
  app.use(express.json(), (req, res, next) => {
    req.user = { _id: user, name: "Passenger" };
    req.session = { csrfToken: "token" };
    next();
  });
  app.use(transport);
  app.use((e, req, res, next) =>
    res.status(e.status || 500).json({ error: e.message }),
  );
  const payload = {
    pickup: { lat: 23.81, lng: 90.41, address: "Pickup landmark" },
    dropoff: { lat: 23.82, lng: 90.41, address: "Dropoff landmark" },
    vehicleType: "Car",
    requestKey: crypto.randomUUID(),
    fare: 1,
    quotedFare: 14000,
    driver: "spoofed",
    status: "completed",
  };
  const send = () =>
    request(app).post("/rides").set("X-CSRF-Token", "token").send(payload);
  const r = await send();
  assert.equal(r.status, 201, JSON.stringify(r.body));
  assert.equal(claimed, candidates[1]._id);
  assert.equal(r.body.fare, 14000);
  assert.equal(r.body.driver, driver);
  assert.equal(r.body.status, "requested");
  assert.equal(r.body.driverLiveLocation, undefined);
  assert.ok(stored.expiresAt > Date.now());
  const retry = await send();
  assert.equal(retry.status, 200);
  assert.equal(retry.body._id, r.body._id);
});
