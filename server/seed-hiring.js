import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { User, initModels } from "./models.js";
import {
  WorkerProfile,
  WorkerBooking,
  WorkerReview,
  initHiringModels,
} from "./hiring-models.js";
const samples = [
  [
    "Farida Akter",
    "Dhanmondi, Dhaka",
    ["Cleaning", "Cooking"],
    8,
    250,
    "I help households keep a comfortable, organized home. My work includes regular cleaning, kitchen preparation and everyday Bangladeshi meals. Please describe your priorities when requesting a booking.",
  ],
  [
    "Shaila Begum",
    "Mirpur, Dhaka",
    ["Cooking", "Cleaning"],
    6,
    220,
    "I prepare home-style meals and support kitchen organization. I am comfortable planning simple family menus and keeping work areas tidy. Ingredients and special dietary needs should be discussed before the job.",
  ],
  [
    "Nasima Khatun",
    "Uttara, Dhaka",
    ["Gardening", "Cleaning"],
    5,
    200,
    "I care for balcony plants and small home gardens, including watering, pruning and routine tidying. Please share the size of your space and whether tools are available when you send a request.",
  ],
  [
    "Rehana Islam",
    "Mohammadpur, Dhaka",
    ["Childcare", "Cooking"],
    10,
    350,
    "I offer practical household support with supervised childcare routines and meal preparation. Families should discuss responsibilities and arrangements directly before accepting a booking. This is a fictional demonstration profile.",
  ],
  [
    "Salma Rahman",
    "Banani, Dhaka",
    ["Elderly Care", "Cleaning"],
    9,
    400,
    "I offer companionship and non-medical household assistance for older family members. This service does not include nursing or medical treatment. Please discuss mobility, supervision and household needs before booking.",
  ],
  [
    "Momena Sultana",
    "Bashundhara, Dhaka",
    ["Cleaning", "Other"],
    4,
    180,
    "I help with room organization, laundry folding and routine home cleaning. I prefer a clear task list so we can agree what fits the requested time. Supplies and special requirements can be discussed in advance.",
  ],
];
samples.push(...[["Ariana Rahman", "Gulshan, Dhaka", "Software Engineering", 5, 1200, "Web applications, API integrations and practical debugging sessions."], ["Nabila Karim", "Banani, Dhaka", "Data Analysis", 4, 1000, "Spreadsheet analysis, SQL queries and clear dashboard reports."], ["Samia Haque", "Dhanmondi, Dhaka", "Marketing", 6, 900, "Campaign planning, audience research and small-business social media."], ["Tahmina Akter", "Sylhet", "Graphic Design", 4, 800, "Visual identities, social graphics and presentation layouts."], ["Raisa Islam", "Uttara, Dhaka", "Content Writing", 3, 650, "Clear website copy, product descriptions and editorial outlines."], ["Zarin Ahmed", "Chattogram", "Tutoring", 7, 600, "Structured study sessions in mathematics and introductory programming."], ["Maliha Sultana", "Rajshahi", "Photography", 5, 1500, "Portrait planning and product-photography sessions."], ["Anika Noor", "Khulna", "Accounting", 6, 1100, "Bookkeeping reviews and small-business spreadsheet organization."], ["Nusrat Binte", "Dhaka", "Career Coaching", 8, 1300, "CV reviews, interview practice and career-planning sessions."], ["Sadika Islam", "Cumilla", "Translation", 4, 700, "Bangla-English translation and proofreading."], ["Farzana Ali", "Barishal", "Event Planning", 7, 950, "Event checklists, vendor coordination and schedule planning."], ["Lamisa Chowdhury", "Mirpur, Dhaka", "Beauty & Styling", 5, 750, "Event styling consultation and personal grooming sessions."], ["Meher Afroz", "Bashundhara, Dhaka", "Software Engineering", 3, 1000, "React interfaces, accessibility reviews and website maintenance."], ["Sumaiya Alam", "Rangpur", "Data Analysis", 2, 700, "Data cleaning and beginner-friendly analytics coaching."]].map(([name,area,skill,years,rate,detail])=>[name,area,[skill],years,rate,detail+' Fictional professional profile for classroom testing. Discuss scope and deliverables before booking.']));
try {
  if (!process.env.MONGODB_URI) throw new Error("Set MONGODB_URI in .env.");
  const password = process.env.DEMO_PASSWORD;
  if (!password || password.length < 12 || bcrypt.truncates(password))
    throw new Error(
      "Set DEMO_PASSWORD to at least 12 characters and at most 72 UTF-8 bytes.",
    );
  await mongoose.connect(process.env.MONGODB_URI);
  await initModels();
  await initHiringModels();
  const passwordHash = await bcrypt.hash(password, 12);
  const customer = await User.findOneAndUpdate(
    { email: "hiringbuyer@herconnect.demo" },
    {
      $setOnInsert: {
        name: "Demo Customer",
        email: "hiringbuyer@herconnect.demo",
        phone: "01712345678",
        address: "Demo house, Example Road, Dhaka",
        passwordHash,
      },
    },
    { upsert: true, returnDocument: "after" },
  );
  if (customer.isAdmin)
    throw new Error(
      "A reserved demo customer email belongs to an administrator. Use an isolated development database.",
    );
  for (let i = 0; i < samples.length; i++) {
    const [displayName, serviceArea, skills, experienceYears, rate, bio] =
      samples[i];
    const email = `worker${i + 1}@herconnect.demo`;
    const user = await User.findOneAndUpdate(
      { email },
      {
        $setOnInsert: {
          name: displayName,
          email,
          passwordHash,
          phone: "01712345678",
        },
      },
      { upsert: true, returnDocument: "after" },
    );
    if (user.isAdmin)
      throw new Error(
        "A reserved demo worker email belongs to an administrator. Use an isolated development database.",
      );
    const p = await WorkerProfile.findOneAndUpdate(
      { user: user._id },
      {
        $setOnInsert: {
          user: user._id,
          displayName,
          serviceArea,
          skills,
          bio,
          experienceYears,
          hourlyRate: rate * 100,
          available: true,
          weekdays: [0, 1, 2, 3, 4, 5, 6],
          dayStart: 480,
          dayEnd: 1200,
          status: "approved",
          isDemo: true,
        },
      },
      { upsert: true, returnDocument: "after" },
    );
    for (let j = 0; j < 2; j++) {
      const startAt = new Date(Date.now() - (10 + i * 2 + j) * 86400000),
        endAt = new Date(+startAt + 7200000);
      const requestKey = `hiring-demo-${i}-${j}`;
      const b = await WorkerBooking.findOneAndUpdate(
        { customer: customer._id, requestKey },
        {
          $setOnInsert: {
            customer: customer._id,
            worker: user._id,
            profile: p._id,
            workerName: displayName,
            service: skills[0],
            hourlyRate: rate * 100,
            hours: 2,
            total: rate * 200,
            startAt,
            endAt,
            address: "Fictional demo address, Dhaka",
            phone: "01712345678",
            notes: "Fictional completed booking for demonstration.",
            status: "completed",
            acceptedAt: startAt,
            isDemo: true,
            requestKey,
            history: [
              { status: "accepted", at: startAt, by: user._id },
              { status: "completed", at: endAt, by: customer._id },
            ],
          },
        },
        { upsert: true, returnDocument: "after" },
      );
      // Leave one completed demo booking unreviewed for an immediate review-form walkthrough.
      if (i === 5 && j === 1) continue;
      await WorkerReview.findOneAndUpdate(
        { booking: b._id },
        {
          $setOnInsert: {
            booking: b._id,
            profile: p._id,
            customer: customer._id,
            rating: j ? 4 : 5,
            comment: j
              ? "Clear communication about the agreed tasks. Fictional feedback for this course demo."
              : "The agreed work was completed within the scheduled time. Fictional feedback for demonstration.",
            isDemo: true,
          },
        },
        { upsert: true },
      );
    }
  }
  console.log(
    "Hiring demo ready: 20 fictional service profiles, 40 completed bookings and labelled reviews. Existing records and passwords were not overwritten.",
  );
  console.log(
    "Accounts: hiringbuyer@herconnect.demo and worker1@herconnect.demo through worker20@herconnect.demo. Use the DEMO_PASSWORD from their first seed.",
  );
} catch (e) {
  console.error(
    e.message?.startsWith("Set ") || e.message?.startsWith("A reserved")
      ? e.message
      : "Hiring seed failed. Check database access and configuration; credentials were not logged.",
  );
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
