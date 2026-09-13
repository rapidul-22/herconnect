import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { User } from "../server/models.js";
const email = process.env.ADMIN_EMAIL?.trim().toLowerCase(),
  password = process.env.ADMIN_PASSWORD;
if (!email || !password || password.length < 12 || bcrypt.truncates(password)) {
  console.error("Set ADMIN_EMAIL and ADMIN_PASSWORD (12+ characters) in .env.");
  process.exit(1);
}
try {
  await mongoose.connect(process.env.MONGODB_URI);
  const existing = await User.findOne({ email });
  if (existing) {
    console.log(
      "Account already exists; no privilege or password changes made. Use a new dedicated admin email if needed.",
    );
  } else {
    await User.create({
      name: "HerConnect Moderator",
      email,
      passwordHash: await bcrypt.hash(password, 12),
      isAdmin: true,
    });
    console.log(
      "Moderator created. Sign in using your ADMIN_EMAIL and password.",
    );
  }
} catch {
  console.error("Admin setup failed. Check MongoDB configuration.");
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
