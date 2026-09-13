import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { pathToFileURL } from "node:url";
import { User, Product, Order, Review, initModels } from "./models.js";
import { demoShops, demoProducts, demoComments } from "./demo-data.js";
export async function seedDemo(password) {
  if (!password || password.length < 12 || bcrypt.truncates(password))
    throw new Error("Set DEMO_PASSWORD to 12+ characters and at most 72 UTF-8 bytes.");
  const passwordHash = await bcrypt.hash(password, 12),
    shops = [];
  for (const data of demoShops) {
    const user = await User.findOneAndUpdate(
      { email: data.email },
      { $setOnInsert: { ...data, passwordHash, phone: "01712345678" } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    shops.push(user);
  }
  const buyers = [];
  for (const [i, name] of [
    "Ayesha Karim",
    "Maliha Hasan",
    "Tasnim Noor",
  ].entries()) {
    buyers.push(
      await User.findOneAndUpdate(
        { email: `buyer${i + 1}@herconnect.demo` },
        {
          $setOnInsert: {
            name,
            passwordHash,
            phone: "01812345678",
            address: "House 12, Road 5, Dhanmondi, Dhaka",
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      ),
    );
  }
  for (const [i, p] of demoProducts.entries()) {
    const { key, shop, image, ...data } = p;
    const product = await Product.findOneAndUpdate(
      { demoKey: key },
      {
        $setOnInsert: {
          ...data,
          seller: shops[shop]._id,
          image: `/images/${image}.jpg`,
          active: true,
          createdAt: new Date(Date.now() - i * 3600000),
        },
      },
      { upsert: true, new: true },
    );
    for (let j = 0; j < 3; j++) {
      const demoKey = `review-${key}-${j}`;
      const order = await Order.findOneAndUpdate(
        { demoKey },
        {
          $setOnInsert: {
            buyer: buyers[j]._id,
            seller: shops[shop]._id,
            items: [
              {
                product: product._id,
                name: product.name,
                image: product.image,
                unitPrice: product.price,
                quantity: 1,
              },
            ],
            subtotal: product.price,
            deliveryFee: 6000,
            total: product.price + 6000,
            shipping: {
              name: buyers[j].name,
              phone: "01812345678",
              address: "Demo address, Dhanmondi",
              city: "Dhaka",
            },
            status: "delivered",
            history: [
              {
                status: "delivered",
                at: new Date(Date.now() - (j + 2) * 86400000),
                reason: "Fictional completed purchase for demo review",
              },
            ],
            requestKey: `demo-${demoKey}`,
            demoKey,
          },
        },
        { upsert: true, new: true },
      );
      await Review.updateOne(
        { buyer: buyers[j]._id, order: order._id, product: product._id },
        {
          $setOnInsert: {
            rating: demoComments[j][1],
            comment: demoComments[j][0],
            isDemo: true,
            createdAt: new Date(Date.now() - (j + 2) * 86400000),
          },
        },
        { upsert: true },
      );
    }
  }
  console.log(
    "Demo seed ready: 4 fictional shops, 10 products, 3 buyer accounts and 30 labelled reviews. Existing records were not overwritten.",
  );
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 15000,
    });
    await initModels();
    await seedDemo(process.env.DEMO_PASSWORD);
  } catch (e) {
    console.error(
      e.message.startsWith("Set DEMO")
        ? e.message
        : "Seeding failed. Check MongoDB and .env settings; no collections were dropped.",
    );
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}
