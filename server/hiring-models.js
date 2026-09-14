import mongoose from "mongoose";
import { skills } from "./hiring-rules.js";
const { Schema, model } = mongoose;
const ref = (name) => ({
  type: Schema.Types.ObjectId,
  ref: name,
  required: true,
});
const schema = (fields) => new Schema(fields, { timestamps: true });
const profile = schema({
  user: { ...ref("User"), unique: true },
  displayName: String,
  skills: [{ type: String, enum: skills }],
  bio: String,
  experienceYears: Number,
  hourlyRate: Number,
  serviceArea: String,
  available: { type: Boolean, default: true },
  weekdays: [Number],
  dayStart: Number,
  dayEnd: Number,
  status: {
    type: String,
    enum: ["pending", "approved", "rejected", "suspended"],
    default: "pending",
  },
  reason: { type: String, default: "" },
  scheduleVersion: { type: Number, default: 0 },
  isDemo: { type: Boolean, default: false },
});
profile.index({ status: 1, available: 1 });
export const WorkerProfile = model("WorkerProfile", profile);
const booking = schema({
  customer: ref("User"),
  worker: ref("User"),
  profile: ref("WorkerProfile"),
  workerName: String,
  service: String,
  hourlyRate: Number,
  hours: Number,
  total: Number,
  startAt: Date,
  endAt: Date,
  address: String,
  phone: String,
  notes: String,
  acceptedAt: Date,
  status: {
    type: String,
    enum: ["pending", "accepted", "rejected", "cancelled", "completed"],
    default: "pending",
  },
  history: [{ status: String, at: Date, by: ref("User"), reason: String }],
  requestKey: { type: String, required: true },
  isDemo: { type: Boolean, default: false },
});
booking.index({ customer: 1, requestKey: 1 }, { unique: true });
booking.index({ worker: 1, status: 1, startAt: 1 });
export const WorkerBooking = model("WorkerBooking", booking);
export const WorkerReview = model(
  "WorkerReview",
  schema({
    booking: { ...ref("WorkerBooking"), unique: true },
    profile: ref("WorkerProfile"),
    customer: ref("User"),
    rating: { type: Number, min: 1, max: 5 },
    comment: String,
    isDemo: { type: Boolean, default: false },
  }),
);
const complaint = schema({
  booking: ref("WorkerBooking"),
  filedBy: ref("User"),
  against: ref("User"),
  reason: String,
  details: String,
  status: {
    type: String,
    enum: ["open", "reviewed", "resolved", "dismissed"],
    default: "open",
  },
  adminNote: { type: String, default: "" },
  reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
});
complaint.index({ booking: 1, filedBy: 1 }, { unique: true });
export const WorkerComplaint = model("WorkerComplaint", complaint);
export const WorkerDecision = model(
  "WorkerDecision",
  schema({
    admin: ref("User"),
    profile: ref("WorkerProfile"),
    status: String,
    reason: String,
  }),
);
export async function initHiringModels() {
  await Promise.all(
    [
      WorkerProfile,
      WorkerBooking,
      WorkerReview,
      WorkerComplaint,
      WorkerDecision,
    ].map((m) => m.init()),
  );
}
