import { Router } from "express";
import { z } from "zod";
import { rateLimit } from "express-rate-limit";
import { requireAuth, admin, fail } from "./auth.js";
import { SafetyReport, HelpResource } from "./safety-models.js";
import {
  reportCategories,
  resourceTypes,
  reportStatuses,
  clusterReports,
  distanceKm,
} from "../shared/safety.js";
export const safety = Router();
const id = z.string().regex(/^[a-f0-9]{24}$/i, "Invalid record ID.");
const lat = z.number().min(20).max(27),
  lng = z.number().min(88).max(93);
export const reportInput = z.object({
  category: z.enum(reportCategories),
  description: z.string().trim().min(20).max(2000),
  location: z.object({ address: z.string().trim().min(3).max(160), lat, lng }),
  occurredAt: z.iso
    .datetime({ offset: true })
    .refine(
      (v) => +new Date(v) <= Date.now(),
      "Incident time cannot be in the future.",
    ),
  isAnonymous: z.boolean().default(true),
  requestKey: z.uuid(),
});
export const resourceInput = z
  .object({
    name: z.string().trim().min(3).max(120),
    type: z.enum(resourceTypes),
    phone: z
      .string()
      .regex(/^(?:\+?[0-9]{3,15})?$/, "Use digits and an optional leading +."),
    address: z.string().trim().min(3).max(200),
    lat: lat.nullable(),
    lng: lng.nullable(),
    available24x7: z.boolean(),
    isVerifiedInfo: z.boolean(),
    sourceUrl: z.union([
      z.literal(""),
      z.url().refine((v) => v.startsWith("https://"), "Use an HTTPS source."),
    ]),
  })
  .refine(
    (d) => (d.lat === null) === (d.lng === null),
    "Supply both coordinates or neither.",
  )
  .refine(
    (d) => !d.isVerifiedInfo || !!d.sourceUrl,
    "A verification source is required.",
  );
