import { Router } from "express";
import mongoose from "mongoose";
import { z } from "zod";
import { rateLimit } from "express-rate-limit";
import { requireAuth, member, admin, fail } from "./auth.js";
import { User } from "./models.js";
import {
  DriverProfile as Profile,
  TransportSeat as Seat,
  TransportRide as Ride,
  TransportAlert as Alert,
  DriverReview as Review,
  TransportContact as Contact,
} from "./transport-models.js";
import {
  availableVehicleTypes as vehicleTypes,
  activeRideStatuses,
  nearestDrivers,
  locationFresh,
  canRideTransition,
} from "../shared/transport.js";
import { roadQuote, addressSuggestions } from "./transport-routing.js";
export const transport = Router();
const id = z.string().regex(/^[a-f0-9]{24}$/i, "Invalid record ID.");
const text = (min, max) => z.string().trim().min(min).max(max);
export const transportPoint = z.object({
  lat: z.number().min(20).max(27),
  lng: z.number().min(88).max(93),
});
const place = transportPoint.extend({ address: text(3, 160) });
export const rideInput = z.object({
  pickup: place,
  dropoff: place,
  vehicleType: z.enum(vehicleTypes),
  requestKey: z.uuid(),
  demo: z.boolean().default(false),
  quotedFare: z.number().int().nonnegative().optional(),
});
export const driverInput = z.object({
  displayName: text(2, 80),
  bio: text(20, 1200),
  vehicleType: z.enum(vehicleTypes),
  vehicleNumber: text(3, 50),
  licenseNumber: text(3, 80),
});
const same = (a, b) => !!a && !!b && String(a) === String(b);
const publicFields = "_id displayName bio vehicleType isDemo";
const pageInput = z.coerce.number().int().min(1).max(10000).default(1);
const tx = (fn) => mongoose.connection.transaction(fn);
export function rideView(r) {
  const { driverLiveLocation, requestKey, ...rest } = r;
  return {
    ...rest,
    ...(["accepted", "ongoing"].includes(r.status)
      ? {
          driverLiveLocation,
          locationStale: !locationFresh(driverLiveLocation),
        }
      : {}),
  };
}
async function ensureSeat(user) {
  try {
    await Seat.updateOne(
      { user },
      { $setOnInsert: { ride: null } },
      { upsert: true },
    );
  } catch (e) {
    if (e.code !== 11000) throw e;
  }
}
async function ratings(rows) {
  const stats = await Review.aggregate([
    { $match: { profile: { $in: rows.map((r) => r._id) } } },
    {
      $group: {
        _id: "$profile",
        rating: { $avg: "$rating" },
        reviewCount: { $sum: 1 },
      },
    },
  ]);
  return rows.map((p) => {
    const s = stats.find((s) => same(s._id, p._id));
    return { ...p, rating: s?.rating || 0, reviewCount: s?.reviewCount || 0 };
  });
}
async function finish(r, status, reason, actor, session, forceOffline = false) {
  await Ride.updateOne(
    { _id: r._id, status: r.status },
    {
      $set: { status },
      $push: { history: { status, reason, actor, at: new Date() } },
    },
    { session },
  );
  await Seat.updateMany({ ride: r._id }, { $set: { ride: null } }, { session });
  if (r.profile) {
    const p = await Profile.findById(r.profile).session(session).lean();
    await Profile.updateOne(
      { _id: r.profile, activeRide: r._id },
      {
        $set: {
          activeRide: null,
          online:
            !forceOffline &&
            p?.status === "approved" &&
            locationFresh(p.currentLocation),
        },
      },
      { session },
    );
  }
}
export async function expireTransportRequests() {
  const expired = await Ride.find({
    status: "requested",
    expiresAt: { $lte: new Date() },
  })
    .limit(100)
    .select("_id")
    .lean();
  for (const x of expired)
    await tx(async (session) => {
      const r = await Ride.findOne({
        _id: x._id,
        status: "requested",
        expiresAt: { $lte: new Date() },
      })
        .session(session)
        .lean();
      if (r)
        await finish(
          r,
          "no_driver_available",
          "Driver did not respond within two minutes.",
          null,
          session,
          true,
        );
    });
}
transport.get("/drivers", async (req, res) => {
  const q = z
      .object({
        vehicleType: z.enum(vehicleTypes).optional(),
        demo: z.enum(["true", "false"]).default("false"),
        page: pageInput,
      })
      .parse(req.query),
    filter = { status: "approved", isDemo: q.demo === "true", vehicleType: { $in: vehicleTypes } };
  if (q.vehicleType) filter.vehicleType = q.vehicleType;
  const [rows, total] = await Promise.all([
    Profile.find(filter)
      .select(publicFields)
      .sort({ createdAt: -1, _id: 1 })
      .skip((q.page - 1) * 12)
      .limit(12)
      .lean(),
    Profile.countDocuments(filter),
  ]);
  res.json({
    drivers: await ratings(rows),
    total,
    page: q.page,
    pages: Math.ceil(total / 12),
  });
});
transport.get("/drivers/:id", async (req, res) => {
  const p = await Profile.findOne({
    _id: id.parse(req.params.id),
    status: "approved",
  })
    .select(publicFields)
    .lean();
  if (!p) fail(404, "Driver profile not available.");
  res.json({
    ...(await ratings([p]))[0],
    reviews: await Review.find({ profile: p._id })
      .select("rating comment isDemo createdAt")
      .sort({ createdAt: -1 })
      .limit(50)
      .lean(),
  });
});
transport.use(requireAuth);
transport.get("/contact", member, async (req, res) => {
  const c = await Contact.findOne({ user: req.user._id }).lean();
  res.json({ name: c?.name || "", phone: c?.phone || "" });
});
transport.put("/contact", member, async (req, res) => {
  const data = z
    .object({
      name: text(0, 80),
      phone: z
        .string()
        .regex(
          /^(?:\+?[0-9]{3,15})?$/,
          "Enter digits and an optional leading +.",
        ),
    })
    .refine(
      (d) => !!d.name === !!d.phone,
      "Supply both name and phone, or clear both.",
    )
    .parse(req.body);
  await Contact.updateOne(
    { user: req.user._id },
    { $set: data },
    { upsert: true },
  );
  res.json(data);
});
transport.get("/driver", member, async (req, res) => {
  await expireTransportRequests();
  const p = await Profile.findOne({ user: req.user._id }).lean();
  res.json({ profile: p });
});
transport.put("/driver", member, async (req, res) => {
  const data = driverInput.parse(req.body);
  await ensureSeat(req.user._id);
  const result = await tx(async (session) => {
    if (
      !(await Seat.findOneAndUpdate(
        { user: req.user._id, ride: null },
        { $inc: { version: 1 } },
        { session, returnDocument: "after" },
      ))
    )
      fail(409, "Finish your active ride before changing your driver profile.");
    const p = await Profile.findOne({ user: req.user._id })
      .session(session)
      .lean();
    if (p?.status === "suspended")
      fail(403, "Driver profile suspended. Contact a moderator.");
    return Profile.findOneAndUpdate(
      { user: req.user._id },
      {
        $set: { ...data, status: "pending", reason: "", online: false },
        $push: {
          history: {
            status: "pending",
            reason: "Application submitted for review.",
            actor: req.user._id,
            at: new Date(),
          },
        },
      },
      { session, upsert: true, returnDocument: "after" },
    ).lean();
  });
  res.json({ profile: result });
});
transport.patch("/driver/online", member, async (req, res) => {
  const data = z
    .object({
      online: z.boolean(),
      location: transportPoint.optional(),
      source: z.enum(["geolocation", "demo"]).default("geolocation"),
    })
    .refine(
      (d) => !d.online || !!d.location,
      "Provide a current location to go online.",
    )
    .parse(req.body);
  await expireTransportRequests();
  await ensureSeat(req.user._id);
  const result = await tx(async (session) => {
    if (
      !(await Seat.findOneAndUpdate(
        { user: req.user._id, ride: null },
        { $inc: { version: 1 } },
        { session, returnDocument: "after" },
      ))
    )
      fail(409, "You cannot change availability during an active ride.");
    const p = await Profile.findOne({ user: req.user._id })
      .session(session)
      .lean();
    if (!p) fail(404, "Apply as a driver first.");
    if (data.online && p.status !== "approved")
      fail(403, "Driver approval is required.");
    if (data.source === "demo" && !p.isDemo)
      fail(
        403,
        "Manual demo locations are only for fictional driver profiles.",
      );
    return Profile.findOneAndUpdate(
      { _id: p._id, activeRide: null },
      {
        $set: {
          online: data.online,
          ...(data.online
            ? {
                currentLocation: {
                  ...data.location,
                  updatedAt: new Date(),
                  source: data.source,
                },
              }
            : {}),
        },
      },
      { session, returnDocument: "after" },
    ).lean();
  });
  res.json({ profile: result });
});
transport.patch("/driver/location", member, async (req, res) => {
  const data = transportPoint
    .extend({ source: z.enum(["geolocation", "demo"]).default("geolocation") })
    .parse(req.body);
  const p = await Profile.findOne({ user: req.user._id }).lean();
  if (!p || (!p.online && !p.activeRide))
    fail(409, "Go online before sharing your location.");
  if (data.source === "demo" && !p.isDemo)
    fail(403, "Manual demo locations are only for fictional drivers.");
  const location = {
    lat: data.lat,
    lng: data.lng,
    source: data.source,
    updatedAt: new Date(),
  };
  const updated = await Profile.findOneAndUpdate(
    { _id: p._id, $or: [{ online: true }, { activeRide: { $ne: null } }] },
    { $set: { currentLocation: location } },
    { returnDocument: "after" },
  ).lean();
  if (!updated) fail(409, "Driver is offline.");
  if (updated.activeRide)
    await Ride.updateOne(
      {
        _id: updated.activeRide,
        driver: req.user._id,
        status: { $in: activeRideStatuses },
      },
      { $set: { driverLiveLocation: location } },
    );
  res.json({ location });
});
const mapsLimit = rateLimit({
  windowMs: 60000, limit: 40,
  keyGenerator: req => String(req.user._id),
  standardHeaders: "draft-8", legacyHeaders: false,
  message: { error: "Too many map requests. Wait a minute and try again." },
  skip: () => process.env.NODE_ENV === "test",
});
transport.get("/places", member, mapsLimit, async (req, res) => {
  const q = text(2, 160).parse(req.query.q);
  res.set("Cache-Control", "no-store").json({ places: await addressSuggestions(q) });
});
transport.post("/estimate", member, mapsLimit, async (req, res) => {
  const d = rideInput.omit({ requestKey: true, demo: true, quotedFare: true }).parse(req.body);
  res.set("Cache-Control", "no-store").json({
    ...await roadQuote(d.pickup, d.dropoff, d.vehicleType),
    currency: "BDT", basis: "road", payment: "cash demonstration",
  });
});
const requestLimit = rateLimit({
  windowMs: 3600000,
  limit: 20,
  keyGenerator: (req) => String(req.user._id),
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Too many ride requests. Try again later." },
  skip: () => process.env.NODE_ENV === "test",
});
transport.post("/rides", member, requestLimit, async (req, res) => {
  const data = rideInput.parse(req.body),
    key = { passenger: req.user._id, requestKey: data.requestKey },
    existing = await Ride.findOne(key).lean();
  if (existing) return res.json(rideView(existing));
  if (data.quotedFare === undefined) fail(409, "Calculate the road fare before requesting a ride.");
  const fare = await roadQuote(data.pickup, data.dropoff, data.vehicleType);
  if (data.quotedFare !== fare.fare) fail(409, "The fare changed. Calculate it again and confirm the new price.");
  await expireTransportRequests();
  await ensureSeat(req.user._id);
  let result;
  try {
    result = await tx(async (session) => {
      const duplicate = await Ride.findOne(key).session(session).lean();
      if (duplicate) return duplicate;
      const rideId = new mongoose.Types.ObjectId();
      if (
        !(await Seat.findOneAndUpdate(
          { user: req.user._id, ride: null },
          { $set: { ride: rideId } },
          { session, returnDocument: "after" },
        ))
      )
        fail(409, "You already have an active ride as passenger or driver.");
      const candidates = await Profile.find({
        status: "approved",
        online: true,
        activeRide: null,
        vehicleType: data.vehicleType,
        isDemo: data.demo,
        user: { $ne: req.user._id },
        "currentLocation.updatedAt": { $gte: new Date(Date.now() - 90000) },
      })
        .session(session)
        .lean();
      // ponytail: all eligible profiles sorted in memory for the course dataset; add a geo index at city-scale traffic.
      let chosen = null;
      for (const p of nearestDrivers(candidates, data.pickup)) {
        const locked = await Seat.findOneAndUpdate(
          { user: p.user, ride: null },
          { $set: { ride: rideId } },
          { session, returnDocument: "after" },
        );
        if (!locked) continue;
        chosen = await Profile.findOneAndUpdate(
          { _id: p._id, activeRide: null, status: "approved", online: true },
          { $set: { activeRide: rideId } },
          { session, returnDocument: "after" },
        ).lean();
        if (chosen) break;
        await Seat.updateOne(
          { user: p.user, ride: rideId },
          { $set: { ride: null } },
          { session },
        );
      }
      const status = chosen ? "requested" : "no_driver_available";
      const [r] = await Ride.create(
        [
          {
            _id: rideId,
            ...key,
            passengerName: req.user.name,
            pickup: data.pickup,
            dropoff: data.dropoff,
            vehicleType: data.vehicleType,
            ...fare,
            isDemo: data.demo,
            status,
            ...(chosen
              ? {
                  driver: chosen.user,
                  profile: chosen._id,
                  driverName: chosen.displayName,
                  vehicleNumber: chosen.vehicleNumber,
                  driverLiveLocation: chosen.currentLocation,
                  expiresAt: new Date(Date.now() + 120000),
                }
              : {}),
            history: [
              {
                status,
                reason: chosen
                  ? "Waiting for driver acceptance."
                  : "No fresh available driver within 10 km.",
                actor: req.user._id,
                at: new Date(),
              },
            ],
          },
        ],
        { session },
      );
      if (!chosen)
        await Seat.updateOne(
          { user: req.user._id, ride: rideId },
          { $set: { ride: null } },
          { session },
        );
      return r.toObject();
    });
  } catch (e) {
    if (e.code !== 11000) throw e;
    const duplicate = await Ride.findOne(key).lean();
    if (!duplicate) fail(409, "Ride assignment changed. Please try again.");
    result = duplicate;
  }
  res.status(201).json(rideView(result));
});
transport.get("/rides", member, async (req, res) => {
  const q = z
    .object({
      view: z.enum(["passenger", "driver"]).default("passenger"),
      page: pageInput,
    })
    .parse(req.query);
  await expireTransportRequests();
  const filter = { [q.view]: req.user._id };
  const [rides, total] = await Promise.all([
    Ride.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip((q.page - 1) * 12)
      .limit(12)
      .lean(),
    Ride.countDocuments(filter),
  ]);
  res.json({
    rides: rides.map(rideView),
    total,
    page: q.page,
    pages: Math.ceil(total / 12),
  });
});
async function ownRide(req, session) {
  let q = Ride.findOne({
    _id: id.parse(req.params.id),
    $or: [{ passenger: req.user._id }, { driver: req.user._id }],
  });
  if (session) q = q.session(session);
  const r = await q.lean();
  if (!r) fail(404, "Ride not found.");
  return r;
}
transport.get("/rides/:id", member, async (req, res) => {
  await expireTransportRequests();
  const r = await ownRide(req);
  const [alerts, review, contact, profile] = await Promise.all([
    Alert.find({ ride: r._id }).sort({ createdAt: -1 }).lean(),
    Review.findOne({ ride: r._id }).select("rating comment createdAt").lean(),
    Contact.findOne({ user: req.user._id }).select("name phone").lean(),
    Profile.findOne({ user: req.user._id }).select("isDemo").lean(),
  ]);
  const counterpart = ["accepted", "ongoing"].includes(r.status)
    ? await User.findById(
        same(r.passenger, req.user._id) ? r.driver : r.passenger,
      )
        .select("name phone")
        .lean()
    : null;
  res.json({
    ...rideView(r),
    alerts,
    review,
    emergencyContact: contact
      ? { name: contact.name, phone: contact.phone }
      : null,
    counterpart,
    ownDriverIsDemo: !!profile?.isDemo,
  });
});
transport.patch("/rides/:id/status", member, async (req, res) => {
  const d = z
    .object({
      status: z.enum([
        "accepted",
        "ongoing",
        "completed",
        "cancelled",
        "rejected",
      ]),
      reason: text(0, 400).default(""),
    })
    .refine(
      (d) =>
        !["cancelled", "rejected"].includes(d.status) || d.reason.length >= 5,
      "Give a reason of at least 5 characters.",
    )
    .parse(req.body);
  await expireTransportRequests();
  await tx(async (session) => {
    const r = await ownRide(req, session);
    if (!canRideTransition(r, req.user._id, d.status))
      fail(
        409,
        "This action is not allowed for your role or the current ride status.",
      );
    if (d.status === "accepted") {
      const p = await Profile.findOneAndUpdate(
        { _id: r.profile, status: "approved", activeRide: r._id },
        { $set: { online: true } },
        { session, returnDocument: "after" },
      );
      if (!p) fail(409, "Driver is no longer approved for this request.");
      if (+r.expiresAt <= Date.now())
        fail(409, "This request expired. Refresh the ride.");
    }
    if (["completed", "cancelled", "rejected"].includes(d.status))
      await finish(
        r,
        d.status === "rejected" ? "cancelled" : d.status,
        d.reason || "Driver marked the ride completed.",
        req.user._id,
        session,
        d.status === "rejected" ||
          (d.status === "cancelled" && same(r.driver, req.user._id)),
      );
    else
      await Ride.updateOne(
        { _id: r._id, status: r.status },
        {
          $set: { status: d.status },
          $push: {
            history: {
              status: d.status,
              reason: d.reason,
              actor: req.user._id,
              at: new Date(),
            },
          },
        },
        { session },
      );
  });
  res.json({ ok: true });
});
transport.post("/rides/:id/review", member, async (req, res) => {
  const r = await ownRide(req);
  if (!same(r.passenger, req.user._id) || r.status !== "completed")
    fail(403, "Only the passenger can review a completed ride.");
  const d = z
    .object({
      rating: z.number().int().min(1).max(5),
      comment: text(0, 1000).default(""),
    })
    .parse(req.body);
  res.status(201).json(
    await Review.create({
      ...d,
      ride: r._id,
      profile: r.profile,
      passenger: req.user._id,
      isDemo: r.isDemo,
    }),
  );
});
transport.post("/rides/:id/panic", member, async (req, res) => {
  const d = z
    .object({
      source: z.enum(["geolocation", "pickup"]),
      location: transportPoint.optional(),
    })
    .refine(
      (d) => d.source === "pickup" || !!d.location,
      "Provide the current location or choose the pickup fallback.",
    )
    .parse(req.body);
  await expireTransportRequests();
  const alert = await tx(async (session) => {
    const r = await ownRide(req, session);
    if (
      !activeRideStatuses.includes(r.status) ||
      (r.status === "requested" && +r.expiresAt <= Date.now())
    )
      fail(409, "Alerts can only be raised during an active ride.");
    // Touch the ride to serialize an alert against a concurrent terminal transition.
    await Ride.updateOne(
      { _id: r._id },
      { $set: { updatedAt: new Date() } },
      { session },
    );
    return Alert.findOneAndUpdate(
      { ride: r._id, triggeredBy: req.user._id },
      {
        $set: {
          location: {
            ...(d.source === "pickup"
              ? { lat: r.pickup.lat, lng: r.pickup.lng }
              : d.location),
            source: d.source,
            updatedAt: new Date(),
          },
          status: "active",
          note: "",
          resolvedAt: null,
          resolvedBy: null,
        },
      },
      { upsert: true, returnDocument: "after", session },
    ).lean();
  });
  res.status(201).json(alert);
});
transport.patch("/alerts/:id/resolve", async (req, res) => {
  const d = z.object({ note: text(5, 800) }).parse(req.body),
    filter = { _id: id.parse(req.params.id), status: "active" };
  if (!req.user.isAdmin) filter.triggeredBy = req.user._id;
  const a = await Alert.findOneAndUpdate(
    filter,
    {
      $set: {
        status: "resolved",
        note: d.note,
        resolvedAt: new Date(),
        resolvedBy: req.user._id,
      },
    },
    { returnDocument: "after" },
  );
  if (!a) fail(404, "Active alert not found or you cannot resolve it.");
  res.json(a);
});
transport.get("/admin/drivers", admin, async (req, res) => {
  const q = z
      .object({
        status: z
          .enum(["pending", "approved", "rejected", "suspended"])
          .optional(),
        page: pageInput,
      })
      .parse(req.query),
    filter = q.status ? { status: q.status } : {};
  const [drivers, total] = await Promise.all([
    Profile.find(filter)
      .sort({ updatedAt: -1 })
      .skip((q.page - 1) * 12)
      .limit(12)
      .populate("user", "name email")
      .lean(),
    Profile.countDocuments(filter),
  ]);
  res.json({ drivers, total, page: q.page, pages: Math.ceil(total / 12) });
});
transport.patch("/admin/drivers/:id", admin, async (req, res) => {
  const d = z
    .object({
      status: z.enum(["approved", "rejected", "suspended"]),
      reason: text(5, 800),
      expectedVersion: z.number().int().min(0),
    })
    .parse(req.body);
  const p = await Profile.findOneAndUpdate(
    { _id: id.parse(req.params.id), history: { $size: d.expectedVersion } },
    {
      $set: { status: d.status, reason: d.reason, online: false },
      $push: {
        history: {
          status: d.status,
          reason: d.reason,
          actor: req.user._id,
          at: new Date(),
        },
      },
    },
    { returnDocument: "after" },
  ).lean();
  if (!p)
    fail(
      409,
      "Profile changed or was removed. Refresh before reviewing again.",
    );
  res.json({ profile: p });
});
transport.get("/admin/alerts", admin, async (req, res) => {
  const q = z
      .object({
        status: z.enum(["active", "resolved"]).default("active"),
        page: pageInput,
      })
      .parse(req.query),
    filter = { status: q.status };
  const [alerts, total] = await Promise.all([
    Alert.find(filter)
      .sort({ updatedAt: -1 })
      .skip((q.page - 1) * 12)
      .limit(12)
      .populate("triggeredBy", "name phone")
      .populate("ride", "status driverName passengerName isDemo pickup dropoff")
      .lean(),
    Alert.countDocuments(filter),
  ]);
  res.json({ alerts, total, page: q.page, pages: Math.ceil(total / 12) });
});
