import { Router } from "express";
import mongoose from "mongoose";
import { z } from "zod";
import { requireAuth, member, admin, fail } from "./auth.js";
import {
  WorkerProfile as Profile,
  WorkerBooking as Booking,
  WorkerReview as Review,
  WorkerComplaint as Complaint,
  WorkerDecision as Decision,
} from "./hiring-models.js";
import {
  skills,
  profileInput,
  bookingInput,
  slot,
  fitsAvailability,
  canTransition,
} from "./hiring-rules.js";
export const hiring = Router();
const id = z.string().regex(/^[a-f\d]{24}$/i, "Invalid record ID.");
const same = (a, b) => String(a) === String(b);
const text = (min, max) => z.string().trim().min(min).max(max);
const publicFields =
  "_id displayName skills bio experienceYears hourlyRate serviceArea available weekdays dayStart dayEnd isDemo";
const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
async function withRatings(profiles) {
  const ratings = await Review.aggregate([
    { $match: { profile: { $in: profiles.map((p) => p._id) } } },
    {
      $group: {
        _id: "$profile",
        rating: { $avg: "$rating" },
        reviewCount: { $sum: 1 },
      },
    },
  ]);
  return profiles.map((p) => {
    const r = ratings.find((r) => same(r._id, p._id));
    return { ...p, rating: r?.rating || 0, reviewCount: r?.reviewCount || 0 };
  });
}
function bookingView(b, viewer) {
  const { address, phone, notes, ...rest } = b;
  const allowed =
    same(b.customer, viewer) ||
    (same(b.worker, viewer) && ["accepted", "completed"].includes(b.status));
  return {
    ...rest,
    ...(allowed ? { address, phone, notes } : {}),
    addressVisible: allowed,
  };
}
async function ownBooking(req) {
  const b = await Booking.findOne({
    _id: id.parse(req.params.id),
    $or: [{ customer: req.user._id }, { worker: req.user._id }],
  }).lean();
  if (!b) fail(404, "Booking not found.");
  return b;
}
hiring.get("/workers", async (req, res) => {
  const q = z
    .object({
      q: text(0, 80).default(""),
      skill: z.enum(skills).optional(),
      available: z.enum(["true", "false"]).optional(),
      maxRate: z.coerce.number().int().min(0).optional(),
      sort: z.enum(["newest", "price-low", "experience"]).default("newest"),
      page: z.coerce.number().int().min(1).max(10000).default(1),
    })
    .parse(req.query);
  const filter = { status: "approved" };
  if (q.q)
    filter.$or = ["displayName", "serviceArea"].map((k) => ({
      [k]: { $regex: escape(q.q), $options: "i" },
    }));
  if (q.skill) filter.skills = q.skill;
  if (q.available) filter.available = q.available === "true";
  if (q.maxRate !== undefined) filter.hourlyRate = { $lte: q.maxRate };
  const sorting =
    q.sort === "price-low"
      ? { hourlyRate: 1, _id: 1 }
      : q.sort === "experience"
        ? { experienceYears: -1, _id: 1 }
        : { createdAt: -1, _id: 1 };
  const [rows, total] = await Promise.all([
    Profile.find(filter)
      .select(publicFields)
      .sort(sorting)
      .skip((q.page - 1) * 12)
      .limit(12)
      .lean(),
    Profile.countDocuments(filter),
  ]);
  res.json({
    workers: await withRatings(rows),
    total,
    page: q.page,
    pages: Math.ceil(total / 12),
  });
});
hiring.get("/workers/:id", async (req, res) => {
  const p = await Profile.findOne({
    _id: id.parse(req.params.id),
    status: "approved",
  })
    .select(publicFields)
    .lean();
  if (!p) fail(404, "This worker profile is not currently public.");
  const reviews = await Review.find({ profile: p._id })
    .select("rating comment isDemo createdAt")
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();
  res.json({ ...(await withRatings([p]))[0], reviews });
});
hiring.use(requireAuth);
hiring.get("/mine", member, async (req, res) =>
  res.json({ profile: await Profile.findOne({ user: req.user._id }).lean() }),
);
hiring.put("/mine", member, async (req, res) => {
  const data = profileInput.parse(req.body);
  const existing = await Profile.findOne({ user: req.user._id });
  if (existing?.status === "suspended")
    fail(403, "Your worker profile is suspended. Contact the moderator.");
  if (!existing)
    return res
      .status(201)
      .json(await Profile.create({ ...data, user: req.user._id }));
  const updated = await Profile.findOneAndUpdate(
    { _id: existing._id, status: { $ne: "suspended" } },
    {
      $set: { ...data, status: "pending", reason: "" },
      $inc: { scheduleVersion: 1 },
    },
    { returnDocument: "after" },
  );
  if (!updated) fail(409, "Profile status changed. Refresh and try again.");
  res.json(updated);
});
hiring.patch("/mine/availability", member, async (req, res) => {
  const data = z.object({ available: z.boolean() }).parse(req.body);
  const p = await Profile.findOneAndUpdate(
    { user: req.user._id, status: { $ne: "suspended" } },
    { $set: data, $inc: { scheduleVersion: 1 } },
    { returnDocument: "after" },
  );
  if (!p) fail(404, "Editable worker profile not found.");
  res.json(p);
});
hiring.post("/bookings", member, async (req, res) => {
  const data = bookingInput.parse(req.body);
  const previous = await Booking.findOne({
    customer: req.user._id,
    requestKey: data.requestKey,
  }).lean();
  if (previous) return res.json(bookingView(previous, req.user._id));
  let dates;
  try {
    dates = slot(data.start, data.end);
  } catch (e) {
    fail(400, e.message);
  }
  const p = await Profile.findOne({
    _id: data.profileId,
    status: "approved",
  }).lean();
  if (!p) fail(409, "This worker is not accepting bookings.");
  if (same(p.user, req.user._id)) fail(400, "You cannot book yourself.");
  if (
    !p.skills.includes(data.service) ||
    !fitsAvailability(p, dates.startAt, dates.endAt)
  )
    fail(
      400,
      "Choose a listed service and a time inside the worker’s availability.",
    );
  if (
    await Booking.exists({
      worker: p.user,
      status: "accepted",
      startAt: { $lt: dates.endAt },
      endAt: { $gt: dates.startAt },
    })
  )
    fail(409, "That time is already booked. Choose another time.");
  try {
    const b = await Booking.create({
      customer: req.user._id,
      worker: p.user,
      profile: p._id,
      workerName: p.displayName,
      service: data.service,
      hourlyRate: p.hourlyRate,
      ...dates,
      total: Math.round(p.hourlyRate * dates.hours),
      address: data.address,
      phone: data.phone,
      notes: data.notes,
      requestKey: data.requestKey,
      history: [{ status: "pending", at: new Date(), by: req.user._id }],
    });
    res.status(201).json(bookingView(b.toObject(), req.user._id));
  } catch (e) {
    if (e.code !== 11000) throw e;
    const b = await Booking.findOne({
      customer: req.user._id,
      requestKey: data.requestKey,
    }).lean();
    if (!b) throw e;
    res.json(bookingView(b, req.user._id));
  }
});
hiring.get("/bookings", member, async (req, res) => {
  const view = z
    .enum(["customer", "worker"])
    .default("customer")
    .parse(req.query.view);
  const rows = await Booking.find({ [view]: req.user._id })
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();
  res.json(rows.map((b) => bookingView(b, req.user._id)));
});
hiring.get("/bookings/:id", member, async (req, res) => {
  const b = await ownBooking(req);
  const [review, complaint] = await Promise.all([
    Review.findOne({ booking: b._id }).select("rating comment isDemo").lean(),
    Complaint.findOne({ booking: b._id, filedBy: req.user._id }).lean(),
  ]);
  res.json({ ...bookingView(b, req.user._id), review, complaint });
});
hiring.patch("/bookings/:id", member, async (req, res) => {
  const data = z
    .object({
      status: z.enum(["accepted", "rejected", "cancelled", "completed"]),
      reason: text(0, 500).default(""),
    })
    .parse(req.body);
  if (["rejected", "cancelled"].includes(data.status) && data.reason.length < 3)
    fail(400, "Provide a reason of at least three characters.");
  const bookingId = id.parse(req.params.id);
  let result;
  await mongoose.connection.transaction(async (session) => {
    const b = await Booking.findOne({
      _id: bookingId,
      $or: [{ customer: req.user._id }, { worker: req.user._id }],
    }).session(session);
    if (!b) fail(404, "Booking not found.");
    if (b.status === data.status) {
      result = b.toObject();
      return;
    }
    if (!canTransition(b, req.user._id, data.status))
      fail(
        409,
        "This action is not allowed for your role or the current booking time/status.",
      );
    // Serialize acceptance per worker across server instances via a shared database write.
    const p = await Profile.findOneAndUpdate(
      { _id: b.profile },
      { $inc: { scheduleVersion: 1 } },
      { session, returnDocument: "after" },
    );
    if (!p) fail(409, "Worker profile not found.");
    if (data.status === "accepted") {
      if (
        p.status !== "approved" ||
        !p.skills.includes(b.service) ||
        !fitsAvailability(p, b.startAt, b.endAt)
      )
        fail(
          409,
          "Your current approval, service or availability does not allow this booking.",
        );
      const overlap = await Booking.exists({
        _id: { $ne: b._id },
        worker: b.worker,
        status: "accepted",
        startAt: { $lt: b.endAt },
        endAt: { $gt: b.startAt },
      }).session(session);
      if (overlap) fail(409, "Another accepted booking overlaps this time.");
      b.acceptedAt = new Date();
    }
    b.status = data.status;
    b.history.push({
      status: data.status,
      reason: data.reason,
      at: new Date(),
      by: req.user._id,
    });
    await b.save({ session });
    result = b.toObject();
  });
  res.json(bookingView(result, req.user._id));
});
hiring.post("/bookings/:id/review", member, async (req, res) => {
  const data = z
    .object({
      rating: z.number().int().min(1).max(5),
      comment: text(0, 1000).default(""),
    })
    .parse(req.body);
  const b = await ownBooking(req);
  if (!same(b.customer, req.user._id) || b.status !== "completed")
    fail(403, "Only the customer of a completed booking can review it.");
  res.status(201).json(
    await Review.create({
      ...data,
      booking: b._id,
      profile: b.profile,
      customer: req.user._id,
    }),
  );
});
hiring.post("/bookings/:id/complaint", member, async (req, res) => {
  const data = z
    .object({
      reason: z.enum([
        "No-show",
        "Unsafe behavior",
        "Payment dispute",
        "Property damage",
        "Other",
      ]),
      details: text(10, 2000),
    })
    .parse(req.body);
  const b = await ownBooking(req);
  if (!b.acceptedAt)
    fail(403, "Complaints require a booking that was accepted.");
  res.status(201).json(
    await Complaint.create({
      ...data,
      booking: b._id,
      filedBy: req.user._id,
      against: same(b.customer, req.user._id) ? b.worker : b.customer,
    }),
  );
});
hiring.get("/complaints", member, async (req, res) =>
  res.json(
    await Complaint.find({ filedBy: req.user._id })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean(),
  ),
);
hiring.use("/admin", admin);
hiring.get("/admin/workers", async (req, res) =>
  res.json(await Profile.find().sort({ updatedAt: -1 }).limit(200).lean()),
);
hiring.patch("/admin/workers/:id", async (req, res) => {
  const data = z
    .object({
      status: z.enum(["approved", "rejected", "suspended"]),
      reason: text(3, 500),
    })
    .parse(req.body);
  let result;
  await mongoose.connection.transaction(async (session) => {
    const p = await Profile.findById(id.parse(req.params.id)).session(session);
    if (!p) fail(404, "Worker profile not found.");
    const allowed = {
      pending: ["approved", "rejected"],
      approved: ["suspended"],
      rejected: [],
      suspended: ["approved"],
    };
    if (!allowed[p.status].includes(data.status))
      fail(409, "Refresh the queue; this status change is not allowed.");
    Object.assign(p, data);
    p.scheduleVersion += 1;
    await p.save({ session });
    await Decision.create([{ admin: req.user._id, profile: p._id, ...data }], {
      session,
    });
    result = p;
  });
  res.json(result);
});
hiring.get("/admin/decisions", async (req, res) =>
  res.json(
    await Decision.find()
      .sort({ createdAt: -1 })
      .limit(200)
      .populate("profile", "displayName")
      .lean(),
  ),
);
hiring.get("/admin/complaints", async (req, res) =>
  res.json(
    await Complaint.find()
      .sort({ createdAt: -1 })
      .limit(200)
      .populate("filedBy against", "name")
      .populate("booking", "workerName service status startAt")
      .lean(),
  ),
);
hiring.patch("/admin/complaints/:id", async (req, res) => {
  const data = z
    .object({
      status: z.enum(["reviewed", "resolved", "dismissed"]),
      adminNote: text(3, 1000),
    })
    .parse(req.body);
  const c = await Complaint.findByIdAndUpdate(
    id.parse(req.params.id),
    { $set: { ...data, reviewedBy: req.user._id } },
    { returnDocument: "after" },
  );
  if (!c) fail(404, "Complaint not found.");
  res.json(c);
});
