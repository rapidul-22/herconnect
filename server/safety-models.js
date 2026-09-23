import mongoose from "mongoose";
import {
  reportCategories,
  resourceTypes,
  reportStatuses,
} from "../shared/safety.js";
const { Schema, model } = mongoose;
const reportSchema = new Schema(
  {
    reporter: { type: Schema.Types.ObjectId, ref: "User", required: true },
    isAnonymous: { type: Boolean, default: true },
    category: { type: String, enum: reportCategories, required: true },
    description: { type: String, required: true },
    personDetails: { type: String, default: '' },
    witnessNotes: { type: String, default: '' },
    evidence: [{ data: { type: Buffer, select: false }, mime: String, uploadedAt: Date }],
    location: { address: String, lat: Number, lng: Number },
    occurredAt: { type: Date, required: true },
    status: { type: String, enum: reportStatuses, default: "pending" },
    hidden: { type: Boolean, default: false },
    history: [
      {
        status: String,
        hidden: Boolean,
        note: String,
        actor: { type: Schema.Types.ObjectId, ref: "User" },
        at: Date,
      },
    ],
    requestKey: { type: String, required: true },
    isDemo: { type: Boolean, default: false },
  },
  { timestamps: true },
);
reportSchema.index({ reporter: 1, requestKey: 1 }, { unique: true });
reportSchema.index({ hidden: 1, isDemo: 1, occurredAt: -1 });
reportSchema.index({ reporter: 1, createdAt: -1 });
export const SafetyReport = model("SafetyReport", reportSchema);
export const HelpResource = model(
  "HelpResource",
  new Schema(
    {
      name: { type: String, required: true },
      type: { type: String, enum: resourceTypes, required: true },
      phone: String,
      address: String,
      lat: Number,
      lng: Number,
      available24x7: Boolean,
      isVerifiedInfo: { type: Boolean, default: false },
      sourceUrl: String,
      verifiedAt: Date,
      isDemo: { type: Boolean, default: false },
      seedKey: { type: String, unique: true, sparse: true },
    },
    { timestamps: true },
  ),
);
export const initSafetyModels = () =>
  Promise.all([SafetyReport.init(), HelpResource.init()]);
