import { z } from "zod";
import { skills } from '../shared/services.js';
export { skills };
export const profileInput = z
  .object({
    displayName: z.string().trim().min(2).max(80),
    skills: z
      .array(z.enum(skills))
      .min(1)
      .max(7)
      .refine((v) => new Set(v).size === v.length),
    bio: z.string().trim().min(30).max(1500),
    experienceYears: z.number().int().min(0).max(60),
    hourlyRate: z.number().int().min(5000).max(1000000),
    serviceArea: z.string().trim().min(2).max(120),
    available: z.boolean(),
    weekdays: z
      .array(z.number().int().min(0).max(6))
      .min(1)
      .max(7)
      .refine((v) => new Set(v).size === v.length),
    dayStart: z.number().int().min(0).max(1410).multipleOf(30),
    dayEnd: z.number().int().min(30).max(1440).multipleOf(30),
  })
  .refine(
    (v) => v.dayEnd - v.dayStart >= 60,
    "Availability must span at least one hour.",
  );
const localTime = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:(00|30)$/);
export const bookingInput = z.object({
  profileId: z.string().regex(/^[a-f\d]{24}$/i),
  service: z.enum(skills),
  start: localTime,
  end: localTime,
  address: z.string().trim().min(10).max(400),
  phone: z
    .string()
    .regex(/^01[3-9]\d{8}$/, "Enter an 11-digit Bangladeshi mobile number."),
  notes: z.string().trim().max(800).default(""),
  requestKey: z.uuid(),
});
export function slot(start, end, now = Date.now()) {
  const startAt = new Date(start + ":00+06:00"),
    endAt = new Date(end + ":00+06:00");
  const local = (d) =>
    new Date(d.getTime() + 21600000).toISOString().slice(0, 16);
  if (
    !Number.isFinite(+startAt) ||
    !Number.isFinite(+endAt) ||
    local(startAt) !== start ||
    local(endAt) !== end
  )
    throw new Error("Choose valid Bangladesh dates and times.");
  const hours = (+endAt - +startAt) / 3600000;
  if (
    +startAt <= now ||
    +startAt > now + 90 * 86400000 ||
    start.slice(0, 10) !== end.slice(0, 10) ||
    hours < 1 ||
    hours > 8
  )
    throw new Error(
      "Choose a future booking within 90 days, lasting 1–8 hours on the same date.",
    );
  return { startAt, endAt, hours };
}
export function fitsAvailability(profile, startAt, endAt) {
  const s = new Date(+new Date(startAt) + 21600000),
    e = new Date(+new Date(endAt) + 21600000);
  return (
    profile.available &&
    profile.weekdays.includes(s.getUTCDay()) &&
    s.getUTCHours() * 60 + s.getUTCMinutes() >= profile.dayStart &&
    e.getUTCHours() * 60 + e.getUTCMinutes() <= profile.dayEnd
  );
}
export function canTransition(booking, actor, next, now = Date.now()) {
  const customer = String(booking.customer) === String(actor),
    worker = String(booking.worker) === String(actor);
  if (!customer && !worker) return false;
  if (next === "cancelled")
    return ["pending", "accepted"].includes(booking.status);
  if (next === "rejected") return worker && booking.status === "pending";
  if (next === "accepted")
    return (
      worker && booking.status === "pending" && +new Date(booking.startAt) > now
    );
  return (
    next === "completed" &&
    customer &&
    booking.status === "accepted" &&
    +new Date(booking.endAt) <= now
  );
}
