import mongoose from "mongoose";
import { vehicleTypes } from "../shared/transport.js";
const { Schema, model } = mongoose;
const ref = (name, required = false) => ({
  type: Schema.Types.ObjectId,
  ref: name,
  required,
});
const schema = (fields) => new Schema(fields, { timestamps: true });
const point = { lat: Number, lng: Number, updatedAt: Date, source: String };
export const DriverProfile = model(
  "DriverProfile",
  schema({
    user: { ...ref("User", true), unique: true },
    displayName: { type: String, required: true },
    bio: String,
    vehicleType: { type: String, enum: vehicleTypes, required: true },
    vehicleNumber: String,
    licenseNumber: String,
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "suspended"],
      default: "pending",
    },
    reason: { type: String, default: "" },
    online: { type: Boolean, default: false },
    currentLocation: point,
    activeRide: { ...ref("TransportRide"), default: null },
    isDemo: { type: Boolean, default: false },
    history: [{ status: String, reason: String, actor: ref("User"), at: Date }],
  }),
);
export const TransportSeat = model(
  "TransportSeat",
  schema({
    user: { ...ref("User", true), unique: true },
    ride: { ...ref("TransportRide"), default: null },
    version: { type: Number, default: 0 },
  }),
);
const rideSchema = schema({
  passenger: ref("User", true),
  driver: ref("User"),
  profile: ref("DriverProfile"),
  driverName: String,
  passengerName: String,
  vehicleType: { type: String, enum: vehicleTypes },
  vehicleNumber: String,
  pickup: { address: String, lat: Number, lng: Number },
  dropoff: { address: String, lat: Number, lng: Number },
  distanceKm: Number,
  durationMinutes: Number,
  route: [[[Number]]],
  routeBasis: String,
  routeProvider: String,
  routingMode: String,
  fare: Number,
  status: {
    type: String,
    enum: [
      "requested",
      "accepted",
      "ongoing",
      "completed",
      "cancelled",
      "no_driver_available",
    ],
    required: true,
  },
  requestKey: { type: String, required: true },
  expiresAt: Date,
  driverLiveLocation: point,
  isDemo: { type: Boolean, default: false },
  history: [{ status: String, reason: String, actor: ref("User"), at: Date }],
});
rideSchema.index({ passenger: 1, requestKey: 1 }, { unique: true });
rideSchema.index({ status: 1, expiresAt: 1 });
rideSchema.index({ driver: 1, createdAt: -1 });
export const TransportRide = model("TransportRide", rideSchema);
const alertSchema = schema({
  ride: ref("TransportRide", true),
  triggeredBy: ref("User", true),
  location: point,
  status: { type: String, enum: ["active", "resolved"], default: "active" },
  resolvedBy: ref("User"),
  resolvedAt: Date,
  note: String,
});
alertSchema.index({ ride: 1, triggeredBy: 1 }, { unique: true });
export const TransportAlert = model("TransportAlert", alertSchema);
export const DriverReview = model(
  "DriverReview",
  schema({
    ride: { ...ref("TransportRide", true), unique: true },
    profile: ref("DriverProfile", true),
    passenger: ref("User", true),
    rating: { type: Number, min: 1, max: 5 },
    comment: String,
    isDemo: { type: Boolean, default: false },
  }),
);
export const TransportContact = model(
  "TransportContact",
  schema({
    user: { ...ref("User", true), unique: true },
    name: { type: String, default: "" },
    phone: { type: String, default: "" },
    isDemo: { type: Boolean, default: false },
  }),
);
export const initTransportModels = () =>
  Promise.all(
    [
      DriverProfile,
      TransportSeat,
      TransportRide,
      TransportAlert,
      DriverReview,
      TransportContact,
    ].map((m) => m.init()),
  );
