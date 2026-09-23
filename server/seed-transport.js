import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { User, initModels } from "./models.js";
import {
  DriverProfile as Profile,
  TransportSeat as Seat,
  TransportContact as Contact,
  TransportRide as Ride,
  DriverReview as Review,
  initTransportModels,
} from "./transport-models.js";
import { availableVehicleTypes as vehicleTypes, fareQuote } from "../shared/transport.js";
if (
  !process.env.MONGODB_URI ||
  !process.env.DEMO_PASSWORD ||
  process.env.DEMO_PASSWORD.length < 10 ||
  bcrypt.truncates(process.env.DEMO_PASSWORD)
) {
  console.error(
    "Set MONGODB_URI and DEMO_PASSWORD (10+ characters, at most 72 UTF-8 bytes) in .env.",
  );
  process.exit(1);
}
async function demoUser(email, name) {
  let u = await User.findOne({ email });
  if (u) {
    if (u.isAdmin || !(await Contact.exists({ user: u._id, isDemo: true })))
      throw new Error("Reserved demo email belongs to an unrelated account.");
    return u;
  }
  u = await User.create({
    email,
    name,
    phone: "",
    passwordHash: await bcrypt.hash(process.env.DEMO_PASSWORD, 12),
  });
  await Contact.create({ user: u._id, name: "", phone: "", isDemo: true });
  return u;
}
try {
  await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 15000,
  });
  await initModels();
  await initTransportModels();
  const passenger = await demoUser(
    "ridepassenger@herconnect.demo",
    "Demo Passenger",
  );
  await Seat.updateOne(
    { user: passenger._id },
    { $setOnInsert: { ride: null } },
    { upsert: true },
  );
  const passengers = [passenger];
  for(let i=2;i<=6;i++) passengers.push(await demoUser(`ridepassenger${i}@herconnect.demo`,`Demo Passenger ${i}`));
  const names = [
    "Farhana Rahman",
    "Nusrat Jahan",
    "Samira Akter",
    "Maliha Hasan", "Raisa Karim", "Tania Akter", "Nabila Ahmed", "Samia Noor",
    "Farzana Islam", "Anika Rahman", "Zarin Sultana", "Meher Haque",
  ];
  for (let i = 0; i < names.length; i++) {
    const u = await demoUser(`driver${i + 1}@herconnect.demo`, names[i]);
    await Seat.updateOne(
      { user: u._id },
      { $setOnInsert: { ride: null } },
      { upsert: true },
    );
    const profile = await Profile.findOneAndUpdate(
      { user: u._id },
      {
        $setOnInsert: {
          user: u._id,
          displayName: names[i],
          bio: "Fictional driver profile for testing HerConnect ride requests, location updates and reviews. No real transport service is provided.",
          vehicleType: vehicleTypes[i % vehicleTypes.length],
          vehicleNumber: "DEMO-VEHICLE-" + (i + 1),
          licenseNumber: "DEMO-LICENCE-" + (i + 1),
          status: "approved",
          online: false,
          isDemo: true,
          history: [
            {
              status: "approved",
              reason: "Fictional profile approved for classroom testing only.",
              at: new Date(),
            },
          ],
        },
      },
      { upsert: true, returnDocument: "after" },
    );
    if (!profile.isDemo)
      throw new Error("Existing driver is not a demo profile.");
    const ridePassenger = passengers[i % passengers.length];
    for (let j = 0; j < 3; j++) {
      const pickup = {
          address: "Demo pickup · Dhaka",
          lat: 23.8103,
          lng: 90.4125,
        },
        dropoff = {
          address: "Demo dropoff · Dhanmondi",
          lat: 23.746,
          lng: 90.376,
        },
        day = new Date(Date.now() - (j + 1) * 86400000);
      const r = await Ride.findOneAndUpdate(
        { passenger: ridePassenger._id, requestKey: `transport-demo-${i}-${j}` },
        {
          $setOnInsert: {
            passenger: ridePassenger._id,
            passengerName: ridePassenger.name,
            driver: u._id,
            profile: profile._id,
            driverName: profile.displayName,
            vehicleType: profile.vehicleType,
            vehicleNumber: profile.vehicleNumber,
            pickup,
            dropoff,
            ...fareQuote(pickup, dropoff, profile.vehicleType),
            status: "completed",
            isDemo: true,
            history: [
              {
                status: "completed",
                reason: "Fictional completed ride for demonstration.",
                at: day,
              },
            ],
            createdAt: day,
          },
        },
        { upsert: true, returnDocument: "after" },
      );
      await Review.updateOne(
        { ride: r._id },
        {
          $setOnInsert: {
            ride: r._id,
            profile: profile._id,
            passenger: ridePassenger._id,
            rating: j ? 4 : 5,
            comment: j
              ? "Demo review: the pickup details were easy to follow."
              : "Demo review: a smooth journey and clear communication.",
            isDemo: true,
          },
        },
        { upsert: true },
      );
    }
  }
  console.log(
    "Transport demo ready: 12 fictional drivers, 6 passengers, 36 completed rides/reviews (existing records retained). Drivers start offline. Existing records/passwords were not overwritten.",
  );
  console.log(
    "Passenger: ridepassenger@herconnect.demo; drivers: driver1@herconnect.demo through driver12@herconnect.demo. Use the original DEMO_PASSWORD for each account.",
  );
} catch (e) {
  console.error(
    "Transport seed failed:",
    e.name,
    "Check database access and reserved demo-account ownership.",
  );
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