const pageQuery = z.object({
  page: z.coerce.number().int().min(1).max(10000).default(1),
  category: z.enum(reportCategories).optional(),
  area: z.string().trim().max(80).default(""),
  status: z.enum(reportStatuses).optional(),
  demo: z.enum(["true", "false"]).default("false"),
});
const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const populate = { path: "reporter", select: "name email" };
export function reportView(r, privateView = false) {
  const base = {
    _id: r._id,
    category: r.category,
    description: r.description,
    isAnonymous: r.isAnonymous,
    occurredAt: r.occurredAt,
    status: r.status,
    isDemo: r.isDemo,
    createdAt: r.createdAt,
    location: {
      address: r.location.address,
      lat: Number(r.location.lat.toFixed(3)),
      lng: Number(r.location.lng.toFixed(3)),
    },
    reporterName: r.isAnonymous
      ? "Anonymous"
      : r.reporter?.name || "Former member",
  };
  if (privateView)
    Object.assign(base, {
      location: r.location,
      reporter: r.reporter,
      hidden: r.hidden,
      history: r.history,
    });
  return base;
}
async function list(req, res, mode) {
  const q = pageQuery.parse(req.query),
    filter = {};
  if (mode === "mine") filter.reporter = req.user._id;
  else filter.isDemo = q.demo === "true";
  if (mode === "public") filter.hidden = false;
  if (q.category) filter.category = q.category;
  if (q.status) filter.status = q.status;
  if (q.area)
    filter["location.address"] = { $regex: escape(q.area), $options: "i" };
  const [rows, total] = await Promise.all([
    SafetyReport.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip((q.page - 1) * 12)
      .limit(12)
      .populate(populate)
      .lean(),
    SafetyReport.countDocuments(filter),
  ]);
  res.json({
    reports: rows.map((r) => reportView(r, mode !== "public")),
    total,
    page: q.page,
    pages: Math.ceil(total / 12),
  });
}
safety.get("/reports", (req, res) => list(req, res, "public"));
safety.get("/reports/mine", requireAuth, (req, res) => list(req, res, "mine"));
safety.get("/reports/admin", requireAuth, admin, (req, res) =>
  list(req, res, "admin"),
);
const submitLimit = rateLimit({
  windowMs: 3600000,
  limit: 10,
  keyGenerator: (req) => String(req.user._id),
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Report limit reached. Please try again later." },
  skip: () => process.env.NODE_ENV === "test",
});
safety.post("/reports", requireAuth, submitLimit, async (req, res) => {
  const data = reportInput.parse(req.body),
    key = { reporter: req.user._id, requestKey: data.requestKey };
  let row = await SafetyReport.findOne(key).populate(populate).lean();
  if (row) return res.json(reportView(row, true));
  try {
    const created = await SafetyReport.create({
      ...data,
      ...key,
      history: [
        {
          status: "pending",
          hidden: false,
          note: "Report submitted.",
          actor: req.user._id,
          at: new Date(),
        },
      ],
    });
    row = await SafetyReport.findById(created._id).populate(populate).lean();
  } catch (e) {
    if (e.code !== 11000) throw e;
    row = await SafetyReport.findOne(key).populate(populate).lean();
    return res.json(reportView(row, true));
  }
  res.status(201).json(reportView(row, true));
});
safety.get("/reports/:id", async (req, res) => {
  const row = await SafetyReport.findById(id.parse(req.params.id))
    .populate(populate)
    .lean();
  const privateView = !!(
    row &&
    req.user &&
    (req.user.isAdmin || String(row.reporter?._id) === String(req.user._id))
  );
  if (!row || (row.hidden && !privateView)) fail(404, "Report not found.");
  res.json(reportView(row, privateView));
});
safety.patch("/reports/:id/status", requireAuth, admin, async (req, res) => {
  const key = id.parse(req.params.id),
    data = z
      .object({
        status: z.enum(reportStatuses),
        hidden: z.boolean(),
        note: z.string().trim().min(5).max(800),
        expectedVersion: z.coerce.number().int().min(1),
      })
      .parse(req.body);
  const row = await SafetyReport.findById(key).lean();
  if (!row) fail(404, "Report not found.");
  const current = reportStatuses.indexOf(row.status),
    next = reportStatuses.indexOf(data.status);
  if (next < current || next > current + 1)
    fail(409, "Move from pending to reviewed, then resolved.");
  const updated = await SafetyReport.findOneAndUpdate(
    { _id: key, history: { $size: data.expectedVersion }, status: row.status },
    {
      $set: { status: data.status, hidden: data.hidden },
      $push: {
        history: {
          status: data.status,
          hidden: data.hidden,
          note: data.note,
          actor: req.user._id,
          at: new Date(),
        },
      },
    },
    { returnDocument: "after" },
  )
    .populate(populate)
    .lean();
  if (!updated)
    fail(
      409,
      "Another moderator changed this report. Refresh before retrying.",
    );
  res.json(reportView(updated, true));
});
safety.get("/zones/unsafe", async (req, res) => {
  const { demo } = pageQuery.parse(req.query),
    now = Date.now();
  const rows = await SafetyReport.find({
    hidden: false,
    isDemo: demo === "true",
    occurredAt: { $gte: new Date(now - 180 * 86400000), $lte: new Date(now) },
  })
    .sort({ occurredAt: -1, _id: -1 })
    .limit(2001)
    .select("category location occurredAt")
    .lean();
  res.json({
    zones: clusterReports(rows.slice(0, 2000), now),
    sampleSize: Math.min(rows.length, 2000),
    limited: rows.length > 2000,
    isDemo: demo === "true",
    radiusMetres: 500,
    minimumReports: 3,
    days: 180,
  });
});
safety.get("/resources", async (req, res) => {
  const q = z
    .object({
      type: z.enum(resourceTypes).optional(),
      q: z.string().trim().max(80).default(""),
      lat: z.coerce.number().min(20).max(27).optional(),
      lng: z.coerce.number().min(88).max(93).optional(),
      demo: z.enum(["true", "false"]).default("false"),
    })
    .refine(
      (d) => (d.lat === undefined) === (d.lng === undefined),
      "Supply both coordinates.",
    )
    .parse(req.query);
  const filter = { isDemo: q.demo === "true" };
  if (q.type) filter.type = q.type;
  if (q.q)
    filter.$or = [
      { name: { $regex: escape(q.q), $options: "i" } },
      { address: { $regex: escape(q.q), $options: "i" } },
    ];
  const rows = await HelpResource.find(filter)
    .sort({ name: 1 })
    .limit(201)
    .lean();
  const resources = rows
    .slice(0, 200)
    .map((r) => ({
      ...r,
      distanceKm:
        q.lat !== undefined && r.lat != null && r.lng != null
          ? distanceKm(q, r)
          : null,
    }));
  if (q.lat !== undefined)
    resources.sort(
      (a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity),
    );
  res.json({ resources, limited: rows.length > 200 });
});
safety.post("/resources", requireAuth, admin, async (req, res) => {
  const data = resourceInput.parse(req.body);
  res
    .status(201)
    .json(
      await HelpResource.create({
        ...data,
        verifiedAt: data.isVerifiedInfo ? new Date() : null,
      }),
    );
});
safety.put("/resources/:id", requireAuth, admin, async (req, res) => {
  const data = resourceInput.parse(req.body);
  const row = await HelpResource.findByIdAndUpdate(
    id.parse(req.params.id),
    { $set: { ...data, verifiedAt: data.isVerifiedInfo ? new Date() : null } },
    { returnDocument: "after" },
  );
  if (!row) fail(404, "Resource not found.");
  res.json(row);
});
safety.delete("/resources/:id", requireAuth, admin, async (req, res) => {
  if (!(await HelpResource.findByIdAndDelete(id.parse(req.params.id))))
    fail(404, "Resource not found.");
  res.json({ ok: true });
});
