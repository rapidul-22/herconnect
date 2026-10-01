import express from "express";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { rateLimit } from "express-rate-limit";
import { ZodError } from "zod";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync, mkdirSync } from "node:fs";
import mongoose from "mongoose";
import { auth, loadSession, fail, requireAuth } from "./auth.js";
import { marketplace } from "./marketplace.js";
import { hiring } from "./hiring.js";
import { safety } from "./safety.js";
import { transport } from "./transport.js";
export const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
export const uploads = path.join(root, "server/uploads");
mkdirSync(uploads, { recursive: true });
export const app = express();
app.disable("x-powered-by");
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "blob:", "https://tile.openstreetmap.org"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        connectSrc: ["'self'"],
        upgradeInsecureRequests:
          process.env.NODE_ENV === "production" ? [] : null,
      },
    },
    crossOriginEmbedderPolicy: false,
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  }),
);
app.use(express.json({ limit: "100kb" }), cookieParser());
app.use(
  "/api",
  rateLimit({
    windowMs: 60000,
    limit: 300,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { error: "Please wait a moment before trying again." },
    skip: () => process.env.NODE_ENV === "test",
  }),
);
app.use("/api", (req, res, next) => {
  res.set("Cache-Control", "no-store");
  const origin = req.get("Origin");
  const allowed = new Set([process.env.APP_URL || "http://localhost:5173"]);
  if (process.env.NODE_ENV !== "production") {
    allowed.add("http://127.0.0.1:5173");
    allowed.add("http://localhost:5173");
  }
  if (
    !["GET", "HEAD", "OPTIONS"].includes(req.method) &&
    ((origin && !allowed.has(origin)) ||
      req.get("Sec-Fetch-Site") === "cross-site")
  )
    fail(403, "Request origin not allowed.");
  next();
});
app.get("/api/health", (req, res) =>
  res
    .status(mongoose.connection.readyState === 1 ? 200 : 503)
    .json({ ready: mongoose.connection.readyState === 1 }),
);
app.use("/api", loadSession);
app.use("/api/auth", auth);
// Module data requires a session too, not just the React pages.
app.use(['/api/products', '/api/shops', '/api/wishlist', '/api/seller',
  '/api/orders', '/api/admin', '/api/hiring', '/api/reports',
  '/api/zones', '/api/resources', '/api/transport'], requireAuth);
app.use("/api", marketplace);
app.use("/api/hiring", hiring);
app.use("/api", safety);
app.use("/api/transport", transport);
app.use("/api", (req, res) =>
  res.status(404).json({ error: "API route not found." }),
);
app.use(
  "/uploads",
  express.static(uploads, { maxAge: "1d", dotfiles: "deny" }),
);
const dist = path.join(root, "dist");
if (existsSync(dist)) {
  app.use(express.static(dist));
  app.get("/{*path}", (req, res) =>
    res.sendFile(path.join(dist, "index.html")),
  );
}
app.use((err, req, res, next) => {
  if (err instanceof ZodError)
    return res
      .status(400)
      .json({
        error: err.issues[0]?.message || "Check your input.",
        fields: err.issues.map((i) => ({
          path: i.path.join("."),
          message: i.message,
        })),
      });
  if (err.code === 11000)
    return res
      .status(409)
      .json({ error: "This record already exists. Refresh and try again." });
  if (err.name === "CastError")
    return res.status(404).json({ error: "Record not found." });
  if (err.name === "MulterError")
    return res.status(400).json({ error: "Choose one image under 5 MB." });
  if (err.type === "entity.too.large")
    return res.status(413).json({ error: "Request is too large." });
  if (err instanceof SyntaxError && err.status === 400)
    return res.status(400).json({ error: "Invalid JSON." });
  const status = err.status || 500;
  if (status === 500) console.error("Request failed:", err.name); // Never log database URIs or raw request bodies.
  res
    .status(status)
    .json({
      error:
        status === 500
          ? "Something went wrong. Please try again."
          : err.message,
    });
});
