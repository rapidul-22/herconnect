import { copyFile } from "node:fs/promises";
import { constants } from "node:fs";
try {
  await copyFile(".env.example", ".env", constants.COPYFILE_EXCL);
  console.log(
    "Created .env. Set MONGODB_URI, ADMIN_PASSWORD and DEMO_PASSWORD before continuing.",
  );
} catch (e) {
  if (e.code === "EEXIST") console.log(".env already exists; left unchanged.");
  else throw e;
}
