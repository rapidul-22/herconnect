import { Router } from "express";
import { randomBytes, createHash } from "node:crypto";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";
import { rateLimit } from "express-rate-limit";
import { z } from "zod";
import { User, Session, PasswordReset } from "./models.js";

export const fail = (status, message) => {
  const e = new Error(message);
  e.status = status;
  throw e;
};
export const hash = (value) => createHash("sha256").update(value).digest("hex");
export const phone = z
  .string()
  .regex(/^01[3-9]\d{8}$/, "Use an 11-digit Bangladeshi mobile number (01…).");
const passwordInput = z.string().max(72).refine(value => !bcrypt.truncates(value), "Use at most 72 UTF-8 bytes for your password.");
const password = passwordInput.refine(value => value.length >= 10, "Use at least 10 characters.");
const email = z
  .email()
  .max(254)
  .transform((v) => v.toLowerCase());
const cookie = () => ({
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 7 * 86400000,
});
export const publicUser = (u) => ({
  _id: u._id,
  name: u.name,
  email: u.email,
  phone: u.phone,
  address: u.address,
  shop: u.shop,
  isAdmin: u.isAdmin,
  wishlist: u.wishlist,
});
export async function newSession(res, user) {
  const token = randomBytes(32).toString("hex");
  const session = await Session.create({
    tokenHash: hash(token),
    user: user._id,
    authVersion: user.authVersion,
    csrfToken: randomBytes(24).toString("hex"),
    expiresAt: new Date(Date.now() + 7 * 86400000),
  });
  res.cookie("hc_session", token, cookie());
  return { user: publicUser(user), csrfToken: session.csrfToken };
}
export async function loadSession(req, res, next) {
  const token = req.cookies.hc_session;
  if (token && typeof token === "string" && token.length === 64) {
    const session = await Session.findOne({
      tokenHash: hash(token),
      expiresAt: { $gt: new Date() },
    });
    if (session) {
      const user = await User.findById(session.user);
      if (user && user.authVersion === session.authVersion) {
        req.user = user;
        req.session = session;
      }
    }
  }
  next();
}
export function requireAuth(req, res, next) {
  if (!req.user) return fail(401, "Please sign in to continue.");
  if (
    !["GET", "HEAD", "OPTIONS"].includes(req.method) &&
    req.get("X-CSRF-Token") !== req.session.csrfToken
  )
    return fail(403, "Session check failed. Refresh and try again.");
  next();
}
export function member(req, res, next) {
  if (req.user.isAdmin)
    return fail(403, "Moderator accounts cannot trade. Use a member account.");
  next();
}
export function seller(req, res, next) {
  if (
    req.user.isAdmin ||
    !["pending", "approved", "rejected"].includes(req.user.shop?.status)
  )
    return fail(
      403,
      "Submit a seller application first, or contact the moderator about your shop.",
    );
  next();
}
export function admin(req, res, next) {
  if (!req.user.isAdmin) return fail(403, "Moderator access required.");
  next();
}
const limiter = rateLimit({
  windowMs: 15 * 60000,
  limit: 25,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Too many attempts. Try again in 15 minutes." },
  skip: () => process.env.NODE_ENV === "test",
});
export const auth = Router();
auth.get("/me", (req, res) =>
  res.json(
    req.user
      ? { user: publicUser(req.user), csrfToken: req.session.csrfToken }
      : { user: null, csrfToken: null },
  ),
);
auth.post("/signup", limiter, async (req, res) => {
  const data = z
    .object({ name: z.string().trim().min(2).max(80), email, password, phone })
    .parse(req.body);
  if (await User.exists({ email: data.email }))
    fail(
      409,
      "An account already uses this email. Sign in or reset your password.",
    );
  const user = await User.create({
    name: data.name,
    email: data.email,
    phone: data.phone,
    passwordHash: await bcrypt.hash(data.password, 12),
  });
  res.status(201).json(await newSession(res, user));
});
auth.post("/login", limiter, async (req, res) => {
  const data = z
    .object({ email, password: passwordInput })
    .parse(req.body);
  const user = await User.findOne({ email: data.email }).select(
    "+passwordHash",
  );
  // Always perform a password comparison so missing accounts do not return immediately.
  const valid = await bcrypt.compare(
    data.password,
    user?.passwordHash ||
      "$2b$12$C6UzMDM.H6dfI/f/IKcEe.5iDPTKIb7BhLOJWPCgORnZxqVQhDyJm",
  );
  if (!user || !valid) fail(401, "Email or password is incorrect.");
  if (req.session) await Session.deleteOne({ _id: req.session._id });
  res.json(await newSession(res, user));
});
auth.post("/logout", requireAuth, async (req, res) => {
  await Session.deleteOne({ _id: req.session._id });
  res.clearCookie("hc_session", { path: "/" });
  res.json({ ok: true });
});
auth.patch("/profile", requireAuth, async (req, res) => {
  const data = z
    .object({
      name: z.string().trim().min(2).max(80),
      phone,
      address: z.string().trim().max(400),
    })
    .parse(req.body);
  Object.assign(req.user, data);
  await req.user.save();
  res.json(publicUser(req.user));
});
auth.post("/change-password", limiter, requireAuth, async (req, res) => {
  const data = z
    .object({ currentPassword: passwordInput, password })
    .parse(req.body);
  const user = await User.findById(req.user._id).select("+passwordHash");
  if (!(await bcrypt.compare(data.currentPassword, user.passwordHash)))
    fail(400, "Current password is incorrect.");
  user.passwordHash = await bcrypt.hash(data.password, 12);
  user.authVersion += 1;
  await user.save();
  await Session.deleteMany({ user: user._id });
  res.clearCookie("hc_session", { path: "/" });
  res.json({ ok: true });
});
auth.post("/forgot-password", limiter, async (req, res) => {
  const data = z.object({ email }).parse(req.body);
  const user = await User.findOne({ email: data.email });
  if (user) {
    const token = randomBytes(32).toString("hex");
    await PasswordReset.deleteMany({ user: user._id });
    await PasswordReset.create({
      tokenHash: hash(token),
      user: user._id,
      expiresAt: new Date(Date.now() + 30 * 60000),
    });
    const link = `${process.env.APP_URL || "http://localhost:5173"}/reset-password?token=${token}`;
    if (process.env.SMTP_HOST) {
      try {
        const transport = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: Number(process.env.SMTP_PORT || 587),
          secure: process.env.SMTP_PORT === "465",
          auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
        });
        await transport.sendMail({
          from: process.env.SMTP_FROM,
          to: user.email,
          subject: "Reset your HerConnect+ password",
          text: `Reset your password within 30 minutes: ${link}\nIf you did not request this, ignore this email.`,
        });
      } catch {
        console.error(
          "Password reset email could not be sent. Check SMTP configuration.",
        );
      }
    } else if (process.env.NODE_ENV === "development")
      console.log(`[Development mail only] Reset password: ${link}`);
  }
  res.json({
    message:
      "If an account exists, a reset link has been requested. Check your email. For local development, check the API terminal.",
  });
});
auth.post("/reset-password", limiter, async (req, res) => {
  const data = z
    .object({ token: z.string().regex(/^[a-f0-9]{64}$/), password })
    .parse(req.body);
  const record = await PasswordReset.findOneAndDelete({
    tokenHash: hash(data.token),
    expiresAt: { $gt: new Date() },
  });
  if (!record)
    fail(400, "This reset link is invalid or expired. Request a new one.");
  await User.updateOne(
    { _id: record.user },
    {
      $set: { passwordHash: await bcrypt.hash(data.password, 12) },
      $inc: { authVersion: 1 },
    },
  );
  await Session.deleteMany({ user: record.user });
  res.clearCookie("hc_session", { path: "/" });
  res.json({ ok: true });
});
