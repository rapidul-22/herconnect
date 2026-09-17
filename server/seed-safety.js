import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { User } from "./models.js";
import {
  SafetyReport,
  HelpResource,
  initSafetyModels,
} from "./safety-models.js";
import { reportCategories, resourceTypes } from "../shared/safety.js";
if (
  !process.env.MONGODB_URI ||
  !process.env.DEMO_PASSWORD ||
  process.env.DEMO_PASSWORD.length < 10 ||
  bcrypt.truncates(process.env.DEMO_PASSWORD)
) {
  console.error(
    "Set MONGODB_URI and a DEMO_PASSWORD of at least 10 characters (at most 72 UTF-8 bytes) in .env.",
  );
  process.exit(1);
}
try {
  await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 15000,
  });
  await initSafetyModels();
  const email = "safetyreporter@herconnect.demo";
  let user = await User.findOne({ email });
  if (user && (!user.isDemo || user.isAdmin))
    throw new Error(
      "Reserved demo email belongs to a non-demo or moderator account.",
    );
  if (!user)
    user = await User.create({
      name: "Demo Community Member",
      email,
      phone: "01700000000",
      passwordHash: await bcrypt.hash(process.env.DEMO_PASSWORD, 12),
      isDemo: true,
    });
  const centres = [
    [23.746, 90.376, "Dhanmondi demo area"],
    [23.804, 90.365, "Mirpur demo area"],
    [24.36, 88.6, "Rajshahi demo area"],
    [22.36, 91.8, "Chattogram demo area"],
  ];
  for (let i = 0; i < 10; i++) {
    const c = centres[i < 4 ? 0 : i < 8 ? 1 : i - 6],
      location = { lat: c[0] + (i % 4) * 0.0005, lng: c[1], address: c[2] },
      key = "safety-demo-report-" + i;
    await SafetyReport.updateOne(
      { reporter: user._id, requestKey: key },
      {
        $setOnInsert: {
          reporter: user._id,
          requestKey: key,
          category: reportCategories[i % reportCategories.length],
          description:
            "Fictional classroom example: a concern was reported near a public walkway. This is sample content for testing the platform, not a real incident.",
          location,
          occurredAt: new Date(Date.now() - (i + 1) * 86400000),
          isAnonymous: i % 3 !== 0,
          status: "pending",
          isDemo: true,
          history: [
            {
              status: "pending",
              hidden: false,
              note: "Fictional report created for classroom testing.",
              actor: user._id,
              at: new Date(),
            },
          ],
        },
      },
      { upsert: true },
    );
  }
  await HelpResource.updateOne(
    { seedKey: "national-emergency-999" },
    {
      $setOnInsert: {
        seedKey: "national-emergency-999",
        name: "National Emergency Service",
        type: "NGO / Helpline",
        phone: "999",
        address: "Nationwide — Bangladesh",
        lat: null,
        lng: null,
        available24x7: true,
        isVerifiedInfo: true,
        verifiedAt: new Date("2026-09-14T00:00:00Z"),
        sourceUrl:
          "https://www.itu.int/net4/wsis/archive/stocktaking/Project/Details?projectId=1514906121",
        isDemo: false,
      },
    },
    { upsert: true },
  );
  for (let i = 0; i < resourceTypes.length; i++)
    await HelpResource.updateOne(
      { seedKey: "safety-demo-resource-" + i },
      {
        $setOnInsert: {
          seedKey: "safety-demo-resource-" + i,
          name: "Demo " + resourceTypes[i] + " — fictional",
          type: resourceTypes[i],
          phone: "",
          address: "Fictional directory example, Dhaka",
          lat: 23.75 + i * 0.012,
          lng: 90.38 + i * 0.005,
          available24x7: false,
          isVerifiedInfo: false,
          sourceUrl: "",
          isDemo: true,
        },
      },
      { upsert: true },
    );
  console.log(
    "Safety seed ready: 10 fictional reports, 5 fictional resources and the sourced national emergency entry. Existing records/passwords were not overwritten.",
  );
  console.log(
    "Demo login: safetyreporter@herconnect.demo — use the DEMO_PASSWORD chosen when this account was first seeded.",
  );
} catch (e) {
  console.error(
    "Safety seed failed:",
    e.name,
    "Check MongoDB access and reserved demo-account ownership.",
  );
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
