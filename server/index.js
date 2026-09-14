import mongoose from "mongoose";
import { app } from "./app.js";
import { initModels } from "./models.js";
import { initHiringModels } from "./hiring-models.js";
if (!process.env.MONGODB_URI || process.env.MONGODB_URI.includes("USERNAME:")) {
  console.error("Set MONGODB_URI in .env. See README.md.");
  process.exit(1);
}
try {
  await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 15000,
  });
  await initModels();
  await initHiringModels();
  const server = app.listen(Number(process.env.PORT || 4000), () =>
    console.log("HerConnect API ready on port " + (process.env.PORT || 4000)),
  );
  const stop = () =>
    server.close(async () => {
      await mongoose.disconnect();
      process.exit(0);
    });
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
} catch {
  console.error(
    "MongoDB connection failed. Check the URI, database user password, Atlas network access and internet connection. Credentials were not logged.",
  );
  process.exit(1);
}
